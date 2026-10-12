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
import * as g34 from './puppet-theater.js';

export const GAMES = [g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12, g13, g14, g15, g16, g17, g18, g19, g20, g21, g22, g23, g24, g25, g26, g27, g28, g29, g30, g31, g32, g33, g34].map((m) => ({ ...m.meta, module: m }));
export const PARTY_GAMES = GAMES.filter((g) => g.category === 'party');
export const STUDIO_GAMES = GAMES.filter((g) => g.category === 'studio');
// Party Games shows 11 games at a time; the 12th tile is "More Games", which
// swaps in the second page. Page 2 = every party game after the first 11,
// with Crown Keeper moved to the end of it.
const LAST = 'crown-keeper';
const partyRest = PARTY_GAMES.filter((g) => g.id !== LAST);
export const PARTY_PAGES = [partyRest.slice(0, 11), [...partyRest.slice(11), ...PARTY_GAMES.filter((g) => g.id === LAST)]];
export const gameById = (id) => GAMES.find((g) => g.id === id);
