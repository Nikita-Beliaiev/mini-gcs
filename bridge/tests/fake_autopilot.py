import asyncio
import contextlib
import time
from dataclasses import dataclass, field
from typing import Any

from pymavlink.dialects.v20 import ardupilotmega as mavlink

from gcs_bridge.arducopter import degrees_e7
from gcs_bridge.station_protocol import LatLon

HOME = LatLon(lat=43.095, lon=11.645)
TICK_S = 0.05
ARMED_FLAG = mavlink.MAV_MODE_FLAG_SAFETY_ARMED
BASE_MODE = mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED | mavlink.MAV_MODE_FLAG_STABILIZE_ENABLED
PREARM_CHECK = mavlink.MAV_SYS_STATUS_PREARM_CHECK


@dataclass
class Upload:
    mission_type: int
    count: int
    items: dict[int, Any] = field(default_factory=dict)


@dataclass
class FakeAutopilotOptions:
    ready_to_arm: bool = True
    ignore_items: int = 0
    reject_plans_with: int | None = None
    command_results: dict[int, int] = field(default_factory=dict)
    answer_timesync: bool = True
    initial_mission: list[LatLon] = field(default_factory=list)
    has_position: bool = True
    arm_refusals: int = 0
    fence_enable_refusals: int = 0


class _Protocol(asyncio.DatagramProtocol):
    def __init__(self, autopilot: "FakeAutopilot") -> None:
        self._autopilot = autopilot

    def datagram_received(self, data: bytes, addr: tuple[str | Any, int]) -> None:
        self._autopilot.receive(data)


class FakeAutopilot:
    def __init__(self, bridge_port: int, options: FakeAutopilotOptions | None = None) -> None:
        self.options = options or FakeAutopilotOptions()
        self._bridge = ("127.0.0.1", bridge_port)
        self._mav = mavlink.MAVLink(None, srcSystem=1, srcComponent=1)
        self._parser = mavlink.MAVLink(None)
        self._transport: asyncio.DatagramTransport | None = None
        self._task: asyncio.Task[None] | None = None
        self.received: list[Any] = []
        self.armed = False
        self.custom_mode = 0
        self.relative_alt_m = 0.0
        self.battery_percent = 95.0
        self.fence_enabled = False
        self.params: dict[str, float] = {"FENCE_TYPE": 7, "SIM_GPS1_ENABLE": 1}
        self.plans: dict[int, list[Any]] = {mavlink.MAV_MISSION_TYPE_MISSION: [], 1: []}
        self.mission_seq = 0
        self._upload: Upload | None = None
        self._ignore_items = self.options.ignore_items
        self._set_initial_mission()

    def _set_initial_mission(self) -> None:
        points = [HOME, *self.options.initial_mission]
        self.plans[mavlink.MAV_MISSION_TYPE_MISSION] = [
            self._mav.mission_item_int_encode(
                255,
                190,
                seq,
                6,
                mavlink.MAV_CMD_NAV_WAYPOINT,
                0,
                1,
                0,
                0,
                0,
                0,
                degrees_e7(point.lat),
                degrees_e7(point.lon),
                40,
                mavlink.MAV_MISSION_TYPE_MISSION,
            )
            for seq, point in enumerate(points)
        ]

    async def start(self) -> None:
        loop = asyncio.get_running_loop()
        self._transport, _ = await loop.create_datagram_endpoint(
            lambda: _Protocol(self), local_addr=("127.0.0.1", 0)
        )
        self._task = asyncio.create_task(self._telemetry_loop())

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        if self._transport is not None:
            self._transport.close()

    def received_commands(self) -> list[int]:
        return [m.command for m in self.received if m.get_type() == "COMMAND_LONG"]

    def send(self, message: Any) -> None:
        if self._transport is None:
            return
        frame = bytes(message.pack(self._mav))
        self._mav.seq = (self._mav.seq + 1) % 256
        self._transport.sendto(frame, self._bridge)

    async def _telemetry_loop(self) -> None:
        while True:
            health = PREARM_CHECK if self.options.ready_to_arm else 0
            self.send(
                self._mav.heartbeat_encode(
                    mavlink.MAV_TYPE_QUADROTOR,
                    mavlink.MAV_AUTOPILOT_ARDUPILOTMEGA,
                    BASE_MODE | (ARMED_FLAG if self.armed else 0),
                    self.custom_mode,
                    mavlink.MAV_STATE_ACTIVE,
                )
            )
            self.send(
                self._mav.global_position_int_encode(
                    0,
                    degrees_e7(HOME.lat),
                    degrees_e7(HOME.lon),
                    400_000,
                    round(self.relative_alt_m * 1000),
                    300,
                    400,
                    0,
                    9000,
                )
            )
            self.send(
                self._mav.sys_status_encode(
                    health,
                    health,
                    health,
                    0,
                    12600,
                    0,
                    round(self.battery_percent),
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                )
            )
            self.send(self._mav.gps_raw_int_encode(0, 3, 0, 0, 0, 0, 0, 0, 0, 10))
            position_flags = mavlink.EKF_POS_HORIZ_ABS if self.options.has_position else 0
            self.send(self._mav.ekf_status_report_encode(position_flags, 0, 0, 0, 0, 0))
            self.send(
                self._mav.home_position_encode(
                    degrees_e7(HOME.lat),
                    degrees_e7(HOME.lon),
                    400_000,
                    0,
                    0,
                    0,
                    [1, 0, 0, 0],
                    0,
                    0,
                    0,
                )
            )
            self.send(self._mav.mission_current_encode(self.mission_seq, 0, 0, 0))
            await asyncio.sleep(TICK_S)

    def receive(self, data: bytes) -> None:
        for message in self._parser.parse_buffer(data) or []:
            self.received.append(message)
            handler = getattr(self, f"_on_{message.get_type().lower()}", None)
            if handler is not None:
                handler(message)

    def _on_mission_count(self, message: Any) -> None:
        self._upload = Upload(message.mission_type, message.count)
        if message.count == 0:
            self._finish_upload()
        else:
            self._request_item(0)

    def _request_item(self, seq: int) -> None:
        assert self._upload is not None
        self.send(self._mav.mission_request_int_encode(255, 190, seq, self._upload.mission_type))

    def _on_mission_item_int(self, message: Any) -> None:
        upload = self._upload
        if upload is None or message.mission_type != upload.mission_type:
            return
        if self._ignore_items > 0:
            self._ignore_items -= 1
            return
        upload.items[message.seq] = message
        if len(upload.items) < upload.count:
            self._request_item(len(upload.items))
        else:
            self._finish_upload()

    def _finish_upload(self) -> None:
        upload = self._upload
        assert upload is not None
        self._upload = None
        result = self.options.reject_plans_with
        if result is None:
            self.plans[upload.mission_type] = [upload.items[seq] for seq in sorted(upload.items)]
            result = mavlink.MAV_MISSION_ACCEPTED
        self.send(self._mav.mission_ack_encode(255, 190, result, upload.mission_type))

    def _on_mission_request_list(self, message: Any) -> None:
        plan = self.plans.get(message.mission_type, [])
        self.send(self._mav.mission_count_encode(255, 190, len(plan), message.mission_type))

    def _on_mission_request_int(self, message: Any) -> None:
        item = self.plans[message.mission_type][message.seq]
        self.send(item)

    def _on_mission_clear_all(self, message: Any) -> None:
        self.plans[message.mission_type] = []
        self.send(
            self._mav.mission_ack_encode(
                255, 190, mavlink.MAV_MISSION_ACCEPTED, message.mission_type
            )
        )

    def _on_command_long(self, message: Any) -> None:
        result = self.options.command_results.get(message.command, mavlink.MAV_RESULT_ACCEPTED)
        if message.command == mavlink.MAV_CMD_COMPONENT_ARM_DISARM and self.options.arm_refusals:
            self.options.arm_refusals -= 1
            result = mavlink.MAV_RESULT_FAILED
            self.send(self._mav.statustext_encode(mavlink.MAV_SEVERITY_CRITICAL, b"Arm: Not ready"))
        if (
            message.command == mavlink.MAV_CMD_DO_FENCE_ENABLE
            and self.options.fence_enable_refusals
        ):
            self.options.fence_enable_refusals -= 1
            result = mavlink.MAV_RESULT_FAILED
        if result == mavlink.MAV_RESULT_ACCEPTED:
            self._apply_command(message)
        self.send(self._mav.command_ack_encode(message.command, result, 0, 0, 255, 190))

    def _apply_command(self, message: Any) -> None:
        match message.command:
            case mavlink.MAV_CMD_DO_SET_MODE:
                self.custom_mode = round(message.param2)
            case mavlink.MAV_CMD_COMPONENT_ARM_DISARM:
                self.armed = message.param1 == 1
            case mavlink.MAV_CMD_NAV_TAKEOFF:
                self.relative_alt_m = message.param7
            case mavlink.MAV_CMD_DO_FENCE_ENABLE:
                self.fence_enabled = message.param1 == 1
            case mavlink.MAV_CMD_BATTERY_RESET:
                self.battery_percent = message.param2
            case mavlink.MAV_CMD_DO_SET_MISSION_CURRENT:
                self.mission_seq = round(message.param1)

    def _on_param_set(self, message: Any) -> None:
        self.params[message.param_id] = message.param_value
        self.send(
            self._mav.param_value_encode(
                message.param_id.encode(), message.param_value, message.param_type, 1, 0
            )
        )

    def _on_timesync(self, message: Any) -> None:
        if self.options.answer_timesync and message.tc1 == 0:
            self.send(self._mav.timesync_encode(time.monotonic_ns(), message.ts1))
