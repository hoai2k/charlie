// Amanda's fence prank: she pops up from a hurdle to push racers, and can be caught.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

function isAmandaMode() {
  return state.specials === "amanda-mode";
}

function getAmandaHazardInterval() {
  const config = getModeConfig();
  const racerCount = config.humans + config.ais;
  const amandaIsRacing = characterSelects
    .slice(0, racerCount)
    .some((select, index) => getSelectedCharacter(select, CHARACTER_FALLBACKS[index])?.spriteKey === "amanda");
  if (amandaIsRacing) return 0;
  return isAmandaMode() ? AMANDA_HAZARD_MODE_INTERVAL : AMANDA_HAZARD_DEFAULT_INTERVAL;
}

function updateAmandaHazards(dt) {
  for (const obstacle of state.obstacles) {
    if (!obstacle.amandaHazard) continue;
    if (AMANDA_CAUGHT_STATES.includes(obstacle.amandaState)) {
      updateCaughtAmanda(obstacle, dt);
      continue;
    }
    // Once she's been caught she stops the prank everywhere else.
    if (state.amandaCaught) {
      if (obstacle.amandaState === "emerging" || obstacle.amandaState === "pushing") {
        obstacle.amandaState = "retreating";
        obstacle.amandaTimer = 0;
      }
      if (obstacle.amandaState === "hidden") continue;
    }
    obstacle.amandaCooldown = Math.max(0, obstacle.amandaCooldown - dt);

    if (obstacle.amandaState === "hidden") {
      obstacle.amandaReveal = 0;
      if (obstacle.amandaCooldown > 0) continue;
      const target = findAmandaHazardTarget(obstacle);
      if (!target) continue;
      obstacle.amandaState = "emerging";
      obstacle.amandaTimer = 0;
      sfx("amanda_emerge", obstacle.x);
      obstacle.amandaTarget = target;
      obstacle.amandaFacing = target.x < obstacle.x ? -1 : 1;
      continue;
    }

    obstacle.amandaTimer += dt;
    if (obstacle.amandaState === "emerging") {
      obstacle.amandaReveal = smoothAmandaHazardProgress(obstacle.amandaTimer / AMANDA_HAZARD_EMERGE_TIME);
      if (obstacle.amandaTimer >= AMANDA_HAZARD_EMERGE_TIME) {
        obstacle.amandaState = "pushing";
        obstacle.amandaTimer = 0;
        obstacle.amandaReveal = 1;
        sfx("amanda_shove", obstacle.x);
        sfx("amanda_giggle_sting", obstacle.x, { gain: 0.8 });
        GameAudio.voice("amanda", "taunt", { worldX: obstacle.x, chance: 0.4 });
        pushRacersFromAmandaHazard(obstacle);
      }
    } else if (obstacle.amandaState === "pushing") {
      obstacle.amandaReveal = 1;
      if (obstacle.amandaTimer >= AMANDA_HAZARD_HOLD_TIME) {
        obstacle.amandaState = "retreating";
        obstacle.amandaTimer = 0;
        sfx("amanda_retreat", obstacle.x);
      }
    } else if (obstacle.amandaState === "retreating") {
      obstacle.amandaReveal = 1 - smoothAmandaHazardProgress(obstacle.amandaTimer / AMANDA_HAZARD_RETREAT_TIME);
      if (obstacle.amandaTimer >= AMANDA_HAZARD_RETREAT_TIME) {
        obstacle.amandaState = "hidden";
        obstacle.amandaTimer = 0;
        obstacle.amandaReveal = 0;
        obstacle.amandaCooldown = AMANDA_HAZARD_COOLDOWN;
        obstacle.amandaTarget = null;
      }
    }
  }
}

// On tracks with amandaPushesTrolls, Amanda also pops up for a troll and
// shoves him back (dropping anyone he's holding).
function getAmandaPushableTrolls() {
  if (!getTrackTheme().amandaPushesTrolls) return [];
  return state.monsters.filter(monster => monster.active && monster.z < 100 && ["walk", "idle", "grab", "lift", "throw"].includes(monster.state));
}

function findAmandaHazardTarget(obstacle) {
  return [...state.racers.filter(racer => !racer.finished && !racer.grabbedBy && racer.z < 100), ...getAmandaPushableTrolls()]
    .filter(racer => Math.abs(racer.x - obstacle.x) <= AMANDA_HAZARD_TRIGGER_X)
    .filter(racer => Math.abs((racer.y + 54) - (obstacle.y + 18)) <= AMANDA_HAZARD_TRIGGER_Y)
    .sort((a, b) => Math.abs(a.x - obstacle.x) - Math.abs(b.x - obstacle.x))[0] || null;
}

function pushRacersFromAmandaHazard(obstacle) {
  for (const racer of state.racers) {
    if (racer.finished || racer.grabbedBy || racer.z >= 110) continue;
    const dx = racer.x - obstacle.x;
    const dy = (racer.y + 54) - (obstacle.y + 18);
    const pushRangeX = racer === obstacle.amandaTarget ? AMANDA_HAZARD_TARGET_PUSH_X : AMANDA_HAZARD_PUSH_X;
    if (Math.abs(dx) > pushRangeX || Math.abs(dy) > AMANDA_HAZARD_PUSH_Y) continue;
    const direction = racer === obstacle.amandaTarget
      ? obstacle.amandaFacing
      : Math.sign(dx) || -Math.sign(racer.speed) || -racer.facing || 1;
    racer.fallBackTimer = Math.max(racer.fallBackTimer, 0.7);
    racer.fallBackFacing = -direction;
    racer.hitTimer = Math.max(racer.hitTimer, 0.3);
    racer.knockbackX = direction * AMANDA_HAZARD_PUSH_FORCE;
    racer.vy = Math.max(racer.vy, 170);
    racer.jumpStarted = false;
  }
  for (const monster of getAmandaPushableTrolls()) {
    const dx = monster.x - obstacle.x;
    const dy = (monster.y + 54) - (obstacle.y + 18);
    const pushRangeX = monster === obstacle.amandaTarget ? AMANDA_HAZARD_TARGET_PUSH_X : AMANDA_HAZARD_PUSH_X;
    if (Math.abs(dx) > pushRangeX || Math.abs(dy) > AMANDA_HAZARD_PUSH_Y) continue;
    applyMonsterKnockback(monster, monster === obstacle.amandaTarget ? obstacle.amandaFacing : Math.sign(dx) || 1);
  }
}

function updateCaughtAmanda(obstacle, dt) {
  obstacle.amandaTimer += dt;
  if (obstacle.amandaState === "sitting") {
    // A player who walks up to her (not pushing) tags her: she joins that player.
    const tagger = state.racers.find(racer => !racer.ai && !racer.finished && !racer.grabbedBy && racer.moving
      && racer.pushTimer === 0 && racer.z < 100
      && Math.abs(racer.x - obstacle.x) < AMANDA_TAG_RANGE_X
      && Math.abs(racer.y + 54 - (obstacle.y + 18)) < AMANDA_HIT_RANGE_Y
      && Math.sign(obstacle.x - racer.x) === Math.sign(racer.speed || racer.facing));
    if (tagger) {
      joinAmanda(obstacle, tagger);
      return;
    }
  }
  const next = { tumble: [AMANDA_TUMBLE_TIME, "down"], down: [AMANDA_DOWN_TIME, "climb"], climb: [AMANDA_CLIMB_TIME, "sitting"], bonked: [AMANDA_BONK_TIME, "sitting"] }[obstacle.amandaState];
  if (next && obstacle.amandaTimer >= next[0]) {
    obstacle.amandaState = next[1];
    obstacle.amandaTimer = 0;
    if (next[1] === "down") {
      const spot = amandaLandingSpot(obstacle);
      spawnParticles(obstacle.x + spot.x, obstacle.y + spot.y, 0, 8, { color: "#e8dcc0", kind: "puff", speed: 90, lift: 30, life: 0.5, size: 12, gravity: 0 });
    }
  }
}

// Tagged: she hops off her fence and follows that player for the rest of the
// race at her own running speed (a rider can leave her behind; she just keeps
// coming), hopping hurdles and pushing other racers and monsters out of the way.
function joinAmanda(obstacle, leader) {
  obstacle.amandaState = "hidden";
  obstacle.amandaReveal = 0;
  state.amandaAlly = {
    leader,
    spriteKey: "amanda",
    x: obstacle.x,
    y: obstacle.y + 18 - 54,
    z: hurdleTopZ(),
    vy: 260,
    facing: leader.x < obstacle.x ? -1 : 1,
    frame: 0,
    frameTime: 0,
    moving: false,
    pushTimer: 0,
    pushCooldown: 0.4,
    // racer-like fields, so monsters can grab and throw her like a racer
    grabbedBy: null,
    fallBackTimer: 0,
    fallBackFacing: 1,
    hitTimer: 0,
    knockbackX: 0,
    speed: 0,
    finished: false,
    timesPushed: 0,
    runningAway: false,
    clock: 0,
    trail: [] // where her player has been: { t, x, y }
  };
  sfx("amanda_giggle_sting", obstacle.x);
  GameAudio.voice("amanda", "taunt", { worldX: obstacle.x, chance: 1 });
  spawnParticles(obstacle.x, obstacle.y + 18, 80, 14, { color: "#ffd84a", speed: 160, lift: 200, life: 0.5 });
}

// Someone she should push: a monster near her player or near her (she stands
// and fights it), or another racer right by her.
function amandaAllyTarget(ally) {
  const leader = ally.leader;
  // A monster she's already fighting stays her foe until it's beaten or gone.
  const foe = ally.foe;
  if (foe && foe.active && !["sleeping", "ground", "drop"].includes(foe.state) && !(foe.frogTimer > 0)
    && Math.abs(foe.x - ally.x) < AMANDA_ALLY_FIGHT_RANGE) {
    return foe.state === "fall" ? null : foe;
  }
  ally.foe = null;
  const monsters = state.monsters.filter(m => m.active && !["sleeping", "ground", "fall", "drop"].includes(m.state) && !(m.frogTimer > 0));
  const near = (list, from, range) => list.filter(c => Math.abs(c.x - from.x) < range && Math.abs(c.y - from.y) < 120)
    .sort((a, b) => Math.abs(a.x - from.x) - Math.abs(b.x - from.x))[0] || null;
  return near(monsters, leader, AMANDA_ALLY_GUARD_RANGE)
    || near(monsters, ally, AMANDA_ALLY_GUARD_RANGE)
    || near(state.racers.filter(r => r !== leader && !r.finished && !r.grabbedBy), ally, AMANDA_ALLY_PUSH_RANGE * 1.6);
}

// Her own jumps, and being thrown or shoved: falling back and sliding.
function allyFallAndSlide(ally, dt) {
  if (ally.z > 0 || ally.vy > 0) {
    ally.z += ally.vy * dt;
    ally.vy -= GRAVITY * dt;
    if (ally.z <= 0) { ally.z = 0; ally.vy = 0; }
  }
  if (ally.knockbackX) {
    ally.x = clamp(ally.x + ally.knockbackX * dt, 40, FINISH);
    ally.knockbackX *= Math.pow(0.04, dt);
    if (Math.abs(ally.knockbackX) < 6) ally.knockbackX = 0;
  }
}

// Someone pushed her: she stumbles back; the fifth push and she's had enough
// and runs off the way she came, out of the race.
function pushAmandaAlly(ally, attacker, direction) {
  if (ally.runningAway || ally.grabbedBy || ally.fallBackTimer > 0.2) return;
  ally.timesPushed += 1;
  ally.fallBackTimer = 0.55;
  ally.fallBackFacing = -direction;
  ally.knockbackX = direction * PUSH_FORCE;
  ally.vy = Math.max(ally.vy, 160);
  sfx("amanda_bonk", ally.x);
  if (ally.timesPushed >= AMANDA_ALLY_MAX_PUSHES) {
    ally.runningAway = true;
    GameAudio.voice("amanda", "hit", { worldX: ally.x, chance: 1 });
  }
}

function updateAmandaAlly(dt) {
  const ally = state.amandaAlly;
  if (!ally) return;
  ally.fallBackTimer = Math.max(0, ally.fallBackTimer - dt);
  ally.hitTimer = Math.max(0, ally.hitTimer - dt);
  ally.frameTime += dt * (ally.moving ? 9.5 : 3.2);
  ally.frame = Math.floor(ally.frameTime) % 3;
  // A monster has her: it moves her about (updateMonsterGrabSequence).
  if (ally.grabbedBy) {
    ally.moving = false;
    return;
  }
  if (ally.fallBackTimer > 0) {
    ally.moving = false;
    allyFallAndSlide(ally, dt);
    return;
  }
  if (ally.runningAway) {
    ally.facing = -1;
    ally.moving = true;
    ally.x -= AMANDA_ALLY_SPEED * 1.25 * dt;
    allyFallAndSlide(ally, dt);
    const left = Math.min(...getActiveWorldViewRanges().map(range => range.left), state.camera);
    if (ally.x < left - 300 || ally.x < 0) state.amandaAlly = null;
    return;
  }
  if (!state.racers.includes(ally.leader)) {
    ally.leader = state.racers.find(r => !r.ai) || ally.leader;
  }
  const leader = ally.leader;
  ally.clock += dt;
  ally.trail.push({ t: ally.clock, x: leader.x, y: leader.y });
  while (ally.trail.length > 2 && ally.trail[1].t <= ally.clock - AMANDA_ALLY_FOLLOW_DELAY) ally.trail.shift();
  ally.pushTimer = Math.max(0, ally.pushTimer - dt);
  ally.pushCooldown = Math.max(0, ally.pushCooldown - dt);
  const enemy = leader.finished ? null : amandaAllyTarget(ally);
  if (enemy && state.monsters.includes(enemy)) ally.foe = enemy;
  // While her foe is down, she waits nearby for it to get up.
  const waiting = !enemy && ally.foe;
  // Head for the enemy, or follow her player's path a moment behind, coming
  // to stand right beside her when she stops.
  const behind = ally.trail[0];
  // She keeps behind her player while she runs, and stays on her side when she stops.
  const leaderDir = Math.abs(leader.speed || 0) > 20 ? Math.sign(leader.speed) : 0;
  const side = leaderDir ? -leaderDir : Math.sign(ally.x - leader.x) || -(leader.facing || 1);
  const besideX = leader.x + side * AMANDA_ALLY_STAND_GAP;
  const followX = side < 0 ? Math.min(behind.x, besideX) : Math.max(behind.x, besideX);
  const goalX = enemy ? enemy.x - Math.sign(enemy.x - ally.x || 1) * 40 : waiting ? ally.x : followX;
  const goalY = enemy ? enemy.y : waiting ? ally.y : clamp(behind.y + 24, TRACK_TOP, TRACK_BOTTOM);
  const dx = goalX - ally.x;
  const dy = goalY - ally.y;
  const speed = Math.max(AMANDA_ALLY_SPEED, Math.abs(leader.speed || 0)) * AMANDA_ALLY_CATCH_UP;
  const step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
  const laneStep = Math.sign(dy) * Math.min(Math.abs(dy), PLAYER_LANE_SPEED * dt);
  // She runs (and her legs move) whenever she's actually going somewhere.
  ally.moving = Math.abs(step) > 20 * dt || Math.abs(laneStep) > 20 * dt;
  ally.x = clamp(ally.x + step, 40, FINISH);
  ally.y = clamp(ally.y + laneStep, TRACK_TOP, TRACK_BOTTOM);
  if (Math.abs(dx) > 4) ally.facing = dx < 0 ? -1 : 1;
  else if (!enemy && !ally.moving) ally.facing = leader.facing || ally.facing;
  if (enemy && Math.abs(enemy.x - ally.x) < 160) ally.facing = enemy.x < ally.x ? -1 : 1;
  // Hop any hurdle in her way.
  if (ally.z === 0 && Math.abs(step) > 0) {
    const footY = ally.y + 54;
    const hurdle = state.obstacles.some(obstacle => {
      const b = getObstacleHitBounds(obstacle);
      const ahead = ally.facing > 0 ? b.left - ally.x : ally.x - b.right;
      return ahead > -10 && ahead < 60 && footY + 12 > b.top && footY - 12 < b.bottom;
    });
    if (hurdle || cloudGapAhead(ally.x, ally.facing, 60)) ally.vy = JUMP_POWER;
  }
  allyFallAndSlide(ally, dt);
  // Push whoever is right in front of her.
  if (!enemy || ally.pushCooldown > 0 || ally.z > 64) return;
  const ex = enemy.x - ally.x;
  if (ex * ally.facing <= 0 || Math.abs(ex) > AMANDA_ALLY_PUSH_RANGE || Math.abs(enemy.y - ally.y) > PUSH_RANGE_Y + 18) return;
  ally.pushTimer = 0.3;
  ally.pushCooldown = AMANDA_ALLY_PUSH_COOLDOWN;
  sfx("amanda_shove", ally.x);
  if (state.monsters.includes(enemy)) applyMonsterKnockback(enemy, ally.facing, { unhorse: true });
  else applyPushHit(ally, enemy, ally.facing);
}

function drawAmandaAlly(ally) {
  const screenX = ally.x - state.camera;
  if (screenX < -200 || screenX > getWorldViewportWidth() + 200) return;
  const scale = racerDepthScale(ally);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, ally.y + 42, 48 * scale * 2, 13 * scale * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const fallen = ally.grabbedBy || ally.fallBackTimer > 0;
  const [row, col] = fallen ? [3, 2] : ally.pushTimer > 0 ? [3, 1] : ally.z > 0 ? [2, 1] : ally.moving ? [1, ally.frame] : [0, ally.frame];
  drawFacingImage(images.amanda, col * FRAME, row * FRAME, FRAME, FRAME,
    screenX - SPRITE_ANCHOR_X * scale, ally.y + 54 - SPRITE_ANCHOR_Y * scale - ally.z,
    FRAME * scale, FRAME * scale, fallen ? ally.fallBackFacing : ally.facing, screenX);
  ctx.save();
  ctx.font = "800 15px system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.fillStyle = characters.amanda?.color || "#263d8f";
  const labelY = ally.y + 54 - ally.z - (SPRITE_ANCHOR_Y - 40) * scale;
  ctx.strokeText("Amanda", screenX, labelY);
  ctx.fillText("Amanda", screenX, labelY);
  ctx.restore();
}

// Is Amanda where a hit at (x, groundY) would land? Popped up enough to see,
// or sitting on her fence after being caught.
function amandaAt(x, groundY, rangeX = AMANDA_HIT_RANGE_X) {
  return state.obstacles.find(obstacle => {
    if (!obstacle.amandaHazard) return false;
    const showing = (["emerging", "pushing", "retreating"].includes(obstacle.amandaState) && obstacle.amandaReveal > 0.3)
      || obstacle.amandaState === "sitting" || obstacle.amandaState === "bonked";
    return showing && Math.abs(x - obstacle.x) <= rangeX && Math.abs(groundY - (obstacle.y + 18)) <= AMANDA_HIT_RANGE_Y;
  }) || null;
}

function hitAmanda(obstacle, direction) {
  if (obstacle.amandaState === "sitting" || obstacle.amandaState === "bonked") {
    obstacle.amandaState = "bonked";
    obstacle.amandaTimer = 0;
    obstacle.amandaBonkDir = direction || 1;
    sfx("amanda_bonk", obstacle.x);
    return;
  }
  obstacle.amandaStartY = 170 - obstacle.amandaReveal * 148;
  obstacle.amandaState = "tumble";
  obstacle.amandaTimer = 0;
  obstacle.amandaFallDir = direction || 1;
  obstacle.amandaFacing = -obstacle.amandaFallDir;
  obstacle.amandaTarget = null;
  state.amandaCaught = obstacle;
  sfx("amanda_caught", obstacle.x);
  spawnParticles(obstacle.x, obstacle.y + 18, 90, 12, { color: "#ffd84a", speed: 180, lift: 220, life: 0.5 });
}

// Where she lands when she tumbles out: beside the fence, on the track side.
function amandaLandingSpot(obstacle) {
  return { x: obstacle.amandaFallDir * 74, y: 40 };
}

// Caught Amanda, drawn in front of her fence (obstacle-local coordinates).
function drawCaughtAmanda(obstacle) {
  if (!AMANDA_CAUGHT_STATES.includes(obstacle.amandaState)) return;
  const scale = racerDepthScale({ y: obstacle.y + 18 - 54 });
  const t = obstacle.amandaTimer;
  const spot = amandaLandingSpot(obstacle);
  const seatY = 18 - hurdleTopZ();
  let row = 3;
  let col = 2;
  let footX = 0;
  let footY = 0;
  let tilt = 0;
  let seated = false;
  if (obstacle.amandaState === "tumble") {
    const k = smoothAmandaHazardProgress(t / AMANDA_TUMBLE_TIME);
    footX = spot.x * k;
    footY = obstacle.amandaStartY + (spot.y - obstacle.amandaStartY) * k - Math.sin(Math.PI * k) * 70;
    tilt = obstacle.amandaFallDir * k * 0.5;
  } else if (obstacle.amandaState === "down") {
    footX = spot.x;
    footY = spot.y;
    tilt = obstacle.amandaFallDir * 0.5;
  } else if (obstacle.amandaState === "climb") {
    const k = smoothAmandaHazardProgress(t / AMANDA_CLIMB_TIME);
    row = 0;
    col = 0;
    footX = spot.x * (1 - k);
    footY = spot.y + (seatY - spot.y) * k - Math.sin(Math.PI * k) * 40;
  } else {
    seated = true;
    footY = seatY;
    if (obstacle.amandaState === "bonked") {
      // Knocked back for a moment, wobbling on the fence, then sits again.
      tilt = obstacle.amandaBonkDir * Math.sin(t * 22) * 0.18 * (1 - t / AMANDA_BONK_TIME);
    } else {
      row = 3;
      col = 0;
      tilt = Math.sin(performance.now() / 600) * 0.03;
    }
  }
  const facing = obstacle.amandaFacing || 1;
  const anchorX = seated && col === 0 ? AMANDA_SEAT.x : SPRITE_ANCHOR_X;
  const anchorY = seated && col === 0 ? AMANDA_SEAT.y : seated ? 300 : SPRITE_ANCHOR_Y;
  ctx.save();
  ctx.translate(footX, footY);
  ctx.rotate(tilt);
  ctx.shadowColor = "rgba(23,33,38,0.24)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  drawFacingImage(images.amanda, col * FRAME, row * FRAME, FRAME, FRAME,
    -anchorX * scale, -anchorY * scale, FRAME * scale, FRAME * scale, facing, 0);
  ctx.restore();
}

function smoothAmandaHazardProgress(value) {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function drawAmandaBehindFence(obstacle) {
  if (!obstacle.amandaHazard || obstacle.amandaReveal <= 0 || AMANDA_CAUGHT_STATES.includes(obstacle.amandaState)) return;
  const scale = 0.4;
  const pushPose = obstacle.amandaState === "pushing";
  const frameCol = pushPose ? 1 : 0;
  const frameRow = pushPose ? 3 : 0;
  const footY = 170 - obstacle.amandaReveal * 148;
  const drawW = FRAME * scale;
  const drawH = FRAME * scale;
  const drawX = -SPRITE_ANCHOR_X * scale;
  const drawY = footY - SPRITE_ANCHOR_Y * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(-92, -175, 184, 197);
  ctx.clip();
  ctx.shadowColor = "rgba(23,33,38,0.24)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  drawFacingImage(
    images.amanda,
    frameCol * FRAME,
    frameRow * FRAME,
    FRAME,
    FRAME,
    drawX,
    drawY,
    drawW,
    drawH,
    obstacle.amandaFacing,
    0
  );
  ctx.restore();
}
