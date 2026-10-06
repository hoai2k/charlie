# October 5 evening production handoff

All 119 minigame art keys are reviewed and published to origin/main in family
batches. Ten character expansions are published through Marina (1b765fb).
See IMAGE-WORK-QUEUE.md for the authoritative current checkpoint and monitor.
Remaining: Cotton Candy, Fox, Unicorn, Hotdog (precision audit agent) and Scale
(room_new_art). Do not regenerate approved sheets. Each remaining set has two
new-game sheets, intake records, specs and runtime exports; audit crop bounds,
head scale, every landmark and the full decoded 25 MiB budget before publishing.

Push each reviewed character immediately. Stage only its optimized-index entry
by merging it with HEAD, leaving the live index intact. Precise method and mask
lessons are in AGENT-PLAYBOOK.md. All nine action keys remain registered and
runtime.test.mjs now guards their presence. No allowance pause applies.

Immediately after final delivery fetch/safely integrate main and check semantic
image requests against blob d7e6380dea394d88a7ddad7fcb57ce03e61db8b7. Handle new
requests, then record delivery/check UTC using clock tool (shell clock drifts).
Reset existing charlie-party-image-request-monitor heartbeat for 15 minutes
later. Cancel only after 60 continuous quiet minutes after latest activity or
completed delivery. Production is ongoing, so quiet-window start is pending.
