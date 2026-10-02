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
  exactly matching the brief. The original `title_hero.webp` composite is preserved.
  Six additional `title_hero_<key>.webp` cutouts can now be animated independently;
  see the composition notes below.
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

The title/select screens use this artwork in `../../menu.js` and `../../styles.css`.

## Independent title hero layers

`../../assets/ui/title_hero_layout.json` describes the six new cutouts in a
1600×640 logical composition. Its filenames are relative to the JSON's own
directory. The `layers` array is already sorted back to front by `z`:

- Claudia with her pegasus, Juliette with her unicorn, Whirlpool with her horse.
- Lily, Rumi and Kaya running independently in front.

Each rider and her mount are one image, so they move together. Hidden parts were
reconstructed during isolation; these are independently generated variants of
the original poses, rather than a pixel-exact disassembly of the composite.
`title-hero-split-prompts.json` records the six final built-in ImageGen prompts.

Use each layer's native `width`/`height` and `x`/`y` to reproduce the group.
The title screen loads this layout and all six cutouts, keeping the original
composite as a fallback until every image is decoded. Mounts bob on a 1.4-second
cycle and runners on a quicker 0.7-second cycle, with 120-degree phase spacing
within each group and staggered entrances. Reduced-motion mode keeps the group
still. The container allows overflow for wing tips and bobbing.

The motion parameters give each layer its phase, period and entry delay. After loading the images into a map keyed by `layer.key`, for example:

```js
// elapsedMs is measured from animation start. Add a 16-pixel gutter around
// the logical composition, then scale/translate the whole group into the scene.
for (const layer of layout.layers) {
  const localMs = elapsedMs - layer.enterDelayMs;
  if (localMs < 0) continue;
  const progress = Math.min(1, localMs / 700);
  const easeOut = 1 - (1 - progress) ** 3;
  const dx = -1800 * (1 - easeOut);
  const dy = layer.bobAmplitude * Math.sin(
    localMs / layer.bobPeriodMs * Math.PI * 2 + layer.phaseRadians
  );
  ctx.drawImage(images[layer.key],
    16 + layer.x + dx, 16 + layer.y + dy, layer.width, layer.height);
}
```

Keep a 16-pixel gutter around the logical composition for the bobbing motion;
the rightmost runner and wing tips otherwise touch its bounds. Set bobAmplitude
to zero and enterDelayMs to zero for a static composition. The original combined
WebP remains available as the simple fallback.
