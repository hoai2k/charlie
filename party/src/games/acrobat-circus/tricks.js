// Acrobat Circus: the shared "in the air" trick system. Every act (trampoline
// bounce, trapeze leap, tightrope hop, ball hop, pyramid leap) starts an Air
// when the acrobat leaves the ground; the stick spins flips, B (or stick down)
// tucks to spin faster, X twists, Y strikes a star. Letting go of the stick
// finishes the turn so you land on your feet. Every jump is recorded so the
// finale can replay each acrobat's best trick.
import { POSES } from '../../engine/sprites.js';
import { TAU, clamp, rand, randInt, chance } from '../../engine/util.js';
import { aiProfile, makesMistake } from '../../engine/ai.js';

export const FLIP_T = 0.62;    // seconds per flip
export const TUCK_T = 0.42;    // ... tucked
export const TWIST_T = 0.4;    // seconds per twist
export const CLEAN = 0.75;     // radians off upright that still counts as a clean landing
const REC_DT = 1 / 30;
const MAX_REC = 150;

/** The tuck pose: a dedicated 'tuck' sprite when the engine has one, else crouch. */
export const TUCK_POSE = POSES.tuck ? 'tuck' : 'crouch';

export function wrapAngle(a) { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; }

export function newAir(actor, x0, y0, extra = {}) {
  return {
    t: 0, rot: 0, dir: 0, holding: false, twistT: -1, twistQ: 0, twists: 0, stars: 0, tuckUsed: false, tuck: false,
    x0, y0, rec: [], recT: 0, h: actor.height, maxUp: 0, flipMark: 0, starT: 0, pops: 0, ...extra,
  };
}

/** Read this frame's trick input (humans and CPUs alike). */
export function airInput(c) {
  return { x: c.x, tuck: c.held('b') || c.y > 0.6, twist: c.pressed('x'), star: c.pressed('y') };
}

/**
 * Advance the spin/twist/star state. Returns events: { flip: n } when a full
 * flip completes, { twist: true }, { star: true }.
 */
export function updateAir(air, inp, dt, actor, rising) {
  const ev = {};
  air.t += dt;
  air.tuck = !!inp.tuck;
  if (air.tuck) air.tuckUsed = true;
  const rate = TAU / (air.tuck ? TUCK_T : FLIP_T);
  if (Math.abs(inp.x) > 0.45) {
    const d = Math.sign(inp.x);
    if (air.dir && d !== air.dir && Math.abs(wrapAngle(air.rot)) > 0.3) {
      // changing direction mid-turn: keep going the way you were spinning
    } else air.dir = d;
    air.holding = true;
  } else air.holding = false;
  if (air.dir) {
    const before = air.rot;
    if (air.holding) air.rot += air.dir * rate * dt;
    else {
      // let go: finish the turn you're in (so you land on your feet)
      const target = air.dir > 0 ? Math.ceil(air.rot / TAU - 0.02) * TAU : Math.floor(air.rot / TAU + 0.02) * TAU;
      const step = rate * 1.15 * dt;
      if (Math.abs(target - air.rot) <= step) { air.rot = target; air.dir = 0; } else air.rot += Math.sign(target - air.rot) * step;
    }
    const n0 = Math.floor(Math.abs(before) / TAU + 0.001), n1 = Math.floor(Math.abs(air.rot) / TAU + 0.001);
    if (n1 > n0) ev.flip = n1;
  }
  if (inp.twist) air.twistQ = Math.min(3, air.twistQ + 1);
  if (air.twistT < 0 && air.twistQ > 0) {
    air.twistQ--; air.twistT = 0;
    // the twist is her pose-twirl pose (a set without one falls back to a strike), not a paper squash
    if (air.starT <= 0) actor.playOnce('pose-twirl', TWIST_T, rising ? 'jump' : 'fall');
  }
  if (air.twistT >= 0) {
    air.twistT += dt / TWIST_T;
    if (air.twistT >= 1) { air.twistT = -1; air.twists++; ev.twist = true; }
  }
  if (inp.star) { if (!air.stars) ev.star = true; air.stars++; air.starT = 0.55; actor.playOnce('dance-star', 0.55, rising ? 'jump' : 'fall'); }
  air.starT -= dt;
  // pose
  if (air.starT <= 0) {
    if (air.tuck) actor.setPose(TUCK_POSE);
    else if (actor.pose === TUCK_POSE || actor.pose === 'idle' || actor.pose === 'jump' || actor.pose === 'fall' || actor.pose === 'balance' || actor.pose === 'walk') actor.setPose(rising ? 'jump' : 'fall');
  }
  return ev;
}

/** Horizontal stretch during a twist: a slight squeeze only (the pose-twirl
 *  frames show the turn); never squashed through zero like a sheet of paper. */
export function twistScale(air) {
  if (!air || air.twistT < 0) return 1;
  return 1 - 0.1 * Math.sin(air.twistT * Math.PI);
}

/** Record one sample (positions relative to the launch point, in actor heights). */
export function recordAir(air, x, y, actor, dt) {
  air.recT -= dt;
  air.maxUp = Math.max(air.maxUp, air.y0 - y);
  if (air.recT > 0 || air.rec.length >= MAX_REC) return;
  air.recT += REC_DT;
  air.rec.push([(x - air.x0) / air.h, (air.y0 - y) / air.h, air.rot, twistScale(air), actor.pose, actor.facing]);
}

const NUM = ['', '', 'Double ', 'Triple ', 'Quadruple ', 'Mega '];
/**
 * Score a landing. facing is the acrobat's facing (to tell front from back flips).
 * extra: { bonus, bonusName, clean (override) }
 */
export function judge(air, facing, extra = {}) {
  const off = Math.abs(wrapAngle(air.rot));
  const clean = extra.clean ?? off < CLEAN;
  const turns = Math.abs(air.rot) / TAU;
  const flips = clean ? Math.round(turns) : Math.floor(turns);
  const parts = [];
  let score = 0;
  if (flips > 0) {
    const front = Math.sign(air.rot) === facing;
    const name = flips === 1 ? (front ? 'Front Flip' : 'Backflip') : `${NUM[Math.min(flips, 5)]}${front ? 'Front Flip' : 'Backflip'}`;
    parts.push(air.tuckUsed && flips >= 2 ? name.replace('Flip', 'Tuck Flip') : name);
    score += flips * 3;
  }
  if (air.twists > 0) { parts.push(air.twists === 1 ? 'Twist' : `${NUM[Math.min(air.twists, 5)]}Twist`); score += air.twists * 2; }
  if (air.stars > 0) { parts.push('Star Jump'); score += 2; }
  if (air.pops > 0) { parts.push(air.pops > 1 ? `${air.pops} Pops` : 'Balloon Pop'); score += air.pops * 2; }
  const tricky = score > 0;
  if (clean && tricky) score += 2;
  if (extra.bonus) { score += extra.bonus; if (extra.bonusName) parts.push(extra.bonusName); }
  return { clean, flips, twists: air.twists, stars: air.stars, score, tricky, name: parts.join(' + '), rec: air.rec };
}

// ---------------------------------------------------------------------------
// CPU acrobats: plan a trick for an airtime of T seconds, then play it out.

export function planTrick(p, T) {
  const prof = aiProfile(p), lvl = p.aiLevel ?? 0;
  const tuck = chance(0.35 + lvl * 0.15);
  const ft = tuck ? TUCK_T : FLIP_T;
  const maxF = Math.max(0, Math.floor((T - 0.18) / ft));
  let flips = maxF > 0 ? randInt(Math.max(0, maxF - (lvl >= 2 ? 0 : 1)), maxF) : 0;
  if (chance(0.22 - lvl * 0.06)) flips = 0;
  let hold = flips > 0 ? flips * ft - ft * 0.55 : 0;
  if (flips > 0 && makesMistake(p)) hold += ft * rand(0.4, 0.7);   // over-spins: a wobbly landing
  const plan = { t: 0, dir: chance(0.5) ? 1 : -1, hold, tuck: tuck && flips > 0, twistAt: -1, starAt: -1, T };
  if (T > TWIST_T + 0.3 && chance(0.5 + lvl * 0.1)) plan.twistAt = rand(0.08, Math.max(0.1, T - TWIST_T - 0.2));
  if (chance(0.3 + (flips === 0 ? 0.35 : 0))) plan.starAt = rand(0.1, Math.max(0.15, T * 0.5));
  plan.reaction = prof.speed;
  return plan;
}

/** Drive the CPU's controller for this frame of its plan. */
export function playTrick(p, plan, dt) {
  const c = p.ctrl;
  const t0 = plan.t; plan.t += dt;
  c.move(plan.t < plan.hold ? plan.dir : 0, 0);
  c.hold('b', plan.tuck && plan.t < plan.hold);
  if (plan.twistAt >= 0 && t0 < plan.twistAt && plan.t >= plan.twistAt) c.press('x');
  if (plan.starAt >= 0 && t0 < plan.starAt && plan.t >= plan.starAt) c.press('y');
}

export function endTrick(p) { p.ctrl.move(0, 0); p.ctrl.hold('b', false); }

export const clampRec = (v) => clamp(v, -6, 6);
