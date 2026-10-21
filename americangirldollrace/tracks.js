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
// `sounds` give themed pickups their own sound (sfx keys in
// assets/audio/manifest.json), also only once the power-up art is listed.
// `labels` rename power-ups in the pop-up text, and only apply once that
// track's "powerups" art is listed. `mountOdds` are the chances of each
// non-horse mount from a mount pickup; the rest are plain horses. Themed
// ground mounts (pony, reindeer, rocking_horse, carousel_horse) ride like the
// horse and are listed in game.js THEMED_MOUNT_TYPES. `baseMount` replaces the
// plain horse on a track (the rest of a mount pickup's roll). `beachBalls` is
// how many kickable beach balls are spread along the track (art: "beachball",
// 256×256 alpha, optional; drawn in code until then).
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
// oilEffect: "sticky" makes the oil power-up a sticky puddle (honey, mud,
// jam…): the doll's feet stick and she tips forward instead of sliding.
// fenceBase (optional): where the back fence meets the ground, when there's
// a verge between it and the path; racers may walk up to it.
// rideToys: { boost: "skates", jump: "pogo" } makes those pickups roller
// skates / a pogo stick that last twice as long and change the doll's look.
// moonBoots: the high-jump pickup is moon boots: low gravity for a while, so
// jumps float over several hurdles (Moon Base).
// monster: replaces the troll on that track with another sheet in the troll's
// layout, assets/<monster>_sprites.webp (listed in TRACK_SHARED_ART once
// delivered; until then the troll appears), and its own <monster>_* sounds.
// TRACK_SHARED_ART lists delivered sheets at assets/<name>_sprites.webp that
// several tracks may use: "skeleton_horse", "troll_riding" (§6 of the briefs),
// "scarecrow", "skeleton" (§9).
window.TRACK_SHARED_ART = ["skeleton_horse", "troll_riding"];
// Dolls (asset keys) whose roller-skate / pogo sheet is delivered:
// assets/doll_<key>_toys.webp and its mask (image-requests.md §8).
window.RIDE_TOY_SHEETS = ["lily", "mira", "hermione"];
// Packed frame calibration preserves anatomy when long hair or fall poses need more room.
window.RIDE_TOY_FRAMES = {
  "lily": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      225,
      225,
      225,
      225,
      225,
      225,
      225
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0391904055270391,
      1.0367394847592868,
      1.0367394847592868,
      1.0058548130387153,
      1.0,
      1.0849903883916576
    ]
  },
  "mira": {
    "anchorX": [
      255,
      227,
      249,
      253,
      256,
      225,
      225,
      225,
      225,
      225,
      225,
      225
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.101798470986339,
      1.0,
      1.0084018965276809,
      1.0038697531725003,
      1.0,
      1.0,
      1.1567865647324227
    ]
  },
  "hermione": {
    "anchorX": [
      233,
      225,
      250,
      225,
      234,
      225,
      225,
      225,
      225,
      225,
      225,
      225
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.077935547334431,
      1.0082508250825082,
      1.0058672533920059,
      1.0082508250825082,
      1.0,
      1.0,
      1.146739943972799
    ]
  }
};
window.TRACK_GENERAL_MUSIC = ["assets/music/Plastic Shoes.mp3", "assets/music/Bubblegum Radar.mp3"];
window.TRACK_THEMES = {
  farm: {
    oilEffect: "sticky",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "HAY BOUNCE", boost: "CARROT", emp: "ROOSTER", oil: "MUD", snowball: "APPLES" },
    sounds: { emp: "pickup_rooster" },
    mountOdds: { pony: 0.25, unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  fairy: {
    oilEffect: "sticky",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "TOADSTOOL", boost: "FAIRY DUST", emp: "WAND ZAP", oil: "HONEY", snowball: "BUBBLES" },
    sounds: { emp: "pickup_wand_zap" },
    mountOdds: { unicorn: 0.2, pegasus: 0.2, griffon: 0.05, broom: 0.05 }
  },
  town: {
    oilEffect: "sticky",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "POGO", boost: "SKATES", emp: "BELL", oil: "LEMONADE", snowball: "WATER BALLOONS" },
    sounds: { emp: "pickup_hand_bell", boost: "pickup_skates", jump: "pickup_pogo" },
    rideToys: { boost: "skates", jump: "pogo" }
  },
  winter: {
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "SKI JUMP", boost: "SLED", emp: "THUNDERSNOW", oil: "ICE", snowball: "SNOWBALLS" },
    sounds: { emp: "storm_lightning" },
    mountOdds: { reindeer: 0.25, unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  castles: {
    oilEffect: "sticky",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "ROYAL BOUNCE", boost: "TRUMPET", emp: "GONG", oil: "JAM", snowball: "CREAM PUFFS" },
    sounds: { emp: "pickup_gong", boost: "pickup_trumpet" },
    mountOdds: { unicorn: 0.1, pegasus: 0.1, griffon: 0.15, broom: 0.05 }
  },
  horseshow: {
    name: "Horse Show", dirtTop: 502, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "SPRINGBOARD", boost: "HORSESHOE", emp: "STARTER BELL", oil: "WATER JUMP", snowball: "SUGAR CUBES" },
    sounds: { emp: "pickup_starter_bell" },
    startMounted: true,
    mountOdds: { unicorn: 0.4, pegasus: 0.3, griffon: 0.2, broom: 0.1 },
    trollMount: "skeleton_horse",
    hurdleGapScale: 1.4,
    lengthScale: 1.4,
    amandaPushesTrolls: true,
    standInBackground: "farm"
  },
  toyroom: {
    rideToys: {jump: "pogo"},
    oilEffect: "sticky",
    name: "Toy Room", music: "assets/music/Little Toy-Box.mp3", dirtTop: 481, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "POGO", boost: "WIND-UP KEY", emp: "TOY DRUM", oil: "SPILLED JUICE", snowball: "MARSHMALLOWS" },
    sounds: { emp: "pickup_toy_drum", jump: "pickup_jack_in_box" },
    baseMount: "rocking_horse",
    mountOdds: { unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  candy: {
    rideToys: {jump: "pogo"},
    oilEffect: "sticky",
    name: "Candy Land", dirtTop: 517, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "POGO", boost: "PEPPERMINT", emp: "POP ROCKS", oil: "CHOCOLATE", snowball: "GUMBALLS" },
    sounds: { emp: "pickup_pop_rocks" },
    mountOdds: { unicorn: 0.2, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  beach: {
    name: "Beach", music: "assets/music/Ride the Beach Tide.mp3", dirtTop: 514, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "POOL SPRING", boost: "SURFBOARD", emp: "CONCH SHELL", oil: "SEAWEED", snowball: "WATER BALLOONS" },
    sounds: { emp: "pickup_conch" },
    beachBalls: 4
  },
  wizard: {
    monster: "skeleton",
    name: "Wizard School", music: "assets/music/Oops-a-Daisy Wizard School.mp3", dirtTop: 507, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "SPELL BOOK", boost: "POTION", emp: "WAND ZAP", oil: "CAULDRON SPILL", snowball: "PIXIE PUFFS" },
    sounds: { emp: "pickup_wand_zap" },
    mountOdds: { unicorn: 0.05, pegasus: 0.05, griffon: 0.15, broom: 0.3 }
  },
  autumn: {
    monster: "scarecrow",
    oilEffect: "sticky",
    fenceBase: 479,
    name: "Pumpkin Patch", dirtTop: 509, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "LEAF PILE", boost: "LEAF GUST", emp: "SCARECROW", oil: "PUDDLE", snowball: "APPLES" },
    sounds: { emp: "pickup_crows" }
  },
  clouds: {
    name: "Cloud Kingdom", dirtTop: 535, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "CLOUD PUFF", boost: "RAINBOW", emp: "THUNDERCLAP", oil: "RAIN PUDDLE", snowball: "HAILSTONES" },
    sounds: { emp: "storm_lightning" },
    mountOdds: { unicorn: 0.1, pegasus: 0.3, griffon: 0.1, broom: 0.05 }
  },
  space: {
    moonBoots: true,
    oilEffect: "sticky",
    name: "Moon Base", dirtTop: 487, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "MOON BOOTS", boost: "ROCKET", emp: "LASER", oil: "SPACE GOO", snowball: "MOON ROCKS" },
    sounds: { emp: "pickup_laser" }
  },
  // Twilight woodland track with its own looped art and song.
  woods: {
    oilEffect: "sticky",
    name: "Fairy Woods", music: "assets/music/Fairies in the Woods.mp3", dirtTop: 480, loopMode: "repeat", art: ["background", "card", "hurdle", "powerups", "projectile"],
    labels: { jump: "MUSHROOM", boost: "FIREFLIES", emp: "ACORN BELL", oil: "MOSSY BOG", snowball: "ACORNS" },
    sounds: { emp: "pickup_acorn_bell" },
    mountOdds: { unicorn: 0.2, pegasus: 0.15, griffon: 0.05, broom: 0.05 }
  },
  festival: {
    rideToys: {boost: "skates", jump: "pogo"},
    oilEffect: "sticky",
    name: "Night Festival", music: "assets/music/One More Spin at the Night Festival.mp3", dirtTop: 513, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "POGO", boost: "SKATES", emp: "FIREWORK", oil: "SPILLED SODA", snowball: "WATER BALLOONS" },
    sounds: { emp: "firework_burst", boost: "pickup_sparkler" },
    mountOdds: { carousel_horse: 0.25, unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  }
};
