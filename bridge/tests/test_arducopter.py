from pymavlink.dialects.v20 import ardupilotmega as mavlink

from gcs_bridge.arducopter import (
    MissionItem,
    fence_items,
    mission_plan,
    mode_name,
    polygon_from_items,
    route_from_items,
    to_lat_lon,
    waypoints_of,
)
from gcs_bridge.station_protocol import LatLon

HOME = LatLon(lat=43.095, lon=11.645)
ROUTE = [LatLon(lat=43.098211, lon=11.646601), LatLon(lat=43.096047, lon=11.650353)]


def test_names_arducopter_modes_only_for_copters() -> None:
    copter, plane = mavlink.MAV_TYPE_QUADROTOR, mavlink.MAV_TYPE_FIXED_WING
    ardupilot = mavlink.MAV_AUTOPILOT_ARDUPILOTMEGA

    assert mode_name(ardupilot, copter, 4) == "GUIDED"
    assert mode_name(ardupilot, copter, 8) == "UNKNOWN"
    assert mode_name(ardupilot, plane, 4) == "UNKNOWN"
    assert mode_name(mavlink.MAV_AUTOPILOT_PX4, copter, 4) == "UNKNOWN"


def test_treats_a_zero_position_as_no_fix() -> None:
    assert to_lat_lon(0, 0) is None
    assert to_lat_lon(1_000_000_000, 0) is None
    assert to_lat_lon(430_950_000, 116_450_000) == HOME


def test_turns_a_route_into_an_arducopter_mission() -> None:
    plan = mission_plan(HOME, ROUTE, altitude_m=40)

    assert [item.command for item in plan.items] == [
        mavlink.MAV_CMD_NAV_WAYPOINT,
        mavlink.MAV_CMD_NAV_TAKEOFF,
        mavlink.MAV_CMD_NAV_WAYPOINT,
        mavlink.MAV_CMD_NAV_WAYPOINT,
        mavlink.MAV_CMD_NAV_RETURN_TO_LAUNCH,
    ]
    assert [item.seq for item in plan.items] == [0, 1, 2, 3, 4]
    assert plan.items[1].z == 40
    assert plan.items[2].frame == mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT
    assert plan.waypoint_sequences == [2, 3]


def test_reads_back_the_route_of_a_mission_from_the_vehicle() -> None:
    plan = mission_plan(HOME, ROUTE, altitude_m=40)

    route = route_from_items(list(reversed(plan.items)))

    assert waypoints_of(route) == ROUTE
    assert route.waypoint_sequences == [2, 3]


def test_round_trips_a_geofence_polygon() -> None:
    polygon = [
        LatLon(lat=43.1, lon=11.64),
        LatLon(lat=43.1, lon=11.655),
        LatLon(lat=43.09, lon=11.655),
    ]

    items = fence_items(polygon)

    assert [item.param1 for item in items] == [3, 3, 3]
    assert polygon_from_items(items) == polygon


def test_has_no_geofence_without_inclusion_vertices() -> None:
    assert polygon_from_items([]) is None
    assert (
        polygon_from_items([MissionItem(0, 0, mavlink.MAV_CMD_NAV_FENCE_CIRCLE_INCLUSION)]) is None
    )
