// Hair Salon (Play Studio): every player runs a salon chair with a big,
// friendly client whose hair is a messy bed-head. Brush it smooth, snip it,
// grow it with the magic spray, curl or straighten it, colour it (rainbow
// streaks and glitter too), tie it up (ponytail, pigtails, bun, space buns,
// braid) and add bows, flowers, clips and tiaras. Press X when the look is
// done. Then a hand-mirror reveal at every chair and a photo-wall showcase:
// the camera visits each client, and the stylists pose for a group photo.
//
// The hair is live strand geometry (games/hair-salon/hair.js), the client is
// drawn procedurally (client.js), and every prop looks up generated art first
// (props.js), so nothing here needs an image file.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { drawArt } from '../engine/art.js';
import { aiProfile } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU, later } from '../engine/util.js';
import { drawStarShape, drawSparkleShape, drawHeartShape } from '../engine/emotes.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import { playerName } from '../state.js';
import { Client, CLIENTS, clientPortrait } from './hair-salon/client.js';
import { HAIR_COLORS, STYLES, HEAD_RX, HEAD_RY, SEG, MAXL, MAXB, MINL, hairlineY, paintSeg, extendColour } from './hair-salon/hair.js';
import { TOOLS, TOOL_IDX, BLING, drawTool, drawBling, swatch, drawStyleIcon, drawMirrorFrame } from './hair-salon/props.js';

const NAVY = '#24163f';
const REVEAL_T = 5.2;          // mirror reveal
const SHOT_T = 1.5;            // camera stop per client in the showcase
const CHEESE_T = 6.5;          // "Say cheese!" posing time
const PHOTO_T = 4;             // the big photo stays this long

/** Recorded sound when it exists, else a synth stand-in. */
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const OPTIONS = {
  colour: { list: HAIR_COLORS, label: 'Colour' },
  style: { list: STYLES, label: 'Style' },
  bling: { list: BLING, label: 'Bling' },
};
const STAR_KEYS = ['tidy', 'cut', 'colour', 'shape', 'bling'];
const STAR_TOOL = { tidy: 'brush', cut: 'scissors', colour: 'colour', shape: 'style', bling: 'bling' };

// ---------------------------------------------------------------------------
// Backgrounds (cached)
let bgCache = null, stageCache = null, floorPat = null;
function salonBg() {
  if (bgCache) return bgCache;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // striped wallpaper
  for (let x = 0; x < W; x += 80) { g.fillStyle = (x / 80) % 2 ? '#bff3e2' : '#ffe0ef'; g.fillRect(x, 0, 80, H); }
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = 140; y < H; y += 120) for (let x = 40; x < W; x += 160) { g.save(); g.translate(x + ((y / 120) % 2) * 80, y); drawHeartShape(g, 18, 'rgba(255,255,255,0.55)'); g.restore(); }
  // checker floor
  for (let y = 980; y < H; y += 50) for (let x = 0; x < W; x += 50) { g.fillStyle = ((x + y) / 50) % 2 ? '#ffffff' : '#ffb3d1'; g.fillRect(x, y, 50, 50); }
  // scalloped awning across the top (HUD band)
  for (let x = 0; x < W; x += 120) { g.fillStyle = (x / 120) % 2 ? '#ffffff' : '#ff7ab8'; g.fillRect(x, 0, 120, 78); }
  g.lineWidth = 5; g.strokeStyle = NAVY;
  for (let x = 0; x < W; x += 120) {
    g.fillStyle = (x / 120) % 2 ? '#ffffff' : '#ff7ab8';
    g.beginPath(); g.moveTo(x, 76); g.arc(x + 60, 76, 60, Math.PI, 0, true); g.closePath(); g.fill();
    g.beginPath(); g.arc(x + 60, 76, 60, Math.PI, 0, true); g.stroke();
  }
  g.fillStyle = 'rgba(36,22,63,0.12)'; g.fillRect(0, 0, W, 6);
  bgCache = c;
  return c;
}
function checker(g) {
  if (!floorPat) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#fff4f9'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#ffc2dc'; x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32);
    floorPat = g.createPattern(c, 'repeat');
  }
  return floorPat;
}
function stageBg() {
  if (stageCache) return stageCache;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 820);
  gr.addColorStop(0, '#ff8fc8'); gr.addColorStop(1, '#ffc6e2');
  g.fillStyle = gr; g.fillRect(0, 0, W, 820);
  // sequins
  for (let y = 10; y < 820; y += 26) for (let x = (y / 26) % 2 * 13; x < W; x += 26) {
    g.fillStyle = `rgba(255,255,255,${(0.12 + 0.25 * Math.abs(Math.sin(x * 0.07 + y * 0.13))).toFixed(2)})`;
    g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill();
  }
  // curtains at the sides
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 0 : W;
    g.fillStyle = '#9b5cff';
    g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + sd * -230, 0); g.quadraticCurveTo(x0 + sd * -120, 420, x0 + sd * -170, 860); g.lineTo(x0, 860); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 6;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0 + sd * -k * 55, 0); g.quadraticCurveTo(x0 + sd * -k * 30, 420, x0 + sd * -k * 42, 860); g.stroke(); }
  }
  // star garland
  g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, 40); for (let x = 0; x <= W; x += 20) g.lineTo(x, 40 + Math.sin((x / W) * Math.PI * 4) * 26 + 26); g.stroke();
  for (let x = 60; x < W; x += 120) { g.save(); g.translate(x, 40 + Math.sin((x / W) * Math.PI * 4) * 26 + 40); drawStarShape(g, 30, ['#ffd23f', '#ffffff', '#7fd3ff'][(x / 120 | 0) % 3]); g.restore(); }
  // stage floor
  const fl = g.createLinearGradient(0, 820, 0, H);
  fl.addColorStop(0, '#ff6fb1'); fl.addColorStop(1, '#d94f95');
  g.fillStyle = fl; g.fillRect(0, 820, W, H - 820);
  g.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = -200; x < W + 200; x += 160) { g.beginPath(); g.moveTo(x, 820); g.lineTo(x + 80, 820); g.lineTo(x + 200, H); g.lineTo(x + 120, H); g.closePath(); g.fill(); }
  g.fillStyle = NAVY; g.fillRect(0, 816, W, 8);
  stageCache = c;
  return c;
}

// ---------------------------------------------------------------------------
// Thumbnail
let iconClient = null;
function getIconClient() {
  if (iconClient) return iconClient;
  const cl = new Client({ skin: '#f8c9a2', cape: '#7fd3ff', color: '#ff7ac6', length: 330, curl: 0.75, messy: 0, bangs: 55 });
  cl.eye = '#2f6fd1'; cl.freckles = true; cl.lashes = true; cl.studs = null;
  for (const s of cl.hair.strands) if (s.i % 3 === 1) for (let k = 2; k < s.segs.length; k++) paintSeg(s, k, HAIR_COLORS[10]);
  for (const s of cl.hair.strands) s.dirty = true;
  cl.hair.touchAll(); cl.hair.layout();
  cl.bling.push({ def: BLING[0], x: -110, y: -120, rot: -0.3, t: 1 });
  cl.expr = 'happy';
  iconClient = cl;
  return cl;
}

function drawIcon(g, x, y, w, h, t) {
  if (drawArt(g, 'thumb/hair-salon', x + w / 2, y + h / 2, w, h, { fit: 'cover' })) return;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = h / 500;
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#bff3e2' : '#ffe0ef'; g.fillRect(x + (i * w) / 12, y, w / 12 + 1, h); }
  g.fillStyle = '#ffb3d1'; g.fillRect(x, y + h * 0.86, w, h * 0.14);
  const cl = getIconClient();
  cl.blink = 0;
  g.save(); g.translate(x + w * 0.5, y + h * 0.5); g.scale(0.62 * s, 0.62 * s);
  cl.draw(g, t, { res: 0.62 * s * 1.2, noBubble: true });
  g.restore();
  // floating tools
  g.save(); g.translate(x + w * 0.15, y + h * 0.3); g.rotate(Math.sin(t * 2) * 0.15); drawTool(g, 'scissors', 0, 0, 120 * s, t, { open: 0.5 + 0.5 * Math.sin(t * 6) }); g.restore();
  g.save(); g.translate(x + w * 0.85, y + h * 0.32); g.rotate(Math.sin(t * 2 + 1) * 0.15); drawTool(g, 'colour', 0, 0, 120 * s, t, { color: HAIR_COLORS[10] }); g.restore();
  g.save(); g.translate(x + w * 0.86, y + h * 0.76); drawTool(g, 'brush', 0, 0, 100 * s, t); g.restore();
  for (let i = 0; i < 4; i++) { const k = (t * 0.7 + i * 0.25) % 1; g.save(); g.globalAlpha = Math.sin(k * Math.PI); g.translate(x + w * (0.1 + i * 0.27), y + h * (0.12 + (i % 2) * 0.62)); drawSparkleShape(g, 34 * s, '#fff6a8'); g.restore(); }
  g.restore();
}

export const meta = {
  id: 'hair-salon',
  title: 'Hair Salon',
  category: 'studio',
  type: 'Styling · Everyone together',
  goal: 'Give your salon client a fabulous new hairdo!',
  controls: [['stick', 'Move your hand'], ['a', 'Use the tool (hold)'], ['dpad', 'Tools ← →, colours ↑ ↓ (or LB / RB, LT / RT)'], ['b', 'Spin the chair / take bling off'], ['y', 'Next colour / style'], ['x', "I'm done!"]],
  tips: ['First pick which girl you want to style!', 'Brush the messy hair smooth, then snip, grow, curl and colour it!', 'Styles tie it into a ponytail, bun or braid. Press A on bling to move it.', 'Press X when your look is ready for the mirror!'],
  music: 'runway',
  duration: 'No time limit',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
  drawIcon,
};

// ---------------------------------------------------------------------------
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'style';
    this.phaseT = 0;
    this.finished = false;
    this.snips = [];
    this.layoutStations();
    const capes = shuffle(['#ff9ed6', '#b9a2ff', '#7fd3ff', '#7fe0b4', '#ffcf5c', '#ff9f7a']);
    const skins = shuffle(['#ffe0c7', '#f8c9a2', '#e8ae84', '#c98d62', '#a46b47', '#7f4f35']);
    const hairs = shuffle(['#8a5a3c', '#ffd36e', '#41335a', '#ff8a3d', '#b07a52', '#5e3d2b']);
    // everyone starts on the client picker (a portrait grid); the chair shows the one under the cursor
    this.stations = this.players.map((p, i) => this.makeStation(p, i, { ...CLIENTS[i % CLIENTS.length], cape: capes[i % 6] }));
    this.banner = null;   // each station shows "Who will you style?" over its portrait grid
    sfx('magic');
  }

  // ---- layout ----------------------------------------------------------------
  layoutStations() {
    const n = this.n, top = 106, bottom = H - 14, gap = 16;
    const rows = n <= 4 ? 1 : 2;
    const perRow = rows === 1 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const cols = perRow[0];
    const sh = (bottom - top - gap * (rows - 1)) / rows;
    let sw = (W - 28 - gap * (cols - 1)) / cols;
    if (n === 1) sw = 1240;
    if (n === 2) sw = Math.min(sw, 920);
    this.rects = [];
    perRow.forEach((cnt, r) => {
      const total = cnt * sw + (cnt - 1) * gap;
      for (let c = 0; c < cnt; c++) this.rects.push({ x: (W - total) / 2 + c * (sw + gap), y: top + r * (sh + gap), w: sw, h: sh });
    });
  }

  makeStation(p, i, look) {
    const r = this.rects[i];
    const compact = r.h < 600;
    const narrow = r.w < 520;
    const s = {
      p, i, r, compact, narrow,
      headerH: compact ? 56 : 76, toolH: compact ? 62 : 86,
      tool: 0, opt: { colour: randInt(4, 10), style: 1, bling: 0 }, optPop: 0, toolPop: 0,
      client: new Client(look),
      cursor: { x: 0, y: 0, px: 0, py: 0, speed: 0 },
      held: null, hover: null,
      ready: false, readyT: 0,
      stars: {}, ev: {},
      stats: { snips: 0, colours: new Set(), styles: 0, sprays: 0 },
      sfxT: 0, cool: 0, snipT: 0, workT: 0, sparkT: 0,
      revealT: -1, said: false,
      ai: null,
      cape: look.cape, picking: true, pickIdx: i % CLIENTS.length, pickPop: 0, pickAt: rand(1.2, 2.6),
    };
    s.scene = { x: r.x, y: r.y + s.headerH, w: r.w, h: r.h - s.headerH - s.toolH };
    const sc = s.scene;
    s.k = Math.min(sc.h / 770, sc.w / (narrow ? 560 : 640));
    s.hx = sc.x + sc.w * 0.5;
    s.hy = sc.y + 300 * s.k + (sc.h - 770 * s.k) * 0.35;
    s.res = s.k * 1.25;
    s.cursor.x = s.cursor.px = s.hx + 60 * s.k;
    s.cursor.y = s.cursor.py = s.hy - 40 * s.k;
    // the stylist (this player's character) on the floor beside the chair
    const ch = new Actor(p, { x: s.hx - 300 * s.k, y: sc.y + sc.h - 6 });
    ch.scale = clamp((sc.h * 0.42) / ch.leader.h, 0.36, 1.25);
    ch.facing = 1;
    ch.snap();
    s.char = ch; s.side = -1;
    return s;
  }

  // ---- client picker (start) -----------------------------------------------------
  updatePick(s, dt) {
    const c = s.p.ctrl, n = CLIENTS.length, cols = 4, rows = Math.ceil(n / cols);
    s.pickPop = Math.max(0, s.pickPop - dt * 4);
    if (s.p.isAI) {
      s.pickAt -= dt;
      if (s.pickAt <= 0) {
        // a girl nobody else is styling yet (so two stations never look like a mirror)
        const taken = new Set(this.stations.filter((o) => o !== s && !o.picking).map((o) => o.pickIdx));
        const free = CLIENTS.map((_, i) => i).filter((i) => !taken.has(i));
        s.pickIdx = free.length ? pick(free) : randInt(0, n - 1);
        s.client = this.makeClient(s, s.pickIdx); this.choose(s);
      }
    } else {
      const dx = c.nav.x, dy = c.nav.y;
      if (dx || dy) {
        const col = (s.pickIdx % cols + Math.sign(dx) + cols) % cols, row = (Math.floor(s.pickIdx / cols) + Math.sign(dy) + rows) % rows;
        s.pickIdx = Math.min(n - 1, row * cols + col); s.pickPop = 1; sfx('move');
        s.client = this.makeClient(s, s.pickIdx);   // live preview in the chair
      }
      if (c.pressed('a') || c.pressed('x')) this.choose(s);
    }
    s.client.update(dt, 0, 0.2);
    this.updateStylist(s, dt);
  }
  makeClient(s, idx) { return new Client({ ...CLIENTS[idx], cape: s.cape }); }
  choose(s) {
    s.picking = false;
    sfx('select'); s.client.pop(0.3); s.client.react('wow', 1);
    s.client.say(`Hi! I'm ${CLIENTS[s.pickIdx].name}!`, 1.8);
    if (s.p.isAI) s.ai = this.makePlan(s);
    if (this.stations.every((o) => !o.picking)) this.banner = { text: 'Salon is open!', t: 0 };
  }

  toHead(s, x, y) {
    const P = s.client.pose();
    return { x: (x - s.hx) / s.k, y: (y - s.hy) / s.k - P.dy - HEAD_RY * (1 - P.sy) };
  }
  toScreen(s, hx, hy) {
    const P = s.client.pose();
    return { x: s.hx + hx * s.k, y: s.hy + (hy + P.dy + HEAD_RY * (1 - P.sy)) * s.k };
  }

  // ---- update -------------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.2) this.banner = null; }
    this.updateSnips(dt);
    if (this.phase === 'style') {
      for (const s of this.stations) this.updateStation(s, dt);
      // no clock: styling ends when everyone has pressed X (I'm done!)
      if (this.stations.every((s) => s.ready)) {
        this.allReadyT = (this.allReadyT || 0) + dt;
        if (this.allReadyT > 1.4) this.startReveal();
      } else this.allReadyT = 0;
    } else if (this.phase === 'reveal') {
      for (const s of this.stations) this.updateReveal(s, dt);
      if (this.phaseT > REVEAL_T + this.n * 0.15) this.startShow();
    } else if (this.phase === 'show') {
      this.updateShow(dt);
    }
  }

  updateStation(s, dt) {
    if (s.picking) { this.updatePick(s, dt); return; }
    const p = s.p, c = p.ctrl, cl = s.client, sc = s.scene;
    if (s.ai) this.ai(s, dt);
    const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    const cur = s.cursor;
    const sp = 820 * clamp(s.k * 1.15, 0.6, 1.2);
    cur.px = cur.x; cur.py = cur.y;
    cur.x = clamp(cur.x + mx * sp * dt, sc.x + 24, sc.x + sc.w - 24);
    cur.y = clamp(cur.y + my * sp * dt, sc.y + 20, sc.y + sc.h - 16);
    cur.speed = damp(cur.speed, Math.hypot(cur.x - cur.px, cur.y - cur.py) / Math.max(dt, 1e-3), 12, dt);
    const motion = 0.75 + Math.min(1, cur.speed / (380 * s.k)) * 0.6;

    // tools and options
    if (c.pressed('rb') || (pad && c.pressed('right'))) this.setTool(s, (s.tool + 1) % TOOLS.length);
    if (c.pressed('lb') || (pad && c.pressed('left'))) this.setTool(s, (s.tool + TOOLS.length - 1) % TOOLS.length);
    const optStep = (c.pressed('y') || c.pressed('rt') ? 1 : 0) - (c.pressed('lt') ? 1 : 0) + (pad ? (c.pressed('down') ? 1 : 0) - (c.pressed('up') ? 1 : 0) : 0);
    if (optStep) this.stepOption(s, optStep);
    if (c.pressed('x')) this.toggleReady(s);
    s.toolPop = Math.max(0, s.toolPop - dt * 3); s.optPop = Math.max(0, s.optPop - dt * 2.5);
    s.sfxT -= dt; s.cool -= dt; s.sparkT -= dt;

    const tool = TOOLS[s.tool].id;
    const hold = c.held('a'), tap = c.pressed('a');
    const hp = this.toHead(s, cur.x, cur.y);
    const hair = cl.hair;
    s.working = false;

    // bling being carried follows the hand
    if (s.held && (tool !== 'bling' || !cl.bling.includes(s.held))) this.dropHeld(s, hp);
    if (s.held) { s.held.x = hp.x; s.held.y = hp.y; }
    s.hover = tool === 'bling' && !s.held ? cl.blingAt(hp.x, hp.y) : null;
    let usedB = false;
    if (tool === 'bling' && c.pressed('b') && (s.held || s.hover)) { this.removeBling(s, s.held || s.hover); usedB = true; }
    if (!usedB && c.pressed('b') && s.cool <= 0) this.spinChair(s);

    const R = 46;
    if (hold && tool === 'brush') {
      const touched = new Set();
      hair.near(hp.x, hp.y, R, (st) => { touched.add(st); return false; }, 2);
      if (hair.onCap(hp.x, hp.y)) for (const st of hair.strands) if (!st.bang && Math.abs(Math.sin(st.a) * HEAD_RX - hp.x) < R) touched.add(st);
      if (touched.size) {
        s.working = true;
        for (const st of touched) if (st.messy > 0) { st.messy = Math.max(0, st.messy - 1.5 * motion * dt); hair.touch(st); }
        if (s.sfxT <= 0) { sfx('brush', { vol: 0.5 }); s.sfxT = 0.16; }
        if (s.sparkT <= 0) { s.sparkT = 0.1; particles.burst(cur.x + rand(-20, 20) * s.k, cur.y + rand(-20, 20) * s.k, { type: 'sparkle', count: 1, colors: ['#ffffff', '#fff6a8', '#ffc8f0'] }); }
        if (cl.exprT <= 0.1) cl.react('happy', 0.5);
        if (!s.ev.tidy && hair.avg('messy') < 0.15) { s.ev.tidy = true; this.earn(s, 'tidy', 'Silky smooth!', '#7fd3ff'); }
      }
    } else if (hold && tool === 'scissors') {
      s.snipT += dt;
      if (s.snipT > 0.11) {
        s.snipT = 0;
        let cut = 0;
        for (const st of hair.strands) {
          const pts = st.pts, minL = st.bang ? 4 : MINL;
          for (let j = 0; j < pts.length; j += 3) {
            const d = pts[j + 2];
            if (d < minL) continue;
            const dx = pts[j] - hp.x, dy = pts[j + 1] - hp.y;
            if (dx * dx + dy * dy < 28 * 28) {
              const old = st.L;
              if (old - d > 8) {
                st.L = Math.max(minL, d);
                hair.touch(st);
                cut += old - st.L;
                this.spawnSnip(s, pts[j], pts[j + 1], hair.colorAt(st, d + 12), Math.min(90, old - st.L), st.curl);
              }
              break;
            }
          }
        }
        if (cut > 0) {
          s.working = true; s.stats.snips++;
          snd('salon-snip', 'shutter', { vol: 0.6 });
          if (cut > 260 && cl.exprT <= 0) { cl.react('eek', 0.6); cl.pop(0.15); }
          if (!s.ev.cut) { s.ev.cut = true; this.earn(s, 'cut', 'Snip snip!', '#ff6fb1'); }
          if (!s.ev.pixie && hair.main.every((m) => m.L <= MINL + 1)) { s.ev.pixie = true; this.popAt(s, 'Pixie cut!', '#ffd23f'); cl.react('wow', 1); }
        } else if (s.sfxT <= 0) { sfx('tick', { vol: 0.4 }); s.sfxT = 0.22; }
      }
    } else if (hold && tool === 'grow') {
      const touched = new Set();
      hair.near(hp.x, hp.y, R * 1.1, (st) => { touched.add(st); return false; }, 2);
      for (const st of hair.strands) { const tp = hair.tip(st); if (Math.hypot(tp.x - hp.x, tp.y - hp.y) < R * 1.7) touched.add(st); }
      let grew = false;
      for (const st of touched) {
        const max = st.bang ? MAXB : MAXL;
        if (st.L < max) { const was = st.L; st.L = Math.min(max, st.L + (st.bang ? 90 : 170) * dt); extendColour(st, was); hair.touch(st); grew = true; }
      }
      if (grew) {
        s.working = true;
        if (s.sfxT <= 0) { snd('salon-grow', 'grow', { vol: 0.45 }); s.sfxT = 0.55; }
        if (chance(dt * 18)) particles.burst(cur.x, cur.y, { type: 'sparkle', count: 1, colors: ['#b8ffcc', '#fff6a8', '#ffffff'] });
        if (cl.exprT <= 0.1) cl.react('giggle', 0.5);
        if (!s.ev.grow) { s.ev.grow = true; this.earn(s, 'cut', 'Grow, grow!', '#5ddc6a'); }
        if (!s.ev.long && hair.avg('L') > 470) { s.ev.long = true; this.popAt(s, 'Super long!', '#5ddc6a'); cl.react('wow', 1); }
        if (!s.ev.blind && hair.avg('L', true) > 150) { s.ev.blind = true; cl.say('I can\'t see!', 1.8); sfx('giggle'); }
      }
    } else if (hold && (tool === 'curl' || tool === 'straight')) {
      const touched = new Set();
      hair.near(hp.x, hp.y, R, (st) => { touched.add(st); return false; }, 2);
      if (touched.size) {
        s.working = true;
        for (const st of touched) {
          if (tool === 'curl') { if (st.curl < 1) { st.curl = Math.min(1, st.curl + 0.9 * motion * dt); hair.touch(st); } }
          else if (st.curl > 0 || st.messy > 0) { st.curl = Math.max(0, st.curl - 1.1 * motion * dt); st.messy = Math.max(0, st.messy - 0.7 * dt); hair.touch(st); }
        }
        if (tool === 'curl') {
          if (s.sfxT <= 0) { snd('salon-curl', 'bubble', { vol: 0.5 }); s.sfxT = 0.2; }
          if (chance(dt * 10)) particles.burst(cur.x, cur.y, { type: 'heart', count: 1, colors: ['#c9a2ff', '#ff9ed6'], size: [10, 16] });
          if (!s.ev.curly && hair.avg('curl') > 0.7) { s.ev.curly = true; this.earn(s, 'shape', 'So curly!', '#b36bff'); cl.react('happy', 1); }
        } else {
          if (s.sfxT <= 0) { snd('salon-steam', 'whoosh', { vol: 0.35 }); s.sfxT = 0.38; }
          if (chance(dt * 12)) particles.burst(cur.x, cur.y - 10 * s.k, { type: 'smoke', count: 1, colors: ['#ffffff'], size: [12, 22], speed: [20, 60] });
          if (!s.ev.sleek && hair.avg('curl') < 0.04 && this.t > 3) { s.ev.sleek = true; this.earn(s, 'shape', 'Sleek!', '#4fd98a'); }
        }
      }
    } else if (hold && tool === 'colour') {
      const col = HAIR_COLORS[s.opt.colour];
      let changed = 0;
      hair.near(hp.x, hp.y, 40, (st, j, d) => { if (paintSeg(st, Math.floor(d / SEG), col)) { changed++; hair.touch(st); } });
      if (hair.onCap(hp.x, hp.y)) for (const st of hair.strands) if (!st.bang && Math.abs(Math.sin(st.a) * HEAD_RX - hp.x) < 40) { for (const k of [0, 1]) if (paintSeg(st, k, col)) { changed++; hair.touch(st); } }
      const onHair = changed > 0 || hair.hitAny(hp.x, hp.y, 30);
      if (onHair) {
        s.working = true;
        if (s.sfxT <= 0) { snd('salon-spray', 'brush', { vol: 0.55 }); s.sfxT = 0.13; }
        const colors = col.id === 'rainbow' ? RAINBOW : col.id === 'glitter' ? ['#ffffff', '#fff6a8', '#e0d4ff'] : [col.c, '#ffffff'];
        if (chance(dt * 26)) particles.burst(cur.x + rand(-14, 14) * s.k, cur.y + rand(-14, 14) * s.k, { type: col.id === 'glitter' ? 'sparkle' : 'spark', count: 2, colors, speed: [30, 120], size: [4, 8] });
        if (changed) {
          s.stats.sprays++;
          s.stats.colours.add(col.id);
          if (!s.ev['c-' + col.id]) {
            s.ev['c-' + col.id] = true;
            if (!s.stars.colour) this.earn(s, 'colour', col.id === 'rainbow' ? 'Rainbow!' : col.id === 'glitter' ? 'Sparkly!' : `Ooh, ${col.name.toLowerCase()}!`, col.c || '#ff6fb1');
            else this.popAt(s, col.id === 'rainbow' ? 'Rainbow!' : col.id === 'glitter' ? 'Sparkly!' : `${col.name}!`, col.c || '#ff6fb1', 0.8);
            cl.react(col.id === 'glitter' ? 'happy' : 'wow', 0.8);
          }
        }
      }
    } else if (tap && tool === 'style') {
      this.applyStyle(s, STYLES[s.opt.style].id);
    } else if (tap && tool === 'bling') {
      const onIt = hair.hitAny(hp.x, hp.y, 40) || hair.onHead(hp.x, hp.y, 1.15);
      if (s.held) this.dropHeld(s, hp);
      else if (s.hover) this.pickUpBling(s, s.hover);
      else if (onIt) this.placeBling(s, hp);
      else { sfx('blip'); particles.burst(cur.x, cur.y, { type: 'spark', count: 4, colors: ['#ffffff'] }); }
    }

    // client looks at the hand, the stylist walks to its side
    cl.update(dt, (hp.x) / 260, (hp.y - 20) / 260);
    this.updateStylist(s, dt);
    if (s.ready) s.readyT += dt;
  }

  updateStylist(s, dt) {
    const a = s.char, sc = s.scene, cur = s.cursor;
    const half = 230 * s.k;
    if (Math.abs(cur.x - s.hx) > half * 0.4) s.side = cur.x > s.hx ? 1 : -1;
    const w = Math.max(a.width, 60);
    let tx = s.hx + s.side * (half + w * 0.15);
    tx = clamp(tx, sc.x + w * 0.42, sc.x + sc.w - w * 0.42);
    const vx = clamp((tx - a.x) * 4, -300 * a.scale * 2, 300 * a.scale * 2);
    a.x += vx * dt;
    if (Math.abs(tx - a.x) > 6) a.moveAnim(vx, 0, 300 * a.scale * 2);
    else {
      a.facing = -s.side;
      if (this.phase === 'style') a.setPose(s.working ? 'paint' : s.ready ? 'wave' : 'idle');
    }
    a.update(dt);
  }

  setTool(s, i) {
    if (s.tool === i) { s.toolPop = 0.6; return; }
    s.tool = i; s.toolPop = 1; s.optPop = OPTIONS[TOOLS[i].id] ? 1 : 0; sfx('swap', { vol: 0.6 });
  }

  stepOption(s, d) {
    const id = TOOLS[s.tool].id;
    if (!OPTIONS[id]) {
      // Y / up / down on a tool without options jumps to the colours.
      this.setTool(s, TOOL_IDX.colour);
      return;
    }
    const n = OPTIONS[id].list.length;
    s.opt[id] = (s.opt[id] + d + n) % n;
    s.optPop = 1;
    sfx('collect', { step: s.opt[id] % 8, vol: 0.5 });
  }

  earn(s, key, text, color) {
    this.popAt(s, text, color);
    if (s.stars[key]) return;
    s.stars[key] = true;
    s.starPop = s.starPop || {}; s.starPop[key] = 1;
    sfx('star'); sfx('correct', { vol: 0.5 });
    s.char.playOnce('cheer', 0.6);
    s.client.react('happy', 1.2); s.client.pop(0.2);
    const cpt = this.toScreen(s, 0, -40);
    particles.burst(cpt.x, cpt.y, { type: 'star', count: 6 });
    this.rumble(s.p, 0.3, 80);
    if (STAR_KEYS.every((k) => s.stars[k]) && !s.ev.allStars) {
      s.ev.allStars = true;
      later(() => { if (this.finished || this.phase !== 'style') return; this.popAt(s, 'Superstar stylist!', '#ffd23f', 1.2); sfx('fanfare', { vol: 0.5 }); particles.burst(cpt.x, cpt.y, { type: 'confetti', count: 30 }); s.char.playOnce('celebrate', 1.6); }, 700);
    }
  }

  popAt(s, text, color, size = 1) {
    const p = this.toScreen(s, 0, -HEAD_RY * 1.35);
    particles.popText(p.x, Math.max(s.scene.y + 30, p.y), text, color, (s.compact ? 34 : 46) * size);
  }

  rumble(p, a, ms) { try { p.ctrl.rumble && p.ctrl.rumble(a, ms); } catch (e) { /* ignore */ } }

  spawnSnip(s, hx, hy, col, len, curl) {
    const p = this.toScreen(s, hx, hy);
    this.snips.push({ st: s, x: p.x, y: p.y, vx: rand(-60, 60), vy: rand(-80, 20), rot: rand(TAU), vr: rand(-4, 4), len: Math.max(14, len * s.k * 0.7), w: 9 * s.k + 2, col, curl, t: 0, rest: false, floor: s.scene.y + s.scene.h - rand(4, 18) });
    const list = this.snips.filter((q) => q.st === s);
    if (list.length > 70) this.snips.splice(this.snips.indexOf(list[0]), 1);
  }

  updateSnips(dt) {
    for (const q of this.snips) {
      q.t += dt;
      if (q.rest) continue;
      q.vy += 900 * dt; q.vx *= 1 - 1.5 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.y >= q.floor) { q.y = q.floor; q.rest = true; q.rot = Math.round(q.rot / Math.PI) * Math.PI + rand(-0.3, 0.3); }
    }
  }

  applyStyle(s, id) {
    const cl = s.client, hair = cl.hair;
    if (hair.style === id) { cl.pop(0.12); sfx('blip'); return; }
    hair.setStyle(id);
    s.stats.styles++;
    const c = this.toScreen(s, 0, -30);
    particles.burst(c.x, c.y, { type: 'smoke', count: 12, colors: ['#ffffff', '#ffe8f4'], speed: [80, 220], size: [26, 48] });
    particles.burst(c.x, c.y, { type: 'sparkle', count: 14 });
    sfx('magic'); snd('salon-poof', 'pop');
    cl.react('wow', 1); cl.pop(0.3);
    const st = STYLES.find((x) => x.id === id);
    if (id === 'loose') this.popAt(s, st.pop, '#ff9f1c');
    else this.earn(s, 'shape', st.pop, '#ff6fb1');
    s.char.playOnce('cast', 0.5);
  }

  placeBling(s, hp) {
    const def = BLING[s.opt.bling];
    const cl = s.client;
    cl.bling.push({ def, x: hp.x, y: hp.y, rot: rand(-0.3, 0.3), t: 0 });
    if (cl.bling.length > 8) cl.bling.splice(cl.bling.findIndex((b) => b !== s.held), 1);
    s.opt.bling = (s.opt.bling + 1) % BLING.length;   // next one is ready to place
    const cur = s.cursor;
    particles.burst(cur.x, cur.y, { type: 'sparkle', count: 8 });
    particles.burst(cur.x, cur.y, { type: 'heart', count: 2 });
    snd('salon-clip', 'stamp'); sfx('sparkle', { vol: 0.6 });
    cl.react('happy', 1); cl.pop(0.2);
    if (!s.stars.bling) this.earn(s, 'bling', def.wide ? 'Like a princess!' : 'So cute!', '#ff6fb1');
    else if (def.wide && !s.ev.royal) { s.ev.royal = true; this.popAt(s, 'Like a princess!', '#ffd23f'); }
  }
  pickUpBling(s, b) {
    s.held = b; s.hover = null; b.home = { x: b.x, y: b.y };
    const cl = s.client; cl.bling.splice(cl.bling.indexOf(b), 1); cl.bling.push(b);
    sfx('pop', { vol: 0.6 }); this.rumble(s.p, 0.15, 40);
  }
  dropHeld(s, hp) {
    const b = s.held; s.held = null;
    if (!b || !s.client.bling.includes(b)) return;
    const hair = s.client.hair;
    if (!(hair.hitAny(hp.x, hp.y, 40) || hair.onHead(hp.x, hp.y, 1.15)) && b.home) { b.x = b.home.x; b.y = b.home.y; }
    b.t = 0;
    particles.burst(s.cursor.x, s.cursor.y, { type: 'sparkle', count: 6 });
    snd('salon-clip', 'stamp');
  }
  removeBling(s, b) {
    const cl = s.client, i = cl.bling.indexOf(b);
    if (i < 0) return;
    cl.bling.splice(i, 1);
    if (s.held === b) s.held = null;
    if (s.hover === b) s.hover = null;
    const p = this.toScreen(s, b.x, b.y);
    particles.burst(p.x, p.y, { type: 'spark', count: 8, colors: [b.def.color, '#ffffff'] });
    sfx('pop');
  }

  spinChair(s) {
    s.cool = 1.0;
    s.client.spin();
    snd('salon-chair-spin', 'whoosh');
    later(() => { if (!this.finished) sfx('giggle'); }, 250);
    s.client.react('giggle', 1);
    s.stats.spins = (s.stats.spins || 0) + 1;
    const c = this.toScreen(s, 0, 0);
    particles.burst(c.x, c.y, { type: 'star', count: 4 });
    if (chance(0.35)) s.client.say(pick(['Wheee!', 'Again!', 'Hee hee!']), 1.2);
  }

  toggleReady(s) {
    s.ready = !s.ready; s.readyT = 0;
    if (s.ready) {
      sfx('ready');
      this.popAt(s, 'All done!', '#36d17a');
      s.client.react('happy', 1.5); s.client.say(pick(['Love it!', 'Yay!', 'Ooh!']), 1.5);
      s.char.playOnce('cheer', 0.7);
      const c = this.toScreen(s, 0, -40);
      particles.burst(c.x, c.y, { type: 'confetti', count: 24 });
    } else sfx('back');
  }

  // ---- CPU ---------------------------------------------------------------------
  makePlan(s) {
    const lvl = s.p.aiLevel || 0;
    const plan = [{ tool: 'brush', mode: 'all' }];
    const hair = s.client.hair;
    if (chance(0.7)) {
      plan.push({ tool: 'scissors', y: pick([70, 130, 190, 240]) });
      if (hair.avg('L', true) > 25 && chance(0.6)) plan.push({ tool: 'scissors', bangs: true });
    } else if (chance(0.7)) plan.push({ tool: 'grow' });
    if (chance(0.55)) plan.push({ tool: pick(['curl', 'curl', 'straight']), mode: 'all' });
    if (chance(0.92)) {
      const ci = pick([4, 5, 6, 7, 8, 1, 9, 10, 10, 3]);
      plan.push({ tool: 'colour', opt: ci, mode: ci === 10 ? 'streaks' : pick(['all', 'all', 'tips', 'streaks']) });
      if (chance(0.3)) plan.push({ tool: 'colour', opt: 11, mode: 'all' });
    }
    if (chance(0.65)) plan.push({ tool: 'style', opt: randInt(1, STYLES.length - 1) });
    const nb = randInt(1, 3), used = new Set();
    for (let k = 0; k < nb; k++) {
      let bi = randInt(0, BLING.length - 1);
      if (used.has(bi)) continue;
      used.add(bi);
      plan.push({ tool: 'bling', opt: bi, slot: k });
    }
    return { plan, si: 0, wait: rand(1.0, 2.2), btnT: 0, spd: [0.5, 0.72, 0.92][lvl], pause: [[1.2, 2.6], [0.8, 1.6], [0.5, 1.0]][lvl], step: null };
  }

  /** Path points (head units) for a CPU plan step. */
  planPoints(s, step) {
    const hair = s.client.hair, pts = [];
    const along = (st, from = 0, every = 5) => { const p = st.pts; for (let j = Math.floor(from) * 3; j < p.length; j += 3 * every) pts.push({ x: p[j], y: p[j + 1] }); const n = p.length; if (n) pts.push({ x: p[n - 3], y: p[n - 2] }); };
    const main = hair.main;
    switch (step.tool) {
      case 'brush': case 'curl': case 'straight': {
        for (let k = 1; k < main.length; k += 5) along(main[k], 0, 5);
        if (step.tool === 'brush') for (const x of [-60, 0, 60]) pts.push({ x, y: -HEAD_RY * 0.75 });
        break;
      }
      case 'colour': {
        if (step.mode === 'all') { for (let k = 1; k < main.length; k += 4) along(main[k], 0, 6); for (let x = -90; x <= 90; x += 45) pts.push({ x, y: hairlineY(x) - 20 }); }
        else if (step.mode === 'tips') { for (let k = 0; k < main.length; k += 2) { const n = main[k].pts.length / 3; along(main[k], n * 0.6, 3); } }
        else { const pick3 = shuffle(main.map((m, i) => i)).slice(0, 5).sort((a, b) => a - b); for (const i of pick3) along(main[i], 2, 3); }
        break;
      }
      case 'scissors': {
        if (step.bangs) { const y = hairlineY(0) + 18; for (let x = -100; x <= 100; x += 25) pts.push({ x, y }); }
        else { for (let x = -300; x <= 300; x += 30) pts.push({ x, y: step.y }); for (let x = 300; x >= -300; x -= 40) pts.push({ x, y: step.y + 12 }); }
        break;
      }
      case 'grow': {
        const picks = shuffle(main.slice()).slice(0, 6);
        for (const st of picks) { const tp = hair.tip(st); pts.push({ x: tp.x, y: tp.y + 10, hold: false }, { x: tp.x, y: tp.y + 70 }, { x: tp.x, y: tp.y + 140 }); }
        break;
      }
      case 'style': pts.push({ x: rand(-40, 40), y: rand(-20, 40) }); break;
      case 'bling': {
        const def = BLING[step.opt];
        const spots = [[-0.85, 1.12], [0.85, 1.12], [-1.25, 1.08], [0.5, 1.18], [-0.45, 1.18]];
        if (def.wide) pts.push({ x: 0, y: -HEAD_RY * 1.02 });
        else { const [a, r] = spots[(step.slot + randInt(0, 4)) % spots.length]; pts.push({ x: Math.sin(a) * HEAD_RX * r, y: -Math.cos(a) * HEAD_RY * r }); }
        break;
      }
      default: break;
    }
    return pts;
  }

  ai(s, dt) {
    const A = s.ai, c = s.p.ctrl;
    A.wait -= dt; A.btnT -= dt;
    c.hold('a', false);
    if (A.wait > 0) { c.move(0, 0); return; }
    const step = A.plan[A.si];
    if (!step) {
      // Done: say so, then admire the look (and spin the chair now and then).
      if (!s.ready && !A.sentDone) { A.sentDone = true; c.press('x'); }
      c.move(0, 0);
      if (chance(dt * 0.08)) c.press('b');
      return;
    }
    const ti = TOOL_IDX[step.tool];
    if (s.tool !== ti) {
      c.move(0, 0);
      if (A.btnT <= 0) { const fwd = (ti - s.tool + TOOLS.length) % TOOLS.length; c.press(fwd <= TOOLS.length / 2 ? 'rb' : 'lb'); A.btnT = rand(0.22, 0.4) / A.spd; }
      return;
    }
    if (step.opt !== undefined && s.opt[step.tool] !== step.opt) {
      c.move(0, 0);
      if (A.btnT <= 0) { c.press('y'); A.btnT = rand(0.18, 0.32) / A.spd; }
      return;
    }
    if (!step.pts) { step.pts = this.planPoints(s, step); step.k = 0; step.t = 0; }
    step.t += dt;
    if (step.t > 18 / A.spd) { this.endStep(s); return; }
    const target = step.pts[step.k];
    if (!target) { this.endStep(s); return; }
    const tp = this.toScreen(s, target.x, target.y);
    const sc = s.scene;
    tp.x = clamp(tp.x, sc.x + 26, sc.x + sc.w - 26); tp.y = clamp(tp.y, sc.y + 22, sc.y + sc.h - 18);
    const dx = tp.x - s.cursor.x, dy = tp.y - s.cursor.y, d = Math.hypot(dx, dy);
    const tap = step.tool === 'style' || step.tool === 'bling';
    const slow = step.tool === 'grow' ? 0.45 : 1;
    if (d < 14) {
      if (tap) { c.press('a'); this.endStep(s); c.move(0, 0); return; }
      step.k++;
      if (step.k >= step.pts.length) { this.endStep(s); return; }
    }
    const m = Math.min(1, d / (50 * s.k + 10)) * A.spd * slow;
    c.move((dx / (d || 1)) * m, (dy / (d || 1)) * m);
    if (!tap && step.k >= 1 && target.hold !== false) c.hold('a', true);
  }

  endStep(s) {
    const A = s.ai, step = A.plan[A.si];
    s.p.ctrl.hold('a', false);
    // brushing again if it's still quite messy
    if (step && step.tool === 'brush' && !step.again && s.client.hair.avg('messy') > 0.3) { step.again = true; step.pts = null; return; }
    A.si++;
    A.wait = rand(...A.pause);
  }

  // ---- reveal ------------------------------------------------------------------
  startReveal() {
    if (this.phase !== 'style') return;
    this.phase = 'reveal'; this.phaseT = 0;
    this.banner = { text: 'Mirror time!', t: 0 };
    sfx('drumroll');
    this.stations.forEach((s, i) => {
      s.revealT = -i * 0.15; s.held = null; s.working = false;
      s.p.ctrl.hold && s.p.isAI && s.p.ctrl.hold('a', false);
    });
  }

  updateReveal(s, dt) {
    const before = s.revealT;
    s.revealT += dt;
    const t = s.revealT, cl = s.client;
    if (before < 0.9 && t >= 0.9) { cl.react('wow', 1.0); cl.pop(0.3); sfx('sparkle', { vol: 0.6 }); }
    if (before < 1.8 && t >= 1.8) {
      cl.react('happy', 3); cl.pop(0.25);
      cl.say(pick(['I love it!', 'So pretty!', 'Wow, is that me?', 'Amazing!', 'Best hair ever!']), 2.4);
      const c = this.toScreen(s, 0, -20);
      particles.burst(c.x, c.y, { type: 'heart', count: 10 });
      particles.burst(c.x, c.y, { type: 'confetti', count: 30 });
      s.char.playOnce('celebrate', 2.2);
      voice(s.p.charId, 'yay');
      if (s.i === 0) { snd('salon-tada', 'fanfare'); fx.flash('#fff6fb', 0.2); }
    }
    cl.update(dt, 0.6, 0.1);
    this.updateStylist(s, dt);
  }

  // ---- showcase ---------------------------------------------------------------
  startShow() {
    if (this.phase === 'show') return;
    this.phase = 'show'; this.phaseT = 0;
    this.snips = [];
    const n = this.n;
    const slot = Math.min(640, 1760 / n);
    const k = Math.min(0.92, slot / 560);
    this.showK = k;
    this.stations.forEach((s, i) => {
      s.sx = W / 2 + (i - (n - 1) / 2) * slot;
      s.sy = 790 - 400 * k;
      s.sk = k; s.sres = k * 1.6;
      const a = s.char;
      a.scale = clamp((n > 5 ? 150 : 185) / a.leader.h, 0.4, 1.3);
      const side = n === 1 ? 1 : i < n / 2 ? -1 : 1;
      a.x = n > 4 ? s.sx : clamp(s.sx + side * (235 * k + 40), 100, W - 100); a.y = 930 + (n > 4 ? (i % 2) * 40 : 0); a.z = 0;
      a.facing = a.x < W / 2 ? 1 : -1;
      a.snap(); a.setPose('wave'); s.homeX = a.x;
      s.vz = 0; s.poseCD = 0;
      s.client.bubble = null;
    });
    this.shotIdx = 0; this.shotT = 0; this.cheeseT = -1; this.photo = null;
    this.banner = { text: 'Photo time!', t: 0 };
    snd('applause', 'cheer');
  }

  updateShow(dt) {
    const cam = this.api.camera;
    for (const s of this.stations) s.client.update(dt, Math.sin(this.t + s.i) * 0.5, 0.2);
    if (this.phaseT < 1.2) { for (const s of this.stations) s.char.update(dt); return; }
    if (this.shotIdx < this.n) {
      const s = this.stations[this.shotIdx];
      this.shotT += dt;
      const zoom = clamp((H * 0.62) / (760 * s.sk), 1, Math.min(2.1, cam.maxZoom));
      cam.follow(s.sx, s.sy + 70 * s.sk, zoom, 5);
      if (!s.shown && this.shotT > 0.35) {
        s.shown = true;
        s.look = this.lookName(s);
        s.client.react(pick(['happy', 'wow']), 1.2); s.client.pop(0.25);
        particles.burst(s.sx, s.sy - 120 * s.sk, { type: 'sparkle', count: 12 });
        s.char.playOnce(pick(['cheer', 'pose-twirl', 'strike3']), 1.0);
        snd('camera-flash', 'shutter', { vol: 0.6 }); fx.flash('#ffffff', 0.15);
      }
      if (this.shotT > SHOT_T * (this.n > 5 ? 0.8 : 1)) { this.shotIdx++; this.shotT = 0; }
      for (const s2 of this.stations) s2.char.update(dt);
      return;
    }
    if (this.cheeseT < 0) {
      this.cheeseT = 0;
      cam.follow(W / 2, H / 2, 1, 3);
      this.banner = { text: 'Say cheese!', t: 0 };
      sfx('giggle');
    }
    const c0 = this.cheeseT;
    this.cheeseT += dt;
    for (const d of [3, 2, 1]) if (c0 < CHEESE_T - d && this.cheeseT >= CHEESE_T - d) sfx(d === 1 ? 'tock' : 'tick');
    for (const s of this.stations) {
      if (!this.photo) this.cheeseMove(s, dt);
      else { s.vz -= 2800 * dt; s.char.z = Math.max(0, s.char.z + s.vz * dt); if (s.char.z <= 0) s.vz = 0; }
      if (chance(dt * 0.4)) s.client.react(pick(['happy', 'giggle', 'wow']), 0.8);
      s.char.update(dt);
    }
    if (this.cheeseT >= CHEESE_T && !this.photo) {
      this.photo = { img: this.renderPhoto(), t: 0 };
      snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.45);
      later(() => { if (!this.finished) { particles.confettiRain(W, 150); snd('applause', 'cheer'); sfx('yay'); } }, 350);
    }
    if (this.photo) {
      this.photo.t += dt;
      if (this.photo.t > PHOTO_T || (this.photo.t > 1.5 && this.players.some((p) => !p.isAI && p.ctrl.pressed('a')))) this.finishGame();
    }
  }

  cheeseMove(s, dt) {
    const a = s.char, c = s.p.ctrl;
    s.poseCD = Math.max(0, s.poseCD - dt);
    let { x: mx, y: my } = photoMove(c), jump = c.pressed('a'), pose = photoPosePressed(c);
    if (s.p.isAI) {
      s.aiT = (s.aiT ?? rand(0.2, 0.8)) - dt;
      if (s.aiT <= 0) { s.aiT = rand(0.5, 1.3); s.aiM = chance(0.4) ? [rand(-0.8, 0.8), rand(-0.4, 0.4)] : [0, 0]; if (chance(0.35)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      [mx, my] = s.aiM || [0, 0];
      if (Math.abs(a.x - (s.homeX ?? s.sx)) > 150) mx = Math.sign((s.homeX ?? s.sx) - a.x) * 0.6;
    }
    const d = Math.hypot(mx, my); if (d > 1) { mx /= d; my /= d; }
    const sp = 460;
    a.x = clamp(a.x + mx * sp * dt, 90, W - 90);
    a.y = clamp(a.y + my * sp * 0.6 * dt, 880, 1010);
    if (jump && a.z <= 0) { s.vz = 980; snd('boing', 'jump', { vol: 0.35 }); a.squash(-0.25); }
    s.vz -= 2800 * dt; a.z = Math.max(0, a.z + s.vz * dt);
    if (a.z <= 0 && s.vz < 0) { if (s.vz < -200) a.squash(0.2); s.vz = 0; }
    if (pose && s.poseCD <= 0) { s.poseCD = 0.35; strikePhotoPose(a, pose, { onBump: (who) => this.bump(s, who) }); }
    if (a.z > 0) { if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1; if (!a._once) a.setPose('jump'); }
    else a.moveAnim(mx * sp, my * sp, sp);
  }

  bump(s, a) {
    for (const o of this.stations) {
      if (o === s) continue;
      const b = o.char, dx = b.x - a.x;
      if (Math.abs(dx) < (a.width + b.width) * 0.45 && Math.abs(b.y - a.y) < 60) {
        b.x = clamp(b.x + Math.sign(dx || 1) * 70, 90, W - 90);
        b.playOnce('surprised', 0.8, 'idle'); b.squash(0.2); o.vz = Math.max(o.vz, 300);
      }
    }
    snd('boing', 'bounce', { vol: 0.4 });
  }

  lookName(s) {
    const hair = s.client.hair, sh = hair.colourShare();
    let colour = '';
    if (sh.rainbow > 0.12) colour = 'Rainbow';
    else {
      const hc = HAIR_COLORS.find((c) => c.c === sh.best);
      colour = hc && sh.best !== s.client.natural ? hc.word : '';
    }
    const sparkly = sh.glit > 0.2 ? 'Sparkly' : '';
    const L = hair.avg('L'), curl = hair.avg('curl');
    const style = { ponytail: 'Ponytail', pigtails: 'Pigtails', bun: 'Bun', spacebuns: 'Space Buns', braid: 'Braid' }[hair.style]
      || (L < 70 ? 'Pixie' : curl > 0.6 ? 'Curls' : L > 430 ? 'Waterfall' : curl < 0.1 && hair.avg('messy') < 0.2 ? 'Silk' : 'Waves');
    const royal = s.client.bling.some((b) => b.def.wide) ? 'Princess' : '';
    const words = [royal, sparkly || colour, style].filter(Boolean);
    if (words.length < 2) words.unshift(pick(['Super', 'Fancy', 'Dreamy', 'Happy']));
    return words.slice(0, 3).join(' ') + '!';
  }

  renderPhoto() {
    const w = 1040, h = 585, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const zoom = 1.12, k = w / (W / zoom);
    g.setTransform(k, 0, 0, k, w / 2 - (W / 2) * k, h / 2 - 600 * k);
    try { this.drawShowWorld(g, { photo: true }); } catch (e) { console.warn(e); }
    return c;
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((s) => {
      const parts = [];
      if (s.stats.snips) parts.push(`${s.stats.snips} snip${s.stats.snips === 1 ? '' : 's'}`);
      if (s.stats.colours.size) parts.push(`${s.stats.colours.size} colour${s.stats.colours.size === 1 ? '' : 's'}`);
      if (s.client.bling.length) parts.push(`${s.client.bling.length} bling`);
      if (!parts.length) parts.push(s.look || 'Natural look!');
      return (this.n > 4 ? parts.slice(0, 2) : parts).join(' · ');
    });
    this.api.finish({ showcase: true, highlight: null, stats, title: 'Fabulous hair!', focus: { x: W / 2, y: 520, zoom: 1.08 } });
  }

  onDone() {
    if (this.phase === 'style') this.startReveal();
    else if (this.phase === 'reveal') this.startShow();
    else if (this.cheeseT >= 0 && !this.photo) this.cheeseT = Math.max(this.cheeseT, CHEESE_T - 0.5);
    else if (this.phase === 'show' && this.cheeseT < 0) this.shotIdx = this.n;
    else this.finishGame();
  }

  destroy() {}

  // ===========================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'show') { this.drawShowWorld(g, {}); return; }
    if (!drawArt(g, 'bg/hair-salon', W / 2, H / 2, W, H, { fit: 'cover' })) g.drawImage(salonBg(), 0, 0);
    for (const s of this.stations) this.drawStation(g, s);
  }

  drawStation(g, s) {
    const r = s.r, sc = s.scene, k = s.k, t = this.t, p = s.p;
    g.save();
    ui.panel(g, r.x, r.y, r.w, r.h, { r: 26, fill: '#fff8fc', stroke: NAVY, lineWidth: 6 });
    ui.roundRect(g, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 23); g.clip();
    // scene backdrop
    if (!drawArt(g, 'bg/hair-salon-station', sc.x + sc.w / 2, sc.y + sc.h / 2, sc.w, sc.h, { fit: 'cover' })) {
      const wall = g.createLinearGradient(0, sc.y, 0, sc.y + sc.h);
      wall.addColorStop(0, '#fff0f7'); wall.addColorStop(1, '#ffe2f0');
      g.fillStyle = wall; g.fillRect(sc.x, sc.y, sc.w, sc.h);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let x = sc.x + 20; x < sc.x + sc.w; x += 56) for (let y = sc.y + 24; y < sc.y + sc.h * 0.78; y += 56) { g.beginPath(); g.arc(x + ((y - sc.y) / 56 % 2) * 28, y, 5, 0, TAU); g.fill(); }
      // arch on the wall
      g.save(); g.globalAlpha = 0.5; g.strokeStyle = '#ffb3d1'; g.lineWidth = 14 * k + 4;
      g.beginPath(); g.moveTo(s.hx - 290 * k, sc.y + sc.h * 0.8); g.lineTo(s.hx - 290 * k, s.hy - 120 * k); g.arc(s.hx, s.hy - 120 * k, 290 * k, Math.PI, 0); g.lineTo(s.hx + 290 * k, sc.y + sc.h * 0.8); g.stroke(); g.restore();
      // floor
      g.fillStyle = checker(g); g.save(); g.translate(sc.x, sc.y + sc.h * 0.8); g.fillRect(0, 0, sc.w, sc.h * 0.2 + 2); g.restore();
      g.fillStyle = 'rgba(36,22,63,0.18)'; g.fillRect(sc.x, sc.y + sc.h * 0.8, sc.w, 5);
      // a shelf with bottles (wide stations only)
      if (!s.narrow) this.drawShelf(g, sc.x + (s.hx - sc.x) * 0.3, sc.y + sc.h * 0.32, k);
    }
    // snipped hair on the floor
    for (const q of this.snips) if (q.st === s && q.rest) this.drawSnip(g, q);
    // client
    g.save(); g.translate(s.hx, s.hy); g.scale(k, k);
    s.client.draw(g, t, { res: s.res, hover: s.hover, bubbleScale: s.compact ? 1.9 : 1.5 });
    g.restore();
    // stylist
    s.char.draw(g, { ring: p.color });
    if (this.phaseT < 5 && this.phase === 'style') { const hd = s.char.anchor('head'); ui.playerTag(g, p, hd.x, hd.y - 16); }
    // falling snips in front
    for (const q of this.snips) if (q.st === s && !q.rest) this.drawSnip(g, q);
    // hand mirror reveal
    if (this.phase === 'reveal' && s.revealT > 0) this.drawMirror(g, s);
    // tool hand
    if (this.phase === 'style' && !s.picking) this.drawCursor(g, s);
    if (s.picking) this.drawPicker(g, s);
    g.restore();
    this.drawHeader(g, s);
    this.drawToolbar(g, s);
    if (this.phase === 'style' && !s.picking && OPTIONS[TOOLS[s.tool].id]) this.drawOptions(g, s);
  }

  /** Portrait grid: who will you style? (the chair behind shows the highlighted girl) */
  drawPicker(g, s) {
    const sc = s.scene, n = CLIENTS.length, cols = 4, rows = Math.ceil(n / cols);
    const cell = Math.min((sc.w - 40) / cols, (sc.h - 120) / rows) * 0.92, gap = cell * 0.08;
    const gw = cols * cell + (cols - 1) * gap, gh = rows * cell + (rows - 1) * gap;
    const x0 = sc.x + (sc.w - gw) / 2, y0 = sc.y + Math.max(56, (sc.h - gh) * 0.42);
    g.fillStyle = 'rgba(36,22,63,0.28)'; g.fillRect(sc.x, sc.y, sc.w, sc.h);
    const ts = Math.max(22, Math.min(40, cell * 0.2));
    ui.text(g, 'Who will you style?', sc.x + sc.w / 2, y0 - ts * 0.9, { size: ts, color: '#ffffff', strokeWidth: 6 });
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i % cols) * (cell + gap), cy = y0 + Math.floor(i / cols) * (cell + gap), sel = i === s.pickIdx;
      const k = sel ? 1 + s.pickPop * 0.08 : 1;
      g.save(); g.translate(cx + cell / 2, cy + cell / 2); g.scale(k, k);
      ui.panel(g, -cell / 2, -cell / 2, cell, cell, { r: cell * 0.16, fill: sel ? '#ffe7f3' : '#ffffff', stroke: sel ? s.p.color : NAVY, lineWidth: sel ? 7 : 3, shadow: false });
      g.save(); ui.roundRect(g, -cell / 2 + 4, -cell / 2 + 4, cell - 8, cell - 8, cell * 0.14); g.clip();
      g.drawImage(clientPortrait(i), -cell / 2, -cell / 2, cell, cell);
      g.restore();
      if (cell > 90) ui.text(g, CLIENTS[i].name, 0, cell / 2 - cell * 0.09, { size: Math.min(26, cell * 0.15), color: sel ? s.p.color : '#24163f', strokeWidth: 5 });
      g.restore();
    }
    if (!s.p.isAI) ui.hints(g, [['stick', 'Pick'], ['a', `Style ${CLIENTS[s.pickIdx].name}!`]], sc.x + sc.w / 2, Math.min(sc.y + sc.h - 24, y0 + gh + ts * 1.1), { size: Math.max(20, Math.min(30, cell * 0.17)) });
  }

  drawShelf(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    g.lineWidth = 5; g.strokeStyle = NAVY;
    const bottles = [['#7fd3ff', 34, 90], ['#ff9ed6', 28, 70], ['#ffd23f', 40, 60], ['#b9a2ff', 26, 84]];
    let bx = -90;
    for (const [c, w, h] of bottles) {
      g.fillStyle = c; ui.roundRect(g, bx, -h, w, h, 10); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; ui.roundRect(g, bx + w * 0.25, -h - 14, w * 0.5, 16, 4); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(bx + 6, -h + 10, 6, h - 22);
      bx += w + 12;
    }
    g.fillStyle = '#e9b97f'; ui.roundRect(g, -110, 0, 220, 18, 6); g.fill(); g.stroke();
    g.restore();
  }

  drawSnip(g, q) {
    const a = q.rest ? clamp(1 - (q.t - 8) / 2, 0, 1) : 1;
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.translate(q.x, q.y); g.rotate(q.rot);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const L = q.len, amp = 4 + q.curl * 10;
    const path = () => { g.beginPath(); g.moveTo(-L / 2, 0); g.bezierCurveTo(-L / 6, -amp, L / 6, amp, L / 2, 0); };
    g.strokeStyle = NAVY; g.lineWidth = q.w + 4; path(); g.stroke();
    g.strokeStyle = q.col; g.lineWidth = q.w; path(); g.stroke();
    g.restore();
  }

  drawCursor(g, s) {
    const cur = s.cursor, tool = TOOLS[s.tool].id, t = this.t, k = s.k;
    const size = s.compact ? 56 : 74;
    g.save();
    // reach ring for brushy tools
    if (tool !== 'style' && tool !== 'bling') {
      const rr = (tool === 'scissors' ? 28 : tool === 'colour' ? 40 : 46) * k;
      g.strokeStyle = s.p.color; g.lineWidth = 4; g.setLineDash([8, 7]); g.lineDashOffset = -t * 30;
      g.beginPath(); g.arc(cur.x, cur.y, rr, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    if (s.held) {
      g.save(); g.translate(cur.x, cur.y); g.scale(k * 1.1, k * 1.1); g.rotate(s.held.rot); drawBling(g, s.held.def, s.held.def.wide ? 150 : 96, t); g.restore();
    }
    const hold = s.p.ctrl.held('a');
    const opt = { color: HAIR_COLORS[s.opt.colour], on: hold && s.working, open: tool === 'scissors' && hold ? 0.5 + 0.5 * Math.sin(t * 28) : 1 };
    const bob = hold ? Math.sin(t * 24) * 3 : 0;
    if (tool === 'bling' && !s.held) {
      g.save(); g.translate(cur.x + size * 0.32, cur.y - size * 0.32 + bob); drawBling(g, BLING[s.opt.bling], size * 0.8, t); g.restore();
    } else if (tool === 'style') {
      g.save(); g.translate(cur.x + size * 0.32, cur.y - size * 0.32); drawTool(g, 'style', 0, 0, size * 0.8, t); g.restore();
      g.save(); g.translate(cur.x + size * 0.32, cur.y + size * 0.42); drawStyleIcon(g, STYLES[s.opt.style].id, size * 0.7, s.client.hair.strands[0].segs[0]); g.restore();
    } else drawTool(g, tool, cur.x + size * 0.3, cur.y - size * 0.3 + bob, size, t, opt);
    // player colour pointer dot
    g.fillStyle = s.p.color; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.arc(cur.x, cur.y, 7, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }

  drawMirror(g, s) {
    const t = s.revealT, k = s.k, cl = s.client;
    const rise = ease.outBack(clamp(t / 0.7, 0, 1));
    const out = this.phaseT > REVEAL_T + this.n * 0.15 - 0.5 ? 1 - (REVEAL_T + this.n * 0.15 - this.phaseT) / 0.5 : 0;
    const sc = s.scene;
    const mw = 250 * k, mh = 390 * k;
    const mx = Math.min(s.hx + 270 * k, sc.x + sc.w - mw * 0.45), my = lerp(sc.y + sc.h + mh, s.hy + 220 * k, rise) + out * 600 * k;
    g.save(); g.translate(mx, my); g.rotate(-0.12 + Math.sin(this.t * 2) * 0.03);
    drawMirrorFrame(g, mw, mh, (rx, ry, cx, cy) => {
      g.save();
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.clip();
      g.fillStyle = '#d8f0ff'; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
      g.translate(cx, cy + ry * 0.35); const rk = (ry * 2) / 620; g.scale(-rk, rk);
      cl.draw(g, this.t, { res: s.res, noChair: true, noBubble: true });
      g.restore();
      g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = rx * 0.12;
      g.beginPath(); g.moveTo(cx - rx * 0.5, cy - ry * 0.2); g.lineTo(cx - rx * 0.1, cy - ry * 0.6); g.stroke(); g.restore();
      g.lineWidth = Math.max(3, 5 * k); g.strokeStyle = NAVY; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.stroke();
    });
    g.restore();
    if (t > 0.9 && t < 3.5 && chance(0.2)) particles.burst(mx + rand(-60, 60) * k, my - mh * 0.2 + rand(-80, 80) * k, { type: 'sparkle', count: 1 });
  }

  drawHeader(g, s) {
    const r = s.r, p = s.p, hh = s.headerH;
    g.save();
    ui.roundRect(g, r.x + 3, r.y + 3, r.w - 6, hh - 3, 23); g.save(); g.clip();
    g.fillStyle = p.color; g.fillRect(r.x, r.y, r.w, hh);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(r.x, r.y, r.w, hh * 0.45);
    g.restore();
    g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(r.x + 4, r.y + hh); g.lineTo(r.x + r.w - 4, r.y + hh); g.stroke();
    const pr = hh * 0.36;
    drawPortraitSafe(g, p, r.x + 14 + pr, r.y + hh / 2, pr);
    ui.text(g, p.tag, r.x + 24 + pr * 2, r.y + hh / 2, { size: s.compact ? 26 : 32, align: 'left', color: '#ffffff', strokeWidth: 6 });
    // style stars
    const n = STAR_KEYS.length, ss = s.compact ? 30 : 38, gap = ss * 1.05;
    const x0 = r.x + r.w - 16 - n * gap + gap / 2 - (s.ready ? (s.compact ? 74 : 98) : 0);
    STAR_KEYS.forEach((key, i) => {
      const on = s.stars[key];
      const pop = s.starPop && s.starPop[key] ? s.starPop[key] : 0;
      if (pop) s.starPop[key] = Math.max(0, pop - 0.03);
      g.save(); g.translate(x0 + i * gap, r.y + hh / 2); g.scale(1 + pop * 0.5, 1 + pop * 0.5);
      g.fillStyle = on ? '#fff6c8' : 'rgba(255,255,255,0.35)'; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, ss * 0.48, 0, TAU); g.fill(); g.stroke();
      g.globalAlpha = on ? 1 : 0.35;
      drawTool(g, STAR_TOOL[key], 0, 0, ss * 0.72, this.t, { color: HAIR_COLORS[10] });
      if (on) { g.globalAlpha = 1; g.translate(ss * 0.34, -ss * 0.3); drawStarShape(g, ss * 0.42, '#ffd23f'); }
      g.restore();
    });
    if (s.ready) {
      const bw = s.compact ? 64 : 88, bh = hh - 18;
      ui.panel(g, r.x + r.w - 12 - bw, r.y + 9, bw, bh, { r: bh / 2, fill: '#36d17a', lineWidth: 4, shadow: false });
      ui.text(g, 'Done!', r.x + r.w - 12 - bw / 2, r.y + hh / 2 + 1, { size: s.compact ? 22 : 28, strokeWidth: 5 });
    }
    g.restore();
  }

  drawToolbar(g, s) {
    const r = s.r, th = s.toolH, y0 = r.y + r.h - th;
    g.save();
    ui.roundRect(g, r.x + 3, y0, r.w - 6, th - 3, 23); g.save(); g.clip();
    g.fillStyle = '#ffffff'; g.fillRect(r.x, y0, r.w, th);
    g.restore();
    g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(r.x + 4, y0); g.lineTo(r.x + r.w - 4, y0); g.stroke();
    const n = TOOLS.length, slot = Math.min(th - 8, (r.w - 24) / n);
    const x0 = r.x + r.w / 2 - (n * slot) / 2 + slot / 2;
    TOOLS.forEach((tl, i) => {
      const sel = i === s.tool;
      const cx = x0 + i * slot, cy = y0 + th / 2 - (sel ? 4 + s.toolPop * 6 : 0);
      g.save();
      if (sel) { g.fillStyle = s.p.color; g.strokeStyle = NAVY; g.lineWidth = 4; ui.roundRect(g, cx - slot * 0.47, cy - slot * 0.44, slot * 0.94, slot * 0.88, slot * 0.22); g.fill(); g.stroke(); }
      drawTool(g, tl.id, cx, cy, slot * (sel ? 0.72 : 0.6), this.t, { color: HAIR_COLORS[s.opt.colour] });
      g.restore();
    });
    // tool name pops up when switching
    if (s.toolPop > 0 && this.phase === 'style') {
      const cx = x0 + s.tool * slot;
      g.save(); g.globalAlpha = clamp(s.toolPop * 2, 0, 1);
      ui.text(g, TOOLS[s.tool].name, clamp(cx, r.x + 70, r.x + r.w - 70), y0 - 20 - (OPTIONS[TOOLS[s.tool].id] ? (s.compact ? 50 : 64) : 0), { size: s.compact ? 26 : 34, color: '#ffffff' });
      g.restore();
    }
    g.restore();
  }

  drawOptions(g, s) {
    const id = TOOLS[s.tool].id, O = OPTIONS[id], list = O.list, r = s.r;
    const oh = s.compact ? 46 : 58, y = r.y + r.h - s.toolH - oh - 6;
    const maxW = r.w - 30;
    const cell = Math.min(oh - 6, maxW / list.length);
    const w = cell * list.length + 16;
    const x = r.x + r.w / 2 - w / 2;
    g.save();
    ui.panel(g, x, y, w, oh, { r: oh / 2, fill: 'rgba(255,255,255,0.94)', lineWidth: 4, shadow: false });
    const cur = s.opt[id];
    list.forEach((o, i) => {
      const cx = x + 8 + cell * (i + 0.5), cy = y + oh / 2;
      const sel = i === cur;
      g.save(); g.translate(cx, cy);
      if (sel) { const k = 1 + s.optPop * 0.25; g.scale(k, k); g.fillStyle = s.p.color; g.beginPath(); g.arc(0, 0, cell * 0.5, 0, TAU); g.fill(); g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke(); }
      if (id === 'colour') swatch(g, o, 0, 0, cell * (sel ? 0.36 : 0.3));
      else if (id === 'style') drawStyleIcon(g, o.id, cell * 0.85, s.client.hair.strands[0].segs[0]);
      else drawBling(g, o, cell * 0.72, this.t);
      g.restore();
    });
    // the name of the current option
    if (s.optPop > 0) {
      g.save(); g.globalAlpha = clamp(s.optPop * 2, 0, 1);
      const cx = clamp(x + 8 + cell * (cur + 0.5), r.x + 60, r.x + r.w - 60);
      ui.text(g, list[cur].name, cx, y - 18, { size: s.compact ? 22 : 28, color: '#ffffff', strokeWidth: 5 });
      g.restore();
    }
    g.restore();
  }

  // ---- showcase world ----------------------------------------------------------
  drawShowWorld(g, o) {
    if (!drawArt(g, 'bg/hair-salon-photo', W / 2, H / 2, W, H, { fit: 'cover' })) g.drawImage(stageBg(), 0, 0);
    // pedestals and clients
    for (const s of this.stations) {
      const k = s.sk;
      g.save();
      g.lineWidth = 6; g.strokeStyle = NAVY;
      const pw = 330 * k, top = s.sy + 395 * k;
      g.fillStyle = '#ffffff'; ui.roundRect(g, s.sx - pw / 2, top, pw, 830 - top, 14); g.fill(); g.stroke();
      g.fillStyle = s.p.color; ui.roundRect(g, s.sx - pw / 2 - 10, top - 4, pw + 20, 24, 10); g.fill(); g.stroke();
      g.fillStyle = 'rgba(36,22,63,0.12)'; g.fillRect(s.sx + pw * 0.2, top + 22, pw * 0.25, 830 - top - 26);
      g.restore();
      g.save(); g.translate(s.sx, s.sy); g.scale(k, k);
      s.client.draw(g, this.t, { res: s.sres, noChair: true, noBubble: !!o.photo });
      g.restore();
      if (s.look && !o.photo && this.cheeseT < 0) {
        const a = clamp((this.shotIdx === s.i ? this.shotT : 9) / 0.3, 0, 1);
        if (this.shotIdx === s.i) { g.save(); g.translate(s.sx, s.sy - 380 * k); g.scale(ease.outBack(a), ease.outBack(a)); ui.text(g, s.look, 0, 0, { size: 64 * Math.max(0.55, k / 0.62) * 0.9, color: s.p.color, strokeWidth: 9, maxWidth: 1400 * k }); g.restore(); }
      }
    }
    // stylists, sorted by depth
    const list = this.stations.slice().sort((a, b) => a.char.y - b.char.y);
    for (const s of list) s.char.draw(g, { ring: o.photo ? null : s.p.color });
    if (!o.photo && this.phaseT < 1.5) for (const s of this.stations) { const hd = s.char.anchor('head'); ui.playerTag(g, s.p, hd.x, hd.y - 16); }
  }

  drawHUD(g) {
    if (this.phase === 'style') {
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        ui.hints(g, [['stick', 'Move'], ['a', 'Use tool']], W / 2 - 130, 52, { size: 32, align: 'right' });
        ui.hints(g, [['rb', 'Tool'], ['rt', 'Colour/Style'], ['x', 'Done!']], W / 2 + 130, 52, { size: 32, align: 'left' });
      }
    }
    if (this.phase === 'show') {
      if (this.cheeseT >= 0 && !this.photo) this.drawCheeseHUD(g);
      if (this.photo) this.drawPhoto(g);
    }
    if (this.banner) ui.banner(g, this.banner.text, this.banner.t, { size: 120, y: this.phase === 'show' ? 200 : H / 2 - 40, color: '#ff8fd0' });
  }

  drawCheeseHUD(g) {
    const t = this.cheeseT;
    if (t >= CHEESE_T - 3) { const n = Math.ceil(CHEESE_T - t), f = 1 - (CHEESE_T - t - (n - 1)); g.save(); g.translate(W / 2, 330); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(n), 0, 0, { size: 200, color: '#ffd23f', strokeWidth: 12 }); g.restore(); }
    const humans = this.stations.filter((s) => !s.p.isAI);
    if (!humans.length) return;
    const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
    ui.hints(g, r1, W / 2, H - 92, { size: 34 }); ui.hints(g, r2, W / 2, H - 40, { size: 34 });
  }

  drawPhoto(g) {
    const P = this.photo, t = P.t, p = ease.outBack(clamp(t / 0.6, 0, 1));
    g.save(); g.fillStyle = `rgba(36,22,63,${(0.45 * clamp(t / 0.4, 0, 1)).toFixed(3)})`; g.fillRect(0, 0, W, H);
    const w = 1120, h = 820;
    g.translate(W / 2, H / 2 + 10); g.rotate(-0.03 * p); g.scale(p, p);
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 10, fill: '#ffffff', lineWidth: 6 });
    g.drawImage(P.img, -w / 2 + 40, -h / 2 + 40, 1040, 585);
    g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(-w / 2 + 40, -h / 2 + 40, 1040, 585);
    ui.text(g, 'Salon Superstars', 0, h / 2 - 118, { size: 64, color: '#ff6fb1', weight: 800 });
    const names = this.players.map((pl) => playerName(pl)).join(', ');
    ui.text(g, names, 0, h / 2 - 54, { size: 30, color: NAVY, stroke: false, maxWidth: w - 120 });
    for (const [sx, sy] of [[-1, -1], [1, -1]]) { g.save(); g.translate(sx * (w / 2 - 30), sy * (h / 2 - 4)); g.rotate(sx * 0.6); g.fillStyle = 'rgba(255,240,180,0.9)'; g.fillRect(-50, -14, 100, 28); g.restore(); }
    g.restore();
  }
}

function drawPortraitSafe(g, p, x, y, r) {
  try { drawPortrait(g, p, x, y, r, { ring: '#ffffff' }); } catch (e) { /* portrait art missing */ }
}
