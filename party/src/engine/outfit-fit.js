// Outfit fit adjustments: small per sprite set / pose / frame / slot / item
// nudges (offset, rotation, scale) on top of the landmark-based placement in
// outfits.js. The data lives in data/outfit-fit.js (made with the workbench,
// party/workbench/, and tools/apply-workbench-edits.mjs).
//
//   outfitFit(asset, frame, slot, itemId) -> { dx, dy, rot (radians), scale } | null
//     frame: { pose, index } of the frame being drawn (attachment info.frame), or null
//   adjustSlot(at, adj) -> { x, y, rot, S } with the adjustment applied
//   setOutfitFit(entries)  replace the table (the workbench previews edits with it)
import { OUTFIT_FIT } from '../data/outfit-fit.js';

const DEG = Math.PI / 180;
let table = new Map();   // `${set}|${slot}` -> entries, most specific first
let entries = [];

const num = (v, d) => (Number.isFinite(v) ? v : d);
const level = (e) => (e.pose === '*' ? 0 : e.frame === '*' ? 2 : 4) + (e.item === '*' ? 0 : 1);

/** Replace the adjustment table with these entries (data/outfit-fit.js format). */
export function setOutfitFit(list) {
  entries = Array.isArray(list) ? list.filter((e) => e && e.set && e.slot) : [];
  table = new Map();
  for (const e of entries) {
    const pose = e.pose ?? '*';
    const n = {
      pose, frame: pose === '*' || e.frame == null ? '*' : e.frame, item: e.item ?? '*',
      adj: { dx: num(e.dx, 0), dy: num(e.dy, 0), rot: num(e.rot, 0) * DEG, scale: num(e.scale, 1) > 0 ? num(e.scale, 1) : 1 },
    };
    const k = `${e.set}|${e.slot}`;
    if (!table.has(k)) table.set(k, []);
    table.get(k).push(n);
  }
  for (const l of table.values()) l.sort((a, b) => level(b) - level(a));
}
setOutfitFit(OUTFIT_FIT);

/** The current table entries (as given to setOutfitFit). */
export const outfitFitEntries = () => entries;

/** The adjustment for one item on one frame, or null. */
export function outfitFit(asset, frame, slot, itemId = null) {
  const list = table.get(`${asset}|${slot}`);
  if (!list) return null;
  const pose = frame ? frame.pose : null, index = frame ? frame.index : null;
  for (const e of list) {
    if (e.item !== '*' && e.item !== itemId) continue;
    if (e.pose !== '*' && e.pose !== pose) continue;
    if (e.frame !== '*' && e.frame !== index) continue;
    return e.adj;
  }
  return null;
}

/** Apply an adjustment to a slot placement { x, y, rot, S }: offsets in S along the slot's own axes. */
export function adjustSlot(at, adj) {
  if (!adj) return at;
  const r = at.rot || 0, c = Math.cos(r), s = Math.sin(r), ox = adj.dx * at.S, oy = adj.dy * at.S;
  return { ...at, x: at.x + ox * c - oy * s, y: at.y + ox * s + oy * c, rot: r + adj.rot, S: at.S * adj.scale };
}
