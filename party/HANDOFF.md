# Charlie Party: session handoff (state for resuming work)

Keep this file current while long jobs run. A new session (or a session whose
context was compacted) should read this, `PLAN.md` (status + known issues),
`image-requests.md` and `audio-requests.md` before continuing.

_Last updated: 2026-10-12, after the completed Play Studio art delivery._

## In progress right now

### Molly Party code (lead session) — all 23 on the shelf (2026-10-13)
All Molly games merged. The cheeky round replaced six "do as you're told" games:
puppy-splash->muddy-mayhem, dance-freeze->sneaky-dance, ballet-butterflies->opposite-ballet,
tea-party->whoopee-tea, shape-train->bed-bounce, ladybug-spots->prank-troll (MOLLY_SWAPS in
games/index.js: new game takes the old slot; old games stay playable by id). Their image
requests keep only reused rows (REPLACED notes); the rest is in history as dropped.
SFX: round 6 (194, the 17 kept games) done; round 7 (96, the cheeky six) done
(tools/audio/sfx/round7.py). New poses registered: ride-sit, boop, cuddle,
tongue-out, hose-spray, silly-pose, tiptoe. Fairy playable request lists 56 poses for the 23
games (scratchpad molly-poses.txt). `?chars=` accepts NPC ids (glimmer, garden-fairy-*).
Molly intro = fairy picker (scenes/molly-seats.js, 2026-10-13): every Molly game's how-to
screen seats players as fairies (glimmer + garden-fairy-*), picked per game; A join/ready, B
unready/leave; fairy players' stars proxy to the party seat; memo keeps seats for the next
Molly intro. Charlie random/marathon exclude Molly (gameselect). Molly art QA: 3 worktree
agents (brief scratchpad molly-art-qa-brief.md): A = fairy-hide-seek cupcake-stack bubble-pop
balloon-float unicorn-jump ghost-giggles kitten-yarn; B = sock-match garden-grow fairy-flutter
wand-shapes sneaky-dance opposite-ballet muddy-mayhem; C = trick-or-treat duckling-parade.
Merge with scratchpad merge_game.sh-style merges (no register needed), then restamp/push.

### Molly Party image delivery — in progress
User waived all future Molly character approvals; self-review and proceed. Completed and in-game checked batches through `2ad4cda9`: Garden, Dance, Wand, Sock, Fairy Hide and Seek, Cupcake, Bubble and Balloon. Shared optimizer/loader preserves frame physical heights and attachment landmarks; focused Python/Node tests pass. Finished batch art is pushed to main immediately. Six replacement-game briefs have landed and are queued; structural agent handles six full playable Fairy sets, performance handles Unicorn/Ghost/Pumpkin/Snowflake then Bed/Prank/Sneaky, tools handles Trick/Duck/Mermaid then Opposite/Whoopee/Muddy, root handles Kitten/Rainbow and integration. Exact prompt/source records and WIP remain under reference/pending. Shared art uses game-prefixed sibling variants where needed. Art readiness does not imply gameplay QA; open requests stay until actual checks pass. Old monitoring remains canceled.

### Play Studio image delivery — complete

All ten studio art requests are delivered through `4e6dd8ed`, committed/pushed in minigame/family batches:293 new art images, two accessory replacements and18 approved creature references. Inventory875 keys/855 WebPs. All294 request keys (including reused beach crab) have valid dimensions/alpha and decode. Aquarium fish/colour/puffed variants and all65 environment/decor keys are complete. There is no image work or canonical approval pending; immediate main check was clear. No new timer was requested.

New art uses index `groups`: boot loads thumbnails/common art; PlayScene waits before game construction and releases game-owned images on exit. Tests cover cancellation/reuse/reload. Geometry follows authored wheel/kiln, booth, tower surfaces and flag poles. Aquarium jelly pulses around its bell; clams retain pearls; authored chest lid pixels animate over the unchanged body; night lights redraw exact source silhouettes. Sprite validation and focused runtime/loading/geometry/builder tests pass; existing soft sprite warnings remain. Exact queue/checkpoint and review gallery are in reference/IMAGE-WORK-QUEUE.md.

### Image delivery 2026-10-12: complete

All open image requests are generated, reviewed, archived and pushed through `1ec90ae`: bakery (15 assets), fashion (32 assets), bunny faces (6 assets), six prop replacements, two Hotdog pull frames and six Cake hand point fixes. All 26sets validate without hard errors; art inventory: 582 keys / 562 files. Three headband anchors follow measured art seating; generatedfishing handle retains bendingproceduralshaft. Actual wearable gallery: reference/pending/OCT12-WEARABLE-REVIEW.html. Queue has exact delivery/check revision and UTC. No image work or approval pending; the old monitor remains cancelled.

Cake/Hotdog specs now reproduce all October landmark-audit points exactly. Other older specs may still lag shipping manifests; synchronize current runtime landmarks before rebuilding them. Builder now preserves explicit eyes: null and framebodyHeight. Exact inverse/provenance lessons in spriteplaybook.


### Session log 2026-10-09 (update this as work proceeds)
Standing rules: after every change commit, then push `main` AND the branch
`claude/festive-planck-7ik6bk`; run `node party/tools/stamp-modules.mjs` after
any `party/src` change; fielded image requests move to
`image-requests-history.md` (newest first).

Done and pushed this session (all tested headless in Playwright):
- Golf: aim with a target marker (stick moves it; distance = strength; A putts).
- Results screen: fanfare/cheer/lose sting follow human players only.
- Skip to the end: elimination games report `humansOut()`; play scene shows
  "B Skip to the end" bottom right and fast-forwards muted.
- Jump rope: the nearer rope draws in front (sorted by `sin(th)`).
- Snowball Splat: A (or B) holds to pack, RT/RB/X throws.
- Musical Cushions: X bumps, B dashes; both cost 1/3 energy, earned by walking
  around the ring with the arrows; energy bar under unseated players.
- Piñata Party: B dashes, X also swings.
- Cloud Hop: "Air Hop (double jump)" label.
- Music: title anthem carries over the menus once (`music.carryTitle()`,
  `music.menu()`), then the menu loop. If a game interrupts it, its file and
  position are kept in `music.titleResume`; the next `music.menu()` fades it
  back in from there (2 s) and lets it finish; the title screen also resumes
  it (looping). Once it has finished it's cleared and the title restarts at 0.

- Sprite size audit: merged (agent branch `worktree-agent-aa758eadd38bed57e`).
  Frames/poses in the 15 `sprites/<set>/sprites.json` now carry their own
  `bodyHeight` (frame > pose > set, `frameBodyHeight()` in `sprites.js`) so
  every pose keeps idle head size; 449 frames rescaled in data, no art
  changed. New art that comes in at a different scale: add a pose/frame
  `bodyHeight` instead of asking for a redraw (documented in
  image-requests.md 3.3).

- D-pad / placement / runway (user request 2026-10-11): done. D-pad does UI
  choices while the stick positions (pads only; keyboard WASD is the d-pad)
  in Pet Spa, Cake Bakery, Fairy Garden; Dream Room/Fashion Show dressing
  already did. Pet Spa bows and Cake Bakery toppings: A over one picks it up
  (A drops), B takes it off. Fashion Show runway: groups with humans get an
  18 s free turn (stick moves, A jumps, other buttons = photo poses, View =
  Done); all-CPU groups keep 4.6 s.

- Accessories (user request 2026-10-12): done. Cake Bakery: 13 toppings, 2
  sprays, more shapes/flavours/frostings/styles/drizzles. Fashion Show: 32
  new items; the wardrobe and landmark attachment live in
  `engine/outfits.js`. Landmark audit: all 1,629 frames of the 15 playable
  sets have head/hand/eyes/neck/back (conventions in image-requests.md
  3.6; quadruped hand = mouth; `eyes: null` only on twirl back views);
  validate.py errors on a missing one. Rebuilding a set from its intake
  spec (`tools/sprites/specs`, build.py) would undo these fixes.
- Pop Star Stage adaptive difficulty (user request 2026-10-12): each lane
  has its own level 0-4 (Easy-peasy..Superstar), notes taken from that
  level's chart as they come into view (`commitNotes`); 11 of the last 12
  hit (half perfect) steps up, fewer than 5 of the last 8 steps down. Points
  x0.6/0.8/1/1.3/1.6 by level. The how-to "Notes" choice sets the start
  level (Easy 1, Normal 2, Hard 3). Stars under each lane show the level.
- Fishing Frenzy simplified (user request 2026-10-13): A while any fish is
  at the float hooks it (no "too soon"), reeling is just tapping A (no line
  tension, no snapping, tugs only slow it), fish no longer flee a splash.
- In progress (user request 2026-10-13, 4): art for the 10 Play Studio
  page-2 games (+ teddy backpack, fishing rod) arrived; 3 art-QA worktree
  agents (A: hair-salon, nail-studio, dance-studio, puppet-theater, teddy;
  B: aquarium, sandcastle-beach, snowman-builder; C: acrobat-circus,
  star-maker, pottery-wheel, fishing rod). Merge their fixes, add their
  regen rows (scratchpad `add_regen.py`), push.
- In progress (user request 2026-10-13, 3): **Molly Party** — Fairy Count's
  tile on Party Games page 1 becomes a "Molly Party" tile that opens a
  separate shelf of 23 new games for age 4–5 (+ a "Charlie Party" tile
  back). 12 worktree agents build 2 games each (brief: scratchpad
  `molly-brief.md`, category 'molly'); image requests copied to main early
  (`copy_reqs.py` handles "## New Molly Party game:" too once updated).
  Lead: game select molly view (done), MOLLY list, fairy-count hidden.
  User 2026-10-13: Glimmer is the 6th Molly fairy player. No Charlie *player* characters inside Molly games (NPCs
  OK); garden fairies may become the Molly player roster — image request
  "Molly Party: the five garden fairies as playable characters" is on main
  with a provisional pose list; finalise it from the merged games' poses
  (agents list them in their reports).
- Fashion Show item nudge (user request 2026-10-13): right stick moves the
  current spot's item from its anchor, RS held + up/down sizes it (limits
  `ADJ_LIMITS` in outfits.js: ±0.6 slot, 0.6–1.6×), a tap of RS resets.
  Kept per character+item for the visit (`rememberAdj`/`recallAdj`, memory
  only); outfit entries carry dx/dy/scale, so saved looks keep them for
  worn items only, and every game's Actor draws them.
- Play Studio page 2 (user request 2026-10-13): 10 games merged and
  registered (hair-salon, dance-studio, acrobat-circus, nail-studio,
  sandcastle-beach, puppet-theater, snowman-builder, aquarium, star-maker,
  pottery-wheel); their image requests are on main; `STUDIO_PAGES` + "More
  Play" tile in game select. New POSES registered with fallbacks: mold,
  tuck, roll-push. SFX: `party/tools/audio/sfx/round5.py` (specs in
  round5-specs.txt): generated and built 2026-10-13 (100 sounds).
  Optional future poses: point-up (star-maker), show-nails, snip.
- Art QA of the 2026-10-12 deliveries: done (fixes merged; regen rows:
  teddy backpack wrong side, optional shorter rod handle).
- Workbench (`party/workbench/`, README there): view/edit landmarks and
  outfit item fit per set/pose/frame, undo/redo, export JSON. Apply a
  user's JSON with `node party/tools/apply-workbench-edits.mjs edits.json`
  (landmarks -> sprites.json; items -> `src/data/outfit-fit.js`, read by
  `engine/outfit-fit.js` from `outfits.js`). Felicity/KPop centre/Amber
  masks need `--rebuild-masks` after landmark edits.
- Party marathon how-to screen (user request 2026-10-12): B (when not
  ready) sits that one game out, A joins back in, Y twice skips the game.
  The last human (or the game's minPlayers) can't sit out. `play.enter`
  gets `playing` and calls `sitOut()` (session.players = who plays,
  session.roster = everyone); intro/gameselect/charselect/trophy call
  `restoreRoster()`. Outside a marathon B on the how-to still goes back.
- Dress up (user request 2026-10-12): done. In character select the last
  "colour" (a star dot) is Dress up: `scenes/closet.js` edits a look from
  the Fashion Show wardrobe (`engine/outfits.js`), saved per character in
  localStorage (`loadLook`/`saveLook`, key `charlie-party-looks`).
  `player.outfit` -> `Actor` wears it on every frame (`setOutfit`, via
  `wearOutfit` attachments). A game that draws its own outfit must create
  its actors with `outfit: null` (Fashion Show does, and starts its
  wardrobe from the player's look).
Also open: the Pages deploy for 21e5760 failed (user made the repo public;
they interrupted my log check, so wait for them before touching it).

### Music generation (ElevenLabs Eleven Music, `music_v2_5`): finished
- The user topped up ElevenLabs credits and asked to finish all songs.
- **Order:** rhythm songs first, then the background songs.
- **Rhythm set (7 full songs, played once, ~80–100 s, 2 takes each):**
  `rh-afro` Sunbird Dance, `rh-island` Coconut Calypso, `rh-hiphop` Block Party
  Bounce, `rh-reggae` Sunshine Skank, `rh-bossa` Moonlit Bossa, `rh-tango`
  Twirling Tango, `rh-flamenco` Fiesta Fan.
  - Every song has the same shape: intro breather → groove A → 2-bar breather
    → groove B (different pattern) → breather → groove C (busiest) → ending.
  - Full briefs are in `audio-requests.md` §6.2 and §12 (the agent updates
    them), and in `tools/audio/music/prompts.py` / `plans.py`.
- **Background songs (loops, 2 takes each):** chase, bouncy, tense, victory,
  plus an optional original `title` theme. `title` and `party` keep *Bubblegum
  Radar* unless the user picks the new theme.
- **Already committed:** dance (3 takes, in game: dance-1), menu (3, in game:
  menu-1), chill (1).
  - **Rhythm batch 1 (committed):** `rh-afro` Sunbird Dance (104 BPM),
    `rh-island` Coconut Calypso (108), `rh-reggae` Sunshine Skank (96). The
    alternate takes are `takes/rh-afro-1`, `rh-island-2` and `rh-reggae-2`.
  - **Rhythm batch 2 (committed):** `rh-hiphop` Block Party Bounce (92 BPM,
    swung), `rh-bossa` Moonlit Bossa (110), `rh-tango` Twirling Tango (112,
    start 0.1857) and `rh-flamenco` Fiesta Fan (112, only grooves A and B).
    The alternate takes are in `takes/`.
  - **Background loops (committed):** chase-1, bouncy-1, tense-1 and
    victory-2 are in the manifest. The alternates (bouncy-2,
    tense-2, victory-1) and two original title themes (title-1, title-2, the
    agent prefers title-2) are for auditioning only. Title and party still
    use Bubblegum Radar.
  - **Generation is done.** The details are in `audio-requests.md` §6.2
    and §12 (§12.8 has the measurements and why each take was rejected).
    The ElevenLabs credit balance is unknown, because the key lacks the
    `user_read` permission.
  - **Song tags (Settings, default On):**
    - A bottom-right tag names the song and take playing ("Chase · take 2").
    - Songs with alternates play a random take each time they start.
      Clicking the tag (it shows ⟳ when a song has alternates) cycles to the
      next take; `engine/songtag.js` takes the click before the scene sees
      it. Rhythm-game songs can't switch mid-song, because the chart is built
      from the take.
    - Background alternates are listed under `"takes"` in the manifest music
      entries. Rhythm alternates, with their own onsets, are in
      `music/rhythm/takes.json`.
    - The Takes tab marks each take "in game", "in mix" or plain "take".
    - User feedback so far: `menu-2` and `chase-2` were too repetitive and are
      deleted. Everything else heard so far sounds good.
    - Left out of the mix: dance-2/3 (Shadow Banish's beat drives Spotlight
      Dance-Off), victory-1 (bump at the seam), rh-bossa-1, rh-tango-2 and
      rh-flamenco-2 (the beat wanders).
    - When the user has decided: set the chosen takes as the main entries,
      delete the `takes` lists and rhythm/takes.json, delete the unused MP3s,
      and consider defaulting song tags to Off (`audition` in
      `engine/audio.js`).
  - **Waiting on the user:** pick takes, then prune the rest. The music MP3s
    total about 52 MB; pruning brings that to about 25 MB. The title screen
    now plays the user's own *Charlie's Party* (fixed). Bubblegum Radar and
    the new title-1/2 themes rotate as the `party` music.
  - **Swing:** in sections with feel `swing`, the Hard chart also allows the
    swung 16th at 10/12 of a beat. The music agent drops raw takes
    in `takes/` while it works. Audition them on the Takes tab of the audio test page
  (`?scene=audio`).
- **Commit rule (user's request):** commit each batch of finished rhythm
  songs as soon as it's processed (rhythm mp3 + `rhythm/index.json` v2 entries
  + `takes/index.json` entries). Don't wait for the rest.
  - Raw, unprocessed takes sitting in `assets/audio/music/takes/` (not listed
    in `takes/index.json`) are work in progress. Don't commit them until
    they're processed and listed.
- **Pipeline scripts** are copied into `tools/audio/music/`; the SFX scripts
  are in `tools/audio/sfx/`. They were written for the session scratchpad, so
  check their paths before reusing them.
  - The API key is never in the repo. Scripts read it from a local file
    (`.elevenlabs_key` in the scratchpad), which is gone if the container was
    reset. Ask the user for a key again; the music permission must be enabled.
  - Cost is about 6.9 credits per second of audio.
- **After a batch lands:**
  1. Run `python3 -c "import json;print(json.load(open('party/assets/audio/music/rhythm/index.json'))['songs'])"`
     to check the entries are format v2.
  2. Play Pop Star Stage with that song at each level
     (`?game=pop-star-stage&players=2&auto=1`; pick the song on the how-to
     screen).
  3. Commit and push.
  4. Tell the user which takes to compare.

### Rhythm data format v2 (`assets/audio/music/rhythm/index.json`)
- Format: `{"version":2,"songs":[{id,name,style,file,bpm,start,lengthBeats,beatsPerBar,loop,sections:[{name,start,end,kind:'groove'|'breath',feel}],div:12,onsets:[[pos,low,high,mel,pitch],...]}]}`
- `pos` is in 1/12 beats from the first downbeat, which is at `start` seconds
  into the file.
- Reader: `src/games/rhythm/songs.js`. It also converts the old v1 grid format
  (Shadow Banish) on load.
- Chart design:
  - **Easy:** on-beat hits only.
  - **Normal:** adds off-beat percussion.
  - **Hard:** adds the melody's rhythm, including triplets and syncopation.
  - **Buttons:** A = low drum or main beat, B = high percussion, X/Y = the
    melody going down/up.
  - **Breathers:** short breathers (2 bars or less) have no notes. Longer
    ones get one A note on each downbeat.
  - **Phases** (`songPlan(song, level)`): Easy teaches A, then A+B, then
    everything. Normal starts with A+B. Hard starts with all four buttons.
  - **Teaching order:** B joins at groove 2, X and Y at groove 3. The last
    groove is the golden finale.

### Four new Play Studio games (merged 2026-10-05)
- Merged and live; the game list now has 24 games (12 party, 12 studio).
  - Melody Maker `melody-maker`
  - Sparkle Bead Shop `bead-bracelets`
  - Dream Room `dream-room`
  - Hide & Seek Picnic `seek-and-find`
- Each had a `New Play Studio game: <id>` section (delivered; now archived in
  `image-requests-history.md`).
- Sounds delivered with ElevenLabs (`tools/audio/sfx/round3.py`):
  - `bead-click`, `bead-zip`
  - Melody Maker's `inst/*` (bells, piano, marimba, choir, kick, clap, shaker)
- Unverified by ear: whether the bells and choir samples sound right. If
  not, remove their keys from the manifest and the synth plays again.
- The corner "i" can be placed per game: `meta.infoAt` is a corner or
  `[x, y]` (Dream Room and Hide & Seek use `[x, y]`).

### Ten new Party Games, page 2 (merged 2026-10-05)
- Party Games now has two pages. The 12th tile on page 1 is **More Games**; it
  flips to page 2: Piñata Party, Musical Cushions, Snowball Splat, Jump Rope
  Jamboree, Fishing Frenzy, Rainbow Tug-of-War (first team game), Cloud Hop,
  Pancake Tower, Treasure Dig, Candy Mini-Golf, then Crown Keeper.
  `PARTY_PAGES` in `games/index.js` defines the pages; Random and Marathon
  cover both (the roulette switches to the target's page).
- Each game's art requests: `New Party game: <id>` (now archived in
  `image-requests-history.md`).
  Every art key falls back to procedural drawing, so art drops in.
- Sounds: 130 ElevenLabs sfx (snow-*, fish-*, tug-*, jr-*, cush-*,
  pancake-*, td-*, cloudhop-*, pinata-*, golf-*). Specs and the build script:
  `tools/audio/sfx/round4.py` + `round4-specs.txt`. Not yet heard by a person.
- New poses `reel` and `pull` are registered (fall back to pump / knockback).
  Optional future poses listed per game: `swing`, `dig`, `putt`,
  `spring-jump`, `skip-hop`, `snow-scoop`.
- Musical Cushions plays its own tune (inst/* samples) because the music
  engine can't pause or slow a song; `music.pause/resume/setRate` would let
  it use real songs.
- `ui.scoreboard` now centres its timer gap for odd player counts and
  returns chip rects (several games had copied its layout).
- Art status: all 113 requested images for the ten games are delivered and
  checked in game, and all 15 playable characters have the new-game poses
  (reel, pull, swing, dig, putt, putt-swing, spring-jump, snow-scoop,
  skip-hop). The image agent also fitted the pond background to the game's
  ellipse (Fishing Frenzy) and the bunny shoulders to the rope (Jump Rope).
- Art QA (2026-10-06): six agents checked every delivered image and pose in
  game and fixed placement/padding/layering in the games' own files. Open
  items are rows in image-requests.md "Re-generation requests": needed —
  (2026-10-12: `bg/snowball-splat` and `prop/snow-wall-side` were
  regenerated and wired in with `ARENA_TOP_ART` 280; Amber's pose scale
  and the cake's hand point were fixed in sprite data);
  optional — bunny mood faces, open chest view, cookie bridge, fishing rod
  handle, Cloud Hop thumbnail, Hotdog pull paws.

## Open items (not started or waiting)
- **Music:** the user chooses takes per song on the Takes tab. Then move the
  chosen takes into the manifest and delete the others (the takes total about
  9 MB and up).
- **Not yet tested:**
  - Safari / iPad: the MP3 gapless header could make dance beats land
    25–50 ms late there.
  - Real Xbox controllers.
- **Asset checks:** the image-delivery checks stopped after two empty checks
  (check #13). If the user says new art arrived, run a check: merge, run
  `validate.py` (no stale optimized copies or masks), then review it in game.
- **Known issues:** see `PLAN.md` "Known issues". Its remaining items are a
  darker hem on some of Amber's dance frames and a few KPop sleeve highlights
  in the colour variants.

## Conventions that bite
- During a game `session.players` may be a subset (players sitting out);
  never index it by `p.index`.
- Actors wear `player.outfit` automatically; pass `outfit: null` to opt out.
- Elimination games implement `humansOut()` (true once every human is out).
  The play scene then shows "B Skip to the end"; B fast-forwards the game
  itself (fixed 1/60 steps, sound muted) until it calls finish, so results
  are real. Done in Bumper Bounce, Cookie Crumble, Jump Rope, Musical
  Cushions, Pass the Present and Spotlight Dance-Off; add it to any new
  elimination game.
- Image requests: `image-requests.md` holds only standing guidance and
  **open** requests. Whenever a request is fielded (delivered and checked in
  game, or resolved/dropped), move its section or table row to
  `image-requests-history.md` (newest at the top, dated, with the outcome).
  Keep useful context (style rules, specs, lessons) in the main file.
- Corner "i" button: shown during play. Its how-to card comes from the game's
  meta goal, controls and tips. Use `meta.infoAt: 'tl'|'tr'|'br'` when the
  bottom-left holds game UI. `meta.cornerControls: { at, items }` draws a
  compact legend in a corner during play.
- Photo scenes ("Say cheese!" in Bead Shop and Dream Room) share
  `engine/photo-poses.js`: left stick moves, A jumps, and every other button
  (B/X/Y, bumpers, triggers, stick clicks, and the d-pad on a gamepad)
  strikes a pose. Reuse it for any new photo moment. The photo is rendered
  offscreen, shown big, then flies to a pin.
- `ctrl.sx` / `ctrl.sy`: the left stick without the d-pad, for games that
  give the d-pad its own job (Art Studio).
- Fashion Show: per-character `FIT` table in `fashion-show.js`. Re-check
  with the fit audit render after adding a character.
- Long one-shot sfx (over 2 s) are stopped when a game is left, and quieted
  when it's paused.
- After changing any `party/src` code, run
  `node party/tools/stamp-modules.mjs` (content-hashed import map in
  `index.html`). If `index.html` conflicts in a merge, take ours and re-run it.
- Sprites: when a sprite set changes, run `tools/sprites/optimize.py <set>`.
  For felicity, kpop-girl-center and princess-amber, also run
  `make_masks.py <set>`. Then run `validate.py` and
  `tools/sprites/runtime.test.mjs`.
- Pass player objects (not `charId`) to `new Actor(p)` and
  `drawPortrait(g, p)` so colour variants work. Use `playerName(p)` and
  `winsText(p)` for names.
- Commit and push to `main` and `claude/festive-planck-7ik6bk` (CLAUDE.md).
  The image agent and other sessions also push to `main`, so fetch and merge
  before pushing.
- Headless testing: serve the repo with
  `npx http-server /home/user/charlie -p 8450 -s -c-1` (restart it after a
  container reset). The screenshot helper is `node party/tools/shot.mjs
  "?game=…" out.png --no-serve --port 8450`.
