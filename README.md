# Mini GCS

[![CI](https://github.com/Nikita-Beliaiev/mini-gcs/actions/workflows/ci.yml/badge.svg)](https://github.com/Nikita-Beliaiev/mini-gcs/actions/workflows/ci.yml)

A mini ground control station in the browser: a live map and telemetry dashboard for a simulated drone, built with React and TypeScript.

**Live demo:** https://nikita-beliaiev.github.io/mini-gcs/

![The station flying a patrol, uploading a new mission and raising a link loss alert](docs/demo.gif)

> **Status:** the planned roadmap is complete: live telemetry, mission planning, geofencing, alerts, charts, a WebSocket simulator, end-to-end and accessibility tests. Stretch goals are listed in the [Roadmap](#roadmap).
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

## How it is built

Telemetry arrives at up to 50 Hz, and the UI stays smooth without re-rendering the React tree on every message: telemetry lives in an external store with ring buffers, updates are batched once per animation frame, readouts subscribe only to the text they show, and the map, charts and attitude indicator update the DOM directly. The same simulator runs in a Web Worker for the static demo or in Node behind a WebSocket, and the station talks to both through one transport interface.

Read **[docs/architecture.md](docs/architecture.md)** for diagrams of the data flow, a command round trip and the vehicle's flight modes, plus the protocol, trust boundaries, testing strategy and the main trade-offs.

The demo flies over farmland in Val d'Orcia, Tuscany.

## Tech stack

| Area             | Choice                                                  |
| ---------------- | ------------------------------------------------------- |
| UI               | React 19, TypeScript (strict)                           |
| Build            | Vite                                                    |
| Map              | MapLibre GL JS with OpenFreeMap tiles                   |
| Charts           | uPlot                                                   |
| State            | Custom telemetry store, Zustand for planning and alerts |
| Validation       | Zod                                                     |
| Simulator server | Node.js, ws, tsx                                        |
| Testing          | Vitest, React Testing Library, Playwright, axe          |
| Quality          | ESLint with type-aware rules, Prettier                  |
| CI/CD            | GitHub Actions, deployed to GitHub Pages                |

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

| Command               | What it does                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run dev`         | Start the dev server                                                                              |
| `npm run sim:server`  | Run the simulator in Node behind a WebSocket on port 8787                                         |
| `npm run build`       | Type-check and build for production                                                               |
| `npm run preview`     | Serve the production build locally                                                                |
| `npm run check`       | Type-check, lint, check formatting and run tests                                                  |
| `npm test`            | Run unit, component and simulator server tests once                                               |
| `npm run test:watch`  | Run the tests in watch mode                                                                       |
| `npm run test:e2e`    | Run the Playwright end-to-end and accessibility tests against a production build in Google Chrome |
| `npm run demo:record` | Record `docs/demo.gif` from a scripted Playwright session                                         |
| `npm run format`      | Format all files with Prettier                                                                    |

## Roadmap

- [x] **Phase 0:** toolchain, CI/CD, deployment, layout shell
- [x] **Phase 1:** telemetry protocol, simulator, map with vehicle and trail, telemetry panel
- [x] **Phase 2:** mission planning, geofence, alerts
- [x] **Phase 3:** charts, attitude indicator, reconnect, WebSocket simulator mode
- [x] **Phase 4:** demo GIF, architecture diagram, end-to-end tests

Stretch goals: multiple vehicles, flight log replay, video feed, MAVLink via ArduPilot SITL.

## Credits

Map tiles by [OpenFreeMap](https://openfreemap.org), map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

## License

[MIT](LICENSE) © Mykyta Beliaiev
