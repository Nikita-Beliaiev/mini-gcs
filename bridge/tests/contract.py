import json
from functools import cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "contract" / "station-protocol.schema.json"


@cache
def _schemas() -> dict[str, Any]:
    schemas: dict[str, Any] = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    return schemas


def command_types() -> set[str]:
    commands = _schemas()["commandEnvelope"]["properties"]["command"]["oneOf"]
    return {command["properties"]["type"]["const"] for command in commands}


def flight_modes() -> set[str]:
    heartbeat = next(
        message
        for message in _schemas()["telemetryMessage"]["oneOf"]
        if message["properties"]["type"]["const"] == "heartbeat"
    )
    return set(heartbeat["properties"]["mode"]["enum"])


def assert_valid_telemetry(message: dict[str, Any]) -> None:
    Draft202012Validator(_schemas()["telemetryMessage"]).validate(message)
