// Rhythm-game songs (Pop Star Stage, Spotlight Dance-Off): the recorded songs
// in assets/audio/music/rhythm/index.json with the onsets measured from each
// song (audio-requests.md §12). Charts are built from those onsets, so the
// notes follow the song itself; the difficulty picks which layer to follow:
//   Easy    the obvious on-beat hits (kick / main beat)
//   Normal  plus the off-beat percussion (clave, claps, skank, palmas)
//   Hard    the melody's rhythm too (syncopations, triplets, quick pairs)
// Songs have sections (data format v2): grooves with different rhythmic
// patterns and short "breath" sections between them, which stay (almost) empty.
import { registerMusic } from '../../engine/audio.js';
import { session } from '../../state.js';
import { pick } from '../../engine/util.js';

let songs = null, loading = null;
const DIV = 12;   // onset positions in 1/12 beat: 16ths = 3, triplet 8ths = 4

/** Load the song list once (resolves to [] when there are no songs yet). */
export function loadRhythmSongs() {
  if (!loading) {
    loading = fetch('assets/audio/music/rhythm/index.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        songs = ((j && j.songs) || []).map(normalize).filter(Boolean);
        for (const s of songs) {
          registerMusic(musicKey(s), s.loop
            ? { file: s.file, loopStart: s.start, loopEnd: s.loopEnd, bpm: s.bpm }
            : { file: s.file, start: s.start, once: true, bpm: s.bpm });
        }
        return songs;
      })
      .catch(() => { songs = []; return songs; });
  }
  return loading;
}

/** Bring a song entry to format v2 (v1 = a looping 16th-note grid). */
function normalize(s) {
  if (!s || !s.file || !(s.bpm > 0)) return null;
  if (Array.isArray(s.onsets)) {
    return { ...s, div: s.div || DIV, beatsPerBar: s.beatsPerBar || 4, start: s.start ?? s.loopStart ?? 0, sections: s.sections || [] };
  }
  const g = s.grid;
  if (!g || !(g.steps > 0)) return null;
  const k = DIV / (g.div || 4), onsets = [];
  for (let i = 0; i < g.steps; i++) {
    const low = g.kick?.[i] || 0, high = g.snare?.[i] || 0, mel = g.melody?.[i] || 0;
    if (Math.max(low, high, mel) >= 0.12) onsets.push([i * k, low, high, mel, g.pitch?.[i] ?? null]);
  }
  const beats = g.steps / (g.div || 4);
  return {
    ...s, div: DIV, beatsPerBar: 4, onsets, loop: true, lengthBeats: beats,
    start: s.loopStart || 0,
    sections: [{ name: 'A', start: 0, end: beats, kind: 'groove', feel: 'straight' }],
  };
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
    choices: () => { loadRhythmSongs(); return [{ value: 'random', label: 'Surprise me!' }, ...rhythmSongs().map((s) => ({ value: s.id, label: s.style ? `${s.name} (${s.style})` : s.name }))]; },
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

/**
 * Game timeline for a song, in beats: { end, phases: { ab, all, boss } }.
 * A song played once lasts as long as the song; a looping one ~65 s. The
 * phases (A only -> A+B -> all four -> golden finale vs the big imp) start
 * with the song's groove sections where it has them.
 */
export function songPlan(song, level = 0) {
  const bpb = song.beatsPerBar || 4, bar = (x) => Math.round(x / bpb) * bpb;
  const end = song.loop ? Math.round((65 * song.bpm) / 60 / 4) * 4 + 2 : Math.ceil(song.lengthBeats / bpb) * bpb + 2;
  const grooves = (song.sections || []).filter((s) => s.kind !== 'breath' && s.end - s.start >= 8);
  let ab, all, boss;
  if (!song.loop && grooves.length >= 3) {
    ab = grooves[1].start; all = grooves[Math.min(2, grooves.length - 1)].start; boss = grooves[grooves.length - 1].start;
    if (all >= boss) all = bar(ab + (boss - ab) / 2);
  } else {
    const r = end / 130;
    ab = bar(36 * r); all = bar(68 * r); boss = bar(96 * r);
  }
  // Easy teaches A, then B, then X/Y; Normal starts with A+B (X/Y from the
  // 2nd groove); Hard uses all four buttons from the start.
  if (level >= 1) { all = ab; ab = 0; }
  if (level >= 2) all = 0;
  return { end, phases: { ab, all, boss } };
}

// --- chart building ------------------------------------------------------------
// Buttons by role, so a repeating pattern always gets the same buttons:
// A = low / main beat, B = high percussion (claps, snare, clave), and the
// melody rides X (lower than the last melody note) / Y (higher). Early phases
// fold the buttons not taught yet onto the ones that are.
const LEVEL = [
  { name: 'easy', step: 12, gap: 1, perBar: 3, thresh: 0.3 },          // beats only
  { name: 'normal', step: 6, gap: 0.5, perBar: 5, thresh: 0.25 },      // + off-beat 8ths
  { name: 'hard', step: 3, gap: 0.25, perBar: 7, thresh: 0.22 },       // + 16ths / triplets (melody)
];

function sectionAt(song, beat) {
  for (const s of song.sections || []) if (beat >= s.start && beat < s.end) return s;
  return null;
}

/**
 * Notes [{ beat, btn, gold }] for `song` at difficulty `level`, using the
 * timeline from songPlan(). Notes start at beat 4.
 */
export function buildChart(song, level, plan) {
  const L = LEVEL[Math.max(0, Math.min(2, level | 0))];
  const div = song.div || DIV, bpb = song.beatsPerBar || 4;
  const { end, phases } = plan;
  const lastBeat = end - 4;
  // Onsets over the game: a looping song repeats its onsets.
  const events = [];
  const span = song.lengthBeats * div;
  for (let rep = 0; ; rep++) {
    const off = rep * span;
    if (off / div > lastBeat || (!song.loop && rep > 0)) break;
    for (const [pos, low = 0, high = 0, mel = 0, pitch = null] of song.onsets) {
      const beat = (pos + off) / div;
      if (beat < 4 || beat > lastBeat) continue;
      events.push({ pos: pos + off, beat, low, high, mel, pitch });
    }
  }
  // Score each event for this level; the level decides which grid it may sit on.
  const cands = [];
  for (const e of events) {
    const sec = sectionAt(song, (e.pos % (span || Infinity)) / div);
    // Breathing space between sections: short breathers stay empty; a long
    // intro/breather keeps a gentle pulse (one note per bar, on its downbeat).
    if (sec && sec.kind === 'breath') {
      if (sec.end - sec.start <= 2 * bpb || (e.pos / div) % bpb !== 0) continue;
      if (Math.max(e.low, e.high, e.mel) >= 0.2) cands.push({ ...e, score: 0.2, role: 'low', breath: true });
      continue;
    }
    const inBeat = e.pos % div;
    const onBeat = inBeat === 0;
    const onEighth = inBeat % 6 === 0, onSixteenth = inBeat % 3 === 0, onTriplet = inBeat % 4 === 0;
    // Swung 16ths land on the triplet grid (e at 4/12, a at 10/12).
    const swung = sec && sec.feel === 'swing' && (inBeat === 4 || inBeat === 10);
    let score, role;
    if (L.name === 'easy') {
      if (!onBeat) continue;
      score = Math.max(e.low, e.high * 0.8, e.mel * 0.6) + ((e.pos / div) % bpb === 0 ? 0.15 : 0);
      role = e.mel > Math.max(e.low, e.high) ? 'mel' : e.low >= e.high ? 'low' : 'high';
    } else if (L.name === 'normal') {
      if (!onEighth) continue;
      // Off-beat percussion is the point of this level (clave, skank, palmas).
      score = onBeat ? Math.max(e.low, e.high * 0.85) : e.high * 1.1 + 0.08;
      if (e.mel > score) { score = e.mel * 0.8; role = 'mel'; } else role = onBeat && e.low >= e.high ? 'low' : 'high';
    } else {
      if (!onSixteenth && !onTriplet && !swung) continue;
      // The melody's rhythm leads; percussion fills where the melody rests.
      const perc = Math.max(e.low, e.high) * (onBeat ? 0.9 : 0.7);
      if (e.mel * 1.1 >= perc) { score = e.mel * 1.1 + (onEighth ? 0.05 : 0); role = 'mel'; } else { score = perc; role = e.low >= e.high ? 'low' : 'high'; }
      if (!onEighth && !onTriplet && !swung) score -= 0.08;     // 16th pickups only when clear
    }
    if (score >= L.thresh) cands.push({ ...e, score, role });
  }
  // Pick per bar: strongest first, with the level's cap and minimum gap
  // (a triplet pair may be a third of a beat apart on hard).
  const byBar = new Map();
  for (const c of cands) {
    const b = Math.floor(c.beat / bpb);
    if (!byBar.has(b)) byBar.set(b, []);
    byBar.get(b).push(c);
  }
  const chosen = [];
  for (const [, list] of [...byBar.entries()].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => b.score - a.score);
    const bar = [];
    const cap = L.perBar - (list[0].beat < phases.ab ? 1 : 0);
    for (const c of list) {
      if (bar.length >= cap) break;
      if ([...bar, ...chosen.slice(-2)].some((o) => Math.abs(o.beat - c.beat) < Math.min(L.gap, 1 / 3) - 1e-6)) continue;
      if (L.gap >= 0.5 && [...bar, ...chosen.slice(-2)].some((o) => Math.abs(o.beat - c.beat) < L.gap - 1e-6)) continue;
      bar.push(c);
    }
    bar.sort((a, b) => a.beat - b.beat);
    chosen.push(...bar);
  }
  // Never more than 4 notes inside one beat (keeps hard fun, not frantic).
  const notes = [];
  let lastPitch = null, lastMelBtn = 'x';
  for (const c of chosen) {
    if (notes.filter((n) => c.beat - n.beat < 1 - 1e-6).length >= 4) continue;
    let btn;
    if (c.role === 'mel') {
      if (c.pitch != null && lastPitch != null && c.pitch !== lastPitch) lastMelBtn = c.pitch > lastPitch ? 'y' : 'x';
      if (c.pitch != null) lastPitch = c.pitch;
      btn = lastMelBtn;
    } else btn = c.role === 'low' ? 'a' : 'b';
    // Fold buttons that aren't taught yet.
    if (c.beat < phases.ab) btn = 'a';
    else if (c.beat < phases.all) btn = btn === 'x' ? 'a' : btn === 'y' ? 'b' : btn;
    notes.push({ beat: c.beat, btn, gold: c.beat >= phases.boss });
  }
  // Easy keeps a steady pulse in the A-only warm-up so it's never empty.
  if (L.name === 'easy') {
    for (let b = 4; b < Math.min(phases.ab, lastBeat); b += 2) {
      const sec = sectionAt(song, song.loop ? b % song.lengthBeats : b);
      if (sec && sec.kind === 'breath') continue;
      if (!notes.some((n) => Math.abs(n.beat - b) < 1)) notes.push({ beat: b, btn: 'a', gold: false });
    }
    notes.sort((a, b) => a.beat - b.beat);
  }
  return notes;
}
