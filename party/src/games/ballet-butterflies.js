// Butterfly Ballet (Molly Party) - follow-the-leader ballet on a flower stage.
// Madame Papillon, a butterfly fairy, shows a move with a big picture card:
// arms up = stick up, plié = stick down, side step = stick left/right,
// twirl = A. Copy it and your dancer strikes the pose while butterflies swirl
// in and join your flock. The tempo keeps climbing, a butterfly storm drops
// in halfway, the last stretch is a freestyle frenzy, and the show ends with
// a group bow under a shower of petals. Nobody loses: wrong moves are just a
// silly wobble, and everybody ends up with a cloud of butterflies.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { aiProfile } from '../engine/ai.js';
import { outfitItem } from '../engine/outfits.js';
import { clamp, lerp, rand, pick, chance, TAU, ease, placementsFromScores, later } from '../engine/util.js';
import { NAVY, BFLY, drawButterfly, drawPetal, drawTeacher, drawMovePicto, drawTutu, wantsTutu, drawStageBg } from './ballet-butterflies/art.js';
import { meta } from './ballet-butterflies.meta.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const PLAY_TIME = 56;          // seconds of dancing, then the bow
const STORM_AT = 27;           // butterfly storm surprise
const FREESTYLE_AT = 47;       // last stretch: any move counts
const BOW_LEN = 3.6;
const MOVES = ['up', 'plie', 'side', 'twirl'];
const MOVE_POSE = { up: 'dance-up', plie: 'dance-down', side: 'dance-side', twirl: 'pose-twirl' };
const MOVE_NOTE = { up: [76, 79, 84], plie: [72, 67, 60], side: [72, 76, 72], twirl: [72, 76, 79, 84] };
const MOVE_COL = { up: '#6fd0ff', plie: '#ffd23f', side: '#6fe3b4', twirl: '#ff7ac6' };
const MOVE_TIME = 0.6;         // how long a dancer's move animation lasts
const MAX_FLOCK = 14;          // butterflies drawn per dancer (score keeps counting)
const TEACHER = { x: 960, y: 478, h: 330 };
const CARD = { x: 1480, y: 300, s: 300 };
const HINT = { x: 440, y: 300 };

/** Beat length (seconds) at time t: brisk at the start, snappy later. */
const beatLen = (t) => (t < STORM_AT ? lerp(3.1, 2.3, t / STORM_AT) : lerp(2.2, 1.8, clamp((t - STORM_AT) / (FREESTYLE_AT - STORM_AT), 0, 1)));

function drawStickHint(g, move, x, y, size, t, sideDir = 1) {
  if (move === 'twirl') { ui.glyph(g, 'a', x, y, size, { pulse: true }); return; }
  ui.glyph(g, 'stick', x, y, size);
  const push = (Math.sin(t * 8) * 0.5 + 0.5) * size * 0.18;
  const dirs = move === 'up' ? [[0, -1]] : move === 'plie' ? [[0, 1]] : [[-1, 0], [1, 0]];
  g.save(); g.translate(x, y);
  for (const [dx, dy] of dirs) {
    g.save(); g.rotate(Math.atan2(dy, dx)); g.translate(size * 0.62 + push, 0);
    g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = size * 0.06; g.lineJoin = 'round';
    const a = size * 0.36;
    g.beginPath(); g.moveTo(a, 0); g.lineTo(0, -a * 0.8); g.lineTo(0, -a * 0.35); g.lineTo(-a * 0.8, -a * 0.35); g.lineTo(-a * 0.8, a * 0.35); g.lineTo(0, a * 0.35); g.lineTo(0, a * 0.8); g.closePath();
    g.fill(); g.stroke(); g.restore();
  }
  g.restore();
}

export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;          // animation clock
    this.time = 0;       // seconds since GO
    this.done = false;
    this.phase = 'dance';  // dance | bow
    this.scores = this.players.map(() => 0);
    this.wows = this.players.map(() => 0);
    this.petals = [];
    this.swarm = [];
    this.stormT = -1;
    this.banner = null;  // { text, t, color }
    // layout: one row up to 4, two staggered rows for more
    const two = n > 4, sc = n <= 2 ? 1.35 : n <= 4 ? 1.2 : 1.0;
    const backN = two ? Math.ceil(n / 2) : n;
    this.dancers = this.players.map((p, i) => {
      const back = two && i < backN, row = two && !back ? i - backN : i, rowN = back || !two ? backN : n - backN;
      const span = two ? 1300 : Math.min(1300, (n - 1) * 520);
      const sp = rowN > 1 ? span / (rowN - 1 + (two ? 0.5 : 0)) : 0;
      const x = W / 2 + (row - (rowN - 1) / 2) * sp + (two ? (back ? -sp / 4 : sp / 4) : 0);
      const y = two ? (back ? 840 : 1010) : 990;
      const a = new Actor(p, { scale: sc * (two && back ? 0.92 : 1), x, y, outfit: this.balletLook(p, i) });
      a.snap();
      a.facing = x < W / 2 ? 1 : -1;
      if (wantsTutu(p.charId)) {
        const col = BFLY[i % 4];
        a.char.members.forEach((def, mi) => a.attach((g, info) => drawTutu(g, def, info, col, this.t + i), { member: mi }));
      }
      return {
        p, i, a, hx: x, hy: y, move: null, mt: 0, dir: 1, cool: 0, prevDir: null,
        got: false, flock: [], streak: 0, ai: null, glowT: 0,
      };
    });
    this.dancers.sort((a, b) => a.hy - b.hy);
    this.byIndex = [...this.dancers].sort((a, b) => a.i - b.i);
    this.beat = null;
    this.lastMove = null;
    this.beatN = 0;
  }

  /** The player's own look plus ballet wings and a crown on any free slot. */
  balletLook(p, i) {
    const look = (p.outfit || []).slice();
    const has = (slot) => look.some((e) => outfitItem(e.id)?.slot === slot);
    const wings = ['butterfly-wings', 'fairy-wings', 'petal-wings', 'butterfly-wings'][i % 4];
    if (!has('back') && outfitItem(wings)) look.push({ id: wings, colour: [0, 3, 2, 4, 1, 5, 7, 6][i % 8] });
    const crown = i % 2 ? 'flower-crown' : 'tiara';
    if (!has('head') && outfitItem(crown)) look.push({ id: crown, colour: [6, 0, 1, 2, 6, 4, 3, 0][i % 8] });
    return look;
  }

  // --- beats -------------------------------------------------------------------
  nextBeat() {
    const intro = ['up', 'plie', 'side', 'twirl'];
    let move;
    if (this.beatN < intro.length) move = intro[this.beatN];
    else do { move = pick(MOVES); } while (move === this.lastMove);
    this.lastMove = move;
    this.beatN++;
    const len = beatLen(this.time);
    this.beat = { move, t: 0, len, sideDir: chance(0.5) ? 1 : -1, early: false };
    for (const d of this.dancers) { d.got = false; d.ai = d.p.isAI ? this.planAI(d, move, len) : null; }
    MOVE_NOTE[move].forEach((m, k) => later(() => sfx('note', { midi: m, vol: 0.35 }), k * 70));
    snd('bb-cue', 'magic', { vol: 0.45 });
    particles.burst(CARD.x, CARD.y, { type: 'sparkle', count: 10, colors: [MOVE_COL[move], '#fff'], speed: [80, 260] });
  }

  planAI(d, move, len) {
    const lvl = clamp(d.p.aiLevel ?? 0, 0, 2);
    const [ok, lo, hi, oops] = [[0.68, 0.85, 1.7, 0.2], [0.8, 0.6, 1.3, 0.12], [0.88, 0.45, 1.0, 0.06]][lvl];
    const plan = [];
    let at = rand(lo, hi) * (len / 2.6);
    if (chance(oops)) { plan.push({ at, move: pick(MOVES.filter((m) => m !== move)) }); at += rand(0.35, 0.6); }
    if (chance(ok)) plan.push({ at: Math.min(at, len - 0.2), move });
    return { plan, release: 0 };
  }

  // --- moves -------------------------------------------------------------------
  readInput(d) {
    const c = d.p.ctrl;
    let dir = null;
    const m = Math.hypot(c.x, c.y);
    if (m > 0.55) dir = Math.abs(c.y) >= Math.abs(c.x) ? (c.y < 0 ? 'up' : 'plie') : 'side';
    const sdir = c.x < 0 ? -1 : 1;
    if (c.pressed('a')) this.doMove(d, 'twirl', d.a.facing);
    else if (dir && dir !== d.prevDir) this.doMove(d, dir, sdir);
    d.prevDir = dir;
  }

  doMove(d, move, sdir = 1) {
    if (d.cool > 0 || this.phase !== 'dance') return;
    const a = d.a;
    d.move = move; d.mt = 0; d.dir = sdir; d.cool = 0.3;
    a.playOnce(MOVE_POSE[move], MOVE_TIME, 'idle');
    if (move === 'side') { a.facing = sdir; snd('ds-slide', 'whoosh', { vol: 0.35 }); }
    if (move === 'twirl') snd('ds-twirl', 'whoosh', { vol: 0.4 });
    if (move === 'plie') a.squash(0.35);
    if (move === 'up') a.squash(-0.3);
    const free = this.time >= FREESTYLE_AT;
    const b = this.beat;
    if (free) {
      this.award(d, 1, false, move);
      return;
    }
    if (!b || d.got || b.t < 0.2) return;
    if (move === b.move) {
      d.got = true;
      const quick = b.t < b.len * 0.55;
      this.award(d, quick ? 2 : 1, quick, move);
      d.streak++;
      if (d.streak > 0 && d.streak % 5 === 0) {
        particles.ring(a.x, a.y - a.height * 0.5, '#ffd23f', 220, 0.5);
        particles.popText(a.x, a.y - a.height - 110, 'Super!', '#ffd23f', 56);
        a.emote('hearts', 1.2);
        snd('bb-wow', 'star', { vol: 0.5 });
      }
    } else {
      // funny wobble, no penalty
      d.wobbleT = 0.28;
      a.emote('question', 0.9);
      snd('boing', 'bounce', { vol: 0.4 });
      particles.burst(a.x, a.y - a.height * 0.3, { type: 'star', count: 4, colors: ['#ffd23f', '#fff'], speed: [80, 180] });
    }
  }

  award(d, n, quick, move) {
    const a = d.a, top = a.y - a.z - a.height;
    this.scores[d.i] += n;
    if (quick) this.wows[d.i]++;
    for (let k = 0; k < n; k++) this.addButterfly(d, k);
    d.glowT = 0.5;
    particles.burst(a.x, top + a.height * 0.4, { type: 'sparkle', count: quick ? 14 : 8, colors: [MOVE_COL[move], '#fff', d.p.color], speed: [80, 300] });
    particles.popText(a.x, top - 40, quick ? 'Wow! +2' : '+1', quick ? '#ff7ac6' : d.p.color, quick ? 50 : 44);
    snd('bb-flutter', 'sparkle', { vol: 0.45 });
    sfx('collect', { step: Math.min(12, d.streak), vol: 0.35 });
    if (quick && chance(0.35)) a.emote('heart', 0.8);
  }

  addButterfly(d, k = 0, from = null) {
    if (d.flock.length >= MAX_FLOCK) { d.flock[(this.scores[d.i] + k) % MAX_FLOCK].col = pick(BFLY); return; }
    const src = from || { x: TEACHER.x + rand(-60, 60), y: TEACHER.y - 200 };
    d.flock.push({
      col: pick(BFLY), ang: rand(TAU), spd: rand(1.4, 2.4) * (chance(0.5) ? 1 : -1), r: rand(0.5, 0.8), yo: rand(0.2, 0.95),
      ph: rand(TAU), sx: src.x, sy: src.y, arrive: 0, delay: k * 0.12, s: rand(48, 66),
    });
  }

  // --- update ------------------------------------------------------------------
  preUpdate(dt) {
    this.t += dt;
    for (const d of this.dancers) d.a.update(dt);
  }

  update(dt) {
    this.t += dt;
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.8) this.banner = null; }
    if (this.phase === 'dance') this.updateDance(dt);
    else this.updateBow(dt);
    this.updateDancers(dt);
    this.updateSwarm(dt);
    this.updatePetals(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    this.updateDancers(dt);
    this.updatePetals(dt);
    this.updateSwarm(dt);
  }

  updateDance(dt) {
    const free = this.time >= FREESTYLE_AT;
    if (!free) {
      if (!this.beat) this.nextBeat();
      const b = this.beat;
      b.t += dt;
      // everyone copied: move on fast (momentum!)
      if (!b.early && b.t > 0.6 && this.dancers.every((d) => d.got)) { b.early = true; b.len = Math.min(b.len, b.t + 0.45); }
      if (b.t >= b.len) {
        for (const d of this.dancers) if (!d.got) d.streak = 0;
        this.beat = null;
        if (this.time + 0.4 < FREESTYLE_AT) this.nextBeat();
      }
    } else if (!this.freeStarted) {
      this.freeStarted = true; this.beat = null;
      this.banner = { text: 'Freestyle!', t: 0, color: '#ff7ac6' };
      snd('bb-freestyle', 'fanfare', { vol: 0.5 });
      fx.flash('#fff0fa', 0.2);
      particles.confettiRain(W, 60);
    }
    if (this.stormT < 0 && this.time >= STORM_AT) this.startStorm();
    // CPU players
    for (const d of this.dancers) {
      if (!d.p.isAI) continue;
      const c = d.p.ctrl;
      if (free) {
        d.freeT = (d.freeT ?? rand(0.2, 0.5)) - dt;
        if (d.freeT <= 0) {
          const lvl = clamp(d.p.aiLevel ?? 0, 0, 2);
          d.freeT = rand(...[[0.55, 0.95], [0.45, 0.75], [0.38, 0.6]][lvl]);
          const m = pick(MOVES);
          if (m === 'twirl') c.press('a'); else { c.move(m === 'side' ? (chance(0.5) ? 1 : -1) : 0, m === 'up' ? -1 : m === 'plie' ? 1 : 0); d.aiRelease = 0.12; }
        }
      } else if (d.ai && this.beat) {
        const nx = d.ai.plan[0];
        if (nx && this.beat.t >= nx.at) {
          d.ai.plan.shift();
          if (nx.move === 'twirl') c.press('a');
          else { c.move(nx.move === 'side' ? (chance(0.5) ? 1 : -1) : 0, nx.move === 'up' ? -1 : nx.move === 'plie' ? 1 : 0); d.aiRelease = 0.14; }
        }
      }
      if (d.aiRelease > 0) { d.aiRelease -= dt; if (d.aiRelease <= 0) c.move(0, 0); }
    }
    for (const d of this.dancers) this.readInput(d);
    if (this.time >= PLAY_TIME) this.startBow();
  }

  startStorm() {
    this.stormT = 0;
    this.banner = { text: 'Butterfly Storm!', t: 0, color: '#6fd0ff' };
    snd('bb-swarm', 'magic', { vol: 0.6 });
    snd('wing-twinkle', null, { vol: 0.5 });
    fx.shake(8, 0.3);
    this.api.camera && this.api.camera.punch(W / 2, 700, 1.08, 0.5);
    for (let i = 0; i < 70; i++) {
      this.swarm.push({ x: -100 - rand(900), y: rand(180, 900), vy: rand(-40, 40), vx: rand(650, 950), col: pick(BFLY), s: rand(34, 60), ph: rand(TAU) });
    }
    // two gift butterflies for everyone, dropping out of the swarm
    for (const d of this.dancers) d.giftT = 0.4 + (d.hx / W) * 0.9;
  }

  giveGift(d) {
    this.scores[d.i] += 2;
    this.addButterfly(d, 0, { x: d.a.x - 300, y: d.a.y - 400 }); this.addButterfly(d, 1, { x: d.a.x - 300, y: d.a.y - 360 });
    particles.popText(d.a.x, d.a.y - d.a.height - 40, '+2', '#6fd0ff', 46);
    d.a.playOnce('surprised', 0.4, 'idle'); d.a.emote('exclaim', 0.6);
    sfx('collect', { step: 6, vol: 0.3 });
  }

  startBow() {
    this.phase = 'bow'; this.bowT = 0; this.beat = null;
    this.banner = { text: 'Bravo!', t: 0, color: '#ffd23f' };
    for (const d of this.dancers) { d.a.setPose('bow'); d.move = null; d.p.isAI && d.p.ctrl.move(0, 0); }
    snd('applause', 'cheer', { vol: 0.6 });
    sfx('fanfare', { vol: 0.5 });
    fx.flash('#fff', 0.25);
    for (let i = 0; i < 160; i++) this.petals.push(this.newPetal(rand(-900, -20)));
  }

  newPetal(y) {
    return { x: rand(W), y, vx: rand(-40, 40), vy: rand(120, 260), rot: rand(TAU), spin: rand(-4, 4), s: rand(20, 36), c: pick(['#ff9fcf', '#ffc4e6', '#ff7ac6', '#fff0f8', '#ffd0a8']), ph: rand(TAU) };
  }

  updateBow(dt) {
    this.bowT += dt;
    if (this.bowT > 1.2 && !this.bowed2) {
      this.bowed2 = true;
      for (const d of this.dancers) { d.a.setPose('celebrate'); }
      particles.confettiRain(W, 80);
      fx.slowmo(0.6, 0.5);
    }
    if (this.bowT > BOW_LEN && !this.done) this.finish();
  }

  updateDancers(dt) {
    for (const d of this.dancers) {
      const a = d.a;
      d.cool = Math.max(0, d.cool - dt);
      if (d.giftT > 0) { d.giftT -= dt; if (d.giftT <= 0) this.giveGift(d); }
      if (d.wobbleT > 0) { d.wobbleT -= dt; if (d.wobbleT <= 0) a.playOnce('balance', 0.5, 'idle'); }
      d.glowT = Math.max(0, d.glowT - dt);
      let ox = 0, z = 0;
      if (d.move) {
        d.mt += dt;
        const k = clamp(d.mt / MOVE_TIME, 0, 1), s = Math.sin(k * Math.PI);
        if (d.move === 'side') ox = d.dir * 80 * s;
        if (d.move === 'up') z = 46 * s;
        if (d.move === 'twirl') z = 14 * s;   // the pose-twirl frames do the turning
        if (k >= 1) { d.move = null; a.facing = d.hx < W / 2 ? 1 : -1; }
        if (d.move && Math.random() < dt * 30) particles.trail(a.x + rand(-30, 30), a.y - rand(0, a.height), { type: 'sparkle', colors: [MOVE_COL[d.move], '#fff'], size: [6, 12], speed: [10, 60], life: [0.3, 0.6] });
      }
      a.x = d.hx + ox; a.y = d.hy; a.z = z;
      a.update(dt);
      for (const b of d.flock) {
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.arrive = Math.min(1, b.arrive + dt * 1.6);
        b.ang += b.spd * dt * (this.phase === 'bow' ? 1.8 : 1);
      }
    }
  }

  updateSwarm(dt) {
    if (this.stormT >= 0) this.stormT += dt;
    for (const s of this.swarm) { s.x += s.vx * dt; s.y += (s.vy + Math.sin(this.t * 5 + s.ph) * 120) * dt; }
    this.swarm = this.swarm.filter((s) => s.x < W + 120);
  }

  updatePetals(dt) {
    for (const p of this.petals) {
      p.x += (p.vx + Math.sin(this.t * 2 + p.ph) * 50) * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
    }
    this.petals = this.petals.filter((p) => p.y < H + 40);
  }

  finish() {
    this.done = true;
    const top = Math.max(...this.scores);
    // gentle: dancers within a few butterflies of each other share a place
    const placements = placementsFromScores(this.scores.map((v) => Math.floor((v + 4 - (top % 5)) / 5)));
    const best = this.byIndex[this.scores.indexOf(top)];
    this.api.finish({
      placements,
      stats: this.scores.map((s, i) => `${s} butterflies${this.wows[i] ? ` · ${this.wows[i]} wow` : ''}`),
      focus: { x: best.a.x, y: best.a.y - best.a.height * 0.5 },
    });
  }

  // --- draw --------------------------------------------------------------------
  draw(g) {
    drawStageBg(g, this.t, this.phase === 'bow' ? 1 : 0);
    // teacher
    const b = this.beat;
    let tm = null, tk = 0;
    if (this.phase === 'bow') { tm = 'bow'; tk = clamp(this.bowT / 1.2, 0, 1) * 0.5 + 0.25; }
    else if (b) { tm = b.move; tk = clamp(b.t / 0.95, 0, 1); }
    else if (this.time >= FREESTYLE_AT) { tm = MOVES[Math.floor(this.t * 1.6) % 4]; tk = (this.t * 1.6) % 1; }
    drawTeacher(g, TEACHER.x, TEACHER.y, TEACHER.h, this.t, tm, tk, b ? b.sideDir : 1);
    if (b && b.t < 0.9) {
      const k = b.t / 0.9;
      g.save(); g.globalAlpha = 1 - k; g.strokeStyle = MOVE_COL[b.move]; g.lineWidth = 10;
      g.beginPath(); g.arc(TEACHER.x, TEACHER.y - TEACHER.h * 0.55, 120 + k * 160, 0, TAU); g.stroke(); g.restore();
    }
    this.drawCard(g);
    // dancers (back row first) with their flocks
    for (const d of this.dancers) this.drawFlock(g, d, false);
    for (const d of this.dancers) {
      if (d.glowT > 0) {
        g.save(); g.globalAlpha = d.glowT * 1.2; g.fillStyle = d.p.color;
        g.beginPath(); g.ellipse(d.a.x, d.a.y, 90 * d.a.scale, 24 * d.a.scale, 0, 0, TAU); g.fill(); g.restore();
      }
      d.a.draw(g, { ring: d.p.color });
      this.drawFlock(g, d, true);
    }
    for (const d of this.dancers) {
      const a = d.a, top = a.y - a.z - a.height - 26 - (a.emotes.length ? 50 : 0);
      if (this.time < 5 || this.n > 1) ui.playerTag(g, d.p, a.x, top);
      if (d.got && this.beat) this.drawCheck(g, a.x + 50, top - 20, d.p.color);
    }
    for (const s of this.swarm) drawButterfly(g, s.x, s.y, s.s, s.col, Math.sin(this.t * 16 + s.ph), 0.9 + Math.sin(this.t * 4 + s.ph) * 0.2);
    for (const p of this.petals) drawPetal(g, p.x, p.y, p.s, p.rot, p.c);
  }

  drawFlock(g, d, front) {
    const a = d.a, cx = a.x, cy = a.y - a.z;
    for (const b of d.flock) {
      if (b.delay > 0) continue;
      const depth = Math.sin(b.ang);
      if ((depth >= 0) !== front) continue;
      const rx = a.height * b.r + 30, px = cx + Math.cos(b.ang) * rx, py = cy - a.height * b.yo + depth * 26 + Math.sin(this.t * 3 + b.ph) * 12;
      const k = ease.outCubic(b.arrive);
      const x = lerp(b.sx, px, k), y = lerp(b.sy, py, k) - Math.sin(k * Math.PI) * 120;
      drawButterfly(g, x, y, b.s * (0.85 + depth * 0.15) * a.scale, b.col, Math.sin(this.t * 15 + b.ph), Math.cos(b.ang) * 0.4 * Math.sign(b.spd));
    }
  }

  drawCheck(g, x, y, color) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#fff'; g.strokeStyle = color; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#36b583'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(-2, 8); g.lineTo(11, -8); g.stroke();
    g.restore();
  }

  drawCard(g) {
    const b = this.beat;
    const free = this.time >= FREESTYLE_AT && this.phase === 'dance';
    if (!b && !free) return;
    const pop = b ? ease.outBack(clamp(b.t / 0.3, 0, 1)) : 1;
    const wob = Math.sin(this.t * 5) * 0.03;
    g.save(); g.translate(CARD.x, CARD.y); g.scale(pop, pop); g.rotate(wob);
    const s = CARD.s;
    ui.panel(g, -s / 2, -s / 2, s, s, { r: 40, fill: '#fff', stroke: b ? MOVE_COL[b.move] : '#ff7ac6', lineWidth: 10 });
    if (b) {
      drawMovePicto(g, b.move, 0, 0, s * 0.8, this.t);
      // time ring
      const left = 1 - clamp(b.t / b.len, 0, 1);
      g.strokeStyle = NAVY; g.lineWidth = 12; g.lineCap = 'round'; g.globalAlpha = 0.25;
      g.beginPath(); g.arc(s * 0.5 - 6, -s * 0.5 + 6, 32, 0, TAU); g.stroke(); g.globalAlpha = 1;
      g.strokeStyle = left < 0.3 ? '#ff4d6d' : MOVE_COL[b.move];
      g.beginPath(); g.arc(s * 0.5 - 6, -s * 0.5 + 6, 32, -Math.PI / 2, -Math.PI / 2 + TAU * left); g.stroke();
    } else {
      MOVES.forEach((m, k) => drawMovePicto(g, m, (k % 2 - 0.5) * s * 0.46, (Math.floor(k / 2) - 0.5) * s * 0.46, s * 0.42, this.t + k));
    }
    g.restore();
    // big control hint on the left
    g.save(); g.translate(HINT.x, HINT.y); g.scale(pop, pop);
    ui.panel(g, -130, -130, 260, 260, { r: 130, fill: 'rgba(255,255,255,0.85)', stroke: b ? MOVE_COL[b.move] : '#ff7ac6', lineWidth: 8 });
    if (b) drawStickHint(g, b.move, 0, 0, 110, this.t, b.sideDir);
    else {
      const m = MOVES[Math.floor(this.t * 2) % 4];
      drawStickHint(g, m, 0, 0, 110, this.t);
    }
    g.restore();
    // pointing arrow from card to the teacher
    if (b && b.t < 1.2) {
      g.save(); g.globalAlpha = 1 - b.t / 1.2;
      ui.text(g, '✦', CARD.x - s / 2 - 50 + Math.sin(this.t * 10) * 8, CARD.y, { size: 60, color: MOVE_COL[b.move] });
      g.restore();
    }
  }

  drawHUD(g) {
    ui.scoreboard(g, this.players, this.scores, { y: 18, avoidCenter: true, format: (v) => String(v) });
    // butterfly icons in the chips are implied by the number; timer in the middle
    ui.timer(g, Math.max(0, PLAY_TIME - this.time), W / 2, 58);
    if (this.banner) {
      const k = this.banner.t;
      g.save(); g.globalAlpha = clamp((1.8 - k) / 0.4, 0, 1);
      ui.banner(g, this.banner.text, k, { y: 600, size: 130, color: this.banner.color });
      g.restore();
    }
  }
}
