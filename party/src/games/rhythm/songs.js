// Rhythm-game songs (Pop Star Stage, Spotlight Dance-Off): the recorded songs
// in assets/audio/music/rhythm/index.json with the onsets measured from each
// song (audio-requests.md §12). Charts are built from those onsets (or taken
// from a song's hand-made `charts`) in chart.js, shared with the Rhythm Editor
// (workbench/rhythm.html). Songs have sections (data format v2): grooves with
// different rhythmic patterns and short "breath" sections between them, which
// stay (almost) empty.
import { registerMusic, songTagsOn } from '../../engine/audio.js';
import { session } from '../../state.js';
import { pick } from '../../engine/util.js';
import { DIV, LEVELS } from './chart.js';

let songs = null, loading = null;
const altTakes = new Map();   // song id -> [alternate takes with their own onsets] (rhythm/takes.json)

/** Load the song list once (resolves to [] when there are no songs yet). */
export function loadRhythmSongs() {
  if (!loading) {
    const get = (f) => fetch('assets/audio/music/rhythm/' + f, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    loading = Promise.all([get('index.json'), get('takes.json')])
      .then(([j, t]) => {
        songs = ((j && j.songs) || []).map(normalize).filter(Boolean);
        for (const s of songs) register(s);
        for (const a of (t && t.takes) || []) {
          const base = songs.find((s) => s.id === a.id);
          const alt = base && normalize({ ...base, loopEnd: undefined, charts: undefined, ...a, alt: true });
          if (!alt) continue;
          if (!altTakes.has(a.id)) altTakes.set(a.id, []);
          altTakes.get(a.id).push(alt);
          register(alt);
        }
        return songs;
      })
      .catch(() => { songs = []; return songs; });
  }
  return loading;
}

function register(s) {
  const label = s.name, take = s.take;
  registerMusic(musicKey(s), s.loop
    ? { file: s.file, loopStart: s.start, loopEnd: s.loopEnd, bpm: s.bpm, label, take }
    : { file: s.file, start: s.start, once: true, bpm: s.bpm, label, take });
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
export const musicKey = (song) => 'rhythm:' + song.id + (song.alt ? '-' + song.take : '');

export { LEVELS, LEVEL_IDS, songPlan, levelPlan, buildChart, autoChart, gameFold, foldXY, foldNormal, normalXAt, chartStats } from './chart.js';

// Per-game choices, kept for the session: { song: id | 'random', level: 0..2 }.
const defaultLevel = {};   // gameId -> starting level (rhythmOptions' defaultLevel)
export function rhythmChoice(gameId) {
  session.gameOptions = session.gameOptions || {};
  return (session.gameOptions[gameId] = session.gameOptions[gameId] || { song: 'random', level: defaultLevel[gameId] || 0 });
}
/**
 * The song to play for this game (random picks a different one than last
 * time). With song tags on, a song that has alternate takes plays one of
 * them at random (each take has its own onsets, so its chart matches it).
 */
export function chooseSong(gameId) {
  const list = rhythmSongs(), c = rhythmChoice(gameId);
  if (!list.length) return null;
  let s = list.find((x) => x.id === c.song);
  if (!s) {
    const pool = list.length > 1 ? list.filter((x) => x.id !== c.last) : list;
    s = pick(pool);
    c.last = s.id;
  }
  const alts = altTakes.get(s.id);
  return songTagsOn() && alts ? pick([s, ...alts]) : s;
}

/** Song options for the how-to screen (games' meta.options). */
export function rhythmOptions(gameId, { level = true, levelLabel = 'Notes', defaultLevel: start = 0 } = {}) {
  defaultLevel[gameId] = start;
  const opts = [{
    id: 'song', label: 'Song',
    choices: () => { loadRhythmSongs(); return [{ value: 'random', label: 'Surprise me!' }, ...rhythmSongs().map((s) => ({ value: s.id, label: s.style ? `${s.name} (${s.style})` : s.name }))]; },
    get: () => rhythmChoice(gameId).song,
    set: (v) => { rhythmChoice(gameId).song = v; },
  }];
  if (level) opts.push({
    id: 'level', label: levelLabel,
    choices: () => LEVELS.map((l, i) => ({ value: i, label: l })),
    get: () => rhythmChoice(gameId).level,
    set: (v) => { rhythmChoice(gameId).level = v; },
  });
  return opts;
}
