# NEON REQUIEM visual and interaction QA

## Multi-weapon follow-up — 2026-09-11

- New runs receive exactly one random weapon from seven types. Rifle is no longer implicit. The 3-card level-up pool contains only new equipment and owned-weapon upgrades, with both categories represented whenever possible. Multiple weapons coexist; all-owned runs still receive three upgrade options.
- Added periodic 360-degree monowire, player-centered EMP with enemy stun/projectile clearing, anchored gravity DOT/pull, and randomized orbital strikes with a 20% boosted volley. Rifle, autonomous drone and chain arc share the same equipment and upgrade flow.
- Verified actual upgrade cards at desktop 1280×720 and mobile 390×844. All three cards fit; new/upgrade labels and current/next stats remain legible. Clicking new EMP retained monowire LV.1 and added EMP LV.1. Reloading the fixture and selecting monowire upgrade produced only monowire LV.2. Verified through the actual pause inventory.
- Inspected engine-generated simultaneous effects and boosted orbital beams in the mobile fixture. Effects retain transparent centers and distinct colors; HP/XP HUD remains unchanged. Restored the viewport after inspection.
- Fresh normal game began with gravity well alone, confirmed in pause inventory, and killed an enemy without a hidden rifle. No warnings/errors in the fresh verification tab.
- Automated tests cover all seven sole starters, simultaneous weapon execution, distinct mixed offers, repeat-click protection, high-rank/all-owned upgrades, persisted loadout/cleared transient effects, melee timing/current origin, EMP interruption/bullet clearing, gravity time-based damage and boss pull resistance, non-repeating chain targets, delayed randomized orbital strikes and increased boosted damage, pause behavior, XP and audio cues.
- Remaining tuning: full campaign difficulty and long-run balance across seven different starters. Weapon visuals are procedural Canvas effects over the existing walk-cycle art.

## Current combat update — 2026-09-11

- Preserved the selected art, four-frame walking sprites, full-width HP/XP rows, WASD/joystick and edge-aligned actions.
- Relay capture and rendering share the same 72×48 ellipse. Capture is cumulative, with 8 seconds required.
- Added charger paths, gunner aiming lines and bomber blast warnings. The final relay set summons NULL WARDEN; boss death is required for victory. Added phase-two attacks, compact boss HP and off-screen direction.
- Added event-driven combat cues under the existing mute toggle while retaining the ambient bed. Scheduling is throttled, voices are capped, and mute drops pending effects.
- Inspected the actual App/renderer through `tests/combat-preview.html`: boss fan at desktop 1280×720, targeted blast and three enemy types at 390×844. These are frozen fixtures for visibility, not a full manual campaign playthrough. Temporary viewport was reset afterward.
- Fresh live game browser check: start, sound toggle, dash, overclock, auto fire/kill/damage, pause and revised Korean help. No errors or warnings in the fresh verification tab. Development hot reload initially retained pre-change game state; reloading initialized the new state correctly.
- Engine tests cover telegraph timing, locked directions, dodge/kill counterplay, projectile invulnerability, boss spawning/phase/victory, off-screen marker, and lethal damage taking precedence over same-frame relay healing. Audio tests cover mute, burst throttling and ambient lifecycle.
- Limitations: existing enemy art is differentiated by size, labeled colored rings and attack shapes; dedicated enemy artwork, long-run balancing and physical-device audio listening remain follow-ups.

The sections below are historical initial-prototype QA. Their radar, weapon-rack and click-to-move descriptions were superseded by the confirmed gameplay refinements in AGENTS.md.

Source visual truth: `C:/Users/codecrain/.codex/generated_images/01a08414-8d46-7642-ba3d-cb78f7c7f557/exec-bb3a9c27-809c-4b8e-a96c-948774059424.png`.

Implementation: `http://127.0.0.1:4173/`.

## Evidence

- `qa/combat-desktop.png`: browser-rendered Sector 01, active combat, one relay captured, drone and arc equipped.
- `qa/hud-detail.png`: focused upper-left identity, health and XP detail.
- `qa/upgrade-desktop.png`, `qa/upgrade-mobile.png`: upgrade selection.
- `qa/combat-mobile.png`, `qa/menu-mobile.png`: mobile combat and menu.
- `qa/sector-complete.png`, `qa/sector-two.png`: all three relays captured, followed by the terminal sector with drone/arc and level carried forward.
- Saved desktop images are 1440×1024; mobile images are 390×843 despite the 390×844 CSS override (one-pixel browser capture rounding). Focus crop is 410×160.
- Desktop CSS viewport 1440×1024. Mobile CSS viewport 390×844. Browser reports DPR approximately 1. Source 1488×1056. Source and desktop implementation were shown together in the same comparison input; the small aspect-ratio difference was treated as viewport variation rather than pixel mismatch. Dynamic player position, enemy count, timer, XP and health intentionally differ from the concept.

## Comparison history and fixes

1. Initial rendered inspection found stretched battlefield sprites on narrow screens and a click interception problem from the negative canvas layer (P2/P1). Changed the game camera to uniform scaling with tracking and off-screen relay indicators, and placed canvas at layer 0 with HUD above it. Subsequent mobile capture shows correctly proportioned sprites; pointer movement and first relay capture were confirmed in browser.
2. Initial full-view comparison found missing radar and a generic weapon symbol (P2). Added radar backed by live enemy positions and a generated transparent holographic rifle asset. Increased the vitals width and moved the mission cluster clear of radar. Re-captured `combat-desktop.png` and the HUD detail, and viewed both alongside the original reference.
3. Final desktop and mobile views show no clipped persistent controls or overlapping HUD regions at tested sizes. Mobile upgrade cards stack and fit without scrolling at 390×844. Menu actions remain visible.

## Required fidelity surfaces

- Typography: Rajdhani technical display, Noto Sans KR Korean UI, Barlow Condensed menu title. Focused HUD inspection confirms readable health/XP hierarchy, tracked brand label and unobstructed numeric values. Secondary labels are deliberately compact as in the reference.
- Spacing/layout: edge-aligned vitals, central timer, right mission/radar, bottom-left weapon rack, bottom-right abilities. Gameplay owns most of the screen. Mobile uses a cropped tracking camera, compact HUD and joystick rather than distorted art.
- Color/tokens: charcoal-blue panels, cyan borders/light, magenta street reflections, red enemy/health, cyan XP, green completed objectives. Disabled abilities show actual cooldown state.
- Imagery: newly generated wet street/terminal/rooftop environments, black/cyan player, black/red enemy and cyan weapon icon. Transparent character PNGs were verified. These are independent sprites over a background, so art perspective and lighting are not an exact recreation of the still concept. This is an accepted first-playable constraint, documented in README.
- Copy/content: Korean game objectives and controls, original NEON REQUIEM identity. Dynamic numbers come from simulation. No original Warhammer assets or names remain in game UI.

## Verification

Browser: game start, click-to-move, automated shooting, damage/XP, three-choice level-up, arc installation, drone installation/stacking, healing, relay capture, Shift cooldown, Space charge consumption, pause/resume, mobile joystick input, mobile menus and upgrade layout. Console inspection returned no errors or warnings.

Additional browser playthrough: completed all three Sector 01 relays at 00:41 with 63 eliminations and level 4. Entered Sector 02; terminal artwork loaded, objectives reset to 0/3, health restored and drone/arc equipment retained. Returning to menu now resets the scene to the first district.

Engine: six automated tests pass for frame-rate independent movement, pause, ability cooldowns, XP/upgrade/healing, persistent relay capture, sector progression/final victory, death precedence and single-count enemy removal. Production build passes. Complete combat balancing across many runs and physical-device touch testing remain follow-up work.

## Follow-up polish

- P3: animated directional sprite frames and more detailed combat sound effects.
- P3: richer character portrait crop and more varied enemy silhouettes.
- P3: additional device sizes, longer playtesting and tuning of late-sector difficulty.

final result: passed

## Game title screen — 2026-09-11

Replaced the landing-page header, promotional section, and briefing card with a centered logo and vertical Start / Arsenal / Records menu. Preserved the Seoul battlefield art; background now covers the viewport without distortion and rain animates independently of gameplay time.

Verified in browser at desktop, 390×844 portrait, and 844×390 landscape. Arrow keys and Enter open the arsenal, Escape restores menu focus, records open correctly, and Enter starts a run with one weapon. Short landscape layout fits without scrolling. Production build and all 43 automated tests pass, including backdrop/rain and Sites worker checks.

## Attack splash artwork — 2026-09-11

Replaced plain attack strokes with cached transparent raster stamps: layered cyan crescents, blue shockwaves, purple vortex fragments, gold orbital impacts, electric chain splashes, and hostile plasma trails. Enemy telegraphs retain exact circular blast boundaries with translucent directional lanes and moving charge trails. Gameplay damage, cooldowns and collision calculations are unchanged. The deterministic artwork does not consume gameplay RNG.

Browser fixture: `/tests/fixtures/attack-preview.html`, showing all attack families together against the actual battlefield with pause/resume. The fixture is outside the production entry point. Production build and 43 existing tests pass.

## CC0 sampled audio — 2026-09-11

Replaced oscillator cues and ambience with 24 unmodified Kenney CC0 OGG files. Sources, pack licenses and SHA-256 hashes are retained. Browser fixture reported 24/24 decoded with no errors; sample playback and mute released active voices. Production build and 45 automated tests pass, including asset integrity, cue coverage, concurrency limits, loading failure/retry and mute/dispose races. Physical-device listening and subjective mix balance remain unverified.

## HUD, abilities and enemy roster — 2026-09-11

Added compact weapon icons/ranks below HP/XP and level labels on ability buttons. Ability cards show before/after cooldown, immunity, damage, radius and charge time. Both abilities cap at LV.6 and persist across sectors. Generated enemy-types.png supplies four walking frames per charger/gunner/bomber/boss, retaining the original soldier/player. Browser fixture scenes `roster` and `abilities` cover full loadout, enemy silhouettes and ability card interactions. Mobile 390×844 cards fit; selecting dash updates its button to LV.2.
