// Mounts: horses and themed ponies, unicorns, pegasi, gryphons and broomsticks, the wizard-mount unlock, dismounting, and the unicorn rainbow.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

// Tracks where everyone rides a horse all race (tracks.js startMounted).
// Riders there use power-ups, and a mount pickup swaps in a special mount for
// a while before they're back on their horse.
function isAlwaysMountedTrack() {
  return Boolean(getTrackTheme().startMounted);
}

// Whether this racer can pick up and use power-ups: on foot, anywhere riders
// may (Horse Show, Horsing Around), on a broomstick, which she runs with, or
// on a unicorn.
function canRacerUsePowerups(racer) {
  return !isMounted(racer) || canMountedRacersUsePowerups() || racer.horseType === "broom" || racer.horseType === "unicorn";
}

function canMountedRacersUsePowerups() {
  return isHorsingAroundMode() || isAlwaysMountedTrack();
}

function isHorsingAroundMode() {
  return state.specials === "horsing";
}

function isFlyingMountType(type) {
  return type === "pegasus" || type === "griffon" || type === "broom";
}

function mountLabel(type) {
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

function mountOutrunsMonster(racer, monster) {
  return isMounted(racer) && mountBeatsTrolls(racer.horseType) && Math.abs(racer.speed || 0) > monsterSpeed(monster);
}

const DEFAULT_MOUNT_ODDS = { unicorn: 0.1, pegasus: 0.1, griffon: 0.05, broom: 0.05 };

function chooseHorseType() {
  if (state.specials === "unicorn") return "unicorn";
  if (isFlyingMountType(state.specials)) return state.specials;
  const odds = { ...(getTrackTheme().mountOdds || DEFAULT_MOUNT_ODDS) };
  // Gryphons and broomsticks only turn up elsewhere once a Wizard School race
  // has been finished on this device; their chance goes to the plain horse.
  if (!getTrackTheme().unlocksWizardMounts && !areWizardMountsUnlocked()) {
    for (const type of WIZARD_MOUNTS) delete odds[type];
  }
  // Everyone already rides a horse there, so the pickup is always a special mount.
  const total = isAlwaysMountedTrack() ? Object.values(odds).reduce((sum, chance) => sum + chance, 0) : 1;
  let roll = Math.random() * total;
  for (const [type, chance] of Object.entries(odds)) {
    if (roll < chance) return type;
    roll -= chance;
  }
  // A track's baseMount stands in for the horse: the Toy Room's rocking horse,
  // or a pick from a list (Wizard School's gryphons and broomsticks).
  const base = getTrackTheme().baseMount;
  if (Array.isArray(base)) return base[Math.floor(Math.random() * base.length)];
  return base || "horse";
}

const WIZARD_MOUNTS = ["griffon", "broom"];

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
  return HORSE_DURATION;
}

function getHorseJumpPower(racer) {
  if (racer.moonBootsTimer > 0) return HORSE_JUMP_POWER * MOON_BOOTS_JUMP_SCALE;
  if (!canRacerUsePowerups(racer)) return HORSE_JUMP_POWER;
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
    if (ahead && amandaAt(obstacle.x, racer.y + 54, 1) === obstacle) hitAmanda(obstacle, racer.facing);
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
  const groundY = powerupDrawY(powerup);
  const horseScale = racerDepthScale({ y: groundY - 54 }) * 1.08;
  const calibration = getMountFrameCalibration(powerup.horseType, 0, 0);
  const horseW = FRAME * horseScale;
  ctx.save();
  ctx.globalAlpha = 0.28;
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
