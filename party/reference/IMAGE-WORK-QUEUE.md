# Image work queue

Synced with main through `721b9ed` (including the Bumper Bounce request update,
2026-10-02), merged at `e3cfde0`.
The brief remains authoritative; this file records sequencing and ownership.
All NPC canonical designs are now user-approved, including no-blush Glimmer
and the diverse Garden Fairies with a light olive purple fairy.

## Current priorities (production resumed)

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
Production resumed by the user; generate the remaining assets and publish reviewed batches regularly.

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

## Request monitor checkpoint

Last checked revision: `630c728b6ca38d98d7c39405fde84453983a35ec`.
Last checked UTC: 2026-10-02T20:44:57+00:00.
Heartbeat: `charlie-party-image-request-follow-up`; checks every 30 minutes and
cancels itself after one full interval without new or changed image requests.
Include regeneration requests as well as new assets.

## Regeneration requests received at 6c9ac9e

Root owns the new lead-review table at the end of image-requests.md: podium
blocks, confetti atlas, card ratio, green fizzle, flatter rug, neutral potion
props, balloon framing, cookie flavor states, rock crop, cake platform/rings,
top-down garden day/night, cake stand, plant glow/seed frames and pearl tiara.
Storm Cloud lightning stays separate per the user; supply a separate effect.
Conditional sponge-layer art will be supplied for future configurable cakes.
Snow/Cake agent also owns later Fox/Cotton Candy/Unicorn/Hotdog action extras;
mermaid agent also owns later KPop trio/Amber extras. Root owns pilot extras.

## Pause checkpoint at 40% remaining

Production paused after the account check reached 60% used. No new generation
should start until the user resumes. The half-hour monitor may queue requests,
but must honor this production pause and cancel after an unchanged interval.

Last checked revision: `6fa3543e7d72c8991d3ffde2c226bb429b090845`.
Last checked UTC: 2026-10-02T21:08:58.672036+00:00.

New lead-review requests from 76b86f1 / 6fa3543: Amber dance size; Fox ride size/
anchor and dance/think/dance-star size plus head/mouth points; Cotton Candy run
size, ride anchor and giggle size; Unicorn mouth/horn points; KPop left/center
hand points; mermaid head/neck/eyes points; Troll hand points. Snowstar/Cake and
mermaid carry/cast/dance additions should be compared to their new sets before
duplicating generation. All requests in the regeneration table remain queued
unless explicitly checked against delivered outputs.

Latest sync also requests a 1024px thin hazard-striped danger ring, four outlined
256px arena-cake crumb variants, and a navy-outlined hedge with darker side face.
These supersede the small soft ring/crumbs delivered earlier.

Last checked revision: `381256aa006fb8a8f66e458baa047cfff2a08dcc`.
Last checked UTC: 2026-10-02T21:12:21.868344+00:00.

## Scheduled check — 2026-10-02 21:28 UTC

Synced main; no changed Charlie Party image requests since the previous check.
Production remains paused; no image generations were started. The previous
check was at 21:12 UTC, so a full unchanged 30-minute interval has not yet
elapsed. Keep the monitor active for its next check.

Last checked revision: `85b7d2e92a82adbae333fd5e8cc68a145d7b1fe5`.
Last checked UTC: 2026-10-02T21:29:53.396518+00:00.

## Production resumed — Sol

The user explicitly revoked the 40% allowance pause for Sol. Complete all requested
assets and regenerations, checking new requests and publishing reviewed batches.
Cake/animals and mermaid/KPop/Amber agents resumed; lighter agents own character batches, and root reviews and integrates them.
Last checked revision: `06127696957f7437feb62a83e905a551784936dc`.
Last checked UTC: 2026-10-02T21:35:49.123002+00:00.

Reviewed regeneration batch: thin1024hazardring (BumperBounce radius updated),
outlinedhedge, greenfizzle, neutralbubbles/bottle, emptycauldron,3:4cardback.
Correspondingruntimekeys pointto versionedfiles; originalsremainavailable.

## Request check — 2026-10-02 22:44 UTC

Main update `7ebc997` adds mandatory optimized copies and in-game checks in both
quality modes. This intake requirement is queued for every current delivery.
No additional image generation requests were added in that revision.
Production remains active; the former Astra allowance threshold is revoked.

Last checked revision: `68e0a8a0c4abfa5cbceac65eabf16dd9bcc2c2f2`.
Last checked UTC: 2026-10-02T22:43:57+00:00.

Reviewed: bottom-anchored seed stages, overhead garden day/night, four outlined
cake crumbs, three transparent crumble overlays, and plain round/heart/star
sponge layers. Runtime integrations include cookie flavor damage, confetti atlas,
separate Storm Cloud lightning and individual podium blocks.
