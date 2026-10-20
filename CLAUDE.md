# CLAUDE.md

## Deploy state: **ENABLED**

This switch overrides every other instruction in this file about pushing,
merging or fast-forwarding `main`, opening or merging pull requests into it,
and deploying.

- **DISABLED** means `main` is frozen to save GitHub Actions minutes:
  - Commit your work and push **only your working branch** (name it
    `claude/<topic>`; pushes to a working branch run no workflows). Never push,
    merge or fast-forward `main`, and don't merge pull requests into it.
  - Run tests and builds locally as usual (they cost no Actions minutes).
  - End every change with this warning to the owner:
    > ⚠️ Deploys are disabled for this repo: the change is on branch
    > `<branch>`, NOT on `main`, and NOT deployed.
- **ENABLED** means follow the normal push and deploy rules in this file.
- **Turning deploys on** happens only when the owner explicitly asks for a push
  to `main` (or to enable deploys). Then:
  1. Change the heading above to `**ENABLED**` (this is what lets the push
     guard below allow the push).
  2. Merge the pending work: `git fetch origin && git branch -r --no-merged
     origin/main` lists it. Merge oldest first, resolve conflicts, and run the
     tests.
  3. Push `main` once; that push deploys. If the owner disabled the deploy
     workflow in the Actions tab, remind them to re-enable it.
- **Turning deploys off**, when the owner asks: change the heading to
  `**DISABLED**`, commit only that change with `[skip ci]` in the message (so
  the push runs no workflow), and push `main`.
- `.claude/hooks/deploy-guard.sh` enforces this for Claude sessions: while the
  heading says DISABLED it refuses a `git push` to `main` and pull-request
  merges into it, except a `[skip ci]` push that changes only this file and
  `.claude/` (config, no workflow runs). It
  reads the heading at the moment of the push, so flipping it to ENABLED is all
  it takes to let the push through.

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
- `americangirldollrace/index.html` loads its CSS and JS with a `?v=` string;
  bump it whenever those files change, since Pages caches for ~10 minutes.
- `party/index.html` carries a content-hashed import map for every module in
  `party/src/`; run `node party/tools/stamp-modules.mjs` after changing any
  party code (it also stamps `main.js?v=`).
- Audio in the race goes through the Web Audio engine in `audio.js`; don't set
  `HTMLAudioElement.volume` directly (iOS ignores it).

## Git policy

**Always commit and push to `origin/main` when done with a change.** Finish
each change with a commit on `main` and `git push origin main` so it deploys.
If you were working on a feature branch, merge/fast-forward it into `main`
and push `main` as well.

This is the user's explicitly requested default workflow, including publishing
to the remote and triggering the Pages deployment. A request to "commit to repo
main" means commit and push unless the user explicitly asks for local-only work.
See `AGENTS.md` for the shared agent instructions and push recovery guidance.

## Tests and deploys

Pushes to `main` build and deploy only; they run no tests. Tests are your job
before you commit:

- Run the tests your change affects: a change to `party/` runs
  `node --test party/tools/sprites/*.test.mjs`. The other games have no
  automated tests; check the change in a browser (local server) before
  committing. For a change to shared code, run all of them.
- Say in the commit message what you ran and that it passed.

Every deploy is paid for in GitHub Actions minutes while the repository is
private, so batch a task's work into one push to `main` at the end rather than
pushing after every small step. Pushes to a working branch run nothing. A newer
push cancels a deploy still in progress, so a burst of pushes publishes only the
last one.

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

- New `americangirldollrace/` dolls use `americangirldollrace/tools/dolls/README.md`: canonical reference, pose art, manifest, deterministic export/validation and generated roster registration. The older imagegen/recolour tools remain for existing assets.

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
