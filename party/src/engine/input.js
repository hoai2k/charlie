// Unified input: Xbox (standard mapping) gamepads are first-class; two keyboard
// layouts and the pointer are fallbacks. Every input source - including AI
// players - is a Controller with the same interface, so minigames never care
// who is driving a player.
//
//   ctrl.x, ctrl.y        left stick / d-pad / WASD, each in [-1, 1] (y down = +1)
//   ctrl.rx, ctrl.ry      right stick
//   ctrl.held('a')        button is down       (a b x y lb rb lt rt back start ls rs up down left right)
//   ctrl.pressed('a')     went down this frame
//   ctrl.released('a')    went up this frame
//   ctrl.nav              {x, y} in {-1,0,1}: menu steps with auto-repeat
//   ctrl.rumble(0..1, ms)
//   ctrl.inject('a')      press a button next frame (mouse clicks on menu hints)
//
//   input.pointerOver(rect)  pointer is over {x, y, w, h} (logical coords); shows a hand cursor
//   input.clicked(rect)      ...and was pressed this frame

import { toLogical } from './canvas.js';

export const BUTTONS = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'back', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
const PAD_INDEX = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, back: 8, start: 9, ls: 10, rs: 11, up: 12, down: 13, left: 14, right: 15 };

const KB_LAYOUTS = {
  kb1: {
    label: 'Keyboard (WASD + Space)',
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    a: ['Space', 'KeyJ'], b: ['KeyK', 'KeyQ'], x: ['KeyL', 'KeyE'], y: ['KeyI', 'KeyR'],
    lb: ['KeyZ'], rb: ['KeyC'], lt: ['Digit1'], rt: ['Digit3'],
    start: ['Escape', 'Tab'], back: ['Backquote'],
  },
  kb2: {
    label: 'Keyboard (Arrows + Enter)',
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    a: ['Enter', 'NumpadEnter', 'Numpad0'], b: ['Backspace', 'ShiftRight', 'Numpad1'],
    x: ['Slash', 'Numpad2'], y: ['Quote', 'Numpad3'],
    lb: ['Comma'], rb: ['Period'], lt: ['Numpad4'], rt: ['Numpad6'],
    start: ['KeyP', 'Pause'], back: ['Backslash'],
  },
};

const keysDown = new Set();
const MAPPED_CODES = new Set(Object.values(KB_LAYOUTS).flatMap((l) =>
  Object.entries(l).filter(([k]) => k !== 'label').flatMap(([, v]) => v)));

const DEADZONE = 0.22;
function deadzone(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEADZONE) return [0, 0];
  const k = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m;
  return [x * k, y * k];
}

function emptyState() {
  // Axes use lx/ly so they can't collide with the 'x'/'y' buttons.
  const s = { lx: 0, ly: 0, rx: 0, ry: 0 };
  for (const b of BUTTONS) s[b] = false;
  return s;
}

export class Controller {
  constructor(id, kind, label) {
    this.id = id;          // 'pad0', 'kb1', 'ai3' ...
    this.kind = kind;      // 'pad' | 'kb' | 'ai'
    this.label = label;
    this.cur = emptyState();
    this.prev = emptyState();
    this.nav = { x: 0, y: 0 };
    this._navHeld = { x: 0, y: 0, t: 0 };
    this.connected = true;
    this.lastActive = 0;
    this._inject = new Set();
  }
  get isAI() { return this.kind === 'ai'; }
  get x() { return this.cur.lx; }
  get y() { return this.cur.ly; }
  get rx() { return this.cur.rx; }
  get ry() { return this.cur.ry; }
  held(b) { return !!this.cur[b]; }
  pressed(b) { return !!this.cur[b] && !this.prev[b]; }
  released(b) { return !this.cur[b] && !!this.prev[b]; }
  anyPressed() {
    for (const b of BUTTONS) if (this.pressed(b)) return b;
    return null;
  }
  /** Any face/shoulder/start button (ignores d-pad) - used for "press any button". */
  anyButtonPressed() {
    for (const b of ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'start', 'back', 'ls', 'rs']) if (this.pressed(b)) return b;
    return null;
  }
  /** Override in subclasses: fill `s` with the current raw state. */
  poll(s) {} // eslint-disable-line no-unused-vars
  update(dt, now) {
    const t = this.prev; this.prev = this.cur; this.cur = t;
    const s = this.cur;
    for (const b of BUTTONS) s[b] = false;
    s.lx = s.ly = s.rx = s.ry = 0;
    this.poll(s);
    for (const b of this._inject) s[b] = true;
    this._inject.clear();
    // D-pad also drives the move axes.
    if (s.left) s.lx = -1; if (s.right) s.lx = 1;
    if (s.up) s.ly = -1; if (s.down) s.ly = 1;
    if (this.anyPressed() || Math.abs(s.lx) > 0.5 || Math.abs(s.ly) > 0.5) this.lastActive = now;
    this._updateNav(dt);
  }
  _updateNav(dt) {
    const dir = (v) => (v > 0.5 ? 1 : v < -0.5 ? -1 : 0);
    const dx = dir(this.cur.lx), dy = dir(this.cur.ly);
    // Pick the dominant axis so diagonals don't double-step.
    let nx = dx, ny = dy;
    if (dx && dy) { if (Math.abs(this.cur.lx) >= Math.abs(this.cur.ly)) ny = 0; else nx = 0; }
    const h = this._navHeld;
    this.nav.x = 0; this.nav.y = 0;
    if (nx !== h.x || ny !== h.y) {
      h.x = nx; h.y = ny; h.t = 0;
      this.nav.x = nx; this.nav.y = ny;
    } else if (nx || ny) {
      h.t += dt;
      if (h.t > 0.38) { h.t -= 0.11; this.nav.x = nx; this.nav.y = ny; }
    }
  }
  /** Press `b` for one frame, starting next frame (as if the player tapped it). */
  inject(b) { this._inject.add(b); }
  rumble() {}
}

class PadController extends Controller {
  constructor(index, gpId) {
    super('pad' + index, 'pad', 'Controller ' + (index + 1));
    this.index = index;
    this.gpId = gpId;
  }
  pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    return pads[this.index] || null;
  }
  poll(s) {
    const p = this.pad();
    this.connected = !!(p && p.connected);
    if (!this.connected) return;
    const bt = p.buttons;
    for (const b of BUTTONS) {
      const btn = bt[PAD_INDEX[b]];
      if (btn) s[b] = btn.pressed || btn.value > 0.5;
    }
    // Guide/home button acts as start on some browsers.
    if (bt[16] && bt[16].pressed) s.start = true;
    const ax = p.axes;
    [s.lx, s.ly] = deadzone(ax[0] || 0, ax[1] || 0);
    [s.rx, s.ry] = deadzone(ax[2] || 0, ax[3] || 0);
  }
  rumble(strength = 0.5, ms = 120) {
    const p = this.pad();
    const act = p && p.vibrationActuator;
    if (!act || !act.playEffect) return;
    try {
      act.playEffect(act.type || 'dual-rumble', {
        duration: ms, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 0.7),
      }).catch(() => {});
    } catch (e) { /* unsupported */ }
  }
}

class KeyboardController extends Controller {
  constructor(name) {
    super(name, 'kb', KB_LAYOUTS[name].label);
    this.layout = KB_LAYOUTS[name];
  }
  poll(s) {
    for (const b of BUTTONS) {
      const codes = this.layout[b];
      if (codes && codes.some((c) => keysDown.has(c))) s[b] = true;
    }
  }
}

/**
 * Virtual controller driven by AI code. Minigame AI calls these each update:
 *   ai.move(x, y)       set stick (persistent until changed)
 *   ai.press('a')       tap a button (down for exactly one frame)
 *   ai.hold('a', true)  keep a button down
 */
export class AIController extends Controller {
  constructor(n) {
    super('ai' + n, 'ai', 'CPU');
    this._axis = { x: 0, y: 0 };
    this._hold = new Set();
    this._tap = new Set();
  }
  move(x, y) {
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    this._axis.x = x; this._axis.y = y;
  }
  press(b) { this._tap.add(b); }
  hold(b, on = true) { if (on) this._hold.add(b); else this._hold.delete(b); }
  reset() { this._axis.x = this._axis.y = 0; this._hold.clear(); this._tap.clear(); }
  poll(s) {
    s.lx = this._axis.x; s.ly = this._axis.y;
    for (const b of this._hold) s[b] = true;
    // A tap is down for one frame; tapping every frame looks like holding, so
    // mash AI should leave at least one frame between taps.
    for (const b of this._tap) s[b] = true;
    this._tap.clear();
  }
}

// ---------------------------------------------------------------------------

class InputManager {
  constructor() {
    this.pads = [];                // PadController by gamepad index
    this.keyboards = [new KeyboardController('kb1'), new KeyboardController('kb2')];
    this.ais = new Set();
    // moved: moved this frame. seen: a mouse/touch has been over the canvas.
    // hot: something under the pointer is clickable (hand cursor).
    this.pointer = { x: 0, y: 0, down: false, pressed: false, released: false, moved: false, seen: false, hot: false, _pd: false, _pu: false, _mv: false };
    this.now = 0;
    this.lastDeviceKind = 'pad';
    this.onUserGesture = null;     // called synchronously inside real DOM gestures
    this.onPointerButton = null;   // (x, y) => true if an overlay button took the click
  }

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (MAPPED_CODES.has(e.code) || e.code === 'F11') {
        if (e.code !== 'F11') e.preventDefault();
      }
      keysDown.add(e.code);
      this.lastDeviceKind = 'kb';
      this.onUserGesture && this.onUserGesture('key');
    });
    window.addEventListener('keyup', (e) => { keysDown.delete(e.code); });
    window.addEventListener('blur', () => keysDown.clear());
    const p = this.pointer;
    const setPos = (e) => { const l = toLogical(e.clientX, e.clientY); p.x = l.x; p.y = l.y; p._mv = true; p.seen = true; };
    canvas.addEventListener('pointerdown', (e) => {
      setPos(e);
      // Overlay buttons (sound / fullscreen) act right here, inside the
      // gesture, and the click never reaches the scene.
      const took = this.onPointerButton && this.onPointerButton(p.x, p.y);
      if (!took) { p.down = true; p._pd = true; }
      this.onUserGesture && this.onUserGesture('pointer');
    });
    window.addEventListener('pointermove', setPos);
    window.addEventListener('pointerup', (e) => { setPos(e); p.down = false; p._pu = true; });
    window.addEventListener('gamepadconnected', () => { this.lastDeviceKind = 'pad'; });
    // Legacy Edge on Xbox: stop the controller from driving a mouse cursor.
    try { if ('gamepadInputEmulation' in navigator) navigator.gamepadInputEmulation = 'gamepad'; } catch (e) { /* ignore */ }
  }

  update(dt) {
    this.now += dt;
    const raw = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < raw.length; i++) {
      const gp = raw[i];
      if (gp && gp.connected && !this.pads[i]) this.pads[i] = new PadController(i, gp.id);
      // A different pad plugged into the same slot gets a fresh controller.
      if (gp && this.pads[i] && this.pads[i].gpId !== gp.id) this.pads[i] = new PadController(i, gp.id);
    }
    for (const c of this.pads) if (c) c.update(dt, this.now);
    for (const c of this.keyboards) c.update(dt, this.now);
    for (const c of this.ais) c.update(dt, this.now);
    for (const c of this.pads) if (c && c.anyPressed()) this.lastDeviceKind = 'pad';

    const p = this.pointer;
    p.pressed = p._pd; p.released = p._pu; p.moved = p._mv; p._pd = p._pu = p._mv = false;
    p.hot = false;
  }

  pointerOver(r) {
    const p = this.pointer;
    const over = p.seen && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (over) p.hot = true;
    return over;
  }
  clicked(r) { return this.pointerOver(r) && this.pointer.pressed; }

  /** Human controllers that exist right now (connected pads + both keyboard layouts). */
  humans() {
    return [...this.pads.filter((c) => c && c.connected), ...this.keyboards];
  }
  connectedPadCount() { return this.pads.filter((c) => c && c.connected).length; }

  /** First human controller that pressed one of `buttons` this frame (or any button if omitted). */
  firstPressed(buttons) {
    for (const c of this.humans()) {
      if (buttons) { for (const b of buttons) if (c.pressed(b)) return c; }
      else if (c.anyButtonPressed()) return c;
    }
    return null;
  }
  /** True if any human pressed `b` this frame. */
  anyHumanPressed(b) { return this.humans().some((c) => c.pressed(b)); }

  createAI(n) { const c = new AIController(n); this.ais.add(c); return c; }
  releaseAI(c) { this.ais.delete(c); }
}

export const input = new InputManager();
