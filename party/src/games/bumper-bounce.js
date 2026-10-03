// Bumper Bounce - slippery top-down bump-off on a floating frosted cake.
// Hip-bump rivals off, don't fall off yourself, and watch the frosting edge crumble!
//
// Art hooks (optional; procedural fallbacks ship today):
//   bg/bumper-bounce  prop/arena-cake (else prop/cake-platform)  prop/seat-cloud
//   prop/arena-cake-crumb (crumbling edge + falling chunks)  prop/danger-ring (next edge)
// New-pose hooks (fall back to existing poses): 'hip-bump' -> idle, 'sit' -> idle,
//   'tumble' -> fall, 'knockback' (bumped: skid back, teeter) -> balance -> hurt
//
// A bump is a hip bump (as on the thumbnail) and reads in three beats: the
// dasher slides in hip-first, then swings the hip again on contact;
// a comic POW burst + hit-stop at the contact point; the victim freezes in a
// lean-back teeter while skidding away, kicking up frosting.
import { winsText } from '../state.js';
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import { charById } from '../data/characters.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { input } from '../engine/input.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { clamp, lerp, damp, approach, rand, pick, chance, ease, TAU } from '../engine/util.js';
import { depthScale } from '../engine/camera.js';

export const meta = {
  id: 'bumper-bounce',
  title: 'Bumper Bounce',
  category: 'party',
  type: 'Last one standing',
  goal: 'Bump everyone off the floating cake!',
  controls: [['stick', 'Slide around'], ['a', 'Hip bump!']],
  tips: ['You slide on the frosting - steer early!', 'Slide in with a hip bump to knock friends off!', 'The edge crumbles - stay near the middle!'],
  music: 'bouncy',
  duration: 'Up to 60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = w / 400, hh = h / s;
    g.translate(x, y); g.scale(s, s);
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#6cc5ff'); gr.addColorStop(1, '#d9f1ff');
    g.fillStyle = gr; g.fillRect(0, 0, 400, hh);
    ui.cloud(g, 70, hh * 0.85, 0.7, '#fff', 0.95); ui.cloud(g, 330, hh * 0.9, 0.8, '#fff', 0.95);
    ui.cloud(g, 60, hh * 0.18, 0.4, '#fff', 0.8);
    const cx = 200, cy = hh * 0.5, R = 130, k = 0.62;
    drawPlatformShape(g, cx, cy, R, k, 46 * (R / 500) * 1.6, 0, 0, 0);
    // two bumpers
    const bob = Math.sin((t || 0) * 5) * 4;
    for (const [bx, by, col] of [[cx - 38 - bob, cy + 6, '#ff6fb1'], [cx + 38 + bob, cy + 6, '#3fa7ff']]) {
      g.fillStyle = 'rgba(36,22,63,0.25)'; g.beginPath(); g.ellipse(bx, by + 2, 24, 8, 0, 0, TAU); g.fill();
      g.fillStyle = col; g.strokeStyle = '#24163f'; g.lineWidth = 4;
      g.beginPath(); g.arc(bx, by - 26, 24, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(bx - 8, by - 30, 6, 0, TAU); g.arc(bx + 8, by - 30, 6, 0, TAU); g.fill();
      g.fillStyle = '#24163f'; g.beginPath(); g.arc(bx - 7, by - 29, 3, 0, TAU); g.arc(bx + 9, by - 29, 3, 0, TAU); g.fill();
    }
    const pk = ((t || 0) * 1.5) % 1;
    g.save(); g.translate(cx, cy - 22); g.scale(0.6 + pk * 0.5, 0.6 + pk * 0.5); g.globalAlpha = 1 - pk;
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#24163f'; g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 11 : 24; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke(); g.restore();
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const CX = 960, CY = 505, K = 0.62;      // platform centre (screen) and 3/4 squash
const R0 = 500;                          // starting platform radius (world px)
const THICK = 84;                        // visible cake side
const ACCEL = 1350, DRAG = 2.5;          // slippery but controllable
const DASH_V = 700, DASH_T = 0.3, DASH_CD = 1.2;
const DASH_POSE_T = 0.5, SHOVE_T = 0.45;   // how long the hip-first slide / contact hip swing read
const KNOCK_T = 0.7, KNOCK_STUN = 0.45;    // victim's teeter pose / reduced control
const POW_T = 0.32;
const FALL_T = 0.95;
const TIME_CAP = 60;
// [time, radius] - the frosting crumbles in stages; each is telegraphed 2.2 s ahead
const STAGES = [[20, 430], [30, 365], [40, 305], [48, 250]];
const TELEGRAPH = 2.2;
const SUDDEN_AT = 54, SUDDEN_R = 55;
// prop/arena-cake (997x1000, near top-down with a thin side band at the bottom):
// the frosted top face's outer rim spans x 0..997, y 3..912 in the image.
const ARENA_ART = { cx: 498, cy: 457, rx: 498, ry: 455 };
// Thin 1024px hazard ring: measured inner edge, relative to canvas half-width.
const RING_IN = 0.867188;
const CHUNK_T = 1.3;

const NEW_POSE_FALLBACK = { dash: 'push', sit: 'idle', tumble: 'fall' };
const poseName = (n) => (POSE_NAMES.includes(n) ? n : NEW_POSE_FALLBACK[n] || 'idle');

export class Game {
  constructor(api) {
    this.api = api;
    this.real = api.players;
    // With one human, a friendly Troll joins as a bumper so there is someone to bump.
    this.npc = null;
    let players = this.real;
    if (players.length < 2) {
      this.npc = { index: players.length, tag: 'TROLL', color: '#6f7d3c', charId: 'troll', isAI: true, aiLevel: 0, ctrl: input.createAI(910) };
      players = [...players, this.npc];
    }
    this.players = players;
    const n = players.length;
    this.n = n;
    this.t = 0; this.playT = 0;
    this.scale = n <= 2 ? 1.12 : n <= 4 ? 1.02 : n <= 6 ? 0.8 : 0.7;
    this.cam = api.camera; if (this.cam) { this.cam.maxZoom = 1.3; }
    this.R = R0; this.Rt = R0;
    this.stage = 0; this.tele = null; this.crumbleFlash = 0;
    this.ends = null;           // set when the round is decided
    this.outCount = 0;
    this.firstFallT = null;
    this.bumpCd = new Map();
    this.pows = [];   // comic impact bursts
    this.chunks = []; // cake chunks breaking off the edge (prop/arena-cake-crumb)
    this.sudden = false;
    this.sprinkles = Array.from({ length: 90 }, () => ({ a: rand(TAU), d: Math.sqrt(rand()) * 0.94, c: pick(RAINBOW), r: rand(TAU) }));
    this.cracks = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * TAU + rand(-0.15, 0.15), len: rand(0.5, 1), seed: rand(100) }));
    this.ents = players.map((p, i) => {
      const ang = (i / n) * TAU - Math.PI / 2 + 0.3;
      const rr = n === 2 ? 190 : 250;
      const sc = this.scale * (p.charId === 'troll' ? 0.58 : 1);
      const a = new Actor(p, { scale: sc });
      const sc0 = sc;
      const r = 30 + 18 * sc;
      const e = {
        p, a, i, sc: sc0, x: Math.cos(ang) * rr, y: Math.sin(ang) * rr * 0.9, vx: 0, vy: 0, r, dash: 0, cd: 0, stun: 0, dirx: -Math.cos(ang), diry: -Math.sin(ang),
        state: 'alive', ft: 0, elimAt: Infinity, fx: 0, fy: 0, fvx: 0, fvy: 0, seat: null, seatT: 0, brain: new Brain(p),
        goal: null, dawdle: 0, edgeRisk: 0, exclaimCd: 0, ready: false, hitFlash: 0, trailT: 0, knock: 0, knockFace: 1, skidT: 0,
      };
      a.facing = Math.cos(ang) > 0 ? -1 : 1;
      this.placeActor(e); a.snap();
      return e;
    });
    this.clouds = Array.from({ length: 9 }, (_, i) => ({ x: rand(W), y: 760 + rand(0, 300), s: rand(1.4, 2.8), v: rand(6, 16), a: rand(0.8, 1) }));
    this.birds = [];
  }

  // ------------------------------------------------------------------ helpers
  toScreen(x, y) { return [CX + x, CY + y * K]; }
  placeActor(e) {
    const [sx, sy] = this.toScreen(e.x, e.y);
    e.a.x = sx; e.a.y = sy;
    if (e.state === 'alive') e.a.scale = e.sc * depthScale(sy, { top: 190, near: 840, far: 0.88, nearScale: 1.06 });
  }
  alive() { return this.ents.filter((e) => e.state === 'alive'); }

  // ------------------------------------------------------------------- update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    if (!this.ends) this.playT += dt;
    const pt = this.playT;
    this.crumbleFlash = Math.max(0, this.crumbleFlash - dt);
    for (const c of this.clouds) { c.x -= c.v * dt; if (c.x < -300) c.x = W + 300; }

    if (!this.ends) this.updatePlatform(dt, pt);
    for (const p of this.pows) p.t += dt;
    for (const c of this.chunks) { c.t += dt; c.vy += 1500 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; }
    this.chunks = this.chunks.filter((c) => c.t < CHUNK_T);
    this.pows = this.pows.filter((p) => p.t < POW_T);
    this.R = approach(this.R, this.Rt, dt * (this.Rt < this.R ? 520 : 0));

    for (const e of this.ents) {
      if (e.state !== 'alive') continue;
      if (e.p.isAI && !this.ends) this.aiThink(e, dt);
      this.moveEnt(e, dt);
    }
    this.collide(dt);
    for (const e of this.ents) {
      if (e.state === 'alive') {
        this.edgeCheck(e);
        this.placeActor(e);
        this.animAlive(e, dt);
      } else if (e.state === 'falling') this.updateFall(e, dt);
      else if (e.state === 'out') this.updateSeat(e, dt);
      e.a.update(dt);
    }

    this.frameCamera();
    // round decided?
    if (!this.ends) {
      const alive = this.alive();
      if (alive.length <= 1) this.decide(alive);
      else if (pt >= TIME_CAP) this.decide(alive, true);
    } else {
      this.ends.t += dt;
      if (this.ends.t >= this.ends.wait && !this.ends.done) this.finishNow();
    }
  }

  frameCamera() {
    const cam = this.cam; if (!cam) return;
    const live = this.alive();
    if (!live.length) return;
    const pts = live.map((e) => { const [sx, sy] = this.toScreen(e.x, e.y); return { x: sx, y: sy - 50 }; });
    if (this.ends && this.ends.winner) { cam.follow(pts[0].x, pts[0].y, 1.3, 2.5); return; }
    cam.frame(pts, 420, 1.8);
  }

  postUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) {
      if (e.state === 'falling') this.updateFall(e, dt);
      else if (e.state === 'out') this.updateSeat(e, dt);
      e.a.update(dt);
    }
  }

  updatePlatform(dt, pt) {
    // telegraph the next stage
    const st = STAGES[this.stage];
    if (st) {
      const left = st[0] - pt;
      if (left <= TELEGRAPH && !this.tele) {
        this.tele = { at: st[0], R: st[1], crack: 0, n: 0 };
        sfx('crack'); fx.shake(5, 0.3);
      }
      if (this.tele) {
        const k = 1 - left / TELEGRAPH;
        this.tele.k = clamp(k, 0, 1);
        this.tele.n -= dt;
        if (this.tele.n <= 0) {
          this.tele.n = lerp(0.45, 0.16, this.tele.k);
          fx.shake(2 + 5 * this.tele.k, 0.18);
          if (Math.random() < 0.6) sfx('crack');
          // little crumbs
          const a = rand(TAU), rr = rand(this.tele.R, this.R);
          const [sx, sy] = this.toScreen(Math.cos(a) * rr, Math.sin(a) * rr);
          particles.burst(sx, sy + 8, { type: 'shard', count: 2, colors: ['#ffd9ec', '#f4c58a'], speed: [30, 120], size: [6, 10] });
        }
        if (left <= 0) this.crumble(st[1]);
      }
    } else if (pt >= SUDDEN_AT) {
      if (!this.sudden) { this.sudden = true; sfx('frosting-crumble', { fallback: 'crumble' }); fx.shake(10, 0.5); particles.popText(W / 2, 250, 'Sudden death!', '#ff4d6d', 70); }
      const k = clamp((pt - SUDDEN_AT) / (TIME_CAP - SUDDEN_AT), 0, 1);
      const target = lerp(STAGES[STAGES.length - 1][1], SUDDEN_R, k);
      this.Rt = this.R = Math.min(this.R, target);
      if (Math.random() < dt * 8) {
        const a = rand(TAU);
        const [sx, sy] = this.toScreen(Math.cos(a) * this.R, Math.sin(a) * this.R);
        particles.burst(sx, sy + 10, { type: 'shard', count: 2, colors: ['#ffd9ec', '#f4c58a'], speed: [30, 120], size: [6, 10] });
        this.addChunk(a, this.R - 10, rand(28, 44));
      }
    }
  }

  crumble(newR) {
    const oldR = this.Rt;
    this.Rt = newR; this.stage++; this.tele = null; this.crumbleFlash = 0.4;
    sfx('frosting-crumble', { fallback: 'crumble' }); sfx('boom'); fx.shake(16, 0.6); fx.flash('#ffffff', 0.1);
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * TAU, rr = rand(newR, oldR);
      const [sx, sy] = this.toScreen(Math.cos(a) * rr, Math.sin(a) * rr);
      particles.burst(sx, sy + 10, { type: 'shard', count: 2, colors: ['#ffe3f1', '#ff9fcd', '#f4c58a', '#c98a52'], speed: [60, 300], size: [8, 16], vy: 80 });
    }
    particles.popText(W / 2, 180, 'Crumble!', '#ffd23f', 64);
    // chunks of cake break off all around the old rim and tumble away
    const nC = Math.round(oldR / 16);
    for (let i = 0; i < nC; i++) this.addChunk((i / nC) * TAU + rand(-0.08, 0.08), lerp(newR, oldR, rand(0.35, 0.8)), (oldR - newR) * rand(0.75, 1.05));
  }

  addChunk(a, rr, size) {
    const [sx, sy] = this.toScreen(Math.cos(a) * rr, Math.sin(a) * rr);
    const back = Math.sin(a) < -0.15;   // far rim: pop up, then drop behind the cake
    this.chunks.push({ x: sx, y: sy, vx: Math.cos(a) * rand(80, 220), vy: back ? rand(-420, -300) : rand(-160, -40), rot: rand(-0.4, 0.4), vr: rand(-5, 5), size, t: 0, back });
  }

  moveEnt(e, dt) {
    const ctrl = e.p.ctrl;
    e.stun = Math.max(0, e.stun - dt); e.dash = Math.max(0, e.dash - dt); e.cd = Math.max(0, e.cd - dt);
    e.exclaimCd = Math.max(0, e.exclaimCd - dt); e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.knock = Math.max(0, e.knock - dt);
    if (e.knock > 0 && Math.hypot(e.vx, e.vy) > 60) {
      // skid marks: frosting kicked up at the feet while sliding back
      e.skidT -= dt;
      if (e.skidT <= 0) {
        e.skidT = 0.04;
        const [sx, sy] = this.toScreen(e.x, e.y);
        particles.burst(sx, sy, { type: 'dust', count: 2, speed: [20, 90], size: [12, 22], colors: ['#ffffff', '#ffe3f1'] });
      }
    }
    let ix = this.ends ? 0 : ctrl.x, iy = this.ends ? 0 : ctrl.y;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    const k = e.stun > 0 ? 0.25 : 1;
    if (m > 0.2) {
      // counter-steering is a bit stronger so it stays controllable
      const dot = (e.vx * ix + e.vy * iy);
      const brake = dot < 0 ? 1.5 : 1;
      e.vx += ix * ACCEL * k * brake * dt; e.vy += iy * ACCEL * k * brake * dt;
      e.dirx = ix / m; e.diry = iy / m;
    }
    const sp0 = Math.hypot(e.vx, e.vy);
    if (sp0 > 40) { e.dirx = lerp(e.dirx, e.vx / sp0, 0.15); e.diry = lerp(e.diry, e.vy / sp0, 0.15); }
    // dash
    if (!this.ends && ctrl.pressed('a') && e.cd <= 0 && e.stun <= 0) this.doDash(e, m > 0.25 ? [ix / m, iy / m] : [e.dirx, e.diry]);
    const drag = e.dash > 0 ? DRAG * 0.45 : DRAG;
    const f = Math.exp(-drag * dt);
    e.vx *= f; e.vy *= f;
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.dash > 0) {
      e.trailT -= dt;
      if (e.trailT <= 0) {
        e.trailT = 0.025;
        const [sx, sy] = this.toScreen(e.x, e.y);
        particles.burst(sx, sy, { type: 'spark', count: 1, colors: [e.p.color, '#ffffff'], speed: [10, 60], life: [0.2, 0.35], size: [5, 9] });
        if (Math.random() < 0.4) particles.burst(sx, sy, { type: 'dust', count: 1, speed: [10, 50], size: [10, 18] });
      }
    }
    if (!e.ready && e.cd <= 0 && e.state === 'alive') { e.ready = true; }
    if (e.cd > 0) e.ready = false;
  }

  doDash(e, dir) {
    const sp = Math.hypot(e.vx, e.vy);
    e.vx += dir[0] * DASH_V; e.vy += dir[1] * DASH_V;
    const ns = Math.hypot(e.vx, e.vy);
    if (ns > 1150) { e.vx *= 1150 / ns; e.vy *= 1150 / ns; }
    void sp;
    e.dash = DASH_T; e.cd = DASH_CD; e.ready = false;
    e.dirx = dir[0]; e.diry = dir[1];
    e.a.playOnce('hip-bump', DASH_POSE_T); e.a.squash(-0.25);
    if (dir[0] !== 0) e.a.facing = dir[0] > 0 ? 1 : -1;
    sfx('dash'); if (!e.p.isAI) e.p.ctrl.rumble(0.25, 80);
    const [sx, sy] = this.toScreen(e.x, e.y);
    particles.burst(sx, sy, { type: 'dust', count: 6, speed: [60, 160], size: [12, 22] });
    particles.ring(sx, sy, e.p.color, 90, 0.3);
  }

  animAlive(e, dt) {
    const a = e.a;
    const sp = Math.hypot(e.vx, e.vy);
    if (this.ends && this.ends.winner === e) { if (a.pose !== 'celebrate') { a.clearEmotes(); a.setPose('celebrate'); } return; }
    if (e.knock > 0) { if (a.pose !== 'knockback') a.setPose('knockback'); a.facing = e.knockFace; return; }
    if (e.stun > 0) { if (!a._once && a.pose !== 'dizzy') a.setPose('hurt'); return; }
    if (e.state === 'alive' && !a._once) a.moveAnim(e.vx, e.vy * K, 520, { run: sp > 330 });
    if (Math.abs(e.vx) > 30) a.facing = e.vx > 0 ? 1 : -1;
    void dt;
  }

  // ---------------------------------------------------------------- collisions
  collide(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      if (A.state !== 'alive' || B.state !== 'alive') continue;
      let dx = B.x - A.x, dy = B.y - A.y;
      let d = Math.hypot(dx, dy);
      const minD = A.r + B.r;
      if (d >= minD) continue;
      if (d < 0.001) { dx = rand(-1, 1); dy = rand(-1, 1); d = Math.hypot(dx, dy) || 1; }
      const nx = dx / d, ny = dy / d;
      const ov = minD - d;
      A.x -= nx * ov * 0.5; A.y -= ny * ov * 0.5; B.x += nx * ov * 0.5; B.y += ny * ov * 0.5;
      const vn = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;   // closing speed
      const key = i * 10 + j;
      const cd = this.bumpCd.get(key) ?? -1;
      let impact = 0;
      if (vn > 0) {
        const jn = (1 + 0.5) * vn * 0.5;
        A.vx -= nx * jn; A.vy -= ny * jn; B.vx += nx * jn; B.vy += ny * jn;
        impact = vn;
      }
      // dash bumps add a big kick; the dasher takes a small recoil
      let kick = 0;
      if (A.dash > 0 && vn > -200) { B.vx += nx * 270; B.vy += ny * 270; A.vx -= nx * 100; A.vy -= ny * 100; kick += 270; this.knock(B, A); A.dash = Math.min(A.dash, 0.06); }
      if (B.dash > 0 && vn > -200) { A.vx -= nx * 270; A.vy -= ny * 270; B.vx += nx * 100; B.vy += ny * 100; kick += 270; this.knock(A, B); B.dash = Math.min(B.dash, 0.06); }
      if (impact + kick > 230 && this.t - cd > 0.12) {
        this.bumpCd.set(key, this.t);
        this.impactFx(A, B, nx, ny, impact + kick, kick > 0);
      }
    }
    void dt;
  }

  /** Hip bump landed: the bumper swings the hip again, the victim teeters backward. */
  knock(victim, bumper) {
    const [vx] = this.toScreen(victim.x, victim.y), [bx] = this.toScreen(bumper.x, bumper.y);
    const face = bx >= vx ? 1 : -1;            // victim faces the bumper and leans away
    victim.stun = Math.max(victim.stun, KNOCK_STUN);
    victim.knock = KNOCK_T; victim.knockFace = face; victim.skidT = 0;
    victim.a.clearEmotes(); victim.a.playOnce('knockback', KNOCK_T, 'idle'); victim.a.facing = face;
    victim.a.emote('sweat', KNOCK_T);
    bumper.a.facing = -face;
    bumper.a.playOnce('hip-bump', SHOVE_T); // restart = a second hip swing on contact
  }

  impactFx(A, B, nx, ny, power, big) {
    const s = clamp(power / 1000, 0.15, 1);
    const [ax, ay] = this.toScreen(A.x, A.y), [bx, by] = this.toScreen(B.x, B.y);
    const mx = (ax + bx) / 2, my = (ay + by) / 2 - 50;
    A.a.squash(0.3 + s * 0.4); B.a.squash(0.3 + s * 0.4);
    A.a.flash('#ffffff', 0.12); B.a.flash('#ffffff', 0.12);
    particles.burst(mx, my, { type: 'star', count: 3 + Math.round(s * 7), colors: ['#ffd23f', '#ffffff', '#ff6fb1'], speed: [150, 380 + s * 200] });
    particles.ring(mx, my, '#ffffff', 80 + s * 90, 0.35);
    fx.shake(5 + 14 * s, 0.14 + 0.15 * s);
    if (big) {
      fx.hitstop(0.06 + 0.05 * s); sfx('hit'); sfx('boing', { fallback: 'bounce' });
      this.pows.push({ x: mx, y: my, t: 0, r: 58 + 42 * s, rot: rand(TAU), word: pick(['BUMP!', 'BONK!', 'BOING!', 'POW!']), jag: Array.from({ length: 14 }, () => rand(0.8, 1.15)) });
    }
    else sfx('bonk');
    for (const e of [A, B]) if (!e.p.isAI) e.p.ctrl.rumble(0.3 + 0.5 * s, 120);
    void nx; void ny;
  }

  // --------------------------------------------------------------- falling off
  edgeCheck(e) {
    const d = Math.hypot(e.x, e.y);
    if (d > this.R - 70 && e.exclaimCd <= 0 && Math.hypot(e.vx, e.vy) > 120 && d < this.R + 5) { e.exclaimCd = 1.5; e.a.emote('sweat', 0.7); }
    if (d > this.R + 6) this.startFall(e);
  }

  startFall(e) {
    e.state = 'falling'; e.ft = 0; e.elimAt = this.playT;
    const [sx, sy] = this.toScreen(e.x, e.y);
    e.fx = sx; e.fy = sy; e.fvx = e.vx * 0.25; e.fvy = Math.min(120, e.vy * K * 0.25);
    e.a.clearEmotes(); e.a.playOnce('surprised', 0.3, poseName('tumble'));
    sfx('wheee-fall', { fallback: 'whoosh' }); voice(e.p.charId, 'gasp');
    if (this.cam) this.cam.punch(sx, sy - 40, 1.25, 0.4); if (e.p.isAI === false) e.p.ctrl.rumble(0.9, 300);
    fx.shake(8, 0.25);
    particles.burst(sx, sy, { type: 'shard', count: 7, colors: ['#ffe3f1', '#ff9fcd', '#f4c58a'], speed: [80, 260] });
    particles.popText(sx, sy - 120, 'Whoa!', '#ffffff', 50);
    // everyone else cheers
    for (const o of this.ents) {
      if (o === e) continue;
      if (o.state === 'out') o.a.playOnce('cheer', 0.7, 'clap');
      else if (o.state === 'alive' && !this.ends) { if (chance(0.6)) o.a.playOnce('cheer', 0.5); }
    }
    if (this.firstFallT === null) this.firstFallT = this.playT;
  }

  updateFall(e, dt) {
    e.ft += dt;
    const k = clamp(e.ft / FALL_T, 0, 1);
    e.fvy += 1500 * dt;
    e.fx += e.fvx * dt; e.fy += e.fvy * dt;
    e.fvx *= Math.exp(-1.2 * dt);
    if (e.ft >= FALL_T) {
      e.state = 'out'; e.seatT = 0;
      this.assignSeat(e);
    }
    void k;
  }

  assignSeat(e) {
    const idx = this.outCount++;
    const side = idx % 2 === 0 ? 1 : -1;       // alternate left / right
    const row = Math.floor(idx / 2);
    const tx = side > 0 ? 125 : W - 125;
    const ty = 250 + row * 170;
    e.seat = { x: tx, y: ty, side };
    e.a.scale = e.p.charId === 'troll' ? 0.36 : 0.6;
    e.a.facing = side > 0 ? 1 : -1;
    e.a.alpha = 1;
    const pout = !(this.ends && this.ends.winner);
    e.a.setPose('pout'); e.seatMood = pout ? 'pout' : 'clap'; e.moodT = 2.2;
    e.a.x = tx - side * 400; e.a.y = ty; e.a.snap();
    sfx('whoosh');
  }

  updateSeat(e, dt) {
    const s = e.seat; if (!s) return;
    e.seatT += dt;
    const k = ease.outBack(clamp(e.seatT / 0.7, 0, 1));
    e.a.x = lerp(s.x - s.side * 400, s.x, k); e.a.y = s.y + 8;
    e.moodT -= dt;
    if (e.moodT <= 0 && e.seatMood === 'pout') { e.seatMood = 'clap'; e.a.clearEmotes(); e.a.setPose('clap'); }
    if (e.seatT > 0.7 && !e.landed) { e.landed = true; particles.burst(s.x, s.y - 20, { type: 'sparkle', count: 6, colors: ['#fff', '#ffe066'] }); sfx('pop'); }
  }

  // ------------------------------------------------------------------- the end
  decide(alive, capped = false) {
    let winner = null;
    if (!capped && alive.length === 1) winner = alive[0];
    this.ends = { t: 0, wait: capped ? 1.4 : 1.8, winner, capped, alive: alive.slice(), done: false };
    if (winner) {
      winner.a.clearEmotes(); winner.a.setPose('celebrate');
      sfx('win'); sfx('cheer'); particles.confettiRain(W, 100); fx.slowmo(0.5, 0.6);
    } else if (alive.length) {
      for (const e of alive) { e.a.clearEmotes(); e.a.setPose('celebrate'); }
      sfx('win'); particles.confettiRain(W, 80);
    } else sfx('lose');
  }

  finishNow() {
    this.ends.done = true;
    const E = this.ents;
    const place = (e) => 1 + E.filter((o) => o.elimAt > e.elimAt + 0.15).length;
    let placements = E.map(place);
    if (!this.ends.winner && this.ends.alive.length === 0) {
      // everyone fell at the same time: the last ones to fall share first
      const last = Math.max(...E.map((e) => e.elimAt));
      placements = E.map((e) => (e.elimAt >= last - 0.15 ? 1 : place(e)));
    }
    const stats = E.map((e, i) => (placements[i] === 1 ? (this.ends.capped ? 'Still standing!' : 'Last one on the cake!') : e.elimAt === Infinity ? 'Still standing' : `Fell at ${Math.round(e.elimAt)}s`));
    const n = this.real.length;
    const wn = this.ends.winner || (this.ends.alive[0]);
    const focus = wn ? (() => { const [sx, sy] = this.toScreen(wn.x, wn.y); return { x: sx, y: sy - 60 }; })() : undefined;
    this.api.finish({ placements: placements.slice(0, n), stats: stats.slice(0, n), focus, solo: E[0].elimAt === Infinity ? 9999 : E[0].elimAt });
  }

  destroy() { if (this.npc) input.releaseAI(this.npc.ctrl); }

  // ----------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl, lvl = clamp(p.aiLevel ?? 0, 0, 2);
    if (e.stun > 0) { ctrl.move(0, 0); return; }
    const margin = [80, 110, 135][lvl] + (e.dawdle > 0 ? -30 : 0);
    const look = [0.18, 0.32, 0.45][lvl];
    const R = this.tele ? Math.min(this.R, this.tele.R + (this.tele.k > 0.15 ? 0 : 60)) : this.R;
    const Rs = Math.max(70, R - margin);
    const px = e.x + e.vx * look, py = e.y + e.vy * look;
    const pd = Math.hypot(px, py), cd = Math.hypot(e.x, e.y);

    // think: pick an opponent
    if (e.brain.ready(dt)) {
      let best = null, bd = 1e9;
      for (const o of this.ents) {
        if (o === e || o.state !== 'alive') continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y) + (chance(prof.mistake) ? rand(0, 250) : 0);
        if (d < bd) { bd = d; best = o; }
      }
      e.goal = best;
      e.dawdle = lvl === 0 && chance(prof.mistake) ? rand(1.0, 1.8) : 0;
      e.wx = rand(-0.6, 0.6) * R; e.wy = rand(-0.6, 0.6) * R;
      e.brain.wait(reactionTime(p) * 0.8);
    }
    e.dawdle = Math.max(0, e.dawdle - dt);

    let mx = 0, my = 0, pressDash = false;
    const edgeDanger = pd > Rs || cd > Rs + 10;
    if (edgeDanger && !(e.dawdle > 0 && cd < R - 55)) {
      // head back toward the middle (dawdling Easy bots cut it close)
      const d = Math.hypot(px, py) || 1; mx = -px / d; my = -py / d;
      // brake: cancel outward momentum
      if (e.vx * px + e.vy * py > 0) { mx -= (e.vx / 500) * 0.2; my -= (e.vy / 500) * 0.2; }
    } else if (e.dawdle > 0) {
      // wander about, possibly close to the rim
      const tx = e.wx, ty = e.wy;
      const d = Math.hypot(tx - e.x, ty - e.y);
      if (d > 30) { mx = (tx - e.x) / d * 0.7; my = (ty - e.y) / d * 0.7; }
    } else if (e.goal && e.goal.state === 'alive') {
      const o = e.goal;
      const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy) || 1;
      const od = Math.hypot(o.x, o.y) || 1;
      // approach from the centre side so a bump pushes them outward
      const off = e.r + o.r + 30;
      let tx = o.x - (o.x / od) * off, ty = o.y - (o.y / od) * off;
      if (d < 260 || od < 120) { tx = o.x; ty = o.y; }
      // aim error on easier levels
      tx += Math.sin(this.t * 1.7 + e.i) * prof.aimError * 80; ty += Math.cos(this.t * 1.3 + e.i) * prof.aimError * 80;
      const ddx = tx - e.x, ddy = ty - e.y, dd = Math.hypot(ddx, ddy) || 1;
      const sp = prof.speed;
      mx = ddx / dd * sp; my = ddy / dd * sp;
      if (dd < 40) { mx *= 0.3; my *= 0.3; }
      // dash when lined up
      if (e.cd <= 0 && d > 90 && d < 320) {
        const vs = Math.hypot(e.vx, e.vy);
        const lined = vs < 120 || (e.vx * dx + e.vy * dy) / (vs * d) > 0.75;
        const landX = e.x + dx / d * Math.min(d + 60, 360), landY = e.y + dy / d * Math.min(d + 60, 360);
        const safe = Math.hypot(landX, landY) < R - 15 || chance(prof.mistake * 0.6);
        const rate = [1.3, 3, 6][lvl];
        if (lined && safe && chance(rate * dt)) { pressDash = true; mx = dx / d; my = dy / d; }
      }
    }
    ctrl.move(mx, my);
    if (pressDash) ctrl.press('a');
  }

  // --------------------------------------------------------------------- draw
  draw(g) {
    this.drawBackground(g);
    this.drawChunks(g, true);
    this.drawPlatform(g);
    this.drawChunks(g, false);
    const live = this.ents.filter((e) => e.state === 'alive').sort((a, b) => a.a.y - b.a.y);
    for (const e of live) this.drawAlive(g, e);
    for (const e of this.ents) if (e.state === 'falling') this.drawFalling(g, e);
    for (const p of this.pows) this.drawPow(g, p);
  }

  // Comic-book impact: jagged starburst + speed lines + a word, popping in
  // fast and fading out.
  drawPow(g, p) {
    const k = p.t / POW_T;
    const sc = k < 0.25 ? ease.outBack(k / 0.25) : 1 + (k - 0.25) * 0.15;
    const alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    g.save();
    g.globalAlpha = alpha;
    g.translate(p.x, p.y);
    g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = p.rot + i * TAU / 10, r0 = p.r * (0.9 + k * 0.6), r1 = p.r * (1.35 + k * 0.9);
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.8); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.8); g.stroke();
    }
    g.scale(sc, sc);
    const n = p.jag.length * 2;
    const spikes = (r, inner) => {
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = p.rot + i * TAU / n, rr = (i % 2 ? r * inner : r * p.jag[i >> 1]);
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8);
      }
      g.closePath();
    };
    spikes(p.r, 0.62); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 6; g.strokeStyle = ui.NAVY; g.lineJoin = 'round'; g.stroke();
    spikes(p.r * 0.62, 0.7); g.fillStyle = '#ffffff'; g.fill();
    ui.text(g, p.word, 0, 2, { size: p.r * 0.5, color: '#ff4d6d', weight: 800, strokeWidth: 8 });
    g.restore();
  }

  drawChunks(g, back) {
    const img = art('prop/arena-cake-crumb');
    if (!img) return;     // the shard particles alone are the fallback
    for (const c of this.chunks) {
      if (c.back !== back) continue;
      const k = c.t / CHUNK_T, s = c.size * (1 - 0.5 * k);
      g.save(); g.globalAlpha = 1 - clamp((k - 0.6) / 0.4, 0, 1);
      g.translate(c.x, c.y); g.rotate(c.rot);
      g.drawImage(img, -s / 2, -s * 0.48, s, s * img.height / img.width);
      g.restore();
    }
  }

  drawHUD(g) {
    for (const e of this.ents) if (e.state === 'out') this.drawSeat(g, e);
    this.drawHud(g);
  }

  drawAlive(g, e) {
    const a = e.a;
    // dash charge ring under the feet
    const rx = e.r * 1.25, ry = rx * K;
    const frac = e.cd > 0 ? 1 - e.cd / DASH_CD : 1;
    g.save();
    g.translate(a.x, a.y + 2);
    g.lineWidth = 7; g.lineCap = 'round';
    g.strokeStyle = 'rgba(36,22,63,0.25)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
    if (frac >= 1) {
      const pul = 0.75 + 0.25 * Math.sin(this.t * 9 + e.i);
      g.strokeStyle = '#ffffff'; g.globalAlpha = pul; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
      g.globalAlpha = 0.9; g.strokeStyle = e.p.color; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
    } else {
      g.strokeStyle = e.p.color; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + frac * TAU); g.stroke();
    }
    g.restore();
    if (e.dash > 0) {
      // speed streak
      g.save(); g.globalAlpha = 0.5 * (e.dash / DASH_T); g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(a.x - e.dirx * 40, a.y - 40 - e.diry * 20); g.lineTo(a.x - e.dirx * 120, a.y - 40 - e.diry * 60); g.stroke(); g.restore();
    }
    a.draw(g, { ring: false });
    const top = a.y - a.height - 24 - (a.emotes.length ? 50 : 0);
    ui.playerTag(g, e.p, a.x, top);
  }

  drawFalling(g, e) {
    const k = clamp(e.ft / FALL_T, 0, 1);
    const a = e.a;
    const sc = lerp(1, 0.12, ease.inQuad(k));
    const x = e.fx, y = e.fy;
    g.save();
    g.globalAlpha = 1 - clamp((k - 0.7) / 0.3, 0, 1) * 0.9;
    g.translate(x, y - a.height * 0.5 * sc);
    g.rotate(k * 11 * (e.i % 2 ? 1 : -1));
    g.scale(sc, sc);
    g.translate(-x, -(y - a.height * 0.5 * sc) + 0);
    // draw actor with its feet at (x, y)
    const ox = a.x, oy = a.y;
    a.x = x; a.y = y; a.snap();
    a.draw(g, { shadow: false, ring: false, emotes: false });
    a.x = ox; a.y = oy;
    g.restore();
    if (k < 0.5) { g.save(); g.globalAlpha = 1 - k * 2; ui.playerTag(g, e.p, x, y - a.height - 24); g.restore(); }
  }

  drawSeat(g, e) {
    const s = e.seat, a = e.a;
    const k = clamp(e.seatT / 0.7, 0, 1);
    if (!drawArt(g, 'prop/seat-cloud', a.x, a.y + 40, 190, 120)) ui.cloud(g, a.x - 6, a.y + 34, 0.82, '#ffffff', 0.97);
    void k; void s;
    a.draw(g, { ring: false });
    ui.playerTag(g, e.p, a.x, a.y - a.height - 26 - (a.emotes.length ? 40 : 0));
  }

  drawHud(g) {
    const left = Math.max(0, TIME_CAP - this.playT);
    ui.timer(g, left);
    const aliveFlags = this.ents.map((e) => e.state === 'alive');
    ui.scoreboard(g, this.players, this.ents.map((e) => (e.state === 'alive' ? 'IN' : 'OUT')), { y: 985, out: aliveFlags.map((v) => !v) });
    if (this.tele && this.tele.k > 0.1 && !this.ends) {
      const pul = 1 + Math.sin(this.t * 14) * 0.06;
      g.save(); g.translate(W / 2, 150); g.scale(pul, pul);
      ui.text(g, 'The edge is crumbling!', 0, 0, { size: 48, color: '#ff6f91', weight: 800 });
      g.restore();
    }
    if (this.sudden && !this.ends) ui.text(g, 'SUDDEN DEATH', W / 2, 150, { size: 52, color: '#ff4d6d', weight: 800 });
    if (this.n === 2 && this.npc && this.playT < 3) ui.text(g, 'A friendly Troll joins in!', W / 2, 150, { size: 40, color: '#ffffff' });
    if (this.ends && this.ends.winner) {
      const w = this.ends.winner;
      ui.banner(g, `${winsText(w.p)}!`, this.ends.t, { y: 330, size: 110, color: w.p.color === '#ffffff' ? '#ffd23f' : '#ffd23f' });
    }
  }

  drawBackground(g) {
    const bg = art('bg/bumper-bounce');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      ui.sky(g, '#4fb8ff', '#d9f4ff');
      // sun with rays
      g.save(); g.translate(250, 170); g.globalAlpha = 0.3; g.fillStyle = '#fff7b0';
      for (let i = 0; i < 14; i++) { g.rotate(TAU / 14); g.beginPath(); g.moveTo(70, -12); g.lineTo(200 + Math.sin(this.t * 1.5 + i) * 12, 0); g.lineTo(70, 12); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.fill(); g.restore();
      // far clouds
      for (let i = 0; i < 5; i++) ui.cloud(g, ((i * 520 + this.t * 8) % (W + 500)) - 250, 130 + (i % 3) * 90, 0.9, '#fff', 0.6);
      // balloons drifting up on both sides
      for (let i = 0; i < 6; i++) {
        const bx = i < 3 ? 70 + i * 55 : W - 70 - (i - 3) * 55;
        const by = 900 - (((this.t * 22 + i * 190) % 1000));
        g.save(); g.translate(bx, by);
        g.fillStyle = RAINBOW[(i * 2) % 7]; g.strokeStyle = '#24163f'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(0, 0, 22, 28, 0, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(0, 28); g.lineTo(-4, 38); g.lineTo(4, 38); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(36,22,63,0.5)'; g.beginPath(); g.moveTo(0, 38); g.quadraticCurveTo(10, 60, -4, 82); g.stroke();
        g.restore();
      }
    }
    // shadow of the platform on the clouds far below
    g.save(); g.globalAlpha = 0.16; g.fillStyle = '#3a4a88';
    g.beginPath(); g.ellipse(CX, CY + THICK + 190, this.R * 0.95, this.R * K * 0.62, 0, 0, TAU); g.fill(); g.restore();
    if (!bg) for (const c of this.clouds) ui.cloud(g, c.x, c.y + Math.sin(this.t * 0.4 + c.s) * 6, c.s, '#ffffff', c.a);
  }

  drawPlatform(g) {
    g.save();
    // shake the platform a little during the telegraph
    if (this.tele) { const k = this.tele.k || 0; g.translate(rand(-1, 1) * 2.5 * k, rand(-1, 1) * 1.5 * k); }
    const cake = art('prop/arena-cake'), plat = !cake && art('prop/cake-platform');
    if (cake) {
      // Map the art's top-face rim onto the arena ellipse (R x R*K): players
      // fall exactly where the frosting ends. The side band below keeps the
      // same vertical squash, so it shrinks with the cake as it crumbles.
      const sx = this.R / ARENA_ART.rx, sy = (this.R * K) / ARENA_ART.ry;
      g.drawImage(cake, CX - ARENA_ART.cx * sx, CY - ARENA_ART.cy * sy, cake.width * sx, cake.height * sy);
      if (this.crumbleFlash > 0) { g.globalAlpha = this.crumbleFlash; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(CX, CY, this.R, this.R * K, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
    } else if (plat) {
      // The v3 fallback's broad top fills 93% of its height; preserve the
      // shallow side band while aligning the frosting with the arena ellipse.
      const sx = this.R / (plat.width * 0.495), sy = (this.R * K) / (plat.height * 0.465);
      const dw = plat.width * sx, cut = plat.height * 0.93, y0 = CY - plat.height * 0.465 * sy;
      g.drawImage(plat, 0, 0, plat.width, cut, CX - dw / 2, y0, dw, cut * sy);
      g.drawImage(plat, 0, cut, plat.width, plat.height - cut, CX - dw / 2, y0 + cut * sy - 1, dw, (plat.height - cut) * sx);
    } else {
      drawPlatformShape(g, CX, CY, this.R, K, THICK * (0.6 + 0.4 * this.R / R0), this.t, this.tele, this.crumbleFlash, 1, this.sprinkles, this.cracks);
    }
    // Persistent broken edges progress as the arena loses successive rings.
    if (this.R < R0 - 10) {
      const damage = clamp(Math.ceil((R0 - this.R) / 90), 1, 3);
      drawArt(g, `prop/cake-platform-crumble-${damage}`, CX, CY, this.R * 2, this.R * K * 2, { fit: 'stretch', alpha: 0.9 });
    }
    g.restore();
    // telegraph overlay: the doomed outer band
    const ring = this.tele && art('prop/danger-ring');
    if (ring) {
      // the warning ring's inner edge sits on the new edge; clipped to the
      // doomed band, so the whole band that will fall glows and pulses
      const k = this.tele.k || 0, pul = 0.5 + 0.5 * Math.sin(this.t * (10 + k * 14));
      const ro = this.tele.R / RING_IN;
      g.save();
      g.beginPath();
      g.ellipse(CX, CY, this.R, this.R * K, 0, 0, TAU);
      g.ellipse(CX, CY, this.tele.R - 6, (this.tele.R - 6) * K, 0, 0, TAU, true);
      g.clip('evenodd');
      g.globalAlpha = 0.55 + 0.4 * pul * (0.4 + 0.6 * k);
      g.drawImage(ring, CX - ro, CY - ro * K, ro * 2, ro * 2 * K);
      g.restore();
      this.drawEdgeCrumbs(g, k);
    } else if (this.tele) {
      const k = this.tele.k || 0, pul = 0.5 + 0.5 * Math.sin(this.t * (10 + k * 14));
      g.save();
      g.beginPath();
      g.ellipse(CX, CY, this.R, this.R * K, 0, 0, TAU);
      g.ellipse(CX, CY, this.tele.R, this.tele.R * K, 0, 0, TAU, true);
      g.clip('evenodd');
      g.globalAlpha = 0.25 + 0.3 * pul * k;
      g.fillStyle = '#ff2d55'; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.75;
      g.strokeStyle = '#6b2a1a'; g.lineWidth = 5; g.lineJoin = 'round';
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU + 0.2;
        let rr = this.R + 4; let px = CX + Math.cos(a) * rr, py = CY + Math.sin(a) * rr * K;
        g.beginPath(); g.moveTo(px, py);
        const steps = 5;
        for (let s = 1; s <= steps; s++) {
          rr = lerp(this.R + 4, this.tele.R - 8, s / steps) + Math.sin(i * 7 + s * 3) * 6;
          const aa = a + Math.sin(i * 3 + s * 2.1) * 0.05 * (1 + k);
          g.lineTo(CX + Math.cos(aa) * rr, CY + Math.sin(aa) * rr * K);
        }
        g.stroke();
      }
      g.restore();
      // dashed ring where the new edge will be
      g.save(); g.setLineDash([22, 16]); g.lineDashOffset = -this.t * 40; g.lineWidth = 6; g.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * pul})`;
      g.beginPath(); g.ellipse(CX, CY, this.tele.R, this.tele.R * K, 0, 0, TAU); g.stroke(); g.restore();
    }
  }
  /** Telegraph: the doomed rim visibly breaks into cake chunks that rattle more and more. */
  drawEdgeCrumbs(g, k) {
    const variants = [1, 2, 3, 4].map(n => art(`prop/arena-cake-crumb-${n}`)).filter(Boolean);
    const fallback = art('prop/arena-cake-crumb');
    if (!variants.length && fallback) variants.push(fallback);
    if (!variants.length || k < 0.2) return;
    const band = this.R - this.tele.R, mid = (this.R + this.tele.R) / 2;
    const n = Math.round(mid / 26), s = band * 0.85;
    g.save();
    g.globalAlpha = clamp((k - 0.2) / 0.3, 0, 1);
    // far side first so nearer chunks overlap them
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.sin((a / n) * TAU) - Math.sin((b / n) * TAU));
    for (const i of order) {
      const img = variants[i % variants.length];
      const a = (i / n) * TAU + 0.1;
      const jit = k * k * 4;
      const x = CX + Math.cos(a) * mid + Math.sin(this.t * 37 + i * 3) * jit;
      const y = CY + Math.sin(a) * mid * K + Math.cos(this.t * 41 + i * 5) * jit;
      g.save(); g.translate(x, y); g.rotate(Math.sin(i * 2.3) * 0.5 + Math.sin(this.t * 23 + i) * 0.08 * k);
      g.drawImage(img, -s / 2, -s * 0.48, s, s * img.height / img.width);
      g.restore();
    }
    g.restore();
  }
}

// ---------------------------------------------------------------- drawing kit

/** The cake platform: side wall, frosted top, rim beads. Used by the game and the icon. */
function drawPlatformShape(g, cx, cy, R, k, thick, t, tele, flash, full, sprinkles, cracks) {
  const ry = R * k;
  g.lineJoin = 'round';
  // side wall (sponge) with a chocolate band
  g.save();
  g.beginPath();
  g.ellipse(cx, cy + thick, R, ry, 0, 0, Math.PI);
  g.lineTo(cx - R, cy);
  g.lineTo(cx + R, cy);
  g.closePath();
  const gr = g.createLinearGradient(0, cy, 0, cy + thick + ry);
  gr.addColorStop(0, '#fbd596'); gr.addColorStop(0.55, '#f2b66b'); gr.addColorStop(1, '#d8924a');
  g.fillStyle = gr; g.fill();
  g.clip();
  // chocolate stripe + jam layer
  g.fillStyle = '#7a4a2e'; g.fillRect(cx - R, cy + thick * 0.42, R * 2, thick * 0.2);
  g.fillStyle = '#ff7aa8'; g.fillRect(cx - R, cy + thick * 0.72, R * 2, thick * 0.1);
  g.restore();
  g.lineWidth = Math.max(3, R * 0.012); g.strokeStyle = '#24163f';
  g.beginPath(); g.ellipse(cx, cy + thick, R, ry, 0, 0, Math.PI); g.stroke();
  g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx - R, cy + thick); g.moveTo(cx + R, cy); g.lineTo(cx + R, cy + thick); g.stroke();
  // top face
  const top = g.createRadialGradient(cx, cy - ry * 0.2, R * 0.1, cx, cy, R);
  top.addColorStop(0, '#ffe9f4'); top.addColorStop(0.6, '#ffc4de'); top.addColorStop(1, '#ff9fcd');
  g.beginPath(); g.ellipse(cx, cy, R, ry, 0, 0, TAU);
  g.fillStyle = top; g.fill(); g.stroke();
  // concentric piping rings
  g.save();
  g.beginPath(); g.ellipse(cx, cy, R, ry, 0, 0, TAU); g.clip();
  g.lineWidth = Math.max(4, R * 0.02);
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(cx, cy, R * 0.78, ry * 0.78, 0, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,111,177,0.45)';
  g.beginPath(); g.ellipse(cx, cy, R * 0.5, ry * 0.5, 0, 0, TAU); g.stroke();
  g.beginPath(); g.ellipse(cx, cy, R * 0.22, ry * 0.22, 0, 0, TAU); g.stroke();
  // star emblem in the middle
  g.fillStyle = 'rgba(255,255,255,0.65)';
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = (i % 2 ? 0.07 : 0.16) * R; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * k); }
  g.closePath(); g.fill();
  if (sprinkles) {
    for (const s of sprinkles) {
      if (s.d * R0 > R - 34) continue;
      g.save(); g.translate(cx + Math.cos(s.a) * s.d * R0, cy + Math.sin(s.a) * s.d * R0 * k); g.rotate(s.r);
      g.fillStyle = s.c; g.fillRect(-7, -2.5, 14, 5); g.restore();
    }
  }
  g.restore();
  // frosting beads along the rim
  const beads = Math.round(R / 11);
  const br = Math.max(7, R * 0.034);
  for (let i = 0; i < beads; i++) {
    const a = (i / beads) * TAU;
    const bx = cx + Math.cos(a) * (R - br * 0.5), by = cy + Math.sin(a) * (ry - br * 0.5 * k);
    g.beginPath(); g.arc(bx, by, br, 0, TAU);
    g.fillStyle = '#ffffff'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(36,22,63,0.7)'; g.stroke();
    // drip down the wall on the near half
    if (Math.sin(a) > 0.05 && i % 2 === 0) {
      const len = br * (1.2 + ((i * 37) % 10) / 6);
      g.beginPath(); g.moveTo(bx - br * 0.55, by); g.lineTo(bx + br * 0.55, by); g.lineTo(bx + br * 0.4, by + len); g.arc(bx, by + len, br * 0.4, 0, Math.PI); g.closePath();
      g.fillStyle = '#ffffff'; g.fill();
    }
  }
  if (flash > 0) { g.save(); g.globalAlpha = flash; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy, R, ry, 0, 0, TAU); g.fill(); g.restore(); }
  void t; void tele; void full; void cracks;
}
