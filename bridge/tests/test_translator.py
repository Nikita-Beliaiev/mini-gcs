import math

import pytest
from pymavlink.dialects.v20 import ardupilotmega as mavlink

from gcs_bridge.arducopter import degrees_e7
from gcs_bridge.station_protocol import LatLon
from gcs_bridge.translator import TelemetryTranslator
from tests.contract import assert_valid_telemetry
from tests.mavlink_messages import Sender

QUAD = mavlink.MAV_TYPE_QUADROTOR
ARDUPILOT = mavlink.MAV_AUTOPILOT_ARDUPILOTMEGA
ARMED = mavlink.MAV_MODE_FLAG_SAFETY_ARMED | mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED


class Clock:
    def __init__(self) -> None:
        self.now = 100.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def translator(clock: Clock) -> TelemetryTranslator:
    return TelemetryTranslator(clock)


@pytest.fixture
def vehicle() -> Sender:
    return Sender()


def connect(translator: TelemetryTranslator, vehicle: Sender, armed: bool = False) -> None:
    base_mode = ARMED if armed else mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED
    translator.translate(vehicle(vehicle.mav.heartbeat_encode(QUAD, ARDUPILOT, base_mode, 4, 4)))


def translate(translator: TelemetryTranslator, message: object) -> list[dict[str, object]]:
    telemetry = translator.translate(message).telemetry
    for body in telemetry:
        assert_valid_telemetry({**body, "seq": 1, "timeMs": 0})
    return telemetry


def test_finds_the_vehicle_from_its_heartbeat(
    translator: TelemetryTranslator, vehicle: Sender
) -> None:
    translation = translator.translate(
        vehicle(vehicle.mav.heartbeat_encode(QUAD, ARDUPILOT, ARMED, 3, 4))
    )

    assert translation.vehicle_appeared
    assert translation.telemetry == [{"type": "heartbeat", "mode": "AUTO", "armed": True}]
    assert translator.state.armed


def test_ignores_ground_stations_and_other_systems(translator: TelemetryTranslator) -> None:
    station = Sender(system_id=255, component_id=190)
    other = Sender(system_id=7)
    gcs = mavlink.MAV_TYPE_GCS

    assert translate(translator, station(station.mav.heartbeat_encode(gcs, 8, 0, 0, 0))) == []
    assert translator.state.target is None
    connect(translator, Sender())
    message = other.mav.global_position_int_encode(0, 430950000, 116450000, 0, 0, 0, 0, 0, 0)
    assert translate(translator, other(message)) == []


def test_reconnects_after_the_vehicle_has_been_silent(
    translator: TelemetryTranslator, vehicle: Sender, clock: Clock
) -> None:
    connect(translator, vehicle)
    heartbeat = vehicle.mav.heartbeat_encode(QUAD, ARDUPILOT, 0, 0, 3)

    clock.now += 1
    assert not translator.translate(vehicle(heartbeat)).vehicle_appeared
    clock.now += 5
    assert translator.translate(vehicle(heartbeat)).vehicle_appeared


def test_skips_the_zero_position_sent_before_a_fix(
    translator: TelemetryTranslator, vehicle: Sender
) -> None:
    connect(translator, vehicle)

    no_fix = vehicle.mav.global_position_int_encode(0, 0, 0, 0, 0, 0, 0, 0, 65535)
    assert translate(translator, vehicle(no_fix)) == []

    fix = vehicle.mav.global_position_int_encode(
        0, degrees_e7(43.0951), degrees_e7(11.6452), 412_000, 12_000, 300, 400, 0, 9000
    )
    assert translate(translator, vehicle(fix)) == [
        {
            "type": "position",
            "lat": 43.0951,
            "lon": 11.6452,
            "altitudeM": 12.0,
            "groundSpeedMs": 5.0,
            "headingDeg": 90.0,
        }
    ]
    assert translator.state.relative_altitude_m == 12.0


def test_converts_attitude_to_degrees(translator: TelemetryTranslator, vehicle: Sender) -> None:
    connect(translator, vehicle)

    [attitude] = translate(
        translator, vehicle(vehicle.mav.attitude_encode(0, 0.1, -0.05, -math.pi / 2, 0, 0, 0))
    )

    assert attitude["rollDeg"] == pytest.approx(5.7296, abs=1e-3)
    assert attitude["pitchDeg"] == pytest.approx(-2.8648, abs=1e-3)
    assert attitude["yawDeg"] == pytest.approx(270, abs=1e-3)


def test_combines_battery_gps_fence_and_readiness(
    translator: TelemetryTranslator, vehicle: Sender
) -> None:
    connect(translator, vehicle)
    prearm = mavlink.MAV_SYS_STATUS_PREARM_CHECK
    translate(translator, vehicle(vehicle.mav.gps_raw_int_encode(0, 6, 0, 0, 0, 0, 0, 0, 0, 12)))
    translate(translator, vehicle(vehicle.mav.fence_status_encode(1, 1, 1, 0, 0)))

    [status] = translate(
        translator,
        vehicle(
            vehicle.mav.sys_status_encode(prearm, prearm, prearm, 0, 0, 0, 77, 0, 0, 0, 0, 0, 0)
        ),
    )

    assert status == {
        "type": "systemStatus",
        "batteryPercent": 77,
        "gpsSatellites": 12,
        "gpsFix": "3d",
        "linkQualityPercent": 100,
        "fenceBreached": True,
    }
    assert translator.state.ready_to_arm


def test_measures_link_quality_from_lost_frames(
    translator: TelemetryTranslator, vehicle: Sender
) -> None:
    connect(translator, vehicle)
    vehicle.skip(3)

    [status] = translate(
        translator, vehicle(vehicle.mav.sys_status_encode(0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0))
    )

    assert status["linkQualityPercent"] == 40
    assert status["batteryPercent"] == 100


def test_maps_the_current_mission_item_to_a_waypoint(
    translator: TelemetryTranslator, vehicle: Sender
) -> None:
    connect(translator, vehicle)
    route = [LatLon(lat=43.1, lon=11.6), LatLon(lat=43.2, lon=11.7)]
    mission = translator.set_mission(route, [2, 3])

    assert mission["missionId"] == 1
    assert translate(translator, vehicle(vehicle.mav.mission_current_encode(1, 5, 0, 0))) == [
        {"type": "missionCurrent", "missionId": 1, "waypointIndex": 0}
    ]
    assert translate(translator, vehicle(vehicle.mav.mission_current_encode(3, 5, 0, 0))) == [
        {"type": "missionCurrent", "missionId": 1, "waypointIndex": 1}
    ]
    assert translate(translator, vehicle(vehicle.mav.mission_current_encode(4, 5, 0, 0))) == []


def test_keeps_the_latest_state_for_new_stations(
    translator: TelemetryTranslator, vehicle: Sender
) -> None:
    connect(translator, vehicle)
    home = vehicle.mav.home_position_encode(430950000, 116450000, 0, 0, 0, 0, [1, 0, 0, 0], 0, 0, 0)
    translate(translator, vehicle(home))
    translator.set_geofence(None)

    assert [body["type"] for body in translator.snapshot()] == ["heartbeat", "home", "geofence"]
    assert translator.state.home == LatLon(lat=43.095, lon=11.645)


def test_knows_the_position_estimate_only_when_the_ekf_has_one(
    translator: TelemetryTranslator, vehicle: Sender
) -> None:
    connect(translator, vehicle)
    origin_set = mavlink.EKF_POS_HORIZ_ABS | mavlink.EKF_CONST_POS_MODE

    translate(translator, vehicle(vehicle.mav.ekf_status_report_encode(origin_set, 0, 0, 0, 0, 0)))
    assert not translator.state.has_position

    using_gps = mavlink.EKF_POS_HORIZ_ABS | mavlink.EKF_ATTITUDE
    translate(translator, vehicle(vehicle.mav.ekf_status_report_encode(using_gps, 0, 0, 0, 0, 0)))
    assert translator.state.has_position
