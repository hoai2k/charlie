// Drawing the race: the scene, the course, racers, particles, the progress tracker and the victory screen.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

// World-space sparkles, puffs and rings. y is the ground line, z the height.
function spawnParticles(x, y, z, count, options = {}) {
  // fallThrough: it doesn't stop on the ground but drops on off the screen.
  const { color = "#ffffff", kind = "spark", speed = 160, lift = 300, life = 0.6, size = 5, gravity = 900, dirX = 0, fallThrough = false } = options;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    state.particles.push({
      x, y: y + (Math.random() - 0.5) * 10, z,
      vx: (dirX ? dirX * (0.5 + Math.random()) : Math.cos(angle)) * speed,
      vz: lift * (0.55 + Math.random() * 0.45),
      gravity, kind, color, size: size * (0.7 + Math.random() * 0.6),
      life, maxLife: life, fallThrough, spriteIndex: kind === "candy" ? Math.floor(Math.random() * 8) : undefined
    });
  }
  if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.z = p.fallThrough ? p.z + p.vz * dt : Math.max(0, p.z + p.vz * dt);
    p.vz -= p.gravity * dt;
    if (!p.fallThrough) p.vx *= Math.pow(0.3, dt);
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function drawParticles() {
  const viewWidth = getWorldViewportWidth();
  for (const p of state.particles) {
    const x = p.x - state.camera;
    if (x < -60 || x > viewWidth + 60) continue;
    const t = p.life / p.maxLife;
    const y = p.y - p.z;
    ctx.save();
    if (p.kind === "candy" && images.candy_particles) {
      ctx.globalAlpha = p.fallThrough ? 1 : Math.min(1, t * 3);
      ctx.translate(x, y);
      ctx.rotate((1 - t) * 5 * Math.sign(p.vx));
      const n = p.spriteIndex || 0;
      ctx.drawImage(images.candy_particles, n % 4 * 128, Math.floor(n / 4) * 128, 128, 128, -p.size, -p.size, p.size * 2, p.size * 2);
    } else if (p.kind === "puff") {
      ctx.globalAlpha = 0.45 * t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y - 6, p.size * (1.6 - t * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "drop") {
      // A water droplet: a teardrop stretched along its fall, with a glint.
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(-p.vz, p.vx) - Math.PI / 2); // the point trails
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.9);
      ctx.quadraticCurveTo(p.size, 0, 0, p.size);
      ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.9);
      ctx.fill();
      ctx.fillStyle = "#ffffffcc";
      ctx.beginPath();
      ctx.arc(-p.size * 0.3, -p.size * 0.1, p.size * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "dot") {
      // A plain glowing dot (EMP triggers other than the wand).
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, p.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "ring") {
      ctx.globalAlpha = 0.8 * t;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, p.y - 4, p.size * (1.6 - t), p.size * 0.32 * (1.6 - t), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // A little four-pointed star with a soft glow.
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      const r = p.size;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.6);
      ctx.lineTo(x + r * 0.45, y - r * 0.45);
      ctx.lineTo(x + r * 1.6, y);
      ctx.lineTo(x + r * 0.45, y + r * 0.45);
      ctx.lineTo(x, y + r * 1.6);
      ctx.lineTo(x - r * 0.45, y + r * 0.45);
      ctx.lineTo(x - r * 1.6, y);
      ctx.lineTo(x - r * 0.45, y - r * 0.45);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawScene(dt) {
  const legoSplitRendering = updateLegoSplitState(dt);
  if (state.legoCrossfadeRequested) {
    // A layout change that can't be seamless: keep the last frame and fade
    // it out over the new layout instead of cutting.
    state.legoCrossfadeRequested = false;
    if (legoCrossfadeCanvas.width !== canvas.width || legoCrossfadeCanvas.height !== canvas.height) {
      legoCrossfadeCanvas.width = canvas.width;
      legoCrossfadeCanvas.height = canvas.height;
    }
    const fadeCtx = legoCrossfadeCanvas.getContext("2d");
    fadeCtx.clearRect(0, 0, legoCrossfadeCanvas.width, legoCrossfadeCanvas.height);
    fadeCtx.drawImage(canvas, 0, 0);
    state.legoCrossfade = 1;
  }
  ctx.clearRect(0, 0, W, H);
  if (legoSplitRendering) {
    drawLegoSplitScene(dt);
  } else {
    drawSharedCameraScene();
  }
  if (!legoSplitRendering && state.legoSplitLineAlpha > 0) {
    drawLegoSplitLines(getLegoLinePositionsForOverlay(), state.legoSplitLineAlpha);
  }
  if (state.legoCrossfade > 0) {
    if (legoCrossfadeCanvas.width === canvas.width && state.running) {
      ctx.save();
      ctx.globalAlpha = state.legoCrossfade;
      ctx.drawImage(legoCrossfadeCanvas, 0, 0);
      ctx.restore();
    }
    state.legoCrossfade = Math.max(0, state.legoCrossfade - dt / LEGO_CROSSFADE_SECONDS);
  }
  if (startPanel.classList.contains("hidden")) {
    drawRaceProgressTracker();
  }

  if (state.done && state.winner) {
    drawVictoryScene();
  }

  if (!state.running && startPanel.classList.contains("hidden") && !state.done) {
    drawCenterText("Press Start Race");
  }
}

function drawSharedCameraScene() {
  ctx.save();
  applyWorldZoomTransform();
  drawWorldScene();
  ctx.restore();
}

// One thing in the scene, by kind.
function drawDrawable(drawable) {
  if (drawable.type === "obstacle") {
    drawObstacle(drawable.item);
  } else if (drawable.type === "powerup") {
    drawPowerup(drawable.item);
  } else if (drawable.type === "projectile") {
    drawSnowball(drawable.item);
  } else if (drawable.type === "monsterBolt") {
    drawMonsterBolt(drawable.item);
  } else if (drawable.type === "leftover") {
    drawThrownLeftover(drawable.item);
  } else if (drawable.type === "rainbow") {
    drawRainbowBeam(drawable.item);
  } else if (drawable.type === "storm") {
    drawStormCloud(drawable.item);
  } else if (drawable.type === "rewardCloud") {
    drawRewardCloud(drawable.item);
  } else if (drawable.type === "monster") {
    drawMonster(drawable.item);
  } else if (drawable.type === "runawayHorse") {
    drawRunawayHorse(drawable.item);
  } else if (drawable.type === "beachBall") {
    drawBeachBall(drawable.item);
  } else if (drawable.type === "windupCar") {
    drawWindupCar(drawable.item);
  } else if (drawable.type === "amandaAlly") {
    drawAmandaAlly(drawable.item);
  } else {
    drawRacer(drawable.item);
  }
}

function drawWorldScene() {
  drawBackground();
  drawCloudFloor();
  drawFinishLine();

  if (!state.running && !startPanel.classList.contains("hidden")) {
    drawMenuCharacters();
  } else {
    const drawables = [
      ...state.obstacles.map(obstacle => ({ type: "obstacle", y: obstacle.y, item: obstacle })),
      // Puddles lie flat, so anyone standing in one is drawn over it.
      ...state.powerups.filter(powerup => !powerup.taken).map(powerup => ({ type: "powerup", y: powerup.type === "oil" ? powerup.y - 60 : powerup.y, item: powerup })),
      ...state.projectiles.map(projectile => ({ type: "projectile", y: projectile.y, item: projectile })),
      ...(state.monsterBolts || []).map(bolt => ({ type: "monsterBolt", y: bolt.y + 54, item: bolt })),
      ...state.thrownLeftovers.map(item => ({ type: "leftover", y: item.groundY - 20, item })),
      // Drawn just in front of the unicorn, so it comes out of the horn.
      ...state.rainbowBeams.map(beam => ({ type: "rainbow", y: beam.owner ? beam.owner.y + 54.5 : beam.y, item: beam })),
      ...(state.stormCloud ? [{ type: "storm", y: TRACK_TOP - 220, item: state.stormCloud }] : []),
      ...(state.rewardCloud ? [{ type: "rewardCloud", y: TRACK_TOP - 230, item: state.rewardCloud }] : []),
      ...state.monsters.map(monster => ({ type: "monster", y: monster.y + 56, item: monster })),
      ...state.runawayHorses.map(horse => ({ type: "runawayHorse", y: horse.y + 56, item: horse })),
      ...state.beachBalls.map(ball => ({ type: "beachBall", y: ball.y, item: ball })),
      ...state.windupCars.map(car => ({ type: "windupCar", y: car.y, item: car })),
      ...(state.amandaAlly ? [{ type: "amandaAlly", y: state.amandaAlly.y + 54, item: state.amandaAlly }] : []),
      ...state.racers.map(racer => ({ type: "racer", y: racer.y + 54, item: racer }))
    ].sort((a, b) => a.y - b.y);
    drawSpellAimRings();
    for (const drawable of drawables) {
      // On a cloud floor everything stands at the floor's height there.
      const lifted = state.cloudFloor && drawable.item && Number.isFinite(drawable.item.x) && drawable.type !== "storm" && drawable.type !== "rewardCloud";
      ctx.save();
      if (lifted) ctx.translate(0, -groundLift(drawable.item.x));
      const racer = drawable.type === "racer" ? drawable.item : null;
      if (racer && !clipToCloudGap(racer)) { ctx.restore(); continue; }
      // Bouncing or sunk in on the clouds; fluff over her feet when sunk.
      const footing = racer && lifted ? cloudFootingOffset(racer) : 0;
      ctx.translate(0, footing);
      drawDrawable(drawable);
      ctx.translate(0, -footing);
      if (racer && lifted) {
        ctx.translate(0, groundLift(racer.x)); // the floor's own coordinates
        drawCloudSink(racer);
      }
      ctx.restore();
    }
    drawSpells();
    drawEmpArcs();
    drawParticles();
  }
}

function drawRaceProgressTracker() {
  const racers = state.racers.filter(Boolean).slice().sort((a, b) => a.playerIndex - b.playerIndex);
  if (racers.length === 0) return;

  const width = RACE_TRACKER_WIDTH;
  const height = 34;
  const x = W - RACE_TRACKER_RIGHT - width;
  // The compact 5-8 player HUD takes two short rows at the top.
  // The compact 5-8 player HUD takes two short rows at the top; with four
  // racers the P4 card sits where the tracker would be, so drop below it.
  const compactHud = hudElement?.classList.contains("compact");
  const y = compactHud ? RACE_TRACKER_TOP - 18 : racers.length === 4 ? RACE_TRACKER_TOP + 56 : RACE_TRACKER_TOP;
  const trackX = x + 16;
  const trackY = y + height / 2;
  const trackWidth = width - 32;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.strokeStyle = "rgba(23,33,38,0.2)";
  ctx.lineWidth = 2;
  roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(36,49,58,0.22)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(trackX, trackY);
  ctx.lineTo(trackX + trackWidth, trackY);
  ctx.stroke();

  for (let index = 0; index < racers.length; index += 1) {
    const racer = racers[index];
    const progress = clamp(racer.x / FINISH, 0, 1);
    const markerX = trackX + progress * trackWidth;
    const markerY = trackY + (index - (racers.length - 1) / 2) * 2.5;

    ctx.fillStyle = shouldTagRacerNames() && !racer.ai ? slotColor(racer.playerIndex) : "#ffffff";
    ctx.strokeStyle = racer.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawMenuCharacters() {
  for (const item of menuCharacterPreview.filter(item => isAllDollsMode() || !characters[item.key].hidden)) {
    const character = characters[item.key];
    drawRacer({
      name: character.name,
      spriteKey: character.spriteKey,
      sheet: character.image(),
      x: item.x,
      y: item.y,
      z: 0,
      speed: 0,
      moving: false,
      frame: Math.floor(performance.now() / 420) % 3,
      jumpStarted: false,
      jumpFrame: 0,
      landingTimer: 0,
      pushTimer: 0,
      fallBackTimer: 0,
      fallBackFacing: 1,
      horseTimer: 0,
      color: character.color,
      facing: 1,
      showLabel: item.showLabel
    });
  }
}

function drawVictoryScene() {
  const winner = state.winner;
  const elapsed = performance.now() - state.victoryStartTime;
  ctx.save();
  const skyGradient = ctx.createLinearGradient(0, 0, 0, H);
  skyGradient.addColorStop(0, "rgba(18, 29, 62, 0.58)");
  skyGradient.addColorStop(0.55, "rgba(52, 94, 146, 0.34)");
  skyGradient.addColorStop(1, "rgba(255, 255, 255, 0.04)");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, W, H);
  drawVictoryFireworks(elapsed);
  drawVictoryPodium(winner, elapsed);
  drawVictoryConfetti(elapsed);
  drawVictoryBanner(winner, elapsed);
  ctx.restore();
}

function drawVictoryFireworks(elapsed) {
  const colors = ["#ff4f81", "#ffd84d", "#67e8f9", "#8cff73", "#c084fc", "#ff9f43"];
  for (let i = 0; i < VICTORY_FIREWORK_COUNT; i += 1) {
    const cycle = (elapsed * 0.00042 + i * 0.173) % 1;
    const burst = cycle < 0.12 ? cycle / 0.12 : cycle < 0.78 ? 1 : 1 - (cycle - 0.78) / 0.22;
    const radius = 24 + cycle * 132;
    const cx = W * (0.16 + ((i * 0.137) % 0.72));
    const cy = H * (0.13 + ((i * 0.211) % 0.32));
    ctx.save();
    ctx.globalAlpha = clamp(burst, 0, 1) * 0.8;
    ctx.fillStyle = colors[i % colors.length];
    // Sparkle dots instead of thin lines read better on a TV.
    for (let ray = 0; ray < 16; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 16 + i * 0.4;
      for (let step = 0; step < 3; step += 1) {
        const r = radius * (0.45 + step * 0.27);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 4.2 - step * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// Falling confetti from assets/ui/confetti.webp (six 64px pieces in a row).
function drawVictoryConfetti(elapsed) {
  const sheet = images.confetti;
  if (!sheet?.complete || !sheet.naturalWidth) return;
  const cell = sheet.naturalHeight;
  const t = elapsed / 1000;
  for (let i = 0; i < 46; i += 1) {
    const seed = (i * 7919) % 1000 / 1000;
    const speed = 70 + seed * 90;
    const size = 18 + ((i * 37) % 14);
    const y = ((t * speed + seed * (H + 120)) % (H + 120)) - 60;
    const x = ((i * 0.61803) % 1) * W + Math.sin(t * (1.2 + seed) + i) * 26;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (1.5 + seed * 2) + i);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(sheet, (i % 6) * cell, 0, cell, cell, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

const portraitImages = new Map();

function getPortraitImage(spriteKey, pose) {
  const src = `assets/portraits/${dollAssetKey(spriteKey)}${pose ? `_${pose}` : ""}.webp`;
  if (!portraitImages.has(src)) portraitImages.set(src, loadImage(src));
  const image = portraitImages.get(src);
  return image.complete && image.naturalWidth ? image : null;
}

const PODIUM_STEPS = [
  { place: 1, dx: 0, height: 112, color: "#f2c94c", edge: "#c99a1b", pose: "cheer", size: 300 },
  { place: 2, dx: -190, height: 78, color: "#dfe6ee", edge: "#9aa9b8", pose: "wave", size: 236 },
  { place: 3, dx: 190, height: 56, color: "#e8a66a", edge: "#b56f34", pose: "wave", size: 220 }
];

function drawVictoryPodium(winner, elapsed) {
  const order = (state.finishOrder?.length ? state.finishOrder : [winner]).slice(0, 3);
  const baseY = H - 132;
  const blockW = 176;
  order.forEach((racer, index) => {
    const step = PODIUM_STEPS[index];
    const cx = W / 2 + (order.length === 1 ? 0 : step.dx);
    const top = baseY - step.height;
    // Block
    ctx.save();
    ctx.fillStyle = step.color;
    ctx.strokeStyle = step.edge;
    ctx.lineWidth = 4;
    roundRect(cx - blockW / 2, top, blockW, step.height + 12, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = step.edge;
    ctx.font = `700 ${index === 0 ? 50 : 40}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(step.place), cx, top + Math.min(step.height / 2 + 4, 52));
    ctx.restore();

    // Doll: the winner hops, the others sway.
    const hop = index === 0 ? Math.abs(Math.sin(elapsed * VICTORY_JUMP_SPEED)) * 34 : 0;
    const sway = index === 0 ? 0 : Math.sin(elapsed * 0.003 + index) * 0.04;
    const image = (racer.outfit && window.DollOutfits?.getSync(racer.spriteKey, step.pose, racer.outfit)) || getPortraitImage(racer.spriteKey, step.pose);
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#142027";
    ctx.beginPath();
    ctx.ellipse(cx, top + 2, 54 * (1 - hop / 120), 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (image) {
      ctx.save();
      ctx.translate(cx, top + 8 - hop);
      ctx.rotate(sway);
      ctx.drawImage(image, -step.size / 2, -step.size, step.size, step.size);
      ctx.restore();
    } else {
      const scale = step.size / FRAME;
      drawFacingImage(racer.sheet, 0, 0, FRAME, FRAME, cx - SPRITE_ANCHOR_X * scale, top - hop - SPRITE_ANCHOR_Y * scale, FRAME * scale, FRAME * scale, 1, cx);
    }

    // Name tag under the block top.
    ctx.save();
    ctx.font = "700 21px Fredoka, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "white";
    ctx.fillStyle = racer.ai ? "#4a4f5c" : slotColor(racer.playerIndex);
    const label = racer.ai ? racer.name : `P${racer.playerIndex + 1} ${racer.name}`;
    ctx.strokeText(label, cx, baseY + 4);
    ctx.fillText(label, cx, baseY + 4);
    ctx.restore();
  });
}

function drawVictoryBanner(winner, elapsed) {
  const pulse = 1 + Math.sin(elapsed * 0.006) * 0.035;
  ctx.save();
  ctx.translate(W / 2, H * 0.16);
  ctx.scale(pulse, pulse);
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.font = "700 64px Fredoka, system-ui, sans-serif";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "white";
  ctx.fillStyle = winner.ai ? winner.color : slotColor(winner.playerIndex);
  // With two of the same doll racing, say which player won.
  const twin = state.racers.some(racer => racer !== winner && racer.name === winner.name);
  const title = `${twin && !winner.ai ? `P${winner.playerIndex + 1} ` : ""}${winner.name} Wins!`;
  ctx.strokeText(title, 0, 0);
  ctx.fillText(title, 0, 0);
  ctx.font = "700 26px Fredoka, system-ui, sans-serif";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#7a3b12";
  ctx.fillStyle = "#ffe36e";
  ctx.strokeText("Champion of the track", 0, 42);
  ctx.fillText("Champion of the track", 0, 42);
  ctx.restore();
}

function drawBackground() {
  const bg = images[getCurrentBackground().imageKey];
  const viewWidth = getWorldViewportWidth();
  const viewTop = getWorldViewportTop();
  ctx.fillStyle = "#7fc6e8";
  ctx.fillRect(0, viewTop, viewWidth, H - viewTop);
  if (!bg) {
    // This track's background is still loading: a plain path for now.
    ctx.fillStyle = "#dcae6c";
    ctx.fillRect(0, PATH_TOP + FOOT_OFFSET_Y, viewWidth, H - PATH_TOP - FOOT_OFFSET_Y);
    return;
  }
  const scale = H / bg.height;
  const bgW = bg.width * scale;
  // Reviewed periodic art repeats without reflection. Older backgrounds keep
  // their mirror fallback; a tileable prompt alone is not a seamless texture.
  const directRepeat = getTrackTheme().loopMode === "repeat";
  const firstTile = Math.floor(state.camera / bgW);
  // Each tile overlaps its neighbours by a couple of screen pixels, so no
  // sky shows through a sub-pixel gap where they meet (GPUs leave one at
  // some zooms). The few stretched pixels are the same art either way.
  const overlap = 2 / Math.max(state.cameraZoom || 1, 0.1);
  for (let tile = firstTile, x = tile * bgW - state.camera; x < viewWidth; tile += 1, x += bgW) {
    if (directRepeat || tile % 2 === 0) {
      ctx.drawImage(bg, x - overlap, 0, bgW + overlap * 2, H);
      continue;
    }
    ctx.save();
    ctx.translate(x + bgW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(bg, -overlap, 0, bgW + overlap * 2, H);
    ctx.restore();
  }
  // A light wash over the path (not on a cloud floor, where it showed as a
  // straight band across the clouds).
  if (state.cloudFloor) return;
  // Its top fades in, so it leaves no line across the scenery.
  const washTop = PATH_TOP - 48;
  const wash = ctx.createLinearGradient(0, washTop, 0, PATH_TOP);
  wash.addColorStop(0, "rgba(255, 255, 255, 0)");
  wash.addColorStop(1, "rgba(255, 255, 255, 0.16)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, washTop, viewWidth, TRACK_BOTTOM - washTop + 78);
}

function drawFinishLine() {
  const x = FINISH - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -80 || x > viewWidth + 80) return;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillRect(x, PATH_TOP - 12, 24, TRACK_BOTTOM - PATH_TOP + 92);
  for (let y = PATH_TOP - 12; y < TRACK_BOTTOM + 80; y += 24) {
    ctx.fillStyle = (Math.floor((y - PATH_TOP) / 24) % 2) ? "#111" : "#fff";
    ctx.fillRect(x, y, 24, 24);
  }
  ctx.fillStyle = "#172126";
  ctx.font = "800 24px system-ui";
  ctx.fillText("FINISH", x - 34, PATH_TOP - 24);
  ctx.restore();
}

function drawObstacle(obstacle) {
  const x = obstacle.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -100 || x > viewWidth + 100) return;
  ctx.save();
  ctx.translate(x, obstacle.y);
  drawAmandaBehindFence(obstacle);
  const hurdleArt = getTrackArt("hurdle");
  if (hurdleArt) {
    // Same 64×68 footprint as the drawn picket, base on the same line.
    ctx.shadowColor = "rgba(23,33,38,0.22)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(hurdleArt, -32, -42, 64, 68);
    ctx.shadowColor = "transparent";
    drawCaughtAmanda(obstacle);
    ctx.restore();
    return;
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(23,33,38,0.22)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#f8f7ef";
  ctx.strokeStyle = "#d4cbb6";
  ctx.lineWidth = 3;
  for (const postX of [-24, 0, 24]) {
    roundRect(postX - 5, -42, 10, 68, 4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cfc7b6";
  for (const railY of [-28, -8, 12]) {
    roundRect(-32, railY, 64, 10, 4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(-28, -26, 56, 3);
  ctx.fillRect(-28, -6, 56, 3);
  ctx.fillRect(-28, 14, 56, 3);
  drawCaughtAmanda(obstacle);
  ctx.restore();
}

function drawRacer(racer) {
  const screenX = racer.x - state.camera;
  const jumping = isDrawnJumping(racer);
  // A troll lifts a grabbed rider out of the saddle; the horse comes back on landing.
  // Fairy wings are worn, not ridden: she's drawn in her own poses.
  const mounted = isMounted(racer) && !racer.grabbedBy && racer.horseType !== "wings";
  const row = racer.grabbedBy || racer.fallBackTimer > 0 ? 3 : racer.pushTimer > 0 ? 3 : jumping ? 2 : racer.moving ? 1 : 0;
  const col = racer.grabbedBy ? 2 : racer.fallBackTimer > 0 ? 2 : racer.pushTimer > 0 ? 1 : jumping ? racer.jumpFrame : racer.frame;
  const drawFacing = racer.fallBackTimer > 0 ? racer.fallBackFacing : racer.facing;
  const horseRow = racer.pegasusGliding ? 1 : jumping ? 2 : racer.moving ? 1 : 0;
  const horseCol = racer.pegasusGliding ? racer.frame : jumping ? racer.jumpFrame : racer.frame;
  const scale = racerDepthScale(racer);
  const spriteScale = scale * (jumping && !mounted ? jumpSpriteScale[racer.spriteKey] || jumpSpriteScale.default : 1);
  const sx = col * FRAME;
  const sy = row * FRAME;
  const drawW = FRAME * spriteScale;
  const drawH = FRAME * spriteScale;
  const drawX = screenX - SPRITE_ANCHOR_X * spriteScale;
  const drawY = racer.y + 54 - SPRITE_ANCHOR_Y * spriteScale - racer.z;

  ctx.save();
  ctx.globalAlpha = floorShadowAlpha(0.28);
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, racer.y + 40, 48 * scale * 2, 13 * scale * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawPowerupAura(racer, screenX, scale, mounted);

  if (racer.frozenTimer > 0 && !racer.empDizzy) drawElectricEffect(screenX, drawY, drawW, drawH, racer.shockColor || undefined);
  if (racer.joinFlashTimer > 0) drawJoinFlash(racer, screenX, scale);

  const actions = getActionSheet(racer);
  if (racer.frogTimer > 0) {
    racer.lastBody = null;
    drawFrog(screenX, racer.y + 54 - racer.z, scale, false, racer.frogPhase, racer.facing);
  } else if (racer.ledge) {
    racer.lastBody = null;
    drawLedgeRacer(racer, scale);
  } else if (mounted && racer.horseType === "broom") {
    drawBroomRacer(racer, screenX, scale, drawFacing);
  } else if (mounted) {
    const rover = roverMotion(racer, scale);
    const pivotY = racer.y + 58 - racer.z;
    ctx.save();
    ctx.translate(screenX, pivotY + rover.bob);
    ctx.rotate(rover.tilt);
    ctx.translate(-screenX, -pivotY);
    const flashing = racer.horseTimer < HORSE_FLASH_TIME && Math.floor(performance.now() / 110) % 2 === 0;
    // A mount drawn larger when ridden (mounts.js riddenScale, the moon buggy)
    // grows about its wheels, and its seat, with the rider on it, moves with it.
    const baseScale = scale * 1.08;
    const grow = window.MOUNT_ART?.[racer.horseType]?.riddenScale || 1;
    // riderShift: sprite px to move the rider from the measured seat (the
    // buggy's driver sits a little higher and further back).
    const [shiftX, shiftY] = window.MOUNT_ART?.[racer.horseType]?.riderShift || [0, 0];
    const horseScale = baseScale * grow;
    const horseW = FRAME * horseScale;
    const horseH = FRAME * horseScale;
    const calibration = getMountFrameCalibration(racer.horseType, horseRow, horseCol);
    const horseX = screenX - SPRITE_ANCHOR_X * horseScale;
    const horseBaseY = racer.y + 58 - SPRITE_ANCHOR_Y * horseScale - racer.z;
    const baseY = racer.y + 58 - SPRITE_ANCHOR_Y * baseScale - racer.z;
    const horseY = horseBaseY + calibration.groundShift * horseScale;
    const riderScale = scale * 0.7;
    const riderW = FRAME * riderScale;
    const riderH = FRAME * riderScale;
    // Positions are in "facing right" space; drawFacingImage mirrors both the
    // mount and the rider around screenX, so the rider stays on the saddle
    // when facing left too.
    const seatDX = (calibration.seatX - MOUNT_SEAT_REFERENCE.x) * baseScale + (calibration.seatX - SPRITE_ANCHOR_X) * baseScale * (grow - 1);
    const seatDY = (calibration.seatY - MOUNT_SEAT_REFERENCE.y) * baseScale + (calibration.seatY - SPRITE_ANCHOR_Y) * baseScale * (grow - 1);
    const riderX = screenX - SPRITE_ANCHOR_X * riderScale + (9 + racer.riderXOffset) * scale + seatDX + shiftX * horseScale;
    const riderY = baseY - 60 * scale + racer.riderYOffset * scale + seatDY + shiftY * horseScale;
    if (!flashing) {
      const horseImage = images[racer.horseType] || images.horse;
      drawFacingImage(horseImage, horseCol * FRAME, horseRow * FRAME, FRAME, FRAME, horseX, horseY, horseW, horseH, drawFacing, screenX);
    }
    // Pushing or throwing from the saddle has its own pose once the actions sheet is in.
    if (racer.pushTimer > 0 && actions) {
      const box = actionFrameBox(racer, 0, 2 * FRAME, riderX, riderY, riderW, riderH);
      drawFacingImage(actions, 0, 2 * FRAME, FRAME, FRAME, box.x, box.y, box.w, box.h, drawFacing, screenX);
    }
    else drawFacingImage(racer.sheet, 0, 3 * FRAME, FRAME, FRAME, riderX, riderY, riderW, riderH, drawFacing, screenX);
    // Her moon boots stay on in the saddle (her riding frame, sprites 9).
    if (racer.moonBootsTimer > 0 && !(racer.pushTimer > 0 && actions)) drawMoonBootsOn(racer, "sprites", 9, riderX, riderY, riderW, drawFacing, screenX);
    ctx.restore();
  } else {
    const toyPose = getRideToyPose(racer, jumping);
    const fullX = screenX - SPRITE_ANCHOR_X * scale;
    const fullY = racer.y + 54 - SPRITE_ANCHOR_Y * scale - racer.z;
    if (racer.celebrateTimer > 0) drawCelebrationStar(racer, screenX, fullY, scale);
    const cheer = racer.celebrateTimer > 0 ? getCheerImage(racer) : null;
    if (cheer) {
      racer.lastBody = null;
      drawFacingImage(cheer, 0, 0, FRAME, FRAME, fullX, fullY, FRAME * scale, FRAME * scale, racer.facing, screenX);
    } else if (racer.surfTimer > 0) {
      drawSurfWave(racer, screenX, scale);
      if (actions) drawRacerBody(racer, actions, (Math.floor(performance.now() / 450) % 3) * FRAME, FRAME, fullX, fullY - 8 * scale, FRAME * scale, FRAME * scale, 1, screenX);
      else drawRacerBody(racer, racer.sheet, 0, 0, fullX, fullY - 8 * scale, FRAME * scale, FRAME * scale, 1, screenX);
    } else if (racer.castTimer > 0) {
      const progress = 1 - racer.castTimer / SPELL_CAST_TIME;
      if (actions) {
        drawRacerBody(racer, actions, (progress < 0.25 ? 0 : progress < 0.6 ? 1 : 2) * FRAME, 0, fullX, fullY, FRAME * scale, FRAME * scale, racer.facing, screenX);
      } else {
        drawRacerBody(racer, racer.sheet, FRAME, 3 * FRAME, fullX, fullY, FRAME * scale, FRAME * scale, racer.facing, screenX);
        drawWandStandIn(racer, screenX, scale, racer.facing);
      }
    } else if (actions && racer.oilTimer > 0 && racer.oilSticky) {
      drawRacerBody(racer, actions, FRAME, 2 * FRAME, fullX, fullY, FRAME * scale, FRAME * scale, racer.facing, screenX);
    } else if (actions && racer.moonBootsTimer > 0 && racer.z > 20 && !racer.grabbedBy) {
      drawRacerBody(racer, actions, 2 * FRAME, 2 * FRAME, fullX, fullY, FRAME * scale, FRAME * scale, drawFacing, screenX);
    } else if (toyPose) {
      const toyFrame = toyPose.row * 3 + toyPose.col;
      const toyCalibration = window.RIDE_TOY_FRAMES?.[dollAssetKey(racer.spriteKey)];
      const toyScale = scale * (toyCalibration?.scale[toyFrame] || 1);
      const toyAnchorX = toyCalibration?.anchorX[toyFrame] || SPRITE_ANCHOR_X;
      const toyY = racer.y + 54 - SPRITE_ANCHOR_Y * toyScale - racer.z - toyPose.lift * scale / 0.45;
      drawRacerBody(racer, toyPose.sheet, toyPose.col * FRAME, toyPose.row * FRAME,
        screenX - toyAnchorX * toyScale, toyY, FRAME * toyScale, FRAME * toyScale, drawFacing, screenX);

    } else if (racer.oilTimer > 0 && racer.oilSticky) {
      racer.lastBody = null;
      drawStuckRacer(racer, screenX, scale);
    } else {
      drawRacerBody(racer, racer.sheet, sx, sy, drawX, drawY, drawW, drawH, drawFacing, screenX);
    }
  }

  // Dizzy (a non-lightning EMP): stars circle her head, in front of her.
  if (racer.frozenTimer > 0 && racer.empDizzy) drawDizzyStars(screenX, (mounted ? drawY - 30 * scale : drawY) + 62 * scale, scale, Math.min(1, racer.frozenTimer * 3));

  ctx.save();
  const labelY = mounted ? drawY - 42 : drawY - 8;
  if (racer.showLabel !== false) {
    const label = shouldTagRacerNames() && racer.playerIndex !== undefined ? `${racerTag(racer)} ${racer.name}` : racer.name;
    ctx.fillStyle = racer.color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.font = "800 18px system-ui";
    ctx.textAlign = "center";
    ctx.strokeText(label, screenX, labelY);
    ctx.fillText(label, screenX, labelY);
    if (racer.playerIndex !== undefined && !racer.ai && shouldTagRacerNames()) {
      const width = ctx.measureText(label).width;
      ctx.fillStyle = slotColor(racer.playerIndex);
      ctx.fillRect(screenX - width / 2, labelY + 4, width, 4);
    }
  }
  const activeLabels = [
    isMounted(racer) && !racer.grabbedBy && !(racer.horseType === "horse" && isAlwaysMountedTrack()) ? mountLabel(racer.horseType) : "",
    racer.speedBoostTimer > 0 ? stackLabel(pickupLook("boost").label, racer.speedBoostStacks.length) : "",
    racer.highJumpTimer > 0 ? stackLabel(racerJumpLabel(racer), racer.highJumpStacks.length) : "",
    racer.moonBootsTimer > 0 ? pickupLook("jump").label : "",
    racer.snowballs > 0 ? `${pickupLook("snowball").label} ${racer.snowballs}` : ""
  ].filter(Boolean);
  if (activeLabels.length > 0) {
    ctx.font = "800 13px system-ui";
    ctx.fillStyle = isMounted(racer) && !racer.grabbedBy ? "#9a6426"
      : racer.snowballs > 0 ? POWERUP_TEXT_COLORS.snowball
      : racer.speedBoostTimer > 0 ? POWERUP_TEXT_COLORS.boost
      : POWERUP_TEXT_COLORS.jump;
    const text = activeLabels.slice(0, 2).join(" + ");
    ctx.strokeText(text, screenX, labelY - 18);
    ctx.fillText(text, screenX, labelY - 18);
  }
  ctx.restore();
}

// Her cheer pose (the podium's, in her outfit), or null until it's loaded.
function getCheerImage(racer) {
  return (racer.outfit && window.DollOutfits?.getSync(racer.spriteKey, "cheer", racer.outfit)) || getPortraitImage(racer.spriteKey, "cheer");
}

// A gold star that pops up and turns slowly behind a cheering doll.
function drawCelebrationStar(racer, screenX, topY, scale) {
  const t = 1 - racer.celebrateTimer / CANDY_CELEBRATE_TIME;
  const grow = Math.min(1, t * 5) * (1 - Math.max(0, t - 0.8) * 5);
  const radius = 230 * scale * grow;
  if (radius <= 0) return;
  const cx = screenX;
  const cy = topY + 165 * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.9);
  ctx.fillStyle = "#ffd84a";
  ctx.strokeStyle = "#fff6c8";
  ctx.lineWidth = 5;
  ctx.shadowColor = "#ffe98a";
  ctx.shadowBlur = 24;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 ? radius * 0.45 : radius;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Draws the doll and remembers the frame for the speed after-images, which
// are drawn first, fading with age.
function actionFrameBox(racer, sx, sy, x, y, w, h) {
  const frame = window.ACTION_FRAMES?.[dollAssetKey(racer.spriteKey)]?.[sy / FRAME * 3 + sx / FRAME];
  if (!frame) return { x, y, w, h };
  const scale = w / FRAME;
  return {
    x: x + SPRITE_ANCHOR_X * scale + (frame.offsetX || 0) * scale - frame.anchorX * scale * frame.scale,
    y: y + frame.targetY * scale - frame.baseline * scale * frame.scale,
    w: w * frame.scale, h: h * frame.scale
  };
}

function drawRacerBody(racer, image, sx, sy, x, y, w, h, facing, screenX) {
  if (image === getActionSheet(racer)) ({ x, y, w, h } = actionFrameBox(racer, sx, sy, x, y, w, h));
  if (racer.ghosts?.length && racer.speedBoostTimer > 0) {
    racer.ghosts.forEach((ghost, i) => {
      const gx = ghost.x - state.camera;
      ctx.save();
      ctx.globalAlpha = 0.1 + 0.08 * i;
      drawFacingImage(ghost.image, ghost.sx, ghost.sy, FRAME, FRAME, gx + ghost.dx, ghost.y + ghost.dy - ghost.z, ghost.w, ghost.h, ghost.facing, gx);
      ctx.restore();
    });
  }
  if (isMounted(racer) && racer.horseType === "wings" && !racer.grabbedBy) drawFairyWings(racer, image, sx, sy, x, y, w, facing, screenX);
  drawFacingImage(image, sx, sy, FRAME, FRAME, x, y, w, h, facing, screenX);
  if (racer.moonBootsTimer > 0) drawMoonBoots(racer, image, sx, sy, x, y, w, facing, screenX);
  racer.lastBody = { image, sx, sy, dx: x - screenX, dy: y - (racer.y - racer.z), w, h, facing };
}

// Moon boots over her feet in this pose (feet.js, measured per frame by
// tools/dolls/measure_feet.py): the boot art once it's in (image-requests.md
// §23 MB1: side, three-quarter and front views), else boots drawn in code. Her sprites and
// actions poses get them, except the actions sheet's own moon-boots jump.
function drawMoonBoots(racer, image, sx, sy, x, y, w, facing, screenX) {
  const kind = image === getActionSheet(racer) ? "actions" : image === racer.sheet ? "sprites" : null;
  if (kind) drawMoonBootsOn(racer, kind, (sy / FRAME) * 3 + sx / FRAME, x, y, w, facing, screenX);
}

// Boots over the feet of frame `index` of her `kind` sheet, drawn at (x, y)
// w wide. Each boot's foot is centred on the foot's middle (feet.js cy) and
// turned to it, so it covers the foot whatever its angle.
function drawMoonBootsOn(racer, kind, index, x, y, w, facing, screenX) {
  const boots = moonBootPlacements(dollAssetKey(racer.spriteKey), kind, index);
  if (!boots.length) return;
  const scale = w / FRAME;
  const art = getSharedArt("moon_boot");
  ctx.save();
  if (facing < 0) {
    ctx.translate(screenX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-screenX, 0);
  }
  // The further foot (higher up the picture) first, so the nearer boot is in front of it.
  for (const boot of moonBootsFarToNear(boots)) {
    const bootW = boot.width * scale;
    const k = bootW / MOON_BOOT_CELL_WIDTHS[boot.cell];
    ctx.save();
    ctx.translate(x + boot.x * scale, y + boot.y * scale);
    ctx.rotate(boot.angle);
    if (boot.mirror) ctx.scale(-1, 1);
    // The boot's own foot middle, in its cell (sole at y 244), goes there.
    ctx.translate(0, MOON_BOOT_FOOT_MID * k);
    if (art) {
      const size = art.height;
      ctx.drawImage(art, boot.cell * size, 0, size, size, -128 * k, -244 * k, size * k, size * k);
    } else {
      drawMoonBootStandIn(bootW, MOON_BOOT_CELL_VIEWS[boot.cell]);
    }
    ctx.restore();
  }
  ctx.restore();
}

// (A boot the owner brought to the front in the verification queue has a
// higher `layer`.)
function moonBootsFarToNear(boots) {
  return boots.slice().sort((a, b) => (a.layer || 0) - (b.layer || 0) || a.y - b.y);
}

// Where each moon boot goes on frame `index` of a doll's `kind` sheet
// (frame px, facing right): { cell, x, y, angle, width, mirror, layer? }, with (x, y)
// the middle of the foot it covers (the boot turns about it), its angle in
// radians, and its width in frame px. From MOON_BOOT_OVERRIDES where the
// owner set it by hand (the workbench's verification queue), else worked
// out from the measured feet (feet.js).
function moonBootPlacements(assetKey, kind, index) {
  const set = window.MOON_BOOT_OVERRIDES?.[`${assetKey}/${kind}/${index}`];
  if (set) return set;
  const frame = window.DOLL_FEET?.[assetKey]?.[kind]?.[index];
  if (!frame) return [];
  return frame.map(foot => {
    const [fx, fy, size, , , , cy] = foot; // (feet.js also gives the turn in degrees)
    const pose = moonBootPose(kind, index, foot, frame);
    // The boot view the owner picked for this foot in the same pose on
    // other dolls wins (with the angle that view needed there).
    const learned = learnedMoonBootView(kind, index, frame.length, moonBootRole(foot, frame));
    const relearned = learned && (learned.cell !== pose.cell || learned.mirror !== pose.mirror);
    return {
      cell: learned ? learned.cell : pose.cell,
      x: fx,
      y: cy ?? fy,
      angle: relearned ? learned.angle : pose.angle,
      width: clamp(size, MOON_BOOT_FOOT_MIN, MOON_BOOT_FOOT_MAX) * MOON_BOOT_GROW * pose.size,
      mirror: learned ? learned.mirror : pose.mirror
    };
  });
}

// Which foot this is in a pose: the back one (further left, facing right),
// the front one, or the only one; and whether it's lifted (well above the
// other) or planted, so a lesson only carries over to a foot placed alike.
function moonBootRole(foot, feet) {
  if (feet.length !== 2) return "only";
  const other = feet.find(f => f !== foot) || foot;
  const side = foot[0] <= other[0] ? "back" : "front";
  return side + ((foot[6] ?? foot[1]) < (other[6] ?? other[1]) - MOON_BOOT_LIFTED ? "-lifted" : "");
}
const MOON_BOOT_LIFTED = 30; // px above the other foot that counts as lifted
const MOON_BOOT_LESSON_DOLLS = 2; // dolls placed by hand in a pose before their boot views carry over

// What the owner's hand-placed boots (MOON_BOOT_OVERRIDES) say about a pose
// on every doll: for each foot role, the boot view (cell and mirroring)
// picked most often, and the mean angle used with it. Null until at least
// MOON_BOOT_LESSON_DOLLS dolls have that pose placed by hand (one doll's
// pose can be unusual: Barbie's are), so the rules above hold till then.
let moonBootLessons = null;
function learnedMoonBootView(kind, index, count, role) {
  if (!moonBootLessons) {
    moonBootLessons = {};
    for (const [id, boots] of Object.entries(window.MOON_BOOT_OVERRIDES || {})) {
      const [, sheet, frame] = id.split("/");
      const sorted = boots.slice().sort((a, b) => a.x - b.x);
      sorted.forEach((boot, n) => {
        const other = sorted[1 - n];
        const r = boots.length !== 2 ? "only" : (n === 0 ? "back" : "front") + (boot.y < other.y - MOON_BOOT_LIFTED ? "-lifted" : "");
        const key = `${sheet}/${frame}/${boots.length}/${r}`;
        const view = `${boot.cell}${boot.mirror ? "m" : ""}`;
        const views = (moonBootLessons[key] ||= {});
        (views[view] ||= []).push(boot.angle);
      });
    }
  }
  const views = moonBootLessons[`${kind}/${index}/${count}/${role}`];
  if (!views || Object.values(views).reduce((n, angles) => n + angles.length, 0) < MOON_BOOT_LESSON_DOLLS) return null;
  const [view, angles] = Object.entries(views).sort((a, b) => b[1].length - a[1].length)[0];
  return { cell: parseInt(view, 10), mirror: view.endsWith("m"), angle: angles.reduce((s, a) => s + a, 0) / angles.length };
}

// The boot sheet's cells (image-requests.md §23 MB1, §26 MB2): side, three-
// quarter, front, back three-quarter, sole, pointed toe, inside side (toe
// left), with how wide each boot is in its cell, so every view covers the
// foot alike.
const MOON_BOOT_CELL_WIDTHS = [150, 130, 110, 150, 92, 120, 150];
const MOON_BOOT_CELL_VIEWS = ["side", "three", "front", "side", "front", "side", "side"]; // for the code-drawn stand-in

// The boot for this foot: its view (cell), angle (radians), whether it's
// mirrored, and a size share. The rules follow how the owner placed
// Barbie's boots by hand (the workbench's verification queue): standing,
// both feet three-quarter, splayed out (the back one mirrored) and a little
// smaller; running, a back foot kicked up turned well over, sole to the
// back; crouching and landing, toes a little down; in the air, both toes
// pointed (the back one more); riding, three-quarter and level; pushing,
// the back foot tipped further; knocked over, a gentler turn with the lower
// foot three-quarter. Otherwise the view and angle measured from the foot.
function moonBootPose(kind, index, foot, frame) {
  const [fx, fy, , angle, view] = foot;
  const measured = view === "front" ? 0 : angle * (view === "side" ? 1 : 0.6);
  const pose = { cell: view === "side" ? 0 : view === "three" ? 1 : 2, angle: measured, mirror: false, size: 1 };
  if (kind !== "sprites") return pose;
  const other = frame.find(f => f !== foot);
  const back = Boolean(other) && fx < other[0];
  const raisedBy = other ? other[1] - fy : 0; // px above the other foot
  const pointed = view === "side" && angle > 0.45;
  if (index <= 2) {
    // (A foot lifted behind her while she stands turns sole up.)
    return raisedBy > 40 ? { ...pose, cell: 1, angle: 1.6, size: 0.84 } : { ...pose, cell: 1, mirror: back, size: 0.84 };
  }
  if (index <= 5) {
    if (back && raisedBy > 12) return { ...pose, cell: pointed ? 5 : 1, angle: pointed ? 1.45 : 1.25 };
    if (back && view === "side") return { ...pose, cell: 6, mirror: true };
  }
  if (index === 6 || index === 8) return { ...pose, angle: Math.max(measured, 0.3) };
  if (index === 7) return { ...pose, cell: 5, angle: back ? 1.4 : 0.75 };
  if (index === 9) return { ...pose, cell: 1, angle: -0.05, size: 0.92 };
  if (index === 10) return back ? { ...pose, cell: 1, angle: measured + 0.4 } : { ...pose, angle: measured + 0.15 };
  if (index === 11) return { ...pose, cell: other && fy > other[1] ? 1 : 0, angle: Math.max(measured, -0.6), size: 0.9 };
  if (pointed) return { ...pose, cell: 5, angle: measured - 0.6 };
  return pose;
}

// A chunky white moon boot, its sole's bottom centre at the origin, toe right.
function drawMoonBootStandIn(bootW, view) {
  const front = view !== "side";
  const bw = bootW * (view === "side" ? 1 : view === "three" ? 0.85 : 0.72);
  const h = bootW * (view === "side" ? 1.05 : view === "three" ? 1.15 : 1.25);
  ctx.lineWidth = Math.max(1, bootW * 0.035);
  ctx.strokeStyle = "#a9adb8";
  ctx.fillStyle = "#f7f8fb";
  // Shaft (towards the heel in side view) and cuff.
  const shaftX = front ? -bw * 0.36 : -bw * 0.5;
  const shaftW = front ? bw * 0.72 : bw * 0.56;
  ctx.beginPath();
  ctx.roundRect(shaftX, -h, shaftW, h * 0.7, bw * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e9ebf1";
  ctx.beginPath();
  ctx.roundRect(shaftX - bw * 0.03, -h - bw * 0.04, shaftW + bw * 0.06, h * 0.16, bw * 0.08);
  ctx.fill();
  ctx.stroke();
  // Foot.
  ctx.fillStyle = "#f7f8fb";
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -h * 0.42, bw, h * 0.36, bw * 0.18);
  ctx.fill();
  ctx.stroke();
  // Grey sole.
  ctx.fillStyle = "#8f939e";
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -h * 0.1, bw, h * 0.1, bw * 0.05);
  ctx.fill();
}

// Stuck in a sticky puddle: the forward-leaning push frame, tipped further
// forward around the feet, which stay planted in the puddle.
const STUCK_LEAN = 0.5;

const STUCK_LEAN_IN_TIME = 0.22;

function drawStuckRacer(racer, screenX, scale) {
  const elapsed = OIL_SLIDE_DURATION - racer.oilTimer;
  const lean = STUCK_LEAN * smoothAmandaHazardProgress(elapsed / STUCK_LEAN_IN_TIME) * Math.min(1, racer.oilTimer / 0.18);
  const feetY = racer.y + 54 - racer.z;
  ctx.save();
  ctx.translate(screenX, feetY);
  ctx.rotate(lean * racer.facing);
  ctx.translate(-screenX, -feetY);
  drawFacingImage(racer.sheet, FRAME, 3 * FRAME, FRAME, FRAME,
    screenX - SPRITE_ANCHOR_X * scale, feetY - SPRITE_ANCHOR_Y * scale,
    FRAME * scale, FRAME * scale, racer.facing, screenX);
  ctx.restore();
}

function drawFacingImage(image, sx, sy, sw, sh, dx, dy, dw, dh, facing, anchorX) {
  if (facing < 0) {
    ctx.save();
    ctx.translate(anchorX, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, sx, sy, sw, sh, dx - anchorX, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}

// More than four racers (or two players on the same doll) and the doll name
// alone no longer identifies a player, so labels gain their P# tag.
function shouldTagRacerNames() {
  if (!state.running && !state.done) return false;
  if (state.racers.length > 4) return true;
  const names = state.racers.map(racer => racer.spriteKey);
  return new Set(names).size !== names.length;
}

function drawJoinFlash(racer, screenX, scale) {
  const t = racer.joinFlashTimer;
  ctx.save();
  ctx.globalAlpha = clamp(t / 0.6, 0, 1) * 0.85;
  ctx.strokeStyle = slotColor(racer.playerIndex);
  ctx.lineWidth = 6;
  const radius = (60 + (1.4 - t) * 90) * scale * 2;
  ctx.beginPath();
  ctx.ellipse(screenX, racer.y + 40, radius, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCenterText(text) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.strokeStyle = "rgba(23,33,38,0.2)";
  roundRect(W / 2 - 160, H / 2 - 34, 320, 68, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#172126";
  ctx.font = "800 28px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, W / 2, H / 2 + 10);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
