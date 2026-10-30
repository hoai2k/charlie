# Sprite Workbench

A developer page for checking and fixing how things sit on the character
sprites: open `/charlie/party/workbench/` (locally: serve the repo root and
open `/party/workbench/`). It imports the game's own engine modules
(`src/engine/sprites.js`, `outfits.js`, `outfit-fit.js`), so the frame, its
landmarks and every outfit item are placed exactly as the game places them.

**Audio Workbench:** the title at the top left is a menu. Pick "Audio
Workbench" to go to the game's audio page (`/charlie/party/?scene=audio`),
which plays every song (and every generated take, on the Takes tab), sound
effect and voice clip. Pick **Rhythm Editor** (also the Audio Workbench's
Rhythm tab) for the rhythm-game charts: see [Rhythm Editor](#rhythm-editor)
below.

Nothing it does changes the game by itself: you **download an edits JSON**,
hand it over, and the edits are applied with
`tools/apply-workbench-edits.mjs`.

## Using it

- **Browse**: pick a sprite set (playable members first, then NPCs) and a
  pose; the strip at the bottom shows every frame (a dot marks frames with
  edits; `●` in the set/pose menus marks edited ones). Play/pause, `,` `.` to
  step. Poses that are aliases show their target (`hop = jump`); edits always
  go to the pose that defines the frames.
- **View**: the frame is drawn at the game's scale for its `bodyHeight`
  (zoom 1:1 = game size at actor scale 1), aligned on its original foot
  anchor like the game aligns frames. Wheel/pinch to zoom, drag the
  background (or Space+drag, or two fingers) to pan, **Fit**, **Facing**
  mirrors the character like `actor.facing = -1`, **Checker** cycles
  backdrops. Dashed lines: the ground (current anchor) and the target height.
  Past 10x a pixel grid shows.
- **Landmarks**: `feet` (anchor) `head` `eyes` `neck` `back` `hand` handles,
  plus the body map (`belly` `tail` `ear F/B` `foot F/B`; applying an edit of
  one writes a reviewed override for `tools/sprites/bodymap.py`).
  Drag one (whole frame pixels), or select it and nudge with the arrow keys
  (Shift = 10 px), or type x/y. A moved point shows its original position
  ghosted with a dashed line (`G` toggles). `Del` resets it.
- **Outfit**: choose an item and colour per slot (◆ = that colour has painted
  art) or **Random outfit**. Click an item (or its diamond, or its button in
  *Selected*) to select it: drag it to move it, drag the round handle to
  rotate (Shift snaps to 15°), the square handle to scale; or use `[` `]`
  (rotate 1°, Shift 10°), `;` `'` (scale 1%, Shift 10%), arrows (1 frame px)
  or type the values. The cross is the computed attach point (before any
  adjustment); the inspector shows its coordinates, the slot's rotation and
  size `S`, and where the item is actually drawn.
- **Scope** (item edits): *This frame* / *All frames of pose* / *Whole set*
  (keys `1` `2` `3`), and *Any item in the slot* or only this item. The most
  specific adjustment wins, so a frame can override a pose-wide value; the
  inspector says where the current value comes from and warns when a more
  specific one hides your change on this frame.
- **History**: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo (nudges in a
  row merge into one step). The **Edits** panel lists everything: click a row
  to jump to it, `×` deletes it (undoable).
- **Saving**: the session autosaves in this browser and is offered back
  after a reload. **Download edits** (Ctrl/Cmd+S) saves the JSON;
  **Load…** continues from one (replace or merge).
- `?` shows all shortcuts. `?quality=optimized` shows the downscaled frames
  most players see (default here: full quality).

## The edits file (version 1)

```json
{
  "format": "charlie-party-workbench-edits",
  "version": 1,
  "saved": "2026-10-12T22:54:07.647Z",
  "app": "party/workbench",
  "quality": "full",
  "units": { "landmarks": "...", "items": "..." },
  "landmarks": [
    {"set": "fox", "pose": "idle", "frame": 0, "src": "idle-00.webp", "point": "head", "from": [198, 51], "to": [208, 45]}
  ],
  "items": [
    {"set": "fox", "pose": "idle", "frame": "*", "slot": "back", "item": "fairy-wings", "dx": 0, "dy": 0.0568, "rot": 0, "scale": 1},
    {"set": "fox", "pose": "idle", "frame": 0, "src": "idle-00.webp", "slot": "head", "item": "crown", "dx": 0.0527, "dy": -0.0681, "rot": 43.5, "scale": 1.2}
  ]
}
```

**landmarks**: one entry per moved point.
- `set` sprite set (asset id), `pose` the pose that defines the frame,
  `frame` its index in that pose's `frames` in `sprites.json`, `src` its file
  (used to find the frame again if frames were reordered).
- `point`: `anchor` (feet) | `head` | `eyes` | `neck` | `back` | `hand`.
- `from` the value in `sprites.json` when the edit was made (frame, else pose,
  else set value), `to` the new value; both in **pixels of the original
  full-size frame image** (whole numbers), the same units as `sprites.json`.

**items**: one entry per adjustment (the value at that key; later edits of the
same key replace it).
- `set`; `pose` a pose name or `"*"` (every pose); `frame` an index or `"*"`
  (`"*"` whenever pose is `"*"`); `src` informational for single frames.
- `slot`: `head` | `face` | `neck` | `back` | `hand` | `aura`; `item` an item
  id from `OUTFIT_ITEMS` (`crown`, `fairy-wings`, ...) or `"*"` (any item in
  the slot).
- `dx`, `dy`: offset in units of the slot's size `S` (head: head width,
  face/neck: face width, back/hand/aura: body height; capes: body height),
  along the slot's own axes (they tilt with the head on hats, with the body on
  quadruped wings): `+x` toward the side the character faces, `+y` down.
  Relative units keep an adjustment valid when the art or size changes.
- `rot`: extra rotation in degrees, clockwise when facing right (mirrors with
  the character). `scale`: size multiplier (1 = unchanged).
- Matching: the most specific entry wins (frame > pose > whole set, then an
  exact item > `"*"`). An entry with all-zero values overrides a broader one
  back to "no adjustment".

## Applying it

```bash
node party/tools/apply-workbench-edits.mjs edits.json            # apply, validate, restamp
node party/tools/apply-workbench-edits.mjs edits.json --dry-run  # report only
```

- Landmarks are written into the frame entries of
  `assets/sprites/<set>/sprites.json` (via Python's `json.dumps(indent=2)`,
  like the sprite tools, so only the moved values change). An edit whose
  `from` no longer matches `sprites.json` is skipped with a warning
  (`--force` applies it anyway); one already applied is reported and left.
  Optimized copies (`assets/sprites-opt/`) carry no landmarks; the tool
  refreshes their source fingerprint when it was current (pixels are
  unchanged). Colour-variant masks (Felicity, KPop center, Amber) are derived
  from landmarks: rebuild them with `--rebuild-masks` or
  `python3 party/tools/sprites/make_masks.py <set>`.
- Item adjustments are merged into `src/data/outfit-fit.js` (`OUTFIT_FIT`,
  one entry per line, sorted); no-op entries that override nothing are
  dropped. Then `tools/stamp-modules.mjs` runs.
- Finally `tools/sprites/validate.py` checks the edited sets.
- `--root <dir>` applies to another copy of `party/` (try it on a scratch
  copy first); `--no-validate`, `--no-stamp` skip those steps.

## How the game uses item adjustments

`src/engine/outfit-fit.js` loads `data/outfit-fit.js` and answers
`outfitFit(asset, frame, slot, itemId)`; `outfits.js` applies it in
`outfitAttach` and `drawOutfit` on top of the landmark placement (and the
art-fit tables `WORN_ART` / `FIT`). The frame comes from the attachment info
(`info.frame`, the sprite frame record with its `pose` and `index`), so
adjustments follow alias and fallback poses too. Base art (no sprite set) and
`outfitAttachWorld` see only pose- and set-wide entries.

## Files

- `index.html` (with `<base href="../">`, so engine paths resolve from
  `party/`; `tools/stamp-modules.mjs` keeps its import map in step with the
  game's), `main.js` (boot; defaults to `?quality=full`), `app.js` (viewer and
  panels), `edits.js` (session, undo/redo, file format), `workbench.css`.
- For tests and the console, `window.workbench` exposes the state, session and
  a few actions.

## Rhythm Editor

`/charlie/party/workbench/rhythm.html` (locally `/party/workbench/rhythm.html`;
the title menu here, or the Audio Workbench's **Rhythm** tab). It plays,
records and edits the notes of the rhythm-game songs (Pop Star Stage and
Spotlight Dance-Off: the `rh-*` songs, *Disco Sparkle* (`dance`) and *Party
Dance*). Like the sprite workbench, it changes nothing by itself: **Download
JSON**, send the file over, and it is applied with
`tools/apply-rhythm-edits.mjs`.

**Why a page of its own** (not a tab inside the canvas audio scene): editing
a timeline wants a mouse (drag, box-select, wheel zoom, right-click), real
form controls (song and snap menus, number fields for the range) and file
download/upload, which DOM controls do well and the game's 1920x1080 canvas UI
does not. Everything still works from a controller (the Gamepad API is polled
every frame) and the keyboard, and the notes, lanes and buttons are the
game's: it imports `src/games/rhythm/chart.js`, the same code Pop Star Stage
builds its charts with.

- **Pick** a song and a difficulty (Easy / Normal / Hard = the game's
  Settings > Difficulty; each has its own chart).
- **Play**: the notes fall to the hit circle like in Pop Star Stage, with the
  game's hit windows (Perfect +-80 ms, Good +-160 ms), the buttons the game
  folds them to at that difficulty (Easy: X plays as A, Y as B; untick *Game
  buttons* to see the raw ones), Perfect / Good / Miss / Oops, combo, score and
  your average timing in ms. It plays the range (*From* / *To* beat, *Whole
  song*), optionally looping it. The game also eases each player in at the
  start of a stage and moves them between levels as they play; Play mode
  plays the level's whole chart.
- **Record**: play the range (with a count-in bar) and press A / B / X / Y
  in time. When the range ends, the hits are snapped (1/4 = beats, 1/8, 1/16,
  1/8 triplets, 1/12, or off) and either *replace* the range's notes or are
  *added* to them. With *Loop the range* on, each pass is added to the last
  (overdub). One recording is one undo step.
- **Edit**: a timeline with bars, the song's sections (breathers shaded), its
  waveform, its measured onsets (purple low / red high / green melody: what
  the game's charts are built from) and a lane per button. Click an empty lane
  to add a note; drag notes to move them (up / down changes the button);
  Shift+click and Shift+drag select; right-click or double-click deletes; the
  A B X Y buttons (or keys) change the selected notes' button; copy / paste at
  the playhead; copy the selection or the whole level to another difficulty;
  **Reset level** goes back to the chart built from the onsets. Space plays
  from the playhead and sounds every note (*Note sounds*); *Metronome* clicks
  the beats. Ctrl/Cmd+Z / Ctrl+Y undo and redo (per song).
- Notes before beat 4 are shaded: the game starts its notes at beat 4.
  Gold-ringed notes are in the finale (double points). A small `->A` next to a
  note means the game plays it as that button at this difficulty.
- Unsaved edits stay in this browser (and come back after a reload) until
  you download them; **Load...** brings a downloaded file back.
- *Input offset* (ms) shifts your presses if this computer judges you
  consistently early or late (the playhead already allows for the audio
  output latency).

| | Keyboard | Gamepad |
| --- | --- | --- |
| Play / stop (Record mode: record) | Enter (Edit: also Space) | Start |
| Next mode | Tab | Back |
| Easy / Normal / Hard | 1 2 3 | LB / RB |
| Hit (Play), record (Record), add / change / remove a note at the playhead (Edit) | J K L I (Space = A in Play / Record) | A B X Y |
| Range start / end at the playhead | [ ] | LT / RT |
| Move the playhead (one snap step; Shift: a bar) | Left / Right | D-pad left / right |
| Previous / next note (Edit) | | D-pad up / down |
| Selected notes: button / lane / time | A B X Y keys; Up / Down; , . | |
| Delete, copy, paste, select all, deselect | Del, Ctrl+C, Ctrl+V, Ctrl+A, Esc | |
| Undo, redo, download | Ctrl/Cmd+Z, Ctrl+Y (or Ctrl+Shift+Z), Ctrl/Cmd+S | |

### The rhythm edits file (version 1)

```json
{
  "format": "charlie-party-rhythm-edits",
  "version": 1,
  "exported": "2026-10-30T18:00:00.000Z",
  "songs": [
    {
      "id": "rh-party", "name": "Party Dance",
      "file": "music/rhythm/rh-party.mp3", "bpm": 121, "start": 0.2,
      "charts": { "easy": [[4, "a"], [6, "b"], [8, "a"]] },
      "auto": ["hard"]
    }
  ]
}
```

- Only songs and levels you changed are in it. `charts.<level>` is the whole
  chart for that level: `[beat, button]`, beats counted from the song's first
  downbeat (`start` seconds into `file`; a looping song's beats run on past
  its loop), buttons `a b x y`, sorted, one note per moment.
- `auto` lists levels put back to "built from the onsets" (*Reset level*).
- `file`, `bpm` and `start` say which audio the notes were timed against.

### Applying a downloaded file

```
node party/tools/apply-rhythm-edits.mjs ~/Downloads/rhythm-edits-202610301800.json --dry-run
node party/tools/apply-rhythm-edits.mjs ~/Downloads/rhythm-edits-202610301800.json
```

Each level becomes that song's hand-made chart in
`assets/audio/music/rhythm/index.json` (`"charts": {"easy": [[beat, btn], ...]}`);
`auto` levels lose theirs. The tool prints each level's notes per minute and
busiest spots, and skips a song whose `file`, `bpm` or `start` changed since
the edit (the notes were timed against other audio; `--force` applies it
anyway). Only the `charts` change in the file (it is written the way the music
tools write it). It is data only: no module stamps change. In the game,
`src/games/rhythm/chart.js` `buildChart()` plays a level's hand-made chart
exactly as written (the finale's gold notes still come from the song's
timeline), and the other levels keep being built from the onsets. Pop Star
Stage still folds buttons by difficulty (Easy: X/Y play as A/B) and eases
players in. `tools/audio/music/assemble_rh.py` keeps a song's hand-made charts
when it rebuilds the song from the same file.

### Files

- `rhythm.html` (page and its styles; `<base href="../">`, import map stamped by
  `tools/stamp-modules.mjs` like `index.html`), `rhythm.js` (audio, input,
  drawing, modes), `rhythm-data.js` (no DOM: charts, snapping, recording merge,
  undo, the edits file; `tools/apply-rhythm-edits.mjs` and
  `tools/rhythm-editor.test.mjs` use it too).
- `window.rhythmEditor` exposes the state and a few actions for tests.

