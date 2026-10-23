# Landscape-only track picker cards

C1 and C2 replace all fifteen cards, preserving landmarks and mood while
removing the central foreground hurdles. Exact built-in ImageGen prompts and
old references are retained with the new sources. `build.py` deterministically
exports the five-cell 2000×225 atlas and ten opaque 400×225 cards; `--check`
verifies dimensions, RGB mode and reviewed decoded pixel hashes.

All fifteen were inspected at half size and through the game’s `getTrackCard`
URL/atlas selection. The near ground is open and empty. Runtime card URLs use
`GAME_CONFIG.trackCardArtVersion` to refresh the selection screen and next-race
preview. Existing race backgrounds are untouched.
