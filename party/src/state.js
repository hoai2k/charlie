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
  cpuLevel: 1,          // Difficulty (Settings): 0 Easy, 1 Normal (default), 2 Hard - CPU players and game challenges
  played: [],           // minigame ids in order
  lastGameId: null,
  partyMode: null,      // { games: [...ids], round } when playing a party marathon
  roster: null,         // the whole party while some players sit out one game (players = who plays it)
  mollyLevel: 'easy',   // Molly Party difficulty: 'easy' (just the A button, no stick) or 'medium'
};

// Molly Party level: Easy (default) plays every Molly game with A (and maybe X)
// only, no stick; Medium is the full controls. Remembered in this browser;
// ?molly=medium|easy in the URL overrides it (testing).
// Difficulty: one setting for every game (Settings, or RB on the character screen). It sets
// how good the CPU players are (engine/ai.js - even Hard stays beatable) and games read it
// for their own challenge (Pop Star's notes...). Remembered in this browser.
const DIFF_KEY = 'charlie-party-difficulty';
try { const v = parseInt(localStorage.getItem(DIFF_KEY), 10); if (v >= 0 && v <= 2) session.cpuLevel = v; } catch (e) { /* storage blocked */ }
export function setDifficulty(v) {
  session.cpuLevel = ((v % 3) + 3) % 3;
  for (const p of [...session.players, ...(session.roster || [])]) if (p.isAI) p.aiLevel = session.cpuLevel;
  try { localStorage.setItem(DIFF_KEY, String(session.cpuLevel)); } catch (e) { /* storage blocked */ }
}
/** 0 Easy, 1 Normal, 2 Hard. */
export const difficulty = () => session.cpuLevel;

export const MOLLY_LEVELS = ['easy', 'medium'];
const MOLLY_KEY = 'charlie-party-molly-level';
try { const v = localStorage.getItem(MOLLY_KEY); if (MOLLY_LEVELS.includes(v)) session.mollyLevel = v; } catch (e) { /* storage blocked */ }
try { const v = new URLSearchParams(location.search).get('molly'); if (MOLLY_LEVELS.includes(v)) session.mollyLevel = v; } catch (e) { /* no location */ }
export function setMollyLevel(v) {
  session.mollyLevel = v;
  try { localStorage.setItem(MOLLY_KEY, v); } catch (e) { /* storage blocked */ }
}
/** True when this game should use its Easy (A-button-only) controls. */
export const mollyEasy = (meta) => meta?.category === 'molly' && session.mollyLevel === 'easy';

/** Players who sat out a game (how-to screen, B) are back in the party. */
export function restoreRoster() {
  if (session.roster) { session.players = session.roster; session.roster = null; }
}
/** Only `playing` take part in the next game (a subset of the party, or Molly
 *  Party's fairy players); restoreRoster() brings the party back. */
export function sitOut(playing) {
  restoreRoster();
  const same = playing.length === session.players.length && playing.every((p, i) => p === session.players[i]);
  if (!same) { session.roster = session.players; session.players = playing; }
}

let aiSerial = 0;

/**
 * Player object passed to every minigame.
 *   index (0..7), tag ('P1' | 'CPU'), color, charId, isAI, ctrl (Controller),
 *   aiLevel (0..2), stars (session total), variant (colour scheme, 0 =
 *   canonical; see data/variants.js), glow (outline colour or null)
 * Pass the player itself to new Actor(p) / drawPortrait(g, p, ...) so its
 * colour scheme shows.
 */
export function makePlayer(index, charId, ctrl, isAI, variant = 0, outfit = null) {
  return {
    index, charId, ctrl, isAI, variant, glow: null,
    outfit,   // dress-up look worn in every game ([{ id, colour }], engine/outfits.js) or null
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
