# Fairy wing art delivery

Built-in ImageGen produced three distinct views; gameplay integration is left to the other agent.

- `assets/fairy_wings_sprites.webp`:3072×1024; row0 side-on pair, row1 three-quarter pair; six512px frames per row.
- `assets/fairy_wing_single_sprites.webp`:3072×512; six matching phases of one wing. Mirror around its joint for nearly front-facing idle dolls.
- Every joint is330,300. Ground flutter0/1; flight2/3/4/5. Actual exported alpha0..158; backgrounds show through the membrane. Source alpha silhouette and colors retained, material opacity calibrated to0.62.
- Sources have genuine alpha. `build.py` separates connected silhouettes, preserving their antialiased edge; it never draws replacement wing geometry. `report.json` records the source joint measurements and output bounds/hashes.
- `doll-review.webp`: all15 dolls, paired idle, paired running, and mirrored single-wing idle; same0.72 scale used by current game. The mirrored single uses the central spine rather than the side/back shoulder anchor. This is a silent separate review fixture, not a production page change.

Run `python3 americangirldollrace/tools/mounts/fairy-wings/build.py` to rebuild. Register the paired and single sheets and choose the view in gameplay in a separate integration change.
