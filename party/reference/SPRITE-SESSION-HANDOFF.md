# Sprite production checkpoint — Sol, 2026-10-02

Production is active. The user revoked the former 40% allowance pause for Sol.
Continue all remaining image requests and regenerations. Preserve approved
canonicals, coordinate disjoint character work, and publish reviewed batches on
main regularly. The whole brief is not yet complete.

## Published

Main includes the full action vocabulary for Snowstar, Birthday Cake, Felicity,
Fellowfox and Bronze. Cake has 74 keys / 95 authored frames / five portraits;
Felicity and Bronze have 74 / 91 / five; Fellowfox has 75 / 91 / five, including
catch-toy. Expanded sets include two-frame dash, hip-bump and knockback and an
authored four-view twirl. Reviewed optimized copies accompany the full originals.
Companion sets were checked in Crown Keeper and Pass the Present in both image
quality modes. Decoded member sizes remain below 25 MiB; Felicity and Cake exceed
the soft 1.5 MiB encoded target because their full requested frames are retained.

General art now has 287 keys pointing to 267 files. Regenerations include all
podium blocks, confetti atlas, card ratio, green fizzle, flat rug, neutral potion
props, aligned balloons, cookie flavor damage, rock crop, outlined hedge, thin
1024 hazard ring, four outlined crumbs, overhead garden day/night, plant glow
and tiny seed stages, silver pearl tiara, separate lightning, low cake stand v3,
broad cake platform v3, three hollow crumble overlays and neutral sponge layers
for round/heart/star. Original versions remain available. Runtime integrations
were reviewed in the garden, potion classroom and eight-player cake arena.
The configurable bakery now uses the round neutral sponge as a crumb texture
with multiply blending across layer sides; flavor tints and frosting stay
configurable. Heart/star sponge and cake-layer aliases remain available.

Recent published checkpoints: 689dcbd (companion/Bronze), 256bcd0 (prop geometry),
7d11066 (Troll), fb24927 (Hoot actions/game integration), 4a6343a (wing cycles).
Exact prompts/master paths are in art/generation-manifest.json and the character
specs/pending prompt records. QA images outside runtime folders are not shipped.

## Active ownership and remaining work

- snow_cake_completion: Fox full extension is in final intake/review (75 keys,
  96 frames, preview decoded 23.3 MiB); then Cotton Candy, Unicorn and Hotdog.
  Include latest lead scale/ride-anchor/mouth-landmark corrections.
- mermaid_all_actions: Marina/Scale rebuilt runtime attachment review and true
  back-twirl art; then KPop trio extensions/hand/scale corrections.
  Scale paint is generated. Marina paint succeeded on variant five with a purple
  painting smock, keeping her canonical identity. Source marina-paint-r5.webp and
  exact retry records are saved; runtime intake and landmark review are underway.
- npc_canonicals: Hoot, Troll, Glimmer and all five Garden Fairy updates are
  reviewed and published (7d11066, fb24927, 4a6343a). Complete Princess Amber
  extension and dance-size correction, then rebuild her color-variant masks.
- Root: review actual runtime overlays and in-game behavior, validate stable
  deliveries, stage precise paths, merge main safely and push each batch.

## Intake and checks

Read tools/sprites/AGENT-PLAYBOOK.md and README.md. Source points are crop-local;
review head/eyes/neck/hand/back on built pixels. Convert corrections back with
sourceAnchor + (runtimePoint - runtimeAnchor) / (commonScale * itemScale).
Keep neutral head scale and airborne anchors; never shrink only the new poses.

Run optimize.py CHARACTER after final rebuild and commit optimized files and
sprites-opt/index.json with the original set. The optimizer filters macOS sidecars
and locks its shared index after encoding so concurrent jobs preserve entries.
The builder caches sheet decoding but copies pixels before alpha cleanup.

Validate only stable sets while other agents are rebuilding: zero-byte frames can
appear briefly during encoding. Final checks: validate.py and node --test on
runtime.test.mjs and art-loading.test.mjs. Both picture-quality modes need real
in-game review; use quality=full for originals. No-cache preview port is 8141.

SSH equivalent remote works while HTTPS credentials do not. Remove only .git/._*
metadata sidecars before/after fetch if misleading pack-index errors recur.
Keep origin unchanged; never force-push or discard unrelated working changes.
When two agents encode the same optimized derivative, keep reviewed originals
and rebuild derivatives. Preserve the lead's shared consumer refinements.

The image-request heartbeat was canceled after an unchanged half-hour interval
(checkpoint in IMAGE-WORK-QUEUE). Continue checking new requests during production
syncs. No allowance-based production pause remains.
