// Stateless rendering for the small NPCs owned by minigame simulations.
// Their game code keeps movement, lightning, glitter and collision timing.
import { getSpriteSet, ensureSpriteSet, resolvePose, pickFrame } from './sprites.js';

export function drawNpcSprite(g, asset, x, y, height, time, {
  pose = 'idle', facing = 1, alpha = 1, rotation = 0, bob = 0,
} = {}) {
  ensureSpriteSet(asset);
  const set = getSpriteSet(asset);
  const animation = set && (resolvePose(set, pose) || set.poses.idle);
  if (!animation) return false;
  const frame = pickFrame(animation, Math.max(0, time));
  const scale = height / (animation.bodyHeight || set.bodyHeight);
  const anchor = frame.anchor || set.anchor;
  const direction = facing * ((animation.facing ?? set.facing) === -1 ? -1 : 1);
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y + Math.sin(time * 3) * bob);
  g.rotate(rotation);
  g.scale(direction * scale, scale);
  const r = frame.rect;
  if (r) g.drawImage(frame.img, ...r, -anchor[0], -anchor[1], r[2], r[3]);
  else g.drawImage(frame.img, -anchor[0], -anchor[1]);
  g.restore();
  return true;
}
