import argparse
import asyncio
import contextlib
import logging
from pathlib import Path

from gcs_bridge.bridge import DEFAULT_ALLOWED_ORIGINS, Bridge, BridgeConfig


def parse_args() -> BridgeConfig:
    parser = argparse.ArgumentParser(
        prog="gcs-bridge",
        description="Connect the Mini GCS station to an ArduPilot autopilot over MAVLink.",
    )
    parser.add_argument("--vehicle-host", default="127.0.0.1", help="UDP address to listen on")
    parser.add_argument("--vehicle-port", type=int, default=14550, help="UDP port to listen on")
    parser.add_argument("--host", default="127.0.0.1", help="WebSocket address for the station")
    parser.add_argument("--port", type=int, default=8788, help="WebSocket port for the station")
    parser.add_argument(
        "--allow-origin",
        action="append",
        default=[],
        help="Extra page origin allowed to connect, for example http://localhost:5174",
    )
    parser.add_argument("--altitude", type=float, default=80.0, help="Takeoff altitude in metres")
    parser.add_argument("--tlog", type=Path, help="Record all MAVLink traffic to this .tlog file")
    args = parser.parse_args()
    return BridgeConfig(
        vehicle_host=args.vehicle_host,
        vehicle_port=args.vehicle_port,
        station_host=args.host,
        station_port=args.port,
        allowed_origins=(*DEFAULT_ALLOWED_ORIGINS, *args.allow_origin),
        takeoff_altitude_m=args.altitude,
        tlog_path=args.tlog,
    )


async def run(config: BridgeConfig) -> None:
    bridge = Bridge(config)
    await bridge.start()
    logging.getLogger("gcs_bridge").info(
        "Listening for MAVLink on udp://%s:%d, station at %s",
        config.vehicle_host,
        bridge.vehicle_port,
        bridge.station_url,
    )
    try:
        await asyncio.Event().wait()
    finally:
        await bridge.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(run(parse_args()))


if __name__ == "__main__":
    main()
