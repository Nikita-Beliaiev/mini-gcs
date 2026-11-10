# Mini GCS

[![CI](https://github.com/Nikita-Beliaiev/mini-gcs/actions/workflows/ci.yml/badge.svg)](https://github.com/Nikita-Beliaiev/mini-gcs/actions/workflows/ci.yml)

A mini ground control station in the browser: a live map and telemetry dashboard for a simulated drone, built with React and TypeScript.

**Live demo:** https://nikita-beliaiev.github.io/mini-gcs/

> **Status:** early development. The toolchain, CI/CD and layout shell are in place; the simulator, map and telemetry come next (see [Roadmap](#roadmap)).
>
> All flight data is simulated. This project does not connect to or control real aircraft.

## Planned features

- Live map with vehicle position, heading, flight trail and home point
- Telemetry panel: altitude, ground speed, heading, battery, GPS, link quality, flight mode and an attitude indicator
- Mission planning: add, drag and reorder waypoints on the map, then upload the route to the vehicle
- Geofence with breach alerts, plus low battery and link loss alerts
- Real-time charts for the last 60 seconds of flight
- Connection status with automatic reconnect and latency readout

## Design goals

Telemetry arrives at 10–50 Hz, and the UI has to stay smooth without re-rendering the React tree on every message:

- telemetry lives in an external store backed by a ring buffer, outside React state
- updates are batched once per animation frame
- components subscribe only to the slice they render, via `useSyncExternalStore`
- the simulator runs in a Web Worker, so the demo works on static hosting; the same simulator can run in Node behind a WebSocket, and the client talks to both through one transport interface

## Tech stack

| Area    | Choice                                                    |
| ------- | --------------------------------------------------------- |
| UI      | React 19, TypeScript (strict)                             |
| Build   | Vite                                                      |
| Map     | MapLibre GL JS _(planned)_                                |
| State   | Zustand and a custom telemetry store _(planned)_          |
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
- [ ] **Phase 1:** telemetry protocol, simulator, map with vehicle and trail, telemetry panel
- [ ] **Phase 2:** mission planning, geofence, alerts
- [ ] **Phase 3:** charts, attitude indicator, reconnect, WebSocket simulator mode
- [ ] **Phase 4:** demo GIF, architecture diagram, end-to-end tests

Stretch goals: multiple vehicles, flight log replay, video feed, MAVLink via ArduPilot SITL.

## License

[MIT](LICENSE) © Mykyta Beliaiev
