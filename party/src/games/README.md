# Writing a Charlie Party minigame

One file per minigame: `src/games/<id>.js` (add helper files as
`src/games/<id>/*.js` if it gets big). The registry `games/index.js` already
imports every id listed in `PLAN.md`; replace the placeholder file wholesale.

## Contract

```js
import { W, H } from '../engine/canvas.js';           // 1920 x 1080 logical canvas
export const meta = {
  id: 'sprinkle-catch', title: 'Sprinkle Catch',
  category: 'party',                                   // 'party' | 'studio'
  type: 'Free-for-all',                                // short label under the title
  goal: 'Catch the most falling treats!',              // one sentence, kid-readable
  controls: [['stick', 'Run left and right'], ['a', 'Jump']],  // glyphs: stick rstick dpad a b x y lb rb lt rt start
  tips: ['Golden cupcakes are worth 5!', 'Broccoli makes you dizzy.'],  // 2-3 short tips
  music: 'party',      // title menu party chase tense chill dance bouncy victory
  duration: '40 sec',  // shown on the how-to screen
  minPlayers: 1, maxPlayers: 8,
  countdown: true,     // false for studio games (no 3-2-1-GO)
  drawIcon(g, x, y, w, h, t) { /* procedural thumbnail (menus + how-to screen) */ },
};

export class Game {
  constructor(api) {}   // build the world; api.players is ready
  preUpdate(dt) {}      // optional: idle animation during 3-2-1-GO
  update(dt) {}         // gameplay; only called after GO
  postUpdate(dt) {}     // optional: animate during the FINISH! banner
  draw(g) {}            // draw everything incl. HUD; always called
  drawHUD(g) {}         // optional: screen-space HUD; enables the camera (see below)
  onDone() {}           // optional (studio): pause menu "All done!" chosen
  destroy() {}          // optional cleanup
}
```

### `api`
- `api.players` — array of players in slot order. Each: `index` (0..7),
  `tag` ('P1'..'P8' or 'CPU'), `color` (slot color), `charId`, `isAI`,
  `ctrl` (Controller), `aiLevel` (0 Easy default, 1 Normal, 2 Hard), `stars`.
- `api.finish(result)` — end the game. `result`:
  `{ placements: [1, 2, 2, 4], stats: ['12 treats', ...] }` (placements per
  player, 1 = best, ties share; `placementsFromScores(scores)` in util.js
  builds it). Studio games: `{ showcase: true, highlight: playerIndexOrNull,
  stats: [...], title: 'Gorgeous!' }` — everyone gets a star.
- `api.time` seconds since GO, `api.meta`, `api.level`.

The host handles the how-to screen, 3-2-1-GO, pause (Start), FINISH!
banner, results/podium, stars, and crash safety. Don't draw your own
countdown or results screen.

### Input (`p.ctrl`) — identical for gamepads, keyboards and CPUs
`ctrl.x / ctrl.y` (left stick or d-pad, -1..1, +y = down), `ctrl.rx/ry`,
`ctrl.held('a')`, `ctrl.pressed('a')`, `ctrl.released('a')`, `ctrl.nav`
(menu steps with repeat), `ctrl.rumble(0.6, 150)`.
Buttons: a b x y lb rb lt rt start back up down left right.
**Start is reserved for pause.** Prefer A as the main action; B/X/Y extras.

### CPU players
CPUs drive an `AIController` through the same interface: in `update`, for
each `p.isAI` call `p.ctrl.move(x, y)`, `p.ctrl.press('a')` (one-frame tap),
`p.ctrl.hold('a', true/false)`. Then your normal input code handles them.
Use `engine/ai.js`: `aiProfile(p)` (reaction, aimError, mistake, mashRate,
speed), `reactionTime(p)`, `makesMistake(p)`, `steer(p, fx, fy, tx, ty)`,
`mash(p, dt, 'a', state)`, `Brain`. **Easy CPUs must be beatable by a
7-year-old**: slower, distractible, make mistakes. Never let CPUs read
information a human couldn't see (e.g. the hidden answer).

### Characters (`engine/sprites.js`)
```js
const a = new Actor(p.charId, { scale: 1, x, y });  a.snap();
a.x/a.y = feet on the ground; a.z = height above ground (jumps); a.facing = ±1
a.moveAnim(vx, vy, maxSpeed)        // sets facing, walk/idle pose from velocity
a.setPose('walk') / a.playOnce('cheer', 0.5) / a.squash(0.3) / a.flash('#fff') / a.emote('heart', 1)
a.update(dt); a.draw(g, { ring: p.color })        // ring = colored ellipse under the player
a.height, a.width, a.radius (collision suggestion), a.anchor('head'|'hand'|'center')
a.attach((g, info) => draw at info.head / info.hand in forward space)   // crowns, wands, held items
```
Poses: idle walk run jump fall land celebrate cheer pout sad hurt dizzy
surprised think wave ready action throw push carry dance paint sleep.
They work today (procedural animation on the base art) and automatically
use generated sprites later. Characters are 120–190 px tall at scale 1;
groups (KPop trio, Felicity + Fellowfox) are wider — use `a.radius`/`a.width`.
Sort actors by `y` before drawing in top-down games. `drawPortrait(g,
charId, x, y, r, { expr })` for HUD faces. NPC Troll: `new Actor('troll')`.

### Camera (2.5D, opt-in)
Implement `drawHUD(g)` and the host renders `draw(g)` through `api.camera`
(world space, particles included) and `drawHUD(g)` on top in screen space.
Then: `api.camera.punch(x, y, 1.3, 0.5)` for big moments, `frame(points)` /
`follow(x, y, zoom)` for framing, `finish({ ..., focus: { x, y } })` for the
FINISH zoom. The countdown gets a fly-in (`meta.flyIn = false` to opt out).
`depthScale(y)` from `engine/camera.js` makes top-down arenas feel 2.5D
(multiply `actor.scale` by it). Use it sparingly, never hide a player.

### Juice and UI
- `engine/particles.js`: `particles.burst(x, y, { type, count, colors })`
  (confetti spark star heart sparkle dust smoke bubble drop ring petal shard
  note), `particles.popText(x, y, '+1', color)`, `particles.ring(...)`,
  `particles.confettiRain()`. Drawn automatically above your `draw()`.
- `engine/fx.js`: `fx.shake(14, 0.25)`, `fx.flash('#fff', 0.15)`,
  `fx.hitstop(0.05)`, `fx.slowmo(0.4, 0.8)`.
- `engine/audio.js`: `sfx(name, opts)` — names in the SYNTH table (coin,
  collect {step}, jump, land, bounce, pop, bigpop, boom, hit, bonk, whoosh,
  splash, splat, crack, crumble, pump, tick, tock, whistle, correct, wrong,
  star, sparkle, magic, grow, shrink, munch, bubble, water, shutter, brush,
  stamp, swap, flip, dash, stun, roar, stomp, snore, note {midi}, drumroll,
  cheer, fanfare, win, lose, aww, yay, giggle, select, move, back, error).
  `voice(charId, 'yay'|'aww'|'ouch'|'woo'|'laugh'|'gasp')`. `music.beat()`
  for rhythm sync (`music.bpm`).
- `engine/ui.js`: `text`, `panel`, `roundRect`, `glyph`, `hints`, `banner`,
  `timer(g, secondsLeft)`, `scoreboard(g, players, values, { y, format,
  avoidCenter: true, out: [...] , highlight })`, `playerTag(g, p, x, y)`,
  `bar`, `stars`, `sky`, `cloud`, `hills`, `partyBackdrop`, `wrap`, `COLORS`.
- `engine/art.js`: `art('bg/<id>')` / `drawArt(g, 'prop/<name>', ...)` —
  generated art if it exists, else returns null/false: **always draw a
  procedural fallback** (that's what ships today).
- `engine/util.js`: clamp lerp damp ease rand randInt pick chance shuffle
  placementsFromScores Timer Tweens dist angleTo TAU.

## Quality bar (what "done" means)
1. Learnable from the how-to screen alone: `goal`, `controls`, 2–3 `tips`.
2. Works and is fun with 1, 2, 3, 4 and 8 players (layout scales; 1 player
   still has a goal, e.g. beat a target or a CPU-free score attack).
3. Every action has feedback: sound, particles, squash/pose change, and a
   pop-text for points. Big moments get shake/flash/slow-mo.
4. Characters emote: `cheer` when scoring, `hurt`/`dizzy` when bonked,
   `surprised` on scares; eliminated players stay on screen cheering or
   pouting from the sidelines — never just vanish.
5. Clear HUD: scoreboard chips (+ timer when timed). Players can always tell
   which character is theirs (ring color + `playerTag` at least at start).
6. Rounds are short (30–60 s for party games); there's always a winner
   (break ties sensibly or let them share).
7. Easy CPUs are beatable; Normal is a fair fight; Hard is sharp but fair.
8. A good-looking procedural background and `drawIcon` thumbnail that match
   the theme. Kid-friendly: nothing scary, gross or mean.
9. 60 fps with 8 players; no console errors.
10. Self-contained: import only from `../engine`, `../data`, `../state.js`
    and your own files. Don't edit shared engine/scene files — note needed
    engine changes in your final report instead.

## Testing
From the repo root (each agent uses its own `--port`):
```
node party/tools/shot.mjs "?game=<id>&auto=1&skipintro=1" /tmp/x.png --shots 6 --every 4000 --port 8131
node party/tools/shot.mjs "?game=<id>&players=8&auto=1&skipintro=1" ...
node party/tools/shot.mjs "?game=<id>&players=1&humans=1&skipintro=1" ... --keys "hold:KeyD:800,Space,500"
```
`auto=1` makes everyone a CPU (watch the AI play a full round to the
podium). Keyboard P1 = WASD + Space(A) K(B) L(X) I(Y); P2 = arrows + Enter.
`&speed=3` fast-forwards. View the screenshots, and read the printed
console errors. Also check the how-to screen: `?game=<id>` (no skipintro).
