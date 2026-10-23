// Track monsters (the troll and its replacements, see monsters.js): spawning, behaviour, grabbing and drawing.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

// The track's own monster (its entry in monsters.js) once its sheet has loaded
// with the troll's layout, else null: the troll.
function getTrackMonsterKey() {
  const key = getTrackTheme().monster;
  const sheet = key && key !== "troll" && window.MONSTERS?.[key] && images[key];
  return sheet && sheet.width === FRAME * SPRITE_COLS && sheet.height === FRAME * MONSTER_SPRITE_ROWS ? key : null;
}

// The current track's monster entry (monsters.js): its own, or the troll's.
function monsterDef() {
  return window.MONSTERS?.[getTrackMonsterKey() || "troll"] || {};
}

function monsterSheetUrl(key) {
  const url = window.MONSTERS?.[key]?.sheet || `assets/${key}_sprites.webp`;
  return `${url}?v=${window.MONSTER_SHEET_VERSION || "1"}`;
}

function getMonsterImage() {
  return images[getTrackMonsterKey()] || images.monster;
}

// The troll's sound, or the track monster's own version of it (scarecrow_grab
// for troll_grab). Only monsters marked `snores` play the sleep loop.
function monsterSfx(trollKey) {
  const key = getTrackMonsterKey();
  if (!key) return trollKey;
  if (trollKey === "troll_sleep_loop" && !monsterDef().snores) return null;
  const own = trollKey.replace(/^troll_/, `${monsterDef().sounds || key}_`);
  return window.AUDIO_MANIFEST?.sfx?.[own] ? own : trollKey;
}

// The horse the trolls ride on this track, or null when they walk.
function getTrollMountImage() {
  const mount = getTrackTheme().trollMount;
  if (!mount) return null;
  return images[mount] || images.horse;
}

// On a track with a trollMount the first troll rides and the rest each have
// a TROLL_RIDING_CHANCE; on foot they still grab riders there.
function makeMonsters() {
  return getMonsterSpawnXs(state.difficulty).map((x, index) => (
    spawnMonster(x, PATH_TOP + 26 + Math.random() * (TRACK_BOTTOM - PATH_TOP - 52), { active: false, riding: index === 0 || rollTrollRiding() })
  ));
}

function rollTrollRiding() {
  return Math.random() < TROLL_RIDING_CHANCE;
}

function getMonsterSpawnXs(difficulty) {
  const count = MONSTER_COUNTS_BY_DIFFICULTY[difficulty] ?? MONSTER_COUNTS_BY_DIFFICULTY.normal;
  if (count === 0) return [];

  const finishMonsterX = FINISH - 120;
  const spreadEndX = finishMonsterX - MONSTER_WAIT_FROM_BOARD_END * 0.25;
  const positions = [];
  for (let index = 0; index < count - 1; index += 1) {
    const progress = (index + 1) / count;
    // Ease toward the finish so each successive course section is denser.
    const endBiasedProgress = 1 - Math.pow(1 - progress, 1.35);
    positions.push(MONSTER_COURSE_START_X + (spreadEndX - MONSTER_COURSE_START_X) * endBiasedProgress);
  }
  positions.push(finishMonsterX);
  return positions;
}

function spawnMonster(x, y, options = {}) {
  const active = Boolean(options.active);
  return {
    x: clamp(x, MONSTER_COURSE_START_X, FINISH - 120),
    y: clamp(y, TRACK_TOP, TRACK_BOTTOM),
    state: active ? "walk" : "idle",
    active,
    riding: Boolean(getTrollMountImage()) && options.riding !== false,
    // Some trolls wear fairy wings (tracks.js wingedMonsters) and fly up
    // after anyone in the air.
    winged: options.winged ?? (!getTrollMountImage() && Math.random() < (getTrackTheme().wingedMonsters || 0)),
    frame: 0,
    frameTime: Math.random() * 3,
    facing: options.facing || -1,
    target: null,
    timer: 0,
    knockedBacks: 0,
    knockbackX: 0,
    z: 0,
    vy: 0,
    restTimer: 0,
    jumpChoice: null,
    balkTimer: 0,
    dropTimer: 0,
    dropDuration: 0,
    dropStartY: 0
  };
}

function resolveMonsterObstacleCollisions(monster, previousX, previousY) {
  if (monster.state === "drop") return;
  if (monster.z >= hurdleTopZ()) return;
  for (const obstacle of state.obstacles) {
    const bounds = getObstacleHitBounds(obstacle);
    const previousFootLeft = previousX - MONSTER_FOOT_W / 2;
    const previousFootRight = previousX + MONSTER_FOOT_W / 2;
    const previousFootTop = previousY + 54 - MONSTER_FOOT_H / 2;
    const previousFootBottom = previousY + 54 + MONSTER_FOOT_H / 2;
    const footLeft = monster.x - MONSTER_FOOT_W / 2;
    const footRight = monster.x + MONSTER_FOOT_W / 2;
    const footTop = monster.y + 54 - MONSTER_FOOT_H / 2;
    const footBottom = monster.y + 54 + MONSTER_FOOT_H / 2;
    const footOverlapsX = footRight > bounds.left && footLeft < bounds.right;
    const footOverlapsY = footBottom > bounds.top && footTop < bounds.bottom;
    const crossedFromLeft = previousFootRight <= bounds.left && footRight > bounds.left;
    const crossedFromRight = previousFootLeft >= bounds.right && footLeft < bounds.right;
    const crossedFromAbove = previousFootBottom <= bounds.top && footBottom > bounds.top;
    const crossedFromBelow = previousFootTop >= bounds.bottom && footTop < bounds.bottom;
    if (footOverlapsY && crossedFromLeft) {
      monster.x = bounds.left - MONSTER_FOOT_W / 2;
      monster.knockbackX = Math.min(0, monster.knockbackX);
      monster.blockedByHurdle = obstacle;
    } else if (footOverlapsY && crossedFromRight) {
      monster.x = bounds.right + MONSTER_FOOT_W / 2;
      monster.knockbackX = Math.max(0, monster.knockbackX);
      monster.blockedByHurdle = obstacle;
    } else if (footOverlapsX && crossedFromAbove) {
      monster.y = bounds.top - 54 - MONSTER_FOOT_H / 2;
    } else if (footOverlapsX && crossedFromBelow) {
      monster.y = bounds.bottom - 54 + MONSTER_FOOT_H / 2;
    }
  }
}

function isMonsterEmpTarget(monster) {
  return monster.state !== "sleeping" && monster.state !== "ground";
}

function dropMonsterNear(x, y, dropStartY = null) {
  if (state.difficulty === "none") return null;
  const monster = spawnMonster(x, y, { active: true, facing: -1, riding: rollTrollRiding() });
  if (dropStartY === null) {
    monster.state = "fall";
    monster.timer = 0.35;
  } else {
    monster.state = "drop";
    monster.dropTimer = 0;
    monster.dropDuration = STORM_MONSTER_DROP_DURATION;
    monster.dropStartY = dropStartY;
  }
  monster.knockedBacks = 0;
  state.monsters.push(monster);
  return monster;
}

// A defeated monster with `defeated: "sparks"` (the robot) lies on the ground
// crackling with sparks, now and then a bigger fizz, like a broken robot.
function updateDefeatedSparks(monster, dt) {
  if (monsterDef().defeated !== "sparks" || !isMonsterVisible(monster)) return;
  monster.sparkTimer = (monster.sparkTimer || 0) - dt;
  if (monster.sparkTimer > 0) return;
  const big = Math.random() < 0.18;
  monster.sparkTimer = big ? 0.5 + Math.random() * 0.6 : 0.08 + Math.random() * 0.18;
  const scale = monsterScale(monster) * monsterRowScale(3, 2);
  // somewhere along the body lying on the ground
  const x = monster.x + (Math.random() - 0.5) * 150 * scale;
  const groundY = monster.y + 54;
  const z = (20 + Math.random() * 50) * scale;
  const colors = ["#fff6a8", "#ffd84a", "#7fe3ff", "#ffffff"];
  spawnParticles(x, groundY, z, big ? 14 : 3, { color: colors[Math.floor(Math.random() * colors.length)], speed: big ? 170 : 90, lift: big ? 240 : 140, life: big ? 0.45 : 0.3, size: big ? 4.5 : 3.5, gravity: 900 });
  if (big) {
    spawnParticles(x, groundY, z, 1, { kind: "puff", color: "#9aa3ad", speed: 20, lift: 30, life: 0.9, size: 14, gravity: -40 });
    if (Math.random() < 0.5) sfx("robot_hit", monster.x, { gain: 0.35, rate: 1.4 });
  }
}

function updateMonsters(dt) {
  updateMonsterBolts(dt);
  for (const monster of state.monsters) {
    monster.lightningCooldown = Math.max(0, (monster.lightningCooldown ?? 2.5) - dt);
    const previousX = monster.x;
    const previousY = monster.y;
    monster.frameTime += dt * (monster.state === "walk" ? 8 : 3);
    monster.frame = Math.floor(monster.frameTime) % 3;
    monster.dizzyTimer = Math.max(0, (monster.dizzyTimer || 0) - dt);
    monster.knockbackX *= Math.pow(0.04, dt);
    if (Math.abs(monster.knockbackX) < 6) monster.knockbackX = 0;
    if (monster.winged) updateWingedMonsterHeight(monster, dt);
    else if (monster.z > 0 || monster.vy > 0) {
      monster.z += monster.vy * dt;
      monster.vy -= GRAVITY * dt;
      if (monster.z <= 0) {
        monster.z = 0;
        monster.vy = 0;
      }
    }
    monster.blockedByHurdle = false;
    monster.x = clamp(monster.x + monster.knockbackX * dt, MONSTER_COURSE_START_X, FINISH - 120);
    resolveMonsterObstacleCollisions(monster, previousX, previousY);

    if (monster.frogTimer > 0) {
      // A frogged monster just hops about and can't grab anyone.
      monster.frogTimer = Math.max(0, monster.frogTimer - dt);
      monster.frogPhase = ((monster.frogPhase || 0) + dt * FROG_HOP_HZ * 0.8) % 1;
      if (monster.frogTimer === 0) frogPoof(monster.x, monster.y + 54, true);
      continue;
    }

    if (!monster.active && isMonsterVisible(monster)) {
      monster.active = true;
      monster.state = "walk";
    }

    if (monster.state === "drop") {
      monster.dropTimer += dt;
      if (monster.dropTimer >= monster.dropDuration) {
        monster.state = "walk";
        monster.timer = 0;
        monster.dropTimer = 0;
      }
      continue;
    }

    if (monster.state === "sleeping") {
      updateDefeatedSparks(monster, dt);
      if (monsterDef().particles && !monster.scattered) checkCandyPile(monster);
      continue;
    }

    if (monster.state === "fall") {
      monster.timer -= dt;
      if (monster.timer <= 0) {
        if (monster.knockedBacks >= MONSTER_SLEEP_KNOCKBACKS) {
          monster.state = "ground";
          monster.timer = 1;
          // (A candy troll's sweets fly only when someone runs into his pile.)
          if (monsterDef().particles === "candy_particles") state.racers.forEach(getCheerImage);
          if (monsterDef().defeated === "dissipate") dissipateMonster(monster);
        } else {
          monster.state = monster.active ? "walk" : "idle";
        }
      }
      continue;
    }

    if (monster.state === "ground") {
      monster.timer -= dt;
      if (monster.timer <= 0) monster.state = "sleeping";
      continue;
    }

    if (monster.state === "grab" || monster.state === "lift" || monster.state === "throw") {
      updateMonsterGrabSequence(monster, dt);
      continue;
    }

    if (monster.state === "lightning") {
      updateMonsterLightning(monster, dt);
      continue;
    }

    if (monster.restTimer > 0) {
      monster.restTimer -= dt;
      monster.state = "idle";
      continue;
    }

    const target = getMonsterTarget(monster);
    monster.target = target;
    if (!target) {
      // Nobody in sight: he waits, and gives a shout when he spots someone.
      monster.state = "idle";
      monster.detour = null;
      continue;
    }

    const dx = target.x - monster.x;
    const detourY = monsterDetourY(monster, Math.sign(dx));
    const dy = (detourY ?? target.y) - monster.y;
    monster.facing = dx < 0 ? -1 : 1;
    if (monsterDef().lightning && !monster.riding && monster.lightningCooldown === 0 && Math.abs(dx) > 180 && Math.abs(dx) < 620 && Math.abs(dy) < 90 && !target.grabbedBy) {
      monster.state = "lightning";
      monster.lightningTime = 0;
      monster.lightningReleased = false;
      monster.lightningCooldown = 4;
      continue;
    }
    monster.state = "walk";
    const riding = monster.riding;
    const speed = riding ? MOUNTED_MONSTER_SPEED : MONSTER_SPEED;
    const laneSpeed = riding ? MOUNTED_MONSTER_LANE_SPEED : MONSTER_LANE_SPEED;
    monster.x = clamp(monster.x + Math.sign(dx) * Math.min(Math.abs(dx), speed * dt), MONSTER_COURSE_START_X, FINISH - 120);
    monster.y = clamp(monster.y + Math.sign(dy) * Math.min(Math.abs(dy), laneSpeed * dt), TRACK_TOP, TRACK_BOTTOM);
    resolveMonsterObstacleCollisions(monster, previousX, previousY);
    // In wings he flies over a hurdle; on foot he steps round it.
    if (monster.winged && monster.blockedByHurdle) monster.hurdleHop = 0.8;
    else if (!riding && monster.blockedByHurdle && !monster.detour) startMonsterDetour(monster, monster.blockedByHurdle, Math.sign(dx), target);

    if (riding) updateMountedMonsterJump(monster, Math.sign(dx), dt);

    const grabRangeX = riding ? MOUNTED_MONSTER_GRAB_RANGE_X : MONSTER_GRAB_RANGE_X;
    const unbeatable = mountOutrunsMonster(target, monster);
    const reachesHeight = monster.winged ? Math.abs(target.z - monster.z) < 70 : monster.z < 20 && target.z < 80;
    if (reachesHeight && Math.abs(dx) < grabRangeX && Math.abs(dy) < MONSTER_GRAB_RANGE_Y && !unbeatable) {
      if (isMounted(target)) dismountIntoPickup(target);
      monster.state = "grab";
      monster.timer = 0.24;
      monster.frameTime = 0;
      racerVoice(target, "grabbed", { chance: 0.8, priority: 1 });
      target.grabbedBy = monster;
      target.fallBackTimer = 1.2;
      target.fallBackFacing = -monster.facing;
      target.knockbackX = 0;
      target.vy = 0;
      setGrabbedRacerPosition(monster, target);
    }
  }
}

// Decide once per hurdle whether to jump it on approach; a balked horse stands
// at the hurdle a moment, then jumps after all.
// A troll in wings flies up to whoever he's after when she's in the air (and
// over hurdles in his way), and drifts back down otherwise. Once he grabs
// her they fall together to the ground (he throws her when they land, see
// updateMonsterGrabSequence); knocked over he drops.
function updateWingedMonsterHeight(monster, dt) {
  const holding = ["grab", "lift", "throw"].includes(monster.state);
  const down = ["fall", "ground", "sleeping"].includes(monster.state);
  monster.hurdleHop = Math.max(0, (monster.hurdleHop || 0) - dt);
  if (holding) {
    if (monster.z > 0) {
      monster.fallVy = (monster.fallVy || 0) - GRAVITY * dt;
      monster.z = Math.max(0, monster.z + monster.fallVy * dt);
    }
    monster.vy = 0;
    return;
  }
  monster.fallVy = 0;
  let goal = 0;
  const target = monster.target;
  if (monster.state === "walk" && target && !target.finished && target.z > 30) goal = Math.min(target.z, WINGED_MONSTER_MAX_Z);
  if (monster.hurdleHop > 0) goal = Math.max(goal, hurdleTopZ() + 24);
  const speed = down ? WINGED_MONSTER_CLIMB * 2 : WINGED_MONSTER_CLIMB;
  if (goal > monster.z + 2 && monster.z <= 2) sfx("pegasus_wing_flap", monster.x, { gain: 0.6 });
  monster.z += clamp(goal - monster.z, -speed * dt, speed * dt);
  monster.vy = 0;
}

function updateMountedMonsterJump(monster, direction, dt) {
  if (monster.z > 0 || direction === 0) return;
  const footY = monster.y + 54;
  const ahead = state.obstacles.find(obstacle => {
    const bounds = getObstacleHitBounds(obstacle);
    if (footY + MONSTER_FOOT_H / 2 <= bounds.top || footY - MONSTER_FOOT_H / 2 >= bounds.bottom) return false;
    const gap = direction > 0
      ? bounds.left - (monster.x + MONSTER_FOOT_W / 2)
      : (monster.x - MONSTER_FOOT_W / 2) - bounds.right;
    return gap >= -1 && gap < MOUNTED_MONSTER_JUMP_LOOKAHEAD;
  });
  if (!ahead) {
    monster.balkTimer = 0;
    return;
  }
  if (monster.jumpChoice?.obstacle !== ahead) {
    monster.jumpChoice = { obstacle: ahead, jump: Math.random() < MOUNTED_MONSTER_JUMP_CHANCE };
    monster.balkTimer = 0;
  }
  if (!monster.jumpChoice.jump) {
    if (monster.blockedByHurdle) monster.balkTimer += dt;
    if (monster.balkTimer < MOUNTED_MONSTER_BALK_TIME) return;
  }
  monster.vy = HORSE_JUMP_POWER;
  monster.z = 1;
  monster.balkTimer = 0;
  sfx("horse_jump", monster.x);
}

function updateMonsterGrabSequence(monster, dt) {
  const target = monster.target && !monster.target.finished ? monster.target : null;
  monster.timer -= dt;
  if (target && target.grabbedBy === monster) {
    target.fallBackTimer = Math.max(target.fallBackTimer, 0.18);
    target.fallBackFacing = -monster.facing;
    setGrabbedRacerPosition(monster, target);
  }
  if (monster.timer > 0) return;
  // Grabbed in the air, she's held until they've fallen to the ground.
  if (monster.state === "grab" && monster.winged && monster.z > 0) return;

  if (monster.state === "grab") {
    monster.state = "lift";
    monster.timer = 0.5;
  } else if (monster.state === "lift") {
    monster.state = "throw";
    monster.timer = 0.28;
  } else if (monster.state === "throw") {
    if (target && target.grabbedBy === monster) {
      target.grabbedBy = null;
      target.x = clamp(monster.x + 56 * monster.facing, 40, FINISH);
      target.z = 78;
      target.vy = 170;
      const throwDirection = monster.x > FINISH - MONSTER_FINISH_BACK_THROW_DISTANCE ? -1 : monster.facing;
      target.fallBackTimer = 0.85;
      target.fallBackFacing = -throwDirection;
      target.hitTimer = 0.35;
      target.knockbackX = throwDirection * MONSTER_THROW_FORCE;
      target.jumpStarted = false;
    }
    monster.target = null;
    monster.state = "walk";
    monster.timer = 0;
    if (monster.riding) monster.restTimer = MOUNTED_MONSTER_REST_AFTER_THROW;
  }
}

function setGrabbedRacerPosition(monster, racer) {
  const liftProgress = monster.state === "lift" ? 1 - monster.timer / 0.5 : monster.state === "throw" ? 1 : 0.35;
  racer.x = monster.x + 56 * monster.facing;
  racer.y = clamp(monster.y - 8, TRACK_TOP, TRACK_BOTTOM);
  racer.z = 44 + liftProgress * 70 + (monster.riding ? 70 : 0) + (monster.winged ? monster.z : 0);
  const grabCol = { grab: 0, lift: 1, throw: 2 }[monster.state];
  const hand = !(monster.riding && getTrollMountImage()) && monsterDef().grabHands?.[grabCol ?? 0];
  if (hand) {
    // On foot: hold her by the torso (270px in her 418px grabbed pose) in the
    // monster's hand, as drawn in this frame.
    const scale = monsterScale(monster);
    racer.x = monster.x + (hand[0] - SPRITE_ANCHOR_X) * scale * monster.facing;
    const handY = monsterDrawY(monster) + 58 + (hand[1] - SPRITE_ANCHOR_Y) * scale - (monster.z || 0);
    const dollScale = racerDepthScale(racer) * (jumpSpriteScale[racer.spriteKey] || jumpSpriteScale.default);
    racer.z = racer.y + 54 - handY - (SPRITE_ANCHOR_Y - 270) * dollScale;
  }
  const pose = window.TROLL_ART?.rider[3 + grabCol];
  if (monster.riding && images.troll_riding && getTrollMountImage() === images.skeleton_horse && pose?.hand) {
    const horseScale = racerDepthScale(monster) * 1.08 * MOUNTED_MONSTER_HORSE_SCALE;
    const offset = getTrollRiderOffset(true, 0, 0, 1, grabCol);
    racer.x = monster.x + (pose.hand[0] + offset.x - SPRITE_ANCHOR_X) * horseScale * monster.facing;
    const handY = monsterDrawY(monster) + 58 + (pose.hand[1] + offset.y - SPRITE_ANCHOR_Y) * horseScale - monster.z;
    // Grip the doll around her torso (270px in the 418px grabbed pose).
    const dollScale = racerDepthScale(racer) * (jumpSpriteScale[racer.spriteKey] || jumpSpriteScale.default);
    racer.z = racer.y + 54 - handY - (SPRITE_ANCHOR_Y - 270) * dollScale;
  }
  racer.speed = 0;
  racer.moving = false;
}

// A troll on foot can't jump: stopped by a hurdle, he steps round its nearer
// end (toward his target) and goes back to chasing once he's past it.
function startMonsterDetour(monster, obstacle, direction, target) {
  const bounds = getObstacleHitBounds(obstacle);
  const above = bounds.top - 54 - MONSTER_FOOT_H / 2 - 2;
  const below = bounds.bottom - 54 + MONSTER_FOOT_H / 2 + 2;
  const options = [above, below].filter(y => y >= TRACK_TOP && y <= TRACK_BOTTOM);
  if (!options.length || !direction) return;
  const y = options.reduce((best, y) => Math.abs(y - target.y) < Math.abs(best - target.y) ? y : best);
  monster.detour = { obstacle, direction, y };
}

// The lane a detouring troll heads for, or null once he's round the hurdle.
function monsterDetourY(monster, direction) {
  const detour = monster.detour;
  if (!detour) return null;
  const bounds = getObstacleHitBounds(detour.obstacle);
  const past = detour.direction > 0 ? monster.x - MONSTER_FOOT_W / 2 > bounds.right : monster.x + MONSTER_FOOT_W / 2 < bounds.left;
  if (past || direction !== detour.direction || monster.riding || !state.obstacles.includes(detour.obstacle)) {
    monster.detour = null;
    return null;
  }
  return detour.y;
}

// A cloud troll beaten for good puffs apart into drifting wisps as he fades.
function dissipateMonster(monster) {
  const scale = monsterScale(monster);
  sfx("cloud_dissipate", monster.x, { gain: 0.8 });
  // Little wisps all over where he lay, drifting up and fading.
  for (let i = 0; i < 18; i += 1) {
    spawnParticles(monster.x + (Math.random() - 0.5) * 300 * scale, monster.y + 54, 10 + Math.random() * 120 * scale, 1,
      { kind: "puff", color: i % 3 ? "#d7deeb" : "#aab4c8", speed: 30, lift: 50, gravity: -30, life: 1.1 + Math.random() * 0.6, size: 5 + Math.random() * 5 });
  }
}

// Walking into a candy troll's pile scatters the sweets (they fly off and fall
// away off the screen) and she gives a quick cheer.
function checkCandyPile(monster) {
  const racer = state.racers.find(r => !r.finished && !r.grabbedBy && r.z < 40
    && Math.abs(r.x - monster.x) < CANDY_PILE_REACH_X && Math.abs(r.y - monster.y) < CANDY_PILE_REACH_Y);
  if (!racer) return;
  monster.scattered = true;
  const groundY = monster.y + 54;
  for (const dir of [-1, 1]) {
    spawnParticles(monster.x, groundY, 20, 14, { kind: "candy", size: 16, speed: 260, lift: 760, gravity: 1500, life: 2.2, dirX: dir, fallThrough: true });
  }
  sfx("candy_celebrate", monster.x);
  racerVoice(racer, "taunt", { chance: 0.5 });
  // She cheers as she goes, without stopping.
  if (!isMounted(racer)) {
    racer.celebrateTimer = CANDY_CELEBRATE_TIME;
    getCheerImage(racer);
  }
}

function isMonsterVisible(monster) {
  return isWorldXVisibleInAnyView(monster.x);
}

function getMonsterTarget(monster) {
  // Racers, and Amanda when she's on a player's side (she fights back).
  const ally = state.amandaAlly;
  // He only chases someone he can see: get far enough away and he stops,
  // come back in sight and he's after you again.
  const inSight = racer => Math.abs(racer.x - monster.x) <= MONSTER_SIGHT_RANGE;
  const candidates = [...state.racers, ...(ally && !ally.runningAway ? [ally] : [])].filter(racer => !racer.finished && !racer.grabbedBy && !racer.cloudFalling && inSight(racer));
  if (candidates.length === 0 || !monster.active) return null;
  return candidates.reduce((best, racer) => {
    const score = Math.abs(racer.x - monster.x) + Math.abs(racer.y - monster.y) * 1.6;
    return score < best.score ? { racer, score } : best;
  }, { racer: null, score: Infinity }).racer;
}

// Only deliberate hits (a push, a thrown snowball, a unicorn beam) pass
// unhorse; Amanda's shove and mount bumps leave a riding troll in the saddle.
function applyMonsterKnockback(monster, direction, { unhorse = false } = {}) {
  if (monster.state === "sleeping" || monster.state === "ground") return;
  if (monster.riding && unhorse) unhorseMonster(monster, direction);
  if (monster.target?.grabbedBy === monster) monster.target.grabbedBy = null;
  monster.target = null;
  monster.knockedBacks += 1;
  monster.state = "fall";
  monster.timer = 0.55;
  monster.knockbackX = direction * PUSH_FORCE;
  monster.facing = direction < 0 ? -1 : 1;
}

// Pushed or hit off his horse (see applyMonsterKnockback), a troll carries on on foot and the horse bolts
// the way he was knocked, all the way off the track.
function unhorseMonster(monster, direction) {
  monster.riding = false;
  monster.restTimer = 0;
  monster.z = 0;
  monster.vy = 0;
  if (getTrackTheme().trollMount === "skeleton_horse" && images.skeleton_horse) {
    // His skeleton horse stays, for anyone to ride (game-mounts.js bumps).
    const facing = direction < 0 ? -1 : 1;
    state.powerups.push(makeLooseMount("skeleton_horse", monster.x + facing * 80, monster.y + 54, SKELETON_HORSE_TIME, facing));
    sfx("troll_unhorsed", monster.x);
    sfx("skeleton_horse_whinny", monster.x, { gain: 0.8 });
    return;
  }
  state.runawayHorses.push({
    x: monster.x,
    y: monster.y,
    facing: direction < 0 ? -1 : 1,
    frameTime: 0,
    frame: 0
  });
  sfx("troll_unhorsed", monster.x);
  sfx(getTrollMountImage() === images.skeleton_horse ? "skeleton_horse_whinny" : "horse_whinny", monster.x, { gain: 0.8 });
}

function updateRunawayHorses(dt) {
  for (const horse of state.runawayHorses) {
    horse.x += horse.facing * RUNAWAY_HORSE_SPEED * dt;
    horse.frameTime += dt * 10;
    horse.frame = Math.floor(horse.frameTime) % 3;
  }
  state.runawayHorses = state.runawayHorses.filter(horse => horse.x > -600 && horse.x < FINISH + 1600);
}

function stunMonsterWithEmp(monster, { dizzy = false } = {}) {
  if (monster.state === "sleeping" || monster.state === "ground") return;
  if (dizzy) {
    monster.dizzyTimer = 2;
    sfx("emp_dizzy", monster.x, { gain: 0.8 });
  }
  if (monster.target?.grabbedBy === monster) {
    monster.target.grabbedBy = null;
    monster.target.vy = Math.max(monster.target.vy, 100);
  }
  monster.target = null;
  monster.state = "fall";
  monster.timer = 2;
  monster.knockbackX = 0;
}

function drawMonster(monster) {
  if (monster.scattered) return; // its candy pile is gone
  const dissipating = monsterDef().defeated === "dissipate";
  if (dissipating && monster.state === "sleeping") return;
  const screenX = monster.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (screenX < -280 || screenX > viewWidth + 280) return;
  const frame = monsterFrame(monster);
  const attack = monster.state === "lightning" && images.cloudtroll_lightning;
  const scale = monsterScale(monster) * monsterRowScale(frame.row, frame.col);
  const visualY = monsterDrawY(monster);
  const cellSize = attack ? 512 : FRAME;
  const sx = (attack ? monster.lightningTime < 0.45 ? 0 : monster.lightningTime < 0.65 ? 1 : 2 : frame.col) * cellSize;
  const sy = attack ? 0 : frame.row * FRAME;
  const drawW = FRAME * scale;
  const drawH = FRAME * scale;
  const drawX = screenX - SPRITE_ANCHOR_X * scale;
  const flyZ = monster.winged ? monster.z : 0;
  const drawY = visualY + 58 - SPRITE_ANCHOR_Y * scale - flyZ;
  ctx.save();
  if (dissipating && monster.state === "ground") ctx.globalAlpha = clamp(monster.timer, 0, 1);

  ctx.save();
  ctx.globalAlpha *= floorShadowAlpha(monster.state === "drop" ? 0.14 : 0.32);
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, monster.y + 42, 62 * scale, 15 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const drawFacing = monster.state === "fall" ? -monster.facing : monster.facing;
  if (monster.frogTimer > 0) {
    drawFrog(screenX, monster.y + 54, racerDepthScale(monster), true, monster.frogPhase || 0, monster.facing);
    ctx.restore();
    return;
  }
  if (monster.riding && getTrollMountImage()) {
    drawMountedMonster(monster, getTrollMountImage(), screenX, visualY, drawFacing);
    ctx.restore();
    return;
  }
  // Flying, a winged troll swoops (cells 1-2) or hovers level with her
  // (cell 3) once the flying sheet is in (image-requests.md §28 TF1).
  const flyingArt = monster.winged && monster.z > 20 && monster.state === "walk" ? getSharedArt("troll_flying") : null;
  if (flyingArt?.complete && flyingArt.width) {
    const near = monster.target && Math.abs(monster.target.x - monster.x) < 120;
    const col = near ? 2 : Math.floor(monster.frameTime / 2) % 2;
    drawFairyWings(monster, flyingArt, col * FRAME, 0, drawX, drawY, drawW, drawFacing, screenX);
    drawFacingImage(flyingArt, col * FRAME, 0, FRAME, FRAME, drawX, drawY, drawW, drawH, drawFacing, screenX);
    ctx.restore();
    return;
  }
  if (monster.winged && !attack && !(dissipating && monster.state === "ground")) {
    drawFairyWings(monster, getMonsterImage(), sx, sy, drawX, drawY, drawW, drawFacing, screenX);
  }
  if (attack) {
    drawFacingImage(attack, sx, sy, 512, 512, screenX - 256 * scale, visualY + 58 - 503 * scale, 512 * scale, 512 * scale, drawFacing, screenX);
  } else if (dissipating && monster.state === "ground") {
    // Fading, he swells a little and drifts up, like a cloud breaking apart.
    const gone = 1 - clamp(monster.timer, 0, 1);
    const swell = 1 + gone * 0.25;
    drawFacingImage(getMonsterImage(), sx, sy, FRAME, FRAME, screenX - SPRITE_ANCHOR_X * scale * swell, visualY + 58 - SPRITE_ANCHOR_Y * scale * swell - gone * 40 * scale,
      drawW * swell, drawH * swell, drawFacing, screenX);
  } else drawFacingImage(getMonsterImage(), sx, sy, FRAME, FRAME, drawX, drawY, drawW, drawH, drawFacing, screenX);
  ctx.restore();
  if (monster.dizzyTimer > 0 && monster.state === "fall") {
    // Seeing stars over his head where he lies.
    drawDizzyStars(screenX - 20 * scale * drawFacing, visualY + 58 - 250 * scale, scale * 1.4, Math.min(1, monster.dizzyTimer * 2));
  }
}

function updateMonsterLightning(monster, dt) {
  monster.lightningTime += dt;
  if (!monster.lightningReleased && monster.lightningTime >= 0.45) {
    monster.lightningReleased = true;
    const scale = monsterScale(monster);
    const x = monster.x + (450 - 256) * scale * monster.facing;
    // Aimed at where she'll be: a flier (wings, broom, pegasus) is shot at
    // up in the air, and knocked off her mount unless she dodges.
    const target = monster.target;
    const time = target ? Math.max(0.1, Math.abs(target.x - x) / MONSTER_BOLT_SPEED) : 1;
    const aimZ = target ? clamp(target.z + (target.vy || 0) * time * 0.5, 0, 320) : 0;
    (state.monsterBolts ||= []).push({
      x, y: monster.y, z: 0, drawY: monster.y + 58 + (280 - 503) * scale,
      vx: monster.facing * MONSTER_BOLT_SPEED, vz: aimZ / time, life: 1.3
    });
    sfx("storm_lightning", monster.x, { gain: 0.8 });
  }
  if (monster.lightningTime >= 0.9) monster.state = "walk";
}

function updateMonsterBolts(dt) {
  for (const bolt of state.monsterBolts || []) {
    const previousX = bolt.x;
    bolt.x += bolt.vx * dt;
    bolt.z = Math.max(0, (bolt.z || 0) + (bolt.vz || 0) * dt);
    bolt.life -= dt;
    for (const racer of state.racers) {
      if (racer.finished || racer.grabbedBy || racer.fallBackTimer > 0 || Math.abs(racer.z - (bolt.z || 0)) > MONSTER_BOLT_REACH_Z) continue;
      if (racer.x < Math.min(previousX, bolt.x) - 35 || racer.x > Math.max(previousX, bolt.x) + 35 || Math.abs(racer.y - bolt.y) > 44) continue;
      if (racer === bolt.owner) continue;
      // Knocked off any mount and shocked, as by a lightning EMP.
      if (isMounted(racer)) dismountIntoPickup(racer);
      applyEmpHit({ x: racer.x - (Math.sign(bolt.vx) || 1) }, racer, "lightning", MONSTER_BOLT_COLOR);
      racer.fallBackTimer = Math.max(racer.fallBackTimer, 0.6);
      bolt.life = 0;
      break;
    }
  }
  state.monsterBolts = (state.monsterBolts || []).filter(bolt => bolt.life > 0);
}

// A plain bright zigzag lightning bolt, pointing the way it flies.
const MONSTER_BOLT_SHAPE = [[-46, -9], [-4, -13], [-8, -3], [46, 0], [2, 14], [6, 4], [-46, 2]];

function drawMonsterBolt(bolt) {
  const x = bolt.x - state.camera;
  ctx.save();
  ctx.translate(x, bolt.drawY - (bolt.z || 0));
  ctx.scale(Math.sign(bolt.vx) || 1, 1);
  ctx.rotate(-Math.atan2(bolt.vz || 0, Math.abs(bolt.vx)));
  ctx.scale(1.3, 1.3);
  ctx.beginPath();
  MONSTER_BOLT_SHAPE.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.shadowColor = MONSTER_BOLT_COLOR;
  ctx.shadowBlur = 18;
  ctx.fillStyle = MONSTER_BOLT_COLOR;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff8c8";
  ctx.stroke();
  ctx.restore();
}

// A troll on horseback. Knocked down (fall/ground/sleeping) he's on foot in
// front of his standing horse. Until the skeleton horse and riding-troll
// sheets are in (image-requests.md §6), the plain horse is drawn darkened and
// the troll's standing frames sit on the saddle.
function getTrollRiderOffset(skeleton, horseRow, horseCol, riderRow, riderCol) {
  const horse = skeleton && window.TROLL_ART?.horse[horseRow * 3 + horseCol];
  const rider = window.TROLL_ART?.rider[riderRow * 3 + riderCol];
  if (!horse || !rider) return { x: 0, y: 0 };
  return { x: horse.seat[0] - rider.hip[0], y: horse.seat[1] - rider.hip[1] };
}

function drawRunawayHorse(horse) {
  const screenX = horse.x - state.camera;
  if (screenX < -300 || screenX > getWorldViewportWidth() + 300) return;
  const horseImage = getTrollMountImage() || images.horse;
  const horseScale = racerDepthScale(horse) * 1.08 * MOUNTED_MONSTER_HORSE_SCALE;
  const calibration = getMountFrameCalibration("horse", 1, horse.frame);
  const horseW = FRAME * horseScale;
  ctx.save();
  ctx.globalAlpha = floorShadowAlpha(0.28);
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, horse.y + 42, 70 * horseScale, 16 * horseScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  if (horseImage === images.horse) ctx.filter = "grayscale(1) brightness(0.45) contrast(1.6)";
  drawFacingImage(horseImage, horse.frame * FRAME, FRAME, FRAME, FRAME,
    screenX - SPRITE_ANCHOR_X * horseScale, horse.y + 58 - SPRITE_ANCHOR_Y * horseScale + calibration.groundShift * horseScale,
    horseW, horseW, horse.facing, screenX);
  ctx.restore();
}

function drawMountedMonster(monster, horseImage, screenX, visualY, facing) {
  const scale = racerDepthScale(monster);
  const horseScale = scale * 1.08 * MOUNTED_MONSTER_HORSE_SCALE;
  const horseW = FRAME * horseScale;
  const unhorsed = monster.state === "fall" || monster.state === "ground" || monster.state === "sleeping";
  const galloping = !unhorsed && monster.state === "walk";
  const jumping = !unhorsed && monster.z > 0;
  const horseRow = jumping ? 2 : galloping ? 1 : 0;
  const horseCol = jumping ? (monster.vy > 300 ? 0 : monster.vy > -300 ? 1 : 2) : galloping ? monster.frame : 0;
  const calibration = getMountFrameCalibration("horse", horseRow, horseCol);
  const horseBaseY = visualY + 58 - SPRITE_ANCHOR_Y * horseScale - (unhorsed ? 0 : monster.z);
  const horseScreenX = unhorsed ? screenX - 70 * scale * facing : screenX;
  const horseX = horseScreenX - SPRITE_ANCHOR_X * horseScale;
  const placeholder = horseImage === images.horse;
  ctx.save();
  if (placeholder) ctx.filter = "grayscale(1) brightness(0.45) contrast(1.6)";
  drawFacingImage(horseImage, horseCol * FRAME, horseRow * FRAME, FRAME, FRAME, horseX, horseBaseY + calibration.groundShift * horseScale, horseW, horseW, facing, horseScreenX);
  ctx.restore();

  const frame = monsterFrame(monster);
  if (unhorsed) {
    const trollScale = monsterScale(monster) * monsterRowScale(frame.row, frame.col);
    drawFacingImage(getMonsterImage(), frame.col * FRAME, frame.row * FRAME, FRAME, FRAME, screenX - SPRITE_ANCHOR_X * trollScale, visualY + 58 - SPRITE_ANCHOR_Y * trollScale, FRAME * trollScale, FRAME * trollScale, facing, screenX);
    return;
  }
  const seatDX = (calibration.seatX - MOUNT_SEAT_REFERENCE.x) * horseScale;
  const seatDY = (calibration.seatY - MOUNT_SEAT_REFERENCE.y) * horseScale;
  const ridingSheet = images.troll_riding;
  if (ridingSheet) {
    // Same frame, scale and anchor as the horse: rows are ride, then grab/lift/throw.
    const grabCol = { grab: 0, lift: 1, throw: 2 }[monster.state];
    const row = grabCol === undefined ? 0 : 1;
    const col = grabCol === undefined ? monster.frame : grabCol;
    const offset = getTrollRiderOffset(horseImage === images.skeleton_horse, horseRow, horseCol, row, col);
    drawFacingImage(ridingSheet, col * FRAME, row * FRAME, FRAME, FRAME,
      horseX + offset.x * horseScale,
      horseBaseY + (calibration.groundShift + offset.y) * horseScale,
      horseW, horseW, facing, screenX);
    return;
  }
  const trollScale = scale * MONSTER_HEIGHT_SCALE * 0.78;
  const trollX = screenX - SPRITE_ANCHOR_X * trollScale + 9 * scale + seatDX;
  const trollY = horseBaseY - 30 * scale + seatDY;
  drawFacingImage(getMonsterImage(), frame.col * FRAME, frame.row * FRAME, FRAME, FRAME, trollX, trollY, FRAME * trollScale, FRAME * trollScale, facing, screenX);
}

// The on-foot monster's draw scale: depth, the monster size, and its sheet's tweak.
function monsterScale(monster) {
  return racerDepthScale(monster) * MONSTER_HEIGHT_SCALE * (monsterDef().scale || 1);
}

// A sheet's own correction for one sprite row painted at a different size
// from the rest (monsters.js rowScale), drawn around the feet.
function monsterRowScale(row, col = 0) {
  const scale = monsterDef().rowScale?.[row];
  return (Array.isArray(scale) ? scale[col] : scale) || 1;
}

function monsterDrawY(monster) {
  if (monster.state !== "drop" || monster.dropDuration <= 0) return monster.y;
  const progress = clamp(monster.dropTimer / monster.dropDuration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return monster.dropStartY + (monster.y - monster.dropStartY) * eased;
}

function monsterFrame(monster) {
  if (monster.state === "drop") return { row: 0, col: 0 };
  if (monster.state === "fall") return { row: 3, col: 0 };
  if (monster.state === "ground") return { row: 3, col: 1 };
  if (monster.state === "sleeping") return { row: 3, col: 2 };
  if (monster.state === "grab") return { row: 2, col: 0 };
  if (monster.state === "lift") return { row: 2, col: 1 };
  if (monster.state === "throw") return { row: 2, col: 2 };
  if (monster.state === "walk") return { row: 1, col: monster.frame };
  return { row: 0, col: monster.frame };
}
