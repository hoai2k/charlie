// Hair Salon: the salon client — a big friendly head-and-shoulders bust in a
// salon cape, drawn procedurally in head units (head centre at 0,0), with
// live hair (hair.js) cached into offscreen canvases.
import * as ui from '../../engine/ui.js';
import { drawArt } from '../../engine/art.js';
import { drawSpeech } from '../../engine/sprites.js';
import { clamp, lerp, rand, pick, chance, TAU } from '../../engine/util.js';
import { Hair, HEAD_RX, HEAD_RY, NATURAL, NAVY, shade } from './hair.js';
import { drawBling } from './props.js';

const SKINS = ['#ffe0c7', '#f8c9a2', '#e8ae84', '#c98d62', '#a46b47', '#7f4f35'];
const EYES = ['#5a3a22', '#2f6fd1', '#2e9a5a', '#41335a', '#8a5a3c'];
const CAPES = ['#ff9ed6', '#b9a2ff', '#7fd3ff', '#7fe0b4', '#ffcf5c', '#ff9f7a'];

// Bounds of the cached hair canvas (head units).
const BX = 360, BY0 = -340, BY1 = 720;

export class Client {
  constructor(seed = {}) {
    this.skin = seed.skin || pick(SKINS);
    this.eye = pick(EYES);
    this.cape = seed.cape || pick(CAPES);
    this.freckles = chance(0.35);
    this.lashes = chance(0.6);
    this.studs = chance(0.4) ? pick(['#ffd23f', '#7fd3ff', '#ff6fb1']) : null;
    this.natural = seed.color || pick(NATURAL);
    if (seed.eye) this.eye = seed.eye;
    this.hair = new Hair({
      color: this.natural,
      length: seed.length ?? rand(200, 330),
      curl: seed.curl ?? (chance(0.4) ? rand(0.35, 0.7) : rand(0, 0.2)),
      messy: seed.messy ?? 1,
      bangs: seed.bangs ?? (chance(0.65) ? rand(30, 80) : 0),
    });
    this.bling = [];           // { def, x, y, rot, t }
    this.expr = 'smile'; this.exprT = 0;
    this.blinkT = rand(1, 4); this.blink = 0;
    this.look = { x: 0, y: 0 };
    this.squashV = 0; this.squash = 0;
    this.spinT = -1;
    this.bubble = null;         // { text, t, dur }
    this.bob = rand(TAU);
    this.cache = { front: null, back: null, k: 0, v: -1 };
  }

  react(expr, dur = 1.2) { this.expr = expr; this.exprT = dur; }
  say(text, dur = 1.8) { this.bubble = { text, t: 0, dur }; }
  pop(a = 0.25) { this.squashV += a * 14; }
  spin() { if (this.spinT < 0) this.spinT = 0; }

  update(dt, lookX = 0, lookY = 0) {
    this.bob += dt;
    if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = 'smile'; }
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.14; this.blinkT = rand(2, 5); }
    if (this.blink > 0) this.blink -= dt;
    this.look.x = lerp(this.look.x, clamp(lookX, -1, 1), Math.min(1, dt * 6));
    this.look.y = lerp(this.look.y, clamp(lookY, -1, 1), Math.min(1, dt * 6));
    // squash spring
    this.squashV += (-this.squash * 220 - this.squashV * 14) * dt;
    this.squash += this.squashV * dt;
    if (this.spinT >= 0) { this.spinT += dt; if (this.spinT > 0.8) this.spinT = -1; }
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
    for (const b of this.bling) b.t += dt;
    if (this.hair.strands.some((s) => s.dirty)) this.hair.layout();
  }

  /** Current transform numbers (sway, squash, spin) for drawing and hit tests. */
  pose() {
    const sx = this.spinT >= 0 ? Math.cos(this.spinT / 0.8 * TAU) : 1;
    return { rot: Math.sin(this.bob * 1.3) * 0.025, sy: 1 - this.squash * 0.25, sx: (1 + this.squash * 0.2) * (Math.abs(sx) < 0.08 ? 0.08 * Math.sign(sx || 1) : sx), dy: Math.sin(this.bob * 2.1) * 3 };
  }

  // ---- hair cache ---------------------------------------------------------------
  ensureCache(res) {
    const h = this.hair, C = this.cache;
    res = Math.round(res * 20) / 20;
    if (C.v === h.version && C.k === res) return;
    const w = Math.ceil(BX * 2 * res), hh = Math.ceil((BY1 - BY0) * res);
    for (const key of ['front', 'back']) {
      if (!C[key]) C[key] = document.createElement('canvas');
      const c = C[key];
      if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; }
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, hh);
      g.setTransform(res, 0, 0, res, BX * res, -BY0 * res);
      if (key === 'back') h.drawLayer(g, 'back');
      else {
        h.drawBunBase(g);
        h.drawCap(g);
        h.drawLayer(g, 'front');
        h.drawTies(g, this.cape === '#ff9ed6' ? '#9b5cff' : '#ff6fb1');
        h.drawLayer(g, 'bangs');
      }
    }
    C.v = h.version; C.k = res;
  }

  // ---- drawing ------------------------------------------------------------------
  /** Chair behind the client (head units). */
  drawChair(g) {
    if (drawArt(g, 'prop/salon-chair', 0, 470, HEAD_RX * 2 * 1.7, 560, { anchor: 'bottom' })) return;
    g.save();
    g.lineWidth = 7; g.strokeStyle = NAVY; g.lineJoin = 'round';
    // pole and base
    g.fillStyle = '#c9d6e8';
    ui.roundRect(g, -22, 360, 44, 90, 10); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, 452, 120, 22, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-14, 368, 8, 70);
    // back
    g.fillStyle = '#ff7ab8';
    ui.roundRect(g, -205, -70, 410, 450, 120); g.fill(); g.stroke();
    g.fillStyle = '#ff9ccb';
    ui.roundRect(g, -170, -40, 340, 400, 96); g.fill();
    g.fillStyle = '#e65c9c';
    for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { g.beginPath(); g.arc(c * 90, -5 + r * 70, 8, 0, TAU); g.fill(); }
    // arms
    g.fillStyle = '#c9d6e8';
    for (const sd of [-1, 1]) { ui.roundRect(g, sd * 250 - 45, 300, 90, 40, 18); g.fill(); g.stroke(); }
    g.restore();
  }

  /** The whole client at the current origin (head units; caller scales). */
  draw(g, t, o = {}) {
    const P = this.pose();
    const res = o.res || 1;
    this.ensureCache(res);
    g.save();
    g.translate(0, P.dy);
    if (!o.noChair) this.drawChair(g);
    // the bust sways as one; spin squashes it sideways
    g.save();
    g.scale(P.sx, 1);
    g.translate(0, HEAD_RY * (1 - P.sy));
    g.rotate(P.rot);
    const C = this.cache;
    if (C.back) g.drawImage(C.back, -BX, BY0, BX * 2, BY1 - BY0);
    this.drawBody(g);
    this.drawHead(g, t);
    g.drawImage(C.front, -BX, BY0, BX * 2, BY1 - BY0);
    this.hair.drawGlitter(g, t);
    for (const b of this.bling) {
      if (b.hidden) continue;
      const pop = b.t < 0.3 ? 1 + Math.sin((b.t / 0.3) * Math.PI) * 0.35 : 1;
      g.save(); g.translate(b.x, b.y); g.rotate(b.rot); g.scale(pop, pop);
      if (b === o.hover) { g.globalAlpha = 0.85 + Math.sin(t * 10) * 0.15; }
      drawBling(g, b.def, b.def.wide ? 150 : 96, t + b.x);
      g.restore();
    }
    g.restore();
    if (this.bubble && !o.noBubble) {
      const B = this.bubble;
      drawSpeech(g, B.text, 0, -HEAD_RY * 1.25 - 30, o.bubbleScale || 1.6, B.t, B.dur);
    }
    g.restore();
  }

  drawBody(g) {
    g.save();
    g.lineWidth = 7; g.strokeStyle = NAVY; g.lineJoin = 'round';
    // neck
    g.fillStyle = this.skin;
    ui.roundRect(g, -44, 80, 88, 120, 30); g.fill(); g.stroke();
    g.fillStyle = shade(this.skin.length === 7 ? this.skin : '#ffe0c7', -0.12);
    g.beginPath(); g.ellipse(0, 112, 40, 14, 0, 0, Math.PI); g.fill();
    // cape
    g.fillStyle = this.cape;
    g.beginPath();
    g.moveTo(-60, 180);
    g.quadraticCurveTo(-210, 190, -240, 300);
    g.lineTo(-250, 400); g.lineTo(250, 400); g.lineTo(240, 300);
    g.quadraticCurveTo(210, 190, 60, 180);
    g.quadraticCurveTo(0, 210, -60, 180);
    g.closePath(); g.fill(); g.stroke();
    // polka dots
    g.save(); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    for (let y = 210; y < 420; y += 46) for (let x = -260 + ((y / 46) % 2) * 23; x < 270; x += 46) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); }
    g.restore();
    // collar
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(0, 186, 74, 20, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }

  drawHead(g, t) {
    const RX = HEAD_RX, RY = HEAD_RY;
    g.save();
    g.lineWidth = 7; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
    // ears
    g.fillStyle = this.skin;
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * RX * 0.98, RY * 0.12, 24, 30, 0, 0, TAU); g.fill(); g.stroke(); }
    if (this.studs) { g.fillStyle = this.studs; for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * RX * 1.02, RY * 0.3, 7, 0, TAU); g.fill(); g.lineWidth = 3; g.stroke(); } g.lineWidth = 7; }
    // face
    g.fillStyle = this.skin;
    g.beginPath(); g.ellipse(0, 0, RX, RY, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(-RX * 0.35, -RY * 0.1, RX * 0.3, RY * 0.4, -0.3, 0, TAU); g.fill();
    // cheeks
    g.fillStyle = 'rgba(255,110,150,0.35)';
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * RX * 0.55, RY * 0.38, 22, 13, 0, 0, TAU); g.fill(); }
    if (this.freckles) { g.fillStyle = 'rgba(140,80,50,0.5)'; for (const sd of [-1, 1]) for (const [fx, fy] of [[0.42, 0.3], [0.52, 0.27], [0.47, 0.36], [0.6, 0.32]]) { g.beginPath(); g.arc(sd * RX * fx, RY * fy, 3, 0, TAU); g.fill(); } }
    // eyes
    const e = this.expr, ey = RY * 0.1, ex = RX * 0.38;
    const closed = this.blink > 0 || e === 'happy' || e === 'giggle';
    for (const sd of [-1, 1]) {
      g.save(); g.translate(sd * ex, ey);
      if (closed) {
        g.lineWidth = 7;
        g.beginPath(); g.arc(0, 6, 20, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      } else {
        const big = e === 'wow' || e === 'eek' ? 1.15 : 1;
        g.fillStyle = '#ffffff'; g.lineWidth = 5;
        g.beginPath(); g.ellipse(0, 0, 22 * big, 27 * big, 0, 0, TAU); g.fill(); g.stroke();
        const lx = this.look.x * 7, ly = this.look.y * 6;
        g.fillStyle = this.eye; g.beginPath(); g.ellipse(lx, ly + 2, 15, 18, 0, 0, TAU); g.fill();
        g.fillStyle = NAVY; g.beginPath(); g.ellipse(lx, ly + 3, 8, 10, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(lx - 5, ly - 5, 6, 0, TAU); g.fill(); g.beginPath(); g.arc(lx + 5, ly + 8, 3, 0, TAU); g.fill();
        if (this.lashes) { g.lineWidth = 4; g.beginPath(); g.moveTo(sd * 18, -18); g.lineTo(sd * 28, -26); g.moveTo(sd * 8, -25); g.lineTo(sd * 13, -35); g.stroke(); }
      }
      // brow
      g.lineWidth = 6; g.strokeStyle = shade(this.natural, -0.35);
      const by = e === 'wow' || e === 'eek' ? -46 : -38;
      g.beginPath(); g.moveTo(-16, by + (sd < 0 ? 2 : 0)); g.quadraticCurveTo(0, by - 8, 16, by + (sd > 0 ? 2 : 0)); g.stroke();
      g.restore();
    }
    // nose
    g.strokeStyle = shade(this.skin, -0.3); g.lineWidth = 5;
    g.beginPath(); g.moveTo(-4, RY * 0.3); g.quadraticCurveTo(6, RY * 0.36, -2, RY * 0.4); g.stroke();
    // mouth
    g.strokeStyle = NAVY; g.lineWidth = 6;
    const my = RY * 0.56;
    if (e === 'wow' || e === 'eek') {
      g.fillStyle = '#c2365f';
      g.beginPath(); g.ellipse(0, my + 4, e === 'eek' ? 10 : 16, e === 'eek' ? 12 : 20, 0, 0, TAU); g.fill(); g.stroke();
    } else if (e === 'happy' || e === 'giggle' || e === 'laugh') {
      g.fillStyle = '#c2365f';
      g.beginPath(); g.moveTo(-30, my - 6); g.quadraticCurveTo(0, my + 40, 30, my - 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff8fb0'; g.beginPath(); g.ellipse(0, my + 14, 12, 6, 0, 0, TAU); g.fill();
    } else if (e === 'pout') {
      g.beginPath(); g.arc(0, my + 18, 16, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    } else {
      g.beginPath(); g.moveTo(-24, my - 2); g.quadraticCurveTo(0, my + 22, 24, my - 2); g.stroke();
    }
    g.restore();
  }

  // ---- bling ----------------------------------------------------------------------
  blingAt(x, y) {
    let best = null, bd = 60;
    for (const b of this.bling) { const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = b; } }
    return best;
  }
}

export { HEAD_RX, HEAD_RY };
