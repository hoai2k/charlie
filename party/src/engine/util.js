// Small math + random helpers shared by every scene and minigame.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const approach = (v, target, step) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);
/** Frame-rate independent exponential smoothing: move `rate` fraction per second. */
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const TAU = Math.PI * 2;

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// Random helpers (Math.random based; good enough for a party game).
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1)); // inclusive
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Turn per-player scores into placements (1 = best). Ties share a place.
 * `higherIsBetter` false for things like finish times.
 */
export function placementsFromScores(scores, higherIsBetter = true) {
  return scores.map((s) => 1 + scores.filter((o) => (higherIsBetter ? o > s : o < s)).length);
}

/** Simple countdown/timer object: `t.update(dt)` returns true once when it fires. */
export class Timer {
  constructor(seconds) { this.left = seconds; this.total = seconds; this.done = false; }
  update(dt) {
    if (this.done) return false;
    this.left -= dt;
    if (this.left <= 0) { this.left = 0; this.done = true; return true; }
    return false;
  }
  get progress() { return 1 - this.left / this.total; }
}

/** Tiny tween manager. `tweens.to(obj, {x: 10}, 0.5, ease.outBack)` */
export class Tweens {
  constructor() { this.list = []; }
  to(obj, props, dur, easeFn = ease.outQuad, delay = 0) {
    const from = {};
    for (const k in props) from[k] = obj[k];
    const tw = { obj, props, from, dur, ease: easeFn, t: -delay, done: false, onDone: null };
    this.list.push(tw);
    return { then: (fn) => { tw.onDone = fn; } };
  }
  update(dt) {
    for (const tw of this.list) {
      tw.t += dt;
      if (tw.t < 0) continue;
      const p = Math.min(1, tw.t / tw.dur);
      const e = tw.ease(p);
      for (const k in tw.props) tw.obj[k] = lerp(tw.from[k], tw.props[k], e);
      if (p >= 1) { tw.done = true; tw.onDone && tw.onDone(); }
    }
    this.list = this.list.filter((t) => !t.done);
  }
  clear() { this.list = []; }
}
