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
export const OUTFIT_FIT = [
  {"set": "bronze", "pose": "*", "frame": "*", "slot": "face", "item": "monocle", "dx": -0.24, "dy": 0, "rot": 0, "scale": 1.35},
  {"set": "bronze", "pose": "*", "frame": "*", "slot": "head", "item": "heart-headband", "dx": 0, "dy": -0.22, "rot": 0, "scale": 1},
  {"set": "fox", "pose": "*", "frame": "*", "slot": "head", "item": "heart-headband", "dx": -0.13, "dy": -0.16, "rot": 0, "scale": 0.8},
  {"set": "hotdog", "pose": "*", "frame": "*", "slot": "head", "item": "heart-headband", "dx": 0, "dy": -0.19, "rot": 0, "scale": 1},
  {"set": "hotdog", "pose": "*", "frame": "*", "slot": "head", "item": "kitty-ears", "dx": 0, "dy": -0.24, "rot": 0, "scale": 1},
  {"set": "hotdog", "pose": "*", "frame": "*", "slot": "head", "item": "unicorn-horn", "dx": 0, "dy": -0.28, "rot": 0, "scale": 1},
  {"set": "hotdog", "pose": "*", "frame": "*", "slot": "neck", "item": "feather-boa", "dx": 0, "dy": -0.03, "rot": 0, "scale": 0.52},
  {"set": "marshmallow-birthday-cake", "pose": "*", "frame": "*", "slot": "face", "item": "monocle", "dx": 0.11, "dy": 0, "rot": 0, "scale": 1},
  {"set": "marshmallow-birthday-cake", "pose": "*", "frame": "*", "slot": "neck", "item": "feather-boa", "dx": 0, "dy": -0.03, "rot": 0, "scale": 0.48},
  {"set": "snowstar", "pose": "*", "frame": "*", "slot": "back", "item": "teddy-backpack", "dx": -0.1, "dy": -0.14, "rot": 0, "scale": 1},
  {"set": "unicorn", "pose": "*", "frame": "*", "slot": "head", "item": "heart-headband", "dx": -0.15, "dy": -0.14, "rot": 0, "scale": 0.75}
];
