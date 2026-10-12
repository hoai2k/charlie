// Workbench edit session: landmark moves and outfit fit adjustments, with
// undo/redo, and the versioned JSON file format (see README.md).
//
//   landmarks: key "set|pose|frame|point" -> { set, pose, frame, src, point, from, to }
//   items:     key "set|pose|frame|slot|item" -> { set, pose, frame, src?, slot, item, dx, dy, rot, scale }
// An undoable step is a transaction: begin(), any number of set(), commit().
// Values are replaced, never mutated, so before/after snapshots stay valid.

export const FORMAT = 'charlie-party-workbench-edits';
export const VERSION = 1;
export const POINTS = ['anchor', 'head', 'eyes', 'neck', 'back', 'hand'];
export const SLOTS = ['head', 'face', 'neck', 'back', 'hand', 'aura'];

export const lmKey = (e) => `${e.set}|${e.pose}|${e.frame}|${e.point}`;
export const itemKey = (e) => `${e.set}|${e.pose}|${e.frame}|${e.slot}|${e.item}`;
export const IDENTITY = Object.freeze({ dx: 0, dy: 0, rot: 0, scale: 1 });
export const samePt = (a, b) => (a == null && b == null) || (Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1]);
const r4 = (v) => Math.round(v * 10000) / 10000;

export class Session {
  constructor(onChange = () => {}) {
    this.maps = { landmarks: new Map(), items: new Map() };
    this.undoStack = [];
    this.redoStack = [];
    this.tx = null;
    this.onChange = onChange;   // (changes: [{ kind, key, before, after }], reason) after every change
  }

  get count() { return this.maps.landmarks.size + this.maps.items.size; }
  get(kind, key) { return this.maps[kind].get(key); }
  entries(kind) { return [...this.maps[kind].values()]; }

  _put(kind, key, val) {
    if (val === undefined) this.maps[kind].delete(key);
    else this.maps[kind].set(key, val);
  }

  /** Start an undoable step (merge: steps with the same merge key within a second fold into one, e.g. nudges). */
  begin(label, merge = null) {
    if (this.tx) this.commit();
    this.tx = { label, merge, changes: new Map() };
  }
  /** Change one entry inside the current step (undefined removes it). */
  set(kind, key, val) {
    const own = !this.tx;
    if (own) this.begin('Edit');
    const id = kind + '\n' + key;
    if (!this.tx.changes.has(id)) this.tx.changes.set(id, { kind, key, before: this.get(kind, key) });
    this._put(kind, key, val);
    this.onChange([{ kind, key, before: undefined, after: val }], 'live');
    if (own) this.commit();
  }
  commit() {
    const tx = this.tx;
    this.tx = null;
    if (!tx) return null;
    const changes = [...tx.changes.values()].map((c) => ({ ...c, after: this.get(c.kind, c.key) }))
      .filter((c) => !sameEntry(c.before, c.after));
    if (!changes.length) return null;
    const now = Date.now(), top = this.undoStack[this.undoStack.length - 1];
    if (tx.merge && top && top.merge === tx.merge && now - top.time < 1000 && !this.redoStack.length) {
      for (const c of changes) {
        const old = top.changes.find((o) => o.kind === c.kind && o.key === c.key);
        if (old) old.after = c.after; else top.changes.push(c);
      }
      top.time = now;
    } else {
      this.undoStack.push({ label: tx.label, merge: tx.merge, time: now, changes });
      if (this.undoStack.length > 500) this.undoStack.shift();
    }
    this.redoStack = [];
    this.onChange(changes, 'commit');
    return changes;
  }
  /** Abandon the current step, restoring what it changed. */
  cancel() {
    const tx = this.tx;
    this.tx = null;
    if (!tx) return;
    const changes = [...tx.changes.values()];
    for (const c of changes) this._put(c.kind, c.key, c.before);
    this.onChange(changes.map((c) => ({ ...c, after: c.before })), 'cancel');
  }
  undo() {
    if (this.tx) this.commit();
    const step = this.undoStack.pop();
    if (!step) return null;
    for (const c of step.changes) this._put(c.kind, c.key, c.before);
    this.redoStack.push(step);
    this.onChange(step.changes.map((c) => ({ ...c, before: c.after, after: c.before })), 'undo');
    return step;
  }
  redo() {
    if (this.tx) this.commit();
    const step = this.redoStack.pop();
    if (!step) return null;
    for (const c of step.changes) this._put(c.kind, c.key, c.after);
    this.undoStack.push(step);
    this.onChange(step.changes, 'redo');
    return step;
  }

  /** The edits file (README.md): landmarks that differ from their originals and every item fit set this session. */
  toJSON(meta = {}) {
    const lm = this.entries('landmarks').filter((e) => !samePt(e.from, e.to))
      .map((e) => ({ set: e.set, pose: e.pose, frame: e.frame, src: e.src ?? null, point: e.point, from: e.from, to: e.to }));
    const items = this.entries('items').map((e) => {
      const o = { set: e.set, pose: e.pose, frame: e.frame };
      if (e.src) o.src = e.src;
      Object.assign(o, { slot: e.slot, item: e.item, dx: r4(e.dx), dy: r4(e.dy), rot: r4(e.rot), scale: r4(e.scale) });
      return o;
    });
    const byKey = (a, b) => cmp(a.set, b.set) || cmp(a.pose, b.pose) || cmp(a.frame, b.frame) || cmp(a.point ?? a.slot, b.point ?? b.slot) || cmp(a.item ?? '', b.item ?? '');
    return {
      format: FORMAT, version: VERSION, saved: new Date().toISOString(), ...meta,
      units: {
        landmarks: 'frame pixels of the original (full-size) frame image; from = value in sprites.json when edited',
        items: 'dx, dy in units of the slot size S along the slot\'s own axes (+x toward facing, +y down); rot in degrees; scale multiplier',
      },
      landmarks: lm.sort(byKey),
      items: items.sort(byKey),
    };
  }
}

const cmp = (a, b) => (a === b ? 0 : typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : 1);
function sameEntry(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => (Array.isArray(a[k]) ? samePt(a[k], b[k]) : a[k] === b[k]));
}

const isPt = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const isFrame = (f) => f === '*' || (Number.isInteger(f) && f >= 0);

/**
 * Check an edits file. Returns { landmarks, items, errors } with only the
 * valid entries (errors describe the rest).
 */
export function parseEdits(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return { landmarks: [], items: [], errors: ['Not a JSON object'] };
  if (data.format && data.format !== FORMAT) errors.push(`Unknown format "${data.format}"`);
  if (data.version !== VERSION) return { landmarks: [], items: [], errors: [...errors, `Unsupported version ${data.version} (expected ${VERSION})`] };
  const landmarks = [], items = [];
  (Array.isArray(data.landmarks) ? data.landmarks : []).forEach((e, i) => {
    const bad = !e || typeof e.set !== 'string' || typeof e.pose !== 'string' || !Number.isInteger(e.frame) || e.frame < 0
      || !POINTS.includes(e.point) || !(e.from === null || isPt(e.from)) || !isPt(e.to);
    if (bad) { errors.push(`landmarks[${i}] is invalid`); return; }
    landmarks.push({ set: e.set, pose: e.pose, frame: e.frame, src: e.src ?? null, point: e.point, from: e.from, to: [Math.round(e.to[0]), Math.round(e.to[1])] });
  });
  (Array.isArray(data.items) ? data.items : []).forEach((e, i) => {
    const okNums = ['dx', 'dy', 'rot', 'scale'].every((k) => e && (e[k] === undefined || Number.isFinite(e[k])));
    const bad = !e || typeof e.set !== 'string' || typeof e.pose !== 'string' || !isFrame(e.frame) || !SLOTS.includes(e.slot)
      || typeof e.item !== 'string' || !okNums || (e.pose === '*' && e.frame !== '*') || (e.scale !== undefined && e.scale <= 0);
    if (bad) { errors.push(`items[${i}] is invalid`); return; }
    items.push({ set: e.set, pose: e.pose, frame: e.frame, ...(e.src ? { src: e.src } : {}), slot: e.slot, item: e.item, dx: e.dx ?? 0, dy: e.dy ?? 0, rot: e.rot ?? 0, scale: e.scale ?? 1 });
  });
  return { landmarks, items, errors };
}

/** The edits file as text: pretty, with one landmark or item entry per line. */
export function formatEdits(data) {
  const one = (e) => JSON.stringify(e).replace(/,"/g, ', "').replace(/":/g, '": ').replace(/,(?=-?\d)/g, ', ');
  const keys = Object.keys(data), out = ['{'];
  keys.forEach((k, i) => {
    const comma = i < keys.length - 1 ? ',' : '', v = data[k];
    if (Array.isArray(v)) {
      if (!v.length) { out.push(`  ${JSON.stringify(k)}: []${comma}`); return; }
      out.push(`  ${JSON.stringify(k)}: [`);
      v.forEach((e, j) => out.push('    ' + one(e) + (j < v.length - 1 ? ',' : '')));
      out.push(`  ]${comma}`);
    } else out.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v, null, 2).replace(/\n/g, '\n  ')}${comma}`);
  });
  return out.join('\n') + '\n}\n';
}
