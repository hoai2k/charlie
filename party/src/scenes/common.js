// Bits shared by the menu scenes.
import { art } from '../engine/art.js';
import * as ui from '../engine/ui.js';
import { drawEmote } from '../engine/emotes.js';

const PALETTE = ['#ff8fc7', '#7fd3ff', '#ffd23f', '#8ee59b', '#c49bff', '#ffb067'];

/** Minigame thumbnail: generated art > the game's drawIcon > a default card. */
export function drawGameIcon(g, meta, x, y, w, h, t = 0) {
  g.save();
  ui.roundRect(g, x, y, w, h, Math.min(w, h) * 0.12);
  g.clip();
  const img = art('thumb/' + meta.id);
  if (img) {
    const s = Math.max(w / img.width, h / img.height);
    g.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
  } else if (meta.drawIcon) {
    try { meta.drawIcon(g, x, y, w, h, t); } catch (e) { console.warn(e); }
  } else {
    const c = PALETTE[[...meta.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];
    g.fillStyle = c; g.fillRect(x, y, w, h);
    g.globalAlpha = 0.25; g.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x + w * ((i * 0.37) % 1), y + h * ((i * 0.61) % 1), h * 0.18, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    drawEmote(g, meta.category === 'studio' ? 'sparkle' : 'star', x + w / 2, y + h * 0.42, h * 0.45, t + 1);
    ui.text(g, meta.title, x + w / 2, y + h * 0.82, { size: h * 0.13, maxWidth: w * 0.9 });
  }
  g.restore();
}
