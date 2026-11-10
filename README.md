# Mini GCS

[![CI](https://github.com/Nikita-Beliaiev/mini-gcs/actions/workflows/ci.yml/badge.svg)](https://github.com/Nikita-Beliaiev/mini-gcs/actions/workflows/ci.yml)

A mini ground control station in the browser: a live map and telemetry dashboard for a simulated drone, built with React and TypeScript.

**Live demo:** https://nikita-beliaiev.github.io/mini-gcs/

![The station flying a patrol, uploading a new mission and raising a link loss alert](docs/demo.gif)

> **Status:** in development. Telemetry, mission planning, geofencing, alerts, charts and the WebSocket simulator work; end-to-end tests and a recorded demo come next (see [Roadmap](#roadmap)).
>
> All flight data is simulated. This project does not connect to or control real aircraft.

## Features

- Live map with vehicle position and heading, flight trail, home point and a follow-vehicle mode
- Telemetry panel with an attitude indicator: flight mode, arming state, altitude, ground speed, heading, roll, pitch, battery, GPS fix and satellites, link quality
- Charts for the last 60 seconds of altitude, ground speed, battery and link quality
- Mission planning: add waypoints on the map, drag them, reorder or remove them in a list, check them against the rules and upload the route to the vehicle
- Geofence: draw a polygon, upload it, and the vehicle returns home when it crosses the border
- Alerts for link loss, geofence breach, low and critical battery and GPS fix loss, with acknowledgement
- Simulator controls that inject a link loss, a GPS loss or a battery drop, to see how the station reacts
- Two simulator modes: in a Web Worker for the static demo, or in Node behind a WebSocket, with automatic reconnect
- Connection status with a latency readout
- Simulated quadcopter that acquires GPS, takes off, flies its mission once, returns home, lands, swaps the battery and flies again

## Design goals

Telemetry arrives at 10–50 Hz, and the UI has to stay smooth without re-rendering the React tree on every message:

- telemetry lives in an external store backed by ring buffers, outside React state
- updates are batched once per animation frame
- components subscribe only to the slice they render, via `useSyncExternalStore`; the 50 Hz attitude indicator, the map and the charts update the DOM directly
- the simulator runs in a Web Worker, so the demo works on static hosting; the same simulator runs in Node behind a WebSocket, and the client talks to both through one transport interface
- data from the network is checked against the protocol schemas before it reaches the store

## How it works

```
Web Worker simulator ──┐
                       ├─▶ Transport ─▶ TelemetryStore ─┬─▶ telemetry panel and attitude indicator
Node WebSocket server ─┘       ▲                        ├─▶ map and charts (direct subscriptions, no React render)
                               │                        └─▶ alert monitor ─▶ alert store (Zustand)
                               └── command sender ◀── mission and geofence planner (Zustand)
```

- **Simulator** (`src/simulator`, `server`): a pure, seeded flight model with no DOM or worker dependencies. One loop steps it every 20 ms, either in a Web Worker or in a Node WebSocket server that streams to every connected station and answers each command to its sender only.
- **Transport** (`src/transport`): one interface for connecting, disconnecting, connection status, incoming messages and outgoing commands. The status is `connecting` until the first heartbeat arrives. The WebSocket transport validates every message and reconnects after 1, 2, 4, 8 and then every 10 seconds, with ±20% jitter so many stations do not reconnect at once.
- **Commands** (`src/station/commandSender.ts`): every command gets an id, and the sender waits for the acknowledgement with that id. Without an answer in 3 s the result is `noResponse`. A ping every 2 s measures the round-trip latency.
- **Telemetry store** (`src/telemetry`): keeps the latest message of each type and ring buffers of the last 1200 positions and 240 status reports, and notifies subscribers at most once per animation frame.
- **Planning** (`src/planning`, `src/mission`): mission and geofence drafts live in a Zustand store. The same validation rules run in the browser before upload and on the vehicle, which has the final say.
- **Alerts** (`src/alerts`): pure rules turn telemetry into alerts. A watchdog re-checks them every second, because a lost link means no new data to react to.
- **UI**: each readout selects one formatted value, so it re-renders only when the text it shows changes. The map and the charts are loaded lazily, and so is the WebSocket transport with its validation code.

### Telemetry protocol

Messages are loosely modelled on MAVLink: each type has its own rate, plus a sequence number and simulation time. The TypeScript types are inferred from Zod schemas, so one definition describes the protocol and validates untrusted data at runtime.

| Message          | Rate      | Contents                                                       |
| ---------------- | --------- | -------------------------------------------------------------- |
| `heartbeat`      | 1 Hz      | flight mode, armed state                                       |
| `position`       | 10 Hz     | latitude, longitude, altitude above home, speed, heading       |
| `attitude`       | 50 Hz     | roll, pitch, yaw                                               |
| `systemStatus`   | 2 Hz      | battery, GPS fix and satellites, link quality, geofence breach |
| `home`           | 0.2 Hz    | home position                                                  |
| `mission`        | 0.2 Hz    | id and waypoints of the mission on the vehicle                 |
| `missionCurrent` | 1 Hz      | waypoint the vehicle is flying to                              |
| `geofence`       | 0.2 Hz    | geofence polygon on the vehicle, or none                       |
| `commandAck`     | on demand | whether a command was accepted, and why not                    |

Commands from the station: `uploadMission`, `uploadGeofence`, `clearGeofence` and `ping` for the vehicle, and `simulateFault` for the simulator itself. `mission` and `geofence` are also sent right after a change.

The demo flies over farmland in Val d'Orcia, Tuscany.

## Tech stack

| Area             | Choice                                                    |
| ---------------- | --------------------------------------------------------- |
| UI               | React 19, TypeScript (strict)                             |
| Build            | Vite                                                      |
| Map              | MapLibre GL JS with OpenFreeMap tiles                     |
| Charts           | uPlot                                                     |
| State            | Custom telemetry store, Zustand for planning and alerts   |
| Validation       | Zod                                                       |
| Simulator server | Node.js, ws, tsx                                          |
| Testing          | Vitest, React Testing Library, Playwright _(e2e planned)_ |
| Quality          | ESLint with type-aware rules, Prettier                    |
| CI/CD            | GitHub Actions, deployed to GitHub Pages                  |

## Getting started

Requires Node.js 24 (see `.nvmrc`).

```bash
npm ci
npm run dev
```

The station starts its own simulator in a Web Worker. To run the simulator in Node behind a WebSocket instead:

```bash
npm run sim:server
```

Then open http://localhost:5173/?server=ws://127.0.0.1:8787. The server listens on `127.0.0.1` only; set `SIM_PORT` to use another port. Stop and start the server to see the station reconnect.

## Scripts

| Command               | What it does                                              |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | Start the dev server                                      |
| `npm run sim:server`  | Run the simulator in Node behind a WebSocket on port 8787 |
| `npm run build`       | Type-check and build for production                       |
| `npm run preview`     | Serve the production build locally                        |
| `npm run check`       | Type-check, lint, check formatting and run tests          |
| `npm test`            | Run unit, component and simulator server tests once       |
| `npm run test:watch`  | Run the tests in watch mode                               |
| `npm run demo:record` | Record `docs/demo.gif` from a scripted Playwright session |
| `npm run format`      | Format all files with Prettier                            |

## Roadmap

- [x] **Phase 0:** toolchain, CI/CD, deployment, layout shell
- [x] **Phase 1:** telemetry protocol, simulator, map with vehicle and trail, telemetry panel
- [x] **Phase 2:** mission planning, geofence, alerts
- [x] **Phase 3:** charts, attitude indicator, reconnect, WebSocket simulator mode
- [ ] **Phase 4:** demo GIF, architecture diagram, end-to-end tests

Stretch goals: multiple vehicles, flight log replay, video feed, MAVLink via ArduPilot SITL.

## Credits

Map tiles by [OpenFreeMap](https://openfreemap.org), map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

## License

[MIT](LICENSE) © Mykyta Beliaiev
