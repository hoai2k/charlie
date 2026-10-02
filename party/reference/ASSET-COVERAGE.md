# Charlie Party asset coverage (snapshot, 2026-10-02)

This is a filesystem and source snapshot. Sprite sets are loaded only when listed in `assets/sprites/index.json`; art is loaded only from `assets/art/index.json`. Missing art keys use procedural drawing in the game. Later asset work may change this inventory.

## Character sprites and portraits

The roster has 15 member assets (the KPop trio counts as three). Required Tier-1 poses and five expressions are defined in `image-requests.md` §4.1 and §7. Only Felicity and Fellowfox are on the sprite-set index alongside the NPC sets Troll and Glimmer. All 15 base character images are present; the other roster members currently animate from base art with procedural movement/emotes.

| Member asset | Sprite status | Portrait status |
| --- | --- | --- |
| `felicity`, `fellowfox` | Pilot sets present; 43 pose keys each. Most pilot actions have authored frames; `run`, `cheer`, `sad`, and `dance-star` are aliases; some pose names overlap optional actions. | Five authored expressions each: neutral, happy, sad, surprised, determined. |
| `kpop-girl-left`, `kpop-girl-center`, `kpop-girl-right`, `bronze`, `cotton-candy`, `fox`, `hotdog`, `marina`, `scale`, `marshmallow-birthday-cake`, `princess-amber`, `snowstar`, `unicorn` | No sprite set indexed; all pose requests use procedural/base-art fallback. | No authored sprite portraits; portrait crops use base art. |

**Pending for the 13 other roster members:** Tier-1 poses and five portraits, then the Tier-2/3 work in §4.1 and §4.3. **Round 2:** its 30 general pose requests are pending across the roster. Existing pilot `dash`/`catch` frames only cover Felicity and Fellowfox; they do not cover the other 13. The remaining Round 2 asks—including NPC additions—are not authored for the full requested population. `sing`, `water`, pet-only `giggle`/`catch-toy`, and Troll additions from “Added with the last six games” also remain pending outside any overlapping existing pilot actions.

## NPC sprite coverage

| NPC | Current art | Coverage / pending |
| --- | --- | --- |
| Glimmer | Indexed sprite set; 14 pose keys, 17 authored frames, six portraits (including `talk`). | Authored idle/talk/present/wave/cast/point/celebrate/surprised/sad/think. `cheer`, `walk`, `ready`, `pout` are aliases; other requests fall through the sprite pose fallback chain or procedural/base-art mode. Round 2 `point`/`present` already have frames. |
| Troll | Indexed sprite set; 14 pose keys, 27 authored frames, five portraits. | Idle/walk/windup/slam/grab/surprised/laugh/dizzy/hurt/sleep/think are authored. `exit` and `celebrate` are aliases; missing Tier-1 run/jump/fall/land/pout/sad/wave/ready are reported by validator; all five expression portraits validate. |
| Professor Hoot | Canonical reference exists; no indexed sprite set. Current prop key `prop/professor-hoot` is not registered in art manifest. | Requested NPC pose set and portraits pending; procedural owl is the runtime fallback. |
| Shadow Imps (base, blue, pink) | Canonical references exist; no indexed sprite sets. | Spotlight Dance-Off and Pop Star Stage requests (idle/dance variants/laugh/eep/poof/surprised) pending. |
| Garden fairies, Storm Cloud, Grumpy Broccoli | Canonical/reference art exists; no sprite sets. | Not loaded as sprite actors in current roster path; code-drawn fairies and procedural effects remain. Approval state is not inferred from file presence. |

## Registered game art and runtime use

`assets/art/index.json` has 47 keys resolving to 46 unique files; every registered path exists. Runtime source calls use the registered backgrounds and UI keys. These backgrounds are available: title/menu/results/howto/marathon; all 20 listed minigame backgrounds except `bg/art-gallery`; plus `bg/fairy-garden-night` and `bg/fashion-show-dressing`. `ui/title-bg` aliases `bg/title`. There are 18 registered thumbnails; procedural game icons cover unregistered thumbnails.

`art()`/`drawArt()` runtime use also requests props (for example `prop/giant-cake`, `prop/seat-cloud`, `prop/cake-platform`, `prop/present`, `prop/party-rug`, `prop/storm-cloud`, `prop/owl-mail`, `prop/star-ring`, `prop/broom`, `prop/vanity-mirror`, `prop/rubber-duck`, `prop/watering-can`, `prop/firefly`, and dynamic treatment/ingredient/note/plant keys). None of those `prop/*` keys is registered in the current art manifest, so these calls use their code-drawn fallbacks. This is consistent with the art request brief's pending prop work. `bg/art-gallery` is likewise requested in the brief but currently has no art-manifest entry; the gallery has a procedural fallback.

## Checks run

- `node party/tools/sprites/runtime.test.mjs` — passed: “Sprite runtime timing, alias, fallback and one-shot regression tests passed. Draw timing and sprite landmark tests passed.”
- `python3 party/tools/sprites/validate.py` — completed with warnings: Felicity and Fellowfox each report 43 poses, 42 real frames, five portraits; Troll 14/27/five; Glimmer 14/17/six; four sets, 3.59 MiB total. Warnings: Troll is missing Tier-1 `run`, `jump`, `fall`, `land`, `pout`, `sad`, `wave`, `ready` (all five portraits validate); Glimmer is missing Tier-1 `run`, `jump`, `fall`, `land`, `hurt`, `dizzy`. These are warnings, not validator failure.
