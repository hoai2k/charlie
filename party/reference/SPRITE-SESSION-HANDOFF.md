# Sprite session handoff — 2026-10-02 resumed checkpoint

Production is paused at the user's requested 40% remaining allowance threshold
(60% used). Do not start further image generation until the user resumes.
The entire image brief is **not complete**. All approved canonicals remain approved.

## Published and ready work

This resumed session published gold frame, eight art icons, candle flame,
sprinkles, three legacy ingredients, matching bathtub front overlay, fountain,
hedge, arena cake/crumb, danger ring and all eight pet-bow color keys.
Reviewed expanded mermaid sets contain 74 pose keys, 91 frames and five portraits
each, with shared output scaling; decoded sizes are 23.4 and 23.0 MiB.
Their `paint` action remains pending, with exact saved prompts. The new lead
review additionally requests head/neck/eyes attachment review.

## Saved partial work: do not ship as completed sprites

Felicity's three new generated source sheets and exact prompts are committed as
source work only. `tools/sprites/pending/felicity-round2-intake.json` holds crops
and draft frames; shipping Felicity spec was restored to its validated version.
The pending landmarks are defaults and need manual annotation, not blind build.
Consolidate dash-launch/held, hip-cocked/swung, knockback-a/b into two-frame keys;
combine twirl-front/right/back/left into a four-view `pose-twirl`.
Compare head size against idle, adjust shared output size if decoded >25 MiB,
set correct airborne anchors, loops, one-shot timings and facing. Review all
new crops for clipping; discard any detached baked effect particles.

Snowstar/Cake in-flight status is recorded below after agents finish saving.
No other character expansions were started by these agents after the pause.

## Remaining queue

Read the latest `../image-requests.md` regeneration table and IMAGE-WORK-QUEUE.
General-art regenerations include podium blocks, confetti atlas, card ratio,
green fizzle, rug angle, neutral cauldron/bubbles/bottle, separate Storm Cloud
lightning, balloon framing, cookie flavor damage states, rock crop, platform
crumble rings, 1024px hazard danger ring, four outlined crumb variants, outlined
hedge, top-down garden day/night, stand angle, plant glow/seed and pearl
tiara. Conditional plain sponge cake layers are also requested.

New sprite review requests include Amber dance scale; Fox and Cotton Candy
scale/ride anchors; Fox, Unicorn, KPop left/center, mermaid and Troll landmarks.
Complete full action vocabulary for Felicity/Fellowfox/Bronze, KPop trio/Amber,
Fox/Cotton Candy/Unicorn/Hotdog and Cake. Mermaids still need paint.
Do not count aliases or engine fallbacks as newly authored artwork.

## Resume workflow and monitoring

Read tools/sprites/AGENT-PLAYBOOK.md for prompt, intake, landmark, validation and
safe Git lessons. Use lighter agents for isolated character/metadata work and
root visual review. Never stage another worker's unfinished files.

Sync main safely; SSH equivalent remote works while HTTPS credentials do not.
Remove only macOS .git/._* sidecars before/after fetch if false pack errors occur.
Keep configured origin unchanged. Commit and push reviewed batches regularly.
The half-hour heartbeat `charlie-party-image-request-follow-up` queues new or
changed requests while paused, and cancels after one unchanged 30-minute interval.
Its newest baseline is in IMAGE-WORK-QUEUE.md.

No-cache preview is port 8141. Test timing/landmarks and art loading with:
`node --test party/tools/sprites/runtime.test.mjs party/tools/sprites/art-loading.test.mjs`.
Validate stable builds with `python3 party/tools/sprites/validate.py`.
Per-member decoded limit is 25 MiB. Total encoded 25 MiB is now a distribution
warning because sprites load on demand; 1.5 MiB per-member remains a soft target.
