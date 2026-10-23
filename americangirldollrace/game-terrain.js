// Cloud floors (tracks.js cloudFloor): the course is a row of clouds, one
// after another at slightly different heights, each gently domed, with now
// and then a gap between two. A doll who doesn't jump a gap falls through it
// and comes back a moment later just before it. Everything on the course is
// drawn lifted by the floor's height there (groundLift); the game's own
// physics stay flat, since the steps are small.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

function makeCloudFloor() {
  if (!getTrackTheme().cloudFloor) return null;
  const clouds = [];
  const gaps = [];
  let x = -800;
  let h = 0;
  let sinceGap = 0;
  let nextGapAfter = CLOUD_GAP_EVERY_MIN + Math.random() * CLOUD_GAP_EVERY_RANGE;
  while (x < FINISH + 1800) {
    const w = CLOUD_WIDTH_MIN + Math.random() * CLOUD_WIDTH_RANGE;
    clouds.push({ x, w, h, variant: Math.floor(Math.random() * 6), seed: Math.random() * 1000 });
    x += w;
    sinceGap += w;
    const open = x > CLOUD_FLOOR_SAFE_START && x < FINISH - CLOUD_FLOOR_SAFE_END;
    if (open && sinceGap > nextGapAfter) {
      const width = CLOUD_GAP_MIN + Math.random() * (CLOUD_GAP_MAX - CLOUD_GAP_MIN);
      gaps.push({ start: x, end: x + width });
      x += width;
      sinceGap = 0;
      nextGapAfter = CLOUD_GAP_EVERY_MIN + Math.random() * CLOUD_GAP_EVERY_RANGE;
    } else {
      x -= CLOUD_OVERLAP; // the next cloud tucks in against this one
    }
    // Small steps, so dolls just walk up and down them.
    // (at least a little, so it's always bumpy).
    const step = (5 + Math.random() * (CLOUD_STEP - 5)) * (Math.random() < 0.5 ? -1 : 1);
    h = Math.abs(h + step) > CLOUD_MAX_LIFT ? h - step : h + step;
  }
  return { clouds, gaps };
}

// Hurdles and power-ups never sit over a gap.
function clearCloudGaps() {
  const floor = state.cloudFloor;
  if (!floor) return;
  const nearGap = x => floor.gaps.some(gap => x > gap.start - 120 && x < gap.end + 120);
  state.obstacles = state.obstacles.filter(obstacle => !nearGap(obstacle.x));
  for (const powerup of state.powerups) {
    const gap = floor.gaps.find(g => powerup.x > g.start - 60 && powerup.x < g.end + 60);
    if (gap) powerup.x = gap.end + 90;
  }
}

function cloudGapAt(x) {
  return state.cloudFloor?.gaps.find(gap => x > gap.start + CLOUD_GAP_EDGE_GRACE && x < gap.end - CLOUD_GAP_EDGE_GRACE) || null;
}

// The next gap ahead of x the way she's facing, within reach.
function cloudGapAhead(x, facing, reach) {
  return state.cloudFloor?.gaps.find(gap => (facing >= 0
    ? gap.start - x > 0 && gap.start - x < reach
    : x - gap.end > 0 && x - gap.end < reach)) || null;
}

// How far above the flat course the floor is at x: the cloud's height plus
// its dome, blended where two clouds meet.
function groundLift(x) {
  const floor = state.cloudFloor;
  if (!floor) return 0;
  let best = null;
  for (const cloud of floor.clouds) {
    if (x < cloud.x || x > cloud.x + cloud.w) continue;
    const k = (x - cloud.x) / cloud.w;
    const lift = cloud.h + Math.sin(Math.PI * k) * CLOUD_DOME;
    // In an overlap the later cloud (in front) takes over across it.
    best = best === null ? lift : best + (lift - best) * clamp((x - cloud.x) / CLOUD_OVERLAP, 0, 1);
  }
  if (best !== null) return best;
  // Over a gap: the height of the cloud just before it.
  const before = floor.clouds.filter(cloud => cloud.x + cloud.w <= x).at(-1);
  return before ? before.h : 0;
}

// A doll on the floor over a gap falls through (flying mounts don't).
function checkCloudFall(racer) {
  if (!state.cloudFloor || racer.cloudFallTimer > 0 || racer.z > 0 || racer.finished || racer.grabbedBy) return;
  if (isMounted(racer) && isFlyingMountType(racer.horseType)) return;
  const gap = cloudGapAt(racer.x);
  if (!gap) return;
  racer.cloudFallTimer = CLOUD_FALL_TIME;
  // She comes back on the cloud she fell from.
  racer.cloudRespawnX = racer.facing >= 0 || racer.x < (gap.start + gap.end) / 2 ? gap.start - 70 : gap.end + 70;
  racer.vy = 120;
  racer.jumpStarted = false;
  racer.pushTimer = 0;
  racerVoice(racer, "hit", { chance: 0.8, priority: 1 });
  sfx("push_whoosh", racer.x);
}

// Falling: she drops away out of sight, then pops back on the cloud.
function updateCloudFall(racer, dt) {
  racer.cloudFallTimer = Math.max(0, racer.cloudFallTimer - dt);
  racer.vy -= GRAVITY * dt;
  racer.z += racer.vy * dt;
  racer.speed = 0;
  racer.moving = false;
  if (racer.cloudFallTimer > 0) return;
  racer.x = racer.cloudRespawnX;
  racer.z = 0;
  racer.vy = 0;
  racer.knockbackX = 0;
  racer.fallBackTimer = 0;
  racer.landingTimer = 0;
  racer.joinFlashTimer = 1;
  sfx("mount_expire_poof", racer.x, { gain: 0.8 });
}

// On the clouds a doll bounces as she runs and, standing still, sinks in a
// little (cloudSink 0..1). Riders and fliers don't.
function updateCloudFooting(racer, dt) {
  if (!state.cloudFloor) return;
  const onFoot = racer.z === 0 && !isMounted(racer) && !(racer.cloudFallTimer > 0) && !racer.grabbedBy;
  const still = onFoot && !racer.moving;
  const target = still ? 1 : 0;
  const rate = dt / (still ? CLOUD_SINK_TIME : CLOUD_SINK_TIME * 0.35);
  racer.cloudSink = clamp((racer.cloudSink || 0) + Math.sign(target - (racer.cloudSink || 0)) * rate, 0, 1);
  racer.cloudStride = onFoot && racer.moving ? (racer.cloudStride || 0) + Math.abs(racer.speed) * dt : 0;
}

// How far below her normal place she's drawn (px, down positive).
function cloudFootingOffset(racer) {
  if (!state.cloudFloor) return 0;
  const bounce = racer.cloudStride > 0 ? Math.abs(Math.sin(Math.PI * racer.cloudStride / CLOUD_BOUNCE_STRIDE)) * CLOUD_BOUNCE : 0;
  return (racer.cloudSink || 0) * CLOUD_SINK - bounce;
}

// Soft cloud fluff over the feet of someone sunk into the clouds.
function drawCloudFluff(racer) {
  const sink = racer.cloudSink || 0;
  if (sink < 0.05) return;
  const x = racer.x - state.camera;
  const y = racer.y + 54 + 2;
  const scale = racerDepthScale(racer) / 0.45;
  ctx.save();
  ctx.globalAlpha = Math.min(1, sink * 1.4);
  ctx.fillStyle = "#fbf8ff";
  for (const [dx, r] of [[-30, 15], [-12, 19], [8, 18], [27, 14]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * scale, y - r * 0.15 * scale, r * scale, r * 0.55 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCloudFloor() {
  const floor = state.cloudFloor;
  if (!floor) return;
  const viewLeft = state.camera - 200;
  const viewRight = state.camera + getWorldViewportWidth() + 200;
  // Through each gap: sky falling away, with far-off clouds below.
  for (const gap of floor.gaps) {
    if (gap.end < viewLeft || gap.start > viewRight) continue;
    const x = gap.start - state.camera;
    const top = PATH_TOP - 40;
    const sky = ctx.createLinearGradient(0, top, 0, H);
    sky.addColorStop(0, "#d5ecff");
    sky.addColorStop(0.5, "#9cc8f3");
    sky.addColorStop(1, "#6f9fe0");
    ctx.fillStyle = sky;
    ctx.fillRect(x - 10, top, gap.end - gap.start + 20, H - top);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x + (gap.end - gap.start) * (0.25 + i * 0.25), H - 40 - i * 30, 26 - i * 5, 8 - i, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const art = getTrackArt("floor");
  for (const cloud of floor.clouds) {
    if (cloud.x + cloud.w < viewLeft || cloud.x > viewRight) continue;
    if (art) drawCloudFloorArt(art, cloud);
    else drawCloudFloorStandIn(cloud);
  }
}

// The floor sheet (image-requests.md §21 CL1): six 768×320 cloud cells, each
// stretched to its cloud's width, its back edge at the cloud's height.
function drawCloudFloorArt(art, cloud) {
  const cellW = CLOUD_FLOOR_CELL_W;
  const cellH = CLOUD_FLOOR_CELL_H;
  const col = cloud.variant % 3;
  const row = Math.floor(cloud.variant / 3);
  const top = PATH_TOP - CLOUD_FLOOR_BACK_EDGE - cloud.h;
  ctx.drawImage(art, col * cellW, row * cellH, cellW, cellH, cloud.x - state.camera, top - CLOUD_FLOOR_ART_TOP, cloud.w, cellH);
}

// Until the floor sheet is in: a soft puffy slab drawn in code.
function drawCloudFloorStandIn(cloud) {
  const x0 = cloud.x - state.camera;
  const back = PATH_TOP - CLOUD_FLOOR_BACK_EDGE - cloud.h;
  const r = 34;
  ctx.save();
  const body = ctx.createLinearGradient(0, back - 30, 0, H);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.35, "#f6f0ff");
  body.addColorStop(1, "#e2d5f6");
  ctx.fillStyle = body;
  ctx.beginPath();
  // The puffy back edge, following the dome.
  const steps = Math.max(3, Math.round(cloud.w / 46));
  for (let i = 0; i <= steps; i += 1) {
    const k = i / steps;
    const px = x0 + r + (cloud.w - 2 * r) * k;
    const py = back - Math.sin(Math.PI * k) * CLOUD_DOME + Math.sin(cloud.seed + i * 1.7) * 5;
    ctx.moveTo(px + r, py);
    ctx.arc(px, py, r * (0.85 + 0.25 * Math.abs(Math.sin(cloud.seed * 3 + i))), 0, Math.PI * 2);
  }
  // Rounded puffy ends down to the bottom, only where a gap shows them
  // (elsewhere the next cloud carries straight on).
  const gaps = state.cloudFloor.gaps;
  const gapBefore = gaps.some(gap => Math.abs(gap.end - cloud.x) < 2);
  const gapAfter = gaps.some(gap => Math.abs(gap.start - (cloud.x + cloud.w)) < 2);
  const ends = [gapBefore && [x0 + r * 0.9, 1], gapAfter && [x0 + cloud.w - r * 0.9, -1]].filter(Boolean);
  for (const [ex] of ends) {
    for (let y = back + 20; y < H + r; y += 44) {
      ctx.moveTo(ex + r, y);
      ctx.arc(ex, y, r, 0, Math.PI * 2);
    }
  }
  ctx.rect(gapBefore ? x0 + r * 0.9 : x0, back, cloud.w - (gapBefore ? r * 0.9 : 0) - (gapAfter ? r * 0.9 : 0), H - back + 10);
  ctx.fill();
  // A little shading along the ends so gaps read as gaps.
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#9b88c9";
  for (const [ex0, dir] of ends) {
    const ex = ex0 - dir * r * 0.9 + dir * 6;
    const shade = ctx.createLinearGradient(ex, 0, ex + dir * 40, 0);
    shade.addColorStop(0, "#8b78c0");
    shade.addColorStop(1, "#8b78c000");
    ctx.fillStyle = shade;
    ctx.fillRect(Math.min(ex, ex + dir * 40), back + 10, 40, H - back);
  }
  ctx.restore();
}
