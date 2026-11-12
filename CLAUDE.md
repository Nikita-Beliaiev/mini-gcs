# Mini GCS

Browser ground control station for a simulated drone: React 19, TypeScript (strict), Vite, plus `bridge/`, a Python bridge to ArduPilot SITL over MAVLink.
Features, design goals and roadmap: [README.md](README.md). Architecture: [docs/architecture.md](docs/architecture.md).

## Commands

- Node.js 24 (`.nvmrc`).
- `npm run check` runs type-check, lint, format check and tests; it must pass before every commit.
- `npm run build` must succeed before a change is called done.
- After changing `src/protocol`, run `npm run protocol:schema` and commit `bridge/contract`.
- In `bridge/` (Python 3.12, its own `.venv`): `ruff check .`, `ruff format --check .`, `mypy` and `pytest` must pass before every commit that touches it.

## Rules

- Flights are simulated: by the station's simulator or by ArduPilot SITL. The bridge listens on localhost and is documented for SITL only; do not add features aimed at real aircraft, such as radio or serial links. Keep the demo area neutral, with no real military or critical-infrastructure locations.
- Work phase by phase from the README roadmap. Propose the plan for a phase and wait for approval before implementing it.
- Keep the code explainable: small focused modules, clear names, no clever tricks without a reason. Explain non-obvious decisions in the conversation, not in code comments.
- No code comments, and no docstrings in the Python bridge.
- Every new logic module gets tests: Vitest for TypeScript, pytest for Python. UI behavior is tested through React Testing Library queries by role and name.
- The Zod schemas in `src/protocol` are the source of truth for the station protocol; the bridge follows them.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `ci:`, `docs:`), small and focused.
- Keep the README roadmap in sync with what is actually done.
