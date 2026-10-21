// Track themes: per-track art, power-up names and mount odds, plus the new
// tracks that are waiting for art. Briefs are in image-requests.md §5.
//
// Art lives in assets/tracks/<key>/<file>.webp. Add a file's name to `art`
// in the same commit that adds the file; anything not listed falls back to
// the built-in look (white picket hurdle, icons_alpha.webp power-ups,
// canvas snowball, painted-background track card).
//   background  2172×724 opaque   the race backdrop (new tracks only)
//   hurdle      160×170 alpha     the jumpable fence, base on the bottom edge
//   powerups    1280×256 alpha    5 cells of 256: jump, boost, emp, oil, snowball
//   projectile  128×128 alpha     the thrown "snowball"
//   card        400×225 opaque    the track's thumbnail
//
// A new track joins the race rotation once "background" is listed.
// dirtTop is the screen y (at the 720 render height) where the painted path
// starts; racers' feet can't go above it. New backgrounds are painted with
// the path starting at 532, like the farm.
// `labels` rename power-ups in the pop-up text, and only apply once that
// track's "powerups" art is listed. `mountOdds` are the chances of each
// non-horse mount from a mount pickup; the rest are plain horses.
// `music` is the track's own song. Tracks without one take turns with the
// songs in TRACK_GENERAL_MUSIC, which suit any board.
// Riding rules (Horse Show):
//   startMounted        everyone rides a horse all race and can use power-ups
//                       on horseback; a mount pickup swaps in one of
//                       `mountOdds`' special mounts for a while
//   trollMount          what trolls ride: an image key (falls back to a
//                       darkened horse until its sheet is in TRACK_SHARED_ART)
//   hurdleGapScale      spaces the hurdles further apart
//   lengthScale         makes the course longer
//   amandaPushesTrolls  Amanda pops up for trolls too and shoves them back
//   standInBackground   races on another track's backdrop until this one's
//                       own background is in
// TRACK_SHARED_ART lists delivered sheets at assets/<name>_sprites.webp that
// several tracks may use: "skeleton_horse", "troll_riding" (§6 of the briefs).
window.TRACK_SHARED_ART = ["skeleton_horse", "troll_riding"];
window.TRACK_GENERAL_MUSIC = ["assets/music/Plastic Shoes.mp3", "assets/music/Bubblegum Radar.mp3"];
window.TRACK_THEMES = {
  farm: { art: ["powerups", "projectile", "hurdle"], labels: { jump: "HAY BOUNCE", boost: "CARROT", emp: "ROOSTER", oil: "MUD", snowball: "APPLES" } },
  fairy: {
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "TOADSTOOL", boost: "FAIRY DUST", emp: "WAND ZAP", oil: "HONEY", snowball: "BUBBLES" },
    mountOdds: { unicorn: 0.2, pegasus: 0.2, griffon: 0.05, broom: 0.05 }
  },
  town: { art: ["powerups", "projectile", "hurdle"], labels: { jump: "POGO", boost: "SKATES", emp: "BELL", oil: "LEMONADE", snowball: "WATER BALLOONS" } },
  winter: { art: ["powerups", "projectile", "hurdle"], labels: { jump: "SKI JUMP", boost: "SLED", emp: "THUNDERSNOW", oil: "ICE", snowball: "SNOWBALLS" } },
  castles: {
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "ROYAL BOUNCE", boost: "TRUMPET", emp: "GONG", oil: "JAM", snowball: "CREAM PUFFS" },
    mountOdds: { unicorn: 0.1, pegasus: 0.1, griffon: 0.15, broom: 0.05 }
  },
  horseshow: {
    name: "Horse Show", dirtTop: 502, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "SPRINGBOARD", boost: "HORSESHOE", emp: "STARTER BELL", oil: "WATER JUMP", snowball: "SUGAR CUBES" },
    startMounted: true,
    mountOdds: { unicorn: 0.4, pegasus: 0.3, griffon: 0.2, broom: 0.1 },
    trollMount: "skeleton_horse",
    hurdleGapScale: 1.4,
    lengthScale: 1.4,
    amandaPushesTrolls: true,
    standInBackground: "farm"
  },
  toyroom: {
    name: "Toy Room", music: "assets/music/Little Toy-Box.mp3", dirtTop: 481, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "JACK-IN-THE-BOX", boost: "WIND-UP KEY", emp: "TOY DRUM", oil: "SPILLED JUICE", snowball: "MARSHMALLOWS" }
  },
  candy: {
    name: "Candy Land", dirtTop: 517, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "GUMDROP", boost: "PEPPERMINT", emp: "POP ROCKS", oil: "CHOCOLATE", snowball: "GUMBALLS" },
    mountOdds: { unicorn: 0.2, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  beach: {
    name: "Beach", music: "assets/music/Ride the Beach Tide.mp3", dirtTop: 514, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "BEACH BALL", boost: "SURFBOARD", emp: "CONCH SHELL", oil: "SEAWEED", snowball: "WATER BALLOONS" }
  },
  wizard: {
    name: "Wizard School", music: "assets/music/Oops-a-Daisy Wizard School.mp3", dirtTop: 507, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "SPELL BOOK", boost: "POTION", emp: "WAND ZAP", oil: "CAULDRON SPILL", snowball: "PIXIE PUFFS" },
    mountOdds: { unicorn: 0.05, pegasus: 0.05, griffon: 0.15, broom: 0.3 }
  },
  autumn: {
    name: "Pumpkin Patch", dirtTop: 509, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "LEAF PILE", boost: "LEAF GUST", emp: "SCARECROW", oil: "PUDDLE", snowball: "APPLES" }
  },
  clouds: {
    name: "Cloud Kingdom", dirtTop: 535, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "CLOUD PUFF", boost: "RAINBOW", emp: "THUNDERCLAP", oil: "RAIN PUDDLE", snowball: "HAILSTONES" },
    mountOdds: { unicorn: 0.1, pegasus: 0.3, griffon: 0.1, broom: 0.05 }
  },
  space: {
    name: "Moon Base", dirtTop: 487, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "MOON BOOTS", boost: "ROCKET", emp: "LASER", oil: "SPACE GOO", snowball: "MOON ROCKS" }
  },
  // Reserved for a wooded fairy board; the Fairy track isn't woodsy enough.
  woods: {
    name: "Fairy Woods", music: "assets/music/Fairies in the Woods.mp3", dirtTop: 532, art: [],
    labels: { jump: "MUSHROOM", boost: "FIREFLIES", emp: "ACORN BELL", oil: "MOSSY BOG", snowball: "ACORNS" },
    mountOdds: { unicorn: 0.2, pegasus: 0.15, griffon: 0.05, broom: 0.05 }
  },
  festival: {
    name: "Night Festival", music: "assets/music/One More Spin at the Night Festival.mp3", dirtTop: 513, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "TRAMPOLINE", boost: "SPARKLER", emp: "FIREWORK", oil: "SPILLED SODA", snowball: "WATER BALLOONS" }
  }
};
