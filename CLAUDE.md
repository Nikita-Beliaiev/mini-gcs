# Mini GCS

Browser ground control station for a simulated drone: React 19, TypeScript (strict), Vite.
Features, design goals and roadmap: [README.md](README.md).

## Commands

- Node.js 24 (`.nvmrc`).
- `npm run check` runs type-check, lint, format check and tests; it must pass before every commit.
- `npm run build` must succeed before a change is called done.

## Rules

- Simulated data only. Never add code that connects to or controls real aircraft. Keep the demo area neutral, with no real military or critical-infrastructure locations.
- Work phase by phase from the README roadmap. Propose the plan for a phase and wait for approval before implementing it.
- Keep the code explainable: small focused modules, clear names, no clever tricks without a reason. Explain non-obvious decisions in the conversation, not in code comments.
- No code comments.
- Every new logic module gets Vitest tests; UI behavior is tested through React Testing Library queries by role and name.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `ci:`, `docs:`), small and focused.
- Keep the README roadmap in sync with what is actually done.
