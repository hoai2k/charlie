/*
 * American Girl Doll Race — audio engine.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  User-facing volume controls live in config.js. Everything here is machinery.
 * ─────────────────────────────────────────────────────────────────────────────
 * Volumes multiply together:
 * final = master * bus * logical-sound trim * file scale * play-call gain.
 * Changes take effect on the next sound; loops and music update immediately.
 *
 * You can also override any of these at runtime without editing the file:
 *     GameAudio.setVolume("sfx", 0.4)      // remembered in localStorage
 *     GameAudio.setVolume("voice", 1.0)
 *     GameAudio.resetVolumes()             // forget overrides, use the values here
 */
const AUDIO_CONFIG = {
  masterVolume: 1.0,
  sfxVolume: 0.25,
  voiceVolume: 1.0,
  musicVolume: 0.7,
  soundFileVolumes: {},
  ...(window.GAME_CONFIG?.audio || {}),

  // Music dips to this fraction of musicVolume while a voice line is playing.
  musicDuckWhileVoice: 0.55,
  musicDuckReleaseMs: 400,

  // Minimum gap, in seconds, between two voice lines from the same racer, so a
  // pile-up at a hurdle doesn't turn into a shouting match.
  voiceMinGap: 1.2,
  // Minimum gap between voice lines from anyone at all.
  voiceGlobalMinGap: 0.35,

  // Hard cap on simultaneously playing one-shots. Oldest gets recycled.
  maxConcurrentSfx: 24,

  // Sounds further than this many world pixels outside the visible camera
  // range are silent; between 0 and this they fade out.
  spatialFalloffPx: 900,

  // Per-sound volume trims, applied on top of the bus volume. Anything not
  // listed plays at 1.0. Use this to tame or lift individual effects.
  trim: {
    horse_hoof_single: 0.45,
    troll_walk_step: 0.5,
    troll_sleep_loop: 0.45,
    troll_idle_grunt: 0.6,
    push_whoosh: 0.45,
    powerup_spawn_twinkle: 0.3,
    oil_slide_loop: 0.6,
    frozen_loop: 0.5,
    pegasus_glide_loop: 0.55,
    pegasus_flight_loop: 0.55,
    horse_gallop_loop: 0.6,
    unicorn_gallop_loop: 0.6,
    storm_cloud_loop: 0.5,
    ui_click: 0.6,
    victory_fanfare: 0.9,
    firework_burst: 0.7,
    firework_launch: 0.5,
    crowd_cheer_short: 0.6,
    crowd_ooh: 0.5
  },

  // Throttles for effects that could otherwise fire every frame.
  minInterval: {
    horse_hoof_single: 0.17,
    troll_walk_step: 0.34,
    push_impact: 0.08,
    hurdle_clip: 0.2,
    troll_hit: 0.1
  },

  // Set true to log every play() call and every missing asset to the console.
  debug: false
};

/* ─────────────────────────────────────────────────────────────────────────── */

const GameAudio = (() => {
  const BUSES = ["sfx", "voice", "music"];
  const STORAGE_KEY = "agdr-audio-volumes";
  const SFX_DIR = "assets/audio/sfx";
  const POOL_PER_VARIANT = 3;

  let manifest = { sfx: {}, vo: {} };
  let unlocked = false;
  let muted = false;
  const musicTracks = new Map(); // HTMLAudioElement -> { gain }
  let duckUntil = 0;
  let listener = { left: -Infinity, right: Infinity };

  const pools = new Map();      // "sfx:key_01" -> [HTMLAudioElement]
  const loops = new Map();      // loop id -> { el, key, bus, gain }
  const lastPlayed = new Map(); // throttle key -> timestamp (seconds)
  const lastVariant = new Map();
  const active = [];            // recently started one-shots, for the cap
  const missing = new Set();

  let lastVoiceAt = 0;
  const lastVoiceBySpeaker = new Map();

  const now = () => performance.now() / 1000;

  /* ---- config ---------------------------------------------------------- */

  function loadOverrides() {
    try {
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      for (const bus of BUSES) {
        const value = saved[`${bus}Volume`];
        if (typeof value === "number") AUDIO_CONFIG[`${bus}Volume`] = value;
      }
      if (typeof saved.masterVolume === "number") AUDIO_CONFIG.masterVolume = saved.masterVolume;
    } catch (error) {
      /* localStorage can be unavailable; the defaults above are fine. */
    }
  }

  function saveOverrides() {
    try {
      const saved = { masterVolume: AUDIO_CONFIG.masterVolume };
      for (const bus of BUSES) saved[`${bus}Volume`] = AUDIO_CONFIG[`${bus}Volume`];
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (error) {
      /* not fatal */
    }
  }

  function busVolume(bus) {
    const key = `${bus}Volume`;
    const value = AUDIO_CONFIG[key];
    return typeof value === "number" ? value : 1;
  }

  function soundFileVolume(file) {
    const value = AUDIO_CONFIG.soundFileVolumes?.[file];
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 1;
  }

  function musicFileKey(element) {
    const src = element?.getAttribute?.("src") || "";
    const marker = "assets/music/";
    const index = src.indexOf(marker);
    return index >= 0 ? `music/${src.slice(index + marker.length)}` : "";
  }

  function setVolume(bus, value) {
    const clamped = Math.max(0, Math.min(1, Number(value) || 0));
    if (bus === "master") AUDIO_CONFIG.masterVolume = clamped;
    else if (BUSES.includes(bus)) AUDIO_CONFIG[`${bus}Volume`] = clamped;
    else return;
    saveOverrides();
    refreshLiveVolumes();
    return clamped;
  }

  function resetVolumes() {
    try {
      window.localStorage?.removeItem(STORAGE_KEY);
    } catch (error) {
      /* not fatal */
    }
    window.location.reload();
  }

  function refreshLiveVolumes() {
    for (const loop of loops.values()) {
      loop.el.volume = clamp01(AUDIO_CONFIG.masterVolume * busVolume(loop.bus) * loop.gain);
    }
    updateMusicVolume();
  }

  const clamp01 = value => Math.max(0, Math.min(1, value));

  /* ---- manifest -------------------------------------------------------- */

  function setManifest(data) {
    if (!data) return;
    manifest = { sfx: data.sfx || {}, vo: data.vo || {} };
  }

  async function loadManifest() {
    if (window.AUDIO_MANIFEST) {
      setManifest(window.AUDIO_MANIFEST);
      return;
    }
    try {
      const response = await fetch("assets/audio/manifest.json", { cache: "no-cache" });
      if (response.ok) setManifest(await response.json());
    } catch (error) {
      // Opened straight off the filesystem with no manifest.js? Stay silent
      // rather than throwing 404s for every sound.
      if (AUDIO_CONFIG.debug) console.warn("audio manifest unavailable", error);
    }
  }

  /* ---- element pooling ------------------------------------------------- */

  function variantsFor(key) {
    return manifest.sfx[key] || null;
  }

  function pickVariant(key, list) {
    if (list.length === 1) return list[0];
    const previous = lastVariant.get(key);
    let choice = list[Math.floor(Math.random() * list.length)];
    if (choice === previous) choice = list[(list.indexOf(choice) + 1) % list.length];
    lastVariant.set(key, choice);
    return choice;
  }

  function poolFor(src) {
    let pool = pools.get(src);
    if (!pool) {
      pool = [];
      pools.set(src, pool);
    }
    return pool;
  }

  function acquire(src) {
    const pool = poolFor(src);
    for (const el of pool) {
      if (el.paused || el.ended) return el;
    }
    if (pool.length < POOL_PER_VARIANT) {
      const el = new Audio(src);
      el.preload = "auto";
      pool.push(el);
      return el;
    }
    // All busy: steal the one that started earliest.
    return pool.reduce((oldest, el) => (el.currentTime > oldest.currentTime ? el : oldest), pool[0]);
  }

  function reapActive() {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].paused || active[i].ended) active.splice(i, 1);
    }
    while (active.length >= AUDIO_CONFIG.maxConcurrentSfx) {
      const el = active.shift();
      try {
        el.pause();
        el.currentTime = 0;
      } catch (error) {
        /* ignore */
      }
    }
  }

  /* ---- spatial --------------------------------------------------------- */

  function setListener(left, right) {
    listener = { left, right };
  }

  function spatialGain(worldX) {
    if (typeof worldX !== "number" || !Number.isFinite(listener.left)) return 1;
    const falloff = Math.max(1, AUDIO_CONFIG.spatialFalloffPx);
    if (worldX >= listener.left && worldX <= listener.right) return 1;
    const distance = worldX < listener.left ? listener.left - worldX : worldX - listener.right;
    return clamp01(1 - distance / falloff);
  }

  /* ---- playback -------------------------------------------------------- */

  function play(key, options = {}) {
    if (!unlocked || muted) return null;
    const bus = options.bus || "sfx";
    const list = variantsFor(key);
    if (!list || list.length === 0) {
      if (AUDIO_CONFIG.debug && !missing.has(key)) {
        missing.add(key);
        console.warn(`[audio] no asset for "${key}"`);
      }
      return null;
    }

    const throttle = AUDIO_CONFIG.minInterval[key];
    const time = now();
    if (throttle) {
      const throttleKey = options.throttleKey ? `${key}:${options.throttleKey}` : key;
      if (time - (lastPlayed.get(throttleKey) || -Infinity) < throttle) return null;
      lastPlayed.set(throttleKey, time);
    }

    const spatial = spatialGain(options.worldX);
    if (spatial <= 0.02) return null;

    const variant = pickVariant(key, list);
    const file = `sfx/${key}_${String(variant).padStart(2, "0")}.mp3`;
    const trim = (AUDIO_CONFIG.trim[key] ?? 1) * soundFileVolume(file);
    const volume = clamp01(
      AUDIO_CONFIG.masterVolume * busVolume(bus) * trim * (options.gain ?? 1) * spatial
    );
    if (volume <= 0.001) return null;

    reapActive();
    const src = `${SFX_DIR}/${file.slice(4)}`;
    const el = acquire(src);
    el.loop = false;
    el.volume = volume;
    el.playbackRate = options.rate ?? 1;
    try {
      el.currentTime = 0;
    } catch (error) {
      /* Safari occasionally refuses before metadata loads. */
    }
    const promise = el.play();
    if (promise?.catch) promise.catch(() => {});
    active.push(el);
    if (AUDIO_CONFIG.debug) console.log(`[audio] ${key} @ ${volume.toFixed(2)}`);
    return el;
  }

  /* ---- voice ----------------------------------------------------------- */

  function voice(character, event, options = {}) {
    if (!unlocked || muted) return null;
    const events = manifest.vo[character];
    const list = events && events[event];
    if (!list || list.length === 0) {
      if (AUDIO_CONFIG.debug && !missing.has(`${character}/${event}`)) {
        missing.add(`${character}/${event}`);
        console.warn(`[audio] no voice line for ${character}/${event}`);
      }
      return null;
    }

    const time = now();
    const priority = options.priority ?? 0;
    if (priority < 2) {
      if (time - lastVoiceAt < AUDIO_CONFIG.voiceGlobalMinGap) return null;
      if (time - (lastVoiceBySpeaker.get(character) || -Infinity) < AUDIO_CONFIG.voiceMinGap) return null;
    }
    if (typeof options.chance === "number" && Math.random() > options.chance) return null;

    const spatial = spatialGain(options.worldX);
    if (spatial <= 0.05) return null;

    const variantKey = `${character}/${event}`;
    const variant = pickVariant(variantKey, list);
    const file = `vo/${character}/${event}_${String(variant).padStart(2, "0")}.mp3`;
    const src = `assets/audio/${file}`;
    const el = acquire(src);
    el.loop = false;
    el.volume = clamp01(
      AUDIO_CONFIG.masterVolume * busVolume("voice") * soundFileVolume(file) *
        (options.gain ?? 1) * spatial
    );
    try {
      el.currentTime = 0;
    } catch (error) {
      /* ignore */
    }
    const promise = el.play();
    if (promise?.catch) promise.catch(() => {});
    lastVoiceAt = time;
    lastVoiceBySpeaker.set(character, time);
    duckMusic((el.duration || 1.2) * 1000);
    return el;
  }

  /* ---- loops ----------------------------------------------------------- */

  function startLoop(id, key, options = {}) {
    if (!unlocked || muted) return null;
    const bus = options.bus || "sfx";
    const existing = loops.get(id);
    if (existing && existing.key === key) {
      existing.bus = bus;
      existing.baseGain = options.gain ?? existing.baseGain;
      existing.gain = existing.trim * existing.fileScale * existing.baseGain;
      existing.el.volume = clamp01(AUDIO_CONFIG.masterVolume * busVolume(bus) * existing.gain);
      return existing.el;
    }
    if (existing) stopLoop(id);

    const list = variantsFor(key);
    if (!list || list.length === 0) return null;
    const variant = list[0];
    const file = `sfx/${key}_${String(variant).padStart(2, "0")}.mp3`;
    const src = `${SFX_DIR}/${file.slice(4)}`;
    const el = new Audio(src);
    el.loop = true;
    el.preload = "auto";
    const trim = AUDIO_CONFIG.trim[key] ?? 1;
    const fileScale = soundFileVolume(file);
    const baseGain = options.gain ?? 1;
    const gain = trim * fileScale * baseGain;
    el.volume = clamp01(AUDIO_CONFIG.masterVolume * busVolume(bus) * gain);
    const promise = el.play();
    if (promise?.catch) promise.catch(() => {});
    loops.set(id, { el, key, bus, gain, trim, fileScale, baseGain });
    return el;
  }

  function setLoopGain(id, gain) {
    const loop = loops.get(id);
    if (!loop) return;
    loop.baseGain = gain;
    loop.gain = loop.trim * loop.fileScale * gain;
    loop.el.volume = clamp01(AUDIO_CONFIG.masterVolume * busVolume(loop.bus) * loop.gain);
  }

  function stopLoop(id) {
    const loop = loops.get(id);
    if (!loop) return;
    try {
      loop.el.pause();
      loop.el.currentTime = 0;
    } catch (error) {
      /* ignore */
    }
    loops.delete(id);
  }

  function stopLoopsMatching(prefix) {
    for (const id of [...loops.keys()]) {
      if (id.startsWith(prefix)) stopLoop(id);
    }
  }

  function stopAll() {
    for (const id of [...loops.keys()]) stopLoop(id);
    for (const el of active) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch (error) {
        /* ignore */
      }
    }
    active.length = 0;
  }

  /* ---- music ----------------------------------------------------------- */

  function attachMusic(element, gain = 1) {
    if (!element) return;
    musicTracks.set(element, { gain: clamp01(gain) });
    updateMusicVolume();
  }

  function setMusicGain(element, gain) {
    const track = musicTracks.get(element);
    if (!track) return;
    track.gain = clamp01(gain);
    updateMusicVolume();
  }

  function duckMusic(durationMs) {
    duckUntil = Math.max(duckUntil, performance.now() + durationMs + AUDIO_CONFIG.musicDuckReleaseMs);
    updateMusicVolume();
  }

  function updateMusicVolume() {
    const ducking = performance.now() < duckUntil ? AUDIO_CONFIG.musicDuckWhileVoice : 1;
    for (const [element, track] of musicTracks) {
      const fileScale = soundFileVolume(musicFileKey(element));
      element.volume = clamp01(
        AUDIO_CONFIG.masterVolume * busVolume("music") * ducking * track.gain * fileScale
      );
    }
  }

  /* ---- lifecycle ------------------------------------------------------- */

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    updateMusicVolume();
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) stopAll();
  }

  function tick() {
    updateMusicVolume();
  }

  loadOverrides();
  loadManifest();

  const api = {
    config: AUDIO_CONFIG,
    play,
    voice,
    startLoop,
    setLoopGain,
    stopLoop,
    stopLoopsMatching,
    stopAll,
    attachMusic,
    setMusicGain,
    updateMusicVolume,
    duckMusic,
    setListener,
    setVolume,
    resetVolumes,
    setMuted,
    unlock,
    tick,
    get isUnlocked() {
      return unlocked;
    },
    get manifest() {
      return manifest;
    }
  };
  return api;
})();

window.GameAudio = GameAudio;
window.AUDIO_CONFIG = AUDIO_CONFIG;
