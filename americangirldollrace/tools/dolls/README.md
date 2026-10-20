# Direct new-doll pipeline

Use this workflow for **new American Girl Doll Race characters**. Hermione is
its first complete example. It replaces the old intake/segmentation workflow
for new dolls; existing dolls and their reviewed masks stay intact.

The inputs are an approved canonical doll and generated pose art. The build
exports everything the existing game consumes and registers the character in
`../../dolls.js`. Adding another manifest does not require editing the race or
menu roster by hand.

## Generate, export, review

1. Keep the approved identity reference in `sources/<key>/canonical.webp`.
   Use the built-in ImageGen tool, that canonical reference, and an existing
   race sheet as a **pose/style reference**, to generate clean transparent art.
   The exact Hermione prompts are recorded in `generation.json`.
2. Generate three equal square cells in each horizontal strip: idle, run,
   jump, and menu poses. Request consistent anatomical scale, clear cell
   separation and margin around every body part. Generate wide actions such
   as pushing/falling individually when a strip would crowd or crop them.
   Keep personality in posture/expression while preserving each pose's purpose.
3. Add `manifests/<key>.json`, following `hermione.json`. List each source/cell,
   horizontal hip pivot, face-protection chin line, standing height, portrait
   crop, riding seat anchor, and outfit settings. Coordinates are source pixels.
   These small calibration values replace manual image painting. Review them;
   image generation is not guaranteed to reproduce anatomical scale perfectly.
4. Build and check from the repository root:

   ```sh
   python3 americangirldollrace/tools/dolls/build.py
   python3 americangirldollrace/tools/dolls/build.py --check
   python3 -m unittest discover -s americangirldollrace/tools/dolls -p 'test_*.py'
   node --test americangirldollrace/tools/dolls/recolor.test.mjs
   ```

   The only exporter dependencies are Pillow and NumPy. No image API calls,
   downloaded segmentation model, or local source PNG paths are needed to rebuild.
5. Review `reports/<key>-poses.jpg` on both backgrounds, the mask overlay,
   and the game itself. Check selection, wave/cheer, outfit variants, running,
   jumping, pushing/falling, and riding. Check normal and All Dolls rosters on
   landscape and portrait screens. Bump `index.html` asset versions after code
   changes. Commit the selected sources, manifest, registry, reports and assets.

## Exact runtime contract

- Race sheet: **1254×1672**, three columns × four rows of **418×418**.
- Row 0: three idles. Row 1: extended stride, passing stride, alternate stride.
- Row 2: takeoff crouch, airborne jump, landing crouch.
- Row 3: **seated rider**, pushing, falling backwards. The race uses the first
  cell on all mounts; `portraits/<key>_ride.webp` is the same exported cell.
- Menu: portrait **320×400**; wave, cheer and ride **418×418**.
- Images: lossless WebP with alpha. Five corresponding outfit masks have the
  exact dimensions of their images.

Hermione stands 390 pixels tall with exclusive foot baseline **409**, matching
existing ground anchors. The exporter derives **one shared scale** from her
standing source and uses it across the strips. Crouches are not enlarged to
standing height. A larger standalone source can declare a relative source
scale; this is explicit calibration, never a silent fit-to-cell operation.
Every frame uses its anatomical pivot, so trailing hair does not shift her body.
Grounded poses share the foot baseline. Jump height itself comes from the game.

The riding pose instead uses a seat pivot at `[209, 264]`. The build derives
`riderXOffset`/`riderYOffset` from that pivot and the game's mount reference,
including the 0.7 rider and 1.08 mount scales. This preserves the seat position
through the existing per-frame horse/unicorn/pegasus calibration and mirroring.

Clipping is a build error. The exporter does not independently shrink an awkward
pose to hide it. It also checks source margins in tests and records output
bounds, scale, anchors and SHA-256 hashes in `reports/<key>.json`.

## Outfit masks without the old segmentation pass

Hermione's uniform has a useful explicit constraint: neutral charcoal/grey
clothes, warm skin and natural chestnut hair. Her manifest opts into
`neutral-uniform`: a conservative low-chroma colour gate, face protection above
the chin, and small raised-sleeve rectangles for the cheer. White collar/cuffs,
skin, and warm hair are excluded. The magenta overlay shows the selected pixels.
This is not a general clothing segmenter; a doll with coloured clothes needs
an appropriate new mask strategy and visual review rather than reusing this gate.

`outfitData.stats.tintNeutral` opts her grey garments into actual colour tinting.
The old recolour transform deliberately preserves greys. The flag is absent on
existing dolls, whose output remains unchanged. The JS runtime, its Python
reference, and the LUT path support the flag together. Masks and stats remain
compatible with `outfits.js`, including automatic distinct outfits when players
pick the same doll. Hermione has the original plus seven colour variants.

## Hermione validation

The complete packed poses and mask overlays were inspected. Browser checks
covered her portrait, wave/cheer, red outfit, race movement and jump, and seating
on a unicorn. Normal and eleven-card All Dolls layouts were checked at landscape
and 390×844 portrait sizes. Contract tests cover baseline, dimensions, source
margins, shared anatomical scale, clipping rejection, face/hair protection,
mount-anchor maths in both directions, and neutral-colour LUT accuracy.
The existing nine dolls' exact recolour output was also compared before/after
at 512 RGB colours × three target colours with no differences.

The runtime sheet omits the concept's wand so hands remain readable when
running, pushing and riding. The plain uniform has no house logos or insignia.
