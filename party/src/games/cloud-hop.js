// Cloud Hop - everyone races up one shared sky tower of fluffy clouds. You
// bounce automatically every time you land; steer left/right and press A in
// the air for one extra flutter hop. Pink clouds and trampolines are super
// springy, sleepy rain clouds puff away after one bounce, lavender clouds
// drift. Grab 3 stars for a Rocket Bounce, bonk off friends' heads for a
// boost, and land on the golden rainbow summit first. Fall off the bottom of
// the screen and a friendly bubble floats you back up (a short delay; the
// pack keeps climbing), so nobody is ever out of the race.
//
// Art hooks (all optional; procedural fallbacks ship today):
//   bg/cloud-hop  prop/cloudhop-cloud  prop/cloudhop-cloud-pink  prop/cloudhop-cloud-rain
//   prop/cloudhop-cloud-drift  prop/cloudhop-trampoline  prop/cloudhop-bridge
//   prop/cloudhop-star  prop/cloudhop-bubble  prop/cloudhop-summit  prop/cloudhop-balloon
// Sounds (with fallbacks): cloudhop-bounce cloudhop-spring cloudhop-poof cloudhop-flutter
//   cloudhop-star cloudhop-rocket cloudhop-bubble cloudhop-bonk cloudhop-finish
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { drawSparkleShape, drawStarShape } from '../engine/emotes.js';
import { clamp, lerp, damp, approach, rand, pick, chance, ease, placementsFromScores, TAU } from '../engine/util.js';

const NAVY = '#24163f';

// --- tuning -----------------------------------------------------------------
const DURATION = 60;          // hard cap (s)
const HURRY = 10;             // seconds left for everyone once the first climber finishes
const FLOOR_Y = 1000;         // world y of the starting cloud bank (world grows upward = negative y)
const ROWS = 76;              // cloud rows between the floor and the summit
const G = 2500;               // gravity px/s^2
const BOUNCE_V = 1140;        // normal cloud bounce  (apex ~260 px)
const SPRING_V = 1760;        // pink cloud / trampoline (apex ~620 px)
const HOP_V = 900;            // the one mid-air flutter hop
const BONK_V = 1280;          // bouncing off someone's head
const ROCKET_V = 2350;        // 3 stars
const TERM = 1500;            // max fall speed
const MAXV = 560, ACC = 4400; // air steering
const X0 = 120, X1 = 1730;    // play column (the right edge holds the height track)
const STARS_FOR_ROCKET = 3;
const BUBBLE_T = 1.25;        // seconds in the rescue bubble

const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th');
const snd = (k, fb, o = {}) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, { ...o, fallback: o.fallback || null }));
const poseName = (n, fb) => (POSE_NAMES.includes(n) ? n : fb);

// Sky colour by altitude (0 = ground, 1 = summit): morning blue -> lavender -> sunset pink -> twilight gold.
const SKY = [[0, '#dff4ff'], [0.12, '#a6e0ff'], [0.35, '#a9bfff'], [0.52, '#ffc6e6'], [0.7, '#ffb99e'], [0.86, '#b993ff'], [1.08, '#5b45b8']];
function hexLerp(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, t)), gg = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t)), bb = Math.round(lerp(pa & 255, pb & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | bb).toString(16).slice(1);
}
function skyAt(p) {
  if (p <= SKY[0][0]) return SKY[0][1];
  for (let i = 1; i < SKY.length; i++) if (p <= SKY[i][0]) return hexLerp(SKY[i - 1][1], SKY[i][1], (p - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]));
  return SKY[SKY.length - 1][1];
}

// Cloud palettes: [outline, shade, fill, highlight]
const PAL = {
  cloud: ['#24163f', '#cfdcff', '#ffffff', '#ffffff'],
  floor: ['#24163f', '#cfdcff', '#ffffff', '#ffffff'],
  pink: ['#24163f', '#ff8fc7', '#ffc7e4', '#fff0f8'],
  rain: ['#24163f', '#8f9ccc', '#c3cdea', '#e6ecff'],
  move: ['#24163f', '#c3b2ff', '#ece6ff', '#ffffff'],
  summit: ['#24163f', '#ffbf3a', '#ffe68a', '#fff8d2'],
  tramp: ['#24163f', '#cfdcff', '#ffffff', '#ffffff'],
};

export const meta = {
  id: 'cloud-hop',
  title: 'Cloud Hop',
  category: 'party',
  type: 'Race',
  goal: 'Bounce up the sky tower of clouds and reach the golden rainbow first!',
  controls: [['stick', 'Steer left and right'], ['a', 'Flutter hop (in the air)']],
  tips: ['You bounce by yourself! Pink clouds and trampolines bounce you super high.', 'Grab 3 stars for a ROCKET BOUNCE!', 'Grey rain clouds puff away after one bounce. Bonk off heads for a boost!'],
  music: 'bouncy',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  infoAt: 'bl',
  drawIcon(g, x, y, w, h, t = 0) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (drawArt(g, 'thumb/cloud-hop', x + w / 2, y + h / 2, w, h, { fit: 'cover' })) { g.restore(); return; }
    const s = w / 400, hh = h / s;
    g.translate(x, y); g.scale(s, s);
    const gr = g.createLinearGradient(0, 0, 0, hh);
    gr.addColorStop(0, '#b993ff'); gr.addColorStop(0.45, '#ffc6e6'); gr.addColorStop(1, '#a6e0ff');
    g.fillStyle = gr; g.fillRect(0, 0, 400, hh);
    // rainbow arch with golden clouds at its feet
    const ry = hh * 0.44;
    g.save(); g.lineWidth = 11;
    ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.ellipse(200, ry, 165 - i * 11, 82 - i * 11, 0, Math.PI, TAU); g.stroke(); });
    g.restore();
    puffShape(g, 40, ry - 6, 110, PAL.summit, 0, makePuffs(110, 3));
    puffShape(g, 360, ry - 6, 110, PAL.summit, 0, makePuffs(110, 4));
    for (let i = 0; i < 6; i++) { g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i); g.translate(30 + i * 68, 22 + (i % 2) * 40); drawSparkleShape(g, 12, '#fff'); g.restore(); }
    // clouds climbing up
    puffShape(g, 95, hh * 0.86, 160, PAL.cloud, 0, makePuffs(160, 7), 1, true);
    puffShape(g, 120, hh * 0.6, 100, PAL.rain, 0, makePuffs(100, 5), 1, true, 'sleepy');
    const sq = Math.max(0, Math.sin(t * 3 + 1.2)) * 0.25;
    puffShape(g, 292, hh * 0.84, 130, PAL.pink, sq, makePuffs(130, 3), 1, true, 'wow');
    // a star
    g.save(); g.translate(205, hh * 0.64 + Math.sin(t * 3) * 5); g.rotate(Math.sin(t * 2) * 0.2); drawStarShape(g, 20, '#ffd23f'); g.restore();
    // a happy hopper bouncing off the pink cloud
    const by = hh * 0.8 - Math.abs(Math.sin(t * 3)) * hh * 0.28;
    g.save(); g.translate(292, by); g.scale(1.15, 1.15);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-7, -14); g.lineTo(-9, -2); g.moveTo(7, -14); g.lineTo(9, -2); g.stroke();
    g.fillStyle = '#ff6fb1'; g.beginPath(); g.ellipse(-10, -1, 6, 4, 0, 0, TAU); g.ellipse(10, -1, 6, 4, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-9, -36); g.lineTo(-24, -58); g.moveTo(9, -36); g.lineTo(24, -58); g.lineWidth = 9; g.stroke(); g.strokeStyle = '#ffe2c8'; g.lineWidth = 4.5; g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = 4;
    g.fillStyle = '#ff6fb1'; g.beginPath(); g.moveTo(-20, -12); g.lineTo(20, -12); g.lineTo(10, -42); g.lineTo(-10, -42); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -42, 7, 0, Math.PI); g.fill();
    g.fillStyle = '#7a4a2a';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 20, -62, 8, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#ffe2c8'; g.beginPath(); g.arc(0, -58, 17, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#7a4a2a'; g.beginPath(); g.arc(0, -61, 17.5, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0, -66, -17.3, -63); g.fill();
    g.fillStyle = '#ff6fb1'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 15, -72, 4.5, 0, TAU); g.fill(); }
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(-6, -55, 2.6, 3.6, 0, 0, TAU); g.ellipse(6, -55, 2.6, 3.6, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,111,177,0.5)'; g.beginPath(); g.ellipse(-11, -49, 4, 2.5, 0, 0, TAU); g.ellipse(11, -49, 4, 2.5, 0, 0, TAU); g.fill();
    g.lineWidth = 2.5; g.beginPath(); g.arc(0, -50, 5, 0.2, Math.PI - 0.2); g.stroke();
    g.restore();
    // motion lines
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(292 + i * 13, by + 10); g.lineTo(292 + i * 13, by + 28); g.stroke(); }
    g.restore();
  },
};

// --- cloud shapes -------------------------------------------------------------
let seedN = 1;
const srand = () => { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647; };

/** Puff layout for a cloud of width w: bumps along the top (circle tops ~8 px above the landing line). */
function makePuffs(w, seed = 1) {
  seedN = 1 + Math.floor(seed * 7919) % 100000;
  const k = Math.max(3, Math.round(w / 64));
  const out = [];
  for (let i = 0; i < k; i++) {
    const cx = -w / 2 + (w * (i + 0.5)) / k;
    const mid = 1 - Math.abs(i - (k - 1) / 2) / ((k - 1) / 2 + 0.5);
    const r = (w / k) * (0.6 + srand() * 0.12) + mid * 10;
    out.push([cx, r - 8 - mid * 8, r]);
  }
  return out;
}

/**
 * Fluffy cloud with a navy outline and cel shading; (x, y) is the landing
 * line (top centre). sq squashes it (spring after a bounce), face draws a
 * little sleepy/happy face.
 */
function puffShape(g, x, y, w, pal, sq, puffs, alpha = 1, face = false, faceKind = 'happy', t = 0) {
  const bodyH = clamp(w * 0.26, 38, 74);
  g.save();
  g.translate(x, y);
  if (alpha < 1) g.globalAlpha *= alpha;
  g.scale(1 + sq * 0.1, 1 - sq * 0.2);
  const body = (grow, dy = 0, shrink = 1) => {
    g.beginPath();
    for (const [cx, cy, r] of puffs) { g.moveTo(cx + r * shrink + grow, cy + dy); g.arc(cx, cy + dy, r * shrink + grow, 0, TAU); }
    g.moveTo(w / 2 + grow, bodyH * 0.55 + dy);
    g.ellipse(0, bodyH * 0.55 + dy, w / 2 + grow, bodyH * 0.5 * shrink + grow, 0, 0, TAU);
    g.fill();
  };
  g.fillStyle = pal[0]; body(5);
  g.fillStyle = pal[1]; body(0);
  g.fillStyle = pal[2]; body(0, -bodyH * 0.12, 0.84);
  // highlights
  g.fillStyle = pal[3]; g.globalAlpha *= 0.8;
  for (let i = 0; i < puffs.length; i += 2) { const [cx, cy, r] = puffs[i]; g.beginPath(); g.ellipse(cx - r * 0.3, cy - r * 0.45, r * 0.28, r * 0.15, -0.4, 0, TAU); g.fill(); }
  g.globalAlpha /= 0.8;
  if (face) {
    const fy = bodyH * 0.45, ex = clamp(w * 0.09, 8, 16);
    g.strokeStyle = NAVY; g.fillStyle = NAVY; g.lineWidth = 3; g.lineCap = 'round';
    if (faceKind === 'sleepy') {
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, fy - 3, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    } else if (faceKind === 'wow') {
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, fy - 4, 3.2, 4.4, 0, 0, TAU); g.fill(); }
    } else {
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, fy - 1, 4.5, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,111,177,0.45)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * (ex + 11), fy + 4, 6, 3.5, 0, 0, TAU); g.fill(); }
    if (faceKind !== 'sleepy') { g.beginPath(); g.arc(0, fy + 4 + Math.sin(t * 2) * 0.5, 4, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
  }
  g.restore();
}

// ============================================================================
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.playT = 0;
    this.deadline = DURATION;
    this.timeLeft = DURATION;
    this.done = false; this.endT = -1;
    this.finishCount = 0;
    this.scale = n <= 2 ? 0.7 : n <= 4 ? 0.64 : 0.56;
    this.bounceSndAt = -1; this.voiceAt = -1;
    this.banner = null;          // { text, t, color }
    this.milestones = { half: false, near: false };
    this.camTop = 0;
    if (api.camera) api.camera.clampToStage = false;
    this.buildTower();
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? (X0 + X1) / 2 : lerp(X0 + 200, X1 - 200, i / (n - 1));
      const a = new Actor(p, { scale: this.scale, x, y: FLOOR_Y });
      a.facing = x < (X0 + X1) / 2 ? 1 : -1; a.snap();
      return {
        p, a, i, x, y: FLOOR_Y, prevY: FLOOR_Y, vx: 0, vy: 0, state: 'ready', hop: true,
        stars: 0, starTotal: 0, rockets: 0, place: 0, finishT: 0, best: FLOOR_Y,
        bubT: 0, bubX: x, rocketT: 0, bonkCd: 0, popN: 0, popT: 0,
        brain: new Brain(p), target: null, needHop: false, err: 0, daze: 0,
      };
    });
    this.bgClouds = Array.from({ length: 12 }, (_, i) => ({ x: rand(W), y: rand(H + 300), s: rand(0.7, 1.5), sp: rand(6, 18), a: rand(0.35, 0.7), k: 0.15 + (i % 3) * 0.08 }));
    this.balloons = Array.from({ length: 4 }, (_, i) => ({ x: 200 + i * 470 + rand(-80, 80), y: rand(H), c: ['#ff6fb1', '#7fd3ff', '#ffd23f', '#8be8b8'][i], c2: ['#fff', '#ffe066', '#ff8fc7', '#c9a0ff'][i], s: rand(0.55, 0.85), ph: rand(TAU) }));
    this.twinkles = Array.from({ length: 50 }, () => ({ x: rand(W), y: rand(H), p: rand(TAU), s: rand(0.4, 1) }));
  }

  // ------------------------------------------------------------------ tower
  buildTower() {
    const n = this.n;
    const P = this.plats = [];
    let id = 0;
    const add = (o) => { const pl = { id: id++, sq: 0, sqv: 0, gone: 0, amp: 0, spd: 0, ph: 0, ...o }; pl.bx = pl.x; pl.puffs = makePuffs(pl.w, pl.id + 3); P.push(pl); return pl; };
    add({ type: 'floor', x: W / 2, y: FLOOR_Y, w: W + 300, row: 0 });
    const sizes = { cloud: n >= 5 ? 250 : 230, move: 210, rain: 200, pink: 175, tramp: 160 };
    const weighted = (tbl) => { let r = Math.random() * tbl.reduce((s, [, w]) => s + w, 0); for (const [k, w] of tbl) { if ((r -= w) <= 0) return k; } return tbl[0][0]; };
    const MAIN = [['cloud', 66], ['move', 18], ['pink', 8], ['tramp', 8]];
    const EXTRA = [['cloud', 38], ['move', 18], ['rain', 26], ['pink', 9], ['tramp', 9]];
    let y = FLOOR_Y, px = (X0 + X1) / 2;
    this.rows = [];
    for (let r = 1; r <= ROWS; r++) {
      y -= r === 1 ? 175 : rand(168, 200);
      const row = [];
      if (r % 14 === 0) {
        // rainbow bridge: a wide, safe resting row
        px = clamp(px + rand(-200, 200), X0 + 330, X1 - 330);
        row.push(add({ type: 'bridge', x: px, y, w: 600, row: r }));
        // plus a little cloud on the far side so the whole width can keep climbing
        const ox = px < (X0 + X1) / 2 ? X1 - 200 : X0 + 200;
        row.push(add({ type: 'cloud', x: ox, y: y + rand(-20, 20), w: 200, row: r }));
      } else {
        px = clamp(px + (chance(0.5) ? 1 : -1) * rand(150, 330), X0 + 140, X1 - 140);
        const mt = r < 3 ? 'cloud' : weighted(MAIN);
        row.push(add(this.platDef(mt, px, y, sizes, r)));
        const extras = (n >= 5 ? 2 : 1) + (chance(0.45) ? 1 : 0);
        for (let k = 0; k < extras; k++) {
          for (let tries = 0; tries < 10; tries++) {
            const ex = rand(X0 + 110, X1 - 110);
            if (row.every((o) => Math.abs(o.x - ex) > (o.w + 200) / 2 + 70 + (o.amp || 0))) {
              row.push(add(this.platDef(r < 2 ? 'cloud' : weighted(EXTRA), ex, y + rand(-28, 28), sizes, r)));
              break;
            }
          }
        }
      }
      this.rows.push(row);
    }
    this.summitY = y - 250;
    this.summit = add({ type: 'summit', x: W / 2, y: this.summitY, w: W + 300, row: ROWS + 1 });
    this.towerH = FLOOR_Y - this.summitY;
    // stars: hover above clouds so bouncing off that cloud (or flying past) grabs them
    this.stars = [];
    for (const row of this.rows) {
      if (row[0].row < 2 || !chance(n >= 5 ? 0.62 : 0.5)) continue;
      const host = pick(row.filter((pl) => pl.type !== 'rain'));
      if (!host) continue;
      this.stars.push({ x: clamp(host.x + rand(-50, 50), X0 + 40, X1 - 40), y: host.y - rand(150, 215), taken: false, ph: rand(TAU), host });
    }
  }

  platDef(type, x, y, sizes, row) {
    const o = { type, x, y, w: sizes[type] || 220, row };
    if (type === 'move') { o.amp = rand(140, 230); o.spd = rand(0.9, 1.4); o.ph = rand(TAU); o.x = clamp(x, X0 + o.w / 2 + o.amp, X1 - o.w / 2 - o.amp); }
    if (type === 'rain') o.face = 'sleepy';
    return o;
  }

  platX(pl, t = this.t) { return pl.amp ? pl.bx + Math.sin(t * pl.spd + pl.ph) * pl.amp : pl.x; }

  // ---------------------------------------------------------------- update
  preUpdate(dt) {
    this.t += dt;
    this.updatePlats(dt);
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
    this.updateCamera(dt, true);
  }

  update(dt) {
    this.t += dt; this.playT += dt;
    if (!this.started) {
      this.started = true;
      for (const e of this.ents) this.launch(e, BOUNCE_V * 0.95, this.plats[0]);
    }
    this.timeLeft = Math.max(0, this.deadline - this.playT);
    this.updatePlats(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.4) this.banner = null; }
    for (const e of this.ents) if (e.p.isAI && !this.done) this.aiThink(e, dt);
    for (const e of this.ents) this.movePlayer(e, dt);
    this.bonks();
    this.collectStars();
    this.updateCamera(dt);
    this.checkBubbles();
    this.milestoneCheck();
    for (const e of this.ents) { e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
    if (!this.done) {
      const allIn = this.ents.every((e) => e.state === 'done');
      if (allIn) { if (this.endT < 0) this.endT = this.playT + (this.n === 1 ? 1.0 : 0.8); }
      if ((this.endT >= 0 && this.playT >= this.endT) || this.timeLeft <= 0) this.finish();
    }
  }

  postUpdate(dt) {
    this.t += dt;
    this.updatePlats(dt);
    for (const e of this.ents) this.movePlayer(e, dt);
    for (const e of this.ents) { e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
  }

  updatePlats(dt) {
    for (const pl of this.plats) {
      if (pl.amp) pl.x = this.platX(pl);
      // squash spring
      pl.sqv += (-pl.sq * 340 - pl.sqv * 14) * dt; pl.sq += pl.sqv * dt;
      if (pl.gone > 0) {
        pl.gone -= dt;
        if (pl.gone <= 0) { pl.gone = 0; pl.sq = -0.3; if (this.visibleY(pl.y)) particles.burst(pl.x, pl.y + 20, { type: 'sparkle', count: 5, colors: ['#ffffff', '#e6ecff'], size: [10, 16] }); }
      }
      // a sleepy rain cloud drips now and then
      if (pl.type === 'rain' && !pl.gone && Math.random() < dt * 1.3 && this.visibleY(pl.y)) {
        particles.burst(pl.x + rand(-pl.w * 0.35, pl.w * 0.35), pl.y + 50, { type: 'drop', count: 1, colors: ['#7fb8ff', '#a8d4ff'], speed: [10, 40], angle: Math.PI / 2, spread: 0.2, life: [0.4, 0.6] });
      }
    }
    for (const s of this.stars) if (s.host && s.host.amp) s.x = clamp(s.host.x + (s.dx ?? (s.dx = s.x - s.host.x)), X0 + 40, X1 - 40);
  }

  visibleY(y) { return y > this.camTop - 150 && y < this.camTop + H + 150; }

  launch(e, v, pl) {
    e.vy = -v; e.hop = true; e.state = 'air';
    e.a.setPose('jump', { restart: true });
    if (pl) particles.burst(e.x, e.y + 6, { type: 'dust', count: 4, color: '#fff', speed: [40, 120], size: [10, 18] });
  }

  movePlayer(e, dt) {
    const a = e.a, ctrl = e.p.ctrl;
    e.popT = Math.max(0, e.popT - dt); e.bonkCd = Math.max(0, e.bonkCd - dt); e.daze = Math.max(0, e.daze - dt);
    if (e.state === 'ready') return;
    if (e.state === 'done') {
      e.y = this.summitY; e.vx = 0;
      if (!a._once && a.pose !== 'celebrate') a.setPose('celebrate');
      return;
    }
    if (e.state === 'bubble') { this.updateBubble(e, dt); return; }
    const live = !this.done;
    const inX = live ? ctrl.x : 0;
    e.vx = approach(e.vx, inX * MAXV, ACC * dt);
    e.x += e.vx * dt;
    if (e.x < X0) { e.x = X0; e.vx = Math.max(0, e.vx); } else if (e.x > X1) { e.x = X1; e.vx = Math.min(0, e.vx); }
    if (live && ctrl.pressed('a') && e.hop) this.flutter(e);
    e.prevY = e.y;
    e.vy = Math.min(e.vy + G * dt, TERM);
    e.y += e.vy * dt;
    if (e.rocketT > 0) {
      e.rocketT -= dt;
      if (Math.random() < dt * 40) particles.burst(e.x + rand(-16, 16), e.y + 4, { type: 'sparkle', count: 1, colors: RAINBOW, speed: [10, 60], size: [12, 22] });
    }
    if (e.vy > 0) {
      let land = null;
      for (const pl of this.plats) {
        if (pl.gone > 0 || pl.y < e.prevY - 1 || pl.y > e.y) continue;
        const hw = pl.w / 2 + 16;
        if (Math.abs(e.x - pl.x) > hw) continue;
        if (!land || pl.y < land.y) land = pl;
      }
      if (land) this.landOn(e, land);
    }
    e.best = Math.min(e.best, e.y);
    // pose
    if (!a._once) {
      if (e.daze > 0) a.setPose('dizzy');
      else if (e.vy < -40) { if (a.pose !== 'jump') a.setPose('jump'); }
      else if (a.pose !== 'fall') a.setPose('fall');
    }
    if (Math.abs(e.vx) > 40) a.facing = e.vx > 0 ? 1 : -1;
  }

  landOn(e, pl) {
    e.y = pl.y;
    const a = e.a, human = !e.p.isAI;
    if (pl.type === 'summit') {
      if (!this.done) { this.reachSummit(e); return; }
      e.vy = -BOUNCE_V * 0.6; return;
    }
    const spring = pl.type === 'pink' || pl.type === 'tramp';
    this.launch(e, spring ? SPRING_V : BOUNCE_V, pl);
    pl.sqv += spring ? 9 : 5.5;
    a.squash(spring ? 0.45 : 0.3);
    if (spring) {
      a.playOnce('spring-jump', 0.5, 'jump');   // falls back to dance-star / jump
      snd('cloudhop-spring', 'boing', { vol: human ? 0.8 : 0.45, fallback: 'bounce' });
      particles.burst(e.x, pl.y, { type: 'heart', count: 4, colors: ['#ff6fb1', '#ff9ccf', '#fff'], speed: [80, 220] });
      particles.ring(e.x, pl.y, '#ff9ccf', 120, 0.35);
      if (human || this.n <= 2) this.pop(e, 'Boing!', '#ff6fb1', 40);
      if (human) e.p.ctrl.rumble(0.35, 90);
    } else if (this.t - this.bounceSndAt > (human ? 0.04 : 0.09)) {
      this.bounceSndAt = this.t;
      snd('cloudhop-bounce', 'rubber-bounce', { vol: human ? 0.5 : 0.22, rate: rand(0.95, 1.2), fallback: 'bounce' });
    }
    if (pl.type === 'rain') {
      pl.gone = 4.5;
      particles.burst(pl.x, pl.y + 24, { type: 'smoke', count: 9, colors: ['#e6ecff', '#c3cdea', '#ffffff'], speed: [60, 180], jitter: pl.w * 0.3 });
      particles.burst(pl.x, pl.y + 30, { type: 'drop', count: 8, colors: ['#7fb8ff', '#a8d4ff'], speed: [80, 240] });
      snd('cloudhop-poof', 'pop', { vol: human ? 0.6 : 0.35 });
    }
  }

  flutter(e) {
    e.hop = false;
    e.vy = Math.min(e.vy, -HOP_V);
    const a = e.a;
    a.squash(-0.25); a.playOnce(poseName('dance-star', 'jump'), 0.35, 'jump');
    particles.ring(e.x, e.y, e.p.color, 90, 0.3);
    particles.burst(e.x, e.y, { type: 'sparkle', count: 5, colors: ['#ffffff', '#fff6a8', e.p.color], speed: [60, 160], size: [10, 18] });
    snd('cloudhop-flutter', 'wing-twinkle', { vol: e.p.isAI ? 0.3 : 0.6, fallback: 'jump' });
  }

  bonks() {
    if (this.done) return;
    const E = this.ents;
    for (const A of E) {
      if (A.state !== 'air' || A.vy <= 0 || A.bonkCd > 0) continue;
      for (const B of E) {
        if (B === A || B.state !== 'air') continue;
        const head = B.y - B.a.height * 0.88;
        if (A.prevY > head + 8 || A.y < head) continue;
        if (Math.abs(A.x - B.x) > 30 + 26 * this.scale / 0.56) continue;
        // boing!
        A.y = head; this.launch(A, BONK_V, null); A.bonkCd = 0.35;
        A.a.squash(0.35); A.a.playOnce('cheer', 0.4, 'jump');
        B.vy = Math.max(B.vy, 380); B.a.squash(0.4); B.a.playOnce('hurt', 0.4, 'fall'); B.a.emote('dizzy', 0.8); B.daze = 0.25;
        snd('cloudhop-bonk', 'boing', { vol: 0.7, fallback: 'bonk' }); sfx('bonk', { vol: 0.5 });
        particles.burst(B.x, head, { type: 'star', count: 7, colors: ['#ffd23f', '#fff6a8', '#ffffff'] });
        this.pop(A, 'Bonk!', '#ffd23f', 44);
        fx.shake(4, 0.12);
        if (!A.p.isAI) A.p.ctrl.rumble(0.4, 100);
        if (!B.p.isAI) B.p.ctrl.rumble(0.5, 140);
        if (this.t - this.voiceAt > 1.2 && chance(0.5)) { this.voiceAt = this.t; voice(B.p.charId, 'ouch'); }
        break;
      }
    }
  }

  collectStars() {
    if (this.done) return;
    for (const s of this.stars) {
      if (s.taken) continue;
      for (const e of this.ents) {
        if (e.state !== 'air') continue;
        const cy = e.y - e.a.height * 0.5;
        if (Math.abs(e.x - s.x) < 58 && Math.abs(cy - s.y) < e.a.height * 0.5 + 34) { this.takeStar(e, s); break; }
      }
    }
  }

  takeStar(e, s) {
    s.taken = true;
    e.stars++; e.starTotal++;
    const human = !e.p.isAI;
    particles.burst(s.x, s.y, { type: 'star', count: 8, colors: ['#ffd23f', '#fff6a8', '#ffffff'] });
    if (e.stars >= STARS_FOR_ROCKET) { this.rocket(e); return; }
    snd('cloudhop-star', 'golden-chime', { vol: human ? 0.7 : 0.4, fallback: 'star' });
    sfx('collect', { step: e.stars * 3, vol: human ? 0.8 : 0.4 });
    this.pop(e, `★ ${e.stars}/${STARS_FOR_ROCKET}`, '#ffd23f', 42);
    e.a.emote('star', 0.6);
  }

  rocket(e) {
    e.stars = 0; e.rockets++;
    e.state = 'air'; e.vy = -ROCKET_V; e.hop = true; e.rocketT = 1.0;
    const a = e.a;
    a.playOnce(poseName('dance-star', 'cheer'), 0.6, 'jump'); a.squash(-0.4); a.emote('sparkle', 1.4);
    snd('cloudhop-rocket', 'sparkle-beam', { vol: 0.8, fallback: 'whoosh' }); sfx('magic');
    particles.burst(e.x, e.y, { type: 'star', count: 16, colors: RAINBOW, speed: [200, 480] });
    particles.ring(e.x, e.y - a.height * 0.5, '#ffd23f', 200, 0.45);
    this.pop(e, 'ROCKET!', '#ff9f1c', 60);
    fx.shake(7, 0.2); fx.flash('#fff3b0', 0.1);
    if (!e.p.isAI) e.p.ctrl.rumble(0.7, 260);
    if (this.t - this.voiceAt > 0.8) { this.voiceAt = this.t; voice(e.p.charId, 'woo'); }
  }

  reachSummit(e) {
    e.state = 'done'; e.vy = 0; e.vx = 0; e.y = this.summitY;
    e.place = ++this.finishCount; e.finishT = this.playT;
    const a = e.a, first = e.place === 1;
    a.clearEmotes(); a.squash(0.4); a.setPose('celebrate');
    particles.burst(e.x, e.y - a.height * 0.6, { type: 'confetti', count: first ? 60 : 24 });
    particles.burst(e.x, e.y, { type: 'star', count: first ? 14 : 6, colors: ['#ffd23f', '#fff6a8', '#ffffff'] });
    this.pop(e, ordinal(e.place) + '!', first ? '#ffd23f' : '#ffffff', first ? 80 : 58);
    if (!e.p.isAI) e.p.ctrl.rumble(0.8, 300);
    if (first) {
      snd('cloudhop-finish', 'fanfare', { vol: 0.9 }); sfx('golden-chime', { fallback: 'star' });
      fx.flash('#fff3b0', 0.2); fx.shake(8, 0.25); fx.slowmo(0.5, 0.45);
      a.say(['Wheee!', 'Top!', 'Yay!'][e.i % 3], 1.6, 'yay');
      if (this.n > 1 && this.ents.some((o) => o.state !== 'done')) {
        this.deadline = Math.min(this.deadline, this.playT + HURRY);
        this.banner = { text: 'Hurry up!', t: 0, color: '#ff6fb1' };
        sfx('whistle');
      }
    } else {
      sfx(e.place <= 3 ? 'win' : 'yay', { vol: 0.6 });
      if (this.t - this.voiceAt > 0.8) { this.voiceAt = this.t; voice(e.p.charId, 'yay'); }
    }
  }

  // ---------------------------------------------------------- rescue bubble
  checkBubbles() {
    if (this.done) return;
    const bottom = this.camTop + H;
    for (const e of this.ents) {
      if (e.state !== 'air' || e.y < bottom + 90) continue;
      e.state = 'bubble'; e.bubT = 0; e.vx = 0; e.vy = 0; e.rocketT = 0;
      // drift toward a cloud in the lower part of the screen
      let best = null, bd = 1e9;
      for (const pl of this.plats) {
        if (pl.gone > 0 || pl.type === 'summit' || pl.y < bottom - 520 || pl.y > bottom - 140) continue;
        const d = Math.abs(pl.x - e.x);
        if (d < bd) { bd = d; best = pl; }
      }
      // spread friends that fall together so their bubbles don't stack
      const others = this.ents.filter((o) => o !== e && o.state === 'bubble').length;
      e.bubX = clamp((best ? best.x : e.x) + (others ? (others % 2 ? 1 : -1) * Math.ceil(others / 2) * 90 : 0), X0 + 60, X1 - 60);
      e.a.clearEmotes(); e.a.setPose(poseName('float', 'fall'));
      snd('cloudhop-bubble', 'bubble', { vol: e.p.isAI ? 0.4 : 0.8 });
      if (!e.p.isAI && this.t - this.voiceAt > 1) { this.voiceAt = this.t; e.a.say('Whoa!', 1.0, 'gasp'); }
    }
  }

  updateBubble(e, dt) {
    e.bubT += dt;
    const k = ease.outCubic(clamp(e.bubT / (BUBBLE_T * 0.85), 0, 1));
    e.y = this.camTop + lerp(H + 140, H - 210, k);
    e.prevY = e.y;
    if (!e.p.isAI && !this.done) e.bubX = clamp(e.bubX + e.p.ctrl.x * 420 * dt, X0 + 40, X1 - 40);
    e.x = damp(e.x, e.bubX, 4, dt);
    if (!e.a._once && e.a.pose !== poseName('float', 'fall')) e.a.setPose(poseName('float', 'fall'));
    if (e.bubT >= BUBBLE_T) {
      e.state = 'air'; e.vy = -BOUNCE_V * 0.95; e.hop = true; e.vx = 0;
      e.a.setPose('jump', { restart: true }); e.a.squash(-0.3);
      particles.burst(e.x, e.y - e.a.height * 0.5, { type: 'bubble', count: 12, colors: ['#ffffff', '#bfe9ff', '#ffd1ec'], speed: [100, 260] });
      sfx('pop', { vol: e.p.isAI ? 0.35 : 0.7 });
    }
  }

  // ----------------------------------------------------------------- camera
  /**
   * Frame the biggest group that fits on screen (humans count most, so your
   * own character stays in view). A lone runaway leader gets an arrow at the
   * top; anyone left below the screen is bubbled back up.
   */
  updateCamera(dt, countdown = false) {
    const act = this.ents.filter((e) => e.state === 'air' || e.state === 'ready').sort((a, b) => a.y - b.y);
    const TOPM = 190, BOTM = H - 140, SPAN = BOTM - TOPM;
    let target;
    if (!act.length) target = this.summitY - 520;
    else {
      let best = null, bw = -1;
      for (let i = 0; i < act.length; i++) {
        const y0 = act[i].y;
        let w = i === 0 ? 0.5 : 0, lo = y0, focus = false;
        for (let j = i; j < act.length && act[j].y <= y0 + SPAN; j++) {
          w += act[j].p.isAI ? 1 : 10; lo = act[j].y;
          if (act[j] === this.camFocus) focus = true;
        }
        if (focus) w += 0.4;
        if (w > bw + 1e-6) { bw = w; best = { top: y0, low: lo, e: act[i] }; }
      }
      this.camFocus = best.e;
      target = clamp((best.top + best.low) / 2 - H / 2 + 40, best.low - BOTM, best.top - TOPM);
    }
    target = clamp(target, this.summitY - 520, 0);
    const diff = this.camTop - target;
    const rate = diff > 0 ? clamp(3 + diff / 110, 3, 10) : 1.5;
    this.camTop = damp(this.camTop, target, rate, dt);
    const cam = this.api.camera;
    if (cam) cam.follow(W / 2, this.camTop + H / 2, 1, countdown ? 2.2 : 14);
  }

  milestoneCheck() {
    if (this.done) return;
    const lead = Math.min(...this.ents.map((e) => (e.state === 'done' ? this.summitY : e.y)));
    const prog = (FLOOR_Y - lead) / this.towerH;
    const leader = this.ents.find((e) => e.y === lead || (e.state === 'done' && lead === this.summitY));
    if (!this.milestones.half && prog > 0.5) {
      this.milestones.half = true; sfx('sparkle');
      if (leader) particles.popText(leader.x, leader.y - 220, 'Halfway!', '#ffffff', 56);
    }
    if (!this.milestones.near && prog > 0.84) {
      this.milestones.near = true; sfx('magic', { vol: 0.6 });
      this.banner = { text: 'Rainbow ahead!', t: 0, color: '#ffd23f', small: true };
    }
  }

  // --------------------------------------------------------------------- AI
  /** Time until the feet come DOWN through height py (null if the arc never gets that high). */
  arrival(y, vy, py) {
    const d = py - y, disc = vy * vy + 2 * G * d;
    if (disc < 0) return null;
    const t = (-vy + Math.sqrt(disc)) / G;
    return t > 0.03 ? t : null;
  }

  aiChoose(e, prof) {
    const vmax = MAXV * prof.speed * 0.92;
    const noise = prof.mistake >= 0.2 ? 260 : prof.mistake >= 0.1 ? 110 : 30;
    const smart = prof.mistake < 0.2;
    const cands = [];
    for (const pl of this.plats) {
      if (pl.y < e.y - 1100 || pl.y > e.y + 700) continue;
      for (const hopNow of [false, true]) {
        if (hopNow && !e.hop) continue;
        const vy = hopNow ? Math.min(e.vy, -HOP_V) : e.vy;
        const t = this.arrival(e.y, vy, pl.y);
        if (t === null || t > 2.2) continue;
        if (pl.gone > t + 0.05) continue;
        const px = this.platX(pl, this.t + t);
        const hw = pl.type === 'summit' ? 1e5 : pl.w / 2 - 22;
        const nx = clamp(e.x, px - hw, px + hw);
        if (Math.abs(nx - e.x) > vmax * t * (smart ? 0.86 : 0.78)) continue;
        let u = FLOOR_Y - pl.y - t * 120;
        if (pl === e.target) u += smart ? 60 : 160;   // stick with the plan instead of dithering
        if (pl.type === 'summit') u += 10000;
        if (pl.type === 'pink' || pl.type === 'tramp') u += smart ? 330 : 120;
        if (pl.type === 'rain') u -= 40;
        if (smart && this.stars.some((s) => !s.taken && s.host === pl)) u += 150;
        if (hopNow) u -= 110;
        u += rand(-1, 1) * noise;
        cands.push({ pl, u, hopNow, px });
        if (!hopNow) break;   // reachable without hopping: no need to plan a hop for it
      }
    }
    if (!cands.length) { e.target = null; e.needHop = e.hop && e.vy > 150; return; }
    let best = cands[0];
    for (const c of cands) if (c.u > best.u) best = c;
    if (chance(prof.mistake * 0.8)) best = pick(cands);
    e.target = best.pl; e.needHop = best.hopNow;
    e.err = rand(-1, 1) * prof.aimError * Math.min(best.pl.w, 260) * 0.7;
  }

  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl;
    if (e.state !== 'air') { ctrl.move(0, 0); return; }
    if (e.brain.ready(dt)) {
      // easy CPUs sometimes get distracted for a moment (sightseeing!)
      if (chance(prof.mistake * 0.35)) { e.target = null; e.needHop = false; e.lookT = rand(0.3, 0.7); }
      else this.aiChoose(e, prof);
      e.brain.wait(reactionTime(p) * 0.55);
    }
    if (e.lookT > 0) { e.lookT -= dt; ctrl.move(0, 0); return; }
    let tx = e.x;
    const pl = e.target;
    if (pl && pl.gone <= 0) {
      const t = this.arrival(e.y, e.vy, pl.y) ?? 0.3;
      const px = this.platX(pl, this.t + t);
      const hw = pl.type === 'summit' ? 600 : pl.w / 2 - 26;
      tx = clamp(px + e.err, px - hw, px + hw);
      if (pl.type === 'summit') tx = clamp(e.x, X0 + 80, X1 - 80);
    }
    const dx = tx - e.x;
    ctrl.move(Math.abs(dx) < 8 ? 0 : clamp(dx / 40, -1, 1) * prof.speed, 0);
    if (e.needHop && e.hop) {
      // smart CPUs hop at the top of the arc (higher reach); easy ones whenever
      if (prof.mistake >= 0.2 || e.vy > -60) { ctrl.press('a'); e.needHop = false; }
    }
  }

  // ----------------------------------------------------------------- finish
  heightM(e) { return Math.max(0, Math.round((FLOOR_Y - (e.state === 'done' ? this.summitY : e.y)) / 50)); }

  finish() {
    if (this.done) return;
    this.done = true;
    const scores = this.ents.map((e) => (e.state === 'done' ? 1e6 - e.place : -Math.round(e.y)));
    const placements = placementsFromScores(scores);
    const last = Math.max(...placements);
    this.ents.forEach((e, i) => {
      const a = e.a;
      if (e.state === 'done') { a.setPose('celebrate'); return; }
      a.clearEmotes();
      if (this.n > 1 && placements[i] === last && last > 1) a.playOnce('pout', 1.9, 'pout');
    });
    const stats = this.ents.map((e) => (e.state === 'done' ? `${ordinal(e.place)} up · ${e.finishT.toFixed(1)} s` : `${this.heightM(e)} m high`));
    const wi = placements.indexOf(1);
    const w = this.ents[Math.max(0, wi)];
    const solo = this.ents[0].state === 'done' ? 1000 + Math.round((DURATION - this.ents[0].finishT) * 10) : this.heightM(this.ents[0]);
    this.api.finish({ placements, stats, solo, focus: { x: w.x, y: w.y - w.a.height * 0.6, zoom: 1.2 } });
  }

  // ------------------------------------------------------------------- draw
  view() {
    const cam = this.api.camera;
    const v = cam ? cam.view() : { x: W / 2, y: this.camTop + H / 2, zoom: 1 };
    const hw = W / 2 / v.zoom, hh = H / 2 / v.zoom;
    return { l: v.x - hw, r: v.x + hw, t: v.y - hh, b: v.y + hh };
  }

  alt(y) { return (FLOOR_Y - y) / this.towerH; }

  draw(g) {
    const v = this.view();
    this.drawSky(g, v);
    this.drawGround(g, v);
    this.drawSummitBack(g, v);
    this.drawUpdraft(g, v);
    for (const pl of this.plats) if (pl.y > v.t - 140 && pl.y < v.b + 160) this.drawPlat(g, pl);
    this.drawStars(g, v);
    // CPUs first, humans on top
    const order = this.ents.slice().sort((a, b) => (a.p.isAI === b.p.isAI ? a.i - b.i : a.p.isAI ? -1 : 1));
    for (const e of order) {
      if (e.y < v.t - 40 || e.y - e.a.height > v.b + 40) continue;
      e.a.draw(g, { ring: e.p.color, shadow: false });
      if (e.state === 'bubble') this.drawBubble(g, e);
      if (e.state === 'done') this.drawMedal(g, e);
    }
    for (const e of order) {
      if (e.state === 'bubble' || e.y < v.t || e.y > v.b + 40) continue;
      if (!e.p.isAI || this.playT < 4) {
        const top = e.y - e.a.height - 22 - (e.a.emotes.length ? 50 : 0) - (e.state === 'done' ? 60 : 0);
        ui.playerTag(g, e.p, e.x, top);
      }
    }
  }

  drawSky(g, v) {
    const bg = art('bg/cloud-hop');
    const pt = this.alt(v.t), pb = this.alt(v.b);
    if (bg) {
      g.drawImage(bg, v.l, v.t, v.r - v.l, v.b - v.t);
      // tint toward the altitude colour so the climb still changes the sky
      g.save(); g.globalAlpha = 0.35;
    }
    const gr = g.createLinearGradient(0, v.t, 0, v.b);
    gr.addColorStop(0, skyAt(pt)); gr.addColorStop(1, skyAt(pb));
    g.fillStyle = gr; g.fillRect(v.l - 4, v.t - 4, v.r - v.l + 8, v.b - v.t + 8);
    if (bg) g.restore();
    const midAlt = (pt + pb) / 2;
    // sun (low) fading into a moon (high)
    g.save();
    const sunY = v.t + 200 + midAlt * 60, sunX = v.l + 1520;
    const sunA = clamp(1 - midAlt * 1.4, 0, 1);
    if (sunA > 0) {
      g.globalAlpha = 0.3 * sunA; g.fillStyle = '#fff6a8';
      g.translate(sunX, sunY);
      for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(80, -14); g.lineTo(200 + Math.sin(this.t + i) * 10, 0); g.lineTo(80, 14); g.fill(); }
      g.globalAlpha = sunA; g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, 76, 0, TAU); g.fill();
      g.setTransform(g.getTransform());
      g.translate(-sunX, -sunY);
    }
    const moonA = clamp((midAlt - 0.65) * 3, 0, 1);
    if (moonA > 0) {
      g.globalAlpha = moonA; g.fillStyle = '#fff6d6';
      g.beginPath(); g.arc(v.l + 330, v.t + 250, 60, 0, TAU); g.fill();
      g.fillStyle = skyAt(pt); g.beginPath(); g.arc(v.l + 356, v.t + 232, 52, 0, TAU); g.fill();
    }
    g.restore();
    // twinkling stars high up
    const starA = clamp((midAlt - 0.55) * 2.2, 0, 1);
    if (starA > 0) {
      g.save();
      for (const s of this.twinkles) {
        g.globalAlpha = starA * (0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.6 + s.p)));
        g.save(); g.translate(v.l + s.x, v.t + s.y * 0.8); drawSparkleShape(g, 16 * s.s, '#ffffff'); g.restore();
      }
      g.restore();
    }
    // far parallax clouds
    const span = H + 400;
    for (const c of this.bgClouds) {
      const sy = (((c.y - this.camTop * c.k) % span) + span) % span - 200;
      const sx = ((c.x + this.t * c.sp) % (W + 400)) - 200;
      ui.cloud(g, v.l + sx, v.t + sy, c.s, '#ffffff', c.a * (0.7 + 0.3 * (1 - midAlt)));
    }
    // hot-air balloons drifting by
    for (const b of this.balloons) {
      const sy = (((b.y - this.camTop * 0.35) % span) + span) % span - 200;
      const sx = b.x + Math.sin(this.t * 0.3 + b.ph) * 40;
      this.drawBalloon(g, v.l + sx, v.t + sy + Math.sin(this.t * 0.8 + b.ph) * 8, b);
    }
  }

  drawBalloon(g, x, y, b) {
    if (drawArt(g, 'prop/cloudhop-balloon', x, y, 130 * b.s, 180 * b.s)) return;
    g.save(); g.translate(x, y); g.scale(b.s, b.s); g.globalAlpha = 0.85;
    g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
    // ropes + basket
    g.beginPath(); g.moveTo(-26, 40); g.lineTo(-14, 78); g.moveTo(26, 40); g.lineTo(14, 78); g.stroke();
    g.fillStyle = '#c98a4b'; ui.roundRect(g, -18, 76, 36, 26, 6); g.fill(); g.stroke();
    // envelope
    g.beginPath(); g.moveTo(0, -70); g.bezierCurveTo(62, -70, 70, 0, 26, 42); g.lineTo(-26, 42); g.bezierCurveTo(-70, 0, -62, -70, 0, -70); g.closePath();
    g.fillStyle = b.c; g.fill();
    g.save(); g.clip();
    g.fillStyle = b.c2; for (let i = -2; i <= 2; i += 2) { g.beginPath(); g.ellipse(i * 16, -10, 9, 80, 0, 0, TAU); g.fill(); }
    g.restore();
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-24, -36, 8, 18, 0.3, 0, TAU); g.fill();
    g.restore();
  }

  drawGround(g, v) {
    if (v.b < FLOOR_Y - 260) return;
    // meadow hills and a tiny candy town far below the first clouds
    g.save();
    const hill = (y0, col, amp, f, ph) => {
      g.beginPath(); g.moveTo(v.l, v.b + 10);
      for (let x = v.l; x <= v.r + 20; x += 24) g.lineTo(x, y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 1.7) * amp * 0.35);
      g.lineTo(v.r, v.b + 10); g.closePath(); g.fillStyle = col; g.fill();
    };
    hill(FLOOR_Y - 150, '#bfe8c8', 40, 0.0034, 1);
    for (let i = 0; i < 8; i++) {
      const hx = 120 + i * 240 + (i % 2) * 40, hy = FLOOR_Y - 120 + (i % 3) * 10;
      const col = ['#ff8fc7', '#7fd3ff', '#ffd23f', '#c9a0ff'][i % 4];
      g.fillStyle = '#fff8ec'; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineWidth = 3;
      g.fillRect(hx - 26, hy - 34, 52, 40); g.strokeRect(hx - 26, hy - 34, 52, 40);
      g.fillStyle = col; g.beginPath(); g.moveTo(hx - 34, hy - 32); g.lineTo(hx, hy - 64); g.lineTo(hx + 34, hy - 32); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#7fd3ff'; g.fillRect(hx - 8, hy - 22, 16, 14);
    }
    hill(FLOOR_Y - 70, '#9fdcae', 30, 0.0045, 2.4);
    g.restore();
  }

  drawUpdraft(g, v) {
    // a warm sunset glow along the bottom edge: the friendly wind that bubbles you back up
    const k = clamp(-this.camTop / 400, 0, 1);
    if (k <= 0) return;
    g.save();
    const gr = g.createLinearGradient(0, v.b - 190, 0, v.b);
    gr.addColorStop(0, 'rgba(255,190,140,0)'); gr.addColorStop(1, `rgba(255,160,200,${0.5 * k})`);
    g.fillStyle = gr; g.fillRect(v.l, v.b - 190, v.r - v.l, 190);
    for (let i = 0; i < 22; i++) {
      const p = ((this.t * 0.45 + i * 0.137) % 1);
      const x = v.l + ((i * 263) % W) + Math.sin(this.t * 2 + i) * 14;
      const y = v.b - p * 190;
      g.globalAlpha = k * Math.sin(p * Math.PI) * 0.8;
      g.save(); g.translate(x, y); drawSparkleShape(g, 12 + (i % 3) * 4, i % 2 ? '#fff6a8' : '#ffffff'); g.restore();
    }
    g.restore();
  }

  drawSummitBack(g, v) {
    const sy = this.summitY;
    if (v.t > sy + 120 || v.b < sy - 500) return;
    const cx = (X0 + X1) / 2;
    g.save();
    // golden glow
    const gl = g.createRadialGradient(cx, sy, 40, cx, sy, 820);
    gl.addColorStop(0, 'rgba(255,230,120,0.55)'); gl.addColorStop(1, 'rgba(255,230,120,0)');
    g.fillStyle = gl; g.fillRect(cx - 900, sy - 820, 1800, 900);
    if (!drawArt(g, 'prop/cloudhop-summit', cx, sy + 60, 1640, 520, { anchor: 'bottom' })) {
      // the golden rainbow arch
      const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff', '#ff6fd0'];
      g.lineWidth = 34;
      g.strokeStyle = NAVY; g.beginPath(); g.ellipse(cx, sy + 30, 760 + 20, 380 + 20, 0, Math.PI, TAU); g.lineWidth = 6; g.stroke();
      g.lineWidth = 34;
      cols.forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.ellipse(cx, sy + 30, 760 - i * 32 + 3, 380 - i * 32 + 3, 0, Math.PI, TAU); g.stroke(); });
      g.lineWidth = 6; g.strokeStyle = NAVY; g.beginPath(); g.ellipse(cx, sy + 30, 760 - 6 * 32 - 17, 380 - 6 * 32 - 17, 0, Math.PI, TAU); g.stroke();
      // shimmer
      g.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 3);
      g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.lineCap = 'round';
      const sh = (this.t * 0.35) % 1;
      g.beginPath(); g.ellipse(cx, sy + 30, 760 - 48, 380 - 48, 0, Math.PI + sh * Math.PI, Math.PI + Math.min(1, sh + 0.12) * Math.PI); g.stroke();
      g.globalAlpha = 1;
      // a big golden star on top
      g.save(); g.translate(cx, sy - 350 + Math.sin(this.t * 2) * 6); g.rotate(Math.sin(this.t * 1.5) * 0.12);
      drawStarShape(g, 54, '#ffd23f'); g.restore();
    }
    // sparkles
    for (let i = 0; i < 14; i++) {
      const a = 0.5 + 0.5 * Math.sin(this.t * 3 + i * 1.3);
      g.globalAlpha = a; g.save(); g.translate(cx - 760 + ((i * 397) % 1520), sy - 60 - ((i * 151) % 360)); drawSparkleShape(g, 14 + (i % 3) * 6, i % 2 ? '#fff6a8' : '#ffffff'); g.restore();
    }
    g.restore();
  }

  drawPlat(g, pl) {
    const sq = clamp(pl.sq, -0.4, 0.6);
    const t = this.t;
    if (pl.type === 'floor' || pl.type === 'summit') {
      const pal = PAL[pl.type];
      // a long cloud bank built from overlapping puffs
      if (!pl.bank) pl.bank = Array.from({ length: 12 }, (_, i) => ({ x: -W / 2 - 100 + i * 190, w: 300, puffs: makePuffs(300, pl.id * 31 + i) }));
      g.save(); g.translate(pl.x, 0);
      if (pl.type === 'summit') for (const b of pl.bank) puffShape(g, b.x + 95, pl.y + 62, b.w, pal, 0, b.puffs, 1, false);
      for (const b of pl.bank) puffShape(g, b.x, pl.y, b.w, pal, 0, b.puffs, 1, false);
      g.restore();
      if (pl.type === 'floor') { g.fillStyle = PAL.floor[1]; g.fillRect(-200, pl.y + 70, W + 400, 300); }
      return;
    }
    if (pl.type === 'rain' && pl.gone > 0) {
      // puffed away: a fading puff right after, a faint dotted ghost while it regrows
      const since = 4.5 - pl.gone;
      if (since < 0.35) puffShape(g, pl.x, pl.y, pl.w * (1 + since * 1.4), PAL.rain, 0, pl.puffs, 1 - since / 0.35, false);
      else if (pl.gone < 1.2) puffShape(g, pl.x, pl.y, pl.w * (0.5 + 0.5 * (1 - pl.gone / 1.2)), PAL.rain, 0, pl.puffs, 0.35 * (1 - pl.gone / 1.2), false);
      return;
    }
    if (pl.type === 'bridge') { this.drawBridge(g, pl, sq); return; }
    if (pl.type === 'tramp') { this.drawTramp(g, pl, sq); return; }
    const key = { cloud: 'prop/cloudhop-cloud', pink: 'prop/cloudhop-cloud-pink', rain: 'prop/cloudhop-cloud-rain', move: 'prop/cloudhop-cloud-drift' }[pl.type];
    const bodyH = clamp(pl.w * 0.26, 38, 74);
    g.save();
    g.translate(pl.x, pl.y); g.scale(1 + sq * 0.1, 1 - sq * 0.2);
    const drawn = drawArt(g, key, 0, -10 + (bodyH + 26) / 2, pl.w + 20, bodyH + 36, { fit: 'stretch' });
    g.restore();
    if (!drawn) {
      if (pl.type === 'pink') {
        // springs peeking out underneath
        g.save(); g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round';
        for (const s of [-1, 1]) {
          const bx = pl.x + s * pl.w * 0.22, top = pl.y + bodyH * 0.9, len = 26 * (1 - sq * 0.6);
          g.beginPath(); g.moveTo(bx, top);
          for (let k = 1; k <= 5; k++) g.lineTo(bx + (k % 2 ? 9 : -9), top + (len * k) / 5);
          g.strokeStyle = NAVY; g.lineWidth = 8; g.stroke(); g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.stroke();
        }
        g.restore();
      }
      const face = pl.type === 'rain' ? 'sleepy' : pl.type === 'pink' ? 'wow' : (pl.id % 3 === 0 ? 'happy' : null);
      puffShape(g, pl.x, pl.y, pl.w, PAL[pl.type] || PAL.cloud, sq, pl.puffs, 1, !!face, face || 'happy', t + pl.id);
      if (pl.type === 'pink') {
        g.save(); g.translate(pl.x + pl.w * 0.28, pl.y + 6); g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4 + pl.id);
        drawSparkleShape(g, 16, '#ffffff'); g.restore();
      }
      if (pl.type === 'move') {
        // wind swooshes trailing behind the drifting cloud
        const dir = Math.cos(t * pl.spd + pl.ph) >= 0 ? 1 : -1;
        g.save(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 5; g.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const lx = pl.x - dir * (pl.w / 2 + 18 + k * 6), ly = pl.y + 8 + k * 16;
          g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx - dir * (28 - k * 6), ly); g.stroke();
        }
        g.restore();
      }
    }
  }

  drawTramp(g, pl, sq) {
    g.save();
    g.translate(pl.x, pl.y);
    if (!drawArt(g, 'prop/cloudhop-trampoline', 0, 70, pl.w + 30, 100, { anchor: 'bottom' })) {
      const w = pl.w, dip = Math.max(0, sq) * 22;
      g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
      // little cloud it sits on
      puffShape(g, 0, 52, w * 0.9, PAL.cloud, 0, pl.puffs, 1, false);
      // legs
      g.fillStyle = '#7fd3ff';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * w * 0.36, 10); g.lineTo(s * w * 0.42, 54); g.lineTo(s * w * 0.32, 54); g.lineTo(s * w * 0.28, 10); g.closePath(); g.fill(); g.stroke(); }
      // springy mat
      g.fillStyle = '#ff6fb1';
      g.beginPath(); g.moveTo(-w / 2, 2); g.quadraticCurveTo(0, 2 + dip * 2, w / 2, 2); g.lineTo(w / 2, 14); g.quadraticCurveTo(0, 14 + dip * 2, -w / 2, 14); g.closePath(); g.fill(); g.stroke();
      g.save(); g.clip();
      g.fillStyle = '#ffffff'; for (let x = -w / 2; x < w / 2; x += 28) g.fillRect(x, -10, 12, 40);
      g.restore();
      g.beginPath(); g.moveTo(-w / 2, 2); g.quadraticCurveTo(0, 2 + dip * 2, w / 2, 2); g.lineTo(w / 2, 14); g.quadraticCurveTo(0, 14 + dip * 2, -w / 2, 14); g.closePath(); g.stroke();
      // rims
      g.fillStyle = '#ffd23f';
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * w / 2, 8, 9, 0, TAU); g.fill(); g.stroke(); }
    }
    g.restore();
  }

  drawBridge(g, pl, sq) {
    const w = pl.w;
    g.save(); g.translate(pl.x, pl.y + Math.max(0, sq) * 6);
    if (!drawArt(g, 'prop/cloudhop-bridge', 0, 40, w + 120, 140, { fit: 'stretch' })) {
      const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'];
      const sag = 14;
      const band = (y0, y1, col) => {
        g.beginPath(); g.moveTo(-w / 2, y0); g.quadraticCurveTo(0, y0 + sag * 2, w / 2, y0); g.lineTo(w / 2, y1); g.quadraticCurveTo(0, y1 + sag * 2, -w / 2, y1); g.closePath();
        g.fillStyle = col; g.fill();
      };
      g.lineJoin = 'round';
      g.save(); g.fillStyle = NAVY; g.beginPath(); g.moveTo(-w / 2 - 4, -4); g.quadraticCurveTo(0, -4 + sag * 2, w / 2 + 4, -4); g.lineTo(w / 2 + 4, 46); g.quadraticCurveTo(0, 46 + sag * 2, -w / 2 - 4, 46); g.closePath(); g.fill(); g.restore();
      cols.forEach((c, i) => band(i * 7, i * 7 + 7.5, c));
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(-w / 2 + 20, 3); g.quadraticCurveTo(0, 3 + sag * 2, w / 2 - 20, 3); g.lineTo(w / 2 - 20, 6); g.quadraticCurveTo(0, 6 + sag * 2, -w / 2 + 20, 6); g.closePath(); g.fill();
      // fluffy ends
      for (const s of [-1, 1]) puffShape(g, s * (w / 2 + 10), 2, 140, PAL.cloud, 0, pl.puffs, 1, false);
    }
    g.restore();
  }

  drawStars(g, v) {
    for (const s of this.stars) {
      if (s.taken || s.y < v.t - 60 || s.y > v.b + 60) continue;
      const bob = Math.sin(this.t * 3 + s.ph) * 7;
      g.save(); g.translate(s.x, s.y + bob);
      const k = 0.75 + Math.sin(this.t * 5 + s.ph) * 0.15;
      const gr = g.createRadialGradient(0, 0, 6, 0, 0, 56);
      gr.addColorStop(0, `rgba(255,236,120,${0.6 * k})`); gr.addColorStop(1, 'rgba(255,236,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 56, 0, TAU); g.fill();
      g.rotate(Math.sin(this.t * 2 + s.ph) * 0.25);
      if (!drawArt(g, 'prop/cloudhop-star', 0, 0, 72, 72)) drawStarShape(g, 30, '#ffd23f');
      g.restore();
    }
  }

  drawBubble(g, e) {
    const a = e.a, r = Math.max(a.height, a.width * 0.8) * 0.62 + 10;
    const cx = e.x, cy = e.y - a.height * 0.5;
    const wob = Math.sin(this.t * 7 + e.i) * 0.04;
    g.save(); g.translate(cx, cy); g.scale(1 + wob, 1 - wob);
    if (!drawArt(g, 'prop/cloudhop-bubble', 0, 0, r * 2.1, r * 2.1)) {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.75, 'rgba(190,230,255,0.18)'); gr.addColorStop(1, 'rgba(255,190,235,0.55)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
      g.strokeStyle = e.p.color; g.lineWidth = 3; g.globalAlpha = 0.8; g.beginPath(); g.arc(0, 0, r - 5, 0, TAU); g.stroke(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(-r * 0.42, -r * 0.45, r * 0.16, r * 0.09, -0.7, 0, TAU); g.fill();
    }
    g.restore();
  }

  drawMedal(g, e) {
    const a = e.a, x = e.x, y = e.y - a.height - 34 + Math.sin(this.t * 3 + e.i) * 4;
    const col = e.place === 1 ? '#ffd23f' : e.place === 2 ? '#dfe6f5' : e.place === 3 ? '#f0a565' : '#ff9ccf';
    g.save();
    g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.fillStyle = e.p.color;
    g.beginPath(); g.moveTo(x - 16, y - 34); g.lineTo(x - 4, y - 6); g.lineTo(x + 4, y - 6); g.lineTo(x + 16, y - 34); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(x, y + 10, 24, 0, TAU); g.fill(); g.stroke();
    ui.text(g, String(e.place), x, y + 12, { size: 28, color: NAVY, stroke: false, weight: 800 });
    g.restore();
  }

  pop(e, str, color, size) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    const lvl = e.popN % 3;
    particles.popText(e.x + (lvl === 1 ? 40 : lvl === 2 ? -40 : 0), e.y - e.a.height - 40 - lvl * 46, str, color, size);
  }

  // -------------------------------------------------------------------- HUD
  drawHUD(g) {
    const vals = this.ents.map((e) => e);
    this.chips = ui.scoreboard(g, this.players, vals, {
      y: 14, avoidCenter: true,
      format: (e) => (e.state === 'done' ? ordinal(e.place) : `${this.heightM(e)} m`),
      highlight: this.ents.map((e) => e.place === 1),
    });
    this.drawStarPips(g);
    ui.timer(g, this.timeLeft);
    this.drawTrack(g);
    this.drawOffscreen(g);
    if (this.n === 1 && this.playT < 5 && !this.done) {
      g.save(); g.globalAlpha = clamp(5 - this.playT, 0, 1);
      ui.text(g, 'Reach the rainbow!', W / 2, 160, { size: 44, color: '#ffd23f' });
      g.restore();
    }
    if (this.banner) {
      const b = this.banner;
      g.save(); g.globalAlpha = clamp(2.4 - b.t, 0, 1);
      ui.banner(g, b.text, b.t, { y: 215, size: b.small ? 84 : 100, color: b.color });
      g.restore();
    }
  }

  /** Three little star slots under each scoreboard chip (3 = rocket). Mirrors ui.scoreboard's layout. */
  drawStarPips(g) {
    this.ents.forEach((e, i) => {
      const c = this.chips && this.chips[i];
      if (!c) return;
      const cx = c.x + c.w / 2 + 20, y = 104;
      for (let k = 0; k < STARS_FOR_ROCKET; k++) {
        g.save(); g.translate(cx + (k - 1) * 30, y);
        if (k < e.stars) drawStarShape(g, 13, '#ffd23f');
        else { g.globalAlpha = 0.55; drawStarShape(g, 11, 'rgba(255,255,255,0.75)'); }
        g.restore();
      }
    });
  }

  /** Height track on the right edge: everyone's portrait at their altitude, the rainbow at the top. */
  drawTrack(g) {
    const x = 1842, top = 200, bot = 950;
    g.save();
    ui.roundRect(g, x - 18, top - 10, 36, bot - top + 20, 18);
    const gr = g.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, skyAt(1)); gr.addColorStop(0.5, skyAt(0.55)); gr.addColorStop(1, skyAt(0.1));
    g.fillStyle = gr; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
    // rainbow cap
    g.lineWidth = 7;
    ['#ff4d6d', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(x, top - 6, 40 - i * 7, Math.PI, TAU); g.stroke(); });
    g.translate(x, top - 52); drawStarShape(g, 16, '#ffd23f'); g.translate(-x, -(top - 52));
    // the screen window (what the camera shows)
    const yOf = (wy) => lerp(bot, top, clamp((FLOOR_Y - wy) / this.towerH, 0, 1));
    const w0 = yOf(this.camTop), w1 = yOf(this.camTop + H);
    g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, x - 15, w0, 30, Math.max(8, w1 - w0), 10); g.fill();
    // portraits (humans drawn last so they stay on top)
    const order = this.ents.slice().sort((a, b) => (a.p.isAI === b.p.isAI ? b.y - a.y : a.p.isAI ? -1 : 1));
    order.forEach((e, k) => {
      const py = yOf(e.state === 'done' ? this.summitY : e.y);
      const off = (e.i % 2 ? 1 : -1) * (e.p.isAI ? 14 : 0);
      drawPortrait(g, e.p, x + off, py, e.p.isAI ? 19 : 25, { ring: e.p.color, ringWidth: e.p.isAI ? 4 : 6 });
    });
    g.restore();
  }

  /** Arrows for anyone above the top edge (rocketing or springing high). */
  drawOffscreen(g) {
    for (const e of this.ents) {
      if (e.state !== 'air') continue;
      const head = e.y - e.a.height - this.camTop;
      if (head > 120) continue;
      const x = clamp(e.x, 80, X1);
      g.save(); g.translate(x, 170);
      g.fillStyle = e.p.color; g.strokeStyle = NAVY; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(0, -58); g.lineTo(18, -34); g.lineTo(-18, -34); g.closePath(); g.fill(); g.stroke();
      drawPortrait(g, e.p, 0, 0, 30, { ring: e.p.color, ringWidth: 6 });
      g.restore();
    }
  }
}
