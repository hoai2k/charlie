# Direct new-doll pipeline

## October additions

Claudia now uses the magenta satin dance dress, black ruffles and silver Mary
Janes. Her runtime key stays `claudia`, with versioned `claudia-v2` assets;
`GAME_CONFIG.legacyDollArt.claudia = true` restores the original assets and
alignment. Cinnamon, Felicity and Barbie are new playable entries, each with
12 race frames, portrait, wave/cheer/ride and seven alternate outfit colours.

Claudia's poses are springy and dance-like; Cinnamon is gentle and curious;
Felicity is adventurous; Barbie has a poised wave and a sunglasses-touching
idle. All wear their approved canonical outfits. Each stands 390px tall with
the common ground baseline. Explicit jump/action scale factors match the
generated anatomy to the standing references. Source hip/seat coordinates and
broom hand measurements are recorded in each manifest, with no per-frame
fit-to-cell scaling. The original Claudia files remain available.

`pink-fabric` selects Claudia's satin and Cinnamon's pink clothing while
protecting their faces, hair, shoes and contrasting details. Felicity's
`denim-blue` selects the jeans, excluding dark boot soles and warm colours.
Barbie's `chevron-outfit` tints dark chevrons below the face, preserving white
stripes and explicitly protecting her raised shoe in the falling pose. Low
chroma denim/chevrons opt into neutral tinting so alternate colours read clearly.
Oklab statistics are measured from the selected standing-source garment pixels.
The four `*-generation.json` files record the built-in ImageGen prompts.

The wizard-school landscape in `../environments/concepts/hogwarts.webp` is a
preview only. Its prompt and obstacle/power-up ideas are saved alongside it;
it is not registered as a race track pending user review.

Validation covered all packed poses and outfit masks, selection and alternate
colours, broom carrying/flight and landing in both directions, gryphon seating,
and the sixteen-card All Dolls roster at 390×844. Automated checks cover source
margins, shared scale, ground/seat anchors, measured broom grips, mask colour
protection, visible outfit tinting, and Claudia's runtime fallback.

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

   Exporter dependencies are Pillow and NumPy; Zoey's accent-mask component
   protection also uses SciPy. No image API calls,
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

Where the seat pivot isn't where the doll actually sits, `poses.ride.seatFrame`
(exported-frame pixels) overrides it for the rider offsets only; the art is not
moved. The October roster's seats were measured from each seated frame (hip
column and seat bottom) to match where the original dolls sit on every mount.

Clipping is a build error. The exporter does not independently shrink an awkward
pose to hide it. It also checks source margins in tests and records output
bounds, scale, anchors and SHA-256 hashes in `reports/<key>.json`.

## Outfit masks without the old segmentation pass

Hermione's uniform has a useful explicit constraint: neutral charcoal/grey
clothes, warm skin and natural chestnut hair. Her manifest opts into
`neutral-uniform`: a conservative low-chroma colour gate, face protection above
the chin, and small raised-sleeve rectangles for the cheer. White collar/cuffs,
skin, and warm hair are excluded. The magenta overlay shows the selected pixels.
This is not a general clothing segmenter; recolouring other coloured garments needs
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

## Mira

Mira is the second character built through this pipeline. Her original plus
seven variants retain the canonical pink twin ponytails and gold skirt; the
neutral shirt, gloves and boots provide the outfit colour variation. Her menu
cheer raises one fist while the other hand rests on her hip. The running art
was refined into flowing S-curves so her long ponytails fit the common scale
without shifting her anatomical pivot. Final prompts are in `mira-generation.json`.

Mira's manifest opts into `separate` for strips. The exporter looks for an empty
column gap near each intended third, takes the middle of that gap, and adjusts
source pivot coordinates accordingly. An off-grid boot or hair tip is preserved.
If figures overlap without a gap, export fails and the source needs regeneration.
The same gap splitter is used by the griffon mount exporter in `../mounts/`.

Mira validation also covered the in-game jump, griffon riding/gliding, a blue
outfit, duplicate players with distinct outfits, and the twelve-card All Dolls
roster in portrait layout. All exported poses retain the same scale and baseline.

## Luna

Luna's canonical reference, all race poses and her cheer wear the pink
Spectrespecs over her eyes. Her menu wave is a glasses-lifting greeting: one
hand holds the frame on her forehead, revealing her eyes. The second idle
variation gently touches the glasses while keeping them on. Her expressions
are serene and curious; running is light, and her cheer opens her arms.

The `pink-cardigan` mask is an explicit palette strategy for her pink knit,
warm blonde hair/skin and blue skirt. Source chin lines protect the glasses;
raised sleeve rectangles restore cardigan coverage near the face; garment
bounds and protected lower-leg rectangles preserve the pastel striped socks
when she crouches or tucks her knees. It changes only the cardigan for her
seven alternate outfits. Source outfit statistics are measured in Oklab.

Jump/actions were generated with lens/head sizes about 12% larger than the
idle/run/menu strips. Their manifest declares a shared 0.9 relative source
scale so her head and limbs match, with no silent fit-to-cell resizing. Tests
check the common base scale times this declared source calibration. Her seated
pivot is measured in the action source and exported at `[209, 264]`, using the
same mount calibration as other dolls. Broom carry hands are measured from the
exported idle/run poses and recorded in `../mounts/broom.json`.

Selected art was generated with built-in ImageGen; prompts and refinement
instructions are in `luna-generation.json`. Rebuild and validation commands
above include Luna. Browser checks cover her glasses-lifting greeting, blue
cardigan, race movement, broom carrying/flight in both directions and gryphon
seating. The full thirteen-card All Dolls roster fits the portrait layout.

## Updated Rumi and rollback

Rumi now uses the updated canonical doll through this pipeline. Her manifest
keeps the roster key `rumi` and declares `assetKey: "rumi-v2"`; all exported
race/menu art and masks use that versioned filename. The original Rumi images,
masks and `outfits.json` data stay byte-for-byte unchanged at their old paths.
`rumi-legacy.json` records their hashes, checked by the migration tests.

To revert, set `GAME_CONFIG.legacyDollArt.rumi` to `true` in `../../config.js`
and run `node americangirldollrace/tools/stamp/stamp.mjs`. This removes the generated
override and restores the original race/menu/HUD art, outfit statistics, jump
scale, riding offsets and broom hand anchors together. Set it back to `false`
to use the update. No copying, deleting or rebuilding art is needed.

The generated override takes priority over the legacy character definition,
while roster keys are deduplicated. All menu, HUD, join and finish art and outfit
masks resolve the selected asset key. Broom carry poses select the matching
version's hand anchors. Outfits keep their original seven colour names/order;
the new gold-satin mask changes the jacket and gold outfit trim while preserving
skin, purple hair/laces, white shirt, navy skirt and colourful embroidery.

Her jump/action source strips use explicit 0.88 anatomy calibration; standing,
running and menu sources share the base scale. The export records her measured
seat pivot. Review galleries are `reports/rumi-poses.jpg` and `rumi-masks.jpg`;
built-in ImageGen prompts are in `rumi-generation.json`.

```sh
node --test americangirldollrace/tools/dolls/rumi-migration.test.mjs
```

Browser verification covered new wave/portrait, mint outfit, race/HUD, broom
carrying and flight in both directions, gryphon seating, and the old-art switch.

## Throwing hands

`measure_hands.py` finds each doll's throwing hand in her standing push,
seated rider, skate push and pogo push frames and writes `../../hands.js`.
Snowballs start from that hand. Re-run it after adding a doll or a toys
sheet.

## Zoey

Zoey's approved reference is `sources/zoey/canonical.webp`. She stands
about average height: her manifest's `standingHeight` is 376 (the others use
390, but that counts their taller hair; she has none piled up, so hers is
matched by eye and head height), and her build sizes her toys, actions and ledge poses from it too.
Rebuild her complete
character with `python3 americangirldollrace/tools/dolls/zoey/build.py`, then
rerun `measure_hands.py`, `measure_feet.py` and the cache stamper. She has twelve
race frames, portrait/wave/cheer/ride, twelve skating/pogo frames, nine special
actions and three cloud-ledge phases. Her rider was redrawn looking forward
right, following the owner's correction. All sources and exact built-in
ImageGen prompts are retained; `zoey/prompts.json` records the generation round.

The `teal-top` mask uses R for her top and B for yellow trouser/sneaker accents.
Each of seven alternate outfits has a contrasting secondary colour. Her original
teal/yellow outfit stays unchanged; skate wheels and prop hardware remain fixed. Measured
Oklab statistics are in her manifest; black hair, skin, navy fabric, turquoise straps/tassel and gold jewellery stay fixed. The ledge renderer supports alternate
outfits and explicit contact/scale calibration, so the hang, pull-up and
kneeling recovery retain her anatomical scale without clipping the sheet.
Hand, broom-grip, seat, wand-tip and cloud-contact calibration is retained in
`zoey/reports/`; moon-boot feet are exported to `feet.js`, and fairy-wing roots
use the runtime's per-cell torso measurement. Native art reviews are in
`reports/zoey-*.jpg`; actual-renderer and portrait-roster evidence is in `zoey/`.

## Marisol version 2

Marisol now uses the approved lower-hairline canonical across normal, menu, toy
and special-action art. Her roster key stays `marisol`; `marisol-v2` selects the
complete new identity. Set `GAME_CONFIG.legacyDollArt.marisol = true` to restore
her original matching art, outfit statistics, jump/rider offsets and hand grips.
Original files and statistics remain unchanged, with hashes in
`marisol-legacy.json`. All seven alternate colours are retained.

Her manifest records source hips, rider registration, run/idle broom hands and
mask protection for dark hair, skin, white socks and pink shoes. Toy strip
calibration restores the same anatomical scale after packing; action reports
include painted wand-tip coordinates. Sources, exact built-in ImageGen prompts,
alpha review, masks and deterministic reports are under this directory.

## Moon boots for a new doll

After her sheets are built and `measure_feet.py` / `measure_poses.py` have
run, `python3 tools/dolls/fit_moon_boots.py` places her moon boots: the
owner's hand-placed boots on the same pose of the other dolls are carried
over by matching her legs (`transfer_moon_boots.py`), then fitted to cover her
whole shoe, into `moon-boot-guesses.js`. Check them in the workbench's
verification queue; anything the owner corrects goes into
`moon-boot-overrides.js`.


## Annie and Katniss (hidden racers)

Both dolls use their retained `sources/<key>/canonical.webp` reference and are
hidden from the ordinary roster. All Dolls reveals them; Random includes them.
The workbench always lists them. Each has twelve race frames, four menu images,
twelve skate/pogo frames, nine special actions and three cloud-ledge phases.
Their `verifyAllMoonBoots` flag queues all twelve race poses and the eight action
poses without baked boots. These are initial fitted guesses, awaiting the owner's
review; no owner-approved placements are invented.

Rebuild from the retained built-in ImageGen atlases and exact prompts:

```sh
python3 americangirldollrace/tools/dolls/hidden/build.py
python3 americangirldollrace/tools/dolls/measure_hands.py
python3 americangirldollrace/tools/dolls/measure_feet.py
python3 americangirldollrace/tools/dolls/measure_poses.py
python3 americangirldollrace/tools/dolls/fit_moon_boots.py
node americangirldollrace/tools/stamp/stamp.mjs
```

The `annie-red` mask selects her dress while protecting copper curls, skin,
white collar/belt/socks and black shoes. The `katniss-jacket` mask selects cool
charcoal while protecting her braid, olive trousers, boots and gold pin. Both
retain seven alternate outfit colours. Source anatomical scale, rider seat,
broom hands, throw hands, wand tips and ledge contacts are retained in manifests
and `hidden/reports/`. Alpha margins and hashes are checked during export.
Actual game-renderer contact sheets there cover mounts, toys, spells, boots,
ledge phases and a mirrored alternate outfit. Generation prompts are in
`hidden/prompts.json`; raster creation used the built-in ImageGen tool.


## Cornsilk (hidden plush racer)

Cornsilk uses the owner's selected **first** concept, byte-identical to
`sources/cornsilk/canonical-candidate-v1.webp`, as `canonical.webp`.
She is an oatmeal terry-plush rabbit, with stitched features and long floppy
ears. She has the same complete action set as the dolls, appears through
All Dolls or Random, and is always available in the workbench. Her fur stays
natural: `no-clothing` exports zero recolour masks and one appearance.

```sh
python3 americangirldollrace/tools/dolls/cornsilk/build.py
python3 americangirldollrace/tools/dolls/measure_hands.py
python3 americangirldollrace/tools/dolls/measure_feet.py
python3 americangirldollrace/tools/dolls/measure_poses.py
python3 americangirldollrace/tools/dolls/cornsilk/fit_boots.py
node americangirldollrace/tools/stamp/stamp.mjs
```

All source atlases and exact built-in ImageGen prompts are retained.
`cornsilk/calibration.json` records anatomical group scales and paw, saddle,
chest and ledge points. Paw positions are exported into the manifest's
`throwHandsFrame`, so the shared hand-measurement command preserves them.
Explicit `DOLL_WING_ROOTS` attach wings below her long ears. Ledge frame
metadata restores anatomical scale around the measured contact point.
`cornsilk/reports/` contains hashes, anchors, galleries and actual game renders.
Her twenty applicable moon-boot poses have initial fitted guesses and remain
in the Verification Queue for the owner's review; her painted float boots
are excluded. The character-specific fitter preserves all other racers' fits.
