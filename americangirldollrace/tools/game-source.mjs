// The race's game code as one string, in the order index.html loads it:
// the game-*.js area files, then game.js. Tests that pull functions or
// constants out of the game code read this instead of game.js alone.
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
export const gameFiles = [...readFileSync(new URL('index.html', root), 'utf8').matchAll(/<script src="(game(?:-[a-z]+)?\.js)/g)].map(m => m[1]);
export const gameSource = gameFiles.map(file => readFileSync(new URL(file, root), 'utf8')).join('\n');
