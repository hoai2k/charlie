# CLAUDE.md

## Deploy state: **ENABLED**

Deploy branch: `deploy`

This repository deploys from the `deploy` branch, not from `main`. Pushing to
`main` runs no workflow and costs nothing; the site is published only when
`deploy` is moved forward to `main`. This switch overrides every other
instruction in this file about deploying.

- **ENABLED** means deploy after every change, exactly as before the deploy
  branch existed: commit, push `main` as the rest of this file says, then
  publish it with `git push origin main:deploy`. That push deploys. A deploy
  that is already running always finishes, and pushes waiting behind it
  collapse into the newest one.
- **DISABLED** means deploys are off to save GitHub Actions minutes. Commit and
  push `main` as usual, so finished work still lands on `main`, but never push,
  merge or fast-forward `deploy`. End every change with this warning to the
  owner:
  > ⚠️ Deploys are disabled for this repo: the change is on `main` but NOT
  > deployed. The live site is still whatever `deploy` holds.
- **Turning deploys on** happens only when the owner explicitly asks to deploy,
  to enable deploys, or for a push to `main` that should go live. Change the
  heading above to `**ENABLED**`, commit and push `main`, then
  `git push origin main:deploy`. If the owner disabled the deploy workflow in
  the Actions tab, remind them to re-enable it.
- **Turning deploys off**, when the owner asks: change the heading to
  `**DISABLED**`, commit and push `main`. It costs nothing.
- `git push origin main:deploy` is always a fast-forward. Never force-push
  `deploy`. If the push is refused, `deploy` has commits `main` lacks: merge
  `origin/deploy` into `main` first, then push both.
- `.claude/hooks/deploy-guard.sh` enforces this for Claude sessions: while the
  heading says DISABLED it refuses any push to `deploy`. It reads the heading
  at the moment of the push, so flipping it to ENABLED is all it takes to let
  the push through.

## What this repo is

A library of browser games made for Charlie. The repo root is **not** a game —
it's the library landing page (`index.html`) plus shared docs/config. Each game
lives in its own top-level subdirectory and is fully self-contained:

```
charlie/
├── index.html              # library landing page linking to each game
├── americangirldollrace/   # one game = one directory with its own index.html
└── <newgame>/
```

The repo deploys to GitHub Pages (`.github/workflows/pages.yml`) on every push
to `main`, so `<game>/index.html` is served at `/charlie/<game>/`.

## Adding a game

1. Create `<gamename>/` (lowercase, no spaces) with an `index.html` entry point.
2. Use **relative** paths only for assets (`assets/foo.png`, never
   `/assets/foo.png`) — the site is served under the `/charlie/` subpath.
3. Add a card for the game to the root `index.html` and a row to the game
   list in `README.md`.

## Conventions

- Images are WebP (lossless alpha). Convert new art with Pillow
  (`quality=82-90, method=6`) rather than committing large PNGs.
- `americangirldollrace/index.html` loads its CSS and JS with content-hash
  `?v=` stamps (Pages caches for ~10 minutes): run
  `node americangirldollrace/tools/stamp/stamp.mjs` after changing any of them
  (a test fails while a stamp is stale). On a merge conflict in those lines,
  take either side and run it again.
- `party/index.html` carries a content-hashed import map for every module in
  `party/src/`; run `node party/tools/stamp-modules.mjs` after changing any
  party code (it also stamps `main.js?v=`).
- Party games load on demand: the menu reads each game's `src/games/<id>.meta.js`
  (plain data: title, category, how-to text), and the game's code and art preload
  on its intro (how-to) screen. Shared helpers for games: `api.limit` (every time
  limit is drawn by the play scene, so none is hidden; in Play Studio a limit
  never ends the game by itself: `timeUp` / `api.studioClock` ask "Time's up!"
  with Keep playing as the default),
  `api.finishTogether`, `showstopper()` in `engine/util.js`, `engine/easy.js`
  (Sister Party Easy: the stick is optional, A does everything, `easyPrompt` is
  the one big-A cue) and `engine/crowd.js` (8-player spacing).
- Buttons (the owner's rule): A is jump in action games and confirm / act in the
  others; X is the action when A alone isn't enough (Pet Spa: hold X to scrub,
  A = this step's done, or a line saying what's left and to press X).
- Play Studio controls (see `party/src/engine/studio-ui.js`; Fashion Show is the
  model): A confirms and moves on; LB/RB move between categories and the last
  category is "Done" (A there = ready); the left stick (and X) choose items or
  move the cursor; the right stick places things inside the picture; B goes
  back. Don't add a "clear everything" action a game doesn't need (B undoes
  one thing); where a game does have one, it's an on-screen button and/or Y,
  and it always asks first with "Go back" as the default.
- No-winner games (showcase / `finishTogether`) skip the awards page: the play
  scene's 'gallery' state keeps the game's last screen up with everyone's stars
  and A/Y to go on, so end such a game on the art itself (Fashion Show posts its
  runway photos on a wall). Pass `gallery: false` only to keep the podium.
- Audio in the race goes through the Web Audio engine in `audio.js`; don't set
  `HTMLAudioElement.volume` directly (iOS ignores it).

## Git policy

**Always commit and push to `origin/main` when done with a change.** Finish
each change with a commit on `main`, `git push origin main`, and then
`git push origin main:deploy` so it deploys (while deploys are ENABLED; see
"Deploy state" above).
If you were working on a feature branch, merge/fast-forward it into `main`
and push `main` as well.

This is the user's explicitly requested default workflow, including publishing
to the remote and triggering the Pages deployment. A request to "commit to repo
main" means commit and push unless the user explicitly asks for local-only work.
See `AGENTS.md` for the shared agent instructions and push recovery guidance.

## Tests and deploys

Deploys (pushes to `deploy`) build and publish only; they run no tests. Tests
are your job before you commit:

- Run the tests your change affects: a change to `party/` runs
  `node --test party/tools/*.test.mjs party/tools/sprites/*.test.mjs` (the first
  also fails if the import-map stamp is stale), and a change to party game code
  also runs `node party/tools/smoke.mjs <game ids>` (every changed game played
  all-CPU to the end; no ids = every shelf game). A change to
  `americangirldollrace/` runs its unit tests,
  `node --test americangirldollrace/tools/*/*.test.mjs americangirldollrace/tools/dolls/*.test.mjs americangirldollrace/tools/dolls/*/*.test.mjs`,
  and its browser smoke tests (headless Chromium, ~15 s),
  `node --test americangirldollrace/tools/browser/smoke.browser.mjs`;
  add a check there for new gameplay. The other games have no automated
  tests; check the change in a browser (local server) before committing.
  For a change to shared code, run all of them.
- Say in the commit message what you ran and that it passed.

Every deploy is paid for in GitHub Actions minutes while the repository is
private, so batch a task's work into one deploy at the end rather than
deploying after every small step. Pushes to `main` and to working branches run
nothing. A deploy
that is already running always finishes — never cancel one unless the owner asks
— and pushes waiting behind it collapse into the newest one. Pushes that only
change Markdown or `.claude/` don't deploy at all (`paths-ignore` in the deploy
workflow), and every workflow job carries a `timeout-minutes`, so a hung run
cannot bill for hours. Keep all three when editing a workflow.

## Models

Only a session already running on Fable may start Fable subagents, workers or
helper agents. On Opus, Sonnet or any other model, never pass model `fable` to
Agent/Task/Workflow calls: leave the model unset so it inherits, or pick
`opus` or `sonnet`. Don't switch to Fable on your own; if a task seems to need
it, ask the owner first and say why.
This is enforced in `.claude/settings.json` (sessions default to Opus) and a
PreToolUse hook, `.claude/hooks/block-fable.sh`, that refuses a subagent or
workflow call asking for Fable unless the caller is itself Fable. When the
owner asks for Fable, switch the main session with `/model`; don't edit the
hook to get round it.

## Game notes

- Race track themes live in `americangirldollrace/tracks.js`: per-track art in
  `assets/tracks/<key>/` (hurdle, power-up skins, projectile, card), mount odds,
  power-up names, and new tracks that join the rotation once their background
  is listed. `TRACK_ORDER` there is the race order; `TRACKS_RESTING` takes a
  board out of the rotation (Castles, for now) while the workbench still lists
  it at the end. Each track's `dirtTop` keeps racers' feet on the painted path.
  Horse Show riding rules (everyone mounted, mount swaps, troll on a horse,
  longer course) are `tracks.js` flags; see its header comment.
  Briefs are in `americangirldollrace/image-requests.md` §5.
- The race's game code is plain scripts sharing one global scope, loaded in
  `americangirldollrace/index.html` order: the area files hold functions
  (`game-audio`, `-monsters`, `-amanda`, `-mounts`, `-powerups`, `-items`,
  `-camera`, `-players`, `-draw`, `-terrain`.js; terrain is Cloud Kingdom's
  bumpy cloud floor with gaps to jump) and load before `game.js`, which keeps
  the constants, state, race flow, menus and the main loop. Put new code in
  the file for its area; keep top-level statements that run at load in
  `game.js`. Tests read all of it via `tools/game-source.mjs`.
  Track monsters (troll, scarecrow, skeleton, robot, tin toy, sand monster,
  candy troll, cloud troll) each have one entry in
  `americangirldollrace/monsters.js`: sheet, size, grab-hand points, sound
  prefix and defeat effect. Their sheets are packed by
  `americangirldollrace/tools/effects/build.py`; after a rebuild, re-measure
  any grab-hand points whose pose moved and run `tools/effects/check.py`.
- `americangirldollrace/workbench/` is a testing sandbox (served at
  `/charlie/americangirldollrace/workbench/`): the race runs in a frame, and
  `workbench/bench.js`, added to that page, gives one player (any doll or any
  troll; a troll's push grabs and throws), still targets, and power-ups and
  mounts clicked or dragged in from the side panels (`workbench.js`);
  anything in the scene can be dragged about, or out to remove it. On a phone
  (narrow screen; desktop unchanged) it's the viewer full screen with Play
  as / Add / Settings buttons opening the panels as sheets, and the boot
  editor works by touch (gestures described at the top of `verify.js`). It wraps game
  functions from outside rather than changing them; keep it working when
  renaming the functions it wraps (the smoke suite loads it).
  Its **Verification Queue** (`workbench/verify.js`, button under the
  viewer) walks the owner through poses to check (first set: moon boots) and
  exports a JSON file; integrate its boots into
  `americangirldollrace/moon-boot-overrides.js` (keyed
  `<asset>/<sprites|actions>/<frame>`), which `moonBootPlacements` in
  game-draw.js prefers over the measured feet. A pose in the overrides
  leaves the queue; take in "Looks right" poses too (their boots as
  exported) so they leave it as well. Then run
  `python3 americangirldollrace/tools/dolls/fit_moon_boots.py`: it re-guesses
  every pose not yet placed and fits each boot to cover the whole shoe, into
  `moon-boot-guesses.js` (`--check` scores the guesses against the owner's
  boots, each doll left out). Its guesses carry the owner's boots over from
  the same pose on the other dolls by matching her legs
  (`tools/dolls/transfer_moon_boots.py`), so a **new doll needs no hand
  fitting**: after `measure_feet.py`, run `fit_moon_boots.py` and her boots
  are placed.
- Specials (`americangirldollrace/game-specials.js`): a human who wins a board
  picks a power-up of her own after the celebration (10 s, her controls, her
  current one selected), used with Y (R / `/` / pad Y / touch Special) and
  recharging (15 s, 10 s once she picks the same again); kept per player
  (`state.playerSpecials`, like the standings) for the session. From the
  fourth win a board's "snowballs" are offered too (`snow:<board>`: 5 in
  stock, one back every 3 s), from the fifth its mount (`mount:<board>`,
  `trackSpecialMount`); thrown projectiles carry their board
  (`projectile.track`) for art and behaviour. Settings also hold Monster
  difficulty (`state.monsterSkill`: easy/medium/hard, who can pull riders
  off and whether monsters sometimes miss) and Play (`state.coop`).
- `americangirldollrace/intake/` is the owner's drop folder for the race (see
  its README). Songs not tied to one board are listed in `TRACK_GENERAL_MUSIC`
  in `tracks.js`; "Forest Fairy Spin" is Fairy Woods' song (it replaced
  "Fairies in the Woods", which the owner wasn't fond of).
- Moon boots are drawn over each foot in every pose from `feet.js`
  (generated by `americangirldollrace/tools/dolls/measure_feet.py`; re-run it
  after adding a doll or redrawing poses, with `measure_poses.py`, whose
  leg silhouettes in `pose-shapes.js` let boots placed by hand on one doll
  carry over to look-alike poses on others). The actions sheet's moon-boots
  jump keeps its own painted boots.
  Whenever a foot angle isn't covered well by the boot views on hand, file
  another view in `image-requests.md` straight away: each is just one more
  cell of `moon_boot_sprites.webp`, shared by every doll (the owner's rule).
- Every art delivery (boots, wings, monsters, anything) is judged in the
  game, not just wired in: screenshot it in the poses and sizes it's used
  at, fix sizing and anchoring in code, and if the art itself doesn't look
  or feel right, file a re-generation request at once with what to change
  (the owner's rule: don't be shy about asking again).
- Fairy wings (Fairy Woods mount `wings`) fly like the broom but are worn:
  `drawFairyWings` in game-mounts.js draws them behind any body pose from
  `drawRacerBody`, rooted on her back (measured from the sheet's pixels).
  They replace the plain horse there (`baseMount`); fliers in wings push in
  the air; `wingedMonsters` trolls wear them too and fly up after fliers.
- New `americangirldollrace/` dolls use `americangirldollrace/tools/dolls/README.md`: canonical reference, pose art, manifest, deterministic export/validation and generated roster registration. The older imagegen/recolour tools remain for existing assets.
  A doll's height is measured to the top of her head (Cornsilk's long ears
  don't count): when that won't fit the 418 px cells, `dolls.js` `bodyScale`
  draws her larger or smaller (`withDollScale` in game-draw.js, about her feet, seat or
  ledge hold; her stall and podium portraits too). Toy frames are sized by
  height against the other dolls (`TOY_HEIGHT_TO_STANDING` in
  `tools/dolls/hidden/build.py`), not face area.

- `party/` (Charlie Party): read `party/HANDOFF.md` first for in-progress work
  and resume notes, then `party/PLAN.md`.
- `party/intake/` is the owner's drop folder for new files (songs, sounds,
  art). Integrate each into its proper place and remove it from the folder in
  the same commit; see `party/intake/README.md`.
- `party/image-requests.md` keeps only standing guidance and open requests.
  Fielded requests (delivered and checked in game, or resolved/dropped)
  always move to `party/image-requests-history.md`, newest first.

- Swingers is the one exception to "every game is a subdirectory": it lives
  in its own repo, `hoai2k/swingers`, deployed at `games.hoai.net/swingers/`.
  The library card just links there (`../swingers/`); don't copy it in here.
- `dollpuppets/` was flattened from `messenger/dolls/` on hoai.net: the shared
  `messenger/src/{core,workers}` modules now live in `dollpuppets/src/`. Keep
  the game self-contained — never import from outside its own directory.
  It needs camera permission (HTTPS, which Pages provides) and loads MediaPipe
  from cdn.jsdelivr.net and models from storage.googleapis.com.
- The per-character `dollpuppets/assets/<name>/config.js` files are generated
  by a build script that was not imported; edit them directly with care.
  (Their sprite paths were switched from `.png` to `.webp` by hand.)
- Claudia now uses `dollpuppets/assets/claudia-v2/config.js`, built by
  `dollpuppets/tools/registered-rig/build.py claudia`. This rig keeps one head
  fixed and registers facial patches plus body neck anchors automatically.
  Edit its master spec/source art and rebuild; see that tool's README and
  camera-free preview. The legacy `assets/claudia/` art is retained.
- `dollpuppets/src/core/face-stabilizer.js` sits between the tracker and the
  renderer: it holds the pose through brief tracking dropouts and smooths
  movement. Feed new tracker results through it, not straight to render.
- `dollpuppets/` opens on a title screen that is also the doll picker:
  tapping a doll starts the game and requests the camera (never on page
  load). The in-game "Dolls" button returns to it. Card colours/portraits are
  in `CHARACTER_STYLES` in `site.js`. Optional art listed in
  `dollpuppets/image-requests.md` is picked up automatically when the file
  exists. Bump the `?v=` on `site.css`/`site.js` in its `index.html` on change.
- `dollpuppets/src/core/screen-chrome.js` (ported from hoai2k/mini widowsbay)
  gets the browser bars out of the way: fullscreen on touch devices when a doll
  is picked or on the first tap in landscape; the iPhone Safari swipe-up
  scroll trick with a hint; and it sizes `.dolls-app` to the visual
  viewport. `manifest.webmanifest` makes Add to Home Screen open full screen.
