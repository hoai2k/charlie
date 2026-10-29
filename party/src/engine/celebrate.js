// Celebrate on the move: the owner's rule is that celebration and ending scenes (a game's
// finale, the gallery that keeps its last screen up) let the kids walk and jump about when
// it's possible. It doesn't have to last: it just has to be possible.
//
//   // per frame, per human, in the finale / postUpdate:
//   const m = celebrateWalk(a, ctrl, dt, { x0: 80, x1: W - 80, y0: 700, y1: 980 }, { ended: this.api.ended() });
//   if (m.landed) puff some sparkles at a.x, a.y
//
// The stick walks (inside `bounds`; y0 === y1, or no y0/y1, keeps her on one line), B dashes
// (engine/dash.js), and the jump button hops her up on a.z (gravity, squash on take-off and
// landing, the jump pose in the air). The jump is A while the game is still on (`ended`
// false) and X always: in the play scene's 'gallery' state A leaves the game, so there only
// X jumps (Gingerbread House's village: A jumps only before the gallery). When she stops,
// she goes back to `o.rest` (the game's celebrating pose) or else the pose she had before she
// set off (cheer, dance, wave...).
// CPUs: don't call it; they keep their own bounce / dance.
// It moves `pos` (default the actor itself: pass the game's per-player object when the game
// copies e.x / e.y onto the actor each frame). It owns a.z while it runs: a game that sets
// a.z itself shouldn't call it for that player at the same time.
import { sfx } from './audio.js';
import { particles } from './particles.js';
import { Dash } from './dash.js';
import { clamp } from './util.js';

const DEAD = 0.2;
const MOVE_POSES = new Set(['walk', 'run', 'jump', 'fall', 'dash']);

/**
 * @param a       Actor
 * @param ctrl    the player's controller
 * @param bounds  { x0, x1, y0, y1 } the floor she may walk on
 * @param o       { ended, speed = 380, ySpeed = 0.7 (of speed), jumpV = 780, gravity = 2600,
 *                  scale = 1 (speeds and jump height), pos = a, jump = ['a'?, 'x'] buttons,
 *                  dash = true, dust = '#ffffff', ok = true (false: stand still this frame),
 *                  rest (the pose when standing still) }
 * @returns { moving, jumped, landed, air, x, y } (x, y: where she stands)
 */
export function celebrateWalk(a, ctrl, dt, bounds = {}, o = {}) {
  const S = a._cel || (a._cel = { vz: 0, rest: null, dash: o.dash === false ? null : new Dash({ color: o.dust || '#ffffff' }) });
  const pos = o.pos || a, k = o.scale ?? 1;
  const speed = (o.speed ?? 380) * k, ySpeed = speed * (o.ySpeed ?? 0.7);
  const ok = o.ok !== false;
  const flat = bounds.y0 == null || bounds.y1 == null || bounds.y0 === bounds.y1;
  let mx = ok && Math.abs(ctrl.x) > DEAD ? ctrl.x : 0, my = ok && !flat && Math.abs(ctrl.y) > DEAD ? ctrl.y : 0;
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  const moving = m > DEAD;
  const buttons = o.jump || (o.ended ? ['x'] : ['a', 'x']);
  const jumped = ok && a.z <= 0 && S.vz <= 0 && buttons.some((b) => ctrl.pressed(b));
  // remember the pose she was celebrating in, to go back to when she stops
  if ((moving || jumped) && !MOVE_POSES.has(a.pose) && !a._once) S.rest = a.pose;
  const d = S.dash ? S.dash.update(dt, ok ? ctrl : null, { x: pos.x, y: pos.y, actor: a }) : { x: 0, y: 0 };
  pos.x += mx * speed * dt + d.x;
  if (!flat) pos.y += my * ySpeed * dt + d.y;
  if (bounds.x0 != null) pos.x = clamp(pos.x, bounds.x0, bounds.x1);
  if (!flat) pos.y = clamp(pos.y, bounds.y0, bounds.y1);
  if (jumped) { S.vz = (o.jumpV ?? 780) * Math.sqrt(k); a.squash(-0.22); sfx('jump', { vol: 0.35 }); }
  let landed = false;
  if (a.z > 0 || S.vz > 0) {
    S.vz -= (o.gravity ?? 2600) * dt;
    a.z = Math.max(0, a.z + S.vz * dt);
    if (a.z <= 0) {
      if (S.vz < -200) a.squash(0.18);
      S.vz = 0; landed = true;
      particles.burst(pos.x, pos.y - 4, { type: 'dust', count: 4, color: o.dust || '#ffffff', speed: [60, 160], size: [8, 14] });
    }
  }
  const air = a.z > 0;
  if (Math.abs(mx) > 0.15) a.facing = mx > 0 ? 1 : -1;   // turn at once (no paper flips)
  if (air) { if (!a._once && a.pose !== 'jump') a.setPose('jump'); }
  else if (moving) a.moveAnim(mx * speed, my * ySpeed, speed);
  else if (o.rest) a.setPose(o.rest);   // (setPose keeps a one-shot playing and doesn't restart a pose)
  else if (!a._once && MOVE_POSES.has(a.pose)) a.setPose(S.rest || 'idle');
  return { moving, jumped, landed, air, x: pos.x, y: pos.y };
}

<<<<<<< HEAD
=======
/** True while this actor is mid-celebration-jump (or dashing): a game's own idle bounce should wait. */
export function celebrating(a) { return !!(a._cel && (a.z > 0 || a._cel.vz > 0 || (a._cel.dash && a._cel.dash.active))); }

>>>>>>> origin/main
/**
 * Just the jump, for a game whose finale already walks the kids about (its own a.z, e.g. a
 * flier's hover, stays the game's): call per frame with whether the jump button went down,
 * and add the returned z on top of the game's own a.z. Sets the jump pose in the air and
 * squashes on take-off and landing.
 *   const h = celebrateHop(a, !p.isAI && ctrl.pressed('x'), dt);   a.z = myZ + h.z;
 */
export function celebrateHop(a, jump, dt, o = {}) {
  const S = a._hop || (a._hop = { z: 0, vz: 0 });
  const k = o.scale ?? 1;
  let jumped = false, landed = false;
  if (jump && S.z <= 0 && S.vz <= 0) { S.vz = (o.jumpV ?? 780) * Math.sqrt(k); a.squash(-0.22); sfx('jump', { vol: 0.35 }); jumped = true; }
  if (S.z > 0 || S.vz > 0) {
    S.vz -= (o.gravity ?? 2600) * dt;
    S.z = Math.max(0, S.z + S.vz * dt);
    if (S.z <= 0) { if (S.vz < -200) a.squash(0.18); S.vz = 0; landed = true; }
  }
  if (S.z > 0 && !a._once && a.pose !== 'jump') a.setPose('jump');
  return { z: S.z, air: S.z > 0, jumped, landed };
}
