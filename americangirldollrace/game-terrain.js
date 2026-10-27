// Cloud floors (tracks.js cloudFloor): the course is a row of clouds, one
// after another at slightly different heights, each gently domed, with now
// and then a gap between two. A doll who doesn't jump a gap falls through it
// and comes back a moment later just before it. Everything on the course is
// drawn lifted by the floor's height there (groundLift); the game's own
// physics stay flat, since the steps are small.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

// Shadows on the ground (alpha), or none on a cloud floor.
function floorShadowAlpha(alpha) {
  return state.cloudFloor ? 0 : alpha;
}

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
    if (gaps.length && gaps.at(-1).end === x) gaps.at(-1).after = clouds.at(-1);
    x += w;
    sinceGap += w;
    const open = x > CLOUD_FLOOR_SAFE_START && x < FINISH - CLOUD_FLOOR_SAFE_END;
    if (open && sinceGap > nextGapAfter) {
      const width = CLOUD_GAP_MIN + Math.random() * (CLOUD_GAP_MAX - CLOUD_GAP_MIN);
      gaps.push({ start: x, end: x + width, before: clouds.at(-1) });
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

// How far in from each end of its cell the floor art's cloud starts, per
// variant and cell row (cell px), from the art's pixels: the ends are
// rounded, much more so at the back.
let cloudArtInsets = null;
function cloudInset(variant, row, side) {
  const art = getTrackArt("floor");
  if (!art) return 0;
  if (!cloudArtInsets) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = art.width;
      canvas.height = art.height;
      const c = canvas.getContext("2d", { willReadFrequently: true });
      c.drawImage(art, 0, 0);
      const data = c.getImageData(0, 0, art.width, art.height).data;
      cloudArtInsets = [];
      for (let v = 0; v < 6; v += 1) {
        const left = [], right = [];
        const cx = (v % 3) * CLOUD_FLOOR_CELL_W, cy = Math.floor(v / 3) * CLOUD_FLOOR_CELL_H;
        for (let y = 0; y < CLOUD_FLOOR_CELL_H; y += 1) {
          const solid = x => data[((cy + y) * art.width + cx + x) * 4 + 3] > 128;
          let l = 0, r = 0;
          while (l < CLOUD_FLOOR_CELL_W && !solid(l)) l += 1;
          while (r < CLOUD_FLOOR_CELL_W && !solid(CLOUD_FLOOR_CELL_W - 1 - r)) r += 1;
          left.push(l < CLOUD_FLOOR_CELL_W ? l : 0);
          right.push(r < CLOUD_FLOOR_CELL_W ? r : 0);
        }
        cloudArtInsets.push({ left, right });
      }
    } catch (error) {
      cloudArtInsets = [];
    }
  }
  const insets = cloudArtInsets[variant];
  if (!insets) return 0;
  return insets[side][clamp(Math.round(row), 0, CLOUD_FLOOR_CELL_H - 1)];
}

// A gap as it looks at the depth of footY (where someone's feet are): from
// where the cloud before it visibly ends to where the next visibly starts.
function visibleCloudGap(gap, footY) {
  const row = CLOUD_FLOOR_ART_TOP + CLOUD_FLOOR_BACK_EDGE + footY - PATH_TOP;
  const before = gap.before, after = gap.after;
  return {
    start: gap.start - (before ? cloudInset(before.variant, row, "right") * before.w / CLOUD_FLOOR_CELL_W : 0),
    end: gap.end + (after ? cloudInset(after.variant, row, "left") * after.w / CLOUD_FLOOR_CELL_W : 0),
    gap
  };
}

// The gap (as seen at footY) whose open sky x is over, if any: someone
// whose middle is past the cloud's visible edge is off it.
function cloudGapAt(x, footY = PATH_TOP + 144) {
  for (const gap of state.cloudFloor?.gaps || []) {
    if (x < gap.start - 200 || x > gap.end + 200) continue;
    // (A little before her middle is past the edge she's already off: right
    // at the edge is too close. She can catch the edge as she drops.)
    const seen = visibleCloudGap(gap, footY);
    if (x > seen.start - CLOUD_EDGE_MARGIN && x < seen.end + CLOUD_EDGE_MARGIN) return seen;
  }
  return null;
}

// The next gap ahead of x the way she's facing, within reach.
function cloudGapAhead(x, facing, reach, footY = PATH_TOP + 144) {
  for (const gap of state.cloudFloor?.gaps || []) {
    const seen = visibleCloudGap(gap, footY);
    if (facing >= 0 ? seen.start - x > 0 && seen.start - x < reach : x - seen.end > 0 && x - seen.end < reach) return seen;
  }
  return null;
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
  const gap = cloudGapAt(racer.x, racer.y + 54);
  if (!gap) return;
  racer.cloudFalling = true;
  racer.cloudFallGap = gap;
  racer.cloudFallVx = racer.speed || 0;
  racer.cloudGone = 0;
  racer.cloudSink = 0;
  racer.cloudDeep = 0;
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
  if (!jumping || !isMounted(racer) || !canFly(racer)) return false;
  if (racer.z < -CLOUD_RESCUE_DEPTH || racer.vy > HORSE_JUMP_POWER * 0.5) return false;
  racer.vy = HORSE_JUMP_POWER;
  racer.cloudRescued = true;
  return true;
}

// Falling into a gap on foot, pressing towards one of its edges while it's
// in reach catches it: she hugs the cloud's edge like a pillow, then climbs
// back on (updateCloudLedge). True when she's caught it.
function catchCloudLedge(racer, horizontal) {
  if (!racer.cloudFalling || racer.cloudRescued || racer.ledge || isMounted(racer)) return false;
  if (racer.z < -LEDGE_REACH_DEPTH || Math.abs(horizontal) < 0.3) return false;
  const gap = racer.cloudFallGap;
  const side = horizontal > 0 ? 1 : -1; // the cloud she's reaching for: ahead (1) or behind (-1)
  const edgeX = side > 0 ? gap.end : gap.start;
  if (Math.abs(edgeX - racer.x) > LEDGE_REACH_X + CLOUD_EDGE_MARGIN) return false; // (she drops a little short of the edge, so reaches that much further)
  racer.ledge = { side, edgeX, t: 0 };
  racer.facing = side;
  racer.vy = 0;
  racer.speed = 0;
  racer.moving = false;
  racer.cloudFallVx = 0;
  sfx("powerup_pickup_generic", racer.x, { gain: 0.5 });
  racerVoice(racer, "jump", { chance: 0.5 });
  return true;
}

// Hanging on, then climbing up onto the cloud, then she's off again.
function updateCloudLedge(racer, dt) {
  const ledge = racer.ledge;
  ledge.t += dt;
  const hangZ = -LEDGE_HANG_DEPTH * racerDepthScale(racer);
  const climb = clamp((ledge.t - LEDGE_HANG_TIME) / LEDGE_CLIMB_TIME, 0, 1);
  const eased = climb * climb * (3 - 2 * climb);
  racer.z = hangZ * (1 - eased);
  racer.x = ledge.edgeX + ledge.side * (-14 + 54 * eased);
  racer.speed = 0;
  racer.moving = false;
  racer.vy = 0;
  if (climb < 1) return;
  racer.ledge = null;
  racer.cloudFalling = false;
  racer.z = 0;
  racer.landingTimer = UNMOUNTED_LANDING_PAUSE_DURATION;
  racer.jumpStarted = false;
}

// Which part of the climb she's in: "hang", "climb" or "top".
function cloudLedgePhase(racer) {
  const t = racer.ledge.t - LEDGE_HANG_TIME;
  return t < 0 ? "hang" : t < LEDGE_CLIMB_TIME * 0.65 ? "climb" : "top";
}

// Her ledge sheet (image-requests.md §29 LG1: hug hold, climbing, kneeling
// on top) in her outfit, once her key is in LEDGE_SHEETS, else null.
function getLedgeSheet(racer) {
  const key = dollAssetKey(racer.spriteKey);
  if (!(window.LEDGE_SHEETS || []).includes(key)) return null;
  if (racer.outfit && window.DollOutfits) return DollOutfits.getSync(racer.spriteKey, "ledge", racer.outfit);
  loadArtOnce(`ledge_${key}`, `assets/doll_${key}_ledge.webp?v=${window.LEDGE_ART_VERSION || "1"}`);
  return images[`ledge_${key}`] || null;
}
const LEDGE_STAND_IN_CHEST = [209, 175]; // her chest in the arms-up jump pose (sprites third row, middle)

// Drawn on the cloud's edge: her ledge poses once they're in; until then her
// arms-up jump pose with her chest at the cloud's top and arms over it, then
// her crouch climbing up.
function drawLedgeRacer(racer, scale) {
  const ledge = racer.ledge;
  const phase = cloudLedgePhase(racer);
  const surfaceY = racer.y + 54;
  // Drawn against the cloud's edge as it looks at her depth (its puffs round
  // off short of the gap's edge), so she lies on it with no space between.
  const seen = racer.cloudFallGap ? visibleCloudGap(racer.cloudFallGap, surfaceY) : null;
  const edgeX = (seen ? (ledge.side > 0 ? seen.end : seen.start) : ledge.edgeX) - state.camera;
  const w = FRAME * scale;
  const sheet = getLedgeSheet(racer);
  if (sheet?.complete && sheet.width) {
    // Each pose's point on the cloud's edge (LEDGE_ANCHORS) goes on the edge.
    const col = { hang: 0, climb: 1, top: 2 }[phase];
    const [ax, ay] = window.LEDGE_ANCHORS?.[dollAssetKey(racer.spriteKey)]?.[col] || [300, 230];
    const poseScale = scale * (window.LEDGE_FRAMES?.[dollAssetKey(racer.spriteKey)]?.[col]?.renderScale || 1);
    const poseW = FRAME * poseScale;
    withDollScale(racer, edgeX, surfaceY, () => drawFacingImage(sheet, col * FRAME, 0, FRAME, FRAME, edgeX - ax * poseScale, surfaceY - ay * poseScale, poseW, poseW, ledge.side, edgeX));
    return;
  }
  const x = racer.x - state.camera;
  if (phase === "hang") {
    drawFacingImage(racer.sheet, FRAME, 2 * FRAME, FRAME, FRAME, x - LEDGE_STAND_IN_CHEST[0] * scale, surfaceY - LEDGE_STAND_IN_CHEST[1] * scale, w, w, ledge.side, x);
  } else {
    drawFacingImage(racer.sheet, 0, 2 * FRAME, FRAME, FRAME, x - SPRITE_ANCHOR_X * scale, surfaceY - SPRITE_ANCHOR_Y * scale - racer.z, w, w, ledge.side, x);
  }
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
  loseRacerPowerups(racer);
}

// Fallen off the cloud, she comes back with nothing: whatever power-ups and
// mount she had fell with her.
function loseRacerPowerups(racer) {
  Object.assign(racer, {
    speedBoostStacks: [], speedBoostTimer: 0, highJumpStacks: [], highJumpTimer: 0,
    moonBootsTimer: 0, rideToys: [], snowballs: 0, oilTimer: 0, surfTimer: 0, wingsTimer: 0,
    pegasusGliding: false, spellAim: null
  });
  if (isMounted(racer) && !isAlwaysMountedTrack()) {
    racer.horseTimer = 0;
    racer.horseType = "horse";
    GameAudio.stopLoop(racerLoopId(racer, "mount"));
  }
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
// little (cloudSink 0..1), then on and on, slowly, until only her eyes and
// above show (cloudDeep 0..1). Moving, she wades slowly and rises slowly back out;
// a jump pops her straight out. Riders and fliers don't sink.
function updateCloudFooting(racer, dt) {
  if (!state.cloudFloor) return;
  const onFoot = racer.z === 0 && !isMounted(racer) && !racer.cloudFalling && !racer.grabbedBy;
  const still = onFoot && !racer.moving && !(racer.cloudHop > 0);
  racer.cloudDeep = racer.cloudDeep || 0;
  if (still && racer.cloudSink >= 1) racer.cloudDeep = Math.min(1, racer.cloudDeep + dt / CLOUD_DEEP_TIME);
  else if (onFoot) racer.cloudDeep = Math.max(0, racer.cloudDeep - (racer.moving ? dt / CLOUD_RISE_TIME : 0));
  else racer.cloudDeep = Math.max(0, racer.cloudDeep - dt / 0.25); // jumped out
  const target = still || racer.cloudDeep > 0 ? 1 : 0;
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
  } else if (onFoot && racer.moving && Math.abs(racer.speed) > 20 && racer.cloudDeep === 0) {
    racer.cloudHopV = CLOUD_HOP_SPEED;
  }
  if (!onFoot) { racer.cloudHop = 0; racer.cloudHopV = 0; }
}

// How far below her normal place she's drawn (px, down positive).
function cloudFootingOffset(racer) {
  if (!state.cloudFloor) return 0;
  return cloudSinkDepth(racer) - (racer.cloudHop || 0);
}

function cloudSinkDepth(racer) {
  return (racer.cloudSink || 0) * CLOUD_SINK + (racer.cloudDeep || 0) * CLOUD_DEEP_SINK * racerDepthScale(racer);
}

// Her speed share wading through a cloud she's sunk deep into.
function cloudWadeScale(racer) {
  return 1 - CLOUD_DEEP_SLOW * (racer.cloudDeep || 0);
}

// Sinking into the cloud: the floor's own clouds are painted back over her
// feet, faded in below the surface she stands on (a feathered mask), so her
// feet go down into the very cloud under her. The mask's edge curves like the
// near rim of a bowl pressed into the cloud around her (lowest in front of
// her middle), deeper the further she's sunk. Drawn in the course's unlifted
// coordinates, like the floor.
let sinkLayer = null;
let sinkMask = null;
function drawCloudSink(racer) {
  const sink = racer.cloudSink || 0;
  if (sink < 0.05) return;
  const art = getTrackArt("floor");
  const scale = racerDepthScale(racer) / 0.45;
  const surface = racer.y + 54 - groundLift(racer.x); // where she stands, unlifted
  const halfW = Math.ceil((70 + 60 * (racer.cloudDeep || 0)) * scale);
  const above = CLOUD_SINK_FEATHER;
  const below = Math.ceil(cloudSinkDepth(racer) + CLOUD_SINK_FEATHER + 6);
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
  // Keep only what lies below the bowl's rim, fading in over a few pixels:
  // the region under the rim, filled a few times, each a little lower.
  sinkMask ||= document.createElement("canvas");
  if (sinkMask.width < w || sinkMask.height < h) {
    sinkMask.width = Math.max(sinkMask.width, w);
    sinkMask.height = Math.max(sinkMask.height, h);
  }
  const m = sinkMask.getContext("2d");
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.globalCompositeOperation = "source-over";
  m.clearRect(0, 0, sinkMask.width, sinkMask.height);
  const bowl = (CLOUD_SINK_BOWL + CLOUD_SINK_BOWL_DEEP * cloudSinkDepth(racer)) * scale;
  const underRim = drop => {
    m.beginPath();
    m.moveTo(0, h);
    for (let i = 0; i <= 24; i += 1) {
      const u = i / 24 * 2 - 1;
      m.lineTo((u + 1) / 2 * w, above + drop + bowl * (1 - u * u));
    }
    m.lineTo(w, h);
    m.closePath();
    m.fill();
  };
  m.fillStyle = "#000";
  const steps = 6;
  m.globalAlpha = 0.3;
  for (let i = 0; i < steps; i += 1) underRim(CLOUD_SINK_FEATHER * i / steps);
  m.globalAlpha = 1;
  underRim(CLOUD_SINK_FEATHER);
  // And soften its sides, so it melts into the floor around her.
  m.globalCompositeOperation = "destination-in";
  const sides = m.createLinearGradient(0, 0, w, 0);
  sides.addColorStop(0, "#0000");
  sides.addColorStop(0.25, "#000");
  sides.addColorStop(0.75, "#000");
  sides.addColorStop(1, "#0000");
  m.fillStyle = sides;
  m.fillRect(0, 0, w, h);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "destination-in";
  c.drawImage(sinkMask, 0, 0, w, h, 0, 0, w, h);
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
