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

## Approved combat improvements — 2026-09-11
- Implement the recommended sequence: align relay capture with its visible ellipse, add combat sound effects, add charger/gunner/bomber behaviors, then a final-sector boss.
- Preserve the selected battlefield art, WASD/joystick movement, and minimal HUD. Use attack telegraphs and the existing mute control; final victory requires all three final-sector relays and defeating the boss.

## Confirmed multi-weapon progression — 2026-09-11
- Start each run with exactly one random weapon, including the rifle in the random pool rather than always granting it.
- Allow multiple weapons to operate simultaneously. The three level-up choices must be new weapon equipment or upgrades to owned weapons, visibly distinguished on their cards; standalone stat/heal cards are superseded.
- Add cyberpunk weapons with periodic player-centered melee, area attacks, and powerful randomized attacks: monowire, EMP nova, gravity well, orbital strikes. Preserve the minimal combat HUD; show owned weapons in the pause menu.

## Confirmed title-screen direction — 2026-09-11
- The start screen must feel like a game title screen, replacing website navigation, promotional copy, and briefing cards with a prominent logo and focused vertical game menu.
- Preserve the cyan/magenta Seoul battlefield art and Korean copy. Use ambient rain and keyboard-accessible Start / Arsenal / Records menus; keep combat UI intact.

## Confirmed attack-art direction — 2026-09-11
- Player and enemy attacks should use textured splash/sprite effects instead of bare lines: luminous slash trails, shockwave bursts, vortex fragments, plasma projectiles, and explosive impacts.
- Preserve attack timing, damage, and readable enemy telegraphs. Cache effect artwork for reuse and keep the approved title screen.

## Confirmed sound direction — 2026-09-11
- Replace synthesized sound effects with free, openly licensed audio files. Use local Kenney CC0 Sci-fi Sounds and Interface Sounds samples, retaining original licenses and provenance in AUDIO-CREDITS.md.
- Keep the mute control, limit overlapping combat sounds, and distinguish player weapons, enemy attacks, impacts and interface feedback.
