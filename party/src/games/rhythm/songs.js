// Rhythm-game songs (Pop Star Stage, Spotlight Dance-Off): the recorded songs
// in assets/audio/music/rhythm/index.json, each with a 16th-note grid of
// measured onset strengths (kick, snare, melody) and the lead's pitch, taken
// from the song itself (see audio-requests.md §12). Charts are built from that
// grid, so the notes follow the song's beats and melody, scaled by difficulty.
import { registerMusic } from '../../engine/audio.js';
import { session } from '../../state.js';
import { pick } from '../../engine/util.js';

let songs = null, loading = null;

/** Load the song list once (resolves to [] when there are no songs yet). */
export function loadRhythmSongs() {
  if (!loading) {
    loading = fetch('assets/audio/music/rhythm/index.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        songs = ((j && j.songs) || []).filter((s) => s.file && s.bpm > 0 && s.grid && s.grid.steps > 0);
        for (const s of songs) registerMusic(musicKey(s), { file: s.file, loopStart: s.loopStart || 0, loopEnd: s.loopEnd, bpm: s.bpm });
        return songs;
      })
      .catch(() => { songs = []; return songs; });
  }
  return loading;
}
export const rhythmSongs = () => songs || [];
export const musicKey = (song) => 'rhythm:' + song.id;

export const LEVELS = ['Easy', 'Normal', 'Hard'];

// Per-game choices, kept for the session: { song: id | 'random', level: 0..2 }.
export function rhythmChoice(gameId) {
  session.gameOptions = session.gameOptions || {};
  return (session.gameOptions[gameId] = session.gameOptions[gameId] || { song: 'random', level: 0 });
}
/** The song to play for this game (random picks a different one than last time). */
export function chooseSong(gameId) {
  const list = rhythmSongs(), c = rhythmChoice(gameId);
  if (!list.length) return null;
  const fixed = list.find((s) => s.id === c.song);
  if (fixed) return fixed;
  const pool = list.length > 1 ? list.filter((s) => s.id !== c.last) : list;
  const s = pick(pool);
  c.last = s.id;
  return s;
}

/** Song options for the how-to screen (games' meta.options). */
export function rhythmOptions(gameId, { level = true } = {}) {
  const opts = [{
    id: 'song', label: 'Song',
    choices: () => { loadRhythmSongs(); return [{ value: 'random', label: 'Surprise me!' }, ...rhythmSongs().map((s) => ({ value: s.id, label: s.name }))]; },
    get: () => rhythmChoice(gameId).song,
    set: (v) => { rhythmChoice(gameId).song = v; },
  }];
  if (level) opts.push({
    id: 'level', label: 'Notes',
    choices: () => LEVELS.map((l, i) => ({ value: i, label: l })),
    get: () => rhythmChoice(gameId).level,
    set: (v) => { rhythmChoice(gameId).level = v; },
  });
  return opts;
}

/** Song length in beats for a ~65 s game: whole bars, plus a 2-beat tail. */
export function songLength(bpm) { return Math.round((65 * bpm) / 60 / 4) * 4 + 2; }

// --- chart building ------------------------------------------------------------
// Buttons low -> high (A green, B red, X blue, Y yellow): the lead's pitch going
// up moves to a higher button, down to a lower one, so presses trace the tune.
const ORDER = ['a', 'b', 'x', 'y'];
const LEVEL = [
  // grid: which 16th steps may hold notes (4 = quarters, 2 = eighths, 1 = sixteenths)
  // gap: minimum beats between notes; perBar: [warm-up, A+B, all, finale] notes per bar cap
  { grid: 4, gap: 1, perBar: [2, 3, 3, 4], thresh: 0.22 },
  { grid: 2, gap: 0.5, perBar: [3, 4, 5, 6], thresh: 0.2 },
  { grid: 2, gap: 0.5, perBar: [4, 6, 7, 8], thresh: 0.16, sixteenths: true },
];

/**
 * Notes [{ beat, btn, gold }] for `song` at difficulty `level` over `total`
 * beats, from beat 4 on. phases = { ab, all, boss } (beats): A only before
 * `ab`, A+B before `all`, then all four; notes from `boss` on are golden.
 */
export function buildChart(song, level, total, phases) {
  const L = LEVEL[Math.max(0, Math.min(2, level | 0))];
  const g = song.grid, steps = g.steps, div = g.div || 4;
  const at = (arr, s) => (arr && arr[s % steps]) || 0;
  const notes = [];
  let lastBeat = -9, btnIdx = 0, lastPitch = null;
  for (let bar = 1; bar * 4 < total - 2; bar++) {
    const beat0 = bar * 4;
    const phase = beat0 < phases.ab ? 0 : beat0 < phases.all ? 1 : beat0 < phases.boss ? 2 : 3;
    const allowed = phase === 0 ? 1 : phase === 1 ? 2 : 4;
    // Score every allowed step of this bar from the song's onsets.
    const cands = [];
    for (let k = 0; k < 4 * div; k++) {
      const s = bar * 4 * div + k;
      const onGrid = k % L.grid === 0 || (L.sixteenths && phase >= 2 && k % 1 === 0);
      if (!onGrid) continue;
      const mel = at(g.melody, s), kick = at(g.kick, s), snare = at(g.snare, s);
      let score = Math.max(mel, snare * 0.85, kick * 0.7) + (k % div === 0 ? 0.12 : 0) + (k % (2 * div) === 0 ? 0.05 : 0);
      if (k % L.grid !== 0) score -= 0.15;    // off-grid sixteenths only when strong
      if (score >= L.thresh) cands.push({ k, beat: beat0 + k / div, score, mel, s });
    }
    // Strongest first, respecting the per-bar cap and the minimum gap.
    cands.sort((a, b) => b.score - a.score);
    const chosen = [];
    for (const c of cands) {
      if (chosen.length >= L.perBar[phase]) break;
      const gap = c.k % L.grid === 0 ? L.gap : 0.25;
      if (chosen.some((o) => Math.abs(o.beat - c.beat) < gap - 1e-6)) continue;
      chosen.push(c);
    }
    // Warm-up bars are never empty: at least the downbeat.
    if (!chosen.length && phase === 0) chosen.push({ beat: beat0, s: bar * 4 * div, mel: 0 });
    chosen.sort((a, b) => a.beat - b.beat);
    for (const c of chosen) {
      if (c.beat - lastBeat < 0.25 - 1e-6) continue;
      // Button from the melody contour (repeat = same button), else drums.
      const p = g.pitch ? g.pitch[c.s % steps] : null;
      if (p != null && lastPitch != null && c.mel > 0.2) {
        if (p > lastPitch + 0.5) btnIdx++;
        else if (p < lastPitch - 0.5) btnIdx--;
      } else if (p == null) {
        btnIdx = at(g.snare, c.s) > at(g.kick, c.s) ? btnIdx + 1 : btnIdx - 1;
      }
      if (p != null) lastPitch = p;
      btnIdx = Math.max(0, Math.min(allowed - 1, btnIdx));
      // Never the same button more than 3 times in a row on easy (keeps it lively).
      const btn = ORDER[btnIdx];
      const prev = notes.slice(-3);
      if (level === 0 && allowed > 1 && prev.length === 3 && prev.every((n) => n.btn === btn)) btnIdx = (btnIdx + 1) % allowed;
      notes.push({ beat: c.beat, btn: ORDER[btnIdx], gold: phase === 3 });
      lastBeat = c.beat;
    }
  }
  return notes;
}
