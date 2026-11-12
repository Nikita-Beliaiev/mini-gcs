import time
from collections.abc import Callable
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

MAX_POINTS_PER_MESSAGE = 100

type Telemetry = dict[str, Any]
type GpsFix = Literal["none", "2d", "3d"]
type CommandType = Literal[
    "uploadMission", "uploadGeofence", "clearGeofence", "simulateFault", "ping"
]


class LatLon(BaseModel):
    model_config = ConfigDict(frozen=True)

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


type PointList = Annotated[list[LatLon], Field(max_length=MAX_POINTS_PER_MESSAGE)]


class UploadMission(BaseModel):
    type: Literal["uploadMission"]
    waypoints: PointList


class UploadGeofence(BaseModel):
    type: Literal["uploadGeofence"]
    polygon: PointList


class ClearGeofence(BaseModel):
    type: Literal["clearGeofence"]


class SimulateFault(BaseModel):
    type: Literal["simulateFault"]
    fault: Literal["linkLoss", "gpsLoss", "batteryDrop"]


class Ping(BaseModel):
    type: Literal["ping"]


type Command = Annotated[
    UploadMission | UploadGeofence | ClearGeofence | SimulateFault | Ping,
    Field(discriminator="type"),
]


class CommandEnvelope(BaseModel):
    command_id: int = Field(alias="commandId")
    command: Command


def parse_command_envelope(data: str | bytes) -> CommandEnvelope | None:
    try:
        return CommandEnvelope.model_validate_json(data)
    except ValidationError:
        return None


def point(value: LatLon) -> dict[str, float]:
    return {"lat": value.lat, "lon": value.lon}


def heartbeat(mode: str, armed: bool) -> Telemetry:
    return {"type": "heartbeat", "mode": mode, "armed": armed}


def position(
    location: LatLon, altitude_m: float, ground_speed_ms: float, heading_deg: float
) -> Telemetry:
    return {
        "type": "position",
        **point(location),
        "altitudeM": altitude_m,
        "groundSpeedMs": ground_speed_ms,
        "headingDeg": heading_deg,
    }


def attitude(roll_deg: float, pitch_deg: float, yaw_deg: float) -> Telemetry:
    return {"type": "attitude", "rollDeg": roll_deg, "pitchDeg": pitch_deg, "yawDeg": yaw_deg}


def system_status(
    battery_percent: float,
    gps_satellites: int,
    gps_fix: GpsFix,
    link_quality_percent: float,
    fence_breached: bool,
) -> Telemetry:
    return {
        "type": "systemStatus",
        "batteryPercent": battery_percent,
        "gpsSatellites": gps_satellites,
        "gpsFix": gps_fix,
        "linkQualityPercent": link_quality_percent,
        "fenceBreached": fence_breached,
    }


def home(location: LatLon) -> Telemetry:
    return {"type": "home", **point(location)}


def mission(mission_id: int, waypoints: list[LatLon]) -> Telemetry:
    return {
        "type": "mission",
        "missionId": mission_id,
        "waypoints": [point(waypoint) for waypoint in waypoints],
    }


def mission_current(mission_id: int, waypoint_index: int) -> Telemetry:
    return {"type": "missionCurrent", "missionId": mission_id, "waypointIndex": waypoint_index}


def geofence(polygon: list[LatLon] | None) -> Telemetry:
    return {
        "type": "geofence",
        "polygon": None if polygon is None else [point(vertex) for vertex in polygon],
    }


def command_ack(
    command_id: int, command: CommandType, accepted: bool, reason: str | None
) -> Telemetry:
    return {
        "type": "commandAck",
        "commandId": command_id,
        "command": command,
        "accepted": accepted,
        "reason": reason,
    }


class MessageStamper:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._started_at = clock()
        self._sequence = 0

    def stamp(self, body: Telemetry) -> Telemetry:
        self._sequence += 1
        elapsed_ms = round((self._clock() - self._started_at) * 1000)
        return {**body, "seq": self._sequence, "timeMs": elapsed_ms}
