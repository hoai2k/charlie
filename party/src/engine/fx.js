// Screen-level effects: camera shake, color flashes, hit-stop and slow motion.
//   fx.shake(18, 0.3)   fx.flash('#fff', 0.2)   fx.hitstop(0.06)   fx.slowmo(0.4, 1)
import { rand } from './util.js';

class FX {
  constructor() { this.reset(); }
  reset() {
    this.shakeAmt = 0; this.shakeT = 0; this.shakeDur = 0;
    this.flashColor = '#fff'; this.flashT = 0; this.flashDur = 0;
    this.stopT = 0; this.slowT = 0; this.slowScale = 1;
    this.ox = 0; this.oy = 0;
  }
  shake(amount = 12, dur = 0.25) {
    if (amount >= this.shakeAmt * (this.shakeT / (this.shakeDur || 1))) { this.shakeAmt = amount; this.shakeT = dur; this.shakeDur = dur; }
  }
  flash(color = '#ffffff', dur = 0.18) { this.flashColor = color; this.flashT = dur; this.flashDur = dur; }
  hitstop(dur = 0.05) { this.stopT = Math.max(this.stopT, dur); }
  slowmo(scale = 0.35, dur = 0.8) { this.slowScale = scale; this.slowT = dur; }
  /** Returns the dt the game world should use this frame. */
  timeScale(dt) {
    if (this.stopT > 0) { this.stopT -= dt; return 0; }
    if (this.slowT > 0) { this.slowT -= dt; return dt * this.slowScale; }
    return dt;
  }
  update(dt) {
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT / this.shakeDur);
      this.ox = rand(-1, 1) * this.shakeAmt * k; this.oy = rand(-1, 1) * this.shakeAmt * k;
    } else { this.ox = this.oy = 0; }
    if (this.flashT > 0) this.flashT -= dt;
  }
  drawFlash(g, w, h) {
    if (this.flashT <= 0) return;
    g.save(); g.globalAlpha = Math.max(0, this.flashT / this.flashDur) * 0.7;
    g.fillStyle = this.flashColor; g.fillRect(0, 0, w, h); g.restore();
  }
}
export const fx = new FX();
