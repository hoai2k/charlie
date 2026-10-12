# Sprite Workbench

A developer page for checking and fixing how things sit on the character
sprites: open `/charlie/party/workbench/` (locally: serve the repo root and
open `/party/workbench/`). It imports the game's own engine modules
(`src/engine/sprites.js`, `outfits.js`, `outfit-fit.js`), so the frame, its
landmarks and every outfit item are placed exactly as the game places them.

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
- **Landmarks**: `feet` (anchor) `head` `eyes` `neck` `back` `hand` handles.
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
