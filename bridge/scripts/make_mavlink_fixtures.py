import json
import struct
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pymavlink.dialects.v10 import ardupilotmega as mavlink1
from pymavlink.dialects.v20 import ardupilotmega as mavlink2

OUTPUT = Path(__file__).resolve().parents[2] / "src" / "mavlink" / "fixtures"
START_US = int(datetime(2026, 11, 12, 10, 0, tzinfo=UTC).timestamp() * 1_000_000)

MAV_TYPE_FIXED_WING = 1
MAV_TYPE_QUADROTOR = 2
MAV_TYPE_GCS = 6
MAV_AUTOPILOT_ARDUPILOTMEGA = 3
MAV_AUTOPILOT_INVALID = 8
DISARMED = 89
ARMED = 217
STABILIZE, AUTO, GUIDED = 0, 3, 4
FRAME_GLOBAL = 0
FRAME_GLOBAL_RELATIVE_ALT_INT = 6
NAV_WAYPOINT = 16
NAV_TAKEOFF = 22
FENCE_POLYGON_VERTEX_INCLUSION = 5001
MISSION = 0
FENCE = 1


def degrees_e7(value: float) -> int:
    return round(value * 1e7)


def vehicle() -> mavlink2.MAVLink:
    return mavlink2.MAVLink(None, srcSystem=1, srcComponent=1)


def station() -> mavlink2.MAVLink:
    return mavlink2.MAVLink(None, srcSystem=255, srcComponent=190)


def decoded(frame: bytes) -> dict[str, Any]:
    parser = mavlink2.MAVLink(None)
    message = parser.parse_char(frame)
    assert message is not None, "pymavlink could not parse its own frame"
    fields: dict[str, Any] = message.to_dict()
    return fields


def frame_fixtures() -> dict[str, Any]:
    mav = vehicle()
    messages: list[tuple[str, Any]] = [
        (
            "HEARTBEAT",
            mav.heartbeat_encode(MAV_TYPE_QUADROTOR, MAV_AUTOPILOT_ARDUPILOTMEGA, ARMED, AUTO, 4),
        ),
        (
            "HEARTBEAT plane",
            mav.heartbeat_encode(MAV_TYPE_FIXED_WING, MAV_AUTOPILOT_ARDUPILOTMEGA, ARMED, AUTO, 4),
        ),
        ("SYS_STATUS", mav.sys_status_encode(0, 0, 0, 0, 12600, 2810, 87, 0, 0, 0, 0, 0, 0)),
        (
            "SYS_STATUS unknown battery",
            mav.sys_status_encode(1, 1, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0),
        ),
        ("GPS_RAW_INT", mav.gps_raw_int_encode(1, 6, 1, 2, 3, 121, 200, 0, 0, 10)),
        ("ATTITUDE", mav.attitude_encode(1000, 0.1, -0.2, -1.5, 0, 0, 0)),
        (
            "GLOBAL_POSITION_INT",
            mav.global_position_int_encode(
                1000,
                degrees_e7(43.0951234),
                degrees_e7(11.6451234),
                440070,
                39996,
                -250,
                300,
                0,
                12345,
            ),
        ),
        ("MISSION_CURRENT", mav.mission_current_encode(3, 7, 2, 1)),
        ("MISSION_COUNT", mav.mission_count_encode(1, 1, 5, FENCE)),
        ("MISSION_CLEAR_ALL", mav.mission_clear_all_encode(1, 1, FENCE)),
        ("MISSION_ACK", mav.mission_ack_encode(255, 190, 0, FENCE)),
        (
            "MISSION_ITEM_INT",
            mav.mission_item_int_encode(
                1,
                1,
                2,
                FRAME_GLOBAL_RELATIVE_ALT_INT,
                NAV_WAYPOINT,
                0,
                1,
                3,
                0,
                0,
                0,
                degrees_e7(43.098211),
                degrees_e7(11.646601),
                40,
                MISSION,
            ),
        ),
        ("FENCE_STATUS", mav.fence_status_encode(1, 2, 1, 1000, 0)),
        (
            "HOME_POSITION",
            mav.home_position_encode(
                degrees_e7(43.095), degrees_e7(11.645), 400100, 0, 0, 0, [1, 0, 0, 0], 0, 0, 0
            ),
        ),
        ("VFR_HUD", mav.vfr_hud_encode(1, 2, 90, 30, 440, 0)),
    ]
    frames = []
    for label, message in messages:
        frame = bytes(message.pack(mav))
        frames.append({"label": label, "hex": frame.hex(), "fields": decoded(frame)})

    v1 = mavlink1.MAVLink(None, srcSystem=1, srcComponent=1)
    v1_frame = bytes(
        v1.heartbeat_encode(
            MAV_TYPE_QUADROTOR, MAV_AUTOPILOT_ARDUPILOTMEGA, DISARMED, GUIDED, 3
        ).pack(v1)
    )

    signer = vehicle()
    signer.signing.secret_key = bytes(range(32))
    signer.signing.link_id = 1
    signer.signing.timestamp = 1
    signer.signing.sign_outgoing = True
    signed_frame = bytes(signer.mission_current_encode(4, 7, 2, 1).pack(signer))

    return {
        "frames": frames,
        "v1Heartbeat": v1_frame.hex(),
        "signedMissionCurrent": signed_frame.hex(),
    }


class TlogBuilder:
    def __init__(self) -> None:
        self.data = bytearray()
        self.vehicle = vehicle()
        self.station = station()

    @staticmethod
    def pack(mav: mavlink2.MAVLink, message: Any) -> bytes:
        frame = bytes(message.pack(mav))
        mav.seq = (mav.seq + 1) % 256
        return frame

    def add(self, offset_ms: int, mav: mavlink2.MAVLink, message: Any) -> None:
        self.data += struct.pack(">Q", START_US + offset_ms * 1000)
        self.data += self.pack(mav, message)

    def from_vehicle(self, offset_ms: int, message: Any) -> None:
        self.add(offset_ms, self.vehicle, message)

    def from_station(self, offset_ms: int, message: Any) -> None:
        self.add(offset_ms, self.station, message)

    def lose_vehicle_frame(self, message: Any) -> None:
        self.pack(self.vehicle, message)


def flight_tlog() -> bytes:
    log = TlogBuilder()
    v = log.vehicle
    s = log.station
    home = (43.095, 11.645)
    route = [(43.098211, 11.646601), (43.096047, 11.650353)]
    fence = [(43.1, 11.64), (43.1, 11.655), (43.09, 11.655)]

    log.from_station(0, s.heartbeat_encode(MAV_TYPE_GCS, MAV_AUTOPILOT_INVALID, 0, 0, 0))
    log.from_vehicle(
        10,
        v.heartbeat_encode(MAV_TYPE_QUADROTOR, MAV_AUTOPILOT_ARDUPILOTMEGA, DISARMED, STABILIZE, 3),
    )
    log.from_vehicle(20, v.global_position_int_encode(1, 0, 0, 0, 0, 0, 0, 0, 65535))
    log.from_vehicle(
        30,
        v.home_position_encode(
            degrees_e7(home[0]), degrees_e7(home[1]), 400100, 0, 0, 0, [1, 0, 0, 0], 0, 0, 0
        ),
    )
    log.from_vehicle(40, v.gps_raw_int_encode(1, 3, 1, 1, 1, 0, 0, 0, 0, 9))
    log.from_vehicle(50, v.sys_status_encode(0, 0, 0, 0, 12600, 0, 95, 0, 0, 0, 0, 0, 0))
    log.data += bytes([0xFD, 0x09, 0x00, 0x13, 0x37, 0xFE, 0x42])

    log.from_vehicle(
        1000, v.heartbeat_encode(MAV_TYPE_QUADROTOR, MAV_AUTOPILOT_ARDUPILOTMEGA, ARMED, GUIDED, 4)
    )
    log.from_vehicle(
        1010,
        v.global_position_int_encode(
            1010, degrees_e7(43.0951), degrees_e7(11.6452), 412000, 12000, 300, 400, 0, 9000
        ),
    )
    log.from_vehicle(1020, v.attitude_encode(1020, 0.1, -0.05, -1.5707963, 0, 0, 0))

    items = [
        s.mission_item_int_encode(
            1,
            1,
            0,
            FRAME_GLOBAL,
            NAV_WAYPOINT,
            0,
            1,
            0,
            0,
            0,
            0,
            degrees_e7(home[0]),
            degrees_e7(home[1]),
            0,
            MISSION,
        ),
        s.mission_item_int_encode(
            1, 1, 1, FRAME_GLOBAL_RELATIVE_ALT_INT, NAV_TAKEOFF, 0, 1, 0, 0, 0, 0, 0, 0, 40, MISSION
        ),
    ] + [
        s.mission_item_int_encode(
            1,
            1,
            2 + index,
            FRAME_GLOBAL_RELATIVE_ALT_INT,
            NAV_WAYPOINT,
            0,
            1,
            0,
            0,
            0,
            0,
            degrees_e7(lat),
            degrees_e7(lon),
            40,
            MISSION,
        )
        for index, (lat, lon) in enumerate(route)
    ]
    log.from_station(1100, s.mission_count_encode(1, 1, len(items), MISSION))
    for index, item in enumerate(items):
        log.from_vehicle(1110 + index * 20, v.mission_request_int_encode(255, 190, index, MISSION))
        log.from_station(1120 + index * 20, item)
    log.from_vehicle(1200, v.mission_ack_encode(255, 190, 0, MISSION))

    log.from_station(1300, s.mission_count_encode(1, 1, len(fence), FENCE))
    for index, (lat, lon) in enumerate(fence):
        log.from_station(
            1310 + index * 10,
            s.mission_item_int_encode(
                1,
                1,
                index,
                FRAME_GLOBAL,
                FENCE_POLYGON_VERTEX_INCLUSION,
                0,
                1,
                len(fence),
                0,
                0,
                0,
                degrees_e7(lat),
                degrees_e7(lon),
                0,
                FENCE,
            ),
        )
    log.from_vehicle(1400, v.mission_ack_encode(255, 190, 0, FENCE))

    log.from_vehicle(
        2000, v.heartbeat_encode(MAV_TYPE_QUADROTOR, MAV_AUTOPILOT_ARDUPILOTMEGA, ARMED, AUTO, 4)
    )
    log.from_vehicle(2010, v.mission_current_encode(1, len(items), 2, 1))
    log.from_vehicle(2020, v.mission_current_encode(3, len(items), 2, 1))
    log.from_vehicle(2030, v.fence_status_encode(1, 1, 1, 2000, 0))
    log.lose_vehicle_frame(v.vfr_hud_encode(1, 2, 90, 30, 440, 0))
    log.lose_vehicle_frame(v.vfr_hud_encode(1, 2, 90, 30, 440, 0))
    log.from_vehicle(2040, v.sys_status_encode(0, 0, 0, 0, 12500, 0, 94, 0, 0, 0, 0, 0, 0))

    log.from_station(2100, s.mission_clear_all_encode(1, 1, FENCE))
    log.from_vehicle(2110, v.mission_ack_encode(255, 190, 0, FENCE))
    log.from_vehicle(2120, v.vfr_hud_encode(1, 2, 90, 30, 440, 0))
    log.data += bytes.fromhex("0000019a7d")
    return bytes(log.data)


def waypoint(mav: mavlink2.MAVLink, target: int, seq: int, lat: float, lon: float) -> Any:
    return mav.mission_item_int_encode(
        target,
        1,
        seq,
        FRAME_GLOBAL_RELATIVE_ALT_INT,
        NAV_WAYPOINT,
        0,
        1,
        0,
        0,
        0,
        0,
        degrees_e7(lat),
        degrees_e7(lon),
        40,
        MISSION,
    )


def transfers_tlog() -> bytes:
    log = TlogBuilder()
    v = log.vehicle
    s = log.station

    log.from_vehicle(
        0,
        v.heartbeat_encode(MAV_TYPE_QUADROTOR, MAV_AUTOPILOT_ARDUPILOTMEGA, DISARMED, STABILIZE, 3),
    )

    log.from_station(100, s.mission_request_list_encode(1, 1, MISSION))
    log.from_vehicle(110, v.mission_count_encode(255, 190, 2, MISSION))
    log.from_vehicle(120, waypoint(v, 255, 0, 43.095, 11.645))
    log.from_vehicle(130, waypoint(v, 255, 1, 43.097, 11.647))
    log.from_station(140, s.mission_ack_encode(1, 1, 0, MISSION))

    log.from_station(200, s.mission_count_encode(1, 1, 2, MISSION))
    log.from_station(210, waypoint(s, 1, 0, 43.095, 11.645))
    log.from_station(220, waypoint(s, 1, 1, 43.099, 11.649))
    log.from_vehicle(230, v.mission_ack_encode(255, 190, 2, MISSION))

    log.from_station(300, s.mission_count_encode(1, 1, 3, MISSION))
    log.from_station(310, waypoint(s, 1, 0, 43.095, 11.645))
    log.from_station(320, waypoint(s, 1, 1, 43.091, 11.641))
    log.from_vehicle(330, v.mission_ack_encode(255, 190, 0, MISSION))
    return bytes(log.data)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "frames.json").write_text(
        json.dumps(frame_fixtures(), indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    (OUTPUT / "flight.tlog").write_bytes(flight_tlog())
    (OUTPUT / "transfers.tlog").write_bytes(transfers_tlog())
    print(f"Wrote fixtures to {OUTPUT}")


if __name__ == "__main__":
    main()
