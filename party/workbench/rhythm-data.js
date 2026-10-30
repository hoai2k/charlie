// Rhythm Editor data (workbench/rhythm.html): charts as note lists, snapping,
// recording merges, undo, and the edits file it downloads. No DOM, so
// tools/rhythm-editor.test.mjs and tools/apply-rhythm-edits.mjs use it too.
//
// A chart is a list of notes { beat, btn } (beats from the song's first
// downbeat, btn 'a' | 'b' | 'x' | 'y'), sorted, at most one note at a time.
// In rhythm/index.json a song keeps hand-made charts as
//   "charts": { "easy": [[beat, btn], ...], "normal": [...], "hard": [...] }
// (src/games/rhythm/chart.js plays a level's list exactly as written).
//
// The edits file (Download):
//   { "format": "charlie-party-rhythm-edits", "version": 1, "exported": ISO time,
//     "songs": [{ "id", "name", "file", "bpm", "start",
//                 "charts": { "<level>": [[beat, btn], ...] },   // only the levels you changed
//                 "auto": ["<level>", ...] }] }                  // levels put back to "built from the onsets"
export const FORMAT = 'charlie-party-rhythm-edits';
export const VERSION = 1;
export const BTNS = ['a', 'b', 'x', 'y'];
export const LEVEL_IDS = ['easy', 'normal', 'hard'];
/** Snap choices: `div` grid steps per beat (0 = off). */
export const SNAPS = [
  { id: '1', label: '1/4 (beats)', div: 1 },
  { id: '2', label: '1/8', div: 2 },
  { id: '4', label: '1/16', div: 4 },
  { id: '3', label: '1/8 triplets', div: 3 },
  { id: '12', label: '1/12 beat (fine)', div: 12 },
  { id: '0', label: 'Off', div: 0 },
];
/** Two notes closer than this (beats) are the same moment: the newer one wins. */
export const SAME = 1 / 48;

export const roundBeat = (b) => Math.round(b * 10000) / 10000;
/** Snap a beat to `div` steps per beat (0 = no snap, just rounded to 1/10000). */
export function snapBeat(beat, div) {
  return roundBeat(div > 0 ? Math.round(beat * div) / div : beat);
}

/** [{beat, btn}] (any order, [beat, btn] pairs too) -> sorted, valid, one note per moment (later entries win). */
export function normalize(list) {
  const out = [];
  for (const n of list || []) {
    const beat = Array.isArray(n) ? +n[0] : +n.beat, btn = Array.isArray(n) ? n[1] : n.btn;
    if (!Number.isFinite(beat) || beat < 0 || !BTNS.includes(btn)) continue;
    const i = out.findIndex((o) => Math.abs(o.beat - beat) < SAME);
    const note = { beat: roundBeat(beat), btn };
    if (i >= 0) out[i] = note; else out.push(note);
  }
  return out.sort((a, b) => a.beat - b.beat);
}
export const toPairs = (notes) => normalize(notes).map((n) => [n.beat, n.btn]);
export const fromPairs = (pairs) => normalize(pairs);
export const sameChart = (a, b) => JSON.stringify(toPairs(a)) === JSON.stringify(toPairs(b));

/** Add (or replace the note at that moment with) a note. */
export const addNote = (notes, beat, btn) => normalize([...notes, { beat, btn }]);
/** Remove the notes at these beats. */
export function removeNotes(notes, beats) {
  return notes.filter((n) => !beats.some((b) => Math.abs(n.beat - b) < SAME));
}
/**
 * Toggle a note at `beat` (the gamepad / key edit): no note there -> add one;
 * the same button there -> remove it; another button -> change it.
 */
export function toggleNote(notes, beat, btn) {
  const at = notes.find((n) => Math.abs(n.beat - beat) < SAME);
  if (!at) return addNote(notes, beat, btn);
  if (at.btn === btn) return removeNotes(notes, [at.beat]);
  return addNote(notes, beat, btn);
}
/**
 * Move the notes at `beats` by `dBeat` (and to button `btn` if given); a moved
 * note replaces one it lands on. Notes can't go below beat 0.
 */
export function moveNotes(notes, beats, dBeat, btn = null, div = 0) {
  const moving = notes.filter((n) => beats.some((b) => Math.abs(n.beat - b) < SAME));
  const rest = removeNotes(notes, beats);
  const moved = moving.map((n) => ({ beat: Math.max(0, snapBeat(n.beat + dBeat, div)), btn: btn || n.btn }));
  return normalize([...rest, ...moved]);
}
/** Notes with from <= beat < to. */
export const inRange = (notes, from, to) => notes.filter((n) => n.beat >= from - 1e-9 && n.beat < to - 1e-9);

/**
 * Merge recorded hits ({ beat, btn }, raw beats) into a chart over [from, to):
 * hits are snapped (div per beat, 0 = off) and kept inside the range;
 * mode 'replace' first clears the range, 'merge' keeps what's there (a hit at
 * the same moment replaces that note). Two hits on one snapped moment: the
 * later press wins.
 */
export function mergeRecording(notes, hits, { from = 0, to = Infinity, mode = 'replace', div = 2 } = {}) {
  const snapped = hits
    .map((h) => ({ beat: snapBeat(h.beat, div), btn: h.btn }))
    .filter((h) => h.beat >= from - 1e-9 && h.beat < to - 1e-9 && BTNS.includes(h.btn));
  const base = mode === 'replace' ? notes.filter((n) => n.beat < from - 1e-9 || n.beat >= to - 1e-9) : notes;
  return normalize([...base, ...snapped]);
}

/** Undo / redo over snapshots (any JSON-able state). */
export class History {
  constructor(limit = 200) { this.limit = limit; this.past = []; this.future = []; }
  /** Call with the state *before* a change. */
  push(state, label = '') {
    this.past.push({ state: JSON.stringify(state), label });
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  /** Returns the state to restore (or null); `current` goes on the redo stack. */
  undo(current) {
    const p = this.past.pop();
    if (!p) return null;
    this.future.push({ state: JSON.stringify(current), label: p.label });
    return JSON.parse(p.state);
  }
  redo(current) {
    const f = this.future.pop();
    if (!f) return null;
    this.past.push({ state: JSON.stringify(current), label: f.label });
    return JSON.parse(f.state);
  }
}

/**
 * The edits file for these songs. `songs`: [{ song (index.json entry), charts:
 * { level: notes }, auto: [levels] }]: only levels that differ from the
 * game's current chart need to be in `charts`.
 */
export function makeEdits(songs, now = new Date()) {
  return {
    format: FORMAT, version: VERSION, exported: now.toISOString(),
    songs: songs.filter((s) => Object.keys(s.charts || {}).length || (s.auto || []).length).map((s) => {
      const out = { id: s.song.id, name: s.song.name, file: s.song.file, bpm: s.song.bpm, start: s.song.start, charts: {} };
      for (const lv of LEVEL_IDS) if (s.charts && s.charts[lv]) out.charts[lv] = toPairs(s.charts[lv]);
      if ((s.auto || []).length) out.auto = LEVEL_IDS.filter((lv) => s.auto.includes(lv));
      return out;
    }),
  };
}

/** Read an edits file (object or JSON text): { songs: [{ id, file, bpm, start, charts: { level: notes }, auto }], errors }. */
export function parseEdits(data) {
  const errors = [];
  let d = data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return { songs: [], errors: ['not JSON: ' + e.message] }; } }
  if (!d || typeof d !== 'object') return { songs: [], errors: ['empty file'] };
  if (d.format && d.format !== FORMAT) errors.push(`unexpected format "${d.format}"`);
  if (d.version !== VERSION) { errors.push(`unsupported version ${d.version} (this reads ${VERSION})`); return { songs: [], errors }; }
  const songs = [];
  for (const s of Array.isArray(d.songs) ? d.songs : []) {
    if (!s || typeof s.id !== 'string') { errors.push('a song without an id'); continue; }
    const charts = {};
    for (const [lv, list] of Object.entries(s.charts || {})) {
      if (!LEVEL_IDS.includes(lv)) { errors.push(`${s.id}: unknown level "${lv}"`); continue; }
      if (!Array.isArray(list)) { errors.push(`${s.id}/${lv}: not a list`); continue; }
      const bad = list.filter((n) => !Array.isArray(n) || !Number.isFinite(+n[0]) || +n[0] < 0 || !BTNS.includes(n[1])).length;
      if (bad) errors.push(`${s.id}/${lv}: ${bad} bad note(s) skipped`);
      charts[lv] = normalize(list);
    }
    const auto = (Array.isArray(s.auto) ? s.auto : []).filter((lv) => LEVEL_IDS.includes(lv));
    songs.push({ id: s.id, name: s.name, file: s.file, bpm: s.bpm, start: s.start, charts, auto });
  }
  return { songs, errors };
}

/**
 * Apply parsed edits to a rhythm/index.json object (returns a new one, the
 * input is untouched): each level in `charts` becomes the song's hand-made
 * chart; each level in `auto` is removed (back to the onsets). A song whose
 * file, bpm or start changed since the edit was made is skipped (the notes were
 * timed against other audio) unless `force`.
 * Returns { index, report: [{ id, level, action, notes, before }], warnings }.
 */
export function applyEdits(index, edits, { force = false } = {}) {
  const out = JSON.parse(JSON.stringify(index));
  const report = [], warnings = [];
  for (const e of edits.songs) {
    const song = (out.songs || []).find((s) => s.id === e.id);
    if (!song) { warnings.push(`${e.id}: no such song in rhythm/index.json, skipped`); continue; }
    const changed = [['file', e.file, song.file], ['bpm', e.bpm, song.bpm], ['start', e.start, song.start]]
      .filter(([, a, b]) => a !== undefined && a !== b && !(typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6));
    if (changed.length) {
      const why = changed.map(([k, a, b]) => `${k} ${JSON.stringify(a)} -> ${JSON.stringify(b)}`).join(', ');
      if (!force) { warnings.push(`${e.id}: the song changed since this edit (${why}); skipped (use --force to apply anyway)`); continue; }
      warnings.push(`${e.id}: the song changed since this edit (${why}); applied anyway (--force)`);
    }
    for (const lv of LEVEL_IDS) {
      if (e.charts[lv]) {
        const before = song.charts && song.charts[lv] ? song.charts[lv].length : null;
        song.charts = song.charts || {};
        song.charts[lv] = toPairs(e.charts[lv]);
        report.push({ id: e.id, level: lv, action: 'set', notes: song.charts[lv].length, before });
      } else if (e.auto.includes(lv) && song.charts && song.charts[lv]) {
        report.push({ id: e.id, level: lv, action: 'auto', notes: null, before: song.charts[lv].length });
        delete song.charts[lv];
      }
    }
    if (song.charts && !Object.keys(song.charts).length) delete song.charts;
  }
  return { index: out, report, warnings };
}
