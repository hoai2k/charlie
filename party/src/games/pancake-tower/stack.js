// Pancake Tower: the stacking rules, kept free of drawing so they are easy to
// reason about (and to simulate in node). Units are "design px" in a lane:
// the plate centre is x = 0, heights grow upward from the plate top.
//
// A dropped item lands if it overlaps the top item. Then the tower is checked
// level by level like real blocks: the centre of mass of everything above a
// level must sit over that level's support, or it all topples from there.
// Leaning one way keeps adding up; dropping the next one on the other side
// balances it again.

export const PW = 200;           // a plain pancake's width
export const PERFECT = 13;       // |offset| at or under this snaps to a perfect drop
export const PLATE_HALF = 150;   // the plate's support half-width
export const GRIP = 1.08;        // pancakes are a bit sticky: support reaches a little past the edge

// value = points it adds to the tower; support = support half-width for the
// items stacked on it (toppings squish flat and wide when covered).
export const KINDS = {
  pancake: { w: 200, h: 30, mass: 1, value: 1 },
  golden:  { w: 290, h: 32, mass: 1.15, value: 3 },
  waffle:  { w: 176, h: 40, mass: 1.1, value: 2 },
  butter:  { w: 72, h: 20, mass: 0.3, value: 1, topping: true, squishH: 9, support: 88 },
  berries: { w: 124, h: 34, mass: 0.4, value: 1, topping: true, squishH: 14, support: 92 },
  cream:   { w: 112, h: 46, mass: 0.4, value: 1, topping: true, squishH: 15, support: 92 },
};
export const TOPPINGS = ['butter', 'berries', 'cream'];

export function makeItem(kind, x = 0) {
  const k = KINDS[kind];
  return { kind, x, w: k.w, h: k.h, mass: k.mass, value: k.value, topping: !!k.topping, covered: false, syrup: false };
}

/** Effective height of an item in the tower (toppings squish once covered). */
export const itemH = (it) => (it.topping && it.covered ? KINDS[it.kind].squishH : it.h);
/** Half-width that supports what sits on it. */
export const supportHalf = (it) => (it.topping ? KINDS[it.kind].support : (it.w / 2) * GRIP);
/** Width a falling item has to overlap to land on it. */
export const catchHalf = (it) => (it.topping ? Math.max(it.w / 2, 70) : it.w / 2);

export function towerHeight(tower) { let h = 0; for (const it of tower) h += itemH(it); return h; }
export function towerValue(tower) { let v = 0; for (const it of tower) v += it.value; return v; }

/**
 * Stability of a tower: { danger 0..1+ (worst level's lean / support),
 * fail (index of the first item that falls, or -1), dir (lean direction) }.
 * The plate never gives way: the bottom pancake is buttered onto it.
 */
export function stability(tower) {
  const n = tower.length;
  let danger = 0, fail = -1, dir = 0;
  // walk down from the top, accumulating the mass above each level
  let m = 0, mx = 0;
  for (let k = n - 2; k >= 0; k--) {
    const above = tower[k + 1];
    m += above.mass; mx += above.mass * above.x;
    const com = mx / m, sup = tower[k];
    const r = Math.abs(com - sup.x) / supportHalf(sup);
    if (r > danger) { danger = r; dir = Math.sign(com - sup.x); }
    if (r > 1) { fail = k + 1; dir = Math.sign(com - sup.x); }   // keeps the lowest failing level
  }
  // the plate: report the lean but never fail
  if (n) {
    const com = (mx + tower[0].mass * tower[0].x) / (m + tower[0].mass);
    danger = Math.max(danger, Math.min(0.95, Math.abs(com) / PLATE_HALF));
  }
  return { danger, fail, dir };
}

/**
 * Drop `item` (its x already set) onto `tower`. Mutates the tower.
 * Returns { result: 'miss'|'land', perfect, sticky, fallen: [items], fallDir, dx }.
 */
export function drop(tower, item) {
  const top = tower[tower.length - 1];
  const baseX = top ? top.x : 0;
  let dx = item.x - baseX;
  const reach = top ? catchHalf(top) + item.w / 2 - 12 : PLATE_HALF + item.w / 2 - 20;
  if (Math.abs(dx) > reach) return { result: 'miss', perfect: false, sticky: false, fallen: [], fallDir: Math.sign(dx) || 1, dx };
  let perfect = false, sticky = false;
  if (top && top.syrup) { sticky = Math.abs(dx) > PERFECT; dx = 0; perfect = true; top.syrup = false; }
  else if (Math.abs(dx) <= PERFECT) { dx = 0; perfect = true; }
  if (!top) { dx = Math.abs(dx) <= PERFECT * 1.6 ? 0 : dx; perfect = dx === 0; }
  item.x = baseX + dx;
  if (top && top.topping) top.covered = true;
  tower.push(item);
  const st = stability(tower);
  let fallen = [];
  if (st.fail >= 0) fallen = tower.splice(st.fail);
  return { result: 'land', perfect, sticky, fallen, fallDir: st.dir || Math.sign(dx) || 1, dx };
}

/** Danger the tower would have with `item` dropped at x (no mutation). */
export function dangerIf(tower, item, x) {
  const top = tower[tower.length - 1];
  const baseX = top ? top.x : 0;
  let dx = x - baseX;
  if (Math.abs(dx) <= PERFECT || (top && top.syrup)) dx = 0;
  const t2 = tower.concat([{ ...item, x: baseX + dx }]);
  return stability(t2);
}

/**
 * Where a CPU wants to drop: smart = pick the spot that leaves the tower
 * steadiest (it can see the lean like a player can), else line up with the top.
 */
export function aiTarget(tower, item, smart) {
  const top = tower[tower.length - 1];
  const baseX = top ? top.x : 0;
  if (!smart || !top) return baseX;
  let best = baseX, bestScore = Infinity;
  for (let i = -10; i <= 10; i++) {
    const x = baseX + i * (catchHalf(top) * 0.09);
    const st = dangerIf(tower, item, x);
    const s = (st.fail >= 0 ? 10 : st.danger) + Math.abs(x - baseX) / 900;
    if (s < bestScore) { bestScore = s; best = x; }
  }
  return best;
}

/**
 * The shared order of items (everyone gets the same treats in the same
 * order: fair, and the golden pancake shows up for all at the same count).
 * 'syrup' is a pour, not an item.
 */
export function makeSequence(len = 80, rnd = Math.random) {
  const seq = [];
  let nextTop = 3 + Math.floor(rnd() * 2), nextWaffle = 5 + Math.floor(rnd() * 3), nextGold = 7 + Math.floor(rnd() * 3), nextSyrup = 11 + Math.floor(rnd() * 3);
  let ti = Math.floor(rnd() * 3);
  for (let i = 0; seq.length < len; i++) {
    const at = seq.length;
    if (at === nextSyrup) { seq.push('syrup'); nextSyrup += 10 + Math.floor(rnd() * 4); continue; }
    if (at === nextGold) { seq.push('golden'); nextGold += 9 + Math.floor(rnd() * 4); continue; }
    if (at === nextTop) { seq.push(TOPPINGS[ti++ % 3]); nextTop += 4 + Math.floor(rnd() * 3); continue; }
    if (at === nextWaffle) { seq.push('waffle'); nextWaffle += 6 + Math.floor(rnd() * 4); continue; }
    seq.push('pancake');
  }
  return seq;
}
