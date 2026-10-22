// Sister Party Easy mode: the stick is optional, never required.
//
// A child who only presses A is carried by each game's autopilot (it walks them to
// the next thing, and A does the action - or takes them to the nearest target). A
// child who can steer still steers: while either stick is pushed, the stick moves
// them, and the autopilot waits until they have let go for a moment.
//
//   const st = easySteer(e, ctrl, dt);
//   if (st.manual) { move by st.x / st.y like Medium }  else { autopilot }

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
