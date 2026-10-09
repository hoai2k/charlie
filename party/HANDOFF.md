# Charlie Party: session handoff (state for resuming work)

Keep this file current while long jobs run. A new session (or a session whose
context was compacted) should read this, `PLAN.md` (status + known issues),
`image-requests.md` and `audio-requests.md` before continuing.

_Last updated: 2026-10-03, after music generation round 2 finished._

## In progress right now

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
  `bg/snowball-splat` (fence/trees in the play area; the code starts the
  arena at y 345 until it lands, then set `ARENA_TOP_ART` back to 280),
  `prop/snow-wall-side` (no taper), Princess Amber's dig/spring-jump/
  snow-scoop/skip-hop at idle scale, the cake's idle/walk hand point;
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
