# Image work queue

Synced with main through `721b9ed` (including the Bumper Bounce request update,
2026-10-02), merged at `e3cfde0`.
The brief remains authoritative; this file records sequencing and ownership.
All NPC canonical designs are now user-approved, including no-blush Glimmer
and the diverse Garden Fairies with a light olive purple fairy.

## Current priorities at the pause checkpoint

Completed: approved NPC sets/cutouts and integration; Troll Round 3 reactions;
Felicity/Fellowfox/Bronze upgraded cycles plus added actions; all KPop members;
Cotton Candy, Fox, Unicorn, Hotdog and Amber initial/optional action sets.
Marina/Scale have core sets plus Round 3 cycles. Snowstar/Cake have core sets.

1. **Snowstar and Birthday Cake** — extend their saved core specs/sheets to the
   initial and optional action vocabulary, including dance. Do not regenerate
   existing core art. Respect Cake's lack of limbs.
2. **Marina and Scale** — each needs 25 extended actions. Their new cycles are
   authored and published; run still aliases walk intentionally. Preserve tails.
3. **Round 2/3 extras across the roster** — inspect actual authored keys first.
   Coverage is broadest on Felicity/Fellowfox/Bronze. Latest requests below add
   hip-bump, knockback and two-frame dash; these remain queued.
4. **Remaining game art/integration** — 230-key checkpoint is published. Read
   assets/art/ART-STATUS.md for remaining icons/frame/props and code hookups.
   Fashion accessories, lantern states and ticking present are integrated.

Use `tools/sprites/AGENT-PLAYBOOK.md` for concrete production lessons and
`SPRITE-SESSION-HANDOFF.md` to resume. Prefer lighter agents with visual review.
Stop new generation during this requested budget pause.

## New requests from the latest sync

- `hip-bump`: two authored frames at 10 fps, hip cocked then swung toward facing,
  arms balancing, cheeky grin, `holdLast`, motion 0.3. Bumper Bounce now requests
  this instead of push. Adapt for quadrupeds/tails and Cake without new limbs.
- `knockback`: two frames at 8 fps, leaning back and windmilling/skidding away
  from the hit, motion 0.3. Bumper Bounce holds this about 0.7 seconds. The engine
  already supplies fallback lean, wobble, flash and dust; authored images remain
  queued across the roster.
- `dash`: upgrade to two frames (launch and held lunge) with `holdLast` for Crown
  Keeper. Existing single-frame dash artwork remains usable until upgraded.
- No fake paper-width twirls. Actual spins in celebrate/ready/pose-twirl require
  front/three-quarter/back/three-quarter artwork; the engine fallback now hops.

These are additive follow-ups after the remaining roster's initial vocabulary;
they must not cause completed unrelated sheets to be regenerated.

## Quality and verification

- Match the approved canonical; no new anatomy for Cake, Bronze or animals.
- Supply ground anchor and head/hand/eyes/neck/back on every frame. Keep
  neutral bodyHeight and trim alpha; preserve airborne anchors.
- Use authored key poses plus procedural motion for short actions; spend
  additional frames on Round 3's long-held or recurring poses.
- Keep a set near 1.5 MB compressed and under 25 MB decoded. Check tiny
  60 px portraits, attachments and motion in actual games.
- KPop members share bodyHeight, pose keys and frame counts, with varied
  blink timing and individual celebration/dance personalities.
- Validate all paths, alpha, manifests and timing; run the runtime tests.
  Use lighter agents for inventory checks and root review for visual quality.
- Merge teammates' changes frequently. Preserve both sides of additive
  image-request changes and adapt integrations to lazy sprite loading.

## Budget checkpoint

At approximately 40% remaining account allowance, stop starting new assets,
finish in-flight work, commit/push safe checkpoints and save a handoff with
exact remaining requests. Do not treat aliases or procedural fallbacks as
newly authored images in coverage reports.
