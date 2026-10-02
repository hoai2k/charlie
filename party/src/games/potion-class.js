// Potion Class (Play Studio). Professor Hoot writes a recipe on the
// chalkboard; everyone brews at their own cauldron: pick ingredients from the
// shelf (stick + A), stir by spinning the stick, wave the wand (Y) -> POOF!
// The right recipe transforms your character (giant, tiny, rainbow, floaty,
// sparkly, hearts); a wrong one gives a sweet, silly surprise. Three recipes,
// then a free experiment round where any mix makes a random effect.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, makesMistake, reactionTime } from '../engine/ai.js';
import { clamp, lerp, damp, ease, rand, pick, shuffle, TAU } from '../engine/util.js';
import { drawStarShape, drawSparkleShape } from '../engine/emotes.js';
import { INGREDIENTS, drawIngredient, drawBottle, drawCauldron, hexRgb, rgbStr, hexA } from './potion-class/ingredients.js';
import { drawHoot, speechBubble } from './potion-class/hoot.js';

const NAVY = '#24163f';
const SW = 480, SH = 400;            // station design size (scaled by k)
const STIR_NEED = TAU * 3;           // three full circles
const ROUND_TIME = 75;               // soft cap per recipe (auto-POOF after)
const WATER = [150, 214, 255];
const SHELF_X = (i) => 44 + i * 56;
const SHELF_Y = 346;
const BREW = { x: 300, y: 205 };
const FEET = { x: 108, y: 322 };

const EFFECTS = {
  giant:    { good: true, potion: 'Giant Potion', label: 'GIANT!', color: '#ff9f1c', sound: 'grow' },
  tiny:     { good: true, potion: 'Teeny Tiny Potion', label: 'Teeny tiny!', color: '#3fa7ff', sound: 'shrink' },
  rainbow:  { good: true, potion: 'Rainbow Potion', label: 'Rainbow!', color: '#ff6fd0', sound: 'magic' },
  floaty:   { good: true, potion: 'Floaty Potion', label: 'Floaty!', color: '#9b7bff', sound: 'jump' },
  sparkle:  { good: true, potion: 'Sparkle Potion', label: 'Sparkly!', color: '#ffc12e', sound: 'star' },
  hearts:   { good: true, potion: 'Heart Potion', label: 'Lovely!', color: '#ff4f8b', sound: 'yay' },
  fizz:     { good: false, label: 'Green fizz!', color: '#36d17a', sound: 'water' },
  hiccup:   { good: false, label: 'Hiccups!', color: '#3fa7ff', sound: 'bubble' },
  dots:     { good: false, label: 'Polka dots!', color: '#ff6fb1', sound: 'pop' },
  puffhair: { good: false, label: 'Puffy hair!', color: '#b36bff', sound: 'pop' },
};
const GOOD = Object.keys(EFFECTS).filter((k) => EFFECTS[k].good);
const SILLY = Object.keys(EFFECTS).filter((k) => !EFFECTS[k].good);
const DOT_SPOTS = [[-0.18, 0.28], [0.14, 0.42], [-0.04, 0.62], [0.2, 0.18], [-0.22, 0.5], [0.06, 0.3], [-0.1, 0.78], [0.16, 0.64]];
const DOT_COLORS = ['#ff6fb1', '#ffd23f', '#3fa7ff', '#36d17a', '#b36bff'];

const LINES = {
  yay: ['Hoo-ray! Perfect potion!', 'Splendid! Top marks!', 'Wonderful wizardry!', 'Hoo-hoo! Just right!'],
  silly: ['Hoo-hoo! How silly!', 'Oh my feathers! Hee hee!', 'A happy accident!', 'Whoopsie-hoo!'],
  surprise: ['What a surprise!', 'Ooh, how magical!', 'Hoo! Never seen that before!'],
};

export const meta = {
  id: 'potion-class',
  title: 'Potion Class',
  category: 'studio',
  type: 'Wizard School',
  goal: 'Brew Professor Hoot\'s recipes and see what magic happens!',
  controls: [['stick', 'Pick an ingredient / stir in circles'], ['a', 'Toss it in'], ['b', 'Oops! Take it out'], ['y', 'Wave your wand: POOF!']],
  tips: ['Match the ingredients on the chalkboard.', 'Spin the stick round and round to stir.', 'The last round is a free experiment!'],
  music: 'chill',
  duration: '3 recipes',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  drawIcon(g, x, y, w, h, t) {
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, '#4a3486'); gr.addColorStop(1, '#8a5fc8');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    // window glow + stars
    g.save();
    for (let i = 0; i < 12; i++) {
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i);
      g.save(); g.translate(x + w * ((i * 0.37 + 0.05) % 1), y + h * ((i * 0.23 + 0.04) % 0.5)); drawSparkleShape(g, h * 0.06, '#fff6c2'); g.restore();
    }
    g.restore();
    g.fillStyle = '#6b4a2c'; g.fillRect(x, y + h * 0.8, w, h * 0.2);
    const s = Math.min(w, h) / 420;
    drawCauldron(g, x + w * 0.6, y + h * 0.6, s * 1.15, { brew: [255, 120, 210], t, bubbling: 0.8, stir: t * 2, spoonAngle: t * 2 });
    // rising sparkly bubbles
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.5 + i / 6) % 1;
      g.save(); g.globalAlpha = 1 - p;
      g.translate(x + w * 0.6 + Math.sin(i * 2 + t * 2) * w * 0.08, y + h * (0.55 - p * 0.45));
      drawSparkleShape(g, h * 0.08, ['#fff', '#ffd23f', '#ff9ad5'][i % 3]); g.restore();
    }
    drawHoot(g, x + w * 0.2, y + h * 0.96, s * 1.05, { t, flap: Math.max(0, Math.sin(t * 3)) * 0.5, look: [1, 0] });
    drawIngredient(g, 'starflower', x + w * 0.88, y + h * 0.3, h * 0.2);
    drawIngredient(g, 'moonberry', x + w * 0.4, y + h * 0.2, h * 0.17);
  },
};

// --- helpers ---------------------------------------------------------------

function mixColor(ids) {
  if (!ids.length) return WATER.slice();
  const cols = ids.map((id) => hexRgb(INGREDIENTS.find((i) => i.id === id).color));
  const avg = [0, 1, 2].map((c) => (cols.reduce((a, col) => a + col[c], 0) + WATER[c] * 0.3) / (cols.length + 0.3));
  // Keep mixes bright and candy-colored instead of muddy.
  const gray = (avg[0] + avg[1] + avg[2]) / 3;
  return avg.map((v) => clamp(gray + (v - gray) * 1.6 + 18, 30, 255));
}
const sameSet = (a, b) => a.length === b.length && a.slice().sort().join() === b.slice().sort().join();
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function puffCloud(g, x, y, r, color, alpha = 1) {
  g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.07);
  g.beginPath();
  const bumps = [[-0.55, 0.1, 0.5], [-0.2, -0.3, 0.6], [0.3, -0.25, 0.55], [0.6, 0.15, 0.45], [0.05, 0.25, 0.6]];
  for (const [bx, by, br] of bumps) { g.moveTo(x + bx * r + br * r, y + by * r); g.arc(x + bx * r, y + by * r, br * r, 0, TAU); }
  g.stroke(); g.fill();
  g.restore();
}

// --- game ------------------------------------------------------------------

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;

    // Recipes: three good potions (3, 3 and 4 ingredients), then a free experiment.
    const effs = shuffle(GOOD).slice(0, 3);
    this.rounds = effs.map((eff, i) => ({ eff, ings: shuffle(INGREDIENTS.map((x) => x.id)).slice(0, i === 2 ? 4 : 3) }));
    this.rounds.push({ experiment: true, ings: [null, null, null] });

    this.layout();
    this.stations = this.players.map((p, i) => this.makeStation(p, i));
    this.hoot = { flap: 0, flapT: 0, point: 0, mood: 'happy', moodT: 0, blink: 0, blinkT: 2, tilt: 0, look: [0.5, 0.3], hop: 0 };
    this.speech = null;
    this.flags = {};
    this.bg = null;
    this.round = -1;
    this.startRound(0);
  }

  // --- layout --------------------------------------------------------------
  layout() {
    const n = this.n;
    const rows = n <= 4 ? 1 : 2;
    const cols = Math.ceil(n / rows);
    const k = Math.min(W / cols / SW, (H - 300) / (rows * SH), 1.5);
    this.k = k;
    const stH = SH * k * rows;
    this.top = H - stH - (rows === 1 ? 10 : 0);
    this.boxes = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      const cellW = W / cols;
      const cx = W / 2 + (c - (inRow - 1) / 2) * cellW;
      this.boxes.push({ x: cx - (SW * k) / 2, y: this.top + r * SH * k, k });
    }
    this.wallBottom = this.top + 150 * k;
    // Chalkboard + Hoot in the band above the stations.
    const s = clamp((this.top - 24) / 330, 0.82, 1.15);
    this.bs = s;
    const groupW = (250 + 860) * s;
    const gx = (W - groupW) / 2 + 90;
    const by = Math.max(12, (this.top - 300 * s) / 2 - 6);
    this.board = { x: gx + 250 * s, y: by, w: 860 * s, h: 300 * s, s };
    this.hootPos = { x: gx + 120 * s, y: by + 310 * s };
  }

  makeStation(p, i) {
    const box = this.boxes[i];
    const k = box.k;
    const a = new Actor(p.charId, { x: box.x + FEET.x * k, y: box.y + FEET.y * k, scale: 0.72 * k, facing: 1 });
    a.snap();
    const st = {
      p, i, box, k, actor: a,
      sel: (i * 3) % INGREDIENTS.length, selBump: 0,
      added: [], flying: [], slots: 3,
      brew: WATER.slice(), brewTarget: WATER.slice(), splash: 0,
      phase: 'add', phaseT: 0, stir: 0, stirAng: 2.3, swirl: 0, lastAng: null, lastAngT: 0, halfTurns: 0,
      wandT: -1, poofT: 0, cloud: 0, readyT: 0,
      eff: null, effT: 0, result: null, score: 0,
      fxScale: 1, fxV: 0, fxZ: 0, hopZ: 0, emitT: 0, hicT: 0,
      cool: 0, navCool: 0, shake: 0,
      ai: { t: rand(0.4, 1), plan: null, ang: rand(TAU), phase: null },
    };
    // Wand in hand (rides the pose animation).
    a.attach((g, info) => {
      const L = info.h * 0.3;
      let ang = 0.35 + Math.sin(this.t * 2 + i) * 0.06;
      if (st.wandT >= 0) {
        const u = clamp(st.wandT / 0.4, 0, 1);
        ang = u < 0.4 ? lerp(0.35, -1.1, ease.outQuad(u / 0.4)) : lerp(-1.1, 1.3, ease.outBack((u - 0.4) / 0.6));
      }
      g.translate(info.hand.x, info.hand.y); g.rotate(ang);
      g.lineCap = 'round';
      g.strokeStyle = NAVY; g.lineWidth = Math.max(5, L * 0.13); g.beginPath(); g.moveTo(0, 4); g.lineTo(0, -L); g.stroke();
      g.strokeStyle = '#9a6332'; g.lineWidth = Math.max(3, L * 0.07); g.stroke();
      g.translate(0, -L);
      if (st.phase === 'wand') {
        const pulse = 1 + Math.sin(this.t * 10) * 0.25;
        g.save(); g.scale(pulse, pulse); drawSparkleShape(g, L * 0.75, 'rgba(255,246,168,0.9)'); g.restore();
      }
      drawStarShape(g, Math.max(14, L * 0.42), '#ffd23f');
    });
    // Silly effects that sit on the character.
    a.attach((g, info) => {
      if (st.eff === 'dots') {
        const pop = ease.outBack(clamp(st.effT / 0.5, 0, 1));
        DOT_SPOTS.forEach(([dx, dy], j) => {
          const pj = clamp(pop * 1.6 - j * 0.08, 0, 1);
          if (pj <= 0) return;
          g.fillStyle = DOT_COLORS[j % DOT_COLORS.length]; g.strokeStyle = NAVY; g.lineWidth = 2;
          g.beginPath(); g.arc(dx * info.w, -dy * info.h, info.h * 0.045 * pj, 0, TAU); g.fill(); g.stroke();
        });
      } else if (st.eff === 'puffhair') {
        const pop = ease.outElastic(clamp(st.effT / 0.8, 0, 1));
        const r = info.h * 0.2 * pop * (1 + Math.sin(this.t * 4) * 0.04);
        if (r > 1) {
          puffCloud(g, info.head.x, info.head.y + info.h * 0.02, r, '#e8dcff');
          puffCloud(g, info.head.x - r * 0.3, info.head.y - r * 0.15, r * 0.5, '#ffd9f0');
        }
      }
    });
    return st;
  }

  wx(st, lx) { return st.box.x + lx * st.k; }
  wy(st, ly) { return st.box.y + ly * st.k; }

  // --- round flow ----------------------------------------------------------
  get rd() { return this.rounds[this.round]; }

  startRound(i) {
    this.round = i;
    this.phase = 'intro'; this.phaseT = 0; this.brewT = 0;
    this.boardPop = 0;
    const rd = this.rd;
    for (const st of this.stations) {
      if (st.eff) {
        particles.burst(this.wx(st, FEET.x), this.wy(st, FEET.y - 60), { type: 'smoke', count: 10, speed: [40, 140] });
        st.actor.clearEmotes();
      }
      Object.assign(st, { added: [], flying: [], brewTarget: WATER.slice(), phase: 'add', phaseT: 0, stir: 0, eff: null, effT: 0, result: null, wandT: -1, cloud: 0, slots: rd.ings.length, hopZ: 0 });
      st.ai.plan = null; st.ai.phase = null;
      st.actor.setPose('idle');
    }
    if (i > 0) sfx('pop');
    if (rd.experiment) this.say('Free experiment! Mix anything you like!', 4);
    else this.say(`Recipe ${i + 1}: the ${EFFECTS[rd.eff].potion}!`, 3.2);
    this.hoot.point = 1; this.hoot.flapT = 0.5;
    sfx('magic');
  }

  say(text, dur = 3) { this.speech = { text, t: 0, dur }; }

  finishGame() {
    if (this.done) return;
    this.done = true;
    const scores = this.stations.map((s) => s.score);
    const best = Math.max(...scores);
    const top = scores.filter((s) => s === best).length;
    this.api.finish({
      showcase: true,
      highlight: best > 0 && top === 1 ? scores.indexOf(best) : null,
      stats: scores.map((s) => plural(s, 'potion')),
      title: 'Magical!',
    });
  }

  onDone() { this.finishGame(); }

  // --- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    this.updateHoot(dt);
    if (this.speech) { this.speech.t += dt; if (this.speech.t > this.speech.dur) this.speech = null; }

    const active = this.phase === 'brew';
    if (this.phase === 'intro') {
      const n = this.rd.ings.length;
      const pop = Math.floor((this.phaseT - 0.5) / 0.28) + 1;
      if (pop > this.boardPop && this.boardPop < n) { this.boardPop++; sfx('collect', { step: this.boardPop * 2 }); }
      if (this.phaseT > 0.5 + n * 0.28 + 0.5) {
        this.phase = 'brew'; this.phaseT = 0; this.hoot.point = 0;
        if (this.round === 0) this.say('Pick ingredients and toss them in with A!', 3.5);
      }
    } else if (this.phase === 'brew') {
      this.brewT += dt;
      if (this.brewT > ROUND_TIME - 20 && !this.flags['hurry' + this.round]) { this.flags['hurry' + this.round] = true; this.say('Almost time... finish your potions!', 3); }
      if (this.brewT > ROUND_TIME) {
        for (const st of this.stations) if (st.phase === 'add' || st.phase === 'stir' || st.phase === 'wand') this.startPoof(st);
      }
      if (this.stations.every((s) => s.phase === 'shown' && s.effT > 2.6)) { this.phase = 'outro'; this.phaseT = 0; }
    } else if (this.phase === 'outro') {
      if (this.phaseT > 1.2) {
        if (this.round + 1 < this.rounds.length) this.startRound(this.round + 1);
        else {
          this.phase = 'end'; this.phaseT = 0;
          this.say('Class dismissed! You are all wonderful wizards!', 5);
          this.hoot.flapT = 1.5; sfx('fanfare'); particles.confettiRain(W, 120);
          for (const st of this.stations) st.actor.setPose('celebrate');
        }
      }
    } else if (this.phase === 'end') {
      if (this.phaseT > 4) this.finishGame();
    }

    for (const st of this.stations) this.updateStation(st, dt, active);
  }

  updateHoot(dt) {
    const h = this.hoot;
    h.flapT = Math.max(0, h.flapT - dt);
    h.flap = damp(h.flap, h.flapT > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(this.t * 12)) : 0, 14, dt);
    h.blinkT -= dt;
    if (h.blinkT < 0) { h.blink = 1; if (h.blinkT < -0.12) { h.blink = 0; h.blinkT = rand(2, 4.5); } }
    h.moodT = Math.max(0, h.moodT - dt);
    if (h.moodT <= 0) h.mood = 'happy';
    h.tilt = h.mood === 'laugh' ? Math.sin(this.t * 14) * 0.08 : Math.sin(this.t * 0.9) * 0.06;
    // Look toward whoever's busy, else at the board.
    const target = this.phase === 'intro' ? [1, -0.2] : [Math.sin(this.t * 0.5) * 0.8, 0.6];
    h.look = [damp(h.look[0], target[0], 4, dt), damp(h.look[1], target[1], 4, dt)];
    h.pointV = damp(h.pointV || 0, h.point, 6, dt);
  }

  hootReact(kind) {
    const h = this.hoot;
    if (kind === 'yay') { h.flapT = 0.9; h.mood = 'happy'; this.say(pick(LINES.yay), 2.2); }
    else if (kind === 'silly') { h.mood = 'laugh'; h.moodT = 1.2; this.say(pick(LINES.silly), 2.2); }
    else { h.mood = 'wow'; h.moodT = 1; h.flapT = 0.5; this.say(pick(LINES.surprise), 2.2); }
  }

  updateStation(st, dt, active) {
    const p = st.p, c = p.ctrl, a = st.actor;
    st.phaseT += dt;
    st.cool = Math.max(0, st.cool - dt);
    st.navCool = Math.max(0, st.navCool - dt);
    st.selBump = Math.max(0, st.selBump - dt * 4);
    st.splash = Math.max(0, st.splash - dt * 2.5);
    st.shake = Math.max(0, st.shake - dt * 3);
    st.cloud = Math.max(0, st.cloud - dt * 1.6);
    if (p.isAI && this.phase !== 'end') this.aiStation(st, dt, active);

    if (st.phase === 'add') {
      if (c.nav.x && st.navCool <= 0) {
        st.sel = (st.sel + c.nav.x + INGREDIENTS.length) % INGREDIENTS.length;
        st.selBump = 1; st.navCool = 0.07; sfx('move');
      }
      if (active && st.cool <= 0 && c.pressed('a')) {
        if (st.added.length + st.flying.length < st.slots) this.toss(st);
        else { sfx('error'); st.shake = 1; }
      }
      if (st.cool <= 0 && c.pressed('b')) this.undo(st);
    } else if (st.phase === 'stir') {
      this.updateStir(st, dt);
      if (st.cool <= 0 && c.pressed('b')) this.undo(st);
    } else if (st.phase === 'wand') {
      st.readyT += dt;
      if (st.cool <= 0 && c.pressed('y')) this.startPoof(st);
      else if (st.cool <= 0 && c.pressed('a')) { st.shake = 1; sfx('tick'); st.cool = 0.15; }
    }

    // Flying ingredients.
    for (const f of st.flying) f.t += dt;
    for (const f of st.flying.filter((f) => f.t >= f.dur)) this.land(st, f);
    st.flying = st.flying.filter((f) => f.t < f.dur);
    if (st.phase === 'add' && st.added.length >= st.slots && !st.flying.length) {
      st.toStir = (st.toStir || 0) + dt;
      if (st.toStir > 0.35) { st.toStir = 0; this.setPhase(st, 'stir'); }
    }

    // Brew color eases toward the mix.
    for (let j = 0; j < 3; j++) st.brew[j] = damp(st.brew[j], st.brewTarget[j], 3, dt);
    if (st.phase !== 'stir') st.swirl += dt * 0.6;

    // POOF timeline.
    if (st.wandT >= 0) { st.wandT += dt; if (st.wandT > 0.5) st.wandT = -1; }
    if (st.phase === 'poof') {
      const before = st.poofT;
      st.poofT += dt;
      if (before < 0.3 && st.poofT >= 0.3) this.puff(st);
      if (before < 0.6 && st.poofT >= 0.6) this.reveal(st);
    }
    if (st.phase === 'shown') { st.effT += dt; this.updateEffect(st, dt); }

    // Effect springs.
    const target = st.eff === 'giant' ? 1.55 : st.eff === 'tiny' ? 0.55 : 1;
    st.fxV += (target - st.fxScale) * 160 * dt; st.fxV *= Math.exp(-9 * dt); st.fxScale += st.fxV * dt;
    const zt = st.eff === 'floaty' ? (55 + Math.sin(this.t * 2.2 + st.i) * 18) * st.k : 0;
    st.fxZ = damp(st.fxZ, zt, 4, dt);
    st.hopZ = Math.max(0, st.hopZ - dt * 160 * st.k);
    a.z = st.fxZ + st.hopZ;
    a.update(dt);
  }

  setPhase(st, ph) {
    st.phase = ph; st.phaseT = 0;
    if (ph === 'stir') {
      st.stir = 0; st.lastAng = null; st.halfTurns = 0;
      sfx('bubble');
      if (!this.flags.stirSaid) { this.flags.stirSaid = true; this.say('Now stir, stir, stir! Spin the stick in circles!', 3.2); }
    }
    if (ph === 'wand') {
      st.readyT = 0;
      sfx('magic');
      particles.burst(this.wx(st, BREW.x), this.wy(st, BREW.y - 10), { type: 'sparkle', count: 14, colors: ['#fff', '#ffd23f', rgbStr(st.brew)] });
      particles.popText(this.wx(st, BREW.x), this.wy(st, BREW.y - 70), 'Ready!', '#ffd23f', 40 * st.k + 8);
      st.actor.playOnce('cheer', 0.45, 'idle');
      if (!this.flags.wandSaid) { this.flags.wandSaid = true; this.say('Wave your wand with Y!', 3); }
    }
  }

  toss(st) {
    const id = INGREDIENTS[st.sel].id;
    st.flying.push({ id, t: 0, dur: 0.48, fx: SHELF_X(st.sel), fy: SHELF_Y, spin: rand(-8, 8) });
    st.cool = 0.12;
    st.actor.playOnce('throw', 0.35, 'idle');
    sfx('whoosh');
  }

  land(st, f) {
    st.added.push(f.id);
    st.brewTarget = mixColor(st.added);
    st.splash = 1;
    const ing = INGREDIENTS.find((x) => x.id === f.id);
    const bx = this.wx(st, BREW.x), by = this.wy(st, BREW.y);
    sfx('splash'); sfx('collect', { step: st.added.length * 2 });
    particles.burst(bx, by, { type: 'drop', count: 12, colors: [ing.color, rgbStr(st.brew)], angle: -Math.PI / 2, spread: 0.9, speed: [200, 420] });
    particles.burst(bx, by - 10, { type: 'sparkle', count: 6, colors: [ing.color, '#ffffff'] });
    particles.ring(bx, by, ing.color, 90 * st.k, 0.35);
  }

  undo(st) {
    if (!st.added.length) { sfx('error'); return; }
    const id = st.added.pop();
    st.brewTarget = mixColor(st.added);
    st.cool = 0.15;
    if (st.phase !== 'add') this.setPhase(st, 'add');
    st.stir = 0;
    sfx('back'); sfx('bubble');
    const ing = INGREDIENTS.find((x) => x.id === id);
    particles.burst(this.wx(st, BREW.x), this.wy(st, BREW.y - 20), { type: 'bubble', count: 8 });
    particles.popText(this.wx(st, BREW.x), this.wy(st, BREW.y - 60), 'Oops!', ing.color, 30 * st.k + 8);
  }

  updateStir(st, dt) {
    const c = st.p.ctrl, a = st.actor;
    const m = Math.hypot(c.x, c.y);
    let moving = false;
    if (m > 0.45) {
      const ang = Math.atan2(c.y, c.x);
      if (st.lastAng !== null) {
        let d = ang - st.lastAng;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        if (Math.abs(d) < 2.4 && Math.abs(d) > 0.001) {
          st.stir += Math.abs(d); st.swirl += d; moving = true;
          const ht = Math.floor(st.stir / Math.PI);
          if (ht > st.halfTurns) {
            st.halfTurns = ht;
            sfx(ht % 2 ? 'bubble' : 'water');
            particles.burst(this.wx(st, BREW.x + rand(-60, 60)), this.wy(st, BREW.y), { type: 'bubble', count: 3, speed: [40, 120] });
            if (ht % 2 === 0) particles.burst(this.wx(st, BREW.x), this.wy(st, BREW.y - 20), { type: 'sparkle', count: 4, colors: ['#fff', rgbStr(st.brew)] });
          }
        }
      }
      st.lastAng = ang; st.lastAngT = 0; st.stirAng = ang;
    } else {
      st.lastAngT += dt;
      if (st.lastAngT > 0.3) st.lastAng = null;
    }
    a.setPose(moving || st.lastAngT < 0.2 ? 'paint' : 'idle');
    if (st.stir >= STIR_NEED) { a.setPose('idle'); this.setPhase(st, 'wand'); }
  }

  startPoof(st) {
    st.phase = 'poof'; st.phaseT = 0; st.poofT = 0; st.wandT = 0; st.cool = 0.2;
    st.actor.playOnce('action', 0.45, 'idle');
    sfx('whoosh'); sfx('sparkle');
    const hx = this.wx(st, FEET.x + 40), hy = this.wy(st, FEET.y - 130);
    for (let j = 0; j < 6; j++) {
      const u = j / 5;
      particles.burst(lerp(hx, this.wx(st, BREW.x), u), lerp(hy, this.wy(st, BREW.y - 30), u) - Math.sin(u * Math.PI) * 60 * st.k, { type: 'sparkle', count: 2, colors: ['#fff6a8', '#ffd23f', '#ffffff'] });
    }
  }

  puff(st) {
    const bx = this.wx(st, BREW.x), by = this.wy(st, BREW.y);
    const ax = this.wx(st, FEET.x), ay = this.wy(st, FEET.y - 70);
    const col = rgbStr(st.brew);
    sfx('bigpop'); sfx('magic');
    particles.burst(bx, by - 20, { type: 'smoke', count: 14, speed: [60, 220] });
    particles.burst(ax, ay, { type: 'smoke', count: 16, speed: [60, 240], jitter: 20 });
    particles.burst(ax, ay, { type: 'star', count: 10, colors: [col, '#ffd23f', '#ffffff'] });
    particles.ring(ax, ay, '#ffffff', 160 * st.k, 0.45);
    st.cloud = 1;
    fx.shake(this.n > 4 ? 4 : 7, 0.2);
    st.p.ctrl.rumble(0.5, 140);
  }

  reveal(st) {
    const rd = this.rd;
    let eff, result;
    if (rd.experiment) { eff = pick(Object.keys(EFFECTS)); result = 'surprise'; }
    else if (sameSet(st.added, rd.ings)) { eff = rd.eff; result = 'good'; }
    else { eff = pick(SILLY); result = 'silly'; }
    st.phase = 'shown'; st.phaseT = 0;
    st.eff = eff; st.effT = 0; st.result = result; st.emitT = 0; st.hicT = 0.6;
    const E = EFFECTS[eff], a = st.actor;
    const ax = this.wx(st, FEET.x), ay = this.wy(st, FEET.y) - a.height * 0.8;
    sfx(E.sound);
    if (result === 'good') {
      st.score++;
      sfx('correct'); setTimeout(() => sfx('star'), 180);
      voice(st.p.charId, 'yay');
      a.playOnce('celebrate', 1.8, 'idle');
      particles.burst(ax, ay, { type: 'star', count: 18, colors: ['#ffd23f', '#ffffff', E.color] });
      particles.burst(ax, ay, { type: 'confetti', count: 24 });
      particles.popText(ax, ay - 40 * st.k, 'Perfect!', '#ffd23f', 46 * st.k + 10);
      this.hootReact('yay');
      if (this.n <= 4) fx.flash('#fff6c2', 0.12);
    } else {
      a.playOnce('surprised', 0.55, 'idle');
      setTimeout(() => { if (st.eff === eff) { voice(st.p.charId, 'laugh'); a.emote('happy', 1.4); a.playOnce('cheer', 0.5, 'idle'); } }, 700);
      particles.burst(ax, ay, { type: E.good ? 'star' : 'bubble', count: 14, colors: [E.color, '#ffffff'] });
      particles.popText(ax, ay - 40 * st.k, E.label, E.color, 40 * st.k + 10);
      if (result === 'silly') { sfx('giggle'); this.hootReact('silly'); }
      else { if (E.good) a.playOnce('celebrate', 1.4, 'idle'); this.hootReact('surprise'); }
    }
    if (eff === 'hearts') a.emote('hearts', 0);
    if (eff === 'giant') { fx.shake(this.n > 4 ? 5 : 10, 0.3); sfx('stomp'); }
  }

  updateEffect(st, dt) {
    const a = st.actor, eff = st.eff;
    st.emitT -= dt;
    const cx = a.x, cy = a.y - a.z - a.height * st.fxScale * 0.5;
    const hw = a.width * st.fxScale * 0.4, hh = a.height * st.fxScale * 0.5;
    if (st.emitT <= 0) {
      st.emitT = this.n > 4 ? 0.28 : 0.18;
      const px = cx + rand(-hw, hw), py = cy + rand(-hh, hh);
      switch (eff) {
        case 'sparkle': particles.burst(px, py, { type: 'sparkle', count: 2, colors: ['#fff6a8', '#ffffff', '#ffd23f'] }); break;
        case 'hearts': particles.burst(px, py, { type: 'heart', count: 1, colors: ['#ff4f8b', '#ff8fc7'] }); break;
        case 'rainbow': particles.burst(px, py, { type: 'sparkle', count: 1 }); break;
        case 'floaty': particles.burst(a.x + rand(-hw, hw), a.y - a.z + 6, { type: 'sparkle', count: 1, colors: ['#e9e2ff', '#ffffff'] }); break;
        case 'fizz': particles.burst(px, py, { type: 'bubble', count: 2, speed: [30, 90] }); particles.burst(px, py, { type: 'spark', count: 2, colors: ['#5ddc6a', '#a6f08f'] }); break;
        case 'puffhair': if (Math.random() < 0.3) particles.burst(a.x, cy - hh, { type: 'smoke', count: 1 }); break;
        case 'tiny': if (Math.random() < 0.25) particles.burst(px, py, { type: 'note', count: 1, colors: ['#3fa7ff', '#ff6fb1'] }); break;
        default: break;
      }
    }
    if (eff === 'hiccup') {
      st.hicT -= dt;
      if (st.hicT <= 0) {
        st.hicT = rand(0.9, 1.5);
        st.hopZ = 34 * st.k; a.squash(-0.45);
        sfx('bubble'); sfx('pop');
        particles.burst(a.x + 20 * st.k, cy - hh * 0.6, { type: 'bubble', count: 4, speed: [60, 160] });
        particles.popText(a.x + 40 * st.k, cy - hh - 10, 'hic!', '#7fd3ff', 30 * st.k + 6);
      }
    }
  }

  // --- AI ------------------------------------------------------------------
  aiStation(st, dt, active) {
    const p = st.p, c = p.ctrl, ai = st.ai;
    if (ai.phase !== st.phase) {
      ai.phase = st.phase;
      ai.t = st.phase === 'wand' ? reactionTime(p) + rand(0.2, 0.6) : Math.max(ai.t, rand(0.2, 0.5));
    }
    ai.t -= dt;
    if (st.phase !== 'stir') c.move(0, 0);
    const prof = aiProfile(p);
    if (st.phase === 'add') {
      if (!active || st.flying.length) return;
      if (!ai.plan) {
        const rd = this.rd;
        if (rd.experiment) ai.plan = shuffle(INGREDIENTS.map((x) => x.id)).slice(0, st.slots);
        else {
          ai.plan = rd.ings.slice();
          if (makesMistake(p)) {
            const wrong = INGREDIENTS.map((x) => x.id).filter((id) => !rd.ings.includes(id));
            ai.plan[Math.floor(rand(ai.plan.length))] = pick(wrong);
          }
        }
        ai.t = rand(...prof.think);
      }
      const want = ai.plan[st.added.length];
      if (!want || ai.t > 0) return;
      const target = INGREDIENTS.findIndex((x) => x.id === want);
      if (st.sel !== target) {
        c.move(Math.sign(target - st.sel), 0);
        ai.t = rand(0.18, 0.3) / prof.speed;
      } else {
        c.press('a');
        ai.t = reactionTime(p) + rand(0.3, 0.7);
      }
    } else if (st.phase === 'stir') {
      if (ai.t > 0) { c.move(0, 0); return; }
      const rate = TAU * [1.0, 1.3, 1.7][clamp(p.aiLevel ?? 0, 0, 2)];
      ai.ang += rate * dt;
      c.move(Math.cos(ai.ang), Math.sin(ai.ang));
    } else if (st.phase === 'wand') {
      if (ai.t <= 0) { c.press('y'); ai.t = 1; }
    }
  }

  // --- drawing ---------------------------------------------------------------
  draw(g) {
    this.drawBackground(g);
    this.drawBoard(g);
    this.drawHootAndSpeech(g);
    for (const st of this.stations) this.drawStation(g, st);
    if (this.phase === 'brew' && this.brewT > ROUND_TIME - 20) ui.timer(g, ROUND_TIME - this.brewT, W - 120, 70);
    if (this.phase === 'end' || this.phase === 'outro') {
      // nothing extra: Hoot's speech carries the moment
    }
  }

  drawBackground(g) {
    const img = art('bg/potion-class');
    if (img) {
      const s = Math.max(W / img.width, H / img.height);
      g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
    } else {
      if (!this.bg) this.bg = this.renderBackground();
      g.drawImage(this.bg, 0, 0, W, H);
    }
    // Candle flames flicker on top.
    for (const cd of this.candles || []) {
      const f = 1 + Math.sin(this.t * 11 + cd.x) * 0.12 + Math.sin(this.t * 17 + cd.y) * 0.08;
      g.save(); g.translate(cd.x, cd.y);
      const gl = g.createRadialGradient(0, -8, 2, 0, -8, 60 * cd.s);
      gl.addColorStop(0, 'rgba(255,220,120,0.45)'); gl.addColorStop(1, 'rgba(255,220,120,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(0, -8, 60 * cd.s, 0, TAU); g.fill();
      g.scale(cd.s, cd.s * f);
      g.fillStyle = '#ffb31f'; g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(11, -10, 0, 0); g.quadraticCurveTo(-11, -10, 0, -30); g.fill();
      g.fillStyle = '#fff3b0'; g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(5, -6, 0, 0); g.quadraticCurveTo(-5, -6, 0, -18); g.fill();
      g.restore();
    }
    // Floating dust motes in the warm light.
    g.save();
    for (let i = 0; i < 18; i++) {
      const x = (i * 211 + this.t * 12 * (1 + (i % 3))) % W, y = (i * 97 + Math.sin(this.t * 0.6 + i) * 30) % this.wallBottom;
      g.globalAlpha = 0.25 + 0.25 * Math.sin(this.t * 2 + i);
      g.save(); g.translate(x, y); drawSparkleShape(g, 12 + (i % 3) * 5, '#fff6c2'); g.restore();
    }
    g.restore();
  }

  renderBackground() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const wb = this.wallBottom;
    // stone wall
    const gr = g.createLinearGradient(0, 0, 0, wb);
    gr.addColorStop(0, '#3e2f6e'); gr.addColorStop(1, '#6a52a6');
    g.fillStyle = gr; g.fillRect(0, 0, W, wb);
    g.strokeStyle = 'rgba(20,10,45,0.22)'; g.lineWidth = 3;
    for (let row = 0, y = 0; y < wb; row++, y += 64) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      for (let x = (row % 2) * 70; x < W; x += 140) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
    }
    // arched windows with moon and stars
    const win = (x, y, w, h, moon) => {
      g.save();
      g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath();
      g.fillStyle = '#1d2a6b'; g.fill();
      g.save(); g.clip();
      const sg = g.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, '#24307a'); sg.addColorStop(1, '#5b4bb0');
      g.fillStyle = sg; g.fillRect(x, y, w, h);
      for (let i = 0; i < 14; i++) { g.save(); g.translate(x + ((i * 53) % w), y + ((i * 37) % h)); drawSparkleShape(g, 10 + (i % 3) * 4, '#fff6c2'); g.restore(); }
      if (moon) { g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(x + w * 0.62, y + w * 0.45, w * 0.2, 0, TAU); g.fill(); g.fillStyle = '#24307a'; g.beginPath(); g.arc(x + w * 0.7, y + w * 0.4, w * 0.17, 0, TAU); g.fill(); }
      g.restore();
      g.lineWidth = 12; g.strokeStyle = '#8a5a34';
      g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.stroke();
      g.lineWidth = 6; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.55); g.lineTo(x + w, y + h * 0.55); g.stroke();
      g.fillStyle = '#9b6a3e'; g.fillRect(x - 16, y + h - 4, w + 32, 16);
      g.restore();
    };
    const wh = Math.min(380, wb - 120);
    if (wh > 120) { win(60, 40, 200, wh, true); win(W - 260, 40, 200, wh, false); }
    // shelves with jars and candles on each side
    this.candles = [];
    const jarCols = ['#ff6fb1', '#7fd3ff', '#ffd23f', '#5ddc6a', '#b36bff', '#ff9f1c'];
    const shelf = (x, y, w, seed) => {
      g.fillStyle = '#8a5a34'; g.strokeStyle = '#24163f'; g.lineWidth = 4;
      g.fillRect(x, y, w, 16); g.strokeRect(x, y, w, 16);
      let cx = x + 22;
      let i = seed;
      while (cx < x + w - 30) {
        const kind = i % 4;
        if (kind === 3) { this.candles.push({ x: cx, y: y - 52, s: 0.9 }); g.fillStyle = '#fff3df'; g.fillRect(cx - 9, y - 50, 18, 50); g.strokeRect(cx - 9, y - 50, 18, 50); cx += 44; }
        else {
          const jh = 40 + (i * 13) % 34, jw = 30 + (i * 7) % 16, col = jarCols[i % jarCols.length];
          g.fillStyle = 'rgba(220,240,255,0.55)'; g.beginPath(); g.roundRect(cx - jw / 2, y - jh, jw, jh, 8); g.fill(); g.stroke();
          g.fillStyle = col; g.globalAlpha = 0.85; g.beginPath(); g.roundRect(cx - jw / 2 + 4, y - jh * 0.6, jw - 8, jh * 0.6 - 4, 6); g.fill(); g.globalAlpha = 1;
          g.fillStyle = '#c98a4b'; g.fillRect(cx - jw / 2 + 4, y - jh - 8, jw - 8, 9); g.strokeRect(cx - jw / 2 + 4, y - jh - 8, jw - 8, 9);
          cx += jw + 16;
        }
        i++;
      }
    };
    if (wb > 330) {
      shelf(300, Math.min(260, wb - 60), 220, 0);
      shelf(W - 520, Math.min(260, wb - 60), 220, 2);
    }
    // star garland
    g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 3;
    g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, 26 + Math.sin(x / W * Math.PI * 6) * 14 + 14); g.stroke();
    for (let i = 0; i < 24; i++) { const x = 40 + i * 80; const y = 40 + Math.sin(x / W * Math.PI * 6) * 14; g.save(); g.translate(x, y + 12); drawStarShape(g, 22, ['#ffd23f', '#ff9ad5', '#9fdcff'][i % 3]); g.restore(); }
    // wooden floor
    const fg = g.createLinearGradient(0, wb, 0, H);
    fg.addColorStop(0, '#7a4f2e'); fg.addColorStop(1, '#a8703f');
    g.fillStyle = fg; g.fillRect(0, wb, W, H - wb);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, wb, W, 10);
    g.strokeStyle = 'rgba(50,25,10,0.3)'; g.lineWidth = 3;
    for (let y = wb + 40, r = 0; y < H; y += 46, r++) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      for (let x = (r * 173) % 260; x < W; x += 260) { g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x, y); g.stroke(); }
    }
    return c;
  }

  drawBoard(g) {
    const b = this.board, s = b.s;
    g.save(); g.translate(b.x, b.y); g.scale(s, s);
    const bw = 860, bh = 300;
    // frame + chalk
    g.fillStyle = 'rgba(20,10,40,0.3)'; ui.roundRect(g, 8, 12, bw, bh, 20); g.fill();
    g.fillStyle = '#8a5a34'; ui.roundRect(g, 0, 0, bw, bh, 20); g.fill();
    g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
    const cg = g.createLinearGradient(0, 0, 0, bh);
    cg.addColorStop(0, '#2f6253'); cg.addColorStop(1, '#244c41');
    g.fillStyle = cg; ui.roundRect(g, 20, 18, bw - 40, bh - 38, 10); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 3; g.stroke();
    // chalk smudges + doodles
    g.save(); g.globalAlpha = 0.12; g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(160, 230, 120, 20, -0.1, 0, TAU); g.ellipse(640, 70, 140, 18, 0.1, 0, TAU); g.fill(); g.restore();
    g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.arc(790, 240, 18, 0.5, 5.5); g.stroke();
    g.translate(60, 245); g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 16; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.stroke();
    g.restore();
    // chalk tray
    g.fillStyle = '#6e4529'; g.fillRect(40, bh - 22, bw - 80, 12);
    g.fillStyle = '#fff'; g.fillRect(120, bh - 28, 34, 8); g.fillStyle = '#ffb3d9'; g.fillRect(170, bh - 28, 26, 8);

    const rd = this.rd;
    const chalk = { stroke: false, color: '#f4fff8', weight: 700 };
    if (this.phase === 'end') {
      ui.text(g, 'Class dismissed!', bw / 2, 110, { size: 70, color: '#ffe58a', strokeWidth: 10, weight: 800 });
      ui.text(g, 'You are all wonderful wizards!', bw / 2, 190, { ...chalk, size: 40 });
      for (let i = 0; i < 5; i++) { g.save(); g.translate(bw / 2 + (i - 2) * 80, 245); g.rotate(Math.sin(this.t * 3 + i) * 0.3); drawStarShape(g, 36, '#ffd23f'); g.restore(); }
    } else if (rd.experiment) {
      ui.text(g, 'Free Experiment!', bw / 2, 70, { size: 58, color: '#ffe58a', strokeWidth: 10, weight: 800 });
      ui.text(g, 'Mix ANY three things!', bw / 2, 128, { ...chalk, size: 34 });
      for (let i = 0; i < 3; i++) {
        if (i >= this.boardPop && this.phase === 'intro') continue;
        const x = bw / 2 + (i - 1) * 200, y = 205;
        g.save(); g.translate(x, y); g.rotate(Math.sin(this.t * 2 + i) * 0.1);
        drawBottle(g, 0, 0, 96, RAINBOW[(i * 2 + Math.floor(this.t * 2)) % RAINBOW.length], { glow: 0.6, t: this.t });
        ui.text(g, '?', 0, 14, { size: 44, color: '#fff', strokeWidth: 8 });
        g.restore();
      }
    } else {
      const E = EFFECTS[rd.eff];
      ui.text(g, `Recipe ${this.round + 1} of 3`, 44, 44, { ...chalk, size: 26, align: 'left', color: '#cfe9df' });
      drawBottle(g, 160, 92, 70, E.color, { glow: 0.8, t: this.t });
      ui.text(g, E.potion, bw / 2 + 40, 84, { size: 56, color: E.color, strokeWidth: 10, weight: 800, maxWidth: 560 });
      const n = rd.ings.length;
      const gap = n === 4 ? 172 : 200;
      rd.ings.forEach((id, i) => {
        if (i >= this.boardPop && this.phase === 'intro') return;
        const x = bw / 2 + (i - (n - 1) / 2) * gap, y = 180;
        const age = this.phase === 'intro' ? this.phaseT - (0.5 + i * 0.28) : 9;
        const sc = age < 0.4 ? ease.outBack(clamp(age / 0.4, 0, 1)) : 1;
        g.save(); g.translate(x, y); g.scale(sc, sc);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(0, 0, 50, 0, TAU); g.fill();
        drawIngredient(g, id, 0, Math.sin(this.t * 2.5 + i) * 4, 84);
        g.restore();
        ui.text(g, INGREDIENTS.find((x2) => x2.id === id).name, x, 252, { ...chalk, size: 24, maxWidth: gap - 12 });
        if (i < n - 1) ui.text(g, '+', x + gap / 2, y, { ...chalk, size: 48, color: '#ffe58a' });
      });
    }
    g.restore();
  }

  drawHootAndSpeech(g) {
    const h = this.hoot, s = this.bs;
    const hp = this.hootPos;
    const talk = this.speech && this.speech.t < Math.min(this.speech.dur, 1.6) ? Math.abs(Math.sin(this.speech.t * 14)) : 0;
    drawHoot(g, hp.x, hp.y, s, { t: this.t, flap: h.flap, point: h.pointV, tilt: h.tilt, mood: h.mood, talk, blink: h.blink, look: h.look });
    if (this.speech) {
      const sp = this.speech;
      const a = Math.min(1, sp.t / 0.15, (sp.dur - sp.t) / 0.25);
      const bw = Math.min(440 * s, hp.x - 90 * s - 24);
      if (bw > 200) {
        const bx = hp.x - 90 * s - bw / 2, by = hp.y - 250 * s;
        const pop = ease.outBack(clamp(sp.t / 0.25, 0, 1));
        g.save(); g.translate(bx, by); g.scale(pop, pop);
        speechBubble(g, ui, sp.text, 0, 0, bw, 90 * s + bw / 2 - 30 * s, 60 * s, Math.round(30 * s + 2), Math.max(0, a));
        g.restore();
      }
    }
  }

  drawStation(g, st) {
    const { k } = st, p = st.p, a = st.actor;
    const bx = st.box.x, by = st.box.y;
    const shakeX = st.shake > 0 ? Math.sin(this.t * 60) * 6 * st.shake : 0;

    g.save(); g.translate(bx, by); g.scale(k, k);
    // rug
    g.fillStyle = hexA(p.color, 0.22); g.strokeStyle = hexA(p.color, 0.7); g.lineWidth = 4;
    g.beginPath(); g.ellipse(240, 326, 222, 46, 0, 0, TAU); g.fill(); g.stroke();
    // header chip
    ui.panel(g, 10, 8, 214, 58, { r: 29, fill: '#ffffff', stroke: p.color, lineWidth: 5, shadow: false });
    drawPortrait(g, p.charId, 39, 37, 23);
    ui.text(g, p.tag, 70, 25, { size: 22, color: p.color, align: 'left', strokeWidth: 5 });
    for (let j = 0; j < Math.min(st.score, 4); j++) drawBottle(g, 82 + j * 30, 49, 26, EFFECTS[this.rounds[j]?.eff]?.color || '#ff6fd0');
    if (st.score === 0) ui.text(g, 'potions: 0', 70, 49, { size: 18, color: '#8a7aa8', align: 'left', stroke: false, weight: 700 });
    // recipe slots
    const ns = st.slots;
    for (let j = 0; j < ns; j++) {
      const cx = 360 + (j - (ns - 1) / 2) * 52, cy = 38;
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, 23, 0, TAU); g.fill(); g.stroke();
      if (st.added[j]) drawIngredient(g, st.added[j], cx, cy, 38);
      else { g.fillStyle = 'rgba(36,22,63,0.2)'; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill(); }
    }
    // magic glow behind the cauldron when ready
    if (st.phase === 'wand' || st.phase === 'poof') {
      const gl = g.createRadialGradient(BREW.x, BREW.y, 10, BREW.x, BREW.y, 170);
      gl.addColorStop(0, rgbStr(st.brew, 0.6)); gl.addColorStop(1, rgbStr(st.brew, 0));
      g.fillStyle = gl; g.beginPath(); g.arc(BREW.x, BREW.y, 170, 0, TAU); g.fill();
    }
    const bubbling = st.phase === 'stir' ? clamp(st.stir / STIR_NEED, 0, 1) : st.phase === 'wand' ? 1 : 0.15 + st.splash;
    g.save(); g.translate(shakeX, -st.splash * 6);
    drawCauldron(g, BREW.x, BREW.y, 1, { brew: st.brew, t: this.t + st.i, stir: st.swirl, bubbling, spoonAngle: st.phase === 'stir' ? st.stirAng : 2.3 + Math.sin(this.t + st.i) * 0.1 });
    g.restore();
    // steam in brew color
    for (let j = 0; j < 3; j++) {
      const ph = (this.t * 0.4 + j / 3 + st.i * 0.13) % 1;
      g.save(); g.globalAlpha = 0.35 * Math.sin(ph * Math.PI) * (0.6 + bubbling);
      g.fillStyle = rgbStr(st.brew);
      g.beginPath(); g.arc(BREW.x - 40 + j * 40 + Math.sin(ph * 6 + j) * 12, BREW.y - 30 - ph * 110, 14 + ph * 20, 0, TAU); g.fill();
      g.restore();
    }
    g.restore();

    // character (world space)
    if (st.eff === 'sparkle' || st.eff === 'rainbow') {
      const gx = a.x, gy = a.y - a.z - a.height * st.fxScale * 0.5, r = a.height * st.fxScale * 0.75;
      const gl = g.createRadialGradient(gx, gy, 4, gx, gy, r);
      gl.addColorStop(0, st.eff === 'sparkle' ? 'rgba(255,236,140,0.65)' : 'rgba(255,170,230,0.5)'); gl.addColorStop(1, 'rgba(255,236,140,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(gx, gy, r * (1 + Math.sin(this.t * 4) * 0.06), 0, TAU); g.fill();
    }
    if (st.eff === 'floaty') puffCloud(g, a.x, a.y - 6 * k, 34 * k, '#ffffff', 0.85);
    if (st.eff === 'rainbow') a._flash = { color: RAINBOW[Math.floor(this.t * 6 + st.i) % RAINBOW.length], t: 0.38, dur: 1 };
    else if (st.eff === 'fizz') a._flash = { color: '#4fd86a', t: 0.3 + Math.sin(this.t * 6) * 0.12, dur: 1 };
    a.draw(g, { ring: p.color, scale: st.fxScale });
    if (st.cloud > 0) {
      const r = (70 + (1 - st.cloud) * 40) * k;
      puffCloud(g, a.x, a.y - a.height * 0.5, r, '#f2ecff', Math.min(1, st.cloud * 1.5));
      puffCloud(g, a.x + r * 0.5, a.y - a.height * 0.75, r * 0.6, '#ffe3f5', Math.min(1, st.cloud * 1.5));
    }
    if (this.t < 5 && this.round === 0) ui.playerTag(g, p, a.x, a.y - a.z - a.height * st.fxScale - 34 * k);

    // shelf, flying ingredients and prompts (station space again)
    g.save(); g.translate(bx, by); g.scale(k, k);
    g.fillStyle = '#9b6a3e'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.roundRect(12, 372, 456, 18, 6); g.fill(); g.stroke();
    g.fillStyle = '#7a4f2e'; g.fillRect(40, 390, 14, 10); g.fillRect(426, 390, 14, 10);
    const canPick = st.phase === 'add';
    INGREDIENTS.forEach((ing, j) => {
      const sel = j === st.sel && canPick;
      const x = SHELF_X(j);
      let y = SHELF_Y, s = 46;
      if (sel) {
        y -= 12 + st.selBump * 8 + Math.sin(this.t * 6) * 3; s = 60;
        g.fillStyle = hexA(p.color, 0.35); g.beginPath(); g.arc(x, y, 33, 0, TAU); g.fill();
        g.strokeStyle = p.color; g.lineWidth = 5; g.stroke();
      }
      g.save(); if (!canPick) g.globalAlpha = 0.75;
      drawIngredient(g, ing.id, x, y, s);
      g.restore();
    });
    // flying
    for (const f of st.flying) {
      const u = clamp(f.t / f.dur, 0, 1);
      const x = lerp(f.fx, BREW.x, u), y = lerp(f.fy, BREW.y - 6, u) - Math.sin(u * Math.PI) * 150;
      g.save(); g.translate(x, y); g.rotate(f.spin * u); drawIngredient(g, f.id, 0, 0, 54 * (1 - u * 0.3)); g.restore();
    }
    this.drawPrompt(g, st);
    g.restore();
  }

  drawPrompt(g, st) {
    const p = st.p;
    const active = this.phase === 'brew';
    if (st.phase === 'add') {
      const x = SHELF_X(st.sel);
      const name = INGREDIENTS[st.sel].name;
      ui.text(g, name, clamp(x, 70, 410), 292, { size: 24, color: '#fff', strokeWidth: 6, maxWidth: 160 });
      if (active && st.added.length + st.flying.length < st.slots) {
        ui.glyph(g, 'a', clamp(x, 70, 410) + Math.min(80, 6 + name.length * 6.5), 292, 32, { pulse: true });
      }
    } else if (st.phase === 'stir') {
      const cx = BREW.x, cy = 118;
      const prog = clamp(st.stir / STIR_NEED, 0, 1);
      g.lineWidth = 10; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.beginPath(); g.arc(cx, cy, 44, 0, TAU); g.stroke();
      g.strokeStyle = p.color; g.beginPath(); g.arc(cx, cy, 44, -Math.PI / 2, -Math.PI / 2 + prog * TAU); g.stroke();
      const ang = p.isAI ? st.ai.ang : this.t * 5;
      ui.glyph(g, 'stick', cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8, 50);
      // circular arrow
      g.save(); g.translate(cx, cy); g.rotate(this.t * 3);
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 1.3); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(60 * Math.cos(Math.PI * 1.3) - 9, 60 * Math.sin(Math.PI * 1.3) + 4); g.lineTo(60 * Math.cos(Math.PI * 1.3) + 9, 60 * Math.sin(Math.PI * 1.3) + 4); g.lineTo(60 * Math.cos(Math.PI * 1.45), 60 * Math.sin(Math.PI * 1.45)); g.closePath(); g.fill();
      g.restore();
      ui.text(g, 'Stir!', cx + 76, cy, { size: 36, color: '#fff', align: 'left', strokeWidth: 7 });
    } else if (st.phase === 'wand') {
      const cx = BREW.x, cy = 116;
      const sh = st.shake > 0 ? Math.sin(this.t * 60) * 6 * st.shake : 0;
      ui.glyph(g, 'y', cx + sh, cy, 62, { pulse: true });
      ui.text(g, 'POOF!', cx + 46, cy, { size: 42, color: '#ffd23f', align: 'left', strokeWidth: 8, weight: 800 });
    } else if (st.phase === 'shown') {
      const E = EFFECTS[st.eff];
      const pop = ease.outBack(clamp(st.effT / 0.35, 0, 1));
      g.save(); g.translate(BREW.x + 20, 118); g.scale(pop, pop); g.rotate(-0.05);
      const label = st.result === 'good' ? 'Perfect!' : st.result === 'silly' ? 'Silly!' : 'Surprise!';
      ui.text(g, label, 0, -18, { size: 42, color: st.result === 'good' ? '#ffd23f' : '#ffffff', strokeWidth: 8, weight: 800 });
      ui.text(g, E.label, 0, 24, { size: 30, color: E.color, strokeWidth: 7 });
      g.restore();
    }
  }
}
