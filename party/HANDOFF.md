# Charlie Party: session handoff (state for resuming work)

Keep this file current while long jobs run. A new session (or a session whose
context was compacted) should read this, `PLAN.md` (status + known issues),
`image-requests.md` and `audio-requests.md` before continuing.

_Last updated: 2026-10-03, during music generation round 2._

## In progress right now

### Music generation (ElevenLabs Eleven Music, `music_v2_5`)
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
  menu-1), chill (1). Audition them on the Takes tab of the audio test page
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
  - **Breathers:** no notes.
  - **Teaching order:** B joins at groove 2, X and Y at groove 3. The last
    groove is the golden finale.

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
