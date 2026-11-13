import asyncio
import json
import struct
from collections.abc import AsyncIterator, Callable
from pathlib import Path
from typing import Any

import pytest
from pymavlink.dialects.v20 import ardupilotmega as mavlink
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import InvalidStatus
from websockets.typing import Origin

from gcs_bridge.arducopter import MODE_AUTO, MODE_GUIDED
from gcs_bridge.bridge import Bridge, BridgeConfig
from gcs_bridge.link import Retry
from gcs_bridge.station_protocol import LatLon
from tests.contract import assert_valid_telemetry
from tests.fake_autopilot import FakeAutopilot, FakeAutopilotOptions

ROUTE = [{"lat": 43.098211, "lon": 11.646601}, {"lat": 43.096047, "lon": 11.650353}]
FENCE = [{"lat": 43.1, "lon": 11.64}, {"lat": 43.1, "lon": 11.655}, {"lat": 43.09, "lon": 11.655}]
WAIT_S = 3.0

type Telemetry = dict[str, Any]


def bridge_config(**overrides: Any) -> BridgeConfig:
    settings: dict[str, Any] = {
        "vehicle_port": 0,
        "station_port": 0,
        "retry": Retry(timeout_s=0.2, attempts=3),
        "launch_timeout_s": 5.0,
        "arm_retry_s": 0.05,
        "fence_retry_s": 0.05,
        "link_loss_s": 0.6,
        "gps_loss_s": 0.3,
        "heartbeat_interval_s": 0.1,
        "state_interval_s": 0.2,
        **overrides,
    }
    return BridgeConfig(**settings)


class Station:
    def __init__(self, connection: ClientConnection) -> None:
        self.connection = connection
        self.received: list[Telemetry] = []
        self._next_command_id = 0

    async def next(
        self, predicate: Callable[[Telemetry], bool], timeout_s: float = WAIT_S
    ) -> Telemetry:
        async with asyncio.timeout(timeout_s):
            while True:
                message: Telemetry = json.loads(await self.connection.recv())
                assert_valid_telemetry(message)
                self.received.append(message)
                if predicate(message):
                    return message

    async def command(self, command: dict[str, Any]) -> Telemetry:
        self._next_command_id += 1
        command_id = self._next_command_id
        await self.connection.send(json.dumps({"commandId": command_id, "command": command}))
        return await self.next(
            lambda message: message["type"] == "commandAck" and message["commandId"] == command_id
        )


class System:
    def __init__(self, bridge: Bridge, autopilot: FakeAutopilot) -> None:
        self.bridge = bridge
        self.autopilot = autopilot
        self.stations: list[Station] = []

    async def connect(self) -> Station:
        station = Station(await connect(self.bridge.station_url, max_queue=None))
        self.stations.append(station)
        return station

    async def station(self) -> Station:
        station = await self.connect()
        await station.next(lambda message: message["type"] == "heartbeat")
        await station.next(lambda message: message["type"] == "mission")
        return station


async def eventually(condition: Callable[[], bool], timeout_s: float = WAIT_S) -> None:
    async with asyncio.timeout(timeout_s):
        while not condition():
            await asyncio.sleep(0.02)


@pytest.fixture
def autopilot_options() -> FakeAutopilotOptions:
    return FakeAutopilotOptions()


@pytest.fixture
async def system(autopilot_options: FakeAutopilotOptions) -> AsyncIterator[System]:
    bridge = Bridge(bridge_config())
    await bridge.start()
    autopilot = FakeAutopilot(bridge.vehicle_port, autopilot_options)
    await autopilot.start()
    system = System(bridge, autopilot)
    yield system
    for station in system.stations:
        await station.connection.close()
    await autopilot.stop()
    await bridge.close()


async def test_streams_vehicle_telemetry_in_the_station_protocol(system: System) -> None:
    station = await system.station()

    await station.next(lambda message: message["type"] == "position")
    await station.next(lambda message: message["type"] == "systemStatus")

    kinds = {message["type"] for message in station.received}
    assert {"heartbeat", "home", "mission", "geofence", "position", "systemStatus"} <= kinds


async def test_asks_for_telemetry_rates_when_the_vehicle_connects(system: System) -> None:
    await system.station()

    interval = mavlink.MAV_CMD_SET_MESSAGE_INTERVAL
    requested = [m for m in system.autopilot.received if m.get_type() == "COMMAND_LONG"]
    rates = {round(m.param1): 1_000_000 / m.param2 for m in requested if m.command == interval}
    assert rates[mavlink.MAVLINK_MSG_ID_GLOBAL_POSITION_INT] == 10
    assert rates[mavlink.MAVLINK_MSG_ID_ATTITUDE] == 25


@pytest.mark.parametrize(
    "autopilot_options",
    [FakeAutopilotOptions(initial_mission=[LatLon(lat=43.097, lon=11.647)])],
)
async def test_shows_the_mission_already_on_the_vehicle(system: System) -> None:
    station = await system.connect()

    mission = await station.next(
        lambda message: message["type"] == "mission" and len(message["waypoints"]) == 1
    )

    assert mission["waypoints"] == [{"lat": 43.097, "lon": 11.647}]


async def test_uploads_a_mission_and_flies_it(system: System) -> None:
    station = await system.station()

    ack = await station.command({"type": "uploadMission", "waypoints": ROUTE})

    assert ack["accepted"] is True
    mission = await station.next(
        lambda message: message["type"] == "mission" and message["waypoints"] == ROUTE
    )
    assert mission["missionId"] == 2
    plan = system.autopilot.plans[mavlink.MAV_MISSION_TYPE_MISSION]
    assert [item.command for item in plan] == [16, 22, 16, 16, 20]
    await eventually(lambda: system.autopilot.custom_mode == MODE_AUTO)
    commands = system.autopilot.received_commands()
    assert commands.index(mavlink.MAV_CMD_COMPONENT_ARM_DISARM) < commands.index(
        mavlink.MAV_CMD_NAV_TAKEOFF
    )
    assert system.autopilot.armed
    assert system.autopilot.relative_alt_m == 80


@pytest.mark.parametrize("autopilot_options", [FakeAutopilotOptions(ignore_items=1)])
async def test_sends_a_lost_mission_item_again(system: System) -> None:
    station = await system.station()

    ack = await station.command({"type": "uploadMission", "waypoints": ROUTE})

    assert ack["accepted"] is True
    assert len(system.autopilot.plans[mavlink.MAV_MISSION_TYPE_MISSION]) == 5


@pytest.mark.parametrize(
    "autopilot_options",
    [FakeAutopilotOptions(reject_plans_with=mavlink.MAV_MISSION_INVALID_SEQUENCE)],
)
async def test_passes_on_why_the_vehicle_rejected_a_plan(system: System) -> None:
    station = await system.station()

    ack = await station.command({"type": "uploadMission", "waypoints": ROUTE})

    assert ack["accepted"] is False
    assert "MAV_MISSION_INVALID_SEQUENCE" in ack["reason"]
    assert not system.autopilot.armed


@pytest.mark.parametrize("autopilot_options", [FakeAutopilotOptions(ready_to_arm=False)])
async def test_waits_until_the_vehicle_is_ready_to_arm(system: System) -> None:
    station = await system.station()

    await station.command({"type": "uploadMission", "waypoints": ROUTE})
    await asyncio.sleep(0.3)
    assert mavlink.MAV_CMD_COMPONENT_ARM_DISARM not in system.autopilot.received_commands()

    system.autopilot.options.ready_to_arm = True
    await eventually(lambda: system.autopilot.custom_mode == MODE_AUTO)


@pytest.mark.parametrize("autopilot_options", [FakeAutopilotOptions(arm_refusals=2)])
async def test_keeps_trying_to_arm_until_the_autopilot_agrees(system: System) -> None:
    station = await system.station()

    await station.command({"type": "uploadMission", "waypoints": ROUTE})

    await eventually(lambda: system.autopilot.custom_mode == MODE_AUTO)
    arm = mavlink.MAV_CMD_COMPONENT_ARM_DISARM
    assert system.autopilot.received_commands().count(arm) == 3


@pytest.mark.parametrize("autopilot_options", [FakeAutopilotOptions(has_position=False)])
async def test_waits_for_a_position_estimate(system: System) -> None:
    station = await system.station()

    fence = await station.command({"type": "uploadGeofence", "polygon": FENCE})
    mission = await station.command({"type": "uploadMission", "waypoints": ROUTE})
    await asyncio.sleep(0.3)

    assert fence["accepted"] is False
    assert fence["reason"] == "Waiting for the vehicle position"
    assert mission["accepted"] is True
    assert mavlink.MAV_CMD_DO_SET_MODE not in system.autopilot.received_commands()


async def test_switches_to_a_new_mission_in_flight(system: System) -> None:
    system.autopilot.armed = True
    system.autopilot.custom_mode = MODE_GUIDED
    station = await system.station()
    await station.next(lambda message: message["type"] == "heartbeat" and message["armed"])

    await station.command({"type": "uploadMission", "waypoints": ROUTE})

    await eventually(lambda: system.autopilot.custom_mode == MODE_AUTO)
    assert system.autopilot.mission_seq == 2
    assert mavlink.MAV_CMD_NAV_TAKEOFF not in system.autopilot.received_commands()


async def test_uploads_and_clears_a_geofence(system: System) -> None:
    station = await system.station()

    ack = await station.command({"type": "uploadGeofence", "polygon": FENCE})

    assert ack["accepted"] is True
    assert system.autopilot.params["FENCE_TYPE"] == 4
    assert [item.param1 for item in system.autopilot.plans[1]] == [3, 3, 3]
    assert system.autopilot.fence_enabled
    await station.next(
        lambda message: message["type"] == "geofence" and message["polygon"] == FENCE
    )

    ack = await station.command({"type": "clearGeofence"})

    assert ack["accepted"] is True
    assert system.autopilot.plans[1] == []
    assert not system.autopilot.fence_enabled
    await station.next(lambda message: message["type"] == "geofence" and message["polygon"] is None)


@pytest.mark.parametrize("autopilot_options", [FakeAutopilotOptions(fence_enable_refusals=2)])
async def test_retries_enabling_a_geofence_the_autopilot_is_not_ready_for(system: System) -> None:
    station = await system.station()

    ack = await station.command({"type": "uploadGeofence", "polygon": FENCE})

    assert ack["accepted"] is True
    assert system.autopilot.fence_enabled


@pytest.mark.parametrize("autopilot_options", [FakeAutopilotOptions(fence_enable_refusals=5)])
async def test_gives_up_on_a_geofence_the_autopilot_keeps_refusing(system: System) -> None:
    station = await system.station()

    ack = await station.command({"type": "uploadGeofence", "polygon": FENCE})

    assert ack["accepted"] is False
    assert ack["reason"] == "MAV_CMD_DO_FENCE_ENABLE: MAV_RESULT_FAILED"


async def test_pings_the_autopilot_itself(system: System) -> None:
    station = await system.station()

    assert (await station.command({"type": "ping"}))["accepted"] is True

    system.autopilot.options.answer_timesync = False
    ack = await station.command({"type": "ping"})
    assert ack["accepted"] is False
    assert ack["reason"] == "TIMESYNC: no answer from the autopilot"


async def test_simulates_a_link_loss_by_holding_back_telemetry(system: System) -> None:
    station = await system.station()

    ack = await station.command({"type": "simulateFault", "fault": "linkLoss"})
    assert ack["accepted"] is True

    with pytest.raises(TimeoutError):
        await station.next(lambda message: message["type"] == "position", timeout_s=0.4)
    await station.next(lambda message: message["type"] == "position", timeout_s=1.0)


async def test_simulates_gps_loss_and_a_battery_drop_in_sitl(system: System) -> None:
    station = await system.station()

    assert (await station.command({"type": "simulateFault", "fault": "gpsLoss"}))["accepted"]
    assert system.autopilot.params["SIM_GPS1_ENABLE"] == 0
    await eventually(lambda: system.autopilot.params["SIM_GPS1_ENABLE"] == 1)

    assert (await station.command({"type": "simulateFault", "fault": "batteryDrop"}))["accepted"]
    await station.next(lambda m: m["type"] == "systemStatus" and m["batteryPercent"] == 32)


async def test_ignores_commands_outside_the_protocol(system: System) -> None:
    station = await system.station()

    await station.connection.send("not json")
    await station.connection.send(json.dumps({"commandId": 1, "command": {"type": "selfDestruct"}}))

    assert (await station.command({"type": "ping"}))["accepted"] is True


async def test_refuses_pages_from_other_origins(system: System) -> None:
    with pytest.raises(InvalidStatus):
        await connect(system.bridge.station_url, origin=Origin("https://example.com"))


async def test_rejects_commands_until_a_vehicle_connects() -> None:
    bridge = Bridge(bridge_config())
    await bridge.start()
    try:
        station = Station(await connect(bridge.station_url, max_queue=None))
        ack = await station.command({"type": "ping"})
        await station.connection.close()
    finally:
        await bridge.close()

    assert ack == {**ack, "accepted": False, "reason": "No vehicle is connected to the bridge"}


async def test_records_all_mavlink_traffic_to_a_tlog(tmp_path: Path) -> None:
    tlog = tmp_path / "flight.tlog"
    bridge = Bridge(bridge_config(tlog_path=tlog))
    await bridge.start()
    autopilot = FakeAutopilot(bridge.vehicle_port)
    await autopilot.start()
    await asyncio.sleep(0.5)
    await autopilot.stop()
    await bridge.close()

    data = tlog.read_bytes()
    timestamp_us = struct.unpack(">Q", data[:8])[0]
    assert data[8] == 0xFD
    assert timestamp_us > 1_700_000_000_000_000
    parser = mavlink.MAVLink(None)
    systems = set()
    offset = 0
    while offset < len(data):
        frame_length = 12 + data[offset + 9]
        message = parser.parse_buffer(data[offset + 8 : offset + 8 + frame_length])[0]
        systems.add(message.get_srcSystem())
        offset += 8 + frame_length
    assert systems == {1, 255}
