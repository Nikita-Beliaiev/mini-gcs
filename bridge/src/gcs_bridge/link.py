import asyncio
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from pymavlink.dialects.v20 import ardupilotmega as mavlink

from gcs_bridge.tlog import TlogWriter

GCS_SYSTEM_ID = 255
GCS_COMPONENT_ID = 190

type Message = Any
type Predicate = Callable[[Message], bool]
type Listener = Callable[[Message], None]


@dataclass(frozen=True)
class Target:
    system_id: int
    component_id: int


@dataclass(frozen=True)
class Retry:
    timeout_s: float
    attempts: int


class NoAnswerError(Exception):
    pass


class _DatagramProtocol(asyncio.DatagramProtocol):
    def __init__(self, link: "MavlinkLink") -> None:
        self._link = link

    def datagram_received(self, data: bytes, addr: tuple[str | Any, int]) -> None:
        self._link.receive(data, (str(addr[0]), addr[1]))


class MavlinkLink:
    def __init__(self, host: str, port: int, recorder: TlogWriter | None = None) -> None:
        self._host = host
        self._port = port
        self._recorder = recorder
        self.mav = mavlink.MAVLink(None, srcSystem=GCS_SYSTEM_ID, srcComponent=GCS_COMPONENT_ID)
        self.mav.robust_parsing = True
        self._transport: asyncio.DatagramTransport | None = None
        self._peer: tuple[str, int] | None = None
        self._listeners: list[Listener] = []
        self._waiters: list[tuple[Predicate, asyncio.Future[Message]]] = []

    async def start(self) -> None:
        loop = asyncio.get_running_loop()
        self._transport, _ = await loop.create_datagram_endpoint(
            lambda: _DatagramProtocol(self), local_addr=(self._host, self._port)
        )

    def close(self) -> None:
        if self._transport is not None:
            self._transport.close()
            self._transport = None

    @property
    def local_port(self) -> int:
        if self._transport is None:
            raise RuntimeError("The link is not started")
        port: int = self._transport.get_extra_info("sockname")[1]
        return port

    @property
    def has_peer(self) -> bool:
        return self._peer is not None

    def send(self, message: Message) -> bool:
        if self._transport is None or self._peer is None:
            return False
        frame = bytes(message.pack(self.mav))
        self.mav.seq = (self.mav.seq + 1) % 256
        self._transport.sendto(frame, self._peer)
        if self._recorder is not None:
            self._recorder.write(frame)
        return True

    def subscribe(self, listener: Listener) -> Callable[[], None]:
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)

    async def wait_for(self, predicate: Predicate, timeout_s: float) -> Message:
        future: asyncio.Future[Message] = asyncio.get_running_loop().create_future()
        waiter = (predicate, future)
        self._waiters.append(waiter)
        try:
            async with asyncio.timeout(timeout_s):
                return await future
        finally:
            if waiter in self._waiters:
                self._waiters.remove(waiter)

    def receive(self, data: bytes, addr: tuple[str, int]) -> None:
        self._peer = addr
        for message in self.mav.parse_buffer(data) or []:
            if message.get_type() == "BAD_DATA":
                continue
            if self._recorder is not None:
                self._recorder.write(bytes(message.get_msgbuf()))
            self._resolve_waiters(message)
            for listener in list(self._listeners):
                listener(message)

    def _resolve_waiters(self, message: Message) -> None:
        for predicate, future in list(self._waiters):
            if not future.done() and predicate(message):
                future.set_result(message)


async def request(
    link: MavlinkLink, send: Callable[[], object], predicate: Predicate, retry: Retry
) -> Message:
    for _ in range(retry.attempts):
        send()
        try:
            return await link.wait_for(predicate, retry.timeout_s)
        except TimeoutError:
            continue
    raise NoAnswerError
