# Image work queue

Synced with main through `31cd4f0` (Round 3 of `image-requests.md`, 2026-10-02).
The brief remains authoritative; this file records sequencing and ownership.
All NPC canonical designs are now user-approved, including no-blush Glimmer
and the diverse Garden Fairies with a light olive purple fairy.

## Current priorities

1. **NPC integration** — finish Hoot, three Imps, five Fairies, Broccoli and
   Storm Cloud; register sets and cut-outs. Connect game rendering. Keep
   Storm Cloud lightning separate. Add Troll's own run, ready, pout and sad.
   Owner: NPC art agent; root handles game integration and checks.
2. **Upgrade the shipped pilots** — Felicity, Fellowfox and Bronze: idle
   blink, 3–4 celebration frames, two pout frames, four dance frames at
   4 fps, two ride frames, distinct cheer/sad. Then sing, water, count,
   look-up, hold-present, toss, sooty, swim, sit, balance, blow and float.
   Fellowfox also needs giggle and catch-toy. Root queues these separately
   from their already shipped 37 initial actions plus six optional actions.
3. **Remaining roster** — animal agent finishes Cotton Candy currently in
   progress, then Fox, Unicorn and Hotdog. NPC agent takes the KPop trio
   after NPCs. Root has Marina/Scale generation in progress, then Princess
   Amber, Snowstar and Birthday Cake. Each completed set ships immediately.
4. **Remaining game art** — environment agent: balloons/pump, gems, Pet Spa
   tools, 30 plant stages and watering can, ingredients, memory-card back,
   notes, cookies, broom props and vanity mirror, then remaining original
   and Round 2 requests. Already generated items are not regenerated.

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
