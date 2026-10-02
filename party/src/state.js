// Session state shared by the menus, the minigame host and results.
import { input } from './engine/input.js';
import { PLAYER_COLORS, CHARACTERS, charById } from './data/characters.js';
import { variantPalette, WEAK_VARIANTS } from './data/variants.js';
import { shuffle } from './engine/util.js';

export const MAX_PLAYERS = 8;
export const AI_LEVELS = ['Easy', 'Normal', 'Hard'];

export const session = {
  /** @type {Player[]} in slot order (index 0 = P1) */
  players: [],
  cpuLevel: 0,          // 0 easy (default: CPUs should not be too hard), 1 normal, 2 hard
  played: [],           // minigame ids in order
  lastGameId: null,
  partyMode: null,      // { games: [...ids], round } when playing a party marathon
};

let aiSerial = 0;

/**
 * Player object passed to every minigame.
 *   index (0..7), tag ('P1' | 'CPU'), color, charId, isAI, ctrl (Controller),
 *   aiLevel (0..2), stars (session total), variant (colour scheme, 0 =
 *   canonical; see data/variants.js), glow (outline colour or null)
 * Pass the player itself to new Actor(p) / drawPortrait(g, p, ...) so its
 * colour scheme shows.
 */
export function makePlayer(index, charId, ctrl, isAI, variant = 0) {
  return {
    index, charId, ctrl, isAI, variant, glow: null,
    color: PLAYER_COLORS[index],
    get tag() { return this.isAI ? 'CPU' : 'P' + (this.index + 1); },
    aiLevel: session.cpuLevel,
    stars: 0,
  };
}

export function newAIController() { return input.createAI(aiSerial++); }

/** Characters not used by anyone in `players`. */
export function freeCharacters(players) {
  const used = new Set(players.map((p) => p.charId));
  return CHARACTERS.filter((c) => !used.has(c.id));
}

export function randomFreeCharacter(players) {
  const free = freeCharacters(players);
  return (free.length ? shuffle(free)[0] : CHARACTERS[0]).id;
}

/**
 * Players sharing a character whose recolour is subtle get an outline in
 * their player colour (data/variants.js WEAK_VARIANTS). Call when the party is set.
 */
export function assignGlows(players) {
  for (const p of players) {
    const dup = players.some((o) => o !== p && o.charId === p.charId);
    p.glow = dup && WEAK_VARIANTS.has(p.charId) ? p.color : null;
  }
}

/** Display name, with the colour scheme for alternates: "Golden Fox". */
export function playerName(p) {
  const ch = charById(p.charId);
  if (!ch) return p.tag;
  const pal = variantPalette(ch.id, p.variant);
  return pal ? `${pal.name} ${ch.name}` : ch.name;
}
/** "Golden Fox wins" / "KPop Girls win". */
export function winsText(p) { return `${playerName(p)} ${charById(p.charId)?.plural ? 'win' : 'wins'}`; }
