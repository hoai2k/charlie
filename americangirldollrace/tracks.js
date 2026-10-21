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
// starts; racers' feet can't go above it. Each delivered background is calibrated to its painted path edge.
// `labels` rename power-ups in the pop-up text, and only apply once that
// track's "powerups" art is listed. `mountOdds` are the chances of each
// non-horse mount from a mount pickup; the rest are plain horses.
window.TRACK_THEMES = {
  farm: { art: [], labels: { jump: "HAY BOUNCE", boost: "CARROT", emp: "ROOSTER", oil: "MUD", snowball: "APPLES" } },
  fairy: {
    art: [],
    labels: { jump: "TOADSTOOL", boost: "FAIRY DUST", emp: "WAND ZAP", oil: "HONEY", snowball: "BUBBLES" },
    mountOdds: { unicorn: 0.2, pegasus: 0.2, griffon: 0.05, broom: 0.05 }
  },
  town: { art: [], labels: { jump: "POGO", boost: "SKATES", emp: "BELL", oil: "LEMONADE", snowball: "WATER BALLOONS" } },
  winter: { art: [], labels: { jump: "SKI JUMP", boost: "SLED", emp: "THUNDERSNOW", oil: "ICE", snowball: "SNOWBALLS" } },
  castles: {
    art: [],
    labels: { jump: "ROYAL BOUNCE", boost: "TRUMPET", emp: "GONG", oil: "JAM", snowball: "CREAM PUFFS" },
    mountOdds: { unicorn: 0.1, pegasus: 0.1, griffon: 0.15, broom: 0.05 }
  },
  horseshow: {
    name: "Horse Show", music: "assets/music/Plastic Shoes.mp3", dirtTop: 502, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "SPRINGBOARD", boost: "HORSESHOE", emp: "STARTER BELL", oil: "WATER JUMP", snowball: "SUGAR CUBES" },
    mountOdds: { unicorn: 0.05, pegasus: 0.05, griffon: 0.02, broom: 0.01 }
  },
  toyroom: {
    name: "Toy Room", music: "assets/music/Bubblegum Radar.mp3", dirtTop: 481, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "JACK-IN-THE-BOX", boost: "WIND-UP KEY", emp: "TOY DRUM", oil: "SPILLED JUICE", snowball: "MARSHMALLOWS" }
  },
  candy: {
    name: "Candy Land", music: "assets/music/Sugar Castle Run.mp3", dirtTop: 517, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "GUMDROP", boost: "PEPPERMINT", emp: "POP ROCKS", oil: "CHOCOLATE", snowball: "GUMBALLS" },
    mountOdds: { unicorn: 0.2, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  beach: {
    name: "Beach", music: "assets/music/Ghent Sweet Parade.mp3", dirtTop: 514, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "BEACH BALL", boost: "SURFBOARD", emp: "CONCH SHELL", oil: "SEAWEED", snowball: "WATER BALLOONS" }
  },
  wizard: {
    name: "Wizard School", music: "assets/music/Moss Under Moon.mp3", dirtTop: 507, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "SPELL BOOK", boost: "POTION", emp: "WAND ZAP", oil: "CAULDRON SPILL", snowball: "PIXIE PUFFS" },
    mountOdds: { unicorn: 0.05, pegasus: 0.05, griffon: 0.15, broom: 0.3 }
  },
  autumn: {
    name: "Pumpkin Patch", music: "assets/music/Plastic Shoes.mp3", dirtTop: 509, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "LEAF PILE", boost: "LEAF GUST", emp: "SCARECROW", oil: "PUDDLE", snowball: "APPLES" }
  },
  clouds: {
    name: "Cloud Kingdom", music: "assets/music/Bubblegum Radar.mp3", dirtTop: 535, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "CLOUD PUFF", boost: "RAINBOW", emp: "THUNDERCLAP", oil: "RAIN PUDDLE", snowball: "HAILSTONES" },
    mountOdds: { unicorn: 0.1, pegasus: 0.3, griffon: 0.1, broom: 0.05 }
  },
  space: {
    name: "Moon Base", music: "assets/music/Moss Under Moon.mp3", dirtTop: 487, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "MOON BOOTS", boost: "ROCKET", emp: "LASER", oil: "SPACE GOO", snowball: "MOON ROCKS" }
  },
  festival: {
    name: "Night Festival", music: "assets/music/Moss Under Moon.mp3", dirtTop: 513, loopMode: "repeat", art: ["background", "card"],
    labels: { jump: "TRAMPOLINE", boost: "SPARKLER", emp: "FIREWORK", oil: "SPILLED SODA", snowball: "WATER BALLOONS" }
  }
};
