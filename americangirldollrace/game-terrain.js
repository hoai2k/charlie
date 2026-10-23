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

// A doll (riding or not) who meets a gap on the floor runs straight off the
// edge: she keeps her running pose and some of her speed while she drops
// through it. Whoever rides a pegasus, griffon or broom can fly back up by
// pressing jump until she's fallen out of sight. Once out of sight she comes
// back a moment later on the cloud she ran off.
function checkCloudFall(racer) {
  if (!state.cloudFloor || racer.cloudFalling || racer.z > 0 || racer.finished || racer.grabbedBy) return;
  const gap = cloudGapAt(racer.x);
  if (!gap) return;
  racer.cloudFalling = true;
  racer.cloudFallGap = gap;
  racer.cloudFallVx = racer.speed || 0;
  racer.cloudGone = 0;
  racer.cloudRespawnX = racer.x < (gap.start + gap.end) / 2 ? gap.start - 70 : gap.end + 70;
  racer.vy = Math.min(racer.vy, 0);
  racer.jumpStarted = false;
  racer.pushTimer = 0;
  racerVoice(racer, "hit", { chance: 0.8, priority: 1 });
  sfx("push_whoosh", racer.x);
}

// Her forward speed while falling: what she ran off with, slowly dying
// away, unless she's flown back up out of the gap.
function cloudFallForward(racer, dt) {
  racer.cloudFallVx *= Math.pow(CLOUD_FALL_DRAG, dt);
  return racer.cloudFallVx;
}

// A flier pressing jump in the gap flies back up (until she's out of sight).
function cloudFallRescue(racer, jumping) {
  if (!jumping || !isMounted(racer) || !isFlyingMountType(racer.horseType)) return false;
  if (racer.z < -CLOUD_RESCUE_DEPTH || racer.vy > HORSE_JUMP_POWER * 0.5) return false;
  racer.vy = HORSE_JUMP_POWER;
  racer.cloudRescued = true;
  return true;
}

// After her vertical motion: out of the gap once she's flown back above the
// floor; out of sight, she's back on the cloud a moment later.
function updateCloudFall(racer, dt) {
  if (!racer.cloudFalling) return;
  if (racer.cloudRescued && racer.z >= 0) {
    racer.cloudFalling = false;
    racer.cloudRescued = false;
    return;
  }
  if (racer.z > -CLOUD_FALL_DEPTH) return;
  racer.cloudGone += dt;
  if (racer.cloudGone < CLOUD_RESPAWN_DELAY) return;
  racer.cloudFalling = false;
  racer.cloudRescued = false;
  racer.x = racer.cloudRespawnX;
  racer.z = 0;
  racer.vy = 0;
  racer.knockbackX = 0;
  racer.fallBackTimer = 0;
  racer.landingTimer = 0;
  racer.joinFlashTimer = 1;
  sfx("mount_expire_poof", racer.x, { gain: 0.8 });
}

// Drawing someone falling through a gap: below the floor's surface she shows
// only within the gap (the clouds either side are in front of her), and
// once she's fallen out of sight not at all.
function clipToCloudGap(racer) {
  if (!racer.cloudFalling) return true;
  if (racer.z <= -CLOUD_FALL_DEPTH) return false;
  const gap = racer.cloudFallGap;
  const surface = racer.y + 54;
  ctx.beginPath();
  ctx.rect(-10000, -10000, 20000, surface + 10000);
  ctx.rect(gap.start - state.camera, surface, gap.end - gap.start, 10000);
  ctx.clip();
  return true;
}

// On the clouds a doll bounces as she runs and, standing still, sinks in a
// little (cloudSink 0..1). Riders and fliers don't.
function updateCloudFooting(racer, dt) {
  if (!state.cloudFloor) return;
  const onFoot = racer.z === 0 && !isMounted(racer) && !racer.cloudFalling && !racer.grabbedBy;
  const still = onFoot && !racer.moving && !(racer.cloudHop > 0);
  const target = still ? 1 : 0;
  const rate = dt / (still ? CLOUD_SINK_TIME : CLOUD_SINK_TIME * 0.35);
  racer.cloudSink = clamp((racer.cloudSink || 0) + Math.sign(target - (racer.cloudSink || 0)) * rate, 0, 1);
  // A calm hop: each step on the cloud starts a bounce, which rises and
  // falls under its own soft gravity, so when she stops the last one just
  // finishes; she only sinks in once it has.
  racer.cloudHop = racer.cloudHop || 0;
  racer.cloudHopV = racer.cloudHopV || 0;
  if (racer.cloudHop > 0 || racer.cloudHopV > 0) {
    racer.cloudHopV -= CLOUD_HOP_GRAVITY * dt;
    racer.cloudHop = Math.max(0, racer.cloudHop + racer.cloudHopV * dt);
    if (racer.cloudHop === 0) racer.cloudHopV = 0;
  } else if (onFoot && racer.moving && Math.abs(racer.speed) > 20) {
    racer.cloudHopV = CLOUD_HOP_SPEED;
  }
  if (!onFoot) { racer.cloudHop = 0; racer.cloudHopV = 0; }
}

// How far below her normal place she's drawn (px, down positive).
function cloudFootingOffset(racer) {
  if (!state.cloudFloor) return 0;
  return (racer.cloudSink || 0) * CLOUD_SINK - (racer.cloudHop || 0);
}

// Sinking into the cloud: the floor's own clouds are painted back over her
// feet, faded in below the surface she stands on (a feathered mask), so her
// feet go down into the very cloud under her. Drawn in the course's unlifted
// coordinates, like the floor.
let sinkLayer = null;
function drawCloudSink(racer) {
  const sink = racer.cloudSink || 0;
  if (sink < 0.05) return;
  const art = getTrackArt("floor");
  const scale = racerDepthScale(racer) / 0.45;
  const surface = racer.y + 54 - groundLift(racer.x); // where she stands, unlifted
  const halfW = Math.ceil(70 * scale);
  const above = CLOUD_SINK_FEATHER;
  const below = Math.ceil(CLOUD_SINK * sink + CLOUD_SINK_FEATHER + 6);
  const x0 = Math.floor(racer.x - state.camera - halfW);
  const y0 = Math.floor(surface - above);
  const w = halfW * 2;
  const h = above + below;
  sinkLayer ||= document.createElement("canvas");
  if (sinkLayer.width < w || sinkLayer.height < h) {
    sinkLayer.width = Math.max(sinkLayer.width, w);
    sinkLayer.height = Math.max(sinkLayer.height, h);
  }
  const c = sinkLayer.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, sinkLayer.width, sinkLayer.height);
  c.setTransform(1, 0, 0, 1, -x0, -y0);
  for (const cloud of state.cloudFloor.clouds) {
    if (cloud.x - state.camera > x0 + w || cloud.x + cloud.w - state.camera < x0) continue;
    if (art) drawCloudFloorArt(art, cloud, c);
    else drawCloudFloorStandIn(cloud, c);
  }
  // Keep only what lies below the surface, fading in over a few pixels.
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "destination-in";
  const fade = c.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, "#0000");
  fade.addColorStop(above / h, "#0000");
  fade.addColorStop(Math.min(1, (above + CLOUD_SINK_FEATHER) / h), "#000");
  fade.addColorStop(1, "#000");
  c.fillStyle = fade;
  c.fillRect(0, 0, w, h);
  // And soften its sides, so it melts into the floor around her.
  const sides = c.createLinearGradient(0, 0, w, 0);
  sides.addColorStop(0, "#0000");
  sides.addColorStop(0.25, "#000");
  sides.addColorStop(0.75, "#000");
  sides.addColorStop(1, "#0000");
  c.fillStyle = sides;
  c.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = Math.min(1, sink * 1.4);
  ctx.drawImage(sinkLayer, 0, 0, w, h, x0, y0, w, h);
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
    // Fading in from clear at the top, so it melts into the sky behind.
    sky.addColorStop(0, "#d5ecff00");
    sky.addColorStop(0.3, "#c4e2ff");
    sky.addColorStop(0.6, "#9cc8f3");
    sky.addColorStop(1, "#6f9fe0");
    ctx.fillStyle = sky;
    // Wider than the gap: the clouds' rounded ends, drawn over it, shape the hole.
    ctx.fillRect(x - CLOUD_GAP_SKY_OVERHANG, top, gap.end - gap.start + 2 * CLOUD_GAP_SKY_OVERHANG, H - top);
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
function drawCloudFloorArt(art, cloud, c = ctx) {
  const cellW = CLOUD_FLOOR_CELL_W;
  const cellH = CLOUD_FLOOR_CELL_H;
  const col = cloud.variant % 3;
  const row = Math.floor(cloud.variant / 3);
  const top = PATH_TOP - CLOUD_FLOOR_BACK_EDGE - cloud.h;
  // One clear row in from the cell's top: stretched, a cell would otherwise
  // pick up the bottom row of the cell above it as a faint line.
  const inset = 1;
  c.drawImage(art, col * cellW, row * cellH + inset, cellW, cellH - inset, cloud.x - state.camera, top - CLOUD_FLOOR_ART_TOP + inset, cloud.w, cellH - inset);
}

// Until the floor sheet is in: a soft puffy slab drawn in code.
function drawCloudFloorStandIn(cloud, c = ctx) {
  const x0 = cloud.x - state.camera;
  const back = PATH_TOP - CLOUD_FLOOR_BACK_EDGE - cloud.h;
  const r = 34;
  c.save();
  const body = c.createLinearGradient(0, back - 30, 0, H);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.35, "#f6f0ff");
  body.addColorStop(1, "#e2d5f6");
  c.fillStyle = body;
  c.beginPath();
  // The puffy back edge, following the dome.
  const steps = Math.max(3, Math.round(cloud.w / 46));
  for (let i = 0; i <= steps; i += 1) {
    const k = i / steps;
    const px = x0 + r + (cloud.w - 2 * r) * k;
    const py = back - Math.sin(Math.PI * k) * CLOUD_DOME + Math.sin(cloud.seed + i * 1.7) * 5;
    c.moveTo(px + r, py);
    c.arc(px, py, r * (0.85 + 0.25 * Math.abs(Math.sin(cloud.seed * 3 + i))), 0, Math.PI * 2);
  }
  // Rounded puffy ends down to the bottom, only where a gap shows them
  // (elsewhere the next cloud carries straight on).
  const gaps = state.cloudFloor.gaps;
  const gapBefore = gaps.some(gap => Math.abs(gap.end - cloud.x) < 2);
  const gapAfter = gaps.some(gap => Math.abs(gap.start - (cloud.x + cloud.w)) < 2);
  const ends = [gapBefore && [x0 + r * 0.9, 1], gapAfter && [x0 + cloud.w - r * 0.9, -1]].filter(Boolean);
  for (const [ex] of ends) {
    for (let y = back + 20; y < H + r; y += 44) {
      c.moveTo(ex + r, y);
      c.arc(ex, y, r, 0, Math.PI * 2);
    }
  }
  c.rect(gapBefore ? x0 + r * 0.9 : x0, back, cloud.w - (gapBefore ? r * 0.9 : 0) - (gapAfter ? r * 0.9 : 0), H - back + 10);
  c.fill();
  // A little shading along the ends so gaps read as gaps.
  c.globalAlpha = 0.18;
  c.fillStyle = "#9b88c9";
  for (const [ex0, dir] of ends) {
    const ex = ex0 - dir * r * 0.9 + dir * 6;
    const shade = c.createLinearGradient(ex, 0, ex + dir * 40, 0);
    shade.addColorStop(0, "#8b78c0");
    shade.addColorStop(1, "#8b78c000");
    c.fillStyle = shade;
    c.fillRect(Math.min(ex, ex + dir * 40), back + 10, 40, H - back);
  }
  c.restore();
}
