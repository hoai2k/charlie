# Sprite production completion — 2026-10-03

All current required Charlie Party images and sprite sets are generated and
reviewed. The former40% allowance pause was revoked by the user for Sol.
Completed changes are committed to main and pushed; new requests use the same
workflow without routine confirmation.

## Delivered

All 15 roster member sets cover the complete74-key player action union, plus
character extras. Felicity/Fellowfox and the KPop trio remain independently
animated while travelling together. Animal, mermaid, robot and cake anatomy
matches approved references. Troll is NPC-only and has his requested action set.

All 26 indexed sprite sets have full and optimized copies, portraits, timed
frames, ground anchors and attachment points. Extended sets include two-frame
dash/hip-bump/knockback and true four-view twirls. Longer recurring actions use
authored cycles plus smooth procedural motion. Other short verbs remain strong
key poses with procedural movement; these are not represented as fully drawn
frame-by-frame animation.

NPC wing cycles, rear fairy turns, Hoot reactions and Troll hands are reviewed.
Garden Fairies preserve approved diverse skin tones, including light olive for
the purple fairy. Storm Cloud's lightning is separate from his body images.
Hoot and Fairy Garden consumers use the new authored reactions and turns.

General game art has288 indexed keys referencing268 files, including all 20
thumbnails and required backgrounds, props, tools, effects and UI art. The
requested in-game regenerations are resolved in image-requests.md. Original
unused ingredients and neutral cake shapes remain available. Optional future
parallax art is documented in ASSET-COVERAGE.md.

Reproducible specs, source WebPs and prompt records are in tools/sprites;
canonical character information and paired/group references are in reference.
See ASSET-COVERAGE.md for final counts/memory, RECOMMENDED-ACTIONS.md for future
game actions already supported by sprites/code, and tools/sprites/AGENT-PLAYBOOK.md
for practical generation/intake lessons.

## Checks and limits

All required player keys, indexed paths, WebP alpha, timings and per-member
memory budgets are validated. Reviewed optimized copies and Felicity/KPop-center/
Amber masks have current source fingerprints. Runtime/art-loading Node tests
and builder cache/atomic-output Python tests pass. Representative gameplay
reviews cover both quality modes and alternate outfit colors.

Sets load on demand. Every member stays below the25  MiB decoded limit; some
complete sets exceed the soft1.5  MiB download target. Snowstar and Birthday Cake
are close to the decoded limit, so additional frames need a fresh budget check.

Use tools/sprites/review_frames.py for actual-scale attachment comparisons.
Convert desired runtime points back to source-local coordinates with the
inverse transform in the playbook. Inspect actual anatomy, not only bounds;
nominal grid cells can clip figures extending into the gutter. Builder output
is atomic and unchanged frame art is cached. Rebuild, optimize and refresh masks
after final spec changes before publishing.

## Main sync and follow-up

Read IMAGE-WORK-QUEUE.md for the exact latest delivery/check revision and UTC.
The delivery review heartbeat checks regeneration feedback30 minutes after new
images are delivered. It stays quiet unchanged and cancels after a full
half-hour interval without new/changed requests. New requests restart production
and reset the delivery checkpoint; preserve approved canonical designs.

Safely fetch/integrate main and stage only owned files. Never discard teammate
work or force-push. Equivalent SSH remote works when HTTPS credentials are
unavailable; keep origin unchanged. Remove only .git/._* AppleDouble metadata
when false pack-index errors recur. Disable merge.autostash for integrations
while other agents are writing files. Shared optimized index updates must
preserve other entries; its normal optimizer uses a short lock for merging.
