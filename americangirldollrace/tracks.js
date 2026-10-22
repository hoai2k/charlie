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
// baseMount may be a list to pick from. unlocksWizardMounts: finishing this
// track unlocks gryphons and broomsticks on every other track for the rest of
// that day (until then they're left out of mount pickups there).
// itemEffects: a speed or high-jump pickup that does its own thing instead:
// "spellBook" (frog the nearest racer or monster), "surfboard" (ride a wave
// over hurdles), "windupCars" (cars that bump whoever they meet).
// moonBoots: the high-jump pickup is moon boots: low gravity for a while, so
// jumps float over several hurdles (Moon Base).
// monster: replaces the troll on that track with another sheet in the troll's
// layout, assets/<monster>_sprites.webp (listed in TRACK_SHARED_ART once
// delivered; until then the troll appears), and its own <monster>_* sounds.
// TRACK_SHARED_ART lists delivered sheets at assets/<name>_sprites.webp that
// several tracks may use: "skeleton_horse", "troll_riding" (§6 of the briefs),
// "scarecrow", "skeleton" (§9).
window.TRACK_SHARED_ART = ["skeleton_horse", "troll_riding", "frog", "scarecrow", "skeleton"];
// Dolls (asset keys) whose roller-skate / pogo sheet is delivered:
// assets/doll_<key>_toys.webp and its mask (image-requests.md §8).
window.RIDE_TOY_ART_VERSION = "20261021-purse-v1";
window.RIDE_TOY_SHEETS = ["lily", "mira", "hermione", "whirlpool", "juliette", "claudia-v2", "kaya", "amanda", "penelope", "rumi-v2", "barbie", "cinnamon", "felicity", "luna"];
// Packed frame calibration preserves anatomy when long hair or fall poses need more room.
window.RIDE_TOY_FRAMES = {
  "lily": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      224.54225352112675,
      225,
      225,
      225,
      225,
      225,
      190.46610169491527
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
      1.0
    ]
  },
  "mira": {
    "anchorX": [
      255,
      227,
      249,
      253,
      256,
      224.59756097560975,
      225,
      225,
      225,
      225,
      225,
      225.2925659472422
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0084018965276809,
      1.0038697531725003,
      1.0,
      1.0,
      1.0
    ]
  },
  "hermione": {
    "anchorX": [
      233,
      225,
      250,
      225,
      234,
      225.35479797979798,
      225,
      225,
      225,
      225,
      225,
      203.6919128329298
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0082508250825082,
      1.0058672533920059,
      1.0082508250825082,
      1.0,
      1.0,
      1.0412464703509479
    ]
  },
  "whirlpool": {
    "anchorX": [
      253,
      225,
      247,
      225,
      225,
      225.46593406593408,
      225,
      225,
      225,
      225,
      225,
      222.5611591384667
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.1823154225534913,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0262913931842623,
      1.0124225905736641,
      1.1798401476327636
    ]
  },
  "juliette": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      224.91946308724835,
      225,
      225,
      225,
      225,
      225,
      222.26659204712814
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0021338340730626,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0700751109593718,
      1.0598839194264253,
      1.1351174236345156
    ]
  },
  "claudia-v2": {
    "anchorX": [
      225,
      208,
      225,
      225,
      235,
      183.7568493150685,
      225,
      225,
      225,
      225,
      225,
      184.16445892495983
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0146708101467081,
      1.0041013225410131,
      1.0604719231047193,
      1.053425598034256,
      1.0066219183412546
    ]
  },
  "kaya": {
    "anchorX": [
      280,
      225,
      225,
      225,
      225,
      225.64705882352942,
      225,
      225,
      225,
      225,
      225,
      177.4372303153236
    ],
    "scale": [
      1.0005414603960396,
      1.0,
      1.0,
      1.012855816831683,
      1.0190129950495048,
      1.0,
      1.0005414603960396,
      1.043641707920792,
      1.0220915841584157,
      1.0775061881188117,
      1.0775061881188117,
      1.0997323166774822
    ]
  },
  "amanda": {
    "anchorX": [
      225,
      225,
      225,
      225,
      248,
      225.12155963302752,
      225,
      225,
      225,
      225,
      225,
      224.65575916230367
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
    ]
  },
  "penelope": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      224.7581344902386,
      225,
      225,
      225,
      225,
      225,
      203.81786542923436
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0108716754028344,
      1.0,
      1.0694282663560475,
      1.0632644146767618,
      1.0
    ]
  },
  "rumi-v2": {
    "anchorX": [
      234,
      225,
      236,
      225,
      225,
      189.68899521531102,
      225,
      225,
      225,
      225,
      225,
      174.24343675417663
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
    ]
  },
  "barbie": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      213.75974025974028,
      225,
      225,
      225,
      225,
      225,
      191.07476635514018
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.009101618377135,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
    ]
  },
  "cinnamon": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      189.6892156862745,
      225,
      225,
      225,
      225,
      225,
      189.4956043956044
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.087186388541767,
      1.0528213015476304,
      1.0
    ]
  },
  "felicity": {
    "anchorX": [
      250,
      225,
      247,
      225,
      225,
      220.0640776699029,
      225,
      225,
      225,
      225,
      219,
      220.16411128183333
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0191429359654232,
      1.0161542470036478,
      1.0190898187633262
    ]
  },
  "luna": {
    "anchorX": [
      225,
      225,
      225,
      225,
      225,
      219.99594320486818,
      225,
      225,
      225,
      225,
      222,
      195.14685314685318
    ],
    "scale": [
      1.0,
      1.0,
      1.0,
      1.0410599883517764,
      1.0442147155892059,
      1.0,
      1.0,
      1.0726072607260726,
      1.0095127159774802,
      1.075761987963502,
      1.0662978062512132,
      1.0
    ]
  }
};
// Dolls (asset keys) whose actions sheet is delivered: wand casting, surfing,
// saddle push, stuck in a puddle, moon-boots float (image-requests.md §10).
window.ACTION_SHEETS = ["hermione", "lily", "mira"];
window.ACTION_ART_VERSION = "20261021-action-trial";
window.ACTION_FRAMES = {
  "hermione": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.1334851167889366,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        84,
        7,
        368,
        409
      ],
      "wandTip": [
        359.08,
        11.77
      ],
      "sourceScale": 1.0621468926553672,
      "packedScale": 0.9370629370629371
    },
    {
      "anchorX": 183.80104712041887,
      "offsetX": 0,
      "scale": 1.0093037636675382,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        14,
        7,
        413,
        409
      ],
      "wandTip": [
        405.41,
        133.91
      ],
      "sourceScale": 1.0621468926553672,
      "packedScale": 1.0523560209424083
    },
    {
      "anchorX": 215.75634517766497,
      "offsetX": 0,
      "scale": 1.0410096410602354,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        11,
        23,
        413,
        409
      ],
      "wandTip": [
        406.07,
        225.62
      ],
      "sourceScale": 1.0621468926553672,
      "packedScale": 1.0203045685279188
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0700733620035416,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        19,
        7,
        385,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0621468926553672,
      "packedScale": 0.9925925925925926
    },
    {
      "anchorX": 256.2444444444444,
      "offsetX": 0,
      "scale": 1.0700733620035416,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        74,
        387,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0621468926553672,
      "packedScale": 0.9925925925925926
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0727155184529331,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        27,
        7,
        381,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0621468926553672,
      "packedScale": 0.9901477832512315
    },
    {
      "anchorX": 200.63841807909606,
      "offsetX": -38.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 402.37288135593224,
      "bounds": [
        26,
        21,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0621468926553672,
      "packedScale": 1.0621468926553672
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0119459201169296,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        44,
        8,
        364,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0621468926553672,
      "packedScale": 1.0496083550913837
    },
    {
      "anchorX": 211.7734375,
      "offsetX": 0,
      "scale": 1.0145880765663209,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        46,
        7,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0621468926553672,
      "packedScale": 1.046875
    }
  ],
  "lily": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        151,
        15,
        373,
        409
      ],
      "wandTip": [
        328.62,
        20.15
      ],
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    },
    {
      "anchorX": 222.59550561797755,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        102,
        58,
        413,
        409
      ],
      "wandTip": [
        406.71,
        168.57
      ],
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    },
    {
      "anchorX": 205.70786516853934,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        107,
        66,
        413,
        409
      ],
      "wandTip": [
        406.38,
        253.9
      ],
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        47,
        85,
        371,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        45,
        84,
        371,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    },
    {
      "anchorX": 215.08988764044943,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        102,
        61,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    },
    {
      "anchorX": 225,
      "offsetX": -50.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 379.69101123595505,
      "bounds": [
        132,
        68,
        393,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        85,
        69,
        328,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    },
    {
      "anchorX": 182.25280898876406,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        71,
        71,
        413,
        409
      ],
      "wandTip": null,
      "sourceScale": 0.9382022471910112,
      "packedScale": 0.9382022471910112
    }
  ],
  "mira": [
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.099502487562189,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        73,
        7,
        312,
        409
      ],
      "wandTip": [
        197.18,
        11.89
      ],
      "sourceScale": 1.0,
      "packedScale": 0.9095022624434389
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        8,
        49,
        390,
        409
      ],
      "wandTip": [
        383.26,
        168.28
      ],
      "sourceScale": 1.0,
      "packedScale": 1.0
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        11,
        27,
        384,
        409
      ],
      "wandTip": [
        377.61,
        199.89
      ],
      "sourceScale": 1.0,
      "packedScale": 1.0
    },
    {
      "anchorX": 254.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        8,
        356,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0
    },
    {
      "anchorX": 274.89473684210526,
      "offsetX": 0,
      "scale": 1.0398009950248757,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        7,
        84,
        364,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 0.9617224880382775
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0422885572139302,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        10,
        7,
        344,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 0.9594272076372315
    },
    {
      "anchorX": 225,
      "offsetX": 13.0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 369.0,
      "bounds": [
        15,
        62,
        377,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0
    },
    {
      "anchorX": 260.0,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        5,
        49,
        351,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0
    },
    {
      "anchorX": 225,
      "offsetX": 0,
      "scale": 1.0,
      "baseline": 409,
      "targetY": 409,
      "bounds": [
        21,
        45,
        398,
        409
      ],
      "wandTip": null,
      "sourceScale": 1.0,
      "packedScale": 1.0
    }
  ]
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
    name: "Horse Show", music: "assets/music/Race to the Ribbon Horse Race.mp3", dirtTop: 502, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
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
    name: "Toy Room", music: "assets/music/Little Toy-Box.mp3", dirtTop: 481, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle", "windup_car"],
    labels: { jump: "POGO", boost: "WIND-UP KEY", emp: "TOY DRUM", oil: "SPILLED JUICE", snowball: "MARSHMALLOWS" },
    sounds: { emp: "pickup_toy_drum", jump: "pickup_jack_in_box", boost: "windup_release" },
    baseMount: "rocking_horse",
    mountOdds: { unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 },
    itemEffects: { boost: "windupCars" }
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
    name: "Beach", music: "assets/music/Ride the Beach Tide.mp3", dirtTop: 514, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle", "wave"],
    labels: { jump: "POOL SPRING", boost: "SURFBOARD", emp: "CONCH SHELL", oil: "SEAWEED", snowball: "WATER BALLOONS" },
    sounds: { emp: "pickup_conch", boost: "surf_pickup" },
    beachBalls: 4,
    itemEffects: { boost: "surfboard" }
  },
  wizard: {
    monster: "skeleton",
    name: "Wizard School", music: "assets/music/Oops-a-Daisy Wizard School.mp3", dirtTop: 507, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "SPELL BOOK", boost: "POTION", emp: "WAND ZAP", oil: "CAULDRON SPILL", snowball: "PIXIE PUFFS" },
    sounds: { emp: "pickup_wand_zap", jump: "spell_cast" },
    mountOdds: { unicorn: 0.05, pegasus: 0.05 },
    baseMount: ["griffon", "broom"],
    unlocksWizardMounts: true,
    lengthScale: 1.2,
    itemEffects: { jump: "spellBook" }
  },
  autumn: {
    monster: "scarecrow",
    oilEffect: "sticky",
    fenceBase: 479,
    name: "Pumpkin Patch", music: "assets/music/Hey, Hay! Pumpkin Patch.mp3", dirtTop: 509, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
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
    name: "Moon Base", music: "assets/music/Pocketful of Comets Moon Base.mp3", dirtTop: 487, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
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
