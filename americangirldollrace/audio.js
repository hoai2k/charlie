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

/*
 * The engine runs on the Web Audio API: every sound goes through a GainNode on
 * its bus (sfx / voice / music), and the buses feed a master GainNode. iOS and
 * iPadOS Safari ignore HTMLAudioElement.volume, so gain nodes are the only way
 * the volumes above are honoured there. Sound effects are decoded into
 * AudioBuffers on first use; the two music <audio> elements are streamed and
 * routed through MediaElementSource nodes so their volume is a gain node too.
 */
const GameAudio = (() => {
  const BUSES = ["sfx", "voice", "music"];
  const STORAGE_KEY = "agdr-audio-volumes";
  const SFX_DIR = "assets/audio/sfx";
  // A one-shot whose buffer is still downloading plays when it arrives, unless
  // it is later than this; a stale sound effect is worse than a missing one.
  const LATE_PLAY_LIMIT = 0.35;
  // Fetched as soon as audio unlocks so their first play isn't skipped.
  const PRELOAD_KEYS = [
    "ui_click", "ui_select_character", "ui_pause", "ui_unpause", "ui_back",
    "crowd_cheer_short", "finish_line_cross", "victory_fanfare", "firework_launch", "firework_burst"
  ];

  let manifest = { sfx: {}, vo: {} };
  let unlocked = false;
  let muted = false;
  let context = null;
  let masterNode = null;
  const busNodes = {};
  const musicTracks = new Map(); // HTMLAudioElement -> { gain, node }
  let duckUntil = 0;
  let listener = { left: -Infinity, right: Infinity };

  const buffers = new Map();    // src -> Promise<AudioBuffer|null>
  const loops = new Map();      // loop id -> { key, bus, gain, trim, fileScale, baseGain, gainNode, source }
  const lastPlayed = new Map(); // throttle key -> timestamp (seconds)
  const lastVariant = new Map();
  const active = [];            // playing one-shot sources, oldest first, for the cap
  const missing = new Set();

  let lastVoiceAt = 0;
  const lastVoiceBySpeaker = new Map();

  const now = () => performance.now() / 1000;
  const clamp01 = value => Math.max(0, Math.min(1, value));

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
    if (masterNode) masterNode.gain.value = muted ? 0 : clamp01(AUDIO_CONFIG.masterVolume);
    for (const bus of BUSES) {
      if (busNodes[bus]) busNodes[bus].gain.value = clamp01(busVolume(bus));
    }
    updateMusicVolume();
  }

  /* ---- audio graph ----------------------------------------------------- */

  function createGraph() {
    if (context) return true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    // iOS 17+: play through the silent switch like a normal <audio> element
    // would; Web Audio is otherwise muted by it.
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch (error) {
      /* not supported */
    }
    try {
      context = new AudioContextClass();
    } catch (error) {
      if (AUDIO_CONFIG.debug) console.warn("[audio] AudioContext unavailable", error);
      return false;
    }
    masterNode = context.createGain();
    masterNode.connect(context.destination);
    for (const bus of BUSES) {
      busNodes[bus] = context.createGain();
      busNodes[bus].connect(masterNode);
    }
    for (const [element, track] of musicTracks) connectMusic(element, track);
    refreshLiveVolumes();
    return true;
  }

  // Safari starts contexts suspended and parks them as "interrupted" after the
  // app is backgrounded; both need a resume() from inside a user gesture.
  function resumeContext() {
    if (context && context.state !== "running" && !document.hidden) {
      context.resume().catch(() => {});
    }
  }

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

  /* ---- buffers --------------------------------------------------------- */

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

  function loadBuffer(src) {
    let pending = buffers.get(src);
    if (!pending) {
      pending = fetch(src)
        .then(response => {
          if (!response.ok) throw new Error(`${response.status} ${src}`);
          return response.arrayBuffer();
        })
        // The callback form of decodeAudioData is the one older Safari supports.
        .then(data => new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject)))
        .catch(error => {
          if (AUDIO_CONFIG.debug) console.warn(`[audio] could not load ${src}`, error);
          return null;
        });
      buffers.set(src, pending);
    }
    return pending;
  }

  function withBuffer(src, callback, { allowLate = true } = {}) {
    const requestedAt = now();
    loadBuffer(src).then(buffer => {
      if (!buffer || !unlocked || muted) return;
      if (!allowLate && now() - requestedAt > LATE_PLAY_LIMIT) return;
      callback(buffer);
    });
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

  function stopSource(source) {
    try {
      source.stop();
    } catch (error) {
      /* already stopped */
    }
  }

  function startOneShot(buffer, bus, gain, rate = 1) {
    while (active.length >= AUDIO_CONFIG.maxConcurrentSfx) stopSource(active.shift());
    const gainNode = context.createGain();
    gainNode.gain.value = gain;
    gainNode.connect(busNodes[bus]);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(gainNode);
    source.onended = () => {
      const index = active.indexOf(source);
      if (index >= 0) active.splice(index, 1);
      gainNode.disconnect();
    };
    source.start();
    active.push(source);
    return source;
  }

  function canPlay() {
    return unlocked && !muted && context !== null;
  }

  function play(key, options = {}) {
    if (!canPlay()) return null;
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
    const gain = (AUDIO_CONFIG.trim[key] ?? 1) * soundFileVolume(file) * (options.gain ?? 1) * spatial;
    if (AUDIO_CONFIG.masterVolume * busVolume(bus) * gain <= 0.001) return null;

    const rate = options.rate ?? 1;
    withBuffer(`${SFX_DIR}/${file.slice(4)}`, buffer => startOneShot(buffer, bus, gain, rate), { allowLate: false });
    if (AUDIO_CONFIG.debug) console.log(`[audio] ${key} @ ${gain.toFixed(2)}`);
    return true;
  }

  /* ---- voice ----------------------------------------------------------- */

  function voice(character, event, options = {}) {
    if (!canPlay()) return null;
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
    const gain = soundFileVolume(file) * (options.gain ?? 1) * spatial;
    lastVoiceAt = time;
    lastVoiceBySpeaker.set(character, time);
    withBuffer(`assets/audio/${file}`, buffer => {
      startOneShot(buffer, "voice", gain);
      duckMusic(buffer.duration * 1000);
    }, { allowLate: false });
    return true;
  }

  /* ---- loops ----------------------------------------------------------- */

  function startLoop(id, key, options = {}) {
    if (!canPlay()) return null;
    const bus = options.bus || "sfx";
    const existing = loops.get(id);
    if (existing && existing.key === key) {
      if (existing.bus !== bus) {
        existing.gainNode.disconnect();
        existing.gainNode.connect(busNodes[bus]);
        existing.bus = bus;
      }
      existing.baseGain = options.gain ?? existing.baseGain;
      existing.gain = existing.trim * existing.fileScale * existing.baseGain;
      existing.gainNode.gain.value = existing.gain;
      return existing;
    }
    if (existing) stopLoop(id);

    const list = variantsFor(key);
    if (!list || list.length === 0) return null;
    const file = `sfx/${key}_${String(list[0]).padStart(2, "0")}.mp3`;
    const trim = AUDIO_CONFIG.trim[key] ?? 1;
    const fileScale = soundFileVolume(file);
    const baseGain = options.gain ?? 1;
    const gainNode = context.createGain();
    gainNode.connect(busNodes[bus]);
    const loop = { key, bus, trim, fileScale, baseGain, gain: trim * fileScale * baseGain, gainNode, source: null };
    gainNode.gain.value = loop.gain;
    loops.set(id, loop);
    withBuffer(`${SFX_DIR}/${file.slice(4)}`, buffer => {
      // The loop may have been stopped or replaced while its buffer loaded.
      if (loops.get(id) !== loop) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      source.start();
      loop.source = source;
    });
    return loop;
  }

  function setLoopGain(id, gain) {
    const loop = loops.get(id);
    if (!loop) return;
    loop.baseGain = gain;
    loop.gain = loop.trim * loop.fileScale * gain;
    loop.gainNode.gain.value = loop.gain;
  }

  function stopLoop(id) {
    const loop = loops.get(id);
    if (!loop) return;
    if (loop.source) stopSource(loop.source);
    loop.gainNode.disconnect();
    loops.delete(id);
  }

  function stopLoopsMatching(prefix) {
    for (const id of [...loops.keys()]) {
      if (id.startsWith(prefix)) stopLoop(id);
    }
  }

  function stopAll() {
    for (const id of [...loops.keys()]) stopLoop(id);
    for (const source of active.splice(0)) stopSource(source);
  }

  /* ---- music ----------------------------------------------------------- */

  function connectMusic(element, track) {
    if (!context || track.node) return;
    try {
      const source = context.createMediaElementSource(element);
      track.node = context.createGain();
      source.connect(track.node);
      track.node.connect(busNodes.music);
      // The gain node owns the level now; leave the element itself at full.
      element.volume = 1;
    } catch (error) {
      if (AUDIO_CONFIG.debug) console.warn("[audio] could not route music through Web Audio", error);
    }
  }

  function attachMusic(element, gain = 1) {
    if (!element) return;
    const track = { gain: clamp01(gain), node: null };
    musicTracks.set(element, track);
    connectMusic(element, track);
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
      const level = ducking * track.gain * soundFileVolume(musicFileKey(element));
      if (track.node) {
        track.node.gain.value = level;
      } else {
        // No Web Audio: fall back to element volume (ignored on iOS, fine elsewhere).
        element.volume = clamp01(AUDIO_CONFIG.masterVolume * busVolume("music") * level);
      }
    }
  }

  /* ---- lifecycle ------------------------------------------------------- */

  // Must be called from inside a user gesture (click / tap / key press).
  function unlock() {
    if (!unlocked) {
      unlocked = createGraph();
      if (unlocked) preloadCommon();
    }
    resumeContext();
  }

  function preloadCommon() {
    for (const key of PRELOAD_KEYS) {
      for (const variant of variantsFor(key) || []) {
        loadBuffer(`${SFX_DIR}/${key}_${String(variant).padStart(2, "0")}.mp3`);
      }
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) stopAll();
    refreshLiveVolumes();
  }

  function tick() {
    updateMusicVolume();
  }

  // Any later gesture revives a context Safari suspended in the background.
  for (const type of ["pointerdown", "touchend", "keydown"]) {
    window.addEventListener(type, resumeContext, { capture: true, passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (!context) return;
    if (document.hidden) context.suspend().catch(() => {});
    else resumeContext();
  });

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
