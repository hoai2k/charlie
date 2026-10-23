# FW2 twilight wings: art-only handoff

Built-in ImageGen repainted all three views in rich violet, magenta and teal, with luminous rims/veins and warm gold roots. Exact prompts are in generation.json; selected sources are the three *-source.webp files.

Delivered files:
- assets/fairy_wings_twilight_sprites.webp:3072×1024, side pair row0 and three-quarter pair row1, six512px phases each.
- assets/fairy_wing_single_twilight_sprites.webp:3072×512, six phases of the mirrorable single wing.

Every root remains330,300. Geometry and alpha support are pixel-identical to FW1; generated RGB is registered to the existing silhouettes. Tiny generated-edge drift uses nearest generated wing RGB inside that original silhouette. The reviewed FW1 alpha is calibrated from62% to75%: final alpha0..191. No halo or particles can appear outside FW1's existing boundaries. Both FW1 asset hashes remain unchanged and are asserted in build.py/report.json.

Review: doll-review.webp uses the actual game mount renderer, root measurements and0.72 wing scale (0.85 front factor), with all15 dolls in front/side/quarter poses and the three flying-troll poses, on Fairy Woods at small race scale. The isolated fixture loads no audio. The new colours remain visible on dark-haired dolls and fit the toadstool/firefly palette. review.webp shows all18 frames on a dark background.

Rebuild: python3 americangirldollrace/tools/mounts/fairy-wings-twilight/build.py

Per owner, no gameplay code is changed. The integration agent should list fairy_wings_twilight and fairy_wing_single_twilight in TRACK_SHARED_ART; the existing getWingArt/woods wingStyle then selects them. Keep FW1 for the bright Fairy track.
