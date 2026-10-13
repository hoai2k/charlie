// Minigame registry. Order here is the order on the Game Select screen
// (party games: page 1 = the first 11, page 2 = the rest, Crown Keeper last; see PARTY_PAGES).
import * as g0 from './sprinkle-catch.js';
import * as g1 from './bumper-bounce.js';
import * as g2 from './pass-the-present.js';
import * as g3 from './balloon-pump.js';
import * as g4 from './troll-trouble.js';
import * as g5 from './spotlight-dance.js';
import * as g6 from './wizard-quickdraw.js';
import * as g7 from './cookie-crumble.js';
import * as g8 from './paint-party.js';
import * as g9 from './broomstick-dash.js';
import * as g10 from './fairy-count.js';
import * as g11 from './crown-keeper.js';
import * as g12 from './pinata-party.js';
import * as g13 from './musical-cushions.js';
import * as g14 from './snowball-splat.js';
import * as g15 from './jump-rope.js';
import * as g16 from './fishing-frenzy.js';
import * as g17 from './tug-of-war.js';
import * as g18 from './cloud-hop.js';
import * as g19 from './pancake-tower.js';
import * as g20 from './treasure-dig.js';
import * as g21 from './mini-golf.js';
import * as g22 from './fashion-show.js';
import * as g23 from './art-studio.js';
import * as g24 from './cake-bakery.js';
import * as g25 from './pet-spa.js';
import * as g26 from './pop-star-stage.js';
import * as g27 from './fairy-garden.js';
import * as g28 from './potion-class.js';
import * as g29 from './memory-match.js';
import * as g30 from './melody-maker.js';
import * as g31 from './bead-bracelets.js';
import * as g32 from './dream-room.js';
import * as g33 from './seek-and-find.js';
import * as g34 from './star-maker.js';
import * as g35 from './sandcastle-beach.js';
import * as g36 from './puppet-theater.js';
import * as g37 from './snowman-builder.js';
import * as g38 from './nail-studio.js';
import * as g39 from './pottery-wheel.js';
import * as g40 from './hair-salon.js';
import * as g41 from './dance-studio.js';
import * as g42 from './acrobat-circus.js';
import * as g43 from './aquarium.js';
import * as g44 from './tea-party.js';
import * as g45 from './sock-match.js';
import * as g46 from './unicorn-jump.js';
import * as g47 from './mermaid-pearls.js';
import * as g48 from './pumpkin-peekaboo.js';
import * as g49 from './ghost-giggles.js';
import * as g50 from './kitten-yarn.js';
import * as g51 from './snowflake-catch.js';
import * as g52 from './trick-or-treat.js';
import * as g53 from './dance-freeze.js';
import * as g54 from './shape-train.js';
import * as g55 from './ballet-butterflies.js';
import * as g56 from './wand-shapes.js';
import * as g57 from './cupcake-stack.js';
import * as g58 from './ladybug-spots.js';
import * as g59 from './bubble-pop.js';
import * as g60 from './balloon-float.js';
import * as g61 from './duckling-parade.js';
import * as g62 from './puppy-splash.js';
import * as g63 from './rainbow-painter.js';
import * as g64 from './garden-grow.js';
import * as g65 from './fairy-flutter.js';
import * as g66 from './fairy-hide-seek.js';
import * as g67 from './muddy-mayhem.js';
import * as g68 from './sneaky-dance.js';
import * as g69 from './bed-bounce.js';
import * as g70 from './prank-troll.js';
import * as g71 from './opposite-ballet.js';
import * as g72 from './whoopee-tea.js';

export const GAMES = [g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12, g13, g14, g15, g16, g17, g18, g19, g20, g21, g22, g23, g24, g25, g26, g27, g28, g29, g30, g31, g32, g33, g34, g35, g36, g37, g38, g39, g40, g41, g42, g43, g44, g45, g46, g47, g48, g49, g50, g51, g52, g53, g54, g55, g56, g57, g58, g59, g60, g61, g62, g63, g64, g65, g66, g67, g68, g69, g70, g71, g72].map((m) => ({ ...m.meta, module: m }));
export const PARTY_GAMES = GAMES.filter((g) => g.category === 'party');
export const STUDIO_GAMES = GAMES.filter((g) => g.category === 'studio');
// Party Games shows 11 games at a time; the 12th tile is "More Games", which
// swaps in the second page. Page 2 = every party game after the first 11,
// with Crown Keeper moved to the end of it.
// Page 1 holds 10 games + the "Molly Party" tile (which took Fairy Count's
// spot; Fairy Count stays playable by id but is off the shelf).
const LAST = 'crown-keeper', RETIRED = ['fairy-count'];
const partyRest = PARTY_GAMES.filter((g) => g.id !== LAST && !RETIRED.includes(g.id));
export const PARTY_PAGES = [partyRest.slice(0, 10), [...partyRest.slice(10), ...PARTY_GAMES.filter((g) => g.id === LAST)]];
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
