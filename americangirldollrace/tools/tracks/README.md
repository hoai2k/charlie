# Track-art export and loop verification

The October brief requests 60 track assets: three skins for each of the five
original tracks, plus backgrounds, hurdles, five-cell pickup strips, thrown
projectiles and picker vignettes for nine new tracks. The four optional mount
sheets are art deliverables; their gameplay registration is separate.

All illustration and seam repainting uses built-in ImageGen. Prompt sets are
`background-generation.json`, `loop-generation.json`, `prop-generation.json`
and `card-generation.json`; optional mounts use
`../mounts/additional-generation.json`. Selected lossless WebP sources stay in
`sources/<track>/`, with exported files in `../../assets/tracks/<track>/`.

A tileable prompt did not produce a reliable loop by itself. The background
is offset horizontally by half its width, putting the original wrap at the
centre. ImageGen repaints that join. The exporter preserves the original
landmarks outside the central repair, feathers the repair's outer margins,
then reverses the offset. The outer wrap is therefore made from adjacent
pixels in the same continuous repainted image. There is no mirrored copy in
the final new-track repeat. Older backgrounds retain their mirror fallback.

`reports/*-repeat.jpg` show two unreflected copies. `reports/loops.json`
compares the actual outer-column jump with ordinary neighbouring columns;
this catches a hard cut, but does not replace visual/motion inspection.
`loopMode: "repeat"` in `tracks.js` selects direct repetition. Keep the
painted path edge level and measure `dirtTop` from the delivered background.

Power-up sources use a 3-column by 2-row atlas with an empty sixth cell.
The exporter finds real transparent row/column gaps, so a wheel or spring
slightly off the nominal grid is not clipped, then packs the five icons at
220px maximum into the required five 256px cells. Hurdles fit a 150x145
silhouette inside 160x170, with the base exactly at 170. Projectiles are
centred inside 128x128. Backgrounds and cards are opaque. Source clipping is
an error; the source must be corrected rather than hidden by the exporter.

```sh
python3 americangirldollrace/tools/tracks/build.py
python3 americangirldollrace/tools/tracks/build.py --check
python3 -m unittest discover -s americangirldollrace/tools/tracks -p test_build.py
node --test americangirldollrace/tools/tracks/tracks.test.mjs
```

Verified delivery batches
-------------------------

- Nine backgrounds and picker cards: reviewed as two direct repeats and in a
  moving browser preview with dolls at both track boundaries. All nine have
  measured `dirtTop` values and direct-repeat rendering. Loop statistics are
  recorded in `reports/loops.json`. Remaining props are delivered separately.

- Fourteen pickup strips and projectiles: reviewed transparency, five-cell
  order, harmful-spill readability and rendering at actual game size.

- Fourteen straight-on primary hurdles: reviewed at the original 64×68 draw
  footprint and checked for transparent padding and exact ground baseline.
  `white-hurdle-reference.webp` captures the original procedural geometry.
  `hurdle-generation-v2.json` records the corrected-angle prompts.
  Farm, Wizard School and Horse Show size/depth experiments live in
  `experiments/` and are not selected by runtime.
