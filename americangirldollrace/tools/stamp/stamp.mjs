// Cache-busting for the race (GitHub Pages caches files for ~10 min).
// Stamps every local <script src> and stylesheet <link href> in index.html
// with ?v=<hash of the file's contents>, so a changed file gets a new URL and
// unchanged ones stay cached. Run it after changing any of those files:
//
//   node americangirldollrace/tools/stamp/stamp.mjs
//
// stamp.test.mjs fails while any stamp is out of date. After a merge
// conflict on these lines, just take either side and run this again.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const html = path.join(root, 'index.html');
// <script src="x.js?v=..."> and <link rel="stylesheet" href="x.css?v=...">
export const TAG = /(<script src="|<link rel="stylesheet" href=")((?!https?:)[^"?]+\.(?:js|css))(\?v=[^"]*)?"/g;

export const hash = (file) => createHash('sha1').update(readFileSync(path.join(root, file))).digest('hex').slice(0, 8);

export function stamped(page) {
  return page.replace(TAG, (m, open, file) => `${open}${file}?v=${hash(file)}"`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const page = readFileSync(html, 'utf8');
  const next = stamped(page);
  writeFileSync(html, next);
  console.log(`Stamped ${[...next.matchAll(TAG)].length} files in americangirldollrace/index.html${next === page ? ' (no changes)' : ''}`);
}
