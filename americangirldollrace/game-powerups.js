// Power-up pickups: placement, what each looks like and does, skates and pogo sticks, snowballs, and the storm and reward clouds.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

// What a pickup looks like on this track: its icon sheet (null for the
// original icons), the name it pops up with, and its pickup sound.
//  - Speed and high jump keep the original icon, name and sound unless the
//    track changes how they work: skates, an item (surfboard, wind-up key,
//    spell book) or moon boots.
//  - A pogo stick always shows the Toy Room's red pogo icon, the stick the
//    dolls ride (POGO_ICON_TRACK).
//  - The rest (EMP, oil, snowballs) take the track's own look.
// A track's own icons, names (tracks.js labels) and sounds apply only once its
// power-up art is showing.
const PICKUP_DEFAULTS = {
  jump: ["HIGH JUMP", "powerup_highjump"],
  boost: ["BOOST", "powerup_boost"],
  emp: ["EMP", "powerup_emp"],
  oil: ["OIL", null],
  snowball: ["SNOWBALLS", "powerup_snowball_pickup"]
};

// Whose power-up sheet the pogo icon comes from: its red pogo stick matches
// the one on the dolls' toys sheets.
const POGO_ICON_TRACK = "toyroom";

const PICKUP_ITEM_NAMES = { spellBook: "MAGIC WAND", surfboard: "SURFBOARD", windupCars: "WIND-UP CARS", skates: "SKATES", moonBoots: "MOON BOOTS" };

function pickupLook(type, { pogo = false } = {}) {
  const theme = getTrackTheme();
  const art = getTrackArt("powerups");
  const [label, sound] = PICKUP_DEFAULTS[type] || [type.toUpperCase(), null];
  if (type === "jump" && pogo) {
    return { sheet: images[trackArtKey(POGO_ICON_TRACK, "powerups")] || null, label: "POGO", sound: "pickup_pogo" };
  }
  const change = type === "jump" ? theme.itemEffects?.jump || (theme.moonBoots ? "moonBoots" : null)
    : type === "boost" ? theme.itemEffects?.boost || theme.rideToys?.boost
    : "own";
  if (!change) return { sheet: null, label, sound };
  const name = PICKUP_ITEM_NAMES[change] || label;
  if (!art) return { sheet: null, label: name, sound };
  return { sheet: art, label: theme.labels?.[type] || name, sound: theme.sounds?.[type] || sound };
}

// The power-up kinds a track hands out (tracks.js noPowerups leaves some out,
// e.g. the Toy Room has no EMP: its wind-up cars do much the same).
function trackPowerupTypes(types) {
  const skip = getTrackTheme().noPowerups || [];
  return types.filter(type => !skip.includes(type));
}

function makePowerups() {
  const powerups = [];
  const trackTypes = trackPowerupTypes(POWERUP_TYPES);
  const powerupTypes = state.difficulty === "too-many"
    ? ["oil", "monster"]
    : state.difficulty === "extra"
    ? [...trackTypes, "monster"]
    : trackTypes;
  // Define your custom weights
  const POWERUP_WEIGHTS = {
    "jump": 0.7,
    "boost": 1.2,
    "horse": 0.7,
    "monster": 0.45,
  };
  for (const type of powerupTypes) {
    if (!POWERUP_WEIGHTS[type]) {
      POWERUP_WEIGHTS[type] = 1.0;
    }
  }

  // Calculate the total sum of all weights
  const totalWeight = powerupTypes.reduce((sum, type) => sum + (POWERUP_WEIGHTS[type] || 1.0), 0);

  let x = POWERUP_START_X + Math.random() * 260;
  for (let index = 0; x < FINISH - POWERUP_END_PADDING; index += 1) {
    
    // --- START WEIGHTED SELECTION ---
    let randomNum = Math.random() * totalWeight;
    let selectedType = powerupTypes[0]; // Fallback

    for (const type of powerupTypes) {
      const weight = POWERUP_WEIGHTS[type] || 1.0; // Default to 1 if not set
      if (randomNum < weight) {
        selectedType = type;
        break;
      }
      randomNum -= weight;
    }
    // --- END WEIGHTED SELECTION ---

    const spawnY = randomPowerupY();
    const spawnX = clearOfHurdles(x + (Math.random() - 0.5) * 90, spawnY);
    if (selectedType === "monster" && spawnX >= MONSTER_COURSE_START_X) {
      state.monsters.push(spawnMonster(spawnX, spawnY, { active: false }));
    } else {
      const powerupType = selectedType === "monster" ? trackTypes[index % trackTypes.length] : selectedType;
      powerups.push(makePowerup(powerupType, spawnX, spawnY));
    }
    x += POWERUP_MIN_GAP + Math.random() * POWERUP_RANDOM_GAP;
  }
  return powerups;
}

function makePowerup(type, x, y, options = {}) {
  return {
    x,
    y,
    type,
    horseType: type === "horse" ? chooseHorseType() : "horse",
    pogo: type === "jump" && boardJumpIsPogo(),
    taken: false,
    spin: Math.random() * Math.PI * 2,
    dropTimer: 0,
    dropDuration: options.dropDuration || 0,
    dropStartY: options.dropStartY || y
  };
}

// Each race's high-jump pickups are all springs or all pogo sticks (about
// half of races each, on any board), so a board never shows both; not where
// the jump pickup is its own item (the spell book) or everyone rides (Horse
// Show). On Moon Base the spring's place is taken by moon boots.
const POGO_SHARE = 0.5;

function boardJumpIsPogo() {
  return pogoEligible() && Boolean(state.jumpPogo);
}

function pogoEligible(background = getCurrentBackground()) {
  const theme = getTrackTheme(background);
  return !theme.itemEffects?.jump && !theme.startMounted;
}

function getRideToy(powerupType) {
  return powerupType === "jump" ? null : getTrackTheme().rideToys?.[powerupType] || null;
}

// Toys keep the order they were picked up in; picking one up again refreshes it.
function addRideToy(racer, type, duration) {
  const existing = racer.rideToys.find(toy => toy.type === type);
  if (existing) existing.timer = Math.max(existing.timer, duration);
  else racer.rideToys.push({ type, timer: duration });
  getRideToySheet(racer);
}

// The doll's skates/pogo sheet (outfit-recoloured), or null until it's listed
// in RIDE_TOY_SHEETS and loaded.
function getRideToySheet(racer) {
  const assetKey = dollAssetKey(racer.spriteKey);
  if (!(window.RIDE_TOY_SHEETS || []).includes(assetKey)) return null;
  if (racer.outfit && window.DollOutfits) return DollOutfits.getSync(racer.spriteKey, "toys", racer.outfit);
  loadArtOnce(`toys_${assetKey}`, `assets/doll_${assetKey}_toys.webp?v=${window.RIDE_TOY_ART_VERSION || "1"}`);
  return images[`toys_${assetKey}`] || null;
}

// Which toys-sheet cell to draw (and how high to lift it), or null to draw
// the doll normally.
function getRideToyPose(racer, jumping) {
  // Menu preview dolls have no rideToys.
  const toy = racer.rideToys?.[0]?.type;
  if (!toy || racer.grabbedBy || isMounted(racer)) return null;
  const sheet = getRideToySheet(racer);
  if (!sheet) return null;
  if (toy === "skates") {
    if (racer.fallBackTimer > 0) return { sheet, row: 1, col: 2, lift: 0 };
    if (racer.pushTimer > 0) return { sheet, row: 1, col: 1, lift: 0 };
    if (jumping) return { sheet, row: 0, col: 1, lift: 0 };
    if (racer.moving) return { sheet, row: 0, col: Math.floor(racer.toyDistance / SKATE_STRIDE_PX) % 3, lift: 0 };
    return { sheet, row: 1, col: 0, lift: 0 };
  }
  if (racer.fallBackTimer > 0) return { sheet, row: 3, col: 2, lift: 0 };
  if (racer.pushTimer > 0) return { sheet, row: 3, col: 1, lift: 0 };
  if (jumping) return { sheet, row: 2, col: 2, lift: 0 };
  if (racer.frozenTimer > 0 || racer.oilTimer > 0) return { sheet, row: 3, col: 0, lift: 0 };
  // Always bouncing: compressed at the bottom of each hop, airborne at the top.
  const hop = Math.abs(Math.sin(racer.pogoPhase));
  const col = hop < 0.25 ? 0 : hop < 0.7 ? 1 : 2;
  return { sheet, row: 2, col, lift: hop * POGO_BOUNCE_HEIGHT };
}

function updateRacerPowerupEffects(racer, dt) {
  if (racer.spellAim) {
    // The wand is charged: sparkles swirl round her hand until she aims.
    const hand = getThrowHand(racer) || { x: racer.x + racer.facing * 40, y: racer.y - 60 - racer.z };
    const angle = racer.spellAim.t * 9;
    const radius = 26 * racerDepthScale(racer);
    for (let i = 0; i < 2; i += 1) {
      const a = angle + i * Math.PI;
      spawnParticles(hand.x + Math.cos(a) * radius, hand.y + Math.sin(a) * radius * 0.6, 0, 1, { color: i ? "#c48bff" : "#ffd84a", speed: 20, lift: 30, life: 0.4, size: 4.5, gravity: 0 });
    }
  }
  if (racer.castTimer > 0 && Math.random() < 0.7) {
    const tip = wandTip(racer);
    spawnParticles(tip.x, tip.y, 0, 1, { color: Math.random() < 0.5 ? "#ffd84a" : "#c48bff", speed: 70, lift: 90, life: 0.45, size: 5, gravity: 200 });
  }
  const boosted = racer.speedBoostTimer > 0 && racer.moving;
  // After-images: a short history of what was drawn, sampled over time.
  racer.ghostTimer += dt;
  if (racer.ghostTimer >= SPEED_GHOST_INTERVAL) {
    racer.ghostTimer = 0;
    if (boosted && racer.lastBody) {
      racer.ghosts.push({ ...racer.lastBody, x: racer.x, y: racer.y, z: racer.z });
      if (racer.ghosts.length > SPEED_GHOST_COUNT) racer.ghosts.shift();
    } else if (racer.ghosts.length > 0) {
      racer.ghosts.shift();
    }
  }
  // High jump (or moon boots) ready: a gentle fizz of sparks rising from her
  // feet on the ground, so it's clear she can jump high; jumping bursts them.
  racer.jumpSparkleTimer = (racer.jumpSparkleTimer || 0) - dt;
  const springy = racer.highJumpTimer > 0 || racer.moonBootsTimer > 0;
  if (springy && (racer.z <= 0 || racer.onObstacle) && racer.jumpSparkleTimer <= 0) {
    racer.jumpSparkleTimer = 0.045;
    const color = racer.moonBootsTimer > 0 ? MOON_BOOTS_COLOR : POWERUP_GLOW_COLORS.jump;
    const spread = 22 * racerDepthScale(racer) * 2;
    spawnParticles(racer.x + (Math.random() - 0.5) * spread, racer.y + 54, racer.z + 2, 1, { color, speed: 22, lift: 190, life: 0.6, size: 4.5, gravity: 170 });
  }
  racer.sparkleTimer -= dt;
  if (racer.sparkleTimer > 0) return;
  if (boosted && racer.z < 10) {
    racer.sparkleTimer = 0.06;
    spawnParticles(racer.x - racer.facing * 18, racer.y + 54, 4, 1, { color: POWERUP_GLOW_COLORS.boost, speed: 60, lift: 120, life: 0.45, size: 4, dirX: -racer.facing });
  } else if (racer.z > 8 && racer.vy > -200 && (racer.highJumpTimer > 0 || racer.moonBootsTimer > 0)) {
    racer.sparkleTimer = 0.05;
    const color = racer.moonBootsTimer > 0 ? MOON_BOOTS_COLOR : POWERUP_GLOW_COLORS.jump;
    spawnParticles(racer.x, racer.y + 54, racer.z, 1, { color, speed: 40, lift: 0, life: 0.5, size: 4, gravity: 120 });
  }
}

function getBoostMultiplier(racer) {
  const stacks = racer.speedBoostStacks.length;
  return stacks > 0 ? 1 + stacks * 0.45 : 1;
}

function pogoStompMonsters(racer, previousZ, mounted) {
  if (mounted || racer.vy > 0 || previousZ < POGO_STOMP_HEAD_Z || racer.z > POGO_STOMP_HEAD_Z) return;
  if (!racer.rideToys.some(toy => toy.type === "pogo")) return;
  for (const monster of state.monsters) {
    if (!monster.active || ["sleeping", "ground", "fall", "drop"].includes(monster.state)) continue;
    if (Math.abs(monster.x - racer.x) > POGO_STOMP_RANGE_X || Math.abs(monster.y - racer.y) > POGO_STOMP_RANGE_Y) continue;
    stunMonsterWithEmp(monster);
    racer.z = POGO_STOMP_HEAD_Z;
    racer.vy = getJumpPower(racer) * POGO_STOMP_BOUNCE;
    racer.jumpStarted = true;
    racer.jumpFrame = 0;
    racer.landingTimer = 0;
    sfx("pogo_boing", racer.x);
    spawnParticles(racer.x, racer.y + 54, racer.z, 14, { color: POWERUP_GLOW_COLORS.jump, speed: 200, lift: 160, life: 0.5 });
    if (racer.playerIndex !== undefined && !racer.ai) racerVoice(racer, "jump_big", { chance: 0.6 });
    return;
  }
}

function getJumpPower(racer) {
  if (racer.moonBootsTimer > 0) return JUMP_POWER * MOON_BOOTS_JUMP_SCALE;
  const stacks = racer.highJumpStacks.length;
  return stacks > 0 ? JUMP_POWER * (1 + stacks * 0.35) : JUMP_POWER;
}

function applyPowerup(racer, powerupOrType) {
  const type = typeof powerupOrType === "string" ? powerupOrType : powerupOrType.type;
  if (hasActivePowerup(racer, type)) return false;
  // A spare or left-behind mount is only for someone without one.
  if (type === "horse" && powerupOrType.loose && isMounted(racer)) return false;
  // A unicorn rider keeps her unicorn rather than swap it for another mount.
  if (type === "horse" && isMounted(racer) && racer.horseType === "unicorn") return false;
  playPowerupAudio(racer, type, typeof powerupOrType === "string" ? null : powerupOrType);
  const itemEffect = (type === "boost" || type === "jump") && getTrackTheme().itemEffects?.[type];
  if (itemEffect && !isMounted(racer)) return applyItemEffect(racer, itemEffect, type);
  if (type === "boost") {
    const toy = getRideToy("boost");
    const duration = 4 * (toy ? RIDE_TOY_DURATION_MULTIPLIER : 1);
    racer.speedBoostStacks.push(duration);
    if (toy) addRideToy(racer, toy, duration);
    racer.speedBoostTimer = Math.max(...racer.speedBoostStacks);
    const label = pickupLook("boost").label;
    racer.powerupMessage = racer.speedBoostStacks.length > 1 ? `${label} x${racer.speedBoostStacks.length}` : label;
  } else if (type === "jump") {
    const pogo = typeof powerupOrType === "string" ? boardJumpIsPogo() : powerupOrType.pogo;
    if (getTrackTheme().moonBoots && !pogo) {
      racer.moonBootsTimer = Math.max(racer.moonBootsTimer, MOON_BOOTS_DURATION);
      racer.powerupMessage = pickupLook("jump").label;
      return true;
    }
    const toy = pogo && !isMounted(racer) ? "pogo" : null;
    const duration = 5 * (toy ? RIDE_TOY_DURATION_MULTIPLIER : 1);
    racer.highJumpStacks.push(duration);
    if (toy) addRideToy(racer, toy, duration);
    racer.highJumpTimer = Math.max(...racer.highJumpStacks);
    const label = toy ? "POGO" : pickupLook("jump").label;
    racer.powerupMessage = racer.highJumpStacks.length > 1 ? `${label} x${racer.highJumpStacks.length}` : label;
  } else if (type === "emp") {
    racer.empTimer = 0.45;
    racer.powerupMessage = pickupLook("emp").label;
    const originX = typeof powerupOrType === "string" ? racer.x : powerupOrType.x;
    const inRange = target => Math.abs(target.x - originX) <= EMP_RANGE;
    const visibleMonsters = state.monsters.filter(monster => monster.active && isMonsterEmpTarget(monster) && inRange(monster));
    const hit = [];
    if (visibleMonsters.length > 0) {
      for (const monster of visibleMonsters) {
        if (monster.state === "sleeping" || monster.state === "ground") continue;
        stunMonsterWithEmp(monster);
        hit.push(monster);
      }
    } else {
      for (const other of state.racers) {
        if (other === racer || other.finished || !inRange(other)) continue;
        applyEmpHit(racer, other);
        hit.push(other);
      }
    }
    const label = pickupLook("emp").label;
    if (!hit.length) {
      // Nobody around to zap: it zaps her instead.
      shockEmpPresser(racer);
      hit.push(racer);
      racer.powerupMessage = `${label}: OOPS!`;
    }
    if (hit.length) {
      // The effect starts at the trigger she took, not at her.
      const from = typeof powerupOrType === "string" ? null : { x: powerupOrType.x, y: powerupDrawY(powerupOrType) - 26 };
      state.empArcs.push({
        from,
        source: racer,
        targets: hit,
        t: 0,
        style: label === "EMP" ? "lightning" : getTrackTheme().empStyle || "sparks",
        wand: /WAND/.test(label)
      });
    }
  } else if (type === "oil") {
    if (isMounted(racer) && isHorsingAroundMode()) {
      racer.oilTimer = 0;
      racer.powerupMessage = `${pickupLook("oil").label} BLOCKED`;
      sfx("powerup_blocked", racer.x);
      return true;
    }
    sfx(getTrackTheme().oilEffect === "sticky" ? "sticky_squelch" : "oil_splat", racer.x);
    racerVoice(racer, "slip", { chance: 0.8, priority: 1 });
    racer.oilTimer = OIL_SLIDE_DURATION;
    racer.knockbackX = 0;
    // Sticky puddles (honey, jam, mud…) hold the feet where they landed and
    // tip the doll forward; slippery ones slide her along on her heels.
    racer.oilSticky = getTrackTheme().oilEffect === "sticky";
    if (racer.oilSticky) {
      racer.oilVelocity = 0;
      if (typeof powerupOrType === "object" && Number.isFinite(powerupOrType.x)) racer.x = powerupOrType.x;
    } else {
      sfx("oil_slip_start", racer.x);
      racer.oilVelocity = Math.max(160, Math.abs(racer.speed), OIL_SLIDE_SPEED) * (racer.facing < 0 ? -1 : 1);
      racer.fallBackTimer = OIL_SLIDE_DURATION;
      racer.fallBackFacing = racer.oilVelocity < 0 ? -1 : 1;
    }
    racer.powerupMessage = pickupLook("oil").label;
  } else if (type === "snowball") {
    racer.snowballs += SNOWBALL_PICKUP_COUNT;
    racer.powerupMessage = `${pickupLook("snowball").label} x${racer.snowballs}`;
  } else if (type === "horse") {
    const loose = typeof powerupOrType === "string" ? null : powerupOrType.mountTime;
    racer.horseType = typeof powerupOrType === "string" ? chooseHorseType() : powerupOrType.horseType || "horse";
    racer.horseTimer = loose !== undefined && loose !== null ? loose : horseDurationForType(racer.horseType);
    if (isAlwaysMountedTrack() && racer.horseType === "horse") racer.horseTimer = Infinity;
    racer.dismounted = false;
    racer.frozenTimer = 0;
    racer.fallBackTimer = racer.oilTimer > 0 ? racer.fallBackTimer : 0;
    racer.knockbackX = 0;
    racer.pegasusGliding = false;
    racer.powerupMessage = mountLabel(racer.horseType);
    playMountAudio(racer);
  }
  return true;
}

function hasActivePowerup(racer, type) {
  if (type === "boost") return false;
  if (type === "jump") return false;
  if (type === "emp") return racer.empTimer > 0;
  if (type === "oil") return racer.oilTimer > 0;
  if (type === "snowball") return false;
  if (type === "horse" && isHorsingAroundMode()) return false;
  if (type === "horse" && isAlwaysMountedTrack()) return racer.horseType !== "horse";
  if (type === "horse") return racer.horseTimer > 0;
  return false;
}

function launchSnowball(racer) {
  if (racer.snowballs <= 0) return;
  racer.snowballs -= 1;
  sfx("snowball_throw", racer.x);
  racerVoice(racer, "taunt", { chance: 0.15 });
  // Thrown from the hand of whatever pose she's in (standing, skates, pogo
  // stick, saddle) and flown level from there.
  const hand = getThrowHand(racer);
  const groundY = racer.y + 54;
  // Momentum: running the way she throws adds her speed to the throw
  // (bubbles just float off at their own pace).
  const carry = projectileLanding() === "pop" ? 0 : Math.max(0, (racer.speed || 0) * racer.facing);
  const vx = racer.facing * (SNOWBALL_SPEED + carry);
  state.projectiles.push({
    owner: racer,
    x: hand ? hand.x : racer.x + racer.facing * 44,
    y: racer.y + 32,
    groundY,
    lift: hand ? groundY - hand.y : groundY - snowballDrawY(racer),
    drawY: hand ? hand.y : snowballDrawY(racer),
    z: racer.z + 42,
    vx,
    // Same flight time, so a throw on the run carries further.
    range: SNOWBALL_RANGE * Math.abs(vx) / SNOWBALL_SPEED,
    distance: 0,
    hitTargets: new Set()
  });
}

function updateProjectiles(dt) {
  for (const projectile of state.projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.distance += Math.abs(projectile.vx) * dt;
    // Toward the end of its throw it drops to the ground (bubbles stay up).
    const drop = projectileLanding() === "pop" ? 0
      : clamp((projectile.distance / projectile.range - SNOWBALL_ARC_START) / (1 - SNOWBALL_ARC_START), 0, 1);
    projectile.height = 1 - drop * drop;
    projectile.drawY = projectile.groundY !== undefined
      ? projectile.groundY - SNOWBALL_RADIUS - (projectile.lift - SNOWBALL_RADIUS) * projectile.height
      : snowballDrawY(projectile.owner);
    if (projectile.distance >= projectile.range && !projectile.burst) {
      projectile.burst = true;
      landProjectile(projectile);
    }
    const amanda = projectile.distance < projectile.range && amandaAt(projectile.x, projectile.groundY);
    if (amanda && !projectile.hitTargets.has(amanda)) {
      projectileImpact(projectile, amanda.y + 18);
      hitAmanda(amanda, Math.sign(projectile.vx) || 1);
      projectile.hitTargets.add(amanda);
      projectile.distance = projectile.range;
      continue;
    }
    for (const monster of state.monsters) {
      if (monster.state === "sleeping" || monster.state === "ground" || projectile.hitTargets.has(monster)) continue;
      const close = Math.abs(monster.x - projectile.x) < 62 && Math.abs(monster.y + 54 - projectile.y) < 58 && Math.abs(projectile.z) < 140;
      if (!close) continue;
      projectileImpact(projectile, monster.y + 54);
      applyMonsterKnockback(monster, Math.sign(projectile.vx) || 1, { unhorse: true });
      projectile.hitTargets.add(monster);
      projectile.distance = projectile.range;
      break;
    }
    if (projectile.distance >= projectile.range) continue;
    for (const racer of state.racers) {
      if (racer === projectile.owner || racer.finished || isMounted(racer) || projectile.hitTargets.has(racer)) continue;
      const close = Math.abs(racer.x - projectile.x) < 42 && Math.abs((racer.y + 54) - projectile.y) < 44 && Math.abs(racer.z - projectile.z) < 78;
      if (!close) continue;
      projectileImpact(projectile, racer.y + 54);
      applyPushHit(projectile.owner, racer, Math.sign(projectile.vx) || 1);
      projectile.hitTargets.add(racer);
      projectile.distance = projectile.range;
      break;
    }
  }
  state.projectiles = state.projectiles.filter(projectile => projectile.distance < projectile.range);
}

function projectileLanding() {
  return getTrackTheme().projectileLanding || "roll";
}

// A throw that missed everyone, where it comes down (see tracks.js
// projectileLanding): a splash, a melting pile of snow, a pop in the air, or
// it rolls along the ground to a stop.
function landProjectile(projectile) {
  const landing = projectileLanding();
  const x = projectile.x;
  const groundY = projectile.groundY ?? projectile.y + 22;
  if (landing === "water") {
    burstWaterBalloon(x, groundY, 0);
  } else if (landing === "pop") {
    const height = Math.max(0, groundY - (projectile.drawY - projectile.z * 0.28));
    sfx("bubble_pop", x, { gain: 0.7 });
    spawnParticles(x, groundY, height, 10, { kind: "dot", color: "#d8f4ff", speed: 120, lift: 60, life: 0.35, size: 3.5, gravity: 0 });
    spawnParticles(x, groundY, height, 1, { kind: "ring", color: "#bfe8ff", speed: 0, lift: 0, life: 0.3, size: 20, gravity: 0 });
  } else if (landing === "snow") {
    sfx("snowball_hit", x, { gain: 0.5 });
    spawnParticles(x, groundY, 0, 6, { kind: "puff", color: "#f4fbff", speed: 70, lift: 30, life: 0.5, size: 10, gravity: 0 });
    state.thrownLeftovers.push({ kind: "snow", x, groundY, life: SNOW_PILE_LIFE });
  } else {
    sfx("snowball_hit", x, { gain: 0.4 });
    state.thrownLeftovers.push({ kind: "roll", x, groundY, vx: projectile.vx * 0.45, spin: projectile.distance * 0.02, hop: 0, vhop: 180, life: THROWN_ROLL_LIFE });
  }
}

function updateThrownLeftovers(dt) {
  for (const item of state.thrownLeftovers) {
    item.life -= dt;
    if (item.kind !== "roll") continue;
    // Rolls on, bounces a little, slows down, and stops at hurdles.
    item.x += item.vx * dt;
    item.spin += (item.vx / SNOWBALL_RADIUS) * dt;
    item.vx *= Math.pow(0.35, dt);
    item.hop = Math.max(0, item.hop + item.vhop * dt);
    item.vhop = item.hop > 0 ? item.vhop - 1400 * dt : Math.abs(item.vhop) > 60 ? -item.vhop * 0.35 : 0;
    for (const obstacle of state.obstacles) {
      const b = getObstacleHitBounds(obstacle);
      if (item.groundY < b.top - 6 || item.groundY > b.bottom + 6) continue;
      if (item.x + SNOWBALL_RADIUS > b.left && item.x - SNOWBALL_RADIUS < b.right) {
        item.x = item.vx > 0 ? b.left - SNOWBALL_RADIUS : b.right + SNOWBALL_RADIUS;
        item.vx = -item.vx * 0.4;
      }
    }
  }
  state.thrownLeftovers = state.thrownLeftovers.filter(item => item.life > 0);
}

function drawThrownLeftover(item) {
  const x = item.x - state.camera;
  if (x < -80 || x > getWorldViewportWidth() + 80) return;
  const fade = clamp(item.life / 0.5, 0, 1);
  ctx.save();
  ctx.globalAlpha = fade;
  if (item.kind === "snow") {
    // A little heap of snow that sinks as it melts.
    const melt = clamp(item.life / SNOW_PILE_LIFE, 0, 1);
    ctx.fillStyle = "#f6fbff";
    ctx.strokeStyle = "#c9e6f3";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, item.groundY - 4, 22, 4 + 9 * melt, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.translate(x, item.groundY - SNOWBALL_RADIUS - item.hop * 0.3);
  ctx.rotate(item.spin);
  const art = getTrackArt("projectile");
  const size = SNOWBALL_RADIUS * 2.6;
  if (art) ctx.drawImage(art, -size / 2, -size / 2, size, size);
  else {
    ctx.fillStyle = "#f8fdff";
    ctx.beginPath();
    ctx.arc(0, 0, SNOWBALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// A hit: water balloons burst into a splash, snowballs just thud.
function projectileImpact(projectile, groundY) {
  projectile.burst = true;
  if (projectileLanding() !== "water") {
    sfx("snowball_hit", projectile.x);
    return;
  }
  const height = Math.max(0, projectile.groundY - (projectile.drawY - projectile.z * 0.28));
  burstWaterBalloon(projectile.x, groundY, height);
}

function nextStormDelay() {
  if (state.difficulty === "too-many") {
    return randomDelay(STORM_CLOUD_AVERAGE_INTERVAL, STORM_CLOUD_MIN_INTERVAL);
  }
  if (state.difficulty === "extra") {
    return randomDelay(EXTRA_MONSTER_CLOUD_AVERAGE_INTERVAL, EXTRA_MONSTER_CLOUD_MIN_INTERVAL);
  }
  return Infinity;
}

function nextRewardDelay() {
  if (state.difficulty !== "too-many") return Infinity;
  return randomDelay(REWARD_CLOUD_AVERAGE_INTERVAL, REWARD_CLOUD_MIN_INTERVAL);
}

function randomDelay(average, min) {
  return min + (-Math.log(Math.max(0.001, Math.random())) * Math.max(1, average - min));
}

function getCloudDropTargetX() {
  const humanRacers = state.racers.filter(racer => !racer.ai && !racer.finished);
  const racers = humanRacers.length > 0 ? humanRacers : state.racers.filter(racer => !racer.finished);
  if (racers.length === 0) return state.camera + getWorldViewportWidth() * 0.55;
  const lead = Math.max(...racers.map(racer => racer.x));
  const trail = Math.min(...racers.map(racer => racer.x));
  return Math.random() < 0.5 ? (lead + trail) / 2 : lead + 120 + Math.random() * 260;
}

function startStormCloud() {
  const targetX = clamp(getCloudDropTargetX(), 120, FINISH - 220);
  const viewWidth = getWorldViewportWidth();
  const startX = state.camera + viewWidth + STORM_CLOUD_START_PADDING;
  const endX = state.camera - STORM_CLOUD_END_PADDING;
  state.stormCloud = {
    targetX,
    startX,
    endX,
    x: startX,
    y: 118 + Math.random() * 68,
    timer: 0,
    duration: STORM_CLOUD_DURATION,
    dropped: false
  };
}

function updateStormCloud(dt) {
  if (!["extra", "too-many"].includes(state.difficulty) || !state.running || state.done) {
    state.stormCloud = null;
    state.stormTimer = nextStormDelay();
    return;
  }

  if (!state.stormCloud) {
    state.stormTimer -= dt;
    if (state.stormTimer <= 0) startStormCloud();
    return;
  }

  const cloud = state.stormCloud;
  cloud.timer += dt;
  const progress = clamp(cloud.timer / cloud.duration, 0, 1);
  cloud.x = cloud.startX + (cloud.endX - cloud.startX) * progress;
  if (!cloud.dropped && cloud.timer >= STORM_CLOUD_DROP_TIME) {
    dropMonsterNear(cloud.x, PATH_TOP + 36 + Math.random() * (TRACK_BOTTOM - PATH_TOP - 72), cloud.y + 58);
    cloud.dropped = true;
  }
  if (progress >= 1) {
    state.stormCloud = null;
    state.stormTimer = nextStormDelay();
  }
}

function startRewardCloud() {
  const targetX = clamp(getCloudDropTargetX(), 120, FINISH - 220);
  const goodTypes = trackPowerupTypes(GOOD_POWERUP_TYPES);
  const type = goodTypes[Math.floor(Math.random() * goodTypes.length)];
  const viewWidth = getWorldViewportWidth();
  const startX = state.camera + viewWidth + STORM_CLOUD_START_PADDING;
  const endX = state.camera - STORM_CLOUD_END_PADDING;
  state.rewardCloud = {
    targetX,
    type,
    startX,
    endX,
    x: startX,
    y: 92 + Math.random() * 56,
    timer: 0,
    duration: STORM_CLOUD_DURATION,
    dropped: false
  };
}

function updateRewardCloud(dt) {
  if (state.difficulty !== "too-many" || !state.running || state.done) {
    state.rewardCloud = null;
    state.rewardTimer = nextRewardDelay();
    return;
  }

  if (!state.rewardCloud) {
    state.rewardTimer -= dt;
    if (state.rewardTimer <= 0) startRewardCloud();
    return;
  }

  const cloud = state.rewardCloud;
  cloud.timer += dt;
  const progress = clamp(cloud.timer / cloud.duration, 0, 1);
  cloud.x = cloud.startX + (cloud.endX - cloud.startX) * progress;
  if (!cloud.dropped && cloud.timer >= STORM_CLOUD_DROP_TIME) {
    dropPowerupNear(cloud.type, cloud.x, randomPowerupY(), cloud.y + 54);
    cloud.dropped = true;
  }
  if (progress >= 1) {
    state.rewardCloud = null;
    state.rewardTimer = nextRewardDelay();
  }
}

// A power-up's y is at feet level: keep it on the path, clear of the back
// fence, and away from hurdles so it never reads as part of one.
function randomPowerupY() {
  const top = PATH_TOP + FOOT_OFFSET_Y + POWERUP_PATH_EDGE_CLEARANCE;
  const bottom = TRACK_BOTTOM - 34;
  return top + Math.random() * Math.max(0, bottom - top);
}

function clearOfHurdles(x, y) {
  for (let pass = 0; pass < 3; pass += 1) {
    const hurdle = state.obstacles.find(obstacle =>
      Math.abs(x - obstacle.x) < POWERUP_HURDLE_CLEARANCE_X && Math.abs(y - (obstacle.y + 18)) < POWERUP_HURDLE_CLEARANCE_Y);
    if (!hurdle) break;
    x = hurdle.x + (x >= hurdle.x ? 1 : -1) * POWERUP_HURDLE_CLEARANCE_X;
  }
  return x;
}

function dropPowerupNear(type, x, y, dropStartY) {
  sfx("reward_cloud_drop", x);
  state.powerups.push(makePowerup(type, clamp(clearOfHurdles(x, y), 80, FINISH - 160), y, {
    dropDuration: REWARD_POWERUP_DROP_DURATION,
    dropStartY
  }));
}

function updatePowerupDrops(dt) {
  for (const powerup of state.powerups) {
    if (!isPowerupDropping(powerup)) continue;
    powerup.dropTimer += dt;
    if (powerup.dropTimer >= powerup.dropDuration) {
      powerup.dropTimer = 0;
      powerup.dropDuration = 0;
    }
  }
}

function isPowerupDropping(powerup) {
  return powerup.dropDuration > 0;
}

function drawPowerup(powerup) {
  const x = powerup.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -80 || x > viewWidth + 80) return;
  const t = performance.now() / 500 + powerup.spin;
  const drawY = powerupDrawY(powerup);
  const iconIndex = { jump: 0, boost: 1, emp: 2, oil: 3, snowball: 4 }[powerup.type];
  if (powerup.type === "oil") {
    // Puddles lie flat on the ground rather than bobbing like pickups.
    drawPowerupIcon(iconIndex, x, drawY - 12, t, { flat: !isPowerupDropping(powerup) });
    return;
  }
  if (powerup.type === "emp") {
    // A trigger goes off the moment it's touched, so it stands still on the
    // ground like a puddle rather than bobbing like a power-up.
    const still = !isPowerupDropping(powerup);
    const iconY = drawY - 26;
    drawPowerupGlow("emp", x, iconY, drawY - 4, t, still);
    drawPowerupIcon(iconIndex, x, iconY, t, { still });
    return;
  }
  if (iconIndex !== undefined) {
    drawPowerupGlow(powerup.type, x, drawY - 34 + Math.sin(t) * 5, drawY - 4, t);
    drawPowerupIcon(iconIndex, x, drawY - 34 + Math.sin(t) * 5, t, { pogo: powerup.pogo });
    return;
  }
  if (powerup.type === "horse" && powerup.loose && powerup.horseType !== "broom") {
    drawLooseMount(powerup, x, t);
    return;
  }
  if (powerup.type === "horse" && powerup.horseType === "broom") {
    drawBroomProp(x, drawY - 23 + Math.sin(t) * 5, 105, Math.sin(t * 0.7) * 0.055, 1);
    return;
  }
  if (powerup.type === "horse") {
    ctx.save();
    ctx.translate(x, drawY - 32 + Math.sin(t) * 5);
    ctx.globalAlpha = 0.96;
    ctx.shadowColor = "rgba(23,33,38,0.24)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    const scale = 0.24;
    const col = Math.floor(t * 1.4) % 3;
    const horseImage = images[powerup.horseType] || images.horse;
    ctx.drawImage(
      horseImage,
      col * FRAME,
      0,
      FRAME,
      FRAME,
      -SPRITE_ANCHOR_X * scale,
      -SPRITE_ANCHOR_Y * scale + 30,
      FRAME * scale,
      FRAME * scale
    );
    ctx.restore();
    return;
  }
}

function powerupDrawY(powerup) {
  if (!isPowerupDropping(powerup)) return powerup.y;
  const progress = clamp(powerup.dropTimer / powerup.dropDuration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return powerup.dropStartY + (powerup.y - powerup.dropStartY) * eased;
}

// A soft, pulsing halo in the power-up kind's colour, behind the icon.
// A soft halo in the power-up's colour, and a faint ring on the ground.
// `still` pickups (EMP triggers) don't pulse.
function drawPowerupGlow(type, x, y, groundY, t, still = false) {
  const color = POWERUP_GLOW_COLORS[type];
  if (!color) return;
  const pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.4);
  const radius = POWERUP_ICON_TARGET_SIZE * (0.66 + 0.06 * pulse);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(0.25, color);
  glow.addColorStop(1, `${color}00`);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, groundY, 28 + 2 * pulse, 8 + pulse * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.28 + 0.12 * pulse;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerupIcon(index, x, y, t, options = {}) {
  const trackSheet = pickupLook(["jump", "boost", "emp", "oil", "snowball"][index], { pogo: options.pogo }).sheet;
  const rect = trackSheet
    ? { x: index * TRACK_POWERUP_CELL, y: 0, w: TRACK_POWERUP_CELL, h: TRACK_POWERUP_CELL }
    : POWERUP_ICON_RECTS[index];
  if (!rect) return;
  const scale = POWERUP_ICON_TARGET_SIZE / Math.max(rect.w, rect.h);
  const drawW = rect.w * scale;
  const drawH = rect.h * scale;
  ctx.save();
  ctx.translate(x, y);
  if (!options.flat) {
    if (!options.still) ctx.rotate(Math.sin(t * 0.8) * 0.08);
    ctx.shadowColor = "rgba(23,33,38,0.26)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
  }
  ctx.globalAlpha = 0.96;
  ctx.drawImage(
    trackSheet || images.powerupIcons,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  ctx.restore();
}

function drawSnowball(projectile) {
  const x = projectile.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -80 || x > viewWidth + 80) return;
  ctx.save();
  ctx.translate(x, projectile.drawY - projectile.z * 0.28 * (projectile.height ?? 1));
  const projectileArt = getTrackArt("projectile");
  if (projectileArt) {
    const size = SNOWBALL_RADIUS * 2.6;
    ctx.rotate(projectile.distance * 0.02);
    ctx.drawImage(projectileArt, -size / 2, -size / 2, size, size);
    ctx.restore();
    return;
  }
  ctx.fillStyle = "#f8fdff";
  ctx.strokeStyle = "#9bd5ec";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(23,33,38,0.22)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(0, 0, SNOWBALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStormCloud(cloud) {
  drawCloud(cloud, {
    fill: "#29303b",
    shadow: "rgba(12, 18, 27, 0.38)",
    lightning: true,
    alpha: 0.9
  });
}

function drawRewardCloud(cloud) {
  drawCloud(cloud, {
    fill: "#f7fbff",
    shadow: "rgba(70, 104, 128, 0.24)",
    lightning: false,
    alpha: 0.94
  });
}

function drawCloud(cloud, options) {
  const x = cloud.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -240 || x > viewWidth + 240) return;
  ctx.save();
  ctx.translate(x, cloud.y);
  ctx.globalAlpha = options.alpha;
  ctx.fillStyle = options.fill;
  ctx.shadowColor = options.shadow;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(-58, 16, 54, 30, -0.08, 0, Math.PI * 2);
  ctx.ellipse(-16, 0, 62, 38, 0.08, 0, Math.PI * 2);
  ctx.ellipse(42, 16, 58, 32, 0.1, 0, Math.PI * 2);
  ctx.ellipse(0, 26, 88, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  if (options.lightning) {
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255, 236, 126, 0.9)";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 42);
  ctx.lineTo(-28, 82);
  ctx.lineTo(0, 76);
  ctx.lineTo(-18, 122);
  ctx.stroke();
  }
  ctx.restore();
}

// A coloured ring underfoot for each active power-up, and green speed streaks.
// Power-up feedback drawn behind her: speed streaks (sparkles and
// after-images come from updateRacerPowerupEffects). No rings round her shadow.
// "POGO", or "POGO x2" when she has picked up more than one.
function stackLabel(label, count) {
  return count > 1 ? `${label} x${count}` : label;
}

// What her high jump is called: POGO on a pogo stick, else the jump pickup's name.
function racerJumpLabel(racer) {
  return racer.rideToys?.some(toy => toy.type === "pogo") ? "POGO" : pickupLook("jump").label;
}

function drawPowerupAura(racer, screenX, scale, mounted) {
  ctx.save();
  if (racer.speedBoostTimer > 0 && racer.moving && !racer.rideToys?.some(toy => toy.type === "skates")) {
    // Streaks trailing behind the body (not on skates: the glide says it).
    const back = -racer.facing;
    const baseY = racer.y + 54 - racer.z;
    const height = (mounted ? 300 : 360) * scale;
    ctx.strokeStyle = POWERUP_GLOW_COLORS.boost;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i += 1) {
      const y = baseY - height * (0.25 + i * 0.17);
      const start = screenX + back * (40 + (i % 2) * 14) * scale * 2;
      const len = (70 + ((performance.now() / 40 + i * 37) % 60)) * scale * 2;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(start, y);
      ctx.lineTo(start + back * len, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}
