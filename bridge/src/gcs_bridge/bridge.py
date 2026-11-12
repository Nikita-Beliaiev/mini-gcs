import asyncio
import contextlib
import json
import logging
import time
from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pymavlink.dialects.v20 import ardupilotmega as mavlink
from websockets.asyncio.server import Server, ServerConnection, broadcast, serve
from websockets.exceptions import ConnectionClosed
from websockets.typing import Origin

from gcs_bridge import station_protocol as protocol
from gcs_bridge.arducopter import (
    FIRST_WAYPOINT_SEQ,
    MISSION_TYPE_FENCE,
    MISSION_TYPE_MISSION,
    MODE_AUTO,
    MODE_GUIDED,
    fence_items,
    mission_plan,
    polygon_from_items,
    route_from_items,
    waypoints_of,
)
from gcs_bridge.link import MavlinkLink, Message, Retry
from gcs_bridge.mission_transfer import TransferError, clear, download, upload
from gcs_bridge.station_protocol import CommandEnvelope, LatLon, Telemetry
from gcs_bridge.tlog import TlogWriter
from gcs_bridge.translator import TelemetryTranslator
from gcs_bridge.vehicle_control import CommandRejectedError, VehicleControl

log = logging.getLogger(__name__)

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "https://nikita-beliaiev.github.io",
)
TELEMETRY_RATES_HZ = {
    mavlink.MAVLINK_MSG_ID_GLOBAL_POSITION_INT: 10.0,
    mavlink.MAVLINK_MSG_ID_ATTITUDE: 25.0,
    mavlink.MAVLINK_MSG_ID_SYS_STATUS: 2.0,
    mavlink.MAVLINK_MSG_ID_GPS_RAW_INT: 2.0,
    mavlink.MAVLINK_MSG_ID_MISSION_CURRENT: 1.0,
    mavlink.MAVLINK_MSG_ID_HOME_POSITION: 0.2,
    mavlink.MAVLINK_MSG_ID_FENCE_STATUS: 2.0,
    mavlink.MAVLINK_MSG_ID_EKF_STATUS_REPORT: 1.0,
}
FENCE_TYPE_POLYGON = 4
DEFAULT_RETRY = Retry(timeout_s=0.8, attempts=3)
TAKEOFF_ALTITUDE_SHARE = 0.9
CLOSE_TIMEOUT_S = 2.0


class NotReadyError(Exception):
    pass


@dataclass(frozen=True)
class BridgeConfig:
    vehicle_host: str = "127.0.0.1"
    vehicle_port: int = 14550
    station_host: str = "127.0.0.1"
    station_port: int = 8788
    allowed_origins: tuple[str, ...] = DEFAULT_ALLOWED_ORIGINS
    takeoff_altitude_m: float = 40.0
    retry: Retry = DEFAULT_RETRY
    launch_timeout_s: float = 180.0
    arm_retry_s: float = 2.0
    link_loss_s: float = 10.0
    gps_loss_s: float = 15.0
    battery_drop_percent: float = 32.0
    heartbeat_interval_s: float = 1.0
    state_interval_s: float = 5.0
    tlog_path: Path | None = None


class Bridge:
    def __init__(self, config: BridgeConfig, clock: Callable[[], float] = time.monotonic) -> None:
        self._config = config
        self._clock = clock
        self._recorder = TlogWriter(config.tlog_path) if config.tlog_path else None
        self._link = MavlinkLink(config.vehicle_host, config.vehicle_port, self._recorder)
        self._translator = TelemetryTranslator(clock)
        self._stamper = protocol.MessageStamper(clock)
        self._server: Server | None = None
        self._vehicle_lock = asyncio.Lock()
        self._tasks: set[asyncio.Task[None]] = set()
        self._launch: asyncio.Task[None] | None = None
        self._link_lost_until = 0.0
        self._vehicle_update = asyncio.Event()

    async def start(self) -> None:
        await self._link.start()
        self._link.subscribe(self._on_vehicle_message)
        origins: list[Origin | None] = [Origin(origin) for origin in self._config.allowed_origins]
        self._server = await serve(
            self._serve_station,
            self._config.station_host,
            self._config.station_port,
            origins=[*origins, None],
            close_timeout=CLOSE_TIMEOUT_S,
        )
        self._spawn(self._heartbeat_loop())
        self._spawn(self._state_loop())

    async def close(self) -> None:
        for task in list(self._tasks):
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()
        self._link.close()
        if self._recorder is not None:
            self._recorder.close()

    @property
    def station_url(self) -> str:
        if self._server is None:
            raise RuntimeError("The bridge is not started")
        port = next(iter(self._server.sockets)).getsockname()[1]
        return f"ws://{self._config.station_host}:{port}"

    @property
    def vehicle_port(self) -> int:
        return self._link.local_port

    def _spawn(self, coroutine: Coroutine[Any, Any, None]) -> asyncio.Task[None]:
        task = asyncio.create_task(coroutine)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return task

    def _link_lost(self) -> bool:
        return self._clock() < self._link_lost_until

    def _send(self, body: Telemetry) -> str:
        return json.dumps(self._stamper.stamp(body))

    def _broadcast(self, body: Telemetry) -> None:
        if self._server is not None and not self._link_lost():
            broadcast(self._server.connections, self._send(body))

    def _control(self) -> VehicleControl:
        target = self._translator.state.target
        if target is None:
            raise NotReadyError("No vehicle is connected to the bridge")
        return VehicleControl(self._link, target, self._config.retry)

    def _on_vehicle_message(self, message: Message) -> None:
        translation = self._translator.translate(message)
        self._vehicle_update.set()
        if message.get_type() == "STATUSTEXT":
            log.info("Autopilot: %s", message.text)
        if translation.vehicle_appeared:
            log.info("Vehicle %d is connected", message.get_srcSystem())
            self._spawn(self._prepare_vehicle())
        for body in translation.telemetry:
            self._broadcast(body)

    async def _prepare_vehicle(self) -> None:
        try:
            control = self._control()
            for message_id, hertz in TELEMETRY_RATES_HZ.items():
                await control.set_message_rate(message_id, hertz)
            async with self._vehicle_lock:
                target = control.target
                mission = await download(self._link, target, MISSION_TYPE_MISSION, self._retry)
                fence = await download(self._link, target, MISSION_TYPE_FENCE, self._retry)
        except (NotReadyError, CommandRejectedError, TransferError) as error:
            log.warning("Could not prepare the vehicle: %s", error)
            return
        route = route_from_items(mission)
        self._broadcast(self._translator.set_mission(waypoints_of(route), route.waypoint_sequences))
        self._broadcast(self._translator.set_geofence(polygon_from_items(fence)))

    @property
    def _retry(self) -> Retry:
        return self._config.retry

    async def _heartbeat_loop(self) -> None:
        while True:
            self._link.send(
                self._link.mav.heartbeat_encode(
                    mavlink.MAV_TYPE_GCS,
                    mavlink.MAV_AUTOPILOT_INVALID,
                    0,
                    0,
                    mavlink.MAV_STATE_ACTIVE,
                )
            )
            if self._recorder is not None:
                self._recorder.flush()
            await asyncio.sleep(self._config.heartbeat_interval_s)

    async def _state_loop(self) -> None:
        while True:
            await asyncio.sleep(self._config.state_interval_s)
            for body in self._translator.snapshot(("home", "mission", "geofence")):
                self._broadcast(body)

    async def _serve_station(self, connection: ServerConnection) -> None:
        if not self._link_lost():
            for body in self._translator.snapshot():
                await connection.send(self._send(body))
        async for data in connection:
            envelope = protocol.parse_command_envelope(data)
            if envelope is None:
                continue
            if self._link_lost() and envelope.command.type != "simulateFault":
                continue
            self._spawn(self._reply(connection, envelope))

    async def _reply(self, connection: ServerConnection, envelope: CommandEnvelope) -> None:
        ack = await self._execute(envelope)
        if self._link_lost() and envelope.command.type != "simulateFault":
            return
        with contextlib.suppress(ConnectionClosed):
            await connection.send(self._send(ack))

    async def _execute(self, envelope: CommandEnvelope) -> Telemetry:
        command = envelope.command
        try:
            match command:
                case protocol.UploadMission():
                    await self._upload_mission(command.waypoints)
                case protocol.UploadGeofence():
                    await self._upload_geofence(command.polygon)
                case protocol.ClearGeofence():
                    await self._clear_geofence()
                case protocol.SimulateFault():
                    await self._simulate_fault(command.fault)
                case protocol.Ping():
                    await self._control().ping()
        except (NotReadyError, TransferError, CommandRejectedError) as error:
            log.info("%s rejected: %s", command.type, error)
            return protocol.command_ack(envelope.command_id, command.type, False, str(error))
        return protocol.command_ack(envelope.command_id, command.type, True, None)

    async def _upload_mission(self, waypoints: list[LatLon]) -> None:
        control = self._control()
        home = self._translator.state.home
        if home is None:
            raise NotReadyError("Waiting for the home position")
        plan = mission_plan(home, waypoints, self._config.takeoff_altitude_m)
        async with self._vehicle_lock:
            await upload(self._link, control.target, plan.items, MISSION_TYPE_MISSION, self._retry)
        self._broadcast(self._translator.set_mission(waypoints, plan.waypoint_sequences))
        if self._translator.state.armed:
            self._spawn(self._continue_in_flight())
        elif self._launch is None or self._launch.done():
            self._launch = self._spawn(self._launch_mission())

    async def _continue_in_flight(self) -> None:
        try:
            async with self._vehicle_lock:
                control = self._control()
                await control.set_mission_current(FIRST_WAYPOINT_SEQ)
                await control.set_mode(MODE_AUTO)
        except (NotReadyError, CommandRejectedError) as error:
            log.warning("Could not switch to the new mission: %s", error)

    async def _launch_mission(self) -> None:
        altitude_m = self._config.takeoff_altitude_m
        state = self._translator.state
        try:
            await self._wait_until(
                lambda: state.ready_to_arm and state.has_position, self._config.launch_timeout_s
            )
            async with self._vehicle_lock:
                await self._control().set_mode(MODE_GUIDED)
            await self._arm_when_ready()
            async with self._vehicle_lock:
                await self._control().takeoff(altitude_m)
            await self._wait_until(
                lambda: state.relative_altitude_m >= altitude_m * TAKEOFF_ALTITUDE_SHARE,
                self._config.launch_timeout_s,
            )
            async with self._vehicle_lock:
                await self._control().set_mode(MODE_AUTO)
            log.info("The vehicle is flying the mission")
        except (TimeoutError, NotReadyError, CommandRejectedError) as error:
            log.warning("Launch failed: %s", str(error) or "timed out")

    async def _arm_when_ready(self) -> None:
        state = self._translator.state
        async with asyncio.timeout(self._config.launch_timeout_s):
            while True:
                await self._wait_until(lambda: state.ready_to_arm, self._config.launch_timeout_s)
                try:
                    async with self._vehicle_lock:
                        await self._control().arm()
                except CommandRejectedError as error:
                    log.info("The vehicle is not ready to arm yet: %s", error)
                    await asyncio.sleep(self._config.arm_retry_s)
                else:
                    return

    async def _wait_until(self, condition: Callable[[], bool], timeout_s: float) -> None:
        async with asyncio.timeout(timeout_s):
            while not condition():
                self._vehicle_update.clear()
                await self._vehicle_update.wait()

    async def _upload_geofence(self, polygon: list[LatLon]) -> None:
        control = self._control()
        if not self._translator.state.has_position:
            raise NotReadyError("Waiting for the vehicle position")
        async with self._vehicle_lock:
            await control.set_param("FENCE_TYPE", FENCE_TYPE_POLYGON)
            await upload(
                self._link, control.target, fence_items(polygon), MISSION_TYPE_FENCE, self._retry
            )
            await control.enable_fence(True)
        self._broadcast(self._translator.set_geofence(polygon))

    async def _clear_geofence(self) -> None:
        control = self._control()
        async with self._vehicle_lock:
            await control.enable_fence(False)
            await clear(self._link, control.target, MISSION_TYPE_FENCE, self._retry)
        self._broadcast(self._translator.set_geofence(None))

    async def _simulate_fault(self, fault: str) -> None:
        if fault == "linkLoss":
            self._link_lost_until = self._clock() + self._config.link_loss_s
            return
        control = self._control()
        async with self._vehicle_lock:
            if fault == "gpsLoss":
                await control.set_param("SIM_GPS1_ENABLE", 0)
                self._spawn(self._restore_gps())
            else:
                await control.set_battery_percent(self._config.battery_drop_percent)

    async def _restore_gps(self) -> None:
        await asyncio.sleep(self._config.gps_loss_s)
        try:
            async with self._vehicle_lock:
                await self._control().set_param("SIM_GPS1_ENABLE", 1)
        except (NotReadyError, CommandRejectedError) as error:
            log.warning("Could not restore GPS: %s", error)
