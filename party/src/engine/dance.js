// Shared dance helper: a character doing the real-time dance moves (the move data is
// Dance Studio's `DANCES` in games/dance-studio/stage.js: disco, star jump, hula, twirl,
// cartwheel, can-can, splits, moonwalk). Used by Dance Along (opposite-ballet); it is the
// same motion as Dance Studio's own Dancer class, taking the move object instead of its
// index, so Dance Studio can switch to it with `perform(DANCES[i], beatDur)`.
//
// No "paper flips" (the owner's rule): a twirl is the pose-twirl art, never a squash
// through scaleX 0; a change of side switches facing at once.
import { W } from './canvas.js';
import { getSpriteSet, POSES } from './sprites.js';
import { clamp, ease, TAU } from './util.js';

/** The best pose this character has for a move: the first in the list its sprite set has
 *  (so new dance-* art is picked up the moment it lands), else the first the engine knows. */
export function pickPose(actor, list) {
  const set = getSpriteSet(actor.leader.asset);
  if (set) { for (const p of list) if (set.poses[p]) return p; }
  for (const p of list) if (POSES[p]) return p;
  return list[list.length - 1];
}

/**
 * A dancing character: an Actor plus the motion each move adds (hops, twirls, cartwheels,
 * kicks, hula sways, splits, moonwalks). hx/hy = home (feet) position; with canTravel a
 * cartwheel / moonwalk really carries the dancer along (within minX..maxX), else it is
 * done on the spot.
 */
export class Dancer {
  constructor(actor) {
    this.a = actor;
    this.hx = actor.x; this.hy = actor.y;
    this.mv = null; this.u = 0; this.dur = 0.5; this.dir = 1;
    this.rot = 0; this.dx = 0; this.z = 0; this.ksx = 1; this.ksy = 1; this.pivot = 0;
    this.baseFacing = 1; this.side = 1; this.lastId = null; this.extraZ = 0;
    this.canTravel = false; this.minX = 0; this.maxX = W;
  }
  get busy() { return !!this.mv; }
  /** Do move M (a DANCES entry) for its beats at `beatDur` seconds a beat. */
  perform(M, beatDur) {
    const a = this.a;
    this.side = M.mirror && this.lastId === M.id ? -this.side : 1;
    this.lastId = M.id;
    this.mv = M; this.u = 0;
    this.dur = Math.max(0.45, M.beats * beatDur);
    this.dir = this.baseFacing * this.side;
    a.facing = this.dir;
    this.pose = pickPose(a, M.poses);
    a.playOnce(this.pose, this.dur * 0.97, 'idle');
    a.squash(M.drop ? (this.hasArt ? 0.12 : 0.3) : -0.15);
  }
  /** Stop the current move at once (e.g. for a bow). */
  stop() { if (this.mv) { this.mv = null; this.a.facing = this.baseFacing; } }
  /** Is this move drawn with its own dance-* art? Then the stand-in motion (the cartwheel's
   *  spin, the can-can's hops, the splits' stretch) stays off: the picture already does it. */
  get hasArt() {
    const M = this.mv;
    return !!M && this.pose === M.poses[0] && !!getSpriteSet(this.a.leader.asset)?.poses[this.pose];
  }
  update(dt, beat = 0) {
    const a = this.a;
    let z = 0; this.rot = 0; this.dx = 0; this.ksx = 1; this.ksy = 1; this.pivot = 0;
    const M = this.mv;
    if (M) {
      this.u += dt / this.dur;
      const k = Math.min(1, this.u), s = Math.sin(k * Math.PI), h = a.height, d = this.dir;
      const art = this.hasArt;
      // the starfish art is airborne already: only a little float on top of it
      if (M.hop) z = s * h * (art && M.artHop != null ? M.artHop : M.hop);
      if (M.lean) this.rot += s * M.lean * d * (art ? 0.5 : 1);
      if (M.roll && !art) {
        // stand-in cartwheel: a whole turn about the middle, upside down halfway
        this.rot = ease.inOutQuad(k) * TAU * d; this.pivot = 0.5; z = s * h * 0.12;
      }
      if (M.travel) {
        if (this.canTravel) this.hx = clamp(this.hx + (d * M.travel * dt) / this.dur, this.minX, this.maxX);
        else this.dx = s * Math.min(40, h * 0.25) * d;
      }
      if (M.glide) {
        // moonwalk: facing forward, sliding backward
        if (this.canTravel) this.hx = clamp(this.hx - (d * M.glide * dt) / this.dur, this.minX, this.maxX);
        else this.dx = -s * Math.min(36, h * 0.22) * d;
        if (!art) this.rot -= s * 0.1 * d;
      }
      if (M.kick) {
        // two kicks: one leg then the other (facing switches at once halfway)
        a.facing = k < 0.5 ? d : -d;
        if (!art) {
          const kk = Math.abs(Math.sin(k * TAU));
          z = kk * h * 0.07; this.rot += Math.sin(k * TAU) * 0.08;
        }
      }
      if (M.sway) { const w = Math.sin(k * TAU * 2); this.rot += w * M.sway; this.dx += w * h * 0.06; }
      if (M.drop && !art) {
        const e = k < 0.15 ? ease.outBack(k / 0.15) : k > 0.85 ? (1 - k) / 0.15 : 1;
        this.ksx = 1 + 0.22 * e; this.ksy = 1 - 0.2 * e;
      }
      if (this.u >= 1) { this.mv = null; a.facing = this.baseFacing; }
    } else {
      // a little groove on the beat between moves
      z = Math.abs(Math.sin(beat * Math.PI)) * a.height * 0.025;
    }
    this.z = z;
    a.x = this.hx + this.dx; a.y = this.hy; a.z = z + (this.extraZ || 0);
    a.update(dt);
  }
  /** The move's rotation / stretch, about the feet or (cartwheel) the middle. */
  transform(g) {
    const a = this.a;
    if (!this.rot && this.ksx === 1 && this.ksy === 1) return;
    const py = a.y - a.z - a.height * this.pivot;
    g.translate(a.x, py); g.rotate(this.rot); g.scale(this.ksx, this.ksy); g.translate(-a.x, -py);
  }
  draw(g, opts = {}) {
    const a = this.a;
    if (!this.rot && this.ksx === 1 && this.ksy === 1) { a.draw(g, opts); return; }
    // the ring stays flat on the floor while the body turns
    if (opts.ring) a._drawRing(g, opts.ring, a.scale, opts.alpha ?? 1);
    g.save(); this.transform(g); a.draw(g, { ...opts, ring: null, shadow: false }); g.restore();
  }
}
