// Photo time ("Say cheese!" in Sparkle Bead Shop and Dream Room): until the
// shutter clicks, the left stick moves, A jumps, and every other free button
// strikes a different pose, so players can make a silly, happy or sad photo.
// On a gamepad the d-pad has poses too (the stick alone moves); on a keyboard
// the arrows/WASD are the movement, so their d-pad poses are skipped.
import { sfx } from './audio.js';
import { pick } from './util.js';

export const PHOTO_POSES = [
  { btn: 'b', pose: 'surprised', label: 'Wow!', emote: 'exclaim' },
  { btn: 'x', pose: 'photo', label: 'Peace!' },
  { btn: 'y', pose: 'pose-twirl', label: 'Twirl', dur: 1.0, sound: 'sparkle' },
  { btn: 'lb', pose: 'sad', label: 'Sad', emote: 'tear' },
  { btn: 'rb', pose: 'giggle', label: 'Giggle', emote: 'happy' },
  { btn: 'lt', pose: 'tumble', label: 'Fall', sound: 'bonk' },
  { btn: 'rt', pose: 'hip-bump', label: 'Bump', bump: true },
  { btn: 'up', pose: 'dance-star', label: 'Star!', pad: true },
  { btn: 'down', pose: 'sit', label: 'Sit', pad: true },
  { btn: 'left', pose: 'high-five', label: 'High five', pad: true },
  { btn: 'right', pose: 'strike3', label: 'Ta-da!', pad: true },
  { btn: 'ls', pose: 'dizzy', label: 'Dizzy', emote: 'dizzy' },
  { btn: 'rs', pose: 'pout', label: 'Pout', emote: 'rain' },
];
const HOLD = 1.5;   // a pose holds this long, so it's there when the shutter clicks

/** The photo pose this controller asked for this frame, or null. */
export function photoPosePressed(ctrl) {
  const pad = ctrl.kind === 'pad';
  for (const p of PHOTO_POSES) if ((!p.pad || pad) && ctrl.pressed(p.btn)) return p;
  return null;
}

/** Left-stick movement: on a gamepad the d-pad is for poses, so only the stick moves. */
export function photoMove(ctrl) {
  return ctrl.kind === 'pad' ? { x: ctrl.sx, y: ctrl.sy } : { x: ctrl.x, y: ctrl.y };
}

/**
 * Strike a pose on an Actor. `onBump(actor)` is called for the bump pose so
 * the game can nudge whoever is standing next to them.
 */
export function strikePhotoPose(actor, p, { onBump } = {}) {
  actor.playOnce(p.pose, p.dur || HOLD, 'idle');
  actor.squash(-0.12);
  if (p.emote) actor.emote(p.emote, 1.2);
  if (p.sound) sfx(p.sound, { vol: 0.5 }); else sfx('pop', { vol: 0.35 });
  if (p.bump && onBump) onBump(actor);
}

/** A random pose for CPUs hamming it up. */
export const randomPhotoPose = () => pick(PHOTO_POSES);

/** Hint rows for the screen: two lines of [button, label] pairs. */
export function photoPoseHints(anyPad) {
  const head = [['stick', 'Move'], ['a', 'Jump']];
  const btns = PHOTO_POSES.filter((p) => !p.pad && p.btn !== 'ls' && p.btn !== 'rs').map((p) => [p.btn, p.label]);
  const row1 = head.concat(btns.slice(0, 4));
  const row2 = btns.slice(4).concat(anyPad ? [['dpad', 'More poses']] : []);
  return [row1, row2];
}
