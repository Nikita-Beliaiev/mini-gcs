from dataclasses import dataclass
from typing import Any

from pymavlink.dialects.v20 import ardupilotmega as mavlink

from gcs_bridge.station_protocol import MAX_POINTS_PER_MESSAGE, LatLon

COPTER_MODES: dict[int, str] = {
    0: "STABILIZE",
    1: "ACRO",
    2: "ALT_HOLD",
    3: "AUTO",
    4: "GUIDED",
    5: "LOITER",
    6: "RTL",
    7: "CIRCLE",
    9: "LAND",
    11: "DRIFT",
    13: "SPORT",
    14: "FLIP",
    15: "AUTOTUNE",
    16: "POSHOLD",
    17: "BRAKE",
    18: "THROW",
    19: "AVOID_ADSB",
    20: "GUIDED_NOGPS",
    21: "SMART_RTL",
    22: "FLOWHOLD",
    23: "FOLLOW",
    24: "ZIGZAG",
    25: "SYSTEMID",
    26: "AUTOROTATE",
    27: "AUTO_RTL",
    28: "TURTLE",
    29: "RATE_ACRO",
}
COPTER_TYPES = frozenset({2, 3, 4, 13, 14, 15, 29})
MODE_AUTO = 3
MODE_GUIDED = 4

MISSION_TYPE_MISSION = mavlink.MAV_MISSION_TYPE_MISSION
MISSION_TYPE_FENCE = mavlink.MAV_MISSION_TYPE_FENCE
NAV_COMMANDS_WITH_POSITION = frozenset({16, 17, 18, 19, 21, 31, 82})
FIRST_WAYPOINT_SEQ = 2


def mode_name(autopilot: int, vehicle_type: int, custom_mode: int) -> str:
    if autopilot != mavlink.MAV_AUTOPILOT_ARDUPILOTMEGA or vehicle_type not in COPTER_TYPES:
        return "UNKNOWN"
    return COPTER_MODES.get(custom_mode, "UNKNOWN")


def degrees_e7(value: float) -> int:
    return round(value * 1e7)


def to_lat_lon(lat_e7: int, lon_e7: int) -> LatLon | None:
    lat, lon = lat_e7 / 1e7, lon_e7 / 1e7
    if (lat_e7 == 0 and lon_e7 == 0) or abs(lat) > 90 or abs(lon) > 180:
        return None
    return LatLon(lat=lat, lon=lon)


@dataclass(frozen=True)
class MissionItem:
    seq: int
    frame: int
    command: int
    x: int = 0
    y: int = 0
    z: float = 0.0
    param1: float = 0.0

    def to_message(
        self, mav: mavlink.MAVLink, target_system: int, target_component: int, mission_type: int
    ) -> Any:
        return mav.mission_item_int_encode(
            target_system,
            target_component,
            self.seq,
            self.frame,
            self.command,
            0,
            1,
            self.param1,
            0,
            0,
            0,
            self.x,
            self.y,
            self.z,
            mission_type,
        )

    @classmethod
    def from_message(cls, message: Any) -> "MissionItem":
        return cls(
            seq=message.seq,
            frame=message.frame,
            command=message.command,
            x=message.x,
            y=message.y,
            z=message.z,
            param1=message.param1,
        )


@dataclass(frozen=True)
class MissionPlan:
    items: list[MissionItem]
    waypoint_sequences: list[int]


def mission_plan(home: LatLon, waypoints: list[LatLon], altitude_m: float) -> MissionPlan:
    relative = mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT
    items = [
        MissionItem(
            0,
            mavlink.MAV_FRAME_GLOBAL,
            mavlink.MAV_CMD_NAV_WAYPOINT,
            degrees_e7(home.lat),
            degrees_e7(home.lon),
        ),
        MissionItem(1, relative, mavlink.MAV_CMD_NAV_TAKEOFF, z=altitude_m),
    ]
    sequences = []
    for index, waypoint in enumerate(waypoints):
        seq = FIRST_WAYPOINT_SEQ + index
        items.append(
            MissionItem(
                seq,
                relative,
                mavlink.MAV_CMD_NAV_WAYPOINT,
                degrees_e7(waypoint.lat),
                degrees_e7(waypoint.lon),
                altitude_m,
            )
        )
        sequences.append(seq)
    items.append(MissionItem(len(items), relative, mavlink.MAV_CMD_NAV_RETURN_TO_LAUNCH))
    return MissionPlan(items, sequences)


def fence_items(polygon: list[LatLon]) -> list[MissionItem]:
    return [
        MissionItem(
            seq,
            mavlink.MAV_FRAME_GLOBAL,
            mavlink.MAV_CMD_NAV_FENCE_POLYGON_VERTEX_INCLUSION,
            degrees_e7(vertex.lat),
            degrees_e7(vertex.lon),
            param1=len(polygon),
        )
        for seq, vertex in enumerate(polygon)
    ]


def route_from_items(items: list[MissionItem]) -> MissionPlan:
    route: list[MissionItem] = []
    sequences: list[int] = []
    for item in sorted(items, key=lambda candidate: candidate.seq):
        location = to_lat_lon(item.x, item.y)
        if item.seq == 0 or location is None or item.command not in NAV_COMMANDS_WITH_POSITION:
            continue
        if len(route) < MAX_POINTS_PER_MESSAGE:
            route.append(item)
            sequences.append(item.seq)
    return MissionPlan(route, sequences)


def waypoints_of(plan: MissionPlan) -> list[LatLon]:
    return [location for item in plan.items if (location := to_lat_lon(item.x, item.y)) is not None]


def polygon_from_items(items: list[MissionItem]) -> list[LatLon] | None:
    vertices = [
        item
        for item in sorted(items, key=lambda candidate: candidate.seq)
        if item.command == mavlink.MAV_CMD_NAV_FENCE_POLYGON_VERTEX_INCLUSION
    ]
    if not vertices:
        return None
    count = round(vertices[0].param1)
    polygon = [
        location
        for item in vertices[:count]
        if (location := to_lat_lon(item.x, item.y)) is not None
    ]
    return polygon if 3 <= len(polygon) <= MAX_POINTS_PER_MESSAGE else None
