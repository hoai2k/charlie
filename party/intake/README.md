# party/intake — drop folder for new files

Put files here that should go into Charlie Party: a new or replacement song,
sound effects, voice clips, images, or anything else for the game. Upload them
as they are; you don't need to rename or convert anything. If a file's purpose
isn't obvious from its name, mention it in the request, or add a line below.

## For the agent integrating them

- Treat everything here except this README as waiting to be integrated.
- For each file: work out where it belongs, then **move** it there with
  `git mv` (renaming it to the repo's conventions, e.g. lowercase-hyphenated
  `assets/audio/music/molly-time.mp3`; images go through the WebP conversion
  in the root `CLAUDE.md`), wire it up in code or the audio manifest if
  needed, and check it in the game.
- **Clear each file out of this folder as you integrate it,** in the same
  commit, so whatever is left here is still to do. Leave this README.
- If a file can't be integrated (unclear purpose, wrong format), leave it here
  and tell the owner why.
- Note what you integrated in `party/HANDOFF.md`.

## Notes from the owner (optional)

<!-- e.g. "Molly Time.mp3 — replaces the Sister Party song" -->
