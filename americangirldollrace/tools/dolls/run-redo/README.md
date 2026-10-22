# RC1–RC3 run-cycle corrections

Only row 2 of Felicity, Claudia v2 and Barbie was replaced. The original
sheets, masks, source strips and manifests are retained here. Exact ImageGen
prompts are in `generation.json`; the source strips remain at their normal
paths so future pose work uses the corrected cycles.

`build.py` measures explicit source hip pivots, keeps the existing common
anatomical scale and baseline409, then patches only the three run cells.
The narrow passing footprint is checked against both extended strides.
`check.py` verifies the other nine art and nine mask cells remain decoded
pixel-identical. Normal export delegates to this patcher to retain that guarantee.

The actual game renderer was reviewed at 9.5 frames/sec beside Rumi, facing
both ways and with alternate clothes. New run hand positions are recorded in
the manifests and broom calibration. Normal-sheet and mask URLs now carry the
configured doll-art version so deployed browsers fetch the corrected rows.
