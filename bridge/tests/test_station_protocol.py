import json

import pytest

from gcs_bridge import station_protocol as protocol
from gcs_bridge.arducopter import COPTER_MODES
from gcs_bridge.station_protocol import LatLon, MessageStamper, parse_command_envelope
from tests.contract import assert_valid_telemetry, command_types, flight_modes


def envelope(command: dict[str, object]) -> str:
    return json.dumps({"commandId": 7, "command": command})


def test_parses_a_mission_upload() -> None:
    parsed = parse_command_envelope(
        envelope({"type": "uploadMission", "waypoints": [{"lat": 43.1, "lon": 11.6}]})
    )

    assert parsed is not None
    assert parsed.command_id == 7
    assert parsed.command == protocol.UploadMission(
        type="uploadMission", waypoints=[LatLon(lat=43.1, lon=11.6)]
    )


@pytest.mark.parametrize(
    "data",
    [
        "not json",
        envelope({"type": "selfDestruct"}),
        envelope({"type": "uploadMission", "waypoints": [{"lat": 123, "lon": 11.6}]}),
        envelope({"type": "uploadMission", "waypoints": [{"lat": 1, "lon": 1}] * 101}),
        envelope({"type": "simulateFault", "fault": "engineFire"}),
        json.dumps({"command": {"type": "ping"}}),
    ],
)
def test_rejects_commands_the_station_protocol_does_not_allow(data: str) -> None:
    assert parse_command_envelope(data) is None


def test_ignores_fields_the_protocol_does_not_know() -> None:
    parsed = parse_command_envelope(envelope({"type": "ping", "injected": "<script>"}))

    assert parsed is not None
    assert parsed.command == protocol.Ping(type="ping")


def test_understands_every_command_the_station_can_send() -> None:
    assert set(protocol.CommandType.__value__.__args__) == command_types()


def test_names_only_flight_modes_the_station_knows() -> None:
    assert set(COPTER_MODES.values()) <= flight_modes()


def test_builds_telemetry_that_matches_the_station_protocol() -> None:
    stamper = MessageStamper(
        clock=iter([10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5]).__next__
    )
    point = LatLon(lat=43.1, lon=11.6)
    bodies = [
        protocol.heartbeat("GUIDED", armed=True),
        protocol.position(point, 40.0, 5.0, 90.0),
        protocol.attitude(1.0, -2.0, 270.0),
        protocol.system_status(80, 10, "3d", 100, fence_breached=False),
        protocol.home(point),
        protocol.mission(1, [point]),
        protocol.mission_current(1, 0),
        protocol.geofence([point, point, point]),
        protocol.command_ack(3, "uploadMission", accepted=False, reason="The vehicle rejected it"),
    ]

    stamped = [stamper.stamp(body) for body in bodies]

    for message in stamped:
        assert_valid_telemetry(message)
    assert [message["seq"] for message in stamped] == list(range(1, 10))
    assert stamped[0]["timeMs"] == 500
