// Sister Party Easy mode: the stick is optional, never required.
//
// A child who only presses A is carried by each game's autopilot (it walks them to
// the next thing, and A does the action - or takes them to the nearest target). A
// child who can steer still steers: while either stick is pushed, the stick moves
// them, and the autopilot waits until they have let go for a moment.
//
//   const st = easySteer(e, ctrl, dt);
//   if (st.manual) { move by st.x / st.y like Medium }  else { autopilot }

import { glyph, NAVY } from './ui.js';
import { W } from './canvas.js';

const DEAD = 0.25;      // stick push that counts as steering
const HOLD = 1.2;       // seconds after letting go before the autopilot takes over again

/** Per frame, per Easy human. `e` is any per-player object (the helper keeps its timer on it). */
export function easySteer(e, ctrl, dt, hold = HOLD) {
  const x = ctrl.x, y = ctrl.y, m = Math.hypot(x, y);
  if (m > DEAD) e._ezSteer = hold;
  else e._ezSteer = Math.max(0, (e._ezSteer || 0) - dt);
  return { manual: e._ezSteer > 0, pushing: m > DEAD, x: m > DEAD ? x : 0, y: m > DEAD ? y : 0 };
}

/** True while this player is (or just was) steering by hand. */
export function easyManual(e) { return (e._ezSteer || 0) > 0; }

/** The nearest item to (x, y): pos(item) -> { x, y } (default: the item itself); skip(item) leaves one out. */
export function easyNearest(x, y, items, pos = (it) => it, skip = null) {
  let best = null, bd = Infinity;
  for (const it of items) {
    if (!it || (skip && skip(it))) continue;
    const p = pos(it); if (!p) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

// --- Errands: "A takes you there, then does the thing" ---------------------------------
// A press away from any target starts an errand: walk to the nearest target, then act on
// arrival. Steering with a stick cancels it (the child chose to go somewhere else).
//
//   if (A pressed && nothing in reach) easyErrand(e, target, { reach: 90, act: () => this.knock(e) });
//   const step = easyErrandStep(e, dt, { x: e.x, y: e.y, pos: (t) => ({ x: t.x, y: t.y }), steering: st.pushing });
//   if (step) { move toward step.x, step.y like the autopilot does }

/** Start (or replace) an errand. reach: arrival distance; act(): run on arrival; give up after `timeout` s. */
export function easyErrand(e, target, { reach = 80, act = null, timeout = 6, valid = null } = {}) {
  e._ezErrand = { target, reach, act, t: timeout, valid };
}

/** Per frame: returns the point to head for, or null (no errand / arrived / cancelled). */
export function easyErrandStep(e, dt, { x, y, pos = (t) => t, steering = false } = {}) {
  const E = e._ezErrand;
  if (!E) return null;
  E.t -= dt;
  if (steering || E.t <= 0 || (E.valid && !E.valid(E.target))) { e._ezErrand = null; return null; }
  const p = pos(E.target);
  if (!p) { e._ezErrand = null; return null; }
  if (Math.hypot(p.x - x, p.y - y) <= E.reach) {
    e._ezErrand = null;
    if (E.act) E.act(E.target);
    return null;
  }
  return { x: p.x, y: p.y, target: E.target };
}

/** True while an errand is under way. */
export function easyBusy(e) { return !!e._ezErrand; }

// --- The big A prompt ------------------------------------------------------------------
// One look for every Sister game: a big pulsing A with a bright halo, ringed in the
// player's colour (so several kids can tell whose is whose), with an optional fill ring
// for "hold A". Placement rule:
//   * tied to a target (the sock, the pumpkin, the kitten): beside the target, on the side
//     away from the child, and never over the child's own head or name tag;
//   * not tied to anything ("hold A to dance"): above the child, over their name tag.
//
//   easyPrompt(g, p, { target: { x, y }, child: { x, y: headTopY } })      // beside the target
//   easyPrompt(g, p, { child: { x, y: headTopY }, hold: 0.4 })             // over the child

export const EASY_PROMPT_SIZE = 86;

export function easyPrompt(g, p, { target = null, child = null, hold = null, size = EASY_PROMPT_SIZE, gap = 26 } = {}) {
  let x, y;
  if (target) {
    // beside the target, away from the child
    const side = child ? (target.x >= child.x ? 1 : -1) : 1;
    x = target.x + side * (size * 0.5 + gap);
    y = target.y - size * 0.35;
    if (x > W - size * 0.6 || x < size * 0.6) x = target.x - side * (size * 0.5 + gap);   // flip at the screen edge
    // never over the child's head or tag (the tag sits ~60 px above the head)
    if (child && Math.abs(x - child.x) < size * 0.9 && y > child.y - 110 - size * 0.5 && y < child.y + size * 0.5) {
      x = child.x + (x >= child.x ? 1 : -1) * size * 0.95;
    }
  } else if (child) {
    x = child.x; y = child.y - 70 - size * 0.55;   // over the name tag
  } else return;
  const t = performance.now() / 1000;
  const bob = Math.sin(t * 7) * 5;
  g.save();
  // bright halo, so it reads on night skies and busy art
  const halo = g.createRadialGradient(x, y + bob, size * 0.3, x, y + bob, size * 0.95);
  halo.addColorStop(0, 'rgba(255,255,255,0.85)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(x, y + bob, size * 0.95, 0, Math.PI * 2); g.fill();
  // the player's colour ring
  g.lineWidth = 9; g.strokeStyle = p && p.color ? p.color : '#ffd23f';
  g.beginPath(); g.arc(x, y + bob, size * 0.62, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.strokeStyle = NAVY;
  g.beginPath(); g.arc(x, y + bob, size * 0.62 + 5, 0, Math.PI * 2); g.stroke();
  // hold ring
  if (hold != null) {
    const f = Math.max(0, Math.min(1, hold));
    g.lineWidth = 9; g.lineCap = 'round'; g.strokeStyle = '#ffd23f';
    g.beginPath(); g.arc(x, y + bob, size * 0.78, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.stroke();
  }
  g.restore();
  glyph(g, 'a', x, y + bob, size, { pulse: true });
}
