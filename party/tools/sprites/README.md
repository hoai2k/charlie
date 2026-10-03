# Generated sprite intake

These tools process supplied artwork; they do not draw characters or invent animation frames.
Use `python3` with Pillow installed. Paths inside a spec resolve relative to the spec file. Keep
raw generation masters outside the repository. Commit the spec with a descriptive source
basename and generation prompt/provenance so someone can reproduce the intake.

```json
{
  "asset": "felicity",
  "bodyHeight": 320,
  "frameSize": [520, 480],
  "anchor": [260, 460],
  "facing": 1,
  "sourceDefaults": {"source": "/tmp/felicity.png", "grid": [4, 2]},
  "poses": {
    "idle": {"fps": 5, "motion": 0.3, "frames": [{"cell": 0}, {"cell": 1, "dur": 0.08}]},
    "walk": {"fps": 8, "motion": 0.3, "frames": [{"cell": 2}, {"cell": 3}]},
    "run": {"alias": "walk", "fps": 12},
    "celebrate": {"loop": true, "motion": 0.8, "frames": [{"cell": 4}]}
  },
  "portraits": {
    "neutral": {"source": "/tmp/portraits.png", "grid": [5, 1], "cell": 0}
  }
}
```

Run `python3 party/tools/sprites/build.py /tmp/spec.json`. Override destination with `--output`.
The builder writes each WebP atomically and records rendered-art/file hashes.
Later landmark-only edits reuse valid unchanged raster files; changed artwork,
geometry, quality or corrupted files are encoded again. Old manifests without
hashes get a normal full build. Verify pipeline edits with
`python3 party/tools/sprites/build_test.py`.
The default destination is `party/assets/sprites/<asset>`. Source rectangles `[x,y,w,h]` can replace
`cell` + `grid` for irregular sheets. Per-pose `sourceDefaults` override top-level defaults;
per-frame fields override both. The script deliberately leaves the shared index to the integrator.

Inspect `qa-contact-sheet.jpg` and the source before adding the asset to `assets/sprites/index.json`.
The QA image overlays neutral at 22% to reveal scale drift. It is review material, not shipped art;
keep it outside Git. The tool refuses opaque sources, empty cells and clipped output. Do not erase
white backgrounds automatically: that destroys white fur, clothing and eyes. Generate real alpha.
The automatic support midpoint is only an estimate. **Review and correct anchors**, particularly
for asymmetric tails, bent legs and raised hooves.

`anchor`, `head`, `hand`, `eyes`, `neck`, `back` overrides in an intake frame are **source-cell local**
pixels. The build converts them into trimmed frame-local manifest coordinates. For an airborne
frame, explicitly place the source anchor at the virtual ground below the feet. If the generated
frame has a scale mismatch, supply `scale` (multiplicative adjustment), based on head/torso size;
never normalize every frame's bounding box independently. That makes an arms-up character shrink.
The main `anchor` is on the common output canvas; main `bodyHeight` is the neutral figure's height.
Optional top-level `quality` sets reproducible WebP encoding quality (default 86;
use 82 when a longer animation set needs a smaller download). Normalize new
poses by the character's head/body proportions, not by forcing horizontal or
crouched poses to the neutral bounding-box height.

Pose fields (`fps`, `loop`, `motion`, `facing`, `holdLast`) pass through. Individual frames accept
`dur` seconds and `headAngle` radians. Keep 1-frame poses at `motion` .8–1 so the engine supplies
lively breathing, hops and squash. Distinct poses sharing frames should use explicit aliases;
do not claim they are separately generated animations. Portrait cells preserve their framing
and are resized to 384×384. Supply intentional portrait crops with shoulders reaching the bottom.

## Intake checklist (every new or changed set)

1. Build with `build.py` and inspect `qa-contact-sheet.jpg` (above).
2. Add the asset to `assets/sprites/index.json` once it looks right.
3. **Optimize:** `python3 party/tools/sprites/optimize.py <asset>`. This writes the
   downscaled copies in `assets/sprites-opt/<asset>/` (body ≤ 240 px, portraits
   192 px) that the game draws by default ("Pictures: Optimized" in Settings).
   Originals stay untouched and are used with "Pictures: Full". Re-run it after
   *any* change to a set's frames or manifest; `validate.py` warns when a copy is
   missing or stale.
4. **Colour-variant masks** (only `felicity`, `kpop-girl-center`,
   `princess-amber`): `python3 party/tools/sprites/make_masks.py <asset>
   --review /tmp/review` and look at the sheet (magenta = recoloured region).
   These outfits share their hue with skin or fur, so the alternate colour
   schemes (`src/data/variants.js`) need a region mask per frame; a frame
   without one keeps its canonical outfit colour in the alternates.
5. **Validate:** `python3 party/tools/sprites/validate.py` (no stale/missing
   optimized-copy or mask warnings) and `node party/tools/sprites/runtime.test.mjs`.
6. **Test in game, both qualities**, e.g.
   `?game=crown-keeper&players=2&auto=1&skipintro=1&chars=<id>,fox` with and
   without `&quality=full`: size next to other characters, feet planted, facing,
   crown/wand/glasses on the head/hand/eyes points, celebrate/pout on the podium.
   Also the games that use the new poses, and a duplicate pick
   (`chars=<id>,<id>`) to see the alternate colour scheme.
7. Commit originals, optimized copies, masks and both index files together.

`python3 party/tools/sprites/validate.py` validates every indexed set and prints real frame counts,
portrait coverage, file sizes and decoded memory. `--strict-tier1` additionally requires every
Tier-1 pose/alias and all five portraits. Aliases are counted as covered but not as real frames.
Runtime tests: `node party/tools/sprites/runtime.test.mjs`.

Visual review: `?scene=sprites&chars=felicity&pose=walk&debug=1&zoom=2` focuses an entry.
Add `&time=0.2` for a deterministic frozen pose, or press P to pause and period to advance
1/12 second. A toggles canonical fallback; X exercises turning and follower motion;
Y displays foot/head/hand anchors. Pose labels distinguish authored art, aliases and fallbacks.

`add_sheet.py ASSET SOURCE NAME pose1,pose2,...` registers a reviewed strip by
its largest connected figures. It requires numpy and scipy and preserves source pixels.
Always inspect the result; connected artwork can need manual crop boundaries. The optional
`isolate: true` crop flag removes neighboring components while preserving antialias edges.
Portrait `trim: true` fits the alpha bounds proportionally in a 384px square, bottom aligned.
