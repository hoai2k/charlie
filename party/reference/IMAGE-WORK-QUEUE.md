# Image work queue

Synced with main through `31cd4f0` (Round 3 of `image-requests.md`, 2026-10-02).
The brief remains authoritative; this file records sequencing and ownership.
All NPC canonical designs are now user-approved, including no-blush Glimmer
and the diverse Garden Fairies with a light olive purple fairy.

## Current priorities

Completed checkpoints: approved NPC sets/cutouts and game integration; Troll
Round 3 reactions; Felicity/Fellowfox/Bronze upgraded cycles and 14 game actions;
all three KPop members; Cotton Candy and Fox; Marina/Scale Tier-1 core sets.
Fox was committed as `ce6f813`. NPC omissions outside their requested vocabulary
are intentional, while Marina/Scale still need their extended player actions.

1. **Remaining roster** — lighter animal agent owns Hotdog; NPC agent finishes
   only Unicorn, then hands off. Amber, Snowstar and Birthday Cake each have
   core, walk/run, air/reaction and celebration/ride sheets saved with specs and
   exact prompts. Their Tier-1 core builds are reviewed; remaining actions/dance are queued.
   The lighter animal agent takes those three next, in that order.
2. **Mermaid extensions** — Marina/Scale still need game-action vocabulary and
   Round 3 animation upgrades; preserve tails and use gliding locomotion.
3. **Game art** — environment agent has delivered fashion accessories and cake
   toppings. Existing 230-key checkpoint includes backgrounds,
   thumbnails, priority props, plants, UI and effects. New accessory/topping art
   is committed; narrow game hooks remain (fashion, cake, rewards).
4. **Audit remaining requests** — compare authored poses and indexed art against
   Round 2/3 without counting aliases as newly generated art. Round 3 extra poses
   are currently broadest on the three pilot characters. Update coverage after
   the remaining roster lands; do not label the entire brief complete.

Use `tools/sprites/AGENT-PLAYBOOK.md` for practical generation/intake/QA lessons.
The integrator reviews visuals, shared code, browser behavior and commits.

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
