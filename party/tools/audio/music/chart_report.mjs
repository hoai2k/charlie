// node party/tools/audio/music/chart_report.mjs [--json out.json] [--md]
// Every rhythm-game song x level (src/games/rhythm/chart.js, the plan Pop Star
// Stage builds each level with): notes, notes per minute, the most notes in
// one beat and in any 2 s, the shortest gap (beats and ms), and how many notes
// sit on the beat / on 8ths. --json writes the notes (seconds in the file) for
// chart_check.py, which checks them against the audio.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChart, levelPlan, gameFold, chartStats, LEVELS } from '../../../src/games/rhythm/chart.js';

const party = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const idx = JSON.parse(readFileSync(path.join(party, 'assets/audio/music/rhythm/index.json'), 'utf8'));
const rows = [], dump = [];
for (const song of idx.songs) {
  for (let lv = 0; lv < 3; lv++) {
    const plan = levelPlan(song, lv);
    const notes = gameFold(song, lv, buildChart(song, lv, plan));
    const st = chartStats(notes, song.bpm);
    const on = notes.filter((n) => Math.abs(n.beat - Math.round(n.beat)) < 1e-6).length;
    const e8 = notes.filter((n) => Math.abs(n.beat * 2 - Math.round(n.beat * 2)) < 1e-6).length;
    const btns = Object.fromEntries(['a', 'b', 'x', 'y'].map((b) => [b, notes.filter((n) => n.btn === b).length]));
    rows.push({ song: song.id, name: song.name, bpm: song.bpm, level: LEVELS[lv], ...st, minGapMs: st.minGap == null ? null : Math.round(st.minGap * 60000 / song.bpm), onBeat: on / (notes.length || 1), on8: e8 / (notes.length || 1), btns });
    const spb = 60 / song.bpm, loopLen = song.loop ? song.lengthBeats * spb : Infinity;
    dump.push({ id: song.id, file: song.file, level: lv, bpm: song.bpm, start: song.start,
      notes: notes.map((n) => ({ beat: n.beat, btn: n.btn, t: song.start + ((n.beat * spb) % loopLen) })) });
  }
}
const pct = (x) => `${Math.round(x * 100)}%`;
console.log('| Song | BPM | Level | Notes | Notes/min | Max in 1 beat | Max in 2 s | Shortest gap | On the beat | On 8ths | A/B/X/Y |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${r.name} (\`${r.song}\`) | ${r.bpm} | ${r.level} | ${r.notes} | ${r.perMin} | ${r.maxPerBeat} | ${r.maxPer2s} | ${r.minGap} beat (${r.minGapMs} ms) | ${pct(r.onBeat)} | ${pct(r.on8)} | ${r.btns.a}/${r.btns.b}/${r.btns.x}/${r.btns.y} |`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(dump));
