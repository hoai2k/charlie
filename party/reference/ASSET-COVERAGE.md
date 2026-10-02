# Charlie Party asset coverage

Snapshot: 2026-10-02. Round 3 is queued in `IMAGE-WORK-QUEUE.md`; `../image-requests.md` remains authoritative. This is an incremental delivery, not a claim that every requested pose has been authored.

## Indexed sprite sets

| Asset | Pose keys | Authored frame entries | Portraits | Aliases |
| --- | ---: | ---: | ---: | --- |
| `felicity` | 43 | 52 | 5 | run, dance-star |
| `fellowfox` | 45 | 55 | 5 | run, dance-star |
| `troll` | 19 | 37 | 5 | exit, celebrate |
| `glimmer` | 14 | 17 | 6 | cheer, walk, ready, pout |
| `bronze` | 43 | 53 | 5 | run |
| `professor-hoot` | 14 | 13 | 6 | surprised, wave, celebrate, cheer, point, laugh |
| `shadow-imp` | 13 | 20 | 6 | celebrate, cheer |
| `shadow-imp-blue` | 13 | 20 | 6 | celebrate, cheer |
| `shadow-imp-pink` | 13 | 20 | 6 | celebrate, cheer |
| `garden-fairy-pink` | 5 | 7 | 5 | fly |
| `garden-fairy-blue` | 5 | 7 | 5 | fly |
| `garden-fairy-yellow` | 5 | 7 | 5 | fly |
| `garden-fairy-green` | 5 | 7 | 5 | fly |
| `garden-fairy-purple` | 5 | 7 | 5 | fly |
| `marina` | 16 | 16 | 5 | cheer, sad, run |
| `scale` | 16 | 16 | 5 | run, cheer, sad |

Frame entries may repeat an image for timing; aliases and procedural overlays are not additional authored artwork. Frames include ground anchors and attachment landmarks. Sprite sets load on demand.

## Remaining character work

- Pilot Round 3 upgrades for Felicity, Fellowfox and Bronze are in progress: authored blink, celebration, dance, ride, expressions and added game actions. These are not all published yet.
- Marina and Scale have Tier 1 core animation and portraits; their remaining game-specific poses are queued.
- Cotton Candy is in visual review. Fox, Hotdog, Unicorn, the KPop trio, Princess Amber, Snowstar and Birthday Cake still require additional or complete sprite production.
- Round 2 requests remain incomplete across the roster. Consult the work queue and actual manifest rather than treating runtime fallback as completed artwork.
- All requested NPC canonicals are user-approved. Hoot, Imps and Fairies are integrated; Troll has his own run, ready, pout, sad, cheer and wave. Storm Cloud and Broccoli are indexed prop variants; Storm lightning is drawn separately.

## Registered game art

The current art manifest has **150 keys / 140 unique files**. All 20 game thumbnails and shared/game backgrounds are present. Props are being delivered incrementally; remaining plant stages, notes, UI items and other brief requests remain queued.

## Verification

- Sprite timing, alias, fallback, one-shot and landmark runtime tests pass.
- Indexed sprite paths, WebP decoding, alpha and budgets pass validation at published checkpoints. NPC-only sets intentionally do not implement every player Tier 1 action.
- Browser smoke checks passed for Wizard Quickdraw and Fairy Count, with no warning/error console entries.
- Each completed character checkpoint is committed and pushed to main for concurrent game testing.
