# Charlie Party asset coverage

Snapshot: 2026-10-02. Round 3 is queued in `IMAGE-WORK-QUEUE.md`; `../image-requests.md` remains authoritative. This is an incremental delivery, not a claim that every requested pose has been authored.

## Indexed sprite sets

| Asset | Pose keys | Authored frame entries | Portraits | Aliases |
| --- | ---: | ---: | ---: | --- |
| `felicity` | 57 | 67 | 5 | run, dance-star |
| `fellowfox` | 57 | 67 | 5 | run, dance-star |
| `troll` | 19 | 37 | 5 | exit, celebrate |
| `glimmer` | 14 | 17 | 6 | cheer, walk, ready, pout |
| `bronze` | 57 | 68 | 5 | run |
| `professor-hoot` | 14 | 13 | 6 | surprised, wave, celebrate, cheer, point, laugh |
| `shadow-imp` | 13 | 20 | 6 | celebrate, cheer |
| `shadow-imp-blue` | 13 | 20 | 6 | celebrate, cheer |
| `shadow-imp-pink` | 13 | 20 | 6 | celebrate, cheer |
| `garden-fairy-pink` | 5 | 7 | 5 | fly |
| `garden-fairy-blue` | 5 | 7 | 5 | fly |
| `garden-fairy-yellow` | 5 | 7 | 5 | fly |
| `garden-fairy-green` | 5 | 7 | 5 | fly |
| `garden-fairy-purple` | 5 | 7 | 5 | fly |
| `marina` | 74 | 91 | 5 | run |
| `scale` | 74 | 91 | 5 | run |
| `kpop-girl-left` | 44 | 60 | 6 | — |
| `cotton-candy` | 45 | 60 | 5 | — |
| `kpop-girl-center` | 44 | 60 | 6 | — |
| `kpop-girl-right` | 44 | 60 | 6 | — |
| `fox` | 45 | 60 | 5 | — |
| `princess-amber` | 43 | 60 | 5 | — |
| `snowstar` | 75 | 96 | 5 | — |
| `marshmallow-birthday-cake` | 20 | 32 | 5 | — |
| `unicorn` | 45 | 62 | 6 | — |
| `hotdog` | 45 | 60 | 5 | — |

Frame entries may repeat an image for timing; aliases and procedural overlays are not additional authored artwork. Frames include ground anchors and attachment landmarks. Sprite sets load on demand.

## Remaining character work

- Felicity, Fellowfox and Bronze have their published Round 3 cycle upgrades and fourteen extra game actions.
- Marina and Scale have Tier 1 core animation, portraits and Round 3 blink/celebration/pout/dance/ride upgrades. Their expanded sets now have 74 keys / 91 frames; paint and newly requested landmark polish remain pending.
- Cotton Candy, Fox and all three KPop members are published. Unicorn and Hotdog also have their initial action sets and Pet Spa poses.
- Princess Amber has 43 authored pose keys and 60 frame entries. Snowstar now has 75 keys / 96 frames and five portraits, including carry, cast and four-frame dance. Birthday Cake retains its core build (20 keys / 32 frames / five portraits); extension sources are saved as incomplete pending intake.
- Round 2 requests remain incomplete across the roster. Consult the work queue and actual manifest rather than treating runtime fallback as completed artwork.
- All requested NPC canonicals are user-approved. Hoot, Imps and Fairies are integrated; Troll has his own run, ready, pout, sad, cheer and wave. Storm Cloud and Broccoli are indexed prop variants; Storm lightning is drawn separately.

## Registered game art

The published checkpoint has **263 keys / 245 unique files**. All 20 game thumbnails and shared/game backgrounds are present, alongside 30 plant stages, priority props, UI rewards and effects. Fashion accessories and cake parts are included. Remaining art and code hookups are recorded in the queue.


## Verification

- Sprite timing, alias, fallback, one-shot and landmark runtime tests pass.
- Indexed sprite paths, WebP decoding, alpha pass validation at published checkpoints. Some longer sets exceed the approximate 1.5 MiB download target while remaining below the decoded-memory limit. NPC-only sets intentionally do not implement every player Tier 1 action.
- Browser smoke checks passed for Wizard Quickdraw, Fairy Count and Broomstick Dash, with no warning/error console entries.
- Each completed character checkpoint is committed and pushed to main for concurrent game testing.
