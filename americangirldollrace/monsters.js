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
//   rowScale   per sprite row, a size correction for a row painted smaller
//              or larger than the others ([idle, walk, grab, fall] rows)
//   snores     plays the troll's sleep loop when defeated
//   defeated   an effect drawn over its defeated pose: "sparks"
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
    grabHands: [[363, 208], [365, 148], [342, 130]],
    defeated: "sparks"
  },
  tintroll: {
    grabHands: [[325, 210], [290, 120], [340, 155]],
    rowScale: [1, 1, 1, 1.45] // its knocked-down row is painted about 2/3 size
  },
  sandtroll: {
    grabHands: [[325, 180], [310, 55], [350, 135]]
  }
};
