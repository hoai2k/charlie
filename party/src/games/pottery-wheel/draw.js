// Pottery Wheel drawing: the studio, wheel, kiln, cursors, station UI and the gallery
// showcase. Game (pottery-wheel.js) extends PotteryDrawing, so these methods see the
// same `this` as the logic; no state lives here.
import { W, H } from '../../engine/canvas.js';
import { drawPortrait } from '../../engine/sprites.js';
import * as ui from '../../engine/ui.js';
import { RAINBOW } from '../../engine/particles.js';
import { art, drawArt } from '../../engine/art.js';
import { clamp, lerp, ease, TAU } from '../../engine/util.js';
import { photoPoseHints } from '../../engine/photo-poses.js';
import { drawDoneTab, drawDoneCard } from '../../engine/studio-ui.js';
import { NAVY, KY, N, PAINTS, STICKERS, HMAX, radiusAt, maxRadius, potName, surfaceAt, drawPot, drawSticker, mix } from './pot.js';

export const TOOLS = [
  { id: 'glaze', name: 'Glaze dip', verb: 'Dip!' },
  { id: 'band', name: 'Stripe', verb: 'Stripe!' },
  { id: 'brush', name: 'Brush', verb: 'Paint' },
  { id: 'dots', name: 'Dots', verb: 'Dot!' },
  { id: 'sticker', name: 'Stickers', verb: 'Stick!' },
];
const STEPS = [['shape', 'Shape'], ['fire', 'Bake'], ['paint', 'Paint']];
export const CHEESE_TIME = 4.5;

export class PotteryDrawing {
  // ======================================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'show') { this.drawShow(g); return; }
    this.drawStudioBack(g);
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawStudioBack(g) {
    const bg = art('bg/pottery-wheel');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#fbe9d7'); gr.addColorStop(1, '#f3d2b8');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // whitewashed bricks
      g.strokeStyle = 'rgba(190,140,110,0.25)'; g.lineWidth = 3;
      for (let y = 0, row = 0; y < H; y += 44, row++) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
        for (let x = (row % 2) * 60; x < W; x += 120) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 44); g.stroke(); }
      }
    }
    // title
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -330, -40, 660, 80, { r: 40, fill: '#e98a5c' });
    ui.text(g, 'Pottery Wheel', 0, 2, { size: 52, weight: 800 });
    g.restore();
    this.drawMiniPot(g, W / 2 - 390, 66, 0.9, '#4fb8ff');
    this.drawMiniPot(g, W / 2 + 390, 66, 0.9, '#ff7ac6');
  }

  drawMiniPot(g, x, y, s, c) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
    g.fillStyle = c;
    g.beginPath(); g.moveTo(-12, -34); g.quadraticCurveTo(-34, 0, -18, 26); g.lineTo(18, 26); g.quadraticCurveTo(34, 0, 12, -34); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(-28, -2, 56, 8); g.strokeRect(-28, -2, 56, 0);
    g.beginPath(); g.ellipse(0, -34, 14, 5, 0, 0, TAU); g.fillStyle = mix(c, NAVY, 0.4); g.fill(); g.stroke();
    g.restore();
  }

  drawStation(g, st) {
    const { r, L, p } = st, k = L.k;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26); g.clip();
    const bg = art('bg/pottery-wheel-station');
    if (bg) g.drawImage(bg, r.x, r.y, r.w, r.h);
    else this.drawStationWall(g, st);
    this.drawFloor(g, st);
    const pot = st.pot, b = L.base;
    if (st.step === 'fire') this.drawKilnScene(g, st);
    else {
      this.drawWheel(g, b.x, L.floorY, k, st.phi, st.step === 'shape' ? 1 : 0.4);
      st.actor.draw(g, { ring: p.color });
      if (st.step !== 'shape' && !st.ready && TOOLS[st.tool]?.id === 'glaze') this.drawGlazeGuide(g, st, true);
      const bump = st.potBump;
      const sx = 1 + Math.sin(bump * 30) * bump * 0.25;
      g.save(); g.translate(b.x, b.y); g.scale(sx, 2 - sx); g.translate(-b.x, -b.y);
      drawPot(g, pot, { x: b.x, y: b.y, k, phi: st.phi, wet: !pot.fired, t: this.t, still: st.step === 'shape' });
      g.restore();
      if (st.step === 'paint' && !st.ready) {
        if (TOOLS[st.tool]?.id === 'glaze') this.drawGlazeGuide(g, st, false);
        if (TOOLS[st.tool]?.id === 'band') this.drawBandGuide(g, st);
        if (st.hover) this.drawHover(g, st);
      }
    }
    if (st.step === 'fire') { /* actor drawn inside the kiln scene */ }
    if (st.step === 'shape' && !st.confirm) this.drawShapeCursor(g, st);
    if (st.step === 'paint' && !st.confirm && TOOLS[st.tool]) this.drawPaintCursor(g, st);
    g.restore();
    g.save(); ui.roundRect(g, r.x, r.y, r.w, r.h, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke(); g.restore();
    this.drawSteps(g, st);
    this.drawSide(g, st);
    this.drawStationHints(g, st);
    if (st.confirm) this.drawConfirm(g, st);
    if (st.ready) this.drawReady(g, st);
    if (st.hint && !st.confirm && !st.ready) this.drawHelp(g, st, st.hint.text);
    else if (st.step === 'shape' && !st.p.isAI && st.shapeT < 1.5 && st.helpT > 1) this.drawHelp(g, st);
  }

  drawStationWall(g, st) {
    const { r, L, p } = st;
    g.fillStyle = mix(p.color, '#fff8ef', 0.84); g.fillRect(r.x, r.y, r.w, r.h);
    // tile strip
    const ty = L.floorY - L.ca.h * 0.36;
    g.fillStyle = mix(p.color, '#ffffff', 0.62); g.fillRect(r.x, ty, r.w, L.floorY - ty);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3;
    const tile = clamp(L.ca.h * 0.07, 22, 52);
    for (let x = r.x; x < r.x + r.w; x += tile) { g.beginPath(); g.moveTo(x, ty); g.lineTo(x, L.floorY); g.stroke(); }
    for (let y = ty; y < L.floorY; y += tile) { g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke(); }
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(r.x, ty); g.lineTo(r.x + r.w, ty); g.stroke();
    // a little shelf with tiny pots, high on the left
    const k = L.k;
    const sx = L.ca.x + 24, sy = L.ca.y + L.ca.h * 0.2, sw = Math.min(L.ca.w * 0.32, 300 * k + 60);
    g.fillStyle = '#d99a6c'; ui.roundRect(g, sx, sy, sw, 12 * k + 6, 4); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    const cols = ['#ff9fd0', '#7fd3ff', '#ffd23f'];
    for (let i = 0; i < 3; i++) {
      const x = sx + sw * (0.2 + i * 0.3), s = clamp(k * 0.8, 0.35, 1.1);
      g.save(); g.translate(x, sy); g.scale(s, s);
      g.fillStyle = cols[(i + st.i) % 3]; g.lineWidth = 3; g.strokeStyle = NAVY;
      g.beginPath();
      if (i === 0) { g.moveTo(-10, -44); g.quadraticCurveTo(-30, -20, -14, 0); g.lineTo(14, 0); g.quadraticCurveTo(30, -20, 10, -44); }
      else if (i === 1) { g.moveTo(-26, -24); g.quadraticCurveTo(-22, 0, 0, 0); g.quadraticCurveTo(22, 0, 26, -24); }
      else { g.moveTo(-14, -34); g.lineTo(-16, 0); g.lineTo(16, 0); g.lineTo(14, -34); }
      g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    // pegboard of clay tools (upper right of the work area)
    const px = L.ca.x + L.ca.w * 0.72, py = L.ca.y + 14, pw = L.ca.w * 0.25, ph = L.ca.h * 0.2;
    if (pw > 60) {
      g.fillStyle = '#f1d6a8'; ui.roundRect(g, px, py, pw, ph, 8); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      g.fillStyle = 'rgba(36,22,63,0.2)';
      for (let x = px + 12; x < px + pw - 6; x += 18) for (let y = py + 12; y < py + ph - 6; y += 18) { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
      const u = ph / 100;
      g.lineWidth = 3; g.strokeStyle = NAVY;
      g.fillStyle = '#e8b878'; ui.roundRect(g, px + pw * 0.15, py + 20 * u, 12 * u, 60 * u, 6 * u); g.fill(); g.stroke();
      g.fillStyle = '#ffd23f'; ui.roundRect(g, px + pw * 0.38, py + 30 * u, 34 * u, 26 * u, 8 * u); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(px + pw * 0.72, py + 18 * u); g.lineTo(px + pw * 0.72, py + 82 * u); g.moveTo(px + pw * 0.86, py + 18 * u); g.lineTo(px + pw * 0.86, py + 82 * u); g.stroke();
      g.beginPath(); g.moveTo(px + pw * 0.72, py + 50 * u); g.quadraticCurveTo(px + pw * 0.79, py + 60 * u, px + pw * 0.86, py + 50 * u); g.strokeStyle = '#9aa0b8'; g.stroke();
    }
  }

  drawFloor(g, st) {
    const { r, L } = st;
    const fy = L.floorY - 24 * L.k;
    g.fillStyle = '#e2a874'; g.fillRect(r.x, fy, r.w, r.y + r.h - fy);
    g.strokeStyle = 'rgba(120,70,40,0.25)'; g.lineWidth = 2;
    const ph = clamp(26 * L.k, 12, 30);
    for (let y = fy + ph, row = 0; y < r.y + r.h; y += ph, row++) {
      g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke();
      for (let x = r.x + (row % 2) * 70; x < r.x + r.w; x += 140) { g.beginPath(); g.moveTo(x, y - ph); g.lineTo(x, y); g.stroke(); }
    }
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(r.x, fy); g.lineTo(r.x + r.w, fy); g.stroke();
  }

  /** The potter's wheel, feet on the floor at fy; its head is centred 140 units up. */
  drawWheel(g, x, fy, k, phi, spin) {
    if (drawArt(g, 'prop/pottery-wheel', x, fy, 520 * k, 260 * k, { anchor: 'bottom' })) { this.drawWheelStreaks(g, x, fy - 140.5 * k, k, phi, spin, 150, 18); return; }
    const hy = fy - 140 * k;
    g.save(); g.lineJoin = 'round'; g.lineWidth = Math.max(2.5, 4 * k); g.strokeStyle = NAVY;
    // pedal and cord
    g.fillStyle = '#b8bfd8'; ui.roundRect(g, x + 200 * k, fy - 22 * k, 60 * k, 20 * k, 6 * k); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x + 150 * k, fy - 40 * k); g.quadraticCurveTo(x + 190 * k, fy - 4 * k, x + 205 * k, fy - 14 * k); g.stroke();
    // body
    g.fillStyle = '#7fdcc0';
    g.beginPath(); g.moveTo(x - 120 * k, hy + 26 * k); g.lineTo(x + 120 * k, hy + 26 * k); g.lineTo(x + 150 * k, fy - 10 * k); g.quadraticCurveTo(x, fy + 4 * k, x - 150 * k, fy - 10 * k); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, x - 100 * k, hy + 40 * k, 30 * k, 70 * k, 12 * k); g.fill();
    // splash pan
    g.fillStyle = '#5cc4a6'; g.beginPath(); g.ellipse(x, hy + 22 * k, 232 * k, 54 * k, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#3f9e86'; g.beginPath(); g.ellipse(x, hy + 14 * k, 210 * k, 44 * k, 0, 0, TAU); g.fill();
    // head
    g.fillStyle = '#8f9cc4'; g.beginPath(); g.ellipse(x, hy + 10 * k, 190 * k, 42 * k, 0, 0, Math.PI); g.lineTo(x - 190 * k, hy); g.fill(); g.stroke();
    g.fillStyle = '#b7c2e6'; g.beginPath(); g.ellipse(x, hy, 190 * k, 42 * k, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
    this.drawWheelStreaks(g, x, hy, k, phi, spin);
  }

  drawWheelStreaks(g, x, hy, k, phi, spin, rx = 160, ry = 34) {
    g.save(); g.lineCap = 'round';
    g.strokeStyle = `rgba(255,255,255,${0.35 + 0.25 * spin})`; g.lineWidth = Math.max(2, 4 * k);
    for (let i = 0; i < 4; i++) {
      const a0 = phi * (spin > 0.5 ? 1 : 1.5) + (i * TAU) / 4;
      g.beginPath(); g.ellipse(x, hy, rx * k, ry * k, 0, a0, a0 + 0.4 + spin * 0.6); g.stroke();
    }
    g.restore();
  }

  // --- the kiln -----------------------------------------------------------------------
  drawKilnScene(g, st) {
    const F = st.fire, L = st.L, pot = st.pot;
    const k = this.kilnK(st);
    const kx = L.base.x, fy = L.floorY;
    const s = k * F.kiln;
    const wob = F.stage === 'ding' ? Math.sin(this.t * 60) * 6 * k * F.shake : 0;
    st.actor.draw(g, { ring: st.p.color });
    // the wheel steps back while the kiln is up
    if (F.kiln < 0.98) { g.save(); g.globalAlpha = 1 - F.kiln; this.drawWheel(g, kx, fy, L.k, st.phi, 0); g.restore(); }
    // pot placement: from the wheel head down onto the kiln floor, shrunk to fit the door
    const kilnArt = !!art('prop/pottery-kiln');
    const fit = Math.min(1, (kilnArt ? 400 : 440) / (2 * maxRadius(pot) + pot.handles * 90), (kilnArt ? 327 : 400) / (pot.h + 20));
    const pk = lerp(L.k, k * fit, F.sink);
    const py = lerp(L.base.y, fy - (kilnArt ? 106 : 80) * k, F.sink);
    const glow = F.stage === 'open' ? F.glow : F.stage === 'out' ? 0 : F.heat * 0.6;
    if (F.kiln > 0.02) {
      g.save(); g.translate(kx + wob, fy); g.scale(F.kiln, F.kiln); g.translate(-kx, -fy);
      this.drawKilnBack(g, kx, fy, k, F);
      g.restore();
    }
    const hot = F.stage === 'open' ? clamp(F.glow, 0, 1) : 0;
    drawPot(g, pot, { x: kx + wob, y: py, k: pk, phi: st.phi, wet: !pot.fired, t: this.t, glow: pot.fired ? hot : F.stage === 'bake' || F.stage === 'ding' ? glow * 0.5 : 0, still: true });
    if (F.kiln > 0.02) {
      g.save(); g.translate(kx + wob, fy); g.scale(F.kiln, F.kiln); g.translate(-kx, -fy);
      this.drawKilnFront(g, kx, fy, k, F);
      g.restore();
    }
    void s;
  }

  /** The kiln (with its chimney) must fit under the step strip. */
  kilnK(st) { return Math.min(st.L.k, (st.L.floorY - st.L.ca.y + 4) / 690); }

  archPath(g, x, fy, k) {
    if (art('prop/pottery-kiln')) {
      // Measured transparent aperture in the authored 1280 x 1240 kiln.
      g.beginPath();
      g.moveTo(x - 217.5 * k, fy - 106 * k);
      g.lineTo(x - 217.5 * k, fy - 280 * k);
      g.ellipse(x, fy - 280 * k, 217.5 * k, 173 * k, 0, Math.PI, 0);
      g.lineTo(x + 217.5 * k, fy - 106 * k);
      g.closePath();
      return;
    }
    g.beginPath();
    g.moveTo(x - 240 * k, fy - 80 * k);
    g.lineTo(x - 240 * k, fy - 268 * k);
    g.arc(x, fy - 268 * k, 240 * k, Math.PI, 0);
    g.lineTo(x + 240 * k, fy - 80 * k);
    g.closePath();
  }

  drawKilnBack(g, x, fy, k, F) {
    this.archPath(g, x, fy, k);
    const gr = g.createRadialGradient(x, fy - 160 * k, 20 * k, x, fy - 260 * k, 320 * k);
    const h = clamp(F.heat, 0, 1);
    gr.addColorStop(0, mix('#5a2a3a', '#ffb347', h)); gr.addColorStop(1, mix('#2a1530', '#c8452a', h));
    g.fillStyle = gr; g.fill();
    // inner floor shelf
    g.fillStyle = mix('#6b4a5a', '#ff9a52', h * 0.6);
    const kilnArt = !!art('prop/pottery-kiln');
    g.fillRect(x - (kilnArt ? 217.5 : 240) * k, fy - (kilnArt ? 122 : 96) * k, (kilnArt ? 435 : 480) * k, 16 * k);
  }

  drawKilnFront(g, x, fy, k, F) {
    const h = clamp(F.heat, 0, 1);
    // warm glow around the kiln
    if (h > 0.05) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gl = g.createRadialGradient(x, fy - 280 * k, 50 * k, x, fy - 280 * k, 420 * k);
      gl.addColorStop(0, `rgba(255,150,60,${0.35 * h})`); gl.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = gl; g.fillRect(x - 450 * k, fy - 720 * k, 900 * k, 760 * k); g.restore();
    }
    const doorsDrawn = () => this.drawKilnDoors(g, x, fy, k, F, h);
    if (drawArt(g, 'prop/pottery-kiln', x, fy, 640 * k, 620 * k, { anchor: 'bottom' })) { doorsDrawn(); this.drawFlames(g, x, fy, k, F, h); return; }
    g.save(); g.lineJoin = 'round';
    // chimney
    g.fillStyle = '#b84c37'; g.lineWidth = Math.max(2.5, 4 * k); g.strokeStyle = NAVY;
    ui.roundRect(g, x + 150 * k, fy - 660 * k, 64 * k, 130 * k, 6 * k); g.fill(); g.stroke();
    g.fillStyle = '#8c3a2c'; ui.roundRect(g, x + 142 * k, fy - 672 * k, 80 * k, 22 * k, 6 * k); g.fill(); g.stroke();
    // dome with the door hole (even-odd)
    g.beginPath();
    g.moveTo(x - 310 * k, fy - 30 * k); g.lineTo(x - 310 * k, fy - 300 * k);
    g.arc(x, fy - 300 * k, 310 * k, Math.PI, 0); g.lineTo(x + 310 * k, fy - 30 * k); g.closePath();
    g.moveTo(x - 240 * k, fy - 80 * k); g.lineTo(x + 240 * k, fy - 80 * k); g.lineTo(x + 240 * k, fy - 268 * k);
    g.arc(x, fy - 268 * k, 240 * k, 0, Math.PI, true); g.closePath();
    const br = g.createLinearGradient(x - 310 * k, 0, x + 310 * k, 0);
    br.addColorStop(0, '#c4553c'); br.addColorStop(0.4, '#ec7a54'); br.addColorStop(1, '#b44a34');
    g.fillStyle = br; g.fill('evenodd');
    // bricks
    g.save(); g.clip('evenodd');
    g.strokeStyle = 'rgba(110,40,30,0.45)'; g.lineWidth = Math.max(1.5, 3 * k);
    const bh = 40 * k;
    for (let y = fy - 30 * k, row = 0; y > fy - 620 * k; y -= bh, row++) {
      g.beginPath(); g.moveTo(x - 320 * k, y); g.lineTo(x + 320 * k, y); g.stroke();
      for (let xx = x - 320 * k + (row % 2) * 40 * k; xx < x + 320 * k; xx += 80 * k) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y - bh); g.stroke(); }
    }
    if (h > 0.05) { g.fillStyle = `rgba(255,170,80,${0.3 * h})`; g.fillRect(x - 320 * k, fy - 640 * k, 640 * k, 640 * k); }
    g.restore();
    g.lineWidth = Math.max(2.5, 5 * k); g.strokeStyle = NAVY; g.stroke();
    // arch trim
    g.lineWidth = 14 * k; g.strokeStyle = '#8c3a2c';
    g.beginPath(); g.moveTo(x - 247 * k, fy - 80 * k); g.lineTo(x - 247 * k, fy - 268 * k); g.arc(x, fy - 268 * k, 247 * k, Math.PI, 0); g.lineTo(x + 247 * k, fy - 80 * k); g.stroke();
    // stone base with the fire grate
    g.fillStyle = '#b9a9cf'; g.lineWidth = Math.max(2.5, 4 * k); g.strokeStyle = NAVY;
    ui.roundRect(g, x - 330 * k, fy - 42 * k, 660 * k, 44 * k, 10 * k); g.fill(); g.stroke();
    g.fillStyle = mix('#2a1530', '#ff7a2a', h * 0.8); ui.roundRect(g, x - 120 * k, fy - 74 * k, 240 * k, 26 * k, 8 * k); g.fill(); g.stroke();
    // vents
    for (const sx of [-1, 1]) { g.fillStyle = mix('#3a2040', '#ffb347', h); g.beginPath(); g.arc(x + sx * 275 * k, fy - 360 * k, 14 * k, 0, TAU); g.fill(); g.stroke(); }
    g.restore();
    doorsDrawn();
    this.drawFlames(g, x, fy, k, F, h);
  }

  drawKilnDoors(g, x, fy, k, F, h) {
    const d = F.doors;
    if (d <= 0.01) return;
    const kilnArt = !!art('prop/pottery-kiln');
    for (const side of [-1, 1]) {
      g.save();
      this.archPath(g, x, fy, k); g.clip();
      const halfWidth = kilnArt ? 217.5 : 240;
      const hx = x + side * halfWidth * k, w = halfWidth * k * d;
      g.translate(hx, 0); g.scale(-side, 1);
      // door leaf from the hinge (0) to w
      // The authored leaf has a slanted bottom. Overscan below the inner floor
      // while keeping its top 453 units up; the arch clip hides the excess.
      if (!drawArt(g, 'prop/pottery-kiln-door', w / 2, fy - (kilnArt ? 59 : 80) * k, w, (kilnArt ? 394 : 520) * k, { anchor: 'bottom', fit: 'stretch' })) {
        g.fillStyle = '#6b4a8f'; g.fillRect(0, fy - 560 * k, w, 480 * k);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(w * 0.1, fy - 540 * k, w * 0.15, 440 * k);
        g.lineWidth = Math.max(2, 4 * k); g.strokeStyle = NAVY; g.strokeRect(0, fy - 560 * k, w, 480 * k);
        g.fillStyle = '#c8b6e8';
        for (const yy of [140, 250, 360]) for (const xx of [0.18, 0.82]) { g.beginPath(); g.arc(w * xx, fy - yy * k, 5 * k, 0, TAU); g.fill(); }
        // porthole
        g.fillStyle = mix('#3a2040', '#ffb347', h); g.beginPath(); g.ellipse(w * 0.55, fy - 400 * k, 34 * k * d, 34 * k, 0, 0, TAU); g.fill(); g.stroke();
        // handle
        g.fillStyle = '#ffd23f'; ui.roundRect(g, w - 26 * k * d, fy - 290 * k, 14 * k * d, 60 * k, 6 * k * d); g.fill(); g.stroke();
      }
      g.restore();
    }
  }

  drawFlames(g, x, fy, k, F, h) {
    const n = 5, inten = clamp(h * 0.8 + F.flare * 0.5, 0.15, 1.3);
    g.save();
    for (let i = 0; i < n; i++) {
      const fx0 = x + (i - (n - 1) / 2) * 42 * k;
      const fh = (30 + 40 * inten) * k * (0.8 + 0.2 * Math.sin(this.t * 14 + i * 1.7));
      const by = fy - 50 * k;
      g.fillStyle = i % 2 ? '#ff9f1c' : '#ffd23f';
      g.beginPath(); g.moveTo(fx0 - 14 * k, by); g.quadraticCurveTo(fx0 - 16 * k, by - fh * 0.6, fx0 + Math.sin(this.t * 9 + i) * 6 * k, by - fh); g.quadraticCurveTo(fx0 + 16 * k, by - fh * 0.6, fx0 + 14 * k, by); g.closePath(); g.fill();
      g.lineWidth = Math.max(1.5, 2.5 * k); g.strokeStyle = '#e8452c'; g.stroke();
    }
    g.restore();
  }

  // --- cursors and guides --------------------------------------------------------------
  drawShapeCursor(g, st) {
    const pot = st.pot, cur = st.cursor, k = st.L.k, c = st.p.ctrl;
    const sc = this.toScreen(st, cur.x, cur.y);
    const side = cur.x >= 0 ? 1 : -1;
    const tx = Math.abs(cur.x), ty = cur.y;
    const u = ty / pot.h;
    const R = radiusAt(pot, u);
    const touching = pot.grabTop || (u >= -0.1 && u <= 1.1 && tx - R < 60);
    // contact dot on the clay wall
    if (touching && !pot.grabTop && u >= 0 && u <= 1) {
      const w = this.toScreen(st, side * R, ty);
      g.save(); g.globalAlpha = 0.55 + 0.3 * Math.sin(this.t * 8);
      g.beginPath(); g.arc(w.x, w.y, 9 * k + 4, 0, TAU); g.fillStyle = st.p.color; g.fill();
      g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); g.restore();
    }
    if (pot.grabTop) {
      const t = this.toScreen(st, 0, pot.h);
      g.save(); g.setLineDash([8, 8]); g.lineWidth = 4; g.strokeStyle = st.p.color;
      g.beginPath(); g.ellipse(t.x, t.y, pot.r[N - 1] * k + 12, pot.r[N - 1] * KY * k + 6, 0, 0, TAU); g.stroke(); g.restore();
    }
    const held = c.held('x'), sponge = c.held('b');
    g.save(); g.translate(sc.x, sc.y);
    g.globalAlpha = touching || held || sponge ? 1 : 0.65;
    const sz = clamp(130 * k, 60, 150);
    if (sponge) {
      if (!drawArt(g, 'prop/pottery-sponge', 0, 0, sz * 0.5, sz * 0.5)) {
        g.rotate(Math.sin(this.t * 20) * 0.15);
        g.fillStyle = '#ffd23f'; ui.roundRect(g, -sz * 0.22, -sz * 0.15, sz * 0.44, sz * 0.3, sz * 0.08); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        g.fillStyle = 'rgba(200,140,20,0.6)';
        for (const [a, b] of [[-0.1, -0.05], [0.08, 0.04], [-0.02, 0.07], [0.12, -0.07]]) { g.beginPath(); g.arc(a * sz, b * sz, sz * 0.025, 0, TAU); g.fill(); }
      }
    } else {
      g.scale(side, 1);
      g.rotate(0.45 + (held ? Math.sin(this.t * 30) * 0.04 : 0));
      if (!drawArt(g, 'prop/pottery-rib', 0, 0, sz * 0.38, sz, { anchor: 'bottom' })) {
        g.lineJoin = 'round';
        g.fillStyle = '#f0c98c'; g.lineWidth = 3; g.strokeStyle = NAVY;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-sz * 0.14, -sz * 0.08, -sz * 0.08, -sz * 0.5); g.lineTo(-sz * 0.05, -sz * 0.95); g.quadraticCurveTo(0, -sz * 1.02, sz * 0.05, -sz * 0.95); g.lineTo(sz * 0.08, -sz * 0.5); g.quadraticCurveTo(sz * 0.14, -sz * 0.08, 0, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-sz * 0.03, -sz * 0.5, sz * 0.02, sz * 0.3, 0, 0, TAU); g.fill();
        g.fillStyle = mix(st.p.color, '#ffffff', 0.2); g.beginPath(); g.arc(0, -sz * 0.85, sz * 0.035, 0, TAU); g.fill(); g.stroke();
      }
    }
    g.restore();
    if (held && touching) {
      // squish lines
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6 + Math.sin(this.t * 20 + i) * 0.1; g.beginPath(); g.moveTo(sc.x + side * Math.cos(a) * 18, sc.y + Math.sin(a) * 18); g.lineTo(sc.x + side * Math.cos(a) * 30, sc.y + Math.sin(a) * 30); g.stroke(); }
      g.restore();
    }
    if (this.humans > 1 || st.p.isAI) ui.text(g, st.p.tag, sc.x, sc.y + 30, { size: 20, color: st.p.color, strokeWidth: 4 });
  }

  drawPaintCursor(g, st) {
    const cur = st.cursor, k = st.L.k, tool = TOOLS[st.tool].id;
    const sc = this.toScreen(st, cur.x, cur.y);
    const sz = clamp(120 * k, 56, 140);
    g.save(); g.translate(sc.x, sc.y);
    if (tool !== 'glaze' && !surfaceAt(st.pot, cur.x, cur.y)) g.globalAlpha = 0.55;   // off the pot
    if (st.held) {
      const it = st.held;
      g.save(); g.scale(k, k);
      if (it.kind) { g.rotate(it.rot || 0); drawSticker(g, it.kind, it.s * 1.1, this.t); }
      else { g.fillStyle = it.c; g.beginPath(); g.arc(0, 0, it.s * 1.1, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
      g.restore();
      g.beginPath(); g.arc(0, 0, 34 * k + 12, 0, TAU); g.lineWidth = 4; g.setLineDash([8, 6]); g.strokeStyle = st.p.color; g.stroke(); g.setLineDash([]);
    } else if (tool === 'sticker') {
      g.globalAlpha = 0.85;
      g.save(); g.scale(k, k); drawSticker(g, STICKERS[st.sticker], 44, this.t); g.restore();
      g.globalAlpha = 1;
      g.beginPath(); g.arc(0, 0, 30 * k + 10, 0, TAU); g.lineWidth = 3; g.strokeStyle = st.p.color; g.stroke();
    } else if (tool === 'glaze') {
      // a glaze jug, tipped
      const s = sz / 100;
      g.scale(s, s); g.rotate(-0.5);
      g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
      g.fillStyle = '#fff8ef'; g.beginPath(); g.moveTo(-22, -10); g.lineTo(-26, -58); g.lineTo(26, -58); g.lineTo(22, -10); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = this.colorFill(g, st.color, -26, 26); g.fillRect(-24, -52, 48, 14);
      g.beginPath(); g.moveTo(-26, -58); g.lineTo(-38, -66); g.lineTo(-22, -54); g.stroke();
      g.beginPath(); g.arc(30, -36, 12, -1.4, 1.4); g.stroke();
      // a drip
      g.fillStyle = PAINTS[st.color].rainbow ? RAINBOW[Math.floor(this.t * 4) % 7] : PAINTS[st.color].c;
      g.beginPath(); g.arc(-38, -58 + ((this.t * 60) % 30), 5, 0, TAU); g.fill();
    } else {
      // brush (also for stripes and dots)
      g.rotate(0.45);
      if (!drawArt(g, 'prop/pottery-brush', 0, 0, sz * 0.36, sz, { anchor: 'bottom' })) {
        g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = NAVY;
        g.fillStyle = '#ff9fd0'; ui.roundRect(g, -sz * 0.05, -sz * 1.0, sz * 0.1, sz * 0.6, sz * 0.05); g.fill(); g.stroke();
        g.fillStyle = '#c9cfe0'; g.fillRect(-sz * 0.06, -sz * 0.44, sz * 0.12, sz * 0.12); g.strokeRect(-sz * 0.06, -sz * 0.44, sz * 0.12, sz * 0.12);
        g.fillStyle = '#fff3d6'; g.beginPath(); g.moveTo(-sz * 0.06, -sz * 0.32); g.quadraticCurveTo(-sz * 0.07, -sz * 0.08, 0, 0); g.quadraticCurveTo(sz * 0.07, -sz * 0.08, sz * 0.06, -sz * 0.32); g.closePath(); g.fill(); g.stroke();
      }
      g.fillStyle = this.colorFill(g, st.color, -10, 10);
      g.beginPath(); g.ellipse(0, -sz * 0.08, sz * 0.055, sz * 0.09, 0, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
    }
    g.restore();
    if (this.humans > 1 || st.p.isAI) ui.text(g, st.p.tag, sc.x, sc.y + 34, { size: 20, color: st.p.color, strokeWidth: 4 });
    // hint bubble over a sticker or dot
    const tip = st.held ? [['x', 'Stick'], ['b', 'Take off']] : st.hover ? (tool === 'sticker' || tool === 'dots' ? [['x', 'Move'], ['b', 'Take off']] : [['b', 'Take off']]) : null;
    if (tip && !st.p.isAI) {
      const L = st.L, fs = clamp(26 * k + 6, 18, 28), gsz = fs * 1.15;
      let w = 14;
      for (const [, l] of tip) w += gsz + 6 + ui.measure(g, l, fs, 800) + 12;
      const bx = clamp(sc.x - w / 2, L.ca.x + 8, L.ca.x + L.ca.w - w - 8);
      const by = Math.max(L.ca.y + 4, sc.y - 60 * k - 40 - gsz * 1.6);
      ui.panel(g, bx, by, w, gsz * 1.6, { r: gsz * 0.8, fill: 'rgba(255,255,255,0.94)', lineWidth: 3, shadow: false });
      let tx = bx + 10;
      for (const [b, l] of tip) {
        ui.glyph(g, b, tx + gsz / 2, by + gsz * 0.8, gsz); tx += gsz + 6;
        ui.text(g, l, tx, by + gsz * 0.8 + 1, { size: fs, color: NAVY, stroke: false, align: 'left', weight: 800 }); tx += ui.measure(g, l, fs, 800) + 12;
      }
    }
  }

  colorFill(g, ci, x0, x1) {
    const p = PAINTS[ci];
    if (!p.rainbow) return p.c;
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
    return gr;
  }

  /** Dashed ring around the pot where a dip would reach (back half before the pot, front half after). */
  drawGlazeGuide(g, st, back) {
    const pot = st.pot, cur = st.cursor, k = st.L.k, b = st.L.base;
    const surf = surfaceAt(pot, cur.x, cur.y);
    let u = surf ? surf.u : clamp(cur.y / pot.h, 0, 0.92);
    if (u < 0.04) u = 0;
    const R = radiusAt(pot, u) + 6;
    const y = b.y - u * pot.h * k;
    g.save(); g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeStyle = PAINTS[st.color].rainbow ? '#ff7ac6' : PAINTS[st.color].c;
    g.beginPath(); g.ellipse(b.x, y, R * k, R * KY * k, 0, back ? Math.PI : 0, back ? TAU : Math.PI); g.stroke();
    if (!back) { g.lineWidth = 2; g.strokeStyle = NAVY; g.globalAlpha = 0.5; g.stroke(); }
    g.restore();
  }

  drawBandGuide(g, st) {
    const pot = st.pot, cur = st.cursor, k = st.L.k, b = st.L.base;
    const surf = surfaceAt(pot, cur.x, cur.y);
    if (!surf) return;
    const R = radiusAt(pot, surf.u);
    g.save(); g.setLineDash([8, 8]); g.lineWidth = 3; g.globalAlpha = 0.7 + 0.3 * Math.sin(this.t * 6);
    g.strokeStyle = PAINTS[st.color].rainbow ? '#ff7ac6' : PAINTS[st.color].c;
    g.beginPath(); g.ellipse(b.x, b.y - surf.u * pot.h * k, R * k, R * KY * k, 0, 0, Math.PI); g.stroke();
    g.restore();
  }

  drawHover(g, st) {
    const it = st.hover, s = this.itemScreen(st, it), k = st.L.k;
    const rr = (it.kind ? it.s * 0.6 : it.s) * k + 10;
    g.save(); g.globalAlpha = 0.6 + 0.3 * Math.sin(this.t * 8);
    g.beginPath(); g.arc(s.x, s.y, rr, 0, TAU); g.lineWidth = 4; g.setLineDash([8, 6]); g.strokeStyle = st.p.color; g.stroke();
    g.restore();
  }

  // --- station UI -------------------------------------------------------------------------
  drawSteps(g, st) {
    const { r, L } = st;
    const y = r.y + 10, h = L.tabH - 8;
    const actW = clamp(r.w * 0.34, 130, 300);
    const pillsW = r.w - actW - 40;
    const pw = pillsW / 3;
    const cur = st.step === 'ready' ? 3 : STEPS.findIndex(([id]) => id === st.step);
    STEPS.forEach(([id, name], i) => {
      const sel = i === cur, done = i < cur;
      const bx = r.x + 14 + i * pw + 3, bw = pw - 6;
      const kk = sel ? 1 + st.listBump * 0.5 : 1;
      g.save(); g.translate(bx + bw / 2, y + h / 2); g.scale(kk, kk);
      ui.panel(g, -bw / 2, -h / 2 + (sel ? 0 : 4), bw, h - (sel ? 0 : 8), { r: 14, fill: sel ? '#ffffff' : done ? mix(st.p.color, '#ffffff', 0.35) : mix(st.p.color, '#ffffff', 0.65), lineWidth: sel ? 4 : 3, shadow: sel });
      const fs = clamp(h * 0.42, 15, 30);
      ui.text(g, `${i + 1} ${name}`, 0, 1, { size: fs, color: sel ? NAVY : '#fff', stroke: sel ? false : NAVY, strokeWidth: 4, weight: 800, maxWidth: bw - 24 });
      if (done) { g.beginPath(); g.arc(bw / 2 - 9, -h / 2 + 10, 7, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
      g.restore();
    });
    // the "next step" button
    let label = null;
    const onDone = st.step === 'paint' && st.tool === TOOLS.length;
    // shaping: Y bakes · painting: Y is Done (A readies on the Done tool itself)
    if (st.step === 'shape') label = 'Bake it!';
    else if (st.step === 'paint') label = onDone ? "I'm ready!" : 'Done!';
    if (label) {
      const bx = r.x + r.w - actW - 14, bw = actW;
      const ready = st.step === 'shape' ? st.shapeT > 3 : onDone || st.history.length > 2;
      const pk = ready ? 1 + Math.sin(this.t * 5) * 0.04 : 1;
      g.save(); g.translate(bx + bw / 2, y + h / 2); g.scale(pk, pk);
      ui.panel(g, -bw / 2, -h / 2, bw, h, { r: h / 2, fill: st.step === 'shape' ? '#ff9f5a' : '#36d17a', lineWidth: 4, shadow: false });
      const gs = h * 0.72;
      ui.glyph(g, onDone ? 'a' : 'y', -bw / 2 + gs * 0.75, 0, gs);
      ui.text(g, label, gs * 0.6, 1, { size: clamp(h * 0.46, 15, 32), weight: 800, maxWidth: bw - gs * 1.6 - 10 });
      g.restore();
    }
  }

  drawSide(g, st) {
    const lr = st.L.list;
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.88)', lineWidth: 4, shadow: false });
    if (st.ready) return;
    if (st.step === 'shape') this.drawShapeSide(g, st, lr);
    else if (st.step === 'fire') this.drawFireSide(g, st, lr);
    else this.drawPaintSide(g, st, lr);
  }

  drawShapeSide(g, st, lr) {
    const cx = lr.x + lr.w / 2;
    const fs = clamp(lr.w * 0.1, 15, 30);
    ui.text(g, "It's a...", cx, lr.y + fs * 1.1, { size: fs, color: NAVY, stroke: false, weight: 700 });
    const nb = 1 + st.nameBump * 0.8;
    g.save(); g.translate(cx, lr.y + fs * 2.6); g.scale(nb, nb); g.rotate(-0.04);
    ui.text(g, `${st.name}!`, 0, 0, { size: clamp(lr.w * 0.17, 22, 54), color: st.p.color, strokeWidth: 6, weight: 800, maxWidth: lr.w - 16 });
    g.restore();
    // silhouette of the pot
    const pot = st.pot, sy = lr.y + fs * 3.8, sh = lr.h * 0.3;
    const s = Math.min(sh / (HMAX + 20), (lr.w * 0.8) / 380);
    g.save(); g.translate(cx, sy + sh);
    g.fillStyle = mix(st.p.color, '#ffffff', 0.6); g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-pot.r[0] * s, 0);
    for (let i = 0; i < N; i++) g.lineTo(-pot.r[i] * s, -(i / (N - 1)) * pot.h * s);
    for (let i = N - 1; i >= 0; i--) g.lineTo(pot.r[i] * s, -(i / (N - 1)) * pot.h * s);
    g.closePath(); g.fill(); g.stroke();
    g.restore();
    // option rows
    const rows = [[st.p.ctrl.kind === 'pad' ? 'dpad' : 'rt', `Handles: ${st.pot.handles}`], ['y', 'Bake'], ['b', 'Smooth']];
    const rh = clamp((lr.y + lr.h - (sy + sh + 16)) / 3.2, 26, 60);
    let y = sy + sh + 14 + rh / 2;
    const gs = rh * 0.7, lfs = clamp(rh * 0.42, 14, 26);
    for (const [b, l] of rows) {
      ui.panel(g, lr.x + 8, y - rh / 2 + 2, lr.w - 16, rh - 4, { r: rh / 2, fill: '#ffffff', lineWidth: 2, stroke: 'rgba(36,22,63,0.25)', shadow: false });
      ui.glyph(g, b, lr.x + 14 + gs / 2, y, gs);
      ui.text(g, l, lr.x + 22 + gs, y + 1, { size: lfs, color: NAVY, stroke: false, align: 'left', weight: 800, maxWidth: lr.w - gs - 36 });
      y += rh;
    }
  }

  drawFireSide(g, st, lr) {
    const F = st.fire, cx = lr.x + lr.w / 2;
    const fs = clamp(lr.w * 0.12, 16, 36);
    const title = F.stage === 'open' || F.stage === 'out' ? 'Ta-da!' : F.stage === 'ding' ? 'Ding!' : 'Baking...';
    ui.text(g, title, cx, lr.y + fs * 1.1, { size: fs, color: '#ff7a2a', strokeWidth: 5, weight: 800, maxWidth: lr.w - 16 });
    // thermometer
    const tw = clamp(lr.w * 0.18, 22, 56), th = lr.h * 0.52;
    const tx = cx - tw / 2, ty = lr.y + fs * 2.1;
    g.save(); g.lineWidth = 4; g.strokeStyle = NAVY;
    ui.roundRect(g, tx, ty, tw, th, tw / 2); g.fillStyle = '#fff'; g.fill(); g.stroke();
    const fh = (th - tw * 0.5) * clamp(F.heat, 0, 1);
    const gr = g.createLinearGradient(0, ty + th, 0, ty);
    gr.addColorStop(0, '#ffd23f'); gr.addColorStop(0.6, '#ff9f1c'); gr.addColorStop(1, '#ff4d5e');
    ui.roundRect(g, tx + 5, ty + th - fh - 5, tw - 10, fh, (tw - 10) / 2); g.fillStyle = gr; if (fh > 2) g.fill();
    g.beginPath(); g.arc(cx, ty + th + tw * 0.3, tw * 0.75, 0, TAU); g.fillStyle = F.heat > 0.02 ? '#ff7a2a' : '#ffd23f'; g.fill(); g.stroke();
    g.restore();
    if (F.stage === 'bake' && !st.p.isAI) {
      const gy = ty + th + tw * 1.6 + 30;
      ui.glyph(g, 'a', cx, Math.min(gy, lr.y + lr.h - 70), clamp(lr.w * 0.2, 34, 70), { pulse: true });
      ui.text(g, 'Mash!', cx, Math.min(gy, lr.y + lr.h - 70) + clamp(lr.w * 0.2, 34, 70) * 0.75, { size: clamp(lr.w * 0.1, 15, 30), color: NAVY, stroke: false, weight: 800 });
    } else if (F.stage === 'open' || F.stage === 'out') {
      ui.text(g, st.pot.clay?.name || '', cx, lr.y + lr.h - 40, { size: clamp(lr.w * 0.09, 14, 28), color: NAVY, stroke: false, weight: 800, maxWidth: lr.w - 16 });
    }
  }

  drawPaintSide(g, st, lr) {
    const headH = clamp(lr.h * 0.08, 22, 44);
    const toolsH = lr.h * 0.56;
    if (st.tool === TOOLS.length) {   // Done (the last tool): "All done? (A) I'm ready!"
      drawDoneCard(g, lr, st.p.color, { title: 'Pot done?', back: st.p.ctrl.kind === 'kb' ? 'LT to change something' : 'D-pad \u25b2 to change something' });
      return;
    }
    const tool = TOOLS[st.tool].id;
    ui.text(g, st.p.ctrl.kind === 'kb' ? 'Tools' : 'Tools \u25b2\u25bc', lr.x + lr.w / 2, lr.y + headH * 0.6, { size: headH * 0.66, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 16 });
    const rh = (toolsH - headH) / (TOOLS.length + 1);
    const named = lr.w >= 150;
    TOOLS.forEach((T, i) => {
      const sel = i === st.tool, y = lr.y + headH + 4 + i * rh;
      const bump = sel ? st.listBump * 0.6 : 0;
      g.save(); g.translate(lr.x + lr.w / 2, y + rh / 2); g.scale(1 + bump, 1 + bump);
      const bw = lr.w - 16, bh = rh - 5;
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 12, fill: sel ? '#ffd23f' : '#ffffff', lineWidth: sel ? 4 : 2, stroke: sel ? NAVY : 'rgba(36,22,63,0.25)', shadow: false });
      const isz = Math.min(bh * 0.9, named ? bh : bw * 0.7);
      const ix = named ? -bw / 2 + isz / 2 + 6 : 0;
      this.toolIcon(g, T.id, ix, 0, isz, st);
      if (named) ui.text(g, T.name, ix + isz / 2 + 6, 1, { size: clamp(bh * 0.36, 13, 28), color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: bw - isz - 18 });
      g.restore();
    });
    drawDoneTab(g, lr.x + 8, lr.y + headH + 4 + TOOLS.length * rh, lr.w - 16, rh - 5, { label: false });   // the last tool: Done
    // palette / sticker grid
    const py = lr.y + toolsH + 6, ph = lr.h - toolsH - 12;
    const items = tool === 'sticker' ? STICKERS.length : PAINTS.length;
    const cols = lr.w > 200 ? 4 : 3, rowsN = Math.ceil(items / cols);
    const cw = (lr.w - 16) / cols, chh = Math.min(cw, ph / rowsN);
    for (let i = 0; i < items; i++) {
      const cx = lr.x + 8 + (i % cols + 0.5) * cw, cy = py + (Math.floor(i / cols) + 0.5) * chh;
      const sel = tool === 'sticker' ? i === st.sticker : i === st.color;
      const rr = Math.min(cw, chh) * 0.36 * (sel ? 1.12 + st.listBump : 1);
      if (sel) { g.beginPath(); g.arc(cx, cy, rr + 7, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
      if (tool === 'sticker') { g.save(); g.translate(cx, cy); drawSticker(g, STICKERS[i], rr * 2, this.t); g.restore(); }
      else {
        g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fillStyle = this.colorFill(g, i, cx - rr, cx + rr); g.fill();
        g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(cx - rr * 0.3, cy - rr * 0.3, rr * 0.25, 0, TAU); g.fill();
        if (PAINTS[i].shine) { g.save(); g.translate(cx + rr * 0.4, cy - rr * 0.5); g.fillStyle = '#fff'; g.beginPath(); for (let j = 0; j < 8; j++) { const a = (j * Math.PI) / 4, q = j % 2 ? rr * 0.1 : rr * 0.32; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); g.restore(); }
      }
    }
  }

  toolIcon(g, id, x, y, sz, st) {
    g.save(); g.translate(x, y); const s = sz / 50; g.scale(s, s);
    g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
    const col = PAINTS[st.color].rainbow ? '#ff7ac6' : PAINTS[st.color].c;
    switch (id) {
      case 'glaze':
        g.fillStyle = '#fff8ef'; g.beginPath(); g.moveTo(-14, -16); g.lineTo(14, -16); g.lineTo(11, 16); g.lineTo(-11, 16); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = col; g.beginPath(); g.moveTo(-13, -8); g.lineTo(13, -8); g.lineTo(11, 16); g.lineTo(-11, 16); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.arc(-6, -8, 3, 0, Math.PI); g.arc(4, -8, 4, 0, Math.PI); g.fill();
        break;
      case 'band':
        g.fillStyle = '#e3895a'; g.beginPath(); g.moveTo(-10, -18); g.quadraticCurveTo(-22, 0, -12, 18); g.lineTo(12, 18); g.quadraticCurveTo(22, 0, 10, -18); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = col; g.fillRect(-17, -4, 34, 8); g.strokeRect(-17, -4, 34, 8);
        break;
      case 'brush':
        g.rotate(0.6); g.fillStyle = '#ff9fd0'; ui.roundRect(g, -3, -22, 6, 26, 3); g.fill(); g.stroke();
        g.fillStyle = col; g.beginPath(); g.moveTo(-5, 4); g.quadraticCurveTo(0, 22, 5, 4); g.closePath(); g.fill(); g.stroke();
        break;
      case 'dots':
        g.fillStyle = col; for (const [a, b] of [[-10, -8], [8, -10], [0, 4], [-12, 12], [12, 12]]) { g.beginPath(); g.arc(a, b, 5, 0, TAU); g.fill(); g.stroke(); }
        break;
      case 'sticker': drawSticker(g, STICKERS[st.sticker], 36, this.t); break;
      default: break;
    }
    g.restore();
  }

  drawStationHints(g, st) {
    const { r, L, p } = st;
    const y = r.y + r.h - L.hintH / 2 - 8;
    const sz = clamp(L.hintH * 0.72, 26, 42);
    const wide = r.w > 700;
    let x = r.x + 16;
    const tw = clamp(sz * 2, 56, 84);
    ui.panel(g, x, y - sz * 0.5, tw, sz, { r: sz / 2, fill: p.color, lineWidth: 3, shadow: false });
    ui.text(g, p.tag, x + tw / 2, y + 1, { size: sz * 0.55, strokeWidth: 4, shadow: false });
    x += tw + 12;
    if (wide) { drawPortrait(g, p, x + sz * 0.55, y, sz * 0.55, { ring: p.color, ringWidth: 3 }); x += sz * 1.4; }
    const pad = p.ctrl.kind === 'pad';
    let items;
    if (st.ready) items = st.p.isAI ? [] : [['b', 'Change']];
    else if (st.confirm) items = [['a', 'Yes!'], ['b', 'Not yet']];
    else if (st.step === 'shape') items = [['stick', 'Move'], ['x', 'Hold: shape'], ['y', 'Bake'], ['b', 'Smooth'], [pad ? 'dpad' : 'rt', 'Handles']];
    else if (st.step === 'fire') items = st.fire.stage === 'bake' ? [['a', 'Puff the fire!']] : [];
    else {
      const tool = TOOLS[st.tool];
      // gamepad: d-pad left / right (or LB / RB) colour, d-pad up / down tool; keyboard (WASD is the
      // hand): LB / RB colour, LT / RT tool
      const toolKeys = pad ? ['dpad', '\u25b2\u25bc'] : [['lt', 'rt'], ''];
      if (!tool) items = [[toolKeys[0], `${toolKeys[1]} Change`.trim()], ['a', "I'm ready!"]];
      else if (st.held) items = [['stick', 'Move'], ['x', 'Stick'], ['b', 'Take off']];
      else {
        const what = tool.id === 'sticker' ? 'Sticker' : 'Colour';
        items = [['stick', 'Move'], ['x', st.hover && (tool.id === 'sticker' || tool.id === 'dots') ? 'Move' : tool.verb], ['a', 'Next'],
          pad ? ['dpad', `\u25c0\u25b6 / LB RB: ${what}`] : [['lb', 'rb'], what], [toolKeys[0], `${toolKeys[1]} Tool`.trim()], ['y', 'Done'], ['b', st.hover ? 'Take off' : 'Undo']];
      }
    }
    if (!items.length) return;
    if (!wide && items.length > 3) items = items.map(([b, l]) => [b, ['Handles', 'Move'].includes(l) && b !== 'x' ? '' : l]);
    const avail = r.x + r.w - 16 - x, lab = sz * 0.62;
    // a hint's glyph can be a pair (keyboard: [LB][RB] colour, [LT][RT] tool)
    const gw = (b) => (Array.isArray(b) ? b.length * (sz * 1.35 + 4) - 4 : sz);
    let need = 0;
    for (const [b, l] of items) need += gw(b) + 6 + (l ? ui.measure(g, l, lab) + 18 : 12);
    const kk = Math.min(1, avail / need);
    x += Math.max(0, (avail - need * kk) / 2);
    g.save(); g.translate(x, y); g.scale(kk, kk); x = 0;
    for (const [b, l] of items) {
      if (Array.isArray(b)) b.forEach((bb, j) => ui.glyph(g, bb, x + (sz * 1.35 + 4) * j + sz * 0.675, 0, sz));
      else ui.glyph(g, b, x + sz / 2, 0, sz, { pulse: b === 'a' && (st.confirm || st.step === 'fire' || (st.step === 'paint' && !TOOLS[st.tool])) });
      x += gw(b) + 6;
      if (l) { ui.text(g, l, x, 2, { size: lab, color: '#fff', align: 'left', strokeWidth: 5 }); x += ui.measure(g, l, lab) + 18; } else x += 12;
    }
    g.restore();
  }

  drawConfirm(g, st) {
    const ca = st.L.ca;
    const w = Math.min(ca.w * 0.9, 460), h = Math.min(ca.h * 0.42, 220);
    const p = ease.outBack(clamp(st.confirm.t / 0.25, 0, 1));
    g.save(); g.translate(ca.x + ca.w / 2, ca.y + ca.h * 0.36); g.scale(p, p);
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 26, fill: '#fff8ec', stroke: NAVY, lineWidth: 5 });
    ui.text(g, st.step === 'shape' ? 'Bake it in the kiln?' : 'All done painting?', 0, -h * 0.2, { size: clamp(w * 0.08, 18, 38), color: NAVY, stroke: false, weight: 800, maxWidth: w - 30 });
    ui.hints(g, [['a', 'Yes!'], ['b', 'Not yet']], 0, h * 0.2, { size: clamp(h * 0.2, 24, 42) });
    g.restore();
  }

  drawReady(g, st) {
    const lr = st.L.list;
    g.save();
    ui.roundRect(g, lr.x, lr.y, lr.w, lr.h, 22); g.fillStyle = 'rgba(255,255,255,0.98)'; g.fill();
    const cx = lr.x + lr.w / 2, cy = lr.y + lr.h * 0.3;
    const p = Math.min(1, st.readyT / 0.3), sc = ease.outBack(p);
    g.translate(cx, cy); g.rotate(-0.12); g.scale(sc, sc);
    const w = Math.min(lr.w * 0.95, 300), h = w * 0.36;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: h / 2, fill: '#36d17a', lineWidth: 5 });
    ui.text(g, 'Ready!', 0, 2, { size: h * 0.55, weight: 800 });
    g.restore();
    const fs = clamp(lr.w * 0.1, 15, 30);
    ui.text(g, `${potName(st.pot)}!`, cx, lr.y + lr.h * 0.5, { size: fs * 1.2, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 16 });
    const waiting = this.stations.filter((s) => !s.ready).length;
    const sz = clamp(lr.w * 0.08, 14, 26);
    if (waiting) ui.text(g, waiting === 1 ? 'Waiting for 1 potter...' : `Waiting for ${waiting} potters...`, cx, lr.y + lr.h * 0.66, { size: sz, color: NAVY, stroke: false, maxWidth: lr.w - 16 });
    if (!st.p.isAI) ui.hints(g, [['b', 'Change']], cx, lr.y + lr.h * 0.82, { size: sz * 1.3 });
  }

  drawHelp(g, st, msg = 'Hold X on the clay!') {
    const b = st.L.base, k = st.L.k;
    const y = b.y - st.pot.h * k - 70 * k - 20;
    const fs = clamp(34 * k, 18, 36);
    const w = ui.measure(g, msg, fs, 800) + fs * 2.4;
    const bob = Math.sin(this.t * 4) * 4;
    g.save(); g.translate(b.x, y + bob);
    ui.panel(g, -w / 2, -fs * 0.9, w, fs * 1.8, { r: fs * 0.9, fill: '#fff8ec', lineWidth: 3, shadow: false });
    ui.glyph(g, 'x', -w / 2 + fs * 1.05, 0, fs * 1.3, { pulse: true });
    ui.text(g, msg, fs * 0.6, 1, { size: fs, color: NAVY, stroke: false, weight: 800 });
    g.restore();
  }

  // --- showcase drawing ---------------------------------------------------------------------
  drawShow(g) {
    const t = this.phaseT;
    const bg = art('bg/pottery-wheel-gallery');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else this.drawGallery(g);
    // shelves
    for (const sy of this.show.shelves) this.drawShelf(g, sy);
    // spotlight
    const spotI = this.stations.findIndex((s) => s.spotT >= 0 && s.spotT < this.spotGap);
    if (spotI >= 0 && !this.cheese) {
      const s = this.stations[spotI].slot, u = this.stations[spotI].spotT;
      const life = Math.min(clamp(u / 0.2, 0, 1), clamp((this.spotGap - u) / 0.25, 0, 1));
      g.save(); g.globalAlpha = 0.35 * life; g.fillStyle = '#fff6c8';
      g.beginPath(); g.moveTo(s.x - 40, 0); g.lineTo(s.x + 40, 0); g.lineTo(s.x + 230 * s.k + 60, s.y + 10); g.lineTo(s.x - 230 * s.k - 60, s.y + 10); g.closePath(); g.fill();
      g.restore();
    }
    // pots
    this.stations.forEach((st, i) => {
      if (st.popT < 0) return;
      const s = st.slot;
      const pop = ease.outBack(clamp(st.popT / 0.35, 0, 1));
      const spot = st.spotT >= 0 && st.spotT < this.spotGap ? Math.sin(clamp(st.spotT / this.spotGap, 0, 1) * Math.PI) : 0;
      const kk = s.k * pop * (1 + spot * 0.15);
      const phi = this.t * (0.6 + spot * 2) + i * 1.3;
      g.save(); g.globalAlpha = 0.3; g.fillStyle = NAVY;
      g.beginPath(); g.ellipse(s.x, s.y + 4, maxRadius(st.pot) * kk * 1.05, 14 * pop, 0, 0, TAU); g.fill(); g.restore();
      drawPot(g, st.pot, { x: s.x, y: s.y, k: kk, phi, t: this.t });
      // ribbon + plaque on the shelf edge
      if (st.spotT >= 0) this.drawAward(g, st, clamp(st.spotT / 0.3, 0, 1));
      else this.drawPlaque(g, st, s.x, s.y + 30, pop, false);
    });
    // potters on the floor
    const order = this.stations.slice().sort((a, b) => a.showActor.y - b.showActor.y);
    for (const st of order) st.showActor.draw(g, { ring: st.p.color });
    this.drawShowHUD(g, t);
  }

  drawGallery(g) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#efe2ff'); gr.addColorStop(1, '#e2d0fb');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // soft wall pattern
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#ffffff';
    for (let y = 30; y < 900; y += 70) for (let x = (y / 70) % 2 ? 35 : 0; x < W; x += 70) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
    g.restore();
    // ceiling track with spotlights
    g.fillStyle = '#5b4a7a'; g.fillRect(0, 0, W, 16);
    for (const x of [W * 0.25, W * 0.75]) { g.fillStyle = '#3a2d55'; ui.roundRect(g, x - 26, 8, 52, 40, 10); g.fill(); g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(x, 48, 20, 6, 0, 0, TAU); g.fill(); }
    // wainscot
    g.fillStyle = '#d4bff4'; g.fillRect(0, 860, W, 70);
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 860); g.lineTo(W, 860); g.stroke();
    // floor
    g.fillStyle = '#e6ad78'; g.fillRect(0, 930, W, H - 930);
    g.strokeStyle = 'rgba(120,70,40,0.25)'; g.lineWidth = 2;
    for (let y = 960, row = 0; y < H; y += 30, row++) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (row % 2) * 90; x < W; x += 180) { g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x, y); g.stroke(); } }
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 930); g.lineTo(W, 930); g.stroke();
    // plants in the corners
    for (const [x, f] of [[70, 1], [W - 70, -1]]) {
      g.save(); g.translate(x, 930); g.scale(f, 1);
      g.fillStyle = '#5ddc6a'; g.strokeStyle = NAVY; g.lineWidth = 3;
      for (const [a, l] of [[-0.5, 120], [-0.15, 150], [0.25, 130], [0.6, 100]]) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -l / 2 - 40, 18, l / 2, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
      g.fillStyle = '#e3895a'; g.beginPath(); g.moveTo(-40, -70); g.lineTo(40, -70); g.lineTo(30, 0); g.lineTo(-30, 0); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }

  drawShelf(g, y) {
    if (drawArt(g, 'prop/pottery-shelf', W / 2, y - 40 + 80, 1760, 160, { fit: 'stretch' })) return;
    g.save(); g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
    // brackets
    for (const x of [260, W - 260]) {
      g.fillStyle = '#7a5a8a'; g.beginPath(); g.moveTo(x - 10, y + 30); g.lineTo(x + 10, y + 30); g.lineTo(x + 10, y + 110); g.quadraticCurveTo(x - 50, y + 60, x - 10, y + 30); g.closePath(); g.fill(); g.stroke();
    }
    g.fillStyle = '#d99a62'; ui.roundRect(g, 80, y - 6, W - 160, 22, 8); g.fill(); g.stroke();
    g.fillStyle = '#b97a48'; ui.roundRect(g, 80, y + 12, W - 160, 22, 6); g.fill(); g.stroke();
    g.restore();
  }

  drawPlaque(g, st, x, y, a = 1, big = false) {
    const w = big ? 220 : 120, h = big ? 40 : 30;
    g.save(); g.globalAlpha *= a;
    ui.panel(g, x - w / 2, y - h / 2, w, h, { r: h / 2, fill: st.p.color, lineWidth: 3, shadow: false });
    ui.text(g, st.p.tag, x, y + 1, { size: h * 0.6, strokeWidth: 4, maxWidth: w - 12 });
    g.restore();
  }

  drawAward(g, st, p) {
    const s = st.slot, sc = ease.outBack(p);
    const rows = this.show.rows;
    const x = s.x, y = s.y + (rows === 1 ? 52 : 44);
    g.save(); g.translate(x, y); g.scale(sc, sc);
    // rosette hanging off the shelf edge
    const R = rows === 1 ? 30 : 24;
    g.save(); g.translate(-(rows === 1 ? 150 : 108), 6);
    if (!drawArt(g, 'prop/pottery-rosette', 0, R * 0.9, R * 2.6, R * 3.4)) {
      g.fillStyle = st.p.color; g.strokeStyle = NAVY; g.lineWidth = 3;
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 4, 0); g.lineTo(sx * 16, R * 1.8); g.lineTo(sx * 8, R * 1.5); g.lineTo(sx * 2, R * 1.9); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = '#ffd23f'; g.beginPath();
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, q = i % 2 ? R : R * 0.82; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff8ec'; g.beginPath(); g.arc(0, 0, R * 0.55, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = st.p.color; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? R * 0.18 : R * 0.42; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill();
    }
    g.restore();
    const w = rows === 1 ? 250 : 180, h = rows === 1 ? 50 : 40;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 12, fill: '#fff8ec', stroke: st.p.color, lineWidth: 5, shadow: true });
    ui.text(g, st.award, 0, -1, { size: h * 0.46, color: NAVY, stroke: false, weight: 800, maxWidth: w - 16 });
    ui.text(g, st.p.tag, w / 2 - 4, -h / 2 - 2, { size: h * 0.36, color: st.p.color, strokeWidth: 4 });
    g.restore();
  }

  drawShowHUD(g, t) {
    if (!this.cheese && t < this.spotStart + 0.2) ui.banner(g, 'Pottery Show!', t, { y: 110, size: 100, color: '#ff9f5a' });
    const ch = this.cheeseAt, shot = ch + CHEESE_TIME;
    if (!this.photoTaken && this.cheese) {
      if (t < shot - 3) ui.banner(g, 'Say cheese!', t - ch, { y: 110, size: 100, color: '#fff' });
      else { const n = Math.ceil(shot - t), f = 1 - (shot - t - (n - 1)); g.save(); g.translate(W / 2, 110); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(Math.max(1, n)), 0, 0, { size: 170, color: '#ffd23f', strokeWidth: 12 }); g.restore(); }
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
        g.save(); g.fillStyle = 'rgba(36,22,63,0.45)'; ui.roundRect(g, W / 2 - 720, H - 140, 1440, 128, 30); g.fill(); g.restore();
        ui.hints(g, r1, W / 2, H - 104, { size: 34 }); ui.hints(g, r2, W / 2, H - 48, { size: 34 });
      }
    }
    if (this.photoTaken) {
      const pt = t - shot;
      if (pt < 2.2) ui.banner(g, 'Masterpieces!', pt, { y: 110, size: 100, color: '#ffd23f' });
    }
  }
}
