// Helpers for CPU players. CPUs drive an AIController (same interface as a
// gamepad) so minigame code treats every player the same way. Difficulty is
// player.aiLevel: 0 Easy (default - kids should usually win), 1 Normal, 2 Hard.
import { rand, chance, clamp } from './util.js';

export const AI = [
  { reaction: [0.45, 0.8], aimError: 0.35, mistake: 0.25, mashRate: 6.5, speed: 0.78, think: [0.6, 1.2] },  // Easy
  { reaction: [0.3, 0.55], aimError: 0.2, mistake: 0.12, mashRate: 8.5, speed: 0.9, think: [0.4, 0.8] },    // Normal
  { reaction: [0.18, 0.35], aimError: 0.1, mistake: 0.05, mashRate: 10.5, speed: 1.0, think: [0.25, 0.5] }, // Hard
];

/** Difficulty profile for a player. */
export const aiProfile = (p) => AI[clamp(p.aiLevel ?? 0, 0, 2)];
/** A random human-like reaction delay in seconds. */
export const reactionTime = (p) => rand(...aiProfile(p).reaction);
/** True with the player's mistake probability (use for wrong choices). */
export const makesMistake = (p) => chance(aiProfile(p).mistake);
/** Seconds between button taps when mashing. */
export const mashInterval = (p) => 1 / (aiProfile(p).mashRate * rand(0.85, 1.15));

/**
 * Steer the AI stick toward a target point. Adds wobble on easier levels and
 * slows down near the target. Returns the distance.
 */
export function steer(p, fromX, fromY, toX, toY, { arrive = 40, wobble = true } = {}) {
  const dx = toX - fromX, dy = toY - fromY;
  const d = Math.hypot(dx, dy);
  if (d < 1) { p.ctrl.move(0, 0); return d; }
  const prof = aiProfile(p);
  let a = Math.atan2(dy, dx);
  if (wobble) a += Math.sin(performance.now() / 400 + p.index * 1.7) * prof.aimError * 0.6;
  const k = clamp(d / arrive, 0, 1) * prof.speed;
  p.ctrl.move(Math.cos(a) * k, Math.sin(a) * k);
  return d;
}

/**
 * A small per-player scheduler so AI code reads naturally:
 *   this.brain = new Brain(p);  ...  if (this.brain.ready(dt)) { decide(); this.brain.wait(reactionTime(p)); }
 */
export class Brain {
  constructor(p) { this.p = p; this.t = rand(0.2, 0.6); this.mem = {}; }
  /** Counts down; true when it's time to decide again. */
  ready(dt) { this.t -= dt; return this.t <= 0; }
  wait(s) { this.t = s; }
  think() { this.t = rand(...aiProfile(this.p).think); }
}

/** Tap-mash helper: call every frame while mashing; taps `btn` at the profile rate. */
export function mash(p, dt, btn = 'a', state) {
  state.mashT = (state.mashT ?? 0) - dt;
  if (state.mashT <= 0) { p.ctrl.press(btn); state.mashT = mashInterval(p); }
}
