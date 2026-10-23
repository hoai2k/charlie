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
