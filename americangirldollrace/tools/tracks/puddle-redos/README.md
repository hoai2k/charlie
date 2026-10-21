# Liquid-only puddle redos (R1–R7)

Built-in ImageGen produced seven isolated transparent liquid puddles. Prompts
are recorded in generation.json; selected sources are sources/<track>/oil-puddle.webp
(relative to the parent tracks directory). Each replaces the entire fourth
256px cell (x768–1023) in the corresponding runtime powerups.webp sheet.

The original delivered sheets remain in base-sheets/. Exporting from these
locks all four other cells, including RGB under fully transparent pixels.
Pillow's exact=True WebP mode preserves that hidden RGB on save. The exporter
checks SHA-256 of decoded RGBA pixels for all 28 unchanged cells before and
after encoding. verification.json records those baseline hashes. It also
rejects an unchanged oil cell or a non-flat/clipped replacement.

Run tools/tracks/build.py to reproduce exports and use --check to validate
the current art. Seven puddles passed transparency, dimensions, padded flat
silhouette and exact unchanged-cell checks. The track renderer tests and
export unit tests pass. Browser review used the real drawWorldScene depth
sort with a standing doll over each puddle and a second unobstructed puddle.
A 1.5-second apart comparison of the free seawater puddle changed zero pixels,
confirming the flat draw has no bob or rotation. game-review.webp records
all seven themes at runtime scale; comparison.webp shows old/new oil cells.
