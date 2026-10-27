// Play Studio controls, shared by the making games (Fashion Show is the model):
//
//   A          confirm: keep this choice and go on (on the "Done" tab: I'm ready!)
//   LB / RB    move between categories; the LAST category is "Done"
//   left stick move around / choose items (X also steps to the next item)
//   right stick place / nudge things inside the picture
//   Y          clear, only in a game that needs one (most don't: B undoes one thing) - it
//              always asks first ("Go back" is the default, so a stray or mashed press
//              never wipes anything); a page clear is better as an on-screen button
//   B          back (previous category / un-ready)
//
// Helpers for the shared pieces:
//   const q = askOpen();                         // open a question (default: Go back)
//   const r = askUpdate(ctrl, q);                // per frame: 'yes' | 'no' | null
//   drawAsk(g, rect, q, { title: 'Take it all off?', yes: 'Clear' });
//   drawDoneTab(g, x, y, w, h, { sel, bump, label: true });
//   drawDoneCard(g, rect, color);                // "All done? (A) I'm ready!"
import * as ui from './ui.js';

const NAVY = ui.NAVY;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** A yes/no question whose default is "no" (Go back). */
export function askOpen() { return { sel: 0, t: 0 }; }

/** Per frame for the player who asked: the stick or d-pad toggles, A answers, B / Y = Go back. */
export function askUpdate(c, q) {
  if (c.nav.x || c.nav.y) q.sel = 1 - q.sel;
  if (c.pressed('b') || c.pressed('y')) return 'no';
  if (c.pressed('a')) return q.sel === 1 ? 'yes' : 'no';
  return null;
}

/** The question card, centred in `rect` (dims what is behind it). */
export function drawAsk(g, rect, q, { title = 'Are you sure?', yes = 'Clear', no = 'Go back', color = '#ff6fb1' } = {}) {
  const cx = rect.x + rect.w / 2;
  g.save(); ui.roundRect(g, rect.x, rect.y, rect.w, rect.h, 22); g.fillStyle = 'rgba(36,22,63,0.55)'; g.fill(); g.restore();
  const w = Math.min(rect.w - 16, 380), h = Math.min(rect.h - 16, 300), x = cx - w / 2, y = rect.y + (rect.h - h) / 2;
  ui.panel(g, x, y, w, h, { r: 22, fill: '#fff8ec', lineWidth: 5 });
  const sz = clamp(w * 0.11, 20, 38);
  ui.text(g, title, cx, y + h * 0.2, { size: sz, color, strokeWidth: 5, maxWidth: w - 20 });
  [no, yes].forEach((label, i) => {
    const bw = w - 40, bh = h * 0.2, by = y + h * (0.38 + i * 0.27);
    const sel = q.sel === i;
    ui.panel(g, cx - bw / 2, by, bw, bh, { r: bh / 2, fill: sel ? '#ffd23f' : '#ffffff', lineWidth: sel ? 5 : 3, shadow: false });
    ui.text(g, label, cx, by + bh / 2 + 1, { size: sz * 0.85, color: sel ? NAVY : '#6b5a85', stroke: false, weight: 800 });
  });
}

/** The "Done" category tab: a green tile with a big tick (and "Done" when selected and roomy). */
export function drawDoneTab(g, x, y, w, h, { sel = false, bump = 0, label = true } = {}) {
  const k = sel ? 1 + bump * 0.8 : 1;
  g.save(); g.translate(x + w / 2, y + h / 2); g.scale(k, k);
  ui.panel(g, -w / 2, -h / 2, w, h, { r: 16, fill: sel ? '#36d17a' : '#a8e9c3', lineWidth: sel ? 5 : 3, shadow: sel });
  const named = sel && label && h > 64 && w > 90;
  const oy = named ? -h * 0.1 : h * 0.02, tk = Math.min(w, h) * 0.28;
  g.beginPath(); g.moveTo(-tk, oy); g.lineTo(-tk * 0.25, tk * 0.75 + oy); g.lineTo(tk, -tk * 0.7 + oy);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(6, tk * 0.45); g.strokeStyle = NAVY; g.stroke();
  g.lineWidth = Math.max(3, tk * 0.25); g.strokeStyle = '#ffffff'; g.stroke();
  if (named) ui.text(g, 'Done', 0, h * 0.34, { size: h * 0.24, color: NAVY, stroke: false, weight: 800 });
  g.restore();
}

/** What a panel shows while the "Done" tab is selected. */
export function drawDoneCard(g, rect, color = '#ff6fb1', { title = 'All done?', ready = "I'm ready!", back = 'LB to change something' } = {}) {
  const cx = rect.x + rect.w / 2;
  ui.panel(g, rect.x, rect.y, rect.w, rect.h, { r: 22, fill: 'rgba(255,255,255,0.9)', lineWidth: 4, shadow: false });
  const sz = clamp(rect.w * 0.12, 22, 44);
  ui.text(g, title, cx, rect.y + rect.h * 0.3, { size: sz, color, strokeWidth: 5, maxWidth: rect.w - 20 });
  ui.hints(g, [['a', ready]], cx, rect.y + rect.h * 0.52, { size: sz });
  if (back) ui.text(g, back, cx, rect.y + rect.h * 0.72, { size: sz * 0.55, color: NAVY, stroke: false, weight: 700, maxWidth: rect.w - 20 });
}
