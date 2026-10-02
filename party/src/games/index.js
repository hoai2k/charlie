// Minigame registry. Order here is the order on the Game Select screen.
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
import * as g12 from './fashion-show.js';
import * as g13 from './art-studio.js';
import * as g14 from './cake-bakery.js';
import * as g15 from './pet-spa.js';
import * as g16 from './pop-star-stage.js';
import * as g17 from './fairy-garden.js';
import * as g18 from './potion-class.js';
import * as g19 from './memory-match.js';

export const GAMES = [g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12, g13, g14, g15, g16, g17, g18, g19].map((m) => ({ ...m.meta, module: m }));
export const PARTY_GAMES = GAMES.filter((g) => g.category === 'party');
export const STUDIO_GAMES = GAMES.filter((g) => g.category === 'studio');
export const gameById = (id) => GAMES.find((g) => g.id === id);
