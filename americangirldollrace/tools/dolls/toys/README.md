# Dedicated riding-toy art

Built-in ImageGen sources and exact prompts are retained here. `build.py` packs
reviewed movement and action companion sheets into the runtime 3×4 atlas and
outfit mask. It matches the companion sheets by feet-together standing height.
Each group uses a common anatomical scale. Long hair and broad fall poses can
need a smaller packed frame; `RIDE_TOY_FRAMES` restores that scale at draw time,
using the frame anchor and baseline 409. Nothing is clipped to force a fit.

Rebuild: `python3 tools/dolls/toys/build.py <key>` from the game directory.
Check: `python3 tools/dolls/toys/check.py` and
`node --test tools/dolls/toys/poses.test.mjs`.

The Lily/Mira/Hermione trial was reviewed on Village through actual pickup and
racer rendering, in both directions, skating, bouncing, pushing and falling,
with original and alternate clothes. `reports/alignment.webp` overlays the
idle frame; the other review images show the actual game renderer. Recolour
masks protect natural hair/skin and skate/pogo hardware.

For a new doll, keep the existing identity reference, source, action source,
prompt, mask and frame report. Add only reviewed asset keys to
`RIDE_TOY_SHEETS`; register frame anchors and renderScale values in
`RIDE_TOY_FRAMES` in the same batch. The registry uses current versioned asset
keys so legacy Rumi/Claudia can fall back safely.
