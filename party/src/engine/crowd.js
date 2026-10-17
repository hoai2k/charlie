// Crowd helpers: keep characters from piling into one clump at 8 players.
//
//   bodyRadius(actor)        a push-apart radius that matches the drawn sprite
//                            (most games used a fixed radius far smaller than wide sprites)
//   spread(items, opts)      push overlapping items apart (each has .x / .y)
//   claimed(list, self, t)   how many OTHER CPUs already head for target t, so a CPU
//                            can prefer a free one instead of everyone chasing the nearest

/** Push-apart radius for an Actor: about half its drawn width, never below `min`. */
export function bodyRadius(actor, min = 30, k = 0.42) {
  const w = actor ? actor.width || 0 : 0;
  return Math.max(min, w * k);
}

/**
 * Push overlapping items apart, in place.
 *   radius(item) -> number   (default: bodyRadius(item.a))
 *   yScale      ground depth squash: y distances count this much more (default 1)
 *   strength    0..1 share of the overlap fixed this call (default 0.5)
 *   skip(item)  true to leave an item where it is (seated, carried, out...)
 *   bounds      { x0, x1, y0, y1 } to clamp into afterwards
 */
export function spread(items, o = {}) {
  const radius = o.radius || ((it) => bodyRadius(it.a));
  const ys = o.yScale ?? 1, k = o.strength ?? 0.5, skip = o.skip;
  for (let i = 0; i < items.length; i++) {
    const A = items[i];
    if (skip && skip(A)) continue;
    for (let j = i + 1; j < items.length; j++) {
      const B = items[j];
      if (skip && skip(B)) continue;
      const min = radius(A) + radius(B);
      let dx = B.x - A.x, dy = (B.y - A.y) * ys;
      let d = Math.hypot(dx, dy);
      if (d >= min) continue;
      if (d < 0.01) { dx = (i % 2 ? 1 : -1); dy = 0; d = 1; }   // exactly stacked: split sideways
      const push = ((min - d) / d) * k * 0.5;
      A.x -= dx * push; B.x += dx * push;
      A.y -= (dy * push) / ys; B.y += (dy * push) / ys;
    }
  }
  if (o.bounds) {
    const b = o.bounds;
    for (const it of items) {
      if (skip && skip(it)) continue;
      it.x = Math.min(b.x1, Math.max(b.x0, it.x));
      it.y = Math.min(b.y1, Math.max(b.y0, it.y));
    }
  }
}

/** How many items other than `self` have `targetOf(item) === t`. */
export function claimed(items, self, t, targetOf = (it) => it.target) {
  if (t == null) return 0;
  let n = 0;
  for (const it of items) if (it !== self && targetOf(it) === t) n++;
  return n;
}
