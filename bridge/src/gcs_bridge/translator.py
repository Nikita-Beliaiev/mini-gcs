import math
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field

from pymavlink.dialects.v20 import ardupilotmega as mavlink

from gcs_bridge import station_protocol as protocol
from gcs_bridge.arducopter import mode_name, to_lat_lon
from gcs_bridge.link import Message, Target
from gcs_bridge.station_protocol import GpsFix, LatLon, Telemetry

LINK_WINDOW_S = 2.0
VEHICLE_TIMEOUT_S = 3.0
UNKNOWN_HEADING = 65535
UNKNOWN_SATELLITES = 255
SNAPSHOT_TYPES = ("heartbeat", "home", "mission", "geofence", "systemStatus", "position")


@dataclass
class VehicleState:
    target: Target | None = None
    last_heartbeat_at: float | None = None
    armed: bool = False
    relative_altitude_m: float = 0.0
    ready_to_arm: bool = False
    home: LatLon | None = None
    mission_id: int = 0
    mission_sequences: list[int] = field(default_factory=list)


@dataclass(frozen=True)
class Translation:
    telemetry: list[Telemetry]
    vehicle_appeared: bool = False


def gps_fix_for(fix_type: int) -> GpsFix:
    if fix_type >= mavlink.GPS_FIX_TYPE_3D_FIX:
        return "3d"
    return "2d" if fix_type == mavlink.GPS_FIX_TYPE_2D_FIX else "none"


def is_vehicle_heartbeat(message: Message) -> bool:
    return bool(
        message.get_type() == "HEARTBEAT"
        and message.type != mavlink.MAV_TYPE_GCS
        and message.autopilot != mavlink.MAV_AUTOPILOT_INVALID
    )


class TelemetryTranslator:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self.state = VehicleState()
        self._clock = clock
        self._latest: dict[str, Telemetry] = {}
        self._battery_percent: float | None = None
        self._gps_satellites = 0
        self._gps_fix: GpsFix = "none"
        self._fence_breached = False
        self._yaw_deg = 0.0
        self._last_frame_seq: int | None = None
        self._link_samples: deque[tuple[float, int]] = deque()

    def translate(self, message: Message) -> Translation:
        now = self._clock()
        appeared = False
        if is_vehicle_heartbeat(message) and self._vehicle_was_silent(now):
            self.state.target = Target(message.get_srcSystem(), message.get_srcComponent())
            self._last_frame_seq = None
            self._link_samples.clear()
            appeared = True

        target = self.state.target
        if target is None or (message.get_srcSystem(), message.get_srcComponent()) != (
            target.system_id,
            target.component_id,
        ):
            return Translation([], appeared)

        self._track_link(message.get_seq(), now)
        telemetry = self._handle(message, now)
        for body in telemetry:
            self._latest[body["type"]] = body
        return Translation(telemetry, appeared)

    def set_mission(self, waypoints: list[LatLon], sequences: list[int]) -> Telemetry:
        self.state.mission_id += 1
        self.state.mission_sequences = sequences
        body = protocol.mission(self.state.mission_id, waypoints)
        self._latest["mission"] = body
        return body

    def set_geofence(self, polygon: list[LatLon] | None) -> Telemetry:
        body = protocol.geofence(polygon)
        self._latest["geofence"] = body
        return body

    def snapshot(self, types: tuple[str, ...] = SNAPSHOT_TYPES) -> list[Telemetry]:
        return [self._latest[name] for name in types if name in self._latest]

    def vehicle_silent_for(self) -> float | None:
        last = self.state.last_heartbeat_at
        return None if last is None else self._clock() - last

    def _vehicle_was_silent(self, now: float) -> bool:
        last = self.state.last_heartbeat_at
        return last is None or now - last > VEHICLE_TIMEOUT_S

    def _track_link(self, sequence: int, now: float) -> None:
        lost = 0 if self._last_frame_seq is None else (sequence - self._last_frame_seq - 1) % 256
        self._last_frame_seq = sequence
        self._link_samples.append((now, lost))

    def _link_quality_percent(self, now: float) -> float:
        while self._link_samples and self._link_samples[0][0] < now - LINK_WINDOW_S:
            self._link_samples.popleft()
        received = len(self._link_samples)
        lost = sum(sample[1] for sample in self._link_samples)
        return 0 if received == 0 else round(received / (received + lost) * 100)

    def _handle(self, message: Message, now: float) -> list[Telemetry]:
        match message.get_type():
            case "HEARTBEAT":
                self.state.last_heartbeat_at = now
                self.state.armed = bool(message.base_mode & mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
                mode = mode_name(message.autopilot, message.type, message.custom_mode)
                return [protocol.heartbeat(mode, self.state.armed)]
            case "GLOBAL_POSITION_INT":
                return self._position(message)
            case "ATTITUDE":
                self._yaw_deg = math.degrees(message.yaw) % 360
                return [
                    protocol.attitude(
                        math.degrees(message.roll), math.degrees(message.pitch), self._yaw_deg
                    )
                ]
            case "GPS_RAW_INT":
                satellites = message.satellites_visible
                self._gps_satellites = 0 if satellites == UNKNOWN_SATELLITES else satellites
                self._gps_fix = gps_fix_for(message.fix_type)
                return []
            case "FENCE_STATUS":
                self._fence_breached = message.breach_status != 0
                return []
            case "SYS_STATUS":
                return [self._system_status(message, now)]
            case "HOME_POSITION":
                location = to_lat_lon(message.latitude, message.longitude)
                if location is None:
                    return []
                self.state.home = location
                return [protocol.home(location)]
            case "MISSION_CURRENT":
                return self._mission_current(message.seq)
            case _:
                return []

    def _position(self, message: Message) -> list[Telemetry]:
        location = to_lat_lon(message.lat, message.lon)
        if location is None:
            return []
        self.state.relative_altitude_m = message.relative_alt / 1000
        heading = self._yaw_deg if message.hdg == UNKNOWN_HEADING else message.hdg / 100
        return [
            protocol.position(
                location,
                self.state.relative_altitude_m,
                math.hypot(message.vx, message.vy) / 100,
                heading,
            )
        ]

    def _system_status(self, message: Message, now: float) -> Telemetry:
        if message.battery_remaining >= 0:
            self._battery_percent = message.battery_remaining
        prearm = mavlink.MAV_SYS_STATUS_PREARM_CHECK
        self.state.ready_to_arm = bool(message.onboard_control_sensors_health & prearm)
        return protocol.system_status(
            battery_percent=100 if self._battery_percent is None else self._battery_percent,
            gps_satellites=self._gps_satellites,
            gps_fix=self._gps_fix,
            link_quality_percent=self._link_quality_percent(now),
            fence_breached=self._fence_breached,
        )

    def _mission_current(self, seq: int) -> list[Telemetry]:
        sequences = self.state.mission_sequences
        index = next((i for i, item_seq in enumerate(sequences) if item_seq >= seq), None)
        if self.state.mission_id == 0 or index is None:
            return []
        return [protocol.mission_current(self.state.mission_id, index)]
