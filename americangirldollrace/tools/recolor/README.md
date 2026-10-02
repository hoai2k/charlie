# Duplicate-doll outfit recolour: mask build tools

When several racers pick the same doll, the first keeps her original clothes and
each later copy gets a recoloured outfit. The game does the recolour at runtime
(`../../recolor.js`, `window.DollRecolor`) from two shipped inputs:

- `../../assets/masks/<key>_<kind>_mask.webp`: one lossless mask per art file, the
  same pixel size as its source. `kind` is `sheet` (`doll_<key>_sprites.webp`),
  `portrait` (`portraits/<key>.webp`), or `cheer` / `wave` / `ride`
  (`portraits/<key>_<kind>.webp`).
  - **R** is the clothing and hair-accessory weight (0–255, soft edges).
  - **G** is the dyed-hair weight (Whirlpool's blue streaks, Rumi's purple hair).
  - B is 0 and A is 255.
- `../../assets/masks/outfits.json` holds the per-doll recolour stats and the 7
  ordered outfit colours. Outfit 0 is the original art.

Skin (face, arms, hands, legs) and natural hair are always 0 in both channels, so
they never change. `verify.py` checks this byte for byte.

These scripts rebuild everything. The ML model and the large intermediates stay
outside the repo, in `--work-dir`.

## Setup

```sh
pip install torch transformers pillow numpy scipy scikit-image   # CPU torch is fine
# node (any recent version) is needed for render.py / verify.py
```

The segmentation model is [`mattmdjaga/segformer_b2_clothes`](https://huggingface.co/mattmdjaga/segformer_b2_clothes)
(SegFormer-B2 human parsing, 18 classes, about 110 MB). The first run downloads
it into the Hugging Face cache.

## Regenerate (run from this folder)

```sh
cd americangirldollrace/tools/recolor
W=/tmp/dollrecolor-work            # default; anything outside the repo
python seg.py      --work-dir $W   # 1. model -> $W/seg/*.npy   (~850 MB, ~10 min on 4 CPU cores)
python masks.py    --work-dir $W   # 2. rules -> ../../assets/masks/*_mask.webp (+ $W/masks/*.npz debug)
python outfits.py  --work-dir $W   # 3. stats + outfit order -> ../../assets/masks/outfits.json
python render.py   --work-dir $W   # 4. review images -> $W/review/ (uses the real recolor.js under node)
python verify.py   --work-dir $W   # 5. skin/hair unchanged + JS/Python parity
```

Every script also accepts `--dolls kaya,lily`. You only need to re-run `seg.py`
when the art changes. After editing rules or patches, run steps 2–5.
`python pairs.py --dolls marisol --outfit 2` writes a larger before/after of every
sheet frame, which is handy when you hunt for a glitch.

Review images in `$W/review/`:
- `lineup.png`: every doll, original plus outfits 1–7.
- `sheet_<key>.png`: all 12 frames × 8 looks.
- `portraits_<key>.png`
- `overlay_<key>_<kind>.png`: the masks. Magenta is clothing, cyan is dyed hair,
  yellow is a hair accessory, green is protected skin.

## How the masks are made (`masks.py`)

1. SegFormer labels each 418×418 sheet frame and each portrait. The labels are
   averaged over a white and a grey backdrop.
2. Shoe rule: a "shoe" in the upper 55% of a full-body figure is really a hand.
3. Skin protection uses a per-image Lab skin-colour model (from confident skin
   pixels) together with the hole-filled face, a short geodesic flood and a 2 px
   ring. Hair labelled by the model is never clothing.
4. Per-doll rules, all set in tables at the top of `masks.py`:
   - `HAIR_COLOUR`: hair the model calls clothing. Kaya's braids are matched by
     colour to her own hair.
   - `ACCESSORIES`: hair accessories that follow the outfit.
     - Claudia's bow.
     - Lily's ribbons.
     - Penelope's headband.
     - Kaya's braid wraps. These are found as tan pixels in the gaps of a closing
       of her hair, because their colour is too close to her skin.
     - Amanda's beret is already clothing.
   - `GARMENT_FORCE`: garment colours that the skin protection swallows, such as
     Penelope's pink socks.
   - `FANTASY_HAIR`: dyed hair for the G channel.
5. A colour vote across the whole sheet uses 40 Lab clusters. Each blob of one
   colour is all or nothing, so every frame agrees. Portraits reuse the sheet's
   vote.
6. `patches.json` holds the hand fixes (below). After that the edges are softened
   (σ 0.7), and skin, the face and natural hair are zeroed again.

## Hand patches (`patches.json`)

Fix a glitch in one frame with an entry rather than by painting the WebP. That
way a rebuild keeps the fix:

```json
{"doll": "marisol", "kind": "sheet", "frame": "r3c2", "rect": [175, 130, 250, 230],
 "op": "fill", "force": true, "where": {"h": [330, 30], "C": [0.05, 1], "L": [0.55, 1]},
 "note": "fall frame: pink sleeve cuff by the raised hand was protected as skin"}
```

| field | meaning |
| --- | --- |
| `frame` | sheet frame `r<row>c<col>`, 0-based. Omit it for portraits. |
| `rect` | `[x0, y0, x1, y1]` in pixels, relative to the frame or portrait. |
| `op` | `fill` (set to 1) or `clear` (set to 0). |
| `channel` | `R` (default) or `G`. |
| `where` | Optional Oklab gate (hue in degrees, chroma, lightness) so the patch touches only the garment colour. |
| `force` | Lets a `fill` override skin protection. The face is always protected. Use it only with a tight `rect` and a `where` gate. |

You can also paint a mask WebP directly (R channel, lossless) as a last resort.
`masks.py` overwrites it on the next run.

## Outfits and recolour maths

`outfits.py` computes each doll's main garment colour `stats = {h, L, C}`
(Oklab, h in radians). It adds per-doll overrides from `PARAMS`:
- `beta` is how far lightness moves toward the target (default 0.55).
- `warmBeta` is the same for yellow and orange targets on dark clothes (default 0.95).

The current overrides are Amanda (`warmBeta` 0.7, so yellow is not pale cream) and
Claudia and Penelope (`beta` 0.7, so pastel clothes take stronger colours).

Picking the outfit list:
1. Every palette colour is rendered on the doll with the runtime maths.
2. The colour family nearest the doll's own hue is skipped.
3. Each remaining family (red, pink/berry, orange, yellow, green/lime, teal/mint,
   blue/sky/navy, purple/lilac) gives exactly one colour.
4. The order is greedy max–min Oklab distance from the original and from the
   outfits already picked.

`FIXED` pins a hand-picked list, and `DOLL_EXCLUDE` drops a colour for one doll.

`recolor.js` (runtime) and `recolor.py` (reference) must stay in step. `verify.py`
reports the difference between them, and also between the LUT fast path and the
exact path.
