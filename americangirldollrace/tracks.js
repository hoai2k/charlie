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
// `projectileLanding` is what a thrown "snowball" does when it misses: it
// arcs down to the ground, then "water" (balloons) bursts into a splash
// (also on a hit), "snow" leaves a little pile that melts away, "pop"
// (bubbles) stays up and pops in the air; otherwise it rolls to a stop.
// `empStyle` is how the EMP pickup reaches whoever it hits. "lightning" (the
// default, and the plain EMP always) arcs bolts and shows the original EMP
// icon. The rest keep the track's own icon, and leave whoever they hit dizzy
// (stars round the head) instead of shocked: "firework" rockets arc up from
// the trigger and dive onto each one, bursting; "poprocks" candies arc over
// and crackle; "rooster" sound waves, "bell" rings with music notes and "gong"
// a heavy ring spread out from the trigger; "crows" fly to each one and
// circle her head.
// `music` is the track's own song. Tracks without one take turns with the
// songs in TRACK_GENERAL_MUSIC, which suit any board.
// Riding rules (Horse Show):
//   startMounted        everyone rides a horse all race and can use power-ups
//                       on horseback; a mount pickup swaps in one of
//                       `mountOdds`' special mounts for a while (then back
//                       to a horse). A troll that grabs a rider leaves her on
//                       foot and her horse standing there to get back on; two
//                       spare horses wait at the bottom of the track a third
//                       and two thirds of the way along.
// Trolls and mounts (every track): a troll pulls a rider off a horse, pony,
// pegasus or broomstick, and the mount stays as a pickup with the time it
// had left. Unicorns and gryphons knock a troll down instead while moving
// faster than him; standing still (or slower) they can be grabbed too.
//   trollMount          what trolls ride: an image key (falls back to a
//                       darkened horse until its sheet is in TRACK_SHARED_ART).
//                       A skeleton horse knocked out from under its troll
//                       stays for a girl to ride (even off a plain horse);
//                       ridden, it knocks over anyone it runs into, except
//                       a unicorn, pegasus or griffon: then both riders fall.
//   hurdleGapScale      spaces the hurdles further apart
//   lengthScale         makes the course longer
//   amandaPushesTrolls  Amanda pops up for trolls too and shoves them back
//   standInBackground   races on another track's backdrop until this one's
//                       own background is in
// oilEffect: "sticky" makes the oil power-up a sticky puddle (honey, mud,
// jam…): the doll's feet stick and she tips forward instead of sliding.
// fenceBase (optional): where the back fence meets the ground, when there's
// a verge between it and the path; racers may walk up to it.
// rideToys: { boost: "skates" } makes the speed pickup roller skates that
// last twice as long and change the doll's look.
// High-jump pickups are springs in some races and pogo sticks in others, on
// any track, but never both in one race (game-powerups.js POGO_SHARE), except Wizard
// School (spell book) and Horse Show (everyone rides); on Moon Base the
// spring is moon boots. Pogo pickups always show the Toy Room's red pogo
// icon, which matches the stick the dolls ride.
// Speed and high-jump pickups otherwise always use the original icons, names
// (BOOST, HIGH JUMP) and sounds: a track's own speed/jump art, `labels` and
// `sounds` are used only for skates, a pogo stick, or an `itemEffects` item
// (surfboard, wind-up key, spell book) or moon boots.
// baseMount may be a list to pick from. unlocksWizardMounts: finishing this
// track unlocks gryphons and broomsticks on every other track for the rest of
// that day (until then they're left out of mount pickups there).
// noPowerups: power-up kinds this track never hands out (the Toy Room has no
// EMP, since its wind-up cars do much the same).
// itemEffects: a speed or high-jump pickup that does its own thing instead:
// "spellBook" (frog the nearest racer or monster), "surfboard" (ride a wave
// over hurdles), "windupCars" (cars that bump whoever they meet).
// moonBoots: the high-jump pickup is moon boots: low gravity for a while, so
// jumps float over several hurdles (Moon Base).
// monster: replaces the troll on that track with another monster; everything
// about each one (sheet, size, grip, sounds, defeat effect) is its entry in
// monsters.js, and the troll appears until that entry exists.
// TRACK_SHARED_ART lists delivered sheets at assets/<name>_sprites.webp that
// several tracks may use: "skeleton_horse", "troll_riding" (§6 of the briefs)
// and "frog" (§10).
window.TRACK_SHARED_ART = ["skeleton_horse", "troll_riding", "frog", "rooster_crow", "crow"];
window.TRACK_GENERAL_MUSIC = ["assets/music/Plastic Shoes.mp3", "assets/music/Bubblegum Radar.mp3"];
window.TRACK_THEMES = {
  farm: {
    empStyle: "rooster",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "HAY BOUNCE", boost: "CARROT", emp: "ROOSTER", oil: "MUD", snowball: "APPLES" },
    sounds: { emp: "pickup_rooster" },
    mountOdds: { pony: 0.25, unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  fairy: {
    projectileLanding: "pop",
    empStyle: "lightning",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "TOADSTOOL", boost: "FAIRY DUST", emp: "WAND ZAP", oil: "HONEY", snowball: "BUBBLES" },
    sounds: { emp: "pickup_wand_zap" },
    mountOdds: { unicorn: 0.2, pegasus: 0.2, griffon: 0.05, broom: 0.05 }
  },
  town: {
    empStyle: "bell",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "POGO", boost: "SKATES", emp: "BELL", oil: "LEMONADE", snowball: "WATER BALLOONS" },
    projectileLanding: "water",
    sounds: { emp: "pickup_hand_bell", boost: "pickup_skates", jump: "pickup_pogo" },
    rideToys: { boost: "skates" }
  },
  winter: {
    projectileLanding: "snow",
    empStyle: "lightning",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "SKI JUMP", boost: "SLED", emp: "THUNDERSNOW", oil: "ICE", snowball: "SNOWBALLS" },
    sounds: { emp: "storm_lightning" },
    mountOdds: { reindeer: 0.25, unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  castles: {
    empStyle: "gong",
    art: ["powerups", "projectile", "hurdle"],
    labels: { jump: "ROYAL BOUNCE", boost: "TRUMPET", emp: "GONG", oil: "JAM", snowball: "CREAM PUFFS" },
    sounds: { emp: "pickup_gong", boost: "pickup_trumpet" },
    mountOdds: { unicorn: 0.1, pegasus: 0.1, griffon: 0.15, broom: 0.05 }
  },
  horseshow: {
    empStyle: "bell",
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
    noPowerups: ["emp"],
    monster: "tintroll",
    name: "Toy Room", music: "assets/music/Little Toy-Box.mp3", dirtTop: 481, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle", "windup_car"],
    labels: { jump: "POGO", boost: "WIND-UP KEY", emp: "TOY DRUM", oil: "SPILLED JUICE", snowball: "MARSHMALLOWS" },
    sounds: { emp: "pickup_toy_drum", jump: "pickup_jack_in_box", boost: "windup_release" },
    baseMount: "rocking_horse",
    mountOdds: { unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 },
    itemEffects: { boost: "windupCars" }
  },
  candy: {
    monster: "candytroll",
    empStyle: "poprocks",
    name: "Candy Land", music: "assets/music/Bubblegum Radar.mp3", dirtTop: 517, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "POGO", boost: "PEPPERMINT", emp: "POP ROCKS", oil: "CHOCOLATE", snowball: "GUMBALLS" },
    sounds: { emp: "pickup_pop_rocks" },
    mountOdds: { unicorn: 0.2, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  },
  beach: {
    noPowerups: ["emp", "horse"], // the surfboard stands in for both
    monster: "sandtroll",
    name: "Beach", music: "assets/music/Ride the Beach Tide.mp3", dirtTop: 514, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle", "wave"],
    labels: { jump: "POOL SPRING", boost: "SURFBOARD", emp: "CONCH SHELL", oil: "SEAWEED", snowball: "WATER BALLOONS" },
    projectileLanding: "water",
    sounds: { emp: "pickup_conch", boost: "surf_pickup" },
    beachBalls: 4,
    itemEffects: { boost: "surfboard" }
  },
  wizard: {
    noPowerups: ["emp"], // the magic wand stands in
    empStyle: "lightning",
    monster: "skeleton",
    name: "Wizard School", music: "assets/music/Oops-a-Daisy Wizard School.mp3", dirtTop: 507, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "MAGIC WAND", boost: "POTION", emp: "WAND ZAP", oil: "CAULDRON SPILL", snowball: "PIXIE PUFFS" },
    sounds: { emp: "pickup_wand_zap", jump: "spell_cast" },
    mountOdds: { unicorn: 0.05, pegasus: 0.05 },
    baseMount: ["griffon", "broom"],
    unlocksWizardMounts: true,
    lengthScale: 1.2,
    itemEffects: { jump: "spellBook" }
  },
  autumn: {
    empStyle: "crows",
    monster: "scarecrow",
    fenceBase: 479,
    powerupArtVersion: "20261023-crows1",
    name: "Pumpkin Patch", music: "assets/music/Hey, Hay! Pumpkin Patch.mp3", dirtTop: 509, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "LEAF PILE", boost: "LEAF GUST", emp: "CROWS", oil: "PUDDLE", snowball: "APPLES" },
    sounds: { emp: "pickup_crows" }
  },
  clouds: {
    monster: "cloudtroll",
    projectileLanding: "snow",
    empStyle: "lightning",
    name: "Cloud Kingdom", music: "assets/music/Cloud Map of Gold.mp3", dirtTop: 535, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "CLOUD PUFF", boost: "RAINBOW", emp: "THUNDERCLAP", oil: "RAIN PUDDLE", snowball: "HAILSTONES" },
    sounds: { emp: "storm_lightning" },
    mountOdds: { unicorn: 0.1, pegasus: 0.3, griffon: 0.1, broom: 0.05 }
  },
  space: {
    baseMount: "moon_buggy",
    monster: "robot",
    empStyle: "lightning",
    moonBoots: true,
    name: "Moon Base", music: "assets/music/Pocketful of Comets Moon Base.mp3", dirtTop: 487, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "MOON BOOTS", boost: "ROCKET", emp: "LASER", oil: "SPACE GOO", snowball: "MOON ROCKS" },
    sounds: { emp: "pickup_laser" }
  },
  // Twilight woodland track with its own looped art and song.
  woods: {
    empStyle: "bell",
    name: "Fairy Woods", music: "assets/music/Fairies in the Woods.mp3", dirtTop: 480, loopMode: "repeat", art: ["background", "card", "hurdle", "powerups", "projectile"],
    labels: { jump: "MUSHROOM", boost: "FIREFLIES", emp: "ACORN BELL", oil: "MOSSY BOG", snowball: "ACORNS" },
    sounds: { emp: "pickup_acorn_bell" },
    mountOdds: { unicorn: 0.2, pegasus: 0.15, griffon: 0.05, broom: 0.05 }
  },
  festival: {
    empStyle: "firework",
    rideToys: { boost: "skates" },
    name: "Night Festival", music: "assets/music/One More Spin at the Night Festival.mp3", dirtTop: 513, loopMode: "repeat", art: ["background", "card", "powerups", "projectile", "hurdle"],
    labels: { jump: "POGO", boost: "SKATES", emp: "FIREWORK", oil: "SPILLED SODA", snowball: "WATER BALLOONS" },
    projectileLanding: "water",
    sounds: { emp: "firework_burst", boost: "pickup_sparkler" },
    mountOdds: { carousel_horse: 0.25, unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 }
  }
};
