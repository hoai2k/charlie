# charlie

A collection of games for Charlie.

The repo root is just the library — a landing page that links to each game.
Every game lives in its own subdirectory and is deployed with GitHub Pages, so
`/charlie/<game>/` opens that game.

## Games

| Game | Directory | Play |
| --- | --- | --- |
| American Girl Doll Race | [`americangirldollrace/`](americangirldollrace/) | `/charlie/americangirldollrace/` |
| Doll Puppets (camera puppet — your face drives a doll) | [`dollpuppets/`](dollpuppets/) | `/charlie/dollpuppets/` |

## Adding a game

1. Create a new top-level directory (lowercase, no spaces) containing an
   `index.html` entry point and its assets.
2. Reference assets with relative paths so the game works under the
   `/charlie/` subpath.
3. Add the game to the table above and to the root `index.html`.
4. Commit and push to `main` — the Pages workflow deploys automatically.

## Deployment

`.github/workflows/pages.yml` publishes the repository to GitHub Pages on
every push to `main`. One-time setup: in the repo's **Settings → Pages**, set
**Source** to **GitHub Actions**.

## Improvement backlog

See [`docs/recommendations.md`](docs/recommendations.md) for the audit of both
games and a prioritized list of suggested fixes.
