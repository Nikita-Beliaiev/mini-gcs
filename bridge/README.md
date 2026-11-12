# gcs-bridge

A Python bridge that lets the Mini GCS station fly a real ArduPilot autopilot. It speaks MAVLink to the autopilot over UDP and the station's own JSON protocol over a WebSocket, so the station needs no MAVLink code for live flights.

It is meant for [ArduPilot SITL](https://ardupilot.org/dev/docs/sitl-simulator-software-in-the-loop.html), the official simulator. The server listens on `127.0.0.1` only.

```text
ArduPilot SITL  ──MAVLink over UDP 14550──>  gcs-bridge  ──JSON over WebSocket 8788──>  Mini GCS
```

## Run it with ArduPilot SITL

Requires Python 3.12.

```bash
cd bridge
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[dev]"     # .venv/bin/python on Linux and macOS
```

Start SITL so that it sends MAVLink to the bridge, with home at the demo field:

```bash
# Windows: the build Mission Planner uses, from firmware.ardupilot.org/Tools/MissionPlanner/sitl/CopterStable/
ArduCopter.elf --model quad --home 43.095,11.645,400,0 --defaults copter.parm -I0 --serial0 udpclient:127.0.0.1:14550

# Linux: from an ArduPilot checkout
Tools/autotest/sim_vehicle.py -v ArduCopter --custom-location=43.095,11.645,400,0 --out=udp:127.0.0.1:14550 --no-mavproxy
```

Then start the bridge and the station:

```bash
.venv/Scripts/gcs-bridge --tlog flight.tlog
npm run dev                                          # in the repository root
```

Open http://localhost:5173/?server=ws://127.0.0.1:8788. The vehicle appears on the ground at home. Draw a route and upload it: the bridge uploads the mission, waits until ArduCopter is ready to arm, takes off in GUIDED to 40 m and switches to AUTO. At the end of the route the mission returns home and lands.

| Option           | Default | What it does                                        |
| ---------------- | ------- | --------------------------------------------------- |
| `--vehicle-port` | `14550` | UDP port the autopilot sends MAVLink to             |
| `--port`         | `8788`  | WebSocket port for the station                      |
| `--allow-origin` |         | Another page origin allowed to connect (repeatable) |
| `--altitude`     | `40`    | Takeoff and waypoint altitude above home, in metres |
| `--tlog`         |         | Record all MAVLink traffic to a `.tlog` file        |

A recorded `.tlog` opens in the station's replay, like logs from Mission Planner or QGroundControl.

## How it works

| Module                | Responsibility                                                                         |
| --------------------- | -------------------------------------------------------------------------------------- |
| `link.py`             | MAVLink over UDP with pymavlink as the codec, listeners, and waiting for a reply       |
| `translator.py`       | Autopilot messages to station telemetry, and the vehicle state the commands rely on    |
| `mission_transfer.py` | The MAVLink mission protocol: upload, download and clear, with timeouts and retries    |
| `vehicle_control.py`  | `COMMAND_LONG` with acknowledgements, parameters, and a `TIMESYNC` round trip for ping |
| `arducopter.py`       | Flight mode numbers and how a station route becomes an ArduCopter mission              |
| `station_protocol.py` | The station's commands as pydantic models, and builders for telemetry messages         |
| `bridge.py`           | Wires the autopilot, the WebSocket server and the station's commands together          |

- **Uploading a mission** follows the MAVLink mission protocol: `MISSION_COUNT`, then one `MISSION_ITEM_INT` for each `MISSION_REQUEST_INT`, until `MISSION_ACK`. A lost message is sent again; the vehicle's rejection, such as `MAV_MISSION_INVALID_SEQUENCE`, reaches the station as the reason.
- **A station route becomes** home, a takeoff, the waypoints at the takeoff altitude and a return to launch.
- **When the vehicle connects**, the bridge asks for telemetry rates with `MAV_CMD_SET_MESSAGE_INTERVAL` and downloads the mission and geofence already on it. It does this again after the vehicle has been silent for 3 s, for example after SITL restarts.
- **Ping** measures a `TIMESYNC` round trip to the autopilot, not to the bridge.
- **Link quality** comes from gaps in the autopilot's frame sequence numbers over the last 2 s.
- **Commands run concurrently**, so a ping is not stuck behind an upload, but everything that changes the vehicle takes one lock, so two uploads never interleave.

The station's simulator controls map to SITL:

| Station control | In SITL                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| Link loss       | The bridge stops forwarding telemetry and commands for 10 s              |
| GPS loss        | `SIM_GPS1_ENABLE` is set to 0 for 15 s; ArduCopter's EKF failsafe reacts |
| Battery drop    | `MAV_CMD_BATTERY_RESET` sets the remaining charge to 32%                 |

## The contract with the station

The station's Zod schemas are the source of truth for the protocol. `npm run protocol:schema` exports them as JSON Schema to [`contract/station-protocol.schema.json`](contract/station-protocol.schema.json), a station test fails when that file is out of date, and the bridge's tests check every message it sends against it.

## Tests and checks

```bash
.venv/Scripts/python -m pytest
.venv/Scripts/ruff check .
.venv/Scripts/ruff format --check .
.venv/Scripts/mypy
```

The tests run the bridge against a small fake ArduCopter that speaks MAVLink over real UDP sockets, and connect to it with a real WebSocket client, so they need no SITL.

`scripts/make_mavlink_fixtures.py` writes the MAVLink fixtures for the station's TypeScript decoder with pymavlink, so the decoder is checked against the reference implementation instead of against itself.
