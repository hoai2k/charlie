// Session state shared by the menus, the minigame host and results.
import { input } from './engine/input.js';
import { PLAYER_COLORS, CHARACTERS } from './data/characters.js';
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
 *   aiLevel (0..2), stars (session total)
 */
export function makePlayer(index, charId, ctrl, isAI) {
  return {
    index, charId, ctrl, isAI,
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
