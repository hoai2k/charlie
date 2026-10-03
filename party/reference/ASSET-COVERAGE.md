# Charlie Party asset coverage

Snapshot: 2026-10-02. [image-requests.md](../image-requests.md) is the authoritative brief. This inventory replaces the earlier incremental snapshots. Built files, visual acceptance and publication are separate milestones.

## Current status

All 15 player/companion sets have completed their expanded action, attachment and game review: Felicity, Fellowfox, Bronze, Marina, Scale, Fox, Hotdog, Princess Amber, Snowstar, Birthday Cake, Cotton Candy, Unicorn and all three KPop members. Every set covers the 74-key player action union, plus character-specific extras. All five pets include `catch-toy`.

The final read-only audit checked all 26 stable manifests, their referenced images, optimizer fingerprints and three color-mask fingerprints. No blocking coverage, path, alpha, alias, decoded-memory or freshness issue remains. This inventory describes the reviewed delivery; individual actions still combine authored key poses with procedural motion rather than having full drawn cycles for every verb.

All requested NPC canonicals are approved. Troll, Glimmer, Professor Hoot, the three Shadow Imps and five Garden Fairies have their requested NPC action sets and game integrations. Garden Fairy twirls now select their authored `celebrate` animation. Grumpy Broccoli and Storm Cloud use two-state props, as requested; cloud lightning is a separate asset.

## Player manifests

Counts below describe saved manifests at this snapshot. Frame entries can repeat an image for timing; aliases and procedural motion do not count as additional drawn frames. The 74-key union includes the original actions, optional extensions and Round 2 verbs. Pets also need `catch-toy`.

| Set | Pose keys | Frame entries | Portraits | Decoded MiB | Review |
| --- | ---: | ---: | ---: | ---: | --- |
| `felicity` | 74 | 91 | 5 | 22.62 | Reviewed |
| `fellowfox` | 75 | 91 | 5 | 11.51 | Reviewed |
| `bronze` | 74 | 91 | 5 | 20.27 | Reviewed |
| `marina` | 75 | 92 | 5 | 20.88 | Reviewed |
| `scale` | 75 | 92 | 5 | 20.50 | Reviewed |
| `fox` | 75 | 96 | 5 | 23.54 | Reviewed |
| `hotdog` | 75 | 96 | 5 | 19.31 | Reviewed |
| `princess-amber` | 74 | 97 | 5 | 20.61 | Reviewed |
| `snowstar` | 75 | 96 | 5 | 24.72 | Reviewed |
| `marshmallow-birthday-cake` | 74 | 95 | 5 | 24.79 | Reviewed |
| `cotton-candy` | 75 | 96 | 5 | 20.74 | Reviewed |
| `unicorn` | 75 | 98 | 6 | 21.16 | Reviewed |
| `kpop-girl-left` | 74 | 96 | 6 | 19.53 | Reviewed |
| `kpop-girl-center` | 74 | 96 | 6 | 19.08 | Reviewed |
| `kpop-girl-right` | 74 | 96 | 6 | 21.48 | Reviewed |

## NPC manifests

NPCs are checked against their own §8 and Round 2/3 requirements, not the player action union. Deliberate aliases for compatible gliding, reaction or exit actions are retained.

| Set | Pose keys | Frame entries | Portraits | Decoded MiB |
| --- | ---: | ---: | ---: | ---: |
| `troll` | 19 | 37 | 5 | 14.52 |
| `glimmer` | 14 | 30 | 6 | 13.52 |
| `professor-hoot` | 15 | 19 | 6 | 9.68 |
| `shadow-imp` | 13 | 20 | 6 | 7.34 |
| `shadow-imp-blue` | 13 | 20 | 6 | 7.34 |
| `shadow-imp-pink` | 13 | 20 | 6 | 7.34 |
| `garden-fairy-pink` | 5 | 12 | 5 | 5.11 |
| `garden-fairy-blue` | 5 | 12 | 5 | 4.88 |
| `garden-fairy-yellow` | 5 | 12 | 5 | 5.03 |
| `garden-fairy-green` | 5 | 12 | 5 | 5.06 |
| `garden-fairy-purple` | 5 | 12 | 5 | 5.29 |

## General game art

[assets/art/index.json](../assets/art/index.json) contains **288 keys referencing 268 files**: 28 background keys, 20 thumbnails, 228 prop keys, four UI keys and eight tool icons. Aliases intentionally let different games share the same file.

The inventory includes all 20 game thumbnails; shared and game backgrounds; six plant kinds with five stages each; eight balloon colors; six gem colors; eight potion ingredients; fashion accessories; bakery parts; Pet Spa tools; memory-card art; NPC cutouts; rewards and effects. The six seed/glow revisions, matching overhead garden day/night backgrounds, cookie damage states, cake-platform crumble pieces and quadruped cape are registered. Optional `bg/broomstick-dash-far` was not required or generated. The original three plant kinds were superseded by the six-kind request.

All indexed art paths decoded successfully in the latest read-only audit. Original prompts and source locations are recorded in [generation-manifest.json](../assets/art/generation-manifest.json); cropped/recolored derivatives retain their source provenance. Some deliberately unused ingredients and cake shapes remain available for future game use.

## Intake, semantics and verification

- Full originals live in `assets/sprites/<id>/`; default optimized copies live in `assets/sprites-opt/<id>/`. Both retain per-frame ground and attachment landmarks. Sets load on demand.
- Reproducible intake specs and source sheets live in `tools/sprites/specs/` and `tools/sprites/sources/`. Prompt records also live beside specs, in `tools/sprites/pending/`, and in canonical manifests. A `pending` filename alone does not mean its recorded work is unfinished. Hotdog's 12 earliest prompt records are explicitly reconstructed; their masters are preserved.
- `flip` means reaching to turn a memory card, not a somersault. `photo` means a camera-facing peace sign for humanoids, with approved anatomy-appropriate variants for animals and limbless characters. The reviewed stable sets were checked for these meanings. Fox's legacy pose assignments were restored to each source sheet's declared row order.
- The final audit found all 26 sets below the 25  MiB decoded limit, with current optimizer fingerprints. Some long sets exceed the 1.5  MiB encoded soft target. Birthday Cake and Snowstar are close to the decoded limit, so further frames require another budget check.
- Felicity, KPop center and Princess Amber color-mask fingerprints are current. All 26 optimized copies match their full originals.
- Completed checkpoints have passed path/alpha/memory validation and runtime timing/landmark tests, with representative full/optimized game reviews by the integrator. All three KPop sets share bodyHeight275,74 keys and96 frames, with individual blink timing and coordinated poses.

All 15 player sets and 11 NPC sets are reviewed and published. The integrator reports the final Node and Python test suites passed; a final main fetch found no new requests. Future changes must refresh optimized copies and applicable masks and repeat attachment, semantics and budget checks.
