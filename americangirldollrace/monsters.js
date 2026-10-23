// Track monsters: the troll, and the sheets that replace it on some tracks
// (tracks.js `monster: "<key>"`). Everything about a monster lives in its
// entry here; a track's monster is used once its entry exists (until then the
// troll appears).
//
//   sheet      the sprite sheet, in the troll's layout (3×4 cells of 418, see
//              image-requests.md §9): default assets/<key>_sprites.webp
//   sounds     prefix of its sounds (<sounds>_grab, _walk_step...), falling
//              back to the troll's for any it lacks: default the key
//   scale      size on top of the troll's, so it reads as large as the troll
//              (e.g. a squat robot, or a sheet whose height includes a hat)
//   grabHands  its front hand in the grab, lift and throw cells (row 3),
//              frame pixels facing right: the grabbed doll is held there
//   rowScale   per sprite row ([idle, walk, grab, fall]), or per cell as a
//              list of three, a size correction for poses painted smaller or
//              larger than the others
//   snores     plays the troll's sleep loop when defeated
//   defeated   how it's defeated: "sparks" drawn over its defeated pose, or
//              "dissipate" (it fades away and leaves nothing)
//   particles  a sheet of 8 particle sprites (128px cells) it bursts into
//   lightning  now and then throws a lightning bolt (cloudtroll_lightning
//              attack frames and cloudtroll_bolt)
// Bump when any monster sheet changes, so browsers don't pair a cached sheet
// with new grab-hand points.
window.MONSTER_SHEET_VERSION = "2";
window.MONSTERS = {
  troll: {
    sheet: "assets/monster_sprites.webp",
    grabHands: [[336, 181], [296, 122], [335, 114]],
    snores: true
  },
  scarecrow: {
    scale: 1.15, // the sheet height includes its tall hat
    grabHands: [[354, 177], [305, 117], [339, 132]]
  },
  skeleton: {
    grabHands: [[348, 189], [300, 116], [349, 122]]
  },
  robot: {
    scale: 1.15, // stands squat
    grabHands: [[363, 208], [326, 148], [342, 130]],
    defeated: "sparks"
  },
  tintroll: {
    grabHands: [[325, 210], [296, 97], [340, 155]],
    // its knocked-down poses are painted small (the first a little less so)
    rowScale: [1, 1, 1, [1.2, 1.45, 1.45]]
  },
  candytroll: {
    particles: "candy_particles",
    grabHands: [[330, 230], [285, 100], [330, 200]]
  },
  cloudtroll: {
    grabHands: [[330, 230], [285, 90], [330, 185]],
    defeated: "dissipate",
    lightning: true
  },
  sandtroll: {
    grabHands: [[325, 180], [282, 56], [350, 135]]
  }
};
