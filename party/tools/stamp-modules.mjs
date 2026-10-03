// Cache-busting for the ES modules (GitHub Pages caches files for ~10 min).
// Writes an import map into index.html that maps every module under src/ to
// itself plus ?v=<hash of its contents>, and stamps the main.js <script> the
// same way. Changed files get new URLs, unchanged ones stay cached, and a
// visitor never mixes old and new modules. Run before committing code:
//
//   node party/tools/stamp-modules.mjs
//
// Browsers without import maps just ignore it (plain caching, as before).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const map = `<script type="importmap">\n${JSON.stringify({ imports }, null, 2).split('\n').map((l) => '    ' + l).join('\n')}\n    </script>`;
let page = readFileSync(html, 'utf8');
const block = /<script type="importmap">[\s\S]*?<\/script>/;
const main = /<script type="module" src="src\/main\.js(\?v=[^"]*)?"><\/script>/;
if (!main.test(page)) throw new Error('main.js <script> not found in index.html');
page = block.test(page) ? page.replace(block, () => map.trimStart()) : page.replace(main, (m) => `${map.trimStart()}\n    ${m}`);
page = page.replace(main, `<script type="module" src="src/main.js?v=${hash(path.join(root, 'src/main.js'))}"></script>`);
writeFileSync(html, page);
console.log(`Stamped ${Object.keys(imports).length} modules in index.html`);
