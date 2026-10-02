# CLAUDE.md

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
- Audio in the race goes through the Web Audio engine in `audio.js`; don't set
  `HTMLAudioElement.volume` directly (iOS ignores it).

## Git policy

**Always commit and push to `origin/main` when done with a change.** Finish
each change with a commit on `main` and `git push origin main` so it deploys.
If you were working on a feature branch, merge/fast-forward it into `main`
and push `main` as well.

## Game notes

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
