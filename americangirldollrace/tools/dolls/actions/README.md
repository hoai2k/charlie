# Dedicated special actions

Built-in ImageGen sources and exact prompts are retained in `sources/` and
`generation.json`. Only reviewed sheets are listed in `ACTION_SHEETS`.
The Hermione/Lily/Mira trial includes nine poses, prop-safe outfit masks,
measured gold-star wand tips and explicit packed-frame calibration.

Run `python3 tools/dolls/actions/build.py <key>` from the game directory,
then `python3 tools/dolls/actions/check.py` and
`node --test tools/dolls/actions/calibration.test.mjs`.
The builder matches source head dimensions to the normal sheet, keeps the
source's anatomical proportions, and records any packing reduction so the
renderer restores physical scale. The saddle action registers against the
normal rider's face/seat position. Boards, wand hardware and moon boots stay
outside the clothing mask. Shared effects are built/checked under `tools/effects/`.

Trial reviews cover casting, surfing on the wave, sticky stumble, moon boots,
saddle throw, alternate outfits and both directions. Further roster source
sheets are generated and retained here, but are not registered until packed
and checked in the game.
