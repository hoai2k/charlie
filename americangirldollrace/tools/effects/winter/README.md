# Winter art handoff

Generated with built-in ImageGen. Exact prompts and targeted corrections are in generation.json; accepted source WebPs retain genuine alpha. Rebuild with `python3 americangirldollrace/tools/effects/winter/build.py` (Pillow, NumPy, SciPy).

SM1: assets/snowman_sprites.webp is 2048×512, four 512px cells. One common source scale; full silhouette height at most400px, foot baseline490, center256. Four consecutive running poses, scarf flap, passing feet and body squash. No baked shadow or ground.

SM2: assets/tracks/winter/powerups.webp changes only cell2, the EMP icon. Cells0,1,3,4 are exactly identical decoded RGBA to winter-powerups-before.webp. The icon and runner share coal eyes/smile, carrot nose, black top hat and red-white scarf.

Art-only delivery: gameplay registration, cache stamp and acceptance remain with the gameplay agent. Add snowman to TRACK_SHARED_ART. No production JavaScript is changed here.

Validation: alpha and margins checked on every exported frame, and all images reopened after WebP export. 36 unit tests and55 silent browser smoke tests passed. runtime-review.webp uses the actual drawMonster and drawEmpSnowman functions against the current Winter track; the standalone fixture sets RACE_TEST_SILENT and loads no audio scripts.

IT1: assets/icetroll_sprites.webp is 1254×1672, 3×4 cells of418, same right-facing pose order as monster_sprites.webp. Its first idle is343px high, matching the original troll; all twelve foot/pile baselines are407. Final pose is a stationary broken-ice/snow heap with his icicle-bearded head on top. No baked shadow or ground. Source segmentation follows complete silhouettes because generated row gutters vary; every source silhouette has transparent margins and is checked before packing.

Measured grabHands are [[300,230],[295,110],[323,120]], for grab/lift/throw. icetroll-anchors.json records them and the intended scale1. The bottom row of runtime-review.webp checks Lily held at these contacts using the game’s torso anchor y270. Gameplay agent should register icetroll in MONSTERS with these hands; no snores, dissipate or sparks. Winter already requests monster icetroll.

Run check.py for dimensions, all12+4 alpha margins and baselines, unchanged icon cells and hand contacts on painted pixels.

Final batch rechecked after syncing: 36 unit and56 silent browser tests passed.
