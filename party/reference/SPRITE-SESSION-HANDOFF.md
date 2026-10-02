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
The procedural bakery retains its configurable flavors/frosting; neutral layers
are provided under cake-sponge and cake-layer shape aliases for future use.

Recent published checkpoints: 689dcbd (companion/Bronze sets and safe merge),
256bcd0 (final prop geometry and concurrent optimizer index protection).
Exact prompts/master paths are in art/generation-manifest.json and the character
specs/pending prompt records. QA images outside runtime folders are not shipped.

## Active ownership and remaining work

- snow_cake_completion: Fox full extension is in final intake/review (75 keys,
  96 frames, preview decoded 23.3 MiB); then Cotton Candy, Unicorn and Hotdog.
  Include latest lead scale/ride-anchor/mouth-landmark corrections.
- mermaid_all_actions: Marina/Scale rebuilt runtime attachment review and true
  back-twirl art; then KPop trio and Amber extensions/hand/scale corrections.
  Scale paint is generated. Marina paint is absent after three built-in output
  refusals; exact prompts/reasons are saved in marina-paint-generation-prompt.json.
  Do not retry indefinitely or label an alias as a delivered paint image.
- npc_canonicals: Troll's reported hand points are corrected and reviewed;
  finish optimization. Hoot point/laugh/bravo are being authored. Complete Glimmer
  and Garden Fairy wing cycles to the NPC-specific brief. Do not apply the full
  player pose union to NPCs.
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

The image-request heartbeat remains active; its baseline is in IMAGE-WORK-QUEUE.
Check new additions/regenerations during syncs and cancel future checks after one
full unchanged half-hour interval. No allowance-based production pause remains.
