# Mini GCS

[![CI](https://github.com/Nikita-Beliaiev/mini-gcs/actions/workflows/ci.yml/badge.svg)](https://github.com/Nikita-Beliaiev/mini-gcs/actions/workflows/ci.yml)

A mini ground control station in the browser: a live map and telemetry dashboard for a simulated drone, built with React and TypeScript.

**Live demo:** https://nikita-beliaiev.github.io/mini-gcs/

> **Status:** in development. The simulator, live map and telemetry panel work; mission planning and alerts come next (see [Roadmap](#roadmap)).
>
> All flight data is simulated. This project does not connect to or control real aircraft.

## Features

- Live map with vehicle position and heading, flight trail, home point and a follow-vehicle mode
- Telemetry panel: flight mode, arming state, altitude, ground speed, heading, battery, GPS fix and satellites, link quality
- Simulated quadcopter that acquires GPS, takes off, flies a patrol loop, returns home on low battery, lands, swaps the battery and flies again
- Connection status with connect and disconnect

## Planned features

- Mission planning: add, drag and reorder waypoints on the map, then upload the route to the vehicle
- Geofence with breach alerts, plus low battery and link loss alerts
- Real-time charts for the last 60 seconds of flight and an attitude indicator
- Automatic reconnect and latency readout

## Design goals

Telemetry arrives at 10–50 Hz, and the UI has to stay smooth without re-rendering the React tree on every message:

- telemetry lives in an external store backed by a ring buffer, outside React state
- updates are batched once per animation frame
- components subscribe only to the slice they render, via `useSyncExternalStore`
- the simulator runs in a Web Worker, so the demo works on static hosting; the same simulator can run in Node behind a WebSocket, and the client talks to both through one transport interface

## How it works

```
Web Worker: simulator ─▶ Transport ─▶ TelemetryStore ─┬─▶ telemetry panel (useSyncExternalStore)
                                                      └─▶ map (direct subscription, no React render)
```

- **Simulator** (`src/simulator`): a pure, seeded flight model with no DOM or worker dependencies. A thin worker script steps it every 50 ms and posts the messages it emits.
- **Transport** (`src/transport`): one interface for connecting, disconnecting, connection status and incoming messages. The status is `connecting` until the first heartbeat arrives.
- **Telemetry store** (`src/telemetry`): keeps the latest message of each type and a ring buffer of the last 1200 positions, and notifies subscribers at most once per animation frame.
- **UI**: each readout selects one formatted value, so it re-renders only when the text it shows changes. The map is loaded lazily and updates MapLibre sources and markers directly.

### Telemetry protocol

Messages are loosely modelled on MAVLink: each type has its own rate, plus a sequence number and simulation time.

| Message        | Rate   | Contents                                                 |
| -------------- | ------ | -------------------------------------------------------- |
| `heartbeat`    | 1 Hz   | flight mode, armed state                                 |
| `position`     | 10 Hz  | latitude, longitude, altitude above home, speed, heading |
| `systemStatus` | 2 Hz   | battery, GPS fix and satellites, link quality            |
| `home`         | 0.2 Hz | home position                                            |

The demo flies over farmland in Val d'Orcia, Tuscany.

## Tech stack

| Area    | Choice                                                    |
| ------- | --------------------------------------------------------- |
| UI      | React 19, TypeScript (strict)                             |
| Build   | Vite                                                      |
| Map     | MapLibre GL JS with OpenFreeMap tiles                     |
| State   | Custom telemetry store, Zustand for app state _(planned)_ |
| Charts  | uPlot _(planned)_                                         |
| Testing | Vitest, React Testing Library, Playwright _(e2e planned)_ |
| Quality | ESLint with type-aware rules, Prettier                    |
| CI/CD   | GitHub Actions, deployed to GitHub Pages                  |

## Getting started

Requires Node.js 24 (see `.nvmrc`).

```bash
npm ci
npm run dev
```

## Scripts

| Command              | What it does                                     |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start the dev server                             |
| `npm run build`      | Type-check and build for production              |
| `npm run preview`    | Serve the production build locally               |
| `npm run check`      | Type-check, lint, check formatting and run tests |
| `npm test`           | Run unit tests once                              |
| `npm run test:watch` | Run unit tests in watch mode                     |
| `npm run format`     | Format all files with Prettier                   |

## Roadmap

- [x] **Phase 0:** toolchain, CI/CD, deployment, layout shell
- [x] **Phase 1:** telemetry protocol, simulator, map with vehicle and trail, telemetry panel
- [ ] **Phase 2:** mission planning, geofence, alerts
- [ ] **Phase 3:** charts, attitude indicator, reconnect, WebSocket simulator mode
- [ ] **Phase 4:** demo GIF, architecture diagram, end-to-end tests

Stretch goals: multiple vehicles, flight log replay, video feed, MAVLink via ArduPilot SITL.

## Credits

Map tiles by [OpenFreeMap](https://openfreemap.org), map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

## License

[MIT](LICENSE) © Mykyta Beliaiev
