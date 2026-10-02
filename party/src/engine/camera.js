// 2.5D camera for minigames: smooth pan/zoom, punch-ins for big moments,
// a fly-in on the countdown and a zoom toward the winner at FINISH.
//
// Opt-in: a game that implements drawHUD(g) has its draw(g) rendered through
// api.camera (world space), and drawHUD(g) drawn on top in screen space.
// Games without drawHUD are drawn exactly as before.
//
//   api.camera.follow(x, y, zoom)      ease toward a framing (call each frame or once)
//   api.camera.punch(x, y, 1.3, 0.6)   quick dramatic zoom on a moment, then back
//   api.camera.frame(points, pad)      fit a set of {x, y} (e.g. all players) on screen
//   api.camera.reset()
//   api.camera.toScreen(x, y) / toWorld(x, y)
//
// depthScale(y) gives top-down arenas a 2.5D feel: things further up the
// screen (further away) draw a little smaller.
import { W, H } from './canvas.js';
import { clamp, damp, ease } from './util.js';

export class Camera {
  constructor() { this.reset(); }
  reset() {
    this.x = W / 2; this.y = H / 2; this.zoom = 1; this.rot = 0;
    this.tx = W / 2; this.ty = H / 2; this.tzoom = 1; this.rate = 5;
    this.punchState = null;
    this.minZoom = 1; this.maxZoom = 2.2; // host lowers maxZoom for big parties
    this.clampToStage = true;
    return this;
  }
  /** Ease toward a framing. `rate` ~ how snappy (per second). */
  follow(x, y, zoom = this.tzoom, rate = 5) { this.tx = x; this.ty = y; this.tzoom = Math.min(zoom, this.maxZoom); this.rate = rate; return this; }
  /** Fit points (with padding) on screen, never zooming out past 1. */
  frame(points, pad = 220, rate = 3) {
    if (!points.length) return this;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const z = clamp(Math.min(W / (x1 - x0 + pad * 2), H / (y1 - y0 + pad * 2)), this.minZoom, this.maxZoom);
    return this.follow((x0 + x1) / 2, (y0 + y1) / 2, z, rate);
  }
  /** Temporary zoom on a point: in fast, hold, back out. */
  punch(x, y, zoom = 1.3, hold = 0.6) {
    this.punchState = { x, y, zoom: Math.min(zoom, this.maxZoom), hold, t: 0, inDur: 0.18, outDur: 0.45 };
    return this;
  }
  /** Start zoomed-in and settle to the normal framing (countdown fly-in). */
  flyIn(fromZoom = 1.18, x = W / 2, y = H / 2 + 60) { this.x = x; this.y = y; this.zoom = fromZoom; this.rate = 2.2; return this; }

  update(dt) {
    this.x = damp(this.x, this.tx, this.rate, dt);
    this.y = damp(this.y, this.ty, this.rate, dt);
    this.zoom = damp(this.zoom, this.tzoom, this.rate, dt);
  }
  /** Effective view after any punch is blended in. */
  view() {
    let { x, y, zoom } = this;
    const p = this.punchState;
    if (p) {
      const total = p.inDur + p.hold + p.outDur;
      const k = p.t < p.inDur ? ease.outCubic(p.t / p.inDur)
        : p.t < p.inDur + p.hold ? 1 : 1 - ease.inOutQuad((p.t - p.inDur - p.hold) / p.outDur);
      x += (p.x - x) * k; y += (p.y - y) * k; zoom += (p.zoom - zoom) * k;
      if (p.t >= total) this.punchState = null;
    }
    if (this.clampToStage && zoom >= 1) {
      // Keep the stage edges on screen (no empty void past the world bounds).
      const hw = W / 2 / zoom, hh = H / 2 / zoom;
      x = clamp(x, hw, W - hw); y = clamp(y, hh, H - hh);
    }
    return { x, y, zoom };
  }
  tickPunch(dt) { if (this.punchState) this.punchState.t += dt; }
  apply(g) {
    const v = this.view();
    g.translate(W / 2, H / 2);
    g.scale(v.zoom, v.zoom);
    if (this.rot) g.rotate(this.rot);
    g.translate(-v.x, -v.y);
  }
  get isIdentity() { const v = this.view(); return Math.abs(v.zoom - 1) < 0.002 && Math.abs(v.x - W / 2) < 0.5 && Math.abs(v.y - H / 2) < 0.5; }
  toScreen(x, y) { const v = this.view(); return { x: (x - v.x) * v.zoom + W / 2, y: (y - v.y) * v.zoom + H / 2 }; }
  toWorld(x, y) { const v = this.view(); return { x: (x - W / 2) / v.zoom + v.x, y: (y - H / 2) / v.zoom + v.y }; }
}

/**
 * 2.5D depth scale for top-down arenas: 1 at y = near, `far` at y = top.
 * Multiply actor.scale (and shadow/collision visuals) by this.
 */
export function depthScale(y, { top = 150, near = 1000, far = 0.82, nearScale = 1.05 } = {}) {
  const t = clamp((y - top) / (near - top), 0, 1);
  return far + (nearScale - far) * t;
}
