# Audio credits

The OGG sound effects in `public/audio/kenney/` are by **Kenney** (https://kenney.nl), released under **Creative Commons Zero (CC0 1.0)**.

- Sci-fi Sounds 1.0: https://kenney.nl/assets/sci-fi-sounds
- Interface Sounds 1.0: https://kenney.nl/assets/interface-sounds
- License: https://creativecommons.org/publicdomain/zero/1.0/

Downloaded from the author's official site on 2026-09-11. Original license notices are included as `LICENSE-sci-fi.txt` and `LICENSE-interface.txt` beside the audio. Credit is voluntary under the pack license and retained here for provenance. Files are copied unchanged; `manifest.json` lists their pack, byte size and original SHA-256 checksum. Playback volume/rate and ambient looping are configured at runtime in `src/audio.js`.

Sci-fi files provide laser shots, monowire sweeps, EMP/force fields, electric arcs, gravity effects, thrusters, metal impacts, explosions and a quiet engine ambience. Interface files provide selection, upgrades, relay completion, warning and victory cues.

Files are served locally with the app; no external audio host is contacted during gameplay. Audio starts muted and loads/decodes after the sound toggle is pressed. Samples are cached per audio context; failed files retry on the next enable. SFX overlap is limited to 24 voices and a compressor controls peaks. Frequent shots rotate samples without consuming gameplay randomness.
