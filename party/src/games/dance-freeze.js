// Dance & Freeze (Molly Party) - musical statues on a disco stage. While
// DJ Professor Hoot's record plays, everyone dances: every stick wiggle is a dance move
// and A is a jump-spin, and dancing earns stars. When the record slows, the
// needle scratches and the lights go icy blue, everyone must FREEZE (hands off
// the controller!) in whatever silly pose they were in - frozen friends frost
// over and earn stars. Anyone who wiggles gets tickled by a giant feather
// (giggles, no one is out) and can freeze again. The last dance is a Disco
// Party with double stars.
//
// Art hooks (procedural fallbacks ship today): bg/dance-freeze, thumb/dance-freeze,
//   prop/df-disco-ball, prop/df-dj-booth, prop/df-feather, prop/df-snowflake, prop/df-music.
// Sound hooks (fallbacks today): df-scratch (cush-scratch), df-freeze, df-tickle, df-spin,
//   df-needle, df-frost, df-perfect, df-party.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound, music } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { reactionTime } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, TAU, placementsFromScores } from '../engine/util.js';
import { Tune } from './dance-freeze/tune.js';
import { NAVY, BOOTH, hallBackground, drawFloor, drawDiscoBall, drawBeams, drawBooth, drawFeather, drawSnowflake, drawNotes } from './dance-freeze/draw.js';
import { meta } from './dance-freeze.meta.js';

const GAME_T = 58;
const TELL = 0.6;           // record slows down before every stop
const GRACE = 0.6;          // time to let go of the controller after the stop
const GROOVE = 0.5;         // seconds of dancing per star
const FROST = 0.6;          // seconds frozen per star
const PERFECT = 3;
const MOVES = { up: 'dance-up', down: 'dance-down', left: 'dance-side', right: 'dance-side' };
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.scale = n <= 4 ? 1.05 : 0.86;
    if (api.camera) api.camera.maxZoom = Math.min(api.camera.maxZoom ?? 1.4, 1.25);
    const rows = n <= 4 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const spots = [];
    rows.forEach((cnt, r) => {
      const y = rows.length === 1 ? 900 : r === 0 ? 780 : 965;
      const span = cnt <= 1 ? 0 : Math.min(1240, cnt * 330);
      for (let k = 0; k < cnt; k++) spots.push({ x: W / 2 + (cnt <= 1 ? 0 : -span / 2 + (span * k) / (cnt - 1)) + (r ? 0 : 0), y });
    });
    // with two rows, offset the back row so nobody hides behind anybody
    if (rows.length === 2 && rows[0] === rows[1]) for (let k = 0; k < rows[0]; k++) spots[k].x -= 110;
    this.units = this.players.map((p, i) => {
      const s = spots[i];
      const a = new Actor(p, { scale: this.scale * (s.y < 850 ? 0.92 : 1), x: s.x, y: s.y });
      a.facing = s.x < W / 2 ? 1 : -1; a.snap();
      return {
        p, i, a, x: s.x, y: s.y, homeX: s.x, z: 0, vz: 0, slide: 0,
        dance: 0, freeze: 0, groove: 0, still: 0, frost: 0, spinCd: 0, spinT: 0,
        state: 'dance', dir: null, idleT: 0, tickleT: 0, tickled: false, featherK: 0, perfects: 0, tickles: 0,
        ai: { dir: null, dirT: 0, dawdle: 0, stopAt: null, wiggleAt: null, wiggleT: 0 },
      };
    });
    this.dj = new Actor('professor-hoot', { x: BOOTH.x, y: BOOTH.y - 80 });
    this.dj.scale = 1; this.dj.scale = 170 / Math.max(1, this.dj.height); this.dj.snap();
    this.tune = new Tune();
    this.phase = 'ready'; this.pt = 0;
    this.danceDur = 5.5; this.freezeDur = 3;
    this.round = 0;
    this.party = false;
    this.spin = 0; this.lightK = 0; this.icy = 0;
    this.banner = null;
    this.finished = false;
    this.bpm = 120;
  }

  // --- helpers -------------------------------------------------------------------------
  active(U) {
    const c = U.p.ctrl;
    if (Math.hypot(c.x, c.y) > 0.3) return true;
    for (const b of ['a', 'b', 'x', 'y']) if (c.held(b) || c.pressed(b)) return true;
    return false;
  }
  showBanner(text, dur, color, icon = null) { this.banner = { text, t: 0, dur, color, icon }; }
  get musicOn() { return this.phase === 'dance' || this.phase === 'tell'; }

  // --- phases ----------------------------------------------------------------------------
  startDance() {
    this.round++;
    this.phase = 'dance'; this.pt = 0;
    this.bpm = Math.min(150, 118 + this.round * 4);
    this.nextFreeze = rand(2.7, 3.6);
    this.danceDur = this.round === 1 ? 5.5 : rand(3.4, 6.2);
    const left = GAME_T - this.t;
    this.lastCycle = left < this.danceDur + TELL + this.nextFreeze + 3 + TELL + 2.7;
    if (this.lastCycle) this.danceDur = Math.max(2.5, left - TELL - this.nextFreeze);
    this.party = this.lastCycle && this.round > 1;
    this.tune.start(this.party ? 150 : this.bpm);
    snd('df-needle', null);
    if (this.round > 1) {
      if (this.party) { this.showBanner('Disco Party!', 1.4, '#ff7ac6', 'notes'); snd('df-party', 'fanfare', { vol: 0.6 }); fx.flash('#ffffff', 0.2); }
      else this.showBanner('DANCE!', 0.9, '#ff7ac6', 'notes');
    }
    for (const U of this.units) {
      U.state = 'dance'; U.a.tint(null); U.frost = 0; U.tickled = false; U.featherK = 0; U.still = 0;
      U.ai.stopAt = null; U.ai.wiggleAt = null;
      U.a.playOnce('cheer', 0.4);
    }
    this.dj.setPose('dance');
  }

  startTell() {
    this.phase = 'tell'; this.pt = 0;
    this.tune.tell(TELL);
    this.dj.playOnce('point', TELL, 'idle');
  }

  startFreeze() {
    this.phase = 'freeze'; this.pt = 0;
    this.freezeDur = this.nextFreeze;
    this.tune.stop('df-scratch');
    snd('df-freeze', 'whistle', { vol: 0.5 });
    this.showBanner('FREEZE!', 1.1, '#8fdcff', 'snow');
    fx.flash('#bfe9ff', 0.25); fx.shake(8, 0.25);
    if (this.api.camera) this.api.camera.punch(W / 2, 760, 1.06, 0.8);
    this.dj.playOnce('surprised', 0.4, 'idle');
    particles.burst(W / 2, 250, { type: 'sparkle', count: 30, colors: ['#bfe9ff', '#ffffff', '#8fdcff'], speed: [200, 600] });
    for (const U of this.units) {
      if (!U.p.isAI) U.p.ctrl.rumble(0.5, 160);
      const lvl = clamp(U.p.aiLevel ?? 0, 0, 2);
      U.ai.stopAt = this.pt + reactionTime(U.p) * [0.85, 0.75, 0.6][lvl];
      U.ai.wiggleAt = chance([0.3, 0.15, 0.06][lvl]) ? rand(GRACE + 0.4, this.freezeDur - 0.5) : null;
    }
  }

  endFreeze() {
    for (const U of this.units) {
      if (!U.tickled) {
        U.freeze += PERFECT; U.perfects++;
        particles.popText(U.x, U.y - U.a.height - 80, `Perfect! +${PERFECT}`, '#ffd23f', 50);
        particles.burst(U.x, U.y - U.a.height * 0.6, { type: 'star', count: 12, colors: ['#ffd23f', '#ffffff', '#8fdcff'], speed: [150, 420] });
        particles.burst(U.x, U.y - U.a.height * 0.5, { type: 'shard', count: 10, colors: ['#bfe9ff', '#ffffff'], speed: [150, 380] });
      }
    }
    if (this.units.some((U) => !U.tickled)) snd('df-perfect', 'star');
    if (this.lastCycle) { this.endGame(); return; }
    this.startDance();
  }

  endGame() {
    this.phase = 'end'; this.pt = 0;
    for (const U of this.units) { U.state = 'dance'; U.a.tint(null); U.a.setPose('celebrate'); U.a.update(0); }
    this.dj.setPose('celebrate');
    particles.confettiRain(W, 120);
    sfx('win'); sfx('cheer');
    fx.slowmo(0.5, 0.5);
    this.showBanner('Great dancing!', 1.6, '#ffd23f');
    if (this.api.camera) this.api.camera.punch(W / 2, 800, 1.1, 1);
  }

  finishNow() {
    if (this.finished) return;
    this.finished = true;
    const scores = this.units.map((U) => U.dance + U.freeze);
    this.api.finish({
      placements: placementsFromScores(scores),
      stats: this.units.map((U) => `Dance ${U.dance} · Freeze ${U.freeze}`),
      focus: { x: W / 2, y: 820, zoom: 1.1 },
    });
  }

  // --- frame -------------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    if (!this.stoppedHostMusic) { this.stoppedHostMusic = true; if (music.name) music.stop(0.1); }
    for (const U of this.units) { U.a.setPose(U.i % 2 ? 'wave' : 'ready'); U.a.update(dt); }
    this.dj.setPose('wave'); this.dj.update(dt);
  }

  update(dt) {
    this.t += dt; this.pt += dt;
    if (!this.stoppedHostMusic) { this.stoppedHostMusic = true; if (music.name) music.stop(0.1); }
    if (this.phase === 'ready') this.startDance();
    this.tune.update(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    switch (this.phase) {
      case 'dance': if (this.pt >= this.danceDur) this.startTell(); break;
      case 'tell': if (this.pt >= TELL) this.startFreeze(); break;
      case 'freeze': if (this.pt >= this.freezeDur) this.endFreeze(); break;
      case 'end': if (this.pt >= 1.6) this.finishNow(); break;
      default: break;
    }
    this.spin += dt * (this.musicOn ? 2.2 * this.tune.rate : 0);
    this.lightK = damp(this.lightK, this.musicOn ? 1 : 0, this.musicOn ? 4 : 10, dt);
    this.icy = damp(this.icy, this.phase === 'freeze' ? 1 : 0, this.phase === 'freeze' ? 10 : 5, dt);
    if (this.musicOn && Math.floor(this.tune.beat) !== this.lastBeat) {
      this.lastBeat = Math.floor(this.tune.beat);
      particles.burst(BOOTH.x + rand(-200, 200), BOOTH.y - 170, { type: 'note', count: 1, colors: RAINBOW, speed: [80, 180], angle: -Math.PI / 2, spread: 0.7 });
    }
    if (this.phase === 'freeze' && chance(dt * 18)) particles.burst(rand(0, W), -10, { type: 'sparkle', count: 1, colors: ['#ffffff', '#bfe9ff'], speed: [60, 140], angle: Math.PI / 2, spread: 0.3, life: [1.5, 2.5] });
    for (const U of this.units) {
      if (U.p.isAI) this.ai(U, dt);
      this.control(U, dt);
    }
    this.dj.update(dt);
  }

  postUpdate(dt) {
    this.t += dt * 0.5;
    this.tune.update(dt);
    if (this.banner) this.banner.t += dt;
    for (const U of this.units) this.animate(U, dt, true);
    this.dj.update(dt);
  }

  destroy() { this.tune.destroy(); }

  control(U, dt) {
    const p = U.p, a = U.a;
    U.spinCd = Math.max(0, U.spinCd - dt);
    const act = this.active(U);
    if (this.phase === 'end') { this.animate(U, dt, true); return; }
    if (this.musicOn) this.danceInput(U, dt, act);
    else if (this.phase === 'freeze') this.freezeInput(U, dt, act);
    this.animate(U, dt, U.state !== 'frozen');
  }

  danceInput(U, dt, act) {
    const c = U.p.ctrl, a = U.a;
    const mag = Math.hypot(c.x, c.y);
    let dir = null;
    if (mag > 0.4) dir = Math.abs(c.x) > Math.abs(c.y) ? (c.x > 0 ? 'right' : 'left') : (c.y > 0 ? 'down' : 'up');
    if (dir && dir !== U.dir) {
      a.playOnce(MOVES[dir], 0.42, 'dance'); a.squash(0.25);
      if (dir === 'left' || dir === 'right') a.facing = dir === 'right' ? 1 : -1;
      particles.burst(U.x, U.y - a.height * 0.7, { type: 'note', count: 2, colors: [U.p.color, '#ffffff'], speed: [80, 200] });
      if (!U.p.isAI) sfx('note', { midi: { up: 79, down: 67, left: 72, right: 76 }[dir], vol: 0.3 });
    }
    U.dir = dir;
    U.slide = damp(U.slide, (mag > 0.3 ? c.x : 0) * 70, 8, dt);
    if (c.pressed('a') && U.spinCd <= 0 && U.z <= 0) {
      U.spinCd = 0.45; U.vz = 820; U.spinT = 0.5;
      a.playOnce('dance-star', 0.5, 'dance'); a.squash(0.35);
      particles.burst(U.x, U.y - a.height * 0.5, { type: 'star', count: 10, colors: [U.p.color, '#ffd23f', '#ffffff'], speed: [150, 380] });
      particles.ring(U.x, U.y - 10, U.p.color, 120, 0.35);
      snd('df-spin', 'whoosh', { vol: 0.5 });
      this.addDance(U, 1);
    }
    if (act) {
      U.idleT = 0;
      if (!a._once) a.setPose('dance');
      U.groove += dt;
      if (U.groove >= GROOVE) { U.groove -= GROOVE; this.addDance(U, 1); }
    } else {
      U.idleT += dt;
      if (!a._once) a.setPose('idle');
    }
  }

  addDance(U, n) {
    const k = this.party ? n * 2 : n;
    U.dance += k;
    particles.popText(U.x + rand(-30, 30), U.y - U.a.height - 40, `+${k}`, this.party ? '#ff7ac6' : '#ffd23f', this.party ? 44 : 36);
    if (!U.p.isAI) sfx('collect', { step: U.dance % 8, vol: 0.25 });
  }

  freezeInput(U, dt, act) {
    const a = U.a;
    if (this.pt < GRACE) {
      // still settling: last wiggles become the freeze pose
      U.slide = damp(U.slide, 0, 4, dt);
      return;
    }
    if (U.state === 'dance') {
      if (act) this.tickle(U);
      else this.freezeUnit(U);
      return;
    }
    if (U.state === 'frozen') {
      if (act) { this.tickle(U); return; }
      U.frost = Math.min(1, U.frost + dt * 2.5);
      a.tint('#a8e4ff', 0.45 * U.frost);
      U.still += dt;
      if (U.still >= FROST) {
        U.still -= FROST; U.freeze += 1;
        particles.popText(U.x + rand(-30, 30), U.y - a.height - 40, '+1', '#8fdcff', 38);
        particles.burst(U.x + rand(-40, 40), U.y - a.height * rand(0.2, 0.9), { type: 'sparkle', count: 3, colors: ['#ffffff', '#bfe9ff'], speed: [30, 90] });
        if (!U.p.isAI) sfx('collect', { step: (U.freeze % 6) + 2, vol: 0.2 });
      }
    } else if (U.state === 'tickled') {
      U.tickleT -= dt;
      U.featherK = Math.min(1, U.featherK + dt * 5);
      if (chance(dt * 10)) particles.burst(U.x + rand(-40, 40), U.y - a.height * 0.9, { type: 'petal', count: 1, colors: ['#ff9ad0', '#b98bff'], speed: [40, 120] });
      if (U.tickleT <= 0) {
        if (act) U.tickleT = 0.4;
        else { this.freezeUnit(U); }
      }
    }
  }

  freezeUnit(U) {
    const a = U.a;
    U.state = 'frozen'; U.still = 0; U.featherK = 0;
    // a plain standing pose becomes a funny statue pose
    if (['idle', 'walk', 'wave', 'ready'].includes(a.pose) && !a._once) {
      a.playOnce(pick(['strike3', 'balance', 'dance-up', 'dance-side', 'pose-twirl']), 1.2, 'idle');
      a.update(0.22);
    }
    snd('df-frost', 'sparkle', { vol: 0.3 });
    particles.burst(U.x, U.y - a.height * 0.5, { type: 'sparkle', count: 8, colors: ['#ffffff', '#bfe9ff'], speed: [60, 200] });
  }

  tickle(U) {
    const a = U.a;
    U.state = 'tickled'; U.tickleT = 1.0; U.tickled = true; U.tickles++; U.frost = 0; U.still = 0;
    a.tint(null); a.playOnce('surprised', 0.25, 'giggle'); a.squash(0.35);
    voice(U.p.charId, 'laugh');
    snd('df-tickle', 'giggle', { vol: 0.7 });
    particles.popText(U.x, U.y - a.height - 90, 'Hee hee!', '#ff7ac6', 48);
    particles.burst(U.x, U.y - a.height, { type: 'petal', count: 10, colors: ['#ff9ad0', '#b98bff', '#ffffff'], speed: [80, 260] });
    if (!U.p.isAI) U.p.ctrl.rumble(0.4, 200);
    this.dj.playOnce('laugh', 0.8, 'idle');
  }

  animate(U, dt, live) {
    const a = U.a;
    if (U.z > 0 || U.vz > 0) { U.vz -= 2800 * dt; U.z += U.vz * dt; if (U.z <= 0) { U.z = 0; U.vz = 0; if (live) a.squash(0.3); } }
    if (U.spinT > 0) { U.spinT -= dt; a.facing = Math.sin(U.spinT * 40) > 0 ? 1 : -1; }
    a.x = U.homeX + U.slide; a.y = U.y; a.z = U.z;
    U.x = a.x;
    if (live) a.update(dt);
  }

  // --- CPU ---------------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, A = U.ai, lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const dance = () => {
      A.dirT -= dt;
      if (A.dirT <= 0) { A.dirT = rand(0.25, 0.6); const a = rand(TAU); A.dir = [Math.cos(a), Math.sin(a)]; }
      p.ctrl.move(A.dir[0], A.dir[1]);
      if (chance(dt * 0.9)) p.ctrl.press('a');
    };
    if (this.musicOn) {
      if (A.dawdle > 0) { A.dawdle -= dt; p.ctrl.move(0, 0); return; }
      if (chance(dt * [0.45, 0.25, 0.12][lvl])) { A.dawdle = rand(0.6, 1.5); return; }
      dance();
      return;
    }
    if (this.phase === 'freeze') {
      if (A.stopAt != null && this.pt < A.stopAt) { dance(); return; }
      if (A.wiggleAt != null && this.pt >= A.wiggleAt) { A.wiggleAt = null; A.wiggleT = rand(0.2, 0.4); }
      if (A.wiggleT > 0) { A.wiggleT -= dt; p.ctrl.move(rand(-1, 1), rand(-1, 1)); return; }
      p.ctrl.move(0, 0);
      return;
    }
    p.ctrl.move(0, 0);
  }

  // --- drawing -------------------------------------------------------------------------------
  draw(g) {
    const t = this.t || this.t0;
    const bg = art('bg/dance-freeze');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(hallBackground(), 0, 0);
    const beat = this.tune.beat;
    const pulse = this.lightK * Math.pow(1 - (beat % 1), 3);
    drawFloor(g, beat, this.icy, t, this.party);
    drawBeams(g, this.spin, this.lightK, this.party);
    drawDiscoBall(g, this.spin, this.lightK, t);
    // The generated console is taller than the original procedural fallback.
    // When present, stand Hoot behind its authored tabletop; keep the former
    // anchor when only the shorter fallback console is available.
    const boothImage = art('prop/df-dj-booth');
    const boothHeight = BOOTH.w * 300 / 560;
    const djY = boothImage ? BOOTH.y - boothHeight + 77 * boothHeight / 300 : BOOTH.y - 80;
    if (this.dj.y !== djY) { this.dj.y = djY; this.dj.snap(); }
    this.dj.draw(g, { shadow: false });
    drawBooth(g, this.spin * 2, pulse, this.icy, t);
    if (this.phase === 'tell') {
      g.save(); g.globalAlpha = clamp(this.pt / 0.15, 0, 1);
      ui.text(g, '!', BOOTH.x + 300, BOOTH.y - 230 + Math.sin(t * 20) * 5, { size: 110, color: '#ffd23f', strokeWidth: 14 });
      g.restore();
    }
    // icy wash behind the dancers
    if (this.icy > 0.01) { g.save(); g.globalAlpha = 0.22 * this.icy; g.fillStyle = '#6fc4ff'; g.fillRect(0, 0, W, H); g.restore(); }
    const list = this.units.slice().sort((a, b) => a.y - b.y);
    for (const U of list) this.drawUnit(g, U, t);
    // party lights
    if (this.lightK > 0.01) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const cols = ['255,111,177', '63,167,255', '255,210,63', '155,92,255'];
      for (let k = 0; k < 4; k++) {
        const x = W / 2 + Math.cos(t * 0.9 + k * 1.7) * 640, y = 820 + Math.sin(t * 1.3 + k * 2.3) * 160;
        const r = 230 + pulse * 40;
        const gr = g.createRadialGradient(x, y, 10, x, y, r);
        gr.addColorStop(0, `rgba(${cols[k]},${(this.party ? 0.3 : 0.18) * this.lightK})`); gr.addColorStop(1, `rgba(${cols[k]},0)`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, TAU); g.fill();
      }
      g.restore();
    }
  }

  drawUnit(g, U, t) {
    const a = U.a;
    // glowing tile under each dancer
    g.save();
    g.globalAlpha = 0.5 + (this.musicOn ? 0.3 * Math.pow(1 - (this.tune.beat % 1), 2) : 0);
    g.fillStyle = U.state === 'frozen' ? '#e6f7ff' : U.p.color;
    g.beginPath(); g.ellipse(U.homeX, U.y + 4, 100 * a.scale, 30 * a.scale, 0, 0, TAU); g.fill();
    g.restore();
    a.draw(g, { ring: U.p.color });
    // frost: ice crystals around a frozen dancer
    if (U.state === 'frozen' && U.frost > 0.05) {
      g.save(); g.globalAlpha = U.frost;
      const h = a.height;
      for (let k = 0; k < 4; k++) {
        const ang = k * 1.7 + U.i;
        drawSnowflake(g, U.x + Math.cos(ang) * 60 * a.scale, U.y - h * (0.25 + 0.2 * k), 12 + (k % 2) * 6, t * 0.6 + k);
      }
      g.restore();
    }
    if (U.state === 'tickled' || U.featherK > 0) {
      const k = U.state === 'tickled' ? U.featherK : 0;
      if (k > 0) {
        const side = U.i % 2 ? -1 : 1;
        const qx = U.x + side * (a.width * 0.5 + 40) + Math.sin(t * 16) * 18, qy = U.y - a.height * 0.35 - (1 - k) * 260;
        drawFeather(g, qx, qy, -side * (0.55 + Math.sin(t * 22) * 0.3), 0.6 * clamp(a.scale, 0.7, 1.1), t);
      }
    }
    if (this.t < 5 || (!U.p.isAI && this.n > 1 && this.t < 10)) {
      const sc = this.n > 4 ? 0.8 : 0.95;
      g.save(); g.translate(U.x, U.y - U.z - a.height - 34); g.scale(sc, sc); ui.playerTag(g, U.p, 0, 0); g.restore();
    }
  }

  drawHUD(g) {
    const t = this.t || this.t0;
    ui.scoreboard(g, this.players, this.units.map((U) => U.dance + U.freeze), {
      y: 16, avoidCenter: true, format: (v) => `${v} ★`,
      expr: this.units.map((U) => (U.state === 'tickled' ? 'happy' : 'neutral')),
    });
    ui.timer(g, Math.max(0, GAME_T - this.t));
    // big state badge: music notes (dance) or snowflake (freeze)
    const x = W / 2, y = 186;
    const freeze = this.phase === 'freeze';
    const shake = this.phase === 'tell' ? Math.sin(t * 50) * 6 : 0;
    g.save(); g.translate(x + shake, y);
    const sc = freeze ? 1 + 0.06 * Math.sin(t * 8) : 1 + (this.musicOn ? 0.06 * Math.pow(1 - (this.tune.beat % 1), 2) : 0);
    g.scale(sc, sc);
    ui.panel(g, -150, -50, 300, 100, { r: 50, fill: freeze ? '#bfe9ff' : this.phase === 'tell' ? '#ffe27a' : this.party ? '#ffb3e0' : '#9ff0c8' });
    if (freeze) drawSnowflake(g, -95, 0, 38, t * 0.8);
    else drawNotes(g, -95, 0, 38, t);
    ui.text(g, freeze ? 'FREEZE!' : this.phase === 'tell' ? 'Ready...' : 'DANCE!', 35, 3, { size: 46, color: NAVY, stroke: false, weight: 800 });
    g.restore();
    if (this.banner) {
      const b = this.banner, fade = clamp((b.dur - b.t) / 0.25, 0, 1);
      g.save(); g.globalAlpha = fade;
      ui.banner(g, b.text, b.t, { size: b.icon === 'snow' ? 180 : 130, y: 420, color: b.color });
      if (b.icon === 'snow') { drawSnowflake(g, W / 2 - 470, 420, 80, t); drawSnowflake(g, W / 2 + 470, 420, 80, -t); }
      g.restore();
    }
    // first-time hints (pictures carry it; words are a bonus for grown-ups)
    let hint = null, glyph = null;
    if (this.round === 1 && this.musicOn && this.t < 9) { hint = 'Wiggle to dance!'; glyph = 'stick'; }
    else if (this.round === 1 && this.phase === 'freeze') { hint = 'Hands off - FREEZE!'; }
    if (hint) {
      g.save();
      const w = ui.measure(g, hint, 40, 800) + (glyph ? 150 : 80);
      ui.panel(g, W / 2 - w / 2, H - 98, w, 72, { r: 36, fill: freeze ? '#e6f7ff' : '#fff8ec' });
      ui.text(g, hint, W / 2 - (glyph ? 30 : 0), H - 61, { size: 40, color: NAVY, stroke: false, weight: 800 });
      if (glyph) ui.glyph(g, glyph, W / 2 + w / 2 - 52, H - 62, 50, { pulse: true });
      g.restore();
    }
  }
}
