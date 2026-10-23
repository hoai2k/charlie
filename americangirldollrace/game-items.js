// Track items with their own effects: the spell book (frogs), EMP triggers, water balloons, the surfboard, wind-up cars and beach balls.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

// An EMP with nobody else in range: she takes the full hit herself, knocked
// back from the trigger like anyone it reaches.
function shockEmpPresser(racer, style = "lightning") {
  applyEmpHit({ x: racer.x + (racer.facing || 1) * 10 }, racer, style);
}

// The EMP reaching one of its targets: a monster is knocked down, a racer
// shocked or dizzy (her own backfire included).
function empHitTarget(attacker, target, style) {
  if (state.monsters.includes(target)) stunMonsterWithEmp(target, { dizzy: !isShockEmp(style) });
  else if (target === attacker) shockEmpPresser(attacker, style);
  else if (!target.finished) applyEmpHit(attacker, target, style);
}

// Lightning and lasers shock; every other EMP leaves you dizzy.
function isShockEmp(style) {
  return style === "lightning" || style === "laser";
}

// When the effect reaches a target, in seconds after it goes off.
function empHitTime(arc, target, from) {
  if (arc.style === "laser") return LASER_FIRST_SHOT + laserTravel(from, target) / LASER_SPEED;
  if (isFlungEmp(arc)) return EMP_ROCKET_TIME;
  if (arc.style === "crows") return EMP_CROW_TIME;
  // A sound wave stuns once it has passed right through her: when its last
  // ring reaches her.
  const origin = arc.style === "rooster" ? roosterBeak(arc, from) : from;
  const to = spellTargetPoint(target);
  const lastRing = 2 * empWaveLook(arc).gap;
  return lastRing + Math.hypot(to.x - origin.x, to.y - origin.y) / empWaveReach(arc, origin) * EMP_WAVE_TIME;
}

// A lightning EMP shocks her; any other leaves her dizzy for as long.
function applyEmpHit(attacker, target, style = "lightning") {
  target.empDizzy = !isShockEmp(style);
  target.empLaser = style === "laser";
  sfx(target.empDizzy ? "emp_dizzy" : "frozen_start", target.x);
  racerVoice(target, "frozen", { chance: 0.6, priority: 1 });
  target.grabbedBy = null;
  target.empTimer = 0.45;
  target.frozenTimer = Math.max(target.frozenTimer, 1.2);
  target.hitTimer = Math.max(target.hitTimer, 0.35);
  target.fallBackTimer = Math.max(target.fallBackTimer, 0.45);
  target.fallBackFacing = attacker.x < target.x ? -1 : 1;
  target.knockbackX = (target.x >= attacker.x ? 1 : -1) * PUSH_FORCE * 0.65;
  target.vy = Math.max(target.vy, 120);
  target.jumpStarted = false;
}

function burstWaterBalloon(x, groundY, height) {
  sfx("water_balloon_burst", x);
  const colors = ["#7fd3ff", "#bdeeff", "#3aa0e8", "#ffffff"];
  for (let i = 0; i < 34; i += 1) {
    spawnParticles(x, groundY + (Math.random() - 0.5) * 30, height, 1, { kind: "drop", color: colors[i % colors.length], speed: 260 + Math.random() * 200, lift: 380, life: 0.9, size: 6.5, gravity: 1400 });
  }
  spawnParticles(x, groundY, height, 6, { kind: "puff", color: "#d8f4ff", speed: 110, lift: 60, life: 0.5, size: 22, gravity: 0 });
}

function applyItemEffect(racer, effect, type) {
  if (effect === "spellBook") {
    racer.spellAim = { t: 0, x: 0, y: 0 };
    racer.powerupMessage = pickupLook(type).label;
  } else if (effect === "surfboard") {
    racer.surfTimer = SURF_DURATION;
    racer.surfHits = new Set();
    racer.surfLaneV = 0;
    racer.facing = 1;
    spawnParticles(racer.x, racer.y + 54, 0, 12, { color: "#e8fbff", kind: "puff", speed: 160, lift: 60, life: 0.7, size: 12, gravity: 0 });
    racer.powerupMessage = pickupLook(type).label;
  } else if (effect === "windupCars") {
    releaseWindupCars(racer);
    racer.powerupMessage = pickupLook(type).label;
  }
  return true;
}

function spellCandidates(caster) {
  return [
    ...state.racers.filter(r => r !== caster && !r.finished && !(r.frogTimer > 0)),
    ...state.monsters.filter(m => m.active && !(m.frogTimer > 0) && !["sleeping", "ground", "drop"].includes(m.state) && isMonsterVisible(m))
  ].filter(c => Math.abs(c.x - caster.x) <= SPELL_RANGE);
}

// The closest racer or monster in direction (dx, dy) (a 60° cone, then
// anywhere on that side), or the closest of all when there's no direction.
function pickSpellTarget(caster, dirX = 0, dirY = 0) {
  const candidates = spellCandidates(caster);
  const length = Math.hypot(dirX, dirY);
  const closest = list => list.reduce((best, c) => {
    const d = Math.hypot(c.x - caster.x, (c.y - caster.y) * 1.5);
    return !best || d < best.d ? { c, d } : best;
  }, null)?.c || null;
  if (!length) return closest(candidates);
  const along = c => {
    const dx = c.x - caster.x;
    const dy = c.y - caster.y;
    return (dx * dirX + dy * dirY) / (length * (Math.hypot(dx, dy) || 1));
  };
  return closest(candidates.filter(c => along(c) >= SPELL_AIM_CONE))
    || closest(candidates.filter(c => along(c) > 0))
    || closest(candidates);
}

// While the wand sparkles, the stick (or the AI's steering) picks the way.
function updateSpellAim(racer, input, dt) {
  const aim = racer.spellAim;
  if (!aim) return;
  aim.t += dt;
  aim.x += input.horizontal * dt;
  aim.y += input.vertical * dt;
  aim.preview = pickSpellTarget(racer, aim.x, aim.y);
  const chosen = Math.hypot(aim.x, aim.y) >= SPELL_AIM_COMMIT;
  if (!chosen && aim.t < SPELL_AIM_TIME) return;
  castSpell(racer, chosen ? pickSpellTarget(racer, aim.x, aim.y) : pickSpellTarget(racer));
}

function castSpell(racer, target) {
  racer.spellAim = null;
  racer.castTimer = SPELL_CAST_TIME;
  if (target) racer.castFacing = target.x < racer.x ? -1 : 1;
  else racer.castFacing = racer.facing || 1;
  racer.facing = racer.castFacing;
  state.spells.push({ caster: racer, target, t: 0 });
  if (target) sfx("pickup_wand_zap", racer.x, { gain: 0.7 });
}

function wandTip(caster) {
  const scale = racerDepthScale(caster);
  const frames = window.ACTION_FRAMES?.[dollAssetKey(caster.spriteKey)];
  const progress = 1 - caster.castTimer / SPELL_CAST_TIME;
  const frame = frames?.[progress < 0.25 ? 0 : progress < 0.6 ? 1 : 2];
  if (frame?.wandTip && getActionSheet(caster)) return {
    x: caster.x + caster.facing * (frame.wandTip[0] - frame.anchorX) * scale * frame.scale,
    y: caster.y + 54 - caster.z + (frame.targetY - 409 + (frame.wandTip[1] - 409) * frame.scale) * scale
  };
  return {
    x: caster.x + caster.facing * (WAND_HAND.x - SPRITE_ANCHOR_X + 40) * scale,
    y: caster.y + 54 - caster.z - (SPRITE_ANCHOR_Y - WAND_HAND.y + 30) * scale
  };
}

function spellOrigin(spell) {
  if (!spell.origin) return wandTip(spell.caster);
  return { x: spell.caster.x + spell.origin.x, y: spell.caster.y + spell.origin.y };
}

function spellTargetPoint(target) {
  const isMonster = state.monsters.includes(target);
  return { x: target.x, y: target.y + 54 - (target.z || 0) - (isMonster ? 150 : 90) };
}

function empSourcePoint(arc) {
  if (arc.from) return arc.from;
  const racer = arc.source;
  return getThrowHand(racer) || { x: racer.x + racer.facing * 40, y: racer.y - 60 - racer.z };
}

// EMPs that fling something in an arc onto each target.
function isFlungEmp(arc) {
  return arc.style === "firework" || arc.style === "poprocks" || arc.style === "acorns";
}

function empArcDuration(arc) {
  if (arc.style === "lightning") return EMP_ARC_TIME;
  if (arc.style === "laser") return LASER_TIME;
  if (arc.style === "crows") return EMP_EFFECT_TIME + 0.3;
  if (isFlungEmp(arc)) return EMP_EFFECT_TIME;
  // Sound waves last until their last ring has spread right out (and past
  // everyone, who it stuns as it goes); the rooster then hops about a while.
  const waves = 2 * empWaveLook(arc).gap + EMP_WAVE_TIME * 1.15;
  return arc.style === "rooster" ? Math.max(waves, ROOSTER_CROW_TIME + ROOSTER_LINGER) : waves;
}

// A firework or pop-rocks rocket's path: up from the trigger in an arc that
// dives down onto its target. k runs 0..1.
function empRocketPoint(from, to, k) {
  const apexY = Math.min(from.y, to.y) - 220 - Math.abs(to.x - from.x) * 0.12;
  const cx = (from.x + to.x) / 2;
  const u = 1 - k;
  return { x: u * u * from.x + 2 * u * k * cx + k * k * to.x, y: u * u * from.y + 2 * u * k * apexY + k * k * to.y };
}

// How far out a sound wave has to spread to reach everyone it hit.
function empWaveReach(arc, from) {
  return Math.max(160, ...arc.targets.map(target => Math.hypot(spellTargetPoint(target).x - from.x, spellTargetPoint(target).y - from.y) + 60));
}

function updateEmpArcs(dt) {
  for (const arc of state.empArcs) {
    const before = arc.t;
    arc.t += dt;
    const from = empSourcePoint(arc);
    for (const target of [...(arc.pending || [])]) {
      if (arc.t < empHitTime(arc, target, from)) continue;
      arc.pending.splice(arc.pending.indexOf(target), 1);
      empHitTarget(arc.source, target, arc.style);
    }
    if (before === 0 && arc.wand) {
      // The wand goes off: a sparkle flash where it was.
      for (let i = 0; i < 16; i += 1) spawnParticles(from.x, from.y, 0, 1, { color: i % 2 ? "#ffffff" : "#d6a8ff", speed: 220, lift: 60, life: 0.4, size: 5, gravity: 0 });
    }
    if (arc.style === "laser") {
      updateEmpLasers(arc, from, before);
      continue;
    }
    if (arc.style === "lightning") {
      if (before === 0) {
        // Only a wand trigger throws sparkles; the others' particles are plain glowing dots.
        const kind = arc.wand ? "spark" : "dot";
        for (const target of arc.targets) {
          const to = spellTargetPoint(target);
          spawnParticles(to.x, to.y + 90, 90, 12, { kind, color: Math.random() < 0.5 ? "#ffffff" : "#c48bff", speed: 200, lift: 200, life: 0.45, size: 4.5, gravity: 500 });
        }
      }
      continue;
    }
    if (isFlungEmp(arc)) {
      const candy = arc.style === "poprocks";
      const acorns = arc.style === "acorns";
      if (before === 0) {
        sfx(acorns ? "snowball_throw" : candy ? "bubble_pop" : "firework_launch", from.x, { gain: 0.7 });
        spawnParticles(from.x, from.y, 0, 10, { kind: "puff", color: "#fff4d8", speed: 90, lift: 40, life: 0.45, size: 9, gravity: 0 });
      }
      arc.targets.forEach((target, n) => {
        const to = spellTargetPoint(target);
        const k = arc.t / EMP_ROCKET_TIME;
        if (k < 1) {
          if (acorns) return; // an acorn flies without a trail
          // Its trail of sparks.
          const p = empRocketPoint(from, to, k);
          spawnParticles(p.x, p.y, 0, 2, { kind: "dot", color: candy ? EMP_FIREWORK_COLORS[n % EMP_FIREWORK_COLORS.length] : Math.random() < 0.5 ? "#fff2a8" : "#ffb347", speed: 30, lift: 30, life: 0.35, size: 3, gravity: 0 });
        } else if (before < EMP_ROCKET_TIME && acorns) {
          // A bonk on the head: the acorn bounces off and lands, like a thrown one.
          sfx("snowball_hit", to.x, { gain: 0.8, throttleKey: "acorns" });
          spawnParticles(to.x, to.y, 0, 5, { kind: "puff", color: "#e8d6b0", speed: 80, lift: 60, life: 0.4, size: 7, gravity: 0 });
          addRolledThrowable({ x: to.x - Math.sign(to.x - from.x || 1) * 30, groundY: target.y + 54, vx: -Math.sign(to.x - from.x || 1) * 160, spin: n, hop: 260, vhop: 200 });
        } else if (before < EMP_ROCKET_TIME) {
          // It bursts on her: a firework, or a crackle of popping candy.
          sfx(candy ? "pickup_pop_rocks" : "firework_burst", to.x, { gain: 0.8, throttleKey: arc.style });
          if (candy) {
            for (const color of EMP_FIREWORK_COLORS) {
              spawnParticles(to.x, to.y - 20, 0, 5, { kind: "spark", color, speed: 200, lift: 180, life: 0.55, size: 5, gravity: 300 });
            }
            spawnParticles(to.x, to.y - 20, 0, 8, { kind: "candy", size: 12, speed: 170, lift: 260, life: 0.9, gravity: 700 });
          } else {
            for (const color of EMP_FIREWORK_COLORS) {
              spawnParticles(to.x, to.y - 30, 0, 7, { kind: "spark", color, speed: 260, lift: 200, life: 1, size: 6, gravity: 260 });
            }
          }
        }
      });
      continue;
    }
    if (arc.style === "crows") {
      if (before === 0) {
        sfx("pickup_crows", from.x, { gain: 0.6, throttleKey: "crows" });
        // A couple more flap off up out of the scarecrow.
        arc.flock = [-1, 1].map(dir => ({ dir, speed: 260 + Math.random() * 80 }));
      }
      continue;
    }
    // Sound waves (rooster, bell, gong): a puff of dust where each lands.
    for (const target of arc.targets) {
      const to = spellTargetPoint(target);
      const at = empHitTime(arc, target, from);
      if (before < at && arc.t >= at) spawnParticles(to.x, to.y + 60, 30, 6, { kind: "puff", color: "#ffffff", speed: 80, lift: 50, life: 0.4, size: 8, gravity: 0 });
    }
  }
  state.empArcs = state.empArcs.filter(arc => arc.t < empArcDuration(arc));
}

// A jagged bolt from a to b that arcs up and comes down onto b, re-drawn
// each frame so it flickers.
function drawLightning(ax, ay, bx, by, alpha) {
  const length = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / length;
  const ny = (bx - ax) / length;
  const steps = Math.max(6, Math.round(length / 40));
  const points = [[ax, ay]];
  for (let i = 1; i < steps; i += 1) {
    const k = i / steps;
    const jitter = (Math.random() - 0.5) * 36 * Math.sin(Math.PI * k);
    const bow = Math.sin(Math.PI * k) * Math.min(LIGHTNING_ARC_MAX, length * 0.3);
    points.push([ax + (bx - ax) * k + nx * jitter, ay + (by - ay) * k + ny * jitter - bow]);
  }
  points.push([bx, by]);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const [width, color, blur] of [[9, "#b45cff", 18], [3, "#ffffff", 6]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowColor = "#b45cff";
    ctx.shadowBlur = blur;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
}

function drawEmpArcs() {
  for (const arc of state.empArcs) {
    const from = empSourcePoint(arc);
    const fromX = from.x - state.camera;
    if (isFlungEmp(arc)) drawEmpRockets(arc, from);
    else if (arc.style === "laser") drawEmpLasers(arc, from);
    else if (arc.style === "crows") drawEmpCrows(arc, from);
    else if (arc.style !== "lightning") drawEmpWaves(arc, from);
    if (arc.style !== "lightning") continue;
    const alpha = Math.max(0, 1 - arc.t / EMP_ARC_TIME);
    // The button flashes where the bolts start.
    const glow = ctx.createRadialGradient(fromX, from.y, 0, fromX, from.y, 34);
    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(0.4, "#d6a8ff");
    glow.addColorStop(1, "#b45cff00");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fromX, from.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (const target of arc.targets) {
      const to = spellTargetPoint(target);
      drawLightning(fromX, from.y, to.x - state.camera, to.y, alpha);
    }
  }
}

// Firework rockets (a glowing head on a gold streak) or pop rocks (a spinning
// candy) on their way up and over onto each target, then the burst there.
function drawEmpRockets(arc, from) {
  const k = arc.t / EMP_ROCKET_TIME;
  const candy = arc.style === "poprocks";
  arc.targets.forEach((target, n) => {
    const to = spellTargetPoint(target);
    ctx.save();
    if (k < 1 && arc.style === "acorns") {
      // A spinning acorn (the track's thrown acorn).
      const p = empRocketPoint(from, to, k);
      const art = getTrackArt("projectile");
      const size = SNOWBALL_RADIUS * 2.6;
      ctx.translate(p.x - state.camera, p.y);
      ctx.rotate(arc.t * 12);
      if (art) ctx.drawImage(art, -size / 2, -size / 2, size, size);
      else {
        ctx.fillStyle = "#8a5a2b";
        ctx.beginPath();
        ctx.arc(0, 0, SNOWBALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (k < 1) {
      // The streak behind it.
      ctx.lineCap = "round";
      for (let s = 0; s < 8; s += 1) {
        const a = empRocketPoint(from, to, Math.max(0, k - (s + 1) * 0.03));
        const b = empRocketPoint(from, to, Math.max(0, k - s * 0.03));
        ctx.globalAlpha = 0.85 * (1 - s / 8);
        ctx.strokeStyle = candy ? EMP_FIREWORK_COLORS[(n + s) % 5] : s < 2 ? "#fff6c8" : "#ffb347";
        ctx.lineWidth = 7 - s * 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x - state.camera, a.y);
        ctx.lineTo(b.x - state.camera, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const p = empRocketPoint(from, to, k);
      const x = p.x - state.camera;
      if (candy && images.candy_particles) {
        ctx.translate(x, p.y);
        ctx.rotate(arc.t * 9);
        const cell = (n * 3) % 8;
        ctx.drawImage(images.candy_particles, cell % 4 * 128, Math.floor(cell / 4) * 128, 128, 128, -22, -22, 44, 44);
      } else {
        const glow = ctx.createRadialGradient(x, p.y, 0, x, p.y, 26);
        glow.addColorStop(0, "#ffffff");
        glow.addColorStop(0.3, "#fff2a8");
        glow.addColorStop(0.6, "#ffb347aa");
        glow.addColorStop(1, "#ff8a0000");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, p.y, 26, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (!candy && arc.style === "firework") {
      // The firework opens over her: rays of colour spreading and fading.
      const b = (arc.t - EMP_ROCKET_TIME) / (EMP_EFFECT_TIME - EMP_ROCKET_TIME);
      const r = 30 + 110 * Math.sqrt(b);
      const x = to.x - state.camera;
      const y = to.y - 30;
      ctx.globalAlpha = Math.max(0, 1 - b);
      ctx.lineCap = "round";
      for (let ray = 0; ray < 16; ray += 1) {
        const a = ray * Math.PI / 8 + n;
        const color = EMP_FIREWORK_COLORS[ray % 5];
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45 + b * 30);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r + b * 40);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r + b * 40, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  });
}

// Sound waves spreading out from the trigger: the rooster's crow as curved
// ripples to either side, a bell's ringing gold circles with music notes, a
// gong's heavy bronze rings.
function empWaveLook(arc) {
  return {
    rooster: { color: "#ffffff", edge: "#c7522a", width: 7, gap: 0.22 },
    bell: { color: "#ffd84a", edge: "#a8741a", width: 5, gap: 0.2 },
    gong: { color: "#e0a64a", edge: "#7a4a12", width: 11, gap: 0.26 }
  }[arc.style] || { color: "#ffffff", edge: "#555555", width: 5, gap: 0.2 };
}

function drawEmpWaves(arc, from) {
  if (arc.style === "rooster") {
    // The waves come out of the rooster's beak, in front of her.
    drawCrowingRooster(arc, from);
    from = roosterBeak(arc, from);
  }
  const reach = empWaveReach(arc, from);
  const x = from.x - state.camera;
  const look = empWaveLook(arc);
  for (let i = 0; i < 3; i += 1) {
    const k = (arc.t - i * look.gap) / EMP_WAVE_TIME;
    if (k <= 0 || k >= 1.15) continue;
    const r = Math.min(1, k) * reach;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k / 1.15) * 0.9;
    for (const [width, color] of [[look.width + 4, look.edge], [look.width, look.color]]) {
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.beginPath();
      if (arc.style === "rooster") {
        // ))) and ((( : the crow ripples out both ways, a tight bunch of
        // short arcs that shrink a little as they spread.
        for (let d = 0; d < 3; d += 1) {
          const rr = Math.max(4, r - d * 22);
          const span = 0.5 * (1 - Math.min(1, k) * 0.5);
          ctx.moveTo(x + rr * Math.cos(-span), from.y + rr * Math.sin(-span));
          ctx.arc(x, from.y, rr, -span, span);
          ctx.moveTo(x - rr * Math.cos(span), from.y - rr * Math.sin(span));
          ctx.arc(x, from.y, rr, Math.PI + span, Math.PI - span, true);
        }
      } else {
        ctx.ellipse(x, from.y, r, r * 0.55, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
    if (arc.style === "bell") {
      // Notes riding out on the ring.
      ctx.font = "800 26px system-ui";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.fillStyle = "#7a3fc4";
      for (const a of [-2.4, -1.6, -0.8, 0.4, 2.6]) {
        const nx = x + Math.cos(a + i) * r;
        const ny = from.y + Math.sin(a + i) * r * 0.55;
        const single = i + a > 0;
        if (drawFxSprite(single ? FX_NOTE : FX_NOTES, nx, ny - 8, 30, 0)) continue;
        const note = single ? "\u266A" : "\u266B";
        ctx.strokeText(note, nx, ny);
        ctx.fillText(note, nx, ny);
      }
    }
    ctx.restore();
  }
  // The bell or gong itself, ringing out the rings: drawn over them.
  if (arc.style === "bell" || arc.style === "gong") drawRingingTrigger(arc, from);
}

// Lasers (Moon Base): the laser-gun trigger swells and fades like the gong
// while it fires a volley of short red bolts at each target, straight and
// fast; the first to land shocks her.
function laserTravel(from, target) {
  const to = spellTargetPoint(target);
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function updateEmpLasers(arc, from, before) {
  for (let shot = 0; shot < LASER_SHOTS; shot += 1) {
    const fired = LASER_FIRST_SHOT + shot * LASER_SHOT_GAP;
    if (before < fired && arc.t >= fired) sfx("pickup_laser", from.x, { gain: 0.55, throttleKey: `laser${shot}` });
    for (const target of arc.targets) {
      const lands = fired + laserTravel(from, target) / LASER_SPEED;
      if (before < lands && arc.t >= lands) {
        const to = spellTargetPoint(target);
        spawnParticles(to.x, to.y + 40, 40, 5, { kind: "dot", color: "#ff5a6e", speed: 150, lift: 90, life: 0.3, size: 3, gravity: 200 });
      }
    }
  }
}

function drawEmpLasers(arc, from) {
  drawRingingTrigger(arc, from);
  for (const [n, target] of arc.targets.entries()) {
    const to = spellTargetPoint(target);
    const distance = laserTravel(from, target) || 1;
    const dx = (to.x - from.x) / distance;
    const dy = (to.y - from.y) / distance;
    for (let shot = 0; shot < LASER_SHOTS; shot += 1) {
      const head = (arc.t - LASER_FIRST_SHOT - shot * LASER_SHOT_GAP) * LASER_SPEED;
      if (head <= 0 || head - LASER_BOLT_LENGTH >= distance) continue;
      // From one of the guns (alternating sides), clipped where it hits.
      const side = (shot + n) % 2 ? 1 : -1;
      const ox = from.x + side * 14;
      const oy = from.y - 10;
      const a = Math.max(0, head - LASER_BOLT_LENGTH);
      const b = Math.min(distance, head);
      ctx.save();
      ctx.lineCap = "round";
      for (const [width, color, blur] of [[8, "#ff2d4b", 16], [3, "#ffe3e8", 4]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.shadowColor = "#ff2d4b";
        ctx.shadowBlur = blur;
        ctx.beginPath();
        ctx.moveTo(ox + dx * a - state.camera, oy + dy * a);
        ctx.lineTo(ox + dx * b - state.camera, oy + dy * b);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// A bell or gong ringing: its trigger icon swings (a bell) or shudders (a
// gong) as it swells and fades, so the rings plainly come from it.
function drawRingingTrigger(arc, from) {
  const art = getTrackArt("powerups");
  if (!art) return;
  const life = empArcDuration(arc);
  const k = Math.min(1, arc.t / life);
  const size = POWERUP_ICON_TARGET_SIZE * (1 + 0.9 * Math.min(1, k * 1.6));
  const alpha = Math.min(1, arc.t * 10) * (1 - k * k);
  const gong = arc.style === "gong" || arc.style === "laser";
  const swing = gong ? 0 : Math.sin(arc.t * 22) * 0.35 * (1 - k);
  const shake = gong ? Math.sin(arc.t * 70) * 4 * (1 - k) : 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(from.x - state.camera + shake, from.y);
  ctx.rotate(swing);
  ctx.drawImage(art, 2 * TRACK_POWERUP_CELL, 0, TRACK_POWERUP_CELL, TRACK_POWERUP_CELL, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// The rooster that crows the waves out: it pops up in front of her, bobs
// and rocks through its three crowing poses (rooster_crow_sprites), then
// fades. Until that sheet loads, the Farm's EMP icon stands in.
function roosterSpot(arc, from) {
  const facing = arc.source?.facing || 1;
  return { x: from.x + facing * ROOSTER_AHEAD, y: from.y + 54, facing };
}

// Where it's drawn this moment: bob, rock, size and pose.
// Crowing, it bobs through its three poses; then it hops about a while,
// to and fro, before it fades.
function roosterPose(arc, from) {
  const spot = roosterSpot(arc, from);
  const sheet = getSharedArt("rooster_crow");
  const size = 96 * Math.min(1, arc.t * 8);
  if (arc.t < ROOSTER_CROW_TIME || !sheet) {
    return {
      ...spot,
      sheet,
      bob: Math.abs(Math.sin(arc.t * 14)) * 12,
      tilt: sheet ? -Math.sin(arc.t * 14) * 0.06 : -0.25 - Math.sin(arc.t * 14) * 0.12,
      size,
      frame: Math.floor(arc.t * 8) % 3
    };
  }
  const h = arc.t - ROOSTER_CROW_TIME;
  const wander = Math.sin(h * 3.2);
  return {
    ...spot,
    x: spot.x + spot.facing * wander * 40,
    facing: Math.cos(h * 3.2) >= 0 ? spot.facing : -spot.facing,
    sheet,
    bob: Math.abs(Math.sin(h * 11)) * 26,
    tilt: Math.sin(h * 11) * 0.08,
    size,
    frame: 0
  };
}

// Its beak tip in each pose (sheet cell pixels; 256 cells, feet at y 250).
const ROOSTER_BEAKS = [[212, 98], [198, 82], [210, 76]];

// The point the waves come from: its beak, as drawn this moment.
function roosterBeak(arc, from) {
  const pose = roosterPose(arc, from);
  const [bx, by] = pose.sheet ? ROOSTER_BEAKS[pose.frame] : [200, 80];
  const s = pose.size / 256;
  const lx = (bx - 128) * s;
  const ly = -pose.size + by * s;
  const cos = Math.cos(pose.tilt), sin = Math.sin(pose.tilt);
  return { x: pose.x + pose.facing * (lx * cos - ly * sin), y: pose.y - pose.bob + lx * sin + ly * cos };
}

function drawCrowingRooster(arc, from) {
  const pose = roosterPose(arc, from);
  const art = pose.sheet || getTrackArt("powerups");
  if (!art) return;
  const life = empArcDuration(arc);
  ctx.save();
  ctx.globalAlpha = Math.min(1, (life - arc.t) * 5);
  ctx.translate(pose.x - state.camera, pose.y - pose.bob);
  ctx.scale(pose.facing, 1);
  ctx.rotate(pose.tilt);
  const size = pose.size;
  if (pose.sheet) {
    const cell = pose.sheet.width / 3;
    ctx.drawImage(pose.sheet, pose.frame * cell, 0, cell, pose.sheet.height, -size / 2, -size, size, size * pose.sheet.height / cell);
  } else {
    ctx.drawImage(art, 2 * TRACK_POWERUP_CELL, 0, TRACK_POWERUP_CELL, TRACK_POWERUP_CELL, -size / 2, -size, size, size);
  }
  ctx.restore();
}

// Crows burst out of the scarecrow: one flies to each target and flaps round
// her head; a couple more fly off up out of sight.
function drawEmpCrows(arc, from) {
  const flap = Math.sin(arc.t * 28);
  arc.targets.forEach((target, n) => {
    const to = spellTargetPoint(target);
    const k = Math.min(1, arc.t / EMP_CROW_TIME);
    let x, y, dir;
    if (k < 1) {
      const lift = Math.sin(Math.PI * k) * 120;
      x = from.x + (to.x - from.x) * k;
      y = from.y + (to.y - 40 - from.y) * k - lift;
      dir = Math.sign(to.x - from.x) || 1;
    } else {
      const a = (arc.t - EMP_CROW_TIME) * 7 + n;
      x = to.x + Math.cos(a) * 46;
      y = to.y - 40 + Math.sin(a) * 14;
      dir = -Math.sin(a) >= 0 ? 1 : -1;
    }
    drawCrow(x - state.camera, y, dir, flap, Math.min(1, (empArcDuration(arc) - arc.t) * 4));
  });
  for (const bird of arc.flock || []) {
    drawCrow(from.x - state.camera + bird.dir * bird.speed * arc.t, from.y - bird.speed * 1.2 * arc.t, bird.dir, -flap, 1);
  }
}

// A crow in flight: from the crow sheet once it's in (four wing-flap
// frames, image-requests.md §20 CR2), else simple shapes.
function drawCrow(x, y, dir, flap, alpha) {
  const sheet = getSharedArt("crow");
  if (sheet) {
    const cell = sheet.height;
    const frame = Math.floor(performance.now() / 70) % 4;
    const size = 64;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.drawImage(sheet, frame * cell, 0, cell, cell, -size / 2, -size / 2 - 6, size, size);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(dir * 1.6, 1.6);
  ctx.fillStyle = "#1d1b26";
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 8, -0.15, 0, Math.PI * 2); // body
  ctx.fill();
  ctx.beginPath();
  ctx.arc(13, -5, 6, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.fillStyle = "#f2a531";
  ctx.beginPath();
  ctx.moveTo(18, -6); ctx.lineTo(26, -3); ctx.lineTo(18, -2); // beak
  ctx.fill();
  ctx.fillStyle = "#1d1b26";
  ctx.beginPath();
  ctx.moveTo(-14, -1); ctx.lineTo(-26, -6); ctx.lineTo(-24, 3); // tail
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, -3); ctx.quadraticCurveTo(-2, -3 - 22 * flap, 8, -4 - 16 * flap); ctx.lineTo(6, -2); // wing
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(15, -6, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The effect sprites (image-requests.md §24 FX1): five 128px cells.
const FX_DIZZY_STAR = 0;
const FX_CELEBRATION_STAR = 1;
const FX_NOTE = 2;
const FX_NOTES = 3;
const FX_CLOUD_PUFF = 4;

// Draws one effect sprite centred at (x, y), size px across, turned by
// angle; false (draw nothing) until the sheet is in.
function drawFxSprite(index, x, y, size, angle = 0) {
  const sheet = getSharedArt("fx");
  if (!sheet) return false;
  const cell = sheet.height;
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  ctx.drawImage(sheet, index * cell, 0, cell, cell, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

// Stars circling a dizzy head (an EMP that isn't a shock, or a bonk).
function drawDizzyStars(x, y, scale, alpha) {
  const t = performance.now() / 1000;
  const rx = 120 * scale;
  const ry = 30 * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 4; i += 1) {
    const a = t * 5 + i * Math.PI / 2;
    const sx = x + Math.cos(a) * rx;
    const sy = y + Math.sin(a) * ry;
    const r = 34 * scale * (0.8 + 0.25 * Math.sin(a));
    if (drawFxSprite(FX_DIZZY_STAR, sx, sy, r * 2.4, t * 3)) continue;
    ctx.fillStyle = i % 2 ? "#ffd84a" : "#fff2a8";
    ctx.strokeStyle = "#c98a12";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let p = 0; p < 10; p += 1) {
      const rr = p % 2 ? r * 0.45 : r;
      const pa = -Math.PI / 2 + p * Math.PI / 5 + t * 3;
      ctx.lineTo(sx + Math.cos(pa) * rr, sy + Math.sin(pa) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function updateSpells(dt) {
  for (const spell of state.spells) {
    const before = spell.t;
    spell.t += dt;
    if (spell.t < SPELL_BOLT_DELAY || !spell.target) continue;
    if (before < SPELL_BOLT_DELAY) {
      // Release: a flash at the wand tip. The bolt keeps coming from where the
      // tip was at this moment (moving with her), whatever the follow-through.
      const tip = wandTip(spell.caster);
      spell.origin = { x: tip.x - spell.caster.x, y: tip.y - spell.caster.y };
      spawnParticles(tip.x, tip.y, 0, 14, { color: "#fff2a8", speed: 190, lift: 40, life: 0.35, size: 5, gravity: 0 });
    }
    if (spell.done) continue;
    const progress = (spell.t - SPELL_BOLT_DELAY) / SPELL_BOLT_TIME;
    const from = spellOrigin(spell);
    const to = spellTargetPoint(spell.target);
    const x = from.x + (to.x - from.x) * Math.min(1, progress);
    const y = from.y + (to.y - from.y) * Math.min(1, progress);
    spawnParticles(x, y, 0, 2, { color: Math.random() < 0.5 ? "#ffd84a" : "#c48bff", speed: 50, lift: 40, life: 0.4, size: 4, gravity: 0 });
    if (progress >= 1 && !spell.done) {
      spell.done = true;
      frogify(spell.target);
    }
  }
  state.spells = state.spells.filter(spell => spell.t < SPELL_BOLT_DELAY + SPELL_BOLT_TIME + SPELL_BEAM_LINGER && (spell.target || spell.t < SPELL_CAST_TIME));
}

function frogify(target) {
  const isMonster = state.monsters.includes(target);
  target.frogTimer = FROG_DURATION;
  target.frogPhase = 0;
  if (isMonster) {
    if (target.target?.grabbedBy === target) target.target.grabbedBy = null;
    target.target = null;
    if (["grab", "lift", "throw"].includes(target.state)) target.state = "walk";
  } else {
    target.pushTimer = 0;
    if (isMounted(target) && !isAlwaysMountedTrack()) target.horseTimer = 0;
  }
  frogPoof(target.x, target.y + 54, isMonster);
}

function frogPoof(x, groundY, big) {
  sfx("frog_poof", x);
  spawnParticles(x, groundY, 30, big ? 16 : 12, { color: "#9be57a", kind: "puff", speed: 120, lift: 120, life: 0.6, size: big ? 18 : 13, gravity: 0 });
  spawnParticles(x, groundY, 60, 10, { color: "#ffd84a", speed: 160, lift: 260, life: 0.5 });
}

// The shared frog sheet once listed in TRACK_SHARED_ART, else null (an emoji
// stands in).
function getSharedArt(name) {
  if (!(window.TRACK_SHARED_ART || []).includes(name)) return null;
  loadArtOnce(name, `assets/${name}_sprites.webp`);
  return images[name] || null;
}

function drawFrog(x, groundY, depthScale, big, phase, facing) {
  const hopping = phase < 0.55;
  const lift = hopping ? Math.sin((phase / 0.55) * Math.PI) * (big ? 30 : 22) : 0;
  const size = (big ? 150 : 96) * depthScale / 0.45;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(x, groundY - 4, size * 0.38, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const sheet = getSharedArt("frog");
  if (sheet) {
    const col = !hopping ? 0 : phase < 0.12 || phase > 0.45 ? 1 : 2;
    const cell = 256;
    drawFacingImage(sheet, col * cell, (big ? 1 : 0) * cell, cell, cell, x - size / 2, groundY - size - lift, size, size, facing, x);
    return;
  }
  // A cartoon frog drawn in code until the frog sheet arrives.
  const body = big ? "#7a8a3a" : "#5fc24a";
  const belly = big ? "#b9c27a" : "#c8f0a0";
  const u = size / 100;
  ctx.save();
  ctx.translate(x, groundY - lift);
  ctx.scale(facing < 0 ? -u : u, u);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#2d5a22";
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-14, -14, 24, 14, 0, 0, Math.PI * 2); // back leg
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(4, -30, 36, 28, 0, 0, Math.PI * 2); // body
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(16, -24, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const ex of [-6, 22]) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(ex, -56, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex, -57, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d1d1d";
    ctx.beginPath();
    ctx.arc(ex + 2, -57, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#2d5a22";
  ctx.beginPath();
  ctx.arc(14, -38, 14, 0.2, Math.PI - 0.6); // smile
  ctx.stroke();
  if (big) {
    ctx.fillStyle = "#5c6a2a";
    for (const [wx, wy] of [[-18, -40], [-4, -48], [-22, -24]]) {
      ctx.beginPath();
      ctx.arc(wx, wy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// While a player aims her wand, a glowing ring on the ground marks who the
// spell would hit (drawn under everyone, like a shadow).
function drawSpellAimRings() {
  const now = performance.now() / 1000;
  for (const racer of state.racers) {
    const target = racer.spellAim?.preview;
    if (!target || racer.ai) continue;
    const isMonster = state.monsters.includes(target);
    const scale = isMonster ? 1 : racerDepthScale(target);
    const x = target.x - state.camera;
    const y = target.y + 54;
    const pulse = 1 + Math.sin(now * 8) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#c48bff";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ffd84a";
    ctx.setLineDash([14, 9]);
    ctx.lineDashOffset = -now * 40;
    ctx.beginPath();
    ctx.ellipse(0, 0, (isMonster ? 80 : 62) * scale, (isMonster ? 24 : 19) * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSpells() {
  for (const spell of state.spells) {
    if (!spell.target || spell.t < SPELL_BOLT_DELAY) continue;
    const progress = Math.min(1, (spell.t - SPELL_BOLT_DELAY) / SPELL_BOLT_TIME);
    const from = spellOrigin(spell);
    const to = spellTargetPoint(spell.target);
    const x = from.x + (to.x - from.x) * progress - state.camera;
    const y = from.y + (to.y - from.y) * progress;
    // After the hit the beam lingers a moment, fading.
    const fade = spell.done ? 1 - (spell.t - SPELL_BOLT_DELAY - SPELL_BOLT_TIME) / SPELL_BEAM_LINGER : 1;
    if (fade <= 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    // A streak from the wand tip to the bolt, so it's clear where it came from.
    const fromX = from.x - state.camera;
    const streak = ctx.createLinearGradient(fromX, from.y, x, y);
    streak.addColorStop(0, "#c48bff22");
    streak.addColorStop(1, "#fff2a8");
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = streak;
    ctx.shadowColor = "#ffd84a";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(fromX, from.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    if (spell.done) continue;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 26);
    glow.addColorStop(0, "#fff7c2");
    glow.addColorStop(0.4, "#ffd84a");
    glow.addColorStop(1, "#c48bff00");
    ctx.save();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Wind-up cars drive toward the closest racer or monster within a screen's
// width (back down the course if that's behind her), else forward.
function windupCarDirection(racer) {
  const others = [
    ...state.racers.filter(r => r !== racer && !r.finished),
    ...state.monsters.filter(m => m.active && !["sleeping", "ground"].includes(m.state))
  ].filter(c => Math.abs(c.x - racer.x) <= EXPECTED_VIEW_WIDTH && c.x !== racer.x);
  if (!others.length) return 1;
  const closest = others.reduce((a, b) => (Math.abs(b.x - racer.x) < Math.abs(a.x - racer.x) ? b : a));
  return closest.x < racer.x ? -1 : 1;
}

// Surfing over a monster knocks it down (each one once per ride).
function surfKnockMonsters(racer) {
  racer.surfHits ||= new Set();
  for (const monster of state.monsters) {
    if (!monster.active || ["sleeping", "ground", "fall", "drop"].includes(monster.state) || racer.surfHits.has(monster)) continue;
    if (Math.abs(monster.x - racer.x) > 80 || Math.abs(monster.y - racer.y) > 60) continue;
    racer.surfHits.add(monster);
    applyMonsterKnockback(monster, 1, { unhorse: true });
    spawnParticles(monster.x, monster.y + 54, 20, 14, { kind: "drop", color: "#bdeeff", speed: 220, lift: 320, life: 0.7, size: 6, gravity: 1300 });
    sfx("water_balloon_burst", monster.x, { gain: 0.7 });
  }
}

function releaseWindupCars(racer) {
  const dir = windupCarDirection(racer);
  for (let i = 0; i < WINDUP_CAR_COUNT; i += 1) {
    const lane = (i - (WINDUP_CAR_COUNT - 1) / 2) * 46;
    state.windupCars.push({
      x: racer.x + dir * (50 + i * 22),
      y: clamp(racer.y + 54 + lane, PATH_TOP + FOOT_OFFSET_Y + 16, TRACK_BOTTOM + FOOT_OFFSET_Y - 8),
      dir,
      owner: racer,
      life: WINDUP_CAR_LIFE,
      wheel: 0,
      color: i % WINDUP_CAR_COLORS.length
    });
  }
}

function updateWindupCars(dt) {
  for (const car of state.windupCars) {
    car.x += car.dir * WINDUP_CAR_SPEED * dt;
    car.wheel += dt * 14;
    car.life -= dt;
    for (const racer of state.racers) {
      if (racer === car.owner || racer.finished || racer.grabbedBy || racer.z > 40) continue;
      if (Math.abs(racer.x - car.x) > 34 || Math.abs(racer.y + 54 - car.y) > 26) continue;
      applyPushHit(car.owner, racer, car.dir);
      car.life = 0;
      break;
    }
    if (car.life > 0) {
      for (const monster of state.monsters) {
        if (monster.state === "sleeping" || monster.state === "ground" || monster.frogTimer > 0) continue;
        if (Math.abs(monster.x - car.x) > 44 || Math.abs(monster.y + 54 - car.y) > 30) continue;
        applyMonsterKnockback(monster, car.dir);
        car.life = 0;
        break;
      }
    }
    if (car.life <= 0) {
      sfx("toy_bump", car.x);
      spawnParticles(car.x, car.y, 10, 8, { color: "#ffffff", kind: "puff", speed: 90, lift: 60, life: 0.4, size: 9, gravity: 0 });
    }
  }
  state.windupCars = state.windupCars.filter(car => car.life > 0 && car.x > 0 && car.x < FINISH + 200);
}

function drawWindupCar(car) {
  const screenX = car.x - state.camera;
  if (screenX < -80 || screenX > getWorldViewportWidth() + 80) return;
  const scale = racerDepthScale({ y: car.y - 54 }) / 0.45;
  const art = getTrackArt("windup_car");
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, car.y - 2, 34 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (art) {
    const size = 84 * scale;
    drawFacingImage(art, (Math.floor(car.wheel) % 3) * 256, (car.color % 2) * 256, 256, 256, screenX - size / 2, car.y - size, size, size, car.dir, screenX);
    return;
  }
  const [body, trim] = WINDUP_CAR_COLORS[car.color];
  ctx.save();
  ctx.translate(screenX, car.y);
  ctx.scale(car.dir * scale, scale);
  // body and cab
  ctx.fillStyle = body;
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2;
  roundRect(-30, -30, 60, 20, 6);
  ctx.fill();
  ctx.stroke();
  roundRect(-14, -44, 28, 16, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#cfefff";
  ctx.fillRect(-9, -40, 18, 9);
  // wheels
  for (const wx of [-18, 18]) {
    ctx.fillStyle = "#2b2b33";
    ctx.beginPath();
    ctx.arc(wx, -8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c9c9d6";
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(car.wheel) * 6, -8 + Math.sin(car.wheel) * 6);
    ctx.lineTo(wx - Math.cos(car.wheel) * 6, -8 - Math.sin(car.wheel) * 6);
    ctx.stroke();
  }
  // the spinning wind-up key
  ctx.translate(0, -50);
  ctx.scale(Math.cos(car.wheel * 0.6), 1);
  ctx.fillStyle = "#d9b44a";
  ctx.strokeStyle = "#8a6d1f";
  ctx.fillRect(-2, -2, 4, 8);
  ctx.beginPath();
  ctx.ellipse(-7, -6, 6, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(7, -6, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// The wave and board under a surfer (art when listed, else drawn in code).
function drawSurfWave(racer, screenX, scale) {
  const feetY = racer.y + 54 - racer.z;
  const t = performance.now() / 1000;
  const art = getTrackArt("wave");
  if (art) {
    const w = 3 * FRAME * scale * 0.9;
    const h = w * 384 / 512;
    drawFacingImage(art, (Math.floor(t * 6) % 3) * 512, 0, 512, 384, screenX - w * 0.72, feetY - h + 14 * scale, w, h, 1, screenX);
  } else {
    const len = 360 * scale;
    const height = 120 * scale;
    ctx.save();
    ctx.globalAlpha = 0.92;
    const grad = ctx.createLinearGradient(0, feetY - height, 0, feetY + 10);
    grad.addColorStop(0, "#4fd1e8");
    grad.addColorStop(1, "#1b7fb8");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(screenX - len, feetY + 10);
    ctx.quadraticCurveTo(screenX - len * 0.55, feetY - height * (0.9 + 0.08 * Math.sin(t * 5)), screenX - 10 * scale, feetY - height * 0.32);
    ctx.quadraticCurveTo(screenX + 70 * scale, feetY - height * 0.1, screenX + 110 * scale, feetY + 10);
    ctx.closePath();
    ctx.fill();
    // foam along the crest
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(screenX - len * 0.8, feetY - height * 0.55);
    ctx.quadraticCurveTo(screenX - len * 0.5, feetY - height * (0.92 + 0.08 * Math.sin(t * 5)), screenX - 10 * scale, feetY - height * 0.32);
    ctx.stroke();
    ctx.restore();
  }
  if (getActionSheet(racer)) return;
  // The board: turquoise with a coral stripe.
  ctx.save();
  ctx.translate(screenX, feetY - 6 * scale);
  ctx.rotate(-0.05 + Math.sin(racer.surfPhase * 2) * 0.04);
  ctx.fillStyle = "#3fd3c6";
  ctx.strokeStyle = "#1f8f86";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 120 * scale, 14 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff7a6b";
  ctx.fillRect(-100 * scale, -3 * scale, 200 * scale, 5 * scale);
  ctx.restore();
}

// The doll's actions sheet (wand casting, surfing, saddle push, stuck,
// moon-boots float) once listed in ACTION_SHEETS, else null.
function getActionSheet(racer) {
  if (!racer?.spriteKey) return null;
  const assetKey = dollAssetKey(racer.spriteKey);
  if (!(window.ACTION_SHEETS || []).includes(assetKey)) return null;
  if (racer.outfit && window.DollOutfits) return DollOutfits.getSync(racer.spriteKey, "actions", racer.outfit);
  loadArtOnce(`actions_${assetKey}`, `assets/doll_${assetKey}_actions.webp?v=${window.ACTION_ART_VERSION || "1"}`);
  return images[`actions_${assetKey}`] || null;
}

// Wand stand-in while there's no casting art: a little wand from the hand of
// the push frame.
function drawWandStandIn(racer, screenX, scale, facing) {
  const handX = screenX + facing * (WAND_HAND.x - SPRITE_ANCHOR_X) * scale;
  const handY = racer.y + 54 - racer.z - (SPRITE_ANCHOR_Y - WAND_HAND.y) * scale;
  const tipX = handX + facing * 70 * scale;
  const tipY = handY - 30 * scale;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#4a2e1a";
  ctx.lineWidth = 7 * scale;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = "#ffd84a";
  ctx.shadowColor = "#ffd84a";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 9 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function makeBeachBalls() {
  const count = getTrackTheme().beachBalls || 0;
  const balls = [];
  for (let i = 0; i < count; i += 1) {
    const y = randomPowerupY();
    const x = clearOfHurdles(900 + (i + 0.5) * (FINISH - 1800) / count, y);
    balls.push({ x, y, z: 0, vx: 0, vy: 0, vz: 0, spin: Math.random() * Math.PI * 2 });
  }
  return balls;
}

function kickBeachBall(ball, direction, dy = 0) {
  ball.vx = direction * BEACH_BALL_KICK_SPEED;
  ball.vy += Math.sign(dy) * 120;
  ball.vz = BEACH_BALL_KICK_LIFT;
  sfx("beachball_kick", ball.x);
}

function updateBeachBalls(dt) {
  const groundTop = PATH_TOP + FOOT_OFFSET_Y + 8;
  const groundBottom = TRACK_BOTTOM + FOOT_OFFSET_Y - 6;
  for (const ball of state.beachBalls) {
    // Running into the ball nudges it ahead of you with a little hop.
    for (const racer of state.racers) {
      if (racer.finished || racer.z > 50 + ball.z) continue;
      const dx = ball.x - racer.x;
      const dy = ball.y - (racer.y + 54);
      const reach = (isMounted(racer) ? 56 : 30) + BEACH_BALL_RADIUS;
      if (Math.abs(dx) > reach || Math.abs(dy) > 22) continue;
      const direction = Math.sign(dx) || racer.facing || 1;
      const speed = Math.max(Math.abs(racer.speed) * 1.25, BEACH_BALL_NUDGE_MIN_SPEED);
      if (ball.vx * direction < speed) ball.vx = direction * speed;
      ball.vy += Math.sign(dy) * 40;
      if (ball.z < 4) ball.vz = Math.max(ball.vz, 170);
      ball.x = racer.x + direction * reach;
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.z += ball.vz * dt;
    ball.vz -= GRAVITY * 0.8 * dt;
    if (ball.z <= 0) {
      ball.z = 0;
      if (ball.vz < -140) {
        if (ball.vz < -300) sfx("beachball_bounce", ball.x, { gain: Math.min(1, -ball.vz / 700) });
        ball.vz = -ball.vz * 0.55;
      } else {
        ball.vz = 0;
      }
    }
    // Sand slows it quickly; in the air it barely slows.
    const grounded = ball.z === 0;
    ball.vx *= Math.pow(grounded ? 0.4 : 0.9, dt);
    ball.vy *= Math.pow(grounded ? 0.2 : 0.7, dt);
    if (Math.abs(ball.vx) < 4) ball.vx = 0;
    if (ball.y < groundTop || ball.y > groundBottom) {
      ball.y = clamp(ball.y, groundTop, groundBottom);
      ball.vy = -ball.vy * 0.6;
    }
    if (ball.x < 60 || ball.x > FINISH - 40) {
      ball.x = clamp(ball.x, 60, FINISH - 40);
      ball.vx = -ball.vx * 0.6;
    }
    // Low balls bounce back off hurdles.
    if (ball.z < hurdleTopZ() * 0.6) {
      for (const obstacle of state.obstacles) {
        const bounds = getObstacleHitBounds(obstacle);
        if (ball.y < bounds.top - 6 || ball.y > bounds.bottom + 6) continue;
        if (ball.x + BEACH_BALL_RADIUS < bounds.left || ball.x - BEACH_BALL_RADIUS > bounds.right) continue;
        const side = ball.x < obstacle.x ? -1 : 1;
        ball.x = side < 0 ? bounds.left - BEACH_BALL_RADIUS : bounds.right + BEACH_BALL_RADIUS;
        if (ball.vx * side < 0) ball.vx = -ball.vx * 0.55;
      }
    }
    ball.spin += (ball.vx * dt) / BEACH_BALL_RADIUS;
  }
}

function drawBeachBall(ball) {
  const screenX = ball.x - state.camera;
  if (screenX < -80 || screenX > getWorldViewportWidth() + 80) return;
  const scale = racerDepthScale({ y: ball.y - 54 }) / 0.45;
  const r = BEACH_BALL_RADIUS * scale;
  ctx.save();
  ctx.globalAlpha = 0.3 * Math.max(0.35, 1 - ball.z / 300);
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, ball.y - 2, r * (1 - Math.min(0.4, ball.z / 500)), r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const cy = ball.y - r - ball.z;
  const art = getTrackArt("beachball");
  ctx.save();
  ctx.translate(screenX, cy);
  ctx.rotate(ball.spin);
  if (art) {
    ctx.drawImage(art, -r, -r, r * 2, r * 2);
  } else {
    BEACH_BALL_COLORS.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(40, 40, 60, 0.55)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Shine stays put while the ball spins.
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(screenX - r * 0.38, cy - r * 0.42, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Crackles over someone shocked: blue, or red from a laser.
function drawElectricEffect(x, y, w, h, color = "#9fe9ff") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  const now = performance.now() * 0.03;
  for (let i = 0; i < 5; i += 1) {
    const px = x - w * 0.35 + ((i * 29 + now * 7) % (w * 0.7));
    const py = y + 24 + ((i * 47 + now * 3) % Math.max(40, h - 40));
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 10, py + 10);
    ctx.lineTo(px - 2, py + 22);
    ctx.lineTo(px + 13, py + 34);
    ctx.stroke();
  }
  ctx.restore();
}
