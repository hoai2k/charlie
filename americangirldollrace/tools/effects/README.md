# Shared item effects and track enemies

The built-in ImageGen prompts and selected alpha sources are retained here.
`build.py` exports the frog, three-frame wave, wind-up cars and two 12-pose
track monsters. `check.py` verifies alpha gutters, baseline, dimensions and
hashes. Run both from any directory.

The monster art faces right, matching the original troll. Grounded figures
use baseline409; the last three cells match its low fall/ground silhouettes.
Reviews exercised actual grab/lift/throw rendering and five successive
knock-backs through the gameplay functions. The final sleeping state draws
an empty clothes/straw heap for the scarecrow and a bone pile for the skeleton.
Frogs hop at both sizes; cars retain wheel contact and spin their keys. The
surf action paints the board itself, so the code board is skipped when loaded.
