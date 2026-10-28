// Beach Ball Soccer - Pink Team vs Blue Team on a sunny beach pitch. Everyone runs
// about bumping one giant, light, bouncy beach ball into the other team's goal.
//   stick  run
//   A      kick when the ball is close (a tap kicks; hold A while running up and the
//          kick lands harder the moment you reach the ball)
//   B      the standard dash (engine/dash.js); dashing into the ball bumps it hard
// Session players alternate teams (P1 pink, P2 blue, ...) and CPUs fill both teams up
// to the same size (at least 2 a side). 90 s; more goals wins; a tie plays a short
// golden goal (next goal wins), and if nobody scores it ends as a team draw.
//
// Art hooks (optional; procedural stand-ins ship today, see image-requests.md):
//   bg/beach-ball-soccer (else bg/sandcastle-beach + drawn pitch lines, else all drawn)
//   prop/bbs-goal-pink, prop/bbs-goal-blue (drawn into the goal box; blue mirrored)
//   prop/bbs-beach-ball (spun in plane; squash and shadow drawn here)
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { input } from '../engine/input.js';
import { art } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { Dash } from '../engine/dash.js';
import { spread, bodyRadius } from '../engine/crowd.js';
import { aiProfile, reactionTime, makesMistake, Brain } from '../engine/ai.js';
import { randomFreeCharacter } from '../state.js';
import { clamp, lerp, damp, rand, pick, chance, ease, TAU } from '../engine/util.js';

import { meta } from './beach-ball-soccer.meta.js';
export { meta };

// --- layout (screen px; the pitch is seen from a high three-quarter view) ------------
const P = { x0: 150, x1: 1770, y0: 420, y1: 1010 };   // goal lines and sidelines
const CX = 960, CY = 715;                             // centre spot
const MOUTH = 120;                                    // half the goal mouth (y)
const DEPTH = 100;                                    // how far the net goes back
const BAR = 150;                                      // crossbar height
const LEAN = 14;                                      // posts lean back a little (reads as 3D)
// --- ball ------------------------------------------------------------------------------
const BALL_R = 58;            // drawn radius
const BR = 44;                // footprint radius on the sand (collisions)
const GRAV = 1250;            // floaty
const MAX_V = 1500;
// --- players ---------------------------------------------------------------------------
const WALK = 360, Y_K = 0.82; // run speed; up/down is a touch slower (it's depth)
const KICK_CD = 0.3, CHARGE_T = 0.75, BUFFER = 0.3;
// --- match -----------------------------------------------------------------------------
const MATCH = 90, GOLDEN = 30;
const GOAL_T = 2.5, RESET_T = 1.5, END_T = 2.0;

const NAVY = '#24163f';
const TEAMS = [
  { name: 'Pink Team', color: '#ff5fa8', dark: '#c2347a', light: '#ffd0e6', goal: 'prop/bbs-goal-pink' },
  { name: 'Blue Team', color: '#3fa0ff', dark: '#1d6fc0', light: '#cfe8ff', goal: 'prop/bbs-goal-blue' },
];
const goalX = (team) => (team === 0 ? P.x0 : P.x1);     // the goal a team defends
const atk = (team) => (team === 0 ? 1 : -1);            // the way a team attacks (x)
const BALL_COLS = ['#ff6fb1', '#ffffff', '#4fb4ff', '#ffd23f', '#ffffff', '#5fe0a8'];

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.t = 0; this.playT = 0; this.goldT = 0;
    this.phase = 'play';          // play | goal | reset | over
    this.phaseT = 0;
    this.golden = false;
    this.score = [0, 0];
    this.scorePop = [0, 0];
    this.netWob = [0, 0];
    this.banner = null;           // { text, sub, color, t }
    this.ghosts = [];
    this.finished = false;
    this.result = null;           // { win: 0 | 1 | -1 }

    // --- teams: session players alternate; CPUs fill both sides to the same size ---
    const lvl = api.level ?? 1;
    const real = this.players.slice();
    const teams = [[], []];
    real.forEach((p, i) => teams[i % 2].push(p));
    const size = Math.max(2, teams[0].length, teams[1].length);
    const all = real.slice();
    for (let team = 0; team < 2; team++) {
      while (teams[team].length < size) {
        const k = this.ghosts.length;
        const g = {
          index: 8 + k, charId: randomFreeCharacter(all), variant: 0, glow: null, color: TEAMS[team].color,
          tag: 'CPU', isAI: true, aiLevel: lvl, ctrl: input.createAI(930 + k), stars: 0, ghost: true,
        };
        this.ghosts.push(g); all.push(g); teams[team].push(g);
      }
    }
    this.size = size;
    const total = size * 2;
    this.scale = total <= 4 ? 0.95 : total <= 6 ? 0.84 : 0.76;
    this.members = [];
    teams.forEach((list, team) => {
      // one CPU per side keeps goal (a ghost first) when the side has someone else to play out
      const cpus = list.filter((p) => p.isAI);
      const keeper = list.length >= 2 ? (cpus.find((p) => p.ghost) || cpus[0] || null) : null;
      for (const p of list) {
        const a = new Actor(p, { scale: this.scale });
        const m = {
          p, team, a, ghost: !!p.ghost, keeper: p === keeper, x: CX, y: CY, vx: 0, vy: 0,
          r: bodyRadius(a, 28, 0.3), dash: new Dash({ yScale: Y_K, color: '#fff3d6' }),
          want: 0, charge: 0, kickCd: 0, stun: 0, goals: 0, touches: 0, bumpT: 0,
          brain: new Brain(p), seen: { x: CX, y: CY }, kickAt: -1, aim: null, kickAim: null, from: null, home: null, cheer: 0,
        };
        m.pr = Math.min(m.r, 44);   // feet radius for the ball (wide groups kick from the leader)
        this.members.push(m);
      }
    });
    this.humans = this.members.filter((m) => !m.p.isAI);
    this.placeKickoff(true);

    this.ball = { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, sq: 0, last: null, hidden: false, inNet: -1 };

    api.limit(() => {
      if (this.phase === 'over') return null;
      return this.golden ? Math.max(0, GOLDEN - this.goldT) : Math.max(0, MATCH - this.playT);
    }, { showAt: Infinity, x: W / 2, y: 70 });
    if (api.camera) api.camera.maxZoom = Math.min(api.camera.maxZoom, 1.3);
    this.pitchLayer = null;
  }

  destroy() { for (const g of this.ghosts) input.releaseAI(g.ctrl); }

  // --- setup ---------------------------------------------------------------------------
  /** Kickoff spots: the keeper in front of goal, everyone else spread over their own half. */
  kickoffSpots(team) {
    const list = this.members.filter((m) => m.team === team);
    const d = atk(team), gx = goalX(team);
    const field = list.filter((m) => !m.keeper);
    const spots = new Map();
    for (const m of list) if (m.keeper) spots.set(m, { x: gx + d * 130, y: CY });
    const F = field.length, gap = Math.min(200, 560 / Math.max(1, F));
    field.forEach((m, k) => {
      const y = CY + (k - (F - 1) / 2) * gap;
      const x = CX - d * (F === 1 ? 210 : 200 + (k % 2) * 140);
      spots.set(m, { x, y });
    });
    return spots;
  }

  placeKickoff(snap) {
    for (let team = 0; team < 2; team++) {
      for (const [m, s] of this.kickoffSpots(team)) {
        m.home = s;
        if (snap) {
          m.x = s.x; m.y = s.y; m.vx = m.vy = 0;
          m.a.facing = atk(m.team); this.placeActor(m); m.a.snap();
        }
      }
    }
  }

  placeActor(m) {
    const a = m.a;
    a.x = m.x; a.y = m.y;
    a.scale = this.scale * depthScale(m.y, { top: P.y0, near: P.y1, far: 0.88, nearScale: 1.05 });
  }

  // --- frame ---------------------------------------------------------------------------
  preUpdate(dt) {
    this.t += dt;
    for (const m of this.members) { m.a.facing = atk(m.team); m.a.setPose('ready'); m.a.update(dt); }
    this.ball.z = 6 + Math.abs(Math.sin(this.t * 3)) * 26;
  }

  postUpdate(dt) {
    this.t += dt;
    this.tickFx(dt);
    this.updateBall(dt, false);
    for (const m of this.members) { this.animMember(m, dt, 0, 0); m.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    this.tickFx(dt);
    const b = this.ball;
    if (this.phase === 'play') {
      if (this.golden) this.goldT += dt; else this.playT += dt;
      for (const m of this.members) if (m.p.isAI) this.ai(m, dt);
      for (const m of this.members) this.moveMember(m, dt, true);
      this.crowd();
      this.updateBall(dt, true);
      this.touchBall(dt);
      this.checkClock();
    } else if (this.phase === 'goal') {
      for (const m of this.members) this.moveMember(m, dt, false);
      this.crowd();
      this.updateBall(dt, false);
      if (this.phaseT >= GOAL_T) {
        if (this.golden) this.endMatch(this.lastScorer);
        else this.startReset();
      }
    } else if (this.phase === 'reset') {
      this.resetStep(dt);
      if (this.phaseT >= RESET_T) {
        this.setPhase('play');
        sfx('whistle', { vol: 0.7 });
        for (const m of this.members) if (m.p.isAI) m.p.ctrl.reset();
      }
    } else if (this.phase === 'over') {
      for (const m of this.members) this.moveMember(m, dt, false);
      this.updateBall(dt, false);
      if (this.phaseT >= END_T && !this.finished) this.finishMatch();
    }
    for (const m of this.members) m.a.update(dt);
  }

  setPhase(ph) { this.phase = ph; this.phaseT = 0; }

  tickFx(dt) {
    this.scorePop = this.scorePop.map((v) => Math.max(0, v - dt * 1.6));
    this.netWob = this.netWob.map((v) => Math.max(0, v - dt * 0.9));
    if (this.banner) { this.banner.t += dt; if (this.banner.t > (this.banner.dur || 2)) this.banner = null; }
  }

  showBanner(text, color, sub = null, dur = 2) { this.banner = { text, color, sub, t: 0, dur }; }

  checkClock() {
    if (!this.golden && this.playT >= MATCH) {
      if (this.score[0] !== this.score[1]) { this.endMatch(this.score[0] > this.score[1] ? 0 : 1); return; }
      this.golden = true; this.goldT = 0;
      this.showBanner('Golden Goal!', '#ffd23f', 'Next goal wins!', 2.4);
      snd('drumroll', 'fanfare', { vol: 0.6 });
      this.startReset();
    } else if (this.golden && this.goldT >= GOLDEN) {
      this.endMatch(-1);
    }
  }

  // --- players -------------------------------------------------------------------------
  moveMember(m, dt, live) {
    const c = m.p.ctrl, a = m.a;
    m.kickCd = Math.max(0, m.kickCd - dt); m.stun = Math.max(0, m.stun - dt); m.bumpT = Math.max(0, m.bumpT - dt);
    let mx = live ? c.x : 0, my = live ? c.y : 0;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    if (m.stun > 0) { mx *= 0.3; my *= 0.3; }
    m.vx = damp(m.vx, mx * WALK, 10, dt); m.vy = damp(m.vy, my * WALK * Y_K, 10, dt);
    m.x += m.vx * dt; m.y += m.vy * dt;
    const d = m.dash.update(dt, live ? c : null, { x: m.x, y: m.y, actor: a, ok: live && m.stun <= 0 });
    m.x += d.x; m.y += d.y;
    if (m.dash.active && Math.random() < dt * 40) particles.burst(m.x, m.y - 8, { type: 'dust', count: 1, colors: ['#fff3d6', '#f2d49b'], speed: [20, 80], size: [10, 18] });
    this.clampMember(m);
    if (live) this.kickInput(m, dt);
    this.animMember(m, dt, mx, my);
  }

  clampMember(m) {
    m.x = clamp(m.x, P.x0 + 16, P.x1 - 16);
    m.y = clamp(m.y, P.y0 + 6, P.y1);
  }

  animMember(m, dt, mx, my) {
    const a = m.a;
    this.placeActor(m);
    if (m.cheer > 0) {
      m.cheer -= dt;
      // little hops while cheering
      a.z = Math.abs(Math.sin(this.t * 9 + m.p.index)) * 26;
      return;
    }
    a.z = 0;
    if (a._once) return;
    if (this.phase === 'over' && this.result) {
      const won = this.result.win === m.team || this.result.win === -1;
      a.setPose(won ? 'celebrate' : 'pout');
      return;
    }
    const sp = Math.hypot(m.vx, m.vy);
    if (m.charge > 0.25 && sp < 60) { a.setPose('windup'); return; }
    a.moveAnim(m.vx, m.vy, WALK, { run: sp > WALK * 0.55 });
    // face the way the stick points even from a standstill (instant switch, no flip)
    if (Math.abs(mx) > 0.3) a.facing = mx > 0 ? 1 : -1;
    void my;
  }

  inReach(m) {
    const b = this.ball;
    if (b.hidden || b.z > 110) return false;
    const dx = b.x - m.x, dy = (b.y - m.y) * 1.3;
    return Math.hypot(dx, dy) < BR + m.pr + 34;
  }

  kickInput(m, dt) {
    const c = m.p.ctrl;
    if (c.pressed('a')) { m.want = BUFFER; m.charge = 0; }
    if (c.held('a')) { m.want = Math.max(m.want, 0.05); m.charge = Math.min(1, m.charge + dt / CHARGE_T); }
    else { m.want -= dt; if (m.want <= 0) m.charge = 0; }
    if (m.want > 0 && m.kickCd <= 0 && this.inReach(m)) {
      this.kick(m, m.charge >= 0.25 ? m.charge : 0);
      m.want = 0; m.charge = 0;
    }
  }

  kick(m, charge) {
    const b = this.ball, c = m.p.ctrl;
    const G = { x: goalX(1 - m.team), y: CY };
    const toGoal = Math.atan2(G.y - b.y, G.x - b.x);
    let ang;
    if (m.kickAim != null && m.p.isAI) { ang = m.kickAim; m.kickAim = null; }
    else if (Math.hypot(c.x, c.y) > 0.3) {
      ang = Math.atan2(c.y, c.x);
      // a friendly nudge toward the goal when the stick points that way
      const diff = Math.atan2(Math.sin(toGoal - ang), Math.cos(toGoal - ang));
      if (Math.abs(diff) < 1.1) ang += diff * 0.3;
    } else ang = toGoal;
    // never kick it back through yourself
    const away = Math.atan2(b.y - m.y, b.x - m.x);
    const back = Math.cos(ang - away);
    if (back < -0.2) ang = away + Math.atan2(Math.sin(ang - away), Math.cos(ang - away)) * 0.4;
    const power = 700 + 650 * charge;
    b.vx = Math.cos(ang) * power; b.vy = Math.sin(ang) * power * 0.85;
    b.vz = 230 + 420 * charge;
    b.z = Math.max(b.z, 4);
    b.last = m; m.touches++;
    m.kickCd = KICK_CD;
    const a = m.a;
    if (Math.abs(Math.cos(ang)) > 0.2) a.facing = Math.cos(ang) > 0 ? 1 : -1;
    a.playOnce('push', 0.3); a.squash(0.25);
    snd('rubber-bounce', 'bounce', { vol: 0.6 + charge * 0.4, rate: 1.1 - charge * 0.25 });
    const bx = (b.x + m.x) / 2, by = (b.y + m.y) / 2;
    particles.burst(bx, by - 10, { type: 'dust', count: 5 + Math.round(charge * 6), colors: ['#fff3d6', '#f2d49b'], speed: [60, 220], size: [12, 22] });
    particles.burst(b.x, b.y - BALL_R, { type: 'spark', count: 4, colors: ['#ffffff', TEAMS[m.team].color], speed: [80, 240] });
    if (charge > 0.6) {
      particles.popText(b.x, b.y - BALL_R * 2 - 30, 'Super kick!', TEAMS[m.team].color, 44);
      particles.ring(b.x, b.y - BALL_R, TEAMS[m.team].color, 110, 0.35);
      fx.shake(6, 0.15);
    }
    if (!m.p.isAI) c.rumble?.(0.3 + charge * 0.4, 90);
  }

  crowd() {
    spread(this.members, { radius: (m) => m.r, yScale: 1.3, strength: 0.5 });
    for (const m of this.members) this.clampMember(m);
  }

  // --- ball ----------------------------------------------------------------------------
  updateBall(dt, live) {
    const b = this.ball;
    if (b.hidden) return;
    b.sq = Math.max(0, b.sq - dt * 4);
    // height: a light, floaty bounce
    b.vz -= GRAV * dt; b.z += b.vz * dt;
    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -110) {
        const hit = -b.vz;
        b.vz = hit * 0.62;
        b.sq = Math.min(1, hit / 600);
        if (hit > 180) {
          snd('bb-boing', 'bounce', { vol: clamp(hit / 900, 0.15, 0.6), rate: rand(1.05, 1.25) });
          particles.burst(b.x, b.y, { type: 'dust', count: 3, colors: ['#fff3d6', '#f2d49b'], speed: [30, 120], size: [10, 18] });
        }
      } else b.vz = 0;
    }
    const drag = Math.exp(-(b.z > 2 ? 0.35 : 0.95) * dt);
    b.vx *= drag; b.vy *= drag;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_V) { b.vx *= MAX_V / sp; b.vy *= MAX_V / sp; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.spin += (b.vx / BALL_R) * dt * 0.8 + (b.vy / BALL_R) * dt * 0.25;
    this.ballWalls(live);
  }

  ballWalls(live) {
    const b = this.ball;
    const yTop = P.y0 + 18, yBot = P.y1 - 4;
    if (b.y < yTop) { b.y = yTop; if (b.vy < 0) { b.vy = -b.vy * 0.8; this.wallThud(); } }
    if (b.y > yBot) { b.y = yBot; if (b.vy > 0) { b.vy = -b.vy * 0.8; this.wallThud(); } }
    const inMouth = Math.abs(b.y - CY) < MOUTH - BR * 0.45;
    for (let team = 0; team < 2; team++) {
      const gx = goalX(team), s = -atk(team);          // s: the way out of the pitch at this end
      const past = (b.x - gx) * s;                      // > 0: over the goal line
      if (b.inNet === team) {
        // in the net: it sags against the back and the sides
        const back = DEPTH - BR * 0.6;
        if (past > back) { b.x = gx + s * back; b.vx *= -0.2; this.netWob[team] = Math.max(this.netWob[team], 0.6); }
        if (Math.abs(b.y - CY) > MOUTH - BR * 0.5) { b.y = CY + Math.sign(b.y - CY) * (MOUTH - BR * 0.5); b.vy *= -0.3; }
        b.vx *= 0.96; b.vy *= 0.96;
        continue;
      }
      if (inMouth && b.z < BAR) {
        if (past > BR * 0.5 && live && this.phase === 'play') this.goal(1 - team);
        else if (past > BR * 0.5) { b.x = gx - s * BR * 0.5; b.vx = -b.vx * 0.5; }
        continue;
      }
      const lim = BR * 0.75;
      if (past > -lim) {
        b.x = gx - s * lim;
        if (b.vx * s > 0) { b.vx = -b.vx * 0.8; this.wallThud(); }
      }
      // the posts
      for (const py of [CY - MOUTH, CY + MOUTH]) {
        if (b.z > BAR) continue;
        const dx = b.x - gx, dy = (b.y - py) * 1.3, d = Math.hypot(dx, dy), min = BR * 0.75 + 10;
        if (d < min && d > 0.01) {
          const nx = dx / d, ny = dy / d;
          b.x = gx + nx * min; b.y = py + (ny * min) / 1.3;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny;
            if (-vn > 200) { snd('cloudhop-bonk', 'bonk', { vol: 0.45 }); particles.popText(gx, py - BAR - 20, 'Ping!', '#ffffff', 36); }
          }
        }
      }
    }
  }

  wallThud() {
    const b = this.ball;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 220) { snd('bb-boing', 'bounce', { vol: clamp(sp / 1500, 0.15, 0.5), rate: 0.9 }); b.sq = Math.max(b.sq, 0.4); }
  }

  /** Players and the ball: it bounces off bodies, rolls ahead of a runner, and a dash bumps it hard. */
  touchBall(dt) {
    const b = this.ball;
    if (b.hidden || b.z > 95) return;
    for (const m of this.members) {
      let dx = b.x - m.x, dy = (b.y - m.y) * 1.3;
      let d = Math.hypot(dx, dy);
      const min = BR + m.pr;
      if (d >= min) continue;
      if (d < 0.01) { dx = atk(m.team); dy = 0; d = 1; }
      const nx = dx / d, ny = dy / d;
      b.x = m.x + nx * min; b.y = m.y + (ny * min) / 1.3;
      const pvn = m.vx * nx + m.vy * ny;
      const vn = b.vx * nx + b.vy * ny;
      if (m.dash.active && m.bumpT <= 0) {
        // dash bump: a big shove along the dash
        m.bumpT = 0.35;
        const dl = Math.hypot(m.dash.dx, m.dash.dy) || 1;
        const ux = lerp(m.dash.dx / dl, nx, 0.35), uy = lerp(m.dash.dy / dl, ny, 0.35);
        const ul = Math.hypot(ux, uy) || 1;
        b.vx = (ux / ul) * 1150; b.vy = (uy / ul) * 1150 * 0.85; b.vz = 330; b.sq = 0.6;
        b.last = m; m.touches++;
        m.a.squash(0.3);
        snd('bb-boing-big', 'boing', { vol: 0.7 });
        particles.burst(b.x, b.y - BALL_R, { type: 'star', count: 6, colors: ['#ffd23f', '#ffffff', TEAMS[m.team].color], speed: [120, 320] });
        particles.popText(b.x, b.y - BALL_R * 2 - 24, 'BUMP!', TEAMS[m.team].color, 46);
        fx.shake(5, 0.12);
        if (!m.p.isAI) m.p.ctrl.rumble?.(0.45, 110);
        continue;
      }
      // bounce off the body (the ball is light: it springs away)
      const rel = vn - pvn;
      if (rel < 0) { b.vx -= 1.5 * rel * nx; b.vy -= 1.5 * rel * ny; }
      // a runner pushes it along ahead of them (dribbling)
      const want = pvn * 1.25 + 40;
      const now = b.vx * nx + b.vy * ny;
      if (pvn > 40 && now < want) { b.vx += (want - now) * nx; b.vy += (want - now) * ny; b.vz = Math.max(b.vz, 60); }
      if (Math.abs(rel) > 120 || pvn > 120) { b.last = m; }
      void dt;
    }
  }

  // --- goals ---------------------------------------------------------------------------
  goal(team) {
    const b = this.ball;
    const conceded = 1 - team;
    b.inNet = conceded;
    this.score[team]++;
    this.scorePop[team] = 1;
    this.netWob[conceded] = 1;
    this.setPhase('goal');
    const last = b.last;
    const own = last && last.team !== team;
    const scorer = !own && last ? last : null;
    if (scorer) scorer.goals++;
    this.lastScorer = team;
    const T = TEAMS[team];
    const sub = scorer ? (scorer.ghost ? null : `${scorer.p.tag} scores!`) : own ? 'Oops! An own goal!' : null;
    this.showBanner('GOAL!', T.color, sub, GOAL_T);
    // confetti from the goal mouth and the sky
    const gx = goalX(conceded);
    for (const py of [CY - MOUTH, CY + MOUTH]) {
      particles.burst(gx, py - BAR, { type: 'confetti', count: 40, colors: [T.color, T.light, '#ffffff', '#ffd23f'], angle: -Math.PI / 2 + atk(conceded) * 0.5, spread: 0.9, speed: [400, 900] });
    }
    particles.burst(b.x, b.y - BALL_R, { type: 'star', count: 14, colors: ['#ffd23f', '#ffffff', T.color], speed: [200, 600] });
    particles.confettiRain(W, 90);
    snd('ac-net', 'whoosh', { vol: 0.8 });
    sfx('cheer', { vol: 0.8 });
    snd('fanfare', 'win', { vol: 0.5 });
    fx.shake(14, 0.4); fx.flash(T.light, 0.15); fx.slowmo?.(0.45, 0.5);
    if (this.api.camera) this.api.camera.punch(lerp(gx, CX, 0.25), CY - 60, 1.2, 0.9);
    for (const m of this.members) {
      if (m.team === team) {
        m.cheer = GOAL_T - 0.3;
        m.a.playOnce(m === scorer ? 'celebrate' : 'cheer', GOAL_T - 0.3);
        m.a.emote('star', 1.2);
        if (!m.p.isAI) m.p.ctrl.rumble?.(0.6, 220);
      } else {
        m.a.playOnce(own && m === last ? 'surprised' : 'pout', 1.4);
      }
    }
    // one voice at most (voices are rare): the scorer, if it's a kid
    if (scorer && !scorer.p.isAI) scorer.a.say(pick(['Goal!', 'Yay!', 'Woo-hoo!']), 1.4, 'yay');
  }

  startReset() {
    this.setPhase('reset');
    this.placeKickoff(false);
    for (const m of this.members) { m.from = { x: m.x, y: m.y }; m.want = 0; m.charge = 0; m.dash.cancel(); }
    const b = this.ball;
    b.hidden = true; b.inNet = -1; b.last = null;
  }

  resetStep(dt) {
    const k = ease.inOutQuad(clamp(this.phaseT / (RESET_T * 0.75), 0, 1));
    for (const m of this.members) {
      const ox = m.x, oy = m.y;
      m.x = lerp(m.from.x, m.home.x, k); m.y = lerp(m.from.y, m.home.y, k);
      m.vx = (m.x - ox) / Math.max(dt, 1e-3); m.vy = (m.y - oy) / Math.max(dt, 1e-3);
      if (k >= 1) { m.vx = m.vy = 0; m.a.facing = atk(m.team); }
      m.cheer = 0;
      this.animMember(m, dt, 0, 0);
    }
    // the ball drops back onto the centre spot with a bounce
    const b = this.ball;
    if (b.hidden && this.phaseT >= 0.35) {
      Object.assign(b, { hidden: false, x: CX, y: CY, z: 520, vx: 0, vy: 0, vz: 0, spin: 0 });
      snd('jr-whoosh', 'whoosh', { vol: 0.4 });
    }
    if (!b.hidden) {
      b.vz -= GRAV * dt; b.z += b.vz * dt;
      if (b.z <= 0) { b.z = 0; if (b.vz < -110) { b.vz = -b.vz * 0.55; b.sq = 0.7; snd('bb-boing', 'bounce', { vol: 0.4 }); } else b.vz = 0; }
      b.sq = Math.max(0, b.sq - dt * 4);
    }
  }

  endMatch(win) {
    this.setPhase('over');
    this.result = { win };
    const b = this.ball;
    if (win === -1) {
      this.showBanner("It's a draw!", '#ffd23f', 'Both teams played great!', END_T + 1);
      sfx('cheer', { vol: 0.7 });
    } else {
      const T = TEAMS[win];
      this.showBanner(`${T.name} wins!`, T.color, `${this.score[0]} - ${this.score[1]}`, END_T + 1);
      snd('fanfare', 'win', { vol: 0.7 });
      particles.confettiRain(W, 140);
    }
    for (const m of this.members) {
      m.cheer = 0; m.want = 0; m.charge = 0; m.dash.cancel();
      m.a.setPose(win === -1 || m.team === win ? 'celebrate' : 'pout');
    }
    void b;
  }

  finishMatch() {
    if (this.finished) return;
    this.finished = true;
    const win = this.result.win;
    const of = (p) => this.members.find((m) => m.p === p);
    const placements = this.players.map((p) => (win === -1 || of(p).team === win ? 1 : 2));
    const best = Math.max(0, ...this.members.filter((m) => !m.ghost).map((m) => m.goals));
    const stats = this.players.map((p) => {
      const m = of(p);
      const mvp = this.players.length > 1 && best > 0 && m.goals === best;
      return `${mvp ? 'MVP! ' : ''}${plural(m.goals, 'goal')}`;
    });
    let title;
    if (win === -1) title = `It's a draw! ${this.score[0]} - ${this.score[1]}`;
    else if (this.players.length === 1) title = of(this.players[0]).team === win ? `Your team won ${Math.max(...this.score)} - ${Math.min(...this.score)}!` : `So close! ${Math.max(...this.score)} - ${Math.min(...this.score)}`;
    else title = `${TEAMS[win].name} wins!`;
    const ws = this.members.filter((m) => win === -1 || m.team === win);
    const fx0 = ws.reduce((s, m) => s + m.x, 0) / ws.length, fy0 = ws.reduce((s, m) => s + m.y, 0) / ws.length;
    this.api.finish({ placements, stats, title, focus: { x: fx0, y: fy0 - 90, zoom: 1.2 } });
  }

  // --- CPUs ----------------------------------------------------------------------------
  ai(m, dt) {
    const p = m.p, b = this.ball, prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 1, 0, 2);
    const d = atk(m.team), gx = goalX(m.team);
    if (m.brain.ready(dt)) {
      m.brain.wait(rand(...prof.reaction) * 0.5);
      const lead = [0.05, 0.15, 0.25][lvl];
      m.seen = { x: b.x + b.vx * lead, y: b.y + b.vy * lead };
    }
    const sb = m.seen;
    let tx, ty, speed = prof.speed * [0.85, 0.92, 1][lvl];
    let chase = false;
    if (m.keeper) {
      const danger = (sb.x - gx) * d < 380 && !b.hidden;
      if (danger) { chase = true; speed *= 0.95; }
      else { tx = gx + d * 120; ty = clamp(sb.y, CY - MOUTH + 25, CY + MOUTH - 25); }
    } else {
      // the team's nearest outfield CPU goes for the ball, unless a kid on the team is closer
      const mates = this.members.filter((o) => o.team === m.team && !o.keeper);
      const dist2 = (o) => Math.hypot(o.x - sb.x, (o.y - sb.y) * 1.3);
      const kid = mates.filter((o) => !o.p.isAI).sort((a, c) => dist2(a) - dist2(c))[0];
      const cpus = mates.filter((o) => o.p.isAI).sort((a, c) => dist2(a) - dist2(c));
      const mine = cpus[0] === m && !(kid && dist2(kid) < dist2(m) && dist2(kid) < 220);
      if (mine || dist2(m) < 130) chase = true;
      else {
        // support: a lane behind the ball, toward our own goal
        const k = cpus.indexOf(m);
        const lane = [-1, 1, 0, -0.5, 0.5][k % 5] * 190;
        tx = clamp(sb.x - d * (240 + (k % 2) * 120), P.x0 + 140, P.x1 - 140);
        ty = clamp(CY + lane + (sb.y - CY) * 0.35, P.y0 + 60, P.y1 - 40);
      }
    }
    m.aim = null;
    if (chase) {
      // line up behind the ball, facing the goal we attack (keepers just clear it upfield)
      const G = { x: goalX(1 - m.team), y: CY + (m.keeper ? rand(-200, 200) : 0) };
      let ux = G.x - sb.x, uy = G.y - sb.y;
      const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      const behind = BR + m.pr + 6;
      tx = sb.x - ux * behind; ty = sb.y - (uy * behind) / 1.3;
      // on the wrong side of the ball: swing round it instead of pushing it home
      const ahead = (m.x - sb.x) * ux + (m.y - sb.y) * uy;
      if (ahead > -10) {
        const side = m.y < sb.y ? -1 : 1;
        tx = sb.x - ux * 90; ty = sb.y + side * 120;
      }
      if (this.inReach(m) && m.kickCd <= 0) {
        const lined = ((b.x - m.x) * ux + (b.y - m.y) * uy) / (Math.hypot(b.x - m.x, b.y - m.y) || 1);
        if (lined > 0.25) {
          if (m.kickAt < 0) m.kickAt = this.t + reactionTime(p) * [0.9, 0.55, 0.3][lvl];
          if (this.t >= m.kickAt) {
            const err = (makesMistake(p) ? 2.2 : 1) * prof.aimError * rand(-1, 1) * [1.3, 0.9, 0.6][lvl];
            m.aim = m.kickAim = Math.atan2(uy, ux) + err;
            p.ctrl.press('a');
            m.kickAt = -1;
          }
        }
      } else m.kickAt = -1;
      // Normal and Hard sometimes dash to a loose ball far away
      const far = Math.hypot(sb.x - m.x, sb.y - m.y);
      if (lvl > 0 && far > 380 && m.dash.ready && chance(dt * [0, 0.08, 0.25][lvl])) {
        const ax = sb.x - m.x, ay = sb.y - m.y, al = Math.hypot(ax, ay) || 1;
        m.dash.start({ sx: ax / al, sy: ay / al, x: m.x, y: m.y, actor: m.a });
      }
    }
    const dx = tx - m.x, dy = (ty - m.y) / Y_K, dd = Math.hypot(dx, dy);
    if (dd < 6) { p.ctrl.move(0, 0); return; }
    let ang = Math.atan2(dy, dx) + Math.sin(this.t * 2.1 + m.p.index * 1.7) * prof.aimError * 0.35;
    const k = clamp(dd / 70, 0, 1) * speed;
    p.ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
    if (m.aim != null) p.ctrl.move(Math.cos(m.aim) * 0.6, Math.sin(m.aim) * 0.6);
  }

  // --- drawing -------------------------------------------------------------------------
  draw(g) {
    this.drawBackground(g);
    const b = this.ball;
    for (let team = 0; team < 2; team++) this.drawGoal(g, team, 'back');
    if (!b.hidden) this.drawBallShadow(g);
    if (this.phase === 'play') for (const m of this.humans) this.drawChargeRing(g, m);
    const items = this.members.map((m) => ({ y: m.y, f: () => this.drawMember(g, m) }));
    if (!b.hidden) items.push({ y: b.y + 1, f: () => this.drawBall(g) });
    for (let team = 0; team < 2; team++) items.push({ y: CY + MOUTH + 2, f: () => this.drawGoal(g, team, 'front') });
    items.sort((p, q) => p.y - q.y);
    for (const it of items) it.f();
    // kid help: an A over the ball when it's in reach
    if (this.phase === 'play' && !b.hidden && this.humans.some((m) => this.inReach(m) && m.kickCd <= 0)) {
      ui.glyph(g, 'a', b.x, b.y - b.z - BALL_R * 2 - 34, 46, { pulse: true });
    }
    for (const m of this.members) {
      if (m.p.isAI && this.t > 4) continue;
      const h = m.a.anchor('head');
      const up = (m.a.emotes.length ? 52 : 0) + (m.a.speech ? 60 : 0);
      ui.playerTag(g, m.p, h.x, h.y - 20 - up);
    }
  }

  drawMember(g, m) {
    m.a.draw(g, { ring: TEAMS[m.team].color });
  }

  drawChargeRing(g, m) {
    if (m.charge <= 0.05) return;
    const rx = m.r * 1.15, ry = rx * 0.42;
    g.save(); g.translate(m.x, m.y + 2);
    g.lineWidth = 8; g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
    g.strokeStyle = m.charge >= 1 ? '#ffd23f' : TEAMS[m.team].color;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + m.charge * TAU); g.stroke();
    g.restore();
    if (m.charge >= 1 && Math.random() < 0.3) particles.burst(m.x + rand(-30, 30), m.y - rand(10, 60), { type: 'sparkle', count: 1, colors: ['#ffd23f', '#ffffff'], size: [8, 14], speed: [10, 40], life: [0.3, 0.5] });
  }

  drawBallShadow(g) {
    const b = this.ball;
    const k = clamp(1 - b.z / 500, 0.35, 1);
    g.save(); g.globalAlpha = 0.28 * k; g.fillStyle = NAVY;
    g.beginPath(); g.ellipse(b.x, b.y + 2, BALL_R * 0.95 * k, BALL_R * 0.32 * k, 0, 0, TAU); g.fill();
    g.restore();
  }

  drawBall(g) {
    const b = this.ball;
    const sq = b.z < 30 ? b.sq : b.sq * 0.4;
    const sx = 1 + sq * 0.16, sy = 1 - sq * 0.16;
    g.save();
    g.translate(b.x, b.y - b.z - BALL_R * sy);
    g.scale(sx, sy);
    const img = art('prop/bbs-beach-ball');
    if (img) {
      g.rotate(b.spin);
      g.drawImage(img, -BALL_R, -BALL_R, BALL_R * 2, BALL_R * 2);
    } else drawBeachBall(g, BALL_R, b.spin);
    g.restore();
  }

  /** A goal frame and net. 'back': the net and far post (behind everyone); 'front': near side net, near post, crossbar. */
  drawGoal(g, team, part) {
    const gx = goalX(team), s = -atk(team), T = TEAMS[team];
    const wob = this.netWob[team], w = wob > 0 ? Math.sin(this.t * 28) * wob * 10 : 0;
    const img = art(T.goal);
    if (img) {
      if (part !== 'back') return;
      g.save();
      if (team === 1) { g.translate(W, 0); g.scale(-1, 1); }
      // goal box (pink end): x 0-160, y 415-845; the blue end is its mirror image
      const sxw = 1 + Math.max(0, w) * 0.004;
      g.translate(160, 845); g.scale(sxw, 1); g.translate(-160, -845);
      g.drawImage(img, 0, 415, 160, 430);
      g.restore();
      return;
    }
    const yF = CY - MOUTH, yN = CY + MOUTH;
    const lx = s * LEAN;                       // post tops lean back
    const bx = gx + s * DEPTH + s * w;         // back of the net
    const backH = BAR * 0.5;
    const Ft = { x: gx + lx, y: yF - BAR }, Nt = { x: gx + lx, y: yN - BAR };
    const BF = { x: bx, y: yF + 12 }, BN = { x: bx, y: yN - 6 };
    const BFt = { x: bx + s * 6, y: BF.y - backH + w * 0.5 }, BNt = { x: bx + s * 6, y: BN.y - backH + w * 0.5 };
    const net = (pts) => {
      g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath();
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
      g.save(); g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2.5;
      const x0 = Math.min(...pts.map((q) => q.x)) - 20, x1 = Math.max(...pts.map((q) => q.x)) + 20;
      const y0 = Math.min(...pts.map((q) => q.y)) - 20, y1 = Math.max(...pts.map((q) => q.y)) + 20;
      for (let k = x0 - (y1 - y0); k < x1; k += 22) {
        g.beginPath(); g.moveTo(k, y0); g.lineTo(k + (y1 - y0), y1); g.stroke();
        g.beginPath(); g.moveTo(k + (y1 - y0), y0); g.lineTo(k, y1); g.stroke();
      }
      g.restore();
      g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath();
      g.strokeStyle = 'rgba(36,22,63,0.45)'; g.lineWidth = 3; g.stroke();
    };
    const post = (x0, y0, x1, y1, wdt = 13) => {
      g.lineCap = 'round';
      g.strokeStyle = NAVY; g.lineWidth = wdt + 7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = T.color; g.lineWidth = wdt; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      // candy stripes
      g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = wdt * 0.55; g.setLineDash([9, 13]);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
    };
    g.save();
    if (part === 'back') {
      net([{ x: gx, y: yF }, Ft, BFt, BF]);           // far side
      net([BF, BFt, BNt, BN]);                       // back
      net([Ft, Nt, BNt, BFt]);                       // roof
      post(gx, yF, Ft.x, Ft.y);
      // sand under the mouth
      g.globalAlpha = 0.18; g.fillStyle = NAVY;
      g.beginPath(); g.moveTo(gx, yF); g.lineTo(BF.x, BF.y); g.lineTo(BN.x, BN.y); g.lineTo(gx, yN); g.closePath(); g.fill();
    } else {
      net([{ x: gx, y: yN }, Nt, BNt, BN]);          // near side
      post(gx, yN, Nt.x, Nt.y);
      post(Ft.x, Ft.y, Nt.x, Nt.y, 11);              // crossbar
      // little pennants on the post tops
      for (const q of [Ft, Nt]) {
        g.fillStyle = T.color; g.strokeStyle = NAVY; g.lineWidth = 3;
        const f = Math.sin(this.t * 6 + q.y) * 4;
        g.beginPath(); g.moveTo(q.x, q.y - 4); g.lineTo(q.x, q.y - 34); g.lineTo(q.x - s * 30, q.y - 24 + f); g.closePath(); g.fill(); g.stroke();
      }
    }
    g.restore();
  }

  drawBackground(g) {
    const own = art('bg/beach-ball-soccer');
    if (own) { g.drawImage(own, 0, 0, W, H); return; }
    const beach = art('bg/sandcastle-beach');
    if (!this.pitchLayer || this.pitchLayer.beach !== beach) this.pitchLayer = { beach, cv: this.buildPitch(beach) };
    g.drawImage(this.pitchLayer.cv, 0, 0);
  }

  buildPitch(beach) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    if (beach) g.drawImage(beach, 0, 0, W, H);
    else {
      let gr = g.createLinearGradient(0, 0, 0, 160);
      gr.addColorStop(0, '#5cc0ff'); gr.addColorStop(1, '#a8e2ff');
      g.fillStyle = gr; g.fillRect(0, 0, W, 160);
      gr = g.createLinearGradient(0, 155, 0, 340);
      gr.addColorStop(0, '#13a4d8'); gr.addColorStop(1, '#5fd6e0');
      g.fillStyle = gr; g.fillRect(0, 155, W, 190);
      g.fillStyle = '#ffffff';
      for (let x = 0; x < W; x += 60) { g.beginPath(); g.ellipse(x + 30, 335, 40, 12, 0, 0, TAU); g.fill(); }
      g.fillStyle = '#e8c88f'; g.fillRect(0, 340, W, 50);
      gr = g.createLinearGradient(0, 380, 0, H);
      gr.addColorStop(0, '#f6d58e'); gr.addColorStop(1, '#f1c879');
      g.fillStyle = gr; g.fillRect(0, 380, W, H - 380);
      for (let i = 0; i < 2; i++) { ui.cloud(g, 220 + i * 1450, 80, 1.1, '#ffffff', 0.95); }
    }
    // raked chalky lines in the sand
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.78)'; g.lineWidth = 8; g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeRect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0);
    g.beginPath(); g.moveTo(CX, P.y0); g.lineTo(CX, P.y1); g.stroke();
    g.beginPath(); g.ellipse(CX, CY, 150, 105, 0, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(CX, CY, 12, 8, 0, 0, TAU); g.fill();
    for (const team of [0, 1]) {
      const gx = goalX(team), d = atk(team);
      g.beginPath(); g.ellipse(gx, CY, 230, 220, 0, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); g.stroke();
      // team colour wash in front of each goal
      g.save(); g.globalAlpha = 0.12; g.fillStyle = TEAMS[team].color;
      g.beginPath(); g.ellipse(gx, CY, 230, 220, 0, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); g.fill(); g.restore();
    }
    g.restore();
    // low rope on little stakes along both sidelines (the side walls)
    for (const y of [P.y0 - 8, P.y1 + 22]) {
      g.save();
      g.strokeStyle = NAVY; g.lineWidth = 7;
      g.beginPath();
      for (let x = P.x0 - 40; x <= P.x1 + 40; x += 20) { const k = ((x - P.x0 + 40) % 160) / 160; g.lineTo(x, y - 22 + Math.sin(k * Math.PI) * 7); }
      g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.setLineDash([16, 12]); g.stroke();
      g.setLineDash([]);
      for (let x = P.x0 - 40; x <= P.x1 + 40; x += 160) {
        g.fillStyle = '#c98a52'; g.strokeStyle = NAVY; g.lineWidth = 3;
        ui.roundRect(g, x - 6, y - 30, 12, 34, 4); g.fill(); g.stroke();
        g.fillStyle = x < CX ? TEAMS[0].color : TEAMS[1].color;
        g.beginPath(); g.arc(x, y - 32, 7, 0, TAU); g.fill(); g.stroke();
      }
      g.restore();
    }
    return cv;
  }

  // --- HUD (screen space) ----------------------------------------------------------------
  drawHUD(g) {
    const PW = 420, PH = 112;
    for (let team = 0; team < 2; team++) {
      const T = TEAMS[team];
      const x = team === 0 ? W / 2 - 110 - PW : W / 2 + 110, y = 16;
      const pop = this.scorePop[team];
      g.save();
      if (pop > 0) { const k = 1 + ease.outBack(pop) * 0.06; g.translate(x + PW / 2, y + PH / 2); g.scale(k, k); g.translate(-(x + PW / 2), -(y + PH / 2)); }
      ui.panel(g, x, y, PW, PH, { r: 30, fill: T.light, stroke: T.dark, lineWidth: 6 });
      const inner = team === 0 ? x + PW - 62 : x + 62;
      ui.text(g, String(this.score[team]), inner, y + PH / 2 + 4, { size: 82, color: T.color, strokeWidth: 10, weight: 800 });
      const nx = team === 0 ? x + 24 : x + PW - 24, al = team === 0 ? 'left' : 'right';
      ui.text(g, T.name, nx, y + 32, { size: 32, color: T.color, align: al, strokeWidth: 7, weight: 800 });
      const ms = this.members.filter((m) => m.team === team);
      const step = Math.min(64, 270 / Math.max(1, ms.length));
      ms.forEach((m, i) => {
        const cx = team === 0 ? x + 44 + i * step : x + PW - 44 - i * step;
        ui.drawPortrait(g, m.p, cx, y + 78, 24, { expr: this.phase === 'goal' && this.lastScorer === team ? 'happy' : 'neutral', ring: m.p.ghost ? '#ffffff' : m.p.color, ringWidth: 4 });
      });
      g.restore();
    }
    if (this.golden && this.phase !== 'over') {
      ui.panel(g, W / 2 - 120, 126, 240, 44, { r: 22, fill: '#ffd23f', lineWidth: 5 });
      ui.text(g, 'Golden goal!', W / 2, 149, { size: 28, color: NAVY, stroke: false, weight: 800 });
    }
    // how to play, for the first few seconds
    if (this.humans.length && this.playT > 0.3 && this.playT < 6.5 && this.phase === 'play' && !this.golden) {
      const al = clamp(Math.min(6.5 - this.playT, (this.playT - 0.3) * 4), 0, 1);
      g.save(); g.globalAlpha = al;
      ui.panel(g, W / 2 - 400, 960, 800, 74, { r: 37, fill: '#fff8ec' });
      ui.glyph(g, 'a', W / 2 - 350, 997, 50);
      ui.text(g, 'Kick', W / 2 - 310, 999, { size: 34, color: NAVY, align: 'left', stroke: false, weight: 700 });
      ui.text(g, '(hold for a super kick)', W / 2 - 228, 999, { size: 26, color: '#6b5a85', align: 'left', stroke: false, weight: 600 });
      ui.glyph(g, 'b', W / 2 + 160, 997, 50);
      ui.text(g, 'Dash bump!', W / 2 + 200, 999, { size: 34, color: NAVY, align: 'left', stroke: false, weight: 700 });
      g.restore();
    }
    const bn = this.banner;
    if (bn) {
      ui.banner(g, bn.text, bn.t, { y: 430, size: bn.text === 'GOAL!' ? 190 : 120, color: bn.color });
      if (bn.sub && bn.t > 0.3) ui.text(g, bn.sub, W / 2, 560, { size: 52, color: '#ffffff', strokeWidth: 10, weight: 800 });
    }
  }
}

/** A procedural beach ball: six panels around a white cap, spun in plane. */
function drawBeachBall(g, r, spin) {
  g.save();
  g.rotate(spin);
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * TAU, a1 = ((i + 1) / 6) * TAU;
    g.beginPath(); g.moveTo(0, 0);
    g.arc(0, 0, r, a0, a1);
    g.closePath();
    g.fillStyle = BALL_COLS[i]; g.fill();
  }
  // curved seams
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(Math.cos(a + 0.25) * r * 0.6, Math.sin(a + 0.25) * r * 0.6, Math.cos(a) * r, Math.sin(a) * r);
    g.stroke();
  }
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 2.5; g.stroke();
  g.restore();
  // fixed light: shading and a shine (not spun)
  const sh = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.75, 'rgba(36,22,63,0.04)'); sh.addColorStop(1, 'rgba(36,22,63,0.22)');
  g.fillStyle = sh; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath(); g.ellipse(-r * 0.38, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
}
