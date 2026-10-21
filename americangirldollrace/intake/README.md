# americangirldollrace/intake: drop folder for new files

Put files here that should go into the race: songs, sound effects, art and
so on. Upload them as they are; you don't need to rename or convert anything.
If a file's purpose isn't obvious from its name, say so in the request.

## For the agent integrating them

- Treat everything here except this README as waiting to be integrated.
- Songs go in `assets/music/` under their title (`<Title>.mp3`), matched in
  loudness to the existing songs (about -14 LUFS integrated), and are set as a
  track's `music` in `tracks.js` (or added to `TRACK_GENERAL_MUSIC` if they
  suit any board). Images go through the WebP conversion in the root
  `CLAUDE.md`.
- **Remove each file from this folder in the same commit that integrates
  it,** so whatever is left here is still to do. Leave this README.
- If a file can't be integrated, leave it here and tell the owner why.
