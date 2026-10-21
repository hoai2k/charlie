# Horse Show shared art

S1 and S2 from image-requests.md §6 are delivered as transparent WebP sheets.
Built-in ImageGen prompts are in skeleton-generation.json and the targeted
layout refinement in skeleton-refinement.txt. Sources remain in sources/.

Run `python3 americangirldollrace/tools/mounts/build_troll.py` to repack.
The skeleton horse uses the original horse foot baseline at 402px. Measured
source saddle anchors align to the original horse anchors where frame width
permits; wider jump poses are fitted without clipping and retain measured
seats in troll-art.js. The renderer applies the difference between each
horse seat and troll hip, including jumps and mirrored facing.

The six troll poses use a common scale and measured hip anchors. Grab/lift/throw
hands have explicit grip points; the grabbed doll torso is placed there with
her sprite scale applied. The troll is drawn over the held doll in normal
depth sorting. All hands remain empty in the art.

Verified: all nine horse frames and six rider frames, transparent margins,
hoof baseline, gallop/jump overlay, both facings, three grabbed-doll poses,
normal Horse Show browser rendering, and the mount/roster/track test suite.
