# Race title and select artwork

All 56 assets in `../../image-requests.md` are supplied, including the optional
wave and riding poses. Artwork was made with the built-in `image_gen` tool,
using the existing doll, mount, monster and background WebPs as references.
Final prompts, dimensions, atlas cell counts, file hashes and source references
are recorded in `generation-manifest.json`.

## Files and layout

- `../../assets/portraits/`: nine dolls × portrait, `_cheer`, `_wave`, `_ride`.
  Portraits are 320×400; full-body poses are 418×418. Doll keys are whirlpool,
  juliette, claudia, kaya, lily, marisol, amanda, rumi and penelope.
- `../../assets/ui/`: all 20 requested UI files, with names and final sizes
  exactly matching the brief. The hero is the single `title_hero.webp` composite.
- All atlases use one horizontal row with fixed-size cells and the brief's order.
  Player badges contain numerals 1–8. Button glyphs contain A, B, X, Y, LB, RB.
  Track cards contain Farm, Fairy, Village, Winter, Castles.
- Transparent art uses lossless WebP. Opaque scenery uses WebP quality 88.
  Every export uses Pillow method 6. The 56 files total 8,028,334 bytes.
- Clouds and hills use reflected horizontal extension so the visible pixels
  and alpha agree exactly at the wrap boundary. Draw consecutive tiles without
  a gap; use separate speeds for the two layers.

## Riding seat anchors

Coordinates are measured visually at the centre of the seated pelvis, in pixels
from the top-left of the final 418×418 frame. Use these as initial mount offsets
and adjust against the mount animation when integrating the pose.

| Doll | Seat x | Seat y |
| --- | ---: | ---: |
| Whirlpool | 210 | 278 |
| Juliette | 215 | 285 |
| Claudia | 215 | 276 |
| Kaya | 210 | 288 |
| Lily | 218 | 273 |
| Marisol | 222 | 274 |
| Amanda | 207 | 296 |
| Rumi | 217 | 274 |
| Penelope | 208 | 292 |

Full-body exports are centred and fitted to each doll's first idle-frame bounds,
with the same foot baseline. The manifest records that baseline per pose.

## Validation and export

The final roster and UI were reviewed on light and dark backgrounds. Dimensions,
WebP decoding, transparency, atlas order, logo spelling, button letters, badge
numerals and visible parallax wrap edges were checked. Large raw PNGs are kept
outside the repository in the built-in tool's generated-images directory.

`export_assets.py` takes a local JSON manifest with `source` paths to generated
PNGs. Track cards instead accept five `components`, each with its own `source`.
It normalizes framing, packs atlases and writes final WebPs. It skips existing
outputs to avoid accidental replacement. The committed manifest intentionally
omits machine-specific PNG paths; use its prompts with the built-in generator,
then add local source paths to a separate manifest before exporting.

These assets are ready for the title/select redesign described by the brief.
This artwork change does not implement those new screens.
