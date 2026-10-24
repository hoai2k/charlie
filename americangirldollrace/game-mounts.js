// Mounts: horses and themed ponies, unicorns, pegasi, gryphons, broomsticks and fairy wings, the wizard-mount unlock, dismounting, and the unicorn rainbow.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

// Tracks where everyone rides a horse all race (tracks.js startMounted).
// Riders there use power-ups, and a mount pickup swaps in a special mount for
// a while before they're back on their horse.
function isAlwaysMountedTrack() {
  return Boolean(getTrackTheme().startMounted);
}

// Whether this racer can pick up and use power-ups: on foot, anywhere riders
// may (Horse Show, Horsing Around), on a broomstick or with fairy wings,
// which she runs with, or on a unicorn.
// Riders don't take power-ups, except where everyone rides, on a carried
// mount (broom, toys) or a unicorn, and on mounts with power-ups of their own
// (MOUNT_POWERUPS: given a type, whether a rider can take that one).
function canRacerUsePowerups(racer, type = null) {
  if (!isMounted(racer) || canMountedRacersUsePowerups() || isCarriedMount(racer.horseType) || racer.horseType === "unicorn") return true;
  return Boolean(type && MOUNT_POWERUPS[racer.horseType]?.includes(type));
}
const MOUNT_POWERUPS = {
  reindeer: ["boost", "jump", "emp"] // a reindeer picks up speed, leaps and zaps
};

function canMountedRacersUsePowerups() {
  return isHorsingAroundMode() || isAlwaysMountedTrack();
}

function isHorsingAroundMode() {
  return state.specials === "horsing";
}

// Fairy wings can also be worn over another mount where both are on a board
// (racer.wingsTimer: picked up while riding, or a mount picked up while in
// wings): she wears them in the saddle and her mount flies with them.
function wearsWingsOver(racer) {
  return racer.wingsTimer > 0 && isMounted(racer) && racer.horseType !== "wings";
}

// Whether a mount pickup goes with what she has on: wings over a mount she
// rides (not a broom or other carried mount), or a mount under her wings.
function combinesWithWings(racer, pickupType) {
  if (!isMounted(racer) || !pickupType) return false;
  if (pickupType === "wings") return racer.horseType !== "wings" && !isCarriedMount(racer.horseType) && !(racer.wingsTimer > 0);
  return racer.horseType === "wings" && !isCarriedMount(pickupType);
}

// Flying: a flying mount, or any mount with wings worn over it.
function canFly(racer) {
  return isFlyingMountType(racer.horseType) || wearsWingsOver(racer);
}

function isFlyingMountType(type) {
  return type === "pegasus" || type === "griffon" || type === "broom" || type === "wings";
}

// Mounts she doesn't sit on while running: the broomstick she carries and
// fairy wings on her back.
function isCarriedMount(type) {
  return type === "broom" || type === "wings";
}

function mountLabel(type) {
  if (type === "wings") return "FAIRY WINGS";
  return type.replace(/_/g, " ").toUpperCase();
}

function isSpecialMountType(type) {
  return type === "unicorn" || isFlyingMountType(type);
}

// Unicorns and gryphons bowl trolls over; a troll can pull a rider off any
// other mount (horses, ponies, pegasi, broomsticks).
function mountBeatsTrolls(type) {
  return type === "unicorn" || type === "griffon";
}

// ...but only while she's moving faster than the troll. Standing still (or
// slower than him) a troll can lift her off a unicorn or gryphon too.
function monsterSpeed(monster) {
  if (monster.state !== "walk") return 0;
  return monster.riding ? MOUNTED_MONSTER_SPEED : MONSTER_SPEED;
}

// Running, any mount gets past the plain troll and the ice giant, except in
// the Horse Show (where the trolls ride too); the other boards' monsters
// (skeleton, scarecrow…) pull her off anything but a unicorn or gryphon.
// The giant still plucks her out of the air (flying or mid-jump), whatever
// she rides.
// Monster difficulty (settings) changes that: on Easy no monster pulls her
// off any mount; on Hard every monster can, off any mount (no running past).
function mountOutrunsMonster(racer, monster) {
  if (!isMounted(racer)) return false;
  if (state.monsterSkill === "easy") return true;
  if (state.monsterSkill === "hard") return false;
  const key = getTrackMonsterKey();
  if (key === "icetroll" && racer.z > 20) return false;
  const plain = !key || key === "icetroll";
  const passes = mountBeatsTrolls(racer.horseType) || (plain && !isAlwaysMountedTrack());
  return passes && Math.abs(racer.speed || 0) > monsterSpeed(monster);
}

const DEFAULT_MOUNT_ODDS = { unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 };

// (theme: another board's odds, for a mount special won there.)
function chooseHorseType(theme = getTrackTheme()) {
  if (state.specials === "unicorn") return "unicorn";
  if (isFlyingMountType(state.specials)) return state.specials;
  const odds = { ...(theme.mountOdds || DEFAULT_MOUNT_ODDS) };
  // Gryphons and broomsticks only turn up elsewhere once a Wizard School race
  // has been finished on this device; their chance goes to the plain horse.
  if (!theme.unlocksWizardMounts && !areWizardMountsUnlocked()) {
    for (const type of WIZARD_MOUNTS) delete odds[type];
  }
  // Mounts this track hands out only once they've been found elsewhere
  // today (fairy wings on the Fairy board, after Fairy Woods).
  for (const [type, chance] of Object.entries(theme.foundMountOdds || {})) {
    if (isMountFoundToday(type)) odds[type] = chance;
  }
  // Everyone already rides a horse there, so the pickup is always a special mount.
  const total = theme.startMounted ? Object.values(odds).reduce((sum, chance) => sum + chance, 0) : 1;
  let roll = Math.random() * total;
  for (const [type, chance] of Object.entries(odds)) {
    if (roll < chance) return type;
    roll -= chance;
  }
  // A track's baseMount stands in for the horse: the Toy Room's rocking horse,
  // or a pick from a list (Wizard School's gryphons and broomsticks).
  const base = theme.baseMount;
  if (Array.isArray(base)) return base[Math.floor(Math.random() * base.length)];
  return base || "horse";
}

const WIZARD_MOUNTS = ["griffon", "broom"];

// A mount found today (tracks.js findsMounts: fairy wings put on in Fairy
// Woods), so tracks with it in foundMountOdds hand it out too, for the rest
// of the day (the device's local date).
const MOUNT_FOUND_KEY = "agdr.mountFoundOn.";
const mountsFoundOn = {};

function isMountFoundToday(type) {
  if (!(type in mountsFoundOn)) {
    try {
      mountsFoundOn[type] = localStorage.getItem(MOUNT_FOUND_KEY + type) || "";
    } catch (error) {
      mountsFoundOn[type] = "";
    }
  }
  return mountsFoundOn[type] === localDateKey();
}

function noteMountFound(type) {
  if (!(getTrackTheme().findsMounts || []).includes(type) || isMountFoundToday(type)) return;
  mountsFoundOn[type] = localDateKey();
  try {
    localStorage.setItem(MOUNT_FOUND_KEY + type, mountsFoundOn[type]);
  } catch (error) {
    // Private browsing: found for this visit only.
  }
}

// The unlock lasts for the rest of the day it was earned (the device's local
// date); the next day they have to finish a Wizard School race again.
const WIZARD_MOUNTS_KEY = "agdr.wizardMountsUnlockedOn";

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function areWizardMountsUnlocked() {
  if (wizardMountsUnlockedOn === null) {
    try {
      wizardMountsUnlockedOn = localStorage.getItem(WIZARD_MOUNTS_KEY) || "";
    } catch (error) {
      wizardMountsUnlockedOn = "";
    }
  }
  return wizardMountsUnlockedOn === localDateKey();
}

// Returns true the first time each day, so the finish screen can say so.
function unlockWizardMounts() {
  if (areWizardMountsUnlocked()) return false;
  wizardMountsUnlockedOn = localDateKey();
  try {
    localStorage.setItem(WIZARD_MOUNTS_KEY, wizardMountsUnlockedOn);
  } catch (error) {
    // Private browsing: unlocked for this visit only.
  }
  return true;
}

function horseDurationForType(horseType) {
  if (isHorsingAroundMode() && isSpecialMountType(horseType)) return Infinity;
  if (horseType === "unicorn") return HORSE_DURATION * UNICORN_DURATION_MULTIPLIER;
  if (isFlyingMountType(horseType)) return HORSE_DURATION * PEGASUS_DURATION_MULTIPLIER;
  if (horseType === "skeleton_horse") return SKELETON_HORSE_TIME;
  return HORSE_DURATION;
}

function getHorseJumpPower(racer) {
  if (racer.moonBootsTimer > 0) return HORSE_JUMP_POWER * MOON_BOOTS_JUMP_SCALE;
  if (!canRacerUsePowerups(racer, "jump")) return HORSE_JUMP_POWER;
  const stacks = racer.highJumpStacks.length;
  return stacks > 0 ? HORSE_JUMP_POWER * (1 + stacks * 0.35) : HORSE_JUMP_POWER;
}

// Pulled off by a troll: the mount stays behind as a pickup with the time it
// had left.
function dismountIntoPickup(racer) {
  const horseType = racer.horseType;
  const remaining = racer.horseTimer;
  racer.horseTimer = 0;
  racer.horseType = "horse";
  racer.pegasusGliding = false;
  if (isAlwaysMountedTrack()) racer.dismounted = true;
  GameAudio.stopLoop(racerLoopId(racer, "mount"));
  state.powerups.push(makeLooseMount(horseType, racer.x, racer.y + 54, remaining, racer.facing));
  sfx(horseType === "unicorn" ? "unicorn_whinny_magic" : "horse_whinny", racer.x, { gain: 0.8 });
  // Wings worn over it stay on her.
  if (racer.wingsTimer > 0 && horseType !== "wings") {
    racer.horseType = "wings";
    racer.horseTimer = racer.wingsTimer;
    racer.wingsTimer = 0;
  }
}

function makeLooseMount(horseType, x, y, mountTime, facing = 1) {
  return { ...makePowerup("horse", x, y), horseType, mountTime, loose: true, facing };
}

// Spare horses along the Horse Show course, for anyone a troll pulled off.
function makeSpareHorses() {
  if (!isAlwaysMountedTrack()) return [];
  const y = TRACK_BOTTOM + FOOT_OFFSET_Y - 8;
  return HORSE_SHOW_SPARE_HORSES.map(share => makeLooseMount("horse", clearOfHurdles(FINISH * share, y), y, Infinity));
}

function isMounted(racer) {
  return racer.horseTimer > 0;
}

function canMountedRacerThrowSnowballs(racer) {
  return canRacerUsePowerups(racer) && isMounted(racer) && racer.horseType !== "unicorn" && racer.snowballs > 0;
}

// The unicorn's horn tip in each frame of unicorn_sprites.webp (row, col),
// facing right, in frame pixels.
const UNICORN_HORN_TIPS = [
  [[364, 74], [366, 77], [339, 77]],
  [[410, 74], [377, 76], [398, 74]],
  [[397, 65], [398, 36], [401, 57]]
];

// In the air (or just landing) she's drawn in her jump pose; standing on top
// of a hurdle she's drawn standing, with her feet on it.
function isDrawnJumping(racer) {
  return (racer.z > 0 && !racer.onObstacle) || racer.jumpStarted || racer.landingTimer > 0;
}

// Where the rainbow leaves the horn, drawn the same way as the mount.
function unicornHornPoint(racer) {
  const jumping = isDrawnJumping(racer);
  const row = racer.pegasusGliding ? 1 : jumping ? 2 : racer.moving ? 1 : 0;
  const col = racer.pegasusGliding ? racer.frame : jumping ? racer.jumpFrame : racer.frame;
  const [hornX, hornY] = UNICORN_HORN_TIPS[row]?.[col] || UNICORN_HORN_TIPS[0][0];
  const horseScale = racerDepthScale(racer) * 1.08;
  const calibration = getMountFrameCalibration("unicorn", row, col);
  return {
    x: racer.x + racer.facing * (hornX - SPRITE_ANCHOR_X) * horseScale,
    y: racer.y + 58 - racer.z + (hornY - SPRITE_ANCHOR_Y + calibration.groundShift) * horseScale
  };
}

function fireRainbowBeam(racer) {
  if (racer.unicornBeamCooldown > 0) return;
  racer.unicornBeamCooldown = 0.35;
  sfx("unicorn_beam_fire", racer.x);
  const horn = unicornHornPoint(racer);
  const startX = horn.x;
  const endX = startX + racer.facing * UNICORN_BEAM_RANGE;
  // The beam stays attached to the horn while it fades, even mid-jump.
  state.rainbowBeams.push({
    owner: racer,
    facing: racer.facing,
    x1: startX,
    x2: endX,
    y: horn.y,
    timer: UNICORN_BEAM_DURATION,
    duration: UNICORN_BEAM_DURATION
  });
  for (const obstacle of state.obstacles) {
    const ahead = racer.facing > 0 ? obstacle.x > startX && obstacle.x < endX : obstacle.x < startX && obstacle.x > endX;
    if (ahead && amandaAt(obstacle.x, racer.y + 54, 1) === obstacle) hitAmanda(obstacle, racer.facing, racer);
  }
  for (const monster of state.monsters) {
    if (monster.state === "sleeping" || monster.state === "ground") continue;
    const ahead = racer.facing > 0 ? monster.x > startX && monster.x < endX : monster.x < startX && monster.x > endX;
    if (!ahead || Math.abs(monster.y - racer.y) > 120) continue;
    sfx("unicorn_beam_hit", monster.x);
    applyMonsterKnockback(monster, racer.facing, { unhorse: true });
  }
}

function updateRainbowBeams(dt) {
  for (const beam of state.rainbowBeams) {
    beam.timer -= dt;
    if (beam.owner && isMounted(beam.owner) && beam.owner.horseType === "unicorn" && beam.owner.facing === beam.facing) {
      const horn = unicornHornPoint(beam.owner);
      beam.x1 = horn.x;
      beam.x2 = horn.x + beam.facing * UNICORN_BEAM_RANGE;
      beam.y = horn.y;
    }
  }
  state.rainbowBeams = state.rainbowBeams.filter(beam => beam.timer > 0);
}

function bumpMonstersWithSpecialMounts() {
  for (const racer of state.racers) {
    if (racer.finished || racer.grabbedBy || !isMounted(racer)) continue;
    if (!isHorsingAroundMode() && !mountBeatsTrolls(racer.horseType)) continue;
    if (racer.mountBumpCooldown > 0) continue;
    for (const monster of state.monsters) {
      if (monster.state === "sleeping" || monster.state === "ground") continue;
      const dx = monster.x - racer.x;
      const dy = (monster.y + 54) - (racer.y + 54);
      if (Math.abs(dx) >= 74 || Math.abs(dy) >= 54 || racer.z > 110) continue;
      if (isHorsingAroundMode() ? !isRacerRunningAtMonster(racer, dx) : !mountOutrunsMonster(racer, monster)) continue;
      applyMonsterKnockback(monster, dx >= 0 ? 1 : -1);
      racer.mountBumpCooldown = 0.45;
      break;
    }
  }
}

// A troll's skeleton horse, ridden, knocks over anyone it runs into: dolls
// (riders thrown off their mounts) and monsters. A unicorn, pegasus or
// griffon stands its ground: they collide and both riders fall off.
function bumpWithSkeletonHorses() {
  for (const racer of state.racers) {
    if (racer.horseType !== "skeleton_horse" || !isMounted(racer) || racer.finished || racer.grabbedBy) continue;
    if (racer.mountBumpCooldown > 0 || Math.abs(racer.speed) < HORSE_RUN_SPEED * 0.28) continue;
    const ahead = target => {
      const dx = target.x - racer.x;
      return Math.abs(dx) < 74 && Math.abs(target.y - racer.y) < 54 && Math.abs((target.z || 0) - racer.z) < 90
        && (dx >= 0 ? racer.facing > 0 : racer.facing < 0);
    };
    const direction = racer.facing;
    const other = state.racers.find(r => r !== racer && !r.finished && !r.grabbedBy && r.fallBackTimer <= 0 && ahead(r));
    if (other) {
      racer.mountBumpCooldown = 0.6;
      if (isMounted(other) && ["unicorn", "pegasus", "griffon"].includes(other.horseType)) {
        // Head on into a magical mount: both girls come off.
        sfx("knockback_tumble", racer.x);
        throwOffMount(racer, -direction);
        throwOffMount(other, direction);
      } else {
        sfx("push_impact", other.x);
        throwOffMount(other, direction);
      }
      continue;
    }
    const monster = state.monsters.find(m => !["sleeping", "ground", "fall", "drop"].includes(m.state) && ahead(m));
    if (monster) {
      racer.mountBumpCooldown = 0.6;
      applyMonsterKnockback(monster, direction, { unhorse: true });
    }
  }
}

// Knocked over (off her mount if she's on one, which is left standing).
function throwOffMount(racer, direction) {
  if (isMounted(racer)) dismountIntoPickup(racer);
  racer.fallBackTimer = 0.8;
  racer.fallBackFacing = -direction;
  racer.hitTimer = 0.35;
  racer.knockbackX = direction * PUSH_FORCE;
  racer.vy = Math.max(racer.vy, 160);
  racer.jumpStarted = false;
  racerVoice(racer, "hit", { chance: 0.6, priority: 1 });
}

function isRacerRunningAtMonster(racer, dx) {
  if (Math.abs(racer.speed) < HORSE_RUN_SPEED * 0.28) return false;
  return dx >= 0 ? racer.facing > 0 : racer.facing < 0;
}

function drawRainbowBeam(beam) {
  const x1 = beam.x1 - state.camera;
  const x2 = beam.x2 - state.camera;
  const alpha = clamp(beam.timer / beam.duration, 0, 1);
  const colors = ["#ff3b6f", "#ff9d2f", "#ffe85a", "#42e36f", "#36b8ff", "#9d64ff"];
  ctx.save();
  ctx.globalAlpha = 0.82 * alpha;
  ctx.lineCap = "round";
  // The stripes fan out from a point at the horn tip to full width.
  const dir = Math.sign(x2 - x1) || 1;
  const fan = Math.min(UNICORN_BEAM_FAN, Math.abs(x2 - x1));
  for (let i = 0; i < colors.length; i += 1) {
    const offset = -15 + i * 6;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, beam.y);
    ctx.lineTo(x1 + dir * fan, beam.y + offset);
    ctx.lineTo(x2, beam.y + offset);
    ctx.stroke();
  }
  ctx.restore();
}

// A riderless mount standing where it was left, waiting to be ridden again.
function drawLooseMount(powerup, screenX, t) {
  // (Flashing while it's out of reach, just after a troll was knocked off it.)
  if (powerup.cooldown > 0 && Math.floor(performance.now() / 110) % 2 === 0) return;
  const groundY = powerupDrawY(powerup);
  const horseScale = racerDepthScale({ y: groundY - 54 }) * 1.08;
  const calibration = getMountFrameCalibration(powerup.horseType, 0, 0);
  const horseW = FRAME * horseScale;
  ctx.save();
  ctx.globalAlpha = floorShadowAlpha(0.28);
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, groundY - 12, 70 * horseScale, 16 * horseScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // A soft pulse so it reads as something to pick up.
  drawPowerupGlow("horse", screenX, groundY - 150 * horseScale, groundY - 4, t);
  drawFacingImage(images[powerup.horseType] || images.horse, (Math.floor(t * 0.7) % 3) * FRAME, 0, FRAME, FRAME,
    screenX - SPRITE_ANCHOR_X * horseScale, groundY + 4 - SPRITE_ANCHOR_Y * horseScale + calibration.groundShift * horseScale,
    horseW, horseW, powerup.facing || 1, screenX);
}

// Smoothly exchange the carried running doll for its existing seated pose.
// Using altitude also reverses the transition naturally just before landing.
function broomRideBlend(racer) {
  const t = clamp(racer.z / 85, 0, 1);
  return t * t * (3 - 2 * t);
}

function drawBroomProp(x, y, width, angle, facing, alpha = 1) {
  const image = images.broom;
  const height = width * image.height / image.width;
  const [gx, gy] = window.BROOM_ART.grip;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(facing < 0 ? -1 : 1, 1);
  ctx.rotate(angle);
  ctx.drawImage(image, -width * gx, -height * gy, width, height);
  ctx.restore();
}

// Fairy wings (Fairy Woods): drawn behind her own pose, rooted on her back.
// They flutter on the ground and beat while she flies. The sheet
// (image-requests.md §27 FW1: rows of 6 cells of 512, root at (330, 300):
// 1-2 rest and flutter, 3-6 one wingbeat; row 1 seen from the side, row 2
// three-quarter) is used once "fairy_wings" is listed in TRACK_SHARED_ART;
// until then see-through wings are drawn in code.
const WING_ROOT = [330, 300];
const WING_SCALE = 0.72; // the wing sheet's cells against her frame
const WING_FRONT_SCALE = 0.85; // a facing pair spreads both ways, so a little smaller
const WING_TORSO_HALF = 0.15; // at most this share of her height either side of her middle is torso
const WING_CHEST_BACK = 0.2; // running, the middle of her chest is this share of her height behind her face
const wingRootCache = new Map();

// Her back at shoulder-blade height in each cell of a sheet (frame px,
// facing right): the span of her torso there ([left, right, y]), measured
// once per sheet from its pixels. In each row of a band about two fifths of
// the way down her figure, the torso is the solid run through her middle
// (the middle of her hips), so arms held out clear of her body don't count.
// Also the middle of her chest seen side on (4th value): long hair flying
// behind her runs into that span, but never covers her face, so it's measured
// back from the front of her face (the cheek and nose rows).
function wingRoot(image, sx, sy) {
  let cells = wingRootCache.get(image);
  if (!cells) {
    cells = new Map();
    wingRootCache.set(image, cells);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const c = canvas.getContext("2d", { willReadFrequently: true });
      c.drawImage(image, 0, 0);
      const data = c.getImageData(0, 0, image.width, image.height).data;
      for (let cy = 0; cy + FRAME <= image.height; cy += FRAME) {
        for (let cx = 0; cx + FRAME <= image.width; cx += FRAME) {
          const solid = (x, y) => data[((cy + y) * image.width + cx + x) * 4 + 3] > 60;
          let top = -1, bottom = -1;
          for (let y = 0; y < FRAME; y += 2) {
            for (let x = 0; x < FRAME; x += 3) if (solid(x, y)) { if (top < 0) top = y; bottom = y; break; }
          }
          if (top < 0) continue;
          const height = bottom - top;
          const hips = [];
          for (let y = Math.round(top + 0.5 * height); y <= top + 0.6 * height; y += 2) for (let x = 0; x < FRAME; x += 2) if (solid(x, y)) hips.push(x);
          if (!hips.length) continue;
          hips.sort((a, b) => a - b);
          const middle = hips[Math.floor(hips.length / 2)];
          const from = Math.round(top + 0.36 * height), to = Math.round(top + 0.42 * height);
          let left = 0, right = 0, rows = 0;
          for (let y = from; y <= to; y += 2) {
            if (!solid(middle, y)) continue;
            let l = middle, r = middle;
            while (l > 0 && solid(l - 1, y)) l -= 1;
            while (r < FRAME - 1 && solid(r + 1, y)) r += 1;
            // (An arm against her side or long hair down her back joins the
            // run; a torso is never wider than this.)
            left += Math.max(l, middle - WING_TORSO_HALF * height);
            right += Math.min(r, middle + WING_TORSO_HALF * height);
            rows += 1;
          }
          const faces = [];
          for (let y = Math.round(top + 0.1 * height); y <= top + 0.22 * height; y += 2) {
            for (let x = FRAME - 1; x > 0; x -= 1) if (solid(x, y)) { faces.push(x); break; }
          }
          faces.sort((a, b) => a - b);
          const chest = faces.length ? faces[Math.floor(faces.length / 2)] - WING_CHEST_BACK * height : null;
          if (rows) cells.set(`${cx},${cy}`, [left / rows, right / rows, (from + to) / 2, chest]);
        }
      }
    } catch (error) {
      // Unreadable pixels (opened from file://): the fixed spot below.
    }
  }
  if (!image.complete || !image.width) wingRootCache.delete(image);
  return cells.get(`${sx},${sy}`) || [SPRITE_ANCHOR_X - 60, SPRITE_ANCHOR_X + 30, FRAME * 0.45];
}

// Where on her back the wings join, across her torso's span from its back
// (left, facing right): the middle of her back is towards the back edge
// seen side on, nearer the middle seen three-quarter, and in the middle
// seen from the front (a mirrored pair, once that art is in).
const WING_ROOT_ACROSS = [0.28, 0.4, 0.5];

// How her pose is turned, for the wings: side on (0) while she runs or is
// knocked about (sprites rows 1 and 3), from the front (2) standing (row 0:
// a mirrored pair of the single wing), three-quarter (1) jumping, in her
// actions poses, and on a troll.
function wingView(wearer, image, sy) {
  if (wearer.sheet !== image) return 1;
  return [2, 0, 1, 0][Math.round(sy / FRAME)] ?? 1;
}

// A wing sheet in this track's style (tracks.js wingStyle: Fairy Woods'
// "twilight" wings, image-requests.md §27 FW2) once that's in, else the
// pastel wings (FW1).
function getWingArt(name) {
  const style = getTrackTheme().wingStyle;
  const styled = style && getSharedArt(`${name}_${style}`);
  return styled?.complete && styled.width ? styled : getSharedArt(name);
}

// (A winged troll, too: he has no horseTimer and never flashes.)
function isWingFlying(racer) {
  return racer.z > 8 || racer.pegasusGliding;
}

// Wings for her pose (cell sx, sy of image) drawn at (x, y) w px wide.
function drawFairyWings(racer, image, sx, sy, x, y, w, facing, screenX) {
  const [left, right, ry, chest] = wingRoot(image, sx, sy);
  // Running (sprites row 2), on the middle of her chest, whatever her hair does behind her.
  const running = image === racer.sheet && sy === FRAME && chest != null;
  const rx = running ? chest : left + (right - left) * WING_ROOT_ACROSS[wingView(racer, image, sy)];
  const k = w / FRAME;
  const t = performance.now() / 1000 + (racer.playerIndex || 0) * 0.37;
  const flying = isWingFlying(racer);
  const wingTime = wearsWingsOver(racer) ? racer.wingsTimer : racer.horseTimer;
  const flashing = wingTime < HORSE_FLASH_TIME && Math.floor(performance.now() / 110) % 2 === 0;
  if (flashing) return;
  const rootX = screenX + (x + rx * k - screenX) * facing;
  const rootY = y + ry * k;
  const sheet = getWingArt("fairy_wings");
  ctx.save();
  ctx.translate(rootX, rootY);
  ctx.scale(facing < 0 ? -1 : 1, 1);
  const view = wingView(racer, image, sy);
  drawWingGlow(racer, k, t, view, flying, rootX, rootY, facing);
  const single = view === 2 ? getWingArt("fairy_wing_single") : null;
  const index = flying ? 2 + Math.floor(t * 18) % 4 : Math.floor(t * 5) % 2;
  if (single?.complete && single.width) {
    // Facing us: one wing out to each side of her spine.
    const cell = single.width / 6;
    const size = cell * k * WING_SCALE * WING_FRONT_SCALE;
    for (const side of [1, -1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.drawImage(single, index * cell, 0, cell, cell, -WING_ROOT[0] / cell * size, -WING_ROOT[1] / cell * size, size, size);
      ctx.restore();
    }
  } else if (sheet?.complete && sheet.width) {
    const cell = sheet.width / 6;
    const row = Math.min(view, 1, Math.round(sheet.height / cell) - 1);
    const size = cell * k * WING_SCALE;
    ctx.drawImage(sheet, index * cell, row * cell, cell, cell, -WING_ROOT[0] / cell * size, -WING_ROOT[1] / cell * size, size, size);
  } else {
    // Flying, a full beat; otherwise a gentle flutter.
    const beat = flying ? Math.sin(t * 28) * 0.55 : Math.sin(t * 9) * 0.07;
    drawWingStandIn(k, beat - 0.12, 0.8, 0.82);
    drawWingStandIn(k, beat, 1, 1);
  }
  ctx.restore();
}

// A fairy glow behind her wings (drawn at their root, in the wings' own
// space: facing right, wings back to the left): a soft light that breathes,
// brighter as they beat, and sparkles that drift off them now and then, in
// the colours of this track's wings.
const WING_GLOW = {
  pastel: { glow: ["rgba(255, 196, 240, 0.9)", "rgba(214, 196, 255, 0.55)"], sparkles: ["#fff6ff", "#ffc8f0", "#d9ccff", "#c6fff6"] },
  twilight: { glow: ["rgba(186, 132, 255, 0.9)", "rgba(120, 214, 255, 0.55)"], sparkles: ["#ffffff", "#d7b8ff", "#9fe8ff", "#ffe7a8"] }
};
const WING_SPARKLE_EVERY = 0.07; // seconds between sparkles on the ground (three times as often flying)
function drawWingGlow(racer, k, t, view, flying, rootX, rootY, facing) {
  const style = WING_GLOW[getTrackTheme().wingStyle] || WING_GLOW.pastel;
  const size = 512 * k * WING_SCALE;
  const cx = view === 2 ? 0 : -0.3 * size, cy = -0.25 * size;
  const pulse = 0.75 + 0.25 * Math.sin(t * (flying ? 9 : 3));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha *= pulse * (flying ? 1 : 0.75);
  const radius = size * (view === 2 ? 1 : 0.85);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  glow.addColorStop(0, style.glow[0]);
  glow.addColorStop(0.45, style.glow[1]);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Sparkles: world-space particles from a spot on the wings, timed by the
  // clock (drawing happens every frame, not every update).
  const now = performance.now() / 1000;
  if (!state.running || now < (racer.wingSparkleAt || 0)) return;
  racer.wingSparkleAt = now + WING_SPARKLE_EVERY / (flying ? 3 : 1) * (0.6 + Math.random() * 0.8);
  const across = view === 2 ? (Math.random() - 0.5) * 1.1 : -(0.05 + Math.random() * 0.5);
  const sx = rootX + across * size * facing;
  const sy = rootY - Math.random() * 0.5 * size;
  const groundY = racer.y + 54;
  spawnParticles(sx + state.camera, groundY, groundY - sy, 1, {
    kind: "spark", color: style.sparkles[Math.floor(Math.random() * style.sparkles.length)],
    speed: 25, lift: flying ? 10 : 40, gravity: 40, life: 0.9 + Math.random() * 0.7, size: (3.5 + Math.random() * 3.5) * k * 2.4, fallThrough: true
  });
}

// One code-drawn wing (upper and lower lobe) rising up and back from the
// root, swung by `angle` (radians, positive lowers it).
function drawWingStandIn(k, angle, shade, size) {
  ctx.save();
  ctx.rotate(angle);
  ctx.scale(size, size);
  ctx.globalAlpha *= 0.62 * shade;
  const gradient = ctx.createLinearGradient(0, 0, -150 * k, -170 * k);
  gradient.addColorStop(0, "#f7c6ec");
  gradient.addColorStop(0.55, "#d8c8ff");
  gradient.addColorStop(1, "#bff3f0");
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3 * k;
  for (const [length, width, tilt] of [[215, 74, -2.2], [130, 50, -2.95]]) {
    ctx.save();
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.ellipse(length * k / 2, 0, length * k / 2, width * k / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// The wings lying as a pickup: resting, bobbing gently.
function drawWingsPickup(x, y, t) {
  ctx.save();
  ctx.translate(x - 26, y);
  const sheet = getWingArt("fairy_wings");
  if (sheet?.complete && sheet.width) {
    const cell = sheet.width / 6;
    ctx.drawImage(sheet, (Math.floor(t * 1.6) % 2) * cell, 0, cell, cell, -WING_ROOT[0] / cell * 120, -WING_ROOT[1] / cell * 120 + 30, 120, 120);
  } else {
    const beat = Math.sin(t * 3) * 0.08;
    ctx.translate(0, 30);
    drawWingStandIn(0.45, beat - 0.12, 0.8, 0.82);
    drawWingStandIn(0.45, beat, 1, 1);
  }
  ctx.restore();
}

function drawBroomRacer(racer, screenX, scale, facing) {
  const blend = broomRideBlend(racer);
  const row = racer.moving ? 1 : 0;
  const col = racer.frame;
  const hand = (window.BROOM_ART.carryHands[characters[racer.spriteKey]?.assetKey || racer.spriteKey] || window.BROOM_ART.carryHands.lily)[row][col];
  const groundX = screenX - SPRITE_ANCHOR_X * scale;
  const groundY = racer.y + 54 - SPRITE_ANCHOR_Y * scale - racer.z;
  // Reuse the calibrated saddle offsets for every doll, including outfit sheets.
  const riderScale = scale * 0.7;
  const riderX = screenX - SPRITE_ANCHOR_X * riderScale + (9 + racer.riderXOffset) * scale;
  const riderY = racer.y + 58 - SPRITE_ANCHOR_Y * scale * 1.08 - racer.z - 60 * scale + racer.riderYOffset * scale;
  const carryX = groundX + hand[0] * scale;
  const carryY = groundY + hand[1] * scale;
  const seatX = screenX + (MOUNT_SEAT_REFERENCE.x - SPRITE_ANCHOR_X) * scale * 1.08;
  // Let the shaft sit beneath the seated thighs rather than across the lap.
  const seatY = racer.y + 58 + (MOUNT_SEAT_REFERENCE.y - SPRITE_ANCHOR_Y) * scale * 1.08 - racer.z + 18 * scale;
  const propX = carryX + (seatX - carryX) * blend;
  const propY = carryY + (seatY - carryY) * blend;
  const flashing = racer.horseTimer < HORSE_FLASH_TIME && Math.floor(performance.now() / 110) % 2 === 0;
  const drawProp = alpha => drawBroomProp(screenX + (propX - screenX) * facing, propY, (295 + 50 * blend) * scale, -0.20 - 0.16 * blend, facing, alpha);
  if (!flashing && blend > 0) drawProp(blend);
  if (blend < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - blend;
    drawFacingImage(racer.sheet, col * FRAME, row * FRAME, FRAME, FRAME, groundX, groundY, FRAME * scale, FRAME * scale, facing, screenX);
    ctx.restore();
    if (!flashing) {
      // Carry in front of skirts and long hair, then restore the gripping hand
      // over the shaft so it reads as held rather than pasted over the doll.
      drawProp(1 - blend);
      ctx.save();
      ctx.globalAlpha *= 1 - blend;
      const hx = hand[0] - 12, hy = hand[1] - 15;
      drawFacingImage(racer.sheet, col * FRAME + hx, row * FRAME + hy, 24, 30,
        groundX + hx * scale, groundY + hy * scale, 24 * scale, 30 * scale, facing, screenX);
      ctx.restore();
    }
  }
  if (blend > 0) {
    ctx.save();
    ctx.globalAlpha *= blend;
    drawFacingImage(racer.sheet, 0, 3 * FRAME, FRAME, FRAME, riderX, riderY, FRAME * riderScale, FRAME * riderScale, facing, screenX);
    if (racer.moonBootsTimer > 0) drawMoonBootsOn(racer, "sprites", 9, riderX, riderY, FRAME * riderScale, facing, screenX);
    ctx.restore();
  }
}

function getMountFrameCalibration(horseType, row, col) {
  const table = MOUNT_FRAME_CALIBRATION[horseType] || MOUNT_FRAME_CALIBRATION.horse;
  const entry = table[row]?.[col] || table[0][0];
  return { seatX: entry[0], seatY: entry[1], groundShift: entry[2] };
}

// The moon buggy's bounce, shared by the driver and chassis (bob in px, down
// positive; tilt in radians, nose up negative when facing right). Driving, it
// hops over the bumps in the low gravity; in the air its nose points up as it
// rises and down as it falls; landing, it squashes down and its nose kicks up.
// Parked, it sits still. The suspension and wheels are in the art.
function roverMotion(racer, scale) {
  if (racer.horseType !== "moon_buggy") return { bob: 0, tilt: 0 };
  if (racer.roverLandTimer > 0 && racer.z === 0) {
    // Nose-down from the fall, it levels out as it squashes down, then
    // springs back up with the nose kicking up a little.
    const p = 1 - racer.roverLandTimer / ROVER_LANDING_TIME;
    const squash = p < 0.625 ? Math.sin(Math.PI * p / 0.625) : -0.35 * Math.sin(Math.PI * (p - 0.625) / 0.375);
    const tilt = 0.2 * Math.max(0, 1 - p * 3) - 0.06 * Math.sin(Math.PI * p);
    return { bob: squash * ROVER_LANDING_SQUASH * scale, tilt: tilt * racer.facing };
  }
  if (isDrawnJumping(racer)) return { bob: 0, tilt: -clamp(racer.vy / 3000, -0.2, 0.2) * racer.facing };
  if (!racer.moving) return { bob: 0, tilt: 0 };
  const phase = racer.x / ROVER_BUMP_SPACING;
  return { bob: -Math.abs(Math.sin(phase)) * ROVER_BOUNCE * scale, tilt: Math.sin(phase) * 0.035 * racer.facing };
}
