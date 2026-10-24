# Winter art handoff

Generated with built-in ImageGen. Exact prompts and targeted corrections are in generation.json; accepted source WebPs retain genuine alpha. Rebuild with `python3 americangirldollrace/tools/effects/winter/build.py` (Pillow, NumPy, SciPy).

SM1: assets/snowman_sprites.webp is 2048×512, four 512px cells. One common source scale; full silhouette height at most400px, foot baseline490, center256. Four consecutive running poses, scarf flap, passing feet and body squash. No baked shadow or ground.

SM2: assets/tracks/winter/powerups.webp changes only cell2, the EMP icon. Cells0,1,3,4 are exactly identical decoded RGBA to winter-powerups-before.webp. The icon and runner share coal eyes/smile, carrot nose, black top hat and red-white scarf.

Art-only delivery: gameplay registration, cache stamp and acceptance remain with the gameplay agent. Add snowman to TRACK_SHARED_ART. No production JavaScript is changed here.

Validation: alpha and margins checked on every exported frame, and all images reopened after WebP export. 36 unit tests and55 silent browser smoke tests passed. runtime-review.webp uses the actual drawMonster and drawEmpSnowman functions against the current Winter track; the standalone fixture sets RACE_TEST_SILENT and loads no audio scripts.
