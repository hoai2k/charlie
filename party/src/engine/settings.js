// Settings overlay (opened from the gear corner button, the controller's View
// button, or O on the keyboard). It sits on top of whichever menu screen is
// showing, so opening it never resets that screen (e.g. players who joined).
//   Sound: On / Off        Full screen: On / Off        Images: Optimized / Full
// Up/down picks a row, A or left/right changes it, B / Start / View closes.
// Full screen can only change inside a real key press or click (browser rule),
// so keyboard and mouse toggles run inside the DOM event; a controller press
// arms it and the next key/click completes it.
import { W, H } from './canvas.js';
import { input } from './input.js';
import { isMuted, toggleMuted, unlockAudio, sfx } from './audio.js';
import { shell } from './shell.js';
import { getImageQuality, setImageQuality } from './sprites.js';
import * as ui from './ui.js';

const ROW_H = 104, PANEL_W = 860;
const A_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyJ']);

export const settings = {
  isOpen: false,
  sel: 0,
  t: 0,
  note: '',
  _domHandled: false,

  rows() {
    const r = [{ id: 'sound', label: 'Sound', value: isMuted() ? 'Off' : 'On', on: !isMuted() }];
    if (shell.canFullscreen()) r.push({ id: 'full', label: 'Full screen', value: shell.isFullscreen() ? 'On' : 'Off', on: shell.isFullscreen() });
    const q = getImageQuality();
    r.push({ id: 'quality', label: 'Pictures', value: q === 'full' ? 'Full' : 'Optimized', on: q === 'full', hint: q === 'full' ? 'Original art: sharpest, uses more memory' : 'Smaller art: faster on tablets (recommended)' });
    r.push({ id: 'close', label: 'Done' });
    return r;
  },

  open() { if (this.isOpen) return; this.isOpen = true; this.sel = 0; this.t = 0; this.note = ''; sfx('select'); },
  close() { if (!this.isOpen) return; this.isOpen = false; sfx('back'); },
  toggle() { if (this.isOpen) this.close(); else this.open(); },

  /** Change a row. `gesture` = we're inside a DOM key/click event. */
  activate(id, gesture = false) {
    if (id === 'sound') { unlockAudio(); if (!toggleMuted()) sfx('select'); }
    else if (id === 'full') {
      if (gesture) { shell.toggleFullscreen(); this.note = ''; }
      else if (!shell.isFullscreen()) { shell.wantFullscreen = true; shell.tryFullscreen(); this.note = 'Press any key or click to finish going full screen.'; }
      else { shell.toggleFullscreen(); }
      sfx('select');
    } else if (id === 'quality') { setImageQuality(getImageQuality() === 'full' ? 'optimized' : 'full'); sfx('select'); }
    else if (id === 'close') this.close();
  },

  init() {
    // Keyboard A on the full screen row: act inside the key event.
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || e.repeat) return;
      const row = this.rows()[this.sel];
      if (row && row.id === 'full' && A_KEYS.has(e.code)) { this.activate('full', true); this._domHandled = true; }
    });
  },

  /** Pointer press inside the DOM event; returns true if the overlay took it. */
  pointer(x, y) {
    if (!this.isOpen) return false;
    const rows = this.rows();
    rows.forEach((r, i) => {
      const b = this.rowRect(i, rows.length);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { this.sel = i; this.activate(r.id, true); }
    });
    return true; // clicks never fall through to the screen underneath
  },

  update(dt) {
    this.t += dt;
    const rows = this.rows();
    for (const c of input.humans()) {
      if (c.nav.y) { this.sel = (this.sel + c.nav.y + rows.length) % rows.length; sfx('move'); }
      const row = rows[this.sel];
      if (c.pressed('b') || c.pressed('start') || c.pressed('back')) { this.close(); return; }
      if (c.pressed('a') || (c.nav.x && row.id !== 'close')) {
        if (row.id === 'full' && this._domHandled) { this._domHandled = false; continue; }
        this.activate(row.id, false);
      }
    }
    this._domHandled = false;
    if (this.note && shell.isFullscreen()) this.note = '';
  },

  rowRect(i, n) {
    const h = 150 + n * ROW_H + 40;
    const y0 = H / 2 - h / 2 + 130;
    return { x: W / 2 - PANEL_W / 2 + 40, y: y0 + i * ROW_H, w: PANEL_W - 80, h: ROW_H - 16 };
  },

  draw(g) {
    if (!this.isOpen) return;
    const rows = this.rows();
    g.save(); g.fillStyle = 'rgba(36,22,63,0.6)'; g.fillRect(0, 0, W, H); g.restore();
    const h = 150 + rows.length * ROW_H + 40 + (this.note ? 40 : 0);
    const px = W / 2 - PANEL_W / 2, py = H / 2 - (150 + rows.length * ROW_H + 40) / 2;
    ui.panel(g, px, py, PANEL_W, h, { fill: '#fff8ec' });
    drawGear(g, px + 70, py + 68, 34, this.t);
    ui.text(g, 'Settings', W / 2, py + 68, { size: 70, color: '#ff6fb1' });
    rows.forEach((r, i) => {
      const b = this.rowRect(i, rows.length);
      const sel = i === this.sel;
      ui.panel(g, b.x, b.y, b.w, b.h, { r: 30, fill: sel ? '#ffd23f' : '#ffffff', lineWidth: sel ? 6 : 4, shadow: false });
      if (r.id === 'close') { ui.text(g, r.label, W / 2, b.y + b.h / 2 + 2, { size: 44, color: '#24163f', stroke: false, weight: 800 }); return; }
      ui.text(g, r.label, b.x + 34, b.y + (r.hint ? b.h / 2 - 12 : b.h / 2 + 2), { size: 42, align: 'left', color: '#24163f', stroke: false, weight: 800 });
      if (r.hint) ui.text(g, r.hint, b.x + 34, b.y + b.h / 2 + 26, { size: 22, align: 'left', color: '#6b5a85', stroke: false, weight: 600, maxWidth: b.w - 400 });
      // Value pill: green when on/full.
      const pw = 250, pxv = b.x + b.w - pw - 24, pyv = b.y + b.h / 2 - 32;
      ui.panel(g, pxv, pyv, pw, 64, { r: 32, fill: r.on ? '#36d17a' : '#b9b0c9', lineWidth: 4, shadow: false });
      ui.text(g, r.value, pxv + pw / 2, pyv + 34, { size: 34, weight: 800, strokeWidth: 5 });
      if (sel) ui.text(g, '◀ ▶', pxv - 50, pyv + 34, { size: 26, color: '#24163f', stroke: false });
    });
    if (this.note) ui.text(g, this.note, W / 2, py + h - 34, { size: 26, color: '#c4560f', stroke: false, weight: 700 });
    ui.hints(g, [['a', 'Change'], ['b', 'Close']], W / 2, Math.min(H - 30, py + h + 44), { size: 32 });
  },
};

export function drawGear(g, x, y, r, t = 0, hole = '#fff8ec') {
  g.save(); g.translate(x, y); g.rotate(t * 0.3);
  g.fillStyle = '#24163f';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    g.lineTo(Math.cos(a0 - 0.2) * r * 0.78, Math.sin(a0 - 0.2) * r * 0.78);
    g.lineTo(Math.cos(a0 - 0.13) * r, Math.sin(a0 - 0.13) * r);
    g.lineTo(Math.cos(a0 + 0.13) * r, Math.sin(a0 + 0.13) * r);
    g.lineTo(Math.cos(a0 + 0.2) * r * 0.78, Math.sin(a0 + 0.2) * r * 0.78);
  }
  g.closePath(); g.fill();
  g.fillStyle = hole;
  g.beginPath(); g.arc(0, 0, r * 0.36, 0, Math.PI * 2); g.fill();
  g.restore();
}
