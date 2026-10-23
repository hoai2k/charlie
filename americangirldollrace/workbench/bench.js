// Workbench mode, loaded into the race's own page by workbench/index.html
// (after the game's scripts, sharing their global scope). It turns a race
// into a sandbox: one player (any doll, or any troll), any number of target
// characters who just stand there, and power-ups and mounts dropped in on
// request. Nothing here changes the game outside the workbench.
(function () {
  const TARGET_GAP = 260;
  const TROLL_GRAB_RANGE_X = 140;
  const TROLL_GRAB_RANGE_Y = 64;
  const TROLL_GRAB_TIMES = [0.24, 0.74, 1.02]; // grab, lift, throw, as the trolls do
  const MOUNT_TYPES = ["horse", "unicorn", "pegasus", "griffon", "broom", "pony", "reindeer", "rocking_horse", "carousel_horse", "moon_buggy", "skeleton_horse"];

  const bench = { player: { kind: "doll", key: "whirlpool" }, hurdles: false };

  // ---------- monsters of any kind on any track ----------
  // The game draws every monster with the track's own sheet; a monster with a
  // `kind` is drawn, updated and sounds as that kind instead.
  let kindOverride = null;
  const trackMonsterKey = window.getTrackMonsterKey;
  window.getTrackMonsterKey = function () {
    if (kindOverride) return kindOverride === "troll" || !images[kindOverride] ? null : kindOverride;
    return trackMonsterKey();
  };
  function asKind(monster, run) {
    const before = kindOverride;
    kindOverride = monster?.kind || before;
    try { return run(); } finally { kindOverride = before; }
  }
  const drawMonsterOriginal = window.drawMonster;
  window.drawMonster = monster => asKind(monster, () => drawMonsterOriginal(monster));
  for (const name of ["applyMonsterKnockback", "stunMonsterWithEmp"]) {
    const original = window[name];
    window[name] = (monster, ...rest) => asKind(monster, () => original(monster, ...rest));
  }
  const updateMonstersOriginal = window.updateMonsters;
  const updateMonsterBoltsOriginal = window.updateMonsterBolts;
  window.updateMonsters = function (dt) {
    // One at a time, each as its own kind (bolts move once a frame).
    const all = state.monsters;
    if (!all.some(monster => monster.kind)) return updateMonstersOriginal(dt);
    if (!all.length) return updateMonsterBoltsOriginal(dt);
    all.forEach((monster, i) => {
      state.monsters = [monster];
      if (i > 0) window.updateMonsterBolts = () => {};
      try { asKind(monster, () => updateMonstersOriginal(dt)); } finally { window.updateMonsterBolts = updateMonsterBoltsOriginal; }
    });
    state.monsters = all;
  };

  // Target monsters stand still (they still fall, get up, get beaten).
  const getMonsterTargetOriginal = window.getMonsterTarget;
  window.getMonsterTarget = monster => monster.dummy ? null : getMonsterTargetOriginal(monster);

  // Target racers stand still too.
  const aiInputOriginal = window.aiInput;
  window.aiInput = racer => racer.dummy
    ? { horizontal: 0, vertical: 0, jump: false, push: false }
    : aiInputOriginal(racer);

  function monsterImage(key) {
    if (key === "troll") return images.monster;
    loadArtOnce(key, monsterSheetUrl(key));
    return images[key] || null;
  }

  // ---------- a troll the player plays ----------
  // It's a racer (so power-ups and mounts all work) drawn with its troll
  // sheet. A doll-layout copy of the sheet stands in for the doll sheet where
  // the game draws the rider (mounts, broomstick): the troll stands on the
  // seat, as trolls ride in the race.
  function dollLayoutSheet(sheet) {
    const canvas = document.createElement("canvas");
    canvas.width = FRAME * 3;
    canvas.height = FRAME * 4;
    const c = canvas.getContext("2d");
    const cell = (fromRow, fromCol, toRow, toCol) => c.drawImage(sheet, fromCol * FRAME, fromRow * FRAME, FRAME, FRAME, toCol * FRAME, toRow * FRAME, FRAME, FRAME);
    for (let col = 0; col < 3; col += 1) {
      cell(0, col, 0, col); // idle
      cell(1, col, 1, col); // run
      cell(1, col, 2, col); // jump
    }
    cell(0, 0, 3, 0); // riding
    cell(2, 2, 3, 1); // push
    cell(3, 0, 3, 2); // fallen
    return canvas;
  }

  function trollGrabTarget(troll) {
    const near = list => list.filter(t => t !== troll && !t.grabbedBy && !t.finished
      && Math.abs(t.x - troll.x) < TROLL_GRAB_RANGE_X && Math.abs(t.y - troll.y) < TROLL_GRAB_RANGE_Y && (t.x - troll.x) * troll.facing > -20);
    const racers = near(state.racers);
    const monsters = near(state.monsters.filter(m => !["sleeping", "ground"].includes(m.state)));
    return [...racers, ...monsters].sort((a, b) => Math.abs(a.x - troll.x) - Math.abs(b.x - troll.x))[0] || null;
  }

  // X/push for a troll: grab whoever's in front, lift them and throw them.
  const performPushAttackOriginal = window.performPushAttack;
  window.performPushAttack = function (racer, ...rest) {
    if (!racer.monsterKey) return performPushAttackOriginal(racer, ...rest);
    if (racer.benchGrab || isMounted(racer)) return;
    const target = trollGrabTarget(racer);
    racer.benchGrab = { target, t: 0 };
    if (!target) return;
    target.grabbedBy = racer;
    if (state.monsters.includes(target)) { target.state = "fall"; target.timer = 99; target.target = null; }
    sfx("troll_grab", racer.x);
  };

  function updateTrollGrab(troll, dt) {
    const grab = troll.benchGrab;
    if (!grab) return;
    grab.t += dt;
    const target = grab.target;
    const [, liftEnd, throwEnd] = TROLL_GRAB_TIMES;
    if (target && target.grabbedBy === troll) {
      const lift = clamp((grab.t - TROLL_GRAB_TIMES[0]) / (liftEnd - TROLL_GRAB_TIMES[0]), 0, 1);
      target.x = troll.x + troll.facing * 70 * racerDepthScale(troll) / 0.45;
      target.y = troll.y;
      target.z = troll.z + 20 + lift * 90;
      target.vy = 0;
      if (!state.monsters.includes(target)) target.fallBackTimer = Math.max(target.fallBackTimer, 0.2);
    }
    if (grab.t < throwEnd) return;
    troll.benchGrab = null;
    if (!target || target.grabbedBy !== troll) return;
    target.grabbedBy = null;
    sfx("troll_throw", troll.x);
    if (state.monsters.includes(target)) {
      target.timer = 0;
      asKind(target, () => applyMonsterKnockback(target, troll.facing));
      target.knockbackX = troll.facing * MONSTER_THROW_FORCE;
      target.vy = 170;
      return;
    }
    target.z = 78;
    target.vy = 170;
    target.fallBackTimer = 0.85;
    target.fallBackFacing = -troll.facing;
    target.hitTimer = 0.35;
    target.knockbackX = troll.facing * MONSTER_THROW_FORCE;
    target.jumpStarted = false;
  }

  // A troll on foot is drawn from its own sheet (grab poses and all); riding,
  // the game draws it from the doll-layout copy.
  const drawRacerOriginal = window.drawRacer;
  window.drawRacer = function (racer) {
    if (!racer.monsterKey || (isMounted(racer) && !racer.grabbedBy)) return drawRacerOriginal(racer);
    const sheet = monsterImage(racer.monsterKey);
    if (!sheet) return drawRacerOriginal(racer);
    const def = window.MONSTERS?.[racer.monsterKey] || {};
    const grab = racer.benchGrab;
    const [grabEnd, liftEnd] = TROLL_GRAB_TIMES;
    const pose = grab ? [2, grab.t < grabEnd ? 0 : grab.t < liftEnd ? 1 : 2]
      : racer.grabbedBy || racer.fallBackTimer > 0 ? [3, 0]
      : isDrawnJumping(racer) ? [1, 1]
      : racer.moving ? [1, racer.frame] : [0, racer.frame];
    const rowScale = Array.isArray(def.rowScale?.[pose[0]]) ? def.rowScale[pose[0]][pose[1]] : def.rowScale?.[pose[0]] || 1;
    const scale = racerDepthScale(racer) * MONSTER_HEIGHT_SCALE * (def.scale || 1) * rowScale;
    const screenX = racer.x - state.camera;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#142027";
    ctx.beginPath();
    ctx.ellipse(screenX, racer.y + 42, 62 * scale, 15 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (racer.frozenTimer > 0 && !racer.empDizzy) drawElectricEffect(screenX, racer.y + 58 - SPRITE_ANCHOR_Y * scale - racer.z, FRAME * scale, FRAME * scale);
    const facing = racer.fallBackTimer > 0 && !grab ? racer.fallBackFacing : racer.facing;
    drawFacingImage(sheet, pose[1] * FRAME, pose[0] * FRAME, FRAME, FRAME,
      screenX - SPRITE_ANCHOR_X * scale, racer.y + 58 - SPRITE_ANCHOR_Y * scale - racer.z, FRAME * scale, FRAME * scale, facing, screenX);
    if (racer.frozenTimer > 0 && racer.empDizzy) drawDizzyStars(screenX, racer.y + 58 - racer.z - 330 * scale, scale * 0.8, Math.min(1, racer.frozenTimer * 3));
    ctx.save();
    ctx.font = "800 18px system-ui";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "white";
    ctx.fillStyle = racer.color;
    const labelY = racer.y + 58 - racer.z - 380 * scale;
    ctx.strokeText(racer.name, screenX, labelY);
    ctx.fillText(racer.name, screenX, labelY);
    ctx.restore();
  };

  // ---------- keep the sandbox going ----------
  const updateOriginal = window.update;
  window.update = function (dt) {
    updateOriginal(dt);
    for (const racer of state.racers) {
      if (racer.monsterKey) updateTrollGrab(racer, dt);
      // Nobody reaches the finish line, so the race never ends.
      racer.x = clamp(racer.x, 200, FINISH - 600);
      racer.finished = false;
    }
    state.stormTimer = Infinity;
    state.rewardTimer = Infinity;
  };

  // ---------- building the scene ----------
  function makeBenchRacer(spec, index, x, y, dummy) {
    if (spec.kind === "troll") {
      const sheet = monsterImage(spec.key);
      const racer = makeRacer(spec.name || "Troll", "whirlpool", sheet ? dollLayoutSheet(sheet) : images.whirlpool,
        index, x, y, dummy, "#4b5b2e", 475, DEFAULT_RIDER_Y_OFFSET, DEFAULT_RIDER_X_OFFSET);
      racer.monsterKey = spec.key;
      racer.dummy = dummy;
      return racer;
    }
    const character = characters[spec.key] || characters.whirlpool;
    const racer = makeRacer(character.name, character.spriteKey, character.image(), index, x, y, dummy,
      character.color, 475, character.riderYOffset, character.riderXOffset);
    racer.dummy = dummy;
    return racer;
  }

  function player() {
    return state.racers.find(racer => !racer.dummy);
  }

  // Start (or restart) the sandbox on a track with the chosen player.
  // Where the sandbox starts: well past MONSTER_COURSE_START_X, the first
  // place monsters may stand on this track.
  const startX = () => MONSTER_COURSE_START_X + 1500;

  function setup(trackKey) {
    if (trackKey) setBackground(trackKey);
    const BENCH_START_X = startX();
    startRace("one");
    state.racers = [];
    state.powerups = [];
    state.monsters = [];
    state.obstacles = bench.hurdles ? state.obstacles.filter(o => o.x > BENCH_START_X + 300 && o.x < BENCH_START_X + 3000) : [];
    state.beachBalls = [];
    state.stormTimer = Infinity;
    state.rewardTimer = Infinity;
    state.racers.push(makeBenchRacer(bench.player, 0, BENCH_START_X, PATH_TOP + 90, false));
    state.camera = BENCH_START_X - 400;
  }

  // Swap who the player is, keeping where she stands.
  function setPlayer(spec) {
    bench.player = spec;
    const old = player();
    const racer = makeBenchRacer(spec, 0, old?.x ?? startX(), old?.y ?? PATH_TOP + 90, false);
    racer.facing = old?.facing || 1;
    state.racers = [racer, ...state.racers.filter(r => r !== old)];
  }

  // A character who stands there to be hit: a doll, or a monster of any kind.
  function addTarget(spec) {
    const me = player();
    const count = state.racers.filter(r => r.dummy).length + state.monsters.length;
    const x = me.x + me.facing * TARGET_GAP * (1 + count * 0.6);
    const y = clamp(me.y + ((count % 3) - 1) * 40, TRACK_TOP, TRACK_BOTTOM);
    if (spec.kind === "troll") {
      monsterImage(spec.key);
      const monster = spawnMonster(x, y, { active: true, riding: false });
      Object.assign(monster, { x, y, riding: false, state: "idle", dummy: true, kind: spec.key, facing: -me.facing });
      state.monsters.push(monster);
      return;
    }
    const racer = makeBenchRacer(spec, state.racers.length, x, y, true);
    racer.facing = -me.facing;
    state.racers.push(racer);
  }

  function clearTargets() {
    state.racers = state.racers.filter(r => !r.dummy);
    state.monsters = [];
    state.amandaAlly = null;
  }

  // Drop a power-up (or a mount) from the sky just ahead of the player.
  function drop(kind) {
    const me = player();
    if (!me) return;
    const x = me.x + me.facing * 220;
    const groundY = me.y + 54;
    const type = kind === "pogo" || kind === "spring" ? "jump" : MOUNT_TYPES.includes(kind) ? "horse" : kind;
    const powerup = makePowerup(type, x, groundY, { dropDuration: 0.6, dropStartY: groundY - 420 });
    if (type === "horse") {
      powerup.horseType = kind;
      if (kind === "skeleton_horse") getSharedArt("skeleton_horse");
    }
    if (type === "jump") powerup.pogo = kind === "pogo";
    state.powerups.push(powerup);
  }

  function setHurdles(on) {
    bench.hurdles = on;
  }

  // ---------- dragging in the scene ----------
  // A point in the frame's window (client px) as a world point, or null
  // outside the scene.
  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const cx = (clientX - rect.left) * canvas.width / rect.width;
    const cy = (clientY - rect.top) * canvas.height / rect.height;
    return { x: state.camera + cx / state.cameraZoom, y: H + (cy - H) / state.cameraZoom };
  }

  // Whatever is under a world point: a power-up first, then anyone.
  function pickAt(x, y) {
    const powerup = state.powerups.find(q => !q.taken && Math.abs(q.x - x) < 42 && Math.abs(q.y - 30 - y) < 48);
    if (powerup) return powerup;
    const racer = state.racers.find(r => Math.abs(r.x - x) < 48 && y > r.y - 120 - r.z && y < r.y + 64 - r.z);
    if (racer) return racer;
    return state.monsters.find(m => Math.abs(m.x - x) < 75 && y > m.y - 190 && y < m.y + 64) || null;
  }

  // Put something where the pointer is (its feet on that point).
  function moveTo(thing, x, y) {
    if (state.powerups.includes(thing)) {
      thing.x = x;
      thing.y = clamp(y, TRACK_TOP + 54, TRACK_BOTTOM + 54);
      return;
    }
    thing.x = x;
    thing.y = clamp(y - 54, TRACK_TOP, TRACK_BOTTOM);
    thing.z = 0;
    thing.vy = 0;
    thing.knockbackX = 0;
  }

  // Dragged out of the scene: gone (except the player).
  function remove(thing) {
    state.powerups = state.powerups.filter(q => q !== thing);
    state.monsters = state.monsters.filter(m => m !== thing);
    if (thing.dummy) state.racers = state.racers.filter(r => r !== thing);
  }

  function addTargetAt(spec, x, y) {
    addTarget(spec);
    const added = spec.kind === "troll" ? state.monsters.at(-1) : state.racers.at(-1);
    moveTo(added, x, y);
    added.facing = player() && player().x > x ? 1 : -1;
  }

  function dropAt(kind, x, y) {
    drop(kind);
    const powerup = state.powerups.at(-1);
    moveTo(powerup, x, y);
    powerup.dropStartY = powerup.y - 420;
  }

  // Once every image is in (the game resets the race then), call back.
  function whenReady(callback) {
    const poll = () => (assetsReady ? setTimeout(callback, 200) : setTimeout(poll, 100));
    poll();
  }

  // The panels outside read the game's own tables through here (its
  // top-level consts aren't properties of window).
  window.Bench = {
    setup, whenReady, setPlayer, addTarget, addTargetAt, dropAt, screenToWorld, pickAt, moveTo, remove, clearTargets, drop, setHurdles, monsterImage, MOUNT_TYPES,
    characters, images, BACKGROUNDS, FRAME, POWERUP_ICON_RECTS, TRACK_POWERUP_CELL
  };
})();
