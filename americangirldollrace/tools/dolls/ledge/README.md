# LG1/LG2 ledge art handoff

Art-only delivery: the other agent owns LEDGE_SHEETS registration, renderer changes and gameplay acceptance.

Each doll has a1254×418 strip (three418px cells) and matching RGB outfit mask. Frames are hug hold, pulling up with knee, and relieved kneeling. No cloud or ground shadow is painted in. Every frame retains its doll's shared source scale; no per-frame fitting or stretching. Source margins and final alpha margins are checked.

The owner approved replacing the impossible fixed y230 contact with **per-pose ledge anchors** to preserve normal doll size. `assets/doll_ledge_anchors.json` records each frame's `ledgeContact:[x,y]`. Place that point on the same world cloud corner/top when swapping frames. For a destination pixel scale k: drawX=worldEdgeX-contactX*k, drawY=worldTopY-contactY*k. Mirror around that world edge for a left-facing ledge. Do not apply the old fixed300,230 offset.

`reports/<key>.json` includes source scales, output bounds, placements and SHA256 hashes. `reports/<key>-review.webp` compares the standing sprite with the new poses on a test ledge; second row shows outfit masks. Red dots are review-only anchors. `mask-regions.json` constrains Juliette and Whirlpool masks to measured garment/boot regions, protecting similar-coloured hair and Juliette's moon purse. The two-channel outfit classifier is trained from that doll's existing sheet/mask and conservatively protects skin, face/accessories and hair. The cloud blocks in reviews are not part of delivered alpha art.

`generation.json` contains the exact built-in ImageGen prompts, including targeted corrections removing mistakenly added glasses from Cinnamon, Felicity and Marisol. Only final corrected sources are delivered. Luna keeps her pink glasses, Amanda keeps her canonical red glasses, and Barbie keeps sunglasses on her head.

Rebuild from repository root: `python3 americangirldollrace/tools/dolls/ledge/build.py [keys...]`. Defaults to all supplied sources. Run `python3 americangirldollrace/tools/dolls/ledge/check.py` for dimensions, margins, masks, anchors and hashes. Sources/references and export are reproducible without an image API.
