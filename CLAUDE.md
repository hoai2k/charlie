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

## Git policy

**Always commit and push to `origin/main` when done with a change.** Finish
each change with a commit on `main` and `git push origin main` so it deploys.
If you were working on a feature branch, merge/fast-forward it into `main`
and push `main` as well.
