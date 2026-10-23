// Drawing for Pet Spa (pet-spa): the spa stations, tools, pets' mud/suds/bows overlay,
// cursors and the parade. Game (pet-spa.js) extends SpaView, so these are its methods.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { clamp, lerp, ease, TAU } from '../../engine/util.js';
import { drawHeartShape, drawStarShape, drawSparkleShape } from '../../engine/emotes.js';
import { SPRAY_LEN, TOOLS, ACCESSORIES } from './data.js';

export const NAVY = '#24163f';
const TOOL_ART = { sponge: 'prop/sponge', shower: 'prop/shower-head', towel: 'prop/towel', brush: 'prop/brush', treat: 'prop/pet-treat' };

const BOW_ART = {
  '#ff6fb1': 'prop/pet-bow-pink', '#7fd3ff': 'prop/pet-bow-blue', '#ffd23f': 'prop/pet-bow-yellow',
  '#ff4d4d': 'prop/pet-bow-red', '#36d17a': 'prop/pet-bow-green', '#b36bff': 'prop/pet-bow-purple',
  '#ff8c3a': 'prop/pet-bow-orange', '#25d0c8': 'prop/pet-bow-teal',
};

export function drawAccessory(g, kind, color, s, t = 0) {
  if (kind === 'bow' && BOW_ART[color] && drawArt(g, BOW_ART[color], 0, 0, s * 1.55, s * 1.15)) return;
  g.save();
  g.lineWidth = Math.max(2, s * 0.09); g.strokeStyle = NAVY; g.lineJoin = 'round';
  switch (kind) {
    case 'bow': {
      g.fillStyle = color;
      for (const side of [-1, 1]) {
        g.beginPath(); g.moveTo(0, 0);
        g.bezierCurveTo(side * s * 0.5, -s * 0.55, side * s * 0.75, -s * 0.1, side * s * 0.62, s * 0.18);
        g.bezierCurveTo(side * s * 0.45, s * 0.35, side * s * 0.2, s * 0.1, 0, 0);
        g.fill(); g.stroke();
        g.beginPath(); g.moveTo(side * s * 0.05, s * 0.06); g.lineTo(side * s * 0.28, s * 0.55); g.lineTo(side * s * 0.12, s * 0.48); g.closePath(); g.fill(); g.stroke();
      }
      g.beginPath(); g.arc(0, 0, s * 0.15, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.38, -s * 0.12, s * 0.1, s * 0.05, -0.6, 0, TAU); g.fill();
      break;
    }
    case 'flower': {
      g.fillStyle = color;
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 - Math.PI / 2;
        g.beginPath(); g.ellipse(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3, s * 0.24, s * 0.17, a, 0, TAU); g.fill(); g.stroke();
      }
      g.fillStyle = '#ff9f1c'; g.beginPath(); g.arc(0, 0, s * 0.16, 0, TAU); g.fill(); g.stroke();
      break;
    }
    case 'star': g.rotate(Math.sin(t * 3) * 0.1); drawStarShape(g, s * 1.1, color); break;
    case 'heart': drawHeartShape(g, s * 0.95, color); break;
    case 'crown': {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(-s * 0.5, s * 0.2); g.lineTo(-s * 0.55, -s * 0.3); g.lineTo(-s * 0.25, -s * 0.05); g.lineTo(0, -s * 0.45);
      g.lineTo(s * 0.25, -s * 0.05); g.lineTo(s * 0.55, -s * 0.3); g.lineTo(s * 0.5, s * 0.2); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, s * 0.03, s * 0.09, 0, TAU); g.fill();
      g.fillStyle = '#7fd3ff'; g.beginPath(); g.arc(-s * 0.3, s * 0.07, s * 0.06, 0, TAU); g.arc(s * 0.3, s * 0.07, s * 0.06, 0, TAU); g.fill();
      break;
    }
    case 'gem': {
      g.fillStyle = color;
      g.beginPath(); g.moveTo(0, -s * 0.42); g.lineTo(s * 0.36, -s * 0.1); g.lineTo(0, s * 0.42); g.lineTo(-s * 0.36, -s * 0.1); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.moveTo(0, -s * 0.36); g.lineTo(s * 0.14, -s * 0.1); g.lineTo(-s * 0.14, -s * 0.1); g.closePath(); g.fill();
      break;
    }
    default: break;
  }
  g.restore();
}

/** Procedural tool icons (cursor + toolbar). */
export function drawTool(g, id, x, y, s, t = 0, o = {}) {
  if (TOOL_ART[id] && drawArt(g, TOOL_ART[id], x, y, s * 1.1, s * 1.1)) return;
  g.save(); g.translate(x, y);
  g.lineWidth = Math.max(2, s * 0.07); g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
  switch (id) {
    case 'sponge': {
      g.rotate(-0.15);
      g.fillStyle = '#ffe04d'; ui.roundRect(g, -s * 0.48, -s * 0.32, s * 0.96, s * 0.64, s * 0.16); g.fill(); g.stroke();
      g.fillStyle = '#7fe0a8'; ui.roundRect(g, -s * 0.48, s * 0.12, s * 0.96, s * 0.2, s * 0.08); g.fill(); g.stroke();
      g.fillStyle = '#e8b820';
      for (const [hx, hy, r] of [[-0.25, -0.12, 0.07], [0.05, -0.18, 0.05], [0.25, -0.06, 0.08], [-0.05, 0.0, 0.05]]) { g.beginPath(); g.arc(hx * s, hy * s, r * s, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.strokeStyle = '#8fd6ff'; g.lineWidth = Math.max(1.5, s * 0.03);
      for (const [bx, by, r] of [[-0.32, -0.42, 0.1], [-0.1, -0.5, 0.07], [0.3, -0.45, 0.12]]) { g.beginPath(); g.arc(bx * s, by * s, r * s, 0, TAU); g.fill(); g.stroke(); }
      break;
    }
    case 'shower': {
      g.rotate(0.35);
      g.fillStyle = '#c9d6e8'; ui.roundRect(g, -s * 0.07, -s * 0.05, s * 0.14, s * 0.62, s * 0.06); g.fill(); g.stroke();
      g.fillStyle = '#e8f1ff'; g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.36, s * 0.22, 0, Math.PI, TAU); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#9fb3d1'; g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.36, s * 0.07, 0, 0, TAU); g.fill(); g.stroke();
      g.rotate(-0.35);
      if (o.on !== false) {
        g.fillStyle = '#5cc8ff';
        for (let i = 0; i < 4; i++) {
          const p = ((t * 2.5) + i / 4) % 1;
          g.globalAlpha = 1 - p;
          g.beginPath(); g.ellipse(-s * 0.25 + i * s * 0.14, s * 0.05 + p * s * 0.45, s * 0.04, s * 0.08, 0, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
      }
      break;
    }
    case 'towel': {
      g.rotate(-0.1);
      g.fillStyle = '#ff9ecf'; ui.roundRect(g, -s * 0.45, -s * 0.35, s * 0.9, s * 0.7, s * 0.14); g.fill(); g.stroke();
      g.fillStyle = '#ffffff';
      g.fillRect(-s * 0.45 + 3, -s * 0.13, s * 0.9 - 6, s * 0.08); g.fillRect(-s * 0.45 + 3, s * 0.08, s * 0.9 - 6, s * 0.08);
      g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = Math.max(1, s * 0.03);
      g.beginPath(); g.moveTo(-s * 0.3, -s * 0.35); g.quadraticCurveTo(-s * 0.2, 0, -s * 0.3, s * 0.35); g.stroke();
      break;
    }
    case 'brush': {
      g.rotate(-0.6);
      g.fillStyle = '#c98a4f'; ui.roundRect(g, -s * 0.08, 0, s * 0.16, s * 0.55, s * 0.07); g.fill(); g.stroke();
      g.fillStyle = '#ff7ac6'; g.beginPath(); g.ellipse(0, -s * 0.14, s * 0.24, s * 0.3, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc((i - 1) * s * 0.11, -s * 0.26 + j * s * 0.12, s * 0.035, 0, TAU); g.fill(); }
      break;
    }
    case 'bow': drawAccessory(g, o.acc ? o.acc.kind : 'bow', o.acc ? o.acc.color : '#ff6fb1', s * 0.95, t); break;
    case 'treat': {
      // heart cookie with pink frosting
      g.save(); g.scale(1.05, 1.05);
      drawHeartShape(g, s * 0.95, '#e0a060');
      g.restore();
      g.save(); g.scale(0.78, 0.78); drawHeartShape(g, s * 0.95, '#ff9ecf'); g.restore();
      for (const [sx, sy, c] of [[-0.12, -0.12, '#7fd3ff'], [0.1, -0.15, '#ffd23f'], [0.0, 0.02, '#36d17a']]) {
        g.fillStyle = c; g.fillRect(sx * s - 2, sy * s - 5, 4, 10);
      }
      break;
    }
    default: break;
  }
  g.restore();
}

// Pre-rendered foam clumps (3 variants) so dozens of suds stay cheap.
const foamCache = [];
function foamSprite(i) {
  if (!foamCache[i]) {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d');
    g.translate(48, 48);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#a9dcff'; g.lineWidth = 3;
    const ph = i * 2.1;
    const blobs = [0, 1, 2, 3].map((j) => { const a = ph + j * 1.7; return [Math.cos(a) * 16, Math.sin(a) * 12, 17 + ((j * 7 + i * 3) % 3) * 4]; });
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#ffffff'; for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r - 2, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(190,230,255,0.6)'; g.beginPath(); g.arc(10, 8, 6, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#a9dcff'; g.lineWidth = 2;
    g.beginPath(); g.arc(-8, -10, 5, 0, TAU); g.stroke();
    foamCache[i] = c;
  }
  return foamCache[i];
}

export function drawDuck(g, x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (drawArt(g, 'prop/rubber-duck', 0, 0, s * 1.2, s * 1.2)) { g.restore(); return; }
  g.lineWidth = Math.max(2, s * 0.08); g.strokeStyle = NAVY;
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.ellipse(0, s * 0.12, s * 0.48, s * 0.3, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(s * 0.2, -s * 0.22, s * 0.24, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.ellipse(s * 0.46, -s * 0.18, s * 0.14, s * 0.07, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(s * 0.26, -s * 0.27, s * 0.04, 0, TAU); g.fill();
  g.restore();
}

export class SpaView {
  renderMud(s) {
    s.mudDirty = false;
    const c = s.mudCanvas, g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    for (const b of s.mud) {
      if (b.amt <= 0.01) continue;
      const k = 0.45 + 0.55 * b.amt;
      g.save();
      g.translate(b.x, b.y); g.rotate(b.rot);
      g.globalAlpha = Math.min(1, 0.25 + b.amt * 0.85);
      g.fillStyle = '#76492a';
      g.beginPath();
      const n = b.shape.length;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU, rr = b.r * k * b.shape[i % n];
        const a2 = ((i + 0.5) / n) * TAU, rr2 = b.r * k * (b.shape[i % n] + b.shape[(i + 1) % n]) * 0.42;
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else g.quadraticCurveTo(Math.cos(a2 - TAU / n) * rr2 * 1.25, Math.sin(a2 - TAU / n) * rr2 * 1.25, Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.fill();
      // splatter dots
      for (const [dx, dy, rr] of b.dots) { g.beginPath(); g.arc(dx * b.r * k, dy * b.r * k, rr * b.r * k, 0, TAU); g.fill(); }
      // darker core + shine
      g.fillStyle = '#5e3a1e'; g.beginPath(); g.ellipse(b.r * 0.15 * k, b.r * 0.15 * k, b.r * 0.55 * k, b.r * 0.45 * k, 0.4, 0, TAU); g.fill();
      g.globalAlpha *= 0.35; g.fillStyle = '#d9a873';
      g.beginPath(); g.ellipse(-b.r * 0.3 * k, -b.r * 0.35 * k, b.r * 0.28 * k, b.r * 0.12 * k, -0.5, 0, TAU); g.fill();
      g.restore();
    }
    if (s.mask.img) {
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(s.mask.img, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  /** Attachment callback: draws in the pet's forward space; we convert to image space. */
  drawPetOverlay(g, info, s) {
    const m = s.mask;
    const pxs = info.h / m.ih;
    const flip = s.pet.leader.facing === -1 ? -1 : 1;
    g.save();
    g.scale(flip * pxs, pxs);
    g.translate(-m.iw / 2, -m.ih);
    // mud
    if (s.mud.some((b) => b.amt > 0.01)) g.drawImage(s.mudCanvas, 0, 0, m.iw, m.ih);
    // wet sheen
    if (s.wet > 0.05) {
      g.save(); g.globalAlpha = Math.min(0.9, s.wet);
      for (let i = 0; i < 9; i++) {
        const pt = m.pts[(i * 977 + 31) % m.pts.length];
        const r = m.ih * 0.018;
        g.fillStyle = 'rgba(160,225,255,0.85)'; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = r * 0.25;
        g.beginPath(); g.ellipse(pt[0], pt[1], r * 0.7, r, 0, 0, TAU); g.fill(); g.stroke();
      }
      g.restore();
    }
    // suds (foam clumps from cached sprites; they gently breathe)
    const tt = this.t;
    const base = g.globalAlpha;
    const foamArt = art('prop/bubbles');
    for (const u of s.suds) {
      // Every clump that still counts stays clearly visible (it shrinks, but
      // never below 3/4 size or 60% opacity) so nothing hides on the pet.
      const k = Math.max(0.75, Math.min(1, u.amt)) * (1 + 0.06 * Math.sin(tt * 3 + u.ph));
      g.globalAlpha = base * Math.max(0.6, Math.min(1, u.amt * 1.6));
      const r = u.r * k * 1.25;
      const v = Math.floor(u.ph * 10) % 3;
      if (foamArt) {
        // generated foam cluster (203x180); mirror every other clump for variety
        const fw = r * 2.3, fh = fw * foamArt.height / foamArt.width;
        if (v === 1) { g.save(); g.translate(u.x, u.y); g.scale(-1, 1); g.drawImage(foamArt, -fw / 2, -fh / 2, fw, fh); g.restore(); }
        else g.drawImage(foamArt, u.x - fw / 2, u.y - fh / 2, fw, fh);
      } else g.drawImage(foamSprite(v), u.x - r, u.y - r, r * 2, r * 2);
    }
    g.globalAlpha = base;
    // brushed shine glints
    if (s.fluff > 0.3 && !s.wet) {
      for (let i = 0; i < 4; i++) {
        const p = (tt * 0.7 + i * 0.25) % 1;
        const pt = m.pts[(i * 1543 + 97 + Math.floor(tt * 0.7 + i * 0.25) * 211) % m.pts.length];
        g.save(); g.translate(pt[0], pt[1]); g.globalAlpha = Math.sin(p * Math.PI) * s.fluff;
        g.scale(m.ih / 320, m.ih / 320);
        drawSparkleShape(g, 22, '#ffffff');
        g.restore();
      }
    }
    // accessories (constant size relative to the pet)
    for (const a of s.acc) {
      a.t += 1 / 60;
      let pop = a.t < 0.25 ? ease.outBack(a.t / 0.25) : 1;
      const held = a === s.held, hover = a === s.hover;
      if (held) pop *= 1.18 + Math.sin(tt * 8) * 0.04;
      g.save(); g.translate(a.x, a.y); g.scale(flip, 1); g.rotate(a.rot + (held ? Math.sin(tt * 6) * 0.12 : 0));
      if (hover || held) {
        // soft glow so it's clear which bow the hand is on
        g.save(); g.globalAlpha = 0.55 + Math.sin(tt * 6) * 0.2; g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(0, 0, m.ih * 0.1 * pop, 0, TAU); g.fill(); g.restore();
      }
      g.scale(pop, pop);
      drawAccessory(g, a.kind, a.color, m.ih * 0.13, tt + a.x);
      g.restore();
    }
    g.restore();
  }

  drawBackground(g) {
    const bg = art('bg/pet-spa');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#c8f5ea'); gr.addColorStop(0.55, '#e7f7ff'); gr.addColorStop(1, '#ffd9ef');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3;
    for (let x = 0; x <= W; x += 96) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += 96) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // scalloped awning
    g.fillStyle = '#ff9ecf';
    g.fillRect(0, 0, W, 54);
    for (let x = 0; x < W + 60; x += 80) {
      g.fillStyle = (x / 80) % 2 ? '#ffffff' : '#ff9ecf';
      g.beginPath(); g.arc(x + 40, 54, 40, 0, Math.PI); g.fill();
    }
    g.fillStyle = '#ffffff'; for (let x = 0; x < W; x += 160) g.fillRect(x + 80, 0, 80, 54);
    g.restore();
    for (const b of this.bubbles) {
      g.save(); g.globalAlpha = 0.55;
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.strokeStyle = '#ffffff'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.2, 0, TAU); g.fill();
      g.restore();
    }
  }

  drawHeader(g) {
    ui.panel(g, W / 2 - 360, 16, 720, 76, { r: 38, fill: '#ffffff' });
    ui.text(g, 'Pet Spa', W / 2 - 230, 55, { size: 50, color: '#ff6fb1' });
    ui.glyph(g, 'lb', W / 2 - 84, 54, 34); ui.glyph(g, 'rb', W / 2 - 32, 54, 34); ui.glyph(g, 'dpad', W / 2 + 14, 54, 34);
    ui.text(g, 'Tools', W / 2 + 40, 55, { size: 30, color: NAVY, align: 'left', stroke: false });
    ui.glyph(g, 'x', W / 2 + 160, 54, 36);
    ui.text(g, 'Next step', W / 2 + 184, 55, { size: 30, color: NAVY, align: 'left', stroke: false });
  }

  drawDecor(g, s) {
    const r = s.r, k = s.k;
    const top = r.y + s.headerH + 16;
    const avail = s.ped.y - s.pet.height - top - 10;
    if (avail < 120) return;
    const ww = Math.min(r.w * 0.5, 300), wh = Math.min(avail * 0.85, 240);
    const wx = r.x + r.w * 0.5 - ww / 2, wy = top + 6;
    g.save();
    // arched window with sky and clouds
    g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, TAU); g.lineTo(wx + ww, wy + wh); g.closePath();
    const sky = g.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#e8f7ff');
    g.fillStyle = sky; g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    g.save(); g.clip();
    ui.cloud(g, wx + ww * 0.3 + Math.sin(this.t * 0.3 + s.i) * 20, wy + wh * 0.55, ww / 420, '#ffffff', 0.95);
    g.fillStyle = '#ffe066'; g.beginPath(); g.arc(wx + ww * 0.75, wy + ww * 0.3, ww * 0.1, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = '#ffffff'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(wx + ww / 2, wy + 4); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh * 0.6); g.lineTo(wx + ww, wy + wh * 0.6); g.stroke();
    // shelf with bottles and a duck
    const sy = wy + wh + 26 * k, sx0 = r.x + 30, sx1 = r.x + r.w - 30;
    if (sy + 10 < s.ped.y - s.pet.height) {
      g.fillStyle = '#e6b98a'; ui.roundRect(g, sx0, sy, sx1 - sx0, 12 * k, 5); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      const cols = ['#ff9ecf', '#7fd3ff', '#b78bff', '#7fe0a8'];
      const sh = art('prop/shampoo');
      if (sh) {
        // shampoo pump bottles (128x131, ~8% empty at the left)
        for (let i = 0; i < 3; i++) drawArt(g, 'prop/shampoo', sx0 + (40 + i * 46) * k, sy + 2 * k, (56 - (i % 2) * 10) * k, (56 - (i % 2) * 10) * k, { anchor: 'bottom' });
      } else for (let i = 0; i < 4; i++) {
        const bx = sx0 + 24 * k + i * 34 * k, bh = (40 + (i % 2) * 14) * k;
        g.fillStyle = cols[i]; ui.roundRect(g, bx, sy - bh, 26 * k, bh, 8 * k); g.fill(); g.stroke();
        g.fillStyle = '#ffffff'; g.fillRect(bx + 6 * k, sy - bh * 0.6, 14 * k, bh * 0.3);
      }
      drawDuck(g, sx1 - 40 * k, sy - 18 * k, 36 * k, Math.sin(this.t * 2 + s.i) * 0.1);
    }
    g.restore();
  }

  /**
   * Clawfoot tub the pet stands in (bathtub = back, bathtub-front = overlay,
   * both 454x300 and aligned). The front rim (y~95 of 300) sits just above
   * the pet's paws so only ~8% of the pet is covered and no mud is hidden.
   * Returns null (keep the rug) when the art is missing or the tub won't fit.
   */
  tubRect(s) {
    const back = art('prop/bathtub'), front = art('prop/bathtub-front');
    if (!back || !front) return null;
    const r = s.r, pet = s.pet;
    const rimY = s.ped.y - pet.height * 0.08;
    const maxTh = (r.y + r.h - s.toolH - 6 - rimY) / ((276 - 95) / 300);
    const tw = Math.min(Math.max(pet.width * 1.2, 220 * s.k), r.w * 0.86, maxTh * 454 / 300);
    if (tw < pet.width * 0.95) return null;
    const th = tw * 300 / 454;
    return { x: s.ped.x - tw / 2, y: rimY - th * 95 / 300, w: tw, h: th, back, front };
  }

  drawTub(g, s, which) {
    const t = s.tub;
    if (!t) return;
    g.drawImage(which === 'front' ? t.front : t.back, t.x, t.y, t.w, t.h);
  }

  drawStation(g, s) {
    const r = s.r, p = s.p, k = s.k;
    // card
    ui.panel(g, r.x, r.y, r.w, r.h, { r: 30, fill: 'rgba(255,255,255,0.82)', stroke: p.color, lineWidth: 7 });
    g.save();
    ui.roundRect(g, r.x + 8, r.y + 8, r.w - 16, r.h - 16, 24); g.clip();
    // back wall tile + mirror arch
    g.fillStyle = 'rgba(255,214,236,0.55)'; g.fillRect(r.x, r.y + s.headerH, r.w, r.h);
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
    const tile = 46 * k;
    for (let x = r.x; x < r.x + r.w; x += tile) { g.beginPath(); g.moveTo(x, r.y + s.headerH); g.lineTo(x, r.y + r.h); g.stroke(); }
    for (let y = r.y + s.headerH; y < r.y + r.h; y += tile) { g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke(); }
    // floor
    g.fillStyle = '#bfeee0'; g.fillRect(r.x, s.ped.y - 6 * k, r.w, r.h);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = r.x; x < r.x + r.w; x += 60 * k) g.fillRect(x, s.ped.y - 6 * k, 30 * k, r.h);
    g.restore();
    // pedestal: fluffy round rug (or the clawfoot tub when its art exists)
    s.tub = this.tubRect(s);
    if (!s.tub) {
      const pw = Math.max(s.pet.width * 0.62, 110 * k), ph = pw * 0.24;
      g.save();
      g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath();
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * TAU, rr = 1 + (i % 2) * 0.06;
        g.lineTo(s.ped.x + Math.cos(a) * pw * rr, s.ped.y + Math.sin(a) * ph * rr);
      }
      g.fill(); g.stroke();
      g.fillStyle = s.done ? '#ffd23f' : '#ff9ecf';
      g.beginPath(); g.ellipse(s.ped.x, s.ped.y, pw * 0.8, ph * 0.72, 0, 0, TAU); g.fill();
      g.restore();
    }
    // header: tag + pet name + happiness meter
    const hy = r.y + 14;
    g.save();
    g.fillStyle = p.color; ui.roundRect(g, r.x + 16, hy, 70, 36, 16); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    ui.text(g, p.tag, r.x + 51, hy + 18, { size: 24, strokeWidth: 5, shadow: false });
    g.restore();
    ui.text(g, s.def.name, r.x + r.w / 2 + 30, hy + 18, { size: s.compact ? 30 : 36, color: '#ffffff', maxWidth: r.w - 200 });
    const by = r.y + (s.compact ? 50 : 60), bx = r.x + 62, bw = r.w - 92, bh = s.compact ? 18 : 24;
    const full = s.done;
    ui.bar(g, bx, by, bw, bh, s.happy, full ? '#ffd23f' : '#ff6fb1', { bg: 'rgba(36,22,63,0.15)', lineWidth: 3 });
    g.save(); g.translate(r.x + 38, by + bh / 2);
    const beat = 1 + Math.sin(this.t * (full ? 8 : 4)) * 0.08;
    g.scale(beat, beat); drawHeartShape(g, s.compact ? 34 : 42, full ? '#ff2f7a' : '#ff6fb1');
    g.restore();

    this.drawDecor(g, s);
    // player's character watching (behind the pet when overlapping)
    if (!s.tub) s.char.draw(g, { ring: p.color });
    // pet (with shake), standing in the tub when there is one
    const pet = s.pet;
    this.drawTub(g, s, 'back');
    pet.draw(g);
    if (s.tub) { this.drawTub(g, s, 'front'); s.char.draw(g, { ring: p.color }); }

    // toolbar
    const ty = r.y + r.h - s.toolH + 4, th = s.toolH - 16;
    const n = TOOLS.length;
    const slot = Math.min(th, (r.w - 40) / n - 8);
    const tw = n * (slot + 8) - 8;
    const tx0 = r.x + (r.w - tw) / 2;
    g.save();
    ui.roundRect(g, tx0 - 10, ty - 4, tw + 20, th + 8, 18); g.fillStyle = 'rgba(36,22,63,0.18)'; g.fill();
    const suggest = this.nextTool(s);
    TOOLS.forEach((tl, i) => {
      const x = tx0 + i * (slot + 8), sel = i === s.tool;
      const lift = sel ? 6 + s.toolPop * 8 : 0;
      ui.roundRect(g, x, ty - lift, slot, th, 14);
      g.fillStyle = sel ? p.color : '#ffffff'; g.fill();
      g.lineWidth = sel ? 4 : 2.5; g.strokeStyle = NAVY; g.stroke();
      drawTool(g, tl.id, x + slot / 2, ty - lift + th / 2, slot * 0.72, this.t, { on: false, acc: ACCESSORIES[s.accIdx % ACCESSORIES.length] });
      if (this.stepDone(s, tl.id)) {
        const cx = x + slot - 6, cy = ty - lift + 6, rr = Math.max(9, slot * 0.17);
        g.fillStyle = '#36d17a'; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - rr * 0.45, cy); g.lineTo(cx - rr * 0.1, cy + rr * 0.4); g.lineTo(cx + rr * 0.5, cy - rr * 0.4); g.stroke();
      }
      if (sel && tl.id === 'bow' && p.ctrl.kind === 'pad') {
        // d-pad up / down steps through the bows
        const ax = x + 2, ay = ty - lift + th / 2, aw = Math.max(7, slot * 0.13), bob = s.accPop * 4;
        g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 2.5;
        for (const d of [-1, 1]) {
          const yy = ay + d * (th * 0.5 + 4 + bob);
          g.beginPath(); g.moveTo(ax - aw, yy - d * aw * 0.5); g.lineTo(ax + aw, yy - d * aw * 0.5); g.lineTo(ax, yy + d * aw * 0.7); g.closePath(); g.fill(); g.stroke();
        }
      }
      if (suggest === tl.id && !sel) {
        const bob = Math.abs(Math.sin(this.t * 5)) * 6;
        ui.glyph(g, 'x', x + slot / 2, ty - 18 - bob, Math.min(30, slot * 0.5));
      }
    });
    g.restore();
    // tool name above selected
    if (!s.compact || s.toolPop > 0) {
      const x = tx0 + s.tool * (slot + 8) + slot / 2;
      ui.text(g, TOOLS[s.tool].name, x, ty - 28 - s.toolPop * 8, { size: 26, color: '#ffffff', alpha: s.compact ? s.toolPop : 1 });
    }
  }

  drawCursor(g, s) {
    const c = s.cursor, p = s.p, k = s.k;
    const tool = TOOLS[s.tool].id;
    const size = 74 * k;
    const using = s.using && this.phase === 'spa';
    g.save();
    g.translate(c.x, c.y);
    // hotspot ring
    g.strokeStyle = p.color; g.lineWidth = 4; g.globalAlpha = 0.9;
    g.beginPath(); g.arc(0, 0, 14 * k + (using ? Math.sin(this.t * 20) * 3 : 0), 0, TAU); g.stroke();
    g.globalAlpha = 1;
    let rot = 0, ox = 0, oy = 0;
    if (using) {
      if (tool === 'sponge' || tool === 'towel') { ox = Math.sin(this.t * 22) * 8; oy = Math.cos(this.t * 18) * 5; rot = Math.sin(this.t * 22) * 0.2; }
      if (tool === 'brush') { oy = Math.sin(this.t * 24) * 9; }
    }
    if (using && tool === 'shower') {
      // spray as long as the rinse reaches (SPRAY_LEN), fading as it falls
      const L = (SPRAY_LEN / 74) * size;
      const grd = g.createLinearGradient(0, -size * 0.2, 0, L);
      grd.addColorStop(0, 'rgba(143,224,255,0.75)'); grd.addColorStop(1, 'rgba(143,224,255,0)');
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(-size * 0.28, -size * 0.25); g.lineTo(size * 0.28, -size * 0.25); g.lineTo(size * 0.9, L); g.lineTo(-size * 0.9, L); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const xx = (i - 2.5) * size * 0.12, ph = (this.t * 2.2 + i * 0.37) % 1;
        g.beginPath(); g.moveTo(xx * (1 + ph * 2), -size * 0.1 + ph * L * 0.9); g.lineTo(xx * (1 + ph * 2) * 1.05, ph * L * 0.9 + size * 0.14); g.stroke();
      }
    }
    g.translate(ox, oy); g.rotate(rot);
    const pop = 1 + Math.max(s.toolPop, s.accPop) * 0.25;
    g.scale(pop, pop);
    // While moving or pointing at a placed bow, the hand shows just its ring.
    const bowMode = tool === 'bow' && this.phase === 'spa' && (s.held || s.hover);
    if (!bowMode) drawTool(g, tool, 0, tool === 'shower' ? -size * 0.25 : 0, size, this.t, { on: using, acc: ACCESSORIES[s.accIdx % ACCESSORIES.length] });
    g.restore();
    ui.playerTag(g, p, c.x + 34 * k, c.y - 40 * k);
    if (bowMode) {
      // small hint under the hand: [A] Move / Drop   [B] Take off
      const gs = Math.round(26 * Math.max(0.8, k)), fs = gs * 0.8;
      const items = [['a', s.held ? 'Drop' : 'Move'], ['b', 'Take off']];
      const widths = items.map(([, t]) => gs * 1.1 + ui.measure(g, t, fs, 700) + 14);
      let x = c.x - (widths.reduce((a, b) => a + b, 0) - 14) / 2;
      const y = c.y + 44 * k;
      g.save(); g.fillStyle = 'rgba(36,22,63,0.55)';
      ui.roundRect(g, x - 10, y - gs * 0.7, widths.reduce((a, b) => a + b, 0) + 6, gs * 1.4, gs * 0.7); g.fill(); g.restore();
      items.forEach(([b, t], i) => {
        ui.glyph(g, b, x + gs / 2, y, gs);
        ui.text(g, t, x + gs * 1.05, y + 1, { size: fs, align: 'left', color: '#ffffff', strokeWidth: 4 });
        x += widths[i];
      });
    }
  }

  drawFlying(g) {
    for (const f of this.flying) {
      const p = Math.min(1, f.t / f.dur);
      const x = lerp(f.from.x, f.to.x, p), y = lerp(f.from.y, f.to.y, p) - Math.sin(p * Math.PI) * f.arc;
      if (f.kind === 'treat') drawTool(g, 'treat', x, y, f.s, this.t);
      else drawDuck(g, x, y, f.s, p * TAU);
    }
  }

  drawParade(g) {
    const t = this.phaseT;
    // stage backdrop
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#3b1d6e'); gr.addColorStop(1, '#7b3fb0');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // twinkle lights
    for (let i = 0; i < 40; i++) {
      const x = (i * 197) % W, y = 40 + ((i * 89) % 260);
      g.save(); g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
      g.translate(x, y); drawSparkleShape(g, 18, i % 3 ? '#fff6a8' : '#ffc8f0'); g.restore();
    }
    // spotlights
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const sx = W * (0.15 + i * 0.23), sw = Math.sin(t * 0.9 + i * 1.3) * 260;
      g.globalAlpha = 0.12;
      g.fillStyle = ['#ff9ecf', '#fff6a8', '#9fe8ff', '#c9a6ff'][i];
      g.beginPath(); g.moveTo(sx - 30, -20); g.lineTo(sx + 30, -20); g.lineTo(sx + sw + 240, 820); g.lineTo(sx + sw - 240, 820); g.closePath(); g.fill();
    }
    g.restore();
    // stage
    g.fillStyle = '#ffb3d9'; g.fillRect(0, 760, W, 40);
    g.fillStyle = '#d98ab8'; g.fillRect(0, 800, W, 50);
    const aud = g.createLinearGradient(0, 850, 0, H);
    aud.addColorStop(0, '#3a1f66'); aud.addColorStop(1, '#1f1040');
    g.fillStyle = aud; g.fillRect(0, 850, W, H - 850);
    // crowd silhouettes behind the players' characters
    g.fillStyle = 'rgba(20,8,45,0.75)';
    for (let i = 0; i < 26; i++) {
      const x = (i + 0.5) * (W / 26), bob = Math.abs(Math.sin(t * 4 + i)) * 8;
      g.beginPath(); g.arc(x, 905 - bob, 30, 0, TAU); g.fill();
      g.fillRect(x - 38, 925 - bob, 76, 60);
    }
    g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 760); g.lineTo(W, 760); g.moveTo(0, 800); g.lineTo(W, 800); g.stroke();
    for (let x = 30; x < W; x += 120) {
      g.fillStyle = (Math.floor(t * 4) + x / 120) % 2 < 1 ? '#ffd23f' : '#ffffff';
      g.beginPath(); g.arc(x, 825, 9, 0, TAU); g.fill();
    }
    // curtains
    for (const side of [-1, 1]) {
      const open = ease.outCubic(clamp(t / 1.2, 0, 1));
      const cw = lerp(W / 2, 170, open);
      g.save();
      g.fillStyle = '#e8364a';
      const x0 = side < 0 ? 0 : W - cw;
      g.fillRect(x0, 0, cw, 850);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      for (let x = x0 + 20; x < x0 + cw; x += 60) g.fillRect(x, 0, 18, 850);
      g.restore();
    }
    g.fillStyle = '#e8364a'; g.fillRect(0, 0, W, 70);
    for (let x = 0; x < W; x += 80) { g.beginPath(); g.arc(x + 40, 70, 40, 0, Math.PI); g.fill(); }
    // pets
    const order = this.stations.slice().sort((a, b) => a.pet.y - b.pet.y);
    for (const s of order) {
      if (s.arrived) {
        g.save(); g.globalAlpha = 0.35; g.fillStyle = '#fff6a8';
        g.beginPath(); g.ellipse(s.pet.x, s.pet.y + 4, s.pet.width * 0.5, 22, 0, 0, TAU); g.fill(); g.restore();
      }
      s.pet.draw(g);
    }
    // audience: the players' characters cheering
    for (const s of this.stations) { s.char.draw(g, { ring: s.p.color }); }
    this.stations.forEach((s) => { if (s.arrived) ui.text(g, s.def.name, s.pet.x, 780, { size: 28, color: '#fff', maxWidth: 200 }); });
  }

  draw(g) {
    if (this.phase === 'parade') {
      this.drawParade(g);
    } else {
      this.drawBackground(g);
      this.drawHeader(g);
      for (const s of this.stations) this.drawStation(g, s);
      this.drawFlying(g);
      for (const s of this.stations) this.drawCursor(g, s);
    }
  }

  /** Screen-space overlay (drawn above the camera view). */
  drawHUD(g) {
    if (this.banner) ui.banner(g, this.banner.text, this.banner.t, { size: 120, y: this.phase === 'parade' ? 190 : H / 2 - 40, color: '#ff8fd0' });
    if (this.phase === 'spa' && this.stations.every((s) => s.done)) {
      ui.banner(g, 'Everyone is happy!', this.allDoneT, { size: 100, y: H / 2, color: '#ffd23f' });
    }
  }
}
