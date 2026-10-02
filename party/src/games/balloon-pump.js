// Balloon Pump - button race, best of 3 rounds.
// Mash A to pump. Each press adds PRESSURE to a gauge; pressure flows into the
// balloon. Sweet spot = high but not red: past the red line the hose sputters
// and wastes the air (comic puffs). First balloon to POP wins the round.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import { charById } from '../data/characters.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, host } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { PLAYER_COLORS } from '../data/characters.js';
import { aiProfile } from '../engine/ai.js';
import { clamp, lerp, damp, rand, chance, pick, placementsFromScores, ease, TAU } from '../engine/util.js';

const NAVY = ui.NAVY;
const ROUNDS = 3;
const WINS_NEEDED = 2;
const SOLO_TIME = 13;           // solo mode: seconds to pop each balloon

// Pressure model (tuned with a quick simulation, see notes in the report).
const PRESS = 0.1;              // pressure added by one press
const DECAY = 1.1;              // exponential pressure bleed per second
const RED = 0.82;               // above this the hose sputters
const FLOW = 0.215;             // balloon growth per second at full flow
const SWEET = 0.4;              // gauge: below this is "weak"

const flowEff = (p) => (p > RED ? 0.1 + 0.45 * (1 - (p - RED) / (1 - RED)) : 1);

export const meta = {
  id: 'balloon-pump',
  title: 'Balloon Pump',
  category: 'party',
  type: 'Button race',
  goal: 'Pump your balloon until it POPS first! Best of 3.',
  controls: [['a', 'Mash to pump']],
  tips: [
    'Keep the needle in the green - the red zone wastes air!',
    'Rhythm beats panic: steady, quick pumps win.',
    'First balloon to pop wins the round. Win 2 rounds!',
  ],
  music: 'party',
  duration: '~40 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#ffd6ec'); grd.addColorStop(1, '#fff1c9');
    g.fillStyle = grd; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(x + w * ((i * 0.37 + 0.1) % 1), y + h * ((i * 0.53 + 0.05) % 1), h * 0.04, 0, TAU); g.fill(); }
    // floor
    g.fillStyle = '#ffe08a'; g.fillRect(x, y + h * 0.82, w, h * 0.18);
    const k = 0.5 + 0.5 * Math.sin(t * 2.2);
    const r = h * (0.2 + 0.1 * k);
    const cx = x + w * 0.62, cy = y + h * 0.7 - r;
    // pump
    const px = x + w * 0.27, py = y + h * 0.84;
    const iconPump = art('prop/pump');
    if (iconPump) {
      const dip = Math.abs(Math.sin(t * 6)) * 0.06;
      const ph = h * 0.48, pw = ph * iconPump.width / iconPump.height;
      g.drawImage(iconPump, px - pw * 0.39, py - ph * (1 - dip), pw, ph * (1 - dip));
    } else {
    g.fillStyle = '#9aa5c4'; g.strokeStyle = NAVY; g.lineWidth = h * 0.02;
    ui.roundRect(g, px - w * 0.07, py - h * 0.3, w * 0.14, h * 0.3, h * 0.03); g.fill(); g.stroke();
    const dip = Math.abs(Math.sin(t * 6)) * h * 0.06;
    g.fillStyle = '#ff6fb1'; ui.roundRect(g, px - w * 0.1, py - h * 0.4 + dip, w * 0.2, h * 0.05, h * 0.025); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(px, py - h * 0.35 + dip); g.lineTo(px, py - h * 0.3); g.stroke();
    // hose
    g.strokeStyle = NAVY; g.lineWidth = h * 0.03; g.beginPath(); g.moveTo(px + w * 0.07, py - h * 0.08);
    g.quadraticCurveTo(x + w * 0.45, py + h * 0.08, cx, cy + r + h * 0.02); g.stroke();
    }
    // balloon
    if (!drawArt(g, 'prop/balloon', cx, cy + r * 1.16, r * 2.4, r * 2.4, { anchor: 'bottom' })) {
      drawBalloonShape(g, cx, cy, r, '#ff4d6d', h * 0.022);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(cx - r * 0.4, cy - r * 0.45, r * 0.18, r * 0.3, -0.5, 0, TAU); g.fill();
    }
    // POP star burst
    const bx = x + w * 0.2, by = y + h * 0.2;
    g.save(); g.translate(bx, by); g.rotate(Math.sin(t * 2) * 0.15);
    g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = h * 0.02;
    g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, rr = i % 2 ? h * 0.1 : h * 0.17; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
    ui.text(g, 'POP', 0, 0, { size: h * 0.12, color: '#ff4d6d', strokeWidth: h * 0.02, shadow: false });
    g.restore();
  },
};

/** Cute balloon outline: round top, pinched knot at the bottom (center cx,cy; radius r). */
function drawBalloonShape(g, cx, cy, r, color, lw = 5) {
  g.save();
  g.translate(cx, cy);
  g.beginPath();
  g.moveTo(0, r * 1.0);
  g.bezierCurveTo(-r * 0.35, r * 0.85, -r * 1.0, r * 0.4, -r * 1.0, -r * 0.15);
  g.bezierCurveTo(-r * 1.0, -r * 0.8, -r * 0.5, -r * 1.1, 0, -r * 1.1);
  g.bezierCurveTo(r * 0.5, -r * 1.1, r * 1.0, -r * 0.8, r * 1.0, -r * 0.15);
  g.bezierCurveTo(r * 1.0, r * 0.4, r * 0.35, r * 0.85, 0, r * 1.0);
  g.closePath();
  g.fillStyle = color; g.fill();
  g.lineWidth = lw; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
  // knot
  g.beginPath(); g.moveTo(0, r * 0.98); g.lineTo(-r * 0.13, r * 1.16); g.lineTo(r * 0.13, r * 1.16); g.closePath();
  g.fillStyle = color; g.fill(); g.stroke();
  g.restore();
}

// ---- generated art helpers ---------------------------------------------------
// Balloon art per player color (PLAYER_COLORS order), generic 'prop/balloon' as a fallback.
const BALLOON_KEYS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink'].map((c) => `prop/balloon-${c}`);
function balloonArt(p) {
  const ci = PLAYER_COLORS.indexOf(p.color);
  return art(BALLOON_KEYS[(ci >= 0 ? ci : p.index) % 8]) || art('prop/balloon');
}
// The balloon files have uneven transparent padding: crop to the alpha bounds
// (measured once per image) so the knot sits exactly on the nozzle.
const artMeta = new WeakMap();
function artInfo(img) {
  let m = artMeta.get(img);
  if (m) return m;
  m = { x: 0, y: 0, w: img.width, h: img.height, white: null };
  try {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const cg = c.getContext('2d');
    cg.drawImage(img, 0, 0);
    const d = cg.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 >= x0) m = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, white: null };
    // white silhouette for the "stretched thin" wash
    cg.globalCompositeOperation = 'source-in'; cg.fillStyle = '#ffffff'; cg.fillRect(0, 0, c.width, c.height);
    m.white = c;
  } catch (e) { /* tainted or no DOM: draw uncropped */ }
  artMeta.set(img, m);
  return m;
}
// Pump art slices (image px): T-handle 0..PUMP_ROD0, rod PUMP_ROD0..PUMP_ROD1 (stretched while
// the handle is up), barrel/base below. PUMP_BX = barrel center, PUMP_FOOT = bottom of the base,
// PUMP_HOSE = where the procedural hose leaves the coil.
const PUMP_ROD0 = 38, PUMP_ROD1 = 52, PUMP_BX = 78, PUMP_FOOT = 212, PUMP_HOSE = [186, 176];
const PUMP_K = 0.62, PUMP_TRAVEL = 24;

// Station-local geometry (design units, scaled by the station scale).
const CHAR_X = -158, PUMP_X = -52, BAL_X = 104, NOZZLE_Y = -150;
const PS = 1.4;                 // pump size multiplier
const R_MIN = 26, R_MAX = 172;

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.solo = this.n === 1;
    this.t = 0;
    this.layout();
    this.round = 1;
    this.phase = 'play';       // play | pop | between
    this.phaseT = 0;
    this.finalRound = false;
    this.finished = false;
    this.lastWinner = -1;
    this.bgPuffs = Array.from({ length: 14 }, (_, i) => ({
      x: (i * 197 + 60) % W, y: 160 + ((i * 331) % 760), r: 26 + (i * 13) % 24, c: ['#ffb3d9', '#ffe08a', '#b8e8ff', '#c9b6ff', '#b6f0c8'][i % 5], ph: i * 1.3,
    }));
    this.st = this.players.map((p, i) => {
      const s = this.slot[i];
      const a = new Actor(p.charId, { scale: s.sc, x: s.cx + CHAR_X * s.sc, y: s.by });
      // characters are drawn bigger than the station (groups a bit smaller so they fit the cell)
      const base = a.width / a.scale;
      const chMul = clamp(this.rows === 1 ? 1.55 : 1.2, 0.8, Math.max(0.8, (this.rows === 1 ? 215 : 235) / base));
      a.scale = s.sc * chMul; a.snap();
      s.chMul = chMul;
      return {
        p, i, a, s,
        size: 0, shownSize: 0, press: 0, pump: 0, gauge: 0, gaugeShown: 0,
        sq: 0, sqv: 0,           // balloon squash spring
        wins: 0, lastSize: 0,
        popped: false, appear: 1, deflating: false,
        sputter: 0, puffCd: 0, redT: 0, dangerCd: 0, starPop: 0, ringFlash: 0,
        ai: { next: rand(0.2, 0.7), nextPanic: rand(2, 4.5), panicUntil: 0, paused: false },
        timeLeft: SOLO_TIME, popTime: 0,
      };
    });
    this.hint = 5;
    this.tick = 0;
    this.resultText = null;
  }

  // ---- layout -------------------------------------------------------------
  layout() {
    const n = this.n;
    const rows = n <= 4 ? 1 : 2;
    const perRow = rows === 1 ? n : Math.ceil(n / 2);
    const colsMax = rows === 1 ? Math.max(n, 3) : perRow;
    const cw = Math.min(560, (W - 80) / colsMax);
    const sc = rows === 1 ? Math.min(1.25, cw / 480) : 0.68;
    this.slot = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const count = r === 0 ? perRow : n - perRow;
      const by = rows === 1 ? 925 : (r === 0 ? 560 : 985);
      for (let c = 0; c < count; c++) {
        const cx = W / 2 + (c - (count - 1) / 2) * cw;
        this.slot[idx++] = { cx, by, sc, row: r };
      }
    }
    this.rows = rows;
  }

  // ---- helpers ------------------------------------------------------------
  balloonR(st) { return lerp(R_MIN, R_MAX, clamp(st.shownSize, 0, 1.02)) * (st.appear < 1 ? ease.outBack(st.appear) : 1); }
  balloonPos(st) {
    const s = st.s, r = this.balloonR(st);
    return { x: s.cx + BAL_X * s.sc, y: s.by + (NOZZLE_Y - r * 1.0) * s.sc, r: r * s.sc };
  }
  nozzlePos(st) { const s = st.s; return { x: s.cx + BAL_X * s.sc, y: s.by + NOZZLE_Y * s.sc }; }
  hosePos(st) { const s = st.s; return { x: s.cx + (PUMP_X + 18 * PS) * s.sc, y: s.by - 44 * PS * s.sc }; }

  // ---- AI -----------------------------------------------------------------
  aiInput(st, dt) {
    const p = st.p, prof = aiProfile(p), ai = st.ai, lvl = p.aiLevel ?? 0;
    let rate = prof.mashRate * (lvl === 0 ? 0.8 : 1);
    const maxRival = Math.max(...this.st.filter((o) => o !== st).map((o) => o.size), 0);
    if (lvl === 0) {
      // Easy: steady-ish, but panics (mashes way too fast) now and then or when a rival pulls ahead.
      if (this.t > ai.nextPanic || (maxRival > st.size + 0.2 && chance(dt * 0.8))) {
        if (this.t > ai.panicUntil) { ai.panicUntil = this.t + rand(0.9, 1.7); ai.nextPanic = this.t + rand(3, 6); }
      }
      if (this.t < ai.panicUntil) rate *= 1.9;
    } else {
      const stop = lvl === 1 ? 0.78 : 0.76, resume = lvl === 1 ? 0.68 : 0.7;
      if (ai.paused) { if (st.gauge < resume) ai.paused = false; else return; }
      if (st.gauge > stop) { ai.paused = true; return; }
    }
    ai.next -= dt;
    if (ai.next <= 0) { p.ctrl.press('a'); ai.next = 1 / (rate * rand(0.85, 1.15)); }
  }

  // ---- gameplay -----------------------------------------------------------
  pumpPress(st) {
    const s = st.s;
    st.press++;
    st.pump = 1;
    st.sqv += 4.5;
    st.gauge = Math.min(1, st.gauge + PRESS);
    st.a.playOnce('action', 0.11);
    st.a.squash(0.12);
    if (st.gauge > RED) {
      // Too fast: the hose sputters and the air is wasted.
      st.sputter = 0.35;
      if (st.puffCd <= 0) {
        st.puffCd = 0.12;
        const h = this.hosePos(st);
        particles.burst(h.x + 10, h.y - 8, { type: 'smoke', count: 3, angle: -1.2, spread: 1.0, speed: [60, 160], size: [14, 26] });
        if (chance(0.45)) particles.popText(h.x + rand(-20, 30), h.y - 50 * s.sc, pick(['pfft!', 'pffft!', 'psst!', 'blrrt!']), '#ff8fa8', 38 * clamp(s.sc, 0.8, 1.2));
        sfx('whoosh', { vol: 0.5 });
      }
      st.a.emote('sweat', 0.6);
    } else {
      sfx('pump');
      st.sputter = Math.max(0, st.sputter - 0.1);
      if (chance(0.25)) {
        const nz = this.nozzlePos(st);
        particles.burst(nz.x, nz.y - 6, { type: 'dust', count: 2, speed: [20, 60], size: [6, 10] });
      }
    }
  }

  update(dt) {
    this.t += dt;
    this.hint = Math.max(0, this.hint - dt);
    this.phaseT += dt;
    this.tickAll(dt);
    if (this.phase === 'play') this.playPhase(dt);
    else if (this.phase === 'pop') this.popPhase(dt);
    else if (this.phase === 'between') this.betweenPhase(dt);
  }

  postUpdate(dt) { this.t += dt; this.tickAll(dt); if (this.phase === 'pop') this.popPhase(dt, true); }
  preUpdate(dt) { this.t += dt; this.tickAll(dt); }

  /** Per-frame animation shared by every phase. */
  tickAll(dt) {
    for (const st of this.st) {
      st.a.update(dt);
      st.pump = Math.max(0, st.pump - dt * 9);
      st.puffCd -= dt;
      st.sputter = Math.max(0, st.sputter - dt);
      st.starPop = Math.max(0, st.starPop - dt);
      st.ringFlash = Math.max(0, st.ringFlash - dt);
      // balloon squash spring
      st.sqv += (-st.sq * 220 - st.sqv * 14) * dt; st.sq += st.sqv * dt;
      st.shownSize = damp(st.shownSize, st.size, 18, dt);
      st.gaugeShown = damp(st.gaugeShown, st.gauge, 22, dt);
      if (st.appear < 1) st.appear = Math.min(1, st.appear + dt * 2.2);
    }
  }

  playPhase(dt) {
    let leader = 0;
    for (const st of this.st) {
      if (st.popped) continue;
      if (st.p.isAI) this.aiInput(st, dt);
      if (st.p.ctrl.pressed('a')) this.pumpPress(st);
      // pressure bleeds off and flows into the balloon
      st.gauge *= Math.exp(-DECAY * dt);
      const flow = FLOW * Math.pow(st.gauge, 1.4) * flowEff(st.gauge);
      st.size += flow * dt;
      st.redT = st.gauge > RED ? st.redT + dt : 0;
      st.popTime += dt;
      leader = Math.max(leader, st.size);
      for (const mark of [0.5, 0.75, 0.9]) if (st.size >= mark && (st.stretchMark || 0) < mark) { st.stretchMark = mark; sfx('balloon-stretch'); }
      if (this.solo) st.timeLeft -= dt;
      // characters get nervous when the balloon is big
      if (st.size > 0.82 && st.a.emotes.every((e) => e.kind !== 'exclaim') && chance(dt * 1.2)) st.a.emote('sweat', 0.7);
    }
    // tension ticking when anyone is close to popping
    if (leader > 0.8) {
      this.tick -= dt;
      if (this.tick <= 0) { sfx(leader > 0.92 ? 'tick' : 'tock'); this.tick = lerp(0.28, 0.1, clamp((leader - 0.8) / 0.2, 0, 1)); }
    }
    // pop?
    const poppers = this.st.filter((st) => st.size >= 1);
    if (poppers.length) {
      poppers.sort((a, b) => b.size - a.size);
      this.popRound(poppers[0]);
      return;
    }
    if (this.solo && this.st[0].timeLeft <= 0) this.popRound(null);
  }

  popRound(winner) {
    this.phase = 'pop'; this.phaseT = 0;
    this.winner = winner;
    for (const st of this.st) st.lastSize = Math.min(1, st.size);
    if (winner) {
      winner.wins++; winner.starPop = 1.2; winner.popped = true;
      this.lastWinner = winner.i;
      const b = this.balloonPos(winner);
      const col = winner.p.color;
      fx.shake(16, 0.35); fx.flash(col, 0.22); fx.hitstop(0.07);
      sfx('bigpop'); setTimeout(() => sfx('fanfare'), 220);
      particles.burst(b.x, b.y, { type: 'confetti', count: 70, colors: [col, '#ffffff', '#ffd23f', col], speed: [300, 900] });
      particles.burst(b.x, b.y, { type: 'shard', count: 14, colors: [col], speed: [250, 650], size: [10, 20] });
      particles.burst(b.x, b.y, { type: 'star', count: 10, colors: ['#ffd23f', '#ffffff'] });
      particles.ring(b.x, b.y, '#ffffff', b.r * 2.2, 0.5);
      particles.ring(b.x, b.y, col, b.r * 3, 0.7);
      if (this.api.camera) this.api.camera.punch(b.x, b.y, this.n > 4 ? 1.18 : 1.25, 0.5);
      particles.popText(b.x, b.y - b.r * 0.3, 'POP!', '#ffd23f', clamp(100 * winner.s.sc, 64, 120));
      winner.a.setPose('celebrate');
      winner.a.squash(0.4);
      winner.a.say('Yay!', 1.6, 'yay');
      for (const st of this.st) if (st !== winner) {
        st.a.playOnce('surprised', 1.0, 'idle');
        st.a.emote('exclaim', 0.9);
        st.ringFlash = 0;
      }
      // is the match decided?
      this.finalRound = this.solo ? this.round >= ROUNDS : (winner.wins >= WINS_NEEDED || this.round >= ROUNDS);
    } else {
      this.resultText = 'Too slow!';
      sfx('aww');
      this.finalRound = this.round >= ROUNDS;
    }
  }

  popPhase(dt, post = false) {
    // After ~1s the unpopped balloons deflate with a sad raspberry.
    if (this.phaseT > 0.9) {
      for (const st of this.st) {
        if (st.popped) continue;
        if (!st.deflating) { st.deflating = true; st.a.clearEmotes(); sfx('shrink'); }
        st.size = Math.max(0, st.size - dt * 1.3);
        st.gauge *= Math.exp(-4 * dt);
        if (chance(dt * 14)) { const nz = this.nozzlePos(st); particles.burst(nz.x, nz.y - 20, { type: 'dust', count: 1, speed: [40, 90] }); }
      }
    }
    if (post) return;
    if (this.phaseT > (this.finalRound ? 1.5 : 2.0)) {
      if (this.finalRound) { this.finishMatch(); return; }
      this.startBetween();
    }
  }

  startBetween() {
    this.phase = 'between'; this.phaseT = 0;
    this.round++;
    this.resultText = null;
    for (const st of this.st) {
      st.size = 0; st.shownSize = 0; st.gauge = 0; st.gaugeShown = 0; st.popped = false; st.deflating = false;
      st.appear = 0; st.stretchMark = 0; st.timeLeft = SOLO_TIME; st.sputter = 0; st.popTime = 0;
      st.a.setPose('idle'); st.a.clearEmotes();
      st.ai.paused = false; st.ai.nextPanic = this.t + rand(2, 4.5); st.ai.panicUntil = 0; st.ai.next = rand(0.2, 0.6);
    }
    sfx('swap');
    host(this.round >= ROUNDS ? 'final-round' : 'next-round');
  }

  betweenPhase() {
    if (this.phaseT > 1.3) {
      this.phase = 'play'; this.phaseT = 0; this.hint = 0;
      sfx('whistle');
      for (const st of this.st) { const nz = this.balloonPos(st); particles.burst(nz.x, nz.y, { type: 'sparkle', count: 5, colors: ['#ffffff', st.p.color] }); }
    }
  }

  finishMatch() {
    if (this.finished) return;
    this.finished = true;
    const scores = this.st.map((st) => st.wins + st.lastSize * 0.9);
    const placements = this.solo ? [1] : placementsFromScores(scores);
    const stats = this.st.map((st) => (this.solo ? `${st.wins} of ${ROUNDS} popped` : `${st.wins} round win${st.wins === 1 ? '' : 's'}`));
    const w = this.lastWinner >= 0 ? this.st[this.lastWinner] : null;
    const focus = w ? { x: w.a.x, y: w.a.y - 80 } : undefined;
    this.api.finish({ placements, stats, focus });
  }

  // ---- drawing ------------------------------------------------------------
  drawBackground(g) {
    const bg = art('bg/balloon-pump');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    // wall: pastel stripes
    ui.sky(g, '#ffd0ea', '#ffe9f4');
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = -40; x < W; x += 160) g.fillRect(x, 0, 80, H);
    g.restore();
    // polka dots
    g.fillStyle = 'rgba(255,160,210,0.25)';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 263) % W, (i * 151) % 700, 14 + (i % 3) * 6, 0, TAU); g.fill(); }
    // floating decorative balloons
    for (const b of this.bgPuffs) {
      const y = b.y + Math.sin(this.t * 0.9 + b.ph) * 14, x = b.x + Math.sin(this.t * 0.5 + b.ph) * 10;
      g.save(); g.globalAlpha = 0.55;
      g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + b.r); g.quadraticCurveTo(x + 14, y + b.r + 40, x - 4, y + b.r + 84); g.stroke();
      drawBalloonShape(g, x, y, b.r, b.c, 3);
      g.restore();
    }
    // bunting
    for (let k = 0; k < 2; k++) {
      const y0 = 150 + k * 4;
      const flags = 22;
      for (let i = 0; i < flags; i++) {
        const u = (i + 0.5) / flags, x = u * W;
        const sag = Math.sin(u * Math.PI) * 38 + 8;
        const col = ['#ff6fb1', '#ffd23f', '#5fd1ff', '#8ee59b', '#c49bff'][(i + k * 2) % 5];
        g.fillStyle = col; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x - 24, y0 + sag - 8); g.lineTo(x + 24, y0 + sag - 8); g.lineTo(x, y0 + sag + 40); g.closePath(); g.fill(); g.stroke();
      }
      g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath();
      for (let x = 0; x <= W; x += 40) { const u = x / W, y = y0 + Math.sin(u * Math.PI) * 38; if (x === 0) g.moveTo(x, y - 6); else g.lineTo(x, y - 6); }
      g.stroke();
      if (this.rows === 2) break; // keep the 2-row layout uncluttered
    }
    // counters (one per row)
    for (let r = 0; r < this.rows; r++) {
      const by = this.rows === 1 ? 925 : (r === 0 ? 560 : 985);
      const top = by - 24 * (this.rows === 1 ? 1.2 : 0.68);
      const gr = g.createLinearGradient(0, top, 0, top + 200);
      gr.addColorStop(0, '#fff4cf'); gr.addColorStop(1, '#ffd98a');
      g.fillStyle = gr; g.fillRect(0, top, W, H - top);
      g.fillStyle = '#ffb94d'; g.fillRect(0, top, W, 10);
      g.fillStyle = NAVY; g.globalAlpha = 0.5; g.fillRect(0, top - 3, W, 4); g.globalAlpha = 1;
      if (this.rows === 2 && r === 0) { g.fillStyle = 'rgba(36,22,63,0.12)'; g.fillRect(0, top + 10, W, 8); }
    }
  }

  drawStation(g, st) {
    const s = st.s, p = st.p, sc = s.sc;
    const flashRed = st.gauge > RED;
    g.save();
    g.translate(s.cx, s.by); g.scale(sc, sc);
    // --- mat
    g.fillStyle = 'rgba(36,22,63,0.25)';
    ui.roundRect(g, -214, -6, 436, 52, 22); g.fill();
    ui.roundRect(g, -218, -14, 436, 52, 22);
    g.fillStyle = p.color; g.fill(); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, -204, -8, 408, 12, 6); g.fill();
    // --- stand + nozzle
    g.fillStyle = '#8f9ab8'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.fillRect(BAL_X - 9, NOZZLE_Y + 8, 18, -NOZZLE_Y - 22); g.strokeRect(BAL_X - 9, NOZZLE_Y + 8, 18, -NOZZLE_Y - 22);
    g.beginPath(); g.moveTo(BAL_X - 20, NOZZLE_Y + 12); g.lineTo(BAL_X + 20, NOZZLE_Y + 12); g.lineTo(BAL_X + 10, NOZZLE_Y - 4); g.lineTo(BAL_X - 10, NOZZLE_Y - 4); g.closePath();
    g.fillStyle = '#c3cbe0'; g.fill(); g.stroke();
    // --- hose
    const wob = st.sputter > 0 ? Math.sin(this.t * 60) * 14 * Math.min(1, st.sputter * 4) : 0;
    g.lineCap = 'round';
    const pumpImg = art('prop/balloon-pump');
    const pk = PUMP_K * PS;                      // pump art: image px -> station units
    const hx = pumpImg ? PUMP_X + (PUMP_HOSE[0] - PUMP_BX) * pk : PUMP_X + 18 * PS;
    const hy = pumpImg ? -4 * PS - (PUMP_FOOT - PUMP_HOSE[1]) * pk : -44 * PS;
    for (const [lw, col] of [[16, NAVY], [9, flashRed ? '#ff8fa8' : pumpImg ? '#2f8ff2' : '#6fe3b4']]) {
      g.lineWidth = lw; g.strokeStyle = col; g.beginPath();
      g.moveTo(hx, hy);
      g.bezierCurveTo(PUMP_X + 70, 16 + wob, BAL_X - 50, 20 - wob, BAL_X, NOZZLE_Y + 100);
      g.stroke();
    }
    // --- pump
    if (pumpImg) {
      // handle rides up and down: draw handle, stretched rod, then barrel on top
      const lift = (1 - clamp(st.pump, 0, 1)) * PUMP_TRAVEL;
      const left = PUMP_X - PUMP_BX * pk, foot = -4 * PS, iw = pumpImg.width;
      const yOf = (iy) => foot - (PUMP_FOOT - iy) * pk;
      g.drawImage(pumpImg, 0, 0, iw, PUMP_ROD0, left, yOf(0) - lift * pk, iw * pk, PUMP_ROD0 * pk);
      g.drawImage(pumpImg, 0, PUMP_ROD0, iw, PUMP_ROD1 - PUMP_ROD0, left, yOf(PUMP_ROD0) - lift * pk - 0.5, iw * pk, (PUMP_ROD1 - PUMP_ROD0 + lift) * pk + 1);
      g.drawImage(pumpImg, 0, PUMP_ROD1, iw, pumpImg.height - PUMP_ROD1, left, yOf(PUMP_ROD1), iw * pk, (pumpImg.height - PUMP_ROD1) * pk);
    } else {
    g.save(); g.translate(PUMP_X, 0); g.scale(PS, PS); g.translate(-PUMP_X, 0);
    const hdl = st.pump * 34;
    g.fillStyle = '#7b86a8'; g.strokeStyle = NAVY; g.lineWidth = 5;
    ui.roundRect(g, PUMP_X - 38, -26, 76, 24, 8); g.fill(); g.stroke();
    // piston rod + T handle
    g.fillStyle = '#d7dcee';
    g.fillRect(PUMP_X - 6, -128 + hdl, 12, 70); g.strokeRect(PUMP_X - 6, -128 + hdl, 12, 70);
    // barrel
    const gr = g.createLinearGradient(PUMP_X - 22, 0, PUMP_X + 22, 0);
    gr.addColorStop(0, '#9aa5c4'); gr.addColorStop(0.4, '#eef1fb'); gr.addColorStop(1, '#8590b0');
    ui.roundRect(g, PUMP_X - 22, -92, 44, 70, 8); g.fillStyle = gr; g.fill(); g.stroke();
    g.fillStyle = p.color; g.fillRect(PUMP_X - 22, -60, 44, 10); g.strokeRect(PUMP_X - 22, -60, 44, 10);
    ui.roundRect(g, PUMP_X - 44, -150 + hdl, 88, 24, 12); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
    g.restore();
    }
    g.restore();

    // --- balloon
    this.drawBalloon(g, st);

    // --- character
    const a = st.a;
    a.x = s.cx + CHAR_X * sc; a.y = s.by + 6 * sc;
    a.scale = sc * (st.s.chMul || 1);
    // keep trailing group members (Fellowfox, KPop girls) on screen at the left edge
    const lo = Math.min(...a.members.map((m) => m.def.dx * a.facing * a.scale - a._memberSize(m).w * a.scale * 0.55));
    a.x = Math.max(a.x, 26 - lo);
    a.draw(g, { ring: p.color });

    // --- front stuff in station space
    g.save();
    g.translate(s.cx, s.by); g.scale(sc, sc);
    this.drawGauge(g, st, flashRed);
    // round-win stars
    for (let i = 0; i < WINS_NEEDED; i++) {
      const x = -176 + i * 46, y = 78;
      const got = i < st.wins;
      g.save(); g.translate(x, y);
      if (got && i === st.wins - 1 && st.starPop > 0) { const k = 1 + st.starPop * 0.8 * Math.abs(Math.sin(st.starPop * 12)); g.scale(k, k); g.rotate(st.starPop * 3); }
      if (this.solo) { /* same */ }
      g.globalAlpha = got ? 1 : 0.35;
      ui.stars(g, 1, 0, 0, 20, { color: got ? '#ffd23f' : '#ffffff' });
      g.restore();
    }
    g.restore();
    // tag
    const head = a.anchor('head');
    ui.playerTag(g, p, head.x, head.y - 36 * clamp(sc, 0.8, 1.2) - (a.emotes.length ? 40 : 0));
  }

  drawBalloon(g, st) {
    if (st.popped || st.appear <= 0) return;
    const p = st.p, sc = st.s.sc;
    const b = this.balloonPos(st);
    const size = st.shownSize;
    const squash = clamp(st.sq, -0.5, 0.6);
    const tremble = size > 0.78 ? (size - 0.78) / 0.22 : 0;
    const jx = tremble * rand(-1, 1) * 7 * sc, jy = tremble * rand(-1, 1) * 5 * sc;
    const sway = Math.sin(this.t * 5 + st.i) * (0.025 + size * 0.04) + (st.deflating ? Math.sin(this.t * 30) * 0.15 : 0);
    g.save();
    g.translate(b.x + jx, b.y + b.r + jy);       // pivot at the knot
    g.rotate(sway);
    g.scale(1 + squash * 0.35, 1 - squash * 0.28);
    g.translate(0, -b.r);
    // soft shadow-ish glow when about to pop
    if (tremble > 0) {
      g.save(); g.globalAlpha = 0.25 * (0.5 + 0.5 * Math.sin(this.t * 25));
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, b.r * 1.25, 0, TAU); g.fill(); g.restore();
    }
    // paler (stretched) as it gets close to popping
    const bImg = balloonArt(p);
    if (bImg) {
      // art: knot bottom at the nozzle (+1.12 r), 2.4 r tall (body ~1.8 r wide)
      const m = artInfo(bImg);
      const dh = b.r * 2.4, dw = dh * m.w / m.h, dy = b.r * 1.12 - dh;
      g.drawImage(bImg, m.x, m.y, m.w, m.h, -dw / 2, dy, dw, dh);
      if (m.white && tremble > 0) {
        g.save(); g.globalAlpha = tremble * 0.35;
        g.drawImage(m.white, m.x, m.y, m.w, m.h, -dw / 2, dy, dw, dh); g.restore();
      }
    } else {
    drawBalloonShape(g, 0, 0, b.r, p.color, 5 * sc);
    g.save(); g.globalAlpha = 0.18 + tremble * 0.4; g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(0, 0, b.r * 0.92, b.r * 1.0, 0, 0, TAU); g.fill(); g.restore();
    // glossy highlight
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.beginPath(); g.ellipse(-b.r * 0.42, -b.r * 0.46, b.r * 0.14, b.r * 0.27, -0.55, 0, TAU); g.fill();
    g.beginPath(); g.arc(-b.r * 0.2, -b.r * 0.82, b.r * 0.05, 0, TAU); g.fill();
    }
    // worried face when it's big
    if (size > 0.45 && b.r > 20) {
      const worry = clamp((size - 0.45) / 0.55, 0, 1);
      const ey = -b.r * 0.1, ex = b.r * 0.26, er = b.r * (0.1 + worry * 0.05);
      g.fillStyle = '#fff'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, 3 * sc);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(ex * sx, ey, er, er * 1.25, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = NAVY; g.beginPath(); g.arc(ex * sx + (st.gauge > RED ? Math.sin(this.t * 20) * er * 0.3 : 0), ey + er * 0.2, er * (0.55 - worry * 0.2), 0, TAU); g.fill();
        g.fillStyle = '#fff';
      }
      g.strokeStyle = NAVY; g.lineWidth = Math.max(2.5, 4 * sc); g.lineCap = 'round';
      g.beginPath();
      const my = b.r * 0.42, mw = b.r * (0.14 + worry * 0.08);
      if (worry > 0.55) { g.ellipse(0, my, mw * 0.8, mw * 0.55 + worry * 3, 0, 0, TAU); g.fillStyle = '#7a2740'; g.fill(); }
      else { g.moveTo(-mw, my + 3); g.quadraticCurveTo(0, my - 8, mw, my + 3); }
      g.stroke();
      // eyebrows
      g.beginPath();
      g.moveTo(-ex - er, ey - er * 1.9 + worry * 4); g.lineTo(-ex + er * 0.8, ey - er * 2.3 - worry * 4);
      g.moveTo(ex + er, ey - er * 1.9 + worry * 4); g.lineTo(ex - er * 0.8, ey - er * 2.3 - worry * 4);
      g.stroke();
    }
    g.restore();
  }

  drawGauge(g, st, flashRed) {
    const x0 = -66, y0 = 56, w = 282, h = 34;
    g.save();
    if (flashRed) g.translate(Math.sin(this.t * 70) * 3, 0);
    // zones
    const zones = [[0, SWEET, '#8fd3ff'], [SWEET, RED, '#5ddc6a'], [RED, 1, '#ff4d6d']];
    ui.roundRect(g, x0 - 5, y0 - 5, w + 10, h + 10, 14); g.fillStyle = '#ffffff'; g.fill();
    g.save();
    ui.roundRect(g, x0, y0, w, h, 10); g.clip();
    for (const [a, b, c] of zones) {
      g.globalAlpha = 0.4; g.fillStyle = c; g.fillRect(x0 + a * w, y0, (b - a) * w, h);
      const fillEnd = clamp(st.gaugeShown, a, b);
      if (fillEnd > a) { g.globalAlpha = 1; g.fillRect(x0 + a * w, y0, (fillEnd - a) * w, h); }
    }
    g.globalAlpha = 1;
    // zone ticks
    g.fillStyle = NAVY;
    g.fillRect(x0 + SWEET * w - 1.5, y0, 3, h); g.fillRect(x0 + RED * w - 2, y0, 4, h);
    g.restore();
    ui.roundRect(g, x0 - 5, y0 - 5, w + 10, h + 10, 14); g.lineWidth = 5; g.strokeStyle = flashRed && Math.sin(this.t * 30) > 0 ? '#ff4d6d' : NAVY; g.stroke();
    // needle
    const nx = x0 + clamp(st.gaugeShown, 0, 1) * w;
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.moveTo(nx, y0 + h + 2); g.lineTo(nx - 11, y0 + h + 20); g.lineTo(nx + 11, y0 + h + 20); g.closePath(); g.fill(); g.stroke();
    if (flashRed) {
      const k = 1 + Math.sin(this.t * 24) * 0.08;
      g.translate(x0 + w * 0.5, y0 - 26); g.scale(k, k);
      ui.text(g, 'TOO FAST!', 0, 0, { size: 32, color: '#ff4d6d', strokeWidth: 7 });
    }
    g.restore();
  }

  draw(g) {
    this.drawBackground(g);
    const order = this.st.slice().sort((a, b) => a.s.row - b.s.row || a.s.cx - b.s.cx);
    for (const st of order) this.drawStation(g, st);
  }

  drawHUD(g) {
    const wins = this.st.map((st) => st.wins);
    ui.scoreboard(g, this.players, wins, {
      y: 36,
      format: (v) => (this.solo ? `${v} / ${ROUNDS}` : `${v} win${v === 1 ? '' : 's'}`),
      highlight: this.st.map((st) => this.phase === 'pop' && this.winner === st),
      expr: this.st.map((st) => (this.phase === 'pop' && this.winner === st ? 'happy' : 'neutral')),
    });
    // round label
    const label = `Round ${Math.min(this.round, ROUNDS)} of ${ROUNDS}`;
    ui.panel(g, W / 2 - 130, 128, 260, 52, { r: 26, fill: '#ffffff', lineWidth: 5 });
    ui.text(g, label, W / 2, 155, { size: 32, color: NAVY, stroke: false, weight: 800 });
    if (this.solo && this.phase === 'play') ui.timer(g, this.st[0].timeLeft, W - 130, 190);
    if (this.hint > 0 && this.phase === 'play') {
      g.save(); g.globalAlpha = clamp(this.hint, 0, 1);
      ui.panel(g, W / 2 - 430, 196, 860, 70, { r: 35, fill: '#fff8ec' });
      ui.glyph(g, 'a', W / 2 - 380, 231, 52, { pulse: true });
      ui.text(g, 'Mash A!  Keep the needle in the green.', W / 2 + 30, 232, { size: 36, color: NAVY, stroke: false, weight: 700 });
      g.restore();
    }
    if (this.phase === 'between') ui.banner(g, `Round ${this.round}!`, this.phaseT, { size: 140, y: 330, color: '#ff6fb1' });
    if (this.phase === 'pop' && this.winner && !this.finalRound && this.phaseT > 0.3) {
      const st = this.winner;
      ui.banner(g, `${charById(st.p.charId)?.name || st.p.tag} ${charById(st.p.charId)?.plural ? 'win' : 'wins'} the round!`, this.phaseT - 0.3, { size: 80, y: 330, color: st.p.color, tilt: -0.02 });
    }
    if (this.phase === 'pop' && !this.winner && this.resultText) ui.banner(g, this.resultText, this.phaseT, { size: 110, y: 330, color: '#ffffff' });
  }
}
