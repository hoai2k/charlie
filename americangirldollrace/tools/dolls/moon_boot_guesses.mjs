// The game's own moon boot guesses (game-draw.js moonBootPlacements, from
// the measured feet, the rules and the owner's look-alike poses), as JSON on
// stdout, for fit_moon_boots.py to fit over each pose's shoes.
//
//   node tools/dolls/moon_boot_guesses.mjs          every pose the owner hasn't placed
//   node tools/dolls/moon_boot_guesses.mjs --check  the owner's poses, each guessed
//                                                    with that doll's own boots left out
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { gameSource } from '../game-source.mjs';

const root = new URL('../../', import.meta.url);
const win = {};
const context = vm.createContext({ window: win, Math, Number, Object, parseInt });
for (const file of ['feet.js', 'pose-shapes.js', 'moon-boot-overrides.js']) vm.runInContext(readFileSync(new URL(file, root), 'utf8'), context);

// Just the functions and constants the guesses need, out of the game code.
function source(name) {
  const start = gameSource.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`no function ${name}`);
  let depth = 0, i = gameSource.indexOf('{', start);
  for (; ; i++) {
    if (gameSource[i] === '{') depth++;
    else if (gameSource[i] === '}' && --depth === 0) break;
  }
  return gameSource.slice(start, i + 1);
}
const constants = gameSource.split('\n').filter(line => /^const MOON_BOOT_\w+\s*=/.test(line)).map(line => line.replace(/^const /, 'var ')).join('\n');
const functions = ['clamp', 'moonBootPlacements', 'moonBootRole', 'learnedMoonBootView', 'moonBootFootUnder', 'poseShapeDistance', 'moonBootPose'];
vm.runInContext(constants + '\n' + functions.map(source).join('\n'), context);

const owner = { ...win.MOON_BOOT_OVERRIDES };
const out = {};
if (process.argv.includes('--check')) {
  for (const id of Object.keys(owner)) {
    if ((win.MOON_BOOT_NOT_LESSONS || []).includes(id)) continue;
    const [doll, kind, index] = id.split('/');
    win.MOON_BOOT_OVERRIDES = Object.fromEntries(Object.entries(owner).filter(([key]) => !key.startsWith(`${doll}/`)));
    out[id] = context.moonBootPlacements(doll, kind, Number(index));
  }
} else {
  for (const [doll, sheets] of Object.entries(win.DOLL_FEET)) {
    for (const [kind, frames] of Object.entries(sheets)) {
      (frames || []).forEach((feet, index) => {
        const id = `${doll}/${kind}/${index}`;
        if (feet && !owner[id]) out[id] = context.moonBootPlacements(doll, kind, index);
      });
    }
  }
}
process.stdout.write(JSON.stringify(out));
