# Image work queue

The authoritative brief is `party/image-requests.md`. Current production has new requests in progress (2026-10-05);
the user revoked the former40% allowance pause for Sol. Reviewed batches
are committed to main and pushed regularly. Do not regenerate
approved artwork just because older checkpoints had incomplete coverage.

## Active monitoring and production (October 5 evening)

Automation: `charlie-party-image-request-monitor` (15-minute heartbeat).
Monitoring session start UTC: 2026-10-05T23:20:26Z.
Latest request activity UTC: 2026-10-05T23:37:46Z.
Quiet-window start UTC: pending delivery completion; do not cancel while producing.
Last checked revision: `c819b79bd86f753e7e12e334f410668ae0cf2c06`.
Last checked request blob: `d7e6380dea394d88a7ddad7fcb57ce03e61db8b7`.
Last checked UTC: 2026-10-05T23:40:13Z.

New briefs add119 art keys across10 games. Musical Cushions12 (6030957), Cloud Hop12 and Mini Golf11 are reviewed and delivered;Pancake Tower11 is also reviewed after alpha trimming and pan/spawn alignment;Tug-of-War10 is reviewed, with corrected canonical thumbnail and measured bow-knot alignment;All119 new minigame art keys are reviewed/registered in separate family batches;14 roster-action expansions are generated or in production, awaiting exact point/scale/mask QA. Active owners are updated in per-character source records. Felicity example65e03c8 is included in the safe mergeb3ddea9. Owners:
- beads_new_art: mini-golf11, treasure-dig16, fishing-frenzy16.
- melody_new_art: musical-cushions12, pancake-tower11, tug-of-war10.
- room_new_art: cloud-hop12, pinata-party10, snowball-splat15, jump-rope6.
- root: intake/indexes, reviewed family commits, runtime integration and requested
  new roster actions (spring-jump, putt, putt-swing, swing, snow-scoop, dig, pull,
  reel, skip-hop). Future-marked pose upgrades are included in this production
  pass; anatomy and grip points must stay correct for each15 roster member.

Felicity now has all9 new actions,12 real new frames (84 poses/105 totalframes), refreshed optimized copies and105 masks; decoded footprint21.3MiB. Root reviewed frame landmarks and optimized/full sprite viewer, with no browser errors. Fourteen roster expansions remain.

All current canonical approvals carry forward. Ship completed families promptly,
fetch main regularly, and immediately recheck for new requests after generation.
Only then start a fresh quiet window, check again15 minutes later, and cancel
this monitor after a full60 minutes of clear checks. Do not use older delivery
UTC to conclude that this monitoring session has already been quiet for an hour.

## Previous delivery (October 5 afternoon)

Latest image delivery revision: `03d1d11130b2ed03ea7e9fb441401aff8bac26d9`.
Latest image delivery UTC: 2026-10-05T19:27:32+00:00.
Last checked revision: `6d0f7b95839b7b06ea5ee17349474f012768934b`.
Last checked UTC: 2026-10-05T19:27:32+00:00.

No current image or regeneration requests remain queued. The latest main check
found no further changes to `party/image-requests.md`.

Delivered 122 new art keys: Melody Maker33, Sparkle Bead Shop16, Dream Room30
and Hide & Seek Picnic43. All are registered:410 total keys /390 decodable
WebP files. Exact prompts, PNG provenance and intake maps live under
`reference/pending/` and are registered in `assets/art/generation-manifest.json`.
The directory name is retained for compatibility; these records are delivered.

All15 player/companion sets now have two authored pump frames (30 new frames),
full and optimized copies, accurate grip points and refreshed applicable masks.
Button presses drive the pumping poses and the separate handle follows the
actual grip. Snowstar and Birthday Cake use proportionally reduced pose raster
resolution/bodyHeight to preserve displayed size below the decoded-memory cap.

All26 sprite sets validate with no errors; existing soft encoded-size and
NPC fallback warnings remain. Node runtime/art-loading and Python builder tests
pass. Hide & Seek checks cover mirroring, unchanged procedural fallback
geometry, measured openings and scene alignment. Root reviewed full/optimized
pump gameplay, art contact sheets and layer composites; the automatic Hide &
Seek run completed all three scenes without browser errors. Day/night hiding
silhouettes match; jar glass is below40% alpha; dollhouse back leakage is zero.

Published batches:72fd189 beads,4d5f9b9 melody/room,06857a6 pumping,
6d0f7b9 seek scenes/layers,03d1d11 seek creatures/toys. Reusable lessons were
added to `tools/sprites/AGENT-PLAYBOOK.md`. The new active monitor above supersedes this previous no-timer checkpoint.

## Previous delivery (October 3)

Latest image delivery revision: `35c8a94` (Unicorn, final required image set).
Latest image delivery UTC: 2026-10-03T02:34:11+00:00.
Last checked revision: `a4a79b0141bb89546f101ef51394494d6d3fe3f6`.
Last checked UTC: 2026-10-03T03:05:55+00:00.

All 15 player/companion sets are reviewed and published: Felicity, Fellowfox,
Bronze, Fox, Cotton Candy, Princess Amber, Snowstar, Birthday Cake, Hotdog,
Marina, Scale, Unicorn and all three KPop members. All cover the current 74-key action union, plus anatomy-
appropriate extras. Full and optimized copies, sources and prompt records are
published. Fox's 28 legacy source-order swaps were repaired in c6d2e78.

All requested NPC canonicals are approved, including no-blush Glimmer and the
diverse Garden Fairies with a light olive purple fairy. Requested NPC sets,
wing cycles, true rear turns, Troll/Hoot landmarks and game consumers are
published. Storm Cloud lightning is a separate effect.

General art is complete for current required requests: 288 indexed keys /268
files, including20 thumbnails, revised garden/cake/potion assets and the royal
animal-back cape. Optional future parallax background is documented in the
coverage report. Original unused ingredients and neutral cake shapes remain
available for future game use.

## Previous completion (October 3)

No required generation, export, regeneration or review work remains. All 15
players cover74 required action keys. The final audit verifies26 valid indexed
sets,26 current optimized fingerprints,3 current mask fingerprints,288 art keys
and268 decodable art files. All spec masters and new prompt records exist.
Node runtime/art-loading and Python builder tests pass. Final main sync added
no requests. Source-local candidate snapshots match the final shipping specs.

Root reviewed representative full/optimized gameplay for each completed batch.
Unicorn's final75-key/98-frame/six-portrait set is reviewed in Wizard Quickdraw
full and Broomstick Dash optimized. KPop each74 keys/96 frames/sixportraits is
reviewed in both quality modes with alternate outfits and complete boot crops.

## Verification and reusable lessons

Read `tools/sprites/AGENT-PLAYBOOK.md` and `tools/sprites/README.md`. Root reviews
actual-scale frame comparisons and representative games in full/optimized
quality. Source points are crop-local; convert runtime corrections back using
the documented inverse transform. A point within image bounds is not proof it
is on the character. Grid boundaries can clip complete source figures.

Decoded memory must stay under25  MiB per member; the1.5  MiB encoded target is
soft. Preserve requested frames, approved anatomy and individual expression.
Memory Match `flip` reaches for a card. Hold props separately using actual
palm/mouth/horn/fin landmarks. KPop shares body height/action/frame vocabulary
with individual blink timings and poses. Refresh masks after final builds.

## Previous delivery follow-up

The scheduled delivery review ran more than30minutes after the final image
batch. Main and local image-requests.md have no changes since the delivery
checkpoint. No new assets or regeneration requests are queued.

Heartbeat `charlie-party-delivered-image-review` was canceled after this
unchanged interval, as requested. No future checks remain scheduled. All
required production remains complete; there is no allowance pause.

See `ASSET-COVERAGE.md`, `SPRITE-SESSION-HANDOFF.md` and
`RECOMMENDED-ACTIONS.md` for the current inventory and future game actions.

## October 5 production history

Initial main sync at2913e62 queued the pump, Melody Maker, Bead Shop and Dream
Room additions. An incremental main sync then found the Hide & Seek Picnic
brief. Disjoint art families were delegated; root reviewed, registered and
published each batch. The current delivery checkpoint above supersedes the
older completion counts below it.
