# Charlie Party — development plan

A Mario-Party-style minigame collection starring the characters from
Charlie's drawings (`reference/CHARACTERS.md`). Built with plain web tech
(ES modules + Canvas 2D, no build step) and deployed with the rest of the repo
to `/charlie/party/`.

## Design pillars

1. **Couch party first.** Xbox controllers are the primary input for menus and
   play. 1–8 players, tuned for 2–4. CPUs fill empty seats and default to
   *Easy* — they should lose to a 7-year-old most of the time.
2. **Every game is learnable in 15 seconds.** Each minigame opens with a
   Mario-Party-style how-to screen (goal, controls with button glyphs, three
   short tips) and players press **A** to ready up.
3. **Juicy and expressive.** Characters always react: hop when they score,
   pout with a rain cloud when they lose, get dizzy when bonked, celebrate on
   the podium. Particles, screen shake, squash-and-stretch and sound on every
   meaningful action.
4. **Kind competition.** Short rounds (30–60 s), no long eliminations without
   something to do (knocked-out players cheer from the side), creative games
   where everyone wins a star.
5. **Art-agnostic code.** The game runs fully on the canonical character art
   with procedural animation. Generated sprites, portraits, backgrounds,
   props and audio drop in through manifests with no code changes.

## Player flow

```
Title ("Charlie Party", PRESS START; any button → fullscreen + sound)
  → Character Select (Press A to join; pick a character; X/Y add/remove CPU;
                      LB/RB CPU level; everyone ready → A to start)
  → Game Select (Party Games / Play Studio shelves + Random roulette +
                 Party Marathon; star tally for the session)
  → How to Play (rules, controls, tips; everyone presses A)
  → Minigame (3-2-1-GO, play, FINISH!)
  → Results (podium: winners celebrate, losers pout; stars fly into totals)
  → back to Game Select (or Play Again)
```

Party Marathon: 5 random minigames in a row, then a trophy ceremony for the
player with the most stars.

Stars: 1st place 3★, 2nd 2★, 3rd 1★ (ties share). Creative "studio" games give
everyone 1★ (plus a 🏅 to the player the game picks as "showstopper", when it
has a scoring element).

## Roster

12 party entries from 15 canonical characters: Felicity (with Fellowfox
following), KPop Girls (trio, one entry), Bronze, Cotton Candy, Fox, Hotdog,
Marina, Scale, Birthday Cake, Princess Amber, Snowstar, The Last Unicorn.
Duplicates are not allowed (12 characters ≥ 8 players).

Group entries play as one player; followers trail the leader and copy its
pose with a little delay. Mermaids glide (float with a shadow) instead of
walking.

### NPCs (new canonicals needed first — see `image-requests.md`)

| NPC | Role | Used in |
| --- | --- | --- |
| **Glimmer** (fairy host) | Presents every how-to screen, announces results — the Mario Party host | Intro, Results, Fairy Garden, Fairy Count |
| **Shadow Imps** | Cute mischievous shadow creatures that steal the spotlight; banished by music and sparkles (KPop-hunter theme) | Spotlight Dance-Off, Pop Star Stage |
| **Professor Hoot** (owl) | Wizard-school teacher | Wizard Quick-Draw, Broomstick Dash, Potion Class |
| **Troll** (existing canonical) | Grumpy bad guy | Troll Trouble |

## Minigames

### Party Games (12, competitive)

| # | id | Name | Type | How it plays | Key actions |
|---|---|---|---|---|---|
| 1 | `sprinkle-catch` | Sprinkle Catch | FFA, 40 s | Side view. Treats rain from a giant cake in the sky; run left/right to catch. Golden cupcakes are worth 5. Grumpy broccoli bonks you (dizzy 1 s). | walk/run, cheer, dizzy |
| 2 | `bumper-bounce` | Bumper Bounce | Last standing | Top-down on a floating frosted cake. Push with stick, **A** to dash-bump. Edge crumbles over time. Fall off = out (cheer from a cloud). | walk, push, hurt, fall |
| 3 | `pass-the-present` | Pass the Present | Elimination rounds | Hot potato. Holder aims with stick and presses **A** to toss the ticking present. It pops into confetti + soot on whoever holds it; they're out for the round. | carry, throw, surprised, dizzy |
| 4 | `balloon-pump` | Balloon Pump | Race, best of 3 | Mash **A** to pump your balloon. Over-pumping in the red zone doesn't help — rhythm beats panic. First pop wins the round. | action (pump), surprised, cheer |
| 5 | `troll-trouble` | Troll Trouble | Survival + collect | Top-down meadow. Grab gems while the Troll stomps around; he telegraphs a ground-pound and a grab. Caught = drop your gems and get dizzy. Most gems at the end. | run, surprised, dizzy |
| 6 | `spotlight-dance` | Spotlight Dance-Off | Memory | KPop-hunter theme. Shadow Imps show a dance sequence (arrows + A); everyone repeats it. Correct moves blast imps with sparkles; a miss costs a heart. Sequence grows each round. | dance, cheer, hurt |
| 7 | `wizard-quickdraw` | Wizard Quick-Draw | Reaction | Wizard-school duel. Wait for Professor Hoot's lantern to flash, then press **A** to cast first. Too early = fizzle. Fake-outs (lantern flickers, owl blinks). Best of 5. | think, throw (cast), dizzy |
| 8 | `cookie-crumble` | Cookie Crumble | Last standing | Top-down grid of cookie tiles. Tiles you leave crack and fall. **A** to hop over a gap. Last one on the cookies wins. | walk, jump, fall, pout |
| 9 | `paint-party` | Paint Party | Territory, 45 s | Top-down. Everywhere you walk gets your color. **A** = splat bomb (cooldown). Most painted tiles wins. | walk/run, paint, cheer |
| 10 | `broomstick-dash` | Broomstick Dash | Race | Side-scrolling flying race through the wizard-school sky. Hold **A** to rise, release to glide down; fly through star rings to boost, avoid storm clouds. | jump/fall (flying), hurt, cheer |
| 11 | `fairy-count` | Fairy Count | Counting | Fairies of different colors zip across a moonlit garden. Count the pink ones! Pick your number with up/down, lock with **A**. Exact = 3 points, off-by-one = 1. 3 rounds. | think, cheer, pout |
| 12 | `crown-keeper` | Crown Keeper | Keep-away, 45 s | Princess theme. Grab the crown and keep it as long as you can; **A** dashes to bump it loose. Crown holder is a bit slower. Most crown-seconds wins. | run, carry (crown on head), push, hurt |

### Play Studio (8, creative / gentle)

| # | id | Name | Players | How it plays |
|---|---|---|---|---|
| 13 | `fashion-show` | Royal Fashion Show | 1–8 simultaneous | Dress your character: crowns, tiaras, hats, bows, glasses, capes, wings, necklaces, wands, colors. Then walk the runway; press **A** to strike poses while the crowd cheers; snapshot finale. |
| 14 | `art-studio` | Art Studio | 1–4 shared canvas | Each player has a cursor and a brush. Rainbow brush, glitter, stamps of the characters, shapes, fill bucket, undo. Finish → gallery frame with everyone celebrating. |
| 15 | `cake-bakery` | Cake Bakery | 1–4 (each own cake) | Stack layers, pick frosting, drizzle, sprinkles, candles, toppers; then the characters taste it and react with hearts. |
| 16 | `pet-spa` | Pet Spa | 1–4 | Pamper the animal friends (Fellowfox, Fox, Cotton Candy, the Unicorn, Hotdog): bubbles bath, rinse, towel, brush, bows, a treat. Happiness hearts fill up. |
| 17 | `pop-star-stage` | Pop Star Stage | 1–4 rhythm | KPop-hunter theme concert. Notes slide to the beat line; press the matching button (A/B/X/Y) on the beat. Hits shoot sparkles that banish Shadow Imps. Score + combo; everyone dances. |
| 18 | `fairy-garden` | Fairy Garden | 1–4 cooperative | Plant magic seeds, water them, watch them grow into giant glowing flowers; fairies come to visit; catch fireflies. Day → night sky finale. |
| 19 | `potion-class` | Potion Class | 1–4 | Wizard-school. Professor Hoot shows a recipe card; add ingredients in order, stir (rotate the stick), wave the wand. Right recipe = sparkly transformation (giant, tiny, rainbow, floaty); wrong = silly fizz. |
| 20 | `memory-match` | Unicorn Memory Match | 1–4 turns | Flip two cards; match pairs of characters. Matching gives a star burst and an extra turn. Most pairs wins. |

## Architecture

```
party/
  index.html            canvas + module entry (bump ?v= on main.js when shipping)
  src/main.js           boot, main loop, debug URL params
  src/state.js          session: players, stars, CPU level
  src/engine/           canvas, input, audio, sprites, art, particles, fx, ui, emotes, util, scenes, ai
  src/scenes/           title, charselect, gameselect, intro, play (minigame host), results, spriteviewer
  src/games/            one module per minigame + index.js registry
  src/data/characters.js
  assets/characters/    base art (from canonical, 520px WebP)
  assets/sprites/       generated sprite sets (index.json + <asset>/sprites.json)
  assets/art/           generated backgrounds/props/icons (index.json)
  assets/audio/         recorded SFX/music (manifest.json)
  tools/shot.mjs        headless screenshot/test helper
```

### Minigame contract (`src/games/<id>.js`)

```js
export const meta = {
  id, title, category: 'party' | 'studio', type: 'Free-for-all' | ...,
  goal: 'Catch the most sprinkles!',
  controls: [['stick', 'Move'], ['a', 'Jump']],
  tips: ['Golden cupcakes are worth 5!', ...],
  music: 'party', minPlayers: 1, maxPlayers: 8, duration: '40 sec',
  countdown: true,           // 3-2-1-GO before update() starts
  drawIcon(g, x, y, w, h, t) // thumbnail art for menus and the how-to screen
};
export class Game {
  constructor(api)   // api.players, api.finish(result), api.level, ...
  update(dt)         // only runs after GO
  draw(g)            // always runs; draws world + HUD (1920x1080)
}
// api.finish({ placements: [1, 2, 2, 4], stats: ['12 treats', ...], showcase: false })
```

Player AI drives an `AIController` (same interface as a gamepad), so game
logic never branches on human vs CPU. AI difficulty comes from
`player.aiLevel` (0 Easy, 1 Normal, 2 Hard) through `engine/ai.js` helpers
(reaction delays, aim error, mash rate).

## Work breakdown (agents)

| Work package | Agent | Why this size |
| --- | --- | --- |
| Engine core, sprite system, scenes, minigame host, registry | lead (me) | Defines every interface; must be consistent |
| `image-requests.md` + `audio-requests.md` | 1 docs agent (Opus) | Needs image-generation judgment and the full action list |
| Party games 1–3 / 4–6 / 7–9 / 10–12 | 4 agents (Sonnet) | Arcade games with a clear spec; 3 each keeps quality high |
| Studio games 13–15 / 16–18 / 19–20 | 3 agents (Opus) | Open-ended creative tools need more design judgment |
| QA pass: play every game headless as CPUs, fix crashes, tune difficulty | 1 agent (Opus) | Cross-cutting review |
| Sprite generation + animation polish | your image agent, from `image-requests.md` | Needs image generation |

Each minigame agent owns only its own files under `src/games/`, tests with
`?game=<id>&auto=1` and `tools/shot.mjs`, and does not edit shared engine
files (it reports needed engine changes instead).

## Status

Last updated by the lead during the first build pass.

- [x] Engine core + sprite system + sprite viewer (`?scene=sprites`)
- [x] `image-requests.md` (round 1) and `audio-requests.md` — ready for generation
- [x] Menus, how-to screens, minigame host, results podium, marathon trophy
- [x] Xbox controller flow verified with simulated pads (join, pick, start, menus)
- [ ] 12 party games — **in progress** (agents building; files may be half-done)
- [ ] 8 studio games — **in progress**
- [ ] Lead audit of every game, then a QA pass
- [ ] Round 2 of image/audio requests (new poses/props/sounds the games ask for)

### Known not-working yet
- Any minigame whose file still says `PLACEHOLDER` shows a "Coming soon" stub
  (mash A for points). Games mid-build may misbehave or crash; the host
  catches crashes ("Oopsie!" screen, everyone gets a star) so the party
  continues.
- No generated sprites, portraits, NPC art, backgrounds or recorded audio
  yet: everything uses the canonical art with procedural animation, a vector
  stand-in for Glimmer, and synthesized sound. Host voice lines are silent
  until recorded.
- Fullscreen from a controller press alone is blocked by most browsers; a key
  press or click enables it (a tip says so).
