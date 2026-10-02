// Pop Star Stage (Play Studio, rhythm): a K-pop idol hero concert. Every
// player has a note highway above their character; A/B/X/Y notes slide down
// to the hit line on the beat. Hits fire sparkle beams that poof the cute
// Shadow Imps creeping in from the dark edges. Combo 20+ = FEVER (rainbow
// lights, double points). Finale: a BIG Shadow Imp everyone blasts together.
//
// Sync: the host starts music 'dance' at the countdown; our first update()
// restarts it so beat 0 = GO. While audio runs we read music.beat(); headless
// (no audio) we run our own clock at 120 bpm.
import { W, H } from '../engine/canvas.js';
import { Actor, getBaseImage } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, music, audioRunning, hasSound } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { charById } from '../data/characters.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, ease, TAU, placementsFromScores } from '../engine/util.js';
import { drawSparkleShape, drawStarShape } from '../engine/emotes.js';

const NAVY = '#24163f';
const BPM = 120;
const SPB = 60 / BPM;
const TRAVEL = 3.2;                    // beats a note is visible before the hit line
const PERFECT = 0.08 / SPB;           // window in beats (±)
const GOOD = 0.16 / SPB;
const SONG_END = 130;                 // beats (65 s)
const BOSS_BEAT = 96;
const FEVER_COMBO = 20;
const BTNS = ['a', 'b', 'x', 'y'];
const BTN_COLOR = ui.BUTTON_COLORS;
const BTN_MIDI = { a: 72, b: 75, x: 79, y: 82 };   // C minor pentatonic-ish: always sounds nice

function snd(key, fallback, opts) { if (hasSound(key)) sfx(key, opts); else if (fallback) sfx(fallback, opts); }

// ---------------------------------------------------------------------------
// Chart: one shared chart for everyone (fair competition), built from the
// beat grid. Starts with only A, then adds B, then X/Y and a few eighths.
function makeChart() {
  const notes = [];
  const add = (beat, btn, gold = false) => notes.push({ beat, btn, gold });
  // 1) Warm-up: A on every other beat, then A on beats with a breath each bar.
  for (let b = 4; b < 20; b += 2) add(b, 'a');
  for (let b = 20; b < 36; b++) if (b % 4 !== 3) add(b, 'a');
  // 2) A and B
  const AB = [['a', 'a', 'b', null], ['b', 'b', 'a', null], ['a', 'b', 'a', null], ['a', null, 'b', null], ['b', 'a', 'b', null], ['a', 'a', 'b', 'b']];
  for (let b = 36; b < 68; b += 4) {
    const pat = b === 36 ? ['b', null, 'b', null] : pick(AB);
    pat.forEach((btn, i) => { if (btn) add(b + i, btn); });
  }
  // 3) All four, mostly quarters, a few eighth-note doubles (same button).
  const ALL = [['x', null, 'y', null], ['a', 'x', 'b', null], ['y', 'y', 'a', null], ['x', 'b', 'y', null], ['a', 'b', 'x', 'y'], ['b', null, 'x', 'x']];
  for (let b = 68; b < 96; b += 4) {
    const pat = b === 68 ? ['x', null, 'y', null] : pick(ALL);
    pat.forEach((btn, i) => { if (btn) add(b + i, btn); });
    if (b >= 76 && chance(0.5)) { const btn = pick(BTNS); add(b + 3, btn); add(b + 3.5, btn); }
  }
  // 4) Finale vs the BIG imp: golden notes (double points), eighth doubles.
  for (let b = 96; b < 124; b += 4) {
    const pat = pick(ALL);
    pat.forEach((btn, i) => { if (btn) add(b + i, btn, true); });
    if (chance(0.6)) { const btn = pick(['a', 'b']); add(b + 3, btn, true); add(b + 3.5, btn, true); }
  }
  // remove accidental duplicates
  const seen = new Set();
  return notes.filter((n) => { const k = n.beat.toFixed(2); if (seen.has(k)) return false; seen.add(k); return true; }).sort((p, q) => p.beat - q.beat);
}

// ---------------------------------------------------------------------------
// Shadow Imp: purple-navy puffball, glowing eyes, tiny bat ears, wispy tail.
// Mischievous, never scary.
const IMP_COLORS = [['#5a3591', '#2b1a56'], ['#3b3f9c', '#1d2160'], ['#7a2f86', '#3a1650']];
function drawImp(g, x, y, r, t, o = {}) {
  const [c1, c2] = o.colors || IMP_COLORS[0];
  g.save(); g.translate(x, y);
  if (o.flip) g.scale(-1, 1);
  g.rotate(Math.sin(t * 3 + (o.seed || 0)) * 0.12);
  const sq = 1 + Math.sin(t * 6 + (o.seed || 0)) * 0.05;
  g.scale(sq, 2 - sq);
  g.lineWidth = Math.max(2, r * 0.08); g.strokeStyle = '#140b2a'; g.lineJoin = 'round';
  // wispy tail
  g.fillStyle = c2;
  g.beginPath();
  g.moveTo(-r * 0.5, r * 0.6);
  g.bezierCurveTo(-r * 0.4, r * 1.3, r * 0.2 + Math.sin(t * 4) * r * 0.2, r * 1.2, r * 0.05 + Math.sin(t * 4) * r * 0.3, r * 1.55);
  g.bezierCurveTo(r * 0.5, r * 1.1, r * 0.5, r * 0.9, r * 0.5, r * 0.6);
  g.closePath(); g.fill(); g.stroke();
  // bat ears
  for (const s of [-1, 1]) {
    g.fillStyle = c2;
    g.beginPath(); g.moveTo(s * r * 0.25, -r * 0.8); g.quadraticCurveTo(s * r * 0.55, -r * 1.45, s * r * 0.9, -r * 1.2); g.quadraticCurveTo(s * r * 0.75, -r * 0.9, s * r * 0.75, -r * 0.55); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#c56bd6';
    g.beginPath(); g.moveTo(s * r * 0.4, -r * 0.8); g.quadraticCurveTo(s * r * 0.58, -r * 1.2, s * r * 0.78, -r * 1.08); g.quadraticCurveTo(s * r * 0.65, -r * 0.9, s * r * 0.66, -r * 0.68); g.closePath(); g.fill();
  }
  // puffball body (fluffy edge)
  const grd = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
  grd.addColorStop(0, c1); grd.addColorStop(1, c2);
  g.fillStyle = grd;
  g.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, rr = r * (1 + 0.07 * Math.sin(i * 3.1 + t * 5));
    const am = ((i - 0.5) / n) * TAU, rm = r * 1.13;
    if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else g.quadraticCurveTo(Math.cos(am) * rm, Math.sin(am) * rm, Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.fill(); g.stroke();
  // lavender belly
  g.fillStyle = 'rgba(190,160,255,0.35)';
  g.beginPath(); g.ellipse(0, r * 0.38, r * 0.55, r * 0.4, 0, 0, TAU); g.fill();
  // stubby arms
  g.fillStyle = c1;
  const wave = Math.sin(t * 10 + (o.seed || 0)) * 0.5;
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * r * 0.92, r * 0.15); g.rotate(s * (0.5 + (s > 0 ? wave : 0)));
    g.beginPath(); g.ellipse(0, 0, r * 0.22, r * 0.14, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
  }
  // glowing eyes
  const mood = o.mood || 'grin';
  g.save(); g.globalCompositeOperation = 'lighter';
  const glow = g.createRadialGradient(0, -r * 0.15, 0, 0, -r * 0.15, r * 0.9);
  glow.addColorStop(0, 'rgba(255,230,90,0.45)'); glow.addColorStop(1, 'rgba(255,230,90,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(0, -r * 0.15, r * 0.9, 0, TAU); g.fill();
  g.restore();
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * r * 0.36, -r * 0.18);
    if (mood === 'giggle') {
      g.strokeStyle = '#ffe85c'; g.lineWidth = r * 0.12; g.lineCap = 'round';
      g.beginPath(); g.arc(0, r * 0.08, r * 0.17, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else {
      const ey = mood === 'eep' ? 1.15 : 1;
      g.fillStyle = '#ffe85c'; g.beginPath(); g.ellipse(0, 0, r * 0.2 * ey, r * 0.26 * ey, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff9d0'; g.beginPath(); g.arc(-r * 0.06, -r * 0.09, r * 0.07, 0, TAU); g.fill();
      if (mood !== 'eep') { g.fillStyle = '#2b1a56'; g.beginPath(); g.arc(r * 0.04 * (o.look || 0), r * 0.04, r * 0.08, 0, TAU); g.fill(); }
    }
    g.restore();
  }
  // mouth
  g.strokeStyle = '#ffe85c'; g.lineWidth = r * 0.07; g.lineCap = 'round';
  if (mood === 'eep') { g.fillStyle = '#140b2a'; g.beginPath(); g.ellipse(0, r * 0.32, r * 0.1, r * 0.13, 0, 0, TAU); g.fill(); g.stroke(); }
  else {
    g.beginPath(); g.arc(0, r * 0.18, r * 0.24, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(r * 0.06, r * 0.4); g.lineTo(r * 0.14, r * 0.39); g.lineTo(r * 0.1, r * 0.5); g.closePath(); g.fill();
  }
  // blush
  g.fillStyle = 'rgba(255,120,200,0.45)';
  g.beginPath(); g.ellipse(-r * 0.62, r * 0.1, r * 0.12, r * 0.07, 0, 0, TAU); g.ellipse(r * 0.62, r * 0.1, r * 0.12, r * 0.07, 0, 0, TAU); g.fill();
  g.restore();
}

const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const gl = x.createRadialGradient(64, 64, 13, 64, 64, 64);
    gl.addColorStop(0, color + 'aa'); gl.addColorStop(1, color + '00');
    x.fillStyle = gl; x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
  }
  return c;
}

// When the Shadow Imp canonical/sprite set lands (entry 'shadow-imp'), imps
// become real Actors; until then they are drawn procedurally above.
const hasImpArt = () => !!(charById('shadow-imp') && getBaseImage('shadow-imp'));
function impActor(m, r) {
  if (!m.actor) { m.actor = new Actor('shadow-imp'); m.actor.snap(); }
  const a = m.actor;
  a.scale = (r * 2.6) / a.leader.h;
  return a;
}

/** A note gem: generated prop art if present, else a glowing Xbox glyph. */
function drawNote(g, btn, x, y, size, t, o = {}) {
  g.save();
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  // glow (cached sprite: cheaper than a gradient per note)
  g.save(); g.globalCompositeOperation = 'lighter';
  g.drawImage(glowSprite(BTN_COLOR[btn]), x - size * 0.95, y - size * 0.95, size * 1.9, size * 1.9);
  g.restore();
  if (o.gold) {
    g.save(); g.translate(x, y); g.rotate(t * 2);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 5;
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? size * 0.62 : size * 0.78; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.stroke(); g.restore();
  }
  if (drawArt(g, 'prop/note-' + btn, x, y, size * 1.15, size * 1.15)) {
    ui.text(g, btn.toUpperCase(), x, y + 2, { size: size * 0.55, color: '#fff', strokeWidth: 6 });
  } else {
    // bright gem-like disc in the button color with the letter
    g.fillStyle = '#2b2b36'; g.beginPath(); g.arc(x, y + size * 0.05, size / 2, 0, TAU); g.fill();
    const gr = g.createRadialGradient(x - size * 0.15, y - size * 0.18, size * 0.05, x, y, size * 0.5);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, BTN_COLOR[btn]); gr.addColorStop(1, BTN_COLOR[btn]);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, size / 2, 0, TAU); g.fill();
    g.lineWidth = Math.max(3, size * 0.07); g.strokeStyle = NAVY; g.stroke();
    ui.text(g, btn.toUpperCase(), x, y + 2, { size: size * 0.6, color: '#fff', strokeWidth: Math.max(4, size * 0.12), shadow: false });
  }
  g.restore();
}

// ---------------------------------------------------------------------------

export const meta = {
  id: 'pop-star-stage',
  title: 'Pop Star Stage',
  category: 'studio',
  type: 'Rhythm · Highest score wins',
  goal: 'Press the matching button when each note reaches the line — your music poofs the Shadow Imps!',
  controls: [['a', 'Green notes'], ['b', 'Red notes'], ['x', 'Blue notes'], ['y', 'Yellow notes']],
  tips: ['Press right when the note touches the circle!', 'Hit 20 in a row for rainbow FEVER — double points!', 'At the end, everyone zaps the BIG Shadow Imp together.'],
  music: 'dance',
  duration: '65 sec',
  minPlayers: 1, maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    const s = h / 200;
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#1a0b3d'); gr.addColorStop(1, '#5b1f8a');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    // spotlights
    g.save(); g.globalCompositeOperation = 'lighter';
    ['#ff6fd0', '#3fd3ff', '#ffd23f'].forEach((c, i) => {
      const sx = x + w * (0.2 + i * 0.3), sw = Math.sin(t * 1.3 + i * 2) * w * 0.12;
      g.globalAlpha = 0.22; g.fillStyle = c;
      g.beginPath(); g.moveTo(sx - 8 * s, y); g.lineTo(sx + 8 * s, y); g.lineTo(sx + sw + 50 * s, y + h); g.lineTo(sx + sw - 50 * s, y + h); g.closePath(); g.fill();
    });
    g.restore();
    // stage floor
    g.fillStyle = '#2a1650'; g.fillRect(x, y + h * 0.84, w, h * 0.16);
    for (let i = 0; i < 8; i++) { g.fillStyle = RAINBOW[(i + Math.floor(t * 4)) % RAINBOW.length]; g.globalAlpha = 0.7; g.fillRect(x + (i * w) / 8 + 2, y + h * 0.86, w / 8 - 4, h * 0.03); }
    g.globalAlpha = 1;
    // idol
    const img = getBaseImage('kpop-girl-center');
    if (img) {
      const ih = h * 0.72, iw = (img.width / img.height) * ih, bob = Math.abs(Math.sin(t * Math.PI * 2)) * 6 * s;
      g.drawImage(img, x + w * 0.5 - iw / 2, y + h * 0.88 - ih - bob, iw, ih);
    }
    // note highway hint
    const lx = x + w * 0.2;
    drawNote(g, 'a', lx, y + h * (0.25 + ((t * 0.5) % 1) * 0.4), 34 * s, t);
    drawNote(g, 'b', x + w * 0.8, y + h * (0.2 + ((t * 0.5 + 0.5) % 1) * 0.4), 34 * s, t);
    // imp being zapped
    const ix = x + w * 0.84, iy = y + h * 0.72;
    drawImp(g, ix, iy, 22 * s, t, { mood: 'eep', flip: true });
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fff6a8'; g.lineWidth = 6 * s; g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8);
    g.beginPath(); g.moveTo(x + w * 0.58, y + h * 0.5); g.lineTo(ix - 18 * s, iy - 6 * s); g.stroke(); g.restore();
    for (let i = 0; i < 4; i++) { g.save(); g.translate(ix + Math.cos(t * 3 + i * 1.6) * 30 * s, iy + Math.sin(t * 3 + i * 1.6) * 24 * s); drawSparkleShape(g, 18 * s, '#fff6a8'); g.restore(); }
    ui.text(g, 'Pop Star Stage', x + w / 2, y + h * 0.1, { size: h * 0.1, color: '#ffffff', maxWidth: w * 0.9 });
  },
};

// ---------------------------------------------------------------------------

const TOP = 128;          // top of the note highways
const HIT_Y = 590;        // hit line
const FLOOR_Y = 1012;     // characters' feet

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.chart = makeChart();
    this.spacing = Math.min(n === 1 ? 600 : 330, (W - 120) / n);
    this.laneW = Math.min(n === 1 ? 300 : 250, this.spacing - 30);
    this.noteSize = clamp(this.laneW * 0.42, 54, 84);
    const scale = n === 1 ? 1.3 : n === 2 ? 1.15 : n <= 3 ? 1.0 : n <= 5 ? 0.86 : 0.72;
    this.lanes = this.players.map((p, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * this.spacing;
      const a = new Actor(p.charId, { x, y: FLOOR_Y, scale });
      const maxW = this.spacing * 0.95;
      if (a.width > maxW) a.scale *= maxW / a.width;
      a.facing = 1; a.snap(); a.setPose('idle');
      return {
        p, i, x, actor: a,
        notes: this.chart.map((c) => ({ ...c, judged: null, jt: 0, flub: false, ai: null })),
        next: 0, score: 0, combo: 0, maxCombo: 0, perfects: 0, goods: 0, misses: 0, imps: 0,
        fever: false, feverT: 0, flash: 0, flashColor: '#fff', wrong: 0, hitPulse: 0,
      };
    });
    this.imps = [];
    this.beams = [];
    this.boss = null;
    this.clock = 0;          // seconds since GO (own clock)
    this.preT = 0;
    this.started = false;
    this.useAudio = false;
    this.beatNow = -6;
    this.lastBeat = -6;
    this.spawnT = 2;
    this.banners = [];
    this.calls = {};
    this.finished = false;
    this.finale = false;
    this.lights = Array.from({ length: 14 }, (_, i) => ({ x: (i + 0.5) * (W / 14), ph: rand(TAU) }));
    this.crowd = Array.from({ length: 46 }, (_, i) => ({ x: (i / 45) * W + rand(-12, 12), h: rand(26, 44), ph: rand(TAU), c: pick(['#ff6fd0', '#3fd3ff', '#ffd23f', '#7dff9a', '#c49bff']) }));
    try { music.preload && music.preload('dance'); } catch (e) { /* optional */ }
    // A couple of imps peek in during the countdown.
    for (let i = 0; i < Math.min(4, 1 + n); i++) this.spawnImp(true);
  }

  // ---- time ----------------------------------------------------------------
  computeBeat(dt) {
    this.clock += dt;
    if (this.useAudio && music.name === 'dance' && audioRunning()) return music.beat();
    return this.clock / SPB;
  }

  preUpdate(dt) {
    this.preT += dt;
    this.beatNow = (this.preT - 3) / SPB;  // negative during 3-2-1
    for (const L of this.lanes) {
      const a = L.actor;
      if (this.preT > 0.5 && a.pose === 'idle') a.playOnce('ready', 0.6, 'idle');
      a.update(dt);
    }
    this.updateImps(dt);
  }

  update(dt) {
    if (!this.started) {
      this.started = true;
      this.useAudio = audioRunning();
      if (this.useAudio) music.play('dance', { restart: true });
      this.clock = 0;
      this.lastBeat = 0;
      for (const L of this.lanes) L.actor.setPose('dance');
      this.banner('Press the buttons on the beat!', 2.2, '#ffffff', 64);
    }
    let b = this.computeBeat(dt);
    this.dtBeat = Math.max(0, b - this.lastBeat);
    // Pause / tab switch: the music kept going. Skip notes we flew past without penalty.
    if (b - this.lastBeat > 1.2) {
      for (const L of this.lanes) for (const nn of L.notes) if (!nn.judged && nn.beat < b - GOOD) nn.judged = 'skip';
    }
    this.lastBeat = b;
    this.beatNow = b;
    this.updateCalls(b);

    for (const L of this.lanes) {
      if (L.p.isAI) this.ai(L, b);
      const c = L.p.ctrl;
      for (const btn of BTNS) if (c.pressed(btn)) this.press(L, btn, b);
      // misses
      while (L.next < L.notes.length) {
        const nn = L.notes[L.next];
        if (nn.judged) { L.next++; continue; }
        if (nn.beat < b - GOOD) { this.miss(L, nn); L.next++; continue; }
        break;
      }
      L.flash = Math.max(0, L.flash - dt * 4);
      L.wrong = Math.max(0, L.wrong - dt * 4);
      L.hitPulse = Math.max(0, L.hitPulse - dt * 5);
      if (L.fever) L.feverT += dt;
      const a = L.actor;
      if (!this.finale && a.pose === 'dance') a.poseTime = Math.max(0, b) / 2.2;
      a.update(dt);
    }
    this.updateImps(dt);
    this.updateBoss(dt, b);
    this.updateBeams(dt);
    for (const bn of this.banners) bn.t += dt;
    this.banners = this.banners.filter((bn) => bn.t < bn.dur);

    // Imps keep creeping in (more with more players, more as the song goes on).
    if (b > 2 && b < BOSS_BEAT - 2) {
      this.spawnT -= dt;
      const prog = clamp(b / BOSS_BEAT, 0, 1);
      if (this.spawnT <= 0) {
        this.spawnT = lerp(2.8, 1.5, prog) / (0.7 + 0.3 * this.n);
        if (this.imps.filter((m) => m.state !== 'poof').length < 4 + this.n) this.spawnImp();
      }
    }

    // Finale
    if (b >= 124.5 && !this.finale) this.startFinale();
    if (this.finale) this.updateFinale(dt, b);
    if (b >= SONG_END && !this.finished) this.finishGame();
  }

  postUpdate(dt) {
    this.clock += dt;
    for (const L of this.lanes) L.actor.update(dt);
    this.updateImps(dt);
    this.updateBeams(dt);
  }

  banner(text, dur = 1.6, color = '#ffd23f', size = 84) {
    this.banners = [{ text, t: 0, dur, color, size }];
  }

  updateCalls(b) {
    const call = (key, at, fn) => { if (b >= at && !this.calls[key]) { this.calls[key] = true; fn(); } };
    call('b', 33.5, () => { this.banner('Now B joins in!', 1.8, BTN_COLOR.b); sfx('magic'); });
    call('xy', 65.5, () => { this.banner('X and Y too!', 1.8, '#7fd3ff'); sfx('magic'); });
    call('boss', BOSS_BEAT - 2, () => this.spawnBoss());
  }

  // ---- judging ---------------------------------------------------------------
  press(L, btn, b) {
    let target = null;
    for (let k = L.next; k < L.notes.length; k++) {
      const nn = L.notes[k];
      if (nn.beat - b > GOOD) break;
      if (!nn.judged && Math.abs(nn.beat - b) <= GOOD) { target = nn; break; }
    }
    if (!target) { L.hitPulse = 0.4; return; }    // a little whiff pulse, no penalty
    if (target.btn !== btn) {
      target.flub = true; L.wrong = 1;
      sfx('blip');
      return;
    }
    const d = Math.abs(target.beat - b);
    this.hit(L, target, d <= PERFECT && !target.flub ? 'perfect' : 'good');
  }

  hit(L, nn, grade) {
    nn.judged = grade; nn.jt = this.clock;
    L.combo++; L.maxCombo = Math.max(L.maxCombo, L.combo);
    if (grade === 'perfect') L.perfects++; else L.goods++;
    const base = grade === 'perfect' ? 100 : 60;
    const pts = base * (L.fever ? 2 : 1) * (nn.gold ? 2 : 1);
    L.score += pts;
    L.flash = 1; L.flashColor = BTN_COLOR[nn.btn]; L.hitPulse = 1;
    const x = L.x, y = HIT_Y;
    particles.burst(x, y, { type: grade === 'perfect' ? 'star' : 'sparkle', count: grade === 'perfect' ? 8 : 5, colors: [BTN_COLOR[nn.btn], '#ffffff', '#fff6a8'] });
    if (grade === 'perfect') particles.ring(x, y, '#ffffff', this.noteSize * 1.4, 0.3);
    this.judgeText(L, x, y - this.noteSize, grade === 'perfect' ? 'Perfect!' : 'Good!', grade === 'perfect' ? '#ffd23f' : '#7dffb4', this.n > 5 ? 34 : 42);
    sfx('note', { midi: BTN_MIDI[nn.btn] + (grade === 'perfect' ? 12 : 0), dur: 0.18, vol: 0.12 });
    const a = L.actor;
    if (!this.finale) a.playOnce(L.fever ? pick(['dance-star', 'dance-up']) : pick(['dance-up', 'dance-side', 'dance-down']), 0.3, 'dance');
    // fire a sparkle beam at an imp (or the boss)
    this.fireBeam(L, nn.btn);
    if (L.combo === FEVER_COMBO) {
      L.fever = true; L.feverT = 0;
      particles.popText(x, y - this.noteSize * 2, 'FEVER!', '#ff6fd0', 60);
      particles.burst(x, HIT_Y, { type: 'confetti', count: 30 });
      sfx('magic'); sfx('star'); fx.flash('#ffe6ff', 0.12);
      a.emote('sparkle', 2);
      if (!L.p.isAI) { try { L.p.ctrl.rumble(0.5, 200); } catch (e) { /* ignore */ } }
    } else if (L.combo > 0 && L.combo % 10 === 0) {
      particles.popText(x, y + 80, `${L.combo} combo!`, '#ffffff', 40);
      sfx('collect', { step: Math.min(12, L.combo / 10 * 2) });
      a.emote('star', 1);
    }
  }

  /** One judgement text per lane at a time (the newest replaces the old one). */
  judgeText(L, x, y, str, color, size) {
    if (L.lastText) L.lastText.age = L.lastText.maxLife;
    L.lastText = particles.popText(x, y, str, color, size);
  }

  miss(L, nn) {
    nn.judged = 'miss'; nn.jt = this.clock;
    const hadCombo = L.combo;
    L.combo = 0; L.misses++;
    if (L.fever) { L.fever = false; particles.popText(L.x, HIT_Y - 60, 'Fever over', '#c9b6ff', 34); }
    if (!this.finale) L.actor.playOnce('hurt', 0.32, 'dance');
    this.judgeText(L, L.x + this.laneW * 0.22, HIT_Y + this.noteSize * 0.55, 'Miss', '#b9a8d9', this.n > 5 ? 26 : 30);
    if (hadCombo >= 5) sfx('aww');
    // A cheeky imp sneaks a little closer and giggles.
    const near = this.imps.filter((m) => m.state === 'creep').sort((p, q) => Math.abs(p.x - L.x) - Math.abs(q.x - L.x))[0];
    if (near) { near.mood = 'giggle'; near.moodT = 0.8; if (chance(0.5)) snd('npc/imp/giggle', 'giggle'); }
  }

  // ---- imps and beams -----------------------------------------------------------
  spawnImp(peek = false) {
    const side = chance(0.5) ? -1 : 1;
    const L = pick(this.lanes);
    const r = rand(26, 38) * (this.n > 5 ? 0.85 : 1);
    this.imps.push({
      x: side < 0 ? -70 : W + 70, y: rand(650, 800), r, side,
      tx: peek ? (side < 0 ? rand(60, 160) : W - rand(60, 160)) : L.x + rand(-80, 80), ty: rand(660, 790),
      speed: rand(55, 95), state: 'creep', t: rand(10), seed: rand(TAU), colors: pick(IMP_COLORS), mood: 'grin', moodT: 0, targeted: false,
    });
    if (!peek && chance(0.3)) snd('npc/imp/giggle', null);
  }

  updateImps(dt) {
    for (const m of this.imps) {
      m.t += dt;
      if (m.moodT > 0) { m.moodT -= dt; if (m.moodT <= 0) m.mood = 'grin'; }
      if (m.state === 'creep') {
        const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
        if (d > 4) { m.x += (dx / d) * Math.min(d, m.speed * dt); m.y += (dy / d) * Math.min(d, m.speed * dt); }
        else if (chance(dt * 0.5)) { m.tx = clamp(m.x + rand(-140, 140), 40, W - 40); m.ty = rand(650, 800); }
      } else if (m.state === 'poof') {
        m.pt += dt;
      }
    }
    this.imps = this.imps.filter((m) => m.state !== 'poof' || m.pt < 0.35);
  }

  fireBeam(L, btn) {
    const a = L.actor;
    const from = { x: a.x + 10, y: a.y - a.height * 0.75 };
    let to, onHit;
    if (this.boss && this.boss.hp > 0 && !this.boss.dead) {
      const B = this.boss;
      to = { x: B.x + rand(-B.r * 0.5, B.r * 0.5), y: B.y + rand(-B.r * 0.4, B.r * 0.4) };
      onHit = () => this.hitBoss(L, to);
    } else {
      const cands = this.imps.filter((m) => m.state === 'creep' && !m.targeted && m.x > 150 && m.x < W - 150);
      cands.sort((p, q) => Math.hypot(p.x - from.x, p.y - from.y) - Math.hypot(q.x - from.x, q.y - from.y));
      const m = cands[0];
      if (m) {
        m.targeted = true; m.mood = 'eep'; m.moodT = 1;
        to = { x: m.x, y: m.y };
        onHit = () => this.poofImp(m, L);
      } else {
        to = { x: from.x + rand(-60, 60), y: TOP - 40 };
        onHit = () => particles.burst(to.x, HIT_Y - 260, { type: 'sparkle', count: 3, colors: [BTN_COLOR[btn], '#fff'] });
      }
    }
    this.beams.push({ from, to, color: BTN_COLOR[btn], t: 0, dur: 0.22, hitAt: 0.08, onHit, fever: L.fever });
  }

  updateBeams(dt) {
    for (const bm of this.beams) {
      const before = bm.t;
      bm.t += dt;
      if (before < bm.hitAt && bm.t >= bm.hitAt && bm.onHit) bm.onHit();
    }
    this.beams = this.beams.filter((bm) => bm.t < bm.dur);
  }

  poofImp(m, L) {
    if (m.state === 'poof') return;
    m.state = 'poof'; m.pt = 0;
    L.imps++;
    particles.burst(m.x, m.y, { type: 'sparkle', count: 10, colors: ['#ffffff', '#fff6a8', '#e0c8ff'] });
    particles.burst(m.x, m.y, { type: 'smoke', count: 6 });
    particles.burst(m.x, m.y, { type: 'star', count: 3, colors: ['#c49bff', '#ffd23f'] });
    if (hasSound('npc/imp/poof')) sfx('npc/imp/poof'); else sfx('pop');
  }

  spawnBoss() {
    const hp = 14 * this.n;
    this.boss = { x: W / 2, y: 790, r: 10, tr: this.n <= 3 ? 112 : 100, hp, max: hp, t: 0, hitT: 0, dead: false, deadT: 0, mood: 'grin' };
    this.banner('Uh-oh! A BIG Shadow Imp!', 2.2, '#c49bff', 76);
    snd('npc/imp/giggle', 'giggle'); sfx('whoosh');
    fx.shake(8, 0.3);
    // the little imps scatter
    for (const m of this.imps) if (m.state === 'creep') { m.tx = m.side < 0 ? -120 : W + 120; m.speed = 260; m.targeted = true; }
  }

  hitBoss(L, at) {
    const B = this.boss;
    if (!B || B.dead) return;
    B.hp--; B.hitT = 0.15; B.mood = 'eep';
    particles.burst(at.x, at.y, { type: 'sparkle', count: 4, colors: ['#ffffff', '#fff6a8'] });
    if (chance(0.25)) snd('npc/imp/eep', null);
    if (B.hp <= 0) this.defeatBoss(true);
  }

  defeatBoss(won) {
    const B = this.boss;
    if (!B || B.dead) return;
    B.dead = true; B.deadT = 0; B.won = won;
    particles.burst(B.x, B.y, { type: 'confetti', count: 80 });
    particles.burst(B.x, B.y, { type: 'star', count: 24 });
    particles.burst(B.x, B.y, { type: 'smoke', count: 16 });
    particles.ring(B.x, B.y, '#ffffff', 420, 0.5);
    sfx('bigpop'); sfx('fanfare');
    if (hasSound('npc/imp/poof')) sfx('npc/imp/poof');
    fx.shake(14, 0.35); fx.flash('#ffffff', 0.25); fx.slowmo(0.5, 0.4);
    this.banner(won ? 'Shadows banished!' : 'Bye-bye, imp!', 2.2, '#ffd23f', 90);
    for (const L of this.lanes) L.actor.playOnce('cheer', 0.5, 'dance');
  }

  updateBoss(dt, b) {
    const B = this.boss;
    if (!B) return;
    B.t += dt;
    B.r = damp(B.r, B.dead ? 0 : B.tr, B.dead ? 8 : 3, dt);
    B.x = W / 2 + Math.sin(B.t * 0.9) * Math.min(420, (this.n - 1) * this.spacing * 0.4 + 120);
    B.y = 790 + Math.sin(B.t * 1.7) * 12;
    if (B.hitT > 0) { B.hitT -= dt; if (B.hitT <= 0) B.mood = B.hp < B.max * 0.3 ? 'eep' : 'grin'; }
    if (B.dead) B.deadT += dt;
    if (!B.dead && b >= 123.5) this.defeatBoss(false);
  }

  // ---- finale -----------------------------------------------------------------------
  startFinale() {
    this.finale = true;
    this.finaleT = 0;
    particles.confettiRain(W, 140);
    snd('applause', 'cheer');
    const best = Math.max(...this.lanes.map((L) => L.score));
    this.lanes.forEach((L, i) => {
      L.actor.playOnce(L.score === best ? 'celebrate' : pick(['strike1', 'strike2', 'strike3']), 0.8, 'celebrate');
    });
    const star = this.lanes.find((L) => L.score === best);
    if (star) star.actor.say('Thank you!', 2.2, 'yay');
    this.banner('Encore!', 2.0, '#ff6fd0', 110);
    // No notes are left: the camera can lean in on the performers.
    if (this.api.camera) this.api.camera.follow(W / 2, 760, 1.12, 1.6);
  }

  updateFinale(dt) {
    this.finaleT += dt;
    if (chance(dt * 3)) {
      const x = rand(200, W - 200), y = rand(160, 460);
      particles.burst(x, y, { type: pick(['star', 'sparkle', 'confetti']), count: 16 });
      sfx('pop');
    }
  }

  finishGame() {
    this.finished = true;
    const scores = this.lanes.map((L) => L.score);
    const stats = this.lanes.map((L) => `${L.score} pts · best combo ${L.maxCombo}`);
    const best = Math.max(...scores);
    const win = this.lanes.filter((L) => L.score === best);
    const focus = win.length === 1 ? { x: win[0].actor.x, y: FLOOR_Y - win[0].actor.height * 0.6, zoom: 1.3 } : { x: W / 2, y: 780, zoom: 1.15 };
    this.api.finish({ placements: placementsFromScores(scores), stats, focus });
  }

  // ---- CPU -------------------------------------------------------------------------------
  ai(L, b) {
    const lvl = clamp(L.p.aiLevel ?? 0, 0, 2);
    const missRate = [0.3, 0.12, 0.04][lvl];
    const errS = [0.075, 0.045, 0.025][lvl];
    const wrongRate = [0.04, 0.02, 0][lvl];
    for (let k = L.next; k < L.notes.length; k++) {
      const nn = L.notes[k];
      if (nn.beat - b > 1) break;
      if (nn.judged) continue;
      if (!nn.ai) {
        // gentle bell curve around the beat, in beats
        const g = (Math.random() + Math.random() + Math.random() - 1.5) / 0.5 * errS;
        // later in the song (harder patterns) easy CPUs slip a little more
        const extra = nn.btn === 'x' || nn.btn === 'y' ? 0.06 * (2 - lvl) / 2 : 0;
        nn.ai = { skip: chance(missRate + extra), at: nn.beat + g / SPB, wrong: chance(wrongRate), done: false };
      }
      if (nn.ai.skip || nn.ai.done) continue;
      // Presses register on the next frame, so press half a frame early.
      if (b + (this.dtBeat || 0) * 0.5 >= nn.ai.at) {
        nn.ai.done = true;
        if (nn.ai.wrong) L.p.ctrl.press(pick(BTNS.filter((x) => x !== nn.btn)));
        else L.p.ctrl.press(nn.btn);
        break; // one press per frame
      }
    }
  }

  // ---- drawing -----------------------------------------------------------------------------
  get anyFever() { return this.lanes.some((L) => L.fever) || (this.boss && this.boss.dead && this.boss.deadT < 3); }

  drawStage(g) {
    const b = this.beatNow, t = this.clock + this.preT;
    const pulse = Math.pow(1 - (((b % 1) + 1) % 1), 3);  // 1 on the beat, decays
    const bg = art('bg/pop-star-stage');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#140829'); gr.addColorStop(0.6, '#3a1466'); gr.addColorStop(1, '#5a1f86');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // big LED screen with pulsing circles
      g.save();
      ui.roundRect(g, 260, 110, W - 520, 520, 30);
      g.fillStyle = '#1d0d3d'; g.fill();
      g.clip();
      for (let i = 0; i < 18; i++) for (let j = 0; j < 7; j++) {
        const x = 300 + i * 78, y = 150 + j * 70;
        const k = 0.5 + 0.5 * Math.sin(t * 2 + i * 0.5 + j * 0.8 + b * 0.6);
        g.globalAlpha = 0.12 + 0.25 * k * (0.5 + pulse * 0.5);
        g.fillStyle = this.anyFever ? RAINBOW[(i + j + Math.floor(b)) % RAINBOW.length] : (j % 2 ? '#ff6fd0' : '#7f5cff');
        g.beginPath(); g.arc(x, y, 22, 0, TAU); g.fill();
      }
      g.restore();
      // truss with lights
      g.fillStyle = '#2b2140'; g.fillRect(0, 96, W, 18);
      for (const l of this.lights) {
        const on = 0.5 + 0.5 * Math.sin(t * 3 + l.ph);
        g.fillStyle = this.anyFever ? RAINBOW[Math.floor(l.x / 140 + b) % RAINBOW.length] : '#fff3b0';
        g.globalAlpha = 0.5 + 0.5 * on; g.beginPath(); g.arc(l.x, 114, 10, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      // speakers
      for (const sx of [40, W - 210]) {
        g.fillStyle = '#1a1030'; ui.roundRect(g, sx, 560, 170, 400, 18); g.fill();
        g.strokeStyle = '#4b3a78'; g.lineWidth = 4; g.stroke();
        for (const [cy, r] of [[650, 52], [800, 62], [915, 30]]) {
          const pr = r * (1 + pulse * 0.08);
          g.fillStyle = '#2d2350'; g.beginPath(); g.arc(sx + 85, cy, pr, 0, TAU); g.fill();
          g.fillStyle = '#0d0820'; g.beginPath(); g.arc(sx + 85, cy, pr * 0.45, 0, TAU); g.fill();
        }
      }
    }
    // sweeping spotlights
    g.save(); g.globalCompositeOperation = 'lighter';
    const cols = this.anyFever ? RAINBOW : ['#ff6fd0', '#3fd3ff', '#fff3b0', '#b77bff'];
    for (let i = 0; i < 5; i++) {
      const sx = W * (0.1 + i * 0.2), sw = Math.sin(t * 0.8 + i * 1.7) * 380;
      g.globalAlpha = 0.07 + pulse * 0.05;
      g.fillStyle = cols[(i + (this.anyFever ? Math.floor(b) : 0)) % cols.length];
      g.beginPath(); g.moveTo(sx - 26, 100); g.lineTo(sx + 26, 100); g.lineTo(sx + sw + 260, FLOOR_Y); g.lineTo(sx + sw - 260, FLOOR_Y); g.closePath(); g.fill();
    }
    g.restore();
    // stage floor with LED tiles
    g.fillStyle = '#21123f'; g.fillRect(0, 930, W, H - 930);
    g.fillStyle = '#ff6fd0'; g.fillRect(0, 926, W, 6);
    const tiles = 16;
    for (let i = 0; i < tiles; i++) {
      const lit = (i + Math.floor(Math.max(0, b))) % 4 === 0;
      g.globalAlpha = lit ? 0.35 + pulse * 0.4 : 0.12;
      g.fillStyle = this.anyFever ? RAINBOW[i % RAINBOW.length] : (i % 2 ? '#7f5cff' : '#ff6fd0');
      g.fillRect(i * (W / tiles) + 4, 940, W / tiles - 8, 120);
    }
    g.globalAlpha = 1;
    // crowd light sticks along the very bottom
    for (const c of this.crowd) {
      const sway = Math.sin(b * Math.PI + c.ph) * 0.4;
      g.save(); g.translate(c.x, H + 10); g.rotate(sway);
      g.fillStyle = 'rgba(10,5,25,0.85)'; g.beginPath(); g.arc(0, 0, 28, Math.PI, TAU); g.fill();
      g.strokeStyle = c.c; g.lineWidth = 6; g.lineCap = 'round'; g.globalAlpha = 0.85;
      g.beginPath(); g.moveTo(16, -10); g.lineTo(26, -10 - c.h); g.stroke();
      g.restore();
    }
    // dark edges where the imps come from
    for (const side of [0, 1]) {
      const gx = side ? W : 0;
      const gg = g.createLinearGradient(gx, 0, side ? W - 260 : 260, 0);
      gg.addColorStop(0, 'rgba(8,3,20,0.85)'); gg.addColorStop(1, 'rgba(8,3,20,0)');
      g.fillStyle = gg; g.fillRect(side ? W - 260 : 0, 0, 260, H);
    }
  }

  yOf(beat) { return HIT_Y - (beat - this.beatNow) * ((HIT_Y - TOP) / TRAVEL); }

  drawLane(g, L) {
    const b = this.beatNow, x = L.x, w = this.laneW, ns = this.noteSize;
    const top = TOP - 10, bot = HIT_Y + ns * 0.9;
    g.save();
    ui.roundRect(g, x - w / 2, top, w, bot - top, 26);
    g.fillStyle = 'rgba(12,6,32,0.62)'; g.fill();
    if (L.fever) {
      g.save(); g.clip();
      g.globalAlpha = 0.28;
      const off = (L.feverT * 300) % 700;
      for (let i = -1; i < 9; i++) { g.fillStyle = RAINBOW[(i + 70) % RAINBOW.length]; g.fillRect(x - w / 2, top + i * 100 - 700 + off + 700 * 0, w, 100); }
      g.restore();
    }
    if (L.flash > 0) { g.globalAlpha = L.flash * 0.25; g.fillStyle = L.flashColor; g.fill(); g.globalAlpha = 1; }
    if (L.wrong > 0) { g.globalAlpha = L.wrong * 0.25; g.fillStyle = '#ff4d6d'; g.fill(); g.globalAlpha = 1; }
    g.lineWidth = 5; g.strokeStyle = L.fever ? RAINBOW[Math.floor(L.feverT * 10) % RAINBOW.length] : L.p.color; g.stroke();
    g.clip();
    // beat lines
    for (let k = Math.ceil(b); k <= b + TRAVEL + 0.5; k++) {
      const y = this.yOf(k);
      g.globalAlpha = k % 4 === 0 ? 0.35 : 0.14;
      g.fillStyle = '#ffffff'; g.fillRect(x - w / 2 + 10, y - (k % 4 === 0 ? 2 : 1), w - 20, k % 4 === 0 ? 4 : 2);
    }
    g.globalAlpha = 1;
    g.restore();
    // hit target
    const pulse = Math.pow(1 - (((b % 1) + 1) % 1), 3);
    g.save();
    g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.globalAlpha = 0.65 + pulse * 0.35;
    const rr = ns * 0.58 * (1 + pulse * 0.08 + L.hitPulse * 0.12);
    g.beginPath(); g.arc(x, HIT_Y, rr, 0, TAU); g.stroke();
    g.globalAlpha = 0.25; g.fillStyle = '#ffffff'; g.fill();
    g.globalAlpha = 0.5; g.fillRect(x - w / 2 + 8, HIT_Y - 2, w / 2 - 8 - rr, 4); g.fillRect(x + rr, HIT_Y - 2, w / 2 - 8 - rr, 4);
    g.restore();
    // notes
    const startK = Math.max(0, L.next - 6);
    for (let k = startK; k < L.notes.length; k++) {
      const nn = L.notes[k];
      if (nn.beat > b + TRAVEL + 0.4) break;
      if (nn.judged === 'skip') continue;
      if (nn.judged === 'perfect' || nn.judged === 'good') {
        const age = this.clock - nn.jt;
        if (age > 0.18) continue;
        const k2 = age / 0.18;
        drawNote(g, nn.btn, x, HIT_Y, ns * (1 + k2 * 0.6), this.clock, { alpha: 1 - k2, gold: nn.gold });
        continue;
      }
      if (nn.judged === 'miss') {
        const age = this.clock - nn.jt;
        if (age > 0.4) continue;
        drawNote(g, nn.btn, x, Math.min(this.yOf(nn.beat) + age * 60, HIT_Y + ns * 0.4), ns * 0.85 * (1 - age), this.clock, { alpha: 0.5 * (1 - age / 0.4) });
        continue;
      }
      const y = this.yOf(nn.beat);
      if (y < TOP - ns) continue;
      const appear = clamp((y - (TOP - ns * 0.5)) / 60, 0, 1);
      drawNote(g, nn.btn, x, y, ns * (0.7 + 0.3 * appear), this.clock, { alpha: appear, gold: nn.gold });
    }
    // combo
    if (L.combo >= 3) {
      const k = Math.min(1, L.combo / FEVER_COMBO);
      ui.text(g, `${L.combo}`, x, HIT_Y + ns * 0.95 + 4, { size: this.n > 5 ? 34 : 42, color: L.fever ? RAINBOW[Math.floor(this.clock * 12) % RAINBOW.length] : '#ffffff' });
      if (!L.fever) {
        // little fever gauge
        ui.bar(g, x - w * 0.35, HIT_Y + ns * 0.95 + 30, w * 0.7, 12, k, '#ff6fd0', { lineWidth: 2 });
      }
    }
    // first-notes helper
    if (b < 10 && b > -2) {
      ui.text(g, 'Press', x, HIT_Y + ns * 1.25, { size: 28, color: '#fff' });
      ui.glyph(g, 'a', x, HIT_Y + ns * 1.25 + 44, 44, { pulse: true });
    }
  }

  drawBeams(g) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const bm of this.beams) {
      const p = bm.t / bm.dur;
      const reach = Math.min(1, bm.t / bm.hitAt);
      const x1 = lerp(bm.from.x, bm.to.x, reach), y1 = lerp(bm.from.y, bm.to.y, reach);
      g.globalAlpha = 1 - p;
      g.strokeStyle = bm.fever ? RAINBOW[Math.floor(this.clock * 20) % RAINBOW.length] : bm.color;
      g.lineWidth = 18 * (1 - p) + 2;
      g.beginPath(); g.moveTo(bm.from.x, bm.from.y); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 6 * (1 - p) + 1;
      g.beginPath(); g.moveTo(bm.from.x, bm.from.y); g.lineTo(x1, y1); g.stroke();
    }
    g.restore();
  }

  drawImps(g) {
    if (hasImpArt()) {
      for (const m of this.imps) {
        const a = impActor(m, m.r);
        a.x = m.x; a.y = m.y + m.r * 1.3; a.facing = m.side > 0 ? -1 : 1;
        a.setPose(m.state === 'poof' ? 'poof' : m.mood === 'giggle' ? 'laugh' : m.mood === 'eep' ? 'surprised' : 'idle');
        a.update(1 / 60);
        a.draw(g, { alpha: m.state === 'poof' ? 1 - m.pt / 0.35 : 1, shadow: false });
      }
      return;
    }
    for (const m of this.imps) {
      if (m.state === 'poof') {
        const k = m.pt / 0.35;
        g.save(); g.globalAlpha = 1 - k;
        drawImp(g, m.x, m.y - k * 20, m.r * (1 + k * 0.6), m.t, { colors: m.colors, mood: 'eep', seed: m.seed });
        g.restore();
        continue;
      }
      const look = Math.sign((W / 2) - m.x);
      drawImp(g, m.x, m.y + Math.sin(m.t * 3 + m.seed) * 8, m.r, m.t, { colors: m.colors, mood: m.mood, seed: m.seed, flip: m.side > 0, look });
    }
  }

  drawBoss(g, barOnly) {
    const B = this.boss;
    if (!B || B.r < 2) return;
    if (barOnly) {
      if (!B.dead) {
        const bx = clamp(B.x, 260, W - 260), by = HIT_Y + this.noteSize * 0.9 + 64;
        ui.bar(g, bx - 150, by, 300, 22, B.hp / B.max, '#b77bff', { bg: 'rgba(0,0,0,0.5)' });
      }
      return;
    }
    if (hasImpArt()) {
      const a = impActor(B, B.r);
      a.x = B.x + (B.hitT > 0 ? rand(-6, 6) : 0); a.y = B.y + B.r * 1.3;
      a.setPose(B.dead ? 'poof' : B.mood === 'eep' ? 'surprised' : 'laugh');
      if (B.hitT > 0) a.flash('#ffffff', 0.1);
      a.update(1 / 60); a.draw(g, { shadow: false });
      return;
    }
    g.save();
    if (B.hitT > 0) { g.translate(rand(-6, 6), rand(-4, 4)); }
    drawImp(g, B.x, B.y, B.r, B.t, { colors: ['#4a2a8a', '#1a1046'], mood: B.dead ? 'eep' : B.mood, seed: 1, look: 0 });
    if (B.hitT > 0) {
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = B.hitT / 0.15 * 0.5;
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(B.x, B.y, B.r, 0, TAU); g.fill();
    }
    g.restore();
  }

  draw(g) {
    this.drawStage(g);
    this.drawBoss(g, false);
    for (const L of this.lanes) this.drawLane(g, L);
    this.drawBoss(g, true);
    this.drawImps(g);
    // characters
    for (const L of this.lanes) {
      const a = L.actor;
      if (L.fever) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35;
        const gr = g.createRadialGradient(a.x, a.y - a.height * 0.5, 10, a.x, a.y - a.height * 0.5, a.height * 0.8);
        gr.addColorStop(0, RAINBOW[Math.floor(this.clock * 8) % RAINBOW.length]); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(a.x, a.y - a.height * 0.5, a.height * 0.8, 0, TAU); g.fill();
        g.restore();
      }
      a.draw(g, { ring: L.p.color, emotes: true });
    }
    this.drawBeams(g);
  }

  /** Screen-space HUD (above the camera view and particles). */
  drawHUD(g) {
    ui.scoreboard(g, this.players, this.lanes.map((L) => L.score), { y: 12, format: (v) => String(v) });
    // tags under the performers (and floating above them for the first bars)
    for (const L of this.lanes) {
      ui.text(g, L.p.tag, L.x, FLOOR_Y + 38, { size: 28, color: L.p.color, strokeWidth: 6 });
      if (this.beatNow < 8) ui.playerTag(g, L.p, L.x, FLOOR_Y - L.actor.height - 40);
    }
    // song progress (thin line along the very top)
    const prog = clamp(this.beatNow / SONG_END, 0, 1);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, 0, W, 8);
    g.fillStyle = this.anyFever ? RAINBOW[Math.floor(this.clock * 10) % RAINBOW.length] : '#ff6fd0'; g.fillRect(0, 0, W * prog, 8);
    // banners
    for (const bn of this.banners) {
      const fade = bn.t > bn.dur - 0.3 ? (bn.dur - bn.t) / 0.3 : 1;
      g.save(); g.globalAlpha = clamp(fade, 0, 1);
      ui.banner(g, bn.text, bn.t, { size: Math.min(bn.size, 80), y: 880, color: bn.color, tilt: -0.03 });
      g.restore();
    }
  }
}
