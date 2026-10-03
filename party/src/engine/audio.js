// Web Audio engine: synthesized SFX + a tiny chiptune music sequencer.
// Recorded files listed in assets/audio/manifest.json override the synth
// version of the same name (see audio-requests.md), so real voice clips and
// cheers can be dropped in later without code changes.
//
//   sfx('coin')                     play a sound
//   sfx('note', { midi: 64 })       some sounds take options (pitch, volume)
//   music.play('party')             start a looping song (title, menu, party, chase, chill, dance, tense, victory)
//   music.stop()
//   music.beat()                    current position in beats (for rhythm games)
//
// Sound goes quiet while the tab is hidden or the window loses focus (the
// AudioContext is suspended, so music picks up where it left off), and the
// mute setting is remembered between visits.

let ctx = null, master, sfxBus, musicBus, noiseBuf;
const fileBuffers = new Map();   // name -> [AudioBuffer]
let manifest = { sfx: {}, music: {} };
const MUTE_KEY = 'charlieParty.muted';
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* storage blocked */ }
let awaySuspended = false; // we suspended the context because the page lost focus

export function audioCtx() { return ctx; }

export function initAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.75; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  loadManifest();
  document.addEventListener('visibilitychange', onFocusChange);
  window.addEventListener('blur', onFocusChange);
  window.addEventListener('focus', onFocusChange);
  window.addEventListener('pagehide', onFocusChange);
  return ctx;
}

const pageAway = () => document.hidden || (document.hasFocus && !document.hasFocus());
function onFocusChange() {
  if (!ctx) return;
  if (pageAway()) {
    if (ctx.state === 'running') { awaySuspended = true; ctx.suspend().catch(() => {}); }
    music._pauseStream();
  } else if (awaySuspended) {
    awaySuspended = false;
    ctx.resume().catch(() => {});
    music._kick();
  }
}

/** Must run inside (or soon after) a user gesture. Safe to call repeatedly. */
export function unlockAudio() {
  initAudio();
  if (pageAway()) return false;
  awaySuspended = false;
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  music._kick(); // streamed songs need play() inside a gesture on some browsers
  return ctx && ctx.state === 'running';
}
export function audioRunning() { return !!ctx && ctx.state === 'running'; }

const musicEntry = (name) => {
  const e = manifest.music[name];
  if (!e) return null;
  return typeof e === 'string' ? { file: e } : e; // { file, loopStart, loopEnd, offset, stream }
};
const musicLoading = new Map();
const MUSIC_CACHE = 3;
const musicLRU = [];
function loadMusic(name) {
  const e = musicEntry(name);
  if (!e || !ctx) return Promise.resolve(null);
  if (fileBuffers.has('music:' + name)) return Promise.resolve(fileBuffers.get('music:' + name)[0]);
  if (!musicLoading.has(name)) {
    musicLoading.set(name, loadBuffer(e.file).then((b) => {
      musicLoading.delete(name);
      if (!b) return null;
      fileBuffers.set('music:' + name, [b]);
      musicLRU.push(name);
      while (musicLRU.length > MUSIC_CACHE) { const old = musicLRU.shift(); if (old !== music.name) fileBuffers.delete('music:' + old); }
      return b;
    }));
  }
  return musicLoading.get(name);
}

/** True if a recorded file exists for this sfx key. */
export function hasSound(key) { return fileBuffers.has(key); }

// Glimmer never speaks out loud (design decision: no spoken lines). Her
// words are shown as text bubbles (engine/host.js hostBubble). host() stays
// as a silent no-op so call sites keep working.
export function host() { return false; }

/** Mute everything. `save` remembers the choice for the next visit. */
export function setMuted(m, { save = false } = {}) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : 0.8;
  if (save) { try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* storage blocked */ } }
}
export function isMuted() { return muted; }
export function toggleMuted() { setMuted(!muted, { save: true }); return muted; }

async function loadManifest() {
  try {
    const res = await fetch('assets/audio/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    manifest = await res.json();
    manifest.sfx = manifest.sfx || {}; manifest.music = manifest.music || {};
    for (const [name, files] of Object.entries(manifest.sfx)) {
      // Character voices load on demand (preloadVoices) - only the party's.
      if (name.startsWith('voice/')) continue;
      const list = Array.isArray(files) ? files : [files];
      Promise.all(list.map(loadBuffer)).then((bufs) => {
        const ok = bufs.filter(Boolean);
        if (ok.length) fileBuffers.set(name, ok);
      });
    }
    // Music decodes lazily on first play (decoded songs are big on iPads).
    // A song that started before the manifest arrived switches to its recording.
    if (music.name && musicEntry(music.name) && music.name !== 'dance') music.play(music.name, { restart: true });
  } catch (e) { /* no manifest: synth only */ }
}
async function loadBuffer(file) {
  try {
    const res = await fetch('assets/audio/' + file);
    if (!res.ok) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch (e) { return null; }
}

// --- synthesis primitives ---------------------------------------------------

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function env(g, t, vol, a, d, sustainTime = 0) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
  g.gain.setValueAtTime(Math.max(0.0002, vol), t + a + sustainTime);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + sustainTime + d);
}

let callBus = null; // per-call volume bus used by sfx(name, { vol })

function tone({ type = 'square', f = 440, f2 = null, t = 0, dur = 0.12, vol = 0.3, a = 0.005, bus = callBus || sfxBus, vib = 0, detune = 0, lp = 0 }) {
  const now = ctx.currentTime + t;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.detune.value = detune;
  o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + dur);
  let node = o;
  if (vib) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = 6; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency);
    l.start(now); l.stop(now + dur + 0.1);
  }
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; node.connect(fl); node = fl; }
  node.connect(g); g.connect(bus);
  env(g, now, vol, a, dur);
  o.start(now); o.stop(now + a + dur + 0.05);
}

function noise({ t = 0, dur = 0.2, vol = 0.3, type = 'lowpass', f = 1200, f2 = null, q = 1, bus = callBus || sfxBus, a = 0.003 }) {
  const now = ctx.currentTime + t;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, now);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, now + dur);
  const g = ctx.createGain();
  s.connect(fl); fl.connect(g); g.connect(bus);
  env(g, now, vol, a, dur);
  s.start(now, Math.random() * 0.5); s.stop(now + dur + a + 0.05);
}

const arp = (notes, step, opts) => notes.forEach((m, i) => tone({ f: mtof(m), t: i * step, ...opts }));

const SYNTH = {
  blip: () => tone({ type: 'square', f: 880, dur: 0.04, vol: 0.12 }),
  move: () => tone({ type: 'triangle', f: 660, f2: 760, dur: 0.05, vol: 0.18 }),
  select: () => arp([72, 79], 0.06, { type: 'square', dur: 0.08, vol: 0.16 }),
  back: () => arp([67, 60], 0.06, { type: 'triangle', dur: 0.08, vol: 0.22 }),
  join: () => arp([60, 64, 67, 72], 0.05, { type: 'square', dur: 0.08, vol: 0.14 }),
  ready: () => arp([67, 72, 76, 79], 0.045, { type: 'triangle', dur: 0.1, vol: 0.22 }),
  error: () => { tone({ type: 'square', f: 160, dur: 0.09, vol: 0.14 }); tone({ type: 'square', f: 150, t: 0.11, dur: 0.12, vol: 0.14 }); },
  coin: () => { tone({ type: 'square', f: 988, dur: 0.06, vol: 0.12 }); tone({ type: 'square', f: 1319, t: 0.06, dur: 0.18, vol: 0.12 }); },
  collect: (o) => tone({ type: 'triangle', f: mtof(79 + (o.step || 0)), f2: mtof(86 + (o.step || 0)), dur: 0.09, vol: 0.25 }),
  jump: () => tone({ type: 'sine', f: 280, f2: 760, dur: 0.16, vol: 0.28 }),
  land: () => noise({ dur: 0.08, vol: 0.25, f: 400 }),
  bounce: () => tone({ type: 'sine', f: 180, f2: 520, dur: 0.18, vol: 0.32, vib: 30 }),
  pop: () => { tone({ type: 'sine', f: 900, f2: 200, dur: 0.07, vol: 0.35 }); noise({ dur: 0.05, vol: 0.2, type: 'highpass', f: 2000 }); },
  bigpop: () => { noise({ dur: 0.35, vol: 0.5, f: 3000, f2: 300 }); tone({ type: 'sine', f: 300, f2: 50, dur: 0.3, vol: 0.4 }); },
  boom: () => { noise({ dur: 0.6, vol: 0.55, f: 900, f2: 120 }); tone({ type: 'sine', f: 120, f2: 35, dur: 0.5, vol: 0.5 }); },
  hit: () => { tone({ type: 'square', f: 220, f2: 70, dur: 0.12, vol: 0.2 }); noise({ dur: 0.08, vol: 0.25, f: 1500 }); },
  bonk: () => tone({ type: 'triangle', f: 520, f2: 130, dur: 0.14, vol: 0.32 }),
  whoosh: () => noise({ dur: 0.3, vol: 0.22, type: 'bandpass', f: 400, f2: 2400, q: 2 }),
  splash: () => { noise({ dur: 0.4, vol: 0.3, type: 'highpass', f: 1200, f2: 4000 }); tone({ type: 'sine', f: 400, f2: 900, dur: 0.15, vol: 0.12 }); },
  splat: () => { noise({ dur: 0.12, vol: 0.32, type: 'bandpass', f: 900, f2: 300, q: 1.5 }); tone({ type: 'sine', f: 240, f2: 90, dur: 0.1, vol: 0.2 }); },
  crack: () => { noise({ dur: 0.06, vol: 0.3, type: 'highpass', f: 2500 }); noise({ t: 0.05, dur: 0.1, vol: 0.2, type: 'bandpass', f: 800, q: 3 }); },
  crumble: () => { for (let i = 0; i < 5; i++) noise({ t: i * 0.04, dur: 0.08, vol: 0.18, type: 'bandpass', f: 300 + Math.random() * 600, q: 2 }); },
  pump: () => noise({ dur: 0.12, vol: 0.2, type: 'bandpass', f: 600, f2: 1400, q: 3 }),
  tick: () => tone({ type: 'square', f: 1800, dur: 0.02, vol: 0.08 }),
  tock: () => tone({ type: 'square', f: 1200, dur: 0.025, vol: 0.08 }),
  count: () => tone({ type: 'square', f: 523, dur: 0.18, vol: 0.18 }),
  go: () => { tone({ type: 'square', f: 1046, dur: 0.4, vol: 0.18 }); tone({ type: 'square', f: 523, dur: 0.4, vol: 0.1 }); },
  whistle: () => tone({ type: 'sine', f: 1800, f2: 2300, dur: 0.35, vol: 0.2, vib: 60 }),
  correct: () => arp([76, 84], 0.08, { type: 'sine', dur: 0.2, vol: 0.3 }),
  wrong: () => tone({ type: 'sawtooth', f: 180, f2: 120, dur: 0.3, vol: 0.18, lp: 900 }),
  star: () => arp([84, 88, 91, 96], 0.05, { type: 'triangle', dur: 0.15, vol: 0.18 }),
  sparkle: () => { for (let i = 0; i < 5; i++) tone({ type: 'sine', f: mtof(90 + Math.floor(Math.random() * 10)), t: i * 0.04, dur: 0.12, vol: 0.1 }); },
  magic: () => { for (let i = 0; i < 8; i++) tone({ type: 'sine', f: mtof(72 + i * 2 + (i % 2) * 3), t: i * 0.035, dur: 0.18, vol: 0.09 }); },
  grow: () => tone({ type: 'triangle', f: 200, f2: 800, dur: 0.45, vol: 0.22, vib: 12 }),
  shrink: () => tone({ type: 'triangle', f: 800, f2: 200, dur: 0.35, vol: 0.2 }),
  munch: () => { for (let i = 0; i < 3; i++) noise({ t: i * 0.09, dur: 0.06, vol: 0.25, type: 'bandpass', f: 700, q: 2 }); },
  bubble: () => tone({ type: 'sine', f: 400 + Math.random() * 300, f2: 1200, dur: 0.07, vol: 0.18 }),
  water: () => { for (let i = 0; i < 4; i++) tone({ type: 'sine', f: 300 + Math.random() * 500, f2: 1100, t: i * 0.05, dur: 0.06, vol: 0.12 }); },
  shutter: () => { noise({ dur: 0.03, vol: 0.4, type: 'highpass', f: 3000 }); noise({ t: 0.09, dur: 0.05, vol: 0.3, type: 'highpass', f: 2000 }); },
  brush: () => noise({ dur: 0.12, vol: 0.08, type: 'bandpass', f: 2500, q: 0.8 }),
  stamp: () => { tone({ type: 'sine', f: 160, f2: 60, dur: 0.1, vol: 0.35 }); noise({ dur: 0.04, vol: 0.15, f: 2000 }); },
  swap: () => tone({ type: 'triangle', f: 500, f2: 900, dur: 0.08, vol: 0.2 }),
  flip: () => noise({ dur: 0.07, vol: 0.2, type: 'bandpass', f: 1800, f2: 900, q: 1.2 }),
  dash: () => noise({ dur: 0.18, vol: 0.25, type: 'bandpass', f: 2000, f2: 500, q: 1 }),
  stun: () => { for (let i = 0; i < 6; i++) tone({ type: 'sine', f: i % 2 ? 1500 : 1200, t: i * 0.06, dur: 0.06, vol: 0.1 }); },
  roar: () => { noise({ dur: 0.7, vol: 0.4, type: 'bandpass', f: 300, f2: 180, q: 1.5 }); tone({ type: 'sawtooth', f: 90, f2: 60, dur: 0.6, vol: 0.2, lp: 400, vib: 8 }); },
  stomp: () => { tone({ type: 'sine', f: 90, f2: 40, dur: 0.18, vol: 0.5 }); noise({ dur: 0.12, vol: 0.2, f: 300 }); },
  snore: () => noise({ dur: 0.8, vol: 0.12, type: 'bandpass', f: 250, f2: 400, q: 4, a: 0.3 }),
  note: (o) => {
    const m = o.midi ?? 72;
    tone({ type: o.wave || 'triangle', f: mtof(m), dur: o.dur || 0.3, vol: o.vol ?? 0.25 });
    tone({ type: 'sine', f: mtof(m + 12), dur: (o.dur || 0.3) * 0.6, vol: (o.vol ?? 0.25) * 0.3 });
  },
  drumroll: () => { for (let i = 0; i < 14; i++) noise({ t: i * 0.05, dur: 0.04, vol: 0.12 + i * 0.01, type: 'bandpass', f: 1500, q: 0.7 }); },
  cheer: () => { // stand-in for a crowd; a recorded cheer should replace this (audio-requests.md)
    noise({ dur: 1.1, vol: 0.18, type: 'bandpass', f: 1200, q: 0.6, a: 0.15 });
    arp([72, 76, 79, 84], 0.08, { type: 'square', dur: 0.12, vol: 0.08 });
  },
  fanfare: () => {
    const n = [67, 67, 67, 72, 76, 79, 76, 79, 84];
    const d = [0, 0.12, 0.24, 0.36, 0.6, 0.84, 1.0, 1.12, 1.3];
    n.forEach((m, i) => tone({ type: 'square', f: mtof(m), t: d[i], dur: i === n.length - 1 ? 0.6 : 0.11, vol: 0.13 }));
    n.forEach((m, i) => tone({ type: 'triangle', f: mtof(m - 12), t: d[i], dur: 0.11, vol: 0.12 }));
  },
  win: () => arp([72, 76, 79, 84, 88], 0.08, { type: 'square', dur: 0.14, vol: 0.12 }),
  lose: () => { // sad trombone
    [62, 61, 60].forEach((m, i) => tone({ type: 'sawtooth', f: mtof(m), t: i * 0.32, dur: 0.28, vol: 0.14, lp: 1100 }));
    tone({ type: 'sawtooth', f: mtof(59), t: 0.96, dur: 0.8, vol: 0.14, lp: 1100, vib: 5 });
  },
  aww: () => tone({ type: 'sine', f: 520, f2: 330, dur: 0.5, vol: 0.18, vib: 8 }),
  yay: () => arp([79, 84, 88], 0.07, { type: 'triangle', dur: 0.12, vol: 0.2 }),
  giggle: () => { for (let i = 0; i < 5; i++) tone({ type: 'sine', f: 900 - i * 40, f2: 1200 - i * 40, t: i * 0.08, dur: 0.06, vol: 0.12 }); },
};

const lastPlayed = new Map();

/**
 * Play a sound effect by name. Unknown names are ignored.
 * opts: vol, rate (recorded files), semi (semitones up/down, recorded files),
 * fallback (key to play instead when this one has neither a file nor a synth
 * version, e.g. sfx('boing', { fallback: 'bonk' })), force, plus synth options.
 */
export function sfx(name, opts = {}) {
  if (!ctx || ctx.state !== 'running' || muted) return;
  if (opts.fallback && !fileBuffers.has(name) && !SYNTH[name]) { sfx(opts.fallback, { ...opts, fallback: null }); return; }
  // Avoid machine-gunning the same sound in a single frame.
  const now = ctx.currentTime;
  if (!opts.force && lastPlayed.get(name) > now - 0.025) return;
  lastPlayed.set(name, now);
  const bufs = fileBuffers.get(name);
  if (bufs) {
    const src = ctx.createBufferSource();
    src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
    const rate = (opts.rate || 1) * (opts.semi ? Math.pow(2, opts.semi / 12) : 1);
    if (rate !== 1) src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = opts.vol ?? 1;
    src.connect(g); g.connect(sfxBus); src.start();
    return;
  }
  const fn = SYNTH[name];
  if (!fn) return;
  if (opts.vol !== undefined && opts.vol !== 1) {
    callBus = ctx.createGain(); callBus.gain.value = Math.max(0, opts.vol); callBus.connect(sfxBus);
    const bus = callBus;
    setTimeout(() => bus.disconnect(), 4000);
  }
  try { fn(opts); } finally { callBus = null; }
}
export const SFX_NAMES = Object.keys(SYNTH);

/**
 * Looping recorded sound (fizzing fuse, broom whoosh, crickets...). Returns a
 * handle { stop(fade = 0.15), setVol(v), setRate(r) }; with no file (or no
 * sound) it's a silent handle, so callers never need to check.
 */
const activeLoops = new Set();
export function sfxLoop(name, { vol = 1, rate = 1, fadeIn = 0.1 } = {}) {
  const silent = { stop() {}, setVol() {}, setRate() {}, playing: false };
  const bufs = fileBuffers.get(name);
  if (!ctx || ctx.state !== 'running' || muted || !bufs) return silent;
  const src = ctx.createBufferSource();
  src.buffer = bufs[0]; src.loop = true; src.playbackRate.value = rate;
  const g = ctx.createGain(), now = ctx.currentTime;
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + fadeIn);
  src.connect(g); g.connect(sfxBus); src.start();
  let stopped = false, level = vol;
  const h = {
    playing: true,
    stop(fade = 0.15) {
      if (stopped) return; stopped = true; this.playing = false; activeLoops.delete(h);
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
      try { src.stop(t + fade + 0.02); } catch (e) { /* already stopped */ }
    },
    setVol(v) { level = v; if (!stopped && !loopsDucked) g.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
    setRate(r) { if (!stopped) src.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.05); },
    _duck(on) { if (!stopped) g.gain.setTargetAtTime(on ? 0 : level, ctx.currentTime, 0.04); },
  };
  activeLoops.add(h);
  if (loopsDucked) h._duck(true);
  return h;
}
let loopsDucked = false;
/** Stop every running sfxLoop (the minigame host calls this when a game ends). */
export function stopAllLoops() { for (const h of [...activeLoops]) h.stop(0.1); }
/** Silence running loops while a game is paused (and bring them back). */
export function duckLoops(on) { loopsDucked = on; for (const h of activeLoops) h._duck(on); }

// Character voice clips: manifest keys "voice/<charId>/<kind>". These are
// NON-WORD vocalizations only (giggles, yips, beeps, gasps); anything with
// words is shown as a speech bubble instead (Actor.say). Missing clips fall
// back to a synth stand-in.
export const VOICE_KINDS = { hello: 'join', ready: 'ready', yay: 'yay', aww: 'aww', ouch: 'bonk', woo: 'yay', laugh: 'giggle', gasp: 'blip' };
const voicesLoading = new Set();
/** Decode the voice clips for these characters (called when a party forms). */
export function preloadVoices(charIds) {
  if (!ctx) return;
  for (const [name, files] of Object.entries(manifest.sfx)) {
    if (!name.startsWith('voice/') || voicesLoading.has(name)) continue;
    if (!charIds.includes(name.split('/')[1])) continue;
    voicesLoading.add(name);
    const list = Array.isArray(files) ? files : [files];
    Promise.all(list.map(loadBuffer)).then((bufs) => { const ok = bufs.filter(Boolean); if (ok.length) fileBuffers.set(name, ok); });
  }
}
export function voice(charId, kind) {
  const key = `voice/${charId}/${kind}`;
  if (fileBuffers.has(key)) sfx(key);
  else { preloadVoices([charId]); sfx(VOICE_KINDS[kind] || 'blip'); }
}

// --- music -----------------------------------------------------------------

// Each song: bpm, root (midi), scale, chord progression (scale degrees), and
// style knobs. A seeded generator writes a melody that repeats like a real
// tune (A A B A), so each song sounds the same every time it plays.
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const SONGS = {
  title:   { bpm: 124, root: 60, scale: MAJOR, prog: [0, 4, 5, 3], seed: 11, drums: 'pop', lead: 'square', arp: true },
  menu:    { bpm: 112, root: 65, scale: MAJOR, prog: [0, 5, 3, 4], seed: 4, drums: 'light', lead: 'triangle', arp: true },
  party:   { bpm: 138, root: 62, scale: MAJOR, prog: [0, 3, 4, 4, 0, 3, 5, 4], seed: 7, drums: 'pop', lead: 'square', arp: true },
  chase:   { bpm: 156, root: 57, scale: MINOR, prog: [0, 5, 6, 4], seed: 21, drums: 'drive', lead: 'square', arp: true },
  tense:   { bpm: 120, root: 55, scale: MINOR, prog: [0, 0, 5, 4], seed: 33, drums: 'light', lead: 'triangle', arp: true },
  chill:   { bpm: 92, root: 64, scale: MAJOR, prog: [0, 5, 3, 4], seed: 2, drums: 'soft', lead: 'sine', arp: true },
  dance:   { bpm: 120, root: 60, scale: MINOR, prog: [0, 5, 2, 6], seed: 9, drums: 'four', lead: 'square', arp: true },
  bouncy:  { bpm: 128, root: 67, scale: MAJOR, prog: [0, 4, 3, 4], seed: 15, drums: 'pop', lead: 'triangle', arp: false },
  victory: { bpm: 132, root: 60, scale: MAJOR, prog: [0, 3, 4, 0], seed: 5, drums: 'pop', lead: 'square', arp: true },
};
export const SONG_NAMES = Object.keys(SONGS);

function seeded(seed) {
  let s = seed * 9301 + 49297;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function buildSong(def) {
  const r = seeded(def.seed);
  const deg = (d) => def.root + def.scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const motif = () => {
    // 8 eighth-notes; strong beats land on chord tones (offset 0/2/4), rests sprinkled in.
    const m = [];
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 1 && r() < 0.3) { m.push(null); continue; }
      const off = i % 4 === 0 ? [0, 2, 4][Math.floor(r() * 3)] : Math.floor(r() * 6) - 1;
      m.push(off);
    }
    return m;
  };
  const A = motif(), B = motif();
  const form = [A, A, B, A];
  const bars = def.prog.map((chord, bi) => {
    const mot = form[bi % 4];
    const lift = bi % 4 === 2 ? 2 : 0;
    return {
      chord,
      bass: deg(chord) - 24,
      chordNotes: [deg(chord), deg(chord + 2), deg(chord + 4)],
      lead: mot.map((o) => (o === null ? null : deg(chord + o + lift) + 12)),
    };
  });
  return { ...def, bars };
}

const DRUMS = {
  pop:   { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
  light: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  drive: { k: 'x..x..x.x..x..x.', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx' },
  soft:  { k: 'x.........x.....', s: '................', h: '..x...x...x...x.' },
  four:  { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...xx' },
};

// Long songs (manifest entry with "stream": true) play through an <audio>
// element routed into the music bus instead of being decoded whole: a
// 3-minute song is ~70 MB of PCM, too much for an iPad. One element per file,
// so songs that share a file share the element.
const streams = new Map(); // file -> { el, out }
function streamFor(file) {
  if (!streams.has(file)) {
    const el = new Audio('assets/audio/' + file);
    el.loop = true; el.preload = 'auto';
    el.setAttribute('playsinline', '');
    const out = ctx.createGain();
    ctx.createMediaElementSource(el).connect(out);
    streams.set(file, { el, out });
  }
  return streams.get(file);
}

class Music {
  constructor() { this.song = null; this.name = null; this.timer = null; this.gain = null; this.stream = null; }
  play(name, { restart = false } = {}) {
    if (!ctx) return;
    // A streamed song never needs restarting: just make sure it is playing.
    if (this.name === name && (!restart || this.stream)) { this._kick(); return; }
    this.stop(0.25);
    const def = SONGS[name];
    this.name = name;
    if (!def) return;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.0001;
    this.gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.4);
    this.gain.connect(musicBus);
    const fileBuf = fileBuffers.get('music:' + name);
    const entry = musicEntry(name);
    if (entry && entry.stream) {
      const st = streamFor(entry.file);
      st.out.connect(this.gain);
      st.el.currentTime = 0;
      this.stream = st; this.start = ctx.currentTime; this.song = { bpm: def.bpm };
      this._kick();
      return;
    }
    if (fileBuf) {
      const src = ctx.createBufferSource(); src.buffer = fileBuf[0]; src.loop = true;
      if (entry.loopEnd) { src.loopStart = entry.loopStart || 0; src.loopEnd = entry.loopEnd; }
      src.connect(this.gain); src.start();
      this.fileSrc = src; this.start = ctx.currentTime + (entry.offset || 0); this.song = { bpm: def.bpm };
      return;
    }
    if (entry) {
      // Play the synth version now; swap to the recording once it decodes
      // (except 'dance', whose beat clock must not jump mid-song).
      loadMusic(name).then((b) => { if (b && this.name === name && name !== 'dance') this.play(name, { restart: true }); });
    }
    this.song = buildSong(def);
    this.step = 0;
    this.start = ctx.currentTime + 0.08;
    this.nextTime = this.start;
    this.timer = setInterval(() => this._schedule(), 25);
    this._schedule();
  }
  stop(fade = 0.3) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.gain && ctx) {
      const g = this.gain;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value || 0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fade);
      setTimeout(() => g.disconnect(), fade * 1000 + 100);
    }
    if (this.fileSrc) { try { this.fileSrc.stop(ctx.currentTime + fade); } catch (e) { /* ignore */ } this.fileSrc = null; }
    if (this.stream && this.gain) {
      const st = this.stream, g = this.gain;
      setTimeout(() => {
        try { st.out.disconnect(g); } catch (e) { /* already gone */ }
        if (this.stream !== st) st.el.pause();
      }, fade * 1000 + 50);
    }
    this.gain = null; this.song = null; this.name = null; this.stream = null;
  }
  /** (Re)start a streamed song; play() can be refused until a user gesture. */
  _kick() {
    const st = this.stream;
    if (!st || !st.el.paused || pageAway()) return;
    const p = st.el.play();
    if (p && p.catch) p.catch(() => {}); // retried on the next gesture (unlockAudio)
  }
  _pauseStream() { if (this.stream) this.stream.el.pause(); }
  /** Start decoding a recorded song early (e.g. during a countdown). */
  preload(name) { return loadMusic(name); }
  /** Beats elapsed since the song started (fractional). */
  beat() {
    if (!this.song || !ctx) return 0;
    return Math.max(0, (ctx.currentTime - this.start) * this.song.bpm / 60);
  }
  get bpm() { return this.song ? this.song.bpm : 120; }
  _schedule() {
    if (!this.song) return;
    const s = this.song, sp = 60 / s.bpm / 4; // 16th note
    while (this.nextTime < ctx.currentTime + 0.12) {
      this._playStep(this.step, this.nextTime, sp);
      this.step++;
      this.nextTime += sp;
    }
  }
  _playStep(step, t, sp) {
    const s = this.song, out = this.gain;
    const barIdx = Math.floor(step / 16) % s.bars.length, i = step % 16;
    const bar = s.bars[barIdx];
    const at = t - ctx.currentTime;
    const d = DRUMS[s.drums] || DRUMS.light;
    if (d.k[i] === 'x') { tone({ type: 'sine', f: 150, f2: 45, t: at, dur: 0.14, vol: 0.55, bus: out }); }
    if (d.s[i] === 'x') noise({ t: at, dur: 0.1, vol: 0.22, type: 'bandpass', f: 1800, q: 0.8, bus: out });
    if (d.h[i] === 'x') noise({ t: at, dur: 0.03, vol: 0.07, type: 'highpass', f: 7000, bus: out });
    // Bass on beats with a bounce on the "and".
    if (i % 4 === 0 || i === 6 || i === 14) tone({ type: 'triangle', f: mtof(bar.bass + (i === 6 || i === 14 ? 12 : 0)), t: at, dur: sp * 1.6, vol: 0.32, bus: out });
    // Arpeggio of chord tones in 16ths, quiet.
    if (s.arp && i % 2 === 0) {
      const n = bar.chordNotes[(i / 2) % 3];
      tone({ type: 'square', f: mtof(n), t: at, dur: sp * 0.9, vol: 0.035, bus: out, lp: 2400 });
    }
    // Lead melody in 8ths.
    if (i % 2 === 0) {
      const m = bar.lead[i / 2];
      if (m != null) tone({ type: s.lead, f: mtof(m), t: at, dur: sp * 1.7, vol: s.lead === 'sine' ? 0.14 : 0.07, bus: out, lp: s.lead === 'square' ? 3200 : 0 });
    }
  }
}

export const music = new Music();
