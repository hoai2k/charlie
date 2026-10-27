// B = dash: a short, gentle burst for games where the left stick walks you around the
// scene (the owner's rule: B dashes there unless the game already uses B for something).
//
//   e.dash = new Dash();                                    // per player
//   // in the player's move step, before the position is clamped:
//   const d = e.dash.update(dt, ctrl, { x: e.x, y: e.y, facing: a.facing, actor: a, ok: !this.done });
//   e.x += d.x; e.y += d.y;
//
// The burst goes the way the stick points (or the way you face when it's idle), covers
// `dist` px over `time` s while easing out (fast start, soft stop: never disorienting),
// then waits `cooldown` s. It only adds a nudge to the position, so the game's own
// walking, bounds and collisions stay as they are. It never moves anyone for them in
// Sister Party Easy (no autopilot, no errands): it's the child's own press, in her
// own direction. CPUs don't press B, so they never dash unless a game asks them to.
import { sfx } from './audio.js';
import { particles } from './particles.js';

export const DASH_DIST = 170, DASH_TIME = 0.2, DASH_CD = 1.0;
const DEAD = 0.25;

export class Dash {
  /**
   * dist/time/cooldown: the burst. yScale: squash vertical bursts in a scene seen at an angle.
   * axis: 'xy' (top-down walking) or 'x' (side-on: left / right only).
   * color: dust puff colour. pose: the one-shot pose (falls back to 'run' via the sprite set).
   */
  constructor({ dist = DASH_DIST, time = DASH_TIME, cooldown = DASH_CD, yScale = 0.8, axis = 'xy', button = 'b', color = '#ffffff', pose = 'dash', vol = 0.5 } = {}) {
    Object.assign(this, { dist, time, cooldown, yScale, axis, button, color, pose, vol });
    this.t = 0; this.cd = 0; this.dx = 1; this.dy = 0;
  }
  get active() { return this.t > 0; }
  get ready() { return this.cd <= 0 && this.t <= 0; }
  /** Stop a dash early (stunned, grabbed, round over...). Keeps the cooldown. */
  cancel() { this.t = 0; }

  /** Begin a dash now (no button check). sx/sy: stick; facing: used when the stick is idle. */
  start({ sx = 0, sy = 0, facing = 1, x = null, y = null, actor = null, quiet = false } = {}) {
    let dx = sx, dy = this.axis === 'x' ? 0 : sy;
    const m = Math.hypot(dx, dy);
    if (m > DEAD) { dx /= m; dy /= m; } else { dx = facing >= 0 ? 1 : -1; dy = 0; }
    this.dx = dx; this.dy = dy * this.yScale;
    this.t = this.time; this.cd = this.cooldown;
    if (actor) {
      if (Math.abs(dx) > 0.2) actor.facing = dx > 0 ? 1 : -1;
      actor.playOnce(this.pose, Math.min(0.32, this.time + 0.1));
      actor.squash(0.18);
    }
    if (x != null && y != null) {
      particles.burst(x, y - 6, { type: 'dust', count: 7, color: this.color, angle: Math.atan2(-this.dy, -this.dx), spread: 0.7, speed: [70, 200], size: [10, 18] });
    }
    if (!quiet) sfx('dash', { vol: this.vol });
    return true;
  }

  /**
   * Per frame: counts down, starts a dash on a B press when `ok` and ready, and returns the
   * extra { x, y } displacement for this frame (0, 0 when not dashing).
   */
  update(dt, ctrl, { x = null, y = null, facing = 1, actor = null, ok = true, sx, sy } = {}) {
    this.cd = Math.max(0, this.cd - dt);
    if (ok && ctrl && this.ready && ctrl.pressed(this.button)) {
      this.start({ sx: sx ?? ctrl.x, sy: sy ?? ctrl.y, facing: actor ? actor.facing : facing, x, y, actor });
      if (ctrl.rumble) ctrl.rumble(0.2, 60);
    }
    if (this.t <= 0) return { x: 0, y: 0 };
    // speed falls off linearly to 0: the distance left is dist * (t / time)^2
    const u0 = this.t / this.time;
    this.t = Math.max(0, this.t - dt);
    const u1 = this.t / this.time;
    const s = this.dist * (u0 * u0 - u1 * u1);
    return { x: this.dx * s, y: this.dy * s };
  }
}
