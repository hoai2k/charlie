// Sound effects, voices, loops and music for the race.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

function sfx(key, worldX, options = {}) {
  return GameAudio.play(key, { worldX, ...options });
}

function racerVoice(racer, event, options = {}) {
  if (!racer) return null;
  return GameAudio.voice(racer.spriteKey, event, { worldX: racer.x, ...options });
}

function racerLoopId(racer, name) {
  return `${name}:${racer.playerIndex}`;
}

function updateAudioListener() {
  const ranges = getActiveWorldViewRanges();
  if (ranges.length === 0) return;
  GameAudio.setListener(
    Math.min(...ranges.map(range => range.left)),
    Math.max(...ranges.map(range => range.right))
  );
}

function mountLoopKey(racer) {
  if (racer.horseType === "broom") return racer.z > 8 ? "pegasus_glide_loop" : null;
  if (isFlyingMountType(racer.horseType)) {
    if (racer.pegasusGliding) return "pegasus_glide_loop";
    return racer.z > 8 ? "pegasus_flight_loop" : "horse_canter_loop";
  }
  if (racer.horseType === "unicorn") return "unicorn_gallop_loop";
  return "horse_gallop_loop";
}

function updateRacerAudio(racer, dt) {
  const mountId = racerLoopId(racer, "mount");
  const oilId = racerLoopId(racer, "oil");
  const frozenId = racerLoopId(racer, "frozen");
  const skateId = racerLoopId(racer, "skate");
  const surfId = racerLoopId(racer, "surf");

  if (racer.finished || racer.grabbedBy) {
    GameAudio.stopLoop(mountId);
    GameAudio.stopLoop(oilId);
    GameAudio.stopLoop(frozenId);
    GameAudio.stopLoop(skateId);
    GameAudio.stopLoop(surfId);
    return;
  }
  if (racer.surfTimer > 0 && !isMounted(racer)) GameAudio.startLoop(surfId, "surf_loop", { gain: racerAudioGain(racer) * 0.8 });
  else GameAudio.stopLoop(surfId);

  const skating = racer.rideToys?.[0]?.type === "skates" && racer.moving && racer.z === 0 && getRideToyPose(racer, false);
  if (skating) GameAudio.startLoop(skateId, "skate_roll_loop", { gain: racerAudioGain(racer) * 0.7 });
  else GameAudio.stopLoop(skateId);

  if (isMounted(racer) && mountLoopKey(racer) && (Math.abs(racer.speed) > 20 || racer.pegasusGliding)) {
    GameAudio.startLoop(mountId, mountLoopKey(racer), { gain: racerAudioGain(racer) });
  } else {
    GameAudio.stopLoop(mountId);
  }

  if (racer.oilTimer > 0 && !racer.oilSticky) GameAudio.startLoop(oilId, "oil_slide_loop", { gain: racerAudioGain(racer) });
  else GameAudio.stopLoop(oilId);

  if (racer.frozenTimer > 0 && !racer.empDizzy) GameAudio.startLoop(frozenId, "frozen_loop", { gain: racerAudioGain(racer) });
  else GameAudio.stopLoop(frozenId);

}

function racerAudioGain(racer) {
  return racer.ai ? 0.75 : 1;
}

function updateMonsterAudio(dt) {
  let sleepers = 0;
  let nearestSleeper = null;
  for (const monster of state.monsters) {
    const previous = monster.audioState;
    monster.audioState = monster.state;

    if (monster.state === "sleeping") {
      sleepers += 1;
      if (nearestSleeper === null || Math.abs(monster.x) < Math.abs(nearestSleeper)) nearestSleeper = monster.x;
      // A yawn as it gives up and settles down, before the snoring loop starts.
      if (previous !== "sleeping") sfx(monsterSfx("troll_wake"), monster.x, { rate: 0.9 });
      continue;
    }
    if (!monster.active || !isMonsterVisible(monster)) continue;

    if (previous !== monster.state) {
      if (monster.state === "grab") sfx(monsterSfx("troll_grab"), monster.x);
      else if (monster.state === "lift") sfx(monsterSfx("troll_lift"), monster.x);
      else if (monster.state === "throw") {
        sfx(monsterSfx("troll_throw"), monster.x);
        sfx("crowd_ooh", monster.x, { gain: 0.7 });
      } else if (monster.state === "fall") {
        sfx(monsterSfx("troll_hit"), monster.x);
        sfx(monsterSfx("troll_fall"), monster.x, { gain: 0.85 });
      } else if (monster.state === "walk" && previous === "idle") {
        sfx(monsterSfx("troll_notice"), monster.x);
      } else if (monster.state === "drop") {
        sfx("storm_monster_drop", monster.x);
      }
    }

    if (monster.state === "walk") {
      monster.audioStepTimer = (monster.audioStepTimer || 0) + dt;
      if (monster.audioStepTimer >= 0.36) {
        monster.audioStepTimer = 0;
        sfx(monsterSfx("troll_walk_step"), monster.x, { throttleKey: "any", rate: 0.92 + Math.random() * 0.14 });
      }
      monster.audioGruntTimer = (monster.audioGruntTimer || Math.random() * 6) + dt;
      if (monster.audioGruntTimer >= 5.5) {
        monster.audioGruntTimer = 0;
        sfx(monsterSfx("troll_idle_grunt"), monster.x, { gain: 0.8 });
      }
    }
  }

  const sleepLoop = monsterSfx("troll_sleep_loop");
  if (sleepers > 0 && nearestSleeper !== null && sleepLoop) {
    GameAudio.startLoop("troll-sleep", sleepLoop, { gain: Math.min(1, 0.5 + sleepers * 0.2) });
  } else {
    GameAudio.stopLoop("troll-sleep");
  }
}

function updateCloudAudio(dt) {
  const cloud = state.stormCloud;
  if (cloud) {
    GameAudio.startLoop("storm", "storm_cloud_loop", { gain: 0.9 });
    if (!cloud.audioArrived) {
      cloud.audioArrived = true;
      sfx("storm_cloud_arrive", cloud.x);
    }
    cloud.audioLightningTimer = (cloud.audioLightningTimer || 1.2) - dt;
    if (cloud.audioLightningTimer <= 0) {
      cloud.audioLightningTimer = 1.8 + Math.random() * 2.4;
      sfx("storm_lightning", cloud.x, { gain: 0.8 });
    }
  } else {
    GameAudio.stopLoop("storm");
  }

  const reward = state.rewardCloud;
  if (reward && !reward.audioArrived) {
    reward.audioArrived = true;
    sfx("reward_cloud_arrive", reward.x);
  }
}

function stopGameplayAudioLoops() {
  GameAudio.stopLoopsMatching("mount:");
  GameAudio.stopLoopsMatching("oil:");
  GameAudio.stopLoopsMatching("frozen:");
  GameAudio.stopLoop("troll-sleep");
  GameAudio.stopLoop("storm");
}

function updateAudio(dt) {
  GameAudio.tick();
  updateAudioListener();
  if (!state.running || state.paused || state.done) {
    stopGameplayAudioLoops();
    return;
  }
  for (const racer of state.racers) updateRacerAudio(racer, dt);
  updateMonsterAudio(dt);
  updateCloudAudio(dt);
}

// Fired the moment a pickup is claimed. The oil and horse cases finish inside
// applyPowerup, once it knows whether the oil was blocked and which mount rolled.
function playPowerupAudio(racer, type, powerup = null) {
  if (type === "oil" || type === "horse") return;
  sfx("powerup_pickup_generic", racer.x);
  const sound = pickupLook(type, { pogo: Boolean(powerup?.pogo) }).sound;
  if (sound) sfx(sound, racer.x);
  racerVoice(racer, "pickup", { chance: 0.3 });
}

const THEMED_MOUNT_SOUNDS = {
  pony: "mount_pony",
  reindeer: "mount_reindeer",
  rocking_horse: "mount_rocking_horse",
  carousel_horse: "mount_carousel"
};

function playMountAudio(racer) {
  sfx("powerup_horse_pickup", racer.x);
  sfx("horse_mount", racer.x, { gain: 0.8 });
  if (racer.horseType === "unicorn") sfx("unicorn_appear", racer.x);
  else if (racer.horseType === "broom") sfx("powerup_pickup_generic", racer.x);
  else if (isFlyingMountType(racer.horseType)) sfx("pegasus_wing_flap", racer.x);
  else sfx(THEMED_MOUNT_SOUNDS[racer.horseType] || "horse_whinny", racer.x);
  racerVoice(racer, "mount", { chance: 0.6, priority: 1 });
}

function playVictoryAudio(winner) {
  // Deliberately not positional: the finish flourish is a UI moment, and the
  // camera can still be some way behind the winner when they cross.
  GameAudio.play("finish_line_cross");
  GameAudio.play("crowd_cheer_short");
  setTimeout(() => GameAudio.play("victory_fanfare"), 260);
  GameAudio.voice(winner.spriteKey, "victory", { priority: 2 });
  for (const racer of state.racers) {
    if (racer === winner) continue;
    setTimeout(() => GameAudio.voice(racer.spriteKey, "defeat", { chance: 0.5 }), 900 + Math.random() * 1200);
  }
  for (let index = 0; index < VICTORY_FIREWORK_COUNT; index += 1) {
    const delay = 500 + index * 320 + Math.random() * 200;
    setTimeout(() => {
      GameAudio.play("firework_launch");
      setTimeout(() => GameAudio.play("firework_burst"), 420 + Math.random() * 200);
    }, delay);
  }
}

function startMusic(options = {}) {
  stopMusicTransitions();
  const desiredTrack = getCurrentBackground().music;
  if (nextMusic.getAttribute("src") === desiredTrack) {
    const previousMusic = music;
    music = nextMusic;
    nextMusic = previousMusic;
    nextMusic.pause();
    setMusicGain(nextMusic, 0);
  }
  syncBackgroundMusic();
  if (options.fadeInMs > 0) {
    fadeMusicGain(music, 1, options.fadeInMs);
  } else {
    setMusicGain(music, 1);
  }
  music.play().catch(() => {
    // Browsers may block audio until a trusted gesture; the next race click will try again.
  });
}

function syncBackgroundMusic() {
  const track = getCurrentBackground().music;
  if (!track || music.getAttribute("src") === track) return;
  cancelMusicFade(music);
  music.pause();
  music.setAttribute("src", track);
  music.load();
}

function setMusicGain(element, gain) {
  const clampedGain = clamp(gain, 0, 1);
  musicGains.set(element, clampedGain);
  GameAudio.setMusicGain(element, clampedGain);
}

function cancelMusicFade(element) {
  musicFadeTokens.set(element, (musicFadeTokens.get(element) || 0) + 1);
}

function fadeMusicGain(element, targetGain, durationMs, onComplete = null) {
  cancelMusicFade(element);
  const token = musicFadeTokens.get(element);
  const startGain = musicGains.get(element) ?? 1;
  const startTime = performance.now();
  if (durationMs <= 0) {
    setMusicGain(element, targetGain);
    onComplete?.();
    return;
  }
  const step = time => {
    if (musicFadeTokens.get(element) !== token) return;
    const progress = clamp((time - startTime) / durationMs, 0, 1);
    setMusicGain(element, startGain + (targetGain - startGain) * progress);
    if (progress < 1) requestAnimationFrame(step);
    else onComplete?.();
  };
  requestAnimationFrame(step);
}

function stopMusicTransitions() {
  if (nextTrackCrossfadeTimer !== null) {
    clearTimeout(nextTrackCrossfadeTimer);
    nextTrackCrossfadeTimer = null;
  }
  cancelMusicFade(music);
  cancelMusicFade(nextMusic);
}

function beginBoardEndMusic(nextBackground) {
  fadeMusicGain(music, CELEBRATION_MUSIC_GAIN, CELEBRATION_MUSIC_FADE_MS);
  nextTrackCrossfadeTimer = setTimeout(() => {
    nextTrackCrossfadeTimer = null;
    const nextTrack = nextBackground.music;
    nextMusic.pause();
    if (nextMusic.getAttribute("src") !== nextTrack) {
      nextMusic.setAttribute("src", nextTrack);
      nextMusic.load();
    }
    nextMusic.currentTime = 0;
    setMusicGain(nextMusic, 0);
    nextMusic.play().catch(() => {});
    const outgoingMusic = music;
    fadeMusicGain(outgoingMusic, 0, NEXT_TRACK_CROSSFADE_MS, () => outgoingMusic.pause());
    fadeMusicGain(nextMusic, NEXT_TRACK_PREVIEW_GAIN, NEXT_TRACK_CROSSFADE_MS);
  }, NEXT_TRACK_CROSSFADE_DELAY_MS);
}
