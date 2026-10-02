// Art Studio (Play Studio). One shared easel canvas (1600x900 offscreen,
// shown in a wooden frame). Every player has a cursor in their color: stick
// moves it (with acceleration, right stick fine-adjusts), hold A to paint,
// LB/RB tools, X color (or stamp in the stamp tool), Y size, B undoes your
// own last stroke. Optional coloring pages (fill bucket stops at the lines).
// "Done!" (or the pause menu) hangs the painting in a gold frame on the
// museum wall; X there saves it as a PNG.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { drawSparkleShape, drawHeartShape, drawStarShape, starPath } from '../engine/emotes.js';
import { charById } from '../data/characters.js';
import { CW, CH, PAGES, pageCanvas } from './art-studio/pages.js';

export const meta = {
  id: 'art-studio',
  title: 'Art Studio',
  category: 'studio',
  type: 'Paint together · Everyone wins',
  goal: 'Paint a masterpiece together on one big canvas, then hang it in the museum!',
  controls: [['stick', 'Move your paintbrush'], ['a', 'Hold to paint'], ['lb', 'Change tool (brush, glitter, stamps...)'], ['x', 'Change color / stamp'], ['y', 'Brush size'], ['b', 'Undo']],
  tips: ['Try the fill bucket on a coloring page!', 'Move onto "Done!" at the top and press A when your picture is finished.', 'In the museum, press X to save your picture.'],
  music: 'chill',
  duration: 'as long as you like',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  drawIcon,
};

// Frame placement of the canvas on screen.
const FX = 240, FY = 118, S = 0.9, FW = CW * S, FH = CH * S;
const COLORS = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#8ee04a', '#36c46a', '#3fd0e0', '#3f8cff', '#7a5cff', '#c45cff', '#ff6fd0', '#8b5a3c', '#ffffff', '#24163f'];
const COLOR_NAMES = ['Red', 'Orange', 'Yellow', 'Lime', 'Green', 'Aqua', 'Blue', 'Indigo', 'Purple', 'Pink', 'Brown', 'White', 'Night'];
const TOOLS = [
  { id: 'brush', name: 'Brush' }, { id: 'rainbow', name: 'Rainbow' }, { id: 'glitter', name: 'Glitter' },
  { id: 'stamp', name: 'Stamps' }, { id: 'fill', name: 'Fill' }, { id: 'eraser', name: 'Eraser' },
];
const TOOL = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));
const SIZES = [{ name: 'Small', r: 6, stamp: 50 }, { name: 'Medium', r: 14, stamp: 95 }, { name: 'Big', r: 30, stamp: 160 }];
const SHAPE_STAMPS = ['star', 'heart', 'flower', 'butterfly', 'rainbow', 'crown', 'horn', 'cupcake'];
const MAX_LIVE = 48;      // strokes kept for undo; older ones are baked
const GRID = 50, GX = CW / GRID, GY = CH / GRID;
const BTN = { page: { x: 250, y: 24, w: 250, h: 68, label: 'New page' }, done: { x: 1420, y: 24, w: 250, h: 68, label: 'Done!' } };
const snd = (key, fallback) => (hasSound(key) ? sfx(key) : fallback && sfx(fallback));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rgb(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
const toScreen = (x, y) => ({ x: FX + x * S, y: FY + y * S });

// --- stamps -------------------------------------------------------------------
function heartPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.38);
  g.bezierCurveTo(x - s * 0.95, y - s * 0.22, x - s * 0.48, y - s * 0.92, x, y - s * 0.42);
  g.bezierCurveTo(x + s * 0.48, y - s * 0.92, x + s * 0.95, y - s * 0.22, x, y + s * 0.38); g.closePath();
}
function lighter(c, k = 0.5) { const [r, gg, b] = rgb(c); return `rgb(${Math.round(r + (255 - r) * k)},${Math.round(gg + (255 - gg) * k)},${Math.round(b + (255 - b) * k)})`; }

export function drawStamp(g, kind, x, y, size, color, rot = 0) {
  const s = size, NAVY = '#24163f';
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.035);
  if (kind.startsWith('char:')) {
    drawPortrait(g, kind.slice(5), 0, 0, s * 0.48, { ring: color === '#ffffff' ? '#ffd23f' : color, ringWidth: Math.max(3, s * 0.06), expr: 'happy' });
    g.restore(); return;
  }
  switch (kind) {
    case 'star': starPath(g, s * 0.5, 0.48); g.fillStyle = color; g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.1, -s * 0.15, s * 0.07, s * 0.04, -0.6, 0, TAU); g.fill(); break;
    case 'heart': heartPath(g, 0, s * 0.05, s * 0.9); g.fillStyle = color; g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.2, -s * 0.2, s * 0.08, s * 0.05, -0.6, 0, TAU); g.fill(); break;
    case 'flower':
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.arc(Math.cos(a) * s * 0.26, Math.sin(a) * s * 0.26, s * 0.2, 0, TAU); g.fillStyle = i % 2 ? color : lighter(color, 0.4); g.fill(); g.stroke(); }
      g.beginPath(); g.arc(0, 0, s * 0.16, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.stroke(); break;
    case 'butterfly':
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(sx * s * 0.22, -s * 0.12, s * 0.22, s * 0.17, sx * 0.5, 0, TAU); g.fillStyle = color; g.fill(); g.stroke();
        g.beginPath(); g.ellipse(sx * s * 0.17, s * 0.15, s * 0.14, s * 0.11, -sx * 0.4, 0, TAU); g.fillStyle = lighter(color, 0.45); g.fill(); g.stroke();
        g.beginPath(); g.arc(sx * s * 0.24, -s * 0.13, s * 0.06, 0, TAU); g.fillStyle = '#fff'; g.fill();
      }
      g.beginPath(); g.ellipse(0, 0, s * 0.05, s * 0.24, 0, 0, TAU); g.fillStyle = NAVY; g.fill();
      g.beginPath(); g.moveTo(-s * 0.02, -s * 0.22); g.quadraticCurveTo(-s * 0.08, -s * 0.36, -s * 0.15, -s * 0.38); g.moveTo(s * 0.02, -s * 0.22); g.quadraticCurveTo(s * 0.08, -s * 0.36, s * 0.15, -s * 0.38); g.stroke(); break;
    case 'rainbow':
      RAINBOW.slice(0, 6).forEach((c, i) => { g.beginPath(); g.arc(0, s * 0.22, s * (0.48 - i * 0.055), Math.PI, TAU); g.lineWidth = s * 0.06; g.strokeStyle = c; g.stroke(); });
      g.fillStyle = '#fff'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.03);
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * s * 0.36 - s * 0.06, s * 0.22, s * 0.09, 0, TAU); g.arc(sx * s * 0.36 + s * 0.06, s * 0.2, s * 0.11, 0, TAU); g.fill(); }
      break;
    case 'crown':
      g.beginPath(); g.moveTo(-s * 0.42, s * 0.25); g.lineTo(-s * 0.42, -s * 0.15); g.lineTo(-s * 0.21, s * 0.05); g.lineTo(0, -s * 0.32); g.lineTo(s * 0.21, s * 0.05); g.lineTo(s * 0.42, -s * 0.15); g.lineTo(s * 0.42, s * 0.25); g.closePath();
      g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
      g.beginPath(); g.arc(0, s * 0.1, s * 0.07, 0, TAU); g.fillStyle = color === '#ffd23f' ? '#ff4d6d' : color; g.fill(); g.stroke(); break;
    case 'horn':
      g.beginPath(); g.moveTo(-s * 0.16, s * 0.42); g.lineTo(s * 0.04, -s * 0.48); g.lineTo(s * 0.18, s * 0.4); g.quadraticCurveTo(0, s * 0.5, -s * 0.16, s * 0.42);
      g.fillStyle = lighter(color, 0.55); g.fill(); g.stroke();
      g.save(); g.clip(); g.strokeStyle = color; g.lineWidth = s * 0.05;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-s * 0.3, s * (0.32 - k * 0.16)); g.lineTo(s * 0.3, s * (0.22 - k * 0.16)); g.stroke(); }
      g.restore();
      g.fillStyle = '#fff'; g.save(); g.translate(s * 0.22, -s * 0.3); drawSparkleShape(g, s * 0.22, '#fff6a8'); g.restore(); break;
    case 'cupcake':
      g.beginPath(); g.moveTo(-s * 0.3, 0); g.lineTo(s * 0.3, 0); g.lineTo(s * 0.22, s * 0.4); g.lineTo(-s * 0.22, s * 0.4); g.closePath(); g.fillStyle = lighter(color, 0.3); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, -s * 0.02, s * 0.36, s * 0.14, 0, 0, TAU); g.ellipse(0, -s * 0.14, s * 0.26, s * 0.12, 0, 0, TAU); g.fillStyle = '#ffd6ef'; g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -s * 0.3, s * 0.08, 0, TAU); g.fillStyle = '#ff2d55'; g.fill(); g.stroke(); break;
    default: break;
  }
  g.restore();
}

function drawToolIcon(g, id, x, y, s, color = '#ff6fd0') {
  g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 3; g.strokeStyle = '#24163f';
  switch (id) {
    case 'brush':
      g.save(); g.rotate(-0.7);
      g.fillStyle = '#c98a4b'; g.fillRect(-3, -2, 6, 22); g.strokeRect(-3, -2, 6, 22);
      g.fillStyle = '#d8d8ea'; g.fillRect(-4, -8, 8, 7); g.strokeRect(-4, -8, 8, 7);
      g.beginPath(); g.moveTo(-5, -8); g.quadraticCurveTo(0, -26, 5, -8); g.closePath(); g.fillStyle = color; g.fill(); g.stroke();
      g.restore(); break;
    case 'rainbow':
      RAINBOW.slice(0, 5).forEach((c, i) => { g.beginPath(); g.arc(0, 8, 17 - i * 3.2, Math.PI, TAU); g.lineWidth = 3.4; g.strokeStyle = c; g.stroke(); }); break;
    case 'glitter':
      drawSparkleShape(g, 30, '#ffe066'); g.save(); g.translate(11, 9); drawSparkleShape(g, 14, color); g.restore(); g.save(); g.translate(-12, 10); drawSparkleShape(g, 10, '#fff'); g.restore(); break;
    case 'stamp':
      g.fillStyle = '#c98a4b'; g.beginPath(); g.ellipse(0, -10, 7, 9, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#9b5cff'; g.fillRect(-14, -2, 28, 9); g.strokeRect(-14, -2, 28, 9);
      g.fillStyle = color; g.fillRect(-12, 7, 24, 6); g.strokeRect(-12, 7, 24, 6); break;
    case 'fill':
      g.save(); g.rotate(0.35);
      g.fillStyle = '#d8d8ea'; g.beginPath(); g.moveTo(-12, -8); g.lineTo(12, -8); g.lineTo(9, 14); g.lineTo(-9, 14); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, -8, 12, 4, 0, 0, TAU); g.fillStyle = color; g.fill(); g.stroke();
      g.restore();
      g.beginPath(); g.moveTo(14, -4); g.quadraticCurveTo(20, 6, 16, 12); g.lineWidth = 5; g.strokeStyle = color; g.stroke(); break;
    case 'eraser':
      g.save(); g.rotate(-0.5); g.fillStyle = '#ff9fc7'; g.fillRect(-14, -8, 28, 16); g.strokeRect(-14, -8, 28, 16);
      g.fillStyle = '#7fd3ff'; g.fillRect(4, -8, 10, 16); g.strokeRect(4, -8, 10, 16); g.restore(); break;
    default: break;
  }
  g.restore();
}

// =============================================================================
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'pick';
    this.phaseT = 0;
    this.cpuOnly = this.players.every((p) => p.isAI);
    this.paint = document.createElement('canvas'); this.paint.width = CW; this.paint.height = CH;
    this.pctx = this.paint.getContext('2d');
    this.base = document.createElement('canvas'); this.base.width = CW; this.base.height = CH;
    this.bctx = this.base.getContext('2d');
    this.page = 'blank'; this.lines = null;
    this.clearCanvas();
    this.stampKinds = ['me', ...SHAPE_STAMPS, ...shuffle(this.players.map((p) => 'char:' + p.charId))];
    this.stations = this.players.map((p, i) => this.makeStation(p, i));
    this.layoutActors();
    const owner = this.players.find((p) => !p.isAI) || this.players[0];
    this.picker = { owner, sel: 1, t: 0, first: true };
    this.paintT = 0;
    this.toast = null;
    sfx('magic');
  }

  makeStation(p, i) {
    const st = {
      p, i, cur: { x: CW * (0.3 + 0.4 * ((i % 4) / 3)), y: CH * (0.35 + 0.3 * (i >= 4 ? 1 : 0)) }, hold: 0,
      tool: 0, color: [9, 6, 2, 4, 8, 0, 5, 1][i % 8], size: 1, stamp: 0, stroke: null, confirm: null, paletteT: 0,
      strokes: 0, stamps: 0, fills: 0, ai: { cmds: [], wait: 0, idle: rand(0.5, 1.5) }, soundT: 0, overBtn: null,
    };
    st.actor = new Actor(p.charId, { facing: 1 });
    return st;
  }

  layoutActors() {
    const sides = [[], []];
    this.stations.forEach((st, i) => sides[i % 2].push(st));
    sides.forEach((list, side) => {
      const m = list.length;
      list.forEach((st, j) => {
        const a = st.actor;
        const th = Math.min(m === 1 ? 300 : 0.78 * (800 / m), 300);
        a.scale = 1; a.scale = Math.min(th / a.leader.h, 210 / Math.max(1, a.width));
        a.x = side === 0 ? 120 : W - 120;
        a.y = 150 + (j + 1) * (800 / m) - (m === 1 ? 120 : 10);
        a.facing = side === 0 ? 1 : -1;
        a.snap();
        st.home = { x: a.x, y: a.y, s: a.scale };
      });
    });
  }

  // --- canvas ops -------------------------------------------------------------
  clearCanvas() {
    for (const c of [this.pctx, this.bctx]) { c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.fillRect(0, 0, CW, CH); }
    this.strokeList = [];
    this.owned = new Uint8Array(GX * GY);
  }

  setPage(id) {
    this.page = id;
    const pc = pageCanvas(id);
    this.lines = pc ? pc.canvas : null;
    this.linesAlpha = pc ? pc.alpha : null;
    this.clearCanvas();
    for (const st of this.stations) st.stroke = null;
    sfx('magic'); sfx('flip');
    particles.burst(W / 2, FY + FH / 2, { type: 'sparkle', count: 30, speed: [200, 600], colors: ['#fff', '#ffe066', '#ff9fd8'] });
  }

  markOwned(x, y, r) {
    const x0 = clamp(Math.floor((x - r) / GRID), 0, GX - 1), x1 = clamp(Math.floor((x + r) / GRID), 0, GX - 1);
    const y0 = clamp(Math.floor((y - r) / GRID), 0, GY - 1), y1 = clamp(Math.floor((y + r) / GRID), 0, GY - 1);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) this.owned[gy * GX + gx] = 1;
  }
  ownedNear(x, y, r) {
    const x0 = clamp(Math.floor((x - r) / GRID), 0, GX - 1), x1 = clamp(Math.floor((x + r) / GRID), 0, GX - 1);
    const y0 = clamp(Math.floor((y - r) / GRID), 0, GY - 1), y1 = clamp(Math.floor((y + r) / GRID), 0, GY - 1);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) if (this.owned[gy * GX + gx]) return true;
    return false;
  }

  /** Draw one segment (or a dot when i === 0) of a brush-type stroke. */
  drawSeg(ctx, s, i) {
    const p = s.pts;
    const x1 = p[i * 2], y1 = p[i * 2 + 1];
    const x0 = i ? p[i * 2 - 2] : x1, y0 = i ? p[i * 2 - 1] : y1;
    const len = Math.hypot(x1 - x0, y1 - y0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.tool === 'glitter') {
      const rng = mulberry32(s.seed + i * 7919);
      ctx.globalAlpha = 0.2; ctx.strokeStyle = s.color; ctx.lineWidth = s.r * 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 + 0.01, y1); ctx.stroke(); ctx.globalAlpha = 1;
      const n = 1 + Math.floor((len + 4) / 5 * (s.r / 14 + 0.4));
      const pal = [s.color, '#ffffff', '#ffe066', s.color, lighter(s.color, 0.5)];
      for (let k = 0; k < n; k++) {
        const u = rng(), a = rng() * TAU, d = Math.sqrt(rng()) * s.r * 1.1;
        const x = lerp(x0, x1, u) + Math.cos(a) * d, y = lerp(y0, y1, u) + Math.sin(a) * d;
        const c = pal[Math.floor(rng() * pal.length)], sz = 1.5 + rng() * s.r * 0.22;
        if (rng() < 0.3) { ctx.save(); ctx.translate(x, y); drawSparkleShape(ctx, sz * 3.2, c); ctx.restore(); }
        else { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill(); }
      }
      return;
    }
    if (s.tool === 'rainbow') { ctx.strokeStyle = `hsl(${(s.hue + s.len * 0.45) % 360}, 92%, 62%)`; s.len += len; }
    else ctx.strokeStyle = s.tool === 'eraser' ? '#ffffff' : s.color;
    ctx.lineWidth = s.r * 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 + (len ? 0 : 0.01), y1); ctx.stroke();
  }

  replay(ctx, s) {
    if (s.tool === 'stamp') { drawStamp(ctx, s.kind, s.x, s.y, s.size, s.color, s.rot); return; }
    if (s.tool === 'fill') { this.flood(ctx, s.x, s.y, s.color); return; }
    s.len = 0;
    for (let i = 0; i < s.pts.length / 2; i++) this.drawSeg(ctx, s, i);
  }

  pushStroke(s) {
    this.strokeList.push(s);
    while (this.strokeList.length > MAX_LIVE) this.replay(this.bctx, this.strokeList.shift());
  }

  rerender() {
    this.pctx.globalAlpha = 1; this.pctx.globalCompositeOperation = 'source-over';
    this.pctx.drawImage(this.base, 0, 0);
    for (const s of this.strokeList) this.replay(this.pctx, s);
  }

  /**
   * Flood fill at (x, y). guard = { owner check for CPUs }: aborts when the
   * region touches a human's work, isn't blank paper, or is huge.
   */
  flood(ctx, x, y, color, guard = null) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= CW || y >= CH) return 0;
    const img = ctx.getImageData(0, 0, CW, CH), d = img.data;
    const walls = this.linesAlpha;
    const i0 = (y * CW + x) * 4;
    if (walls && walls[y * CW + x] > 90) return 0;
    const sr = d[i0], sg = d[i0 + 1], sb = d[i0 + 2];
    const [fr, fg, fb] = rgb(color);
    if (Math.abs(sr - fr) + Math.abs(sg - fg) + Math.abs(sb - fb) < 12) return 0;
    if (guard && (sr + sg + sb) < 740) return 0; // CPUs only fill blank paper
    const tol = 70;
    const match = (p) => {
      if (walls && walls[p] > 90) return false;
      const q = p * 4;
      return Math.abs(d[q] - sr) + Math.abs(d[q + 1] - sg) + Math.abs(d[q + 2] - sb) <= tol;
    };
    const mask = new Uint8Array(CW * CH);
    const stack = [x, y];
    let count = 0;
    const maxCount = guard ? CW * CH * 0.14 : Infinity;
    while (stack.length) {
      const py = stack.pop(), px0 = stack.pop();
      let px = px0;
      let p = py * CW + px;
      while (px >= 0 && !mask[p] && match(p)) { px--; p--; }
      px++; p++;
      let up = false, dn = false;
      while (px < CW && !mask[p] && match(p)) {
        mask[p] = 1; count++;
        if (guard && this.owned[Math.floor(py / GRID) * GX + Math.floor(px / GRID)]) return 0;
        if (count > maxCount) return 0;
        if (py > 0) { const q = p - CW; if (!mask[q] && match(q)) { if (!up) { stack.push(px, py - 1); up = true; } } else up = false; }
        if (py < CH - 1) { const q = p + CW; if (!mask[q] && match(q)) { if (!dn) { stack.push(px, py + 1); dn = true; } } else dn = false; }
        px++; p++;
      }
    }
    if (guard && count < 300) return 0;
    // paint + grow one pixel under the lines so no white halos remain
    for (let p = 0; p < mask.length; p++) {
      if (mask[p] !== 1) continue;
      const q = p * 4; d[q] = fr; d[q + 1] = fg; d[q + 2] = fb; d[q + 3] = 255;
      const px = p % CW;
      for (const nb of [p - 1, p + 1, p - CW, p + CW]) {
        if (nb < 0 || nb >= mask.length || mask[nb]) continue;
        if ((nb === p - 1 && px === 0) || (nb === p + 1 && px === CW - 1)) continue;
        const r = nb * 4;
        const lineUnder = walls && walls[nb] > 30;
        if (lineUnder || Math.abs(d[r] - sr) + Math.abs(d[r + 1] - sg) + Math.abs(d[r + 2] - sb) <= tol * 2) { mask[nb] = 2; d[r] = fr; d[r + 1] = fg; d[r + 2] = fb; }
      }
    }
    ctx.putImageData(img, 0, 0);
    if (guard === null && this._markFill) {
      for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
        const p = (gy * GRID + 25) * CW + gx * GRID + 25;
        if (mask[p]) this.owned[gy * GX + gx] = 1;
      }
    }
    return count;
  }

  // --- painting input --------------------------------------------------------
  toolOf(st) { return TOOLS[st.tool].id; }

  updatePainter(st, dt) {
    const c = st.p.ctrl, a = st.actor;
    // cursor with acceleration (right stick = fine adjust)
    const mag = Math.hypot(c.x, c.y);
    st.hold = mag > 0.15 ? st.hold + dt : 0;
    const accel = 0.32 + 0.68 * clamp(st.hold / 0.7, 0, 1);
    const sp = 1000 * accel;
    const cur = st.cur;
    cur.x = clamp(cur.x + (c.x * sp + c.rx * 160) * dt, 0, CW - 1);
    cur.y = clamp(cur.y + (c.y * sp + c.ry * 160) * dt, st.p.isAI ? 0 : -100, CH - 1);
    st.paletteT = Math.max(0, st.paletteT - dt);
    st.soundT -= dt;
    const scr = toScreen(cur.x, cur.y);
    st.overBtn = null;
    for (const [k, b] of Object.entries(BTN)) if (scr.x >= b.x && scr.x <= b.x + b.w && scr.y >= b.y - 10 && scr.y <= b.y + b.h + 10) st.overBtn = k;

    if (st.confirm) {
      st.confirm.t += dt;
      if (c.pressed('a')) { st.confirm = null; this.startGallery(); return; }
      if (c.pressed('b') || (st.overBtn !== 'done' && st.confirm.t > 0.3)) { st.confirm = null; sfx('back'); }
      return;
    }
    if (c.pressed('rb')) { st.tool = (st.tool + 1) % TOOLS.length; this.toolFx(st); }
    if (c.pressed('lb')) { st.tool = (st.tool + TOOLS.length - 1) % TOOLS.length; this.toolFx(st); }
    if (c.pressed('x')) {
      if (this.toolOf(st) === 'stamp') { st.stamp = (st.stamp + 1) % this.stampKinds.length; sfx('stamp'); }
      else { st.color = (st.color + 1) % COLORS.length; sfx('collect', { step: st.color }); }
      st.paletteT = 1.4;
    }
    if (c.pressed('y')) { st.size = (st.size + 1) % SIZES.length; sfx(st.size === 2 ? 'grow' : 'shrink'); }
    if (c.pressed('b')) this.undo(st);

    const tool = this.toolOf(st);
    const inside = cur.y >= 0;
    if (c.pressed('a') && !inside && st.overBtn) { this.pressButton(st, st.overBtn); return; }
    const brushy = tool === 'brush' || tool === 'rainbow' || tool === 'glitter' || tool === 'eraser';
    if (brushy) {
      if (c.pressed('a') && inside) {
        const s = { owner: st.i, tool, color: COLORS[st.color], r: SIZES[st.size].r, pts: [cur.x, cur.y], hue: rand(360), len: 0, seed: randInt(1, 1e9) };
        st.stroke = s; this.pushStroke(s); this.drawSeg(this.pctx, s, 0); st.strokes++;
        if (!st.p.isAI) this.markOwned(cur.x, cur.y, s.r);
      } else if (c.held('a') && st.stroke && inside) {
        const s = st.stroke, n = s.pts.length;
        const dx = cur.x - s.pts[n - 2], dy = cur.y - s.pts[n - 1];
        if (dx * dx + dy * dy > 9) {
          s.pts.push(cur.x, cur.y); this.drawSeg(this.pctx, s, s.pts.length / 2 - 1);
          if (!st.p.isAI) this.markOwned(cur.x, cur.y, s.r);
          if (st.soundT <= 0) { sfx(tool === 'glitter' || tool === 'rainbow' ? 'sparkle' : 'brush'); st.soundT = tool === 'brush' || tool === 'eraser' ? 0.13 : 0.3; }
          if (tool === 'glitter' && chance(0.5)) particles.trail(scr.x + rand(-10, 10), scr.y + rand(-10, 10), { type: 'sparkle', colors: [COLORS[st.color], '#fff'] });
          if (tool === 'rainbow' && chance(0.3)) particles.trail(scr.x, scr.y, { type: 'star', size: [8, 14] });
        }
      }
      if (!c.held('a') || !inside) st.stroke = null;
    } else if (c.pressed('a') && inside) {
      if (tool === 'stamp') this.doStamp(st);
      else if (tool === 'fill') this.doFill(st);
    }
    const painting = !!st.stroke;
    if (painting) { if (a.pose !== 'paint' && !a._once) a.setPose('paint'); } else if (a.pose === 'paint') a.setPose('idle');
  }

  toolFx(st) {
    sfx('swap');
    const scr = toScreen(st.cur.x, st.cur.y);
    particles.burst(scr.x, scr.y, { type: 'sparkle', count: 4, colors: ['#fff'] });
    st.stroke = null; st.paletteT = this.toolOf(st) === 'stamp' ? 1.2 : 0;
    st.toolPop = 0.4;
  }

  doStamp(st) {
    const kindRaw = this.stampKinds[st.stamp];
    const kind = kindRaw === 'me' ? 'char:' + st.p.charId : kindRaw;
    const s = { owner: st.i, tool: 'stamp', kind, x: st.cur.x, y: st.cur.y, size: SIZES[st.size].stamp, color: COLORS[st.color], rot: rand(-0.25, 0.25) };
    this.pushStroke(s); drawStamp(this.pctx, kind, s.x, s.y, s.size, s.color, s.rot);
    st.stamps++;
    if (!st.p.isAI) this.markOwned(s.x, s.y, s.size * 0.55);
    const scr = toScreen(s.x, s.y);
    sfx('stamp'); particles.ring(scr.x, scr.y, COLORS[st.color], s.size * 0.9, 0.35);
    particles.burst(scr.x, scr.y, { type: 'star', count: 5, speed: [150, 320] });
    st.actor.playOnce('action', 0.35, 'idle');
  }

  doFill(st) {
    const color = COLORS[st.color];
    this._markFill = !st.p.isAI;
    const n = this.flood(this.pctx, st.cur.x, st.cur.y, color, st.p.isAI ? {} : null);
    this._markFill = false;
    const scr = toScreen(st.cur.x, st.cur.y);
    if (!n) { sfx('blip'); return false; }
    this.pushStroke({ owner: st.i, tool: 'fill', x: Math.floor(st.cur.x), y: Math.floor(st.cur.y), color });
    st.fills++;
    sfx('splash'); sfx('magic');
    particles.burst(scr.x, scr.y, { type: 'drop', count: 14, colors: [color, lighter(color, 0.5)], speed: [150, 420] });
    st.actor.playOnce('cheer', 0.45, 'idle');
    return true;
  }

  undo(st) {
    for (let i = this.strokeList.length - 1; i >= 0; i--) {
      if (this.strokeList[i].owner !== st.i) continue;
      if (st.stroke === this.strokeList[i]) st.stroke = null;
      this.strokeList.splice(i, 1);
      this.rerender();
      sfx('back');
      const scr = toScreen(st.cur.x, st.cur.y);
      particles.burst(scr.x, scr.y, { type: 'smoke', count: 5, speed: [40, 120] });
      return;
    }
    sfx('blip');
  }

  pressButton(st, which) {
    if (which === 'page') { this.picker = { owner: st.p, sel: PAGES.findIndex((p) => p.id === this.page), t: 0, first: false }; sfx('select'); }
    else if (which === 'done') { st.confirm = { t: 0 }; sfx('select'); }
  }

  // --- CPU painters ------------------------------------------------------------
  findSpot(st, r) {
    const humans = this.stations.filter((s) => !s.p.isAI);
    const others = this.stations.filter((s) => s !== st && s.p.isAI && s.ai.spot);
    for (let k = 0; k < 40; k++) {
      const x = rand(r + 40, CW - r - 40), y = rand(r + 40, CH - r - 40);
      if (humans.some((h) => Math.hypot(h.cur.x - x, h.cur.y - y) < 300)) continue;
      if (this.ownedNear(x, y, r + 30)) continue;
      if (others.some((o) => Math.hypot(o.ai.spot.x - x, o.ai.spot.y - y) < r + 160)) continue;
      return { x, y };
    }
    return null;
  }

  planActivity(st) {
    const page = this.page !== 'blank';
    const kinds = page ? ['fill', 'fill', 'fill', 'fill', 'stamp', 'stamp', 'glitter', 'rainbow', 'heart', 'flower'] : ['stamp', 'stamp', 'stamp', 'flower', 'flower', 'rainbow', 'rainbow', 'glitter', 'heart', 'heart'];
    const kind = pick(kinds);
    const cmds = [];
    const tool = (id) => cmds.push({ t: 'tool', v: TOOL[id] });
    const color = (i) => cmds.push({ t: 'color', v: i });
    const size = (i) => cmds.push({ t: 'size', v: i });
    const R = { stamp: 90, flower: 70, rainbow: 190, glitter: 90, heart: 80, fill: 30 }[kind];
    const spot = this.findSpot(st, R);
    if (!spot) return [];
    st.ai.spot = spot;
    const { x, y } = spot;
    const path = (pts) => { cmds.push({ t: 'goto', x: pts[0][0], y: pts[0][1] }, { t: 'down' }, { t: 'path', pts: pts.slice(1), i: 0 }, { t: 'up' }); };
    switch (kind) {
      case 'stamp': {
        tool('stamp'); size(pick([0, 1, 1]));
        cmds.push({ t: 'stamp', v: randInt(0, this.stampKinds.length - 1) });
        const n = randInt(1, 3);
        for (let k = 0; k < n; k++) cmds.push({ t: 'goto', x: x + (k - (n - 1) / 2) * 110, y: y + rand(-20, 20) }, { t: 'tap' });
        break;
      }
      case 'flower': {
        tool('brush'); size(0); color(4);
        path([[x, y + 90], [x + 6, y + 50], [x, y + 20]]);
        size(1); color(pick([0, 1, 2, 8, 9, 7]));
        const pts = []; for (let k = 0; k <= 10; k++) { const a = (k / 10) * TAU; pts.push([x + Math.cos(a) * 30, y + Math.sin(a) * 30]); }
        path(pts);
        color(2); cmds.push({ t: 'goto', x, y }, { t: 'tap' });
        break;
      }
      case 'rainbow': {
        tool('rainbow'); size(2);
        const r = rand(110, 170), pts = [];
        for (let k = 0; k <= 12; k++) { const a = Math.PI + (k / 12) * Math.PI; pts.push([x + Math.cos(a) * r, y + 60 + Math.sin(a) * r]); }
        path(pts);
        break;
      }
      case 'glitter': {
        tool('glitter'); size(1); color(pick([2, 9, 8, 5]));
        const pts = []; for (let k = 0; k <= 16; k++) { const a = k * 0.8, r = 10 + k * 4.5; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
        path(pts);
        break;
      }
      case 'heart': {
        tool('brush'); size(1); color(pick([0, 9, 8]));
        const pts = []; for (let k = 0; k <= 18; k++) { const t = (k / 18) * TAU; pts.push([x + 3.4 * 16 * Math.sin(t) ** 3, y - 3.4 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); }
        path(pts);
        break;
      }
      case 'fill': {
        tool('fill'); color(pick([0, 1, 2, 3, 4, 5, 6, 8, 9]));
        cmds.push({ t: 'goto', x, y }, { t: 'fill' });
        break;
      }
      default: break;
    }
    return cmds;
  }

  updateAI(st, dt) {
    const ai = st.ai, c = st.p.ctrl;
    if (ai.wait > 0) { ai.wait -= dt; c.move(0, 0); return; }
    if (!ai.cmds.length) {
      c.move(0, 0); c.hold('a', false); ai.spot = null;
      ai.idle -= dt;
      if (ai.idle <= 0) {
        ai.cmds = this.planActivity(st);
        ai.idle = this.cpuOnly ? rand(0.6, 1.6) : rand(2.5, 5.5);
        if (!ai.cmds.length) ai.idle = 0.8;
      }
      return;
    }
    const cmd = ai.cmds[0], prof = aiProfile(st.p);
    const done = (w = 0.12) => { ai.cmds.shift(); ai.wait = w / prof.speed; };
    switch (cmd.t) {
      case 'tool': if (st.tool === cmd.v) done(0.1); else { c.press('rb'); ai.wait = 0.24; } break;
      case 'color': if (st.color === cmd.v) done(0.1); else { c.press('x'); ai.wait = 0.17; } break;
      case 'size': if (st.size === cmd.v) done(0.05); else { c.press('y'); ai.wait = 0.2; } break;
      case 'stamp': if (st.stamp === cmd.v) done(0.1); else { c.press('x'); ai.wait = 0.17; } break;
      case 'goto': {
        const d = steer(st.p, st.cur.x, st.cur.y, cmd.x, cmd.y, { arrive: 140, wobble: false });
        cmd.t2 = (cmd.t2 || 0) + dt;
        if (d < 10 || cmd.t2 > 4) { c.move(0, 0); done(0.12); }
        break;
      }
      case 'down': c.hold('a', true); done(0.05); break;
      case 'up': c.hold('a', false); c.move(0, 0); done(0.25); break;
      case 'path': {
        const pt = cmd.pts[cmd.i];
        if (!pt) { done(0.05); break; }
        const d = steer(st.p, st.cur.x, st.cur.y, pt[0], pt[1], { arrive: 70 });
        cmd.t2 = (cmd.t2 || 0) + dt;
        if (d < 14 || cmd.t2 > 1.5) { cmd.i++; cmd.t2 = 0; }
        break;
      }
      case 'tap': c.press('a'); done(0.4); break;
      case 'fill': c.press('a'); done(0.6); break;
      default: done();
    }
  }

  // --- picker ------------------------------------------------------------------
  updatePicker(dt) {
    const P = this.picker;
    P.t += dt;
    const c = P.owner.ctrl;
    if (P.owner.isAI) {
      if (P.t > 1.6 && !P.aiPicked) { P.aiPicked = true; P.sel = pick([0, 1, 2, 3, 3, 2, 1]); }
      if (P.t > 2.4) this.choosePage(P.sel);
      return;
    }
    if (c.nav.x) { P.sel = (P.sel + c.nav.x + PAGES.length) % PAGES.length; sfx('move'); }
    if (c.nav.y) { P.sel = (P.sel + c.nav.y * 2 + PAGES.length) % PAGES.length; sfx('move'); }
    if (c.pressed('a') && P.t > 0.25) this.choosePage(P.sel);
    else if (c.pressed('b') && !P.first) { this.picker = null; sfx('back'); }
  }

  choosePage(i) {
    this.setPage(PAGES[i].id);
    this.picker = null;
    this.phase = 'paint';
    for (const st of this.stations) { st.actor.playOnce('cheer', 0.5, 'idle'); if (st.p.isAI) { st.p.ctrl.move(0, 0); st.p.ctrl.hold('a', false); } }
  }

  // --- gallery -----------------------------------------------------------------
  startGallery() {
    if (this.phase === 'gallery') return;
    this.phase = 'gallery'; this.phaseT = 0; this.picker = null;
    for (const st of this.stations) { st.stroke = null; st.confirm = null; if (st.p.isAI) { st.p.ctrl.move(0, 0); st.p.ctrl.hold('a', false); } }
    // composite the finished picture
    this.final = document.createElement('canvas'); this.final.width = CW; this.final.height = CH;
    const g = this.final.getContext('2d');
    g.drawImage(this.paint, 0, 0);
    if (this.lines) g.drawImage(this.lines, 0, 0);
    const n = this.n;
    const sp = Math.min(260, 1700 / n);
    this.stations.forEach((st, i) => {
      const a = st.actor;
      const th = n <= 4 ? 250 : 200;
      st.gal = { from: { x: a.x, y: a.y, s: a.scale }, to: { x: W / 2 + (i - (n - 1) / 2) * sp, y: 1040, s: Math.min(th / a.leader.h, (sp * 0.9) / Math.max(1, a.width / a.scale)) } };
    });
    fx.flash('#ffffff', 0.3);
    sfx('fanfare'); snd('applause', 'cheer');
    particles.confettiRain(W, 140);
  }

  updateGallery(dt) {
    const t = this.phaseT;
    for (const st of this.stations) {
      const a = st.actor, G = st.gal, e = ease.inOutQuad(Math.min(1, t / 1.2));
      a.x = lerp(G.from.x, G.to.x, e); a.y = lerp(G.from.y, G.to.y, e); a.scale = lerp(G.from.s, G.to.s, e);
      if (t < 1.2) { a.setPose('walk'); a.facing = G.to.x > G.from.x ? 1 : -1; }
      else if (!st.celebrating) { st.celebrating = true; a.playOnce('ready', 0.6, st.i % 2 ? 'celebrate' : 'clap'); a.facing = 1; }
      if (st.celebrating && chance(dt * 0.4)) a.emote(pick(['heart', 'star', 'happy']), 1.2);
      a.update(dt);
      if (!st.p.isAI && t > 1.2) {
        if (st.p.ctrl.pressed('x')) this.savePicture();
        if (st.p.ctrl.pressed('a') && t > 2) this.finishGame();
      }
    }
    if (t > 1.4 && chance(dt * 1.5)) particles.burst(rand(300, W - 300), rand(150, 650), { type: 'sparkle', count: 3, colors: ['#fff', '#ffe066'] });
    if (this.cpuOnly && t > 7) this.finishGame();
    if (t > 45) this.finishGame();
    if (this.toast) { this.toast.t += dt; if (this.toast.t > 2.2) this.toast = null; }
  }

  savePicture() {
    try {
      const out = document.createElement('canvas'); out.width = CW; out.height = CH;
      const g = out.getContext('2d');
      g.drawImage(this.final, 0, 0);
      g.font = '700 28px Fredoka, system-ui, sans-serif'; g.textAlign = 'right'; g.fillStyle = 'rgba(36,22,63,0.6)';
      g.fillText('Charlie Party Art Studio', CW - 24, CH - 22);
      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `charlie-art-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
      this.toast = { text: 'Picture saved!', t: 0 };
      sfx('shutter'); sfx('star');
      fx.flash('#ffffff', 0.2);
    } catch (e) {
      console.warn('Save failed', e);
      this.toast = { text: 'Could not save, sorry!', t: 0 };
    }
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((st) => {
      const parts = [];
      if (st.strokes) parts.push(`${st.strokes} stroke${st.strokes === 1 ? '' : 's'}`);
      if (st.stamps) parts.push(`${st.stamps} stamp${st.stamps === 1 ? '' : 's'}`);
      if (st.fills) parts.push(`${st.fills} fill${st.fills === 1 ? '' : 's'}`);
      return parts.slice(0, 2).join(' · ') || 'Art fan!';
    });
    this.api.finish({ showcase: true, highlight: null, stats, title: 'Masterpiece!' });
  }

  onDone() {
    if (this.phase === 'gallery') this.finishGame();
    else this.startGallery();
  }

  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.phase === 'gallery') { this.updateGallery(dt); return; }
    for (const st of this.stations) st.actor.update(dt);
    if (this.picker) { this.updatePicker(dt); return; }
    this.paintT += dt;
    for (const st of this.stations) {
      if (st.p.isAI) this.updateAI(st, dt);
      this.updatePainter(st, dt);
      if (this.phase !== 'paint') return;
      st.toolPop = Math.max(0, (st.toolPop || 0) - dt);
    }
    if (this.cpuOnly && this.paintT > 55) this.startGallery();
  }

  postUpdate(dt) { this.t += dt; for (const st of this.stations) st.actor.update(dt); }

  // =========================================================================
  draw(g) {
    if (this.phase === 'gallery') { this.drawGallery(g); return; }
    this.drawStudio(g);
    // canvas
    g.drawImage(this.paint, FX, FY, FW, FH);
    if (this.lines) g.drawImage(this.lines, FX, FY, FW, FH);
    this.drawFrame(g, FX, FY, FW, FH, 26, '#c98a4b', '#8a5a2e');
    this.drawButtons(g);
    for (const st of this.stations) {
      st.actor.draw(g, { ring: st.p.color });
      ui.playerTag(g, st.p, st.actor.x, st.actor.y - st.actor.height - 26);
    }
    this.drawChips(g);
    if (!this.picker) for (const st of this.stations) this.drawCursor(g, st);
    if (this.picker) this.drawPicker(g);
  }

  drawStudio(g) {
    const bg = art('bg/art-studio');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#fff1dc'); gr.addColorStop(1, '#ffe2ee');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // paint splats on the wall
    const splats = [[60, 90, '#ff6fd0'], [1860, 120, '#3fa7ff'], [140, 300, '#ffd23f'], [1790, 360, '#36d17a'], [70, 640, '#9b5cff'], [1850, 700, '#ff9f1c']];
    for (const [x, y, c] of splats) {
      g.save(); g.globalAlpha = 0.28; g.fillStyle = c; g.translate(x, y);
      g.beginPath(); for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, r = k % 2 ? 34 : 52; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
      g.restore();
    }
    // floor
    g.fillStyle = '#e8b98a'; g.fillRect(0, 960, W, H - 960);
    g.strokeStyle = 'rgba(138,90,46,0.35)'; g.lineWidth = 3;
    for (let x = 0; x < W; x += 120) { g.beginPath(); g.moveTo(x, 960); g.lineTo(x - 60, H); g.stroke(); }
    // easel legs
    g.fillStyle = '#a8703e'; g.strokeStyle = '#24163f'; g.lineWidth = 5;
    for (const [x0, x1] of [[520, 440], [1400, 1480]]) { g.beginPath(); g.moveTo(x0 - 16, 900); g.lineTo(x0 + 16, 900); g.lineTo(x1 + 16, H); g.lineTo(x1 - 16, H); g.closePath(); g.fill(); g.stroke(); }
    // title
    g.save(); g.translate(W / 2, 58);
    ui.panel(g, -300, -42, 600, 84, { r: 42, fill: '#9b5cff' });
    ui.text(g, 'Art Studio', 0, 2, { size: 54, weight: 800 });
    g.restore();
    for (const [x, c] of [[W / 2 - 340, '#ff6fd0'], [W / 2 + 340, '#3fa7ff']]) { g.save(); g.translate(x, 58); drawToolIcon(g, 'brush', 0, 0, 56, c); g.restore(); }
  }

  drawFrame(g, x, y, w, h, t, c1, c2) {
    g.save();
    g.fillStyle = 'rgba(36,22,63,0.3)'; g.fillRect(x - t + 10, y - t + 14, w + 2 * t, h + 2 * t);
    g.lineWidth = t; g.strokeStyle = c1; g.strokeRect(x - t / 2, y - t / 2, w + t, h + t);
    g.lineWidth = 4; g.strokeStyle = c2; g.strokeRect(x - t * 0.25, y - t * 0.25, w + t * 0.5, h + t * 0.5);
    g.lineWidth = 6; g.strokeStyle = '#24163f'; g.strokeRect(x - t, y - t, w + 2 * t, h + 2 * t); g.lineWidth = 4; g.strokeRect(x, y, w, h);
    g.restore();
  }

  drawButtons(g) {
    for (const [k, b] of Object.entries(BTN)) {
      const hot = this.stations.some((st) => st.overBtn === k && !this.picker);
      const pulse = hot ? 1.06 + Math.sin(this.t * 10) * 0.03 : 1;
      g.save(); g.translate(b.x + b.w / 2, b.y + b.h / 2); g.scale(pulse, pulse);
      ui.panel(g, -b.w / 2, -b.h / 2, b.w, b.h, { r: b.h / 2, fill: k === 'done' ? (hot ? '#5ff0a0' : '#36d17a') : (hot ? '#ffe680' : '#ffd23f'), lineWidth: 5 });
      if (k === 'done') { g.save(); g.translate(-b.w / 2 + 38, 0); drawStarShape(g, 40, '#fff'); g.restore(); }
      else { g.save(); g.translate(-b.w / 2 + 38, 0); g.fillStyle = '#fff'; g.strokeStyle = '#24163f'; g.lineWidth = 3; g.fillRect(-14, -18, 28, 36); g.strokeRect(-14, -18, 28, 36); g.restore(); }
      ui.text(g, b.label, 22, 2, { size: 38, color: k === 'done' ? '#fff' : '#24163f', stroke: k === 'done' ? '#24163f' : false, weight: 800 });
      g.restore();
    }
    const pg = PAGES.find((p) => p.id === this.page);
    if (pg && this.page !== 'blank') ui.text(g, pg.name, BTN.page.x + BTN.page.w + 20, 58, { size: 26, color: '#6b5a85', stroke: false, align: 'left' });
  }

  drawChips(g) {
    const n = this.n, area = { x: FX, w: FW };
    const cw = Math.min(260, (area.w - (n - 1) * 10) / n), chH = 96;
    const x0 = area.x + (area.w - (cw * n + (n - 1) * 10)) / 2, y = 972;
    this.stations.forEach((st, i) => {
      const x = x0 + i * (cw + 10);
      const pop = st.toolPop ? 1 + st.toolPop * 0.25 : 1;
      ui.panel(g, x, y, cw, chH, { r: 22, fill: '#ffffff', stroke: st.p.color, lineWidth: 6 });
      const pr = Math.min(28, cw * 0.14);
      drawPortrait(g, st.p.charId, x + pr + 12, y + chH / 2 - 8, pr, { ring: st.p.color, ringWidth: 4 });
      ui.text(g, st.p.tag, x + pr + 12, y + chH - 14, { size: 20, color: st.p.color, strokeWidth: 4 });
      const tool = this.toolOf(st);
      const tx = x + pr * 2 + 24 + (cw - pr * 2 - 24) * 0.28;
      g.save(); g.translate(tx, y + chH / 2 - 6); g.scale(pop, pop);
      if (tool === 'stamp') drawStamp(g, this.stampKinds[st.stamp] === 'me' ? 'char:' + st.p.charId : this.stampKinds[st.stamp], 0, 0, Math.min(52, cw * 0.22), COLORS[st.color]);
      else drawToolIcon(g, tool, 0, 0, Math.min(48, cw * 0.22), COLORS[st.color]);
      g.restore();
      if (cw > 150) ui.text(g, TOOLS[st.tool].name, tx, y + chH - 14, { size: 18, color: '#24163f', stroke: false, maxWidth: cw * 0.34 });
      // color swatch + size dots
      const sx = x + cw - Math.min(40, cw * 0.18);
      g.beginPath(); g.arc(sx, y + chH / 2 - 10, Math.min(20, cw * 0.09), 0, TAU);
      if (tool === 'rainbow') { const gg = g.createLinearGradient(sx - 20, 0, sx + 20, 0); RAINBOW.forEach((c, k) => gg.addColorStop(k / 6, c)); g.fillStyle = gg; } else g.fillStyle = tool === 'eraser' ? '#ffffff' : COLORS[st.color];
      g.fill(); g.lineWidth = 3; g.strokeStyle = '#24163f'; g.stroke();
      for (let k = 0; k < 3; k++) {
        g.beginPath(); g.arc(sx - 14 + k * 14, y + chH - 18, 3 + k * 1.6, 0, TAU);
        g.fillStyle = k === st.size ? '#24163f' : 'rgba(36,22,63,0.22)'; g.fill();
      }
    });
  }

  drawCursor(g, st) {
    const { x, y } = toScreen(st.cur.x, st.cur.y);
    const tool = this.toolOf(st), color = COLORS[st.color];
    g.save();
    if (st.cur.y >= 0) {
      if (tool === 'stamp') {
        g.globalAlpha = 0.45;
        const k = this.stampKinds[st.stamp];
        drawStamp(g, k === 'me' ? 'char:' + st.p.charId : k, x, y, SIZES[st.size].stamp * S, color);
        g.globalAlpha = 1;
      } else if (tool !== 'fill') {
        const r = SIZES[st.size].r * S;
        g.beginPath(); g.arc(x, y, Math.max(4, r), 0, TAU);
        g.lineWidth = 5; g.strokeStyle = '#24163f'; g.stroke();
        g.lineWidth = 3; g.strokeStyle = tool === 'eraser' ? '#ffffff' : color; g.stroke();
      }
    }
    // pointer ring in player color + tool badge
    g.lineWidth = 6; g.strokeStyle = '#24163f';
    g.beginPath(); g.moveTo(x - 16, y); g.lineTo(x - 6, y); g.moveTo(x + 6, y); g.lineTo(x + 16, y); g.moveTo(x, y - 16); g.lineTo(x, y - 6); g.moveTo(x, y + 6); g.lineTo(x, y + 16); g.stroke();
    g.lineWidth = 3; g.strokeStyle = st.p.color; g.stroke();
    const bx = x + 30, by = y - 30;
    g.beginPath(); g.arc(bx, by, 22, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 4; g.strokeStyle = st.p.color; g.stroke();
    if (tool === 'stamp') { const k = this.stampKinds[st.stamp]; drawStamp(g, k === 'me' ? 'char:' + st.p.charId : k, bx, by, 32, color); }
    else drawToolIcon(g, tool, bx, by, 30, color);
    ui.text(g, st.p.tag, bx, by - 34, { size: 20, color: st.p.color, strokeWidth: 4 });
    // palette strip
    if (st.paletteT > 0) {
      const a = Math.min(1, st.paletteT / 0.3);
      g.globalAlpha = a;
      if (tool === 'stamp') {
        const n = this.stampKinds.length, s = 44, w = n * (s + 6) + 16;
        const px = clamp(x - w / 2, 10, W - w - 10), py = clamp(y + 40, 130, H - 70);
        ui.panel(g, px, py, w, s + 16, { r: 18, fill: '#fff', lineWidth: 4, shadow: false });
        this.stampKinds.forEach((k, i) => {
          const cx = px + 8 + i * (s + 6) + s / 2, cy = py + 8 + s / 2;
          if (i === st.stamp) { g.beginPath(); g.arc(cx, cy, s * 0.56, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); }
          drawStamp(g, k === 'me' ? 'char:' + st.p.charId : k, cx, cy, s * 0.82, color);
        });
      } else {
        const n = COLORS.length, s = 34, w = n * (s + 6) + 16;
        const px = clamp(x - w / 2, 10, W - w - 10), py = clamp(y + 40, 130, H - 70);
        ui.panel(g, px, py, w, s + 16, { r: 18, fill: '#fff', lineWidth: 4, shadow: false });
        COLORS.forEach((c, i) => {
          const cx = px + 8 + i * (s + 6) + s / 2, cy = py + 8 + s / 2, sel = i === st.color;
          g.beginPath(); g.arc(cx, cy, sel ? s * 0.58 : s * 0.42, 0, TAU); g.fillStyle = c; g.fill();
          g.lineWidth = sel ? 5 : 2; g.strokeStyle = '#24163f'; g.stroke();
        });
        ui.text(g, COLOR_NAMES[st.color], px + w / 2, py - 16, { size: 24, color: COLORS[st.color] === '#ffffff' ? '#24163f' : COLORS[st.color], stroke: COLORS[st.color] === '#ffffff' ? false : '#24163f', strokeWidth: 5 });
      }
      g.globalAlpha = 1;
    }
    if (st.confirm) {
      const w = 420, h = 150, px = clamp(x - w / 2, 20, W - w - 20), py = y + 50;
      ui.panel(g, px, py, w, h, { r: 26, fill: '#fff8ec', stroke: st.p.color, lineWidth: 6 });
      ui.text(g, 'All done painting?', px + w / 2, py + 40, { size: 36, color: '#24163f', stroke: false, weight: 800 });
      ui.hints(g, [['a', 'Yes!'], ['b', 'Not yet']], px + w / 2, py + 105, { size: 40, color: '#ff6fb1' });
    }
    g.restore();
  }

  drawPicker(g) {
    const P = this.picker;
    g.save(); g.fillStyle = 'rgba(36,22,63,0.55)'; g.fillRect(0, 0, W, H); g.restore();
    const sc = ease.outBack(Math.min(1, P.t / 0.35));
    g.save(); g.translate(W / 2, H / 2); g.scale(sc, sc); g.translate(-W / 2, -H / 2);
    ui.panel(g, 160, 110, W - 320, 860, { r: 40, fill: '#fff8ec' });
    ui.text(g, P.first ? 'What shall we paint?' : 'Start a new picture?', W / 2, 190, { size: 70, color: '#ff6fb1', weight: 800 });
    const cw = 640, ch = 360, gap = 50;
    PAGES.forEach((pg, i) => {
      const cx = W / 2 + ((i % 2) - 0.5) * (cw + gap), cy = 420 + Math.floor(i / 2) * (ch + 70);
      const sel = i === P.sel;
      const k = sel ? 1.04 + Math.sin(this.t * 6) * 0.015 : 1;
      g.save(); g.translate(cx, cy); g.scale(k, k);
      ui.panel(g, -cw / 2, -ch / 2, cw, ch, { r: 24, fill: '#ffffff', stroke: sel ? '#ffd23f' : '#24163f', lineWidth: sel ? 12 : 5 });
      const pc = pageCanvas(pg.id);
      const iw = cw - 40, ih = iw * (CH / CW);
      if (pc) g.drawImage(pc.canvas, -iw / 2, -ch / 2 + 16, iw, ih * 0.84);
      else {
        g.save(); g.globalAlpha = 0.6;
        for (let s = 0; s < 3; s++) { g.beginPath(); g.moveTo(-200, -60 + s * 40); g.bezierCurveTo(-80, -120 + s * 40, 60, 0 + s * 40, 200, -70 + s * 40); g.lineWidth = 16; g.strokeStyle = RAINBOW[s * 2]; g.lineCap = 'round'; g.stroke(); }
        g.restore();
      }
      ui.text(g, pg.name, 0, ch / 2 - 30, { size: 38, color: sel ? '#ff6fb1' : '#24163f', stroke: sel ? '#24163f' : false, weight: 800 });
      g.restore();
    });
    const who = P.owner.isAI ? 'CPU is choosing...' : `${P.owner.tag} picks!`;
    ui.text(g, who, W / 2, 930, { size: 34, color: P.owner.color, strokeWidth: 6 });
    if (!P.owner.isAI) ui.hints(g, P.first ? [['stick', 'Choose'], ['a', 'Paint!']] : [['stick', 'Choose'], ['a', 'New picture'], ['b', 'Keep painting']], W / 2, 880, { size: 40, color: '#24163f' });
    g.restore();
  }

  drawGallery(g) {
    const t = this.phaseT;
    const bg = art('bg/art-gallery');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#5b2a4e'); gr.addColorStop(0.75, '#8a3f6e'); gr.addColorStop(0.75, '#4a2240'); gr.addColorStop(1, '#3a1a33');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, 810);
      g.fillStyle = '#c99a5a'; g.fillRect(0, 800, W, 14);
      g.fillStyle = '#d9a86a'; g.fillRect(0, 880, W, H - 880);
      g.strokeStyle = 'rgba(120,70,30,0.35)'; g.lineWidth = 3;
      for (let x = -100; x < W; x += 140) { g.beginPath(); g.moveTo(x, 880); g.lineTo(x + 120, H); g.stroke(); }
      // lamps + light cones
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const lx of [W / 2 - 360, W / 2, W / 2 + 360]) {
        const lg = g.createLinearGradient(0, 40, 0, 760);
        lg.addColorStop(0, 'rgba(255,240,200,0.28)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(lx - 30, 40); g.lineTo(lx + 30, 40); g.lineTo(lx + 300, 760); g.lineTo(lx - 300, 760); g.closePath(); g.fill();
      }
      g.restore();
      for (const lx of [W / 2 - 360, W / 2, W / 2 + 360]) { g.fillStyle = '#2a1a33'; ui.roundRect(g, lx - 50, 18, 100, 28, 12); g.fill(); g.fillStyle = '#fff3c4'; g.fillRect(lx - 40, 42, 80, 6); }
      // velvet rope
      g.strokeStyle = '#c2185b'; g.lineWidth = 12;
      g.beginPath(); g.moveTo(160, 860); g.quadraticCurveTo(W / 2, 920, W - 160, 860); g.stroke();
      for (const px of [160, W - 160]) { g.fillStyle = '#ffd23f'; g.fillRect(px - 8, 840, 16, 120); g.beginPath(); g.arc(px, 840, 16, 0, TAU); g.fill(); g.strokeStyle = '#24163f'; g.lineWidth = 3; g.stroke(); }
    }
    // the painting in a gold frame
    const pw = 1120, ph = pw * (CH / CW);
    const pop = ease.outBack(Math.min(1, t / 0.6));
    const px = W / 2 - pw / 2, py = 90;
    g.save(); g.translate(W / 2, py + ph / 2); g.scale(pop, pop); g.translate(-W / 2, -(py + ph / 2));
    g.drawImage(this.final, px, py, pw, ph);
    this.drawFrame(g, px, py, pw, ph, 40, '#ffd23f', '#d9a300');
    for (const [cx, cy] of [[px - 20, py - 20], [px + pw + 20, py - 20], [px - 20, py + ph + 20], [px + pw + 20, py + ph + 20]]) { g.save(); g.translate(cx, cy); drawStarShape(g, 40, '#fff3a0'); g.restore(); }
    g.restore();
    // plaque
    if (t > 0.5) {
      const a = Math.min(1, (t - 0.5) / 0.4);
      g.save(); g.globalAlpha = a;
      ui.panel(g, W / 2 - 300, py + ph + 52, 600, 96, { r: 14, fill: '#ffe9a8', lineWidth: 5 });
      ui.text(g, 'Our Masterpiece', W / 2, py + ph + 86, { size: 40, color: '#24163f', stroke: false, weight: 800 });
      const names = this.stations.map((st) => charById(st.p.charId).name).join(', ');
      ui.text(g, 'by ' + names, W / 2, py + ph + 124, { size: 22, color: '#6b5a85', stroke: false, maxWidth: 560 });
      g.restore();
    }
    const order = this.stations.slice().sort((a, b) => a.actor.y - b.actor.y);
    for (const st of order) st.actor.draw(g, { ring: st.p.color });
    if (t > 1.5 && this.players.some((p) => !p.isAI)) {
      ui.hints(g, [['x', 'Save picture'], ['a', 'All done!']], W - 330, 990, { size: 44 });
    }
    if (this.toast) {
      const a = Math.min(1, (2.2 - this.toast.t) / 0.3);
      g.save(); g.globalAlpha = a;
      ui.panel(g, W / 2 - 240, 440, 480, 100, { r: 50, fill: '#36d17a' });
      ui.text(g, this.toast.text, W / 2, 492, { size: 46, weight: 800 });
      g.restore();
    }
  }
}

// --- menu / how-to thumbnail --------------------------------------------------
function drawIcon(g, x, y, w, h, t) {
  g.save();
  const s = Math.min(w / 860, h / 520);
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, '#fff1dc'); gr.addColorStop(1, '#ffd9ec');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  // easel + canvas
  const cx = x + w / 2, cw = 520 * s, ch = 300 * s, top = y + 50 * s;
  g.fillStyle = '#a8703e'; g.strokeStyle = '#24163f'; g.lineWidth = 4 * s;
  for (const [a, b] of [[-150, -230], [150, 230]]) { g.beginPath(); g.moveTo(cx + a * s - 12 * s, top + ch); g.lineTo(cx + a * s + 12 * s, top + ch); g.lineTo(cx + b * s + 12 * s, y + h); g.lineTo(cx + b * s - 12 * s, y + h); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = '#fff'; g.fillRect(cx - cw / 2, top, cw, ch);
  g.save(); g.beginPath(); g.rect(cx - cw / 2, top, cw, ch); g.clip();
  RAINBOW.slice(0, 6).forEach((c, i) => { g.beginPath(); g.arc(cx - 40 * s, top + ch * 0.95, (230 - i * 26) * s, Math.PI, TAU); g.lineWidth = 26 * s; g.strokeStyle = c; g.stroke(); });
  drawStamp(g, 'heart', cx + 170 * s, top + 80 * s, 90 * s, '#ff6fd0', 0.2);
  drawStamp(g, 'star', cx + 120 * s, top + 220 * s, 70 * s, '#ffd23f', -0.2);
  drawStamp(g, 'flower', cx - 190 * s, top + 70 * s, 80 * s, '#9b5cff');
  for (let i = 0; i < 18; i++) { const a = i * 2.4, r = (8 + i * 4) * s; g.fillStyle = i % 3 ? '#ffe066' : '#fff'; g.beginPath(); g.arc(cx + 30 * s + Math.cos(a) * r, top + 120 * s + Math.sin(a) * r, 4 * s, 0, TAU); g.fill(); }
  g.restore();
  g.lineWidth = 18 * s; g.strokeStyle = '#c98a4b'; g.strokeRect(cx - cw / 2 - 9 * s, top - 9 * s, cw + 18 * s, ch + 18 * s);
  g.lineWidth = 4 * s; g.strokeStyle = '#24163f'; g.strokeRect(cx - cw / 2 - 18 * s, top - 18 * s, cw + 36 * s, ch + 36 * s);
  // brush painting
  const bx = cx + 200 * s + Math.sin(t * 3) * 30 * s, by = top + ch * 0.55 + Math.cos(t * 3) * 20 * s;
  drawToolIcon(g, 'brush', bx, by, 120 * s, '#3fa7ff');
  drawPortrait(g, 'unicorn', x + 90 * s, y + h - 100 * s, 70 * s, { ring: '#ff6fd0', ringWidth: 6 * s, expr: 'happy' });
  drawPortrait(g, 'felicity', x + w - 90 * s, y + h - 100 * s, 70 * s, { ring: '#3fa7ff', ringWidth: 6 * s, expr: 'happy' });
  for (let i = 0; i < 4; i++) { const k = (t * 0.8 + i * 0.25) % 1; g.save(); g.globalAlpha = Math.sin(k * Math.PI); g.translate(x + w * (0.15 + i * 0.23), y + h * (0.2 + (i % 2) * 0.1)); drawSparkleShape(g, 40 * s, '#fff6a8'); g.restore(); }
  g.restore();
}
