// Cache-busting for the ES modules (GitHub Pages caches files for ~10 min).
// Writes an import map into index.html (and the workbench pages: workbench/index.html,
// workbench/rhythm.html) that maps every module under src/ to
// itself plus ?v=<hash of its contents>, and stamps the main.js <script> the
// same way. Changed files get new URLs, unchanged ones stay cached, and a
// visitor never mixes old and new modules. Run before committing code:
//
//   node party/tools/stamp-modules.mjs
//   node party/tools/stamp-modules.mjs --check   (exit 1 if a stamp is stale; party/tools/stamp.test.mjs)
//
// Browsers without import maps just ignore it (plain caching, as before).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK = process.argv.includes('--check');
const stale = [];
const save = (file, text) => { if (readFileSync(file, 'utf8') === text) return; if (CHECK) stale.push(path.relative(root, file)); else writeFileSync(file, text); };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = path.join(root, 'index.html');

function modules(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name.startsWith('._')) return [];
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return modules(p);
    return name.endsWith('.js') ? [p] : [];
  });
}

const hash = (file) => createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8);
const imports = {};
for (const file of modules(path.join(root, 'src')).sort()) {
  const rel = './' + path.relative(root, file).split(path.sep).join('/');
  imports[rel] = `${rel}?v=${hash(file)}`;
}

const mapOf = (imports) => `<script type="importmap">\n${JSON.stringify({ imports }, null, 2).split('\n').map((l) => '    ' + l).join('\n')}\n    </script>`;
const map = mapOf(imports);
let page = readFileSync(html, 'utf8');
const block = /<script type="importmap">[\s\S]*?<\/script>/;
const main = /<script type="module" src="src\/main\.js(\?v=[^"]*)?"><\/script>/;
if (!main.test(page)) throw new Error('main.js <script> not found in index.html');
page = block.test(page) ? page.replace(block, () => map.trimStart()) : page.replace(main, (m) => `${map.trimStart()}\n    ${m}`);
page = page.replace(main, `<script type="module" src="src/main.js?v=${hash(path.join(root, 'src/main.js'))}"></script>`);
save(html, page);
if (!CHECK) console.log(`Stamped ${Object.keys(imports).length} modules in index.html`);

// The sprite workbench (workbench/index.html, <base href="../">) shares the
// game's modules: give it the same map plus its own modules, and stamp its entry.
const wbHtml = path.join(root, 'workbench', 'index.html');
let hasWb = true;
try { statSync(wbHtml); } catch (e) { hasWb = false; }
if (hasWb) {
const wbImports = { ...imports };
for (const file of modules(path.join(root, 'workbench')).sort()) {
  const rel = './' + path.relative(root, file).split(path.sep).join('/');
  wbImports[rel] = `${rel}?v=${hash(file)}`;
}
const wbMain = /<script type="module" src="workbench\/main\.js(\?v=[^"]*)?"><\/script>/;
let wb = readFileSync(wbHtml, 'utf8');
if (!wbMain.test(wb)) throw new Error('workbench/main.js <script> not found in workbench/index.html');
wb = block.test(wb) ? wb.replace(block, () => mapOf(wbImports).trimStart()) : wb.replace(wbMain, (m) => `${mapOf(wbImports).trimStart()}\n    ${m}`);
wb = wb.replace(wbMain, `<script type="module" src="workbench/main.js?v=${hash(path.join(root, 'workbench/main.js'))}"></script>`);
wb = wb.replace(/href="workbench\/workbench\.css(\?v=[^"]*)?"/, `href="workbench/workbench.css?v=${hash(path.join(root, 'workbench/workbench.css'))}"`);
save(wbHtml, wb);
if (!CHECK) console.log(`Stamped ${Object.keys(wbImports).length} modules in workbench/index.html`);
// The Rhythm Editor (workbench/rhythm.html) uses the same map, with its own entry.
const rhHtml = path.join(root, 'workbench', 'rhythm.html');
let hasRh = true;
try { statSync(rhHtml); } catch (e) { hasRh = false; }
if (hasRh) {
  const rhMain = /<script type="module" src="workbench\/rhythm\.js(\?v=[^"]*)?"><\/script>/;
  let rh = readFileSync(rhHtml, 'utf8');
  if (!rhMain.test(rh)) throw new Error('workbench/rhythm.js <script> not found in workbench/rhythm.html');
  rh = block.test(rh) ? rh.replace(block, () => mapOf(wbImports).trimStart()) : rh.replace(rhMain, (m) => `${mapOf(wbImports).trimStart()}\n    ${m}`);
  rh = rh.replace(rhMain, `<script type="module" src="workbench/rhythm.js?v=${hash(path.join(root, 'workbench/rhythm.js'))}"></script>`);
  rh = rh.replace(/href="workbench\/workbench\.css(\?v=[^"]*)?"/, `href="workbench/workbench.css?v=${hash(path.join(root, 'workbench/workbench.css'))}"`);
  save(rhHtml, rh);
  if (!CHECK) console.log(`Stamped ${Object.keys(wbImports).length} modules in workbench/rhythm.html`);
}
}
if (CHECK && stale.length) { console.error('Stale module stamps in ' + stale.join(', ') + ': run node party/tools/stamp-modules.mjs'); process.exit(1); }
