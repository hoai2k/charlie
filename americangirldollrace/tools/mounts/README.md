# Griffon mount

The griffon uses the same nine-cell runtime contract as the horse, unicorn and
pegasus: 3×3 cells of 418×418 in a 1254×1254 lossless-alpha WebP. Rows are idle,
gallop/wing-flap/glide, and takeoff/apex/landing. The approved miniature toy look
has an ivory eagle head/chest, cream-gold wings, gold beak/talons, and lion body,
hind paws and tufted tail. It carries the existing dolls' seated riding frame.

The built-in ImageGen prompts are in `generation.json`; selected transparent
WebP sources are in `sources/`. The initial full-sheet generation crowded wing
tips between cells, so the final export uses three separate strips. The exporter
finds empty-column gaps near the intended cell boundaries; it never cuts an
extended talon simply because generation placed it over a nominal grid line.

Rebuild and check from the repository root (Pillow and NumPy):

```sh
python3 americangirldollrace/tools/mounts/build_griffon.py
python3 americangirldollrace/tools/mounts/build_griffon.py --check
node --test americangirldollrace/tools/mounts/mounts.test.mjs
```

`griffon.json` records a single shared source scale (0.48), source-space back
seat anchors in each intended 724px cell, exported bounds and seat positions,
and the sheet hash. All frames share the 409px exclusive ground baseline. The
build exports `../../mounts.js`, which supplies the actual per-frame calibration
to `game.js`. The gallery `griffon-review.jpg` applies the game's mount/rider
scales and seat offsets to Hermione's riding pose for all nine cells. No runtime
rider offset is guessed from a bounding box or reused from a different animal.

Normal horse pickups roll: 10% unicorn, 10% pegasus, **5% griffon**, 5% broom, 70% horse.
All Gryphons forces horse pickups to griffons, like the existing All Pegasi
setting; it does not turn every kind of powerup into a mount. The griffon shares
pegasus jump/hold-to-glide physics, 15-second duration, wing/flight audio loops,
and special-mount monster bump behaviour. In Horsing Around, it stays indefinitely
like the other special mounts. Releasing jump resumes gravity; expiration ends
flight. The existing `pegasusGliding` animation flag serves both winged mounts.

Tests exercise the real gameplay functions for roll distribution, forced mode,
hover/release/expiry, duration, wing audio selection, monster bumps and calibration.
The sheet is also checked for decoding, dimensions, alpha, clipping and hash.
Browser verification covered the settings icon, pickup, mounted Mira, and holding
flight. Existing special-setting icons retain their original atlas indices.

# Broom mount

The broom uses one alpha WebP prop rather than nine redundant sprite cells.
`broom.json` records the built-in imagegen prompt, source, grip, and measured
hand centers for each doll's idle/run frames. `build_broom.py` trims transparent
padding, exports lossless art, and generates `broom.js`. Run it after changing
the source or hand calibration; use `--check` to validate without rewriting.

`game-mounts.js` draws the carried broom in front of clothing/hair, then restores a
small patch of the actual gripping hand over the shaft. Altitude blends the
normal doll with its calibrated seated sprite over the first 85 world pixels;
descent reverses it. Flight uses the existing saddle offsets so all dolls and
outfit sheets share their tested rider alignment. The flying broom sits 18 scaled pixels below the calibrated saddle point,
beneath the seated thighs; the carried hand alignment is unchanged.
Both doll and prop mirror
around the same facing anchor. `broom-review.jpg` shows every doll in both
directions, carrying and riding.

Brooms have the same 15-second duration and held-jump hover physics as pegasi
and gryphons, with a 5% chance among normal mount pickups. `All Brooms` forces
mount pickups to be brooms. A carried broom is silent; flight reuses the soft
glide loop. The internal `griffon` key stays compatible with saved settings;
the visible setting is spelled `All Gryphons`.

Checks:

```sh
python3 americangirldollrace/tools/mounts/build_broom.py --check
python3 americangirldollrace/tools/mounts/build_griffon.py --check
node --test americangirldollrace/tools/mounts/mounts.test.mjs
```
