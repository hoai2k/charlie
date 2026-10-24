# Winter art handoff

Generated with built-in ImageGen. Exact prompts and targeted corrections are in generation.json; accepted source WebPs retain genuine alpha. Rebuild with `python3 americangirldollrace/tools/effects/winter/build.py` (Pillow, NumPy, SciPy).

SM1: assets/snowman_sprites.webp is 2048×512, four 512px cells. One common source scale; full silhouette height at most400px, foot baseline490, center256. Four consecutive running poses, scarf flap, passing feet and body squash. No baked shadow or ground.

SM2: assets/tracks/winter/powerups.webp changes only cell2, the EMP icon. Cells0,1,3,4 are exactly identical decoded RGBA to winter-powerups-before.webp. The icon and runner share coal eyes/smile, carrot nose, black top hat and red-white scarf.

Art-only delivery: gameplay registration, cache stamp and acceptance remain with the gameplay agent. Add snowman to TRACK_SHARED_ART. No production JavaScript is changed here.

Validation: alpha and margins checked on every exported frame, and all images reopened after WebP export. 36 unit tests and55 silent browser smoke tests passed. runtime-review.webp uses the actual drawMonster and drawEmpSnowman functions against the current Winter track; the standalone fixture sets RACE_TEST_SILENT and loads no audio scripts.

IT1: assets/icetroll_sprites.webp is 1254×1672, 3×4 cells of418, same right-facing pose order as monster_sprites.webp. Its first idle is343px high, matching the original troll; all twelve foot/pile baselines are407. Final pose is a stationary broken-ice/snow heap with no head, face or body parts. No baked shadow or ground. Source segmentation follows complete silhouettes because generated row gutters vary; every source silhouette has transparent margins and is checked before packing.

Measured grabHands are [[300,230],[295,110],[323,120]], for grab/lift/throw. icetroll-anchors.json records them and the intended scale1. The bottom row of runtime-review.webp checks Lily held at these contacts using the game’s torso anchor y270. Gameplay agent should register icetroll in MONSTERS with these hands; no snores, dissipate or sparks. Winter already requests monster icetroll.

Run check.py for dimensions, all12+4 alpha margins and baselines, unchanged icon cells and hand contacts on painted pixels.

Final batch rechecked after syncing: 36 unit and56 silent browser tests passed.

## Owner revision: faceless pile and melting (2026-10-24)

The final defeated cell is now ordinary ice chunks and snow, with no face/head. The other11 monster cells remain decoded RGBA pixel-identical, including all hand contacts. assets/icetroll_melt_sprites.webp is2508×418: six418px cells, first exactly identical to the new defeated cell, then wet heap, half melted, a few chunks, tiny remnants, water only. All share one scale, center x210, baseline407, renderer anchor193409. Heights decrease monotonically; do not fit or scale each melt frame separately.

Use the current monster draw rectangle and origin for the melt sequence, advancing0→5 once and retaining the water or fading it in code. A suggested duration is3seconds (0.5seconds per cell); timing/integration is left to the gameplay agent. No new particles or baked shadows. icetroll-melt-generation.json contains the exact built-in ImageGen prompt; icetroll-melt-source.webp is the accepted source. build.py ice automatically reapplies this override, or build.py melt rebuilds just this revision. icetroll-melt-report.json stores unchanged-cell hashes and placement metadata. icetroll-melt-review.webp shows all stages and the fixed-anchor animation at race scale on Winter.

## IT3: ice giant stagger (2026-10-24)

assets/icetroll_stagger_sprites.webp is836×418, two418px cells: rocked back with arms up and front foot lifted, then catching himself with both feet down. Same character, crystalline/snow materials, right-facing; no baked shadow/ground. One anatomical scale (.43) for both source poses, calibrated against the idle face/hair and planted foot; support rear sole is x150,y407, sprite anchor193409. Both frames remain fully inside their cells.

The leftmost raised arm was regenerated closer to the head so his feet could stay anchored without shrinking the troll. The corrected first source pose and original second source pose are selected by stagger-build.py. icetroll-stagger-generation.json retains both exact built-in ImageGen prompts; the source files and per-pose transforms are retained. Rebuild with python3 tools/effects/winter/stagger-build.py from the game directory. check.py validates the common scale, alpha margins and sole placement.

icetroll-stagger-review.webp shows idle/rocked-back/recovery at actual ice giant scale using the current drawMonster, including its existing0.16rad stagger tilt, plus native cells aligned on a baseline below. Current code tilts the painted poses as well as selecting the sheet; integration agent may remove that fallback tilt when using the art if desired. Both poses were reviewed with it. Art-only delivery: gameplay agent adds icetroll_stagger to TRACK_SHARED_ART. No production JavaScript is changed here.

IT3 validation: deterministic rebuild and alpha/sole checks passed, as did36 unit and57 silent browser tests.
