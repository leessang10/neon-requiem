# Prototype Instructions

User-selected direction: the first displayed NEON REQUIEM / BLACK RAIN DISTRICT mock. Keep the rain-soaked cyan/magenta Seoul battlefield, original cyberpunk world, Korean copy, edge-aligned HUD, and survivor gameplay. Selection was confirmed twice: theme first, then visual option 1.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Confirmed gameplay refinements — 2026-09-09
- Use 2–4 actual walk-cycle image frames for player and enemy movement, with idle stopping the player animation.
- Keep combat UI minimal. Health and experience are two horizontal full-width rows at the very top; remove bulky portrait, weapon rack, radar, and duplicate labels.
- Movement uses WASD and the on-screen joystick only. No click-to-move or arrow-key movement. Keep dash and overclock actions.
- Expand the world well beyond one screen; use a following camera and off-screen relay indicators. Current world is 4320×3072 (3× each original dimension).
