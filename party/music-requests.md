# Charlie Party: music requests (new songs to generate)

_Written 2026-10-27; prompts revised 2026-10-30 after the first takes._ This is the list of **new** songs that would make parts of
Charlie Party come alive, ranked **most useful first**. Each request has one
prompt block. Copy the block as it is into ElevenLabs Eleven Music (or a
similar music generator). Each block is complete on its own, so there is
nothing to add from elsewhere. Generate about **90 s** per take (in the API,
`music_length_ms: 90000` and `force_instrumental: true`). Make 2 takes of each
so there is a choice.

Specs, processing and earlier prompts are in
[`audio-requests.md`](audio-requests.md): §6.1 (requirements), §6.2 (the
existing song briefs) and §12 (what was delivered and how it was processed).
The way to deliver is at the end of this file.

**What we learned from the first takes (owner, 2026-10-30):** the songs came out
the wrong kind of music. Charlie Party's own theme is **K-pop inspired, in the
spirit of BLACKPINK and LISA**, so every prompt now asks for a little of that
flavour: glossy synth-pop production, a round 808 sub-bass, a crisp snare, light
trap hi-hats and a catchy synth hook, blended with each song's own instruments.
Stronger in the party, show and results songs, just a touch in the gentle ones.
They also lacked the **calm** of the music the game has now (*Cozy Craft Time*,
*Splash Lagoon*, the menu loop), so every prompt now asks for a relaxed,
laid-back groove with space and gentle dynamics, never hyper or harsh. If a take
still comes out too busy, add "sparse arrangement, fewer instruments at once"
to the prompt and generate again.

## Audit: what plays where now

From `SONGS` in `src/engine/audio.js`, `music` in
`assets/audio/manifest.json`, each game's `meta.music`, and the scenes'
`music.play` calls. "Visible" counts only shelf games. Hidden or swapped-out
games are in brackets.

| Song key | Recording | Where it plays | Shelf games |
| --- | --- | --- | --- |
| `title` | ✅ *Charlie's Party* (owner's, streamed) | Title screen. It plays out once into the menus | — |
| `menu` | ✅ ElevenLabs `menu-1` (34 s loop) | Character select, game select, how-to screens; **Unicorn Memory Match**; Dance Studio's "Sunny Stroll" | 1 + all menus |
| `molly` | ✅ *Sister Party* (owner's, streamed; *Molly Time* kept, unused) | Sister Party (Molly) menus and how-to screens | — |
| `party` | ✅ *Bubblegum Radar* (licensed, streamed) | Balloon Pump, Muddy Mayhem, Paint Party, Piñata Party, Sprinkle Catch (Puppy Splash); Prank the Sleeping Troll's ending; Dance Studio | 5 |
| `gameon` | ✅ *Game On Dash* (owner's) | Bumper Bounce, Cloud Hop, Crown Keeper, Mini-Golf, Pancake Tower, Treasure Dig, Tug-of-War (synced to its beat). Musical Cushions stops it at once | 7 |
| `bouncy` | ✅ ElevenLabs `bouncy-1` (45 s loop) | Bubble Pop, Cake Bakery (and its feast), Cupcake Tower, Fairy Flutter, Silly Garden, Jump Rope (rope tuned to 128 BPM), Kitten Cuddles, Puppet Theater, Rainbow Painter, Sock Match, Unicorn Hop, Magic Wand Shapes (Acrobat Circus, Tea Party, Shape Train, Ladybug Spots); Dance Studio | **12 (+4)**: the most over-shared |
| `cozy` | ✅ *Cozy Craft Time* (owner's) | Bead Shop, Dream Room, Nail Studio, Pet Spa (and its parade), Pottery Wheel, Hide & Seek Picnic, Star Maker (Art Studio) | 7 |
| `spooky` | ✅ *Spooky Scramble* (owner's) | Broomstick Dash, Ghost Giggles, Potion Class, Pumpkin Peekaboo, Trick or Treat!, Troll Trouble, Wizard Quick-Draw | 7 |
| `splash` | ✅ *Splash Lagoon* (owner's) | Dream Aquarium (and its night show), Duckling Parade, Fishing Frenzy, Mermaid Pearls, Sandcastle Beach (and its sunset) | 5 |
| `sneaky` | ✅ *Sneaky Tiptoes* (owner's) | Bed Bounce, Fairy Hide & Seek, Prank the Sleeping Troll, Whoopee Tea. Sneaky Dance stops it at once | 4 |
| `dance` | ✅ ElevenLabs *Shadow Banish* (exactly 120 BPM) | **Opposite Ballet**, Dance Studio, Snowman Builder's dance finale; one of 8 songs in Pop Star Stage and Spotlight Dance-Off (Butterfly Ballet) | 4 |
| `chase` | ✅ ElevenLabs `chase-1` (37 s loop) | Balloon Float, Cookie Crumble, **Snowball Splat**, **Snowflake Giggles** | 4 |
| `chill` | ✅ ElevenLabs `chill-1` | Fairy Garden, **Snowman Builder** (Fairy Count); Dance Studio | 2 |
| `runway` | ✅ *Runway Glam* (owner's) | Royal Fashion Show (runway and photo wall), Hair Salon | 2 |
| `tense` | ✅ ElevenLabs `tense-1` | Pass the Present | 1 |
| `victory` | ✅ ElevenLabs `victory-2` | **Only** the Marathon trophy and Dance Studio's "Superstar". It is **not** on the results podium | 0 |
| `rh-*` (7) | ✅ ElevenLabs full songs | Pop Star Stage and Spotlight Dance-Off | 2 |
| `melody` | none (by design) | Melody Maker makes its own music | 1 |
| `tune.js` (no key) | ❌ **synth only** | Musical Cushions, Sneaky Dance (Dance & Freeze): their stop-start party tune | 2 |
| *(nothing)* | ❌ **silence** | **Results / podium**: the music stops, then only `jingle/results`, `fanfare` and the star chimes play | every competitive game |

Moments that would come alive:

| Gap | Today | Request |
| --- | --- | --- |
| Results podium after every competitive game | Silence after the stings | #1 `podium` |
| Play Studio finales and gallery endings (Pet Spa parade, Puppet curtain call, Acrobat finale, Fashion photo wall…) | The building music keeps going | #2 `finale` |
| Halloween games (it's Halloween week) | They share `spooky` with witches, wizards and the troll | #3 `halloween` |
| Molly shelf's little-kid games | 12 games on one 45 s `bouncy` loop | #4 `toybox` |
| Winter games | Chase music and the fairy-garden loop | #5 `snowy` |
| Opposite Ballet | A K-pop idol anthem in a ballet class | #6 `ballet` |
| Mermaid Pearls, the aquarium build | Beach music | #7 `undersea` |
| Puppet Theater's acts | `bouncy` | #8 `puppet` |
| Potion Class, Wizard Quick-Draw | `spooky` | #9 `magic` |
| Last 10 s of timed games (Troll Trouble gets grumpier) | No change | #10 `hurry` |
| Dance Studio show | It borrows the menu, chill and victory loops | #11 `showtime` |
| Cake Bakery baking | `bouncy` (the birthday song itself is already a jingle) | #12 `bakery` |
| Unicorn Memory Match | The menu loop | #13 `memory` |
| Aquarium night show | Beach music by night | #14 `nightshow` |
| Sandcastle sunset tour | Beach music | #15 `sunset` |
| Marathon trophy | The `victory` loop | #16 `champion` |
| Treasure Dig | `gameon`, shared by 7 | #17 `treasure` |
| Musical Cushions, Sneaky Dance | A synth tune | #18 `cushions` (needs engine work) |

Already well covered, no request: the title (the owner's song), the Sister
Party menus (*Sister Party*, the owner's), Fashion Show's runway (*Runway Glam*),
the rhythm games (`rh-*`), Cake Bakery's birthday song (`jingle/happy-birthday`)
and Pass the Present (`tense`).

**New keys need wiring.** Each needs a `SONGS` entry (`{ bpm, recordedOnly: true }`)
and a manifest entry, then either the games' `meta.music` (a plain swap) or a
`music.play(key)` at the moment (finales, podium, last 10 s). Each request
names where.

---

## 1. Podium Party (`podium`, new)

- **Serves:** the results scene (`scenes/results.js`) after every competitive
  game: Party Games, Molly games with a winner, and Play Studio contests.
  Start it after `jingle/results` (about 3.5 s in), under the star tally,
  until the players go on.
- **Why:** it is heard after nearly every game, and now the screen goes silent
  after the sting. (`victory` could be wired there today, but it is a loud
  brass anthem made for the champion.)
- **Tech:** loop, 16–24 bars at **120 BPM, C major** (the palette of `fanfare`
  and `victory`), medium-soft so the stings, `star` chimes and cheers sit on
  top. It must feel kind to the players who didn't win too. A clean bar-line
  loop point, no intro.

```
Warm, happy celebration music for the results podium of a kids' party game, 120 BPM, C major, 4/4. Light pop drums with soft claps on 2 and 4, a bouncy plucked bass, bright glockenspiel and marimba melody, gentle brass pads, a little shimmering bell sparkle. Proud and friendly, everyone did great, a cheerful glow rather than a big fanfare, medium-soft energy so cheers and chimes sit on top, with a lighter breakdown halfway through. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 2. Grand Finale Show (`finale`, new)

- **Serves:** Play Studio finales and gallery endings: Pet Spa's pet parade,
  Puppet Theater's replay and curtain call, Acrobat Circus's finale show,
  Fashion Show's photo wall, Dream Room / Star Maker / Pottery gallery screens
  (the play scene's `gallery` state). Start it when the show or finale begins.
- **Why:** there are about 20 Play Studio games, and at the moment their big
  reveal plays the same music as the building. A change of song tells kids
  "it's showtime!".
- **Tech:** loop, 16–32 bars, **116 BPM**, Bb major. Big and sparkly but warm,
  under applause and camera-flash sounds. A clean loop point, no intro (the
  game's banner and applause do the opening).

```
Sparkling grand finale music for a children's creative game, the moment everyone shows off what they made, 116 BPM, B-flat major, 4/4. Bright toy-box orchestra and pop: plucky pizzicato strings, glockenspiel and celesta melody, bouncy bass, soft marching snare and claps, warm French horns and a little brass swell, harp glissando sparkles. Proud, joyful and magical, like a curtain call with confetti and roses, with a softer section where only strings and bells play. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 3. Trick-or-Treat Parade (`halloween`, new)

- **Serves:** Trick or Treat!, Pumpkin Peekaboo, Ghost Giggles (Molly shelf).
  `spooky` stays with Broomstick Dash, Troll Trouble and (until #9) Potion
  Class and Wizard Quick-Draw.
- **Why:** `spooky` is shared by 7 games. The little-ones' Halloween games
  want a costume-party song that is cute, not creepy, and it's Halloween
  week.
- **Tech:** loop, 16–32 bars, **112 BPM**, D minor with a cheerful major lift.
  A plain `meta.music` swap.

```
Cute, silly Halloween costume party music for little children, 112 BPM, D minor with bright happy moments, 4/4. Bouncy plucked bass and pizzicato strings, a playful harpsichord and celesta tune, xylophone skeleton rattles, a cheeky bassoon, soft woodblock tick-tock, a friendly theremin-like synth used sparingly, light drums. Giggly trick-or-treating with pumpkins and friendly ghosts, more funny than spooky, never scary, with a lighter peekaboo section. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words, no screams. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 4. Toybox Giggles (`toybox`, new)

- **Serves:** the Molly shelf's gentle games now on `bouncy`: Bubble Pop,
  Cupcake Tower, Fairy Flutter, Silly Garden, Kitten Cuddles, Rainbow Painter,
  Silly Sock Match, Unicorn Hop, Magic Wand Shapes. `bouncy` stays with Jump
  Rope (its rope is tuned to 128 BPM) and Cake Bakery.
- **Why:** `bouncy` plays in 12 shelf games on one 45 s loop. That's the
  most-repeated song in the game, and these games are for 4–5 year olds.
- **Tech:** loop, 24–32 bars (the longer the better), **108 BPM**, F major.
  Softer and rounder than `bouncy`. A plain `meta.music` swap.

```
Gentle, giggly toybox music for a game for preschool children, 108 BPM, F major, 4/4. Soft marimba and toy piano melody, a music box twinkle, ukulele strums, round bouncy bass, light shaker, soft kick and finger snaps, an occasional cute boing or bubble pop accent used sparingly. Happy, sunny and simple, like playing with toys on a rug, round and soft with no shrill sounds, with a calmer section where only ukulele and music box play. Production style: a gentle touch of modern K-pop in the spirit of BLACKPINK and LISA: a glossy synth-pop sheen, a soft round 808 sub-bass and a catchy little synth hook under the instruments above, kept subtle. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 5. Snow Day Romp (`snowy`, new)

- **Serves:** Snowball Splat and Snowflake Giggles (now on `chase`), Snowman
  Builder's building (now on `chill`; its dance finale keeps `dance`).
- **Why:** three winter games have no winter sound, and sleigh bells would
  change the whole feel.
- **Tech:** loop, 24–32 bars, **132 BPM**, G major. Lively enough for a
  snowball fight, light enough for building a snowman. A plain `meta.music`
  swap.

```
Bright, playful winter snow day music for a kids' party game, 132 BPM, G major, 4/4. Jingling sleigh bells, sparkling glockenspiel and celesta melody, bouncy pizzicato strings, a cheerful clarinet answer, plucky bass, light snare and claps, twinkly snowflake chimes. Rosy cheeks, snowball fights and building snowmen, giggly and lively but cozy, with a softer snowfall section where only bells and strings play. Not a Christmas carol. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 6. Tutu Twirl (`ballet`, new)

- **Serves:** Opposite Ballet (and Butterfly Ballet, off the shelf).
- **Why:** a ballet class now plays a K-pop dance anthem. The game's moves
  aren't tied to the beat, so any tempo works.
- **Tech:** loop, a **3/4 waltz** at **144 BPM** (48 bars a minute), A major.
  The processing script cuts it by its repeat length (`--lag`), not a 4/4
  grid. A plain `meta.music` swap.

```
Light, playful ballet class waltz for children, in 3/4 time, 144 BPM, A major. Graceful piano melody with a music box and celesta, plucked and bowed strings, a gentle flute, soft harp arpeggios, light triangle. Tiptoeing ballerinas and twirling tutus, elegant but cheeky and fun, with a softer section where the piano plays alone over strings. Production style: a gentle touch of modern K-pop in the spirit of BLACKPINK and LISA: a glossy synth-pop sheen, a soft round 808 sub-bass and a catchy little synth hook under the instruments above, kept subtle. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, no rubato, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 7. Pearl Reef (`undersea`, new)

- **Serves:** Mermaid Pearls and Dream Aquarium's building. `splash` stays
  with the beach and pond games: Sandcastle Beach, Fishing Frenzy, Duckling
  Parade.
- **Why:** both underwater games play beach-party music now. Five games share
  `splash`.
- **Tech:** loop, 24–32 bars, **96 BPM**, E-flat major. Bubbly and floaty. A
  plain `meta.music` swap.

```
Dreamy, bubbly underwater music for a kids' mermaid and aquarium game, 96 BPM, E-flat major, 4/4. Shimmering vibraphone and marimba melody, soft steel drum, harp glissandos like rising bubbles, warm round bass, gentle hand percussion and shaker, airy pad, little water-drop plinks. Swimming with mermaids, fish and sparkling pearls, happy and floaty, with a calmer section where only harp and vibraphone play. Production style: a gentle touch of modern K-pop in the spirit of BLACKPINK and LISA: a glossy synth-pop sheen, a soft round 808 sub-bass and a catchy little synth hook under the instruments above, kept subtle. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 8. Puppet Booth Follies (`puppet`, new)

- **Serves:** Puppet Theater: stage setup and both acts. #2 `finale` can take
  over at the replay and curtain call.
- **Why:** a theatre game with no theatre music. It shares `bouncy` with 11
  other games.
- **Tech:** loop, 24–32 bars, **120 BPM**, C major. Leave room for the
  audience laughs, gasps and applause. A plain `meta.music` swap.

```
Playful vaudeville puppet show music for children, 120 BPM, C major, 4/4. Bouncy honky-tonk piano, cheeky accordion, plucky banjo, oom-pah tuba bass, woodblocks and a light brushed snare, a silly slide whistle and squeaky toy horn used very sparingly. Silly puppets popping up behind a little theatre booth, comic and charming, with a quieter section of piano and pizzicato strings for peekaboo moments. Production style: a gentle touch of modern K-pop in the spirit of BLACKPINK and LISA: a glossy synth-pop sheen, a soft round 808 sub-bass and a catchy little synth hook under the instruments above, kept subtle. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 9. Wand and Cauldron (`magic`, new)

- **Serves:** Potion Class and Wizard Quick-Draw (now on `spooky`). `spooky`
  stays with Broomstick Dash and Troll Trouble.
- **Why:** a magic-school feel (wonder, sparkles) fits wands and potions
  better than a spooky scramble.
- **Tech:** loop, 24–32 bars, **104 BPM**, E minor. Light, with the curiosity
  of `tense` but warmer. A plain `meta.music` swap.

```
Whimsical magic school music for a kids' wizard and potion game, 104 BPM, E minor with warm major moments, 4/4. Sparkling celesta and glockenspiel melody, plucked harp and pizzicato strings, a mysterious but friendly clarinet, soft bubbling marimba, gentle frame drum and shaker, magical chime swirls. Stirring a bubbling cauldron and waving wands, curious, enchanting and fun, never dark or scary, with a quieter section of harp and celesta. Production style: a gentle touch of modern K-pop in the spirit of BLACKPINK and LISA: a glossy synth-pop sheen, a soft round 808 sub-bass and a catchy little synth hook under the instruments above, kept subtle. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 10. Hurry-Up Stomp (`hurry`, new)

- **Serves:** the last 10 s of timed party games, first of all **Troll
  Trouble** (the troll gets grumpier at 10 s, `ANGRY_AT`). Others could
  follow (Sprinkle Catch, Cookie Crumble, Treasure Dig…). Wiring: switch to
  it at 10 s left and back at the end; the play scene draws every limit
  (`api.limit`), so it knows the time.
- **Why:** the end of a round gets a real "last chance!" rush.
- **Tech:** loop, **8 bars** (2 bars of 4/4 at 160 BPM = 3 s, so 8 bars
  = 12 s; a 10 s window hears it once), **160 BPM**, A minor. Starts at full
  energy at sample 0, since it comes in mid-game. A clean loop point.

```
Urgent, comic hurry-up music for the last ten seconds of a kids' party game, 160 BPM, A minor, 4/4. Stomping oom-pah tuba and bassoon, driving snare and tom fills, fast pizzicato strings, cheeky staccato brass stabs, a ticking clock woodblock on every beat. A grumpy cartoon troll stomping about, quick quick quick, funny and exciting, never scary, full energy from the very first beat. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: playful hurry rather than stress: lively but rounded and friendly, never harsh, shrill or aggressive. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 30 seconds.
```

## 11. Spotlight Showtime (`showtime`, new Dance Studio song)

- **Serves:** Dance Studio's music picker (`MUSIC` in
  `games/dance-studio/stage.js`) and the show itself. Add it as a choice; it
  could replace "Sunny Stroll" (`menu`) or "Dreamy" (`chill`), which aren't
  dance songs.
- **Why:** half the picker is borrowed menu and creative loops. Here the
  music is the show.
- **Tech:** the dancers move to the beat (`perform(i, 60 / bpm)`), so it must
  be on an exact grid: exactly **124.000 BPM**, quantized, a kick on every
  beat, downbeat at sample 0, exactly 16 or 32 bars (32 bars = 61.935 s), as
  with `dance` in §6.3. Any key.

```
Sparkly disco-pop dance showcase music for a kids' dance studio game, exactly 124 BPM, A minor, 4/4. Four-on-the-floor kick drum on every beat all the way through, claps on 2 and 4, funky octave synth bass, bright rhythm guitar chops, shiny string stabs, a catchy synth and glockenspiel hook, disco ball sparkle effects. Confident and joyful, dancing in the spotlight, with a lighter section where the kick keeps going. Quantized electronic production. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 12. Mixing Bowl Bop (`bakery`, new)

- **Serves:** Cake Bakery's baking and decorating. The birthday song
  (`jingle/happy-birthday`) and the `bouncy` feast stay as they are.
- **Why:** the bakery has the whole Play Studio stage to itself but shares
  `bouncy` with 11 games.
- **Tech:** loop, 24–32 bars, **116 BPM**, Bb major. A plain `meta.music`
  swap (the feast's `music.play('bouncy')` stays).

```
Happy, sweet kitchen baking music for a kids' cake decorating game, 116 BPM, B-flat major, 4/4. Bouncy jazzy upright bass, light swingless brushed drums, a cheerful whistle-like flute and vibraphone melody, plucky ukulele, playful pizzicato strings, little whisk-like shaker and spoon-clink percussion. Mixing batter, frosting and sprinkles, cozy and cheerful, with a softer section where only vibraphone and bass play. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 13. Unicorn Think-Tank (`memory`, new)

- **Serves:** Unicorn Memory Match (now on `menu`).
- **Why:** it plays the menu loop, so it doesn't feel like a game has
  started. A thinking song suits a contest of remembering.
- **Tech:** loop, 24–32 bars, **100 BPM**, G major. Light and clear: kids are
  concentrating, and the card chimes carry the game. A plain `meta.music`
  swap.

```
Light, sparkly thinking music for a children's unicorn memory card game, 100 BPM, G major, 4/4. Gentle plucked harp and celesta melody, soft marimba, warm pad, a tick-tock woodblock pulse, soft kick and shaker, little magical twinkles. Curious and focused, trying to remember where the cards are, calm and happy with a hint of friendly suspense, uncluttered with space for card chimes, and a quieter section with harp alone. Production style: a gentle touch of modern K-pop in the spirit of BLACKPINK and LISA: a glossy synth-pop sheen, a soft round 808 sub-bass and a catchy little synth hook under the instruments above, kept subtle. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 14. Glow Tank Night Show (`nightshow`, new)

- **Serves:** Dream Aquarium's night show (`startShow()` in
  `games/aquarium.js`: the lights go out and come on one by one, then
  close-ups). Wiring: `music.play('nightshow')` in `startShow()`.
- **Why:** the lights-out moment is the aquarium's big reveal, and at the
  moment the beach music keeps going.
- **Tech:** loop, 16–24 bars, **84 BPM**, D major. Soft and glowing, like a
  lullaby with a pulse.

```
Magical, glowing night-time aquarium show music for children, 84 BPM, D major, 4/4. Dreamy vibraphone and music box melody, soft harp arpeggios, warm string pad, a gentle steel-tongue drum, slow soft pulse of a quiet kick and shaker, twinkling chimes as lights glow one by one. Wonder and calm, glowing fish in a dark blue tank, beautiful and gentle but not sleepy, with a quieter section of harp and music box. Production style: a gentle touch of modern K-pop in the spirit of BLACKPINK and LISA: a glossy synth-pop sheen, a soft round 808 sub-bass and a catchy little synth hook under the instruments above, kept subtle. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 15. Sunset Castle Tour (`sunset`, new)

- **Serves:** Sandcastle Beach's finale: the sunset tour of each castle and
  the group photo (stage `sunset` in `games/sandcastle-beach.js`, after the
  `sc-sunset` sound). Wiring: `music.play('sunset')` there.
- **Why:** the sun goes down and the camera tours the castles, while the
  busy beach loop plays on.
- **Tech:** loop, 16–24 bars, **88 BPM**, A major. Warm and golden.

```
Warm golden sunset music on the beach for a kids' sandcastle game, 88 BPM, A major, 4/4. Gentle ukulele and nylon-string guitar, soft steel drum melody, warm bass, light hand percussion and shaker, soft ocean-wave cymbal swells, a mellow whistle-like flute. Proud and peaceful, admiring sandcastles as the sun sets, happy and glowing, with a quieter section of guitar alone. Production style: a gentle touch of modern K-pop in the spirit of BLACKPINK and LISA: a glossy synth-pop sheen, a soft round 808 sub-bass and a catchy little synth hook under the instruments above, kept subtle. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 16. Champion of the Party (`champion`, new)

- **Serves:** the Party Marathon trophy (`scenes/trophy.js`, now
  `victory`, after `jingle/trophy`). Frees `victory` to stay in Dance
  Studio's picker.
- **Why:** it's the grandest moment of a night, but rarer than a podium.
- **Tech:** loop, 16–24 bars, **132 BPM**, C major (the palette of
  `jingle/trophy` and `fanfare`). A clean loop point, no intro, because the
  jingle is the intro.

```
Grand, triumphant champion anthem for the winner of a whole kids' party game marathon, 132 BPM, C major, 4/4. Bold brass fanfare melody with soaring trumpets and French horns, marching snare rolls and timpani, crash cymbals, tubular bells and glockenspiel sparkle, big punchy pop drums and bass, sweeping strings. Proud, glorious and joyful, like a trophy held high under confetti, with a short softer section of strings and bells before the brass returns. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: proud and glowing rather than loud: a warm, confident groove with room to breathe, never harsh, blaring or aggressive. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 17. Treasure Island Dig (`treasure`, new)

- **Serves:** Treasure Dig (now on `gameon`, shared by 7).
- **Why:** a pirate-y jig would give the dig its own character.
- **Tech:** loop, 24–32 bars, **132 BPM**, D minor with a bright major
  chorus. A plain `meta.music` swap.

```
Jolly pirate treasure hunt music for a kids' party game, 132 BPM, D minor with bright major moments, 4/4. Bouncy accordion and fiddle melody, a cheeky tin whistle, oom-pah tuba bass, stomping drums and tambourine, plucky mandolin, a little cartoon shovel-clink percussion. Digging for gold on a sunny island, adventurous, silly and exciting, never scary, with a lighter section of mandolin and whistle. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words, no shouting. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

## 18. Cushion Shuffle (`cushions`, new; needs engine work)

- **Serves:** Musical Cushions and Sneaky Dance (and Dance & Freeze). They
  stop the shared song and play a synth `tune.js`, which slows down and drops
  in pitch like a record before a freeze.
- **Why:** it's the last synth music in the game, and a real band would sound
  much better. **Only worth generating once the lead adds** a recorded-buffer
  version of `tune.js` (start or resume at a position, `playbackRate` for
  the record slowdown, stop).
- **Tech:** loop, exactly **16 bars at 120 BPM** (32.000 s), quantized, a kick
  on every beat, downbeat at sample 0 (as with §6.3), so the game can resume
  on a beat and keep its beat counter.

```
Bouncy, cheerful musical-chairs party tune for kids, exactly 120 BPM, F major, 4/4. Four-on-the-floor kick on every beat, claps on 2 and 4, marimba and bell melody, off-beat piano chord stabs, bouncy octave synth bass, shaker. Happy party dancing that could stop at any moment, catchy and simple, the same steady groove all the way through. Quantized production. Production style: modern K-pop girl-group pop in the spirit of BLACKPINK and LISA, softened for kids: a glossy, polished synth-pop sheen, a round warm 808 sub-bass, a crisp snappy snare, light trap hi-hat rolls now and then, and a catchy plucky synth hook, blended with the instruments above. Mood and energy: calm and easygoing, a relaxed laid-back groove with airy space and gentle dynamics, unhurried, never hyper, harsh or aggressive, like cozy background music kids can play to for a long time. Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. Seamless loop: no intro, no fade-out, no ending. About 90 seconds.
```

---

## How to deliver

1. **Upload** each chosen take to [`party/intake/`](intake/README.md), as it
   comes out of the generator (any name; it helps to put the key in it, e.g.
   `podium - Podium Party.mp3`). Add a line to the intake README's owner notes
   if a file's purpose isn't clear, or if you liked one take best.
2. **The integrating agent** (per `intake/README.md`) moves each file to
   `assets/audio/music/takes/<key>-<take>.mp3` with `git mv`, cuts the loop and
   matches the level with `tools/audio/music/process.py` (`--nostretch --lag
   --at` for songs without a strict grid, `--intro` to keep an opening; see
   `audio-requests.md` §12.3 and the owner-song notes in `HANDOFF.md`),
   adds the `SONGS` entry (`{ bpm, recordedOnly: true }`) and the manifest
   entry (`file`, `loopStart`, `loopEnd`, `label`, `take`), wires it as the
   request says, logs the prompt and take in `audio-requests.md` §12, and
   removes the file from `intake/` in the same commit.
3. **Specs** (audio-requests.md §2 and §6.1): instrumental, at least 44.1 kHz
   stereo, a clean seam at a bar line, about −16 LUFS after processing.
   Beat-synced songs (#11 `showtime`, #18 `cushions`) follow §6.3: an exact
   tempo, the downbeat at sample 0, an exact whole number of bars.
4. **Listen** in `?scene=audio` (the Takes tab, Y jumps to the seam), then in
   the game at the moment it is for.
