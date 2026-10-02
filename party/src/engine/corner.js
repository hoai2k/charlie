// Sound, fullscreen and settings buttons in the bottom-left corner of the menu screens
// (and the pause menu). Clicks are handled inside the DOM pointerdown via
// input.onPointerButton, because fullscreen only works inside a real gesture.
//   M toggles sound, F toggles fullscreen, O (or a controller's View button)
//   opens Settings (engine/settings.js), which also has these and image quality.
import { H } from './canvas.js';
import { input } from './input.js';
import { isMuted, toggleMuted, unlockAudio, sfx } from './audio.js';
import { shell } from './shell.js';
import { settings, drawGear } from './settings.js';
import { NAVY } from './ui.js';
import { TAU } from './util.js';

const SIZE = 78, PAD = 24, GAP = 18;

export const corner = {
  visible: false,
  _press: 0,      // seconds of "pressed" squash left
  _pressId: null,

  buttons() {
    const y = H - PAD - SIZE / 2;
    const list = [{ id: 'sound', x: PAD + SIZE / 2, y }];
    if (shell.canFullscreen()) list.push({ id: 'full', x: PAD + SIZE * 1.5 + GAP, y });
    list.push({ id: 'settings', x: PAD + SIZE / 2 + list.length * (SIZE + GAP), y });
    return list;
  },

  hit(x, y) {
    if (!this.visible) return null;
    return this.buttons().find((b) => Math.hypot(x - b.x, y - b.y) <= SIZE / 2 + 6) || null;
  },

  /** Run a button; call inside a user gesture. */
  activate(id) {
    if (id === 'sound') {
      unlockAudio();
      if (!toggleMuted()) sfx('select');
    } else if (id === 'full') {
      shell.toggleFullscreen();
      sfx('select');
    } else if (id === 'settings') {
      settings.toggle();
    }
    this._press = 0.15; this._pressId = id;
  },

  init(canvas) {
    settings.init();
    input.onPointerButton = (x, y) => {
      if (settings.isOpen && !this.hit(x, y)) return settings.pointer(x, y);
      const b = this.hit(x, y);
      if (b) this.activate(b.id);
      return !!b;
    };
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyM') this.activate('sound');
      else if (e.code === 'KeyF' && shell.canFullscreen()) this.activate('full');
      else if (e.code === 'KeyO' && (this.visible || settings.isOpen)) this.activate('settings');
    });
    this.canvas = canvas;
  },

  /** Per frame, after scenes.update: hand cursor over anything clickable. */
  update(dt) {
    this._press = Math.max(0, this._press - dt);
    const p = input.pointer;
    const over = p.seen && this.hit(p.x, p.y);
    if (over) p.hot = true;
    this.hover = over ? over.id : null;
    if (this.canvas) {
      const cur = p.hot ? 'pointer' : '';
      if (this.canvas.style.cursor !== cur) this.canvas.style.cursor = cur;
    }
  },

  draw(g) {
    if (!this.visible) return;
    for (const b of this.buttons()) {
      const hover = this.hover === b.id;
      const k = this._pressId === b.id && this._press > 0 ? 0.9 : hover ? 1.08 : 1;
      g.save();
      g.translate(b.x, b.y); g.scale(k, k);
      const r = SIZE / 2;
      g.fillStyle = 'rgba(36,22,63,0.3)';
      g.beginPath(); g.arc(3, 6, r, 0, TAU); g.fill();
      g.fillStyle = hover ? '#ffd23f' : '#ffffff';
      g.strokeStyle = NAVY; g.lineWidth = 6;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
      if (b.id === 'sound') drawSpeaker(g, isMuted());
      else if (b.id === 'full') drawFullscreen(g, shell.isFullscreen());
      else drawGear(g, 0, 0, 24, 0, hover ? '#ffd23f' : '#ffffff');
      g.restore();
    }
  },
};

function drawSpeaker(g, muted) {
  g.fillStyle = NAVY; g.strokeStyle = NAVY; g.lineCap = 'round'; g.lineJoin = 'round';
  // Speaker body + cone.
  g.beginPath();
  g.moveTo(-20, -8); g.lineTo(-10, -8); g.lineTo(2, -19); g.lineTo(2, 19); g.lineTo(-10, 8); g.lineTo(-20, 8);
  g.closePath(); g.fill();
  g.lineWidth = 5;
  if (muted) {
    g.strokeStyle = '#ff4d6d';
    g.beginPath(); g.moveTo(9, -10); g.lineTo(23, 10); g.moveTo(23, -10); g.lineTo(9, 10); g.stroke();
  } else {
    g.beginPath(); g.arc(4, 0, 10, -0.8, 0.8); g.stroke();
    g.beginPath(); g.arc(4, 0, 19, -0.85, 0.85); g.stroke();
  }
}

function drawFullscreen(g, isFull) {
  // Four corner brackets: pointing out = go fullscreen, pointing in = leave.
  g.strokeStyle = NAVY; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  const o = 18, l = 10;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    g.beginPath();
    if (isFull) {
      // corner at (sx*7, sy*7), arms pointing outward
      const cx = sx * 7, cy = sy * 7;
      g.moveTo(cx + sx * l, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * l);
    } else {
      const cx = sx * o, cy = sy * o;
      g.moveTo(cx - sx * l, cy); g.lineTo(cx, cy); g.lineTo(cx, cy - sy * l);
    }
    g.stroke();
  }
}

