// Melody Maker (Play Studio). Compose a looping tune together on a colourful
// step sequencer: 16 steps (eighth notes, two bars) x 8 pitches of the C major
// pentatonic scale (so any mix of notes sounds nice) plus a drum lane (kick,
// clap, shaker). Every pitch row has its own rainbow colour and a singing
// flower that sings when its row plays. Each player has a coloured cursor and
// their own sound (bells, piano, marimba, "la la" choir); the notes they place
// keep that sound, so two players make a duet.
//
// Controls: stick / D-pad move the cursor, A adds or removes a note (hold A
// and move to paint a line), X changes your sound, Y sprinkles a surprise
// phrase (on an empty page: a whole surprise tune), LB/RB flip pages (pushing
// past the grid's left/right edge flips too), B undoes your last change.
// Above the grid is a button bar (Songs, Beat, pages 1-4, Speed, Clear,
// Concert!) reached by moving up. Mouse/touch: click or drag on the cells,
// click the buttons.
//
// The loop always plays the page on screen. "Concert!" (or the pause menu's
// All done!) plays every page in order on a stage: the characters dance on
// the beat, the flowers sing, confetti flies. Then A finishes and B goes back
// to composing. Notes are synthesized with Web Audio and scheduled ahead on
// the audio clock (recorded inst/<id> samples are used when they exist, see
// audio-requests.md). The background music is switched off: the players'
// song is the music.
//
// CPUs: when humans play, CPUs only add a few tasteful notes now and then
// (a harmony under someone's note, a shaker tap, a fill) away from the human
// cursors, and never remove anyone's notes. A CPU-only party composes a little
// song by itself and puts on the concert.
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, music, hasSound, audioCtx, sfxInput, soundBuffer } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile } from '../engine/ai.js';
import { playerName } from '../state.js';
import { clamp, lerp, rand, randInt, pick, chance, ease, TAU } from '../engine/util.js';
import { drawSparkleShape, drawStarShape } from '../engine/emotes.js';

export const meta = {
  id: 'melody-maker',
  title: 'Melody Maker',
  category: 'studio',
  type: 'Make music together · Everyone wins',
  goal: 'Make a song together on the magic music garden, then put on a concert!',
  controls: [['stick', 'Move'], ['a', 'Add or remove a note'], ['x', 'Change your sound'], ['y', 'Surprise sparkle!'], ['lb', 'Flip pages (LB / RB)'], ['b', 'Oops! Undo']],
  tips: ['Every note sounds nice together, so try anything!', 'Move up to the buttons for songs, drums and speed.', 'Press Concert! when your song is ready.'],
  music: 'melody',        // no such song: the background music stays off (our tune is the music)
  duration: 'as long as you like',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  drawIcon,
};

const NAVY = '#24163f';
const STEPS = 16, NPAGES = 4, NP = 8, ND = 3, NROWS = NP + ND;
// Pitches low -> high: C major pentatonic from G4 to C6, one rainbow colour each.
const PITCHES = [
  { midi: 67, color: '#ff5a6e' }, { midi: 69, color: '#ff9f1c' }, { midi: 72, color: '#ffd23f' }, { midi: 74, color: '#6fdc5a' },
  { midi: 76, color: '#2fd3c0' }, { midi: 79, color: '#3fa7ff' }, { midi: 81, color: '#9b6bff' }, { midi: 84, color: '#ff6fd0' },
];
const DRUMS = [{ id: 'kick', color: '#ff8a5c' }, { id: 'clap', color: '#ffc83f' }, { id: 'shaker', color: '#7ad88f' }];
// oct: octave shift of the written pitch; base: MIDI note of a recorded inst/<id> sample.
const INSTS = [
  { id: 'bells', name: 'Bells', oct: 0, base: 72, color: '#ffd23f' },
  { id: 'piano', name: 'Piano', oct: -12, base: 60, color: '#7fd3ff' },
  { id: 'marimba', name: 'Marimba', oct: -12, base: 60, color: '#e8a465' },
  { id: 'choir', name: 'La la!', oct: 0, base: 72, color: '#ff8fd0' },
];
const TEMPOS = [{ bpm: 76, name: 'Slow' }, { bpm: 96, name: 'Medium' }, { bpm: 120, name: 'Fast' }];
const GROOVES = [
  { id: 'off', name: 'No drums', k: '', c: '', s: '' },
  { id: 'bounce', name: 'Bouncy', k: 'x...x...x...x...', c: '..x...x...x...x.', s: '.x.x.x.x.x.x.x.x' },
  { id: 'lullaby', name: 'Lullaby', k: 'x.......x.......', c: '', s: '....x.......x...' },
  { id: 'march', name: 'March', k: 'x.x.x.x.x.x.x.x.', c: '......x.......x.', s: '' },
  { id: 'disco', name: 'Disco', k: 'x.x.x.x.x.x.x.x.', c: '..x...x...x...x.', s: '.x.x.x.x.x.x.x.x' },
  { id: 'skippy', name: 'Skippy', k: 'x..x..x.x..x..x.', c: '....x.......x...', s: 'xxxxxxxxxxxxxxxx' },
];
const GROOVE = Object.fromEntries(GROOVES.map((gr, i) => [gr.id, i]));
// Letters for the preset tunes: g a c d e = G4 A4 C5 D5 E5, G A C = G5 A5 C6.
const NOTE_OF = { g: 0, a: 1, c: 2, d: 3, e: 4, G: 5, A: 6, C: 7 };
const PRESETS = [
  { id: 'blank', name: 'Blank page' },
  { id: 'mary', name: "Mary's Lamb", tempo: 1, pages: [
    { lead: 'e.d.c.d.e.e.e...', inst: 0, groove: 'bounce' },
    { lead: 'd.d.d...e.G.G...', inst: 0, groove: 'bounce' },
    { lead: 'e.d.c.d.e.e.e.e.', inst: 0, groove: 'bounce' },
    { lead: 'd.d.e.d.c.......', inst: 0, groove: 'lullaby', low: 'g.......c.......', lowInst: 2 },
  ] },
  { id: 'farm', name: 'Old MacDonald', tempo: 1, pages: [
    { lead: 'c.c.c.g.a.a.g...', inst: 2, groove: 'march' },
    { lead: 'e.e.d.d.c.......', inst: 2, groove: 'march', low: '........g...g...', lowInst: 1 },
  ] },
  { id: 'buns', name: 'Hot Cross Buns', tempo: 1, pages: [
    { lead: 'e.d.c...e.d.c...', inst: 1, groove: 'bounce' },
    { lead: 'ccccdddde.d.c...', inst: 1, groove: 'disco' },
  ] },
  { id: 'twinkle', name: 'Starry Garden', tempo: 0, pages: [
    { lead: 'c.e.G...A.G.e...', inst: 0, groove: 'lullaby', low: 'g.......a.......', lowInst: 3 },
    { lead: 'd.e.d.c.a.c.d...', inst: 0, groove: 'lullaby', low: 'g.......g.......', lowInst: 3 },
    { lead: 'c.e.G...C.A.G...', inst: 0, groove: 'lullaby', low: 'g.......a.......', lowInst: 3 },
    { lead: 'e.d.c.a.g.a.c...', inst: 0, groove: 'lullaby', low: 'c...............', lowInst: 3 },
  ] },
  { id: 'surprise', name: 'Surprise!' },
];
const RHYTHMS = ['x.x.x.x.x.x.x...', 'x.x.xx..x.x.x...', 'x..x..x.x.x.x...', 'x.xxx.x.x.xxx...', 'x...x.x.x...x.x.', 'xx.x.x..xx.x.x..'];

// --- layout (1920 x 1080) ---------------------------------------------------
const GX = 214, CW = 88, GY = 132, RH = 60, DGAP = 16, DH = 52;
const rowY = (R) => (R < NP ? GY + R * RH : GY + NP * RH + DGAP + (R - NP) * DH);   // top of a row
const rowH = (R) => (R < NP ? RH : DH);
const rowMid = (R) => rowY(R) + rowH(R) / 2;
const colX = (c) => GX + c * CW;
const GRID_R = GX + STEPS * CW;                     // 1622
const GRID_B = rowY(NROWS - 1) + DH;                // 784
const PANEL = { x: 22, y: GY - 14, w: GRID_R + 14 - 22, h: GRID_B + 14 - (GY - 14) };
const LEGEND = { x: 1650, y: GY - 14, w: 248, h: PANEL.h };
const SINGER_X = 120;
const STAGE_Y = 812, FEET_Y = 1064;
const TBY = 16, TBH = 84;
const TB = [
  { id: 'songs', x: 22, w: 236 },
  { id: 'groove', x: 272, w: 262 },
  ...[0, 1, 2, 3].map((k) => ({ id: 'page', page: k, x: 556 + k * 110, w: 98 })),
  { id: 'tempo', x: 1014, w: 280 },
  { id: 'clear', x: 1308, w: 196 },
  { id: 'concert', x: 1560, w: 338 },
];
const isDrumRow = (R) => R >= NP;
const pitchOf = (R) => NP - 1 - R;                  // display row -> pitch index (top row = highest)
const rowOfPitch = (pi) => NP - 1 - pi;
const rowColor = (R) => (R < NP ? PITCHES[pitchOf(R)].color : DRUMS[R - NP].color);

function lighten(hex, k) {
  const v = parseInt(hex.slice(1), 16), r = (v >> 16) & 255, gg = (v >> 8) & 255, b = v & 255;
  return `rgb(${Math.round(r + (255 - r) * k)},${Math.round(gg + (255 - gg) * k)},${Math.round(b + (255 - b) * k)})`;
}
const ROW_TINT = Array.from({ length: NROWS }, (_, R) => lighten(rowColor(R), 0.78));
const ROW_DOT = Array.from({ length: NROWS }, (_, R) => lighten(rowColor(R), 0.35));
const snd = (key, fallback, opts) => (hasSound(key) ? sfx(key, opts) : fallback && sfx(fallback, opts));

// --- synth voices -------------------------------------------------------------
// Each voice takes (ac, out, ...) so it also works in an OfflineAudioContext
// (exported for level checks). Times are absolute AudioContext seconds.
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let noiseBuf = null;
function noiseBuffer(ac) {
  if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function env(gn, t, vol, a, hold, d) {
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
  if (hold > 0) gn.gain.setValueAtTime(Math.max(0.0002, vol), t + a + hold);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + d);
}
function osc(ac, out, type, f, t, vol, a, d, o = {}) {
  const os = ac.createOscillator(), gn = ac.createGain();
  os.type = type; os.frequency.setValueAtTime(f, t);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || 0.12));
  if (o.detune) os.detune.value = o.detune;
  env(gn, t, vol, a, o.hold || 0, d);
  let node = os;
  if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; os.connect(fl); node = fl; }
  node.connect(gn); gn.connect(out);
  os.start(t); os.stop(t + a + (o.hold || 0) + d + 0.05);
}
function noiseHit(ac, out, t, vol, a, d, type, f, q = 1) {
  const s = ac.createBufferSource(); s.buffer = noiseBuffer(ac); s.loop = true;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const gn = ac.createGain(); env(gn, t, vol, a, 0, d);
  s.connect(fl); fl.connect(gn); gn.connect(out);
  s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.05);
}
function playSample(ac, out, key, rate, t, vol) {
  const buf = soundBuffer(key);
  if (!buf) return false;
  const s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
  const gn = ac.createGain(); gn.gain.value = vol;
  s.connect(gn); gn.connect(out); s.start(t);
  s.stop(t + Math.min(buf.duration / rate, 3));
  return true;
}
function choir(ac, out, f, t, len, vol = 1) {
  const a = 0.05, hold = Math.max(0.16, len * 1.1), rel = 0.3, end = t + a + hold + rel + 0.05;
  const gn = ac.createGain(); env(gn, t, 0.24 * vol, a, hold, rel);
  const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 3.5;
  f1.frequency.setValueAtTime(360, t); f1.frequency.linearRampToValueAtTime(800, t + 0.09);   // "l" opening to "a"
  const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 5; f2.frequency.value = 1220;
  const f2g = ac.createGain(); f2g.gain.value = 0.55;
  const lfo = ac.createOscillator(), lg = ac.createGain();
  lfo.frequency.value = 5.3; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.011, t + 0.3);
  lfo.connect(lg);
  for (const det of [-7, 6]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    lg.connect(o.frequency); o.connect(f1); o.connect(f2); o.start(t); o.stop(end);
  }
  f2.connect(f2g); f1.connect(gn); f2g.connect(gn); gn.connect(out);
  lfo.start(t); lfo.stop(end);
  osc(ac, out, 'sine', f, t, 0.05 * vol, a, rel, { hold });
}
/** One pitched note: inst index, written MIDI pitch, start time, step length (s). */
export function playInst(ac, out, inst, midi, t, len = 0.3, vol = 1) {
  const I = INSTS[inst], m = midi + I.oct;
  if (playSample(ac, out, 'inst/' + I.id, Math.pow(2, (m - I.base) / 12), t, 0.8 * vol)) return;
  const f = mtof(m);
  switch (I.id) {
    case 'bells':
      osc(ac, out, 'sine', f, t, 0.24 * vol, 0.003, 1.5);
      osc(ac, out, 'sine', f * 2.756, t, 0.07 * vol, 0.002, 0.45);
      osc(ac, out, 'sine', f * 5.404, t, 0.03 * vol, 0.001, 0.15);
      osc(ac, out, 'triangle', f * 2, t, 0.035 * vol, 0.002, 0.3);
      break;
    case 'piano':
      osc(ac, out, 'triangle', f, t, 0.3 * vol, 0.004, 1.1);
      osc(ac, out, 'triangle', f, t, 0.13 * vol, 0.004, 0.8, { detune: 8 });
      osc(ac, out, 'sine', f * 2, t, 0.1 * vol, 0.003, 0.45);
      osc(ac, out, 'square', f, t, 0.05 * vol, 0.002, 0.14, { lp: 2400 });
      break;
    case 'marimba':
      osc(ac, out, 'sine', f, t, 0.42 * vol, 0.002, 0.5);
      osc(ac, out, 'sine', f * 3.99, t, 0.1 * vol, 0.001, 0.07);
      osc(ac, out, 'sine', f * 9.9, t, 0.03 * vol, 0.001, 0.025);
      break;
    default: choir(ac, out, f, t, len, vol); break;
  }
}
/** One drum hit: 0 kick, 1 clap, 2 shaker. */
export function playDrum(ac, out, d, t, accent = 1) {
  if (playSample(ac, out, 'inst/' + DRUMS[d].id, 1, t, 0.85 * accent)) return;
  if (d === 0) {
    osc(ac, out, 'sine', 150, t, 0.6 * accent, 0.002, 0.24, { f2: 44, glide: 0.14 });
    noiseHit(ac, out, t, 0.06, 0.001, 0.02, 'highpass', 3000);
  } else if (d === 1) {
    for (let k = 0; k < 3; k++) noiseHit(ac, out, t + k * 0.011, 0.9 * accent, 0.001, 0.018, 'bandpass', 1300, 1.4);
    noiseHit(ac, out, t + 0.032, 0.7 * accent, 0.002, 0.13, 'bandpass', 1150, 1.1);
  } else {
    noiseHit(ac, out, t, 0.2 * accent, 0.012, 0.05, 'highpass', 6200);
  }
}

// --- drawing helpers -------------------------------------------------------------
function rr(g, x, y, w, h, r) { ui.roundRect(g, x, y, w, h, r); }

/** A note in its instrument's shape, centred at 0,0 (s = size). */
function drawNoteShape(g, id, color, s) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = Math.max(2, s * 0.075); g.strokeStyle = NAVY;
  const shine = 'rgba(255,255,255,0.7)';
  switch (id) {
    case 'bells':
      g.beginPath(); g.arc(0, -s * 0.4, s * 0.08, 0, TAU); g.fillStyle = color; g.fill(); g.stroke();
      g.beginPath();
      g.moveTo(-s * 0.46, s * 0.3);
      g.quadraticCurveTo(-s * 0.3, s * 0.22, -s * 0.3, 0);
      g.bezierCurveTo(-s * 0.3, -s * 0.48, s * 0.3, -s * 0.48, s * 0.3, 0);
      g.quadraticCurveTo(s * 0.3, s * 0.22, s * 0.46, s * 0.3);
      g.closePath(); g.fillStyle = color; g.fill(); g.stroke();
      g.beginPath(); g.arc(0, s * 0.37, s * 0.1, 0, TAU); g.fillStyle = '#fff2b8'; g.fill(); g.stroke();
      g.fillStyle = shine; g.beginPath(); g.ellipse(-s * 0.13, -s * 0.12, s * 0.06, s * 0.15, 0.25, 0, TAU); g.fill();
      break;
    case 'piano':
      rr(g, -s * 0.36, -s * 0.42, s * 0.72, s * 0.84, s * 0.14); g.fillStyle = color; g.fill(); g.stroke();
      rr(g, -s * 0.12, -s * 0.42, s * 0.24, s * 0.4, s * 0.06); g.fillStyle = NAVY; g.fill();
      g.fillStyle = shine; rr(g, -s * 0.28, -s * 0.02, s * 0.1, s * 0.34, s * 0.05); g.fill();
      break;
    case 'marimba':
      rr(g, -s * 0.48, -s * 0.22, s * 0.96, s * 0.44, s * 0.14); g.fillStyle = color; g.fill(); g.stroke();
      g.fillStyle = NAVY;
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * s * 0.32, 0, s * 0.055, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = s * 0.05;
      g.beginPath(); g.moveTo(-s * 0.18, -s * 0.09); g.lineTo(s * 0.18, -s * 0.09); g.stroke();
      break;
    default: { // choir: a round face singing "la"
      g.beginPath(); g.arc(0, 0, s * 0.42, 0, TAU); g.fillStyle = color; g.fill(); g.stroke();
      g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.06);
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * s * 0.15, -s * 0.06, s * 0.07, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      g.beginPath(); g.ellipse(0, s * 0.17, s * 0.1, s * 0.12, 0, 0, TAU); g.fillStyle = NAVY; g.fill();
      g.beginPath(); g.ellipse(0, s * 0.22, s * 0.06, s * 0.04, 0, 0, TAU); g.fillStyle = '#ff7aa8'; g.fill();
      g.fillStyle = 'rgba(255,120,170,0.55)';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * s * 0.27, s * 0.08, s * 0.07, s * 0.045, 0, 0, TAU); g.fill(); }
      g.fillStyle = shine; g.beginPath(); g.ellipse(-s * 0.18, -s * 0.24, s * 0.09, s * 0.05, -0.6, 0, TAU); g.fill();
    }
  }
}

/** Drum-lane note shapes: 0 kick drum, 1 clapping hands, 2 shaker. */
function drawDrumShape(g, d, s) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = Math.max(2, s * 0.07); g.strokeStyle = NAVY;
  const c = DRUMS[d].color;
  if (d === 0) {
    g.fillStyle = c; rr(g, -s * 0.4, -s * 0.2, s * 0.8, s * 0.48, s * 0.08); g.fill(); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = s * 0.05; g.beginPath();
    for (let k = 0; k <= 4; k++) { const x = -s * 0.32 + k * s * 0.16; g.lineTo(x, k % 2 ? s * 0.2 : -s * 0.12); }
    g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.07);
    g.beginPath(); g.ellipse(0, -s * 0.2, s * 0.4, s * 0.12, 0, 0, TAU); g.fillStyle = '#fff4e0'; g.fill(); g.stroke();
  } else if (d === 1) {
    g.save(); g.fillStyle = lighten(c, 0.35);
    g.beginPath();
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, r = k % 2 ? s * 0.28 : s * 0.46; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
    for (const sx of [-1, 1]) {
      g.save(); g.translate(sx * s * 0.09, s * 0.04); g.rotate(sx * 0.32);
      rr(g, -s * 0.11, -s * 0.3, s * 0.22, s * 0.52, s * 0.11); g.fillStyle = '#ffd3ad'; g.fill(); g.stroke();
      g.restore();
    }
    g.restore();
  } else {
    g.fillStyle = '#c98a4b'; rr(g, -s * 0.06, s * 0.05, s * 0.12, s * 0.4, s * 0.05); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.25, s * 0.3, 0, 0, TAU); g.fillStyle = c; g.fill(); g.stroke();
    g.fillStyle = '#fff';
    for (const [x, y] of [[-0.08, -0.22], [0.1, -0.1], [-0.06, 0.02], [0.08, -0.3]]) { g.beginPath(); g.arc(x * s, y * s, s * 0.045, 0, TAU); g.fill(); }
  }
}

// Notes are pre-rendered at 2x (the canvas can be drawn at up to 2x) and
// reused. Optional art (prop/melody-note-<inst>, drawn light grey) is tinted
// to the row colour.
const spriteCache = new Map();
function tintedArt(key, color) {
  const img = art(key);
  if (!img) return null;
  const id = key + color;
  let c = spriteCache.get(id);
  if (!c) {
    c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0);
    spriteCache.set(id, c);
  }
  return c;
}
function noteSprite(kind, idx, color, size) {
  const artKey = kind === 'drum' ? 'prop/melody-' + DRUMS[idx].id : 'prop/melody-note-' + INSTS[idx].id;
  const hasA = !!art(artKey);
  const key = `${kind}:${idx}:${color}:${size}:${hasA}`;
  let c = spriteCache.get(key);
  if (c) return c;
  const px = Math.ceil(size * 1.25) * 2;
  c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d');
  x.translate(px / 2, px / 2); x.scale(2, 2);
  if (hasA) {
    const img = kind === 'drum' ? art(artKey) : tintedArt(artKey, color);
    const k = Math.min(size / img.width, size / img.height);
    x.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
  } else if (kind === 'drum') drawDrumShape(x, idx, size);
  else drawNoteShape(x, INSTS[idx].id, color, size);
  spriteCache.set(key, c);
  return c;
}
function blitSprite(g, c, x, y, scale = 1) {
  const w = (c.width / 2) * scale;
  g.drawImage(c, x - w / 2, y - w / 2, w, w);
}

/** Instrument badge icons (bells, piano keys, marimba, singing face). */
function drawInstIcon(g, inst, x, y, s) {
  const I = INSTS[inst];
  if (drawArt(g, 'icon/inst-' + I.id, x, y, s * 1.2, s * 1.2)) return;
  g.save(); g.translate(x, y);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.07);
  switch (I.id) {
    case 'bells':
      g.fillStyle = '#c98a4b'; rr(g, -s * 0.06, -s * 0.5, s * 0.12, s * 0.22, s * 0.05); g.fill(); g.stroke();
      g.translate(0, s * 0.06); drawNoteShape(g, 'bells', '#ffd23f', s * 0.82);
      break;
    case 'piano': {
      g.fillStyle = '#fff'; rr(g, -s * 0.46, -s * 0.3, s * 0.92, s * 0.6, s * 0.08); g.fill(); g.stroke();
      g.lineWidth = Math.max(1.5, s * 0.04);
      for (let k = 1; k < 4; k++) { const xx = -s * 0.46 + k * s * 0.23; g.beginPath(); g.moveTo(xx, -s * 0.3); g.lineTo(xx, s * 0.3); g.stroke(); }
      g.fillStyle = NAVY;
      for (const k of [1, 2, 3]) rr(g, -s * 0.46 + k * s * 0.23 - s * 0.055, -s * 0.3, s * 0.11, s * 0.34, s * 0.03), g.fill();
      break;
    }
    case 'marimba': {
      const cols = ['#ff5a6e', '#ffd23f', '#6fdc5a', '#3fa7ff'];
      cols.forEach((c, k) => { g.fillStyle = c; rr(g, -s * 0.46 + k * s * 0.24, -s * 0.36 + k * s * 0.06, s * 0.2, s * 0.72 - k * s * 0.12, s * 0.06); g.fill(); g.stroke(); });
      g.strokeStyle = '#8b5a3c'; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(s * 0.1, -s * 0.5); g.lineTo(s * 0.5, s * 0.1); g.stroke();
      g.fillStyle = '#ff6fd0'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.05); g.beginPath(); g.arc(s * 0.1, -s * 0.5, s * 0.1, 0, TAU); g.fill(); g.stroke();
      break;
    }
    default:
      drawNoteShape(g, 'choir', '#ff9fd0', s * 0.95);
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(s * 0.42, -s * 0.12, s * 0.08, s * 0.06, -0.4, 0, TAU); g.fill();
      g.fillRect(s * 0.47, -s * 0.48, s * 0.04, s * 0.36);
  }
  g.restore();
}

function drawTortoise(g, x, y, s, on = true) {
  if (drawArt(g, 'icon/tortoise', x, y, s * 1.2, s * 1.2, { alpha: on ? 1 : 0.5 })) return;
  g.save(); g.translate(x, y); g.globalAlpha *= on ? 1 : 0.5;
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.06);
  g.fillStyle = '#8fd17a';
  for (const fx2 of [-0.24, 0.2]) { g.beginPath(); g.ellipse(fx2 * s, s * 0.22, s * 0.09, s * 0.08, 0, 0, TAU); g.fill(); g.stroke(); }
  g.beginPath(); g.arc(s * 0.4, -s * 0.02, s * 0.13, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(s * 0.45, -s * 0.05, s * 0.03, 0, TAU); g.fill();
  g.fillStyle = '#3fae5a'; g.beginPath(); g.moveTo(-s * 0.4, s * 0.17); g.bezierCurveTo(-s * 0.4, -s * 0.36, s * 0.32, -s * 0.36, s * 0.32, s * 0.17); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = s * 0.04;
  g.beginPath(); g.moveTo(-s * 0.18, s * 0.15); g.lineTo(-s * 0.08, -s * 0.12); g.lineTo(s * 0.1, -s * 0.12); g.lineTo(s * 0.18, s * 0.15); g.stroke();
  g.restore();
}
function drawHare(g, x, y, s, on = true) {
  if (drawArt(g, 'icon/hare', x, y, s * 1.2, s * 1.2, { alpha: on ? 1 : 0.5 })) return;
  g.save(); g.translate(x, y); g.globalAlpha *= on ? 1 : 0.5;
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.06); g.fillStyle = '#f3eeff';
  for (const [ex, rot] of [[0.18, -0.25], [0.32, 0.15]]) { g.save(); g.translate(ex * s, -s * 0.2); g.rotate(rot); g.beginPath(); g.ellipse(0, -s * 0.18, s * 0.07, s * 0.22, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  g.beginPath(); g.arc(-s * 0.36, s * 0.08, s * 0.09, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-s * 0.06, s * 0.1, s * 0.3, s * 0.2, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(s * 0.26, -s * 0.06, s * 0.15, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(s * 0.3, -s * 0.09, s * 0.03, 0, TAU); g.fill();
  g.fillStyle = '#ff8fb8'; g.beginPath(); g.arc(s * 0.4, -s * 0.03, s * 0.035, 0, TAU); g.fill();
  g.restore();
}

/** Two beamed eighth notes (the Songs button). */
function drawMusicNotes(g, x, y, s, color = '#ff6fd0') {
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = color; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.06);
  g.beginPath(); g.moveTo(-s * 0.18, s * 0.22); g.lineTo(-s * 0.18, -s * 0.32); g.lineTo(s * 0.34, -s * 0.42); g.lineTo(s * 0.34, s * 0.12);
  g.lineWidth = s * 0.14; g.strokeStyle = NAVY; g.stroke();
  g.lineWidth = s * 0.07; g.strokeStyle = color; g.stroke();
  g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = NAVY;
  for (const [nx, ny] of [[-0.3, 0.24], [0.22, 0.14]]) { g.beginPath(); g.ellipse(nx * s, ny * s, s * 0.16, s * 0.12, -0.4, 0, TAU); g.fill(); g.stroke(); }
  g.restore();
}

/** A singing flower (one per pitch row). sing 0..1 = how fresh the last note is. */
function drawFlower(g, x, y, r, color, sing, t, k, blink = false) {
  g.save(); g.translate(x, y);
  g.rotate(Math.sin(t * 1.8 + k * 0.9) * 0.07 + sing * 0.16 * Math.sin(t * 18 + k));
  const sc = 1 + sing * 0.22; g.scale(sc, sc);
  const key = `prop/melody-flower-${k + 1}`;
  if ((sing > 0.15 && drawArt(g, key + '-sing', 0, 0, r * 2.4, r * 2.4)) || drawArt(g, key, 0, 0, r * 2.4, r * 2.4)) { g.restore(); return; }
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + k * 0.4;
    g.beginPath(); g.arc(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, r * 0.44, 0, TAU);
    g.fillStyle = i % 2 ? color : lighten(color, 0.3); g.fill(); g.stroke();
  }
  g.beginPath(); g.arc(0, 0, r * 0.6, 0, TAU); g.fillStyle = '#fff3cf'; g.fill(); g.stroke();
  g.fillStyle = NAVY; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.08); g.lineCap = 'round';
  if (sing > 0.15 || blink) {
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * r * 0.22, -r * 0.08, r * 0.1, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  } else {
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * r * 0.22, -r * 0.1, r * 0.075, r * 0.1, 0, 0, TAU); g.fill(); }
  }
  if (sing > 0.1) {
    g.beginPath(); g.ellipse(0, r * 0.22, r * 0.14, r * (0.08 + 0.12 * sing), 0, 0, TAU); g.fill();
  } else {
    g.beginPath(); g.arc(0, r * 0.12, r * 0.16, 0.2, Math.PI - 0.2); g.stroke();
  }
  g.fillStyle = 'rgba(255,120,170,0.5)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * r * 0.38, r * 0.12, r * 0.1, r * 0.06, 0, 0, TAU); g.fill(); }
  g.restore();
}

const emptyPage = () => ({ cells: Array.from({ length: NROWS }, () => Array(STEPS).fill(null)), groove: 0 });
const clonePage = (pg) => ({ cells: pg.cells.map((row) => row.slice()), groove: pg.groove });

// =============================================================================
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.cpuOnly = this.players.every((p) => p.isAI);
    this.t = 0;
    this.phase = 'edit';
    this.pages = Array.from({ length: NPAGES }, emptyPage);
    this.page = 0;
    this.tempo = 1;
    this.flip = null;
    this.hit = new Float64Array(NPAGES * NROWS * STEPS).fill(-9);
    this.sing = new Float64Array(NROWS).fill(-9);
    this.ghosts = [];
    this.sparkleQ = [];
    this.events = [];
    this.seq = { step: 0, nextAt: 0, src: null, col: -1, colAt: 0, beatPulse: 0, last: null };
    this.fakeT = 0;
    this.ac = audioCtx();
    this.bus = this.ac ? sfxInput(0.9) : null;
    this.previewBus = null;
    this.pointerPaint = null;
    this.stations = this.players.map((p, i) => this.makeStation(p, i));
    this.layoutActors();
    const owner = this.players.find((p) => !p.isAI) || this.players[0];
    this.picker = { owner, sel: 1, t: 0, first: true };
    this.cpuScript = { groove: false, page2: false, tempo: false, concert: false, y2: false };
    sfx('magic');
  }

  makeStation(p, i) {
    const st = {
      p, i, R: 2 + (i % 4) * 2, col: (1 + i * 4) % STEPS, tb: 0, inst: i % INSTS.length, paint: null,
      hist: [], placed: 0, confirm: null, instPop: 0, ai: { plan: [], wait: 0, idle: rand(2, 4) },
    };
    if (st.R >= NP) st.R = NP - 1;
    st.actor = new Actor(p, { facing: 1 });
    return st;
  }

  layoutActors() {
    const n = this.n, sp = Math.min(300, 1640 / n);
    this.stations.forEach((st, i) => {
      const a = st.actor;
      a.scale = 1; a.scale = Math.min((n <= 4 ? 165 : 138) / a.leader.h, (sp * 0.8) / Math.max(1, a.width));
      a.x = W / 2 + (i - (n - 1) / 2) * sp; a.y = FEET_Y; a.facing = a.x < W / 2 ? 1 : -1;
      a.snap();
      st.home = { x: a.x, y: a.y, s: a.scale };
    });
  }

  // --- audio clock ---------------------------------------------------------
  get stepDur() { return 60 / TEMPOS[this.tempo].bpm / 2; }
  audioOn() {
    if (!this.ac && !this.dead) { this.ac = audioCtx(); if (this.ac) this.bus = sfxInput(0.9); }
    return !!(this.ac && this.bus && this.ac.state === 'running');
  }
  clock() { return this.audioOn() ? ['ac', this.ac.currentTime] : ['dt', this.fakeT]; }

  /** Which page/column a sequencer step plays (edit: the page on screen; concert: the song). */
  stepEvent(step) {
    if (this.phase === 'concert') {
      const C = this.concert, L = C.song.length, k = Math.floor(step / STEPS);
      return { page: C.song[k % L], col: step % STEPS, pass: Math.floor(k / L), songPos: k % L, end: k >= L * C.passes };
    }
    return { page: this.page, col: step % STEPS };
  }

  tickSequencer(dt) {
    this.fakeT += dt;
    const S = this.seq, [src, now] = this.clock();
    if (src !== S.src) { S.src = src; S.nextAt = now + 0.06; }
    if (S.nextAt < now - 0.25) S.nextAt = now + 0.04;      // resume after a pause / stall
    if (!S.stopped) {
      while (S.nextAt < now + 0.12) {
        const ev = this.stepEvent(S.step);
        ev.at = S.nextAt; ev.idx = S.step;
        if (ev.end) { S.stopped = true; this.events.push(ev); break; }
        if (src === 'ac') this.scheduleStep(ev, S.nextAt);
        this.events.push(ev);
        S.step++; S.nextAt += this.stepDur;
      }
    }
    while (this.events.length && this.events[0].at <= now) this.onStep(this.events.shift());
    if (S.last) S.frac = clamp((now - S.last.at) / this.stepDur, 0, 1);
  }

  scheduleStep(ev, t) {
    const pg = this.pages[ev.page], len = this.stepDur;
    for (let R = 0; R < NROWS; R++) {
      const cell = pg.cells[R][ev.col];
      if (!cell) continue;
      if (R < NP) playInst(this.ac, this.bus, cell.inst, PITCHES[pitchOf(R)].midi, t, len, 0.85);
      else playDrum(this.ac, this.bus, R - NP, t, ev.col % 4 === 0 ? 1 : 0.8);
    }
  }

  /** Visual side of a step, when its sound plays. */
  onStep(ev) {
    const S = this.seq;
    if (ev.end) { this.endConcert(); return; }
    S.last = ev; S.col = ev.col;
    const pg = this.pages[ev.page];
    if (ev.col % 2 === 0) {
      S.beatPulse = 1;
      for (const st of this.stations) if (this.phase === 'concert' || this.dancing) st.actor.squash(ev.col % 8 === 0 ? 0.16 : 0.09);
    }
    let parts = 0;
    for (let R = 0; R < NROWS; R++) {
      const cell = pg.cells[R][ev.col];
      if (!cell) continue;
      this.hit[(ev.page * NROWS + R) * STEPS + ev.col] = this.t;
      this.sing[R] = this.t;
      if (this.phase === 'edit' && ev.page === this.page && R < NP && parts < 3 && chance(0.6)) {
        parts++;
        particles.burst(colX(ev.col) + CW / 2, rowMid(R) - 10, { type: 'note', count: 1, colors: [rowColor(R)], speed: [40, 120] });
      }
      const owner = this.stations[cell.owner];
      if (owner && R < NP && this.phase === 'edit') owner.actor.squash(0.06);
    }
    if (this.phase === 'concert') this.concertStep(ev);
  }

  // --- editing -----------------------------------------------------------------
  cell(page, R, col) { return this.pages[page].cells[R][col]; }

  /** Change cells as one undoable action. changes: [{ R, col, v }] on `page`. */
  applyCells(st, page, changes, { record = true } = {}) {
    const pg = this.pages[page], rec = [];
    for (const ch of changes) {
      const before = pg.cells[ch.R][ch.col];
      if (before === ch.v) continue;
      if (before && !ch.v) this.ghosts.push({ page, R: ch.R, col: ch.col, cell: before, t: 0 });
      pg.cells[ch.R][ch.col] = ch.v;
      rec.push({ R: ch.R, col: ch.col, before, after: ch.v });
    }
    if (record && st && rec.length) this.pushHist(st, { type: 'cells', page, list: rec });
    return rec.length;
  }
  pushHist(st, h) { st.hist.push(h); if (st.hist.length > 40) st.hist.shift(); }

  newCell(st, R) { return { inst: R < NP ? st.inst : 0, owner: st.i, born: this.t }; }

  /** Play a note right now (feedback when placing). */
  preview(R, inst, vol = 1) {
    if (!this.audioOn()) return;
    const t = this.ac.currentTime + 0.01;
    if (R < NP) playInst(this.ac, this.bus, inst, PITCHES[pitchOf(R)].midi, t, this.stepDur, vol);
    else playDrum(this.ac, this.bus, R - NP, t, vol);
  }

  /** A pressed on a cell (or pointer click): add or remove. Returns 'on' / 'off'. */
  toggle(st, R, col, mode = null) {
    const cur = this.cell(this.page, R, col);
    const want = mode || (cur ? 'off' : 'on');
    if ((want === 'on') === !!cur) return want;
    const x = colX(col) + CW / 2, y = rowMid(R), color = rowColor(R);
    if (want === 'on') {
      this.applyCells(st, this.page, [{ R, col, v: this.newCell(st, R) }]);
      st.placed++;
      this.preview(R, st.inst);
      particles.burst(x, y, { type: 'sparkle', count: 6, colors: [color, '#fff'], speed: [80, 220] });
      particles.ring(x, y, color, 70, 0.3);
      st.actor.playOnce('action', 0.3);
    } else {
      this.applyCells(st, this.page, [{ R, col, v: null }]);
      sfx('bubble', { vol: 0.5 });
      particles.burst(x, y, { type: 'smoke', count: 3, speed: [30, 90], colors: [lighten(color, 0.5)] });
    }
    return want;
  }

  undo(st) {
    const h = st.hist.pop();
    if (!h) { sfx('blip'); return; }
    if (h.type === 'cells') {
      const pg = this.pages[h.page];
      for (const c of h.list) if (pg.cells[c.R][c.col] === c.after) {
        if (c.after && !c.before) this.ghosts.push({ page: h.page, R: c.R, col: c.col, cell: c.after, t: 0 });
        pg.cells[c.R][c.col] = c.before;
      }
      if (h.page !== this.page) this.setPage(h.page, null);
    } else if (h.type === 'page') {
      this.pages[h.page] = h.before;
      if (h.page !== this.page) this.setPage(h.page, null);
    } else if (h.type === 'song') {
      this.pages = h.before; this.tempo = h.tempo;
    }
    sfx('back');
    const p = this.cursorXY(st);
    particles.burst(p.x, p.y, { type: 'smoke', count: 5, speed: [40, 120] });
    st.undoAt = this.t;
  }

  setPage(k, st, dir = 0) {
    k = clamp(k, 0, NPAGES - 1);
    if (k === this.page) return;
    this.flip = { t: 0, dir: dir || Math.sign(k - this.page) };
    this.page = k;
    sfx('flip');
    if (st) particles.popText(colX(STEPS / 2), GY + 40, `Page ${k + 1}`, '#ffd23f', 54);
  }

  cycleInst(st) {
    st.inst = (st.inst + 1) % INSTS.length;
    st.instPop = 1;
    const R = st.R >= 0 && st.R < NP ? st.R : rowOfPitch(2);
    this.preview(R, st.inst);
    const p = this.cursorXY(st);
    particles.popText(p.x, p.y - 50, INSTS[st.inst].name, st.p.color, 44);
    particles.burst(p.x, p.y, { type: 'note', count: 3, colors: [INSTS[st.inst].color], speed: [60, 160] });
  }

  setGroove(st, gi) {
    const before = clonePage(this.pages[this.page]);
    const pg = this.pages[this.page], gr = GROOVES[gi];
    pg.groove = gi;
    for (let d = 0; d < ND; d++) {
      const pat = [gr.k, gr.c, gr.s][d];
      for (let c = 0; c < STEPS; c++) pg.cells[NP + d][c] = pat[c] === 'x' ? { inst: 0, owner: st ? st.i : -1, born: this.t + c * 0.015 } : null;
    }
    if (st) this.pushHist(st, { type: 'page', page: this.page, before });
    sfx('swap'); playDrumNow(this, 0); playDrumNow(this, 1);
    particles.popText(colX(STEPS / 2), rowY(NP) - 8, gr.name, '#ffd23f', 50);
    for (let c = 0; c < STEPS; c += 2) particles.burst(colX(c) + CW / 2, rowMid(NP + 1), { type: 'sparkle', count: 1, colors: ['#fff', '#ffe066'] });
  }

  setTempo(k) {
    this.tempo = (k + TEMPOS.length) % TEMPOS.length;
    sfx(this.tempo === 0 ? 'shrink' : this.tempo === 2 ? 'grow' : 'swap');
    const b = TB.find((x) => x.id === 'tempo');
    particles.popText(b.x + b.w / 2, TBY + TBH + 34, TEMPOS[this.tempo].name, '#ffd23f', 40);
  }

  clearPage(st) {
    const before = clonePage(this.pages[this.page]);
    for (let R = 0; R < NROWS; R++) for (let c = 0; c < STEPS; c++) {
      const cell = this.pages[this.page].cells[R][c];
      if (cell) this.ghosts.push({ page: this.page, R, col: c, cell, t: 0 });
    }
    this.pages[this.page] = emptyPage();
    if (st) this.pushHist(st, { type: 'page', page: this.page, before });
    sfx('whoosh');
    for (let k = 0; k < 8; k++) particles.burst(rand(GX, GRID_R), rand(GY, GRID_B), { type: 'smoke', count: 2, speed: [40, 140] });
  }

  /** Write a little surprise tune on `page` (and a groove if its drums are empty). */
  surprisePage(page, st, { drums = true, inst = null, end = 'home' } = {}) {
    const pg = this.pages[page], owner = st ? st.i : -1;
    const lead = inst ?? (st ? st.inst : pick([0, 1, 0]));
    const rhythm = pick(RHYTHMS);
    let pi = pick([2, 3, 4, 5]);
    const onsets = [...rhythm].map((ch, c) => (ch === 'x' ? c : -1)).filter((c) => c >= 0);
    const list = [];
    onsets.forEach((c, k) => {
      if (k === onsets.length - 1) pi = end === 'home' ? (pi > 4 ? 7 : 2) : pick([3, 5]);   // an open ending, or land on a home note
      list.push({ R: rowOfPitch(pi), col: c, v: { inst: lead, owner, born: this.t + k * 0.05 } });
      let next = pi + pick([-2, -1, -1, 1, 1, 2, 0]);
      if (next < 1 || next > 7) next = pi - Math.sign(next - pi || 1);
      pi = clamp(next, 1, 7);
    });
    // a soft low note on each bar's downbeat (marimba or choir)
    const lowInst = lead === 2 ? 3 : 2;
    for (const c of [0, 8]) {
      const lp = pick([0, 1, 2].filter((q) => !list.some((n) => n.col === c && n.R === rowOfPitch(q))));
      if (lp !== undefined && chance(0.8)) list.push({ R: rowOfPitch(lp), col: c, v: { inst: lowInst, owner, born: this.t } });
    }
    const before = clonePage(pg);
    for (let R = 0; R < NP; R++) for (let c = 0; c < STEPS; c++) pg.cells[R][c] = null;
    for (const n of list) pg.cells[n.R][n.col] = n.v;
    const hasDrums = pg.cells.slice(NP).some((row) => row.some(Boolean));
    if (drums && !hasDrums) {
      const save = this.page; this.page = page;
      this.setGroove(null, pick([1, 1, 2, 4, 5]));
      this.page = save;
    }
    if (st) this.pushHist(st, { type: 'page', page, before });
    return list.length;
  }

  /** Y: sparkle a 4-note phrase from the cursor (or a whole tune on an empty page). */
  sparkle(st) {
    const pg = this.pages[this.page];
    const notes = pg.cells.slice(0, NP).reduce((a, row) => a + row.filter(Boolean).length, 0);
    const p = this.cursorXY(st);
    sfx('magic');
    particles.burst(p.x, p.y, { type: 'star', count: 8, speed: [120, 320] });
    if (notes < 3) {
      this.surprisePage(this.page, st);
      st.placed += 8;
      fx.flash('#ffffff', 0.15);
      for (let c = 0; c < STEPS; c++) for (let R = 0; R < NP; R++) if (pg.cells[R][c]) this.sparkleQ.push({ at: this.t + c * 0.035, R, col: c, quiet: true });
      st.actor.playOnce('cheer', 0.6);
      return;
    }
    let pi = st.R >= 0 && st.R < NP ? pitchOf(st.R) : 4;
    const c0 = st.R >= 0 ? st.col : 0, offs = pick([[0, 1, 2, 4], [0, 2, 3, 4], [0, 1, 2, 3], [0, 2, 4, 6]]);
    let dir = pi >= 6 ? -1 : pi <= 1 ? 1 : pick([-1, 1]);
    const ch = [];
    offs.forEach((o, k) => {
      if (k) { pi += dir * pick([1, 1, 2]); if (pi < 0 || pi > 7) { dir = -dir; pi = clamp(pi, 0, 7); } }
      const col = (c0 + o) % STEPS, R = rowOfPitch(pi);
      if (!pg.cells[R][col]) ch.push({ R, col, v: { inst: st.inst, owner: st.i, born: this.t + k * 0.09 } });
    });
    if (!ch.length) { sfx('blip'); return; }
    this.applyCells(st, this.page, ch);
    st.placed += ch.length;
    ch.forEach((n, k) => this.sparkleQ.push({ at: this.t + k * 0.09, R: n.R, col: n.col, inst: st.inst }));
    st.actor.playOnce('cheer', 0.5);
  }

  loadPreset(i, st) {
    const P = PRESETS[i], before = this.pages.map(clonePage);
    if (st) this.pushHist(st, { type: 'song', before, tempo: this.tempo });
    this.pages = Array.from({ length: NPAGES }, emptyPage);
    if (P.id === 'surprise') {
      // A then A': the same tune twice, the first time ending "open", the second time home.
      this.surprisePage(0, null, { inst: pick([0, 1, 2]), end: 'open' });
      const p1 = this.pages[1] = clonePage(this.pages[0]);
      let last = -1;
      for (let c = 0; c < STEPS; c++) for (let R = 0; R < NP; R++) if (p1.cells[R][c] && p1.cells[R][c].inst !== 2) last = c;
      if (last >= 0) for (let R = 0; R < NP; R++) {
        const cell = p1.cells[R][last];
        if (!cell || cell.inst === 2) continue;
        p1.cells[R][last] = null;
        p1.cells[rowOfPitch(pitchOf(R) > 4 ? 7 : 2)][last] = cell;
      }
    } else if (P.pages) {
      P.pages.forEach((spec, k) => {
        const pg = this.pages[k];
        const put = (str, inst) => [...str].forEach((ch, c) => { if (NOTE_OF[ch] !== undefined) pg.cells[rowOfPitch(NOTE_OF[ch])][c] = { inst, owner: -1, born: this.t + c * 0.03 }; });
        put(spec.lead, spec.inst);
        if (spec.low) put(spec.low, spec.lowInst);
        const gi = GROOVE[spec.groove] || 0, gr = GROOVES[gi];
        pg.groove = gi;
        [gr.k, gr.c, gr.s].forEach((pat, d) => { for (let c = 0; c < STEPS; c++) pg.cells[NP + d][c] = pat[c] === 'x' ? { inst: 0, owner: -1, born: this.t } : null; });
      });
      this.tempo = P.tempo ?? 1;
    }
    this.page = 0; this.flip = { t: 0, dir: 1 };
    this.seq.step = 0; this.seq.nextAt = this.clock()[1] + 0.25; this.events = [];
  }

  // --- cursor movement -------------------------------------------------------
  tbIndexNear(x) {
    let best = 0, bd = 1e9;
    TB.forEach((b, i) => { const d = Math.abs(b.x + b.w / 2 - x); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  cursorXY(st) {
    if (st.R < 0) { const b = TB[st.tb]; return { x: b.x + b.w / 2, y: TBY + TBH / 2 }; }
    return { x: colX(st.col) + CW / 2, y: rowMid(st.R) };
  }

  moveCursor(st, dx, dy) {
    let moved = false;
    if (dy) {
      if (st.R === -1) {
        if (dy > 0) { const b = TB[st.tb]; st.R = 0; st.col = clamp(Math.floor((b.x + b.w / 2 - GX) / CW), 0, STEPS - 1); moved = true; }
      } else {
        const nr = st.R + dy;
        if (nr < 0) { st.R = -1; st.tb = this.tbIndexNear(colX(st.col) + CW / 2); moved = true; }
        else if (nr < NROWS) { st.R = nr; moved = true; }
      }
    } else if (dx) {
      if (st.R === -1) {
        const nt = st.tb + dx;
        if (nt >= 0 && nt < TB.length) { st.tb = nt; moved = true; }
      } else {
        const nc = st.col + dx;
        if (nc >= 0 && nc < STEPS) { st.col = nc; moved = true; }
        else if (nc < 0 && this.page > 0) { this.setPage(this.page - 1, st, -1); st.col = STEPS - 1; moved = true; }
        else if (nc >= STEPS && this.page < NPAGES - 1) { this.setPage(this.page + 1, st, 1); st.col = 0; moved = true; }
      }
    }
    if (moved) {
      if (!st.p.isAI) sfx('tick', { vol: 0.6 });
      st.confirm = null;
      if (st.paint && st.R >= 0 && st.p.ctrl.held('a')) this.toggle(st, st.R, st.col, st.paint);
    } else if (!st.p.isAI) sfx('tock', { vol: 0.5 });
  }

  pressToolbar(st, b) {
    switch (b.id) {
      case 'songs': this.picker = { owner: st.p, sel: 0, t: 0, first: false }; sfx('select'); break;
      case 'groove': this.setGroove(st, (this.pages[this.page].groove + 1) % GROOVES.length); break;
      case 'page': this.setPage(b.page, st); break;
      case 'tempo': this.setTempo(this.tempo + 1); break;
      case 'clear': st.confirm = { kind: 'clear', t: 0 }; sfx('select'); break;
      case 'concert': st.confirm = { kind: 'concert', t: 0 }; sfx('select'); break;
      default: break;
    }
  }

  resolveConfirm(st, yes) {
    const k = st.confirm.kind; st.confirm = null;
    if (!yes) { sfx('back'); return; }
    if (k === 'clear') this.clearPage(st); else this.startConcert();
  }

  updatePlayer(st, dt) {
    const c = st.p.ctrl;
    st.instPop = Math.max(0, st.instPop - dt * 3);
    if (st.confirm) {
      st.confirm.t += dt;
      if (c.pressed('a') && st.confirm.t > 0.05) this.resolveConfirm(st, true);
      else if (c.pressed('b') || c.nav.x || c.nav.y) this.resolveConfirm(st, false);
      return;
    }
    if (c.nav.y) this.moveCursor(st, 0, c.nav.y);
    else if (c.nav.x) this.moveCursor(st, c.nav.x, 0);
    if (c.pressed('a')) {
      if (st.R === -1) this.pressToolbar(st, TB[st.tb]);
      else st.paint = this.toggle(st, st.R, st.col);
    }
    if (!c.held('a')) st.paint = null;
    if (c.pressed('x')) this.cycleInst(st);
    if (c.pressed('y')) this.sparkle(st);
    if (c.pressed('rb')) { if (this.page < NPAGES - 1) this.setPage(this.page + 1, st, 1); else sfx('tock'); }
    if (c.pressed('lb')) { if (this.page > 0) this.setPage(this.page - 1, st, -1); else sfx('tock'); }
    if (c.pressed('b')) this.undo(st);
  }

  // --- pointer (mouse / touch) -------------------------------------------------
  cellAt(x, y) {
    if (x < GX || x >= GRID_R || y < GY || y >= GRID_B) return null;
    const col = Math.floor((x - GX) / CW);
    for (let R = 0; R < NROWS; R++) if (y >= rowY(R) && y < rowY(R) + rowH(R)) return { R, col };
    return null;
  }
  pointerStation() { return this.stations.find((s) => !s.p.isAI) || this.stations[0]; }

  updatePointer() {
    const ptr = input.pointer;
    if (!ptr.seen) return;
    const st = this.pointerStation();
    const hit = this.cellAt(ptr.x, ptr.y);
    if (hit) input.pointerOver({ x: GX, y: GY, w: GRID_R - GX, h: GRID_B - GY });
    if (ptr.pressed) {
      if (hit) {
        st.R = hit.R; st.col = hit.col; st.confirm = null;
        this.pointerPaint = { mode: this.toggle(st, hit.R, hit.col), last: hit.R * STEPS + hit.col };
        return;
      }
      for (let i = 0; i < TB.length; i++) {
        const b = TB[i];
        if (input.clicked({ x: b.x, y: TBY, w: b.w, h: TBH })) { st.R = -1; st.tb = i; this.pressToolbar(st, b); return; }
      }
    } else if (ptr.down && this.pointerPaint && hit) {
      const id = hit.R * STEPS + hit.col;
      if (id !== this.pointerPaint.last) { this.pointerPaint.last = id; st.R = hit.R; st.col = hit.col; this.toggle(st, hit.R, hit.col, this.pointerPaint.mode); }
    }
    if (!ptr.down) this.pointerPaint = null;
    for (const b of TB) input.pointerOver({ x: b.x, y: TBY, w: b.w, h: TBH });
  }

  // --- CPU players -------------------------------------------------------------
  aiUpdate(st, dt) {
    const ai = st.ai, c = st.p.ctrl, prof = aiProfile(st.p);
    if (st.confirm) { ai.wait -= dt; if (ai.wait <= 0) { c.press(st.confirm.kind === 'concert' && !this.cpuOnly ? 'b' : 'a'); ai.wait = 0.5; } return; }
    if (ai.wait > 0) { ai.wait -= dt; return; }
    if (!ai.plan.length) {
      ai.idle -= dt;
      if (ai.idle > 0) return;
      ai.plan = this.cpuOnly ? this.aiPlanSolo(st) : this.aiPlanHelper(st);
      ai.idle = this.cpuOnly ? rand(0.5, 1.6) : rand(6, 11) / (0.6 + prof.speed * 0.4);
      if (!ai.plan.length) ai.idle = rand(1, 2.5);
      return;
    }
    const cmd = ai.plan[0], step = rand(0.12, 0.2) / prof.speed;
    if (cmd.page !== undefined && cmd.page !== this.page) { ai.plan = []; return; }   // someone flipped the page
    switch (cmd.t) {
      case 'goto':
        if (st.R !== cmd.R) { c.press(st.R < cmd.R ? 'down' : 'up'); ai.wait = step; }
        else if (st.col !== cmd.col) { c.press(st.col < cmd.col ? 'right' : 'left'); ai.wait = step; }
        else { ai.plan.shift(); ai.wait = 0.15; }
        break;
      case 'tb':
        if (st.R !== -1) { c.press('up'); ai.wait = step; }
        else if (st.tb !== cmd.i) { c.press(st.tb < cmd.i ? 'right' : 'left'); ai.wait = step; }
        else { ai.plan.shift(); ai.wait = 0.25; }
        break;
      case 'place':   // only ever adds: skip if someone filled the cell meanwhile
        ai.plan.shift();
        if (st.R === cmd.R && st.col === cmd.col && !this.cell(this.page, cmd.R, cmd.col)) { c.press('a'); ai.wait = rand(0.25, 0.5); }
        break;
      case 'inst':
        if (st.inst === cmd.v) ai.plan.shift(); else { c.press('x'); ai.wait = 0.35; }
        break;
      case 'press': c.press(cmd.b); ai.plan.shift(); ai.wait = cmd.w ?? 0.4; break;
      default: ai.plan.shift();
    }
  }

  /** Helper CPU (humans playing): one small, tasteful addition away from the humans. */
  aiPlanHelper(st) {
    const pg = this.pages[this.page], page = this.page;
    const humans = this.stations.filter((s) => !s.p.isAI);
    const far = (R, col) => humans.every((h) => h.R < 0 || Math.abs(h.col - col) >= 3 || Math.abs(h.R - R) >= 3);
    let mine = 0;
    for (const row of pg.cells) for (const cell of row) if (cell && cell.owner === st.i) mine++;
    if (mine >= 5) return [];
    const opts = [];
    for (let c = 0; c < STEPS; c++) {
      for (let R = 0; R < NP; R++) {
        const cell = pg.cells[R][c];
        if (!cell || this.stations[cell.owner]?.p.isAI) continue;
        const hp = pitchOf(R) - 2;    // a harmony two scale steps below
        if (hp >= 0) { const HR = rowOfPitch(hp); if (!pg.cells[HR][c] && far(HR, c)) opts.push({ R: HR, col: c, w: 3 }); }
      }
      const colEmpty = pg.cells.slice(0, NP).every((row) => !row[c]);
      if (colEmpty && c % 2 === 0) {
        const prev = [c - 1, c - 2, c + 1, c + 2].map((q) => (q + STEPS) % STEPS).map((q) => pg.cells.slice(0, NP).findIndex((row) => row[q])).find((R) => R >= 0);
        if (prev !== undefined) { const R = clamp(prev + pick([-1, 1]), 0, NP - 1); if (far(R, c)) opts.push({ R, col: c, w: 1 }); }
      }
    }
    for (const c of [1, 5, 9, 13, 3, 11]) if (!pg.cells[NP + 2][c] && far(NP + 2, c)) opts.push({ R: NP + 2, col: c, w: 0.7 });
    if (!opts.length) return [];
    const tot = opts.reduce((a, o) => a + o.w, 0);
    let r = rand(tot), o = opts[0];
    for (const q of opts) { r -= q.w; if (r <= 0) { o = q; break; } }
    return [{ t: 'goto', R: o.R, col: o.col, page }, { t: 'place', R: o.R, col: o.col, page }];
  }

  /** CPU-only party: write a little song, then put on the concert. */
  aiPlanSolo(st) {
    const S = this.cpuScript, page = this.page, pg = this.pages[page];
    const lead = this.stations[0] === st;
    if (lead) {
      if (!S.groove && this.t > 7) { S.groove = true; return [{ t: 'tb', i: 1 }, { t: 'press', b: 'a', w: 0.6 }]; }
      if (!S.page2 && this.t > 12) { S.page2 = true; return [{ t: 'press', b: 'rb', w: 0.6 }, { t: 'goto', R: 3, col: 2 }, { t: 'press', b: 'y', w: 0.8 }]; }
      if (!S.tempo && this.t > 18) { S.tempo = true; if (chance(0.5)) return [{ t: 'tb', i: TB.findIndex((b) => b.id === 'tempo') }, { t: 'press', b: 'a', w: 0.6 }]; }
      if (!S.concert && this.t > 25) { S.concert = true; return [{ t: 'tb', i: TB.length - 1 }, { t: 'press', b: 'a', w: 0.6 }]; }
    }
    const notes = pg.cells.slice(0, NP).reduce((a, row) => a + row.filter(Boolean).length, 0);
    if (notes < 3) return [{ t: 'press', b: 'y', w: 0.8 }];
    if (chance(0.15)) return [{ t: 'inst', v: randInt(0, INSTS.length - 1) }];
    if (chance(0.2)) return [{ t: 'press', b: 'y', w: 0.6 }];
    if (notes > 26) return [];
    const col = randInt(0, STEPS - 1), near = pg.cells.slice(0, NP).findIndex((row) => row[(col + STEPS - 1) % STEPS] || row[(col + 1) % STEPS]);
    const R = clamp((near >= 0 ? near : randInt(1, 6)) + pick([-2, -1, 1, 2]), 0, NP - 1);
    if (pg.cells[R][col]) return [];
    return [{ t: 'goto', R, col, page }, { t: 'place', R, col, page }];
  }

  // --- song picker ---------------------------------------------------------------
  pickerRect(i) {
    const cw = 470, ch = 300, gap = 40;
    return { x: W / 2 + ((i % 3) - 1) * (cw + gap) - cw / 2, y: 250 + Math.floor(i / 3) * (ch + 40), w: cw, h: ch };
  }

  previewPreset(i) {
    if (!this.audioOn()) return;   // also makes sure this.bus exists
    const P = PRESETS[i];
    if (this.previewBus) { const old = this.previewBus; old.gain.setTargetAtTime(0, this.ac.currentTime, 0.03); setTimeout(() => { try { old.disconnect(); } catch (e) { /* gone */ } }, 300); }
    this.previewBus = this.ac.createGain(); this.previewBus.connect(this.bus);
    const t0 = this.ac.currentTime + 0.02;
    if (!P.pages) {
      const seq = P.id === 'blank' ? [2, 4] : [2, 4, 5, 7, 6, 4, 5];
      seq.forEach((pi, k) => playInst(this.ac, this.previewBus, 0, PITCHES[pi].midi, t0 + k * 0.1, 0.1, 0.7));
      return;
    }
    const spec = P.pages[0];
    let k = 0;
    [...spec.lead].forEach((ch, c) => { if (NOTE_OF[ch] !== undefined && k < 7) { playInst(this.ac, this.previewBus, spec.inst, PITCHES[NOTE_OF[ch]].midi, t0 + c * 0.075, 0.12, 0.7); k++; } });
  }

  updatePicker(dt) {
    const P = this.picker;
    P.t += dt;
    const c = P.owner.ctrl;
    const choose = (i) => {
      this.loadPreset(i, P.first ? null : this.stations.find((st) => st.p === P.owner));
      this.picker = null;
      sfx('select'); sfx('magic');
      fx.flash('#ffffff', 0.15);
      for (const st of this.stations) { st.actor.playOnce('cheer', 0.5); if (st.p.isAI) st.p.ctrl.reset(); }
    };
    for (let i = 0; i < PRESETS.length; i++) {
      if (input.clicked(this.pickerRect(i))) { P.sel = i; choose(i); return; }
      if (input.pointer.moved && input.pointerOver(this.pickerRect(i)) && P.sel !== i) { P.sel = i; sfx('move'); this.previewPreset(i); }
    }
    if (P.owner.isAI) {
      if (P.t > 1.4 && !P.aiPicked) { P.aiPicked = true; P.sel = pick([1, 2, 3, 4, 5, 5]); this.previewPreset(P.sel); }
      if (P.t > 2.4) choose(P.sel);
      return;
    }
    const n = PRESETS.length;
    if (c.nav.x) { P.sel = (P.sel + c.nav.x + n) % n; sfx('move'); this.previewPreset(P.sel); }
    if (c.nav.y) { P.sel = (P.sel + c.nav.y * 3 + n) % n; sfx('move'); this.previewPreset(P.sel); }
    if (c.pressed('a') && P.t > 0.25) choose(P.sel);
    else if (c.pressed('b') && !P.first) { this.picker = null; sfx('back'); }
  }

  // --- concert --------------------------------------------------------------------
  songPages() {
    const used = this.pages.map((pg, k) => (pg.cells.some((row) => row.some(Boolean)) ? k : -1)).filter((k) => k >= 0);
    return used;
  }

  startConcert() {
    if (this.phase === 'concert') return;
    let song = this.songPages();
    if (!song.length) { this.surprisePage(0, null); song = [0]; }
    const L = song.length;
    this.phase = 'concert';
    this.picker = null;
    this.concert = { t: 0, song, passes: Math.max(1, Math.ceil(3 / L)), ended: false, endT: 0, songPos: 0 };
    for (const st of this.stations) { st.confirm = null; st.paint = null; if (st.p.isAI) { st.p.ctrl.reset(); st.ai.plan = []; } }
    const S = this.seq;
    S.step = 0; S.stopped = false; S.last = null; S.col = -1; this.events = [];
    S.nextAt = this.clock()[1] + 1.3;     // the curtains open first
    // performers line up centre stage
    const n = this.n, sp = Math.min(330, 1500 / n);
    this.stations.forEach((st, i) => {
      const a = st.actor;
      const s1 = Math.min((n <= 4 ? 250 : 190) / a.leader.h, (sp * 0.85) / Math.max(1, a.width / a.scale));
      st.gal = { from: { x: a.x, y: a.y, s: a.scale }, to: { x: W / 2 + (i - (n - 1) / 2) * sp, y: 900, s: s1 } };
      a.setPose('walk');
      if (!st.held) st.held = a.attach((g, info) => { if (this.phase === 'concert') drawInstIcon(g, st.inst, info.hand.x, info.hand.y, info.h * 0.24); });
    });
    sfx('fanfare'); snd('applause', 'cheer');
    fx.flash('#ffffff', 0.25);
  }

  concertStep(ev) {
    const C = this.concert;
    if (ev.col === 0) {
      C.songPos = ev.songPos;
      if (ev.songPos === 0) particles.confettiRain(W, ev.pass === 0 ? 90 : 60);
      else for (const x of [160, W - 160]) particles.burst(x, 760, { type: 'confetti', count: 26, speed: [400, 800] });
    }
    if (ev.col % 8 === 0) {
      for (const st of this.stations) {
        const a = st.actor;
        if (chance(0.7)) a.playOnce(pick(['dance-up', 'dance-side', 'dance-down', 'dance-star']), this.stepDur * 2, 'dance');
      }
    }
    const pg = this.pages[ev.page];
    for (let R = 0; R < NP; R++) {
      if (!pg.cells[R][ev.col]) continue;
      const p = this.chorusPos(R);
      if (chance(0.5)) particles.burst(p.x, p.y - 50, { type: 'note', count: 1, colors: [rowColor(R)], speed: [60, 160] });
    }
  }

  endConcert() {
    const C = this.concert;
    if (!C || C.ended) return;
    C.ended = true; C.endT = 0;
    if (this.audioOn()) {
      const t = this.ac.currentTime + 0.02;
      [2, 4, 5, 7].forEach((pi, k) => playInst(this.ac, this.bus, 0, PITCHES[pi].midi, t + k * 0.09, 0.4));
      playDrum(this.ac, this.bus, 0, t + 0.36); playDrum(this.ac, this.bus, 1, t + 0.36);
    }
    snd('applause', 'cheer'); sfx('yay');
    particles.confettiRain(W, 140);
    fx.flash('#ffffff', 0.2);
    for (const st of this.stations) st.actor.playOnce('bow', 1.1, 'celebrate');
  }

  backToEdit() {
    this.phase = 'edit';
    this.concert = null;
    const S = this.seq; S.step = 0; S.stopped = false; S.last = null; this.events = []; S.nextAt = this.clock()[1] + 0.3;
    this.stations.forEach((st) => {
      const a = st.actor; a.x = st.home.x; a.y = st.home.y; a.scale = st.home.s; a.setPose('idle'); a.snap();
      st.gal = null;
    });
    sfx('back');
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((st) => (st.placed ? `${st.placed} note${st.placed === 1 ? '' : 's'} · ${INSTS[st.inst].name}` : 'Music fan!'));
    this.api.finish({ showcase: true, highlight: null, stats, title: 'Bravo!' });
  }

  onDone() {
    if (this.phase === 'concert') this.finishGame();
    else this.startConcert();
  }

  updateConcert(dt) {
    const C = this.concert;
    C.t += dt;
    for (const st of this.stations) {
      const a = st.actor, G = st.gal, e = ease.inOutQuad(Math.min(1, C.t / 1.1));
      a.x = lerp(G.from.x, G.to.x, e); a.y = lerp(G.from.y, G.to.y, e); a.scale = lerp(G.from.s, G.to.s, e);
      if (C.t < 1.1) { a.facing = G.to.x >= G.from.x ? 1 : -1; }
      else if (!C.ended) {
        if (a.pose === 'walk') { a.setPose('dance'); a.facing = 1; }
        if (a.pose === 'dance') a.poseTime = this.beatNow() / 2.2;
      }
    }
    if (C.ended) {
      C.endT += dt;
      if (C.endT > 1.3) {
        for (const st of this.stations) {
          if (st.p.isAI) continue;
          if (st.p.ctrl.pressed('a')) { this.finishGame(); return; }
          if (st.p.ctrl.pressed('b')) { this.backToEdit(); return; }
        }
        const h = ui.clickedHint();
        if (h === 'a') { this.finishGame(); return; }
        if (h === 'b') { this.backToEdit(); return; }
      }
      if (this.cpuOnly && C.endT > 3) this.finishGame();
      if (C.endT > 25) this.finishGame();
    }
  }

  beatNow() { const S = this.seq; return S.last ? (S.last.idx + (S.frac || 0)) / 2 : 0; }

  // --- main update -------------------------------------------------------------
  update(dt) {
    if (!this.musicOff) { this.musicOff = true; if (music.name === meta.music) music.stop(0.1); }
    this.t += dt;
    this.seq.beatPulse = Math.max(0, this.seq.beatPulse - dt * 4);
    if (this.flip) { this.flip.t += dt; if (this.flip.t > 0.3) this.flip = null; }
    for (const gh of this.ghosts) gh.t += dt;
    this.ghosts = this.ghosts.filter((gh) => gh.t < 0.3);
    for (const st of this.stations) st.actor.update(dt);
    if (!this.picker) this.tickSequencer(dt);
    if (this.phase === 'concert') { this.updateConcert(dt); return; }
    if (this.picker) { this.updatePicker(dt); return; }
    // sparkle notes pop in one by one
    while (this.sparkleQ.length && this.sparkleQ[0].at <= this.t) {
      const q = this.sparkleQ.shift(), x = colX(q.col) + CW / 2, y = rowMid(q.R);
      particles.burst(x, y, { type: 'sparkle', count: 4, colors: [rowColor(q.R), '#fff', '#ffe066'], speed: [60, 200] });
      if (!q.quiet) this.preview(q.R, q.inst, 0.7);
    }
    const conf = this.stations.find((s) => s.confirm);
    if (conf && input.pointer.pressed) this.resolveConfirm(conf, ui.clickedHint() === 'a');
    else this.updatePointer();
    for (const st of this.stations) {
      if (st.p.isAI) this.aiUpdate(st, dt);
      this.updatePlayer(st, dt);
      if (this.phase !== 'edit' || this.picker) return;
    }
    // everyone dances once the tune has a few notes
    const notes = this.pages[this.page].cells.reduce((a, row) => a + row.filter(Boolean).length, 0);
    this.dancing = notes >= 4;
    for (const st of this.stations) {
      const a = st.actor;
      if (this.dancing) { if (a.pose === 'idle') a.setPose('dance'); if (a.pose === 'dance') a.poseTime = this.beatNow() / 2.2; }
      else if (a.pose === 'dance') a.setPose('idle');
    }
    if (this.cpuOnly && this.t > 60) this.startConcert();
  }

  postUpdate(dt) { this.t += dt; for (const st of this.stations) st.actor.update(dt); }

  destroy() {
    this.dead = true;
    for (const b of [this.previewBus, this.bus]) {
      if (!b || !this.ac) continue;
      try { b.gain.cancelScheduledValues(this.ac.currentTime); b.gain.setTargetAtTime(0, this.ac.currentTime, 0.02); } catch (e) { /* closed */ }
      setTimeout(() => { try { b.disconnect(); } catch (e) { /* gone */ } }, 300);
    }
    this.bus = null; this.previewBus = null;
    this.sparkleQ = []; this.events = [];
  }

  // =============================================================================
  draw(g) {
    if (this.phase === 'concert') { this.drawConcert(g); return; }
    this.drawBackdrop(g);
    this.drawGrid(g);
    this.drawStage(g);
    this.drawToolbar(g);
    this.drawLegend(g);
    if (!this.picker) for (const st of this.stations.slice().sort((a, b) => a.p.isAI - b.p.isAI).reverse()) this.drawCursor(g, st);
    for (const st of this.stations) if (st.confirm) this.drawConfirm(g, st);
    if (this.picker) this.drawPicker(g);
  }

  drawBackdrop(g) {
    const bg = art('bg/melody-maker');
    this.hasBg = !!bg;
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffd9ef'); gr.addColorStop(0.55, '#d9c8ff'); gr.addColorStop(1, '#b8e6ff');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.5;
    ui.cloud(g, 300, 150, 1.2); ui.cloud(g, 1500, 120, 1.0); ui.cloud(g, 950, 70, 0.8);
    g.restore();
    ui.hills(g, 760, '#9fe39a', 40, 0.004, 0.5);
    ui.hills(g, 800, '#7fd47e', 30, 0.006, 2.1);
    // fairy lights along the top
    g.save(); g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 8); for (let x = 0; x <= W; x += 40) g.lineTo(x, 8 + Math.sin((x / W) * Math.PI * 4) * 6 + 6); g.stroke();
    const cols = ['#ff6fd0', '#ffd23f', '#3fa7ff', '#6fdc5a', '#ff9f1c'];
    for (let i = 0, x = 20; x < W; x += 80, i++) {
      const y = 14 + Math.sin((x / W) * Math.PI * 4) * 6 + 6, on = 0.6 + 0.4 * Math.sin(this.t * 3 + i);
      g.globalAlpha = on; g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill();
    }
    g.restore();
  }

  drawGrid(g) {
    const S = this.seq, t = this.t;
    ui.panel(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h, { r: 30, fill: '#fffaf0' });
    // row stripes
    for (let R = 0; R < NROWS; R++) {
      g.fillStyle = ROW_TINT[R];
      g.fillRect(GX, rowY(R) + 2, STEPS * CW, rowH(R) - 4);
    }
    // beat bands (every other beat a little darker) and bar lines
    g.fillStyle = 'rgba(36,22,63,0.05)';
    for (let c = 0; c < STEPS; c += 4) { g.fillRect(colX(c), GY, CW * 2, NP * RH); g.fillRect(colX(c), rowY(NP), CW * 2, ND * DH); }
    g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 4;
    for (const c of [8]) { g.beginPath(); g.moveTo(colX(c), GY - 4); g.lineTo(colX(c), GRID_B + 4); g.stroke(); }
    // drum lane divider
    g.fillStyle = 'rgba(36,22,63,0.12)'; rr(g, GX, rowY(NP) - DGAP + 4, STEPS * CW, DGAP - 8, 4); g.fill();
    // playhead
    const page = this.page;
    if (S.last && S.last.page === page && !this.picker) {
      const x = colX(S.col), a = 0.55 + 0.45 * (1 - (S.frac || 0));
      g.save(); g.globalAlpha = a;
      const gr = g.createLinearGradient(0, GY, 0, GRID_B);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,240,170,0.95)');
      g.fillStyle = gr; rr(g, x + 3, GY - 6, CW - 6, GRID_B - GY + 12, 18); g.fill();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.stroke();
      g.restore();
    }
    // empty-cell dots, notes
    const flipOff = this.flip ? (1 - ease.outCubic(Math.min(1, this.flip.t / 0.3))) * this.flip.dir * 160 : 0;
    const flipA = this.flip ? Math.min(1, this.flip.t / 0.2) : 1;
    g.save();
    g.beginPath(); g.rect(GX, GY - 10, STEPS * CW, GRID_B - GY + 20); g.clip();
    g.globalAlpha = flipA;
    g.translate(flipOff, 0);
    const pg = this.pages[page];
    for (let R = 0; R < NROWS; R++) {
      const y = rowMid(R), color = rowColor(R), drum = isDrumRow(R);
      for (let c = 0; c < STEPS; c++) {
        const x = colX(c) + CW / 2, cell = pg.cells[R][c];
        if (!cell) {
          g.fillStyle = ROW_DOT[R];
          g.beginPath(); g.arc(x, y, c % 2 === 0 ? 8 : 5, 0, TAU); g.fill();
          continue;
        }
        const ht = t - this.hit[(page * NROWS + R) * STEPS + c];
        const bounce = ht < 0.4 ? Math.sin(Math.min(1, ht / 0.4) * Math.PI) * 0.32 : 0;
        const born = t - cell.born, pop = born < 0 ? 0 : born < 0.35 ? ease.outBack(born / 0.35) : 1;
        if (pop <= 0) continue;
        if (ht < 0.3) {   // glow when it plays
          g.save(); g.globalAlpha *= (1 - ht / 0.3) * 0.7; g.fillStyle = '#fff6c0';
          g.beginPath(); g.arc(x, y, (drum ? 30 : 38) * (1 + ht), 0, TAU); g.fill(); g.restore();
        }
        const spr = drum ? noteSprite('drum', R - NP, color, 46) : noteSprite('note', cell.inst, color, 56);
        blitSprite(g, spr, x, y - bounce * 10, pop * (1 + bounce));
      }
    }
    for (const gh of this.ghosts) {
      if (gh.page !== page) continue;
      const k = 1 - gh.t / 0.3, R = gh.R, drum = isDrumRow(R);
      g.save(); g.globalAlpha *= k;
      blitSprite(g, drum ? noteSprite('drum', R - NP, rowColor(R), 46) : noteSprite('note', gh.cell.inst, rowColor(R), 56), colX(gh.col) + CW / 2, rowMid(R), 0.4 + 0.6 * k);
      g.restore();
    }
    g.restore();
    // singers: a flower per pitch row, drum icons for the drum lane
    for (let R = 0; R < NROWS; R++) {
      const sing = clamp(1 - (t - this.sing[R]) / 0.45, 0, 1), y = rowMid(R);
      if (R < NP) drawFlower(g, SINGER_X, y, 25, rowColor(R), sing, t, pitchOf(R), ((t + R * 0.7) % 4.3) < 0.12);
      else {
        g.save(); g.translate(SINGER_X, y); const k = 1 + sing * 0.3; g.scale(k, k); g.rotate(sing * 0.2 * Math.sin(t * 30));
        blitSprite(g, noteSprite('drum', R - NP, rowColor(R), 46), 0, 0, 1);
        g.restore();
      }
    }
  }

  drawStage(g) {
    // wooden stage boards (part of bg/melody-maker when that art exists)
    if (!this.hasBg) {
      g.save();
      g.fillStyle = '#d9a066'; g.fillRect(0, STAGE_Y, W, H - STAGE_Y);
      g.fillStyle = '#c98a4b'; g.fillRect(0, STAGE_Y, W, 14);
      g.strokeStyle = 'rgba(120,70,30,0.3)'; g.lineWidth = 3;
      for (let y = STAGE_Y + 50; y < H; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // footlights pulse on the beat
      const pulse = this.seq.beatPulse;
      for (let x = 60; x < W; x += 120) {
        g.fillStyle = `rgba(255,236,150,${0.45 + pulse * 0.5})`;
        g.beginPath(); g.ellipse(x, STAGE_Y + 7, 22, 7, 0, 0, TAU); g.fill();
      }
      g.restore();
    }
    // speakers at both ends of the stage thump with the kick drum
    const kick = clamp(1 - (this.t - this.sing[NP]) / 0.25, 0, 1);
    for (const x of [86, W - 86]) {
      if (drawArt(g, 'prop/melody-speaker', x, FEET_Y + 8, 150, 220, { anchor: 'bottom' })) continue;
      g.save(); g.translate(x, FEET_Y + 8);
      ui.panel(g, -62, -210, 124, 210, { r: 18, fill: '#5b3a8a', lineWidth: 5, shadow: false });
      for (const [cy, r] of [[-150, 30], [-62, 40]]) {
        g.beginPath(); g.arc(0, cy, r + 6, 0, TAU); g.fillStyle = '#3a2260'; g.fill();
        g.beginPath(); g.arc(0, cy, r * (1 + kick * 0.18), 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
        g.beginPath(); g.arc(0, cy, r * 0.32, 0, TAU); g.fillStyle = '#ff6fd0'; g.fill(); g.stroke();
      }
      g.restore();
    }
    const order = this.stations.slice().sort((a, b) => a.actor.y - b.actor.y);
    for (const st of order) st.actor.draw(g, { ring: st.p.color });
    for (const st of this.stations) {
      const a = st.actor, top = a.y - a.height;
      ui.playerTag(g, st.p, a.x, top - 10);
      // my sound, in a bubble beside my head
      const bx = a.x + Math.max(60, a.width * 0.45) * (a.x > W - 200 ? -1 : 1), by = top + 30;
      const k = 1 + st.instPop * 0.35;
      g.save(); g.translate(bx, by); g.scale(k, k);
      g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 5; g.strokeStyle = st.p.color; g.stroke();
      drawInstIcon(g, st.inst, 0, 0, 44);
      g.restore();
    }
  }

  drawToolbar(g) {
    const t = this.t;
    TB.forEach((b, i) => {
      const hot = this.stations.some((st) => st.R === -1 && st.tb === i) && !this.picker;
      const isPage = b.id === 'page', cur = isPage && b.page === this.page;
      const k = hot ? 1.05 + Math.sin(t * 9) * 0.02 : 1;
      g.save(); g.translate(b.x + b.w / 2, TBY + TBH / 2); g.scale(k, k);
      const x0 = -b.w / 2, y0 = -TBH / 2;
      let fill = '#ffffff';
      if (b.id === 'concert') fill = hot ? '#5ff0a0' : '#36d17a';
      else if (isPage) fill = cur ? '#ffd23f' : '#fff8ec';
      else if (hot) fill = '#fff1a8';
      ui.panel(g, x0, y0, b.w, TBH, { r: 26, fill, lineWidth: cur ? 6 : 5 });
      switch (b.id) {
        case 'songs':
          drawMusicNotes(g, x0 + 46, 0, 58);
          ui.text(g, 'Songs', x0 + 150, 2, { size: 38, color: NAVY, stroke: false, weight: 800 });
          break;
        case 'groove': {
          const gi = this.pages[this.page].groove;
          g.save(); g.translate(x0 + 44, 4); drawDrumShape(g, 0, 56); g.restore();
          ui.text(g, GROOVES[gi].name, x0 + 160, 2, { size: 34, color: gi ? NAVY : '#8a7aa6', stroke: false, weight: 800, maxWidth: b.w - 92 });
          break;
        }
        case 'page': {
          const pg = this.pages[b.page], used = pg.cells.some((row) => row.some(Boolean));
          // tiny preview of the page's notes
          for (let R = 0; R < NROWS; R++) for (let c = 0; c < STEPS; c++) {
            if (!pg.cells[R][c]) continue;
            g.fillStyle = rowColor(R); g.fillRect(x0 + 10 + c * 4.9, y0 + 12 + R * 4.2, 4, 3.6);
          }
          ui.text(g, String(b.page + 1), 0, 10, { size: used ? 40 : 46, color: cur ? '#fff' : NAVY, stroke: cur ? NAVY : false, strokeWidth: 7, weight: 800, alpha: used && !cur ? 0.85 : 1 });
          if (cur && this.seq.last && this.phase === 'edit') { g.fillStyle = NAVY; g.fillRect(x0 + 10 + this.seq.col * 4.9, y0 + 8, 4, 54); }
          break;
        }
        case 'tempo':
          drawTortoise(g, x0 + 46, 2, 62, this.tempo === 0);
          drawHare(g, x0 + b.w - 46, 2, 62, this.tempo === 2);
          for (let k2 = 0; k2 < 3; k2++) {
            g.beginPath(); g.arc(-34 + k2 * 34, 2, k2 === this.tempo ? 15 : 9, 0, TAU);
            g.fillStyle = k2 === this.tempo ? '#ff6fd0' : 'rgba(36,22,63,0.25)'; g.fill();
            if (k2 === this.tempo) { g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke(); }
          }
          break;
        case 'clear':
          if (!drawArt(g, 'icon/eraser', x0 + 42, 0, 56, 56)) {
            g.save(); g.translate(x0 + 42, 0); g.rotate(-0.5); g.fillStyle = '#ff9fc7'; g.strokeStyle = NAVY; g.lineWidth = 4;
            g.fillRect(-22, -12, 44, 24); g.strokeRect(-22, -12, 44, 24); g.fillStyle = '#7fd3ff'; g.fillRect(6, -12, 16, 24); g.strokeRect(6, -12, 16, 24); g.restore();
          }
          ui.text(g, 'Clear', x0 + 128, 2, { size: 36, color: NAVY, stroke: false, weight: 800 });
          break;
        case 'concert':
          g.save(); g.translate(x0 + 50, 0); g.rotate(Math.sin(t * 3) * 0.15); drawStarShape(g, 56, '#fff3a0'); g.restore();
          ui.text(g, 'Concert!', x0 + 196, 2, { size: 44, color: '#fff', stroke: NAVY, strokeWidth: 8, weight: 800 });
          break;
        default: break;
      }
      g.restore();
    });
  }

  drawLegend(g) {
    const L = LEGEND;
    ui.panel(g, L.x, L.y, L.w, L.h, { r: 30, fill: 'rgba(255,248,236,0.94)' });
    const rows = [['stick', 'Move'], ['a', 'Note'], ['x', 'Sound'], ['y', 'Sparkle'], ['lbrb', 'Page'], ['b', 'Undo'], ['start', 'Menu']];
    const step = (L.h - 40) / rows.length;
    rows.forEach(([b, label], i) => {
      const y = L.y + 20 + step * (i + 0.5);
      if (b === 'lbrb') { ui.glyph(g, 'lb', L.x + 42, y - 18, 34); ui.glyph(g, 'rb', L.x + 42, y + 18, 34); }
      else ui.glyph(g, b, L.x + 42, y, 52);
      ui.text(g, label, L.x + 88, y + 2, { size: 36, align: 'left', color: NAVY, stroke: false, weight: 800, maxWidth: L.w - 100 });
    });
  }

  drawCursor(g, st) {
    const t = this.t, col = st.p.color, ai = st.p.isAI;
    const same = this.stations.filter((o) => o.R === st.R && (st.R === -1 ? o.tb === st.tb : o.col === st.col));
    const inset = same.indexOf(st) * 6;
    g.save();
    if (ai) g.globalAlpha = 0.75;
    let x, y, w, h;
    if (st.R === -1) { const b = TB[st.tb]; x = b.x - 8; y = TBY - 8; w = b.w + 16; h = TBH + 16; }
    else { x = colX(st.col) + 2; y = rowY(st.R) - 2; w = CW - 4; h = rowH(st.R) + 4; }
    x += inset; y += inset; w -= inset * 2; h -= inset * 2;
    const pulse = 1 + Math.sin(t * 8 + st.i) * 0.03;
    g.translate(x + w / 2, y + h / 2); g.scale(pulse, pulse); g.translate(-(x + w / 2), -(y + h / 2));
    rr(g, x, y, w, h, 16); g.lineWidth = ai ? 8 : 12; g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = ai ? 4 : 7; g.strokeStyle = col; g.stroke();
    // tag pill on the top-left corner + my sound on the bottom-right
    const tx = x + 4, ty = y - 4;
    rr(g, tx - 6, ty - 18, 54, 30, 12); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    ui.text(g, st.p.tag, tx + 21, ty - 3, { size: 20, strokeWidth: 4, shadow: false });
    if (st.R >= 0) {
      const bx = x + w - 6, by = y + h - 4;
      g.beginPath(); g.arc(bx, by, 17, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = col; g.stroke();
      drawInstIcon(g, st.inst, bx, by, 24);
    }
    if (st.undoAt && t - st.undoAt < 0.6) {
      const k = 1 - (t - st.undoAt) / 0.6;
      g.globalAlpha = k;
      if (!drawArt(g, 'icon/undo', x + w / 2, y - 26 - (1 - k) * 20, 46, 46)) ui.text(g, '↶', x + w / 2, y - 26 - (1 - k) * 20, { size: 44, color: '#fff' });
    }
    g.restore();
  }

  drawConfirm(g, st) {
    const C = st.confirm, b = TB.find((q) => q.id === C.kind);
    const w = 470, h = 160, px = clamp(b.x + b.w / 2 - w / 2, 20, W - w - 20), py = TBY + TBH + 22;
    const k = ease.outBack(Math.min(1, C.t / 0.25));
    g.save(); g.translate(px + w / 2, py); g.scale(k, k); g.translate(-(px + w / 2), -py);
    ui.panel(g, px, py, w, h, { r: 28, fill: '#fff8ec', stroke: st.p.color, lineWidth: 7 });
    ui.text(g, C.kind === 'clear' ? 'Clear this page?' : 'Start the concert?', px + w / 2, py + 44, { size: 38, color: NAVY, stroke: false, weight: 800 });
    ui.hints(g, [['a', 'Yes!'], ['b', 'Not yet']], px + w / 2, py + 112, { size: 42, color: '#ff6fb1' });
    g.restore();
  }

  drawPicker(g) {
    const P = this.picker;
    g.save(); g.fillStyle = 'rgba(36,22,63,0.55)'; g.fillRect(0, 0, W, H); g.restore();
    const sc = ease.outBack(Math.min(1, P.t / 0.35));
    g.save(); g.translate(W / 2, H / 2); g.scale(sc, sc); g.translate(-W / 2, -H / 2);
    ui.panel(g, 120, 70, W - 240, 940, { r: 40, fill: '#fff8ec' });
    ui.text(g, P.first ? 'Pick a song to start!' : 'Pick a new song?', W / 2, 150, { size: 68, color: '#ff6fb1', weight: 800 });
    PRESETS.forEach((pr, i) => {
      const r = this.pickerRect(i), sel = i === P.sel;
      const k = sel ? 1.04 + Math.sin(this.t * 6) * 0.015 : 1;
      g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(k, k); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      ui.panel(g, r.x, r.y, r.w, r.h, { r: 24, fill: '#ffffff', stroke: sel ? '#ffd23f' : NAVY, lineWidth: sel ? 12 : 5 });
      this.drawPresetPreview(g, pr, r.x + 24, r.y + 22, r.w - 48, r.h - 100, sel);
      ui.text(g, pr.name, r.x + r.w / 2, r.y + r.h - 40, { size: 40, color: sel ? '#ff6fb1' : NAVY, stroke: sel ? NAVY : false, weight: 800, maxWidth: r.w - 30 });
      g.restore();
    });
    if (P.owner.isAI) ui.text(g, 'CPU is choosing...', W / 2, 960, { size: 38, color: P.owner.color, strokeWidth: 6 });
    else {
      ui.text(g, `${P.owner.tag} picks!`, W / 2 - 430, 960, { size: 38, color: P.owner.color, strokeWidth: 6 });
      ui.hints(g, P.first ? [['stick', 'Choose'], ['a', 'Play!']] : [['stick', 'Choose'], ['a', 'Play!'], ['b', 'Keep mine']], W / 2 + 140, 960, { size: 42, color: NAVY });
    }
    g.restore();
  }

  drawPresetPreview(g, pr, x, y, w, h, sel) {
    g.save();
    rr(g, x, y, w, h, 14); g.fillStyle = '#fffaf0'; g.fill(); g.clip();
    const rh = h / NP, cw = w / STEPS;
    for (let R = 0; R < NP; R++) { g.fillStyle = lighten(rowColor(R), 0.8); g.fillRect(x, y + R * rh + 1, w, rh - 2); }
    if (pr.pages) {
      const spec = pr.pages[0];
      const put = (str, inst) => [...str].forEach((ch, c) => {
        if (NOTE_OF[ch] === undefined) return;
        const R = rowOfPitch(NOTE_OF[ch]);
        const bob = sel ? Math.sin(this.t * 6 - c * 0.5) * 3 : 0;
        blitSprite(g, noteSprite('note', inst, rowColor(R), 28), x + (c + 0.5) * cw, y + (R + 0.5) * rh + bob, 1);
      });
      put(spec.lead, spec.inst);
      if (spec.low) put(spec.low, spec.lowInst);
    } else if (pr.id === 'blank') {
      ui.text(g, '+', x + w / 2, y + h / 2, { size: 120, color: '#ffd23f', strokeWidth: 10 });
    } else {
      for (let k = 0; k < 7; k++) {
        const a = this.t * 1.5 + k * 0.9;
        g.save(); g.translate(x + w / 2 + Math.cos(a) * w * 0.32, y + h / 2 + Math.sin(a * 1.3) * h * 0.3);
        drawSparkleShape(g, 34, ['#fff6a8', '#ff9fd8', '#9fe3ff'][k % 3]); g.restore();
      }
      ui.text(g, '?', x + w / 2, y + h / 2 + 4, { size: 120, color: '#ff6fd0', strokeWidth: 10 });
    }
    g.restore();
  }

  // --- concert drawing -------------------------------------------------------------
  chorusPos(R) {
    const pi = pitchOf(R);
    return { x: 380 + pi * 166, y: 1034 };
  }

  drawConcert(g) {
    const C = this.concert, t = this.t, pulse = this.seq.beatPulse;
    const bg = art('bg/melody-maker-concert');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#2b1650'); gr.addColorStop(0.7, '#5a2a7a'); gr.addColorStop(1, '#3a1a52');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // twinkly backdrop stars
      for (let i = 0; i < 40; i++) {
        const x = (i * 457) % W, y = 260 + ((i * 193) % 420), a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
        g.save(); g.globalAlpha = a; g.translate(x, y); drawSparkleShape(g, 16 + (i % 3) * 6, '#fff6c8'); g.restore();
      }
      // stage floor
      g.fillStyle = '#c98a4b'; g.fillRect(0, 860, W, H - 860);
      g.fillStyle = '#e0a868'; g.fillRect(0, 860, W, 18);
      g.strokeStyle = 'rgba(90,50,20,0.3)'; g.lineWidth = 3;
      for (let y = 920; y < H; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    }
    // spotlights on the performers, pulsing on the beat
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const st of this.stations) {
      const a = st.actor, r = Math.max(90, a.width * 0.7);
      g.globalAlpha = 0.12 + pulse * 0.1; g.fillStyle = st.p.color;
      g.beginPath(); g.moveTo(a.x - 30, 0); g.lineTo(a.x + 30, 0); g.lineTo(a.x + r, a.y); g.lineTo(a.x - r, a.y); g.closePath(); g.fill();
      g.globalAlpha = 0.3 + pulse * 0.2; g.beginPath(); g.ellipse(a.x, a.y, r, r * 0.24, 0, 0, TAU); g.fill();
    }
    g.restore();
    // the song ribbon along the top
    this.drawSongRibbon(g);
    // performers
    const order = this.stations.slice().sort((a, b) => a.actor.y - b.actor.y);
    for (const st of order) st.actor.draw(g, { ring: st.p.color });
    if (C.t < 3) for (const st of this.stations) ui.playerTag(g, st.p, st.actor.x, st.actor.y - st.actor.height - 20);
    // the flower chorus along the front edge + the drums at the sides
    for (let R = 0; R < NP; R++) {
      const p = this.chorusPos(R), sing = clamp(1 - (t - this.sing[R]) / 0.45, 0, 1);
      g.save(); g.strokeStyle = '#3fae5a'; g.lineWidth = 8; g.beginPath(); g.moveTo(p.x, p.y + 60); g.lineTo(p.x, p.y); g.stroke(); g.restore();
      drawFlower(g, p.x, p.y - 8, 40, rowColor(R), sing, t, pitchOf(R), ((t + R * 0.7) % 4.3) < 0.12);
    }
    [[230, 1000, 0], [W - 330, 1010, 1], [W - 205, 1030, 2]].forEach(([x, y, d]) => {
      const sing = clamp(1 - (t - this.sing[NP + d]) / 0.35, 0, 1);
      g.save(); g.translate(x, y); g.scale(1 + sing * 0.25, 1 - sing * 0.1);
      blitSprite(g, noteSprite('drum', d, DRUMS[d].color, 46), 0, 0, 2.4);
      g.restore();
    });
    // curtains
    const open = ease.inOutQuad(clamp(C.t / 1.2, 0, 1));
    this.drawCurtains(g, open);
    if (C.t < 2.2) ui.banner(g, 'Concert time!', C.t, { y: 420, size: 120, color: '#ffd23f' });
    if (C.ended) {
      ui.banner(g, 'Bravo!', C.endT, { y: 330, size: 150, color: '#ffd23f' });
      if (C.endT > 1.3 && this.players.some((p) => !p.isAI)) {
        ui.panel(g, W / 2 - 400, 420, 800, 96, { r: 48, fill: 'rgba(255,248,236,0.95)' });
        ui.hints(g, [['a', 'All done!'], ['b', 'Make more music']], W / 2, 468, { size: 46, color: NAVY });
      }
    }
  }

  drawCurtains(g, open) {
    const half = W / 2, cw = half * (1 - open * 0.88);
    g.save();
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? 0 : W - cw;
      const gr = g.createLinearGradient(x0, 0, x0 + cw, 0);
      gr.addColorStop(0, '#b0154d'); gr.addColorStop(0.5, '#e0306a'); gr.addColorStop(1, '#9a1040');
      g.fillStyle = gr; g.fillRect(x0, 0, cw, H);
      g.strokeStyle = 'rgba(80,0,30,0.35)'; g.lineWidth = 6;
      for (let x = x0 + 30; x < x0 + cw; x += 60) { g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 10, H / 2, x, H); g.stroke(); }
    }
    // valance
    g.fillStyle = '#c21858'; g.fillRect(0, 0, W, 34);
    g.fillStyle = '#ffd23f';
    for (let x = 0; x < W; x += 60) { g.beginPath(); g.arc(x + 30, 34, 14, 0, Math.PI); g.fill(); }
    g.restore();
  }

  drawSongRibbon(g) {
    const C = this.concert, song = C.song, N = song.length;
    const gap = 22, pw = Math.min(420, (1640 - (N - 1) * gap) / N), ph = 170;   // stays clear of the curtains
    const x0 = W / 2 - (N * pw + (N - 1) * gap) / 2, y0 = 54;
    const S = this.seq;
    song.forEach((pgIdx, k) => {
      const x = x0 + k * (pw + gap), cur = C.songPos === k && S.last && !C.ended;
      ui.panel(g, x, y0, pw, ph, { r: 18, fill: cur ? '#fffaf0' : 'rgba(255,250,240,0.85)', stroke: cur ? '#ffd23f' : NAVY, lineWidth: cur ? 8 : 4 });
      const pg = this.pages[pgIdx], cw = (pw - 20) / STEPS, rh = (ph - 20) / NROWS;
      for (let R = 0; R < NROWS; R++) for (let c = 0; c < STEPS; c++) {
        if (!pg.cells[R][c]) continue;
        const ht = this.t - this.hit[(pgIdx * NROWS + R) * STEPS + c];
        const s = ht < 0.3 ? 1.6 - ht * 2 : 1;
        g.fillStyle = rowColor(R);
        const w2 = cw * 0.8 * s, h2 = rh * 0.8 * s;
        rr(g, x + 10 + (c + 0.5) * cw - w2 / 2, y0 + 10 + (R + 0.5) * rh - h2 / 2, w2, h2, 4); g.fill();
      }
      if (cur) {
        const px = x + 10 + (S.col + (S.frac || 0)) * cw;
        g.fillStyle = 'rgba(255,210,63,0.9)'; g.fillRect(px - 3, y0 + 6, 6, ph - 12);
      }
      ui.text(g, String(pgIdx + 1), x + 22, y0 + 22, { size: 26, color: '#fff', strokeWidth: 5 });
    });
  }
}

/** Plays a drum hit right away (Beat button feedback). */
function playDrumNow(game, d) {
  if (!game.audioOn()) return;
  playDrum(game.ac, game.bus, d, game.ac.currentTime + 0.01 + d * 0.12);
}

// --- menu / how-to thumbnail -----------------------------------------------------
function drawIcon(g, x, y, w, h, t) {
  g.save();
  const s = Math.min(w / 860, h / 520);
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, '#ffd9ef'); gr.addColorStop(1, '#c9b8ff');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  // a little music sheet with rainbow notes and a playhead
  const gx = x + w * 0.17, gy = y + h * 0.1, gw = w * 0.76, gh = h * 0.6;
  ui.panel(g, gx, gy, gw, gh, { r: 22 * s, fill: '#fffaf0', lineWidth: 5 * s, shadow: false });
  const rows = 6, cols = 8, rh = gh / rows, cw = gw / cols;
  for (let R = 0; R < rows; R++) { g.fillStyle = lighten(PITCHES[7 - R].color, 0.78); g.fillRect(gx + 8 * s, gy + R * rh + 3 * s, gw - 16 * s, rh - 6 * s); }
  const head = Math.floor(t * 4) % cols;
  g.fillStyle = 'rgba(255,236,150,0.85)'; ui.roundRect(g, gx + head * cw + 4 * s, gy + 4 * s, cw - 8 * s, gh - 8 * s, 10 * s); g.fill();
  const tune = [3, 2, 1, 2, 3, 3, 0, 4];
  tune.forEach((R, c) => {
    const inst = c % 4 === 3 ? 3 : c % 2 ? 1 : 0;
    const bounce = c === head ? 1.25 : 1;
    g.save(); g.translate(gx + (c + 0.5) * cw, gy + (R + 0.5) * rh - (c === head ? 6 * s : 0)); g.scale(bounce, bounce);
    drawNoteShape(g, INSTS[inst].id, PITCHES[7 - R].color, 46 * s);
    g.restore();
  });
  for (let R = 0; R < rows; R++) drawFlower(g, x + w * 0.09, gy + (R + 0.5) * rh, 22 * s, PITCHES[7 - R].color, tune[head] === R ? 1 : 0, t, 7 - R);
  // characters on the stage below
  g.fillStyle = '#d9a066'; g.fillRect(x, y + h * 0.78, w, h * 0.22);
  drawPortrait(g, 'felicity', x + w * 0.3, y + h * 0.86, 62 * s, { ring: '#ff6fd0', ringWidth: 6 * s, expr: 'happy' });
  drawPortrait(g, 'unicorn', x + w * 0.7, y + h * 0.86, 62 * s, { ring: '#3fa7ff', ringWidth: 6 * s, expr: 'happy' });
  drawInstIcon(g, 0, x + w * 0.42, y + h * 0.84, 60 * s);
  drawInstIcon(g, 3, x + w * 0.58, y + h * 0.84, 60 * s);
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.7 + i * 0.25) % 1;
    g.save(); g.globalAlpha = Math.sin(k * Math.PI); g.translate(x + w * (0.25 + i * 0.17), y + h * (0.78 - k * 0.2));
    drawMusicNotes(g, 0, 0, 40 * s, PITCHES[(i * 2 + 1) % 8].color); g.restore();
  }
  g.restore();
}
