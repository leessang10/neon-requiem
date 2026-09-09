# NEON REQUIEM visual and interaction QA

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
