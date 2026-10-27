CR1/CR2 Pumpkin Patch crows. Sources and exact built-in ImageGen prompts retained.
Reproduce with python3 americangirldollrace/tools/effects/autumn-crows/build.py
CR1 changes only zero-based cell2; cells0,1,3,4 decoded RGBA are pixel-identical.
CR2 uses one uniform scale and the same yellow-eye anchor across four128px cells,
keeping the body/head steady while wings flap. Reviewed alpha on light/dark,
thumbnail icon and flight/circle animation at gameplay scale.
36 unit and32 silent browser checks passed.
