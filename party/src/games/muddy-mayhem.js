// Muddy Mayhem (Molly Party): laundry day, and everybody is a muddy puppy at
// heart. Granny Goose has hung sparkling white sheets on the line and set out
// her fancy rug, her washing basket and a freshly painted picket fence. Run
// through the mud puddles to get muddier (you go browner and drippier), then
// press A next to something clean to SHAKE and splat mud all over it - the
// muddier you are, the bigger the splat and the more it scores. A pack of
// cheeky muddy puppies follows the muddiest player and adds their own splats.
// Granny Goose patrols with her hose: a big "!" and a honk, then she sprays a
// muddy player squeaky clean (giggles, no other penalty) - run away or just
// go and get muddy again. Surprise: a giant mud puddle bubbles up in the
// middle and erupts (super mud!). Last 10 s: Mud Party, double splats.
// Finale: Granny slips into the giant puddle, sits up covered in mud... and
// laughs, and everybody has a mud fight. Gentle counting (placementsFromScores).
//
// Art (all delivered; procedural fallbacks kept): bg/muddy-mayhem (falls back to
//   the reused bg/puppy-splash), thumb/muddy-mayhem, prop/mm-granny,
//   prop/mm-granny-spray, prop/mm-granny-gasp, prop/mm-granny-muddy,
//   prop/mm-sheet, prop/mm-rug, prop/mm-basket, prop/mm-fence,
//   prop/mm-mega-puddle, prop/mm-splat; reused prop/puppy-1..4, prop/mud-puddle.
// Sound hooks (fallbacks today): mm-squelch, mm-splat, mm-shake, mm-honk,
//   mm-gasp, mm-hose, mm-clean, mm-bark, mm-bloop, mm-erupt, mm-slip,
//   mm-sploosh, mm-granny-laugh, mm-party, mm-throw.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import { depthScale } from '../engine/camera.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime, steer, Brain } from '../engine/ai.js';
import { clamp, damp, rand, randInt, pick, chance, TAU, dist, lerp, later, placementsFromScores } from '../engine/util.js';
import {
  NAVY, PORCH_Y, PUDDLES, MEGA, MUD, MUD_COLS, drawPuppy, drawMudBlobs, makeBlobs, drawBackyard, drawLine, lineY,
  drawPuddle, drawMegaPuddle, drawMegaBubbles, targetPath, drawTarget, makeSplat, drawSplat, drawGoose, drawThumb,
} from './muddy-mayhem/art.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const ICON_BLOBS = makeBlobs(9);
const ICON_SPLATS = [[-60, 50, 34], [40, 90, 42], [-20, 150, 30], [70, 30, 26], [-80, 120, 22]].map(([x, y, r]) => ({ x, y, s: makeSplat(r) }));

export const meta = {
  id: 'muddy-mayhem',
  title: 'Muddy Mayhem',
  category: 'molly',
  type: 'Free-for-all',
  goal: 'Get super muddy and splat mud on Granny Goose\'s clean washing!',
  controls: [['stick', 'Run (through the mud!)'], ['a', 'Shake and SPLAT']],
  tips: ['Run through puddles - the muddier you are, the bigger the splat!', 'Granny Goose\'s "!" means hose time - run, or just get muddy again.', 'The puppies follow the muddiest player and splat too!'],
  music: 'party',
  duration: '55 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    const th = art('thumb/muddy-mayhem');
    if (th) { g.drawImage(th, x, y, w, h); return; }
    drawThumb(g, x, y, w, h, t, ICON_BLOBS, ICON_SPLATS);
  },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 55;
const MEGA_AT = 33;           // seconds left when the giant puddle bubbles up
const PARTY_AT = 10;          // last seconds: Mud Party (double splats)
const FINALE = 4.6;
const MAX_SPEED = 540;
const MUD_RATE = 1.5;         // mud per second while in a puddle
const SUPER = 1.5;            // mud cap in the giant puddle
const SHAKE_COST = 0.22;
const SPRAY_RANGE = 540;
const CPU_SPEED = [0.62, 0.74, 0.86];
const CPU_SHAKE = [1.25, 0.9, 0.65];      // seconds between CPU splats
const BOUNDS = { x0: 70, x1: W - 70, y0: 585, y1: 1035 };
const SPLAT_CAP = 70;
const DS = { top: PORCH_Y, near: 1000, far: 0.86, nearScale: 1.04 };

function ell(x, y, e, k = 1) { return ((x - e.x) / (e.rx * k)) ** 2 + ((y - e.y) / (e.ry * k)) ** 2; }

// Target art boxes in each target's local space: [key, x, y, w, h, anchor].
const TARGET_ART = {
  sheet: ['prop/mm-sheet', -115, -10, 230, 215, 'topleft'], rug: ['prop/mm-rug', 0, 0, 330, 175, 'center'],
  basket: ['prop/mm-basket', 0, 0, 180, 190, 'bottom'], fence: ['prop/mm-fence', 0, 0, 300, 160, 'bottom'],
};
// Points in the Granny art (drawn 0.45x into a 180x234 box, origin at her
// feet, facing right): the spray nozzle tip, and where the painted hose
// leaves the picture (the code draws the rest of the hose from there).
const GRANNY_NOZZLE = { x: 89, y: -130 };
const GRANNY_HOSE = { walk: { x: 86, y: -54 }, spray: { x: -90, y: -42 } };

/** Where a target's art lands (contain fit, like drawArt), or null when missing. */
function targetArtBox(kind) {
  const [key, x, y, w, h, anchor] = TARGET_ART[kind];
  const img = art(key);
  if (!img) return null;
  const s = Math.min(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  const dx = anchor === 'topleft' ? x + (w - dw) / 2 : x - dw / 2;
  const dy = anchor === 'topleft' ? y + (h - dh) / 2 : anchor === 'bottom' ? y - dh : y - dh / 2;
  return { img, x: dx, y: dy, w: dw, h: dh, s };
}

/** Local points well inside a target's painted area (splats land there). */
const splatSpotCache = {};
function splatSpots(kind) {
  if (splatSpotCache[kind]) return splatSpotCache[kind];
  const B = targetArtBox(kind);
  if (!B) return null;
  const c = document.createElement('canvas');
  c.width = Math.ceil(B.w); c.height = Math.ceil(B.h);
  const cx = c.getContext('2d');
  cx.drawImage(B.img, 0, 0, B.w, B.h);
  const d = cx.getImageData(0, 0, c.width, c.height).data;
  const A = (x, y) => (x >= 0 && y >= 0 && x < c.width && y < c.height ? d[(y * c.width + x) * 4 + 3] : 0);
  const pts = [];
  const top = kind === 'sheet' ? 22 : 0;   // below the pegs
  for (let y = top; y < c.height; y += 4) {
    for (let x = 0; x < c.width; x += 4) {
      if (A(x, y) > 200 && A(x - 7, y) > 200 && A(x + 7, y) > 200 && A(x, y - 7) > 200 && A(x, y + 7) > 200) pts.push([B.x + x, B.y + y]);
    }
  }
  return (splatSpotCache[kind] = pts.length ? pts : null);
}

/** One mud splat (art rotated, or the procedural one). */
function drawOneSplat(g, s, x, y, grow) {
  const img = art('prop/mm-splat');
  if (!img) { drawSplat(g, s.s, x, y, grow); return; }
  const d = s.s.r * 2.4 * grow;
  g.save(); g.translate(x, y); g.rotate(s.s.rot); g.drawImage(img, -d / 2, -d / 2, d, d); g.restore();
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.playT = 0; this.timeLeft = DURATION;
    this.phase = 'play'; this.ft = 0;
    this.baseScale = n <= 2 ? 0.9 : n <= 4 ? 0.84 : 0.74;
    this.party = false; this.partyT = 0;
    this.banner = null;
    this.splatSndAt = 0; this.barkAt = 0; this.squelchAt = 0;
    this.teamSplats = 0;
    this.balls = [];
    this.decor = Array.from({ length: 50 }, () => {
      let x, y, k = 0;
      do { x = rand(60, W - 60); y = rand(PORCH_Y + 30, 1060); k++; } while (PUDDLES.some((p) => ell(x, y, p, 1.4) < 1) && k < 20);
      return { x, y, s: rand(0.6, 1.1), c: pick(['#ffffff', '#ffffff', '#ffe066', '#ffb3d9', '#c9a0ff']) };
    });
    // Granny's clean things
    this.targets = [];
    [420, 780, 1140, 1500].forEach((x, i) => this.targets.push({ kind: 'sheet', n: i, x, y: 550, ax: x, ay: lineY(x) + 6, hit: { x, y: 605, rx: 178, ry: 90 }, splats: [], sway: 0, swayV: 0, wob: 0 }));
    this.targets.push({ kind: 'rug', n: 0, x: 960, y: 950, ax: 960, ay: 950, hit: { x: 960, y: 945, rx: 255, ry: 110 }, splats: [], sway: 0, swayV: 0, wob: 0, flat: true });
    this.targets.push({ kind: 'basket', n: 0, x: 190, y: 735, ax: 190, ay: 735, hit: { x: 200, y: 720, rx: 195, ry: 115 }, splats: [], sway: 0, swayV: 0, wob: 0 });
    this.targets.push({ kind: 'fence', n: 0, x: 1735, y: 735, ax: 1735, ay: 735, hit: { x: 1725, y: 720, rx: 235, ry: 115 }, splats: [], sway: 0, swayV: 0, wob: 0 });
    // players
    const rows = n <= 4 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const spots = [];
    rows.forEach((cnt, r) => {
      const y = rows.length === 1 ? 840 : r ? 960 : 800;
      for (let k = 0; k < cnt; k++) spots.push({ x: cnt === 1 ? W / 2 : 420 + ((W - 840) * (k + (r ? 0.5 : 0))) / Math.max(1, cnt - (r ? 0 : 1)), y });
    });
    this.ents = this.players.map((p, i) => {
      const s = spots[i];
      const x = clamp(s.x, BOUNDS.x0 + 40, BOUNDS.x1 - 40), y = s.y;
      const a = new Actor(p, { scale: this.baseScale, x, y });
      const sizeK = clamp(120 / a.leader.h, 1, 2.4);
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      const e = {
        p, a, i, x, y, vx: 0, vy: 0, sizeK, mud: 0, score: 0, cd: 0, cleanT: 0, immuneT: 0, hintT: 0, giggleCd: 0,
        brain: new Brain(p), goal: null, gx: x, gy: y, aiShake: rand(0.5, 1), inMud: false, splatFlash: 0, blobs: makeBodyBlobs(),
      };
      a.attach((g, info) => this.drawBodyMud(g, info, e));
      return e;
    });
    // puppies
    this.pups = [];
    const np = clamp(2 + Math.ceil(n / 2), 3, 6);
    for (let k = 0; k < np; k++) this.spawnPup(true);
    // Granny Goose
    this.granny = {
      x: 960, y: 640, facing: 1, state: 'walk', st: 0, wx: 960, wy: 640, step: 0, sprayCd: 5.5, scanT: 0, target: null,
      aimX: 0, aimY: 0, gaspCd: 0, mud: 0, z: 0, rot: 0, sq: 0, wt: 0, hitSet: new Set(),
    };
    this.mega = { state: 'none', k: 0, st: 0, boil: 0, bloopT: 0 };
    this.pickGrannySpot();
  }

  // ------------------------------------------------------------------ helpers
  inHit(e, T, k = 1) { return ell(e.x, e.y, T.hit, k) < 1; }
  nearestTarget(x, y) {
    let best = null, bd = 1e9;
    for (const T of this.targets) { const d = ell(x, y, T.hit); if (d < bd) { bd = d; best = T; } }
    return best;
  }
  nearestPuddle(x, y) {
    let best = PUDDLES[0], bd = 1e9;
    const list = this.mega.state === 'open' ? [...PUDDLES, MEGA] : PUDDLES;
    for (const p of list) { const d = dist(x, y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  puddleAt(x, y) {
    if (this.mega.state === 'open' && ell(x, y, MEGA, 0.92) < 1) return MEGA;
    return PUDDLES.find((p) => ell(x, y, p, 0.92) < 1) || null;
  }
  showBanner(text, dur, color, size = 130) { this.banner = { text, t: 0, dur, color, size }; }
  pts(mud) { return (mud >= 1.05 ? 3 : mud >= 0.55 ? 2 : 1) * (this.party ? 2 : 1); }

  /** Put a splat on a target; returns the splat. */
  addSplat(T, r, credit = null) {
    let lx, ly;
    const spots = splatSpots(T.kind);
    if (spots) [lx, ly] = pick(spots);
    else switch (T.kind) {
      case 'sheet': lx = rand(-98, 98); ly = rand(20, 188); break;
      case 'rug': lx = rand(-150, 150); ly = rand(-54, 54); break;
      case 'basket': lx = rand(-78, 78); ly = rand(-170, -16); break;
      default: lx = rand(-140, 140); ly = rand(-126, -12); break;
    }
    const s = { lx, ly, s: makeSplat(r, chance(0.3)), age: 0 };
    T.splats.push(s);
    if (T.splats.length > SPLAT_CAP) T.splats.shift();
    T.gen = (T.gen || 0) + 1;
    T.wob = 1; T.swayV += rand(-1, 1) * 3;
    this.teamSplats++;
    const wx = T.ax + lx, wy = T.ay + ly;
    particles.burst(wx, wy, { type: 'drop', count: 8, colors: MUD_COLS, speed: [120, 320], size: [6, 12] });
    if (this.t - this.splatSndAt > 0.07) { this.splatSndAt = this.t; snd('mm-splat', 'paint-splat-wet', { vol: 0.55, rate: rand(0.85, 1.2) }); }
    // Granny gasps at mess near her
    const G = this.granny;
    if (this.phase === 'play' && G.state === 'walk' && G.gaspCd <= 0 && dist(G.x, G.y - 60, wx, wy) < 420) {
      G.state = 'gasp'; G.st = 0; G.gaspCd = 2.6; G.facing = wx > G.x ? 1 : -1;
      snd('mm-gasp', 'crowd-gasp', { vol: 0.35 });
      particles.burst(G.x + G.facing * 30, G.y - 230, { type: 'confetti', count: 2, colors: ['#ffe066', '#ff9ccf'], speed: [160, 280] });
    }
    if (credit && this.teamSplats % 15 === 0) {
      particles.popText(W / 2, 250, pick(['Splat-tastic!', 'So muddy!', 'Messy!']), '#a8682e', 70);
      sfx('yay');
    }
    return s;
  }

  // ------------------------------------------------------------------ puppies
  spawnPup(inside = false) {
    const side = chance(0.5) ? -1 : 1;
    const x = inside ? rand(300, W - 300) : side < 0 ? -60 : W + 60;
    const y = inside ? rand(BOUNDS.y0 + 40, 980) : rand(BOUNDS.y0 + 60, 960);
    const d = {
      x, y, z: 0, vz: 0, vx: 0, vy: 0, breed: randInt(0, 3), mud: inside ? rand(0.5, 1) : 1, blobs: makeBlobs(randInt(8, 11)),
      t: rand(5), hop: 0, facing: side < 0 ? 1 : -1, state: 'run', st: 0, wx: x, wy: y, wt: 0, follow: null, splatCd: rand(2, 4),
      barkT: 0, sq: 0, speed: rand(300, 380), slot: rand(TAU), entering: !inside,
    };
    if (!inside) { d.wx = side < 0 ? 260 : W - 260; d.vz = 480; }
    this.pups.push(d);
    return d;
  }

  bark(d, vol = 0.45) {
    d.barkT = 0.4;
    if (this.t - this.barkAt < 0.15) return;
    this.barkAt = this.t;
    snd('mm-bark', 'squeak', { vol, rate: rand(1.0, 1.3) });
  }

  updatePup(d, dt) {
    d.t += dt; d.st += dt; d.sq = damp(d.sq, 0, 8, dt); d.barkT = Math.max(0, d.barkT - dt); d.splatCd -= dt;
    let landed = false;
    if (d.z > 0 || d.vz) { d.vz -= 2000 * dt; d.z += d.vz * dt; if (d.z <= 0) { d.z = 0; d.vz = 0; d.sq = 0.3; landed = true; } }
    const px = d.x;
    if (d.state === 'splat') {
      d.vx = damp(d.vx, 0, 4, dt); d.vy = damp(d.vy, 0, 4, dt);
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (landed) {
        const T = d.splatT;
        if (T && this.phase === 'play') {
          const r = 15 + d.mud * 10;
          this.addSplat(T, r, d.follow);
          d.mud = Math.max(0.15, d.mud - 0.25);
          if (d.follow) {
            const v = this.party ? 2 : 1;
            d.follow.score += v;
            particles.popText(d.x, d.y - 120, '+' + v, d.follow.p.color, 40);
          }
          this.bark(d, 0.4);
        }
        d.state = 'run'; d.st = 0; d.wt = 0;
      }
    } else if (d.state === 'roll') {
      d.vx = damp(d.vx, 0, 8, dt); d.vy = damp(d.vy, 0, 8, dt);
      d.mud = Math.min(1, d.mud + dt * 0.9);
      if (chance(dt * 6)) particles.burst(d.x + rand(-30, 30), d.y - 10, { type: 'drop', count: 2, colors: MUD_COLS, speed: [60, 180] });
      if (d.st > 1.2) { d.state = 'run'; d.st = 0; d.vz = 380; d.wt = 0; }
    } else {
      // run: follow the muddiest player, roll in puddles, splat clean things
      d.wt -= dt;
      if (d.wt <= 0) this.pupThink(d);
      let tx = d.wx, ty = d.wy;
      if (d.follow && d.state === 'run' && !d.goPuddle) {
        const f = d.follow;
        tx = f.x + Math.cos(d.slot + this.t * 0.6) * 110; ty = f.y + Math.sin(d.slot + this.t * 0.6) * 50 + 20;
      }
      const dd = dist(d.x, d.y, tx, ty);
      const sp = d.speed * (this.party ? 1.25 : 1) * (d.state === 'flee' ? 1.4 : 1);
      if (dd > 30) { d.vx = damp(d.vx, ((tx - d.x) / dd) * sp, 6, dt); d.vy = damp(d.vy, ((ty - d.y) / dd) * sp * 0.8, 6, dt); }
      else { d.vx = damp(d.vx, 0, 6, dt); d.vy = damp(d.vy, 0, 6, dt); }
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.entering) { if (d.x > 120 && d.x < W - 120) d.entering = false; }
      else { d.x = clamp(d.x, BOUNDS.x0, BOUNDS.x1); d.y = clamp(d.y, BOUNDS.y0, BOUNDS.y1 - 20); }
      d.hop += dt * (Math.hypot(d.vx, d.vy) > 40 ? 14 : 3);
      if (d.state === 'flee' && d.st > 1.3) { d.state = 'run'; d.goPuddle = true; d.wt = 0; }
      const pud = this.puddleAt(d.x, d.y);
      if (pud && d.goPuddle && dd < 60) { d.state = 'roll'; d.st = 0; d.goPuddle = false; this.squelch(0.3); }
      // splat something clean
      if (this.phase === 'play' && d.state === 'run' && d.splatCd <= 0 && d.mud > 0.3 && d.z <= 0) {
        const T = this.targets.find((T) => ell(d.x, d.y, T.hit, 0.85) < 1);
        if (T) {
          d.state = 'splat'; d.st = 0; d.vz = 560; d.splatT = T;
          d.vx = (T.hit.x - d.x) * 0.6; d.vy = (T.hit.y - 30 - d.y) * 0.6;
          d.splatCd = this.party ? rand(1.4, 2.4) : rand(2.4, 4.0);
          this.bark(d, 0.35);
        }
      }
    }
    if (Math.abs(d.x - px) > 0.5) d.facing = d.x > px ? 1 : -1;
  }

  pupThink(d) {
    d.wt = rand(0.6, 1.2);
    if (d.mud < 0.4 && !d.goPuddle) { d.goPuddle = true; }
    if (d.goPuddle) { const p = this.nearestPuddle(d.x, d.y); d.wx = p.x + rand(-30, 30); d.wy = p.y + rand(-10, 10); d.follow = null; return; }
    // follow the muddiest player (ties: whoever we already follow)
    let best = null, bm = 0.3;
    for (const e of this.ents) if (e.mud > bm + (d.follow === e ? -0.15 : 0)) { bm = e.mud; best = e; }
    if (best !== d.follow && best) this.bark(d, 0.25);
    d.follow = best;
    if (!best) {
      // nobody muddy: zoom about towards something clean
      const T = pick(this.targets);
      d.wx = clamp(T.hit.x + rand(-80, 80), BOUNDS.x0, BOUNDS.x1); d.wy = clamp(T.hit.y + rand(-20, 40), BOUNDS.y0, BOUNDS.y1);
    }
  }

  // ------------------------------------------------------------------ Granny
  pickGrannySpot() {
    const G = this.granny;
    for (let k = 0; k < 8; k++) {
      const T = pick(this.targets);
      G.wx = clamp(T.hit.x + rand(-160, 160), 160, W - 160); G.wy = clamp(T.hit.y + rand(10, 90), BOUNDS.y0 + 10, 960);
      if (!this.puddleAt(G.wx, G.wy) && ell(G.wx, G.wy, MEGA, 1.2) >= 1) break;
    }
    G.wt = rand(2.5, 4.5);
  }

  updateGranny(dt) {
    const G = this.granny;
    G.st += dt; G.gaspCd -= dt; G.sq = damp(G.sq, 0, 8, dt);
    if (this.phase !== 'play') return;
    G.sprayCd -= dt;
    switch (G.state) {
      case 'walk': {
        G.wt -= dt;
        const dd = dist(G.x, G.y, G.wx, G.wy);
        const sp = this.party ? 200 : 160;
        if (dd > 12) { G.x += ((G.wx - G.x) / dd) * sp * dt; G.y += ((G.wy - G.y) / dd) * sp * dt; G.step += dt * 9; G.facing = G.wx > G.x ? 1 : -1; }
        if (dd <= 12 || G.wt <= 0) this.pickGrannySpot();
        G.scanT -= dt;
        if (G.sprayCd <= 0 && G.scanT <= 0) {
          G.scanT = 0.35;
          let best = null, bs = -1;
          for (const e of this.ents) {
            if (e.mud < 0.35 || e.immuneT > 0) continue;
            const d = dist(G.x, G.y, e.x, e.y);
            if (d > 560) continue;
            const s = e.mud * 300 - d * 0.5 + rand(60);
            if (s > bs) { bs = s; best = e; }
          }
          if (best) {
            G.state = 'alert'; G.st = 0; G.target = best; G.facing = best.x > G.x ? 1 : -1;
            snd('mm-honk', 'pt-honk', { vol: 0.6 });
            G.sq = 0.3;
            best.a.playOnce('surprised', 0.4);
            if (!best.p.isAI) best.p.ctrl.rumble(0.3, 120);
          }
        }
        break;
      }
      case 'alert': {
        const e = G.target;
        if (e) G.facing = e.x > G.x ? 1 : -1;
        if (G.st > 1.15) {
          G.state = 'spray'; G.st = 0; G.hitSet.clear();
          const n = this.nozzle();
          G.aimX = n.x + G.facing * 120; G.aimY = n.y + 40;
          snd('mm-hose', 'hose-sputter', { vol: 0.5 });
        }
        break;
      }
      case 'spray': {
        const e = G.target;
        const n = this.nozzle();
        if (e) {
          const ty = e.y - e.a.height * 0.45;
          G.aimX = damp(G.aimX, e.x, 4.5, dt); G.aimY = damp(G.aimY, ty, 4.5, dt);
          G.facing = G.aimX > G.x ? 1 : -1;
        }
        // limit reach
        const dx = G.aimX - n.x, dy = G.aimY - n.y, L = Math.hypot(dx, dy);
        if (L > SPRAY_RANGE) { G.aimX = n.x + (dx / L) * SPRAY_RANGE; G.aimY = n.y + (dy / L) * SPRAY_RANGE; }
        if (chance(dt * 30)) particles.burst(G.aimX, G.aimY, { type: 'drop', count: 2, colors: ['#bfeaff', '#ffffff', '#7fd3ff'], speed: [80, 240], size: [6, 11] });
        if (chance(dt * 5)) snd('mm-spray', 'water', { vol: 0.2 });
        for (const o of this.ents) {
          if (G.hitSet.has(o)) continue;
          if (dist(o.x, o.y - o.a.height * 0.45, G.aimX, G.aimY) < 70 + o.a.radius * 0.6) { G.hitSet.add(o); this.washPlayer(o); }
        }
        for (const d of this.pups) {
          if (d.state === 'flee' || d.mud <= 0.05) continue;
          if (dist(d.x, d.y - 40, G.aimX, G.aimY) < 90) this.washPup(d);
        }
        if (G.st > 1.15) { G.state = 'walk'; G.st = 0; G.target = null; G.sprayCd = rand(3.2, 5.0) * (this.n <= 2 ? 1.25 : 1) * (this.party ? 0.8 : 1); this.pickGrannySpot(); }
        break;
      }
      case 'gasp': if (G.st > 0.7) { G.state = 'walk'; G.st = 0; } break;
      default: break;
    }
  }

  nozzle() {
    const G = this.granny, sc = this.grannyScale();
    const p = art('prop/mm-granny-spray') ? GRANNY_NOZZLE : { x: 128, y: -120 };
    return { x: G.x + G.facing * p.x * sc, y: G.y + p.y * sc };
  }
  grannyScale() { return depthScale(this.granny.y, DS) * 1.0; }

  washPlayer(e) {
    const a = e.a;
    const had = e.mud;
    e.mud = 0; e.immuneT = 2.6; e.cleanT = 1.0;
    a.tint(null);
    a.playOnce('surprised', 0.35, 'idle');
    later(() => { if (!this.finished) a.playOnce('shake', 0.6); }, 380);
    particles.burst(e.x, e.y - a.height * 0.7, { type: 'drop', count: 16, colors: ['#bfeaff', '#ffffff', '#7fd3ff'], speed: [100, 300] });
    particles.burst(e.x, e.y - a.height * 0.6, { type: 'bubble', count: 8, colors: ['#ffffff', '#bfeaff', '#ffd6f0'], speed: [40, 140] });
    if (had > 0.2) particles.burst(e.x, e.y - 10, { type: 'drop', count: 8, colors: MUD_COLS, speed: [60, 160] });
    particles.popText(e.x, e.y - a.height - 50, 'Squeaky clean!', '#3fa7ff', 40);
    snd('mm-clean', 'splash', { vol: 0.5 });
    if (e.giggleCd <= 0) { e.giggleCd = 2; voice(e.p.charId, 'laugh'); }
    if (!e.p.isAI) e.p.ctrl.rumble(0.4, 180);
  }

  washPup(d) {
    d.mud = 0; d.state = 'flee'; d.st = 0; d.follow = null; d.goPuddle = false;
    const G = this.granny;
    d.wx = clamp(d.x + (d.x > G.x ? 1 : -1) * 400, BOUNDS.x0, BOUNDS.x1); d.wy = clamp(d.y + rand(-100, 100), BOUNDS.y0, BOUNDS.y1);
    d.vz = 360;
    this.bark(d, 0.5);
    particles.burst(d.x, d.y - 40, { type: 'drop', count: 10, colors: ['#bfeaff', '#ffffff'], speed: [80, 220] });
  }

  // ------------------------------------------------------------------ mega puddle
  updateMega(dt) {
    const M = this.mega;
    M.st += dt;
    if (M.state === 'none' && this.phase === 'play' && this.timeLeft <= MEGA_AT) {
      M.state = 'rise'; M.st = 0;
      this.showBanner('BLOOP!', 2.0, '#a8682e', 170);
      fx.shake(6, 0.4);
      for (const e of this.ents) e.a.playOnce('surprised', 0.5);
      this.granny.state === 'walk' && (this.granny.state = 'gasp', this.granny.st = 0);
    }
    if (M.state === 'rise') {
      M.k = clamp(M.st / 2.0, 0, 1) * (1 + Math.sin(M.st * 18) * 0.04);
      M.boil = 1;
      M.bloopT -= dt;
      if (M.bloopT <= 0) { M.bloopT = 0.28; snd('mm-bloop', 'bubble', { vol: 0.5, rate: 0.6 + M.st * 0.25 }); }
      if (chance(dt * 20)) particles.burst(MEGA.x + rand(-180, 180) * M.k, MEGA.y + rand(-60, 40) * M.k, { type: 'drop', count: 1, colors: MUD_COLS, speed: [100, 260], angle: -Math.PI / 2, spread: 0.6 });
      if (M.st >= 2.2) this.erupt();
    } else if (M.state === 'open') {
      M.k = 1; M.boil = damp(M.boil, 0.25, 2, dt);
    }
  }

  erupt() {
    const M = this.mega;
    M.state = 'open'; M.st = 0;
    snd('mm-erupt', 'boom', { vol: 0.7 }); snd('mm-sploosh', 'splash', { vol: 0.8 });
    fx.shake(16, 0.5); fx.flash('#d9a46a', 0.2); fx.slowmo(0.45, 0.6);
    if (this.api.camera) this.api.camera.punch(MEGA.x, MEGA.y - 80, 1.18, 0.6);
    for (let k = 0; k < 4; k++) particles.burst(MEGA.x + rand(-120, 120), MEGA.y - 20, { type: 'drop', count: 18, colors: MUD_COLS, speed: [400, 900], angle: -Math.PI / 2, spread: 1.1, size: [10, 20] });
    // mud rains on everything
    for (const T of this.targets) for (let k = 0; k < 2; k++) later(() => this.addSplat(T, rand(18, 32)), 250 + k * 220 + rand(200));
    for (const e of this.ents) {
      if (dist(e.x, e.y, MEGA.x, MEGA.y) < 520) { e.mud = Math.max(e.mud, 0.9); e.a.playOnce('surprised', 0.4); later(() => !this.finished && e.a.playOnce('laugh', 0.8), 400); }
    }
    for (const d of this.pups) { d.mud = 1; d.vz = 500; }
    this.showBanner('Super mud!', 1.6, '#ffd23f', 140);
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); this.syncActor(e); e.a.update(dt); }
    for (const d of this.pups) this.updatePup(d, dt);
    this.animTargets(dt);
  }

  update(dt) {
    this.t += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.phase === 'play') {
      this.playT += dt;
      this.timeLeft = Math.max(0, DURATION - this.playT);
      if (!this.party && this.timeLeft <= PARTY_AT) this.startParty();
      for (const e of this.ents) {
        if (e.p.isAI) this.aiThink(e, dt);
        this.movePlayer(e, dt);
      }
      this.separate(dt);
      if (this.timeLeft <= 0) this.startFinale();
    } else if (this.phase === 'finale') {
      this.updateFinale(dt);
    }
    this.updateMega(dt);
    this.updateGranny(dt);
    for (const d of this.pups) this.updatePup(d, dt);
    this.pups = this.pups.filter((d) => !d.gone);
    this.animTargets(dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
    this.updateBalls(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    if (this.banner) this.banner.t += dt;
    this.updateFinale(dt);
    for (const d of this.pups) this.updatePup(d, dt);
    this.animTargets(dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
    this.updateBalls(dt);
  }

  animTargets(dt) {
    for (const T of this.targets) {
      T.wob = Math.max(0, T.wob - dt * 3);
      if (T.kind === 'sheet') {
        const wind = Math.sin(this.t * 1.3 + T.n * 1.7) * 0.25;
        T.swayV += ((wind - T.sway) * 30 - T.swayV * 4) * dt;
        T.sway += T.swayV * dt;
      }
      for (const s of T.splats) s.age += dt;
    }
  }

  syncActor(e) {
    e.a.x = e.x; e.a.y = e.y;
    e.a.scale = this.baseScale * e.sizeK * depthScale(e.y, DS);
  }

  startParty() {
    this.party = true; this.partyT = 0;
    this.showBanner('Mud Party!', 1.8, '#ff8fc7', 150);
    snd('mm-party', 'fanfare', { vol: 0.6 }); sfx('whistle');
    fx.flash('#fff6a8', 0.2); fx.shake(8, 0.3);
    for (let k = 0; k < 2; k++) this.spawnPup(false);
    for (const e of this.ents) e.a.playOnce('cheer', 0.5);
  }

  squelch(vol = 0.4) {
    if (this.t - this.squelchAt < 0.18) return;
    this.squelchAt = this.t;
    snd('mm-squelch', 'splat', { vol, rate: rand(0.8, 1.15) });
  }

  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.cd -= dt; e.cleanT -= dt; e.immuneT -= dt; e.hintT -= dt; e.giggleCd -= dt; e.splatFlash = Math.max(0, e.splatFlash - dt);
    let ix = c.x, iy = c.y;
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    const pud = this.puddleAt(e.x, e.y);
    const sp = MAX_SPEED * (p.isAI ? CPU_SPEED[clamp(p.aiLevel ?? 0, 0, 2)] / aiProfile(p).speed : 1) * (pud ? 0.78 : 1);
    e.vx = damp(e.vx, ix * sp, 10, dt); e.vy = damp(e.vy, iy * sp * 0.85, 10, dt);
    e.x = clamp(e.x + e.vx * dt, BOUNDS.x0, BOUNDS.x1); e.y = clamp(e.y + e.vy * dt, BOUNDS.y0, BOUNDS.y1);
    const speed = Math.hypot(e.vx, e.vy);
    // mud!
    if (pud) {
      const cap = pud === MEGA ? SUPER : 1;
      if (!e.inMud) {
        e.inMud = true; this.squelch(0.5);
        particles.burst(e.x, e.y, { type: 'drop', count: 10, colors: MUD_COLS, speed: [120, 300], size: [8, 14] });
        if (e.mud < 0.3) a.playOnce('cheer', 0.4);
      }
      if (e.mud < cap) {
        const before = e.mud;
        e.mud = Math.min(cap, e.mud + dt * MUD_RATE * (pud === MEGA ? 1.4 : 1));
        if (before < 1 && e.mud >= 1 && !e.p.isAI) { particles.popText(e.x, e.y - a.height - 40, 'Muddy!', '#a8682e', 44); sfx('pop'); }
        if (before < SUPER && e.mud >= SUPER - 0.001 && !e.p.isAI) { particles.popText(e.x, e.y - a.height - 40, 'SUPER muddy!', '#ffd23f', 50); sfx('sparkle'); }
      }
      if (speed > 120 && chance(dt * 10)) particles.burst(e.x + rand(-20, 20), e.y, { type: 'drop', count: 2, colors: MUD_COLS, speed: [80, 220] });
      if (speed > 150 && chance(dt * 3)) this.squelch(0.3);
    } else e.inMud = false;
    // mud look
    if (e.mud > 0.02) a.tint(e.mud > 1.05 ? '#5e3816' : MUD, clamp(0.12 + e.mud * 0.32, 0, 0.55)); else a.tint(null);
    if (e.mud > 0.3 && chance(dt * 4 * e.mud)) particles.burst(e.x + rand(-20, 20), e.y - a.height * rand(0.2, 0.6), { type: 'drop', count: 1, colors: MUD_COLS, speed: [10, 40], gravity: 700 });
    if (e.mud > 1.05 && chance(dt * 6)) particles.burst(e.x + rand(-30, 30), e.y - a.height * rand(0.3, 1), { type: 'sparkle', count: 1, colors: ['#ffd23f', '#fff6a8'], speed: [20, 60] });
    // A: shake and splat
    if (c.pressed('a') && e.cd <= 0) this.shake(e);
    if (!a._once) a.moveAnim(e.vx, e.vy, sp, { run: speed > sp * 0.6 });
  }

  shake(e) {
    const a = e.a;
    e.cd = 0.32;
    if (e.mud < 0.12) {
      // nothing to shake: a little puff, and point at the nearest puddle
      a.playOnce('shake', 0.35); a.squash(0.2);
      particles.burst(e.x, e.y - a.height * 0.5, { type: 'dust', count: 6, colors: ['#ffffff', '#e8dcc8'], speed: [40, 120] });
      sfx('pop', { vol: 0.25 });
      e.hintT = 1.8;
      return;
    }
    a.playOnce('shake', 0.45); a.squash(0.35);
    snd('mm-shake', 'pet-shake', { vol: 0.55 });
    const mudK = Math.min(1.4, e.mud);
    for (let k = 0; k < 2; k++) particles.burst(e.x, e.y - a.height * 0.55, { type: 'drop', count: 10, colors: MUD_COLS, speed: [200, 480], size: [8, 16] });
    if (!e.p.isAI) e.p.ctrl.rumble(0.3, 90);
    const hits = this.targets.filter((T) => this.inHit(e, T)).sort((A, B) => ell(e.x, e.y, A.hit) - ell(e.x, e.y, B.hit));
    if (hits.length) {
      const v = this.pts(e.mud);
      hits.slice(0, 2).forEach((T, i) => {
        const r = (i ? 15 : 19) + mudK * 15;
        this.addSplat(T, r, e);
        if (e.mud > 1.05) this.addSplat(T, r * 0.55, e);
      });
      e.score += v;
      e.splatFlash = 0.3;
      particles.popText(e.x, e.y - a.height - 60, '+' + v, v >= 3 ? '#ffd23f' : '#ffffff', 40 + v * 8);
      if (v >= 3) { fx.shake(5, 0.15); particles.burst(e.x, e.y - a.height * 0.6, { type: 'star', count: 8, colors: ['#ffd23f', '#ffffff'], speed: [150, 350] }); }
      if (chance(0.5)) later(() => !this.finished && a.playOnce('cheer', 0.4), 300);
      e.mud = Math.max(0, e.mud - SHAKE_COST);
    } else {
      // splat friends nearby (mud for everyone!)
      for (const o of this.ents) {
        if (o === e || dist(o.x, o.y, e.x, e.y) > 170) continue;
        o.mud = Math.min(1, o.mud + 0.25);
        o.a.playOnce('laugh', 0.6);
        if (o.giggleCd <= 0) { o.giggleCd = 2; voice(o.p.charId, 'laugh'); }
        particles.burst(o.x, o.y - o.a.height * 0.6, { type: 'drop', count: 6, colors: MUD_COLS, speed: [80, 200] });
      }
      e.mud = Math.max(0, e.mud - SHAKE_COST * 0.5);
    }
    if (e.mud <= 0.02) a.tint(null);
  }

  separate(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const r = (A.a.radius + B.a.radius) * 0.55;
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy);
      if (d < r && d > 0.01) {
        const k = ((r - d) / d) * 0.5 * Math.min(1, dt * 14);
        A.x -= dx * k; A.y -= (dy / 1.6) * k; B.x += dx * k; B.y += (dy / 1.6) * k;
      }
    }
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), c = p.ctrl, lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const G = this.granny;
    if (e.brain.ready(dt)) {
      const hunted = G.target === e && (G.state === 'alert' || G.state === 'spray');
      if (hunted && lvl >= 1 && chance(0.6 + lvl * 0.15)) {
        e.goal = 'flee';
        const ang = Math.atan2(e.y - G.y, e.x - G.x);
        e.gx = clamp(e.x + Math.cos(ang) * 500, BOUNDS.x0 + 40, BOUNDS.x1 - 40); e.gy = clamp(e.y + Math.sin(ang) * 300, BOUNDS.y0 + 20, BOUNDS.y1 - 20);
      } else if (e.mud < [0.45, 0.6, 0.75][lvl]) {
        e.goal = 'puddle';
        const pud = lvl >= 1 && this.mega.state === 'open' && chance(0.5) ? MEGA : this.nearestPuddle(e.x, e.y);
        e.gx = pud.x + rand(-30, 30); e.gy = pud.y + rand(-12, 12);
      } else if (chance(prof.mistake)) {
        e.goal = 'wander'; e.gx = rand(200, W - 200); e.gy = rand(BOUNDS.y0 + 40, 980);
      } else if (e.goal !== 'target' || !e.T || chance(0.35)) {
        const list = this.targets.slice().sort((A, B) => dist(e.x, e.y, A.hit.x, A.hit.y) - dist(e.x, e.y, B.hit.x, B.hit.y)).slice(0, 3);
        e.T = pick(list); e.goal = 'target';
        e.gx = clamp(e.T.hit.x + rand(-0.5, 0.5) * e.T.hit.rx, BOUNDS.x0 + 30, BOUNDS.x1 - 30);
        e.gy = clamp(e.T.hit.y + rand(-0.2, 0.4) * e.T.hit.ry, BOUNDS.y0 + 5, BOUNDS.y1 - 20);
      }
      e.brain.wait(reactionTime(p) + rand(0.35, 0.8));
    }
    if (e.goal === 'puddle') {
      const pud = this.puddleAt(e.x, e.y);
      if (pud && e.mud < (pud === MEGA ? SUPER - 0.05 : 0.95)) { c.move(rand(-0.3, 0.3), rand(-0.3, 0.3)); return; }
      if (pud) { e.brain.wait(0); e.goal = null; }
    }
    if (e.goal === 'target' && e.T && this.inHit(e, e.T, 0.8)) {
      c.move(0, 0);
      e.aiShake -= dt;
      if (e.aiShake <= 0) { c.press('a'); e.aiShake = CPU_SHAKE[lvl] * rand(0.8, 1.3); }
      return;
    }
    const d = steer(p, e.x, e.y, e.gx, e.gy, { arrive: 50 });
    if (d < 14) c.move(0, 0);
  }

  // ------------------------------------------------------------------ finale
  startFinale() {
    this.phase = 'finale'; this.ft = 0;
    const G = this.granny;
    G.state = 'hurry'; G.st = 0; G.fromX = G.x; G.fromY = G.y; G.target = null;
    // everyone gathers in a row in front of the giant puddle to watch
    const order = this.ents.slice().sort((A, B) => A.x - B.x);
    order.forEach((e, k) => {
      const n = order.length;
      e.fx = n === 1 ? W / 2 - 300 : lerp(300, W - 300, k / (n - 1));
      if (n > 1 && Math.abs(e.fx - W / 2) < 120) e.fx += e.fx < W / 2 ? -150 : 150;
      e.fy = 960 - (k % 2) * 50;
      if (e.p.isAI) e.p.ctrl.move(0, 0);
    });
    this.showBanner('Uh oh, Granny!', 1.2, '#ffffff', 110);
    snd('mm-honk', 'pt-honk', { vol: 0.6 });
  }

  updateFinale(dt) {
    if (this.phase !== 'finale') return;
    this.ft += dt;
    const G = this.granny, ft = this.ft;
    for (const e of this.ents) {
      const d = dist(e.x, e.y, e.fx, e.fy);
      const sp = Math.min(d / Math.max(dt, 1e-3), 700);
      e.vx = d > 4 ? ((e.fx - e.x) / d) * sp : 0; e.vy = d > 4 ? ((e.fy - e.y) / d) * sp : 0;
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (!e.a._once) {
        if (d > 8 && ft < 1.7) e.a.moveAnim(e.vx, e.vy, 700, { run: true });
        else if (ft < 1.7) { e.a.facing = MEGA.x > e.x ? 1 : -1; e.a.setPose('idle'); }
      }
    }
    if (G.state === 'hurry') {
      const k = clamp(ft / 1.0, 0, 1);
      G.x = lerp(G.fromX, MEGA.x - 60, k); G.y = lerp(G.fromY, MEGA.y + 10, k);
      G.facing = MEGA.x - 60 >= G.fromX ? 1 : -1; G.step += dt * 16;
      if (ft >= 1.0) { G.state = 'slip'; G.st = 0; snd('mm-slip', 'wheee-fall', { vol: 0.6 }); G.vz = 520; }
    } else if (G.state === 'slip') {
      G.vz -= 1600 * dt; G.z = Math.max(0, G.z + G.vz * dt);
      G.rot = -Math.min(1.4, G.st * 3.2) * G.facing;
      G.x += G.facing * 70 * dt;
      if (G.st > 0.62) {
        G.state = 'sit'; G.st = 0; G.z = 0; G.rot = 0; G.mud = 1; G.x = MEGA.x; G.y = MEGA.y + 10;
        snd('mm-sploosh', 'splash', { vol: 0.9 }); sfx('splat');
        fx.shake(18, 0.5); fx.slowmo(0.4, 0.7); fx.flash('#d9a46a', 0.15);
        if (this.api.camera) this.api.camera.punch(G.x, G.y - 120, 1.25, 0.8);
        for (let k = 0; k < 3; k++) particles.burst(G.x + rand(-100, 100), G.y - 20, { type: 'drop', count: 20, colors: MUD_COLS, speed: [300, 800], angle: -Math.PI / 2, spread: 1.2, size: [10, 20] });
        for (const e of this.ents) e.a.playOnce('surprised', 0.6);
      }
    } else if (G.state === 'sit') {
      if (G.st > 0.6 && !G.laughed) {
        G.laughed = true;
        snd('mm-granny-laugh', 'giggle', { vol: 0.8 });
        particles.burst(G.x, G.y - 200, { type: 'heart', count: 10, colors: ['#ff6fb1', '#ff9ad5'], speed: [120, 300] });
        particles.confettiRain(W, 80);
        for (const e of this.ents) { e.a.setPose('celebrate'); voice(e.p.charId, 'laugh'); }
        sfx('cheer');
      }
      if (G.st > 0.8 && !this.finished) {
        // mud fight!
        this.ballT = (this.ballT ?? 0) - dt;
        if (this.ballT <= 0) {
          this.ballT = rand(0.12, 0.25);
          const from = pick(this.ents);
          const to = chance(0.3) ? null : pick(this.ents.filter((o) => o !== from)) || null;
          this.throwBall(from, to);
        }
      }
      if (G.st > 2.8 && !this.finished) this.finish();
    }
  }

  throwBall(from, to) {
    const fx0 = from ? from.x : this.granny.x, fy0 = from ? from.y - from.a.height * 0.7 : this.granny.y - 150;
    const tx = to ? to.x : this.granny.x + rand(-40, 40), ty = to ? to.y - to.a.height * 0.6 : this.granny.y - 120;
    if (from) { from.a.playOnce('throw', 0.4, 'celebrate'); from.a.facing = tx >= fx0 ? 1 : -1; }
    this.balls.push({ x0: fx0, y0: fy0, x1: tx, y1: ty, t: 0, dur: rand(0.4, 0.6), to });
    snd('mm-throw', 'whoosh', { vol: 0.25 });
  }

  updateBalls(dt) {
    for (const b of this.balls) {
      b.t += dt;
      if (b.t >= b.dur && !b.hit) {
        b.hit = true;
        particles.burst(b.x1, b.y1, { type: 'drop', count: 8, colors: MUD_COLS, speed: [100, 260] });
        if (this.t - this.splatSndAt > 0.06) { this.splatSndAt = this.t; sfx('splat', { vol: 0.35 }); }
        if (b.to) { b.to.mud = Math.min(1, b.to.mud + 0.3); b.to.a.tint(MUD, 0.3 + b.to.mud * 0.2); b.to.a.squash(0.3); }
      }
    }
    this.balls = this.balls.filter((b) => !b.hit);
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const scores = this.ents.map((e) => e.score);
    this.api.finish({
      placements: placementsFromScores(scores),
      stats: scores.map((s) => `${s} splat${s === 1 ? '' : 's'}`),
      focus: { x: MEGA.x, y: MEGA.y - 60, zoom: 1.15 },
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    const t = this.t;
    const bg = art('bg/muddy-mayhem') || art('bg/puppy-splash');
    if (bg) g.drawImage(bg, 0, 0, W, H); else drawBackyard(g, t, this.decor);
    drawLine(g, t);
    // flat things: puddles, the giant puddle, the rug
    // art box sized so the painted puddle (its middle ~2/3 in height) fills the wade ellipse
    for (const p of PUDDLES) if (!drawArt(g, 'prop/mud-puddle', p.x, p.y, p.rx * 2.05, p.ry * 2.9, { fit: 'stretch' })) drawPuddle(g, p, t);
    const M = this.mega;
    if (M.k > 0.01) {
      const k = M.k;
      if (!drawArt(g, 'prop/mm-mega-puddle', MEGA.x, MEGA.y, 450 * k, 210 * k)) drawMegaPuddle(g, t, k, M.boil);
      else if (M.boil > 0.3) { g.save(); g.globalAlpha = clamp((M.boil - 0.3) / 0.7, 0, 1); drawMegaBubbles(g, t, k, M.boil); g.restore(); }
      if (M.state === 'open' && chance(0.08)) particles.burst(MEGA.x + rand(-150, 150), MEGA.y + rand(-40, 30), { type: 'sparkle', count: 1, colors: ['#ffd23f', '#fff6a8'], speed: [20, 60] });
    }
    const hiT = this.highlightTargets();
    for (const T of this.targets) if (T.kind === 'sheet' || T.flat) this.drawTarget(g, T, hiT.has(T));
    // standing things sorted by depth
    const items = [];
    for (const T of this.targets) if (!(T.kind === 'sheet' || T.flat)) items.push({ y: T.y, f: () => this.drawTarget(g, T, hiT.has(T)) });
    for (const d of this.pups) items.push({ y: d.y, f: () => this.drawPup(g, d) });
    for (const e of this.ents) items.push({ y: e.y, f: () => this.drawPlayer(g, e) });
    items.push({ y: this.granny.y, f: () => this.drawGranny(g) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();
    if (this.granny.state === 'spray') this.drawSpray(g);
    // mud balls (finale)
    for (const b of this.balls) {
      const k = clamp(b.t / b.dur, 0, 1);
      const x = lerp(b.x0, b.x1, k), y = lerp(b.y0, b.y1, k) - Math.sin(k * Math.PI) * 140;
      g.fillStyle = MUD;
      g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke();
    }
    // tags + cues
    for (const e of this.ents) {
      const a = e.a;
      const top = e.y - a.height - 22;
      if (this.phase === 'play' && !e.p.isAI) this.drawCue(g, e, top);
      if (this.playT < 6 || (!e.p.isAI && this.n > 1)) ui.playerTag(g, e.p, e.x, top - (a.emotes.length ? 50 : 0) - (this.cueUp(e) ? 70 : 0));
    }
  }

  /** Targets a human could splat right now (they glow). */
  highlightTargets() {
    const s = new Set();
    if (this.phase !== 'play') return s;
    for (const e of this.ents) {
      if (e.p.isAI || e.mud < 0.12) continue;
      for (const T of this.targets) if (this.inHit(e, T)) s.add(T);
    }
    return s;
  }

  cueUp(e) { return e.mud >= 0.12 && this.targets.some((T) => this.inHit(e, T)); }

  drawCue(g, e, top) {
    const t = this.t;
    if (this.cueUp(e)) {
      // "press A" bubble over a muddy player next to something clean
      const bob = Math.sin(t * 8) * 5;
      ui.glyph(g, 'a', e.x, top - 30 + bob, 54, { pulse: true });
    } else if (e.mud < 0.12 && (this.playT < 12 || e.hintT > 0)) {
      // arrow toward the nearest puddle
      const p = this.nearestPuddle(e.x, e.y);
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      if (dist(e.x, e.y, p.x, p.y) < 90) return;
      const r = 70 + Math.sin(t * 7) * 8;
      g.save(); g.translate(e.x + Math.cos(ang) * r, e.y - 10 + Math.sin(ang) * r * 0.6); g.rotate(ang);
      g.fillStyle = '#a8682e'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.moveTo(26, 0); g.lineTo(-8, -20); g.lineTo(-8, -9); g.lineTo(-26, -9); g.lineTo(-26, 9); g.lineTo(-8, 9); g.lineTo(-8, 20); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }

  drawTarget(g, T, hi) {
    const t = this.t;
    g.save(); g.translate(T.ax, T.ay);
    const wob = T.wob;
    if (T.kind !== 'sheet' && wob > 0) { const s = 1 + Math.sin(wob * 18) * wob * 0.05; g.scale(1 / s, s); }
    if (T.kind === 'sheet') g.transform(1, 0, T.sway * 0.1, 1, 0, 0);
    const B = targetArtBox(T.kind);
    if (B) {
      // art + splats painted onto it (clipped to its alpha), glowing when splattable
      const layer = this.targetLayer(T, B);
      g.save();
      if (hi) { g.shadowColor = `rgba(255,246,168,${0.75 + 0.25 * Math.sin(t * 10)})`; g.shadowBlur = 34; }
      g.drawImage(layer, B.x, B.y, B.w, B.h);
      g.restore();
      g.restore();
      return;
    }
    if (hi) {
      g.save(); g.globalAlpha = 0.45 + 0.25 * Math.sin(t * 10);
      g.strokeStyle = '#fff6a8'; g.lineWidth = 16; targetPath(g, T, T.sway * 0); g.stroke();
      g.restore();
    }
    drawTarget(g, T, t);
    // splats, clipped to the thing they landed on
    if (T.splats.length) {
      g.save(); targetPath(g, T, T.sway); g.clip();
      for (const s of T.splats) {
        const grow = Math.min(1, 0.3 + s.age * 6);
        const sx = s.lx + (T.kind === 'sheet' ? T.sway * 22 * (s.ly / 205) : 0);
        drawOneSplat(g, s, sx, s.ly, grow);
      }
      g.restore();
    }
    g.restore();
  }

  /** Offscreen copy of a target's art with its splats painted on (source-atop). */
  targetLayer(T, B) {
    let c = T.layer;
    if (!c || c.width !== B.img.width || c.height !== B.img.height) {
      c = T.layer = document.createElement('canvas');
      c.width = B.img.width; c.height = B.img.height; T.layerGen = -1;
    }
    const last = T.splats[T.splats.length - 1];
    if (T.layerGen === (T.gen || 0) && !(last && last.age < 0.15)) return c;
    T.layerGen = T.gen || 0;
    const x = c.getContext('2d');
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(B.img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.save(); x.scale(1 / B.s, 1 / B.s); x.translate(-B.x, -B.y);
    for (const s of T.splats) drawOneSplat(x, s, s.lx, s.ly, Math.min(1, 0.3 + s.age * 6));
    x.restore();
    x.globalCompositeOperation = 'source-over';
    return c;
  }

  drawPlayer(g, e) {
    const a = e.a;
    // muddy footprint ring under the player: fills with mud
    if (e.mud > 0.02) {
      g.save(); g.globalAlpha = 0.55; g.fillStyle = e.mud > 1.05 ? '#5e3816' : MUD;
      g.beginPath(); g.ellipse(e.x, e.y + 2, a.radius * (0.6 + 0.5 * Math.min(1, e.mud)), a.radius * 0.28, 0, 0, TAU); g.fill(); g.restore();
    }
    if (e.immuneT > 0 && e.mud <= 0.05) {
      g.save(); g.globalAlpha = 0.3 * clamp(e.immuneT, 0, 1); g.fillStyle = '#bfeaff';
      g.beginPath(); g.ellipse(e.x, e.y - a.height * 0.5, a.width * 0.7 + 20, a.height * 0.6, 0, 0, TAU); g.fill(); g.restore();
    }
    a.draw(g, { ring: e.p.color });
  }

  drawBodyMud(g, info, e) {
    if (e.mud < 0.25) return;
    const k = clamp((e.mud - 0.25) / 0.75, 0, 1);
    const h = info.h;
    const pts = [
      [info.neck.x, info.neck.y + h * 0.08], [info.back.x, info.back.y], [info.hand.x * 0.8, info.hand.y],
      [info.head.x * 0.6, info.head.y + h * 0.1], [h * 0.06, -h * 0.28], [-h * 0.05, -h * 0.12],
    ];
    g.fillStyle = e.mud > 1.05 ? '#5e3816' : MUD;
    pts.forEach(([x, y], i) => {
      const b = e.blobs[i];
      if (b.k > k) return;
      const r = h * b.r * (0.6 + 0.4 * k);
      g.globalAlpha = 0.85;
      g.beginPath(); g.ellipse(x + b.dx * h, y + b.dy * h, r * 1.2, r, b.a, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + b.dx * h + r, y + b.dy * h + r * 0.6, r * 0.35, 0, TAU); g.fill();
    });
    g.globalAlpha = 1;
  }

  drawPup(g, d) {
    const sc = depthScale(d.y, DS) * 0.92;
    const moving = Math.hypot(d.vx, d.vy) > 40;
    const bob = moving && d.z <= 0 ? Math.abs(Math.sin(d.hop)) * 8 : 0;
    g.save();
    g.fillStyle = 'rgba(36,22,63,0.2)'; g.beginPath(); g.ellipse(d.x, d.y, 50 * sc, 12 * sc, 0, 0, TAU); g.fill();
    g.translate(d.x, d.y - d.z - bob);
    let rot = 0;
    if (d.state === 'roll') rot = Math.sin(d.t * 8) * 1.2;
    else if (d.state === 'splat') rot = Math.sin(d.t * 50) * 0.18;
    const sq = d.sq;
    g.scale(sc * d.facing * (1 + sq * 0.4), sc * (1 - sq * 0.4));
    g.translate(0, -30); g.rotate(rot); g.translate(0, 30);
    const img = art(`prop/puppy-${(d.breed % 4) + 1}`);
    if (img) {
      // puppy art with its mud painted on, clipped to the puppy (source-atop)
      const s = Math.min(122 / img.width, 100 / img.height);
      let c = d.layer;
      if (!c || c.width !== img.width || c.height !== img.height) { c = d.layer = document.createElement('canvas'); c.width = img.width; c.height = img.height; }
      const x = c.getContext('2d');
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
      if (d.mud > 0.001) {
        x.globalCompositeOperation = 'source-atop';
        x.save(); x.scale(1 / s, 1 / s); x.translate(img.width * s / 2, img.height * s); drawMudBlobs(x, d.blobs, d.mud, d.t); x.restore();
        x.globalCompositeOperation = 'source-over';
      }
      g.drawImage(c, -img.width * s / 2, -img.height * s, img.width * s, img.height * s);
    } else {
      drawPuppy(g, { breed: d.breed, mud: d.mud, t: d.t, run: moving ? 1 : 0, wag: true, shake: d.state === 'splat' ? 1 : 0, tongue: d.state !== 'splat', bark: d.barkT > 0.05, eyesShut: d.state === 'roll' || d.state === 'splat' });
      drawMudBlobs(g, d.blobs, d.mud, d.t);
    }
    g.restore();
    if (d.barkT > 0.05) {
      g.save(); g.translate(d.x + d.facing * 60 * sc, d.y - 120 * sc - d.z); g.rotate(-0.1 * d.facing);
      ui.text(g, 'Woof!', 0, 0, { size: 30, color: '#ffffff', strokeWidth: 6 });
      g.restore();
    }
    if (d.follow && this.phase === 'play' && d.state === 'run' && Math.sin(d.t * 3 + d.slot) > 0.6) {
      // tiny heart toward the leader of the pack
      g.save(); g.globalAlpha = 0.8; g.fillStyle = d.follow.p.color;
      const hx = d.x, hy = d.y - 115 * sc;
      g.beginPath(); g.moveTo(hx, hy + 7); g.bezierCurveTo(hx - 12, hy - 2, hx - 6, hy - 12, hx, hy - 5); g.bezierCurveTo(hx + 6, hy - 12, hx + 12, hy - 2, hx, hy + 7); g.fill();
      g.restore();
    }
  }

  drawGranny(g) {
    const G = this.granny, t = this.t;
    const sc = this.grannyScale();
    const pose = G.state === 'alert' ? 'alert' : G.state === 'spray' ? 'spray' : G.state === 'gasp' ? 'gasp' : G.state === 'sit' ? 'sit' : G.state === 'slip' ? 'gasp' : 'walk';
    const key = { walk: 'prop/mm-granny', alert: 'prop/mm-granny-gasp', gasp: 'prop/mm-granny-gasp', spray: 'prop/mm-granny-spray', sit: 'prop/mm-granny-muddy' }[pose];
    const bob = pose === 'walk' ? Math.abs(Math.sin(G.step)) * 6 : pose === 'alert' ? Math.abs(Math.sin(G.st * 14)) * 10 : 0;
    const sq = G.sq;
    // hose trailing back to the tap on the porch
    if (G.state !== 'sit' && G.state !== 'slip') {
      const b = -G.facing;
      // start where the painted hose leaves the art (same transform as the art below)
      const hs = art(key) && GRANNY_HOSE[pose];
      let n;
      if (hs) {
        const r = pose === 'walk' ? Math.sin(G.step) * 0.06 : 0;
        const lx = hs.x * Math.cos(r) - hs.y * Math.sin(r), ly = hs.x * Math.sin(r) + hs.y * Math.cos(r) - bob;
        n = { x: G.x + lx * sc * G.facing * (1 + sq * 0.3), y: G.y - G.z + ly * sc * (1 - sq * 0.3) };
      } else n = { x: G.x + G.facing * 30 * sc, y: G.y - 70 * sc };
      const front = hs && pose === 'walk';   // painted hose ends in front of her: loop it down and back
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (const [c, w] of [['#2e9a48', 9], ['#5fd47a', 3]]) {
        g.strokeStyle = c; g.lineWidth = w;
        g.beginPath(); g.moveTo(n.x, n.y);
        if (front) { g.quadraticCurveTo(G.x + G.facing * 110 * sc, G.y + 18, G.x, G.y + 22); g.quadraticCurveTo(G.x + b * 90, G.y + 22, G.x + b * 170, G.y + 14); }
        else g.quadraticCurveTo(G.x + b * 60, G.y + 24, G.x + b * 170, G.y + 14);
        g.bezierCurveTo(G.x + b * 240, G.y + 6, G.x + b * 250, G.y + 50, G.x + b * 330, G.y + 34 + Math.sin(this.t * 2) * 4); g.stroke();
      }
      g.restore();
    }
    g.save();
    g.fillStyle = 'rgba(36,22,63,0.2)'; g.beginPath(); g.ellipse(G.x, G.y, 70 * sc, 16 * sc, 0, 0, TAU); g.fill();
    g.translate(G.x, G.y - G.z);
    g.rotate(G.rot);
    g.scale(sc * G.facing * (1 + sq * 0.3), sc * (1 - sq * 0.3));
    g.translate(0, -bob);
    if (pose === 'walk') g.rotate(Math.sin(G.step) * 0.06);
    if (!drawArt(g, key, 0, 0, pose === 'sit' ? 250 : 180, pose === 'sit' ? 220 : 234, { anchor: 'bottom' })) drawGoose(g, { t, pose, mud: G.mud, step: G.step });
    g.restore();
    // the big "!" (and a laugh in the finale)
    if (G.state === 'alert') {
      const k = clamp(G.st / 0.2, 0, 1);
      g.save(); g.translate(G.x, G.y - 270 * sc - Math.abs(Math.sin(G.st * 10)) * 10); g.scale(k, k);
      ui.panel(g, -46, -56, 92, 112, { r: 40, fill: '#ffe066', stroke: NAVY, lineWidth: 6 });
      ui.text(g, '!', 0, 4, { size: 96, color: '#ff4d6d', strokeWidth: 10 });
      g.restore();
    } else if (G.state === 'sit' && G.st > 0.6) {
      g.save(); g.translate(G.x + 120, G.y - 250 - Math.abs(Math.sin(G.st * 9)) * 10); g.rotate(-0.08);
      ui.text(g, 'Honk honk!', 0, 0, { size: 52, color: '#ffffff', strokeWidth: 9 });
      g.restore();
    }
  }

  drawSpray(g) {
    const G = this.granny, n = this.nozzle();
    const k = clamp(G.st / 0.12, 0, 1);
    const ex = lerp(n.x, G.aimX, k), ey = lerp(n.y, G.aimY, k);
    const mx = (n.x + ex) / 2, my = (n.y + ey) / 2 - 40 * k;
    g.save(); g.lineCap = 'round';
    for (const [c, w] of [['rgba(127,211,255,0.45)', 32], ['rgba(127,211,255,0.9)', 16], ['#ffffff', 6]]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(n.x, n.y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); }
    for (let i = 0; i < 8; i++) {
      const f = ((i / 8) + this.t * 1.2) % 1;
      const px = lerp(lerp(n.x, mx, f), lerp(mx, ex, f), f), py = lerp(lerp(n.y, my, f), lerp(my, ey, f), f);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px + Math.sin(this.t * 20 + i) * 5, py, 5, 0, TAU); g.fill();
    }
    g.globalAlpha = 0.6; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex, ey, 34, 18, 0, 0, TAU); g.fill();
    g.restore();
  }

  drawHUD(g) {
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), {
      y: 16, avoidCenter: true, format: (v) => String(v),
      expr: this.ents.map((e) => (e.cleanT > 0 ? 'surprised' : e.splatFlash > 0 ? 'happy' : 'neutral')),
    });
    if (this.phase === 'play') ui.timer(g, this.timeLeft);
    if (this.banner) {
      const b = this.banner, fade = clamp((b.dur - b.t) / 0.3, 0, 1);
      g.save(); g.globalAlpha = fade;
      ui.banner(g, b.text, b.t, { y: 470, size: b.size, color: b.color });
      g.restore();
    }
  }
}

function makeBodyBlobs() {
  return Array.from({ length: 6 }, (_, i) => ({ k: i / 6, r: rand(0.035, 0.06), dx: rand(-0.04, 0.04), dy: rand(-0.04, 0.04), a: rand(3) }));
}
