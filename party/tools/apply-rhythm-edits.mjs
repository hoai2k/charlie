// Apply a Rhythm Editor edits file (party/workbench/rhythm.html, "Download")
// to the rhythm-game songs: each level it carries becomes that song's
// hand-made chart in assets/audio/music/rhythm/index.json ("charts"), which
// Pop Star Stage then plays exactly as written; levels listed under "auto" go
// back to being built from the song's onsets.
//
//   node party/tools/apply-rhythm-edits.mjs rhythm-edits.json [--dry-run] [--force] [--root <party dir>]
//
// --dry-run  check and report only; write nothing
// --force    apply a song's charts even if its file, bpm or start changed
//            since the edit was made (they are skipped otherwise: the notes were
//            timed against other audio)
// --root     apply to another copy of party/ (e.g. a scratch copy to try it)
//
// index.json is rewritten the way the music tools write it (Python
// json.dumps, compact), so the diff shows only the changed charts. It is
// data only: no module stamps change. Check the result in the Rhythm Editor
// (Play mode) or in Pop Star Stage, then commit.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEdits, applyEdits } from '../workbench/rhythm-data.js';
import { chartStats, LEVEL_IDS } from '../src/games/rhythm/chart.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes('--' + name);
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--root');
if (!file || flag('help')) {
  console.log('usage: node party/tools/apply-rhythm-edits.mjs rhythm-edits.json [--dry-run] [--force] [--root <party dir>]');
  process.exit(file ? 0 : 2);
}
const root = path.resolve(opt('root') || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const indexFile = path.join(root, 'assets', 'audio', 'music', 'rhythm', 'index.json');

let text;
try { text = readFileSync(file, 'utf8'); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(2); }
const edits = parseEdits(text);
for (const e of edits.errors) console.warn('warning: ' + e);
if (!edits.songs.length) { console.error('Nothing to apply (no songs in the file).'); process.exit(edits.errors.length ? 2 : 0); }
const index = JSON.parse(readFileSync(indexFile, 'utf8'));
const { index: out, report, warnings } = applyEdits(index, edits, { force: flag('force') });
for (const w of warnings) console.warn('warning: ' + w);
if (!report.length) { console.log('No changes.'); process.exit(warnings.length ? 1 : 0); }

for (const r of report) {
  const song = out.songs.find((s) => s.id === r.id);
  if (r.action === 'auto') { console.log(`${r.id} ${r.level}: back to the chart built from the onsets (hand-made chart of ${r.before} notes removed)`); continue; }
  const notes = song.charts[r.level].map(([beat, btn]) => ({ beat, btn }));
  const st = chartStats(notes, song.bpm);
  const btns = ['a', 'b', 'x', 'y'].map((b) => `${b.toUpperCase()} ${notes.filter((n) => n.btn === b).length}`).join(', ');
  console.log(`${r.id} ${r.level}: ${r.notes} notes${r.before != null ? ` (was ${r.before} hand-made)` : ' (was built from the onsets)'}; ` +
    `${st.perMin}/min, at most ${st.maxPerBeat} in a beat and ${st.maxPer2s} in 2 s; ${btns}`);
  if (LEVEL_IDS.indexOf(r.level) < 2 && st.maxPerBeat > LEVEL_IDS.indexOf(r.level) + 1) console.warn(`  note: busier than the game's own ${r.level} charts (at most ${LEVEL_IDS.indexOf(r.level) + 1} per beat)`);
}

if (flag('dry-run')) { console.log('Dry run: nothing written.'); process.exit(0); }
// Write only the songs' "charts" into the file as Python loaded it, then dump it the way
// tools/audio/music/assemble_rh.py does (json.dumps(separators=(',', ':')) + newline), so
// the rest of the file stays byte-identical (Python keeps floats like -10.0 as written).
const charts = Object.fromEntries([...new Set(report.map((r) => r.id))].map((id) => [id, out.songs.find((s) => s.id === id).charts || null]));
const PY = `import sys, json
path = sys.argv[1]; charts = json.loads(sys.stdin.read())
d = json.load(open(path))
for s in d['songs']:
    if s['id'] in charts:
        if charts[s['id']]: s['charts'] = charts[s['id']]
        else: s.pop('charts', None)
open(path, 'w').write(json.dumps(d, separators=(',', ':')) + '\\n')`;
const py = spawnSync('python3', ['-c', PY, indexFile], { input: JSON.stringify(charts), encoding: 'utf8' });
if (py.status !== 0) {
  if (py.error) { writeFileSync(indexFile, JSON.stringify(out) + '\n'); console.warn('warning: python3 not found: wrote the file with JavaScript (number formatting may differ)'); }
  else { console.error('python3 failed: ' + (py.stderr || py.stdout)); process.exit(1); }
}
console.log(`Wrote ${path.relative(process.cwd(), indexFile)} (${report.length} level chart${report.length > 1 ? 's' : ''}).`);
