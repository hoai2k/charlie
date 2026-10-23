# Shared item effects and track enemies

The built-in ImageGen prompts and selected alpha sources are retained here.
`build.py` exports the frog, three-frame wave, wind-up cars and five 12-pose
track monsters. `check.py` verifies alpha gutters, baseline, dimensions and
hashes. Run both from any directory.

The monster art faces right, matching the original troll. Grounded figures
use baseline409; the last three cells match its low fall/ground silhouettes.
Reviews exercised actual grab/lift/throw rendering and five successive
knock-backs through the gameplay functions. The final sleeping state draws
an empty clothes/straw heap for the scarecrow and a bone pile for the skeleton.
Frogs hop at both sizes; cars retain wheel contact and spin their keys. The
surf action paints the board itself, so the code board is skipped when loaded.

Robot troll (M3) is registered on Moon Base. Its twelve poses use the original
troll layout, right-facing art and baseline409, with a flat broken-body final
pose and no painted sparks in that final cell. Runtime supplies the sparks.
`robot-generation.json` records both built-in ImageGen prompts; sources and
light/dark alpha, overlay, style comparison and in-game proof are retained.
Browser review exercised empty-hand grab/lift/throw, push, snowball, EMP and
five knockbacks through the actual gameplay functions on Moon Base Extra.

M4/M5 are registered on Toy Room and Beach. The owner’s final design replaces
the initial troll-shaped tin and decorated sand concepts: a glossy wind-up
lagoon creature and a faceless heap made purely of spilling sand. The toy’s
final cell is flat on its back with straight legs and rigid upright arms;
the sand collapse pours into a plain heap. `monster-calibration.json` retains
head inset and measured empty-hand anchors used by game.js. Sources, exact
built-in prompts and light/dark alpha and browser proofs are retained.
`overrides/tintroll-11.webp` replaces only the final toy frame.

Candy and storm Cloud trolls use approved canonicals under `candy-troll/` and
`cloud-troll/`. `new-trolls/` retains source sheets and exact built-in ImageGen
prompts. Build normal sheets with `build.py candytroll cloudtroll`; then
`new-trolls/build.py` exports the 512px lightning cells and bolt. The corrected
release pose has exactly two arms. Candy’s last cell is a headless sweets
heap; Cloud’s last cell is intentionally empty and its ground pose fades away.
Eight 128px candy particle cells are available as a 512×256 atlas and separate
assets under `assets/particles/candy/`. Browser smoke tests force
`window.RACE_TEST_SILENT=true` before audio loads: no sound and no stored
audio-preference changes. Temporary manual QA rigs must set the same flag.
