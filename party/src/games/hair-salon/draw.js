// Hair Salon drawing: the salon and stage backdrops, stations, picker, cursors, mirror,
// HUD and the photo-wall showcase. Game (hair-salon.js) extends SalonDrawing, so these
// methods see the same `this` as the logic; only cached backdrop canvases live here.
import { W, H } from '../../engine/canvas.js';
import { drawPortrait } from '../../engine/sprites.js';
import * as ui from '../../engine/ui.js';
import { particles } from '../../engine/particles.js';
import { drawArt } from '../../engine/art.js';
import { clamp, lerp, rand, chance, ease, TAU } from '../../engine/util.js';
import { drawStarShape, drawHeartShape } from '../../engine/emotes.js';
import { photoPoseHints } from '../../engine/photo-poses.js';
import { playerName } from '../../state.js';
import { CLIENTS, clientPortrait } from './client.js';
import { HAIR_COLORS, STYLES } from './hair.js';
import { TOOLS, BLING, drawTool, drawBling, swatch, drawStyleIcon, drawMirrorFrame } from './props.js';

const NAVY = '#24163f';
export const REVEAL_T = 5.2;          // mirror reveal
export const CHEESE_T = 6.5;          // "Say cheese!" posing time

export const OPTIONS = {
  colour: { list: HAIR_COLORS, label: 'Colour' },
  style: { list: STYLES, label: 'Style' },
  bling: { list: BLING, label: 'Bling' },
};
export const STAR_KEYS = ['tidy', 'cut', 'colour', 'shape', 'bling'];
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

function drawPortraitSafe(g, p, x, y, r) {
  try { drawPortrait(g, p, x, y, r, { ring: '#ffffff' }); } catch (e) { /* portrait art missing */ }
}

export class SalonDrawing {
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
