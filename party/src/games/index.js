// Minigame registry. Order here is the order on the Game Select screen
// (party games: page 1 = the first 11, page 2 = the rest, Crown Keeper last; see PARTY_PAGES).
//
// Games load on demand: the menu only needs each game's small <id>.meta.js (title,
// category, how-to text). loadGame(id) imports the game's code; the intro (how-to)
// screen starts it so it is ready by the time play begins, and the play scene waits for it.
import { meta as m0 } from './sprinkle-catch.meta.js';
import { meta as m1 } from './bumper-bounce.meta.js';
import { meta as m2 } from './pass-the-present.meta.js';
import { meta as m3 } from './balloon-pump.meta.js';
import { meta as m4 } from './troll-trouble.meta.js';
import { meta as m5 } from './spotlight-dance.meta.js';
import { meta as m6 } from './wizard-quickdraw.meta.js';
import { meta as m7 } from './cookie-crumble.meta.js';
import { meta as m8 } from './paint-party.meta.js';
import { meta as m9 } from './broomstick-dash.meta.js';
import { meta as m10 } from './fairy-count.meta.js';
import { meta as m11 } from './crown-keeper.meta.js';
import { meta as m12 } from './pinata-party.meta.js';
import { meta as m13 } from './musical-cushions.meta.js';
import { meta as m14 } from './snowball-splat.meta.js';
import { meta as m15 } from './jump-rope.meta.js';
import { meta as m16 } from './fishing-frenzy.meta.js';
import { meta as m17 } from './tug-of-war.meta.js';
import { meta as m18 } from './cloud-hop.meta.js';
import { meta as m19 } from './pancake-tower.meta.js';
import { meta as m20 } from './treasure-dig.meta.js';
import { meta as m21 } from './mini-golf.meta.js';
import { meta as m22 } from './fashion-show.meta.js';
import { meta as m23 } from './art-studio.meta.js';
import { meta as m24 } from './cake-bakery.meta.js';
import { meta as m25 } from './pet-spa.meta.js';
import { meta as m26 } from './pop-star-stage.meta.js';
import { meta as m27 } from './fairy-garden.meta.js';
import { meta as m28 } from './potion-class.meta.js';
import { meta as m29 } from './memory-match.meta.js';
import { meta as m30 } from './melody-maker.meta.js';
import { meta as m31 } from './bead-bracelets.meta.js';
import { meta as m32 } from './dream-room.meta.js';
import { meta as m33 } from './seek-and-find.meta.js';
import { meta as m34 } from './star-maker.meta.js';
import { meta as m35 } from './sandcastle-beach.meta.js';
import { meta as m36 } from './puppet-theater.meta.js';
import { meta as m37 } from './snowman-builder.meta.js';
import { meta as m38 } from './nail-studio.meta.js';
import { meta as m39 } from './pottery-wheel.meta.js';
import { meta as m40 } from './hair-salon.meta.js';
import { meta as m41 } from './dance-studio.meta.js';
import { meta as m42 } from './acrobat-circus.meta.js';
import { meta as m43 } from './aquarium.meta.js';
import { meta as m44 } from './tea-party.meta.js';
import { meta as m45 } from './sock-match.meta.js';
import { meta as m46 } from './unicorn-jump.meta.js';
import { meta as m47 } from './mermaid-pearls.meta.js';
import { meta as m48 } from './pumpkin-peekaboo.meta.js';
import { meta as m49 } from './ghost-giggles.meta.js';
import { meta as m50 } from './kitten-yarn.meta.js';
import { meta as m51 } from './snowflake-catch.meta.js';
import { meta as m52 } from './trick-or-treat.meta.js';
import { meta as m53 } from './dance-freeze.meta.js';
import { meta as m54 } from './shape-train.meta.js';
import { meta as m55 } from './ballet-butterflies.meta.js';
import { meta as m56 } from './wand-shapes.meta.js';
import { meta as m57 } from './cupcake-stack.meta.js';
import { meta as m58 } from './ladybug-spots.meta.js';
import { meta as m59 } from './bubble-pop.meta.js';
import { meta as m60 } from './balloon-float.meta.js';
import { meta as m61 } from './duckling-parade.meta.js';
import { meta as m62 } from './puppy-splash.meta.js';
import { meta as m63 } from './rainbow-painter.meta.js';
import { meta as m64 } from './garden-grow.meta.js';
import { meta as m65 } from './fairy-flutter.meta.js';
import { meta as m66 } from './fairy-hide-seek.meta.js';
import { meta as m67 } from './muddy-mayhem.meta.js';
import { meta as m68 } from './sneaky-dance.meta.js';
import { meta as m69 } from './bed-bounce.meta.js';
import { meta as m70 } from './prank-troll.meta.js';
import { meta as m71 } from './opposite-ballet.meta.js';
import { meta as m72 } from './whoopee-tea.meta.js';

const LOADERS = {
  'sprinkle-catch': () => import('./sprinkle-catch.js'),
  'bumper-bounce': () => import('./bumper-bounce.js'),
  'pass-the-present': () => import('./pass-the-present.js'),
  'balloon-pump': () => import('./balloon-pump.js'),
  'troll-trouble': () => import('./troll-trouble.js'),
  'spotlight-dance': () => import('./spotlight-dance.js'),
  'wizard-quickdraw': () => import('./wizard-quickdraw.js'),
  'cookie-crumble': () => import('./cookie-crumble.js'),
  'paint-party': () => import('./paint-party.js'),
  'broomstick-dash': () => import('./broomstick-dash.js'),
  'fairy-count': () => import('./fairy-count.js'),
  'crown-keeper': () => import('./crown-keeper.js'),
  'pinata-party': () => import('./pinata-party.js'),
  'musical-cushions': () => import('./musical-cushions.js'),
  'snowball-splat': () => import('./snowball-splat.js'),
  'jump-rope': () => import('./jump-rope.js'),
  'fishing-frenzy': () => import('./fishing-frenzy.js'),
  'tug-of-war': () => import('./tug-of-war.js'),
  'cloud-hop': () => import('./cloud-hop.js'),
  'pancake-tower': () => import('./pancake-tower.js'),
  'treasure-dig': () => import('./treasure-dig.js'),
  'mini-golf': () => import('./mini-golf.js'),
  'fashion-show': () => import('./fashion-show.js'),
  'art-studio': () => import('./art-studio.js'),
  'cake-bakery': () => import('./cake-bakery.js'),
  'pet-spa': () => import('./pet-spa.js'),
  'pop-star-stage': () => import('./pop-star-stage.js'),
  'fairy-garden': () => import('./fairy-garden.js'),
  'potion-class': () => import('./potion-class.js'),
  'memory-match': () => import('./memory-match.js'),
  'melody-maker': () => import('./melody-maker.js'),
  'bead-bracelets': () => import('./bead-bracelets.js'),
  'dream-room': () => import('./dream-room.js'),
  'seek-and-find': () => import('./seek-and-find.js'),
  'star-maker': () => import('./star-maker.js'),
  'sandcastle-beach': () => import('./sandcastle-beach.js'),
  'puppet-theater': () => import('./puppet-theater.js'),
  'snowman-builder': () => import('./snowman-builder.js'),
  'nail-studio': () => import('./nail-studio.js'),
  'pottery-wheel': () => import('./pottery-wheel.js'),
  'hair-salon': () => import('./hair-salon.js'),
  'dance-studio': () => import('./dance-studio.js'),
  'acrobat-circus': () => import('./acrobat-circus.js'),
  'aquarium': () => import('./aquarium.js'),
  'tea-party': () => import('./tea-party.js'),
  'sock-match': () => import('./sock-match.js'),
  'unicorn-jump': () => import('./unicorn-jump.js'),
  'mermaid-pearls': () => import('./mermaid-pearls.js'),
  'pumpkin-peekaboo': () => import('./pumpkin-peekaboo.js'),
  'ghost-giggles': () => import('./ghost-giggles.js'),
  'kitten-yarn': () => import('./kitten-yarn.js'),
  'snowflake-catch': () => import('./snowflake-catch.js'),
  'trick-or-treat': () => import('./trick-or-treat.js'),
  'dance-freeze': () => import('./dance-freeze.js'),
  'shape-train': () => import('./shape-train.js'),
  'ballet-butterflies': () => import('./ballet-butterflies.js'),
  'wand-shapes': () => import('./wand-shapes.js'),
  'cupcake-stack': () => import('./cupcake-stack.js'),
  'ladybug-spots': () => import('./ladybug-spots.js'),
  'bubble-pop': () => import('./bubble-pop.js'),
  'balloon-float': () => import('./balloon-float.js'),
  'duckling-parade': () => import('./duckling-parade.js'),
  'puppy-splash': () => import('./puppy-splash.js'),
  'rainbow-painter': () => import('./rainbow-painter.js'),
  'garden-grow': () => import('./garden-grow.js'),
  'fairy-flutter': () => import('./fairy-flutter.js'),
  'fairy-hide-seek': () => import('./fairy-hide-seek.js'),
  'muddy-mayhem': () => import('./muddy-mayhem.js'),
  'sneaky-dance': () => import('./sneaky-dance.js'),
  'bed-bounce': () => import('./bed-bounce.js'),
  'prank-troll': () => import('./prank-troll.js'),
  'opposite-ballet': () => import('./opposite-ballet.js'),
  'whoopee-tea': () => import('./whoopee-tea.js'),
};

export const GAMES = [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17, m18, m19, m20, m21, m22, m23, m24, m25, m26, m27, m28, m29, m30, m31, m32, m33, m34, m35, m36, m37, m38, m39, m40, m41, m42, m43, m44, m45, m46, m47, m48, m49, m50, m51, m52, m53, m54, m55, m56, m57, m58, m59, m60, m61, m62, m63, m64, m65, m66, m67, m68, m69, m70, m71, m72].map((m) => ({ ...m }));
export const PARTY_GAMES = GAMES.filter((g) => g.category === 'party');
export const STUDIO_GAMES = GAMES.filter((g) => g.category === 'studio');
// Party Games shows 11 games at a time; the 12th tile is "More Games", which
// swaps in the second page. Page 2 = every party game after the first 11,
// with Crown Keeper moved to the end of it.
const LAST = 'crown-keeper';
const partyRest = PARTY_GAMES.filter((g) => g.id !== LAST);
export const PARTY_PAGES = [partyRest.slice(0, 11), [...partyRest.slice(11), ...PARTY_GAMES.filter((g) => g.id === LAST)]];
// Molly Party: a separate shelf of simple games for little ones (age 4-5).
// The cheeky games replace the "do as you're told" ones in the same shelf
// slot; the old games stay playable by id but are off the shelf.
const MOLLY_SWAPS = {
  'puppy-splash': 'muddy-mayhem', 'dance-freeze': 'sneaky-dance', 'ballet-butterflies': 'opposite-ballet',
  'tea-party': 'whoopee-tea', 'shape-train': 'bed-bounce', 'ladybug-spots': 'prank-troll',
};
const mollyAll = GAMES.filter((g) => g.category === 'molly');
const swapIns = new Set(Object.values(MOLLY_SWAPS).filter((id) => mollyAll.some((g) => g.id === id)));
export const MOLLY_GAMES = mollyAll.filter((g) => !swapIns.has(g.id))
  .map((g) => (swapIns.has(MOLLY_SWAPS[g.id]) ? mollyAll.find((x) => x.id === MOLLY_SWAPS[g.id]) : g));
// Play Studio works the same way once it has more than 12 games: 11 per page
// and a "More Play" tile.
export const STUDIO_PAGES = STUDIO_GAMES.length <= 12 ? [STUDIO_GAMES] : [STUDIO_GAMES.slice(0, 11), STUDIO_GAMES.slice(11)];
export const gameById = (id) => GAMES.find((g) => g.id === id);

// Hidden games: off the shelves (and out of Random / Marathon) unless Settings ->
// "Show all games" is on; then they come back at the end of their shelf. Games from
// a shelf's second page move up to fill the gaps. They stay playable by id (?game=).
export const HIDDEN = new Set(['art-studio', 'fairy-count']);
const visible = (list, showAll) => [...list.filter((g) => !HIDDEN.has(g.id)), ...(showAll ? list.filter((g) => HIDDEN.has(g.id)) : [])];
const paged = (list) => (list.length <= 12 ? [list] : chunkPages(list, 11));
const chunkPages = (list, n) => { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; };
/** Pages of a Charlie Party shelf ('party' | 'studio'): 11 games a page (+ the More tile), or one page of up to 12. */
export function shelfPages(shelf, showAll = false) {
  if (shelf === 'party') return paged(visible([...partyRest, ...PARTY_GAMES.filter((g) => g.id === LAST)], showAll));
  return paged(visible(STUDIO_GAMES, showAll));
}
/** Molly shelf games (hidden ones only with showAll, at the end). */
export const mollyShelf = (showAll = false) => visible(MOLLY_GAMES, showAll);

/** The game's code (its module), loaded once on demand; also kept on the entry as `.module`. */
const loading = new Map();
export function loadGame(id) {
  const g = gameById(id);
  if (!g || !LOADERS[id]) return Promise.reject(new Error('Unknown game ' + id));
  if (!loading.has(id)) {
    loading.set(id, LOADERS[id]().then((mod) => { g.module = mod; return mod; }, (e) => { loading.delete(id); throw e; }));
  }
  return loading.get(id);
}
