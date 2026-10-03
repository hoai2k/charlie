import { loadRhythmSongs, chooseSong, rhythmOptions, musicKey } from './rhythm/songs.js';
import { drawNpcSprite } from '../engine/npc-art.js';
// Spotlight Dance-Off - memory game.
// Cute Shadow Imps stole the spotlight! They perform a dance sequence (arrows +
// A "sparkle"); everyone copies it from memory at the same time. A perfect copy
// makes your idol dance and fire a sparkle beam that poofs an imp (+1). A wrong
// move costs a heart. The sequence grows by one move every round.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, music, host, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { drawHeartShape, starPath } from '../engine/emotes.js';
import { clamp, lerp, rand, randInt, chance, pick, placementsFromScores, ease, TAU } from '../engine/util.js';

const NAVY = ui.NAVY;
const TOTAL_ROUNDS = 6;
const START_LEN = 3;
const HEARTS = 3;
const MOVES = ['U', 'D', 'L', 'R', 'A'];
const MOVE = {
  U: { color: '#ff5fa2', dark: '#c21f6c', name: 'Up', pose: 'dance-up', midi: 72, rot: 0 },
  D: { color: '#35c8ff', dark: '#0e86c0', name: 'Down', pose: 'dance-down', midi: 67, rot: Math.PI },
  L: { color: '#ffd23f', dark: '#c99400', name: 'Left', pose: 'dance-side', midi: 70, rot: -Math.PI / 2 },
  R: { color: '#7be04d', dark: '#3d9e1c', name: 'Right', pose: 'dance-side', midi: 75, rot: Math.PI / 2 },
  A: { color: '#b673ff', dark: '#7a35c9', name: 'Sparkle', pose: 'dance-star', midi: 79, rot: 0 },
};
// Recorded move notes (pitched to MOVE[].midi); the synth note when a file is missing.
const NOTE_KEY = { U: 'note-u', D: 'note-d', L: 'note-l', R: 'note-r', A: 'note-star' };
function moveNote(mv, fileVol, synth) {
  if (hasSound(NOTE_KEY[mv])) sfx(NOTE_KEY[mv], { vol: fileVol });
  else sfx('note', synth);
}
const IMP_EYES = ['#7dfff0', '#ffe66d', '#ff9be8', '#a9ff7d', '#8fb4ff', '#ffb07d'];

loadRhythmSongs();

export const meta = {
  id: 'spotlight-dance',
  title: 'Spotlight Dance-Off',
  category: 'party',
  type: 'Memory',
  goal: 'Watch the Shadow Imps dance, then copy their moves from memory!',
  controls: [['dpad', 'Arrow moves (or the stick)'], ['a', 'Sparkle move']],
  tips: [
    'Watch closely - the dance gets one move longer every round!',
    'A perfect copy zaps an imp with a sparkle beam: +1 point.',
    'Careful! A wrong move or running out of time costs a heart.',
  ],
  music: 'dance',
  options: rhythmOptions('spotlight-dance', { level: false }),
  duration: '~1.5 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#1b0c40'); gr.addColorStop(0.65, '#5a2090'); gr.addColorStop(1, '#2a1250');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    // light cones
    const cols = ['rgba(120,255,240,0.28)', 'rgba(255,120,200,0.3)', 'rgba(255,230,110,0.25)'];
    cols.forEach((c, i) => {
      const sx = x + w * (0.2 + i * 0.3), sway = Math.sin(t * 1.4 + i * 2) * w * 0.08;
      g.fillStyle = c; g.beginPath(); g.moveTo(sx - 6, y); g.lineTo(sx + 6, y); g.lineTo(sx + sway + w * 0.17, y + h * 0.85); g.lineTo(sx + sway - w * 0.17, y + h * 0.85); g.closePath(); g.fill();
    });
    // floor
    g.fillStyle = '#3a1670'; g.fillRect(x, y + h * 0.78, w, h * 0.22);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(x + w * 0.5, y + h * 0.88, w * 0.3, h * 0.06, 0, 0, TAU); g.fill();
    // imp
    drawImp(g, x + w * 0.5, y + h * 0.92, h * 0.0037, { t, seed: 1, move: MOVES[Math.floor(t * 1.5) % 5], mt: (t * 1.5) % 1 * 0.5, eye: IMP_EYES[0] });
    drawImp(g, x + w * 0.17, y + h * 0.86, h * 0.0024, { t, seed: 3, move: null, eye: IMP_EYES[1] });
    drawImp(g, x + w * 0.84, y + h * 0.86, h * 0.0024, { t, seed: 5, move: null, eye: IMP_EYES[2] });
    // arrow icons
    const mv = ['U', 'R', 'A'];
    mv.forEach((m, i) => drawMoveIcon(g, m, x + w * (0.34 + i * 0.16), y + h * 0.2, h * 0.17, { pop: 0.9 + 0.1 * Math.sin(t * 4 + i) }));
  },
};

// ---------------------------------------------------------------------------
// Drawing helpers

function arrowPath(g, s) {
  g.beginPath();
  g.moveTo(0, -s * 0.38);
  g.lineTo(s * 0.34, 0.0);
  g.lineTo(s * 0.14, 0.0);
  g.lineTo(s * 0.14, s * 0.36);
  g.lineTo(-s * 0.14, s * 0.36);
  g.lineTo(-s * 0.14, 0.0);
  g.lineTo(-s * 0.34, 0.0);
  g.closePath();
}

/** A big colored button icon for a move. o: { pop, alpha, glow, dim } */
function drawMoveIcon(g, mv, x, y, size, o = {}) {
  const m = MOVE[mv];
  const k = o.pop ?? 1;
  g.save(); g.translate(x, y); g.scale(k, k);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  const r = size / 2;
  if (o.glow) {
    const gl = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.9);
    gl.addColorStop(0, m.color + 'aa'); gl.addColorStop(1, m.color + '00');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 1.9, 0, TAU); g.fill();
  }
  const gr = g.createLinearGradient(0, -r, 0, r);
  gr.addColorStop(0, o.dim ? '#6d6590' : m.color); gr.addColorStop(1, o.dim ? '#443b66' : m.dark);
  ui.roundRect(g, -r, -r, size, size, size * 0.26);
  g.fillStyle = gr; g.fill();
  g.lineWidth = Math.max(2.5, size * 0.06); g.strokeStyle = NAVY; g.stroke();
  g.lineWidth = Math.max(1.5, size * 0.03); g.strokeStyle = 'rgba(255,255,255,0.75)';
  ui.roundRect(g, -r * 0.92, -r * 0.92, size * 0.92, size * 0.92, size * 0.22); g.stroke();
  g.lineJoin = 'round';
  if (mv === 'A') {
    g.save(); starPath(g, r * 0.82, 0.5);
    g.fillStyle = '#fff6b0'; g.fill(); g.lineWidth = Math.max(2, size * 0.05); g.strokeStyle = NAVY; g.stroke(); g.restore();
    ui.text(g, 'A', 0, r * 0.06, { size: size * 0.4, color: '#7a35c9', strokeWidth: size * 0.06, shadow: false });
  } else {
    g.save(); g.rotate(m.rot);
    arrowPath(g, size * 1.15);
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = Math.max(2, size * 0.055); g.strokeStyle = NAVY; g.stroke();
    g.restore();
  }
  g.restore();
}

/** The cute mischievous Shadow Imp: a round purple-navy puffball with glowing eyes and bat-ish ears. */
function drawImp(g, x, y, s, o = {}) {
  const variant = ['shadow-imp', 'shadow-imp-blue', 'shadow-imp-pink'][Math.abs(Math.floor(o.seed || 0)) % 3];
  const pose = ({ U: 'dance-up', D: 'dance-down', L: 'dance-side', R: 'dance-side', A: 'dance-star' })[o.move]
    || (o.mood === 'eep' ? 'surprised' : 'idle');
  if (drawNpcSprite(g, variant, x, y, 175 * s * (o.scale ?? 1), o.move ? (o.mt || 0) : (o.t || 0), {
    pose, facing: o.move === 'L' ? -1 : 1, alpha: o.alpha ?? 1, bob: 3 * s,
  })) return;

  const t = o.t || 0, seed = o.seed || 0;
  const R = 58;
  const mt = o.mt ?? 0;
  const mood = o.mood || 'normal';
  let jump = 0, sy = 1, sx = 1, rot = 0, dx = 0;
  let armL = { x: -1.0, y: 0.35 }, armR = { x: 1.0, y: 0.35 }, starEyes = false, sparkles = false;
  // idle wobble
  const wob = Math.sin(t * 4 + seed * 2);
  sy = 1 + wob * 0.03; sx = 1 - wob * 0.02;
  jump = -Math.abs(Math.sin(t * 2.2 + seed)) * 6;
  const k = o.move ? Math.min(1, mt / 0.1) : 0;
  switch (o.move) {
    case 'U': jump = -50 * k * (0.7 + 0.3 * Math.abs(Math.sin(mt * 12))); sy = 1 + 0.12 * k; sx = 1 - 0.06 * k; armL = { x: -0.8, y: -0.95 }; armR = { x: 0.8, y: -0.95 }; break;
    case 'D': sy = 1 - 0.22 * k; sx = 1 + 0.16 * k; armL = { x: -1.05, y: 0.75 }; armR = { x: 1.05, y: 0.75 }; jump = 0; break;
    case 'L': rot = -0.3 * k; dx = -22 * k; armL = { x: -1.6, y: -0.05 }; armR = { x: 0.9, y: 0.55 }; break;
    case 'R': rot = 0.3 * k; dx = 22 * k; armR = { x: 1.6, y: -0.05 }; armL = { x: -0.9, y: 0.55 }; break;
    case 'A': rot = Math.sin(mt * 16) * 0.22 * k; sy = 1 + 0.08 * k; sx = 1 - 0.05 * k; jump = -26 * k * Math.abs(Math.sin(mt * 7)); armL = { x: -0.8, y: -0.95 }; armR = { x: 0.8, y: -0.95 }; starEyes = true; sparkles = true; break;
    default: break;
  }
  const poofK = o.scale ?? 1;
  if (poofK <= 0.01) return;
  // shadow
  g.save();
  g.globalAlpha = 0.3 * (o.alpha ?? 1); g.fillStyle = '#000';
  g.beginPath(); g.ellipse(x, y + 2, 50 * s * poofK, 11 * s * poofK, 0, 0, TAU); g.fill();
  g.restore();
  g.save();
  g.globalAlpha *= (o.alpha ?? 1);
  g.translate(x + dx * s, y + jump * s); g.rotate(rot); g.scale(s * poofK * Math.max(0.05, Math.abs(sx)) * (sx < 0 ? -1 : 1), s * poofK * sy);
  const cy = -R;
  // aura
  const au = g.createRadialGradient(0, cy, R * 0.6, 0, cy, R * 1.9);
  au.addColorStop(0, 'rgba(150,100,255,0.35)'); au.addColorStop(1, 'rgba(150,100,255,0)');
  g.fillStyle = au; g.beginPath(); g.arc(0, cy, R * 1.9, 0, TAU); g.fill();
  // ears (tiny, bat-ish)
  for (const side of [-1, 1]) {
    const flap = Math.sin(t * 6 + seed + side) * 0.08;
    g.save(); g.translate(side * R * 0.5, cy - R * 0.86); g.rotate(side * (0.45 + flap));
    g.beginPath(); g.moveTo(-R * 0.2, 0); g.quadraticCurveTo(-R * 0.1, -R * 0.55, side * R * 0.08, -R * 0.62); g.quadraticCurveTo(R * 0.22, -R * 0.3, R * 0.2, 0); g.closePath();
    g.fillStyle = '#3a2c80'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#120b33'; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = '#9a6ce0'; g.beginPath(); g.moveTo(-R * 0.09, -R * 0.04); g.quadraticCurveTo(0, -R * 0.36, side * R * 0.05, -R * 0.4); g.quadraticCurveTo(R * 0.12, -R * 0.2, R * 0.09, -R * 0.04); g.closePath(); g.fill();
    g.restore();
  }
  // arms (little nubs)
  for (const [side, arm] of [[-1, armL], [1, armR]]) {
    const ax = arm.x * R * 0.95, ay = cy + arm.y * R * 0.75;
    g.fillStyle = '#35278a'; g.strokeStyle = '#120b33'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(ax, ay, R * 0.2, R * 0.17, 0, 0, TAU); g.fill(); g.stroke();
    // tiny finger tufts
    g.fillStyle = '#5b46a8'; g.beginPath(); g.arc(ax + side * R * 0.08, ay - R * 0.06, R * 0.07, 0, TAU); g.fill();
  }
  // feet
  g.fillStyle = '#2a1d70'; g.strokeStyle = '#120b33'; g.lineWidth = 4;
  for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * R * 0.32, -R * 0.06, R * 0.2, R * 0.12, 0, 0, TAU); g.fill(); g.stroke(); }
  // fluffy body
  g.beginPath();
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU;
    const rr = R * (1 + 0.045 * Math.sin(a * 7 + t * 3 + seed) + 0.025 * Math.sin(a * 13 - t * 4));
    const px = Math.cos(a) * rr * 1.04, py = cy + Math.sin(a) * rr * 0.98;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  const bg = g.createRadialGradient(-R * 0.3, cy - R * 0.45, R * 0.1, 0, cy, R * 1.15);
  bg.addColorStop(0, '#6a54bd'); bg.addColorStop(0.55, '#34277f'); bg.addColorStop(1, '#1a1245');
  g.fillStyle = bg; g.fill(); g.lineWidth = 5; g.strokeStyle = '#120b33'; g.lineJoin = 'round'; g.stroke();
  // hair tuft
  g.strokeStyle = '#120b33'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-R * 0.08, cy - R * 0.96); g.quadraticCurveTo(-R * 0.18, cy - R * 1.25, R * 0.02, cy - R * 1.2); g.moveTo(R * 0.05, cy - R * 0.97); g.quadraticCurveTo(R * 0.2, cy - R * 1.2, R * 0.14, cy - R * 1.3); g.stroke();
  // blush
  g.fillStyle = 'rgba(255,110,190,0.45)';
  for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * R * 0.62, cy + R * 0.16, R * 0.14, R * 0.09, 0, 0, TAU); g.fill(); }
  // eyes
  const ec = o.eye || IMP_EYES[seed % IMP_EYES.length | 0];
  const lx = (o.lookX || 0), ly = (o.lookY || 0);
  const blink = (t * 0.9 + seed * 1.7) % 4.2 > 4.08;
  for (const side of [-1, 1]) {
    const ex = side * R * 0.36, ey = cy - R * 0.12;
    const halo = g.createRadialGradient(ex, ey, 2, ex, ey, R * 0.5);
    halo.addColorStop(0, ec + 'cc'); halo.addColorStop(1, ec + '00');
    g.fillStyle = halo; g.beginPath(); g.arc(ex, ey, R * 0.5, 0, TAU); g.fill();
    if (mood === 'laugh') {
      g.strokeStyle = '#fff8d0'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.arc(ex, ey + R * 0.08, R * 0.17, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    } else if (mood === 'eep') {
      g.strokeStyle = '#fff8d0'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex - side * R * 0.16, ey - R * 0.12); g.lineTo(ex + side * R * 0.08, ey); g.lineTo(ex - side * R * 0.16, ey + R * 0.12); g.stroke();
    } else if (blink) {
      g.strokeStyle = '#fff8d0'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex - R * 0.17, ey); g.lineTo(ex + R * 0.17, ey); g.stroke();
    } else {
      g.fillStyle = '#fffbe0'; g.beginPath(); g.ellipse(ex, ey, R * 0.22, R * 0.27, 0, 0, TAU); g.fill();
      g.strokeStyle = ec; g.lineWidth = 4; g.stroke();
      if (starEyes) {
        g.save(); g.translate(ex, ey); g.rotate(t * 3); starPath(g, R * 0.2, 0.5); g.fillStyle = '#b02ae0'; g.fill(); g.restore();
      } else {
        g.fillStyle = '#1b0f45'; g.beginPath(); g.ellipse(ex + lx * R * 0.07, ey + ly * R * 0.07 + R * 0.02, R * 0.12, R * 0.17, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + lx * R * 0.07 - R * 0.05, ey - R * 0.07, R * 0.06, 0, TAU); g.fill();
      }
      if (mood === 'smug') { g.fillStyle = '#34277f'; g.beginPath(); g.rect(ex - R * 0.26, ey - R * 0.3, R * 0.52, R * 0.3); g.fill(); g.strokeStyle = '#120b33'; g.lineWidth = 4; g.beginPath(); g.moveTo(ex - R * 0.26, ey); g.lineTo(ex + R * 0.26, ey); g.stroke(); }
    }
  }
  // mischievous grin
  g.beginPath();
  if (mood === 'laugh') { g.ellipse(0, cy + R * 0.42, R * 0.3, R * 0.2, 0, 0, Math.PI); g.closePath(); }
  else { g.moveTo(-R * 0.3, cy + R * 0.32); g.quadraticCurveTo(0, cy + R * 0.62, R * 0.3, cy + R * 0.32); g.quadraticCurveTo(0, cy + R * 0.42, -R * 0.3, cy + R * 0.32); }
  g.fillStyle = '#12082e'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#12082e'; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-R * 0.17, cy + R * 0.36); g.lineTo(-R * 0.09, cy + R * 0.36); g.lineTo(-R * 0.13, cy + R * 0.47); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(R * 0.17, cy + R * 0.36); g.lineTo(R * 0.09, cy + R * 0.36); g.lineTo(R * 0.13, cy + R * 0.47); g.closePath(); g.fill();
  g.restore();
  if (sparkles) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.1, sxp = x + Math.cos(a) * 52 * s, syp = y - 115 * s + Math.sin(a * 1.3) * 30 * s;
      g.save(); g.translate(sxp, syp); g.rotate(a); starPath(g, 9 * s, 0.4); g.fillStyle = '#fff6a8'; g.fill(); g.restore();
    }
  }
}

// ---------------------------------------------------------------------------

export class Game {
  constructor(api) {
    this.api = api;
    // Background song: the chosen rhythm song (only the stage lights follow its beat).
    const song = chooseSong('spotlight-dance');
    this.musicKey = song ? musicKey(song) : 'dance';
    try { music.preload(this.musicKey); } catch (e) { /* optional */ }
    this.players = api.players;
    this.n = this.players.length;
    this.solo = this.n === 1;
    this.t = 0;
    this.rows = this.n <= 4 ? 1 : 2;
    this.L = this.rows === 1
      ? { floorTop: 610, promptY: 345, iconSize: 240, impY: 520, impS: 1.3, feet: [958], sc: 1.22, cs: 1.5 }
      : { floorTop: 520, promptY: 300, iconSize: 170, impY: 400, impS: 0.85, feet: [738, 1040], sc: 0.8, cs: 1.0 };
    this.round = 0;
    this.seq = [];
    this.phase = 'intro';
    this.phaseT = 0;
    this.showIdx = -1;
    this.showMoveT = 0;
    this.beams = [];
    this.finished = false;
    this.hintRounds = 2;
    this.bgReady = null;
    this.stars = Array.from({ length: 50 }, (_, i) => ({ x: (i * 397) % W, y: (i * 211) % 560, p: i * 0.7, s: 3 + (i % 4) * 2 }));
    this.glow = Array.from({ length: 36 }, (_, i) => ({ x: (i + 0.5) * W / 36, ph: i * 0.9, c: ['#ff5fa2', '#35c8ff', '#ffd23f', '#7be04d', '#b673ff'][i % 5] }));
    this.makePlayers();
    this.makeImps();
    this.input = { timeLeft: 0, limit: 1 };
    this.banner = null;
    this.setPhase('intro');
  }

  // ---- setup --------------------------------------------------------------
  makePlayers() {
    const n = this.n, L = this.L, rows = this.rows;
    const perRow = rows === 1 ? n : Math.ceil(n / 2);
    const cw = rows === 1 ? Math.min(480, (W - 100) / Math.max(n, 3)) : Math.min(440, (W - 100) / perRow);
    this.cw = cw;
    this.isz = Math.min(rows === 1 ? 74 : 54, (cw - 30) / START_LEN - 5);
    this.pl = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const count = r === 0 ? perRow : n - perRow;
      for (let c = 0; c < count; c++) {
        const p = this.players[idx];
        const x = W / 2 + (c - (count - 1) / 2) * cw, y = L.feet[r];
        const a = new Actor(p, { scale: L.cs, x, y });
        a.scale = Math.min(L.cs, (cw * 0.8) / (a.width / a.scale));
        a.facing = x < W / 2 - 10 ? 1 : x > W / 2 + 10 ? -1 : 1;
        a.snap();
        this.pl[idx] = {
          p, i: idx, a, x, y, row: r, hearts: HEARTS, score: 0, alive: true, status: 'idle', entered: [], failIdx: -1,
          lastDir: null, flashIdx: -1, flashT: 0, shake: 0, light: 0.6, heartPop: 0, heartBreak: 0, scoreFlash: 0,
          ai: null, baseFacing: a.facing, doneOrder: 0,
        };
        idx++;
      }
    }
  }

  makeImps() {
    const L = this.L;
    const offs = this.rows === 1 ? [-880, -650, -430, 430, 650, 880] : [-820, -610, -410, 410, 610, 820];
    this.imps = offs.map((o, i) => ({
      x: W / 2 + o, y: L.impY + (Math.abs(o) > 500 ? -22 : 0) * L.impS, s: L.impS * (Math.abs(o) > 700 ? 0.9 : 1),
      seed: i * 1.7 + 0.3, alive: true, scale: 0, respawn: 0, popIn: i * 0.12, move: null, mt: 0, mood: 'normal', moodT: 0, eye: IMP_EYES[i % IMP_EYES.length],
    }));
  }

  // ---- phase machine ------------------------------------------------------
  setPhase(ph) { this.phase = ph; this.phaseT = 0; }

  startRound() {
    this.round++;
    const len = START_LEN + this.round - 1;
    // Build a sequence with no more than 2 of the same move in a row.
    const seq = [];
    while (seq.length < len) {
      const m = pick(MOVES);
      if (seq.length >= 2 && seq[seq.length - 1] === m && seq[seq.length - 2] === m) continue;
      seq.push(m);
    }
    this.seq = seq;
    this.isz = clamp((this.cw - 34) / seq.length - 5, 26, this.rows === 1 ? 74 : 54);
    for (const pl of this.pl) {
      pl.entered = []; pl.failIdx = -1; pl.flashIdx = -1;
      pl.status = pl.alive ? 'watching' : 'out';
      if (pl.alive) { pl.a.setPose('idle'); pl.a.clearEmotes(); pl.a.facing = pl.baseFacing; }
    }
    for (const im of this.imps) { if (!im.alive) { im.alive = true; im.respawn = 0; im.scale = 0; im.popIn = rand(0, 0.35); } im.move = null; im.mood = 'normal'; }
    this.showIdx = -1; this.showMoveT = 0;
    this.setPhase('announce');
    this.banner = { text: `Round ${this.round}`, sub: `${seq.length} moves - watch the imps!`, t: 0 };
    sfx('swap');
    if (this.round > 1) host(this.round >= TOTAL_ROUNDS ? 'final-round' : 'next-round');
  }

  showDur() { return clamp(0.82 - 0.04 * (this.seq.length - START_LEN), 0.52, 0.82); }

  beginInput() {
    this.setPhase('input');
    const L = this.seq.length;
    this.input.limit = this.input.timeLeft = 3.2 + 1.1 * L;
    for (const pl of this.pl) {
      if (!pl.alive) continue;
      pl.status = 'entering'; pl.entered = [];
      this.syncDir(pl);
      if (pl.p.isAI) { pl.p.ctrl.move(0, 0); this.planAI(pl); }
    }
    sfx('whistle');
    this.banner = { text: 'Your turn!', sub: '', t: 0 };
    for (const im of this.imps) { im.move = null; im.mood = 'smug'; im.moodT = 99; }
  }

  planAI(pl) {
    const p = pl.p, lvl = p.aiLevel ?? 0, L = this.seq.length;
    const base = [0.9, 0.96, 0.99][lvl], drop = [0.12, 0.07, 0.04][lvl];
    const pSucc = clamp(base - drop * (L - START_LEN), 0.04, 1);
    const ok = chance(pSucc);
    const pace = [[0.6, 0.95], [0.45, 0.72], [0.32, 0.5]][lvl];
    pl.ai = {
      idx: 0, next: reactionTime(p) + 0.35 + rand(0, 0.2), failAt: ok ? -1 : randInt(0, L - 1), pace, hold: 0, dir: null,
    };
  }

  // ---- update -------------------------------------------------------------
  preUpdate(dt) { this.t += dt; this.animate(dt); }
  postUpdate(dt) { this.t += dt; this.animate(dt); }

  animate(dt) {
    for (const pl of this.pl) {
      pl.a.update(dt);
      pl.shake = Math.max(0, pl.shake - dt);
      pl.flashT = Math.max(0, pl.flashT - dt);
      pl.heartPop = Math.max(0, pl.heartPop - dt);
      pl.heartBreak = Math.max(0, pl.heartBreak - dt);
      pl.scoreFlash = Math.max(0, pl.scoreFlash - dt);
      const target = !pl.alive ? 0.12 : pl.status === 'done' ? 1 : pl.status === 'failed' ? 0.22 : pl.status === 'entering' ? 0.85 : 0.55;
      pl.light = lerp(pl.light, target, Math.min(1, dt * 6));
    }
    for (const im of this.imps) {
      im.mt += dt;
      if (im.popIn > 0) { im.popIn -= dt; if (im.popIn <= 0) { im.scale = 0.01; im.growing = true; } }
      if (im.growing) { im.scale = Math.min(1, im.scale + dt * 3); if (im.scale >= 1) im.growing = false; }
      if (!im.alive && im.respawn > 0) { im.respawn -= dt; if (im.respawn <= 0) { im.alive = true; im.scale = 0.01; im.growing = true; sfx('npc/imp/giggle'); } }
      if (im.mood !== 'normal' && im.moodT < 90) { im.moodT -= dt; if (im.moodT <= 0) im.mood = 'normal'; }
    }
    if (this.banner) this.banner.t += dt;
  }

  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    this.animate(dt);
    this.updateBeams(dt);
    switch (this.phase) {
      case 'intro':
        if (this.phaseT > 2.4) this.startRound();
        break;
      case 'announce':
        if (this.phaseT > 1.5) { this.setPhase('show'); this.showIdx = -1; this.showT = 0.2; this.banner = null; }
        break;
      case 'show': this.updateShow(dt); break;
      case 'ready':
        if (this.phaseT > 1.0) this.beginInput();
        break;
      case 'input': this.updateInput(dt); break;
      case 'resolve':
        if (this.phaseT > 1.9 && this.beams.length === 0) this.nextRound();
        break;
      default: break;
    }
  }

  updateShow(dt) {
    this.showT -= dt;
    if (this.showT > 0) { this.showMoveT += dt; return; }
    // advance to next move
    this.showIdx++;
    if (this.showIdx >= this.seq.length) {
      for (const im of this.imps) { im.move = null; }
      this.setPhase('ready'); this.banner = { text: 'Your turn!', sub: '', t: 0 };
      sfx('go');
      return;
    }
    const mv = this.seq[this.showIdx];
    this.showT = this.showDur() + 0.14; this.showMoveT = 0;
    moveNote(mv, 0.7, { midi: MOVE[mv].midi, dur: 0.35, vol: 0.32 });
    if (mv === 'A') sfx('sparkle');
    this.imps.forEach((im, i) => { if (im.alive) { im.move = mv; im.mt = -i * 0.04; } });
    particles.burst(W / 2, this.L.promptY, { type: 'sparkle', count: 6, colors: [MOVE[mv].color, '#ffffff'], speed: [100, 300] });
    particles.ring(W / 2, this.L.promptY, MOVE[mv].color, this.L.iconSize * 0.9, 0.4);
  }

  /** Require the stick to be released before the next move counts. */
  syncDir(pl) {
    const c = pl.p.ctrl, x = c.x, y = c.y, m = Math.hypot(x, y);
    pl.lastDir = m > 0.35 ? (Math.abs(x) > Math.abs(y) ? (x > 0 ? 'R' : 'L') : (y > 0 ? 'D' : 'U')) : null;
  }

  readMove(pl) {
    const c = pl.p.ctrl;
    if (c.pressed('a')) return 'A';
    const x = c.x, y = c.y, m = Math.hypot(x, y);
    if (m < 0.35) { pl.lastDir = null; return null; }
    if (m > 0.6) {
      const d = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'R' : 'L') : (y > 0 ? 'D' : 'U');
      if (d !== pl.lastDir) { pl.lastDir = d; return d; }
    }
    return null;
  }

  aiInput(pl, dt) {
    const ai = pl.ai, c = pl.p.ctrl;
    if (!ai) return;
    if (ai.hold > 0) { ai.hold -= dt; if (ai.hold <= 0) { c.move(0, 0); } return; }
    ai.next -= dt;
    if (ai.next > 0 || ai.idx >= this.seq.length) return;
    let mv = this.seq[ai.idx];
    if (ai.idx === ai.failAt) { const others = MOVES.filter((m) => m !== mv); mv = pick(others); }
    ai.idx++;
    if (mv === 'A') c.press('a');
    else {
      const v = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[mv];
      c.move(v[0], v[1]); ai.hold = 0.12;
    }
    ai.next = rand(...ai.pace);
  }

  updateInput(dt) {
    this.input.timeLeft -= dt;
    for (const pl of this.pl) {
      if (pl.status !== 'entering') continue;
      if (pl.p.isAI) this.aiInput(pl, dt);
      const mv = this.readMove(pl);
      if (!mv) continue;
      this.enterMove(pl, mv);
    }
    const waiting = this.pl.some((pl) => pl.status === 'entering');
    if (this.input.timeLeft <= 0 && waiting) {
      for (const pl of this.pl) if (pl.status === 'entering') this.failPlayer(pl, true);
    }
    if (!this.pl.some((pl) => pl.status === 'entering')) {
      this.setPhase('resolve');
      const ok = this.pl.filter((q) => q.status === 'done').length;
      if (ok === 0) host('oops'); else if (ok === this.pl.filter((q) => q.status === 'done' || q.status === 'failed').length) host('perfect');
      for (const im of this.imps) { im.mood = 'normal'; im.moodT = 0; }
    }
  }

  enterMove(pl, mv) {
    const i = pl.entered.length;
    if (mv !== this.seq[i]) { pl.entered.push(mv); this.failPlayer(pl, false, i); return; }
    pl.entered.push(mv);
    pl.flashIdx = i; pl.flashT = 0.3;
    const m = MOVE[mv];
    // the idol strikes the move
    if (mv === 'L') pl.a.facing = -1; else if (mv === 'R') pl.a.facing = 1;
    pl.a.playOnce(m.pose, 0.3, 'idle');
    pl.a.squash(0.15);
    moveNote(mv, this.n > 3 ? 0.3 : 0.45, { midi: m.midi, dur: 0.18, vol: this.n > 3 ? 0.07 : 0.14 });
    const sx = this.slotX(pl, i, this.seq.length), sy = this.slotY(pl);
    particles.burst(sx, sy, { type: 'sparkle', count: 3, colors: [m.color, '#ffffff'], speed: [40, 120], size: [10, 16] });
    if (pl.entered.length === this.seq.length) this.succeed(pl);
  }

  succeed(pl) {
    pl.status = 'done';
    if (pl.p.isAI) pl.p.ctrl.move(0, 0);
    const a = pl.a;
    a.facing = pl.baseFacing;
    a.setPose('dance');
    a.playOnce('cheer', 0.4, 'dance');
    if (chance(0.5)) pl.a.say('Got it!', 1.2, 'woo'); else voice(pl.p.charId, 'woo');
    sfx('correct');
    // choose the nearest living imp
    const live = this.imps.filter((im) => im.alive && !im.targeted);
    const pool = live.length ? live : this.imps;
    pool.sort((p1, p2) => Math.abs(p1.x - pl.x) - Math.abs(p2.x - pl.x));
    const imp = pool[0];
    imp.targeted = true;
    this.beams.push({ pl, imp, t: -0.45, dur: 0.5 });
    pl.doneOrder = this.pl.filter((q) => q.status === 'done').length;
  }

  failPlayer(pl, timeout, idx = -1) {
    pl.status = 'failed';
    if (pl.p.isAI) pl.p.ctrl.move(0, 0);
    pl.failIdx = idx >= 0 ? idx : pl.entered.length;
    pl.hearts--;
    pl.heartBreak = 0.8; pl.shake = 0.5;
    const a = pl.a;
    a.facing = pl.baseFacing;
    a.playOnce('hurt', 0.8, pl.hearts <= 0 ? 'clap' : 'idle');
    a.flash('#ff6f8f', 0.25);
    sfx('wrong'); voice(pl.p.charId, 'ouch');
    pl.p.ctrl.rumble(0.6, 220);
    const hx = pl.x + (pl.hearts - 1) * 34 * this.L.sc, hy = pl.y + 34 * this.L.sc;
    particles.burst(hx, hy, { type: 'heart', count: 5, colors: ['#9a8fb5', '#ff4f8b'], speed: [60, 180] });
    particles.popText(pl.x, pl.y - 200 * this.L.cs, timeout ? 'Too slow!' : 'Oops!', '#ff6f8f', 52);
    if (pl.hearts <= 0) {
      pl.alive = false;
      particles.popText(pl.x, pl.y - 250 * this.L.cs, 'Out - cheer!', '#ffffff', 40);
    }
    // the imps giggle
    this.imps.forEach((im, i) => { if (im.alive) { im.mood = 'laugh'; im.moodT = 0.9 + i * 0.05; } });
    sfx('giggle'); sfx('npc/imp/giggle');
  }

  updateBeams(dt) {
    for (const b of this.beams) {
      b.t += dt;
      if (b.t >= 0 && !b.zapped) { b.zapped = true; sfx('sparkle-beam', { vol: 0.7 }); }   // the beam leaves the idol
      if (b.t >= b.dur && !b.done) {
        b.done = true;
        const im = b.imp;
        im.alive = false; im.respawn = 1.9; im.targeted = false; im.scale = 0; im.growing = false;
        const pl = b.pl;
        pl.score++; pl.scoreFlash = 0.8;
        fx.shake(8, 0.2);
        const ix = im.x, iy = im.y - 60 * im.s;
        particles.burst(ix, iy, { type: 'smoke', count: 8, speed: [60, 220], size: [24, 40] });
        particles.burst(ix, iy, { type: 'star', count: 10, colors: [pl.p.color, '#ffffff', '#ffd23f'], speed: [200, 520] });
        particles.burst(ix, iy, { type: 'confetti', count: 20, colors: [pl.p.color, '#ffffff'], speed: [200, 600] });
        particles.ring(ix, iy, '#ffffff', 170, 0.5);
        if (this.api.camera) this.api.camera.punch(ix, iy + 40, 1.14, 0.3);
        particles.popText(ix, iy - 40, '+1', pl.p.color, 76);
        sfx('sparkle'); sfx('pop'); sfx('npc/imp/poof'); sfx('npc/imp/eep');
      }
    }
    this.beams = this.beams.filter((b) => !b.done);
  }

  nextRound() {
    const alive = this.pl.filter((q) => q.alive).length;
    const over = this.round >= TOTAL_ROUNDS || alive === 0 || (!this.solo && alive <= 1);
    if (over) { this.finish(); return; }
    this.startRound();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.setPhase('end');
    const keys = this.pl.map((q) => q.score * 10 + q.hearts);
    const placements = placementsFromScores(keys);
    const best = Math.max(...keys);
    this.pl.forEach((q) => {
      q.status = 'idle'; q.a.clearEmotes();
      q.a.facing = q.baseFacing;
      if (keys[q.i] === best) q.a.setPose('celebrate'); else if (q.alive) q.a.setPose('clap'); else q.a.setPose('clap');
    });
    for (const im of this.imps) { im.mood = 'eep'; im.moodT = 99; }
    this.banner = null;
    const wpl = this.pl.filter((q) => keys[q.i] === best)[0];
    this.api.finish({
      focus: wpl ? { x: wpl.x, y: wpl.y - 100 } : undefined,
      placements, solo: keys[0],
      stats: this.pl.map((q) => `${q.score} imp${q.score === 1 ? '' : 's'}, ${q.hearts} heart${q.hearts === 1 ? '' : 's'}`),
    });
  }

  // ---- layout helpers -----------------------------------------------------
  slotY(pl) { return pl.y - 190 * this.L.cs - this.isz * 0.55; }
  slotX(pl, i, len) { const step = this.isz + 5; return pl.x + (i - (len - 1) / 2) * step; }

  // ---- drawing ------------------------------------------------------------
  beatPhase() {
    let b = 0;
    try { b = music.beat(); } catch (e) { b = 0; }
    if (!b) b = this.t * 2;
    return b;
  }

  buildStaticBg() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const ft = this.L.floorTop;
    const sky = g.createLinearGradient(0, 0, 0, ft);
    sky.addColorStop(0, '#12082e'); sky.addColorStop(0.55, '#3b1670'); sky.addColorStop(1, '#8a2d9e');
    g.fillStyle = sky; g.fillRect(0, 0, W, ft + 4);
    // curtain edges
    for (const side of [0, 1]) {
      const x0 = side ? W - 130 : 0;
      const cg = g.createLinearGradient(x0, 0, x0 + 130, 0);
      cg.addColorStop(side ? 1 : 0, '#6e1146'); cg.addColorStop(side ? 0 : 1, 'rgba(110,17,70,0)');
      g.fillStyle = cg; g.fillRect(x0, 0, 130, ft);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 6;
      for (let i = 0; i < 6; i++) { const lx = side ? W - 20 - i * 22 : 20 + i * 22; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, ft); g.stroke(); }
    }
    // floor
    const fl = g.createLinearGradient(0, ft, 0, H);
    fl.addColorStop(0, '#4b1a86'); fl.addColorStop(1, '#1d0a3d');
    g.fillStyle = fl; g.fillRect(0, ft, W, H - ft);
    g.strokeStyle = 'rgba(190,140,255,0.22)'; g.lineWidth = 3;
    for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 70, ft); g.lineTo(W / 2 + i * 240, H); g.stroke(); }
    for (let k = 1; k < 8; k++) { const yy = ft + Math.pow(k / 8, 1.6) * (H - ft); g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    // glossy sheen
    const sh = g.createLinearGradient(0, ft, W, ft);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.1)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.fillRect(0, ft, W, H - ft);
    // stage edge
    g.fillStyle = '#12082e'; g.fillRect(0, ft - 6, W, 12);
    // truss
    g.fillStyle = '#2b2150'; g.fillRect(0, 0, W, 22);
    g.strokeStyle = '#5b4ca0'; g.lineWidth = 3;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, 22); g.lineTo(x + 40, 0); g.stroke(); }
    this.bgReady = cv;
  }

  drawStage(g) {
    const bg = art('bg/spotlight-dance');
    const b = this.beatPhase();
    const pulse = Math.pow(1 - (b % 1), 3);
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      if (!this.bgReady) this.buildStaticBg();
      g.drawImage(this.bgReady, 0, 0);
      // rotating sunburst behind the imps
      g.save(); g.translate(W / 2, this.L.promptY); g.rotate(this.t * 0.12);
      for (let i = 0; i < 16; i++) {
        g.rotate(TAU / 16);
        g.fillStyle = i % 2 ? 'rgba(255,120,220,0.07)' : 'rgba(120,200,255,0.06)';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -1400); g.lineTo(90, -1400); g.closePath(); g.fill();
      }
      g.restore();
      // twinkling stars on the LED wall
      for (const s of this.stars) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.7 + s.p));
        g.save(); g.globalAlpha = tw * 0.8; g.translate(s.x, s.y); g.rotate(this.t * 0.3 + s.p); starPath(g, s.s, 0.4); g.fillStyle = '#fff6c8'; g.fill(); g.restore();
      }
    }
    // swaying spotlight cones from the truss
    const cols = ['120,255,240', '255,120,200', '255,230,110', '170,120,255', '120,200,255', '255,150,90'];
    const ft = this.L.floorTop;
    for (let i = 0; i < 6; i++) {
      const sx = W * (0.08 + i * 0.168), sway = Math.sin(this.t * 0.9 + i * 1.7) * 260;
      const len = ft + 70;
      const grd = g.createLinearGradient(sx, 22, sx + sway, len);
      grd.addColorStop(0, `rgba(${cols[i]},${0.32 + pulse * 0.12})`); grd.addColorStop(1, `rgba(${cols[i]},0.02)`);
      g.fillStyle = grd; g.beginPath(); g.moveTo(sx - 12, 22); g.lineTo(sx + 12, 22); g.lineTo(sx + sway + 110, len); g.lineTo(sx + sway - 110, len); g.closePath(); g.fill();
      g.fillStyle = '#1b1240'; g.beginPath(); g.arc(sx, 26, 17, 0, TAU); g.fill();
      g.fillStyle = `rgb(${cols[i]})`; g.beginPath(); g.arc(sx, 31, 9, 0, TAU); g.fill();
    }
    // LED strip along the stage edge, chasing on the beat
    for (let i = 0; i < 48; i++) {
      const x = (i + 0.5) * (W / 48);
      const on = Math.floor(b * 2 + i) % 4 === 0;
      g.fillStyle = on ? ['#ff5fa2', '#35c8ff', '#ffd23f', '#7be04d'][i % 4] : 'rgba(255,255,255,0.18)';
      g.beginPath(); g.arc(x, ft - 2, on ? 7 : 5, 0, TAU); g.fill();
    }
    // audience (one-row layout has room at the very bottom)
    if (this.rows === 1) {
      for (let i = 0; i < 24; i++) {
        const x = (i + 0.5) * (W / 24), bob = Math.sin(this.t * 3 + i) * 5;
        g.fillStyle = '#0c0522';
        g.beginPath(); g.arc(x, H - 8 + bob, 54, Math.PI, TAU); g.fill();
        g.beginPath(); g.arc(x, H - 62 + bob, 24, 0, TAU); g.fill();
        if (i % 3 === 0) {
          g.strokeStyle = ['#ff5fa2', '#35c8ff', '#ffd23f', '#7be04d'][(i / 3) % 4]; g.lineWidth = 7; g.lineCap = 'round';
          const ang = Math.sin(this.t * 3 + i * 1.3) * 0.5;
          g.beginPath(); g.moveTo(x + 30, H - 40 + bob); g.lineTo(x + 30 + Math.sin(ang) * 60, H - 40 + bob - Math.cos(ang) * 60); g.stroke();
        }
      }
    }
  }

  drawLight(g, pl) {
    const sc = this.L.sc, k = pl.light;
    if (k < 0.05) return;
    const col = pl.status === 'failed' ? '#ff4d6d' : pl.status === 'done' ? '#fff3a0' : pl.p.color;
    g.save();
    // light column
    const colH = pl.y - 60;
    const grad = g.createLinearGradient(0, 40, 0, pl.y);
    grad.addColorStop(0, col + '00'); grad.addColorStop(1, col + Math.round(clamp(k * 70, 0, 255)).toString(16).padStart(2, '0'));
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(pl.x - 24 * sc, 40); g.lineTo(pl.x + 24 * sc, 40); g.lineTo(pl.x + 150 * sc, pl.y); g.lineTo(pl.x - 150 * sc, pl.y); g.closePath(); g.fill();
    // pool on the floor
    const rg = g.createRadialGradient(pl.x, pl.y, 10, pl.x, pl.y, 170 * sc);
    rg.addColorStop(0, col + Math.round(clamp(k * 210, 0, 255)).toString(16).padStart(2, '0')); rg.addColorStop(1, col + '00');
    g.fillStyle = rg; g.beginPath(); g.ellipse(pl.x, pl.y + 4, 175 * sc, 46 * sc, 0, 0, TAU); g.fill();
    g.strokeStyle = col; g.globalAlpha = 0.35 + 0.4 * k; g.lineWidth = 4;
    g.beginPath(); g.ellipse(pl.x, pl.y + 4, 128 * sc, 30 * sc, 0, 0, TAU); g.stroke();
    g.restore();
  }

  drawPlayer(g, pl) {
    const sc = this.L.sc;
    const a = pl.a;
    const sh = pl.shake > 0 ? Math.sin(this.t * 60) * 8 * pl.shake * 2 : 0;
    g.save(); g.translate(sh, 0);
    a.alpha = pl.alive ? 1 : 0.8;
    a.x = pl.x; a.y = pl.y;
    a.draw(g, { ring: pl.alive ? pl.p.color : '#8a7fa8' });
    g.restore();
    // hearts
    const hs = 15 * sc;
    for (let h = 0; h < HEARTS; h++) {
      const hx = pl.x + (h - 1) * 36 * sc + sh, hy = pl.y + 38 * sc;
      g.save(); g.translate(hx, hy);
      const have = h < pl.hearts;
      if (have && pl.heartPop > 0) { const k = 1 + pl.heartPop * 0.4; g.scale(k, k); }
      if (!have && h === pl.hearts && pl.heartBreak > 0) { g.globalAlpha = pl.heartBreak / 0.8; g.translate(0, (1 - pl.heartBreak / 0.8) * 20); }
      if (have || (h === pl.hearts && pl.heartBreak > 0)) drawHeartShape(g, hs * 2, have ? '#ff4f8b' : '#9a8fb5');
      else { g.globalAlpha = 0.35; drawHeartShape(g, hs * 2, '#2a1d52'); }
      g.restore();
    }
  }

  drawRow(g, pl) {
    if (this.phase === 'intro' || !this.seq.length) return;
    const len = this.seq.length, sc = this.L.sc, isz = this.isz;
    const y = this.slotY(pl);
    const total = len * (isz + 5) + 14;
    const sh = pl.shake > 0 ? Math.sin(this.t * 60) * 6 * pl.shake * 2 : 0;
    g.save(); g.translate(sh, 0);
    // backing plate
    const glowDone = pl.status === 'done';
    ui.roundRect(g, pl.x - total / 2, y - isz / 2 - 8, total, isz + 16, isz * 0.4);
    g.fillStyle = glowDone ? 'rgba(255,243,160,0.35)' : 'rgba(18,8,46,0.62)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = glowDone ? '#fff3a0' : pl.p.color; g.stroke();
    for (let i = 0; i < len; i++) {
      const x = this.slotX(pl, i, len);
      const entered = i < pl.entered.length;
      if (entered && !(pl.status === 'failed' && i === pl.failIdx)) {
        const pop = pl.flashIdx === i && pl.flashT > 0 ? 1 + ease.outBack(1 - pl.flashT / 0.3) * 0 + pl.flashT * 1.2 : 1;
        if (pl.p.isAI && this.phase === 'input') {
          // CPU rows show progress only (no peeking at the answer); the icons are revealed after the round.
          g.save(); g.translate(x, y); g.scale(pop, pop);
          g.fillStyle = pl.p.color; g.strokeStyle = NAVY; g.lineWidth = 3;
          ui.roundRect(g, -isz * 0.44, -isz * 0.44, isz * 0.88, isz * 0.88, isz * 0.24); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.9)'; starPath(g, isz * 0.24, 0.5); g.fill();
          g.restore();
        } else drawMoveIcon(g, pl.entered[i], x, y, isz * 0.94, { pop });
      } else if (pl.status === 'failed' && i === pl.failIdx) {
        g.save(); g.translate(x, y);
        g.fillStyle = '#ff4d6d'; ui.roundRect(g, -isz * 0.47, -isz * 0.47, isz * 0.94, isz * 0.94, isz * 0.25); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = isz * 0.12; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-isz * 0.2, -isz * 0.2); g.lineTo(isz * 0.2, isz * 0.2); g.moveTo(isz * 0.2, -isz * 0.2); g.lineTo(-isz * 0.2, isz * 0.2); g.stroke();
        g.restore();
      } else {
        const cur = pl.status === 'entering' && i === pl.entered.length;
        g.save(); g.translate(x, y);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(0, 0, isz * 0.34, 0, TAU); g.fill();
        if (cur) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.globalAlpha = 0.55 + 0.45 * Math.sin(this.t * 10); g.beginPath(); g.arc(0, 0, isz * 0.42, 0, TAU); g.stroke(); }
        else if (pl.status !== 'failed' && pl.status !== 'out') { /* empty slot */ }
        g.restore();
      }
    }
    g.restore();
    // tag above the row + done star
    ui.playerTag(g, pl.p, pl.x, y - isz / 2 - 18);
    if (glowDone) {
      g.save(); g.translate(pl.x + total / 2 + 6, y - isz * 0.4); g.rotate(Math.sin(this.t * 6) * 0.2);
      starPath(g, 16 * sc + 6, 0.45); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); g.restore();
    }
    if (!pl.alive) ui.text(g, 'cheering!', pl.x, y + 2, { size: 28 * Math.max(0.8, sc), color: '#ffffff' });
  }

  draw(g) {
    this.drawStage(g);
    for (const pl of this.pl) this.drawLight(g, pl);
    // imps
    for (const im of this.imps) {
      if (!im.alive || im.scale <= 0.01) continue;
      const lookX = clamp((W / 2 - im.x) / 600, -1, 1) * 0.6 + Math.sin(this.t * 1.3 + im.seed) * 0.4;
      const mt = Math.max(0, im.mt);
      drawImp(g, im.x, im.y, im.s, {
        t: this.t, seed: im.seed, move: im.move, mt, mood: im.mood, eye: im.eye, lookX, lookY: this.phase === 'input' ? 0.8 : 0,
        scale: ease.outBack(clamp(im.scale, 0, 1)),
      });
    }
    this.drawBeams(g);
    for (const pl of this.pl) this.drawPlayer(g, pl);
    for (const pl of this.pl) this.drawRow(g, pl);
  }

  drawHUD(g) {
    this.drawCenter(g);
    this.drawHud(g);
  }

  drawBeams(g) {
    for (const b of this.beams) {
      if (b.t < 0) continue;
      const k = clamp(b.t / b.dur, 0, 1);
      const hand = b.pl.a.anchor('head');
      const fx0 = hand.x, fy0 = hand.y - 20;
      const tx = b.imp.x, ty = b.imp.y - 60 * b.imp.s;
      const reach = ease.outQuad(Math.min(1, k * 1.6));
      const ex = lerp(fx0, tx, reach), ey = lerp(fy0, ty, reach);
      g.save(); g.lineCap = 'round';
      const col = b.pl.p.color;
      g.strokeStyle = col; g.globalAlpha = 0.5; g.lineWidth = 46 * (1 - k * 0.4);
      g.beginPath(); g.moveTo(fx0, fy0); g.lineTo(ex, ey); g.stroke();
      g.globalAlpha = 0.95; g.strokeStyle = '#ffffff'; g.lineWidth = 16 * (1 - k * 0.4);
      g.beginPath(); g.moveTo(fx0, fy0); g.lineTo(ex, ey); g.stroke();
      g.restore();
      if (chance(0.8)) particles.burst(lerp(fx0, ex, Math.random()), lerp(fy0, ey, Math.random()), { type: 'sparkle', count: 1, colors: ['#ffffff', col, '#ffe066'], speed: [20, 80], size: [14, 24] });
    }
  }

  drawCenter(g) {
    const L = this.L, cx = W / 2, cy = L.promptY;
    // round pill
    if (this.round > 0) {
      ui.panel(g, W / 2 - 200, 126, 400, 50, { r: 25, fill: '#ffffff', lineWidth: 5 });
      ui.text(g, `Round ${this.round} of ${TOTAL_ROUNDS}  -  ${this.seq.length} moves`, W / 2, 152, { size: 28, color: NAVY, stroke: false, weight: 800 });
    }
    if (this.phase === 'intro') {
      const t = this.phaseT;
      ui.banner(g, 'Shadow Imps stole', Math.min(t, 1), { size: 92, y: cy - 90, color: '#ffe066', tilt: -0.02 });
      ui.banner(g, 'the spotlight!', clamp(t - 0.3, 0, 1), { size: 110, y: cy + 30, color: '#ff8fd0', tilt: 0.02 });
      if (t > 1.2) ui.text(g, 'Copy their dance to zap them!', cx, cy + 140, { size: 44, color: '#ffffff', alpha: clamp(t - 1.2, 0, 1) });
    } else if (this.phase === 'announce' && this.banner) {
      ui.banner(g, this.banner.text, this.banner.t, { size: 120, y: cy - 40, color: '#ffe066' });
      ui.text(g, this.banner.sub, cx, cy + 70, { size: 46, color: '#ffffff', alpha: clamp(this.banner.t * 2, 0, 1) });
    } else if (this.phase === 'show') {
      const mv = this.seq[this.showIdx];
      const on = mv && this.showMoveT < this.showDur();
      if (on) {
        const p = clamp(this.showMoveT / 0.18, 0, 1);
        drawMoveIcon(g, mv, cx, cy, L.iconSize, { pop: 0.4 + 0.6 * ease.outBack(p) + Math.sin(this.showMoveT * 14) * 0.02, glow: true });
        ui.text(g, MOVE[mv].name, cx, cy + L.iconSize * 0.62, { size: this.rows === 1 ? 54 : 40, color: '#ffffff' });
      }
      ui.text(g, 'Watch the imps!', cx, cy - L.iconSize / 2 - 30, { size: this.rows === 1 ? 52 : 40, color: '#ffe066' });
      // progress dots
      const len = this.seq.length;
      for (let i = 0; i < len; i++) {
        const x = cx + (i - (len - 1) / 2) * 26, y = cy + L.iconSize * 0.62 + (this.rows === 1 ? 62 : 48);
        g.fillStyle = i <= this.showIdx ? '#ffe066' : 'rgba(255,255,255,0.3)'; g.strokeStyle = NAVY; g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.stroke();
      }
    } else if (this.phase === 'ready' && this.banner) {
      ui.banner(g, 'Your turn!', this.banner.t, { size: 150, y: cy, color: '#7dfff0' });
    } else if (this.phase === 'input') {
      const frac = clamp(this.input.timeLeft / this.input.limit, 0, 1);
      const bw = this.rows === 1 ? 760 : 620;
      ui.text(g, 'Copy the dance!', cx, cy - 50, { size: this.rows === 1 ? 84 : 64, color: '#7dfff0' });
      ui.bar(g, cx - bw / 2, cy + 20, bw, 34, frac, frac < 0.25 ? '#ff4d6d' : frac < 0.5 ? '#ffd23f' : '#5ddc6a', { bg: 'rgba(18,8,46,0.55)' });
      const done = this.pl.filter((q) => q.status === 'done').length, alive = this.pl.filter((q) => q.alive).length;
      if (this.round <= this.hintRounds) {
        ui.hints(g, [['dpad', 'Arrows'], ['a', 'Sparkle!']], cx, cy + 100, { size: this.rows === 1 ? 44 : 36 });
      } else if (!this.solo) {
        ui.text(g, `${done} of ${alive} danced it!`, cx, cy + 100, { size: 34, color: '#ffffff' });
      }
    } else if (this.phase === 'resolve') {
      const succ = this.pl.filter((q) => q.status === 'done').length;
      if (this.phaseT > 0.5) {
        const msg = succ === 0 ? 'The imps are giggling...' : succ === this.pl.filter((q) => q.alive || q.status === 'done').length && succ > 0 ? 'Perfect dance!' : 'Sparkle beams!';
        ui.text(g, msg, cx, cy, { size: this.rows === 1 ? 70 : 54, color: succ === 0 ? '#ff9be8' : '#ffe066', alpha: clamp((this.phaseT - 0.5) * 3, 0, 1) });
      }
    }
  }

  drawHud(g) {
    ui.scoreboard(g, this.players, this.pl.map((q) => q.score), {
      y: 36, format: (v) => `${v} imp${v === 1 ? '' : 's'}`,
      out: this.pl.map((q) => !q.alive),
      expr: this.pl.map((q) => (q.status === 'done' ? 'happy' : q.status === 'failed' ? 'sad' : 'neutral')),
      highlight: this.pl.map((q) => q.scoreFlash > 0),
    });
  }
}
