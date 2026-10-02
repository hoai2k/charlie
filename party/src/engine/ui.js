// Shared drawing helpers so every screen and minigame looks like one game:
// chunky outlined text, rounded panels, Xbox button glyphs, HUD score chips,
// timers and banners.
import { W, H } from './canvas.js';
import { drawPortrait } from './sprites.js';
import { drawStarShape } from './emotes.js';
import { clamp, ease, TAU } from './util.js';

export const FONT = 'Fredoka, "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif';
export const NAVY = '#24163f';
export const COLORS = {
  navy: NAVY, white: '#ffffff', cream: '#fff8ec', pink: '#ff6fb1', yellow: '#ffd23f', sky: '#7fd3ff',
  mint: '#6fe3b4', purple: '#9b5cff', orange: '#ff9f1c', red: '#ff4d6d', blue: '#3fa7ff', green: '#36d17a',
  panel: 'rgba(255,255,255,0.92)', shade: 'rgba(36,22,63,0.55)',
};
export const BUTTON_COLORS = { a: '#3ec43e', b: '#e8423b', x: '#2f7dfa', y: '#f5b70f' };

/**
 * Outlined text. opts: size, color, align ('center'|'left'|'right'), baseline,
 * stroke (outline color or false), strokeWidth, weight, shadow (bool), maxWidth
 */
export function text(g, str, x, y, o = {}) {
  const size = o.size || 40;
  g.save();
  g.font = `${o.weight || 700} ${size}px ${FONT}`;
  g.textAlign = o.align || 'center';
  g.textBaseline = o.baseline || 'middle';
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  let sx = 1;
  if (o.maxWidth) { const w = g.measureText(str).width; if (w > o.maxWidth) sx = o.maxWidth / w; }
  g.translate(x, y); if (sx !== 1) g.scale(sx, 1);
  if (o.shadow !== false && o.stroke !== false) {
    g.fillStyle = 'rgba(36,22,63,0.35)';
    g.fillText(str, 0, size * 0.09);
  }
  if (o.stroke !== false) {
    g.lineJoin = 'round';
    g.lineWidth = o.strokeWidth ?? Math.max(3, size * 0.16);
    g.strokeStyle = o.stroke || NAVY;
    g.strokeText(str, 0, 0);
  }
  g.fillStyle = o.color || '#ffffff';
  g.fillText(str, 0, 0);
  g.restore();
}

/** Measure text width with the game font. */
export function measure(g, str, size, weight = 700) {
  g.save(); g.font = `${weight} ${size}px ${FONT}`; const w = g.measureText(str).width; g.restore(); return w;
}

/** Word-wrap text into lines that fit `maxW`. */
export function wrap(g, str, maxW, size, weight = 600) {
  g.save(); g.font = `${weight} ${size}px ${FONT}`;
  const words = str.split(' '); const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  g.restore(); return lines;
}

export function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Rounded panel with navy outline and a soft drop shadow. */
export function panel(g, x, y, w, h, o = {}) {
  const r = o.r ?? 28;
  g.save();
  if (o.shadow !== false) {
    g.fillStyle = 'rgba(36,22,63,0.28)';
    roundRect(g, x + 6, y + 10, w, h, r); g.fill();
  }
  roundRect(g, x, y, w, h, r);
  g.fillStyle = o.fill || COLORS.panel; g.fill();
  if (o.stroke !== false) { g.lineWidth = o.lineWidth || 6; g.strokeStyle = o.stroke || NAVY; g.stroke(); }
  g.restore();
}

/**
 * Xbox-style button glyph. b: a|b|x|y|lb|rb|lt|rt|start|back|stick|dpad|rstick
 */
export function glyph(g, b, x, y, size = 44, o = {}) {
  g.save();
  g.translate(x, y);
  const s = size / 2;
  if (o.pulse) { const k = 1 + Math.sin(performance.now() / 160) * 0.08; g.scale(k, k); }
  g.lineWidth = Math.max(2, size * 0.08); g.strokeStyle = NAVY;
  if (BUTTON_COLORS[b]) {
    g.fillStyle = '#2b2b36'; g.beginPath(); g.arc(0, size * 0.05, s, 0, TAU); g.fill();
    g.fillStyle = '#3a3a48'; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.stroke();
    g.font = `800 ${Math.round(size * 0.62)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = BUTTON_COLORS[b]; g.fillText(b.toUpperCase(), 0, size * 0.03);
  } else if (b === 'stick' || b === 'rstick') {
    g.fillStyle = '#3a3a48'; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#5a5a6e'; g.beginPath(); g.arc(0, 0, s * 0.62, 0, TAU); g.fill();
    g.font = `800 ${Math.round(size * 0.34)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.fillText(b === 'stick' ? 'L' : 'R', 0, 1);
  } else if (b === 'dpad') {
    g.fillStyle = '#3a3a48';
    const a = s * 0.36;
    g.beginPath();
    g.rect(-a, -s, 2 * a, 2 * s); g.rect(-s, -a, 2 * s, 2 * a);
    g.fill();
    g.strokeRect(-a, -s, 2 * a, 2 * s); g.strokeRect(-s, -a, 2 * s, 2 * a);
    g.fillRect(-a + 2, -a + 2, 2 * a - 4, 2 * a - 4);
  } else {
    // Shoulder / trigger / menu pills.
    const label = { lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', start: '☰', back: '⧉' }[b] || b.toUpperCase();
    const w = size * 1.35, h = size * 0.8;
    g.fillStyle = '#3a3a48'; roundRect(g, -w / 2, -h / 2, w, h, h * 0.45); g.fill(); g.stroke();
    g.font = `800 ${Math.round(size * 0.42)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.fillText(label, 0, 1);
  }
  g.restore();
}

/** A row of [glyph] label hints, e.g. hints(g, [['a','Select'],['b','Back']], x, y) */
export function hints(g, list, x, y, o = {}) {
  const size = o.size || 36, gap = o.gap || 34;
  const widths = list.map(([, label]) => size * 1.2 + measure(g, label, size * 0.8, 700) + gap);
  let total = widths.reduce((a, b) => a + b, 0) - gap;
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  list.forEach(([b, label], i) => {
    glyph(g, b, cx + size / 2, y, size);
    text(g, label, cx + size * 1.15, y, { size: size * 0.8, align: 'left', color: o.color || '#fff', strokeWidth: 6 });
    cx += widths[i];
  });
}

/** Big centered banner with pop-in animation; t = seconds since shown. */
export function banner(g, str, t, o = {}) {
  const p = clamp(t / 0.35, 0, 1);
  const sc = ease.outBack(p);
  g.save();
  g.translate(o.x ?? W / 2, o.y ?? H / 2);
  g.rotate((o.tilt ?? -0.04) * sc);
  g.scale(sc, sc);
  text(g, str, 0, 0, { size: o.size || 150, color: o.color || COLORS.yellow, strokeWidth: o.strokeWidth || 26, weight: 800 });
  g.restore();
}

/** 3-2-1-GO! overlay. Returns nothing; `t` counts up from 0, GO at 3s. */
export function countdown(g, t) {
  if (t < 0 || t > 3.8) return;
  const n = Math.floor(t);
  const local = t - n;
  const label = n < 3 ? String(3 - n) : 'GO!';
  const color = ['#ff4d6d', '#ffc12e', '#36d17a', '#ffffff'][n] || '#fff';
  const sc = n < 3 ? 1.6 - ease.outBack(Math.min(1, local / 0.3)) * 0.6 : 0.6 + ease.outElastic(Math.min(1, local / 0.6)) * 0.6;
  g.save();
  g.globalAlpha = n < 3 ? 1 - Math.max(0, local - 0.7) / 0.3 : 1 - Math.max(0, local - 0.45) / 0.35;
  g.translate(W / 2, H / 2); g.scale(sc, sc);
  text(g, label, 0, 0, { size: 220, color, strokeWidth: 34, weight: 800 });
  g.restore();
}

/** Timer pill at top center; flashes red in the last 5 seconds. */
export function timer(g, seconds, x = W / 2, y = 64) {
  const s = Math.max(0, Math.ceil(seconds));
  const urgent = s <= 5 && seconds > 0;
  const pulse = urgent ? 1 + Math.max(0, Math.sin((seconds % 1) * Math.PI)) * 0.12 : 1;
  g.save(); g.translate(x, y); g.scale(pulse, pulse);
  panel(g, -86, -44, 172, 88, { r: 44, fill: urgent ? '#ff4d6d' : '#ffffff' });
  // little clock
  g.strokeStyle = NAVY; g.lineWidth = 5; g.fillStyle = urgent ? '#ffd0d8' : '#ffe58a';
  g.beginPath(); g.arc(-42, 0, 22, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-42, 0); g.lineTo(-42, -13); g.moveTo(-42, 0); g.lineTo(-32, 5); g.stroke();
  text(g, String(s), 22, 3, { size: 56, color: urgent ? '#fff' : NAVY, stroke: urgent ? NAVY : false, weight: 800 });
  g.restore();
}

/**
 * HUD row of player chips along the top (or bottom) edge.
 *   scoreboard(g, players, values, { y, format: v => v + ' pts', highlight: [bools], expr: [..] })
 */
export function scoreboard(g, players, values, o = {}) {
  const n = players.length;
  const gap = o.avoidCenter ? 220 : 0;          // room for a centered timer
  const chipW = Math.min(260, (W - 120 - gap) / n - 16);
  const total = n * chipW + (n - 1) * 16 + gap;
  const y = o.y ?? 40;
  let x = (W - total) / 2;
  const gapAt = n === 1 ? 1 : Math.ceil(n / 2);  // solo: chip sits left of the timer
  players.forEach((p, i) => {
    if (o.avoidCenter && i === gapAt) x += gap;
    const out = o.out && o.out[i];
    g.save();
    if (out) g.globalAlpha = 0.45;
    panel(g, x, y, chipW, 76, { r: 38, fill: '#ffffff', stroke: p.color, lineWidth: 6 });
    drawPortrait(g, p.charId, x + 38, y + 38, 30, { expr: (o.expr && o.expr[i]) || 'neutral', ring: null, gray: !!out });
    text(g, p.tag, x + 84, y + 22, { size: 22, color: p.color, align: 'left', strokeWidth: 5 });
    const v = o.format ? o.format(values[i], i) : String(values[i] ?? '');
    text(g, v, x + chipW - 18, y + 46, { size: 38, color: NAVY, align: 'right', stroke: false, weight: 800, maxWidth: chipW - 100 });
    if (o.highlight && o.highlight[i]) {
      g.translate(x + chipW - 8, y + 4); drawStarShape(g, 30, '#ffd23f');
    }
    g.restore();
    x += chipW + 16;
  });
}

/** Floating "P1" style marker above a character's head. */
export function playerTag(g, p, x, y, o = {}) {
  const bob = Math.sin(performance.now() / 220 + p.index) * 4;
  g.save(); g.translate(x, y + bob);
  const w = 64, h = 38;
  g.fillStyle = p.color; g.strokeStyle = NAVY; g.lineWidth = 4;
  roundRect(g, -w / 2, -h, w, h, 14); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-9, -1); g.lineTo(0, 12); g.lineTo(9, -1); g.closePath(); g.fill(); g.stroke();
  g.fillRect(-8, -5, 16, 6);
  text(g, o.label || p.tag, 0, -h / 2, { size: 24, color: '#fff', strokeWidth: 5, shadow: false });
  g.restore();
}

/** Draw `n` stars in a row (results / scoreboards). */
export function stars(g, n, x, y, size = 30, o = {}) {
  for (let i = 0; i < n; i++) {
    g.save(); g.translate(x + i * size * 1.1 - ((n - 1) * size * 1.1) / 2, y);
    if (o.wobble) g.rotate(Math.sin(performance.now() / 300 + i) * 0.15);
    drawStarShape(g, size, o.color || '#ffd23f'); g.restore();
  }
}

/** Progress bar. */
export function bar(g, x, y, w, h, frac, color, o = {}) {
  g.save();
  roundRect(g, x, y, w, h, h / 2); g.fillStyle = o.bg || 'rgba(36,22,63,0.25)'; g.fill();
  if (frac > 0) { roundRect(g, x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2); g.fillStyle = color; g.fill(); }
  roundRect(g, x, y, w, h, h / 2); g.lineWidth = o.lineWidth || 4; g.strokeStyle = NAVY; g.stroke();
  g.restore();
}

// --- backgrounds -----------------------------------------------------------

/** Vertical gradient fill of the whole screen. */
export function sky(g, top, bottom, h = H) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, W, h);
}

/** Puffy cloud. */
export function cloud(g, x, y, s = 1, color = '#ffffff', alpha = 0.9) {
  g.save(); g.globalAlpha = alpha; g.fillStyle = color; g.translate(x, y); g.scale(s, s);
  g.beginPath();
  g.arc(-60, 10, 40, 0, TAU); g.arc(-15, -15, 55, 0, TAU); g.arc(45, 0, 45, 0, TAU); g.arc(85, 18, 30, 0, TAU);
  g.rect(-60, 10, 145, 40);
  g.fill(); g.restore();
}

/** Rolling hills band. */
export function hills(g, y, color, amp = 40, freq = 0.004, phase = 0) {
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35);
  g.lineTo(W, H); g.closePath(); g.fillStyle = color; g.fill();
}

/** Diagonal party-stripe / polka background used by menus. */
export function partyBackdrop(g, t, c1 = '#ffb3d9', c2 = '#ffc8e4') {
  g.fillStyle = c1; g.fillRect(0, 0, W, H);
  g.save();
  g.fillStyle = c2;
  const off = (t * 40) % 160;
  for (let x = -H - 160; x < W + 160; x += 160) {
    g.beginPath(); g.moveTo(x + off, 0); g.lineTo(x + off + 80, 0); g.lineTo(x + off + 80 + H, H); g.lineTo(x + off + H, H); g.closePath(); g.fill();
  }
  g.globalAlpha = 0.35; g.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) {
    const px = ((i * 263 + t * 20) % (W + 100)) - 50, py = (i * 151) % H;
    g.beginPath(); g.arc(px, py, 6 + (i % 4) * 3, 0, TAU); g.fill();
  }
  g.restore();
}

export { drawPortrait };
