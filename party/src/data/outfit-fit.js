// Per-sprite outfit fit adjustments (see engine/outfit-fit.js and
// workbench/README.md). Written by tools/apply-workbench-edits.mjs from a
// workbench edits file; hand edits are fine but keep the array valid JSON
// (double quotes, no trailing commas) so the tool can rewrite it.
//
// Entry: { set, pose, frame, slot, item, dx, dy, rot, scale, src? }
//   set    sprite set (asset id)             pose  pose name or "*"
//   frame  frame index in the pose or "*"    slot  head|face|neck|back|hand|aura
//   item   outfit item id or "*"             src   frame file (informational)
//   dx, dy offset in units of the slot's size S, along the slot's own (tilted)
//          axes: +x toward the facing side, +y down
//   rot    extra rotation in degrees (clockwise when facing right)
//   scale  size multiplier (1 = unchanged)
// The most specific matching entry wins (frame > pose > set, then exact item > "*").
export const OUTFIT_FIT = [];
