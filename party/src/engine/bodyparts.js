// Body map: things stuck onto a character's body (bows, stickers, dress-up
// items) that ride every frame of every pose.
//
// Every sprite frame carries body-part points (sprites.json, measured by
// tools/sprites/bodymap.py on top of the authored landmarks). An Actor's
// attachment `info` (see sprites.js) has them in forward space (+x = the way
// the character faces, -y up, px) as info.parts. Placing an item stores it
// relative to the nearest part:
//
//   const spot = placeOnBody(info, { x, y }, { rot });    // where it was put
//   ...later, any frame / pose / facing:
//   const at = bodySpot(info, spot);    // { x, y, rot } in that frame's forward space
//
// A spot is plain JSON: { part, x, y, rot, a0, alt: [{ part, x, y, rot, a0 }] }.
// x, y are the offset from the part in body heights (the member's h), in the
// part's own turned frame; rot is the item's turn relative to the part; a0 is
// the part's direction when it was placed. When a frame doesn't show the part
// (an ear turned away), the first alternative it does show is used, each
// measured in the same frame the item was placed in, so nothing jumps.

/** Every body part, in rough head-to-toe order. */
export const BODY_PARTS = ['head', 'eyes', 'earFront', 'earBack', 'neck', 'back', 'belly', 'hand', 'tail', 'footFront', 'footBack'];

// A part turns with the line between two parts (from -> to): the head group
// with neck -> head, the torso with belly -> neck, the tail with belly -> tail.
const AXIS = {
  head: ['neck', 'head'], eyes: ['neck', 'head'], earFront: ['neck', 'head'], earBack: ['neck', 'head'],
  neck: ['belly', 'neck'], back: ['belly', 'neck'], belly: ['belly', 'neck'], tail: ['belly', 'tail'],
};
// Where an item goes when its part isn't in a frame, nearest first.
const FALLBACK = {
  head: ['eyes', 'earFront', 'earBack', 'neck'], eyes: ['head', 'neck'],
  earFront: ['earBack', 'head', 'eyes'], earBack: ['earFront', 'head', 'eyes'],
  neck: ['eyes', 'back', 'belly'], back: ['belly', 'neck'], belly: ['back', 'neck'],
  hand: ['neck', 'belly'], tail: ['back', 'belly'],
  footFront: ['footBack', 'belly'], footBack: ['footFront', 'belly'],
};
const DEAD_ZONE = 0.08;   // radians: landmark wobble between frames is not a turn

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const rotate = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });

/** The part's point and direction in this frame ({ x, y, a }), or null when the frame doesn't show it. */
export function partFrame(info, name) {
  const parts = info.parts || info, p = parts[name];
  if (!p) return null;
  const ax = AXIS[name], from = ax && parts[ax[0]], to = ax && parts[ax[1]];
  let a = info.headAngle && ax && ax[1] === 'head' ? info.headAngle : 0;
  if (from && to && from !== to && Math.hypot(to.x - from.x, to.y - from.y) > 0.02 * (info.h || 100)) a = Math.atan2(to.y - from.y, to.x - from.x);
  return { x: p.x, y: p.y, a };
}

/** The body part nearest a forward-space point: { part, d } (d in px), or null. parts: limit the choice. */
export function nearestPart(info, pt, { parts = BODY_PARTS } = {}) {
  let best = null;
  for (const name of parts) {
    const p = (info.parts || info)[name];
    if (!p) continue;
    const d = Math.hypot(p.x - pt.x, p.y - pt.y);
    if (!best || d < best.d) best = { part: name, d };
  }
  return best;
}

function offsetFrom(info, name, pt, rot) {
  const f = partFrame(info, name);
  if (!f) return null;
  const h = info.h || 1, o = rotate(pt.x - f.x, pt.y - f.y, -f.a);
  return { part: name, x: o.x / h, y: o.y / h, rot: rot - f.a, a0: f.a };
}

/**
 * Stick something on at forward-space point pt (turned rot radians), on the
 * nearest part (or opts.part). Returns the spot (plain JSON), or null if the
 * frame has no parts at all.
 */
export function placeOnBody(info, pt, { rot = 0, part = null, parts = BODY_PARTS } = {}) {
  const name = part || nearestPart(info, pt, { parts })?.part;
  const main = name && offsetFrom(info, name, pt, rot);
  if (!main) return null;
  const alt = [];
  for (const n of FALLBACK[name] || []) {
    const o = offsetFrom(info, n, pt, rot);
    if (o) alt.push(o);
  }
  return { ...main, alt };
}

/** Where a spot is in this frame: { x, y, rot, part } in forward space, or null. */
export function bodySpot(info, spot) {
  if (!spot) return null;
  const h = info.h || 1;
  for (const s of [spot, ...(spot.alt || [])]) {
    const f = partFrame(info, s.part);
    if (!f) continue;
    // Turn with the part, past a small dead zone (so a still pet's bow doesn't wobble).
    let turn = wrap(f.a - s.a0);
    turn = Math.abs(turn) <= DEAD_ZONE ? 0 : turn - Math.sign(turn) * DEAD_ZONE;
    const a = s.a0 + turn, o = rotate(s.x * h, s.y * h, a);
    return { x: f.x + o.x, y: f.y + o.y, rot: s.rot + a, part: s.part };
  }
  return null;
}

/** A spot moved to a new forward-space point (a dragged bow), keeping its turn. */
export function moveOnBody(info, spot, pt, opts = {}) {
  const at = bodySpot(info, spot);
  return placeOnBody(info, pt, { ...opts, rot: at ? at.rot : 0 });
}
