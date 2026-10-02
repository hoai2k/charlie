# Charlie Party: audio requests

This brief is for the audio agent (or a person with recording or
audio-generation tools). Charlie Party already makes every sound it needs
with a Web Audio synthesizer (`src/engine/audio.js`): arcade SFX, voice
stand-ins and a chiptune music sequencer. That covers clicks and bleeps well,
but **crowds, voices, creature sounds, foley and real music can't be
synthesized convincingly**. This document lists exactly those, plus the
mechanism for dropping them in **without code changes**.

The synth version of a sound keeps playing until a file is added, so you can
deliver in any order and in partial batches.

---

## 1. How it works

`assets/audio/manifest.json` maps sound names to files (paths relative to
`assets/audio/`):

```json
{
  "sfx": {
    "cheer": ["sfx/cheer-1.mp3", "sfx/cheer-2.mp3", "sfx/cheer-3.mp3"],
    "roar": "sfx/troll-roar.mp3",
    "voice/felicity/yay": ["voice/felicity/yay-1.mp3", "voice/felicity/yay-2.mp3"],
    "host/go": "host/go.mp3"
  },
  "music": {
    "party": "music/party.m4a",
    "dance": "music/dance.m4a"
  }
}
```

- **`sfx`**: name → one file or **an array of variants**. Each play picks a
  variant at random, so 2–4 variants of frequent sounds (cheer, yay,
  footsteps) keep them from getting annoying. A listed file **replaces** the
  synth version of that name everywhere. Voice clips, host lines and jingles
  also go under `"sfx"`.
- **`music`**: song name → one file. The file loops **as a whole** (Web
  Audio `loop = true` over the entire buffer, with no loop points), and the
  engine fades it in over 0.4 s.
- Everything in the manifest is fetched and decoded when audio starts (after
  the first key or button press). A file that is missing or fails to decode
  is **silently skipped**, and the synth keeps playing for that name. That's
  why you must test (§7).
- File playback honors only the `vol` and `rate` options. Sounds the code
  plays with a **pitch option** (`note` with `midi`, `collect` with `step`)
  ignore that option when a file is used, so they stay synthesized (§3).
- The same name can't fire twice within 25 ms (anti machine-gun).
- `voice(charId, kind)` plays `voice/<charId>/<kind>` if that file exists.
  Otherwise it plays the generic synth stand-in for that kind. It never
  borrows another character's clip.
- Names in the manifest that the code never calls do nothing until the code
  is wired to call them. §5 and §6 list the new names the lead must wire.

### Mixing chain (for level matching)

SFX bus gain 0.75 and music bus gain 0.32 (music sits about 10 dB under
SFX), master 0.8, then a compressor (threshold −14 dB, ratio 4). Deliver
normalized files at the targets below and let the buses do the balancing.

---

## 2. File format and delivery specs

| | SFX, voices, host lines, jingles | Music loops |
| --- | --- | --- |
| Container/codec | **MP3** (`.mp3`) or **AAC** (`.m4a`) | **AAC `.m4a`** preferred, MP3 OK |
| Channels | **Mono** (jingles may be stereo) | Stereo |
| Sample rate | 44.1 or 48 kHz | 44.1 or 48 kHz |
| Bitrate | 96–128 kbps | 128–160 kbps |
| Loudness | **Peak −3 dBFS**. Crowds and voices about −16 LUFS short-term; UI-like sounds peak −6 dBFS | **About −16 LUFS integrated**, true peak −1 dBTP |
| Start | Sound starts **at sample 0** (trim all leading silence; a click-free 2–5 ms fade-in is fine) | **Downbeat at sample 0** |
| End | Short tail, faded to true silence. Most SFX ≤ 1 s, voices 0.3–1.2 s, host lines ≤ 1.8 s | No fade-out; the end must join the start seamlessly (§6) |
| Size budget | ≤ 40 KB typical per clip, ≤ 5 MB for all non-music audio | ≤ 1.2 MB per song (about 45–75 s) |

Why these formats: Safari/iOS (iPad is a target) decodes MP3 and AAC
reliably with `decodeAudioData`. Ogg Vorbis, Opus and WebM fail on older iOS,
so **don't use `.ogg`, `.opus` or `.webm`**. Very short timing-critical clips
may be `.wav` (16-bit mono, only if under about 50 KB), because MP3/AAC
encoders add about 25–50 ms of priming silence in some browsers.

**Why loops must stay short:** every music file is decoded to raw PCM at
load. That is about 23 MB of memory per minute of stereo at 48 kHz, for all
nine songs at once. Keep each loop around **45–75 s** (an integer number of
bars). Song variety comes from the arrangement, not the length.

**Naming and folders** (lowercase, hyphens):

```
assets/audio/sfx/<name>[-n].mp3            e.g. sfx/cheer-2.mp3
assets/audio/voice/<charId>/<kind>[-n].mp3 e.g. voice/bronze/gasp-1.mp3
assets/audio/host/<line>.mp3               e.g. host/go.mp3, host/title/sprinkle-catch.mp3
assets/audio/npc/<npc>/<sound>[-n].mp3     e.g. npc/troll/grumble-1.mp3
assets/audio/jingle/<name>.mp3             e.g. jingle/trophy.mp3
assets/audio/music/<song>.m4a              e.g. music/dance.m4a
```

All content must be **kid-friendly, original, and free to use**: generated,
self-recorded, or CC0 / royalty-free with a license that allows
redistribution on a public GitHub Pages site. Record the source and license
of every file in `assets/audio/CREDITS.md`. Don't use recognizable
copyrighted melodies, sound-alikes of famous game themes, or celebrity or
character voice imitations.

---

## 3. Existing synth SFX: keep or replace?

Every name the code plays today (the `SYNTH` table in `audio.js`) is listed
below. **Keep** means the synth fits the bright arcade style, so don't spend
effort on it. **Replace** means it really wants a recording. Priority 1 is
most noticeable.

### Replace with recordings

| Name | Where it plays | What to deliver | Variants | Priority |
| --- | --- | --- | --- | --- |
| `cheer` | Results, wins, big moments, Fashion Show crowd | **Crowd of kids cheering and whooping** (party-sized, 15–30 voices, not a stadium), 1.5–2.5 s, fast attack and natural decay | 3 | 1 |
| `aww` | Losing a round, near misses | **Sympathetic crowd "awww"**: warm, kind, a little comic, never mocking, 0.8–1.2 s | 2–3 | 1 |
| `yay` | Scoring, small wins | **Small group of kids: "Yay!"**, short and bright, 0.4–0.7 s | 3 | 1 |
| `giggle` | Silly moments, laugh stand-in | **Kids giggling**, 0.5–0.9 s | 3 | 2 |
| `roar` | Troll appears or slams | **Comic grumpy troll grumble-roar**: big, belly-deep "GRRAAWWRR-hmph!", more grouchy grandpa than monster, 0.8–1.2 s. Must not frighten a 5-year-old | 2 | 1 |
| `snore` | Troll sleeping (loops by repetition) | **Cartoon troll snore**: rumbling inhale plus whistling exhale, about 1.5 s, starts and ends quiet so it repeats | 2 | 2 |
| `stomp` | Troll footsteps, heavy landings | **Heavy cartoon footstep thud** with a little ground rumble, ≤ 0.35 s | 3 | 2 |
| `munch` | Eating and tasting (Cake Bakery, Pet Spa treat, Sprinkle Catch) | **Crunchy cartoon munch-munch**, 0.3–0.5 s | 3 | 2 |
| `splash` | Pet Spa bath, water | **Bath-water splash**, playful, 0.4–0.8 s | 2 | 2 |
| `shutter` | Fashion Show photo finale | **Camera shutter click plus flash-charge whine**, ≤ 0.6 s | 1–2 | 2 |
| `bigpop` | Balloon pops (Balloon Pump), present pops | **Real balloon pop**, sweetened with a confetti rustle, ≤ 0.5 s | 2 | 1 |
| `boom` | Present explodes into confetti and soot, big impacts | **Cartoon poof-boom**: soft "fwoomp" plus confetti, not an explosion, ≤ 0.8 s | 2 | 2 |
| `crack` | Cookie tile cracks (Cookie Crumble) | **Cookie snap**, ≤ 0.25 s | 3 | 2 |
| `crumble` | Cookie tile falls | **Cookie crumbling into crumbs**, 0.3–0.5 s | 2 | 2 |
| `pump` | Each pump in Balloon Pump (mashed up to about 8/s) | **Bicycle/hand pump "pff"** with a hint of rubber squeak. **Very short (≤ 0.15 s)** so mashing doesn't smear | 3 | 1 |
| `splat` | Paint splat bombs, wet hits | **Wet paint splat**, ≤ 0.3 s | 3 | 2 |
| `water` | Watering plants (Fairy Garden), rinsing | **Watering-can sprinkle/pour**, 0.5–0.8 s | 2 | 3 |
| `drumroll` | Before the results reveal | **Snare drum roll**, 1.5 s, ending on a clean stop (no cymbal; the fanfare follows) | 1 | 2 |
| `whistle` | Round start/end in some games | **Referee pea-whistle**, short, ≤ 0.5 s | 1 | 3 |
| `bubble` | Pet Spa bubbles, potion bubbles | **Single soft bubble pop** (blip-y), ≤ 0.12 s | 4 | 3 |
| `brush` | Pet Spa brushing, Art Studio | **Soft brush stroke or scrub**, ≤ 0.2 s | 3 | 3 |
| `flip` | Memory Match card flip | **Card flip "fwip"**, ≤ 0.15 s | 2 | 3 |

### Keep the synth (fine as-is or must stay synthesized)

`blip`, `move`, `select`, `back`, `join`, `ready`, `error`, `coin`,
**`collect`** (pitched by `step`, must stay synth), `jump`, `land`, `bounce`,
`pop`, `hit`, `bonk`, `whoosh`, `tick`, `tock`, `count`, `go`, `correct`,
`wrong`, `star`, `sparkle`, `magic`, `grow`, `shrink`, **`note`** (pitched by
`midi` for the rhythm games, must stay synth), `stamp`, `swap`, `dash`,
`stun`.

The jingles `fanfare`, `win` and `lose` are covered in §6.4, which upgrades
them to produced versions.

---

## 4. Character voice clips

Keys: `voice/<charId>/<kind>`. `charId` is the **party entry id** from
`src/data/characters.js`, so a group entry is one voice set.

Kinds (from `VOICE_KINDS` in `audio.js`) and when they play:

| Kind | Moment | Length |
| --- | --- | --- |
| `hello` | Joining at character select ("that's me!") | 0.4–1.0 s |
| `ready` | Locking in / pressing A on the how-to screen | 0.4–0.9 s |
| `yay` | Winning, scoring, celebrating | 0.4–1.0 s |
| `aww` | Losing, missing (pouty, funny-sad) | 0.5–1.0 s |
| `ouch` | Bonked, bumped, dizzy | 0.2–0.5 s |
| `woo` | Excited: jumps, boosts, close calls survived | 0.3–0.8 s |
| `laugh` | Having fun, silly moments | 0.5–1.0 s |
| `gasp` | Surprised: present arrives, Troll notices, balloon pops | 0.2–0.5 s |

General direction:

- **Non-verbal or one or two words**, such as "Hi!", "Ready!", "Yay!",
  "Aww…", "Ow!", "Woo-hoo!", a laugh, a gasp. They should be
  language-neutral and readable without subtitles.
- Bright, warm and cartoony. Performances should match the sprite
  personalities in `reference/CHARACTERS.md`.
- Deliver **2 variants per kind** (3 for `yay` and `ouch`, which play often),
  which is about 200 clips. The lines are tiny, so per-clip effort is low.
- The voices may be generated, performed by adults voicing youthful
  characters, or recorded by Charlie and her family. A homemade take of a
  favorite character is a lovely option and uses the same format.

| `charId` | Character | Voice direction |
| --- | --- | --- |
| `felicity` | Fox girl **+ Fellowfox** | Welcoming, adventurous girl with a bright and lively voice. **Layer a tiny Fellowfox yip** after hello, yay and woo ("Hi! *yip!*"). For aww, add a little sympathetic whimper from Fellowfox |
| `kpop-girls` | The trio | **Three distinct voices together**: overlapping or in quick succession, sometimes in harmony. hello is a staggered "Hi! / Hey! / Hiii!". ready is a unison "Let's go!". yay is a harmonized "Yeah!". aww is a group "awww". laugh is a three-way giggle. Confident and upbeat, like idol performers |
| `bronze` | One-eyed robot | **Cute robot beeps, boops and servo whirs, no words.** hello is a rising boop-beep-bweep. yay is a happy chirp arpeggio plus a spring "boing". aww is a descending, slowing "bwoo-oo-oo" power-down. ouch is a clank plus a static sputter. gasp is a sharp up-chirp. laugh is a rapid beeping trill. Earnest and curious, not menacing. (Original sounds; no imitation of famous movie robots) |
| `cotton-candy` | Pony with rainbow mane | Sunny, sweet **pony whinny-giggles**: a light "hee-hee-neigh" for hello and yay, a soft nicker for ready, a little huff for aww, a short squeal for gasp |
| `fox` | Springy orange fox | Playful **fox yips, chirps and chatter** ("ack-ack-ack!"), happy panting for yay and woo, a yelp for ouch, a high whine for aww |
| `hotdog` | Fluffy rainbow creature | **Exuberant, silly creature gibberish**: goofy trills, "hoo-hoo!", a raspberry for aww, big bouncy "wheee!" for woo, a squeaky giggle for laugh. Fuzzy and lovable |
| `marina` | Red-haired mermaid | Friendly and confident: "Hi there!", a splashy "Woo-hoo!", a bubbly laugh. A light watery shimmer layered under yay and woo is a nice touch |
| `scale` | Blonde mermaid | Poised and gentle, a little royal: a soft "Hello!", a delighted "Oh!" for gasp, a graceful "Hooray!" for yay, a prim "hmph" for aww |
| `marshmallow-birthday-cake` | Birthday Cake | **Squishy, bouncy marshmallow squeaks** with a cheerful high voice. yay ends with a **party-horn toot**. aww is a deflating "awww" like a sinking soufflé. ouch is a "squish!". laugh is a jiggly giggle |
| `princess-amber` | Kind princess | Warm, composed and kind: "Hello!", "How lovely!" for yay, a gentle giggle, a soft "oh dear" for aww |
| `snowstar` | Big-face curious girl | Imaginative and full of wonder: a big "Ooooh!" for woo and gasp, "Hiii!" for hello, an excited squeal for yay, and a wobbly, big-eyed "awww" |
| `unicorn` | The Last Unicorn | **Serene and gentle, no words**: a soft, airy whinny layered with a delicate **magical chime shimmer**. hello is a soft nicker plus chime. yay is a brighter whinny plus a sparkle swell. aww is a quiet sigh. gasp is a soft intake plus a bell. Never loud |

Example manifest lines:

```json
"voice/bronze/yay": ["voice/bronze/yay-1.mp3", "voice/bronze/yay-2.mp3", "voice/bronze/yay-3.mp3"],
"voice/kpop-girls/ready": ["voice/kpop-girls/ready-1.mp3", "voice/kpop-girls/ready-2.mp3"]
```

The NPCs have no `voice()` kinds yet. Their sounds are in §5.2.

---

## 5. Host Glimmer and the NPCs (new keys; the lead must wire them)

**Wired (lead):** §5.1 host lines play through `host('<key>')` (title,
character select, how-to, countdown, finish, results, roulette, marathon,
trophy), and the §6.4 `jingle/*` keys play at their moments. §5.2 NPC sounds
and §5.3 extra SFX are wired by each minigame as it is polished. They have no synth fallback, so when a file is missing the code
should simply stay silent (that's already `sfx()`'s behavior for unknown
names).

### 5.1 Glimmer, the fairy host (`host/…`)

Glimmer is a tiny, bubbly fairy game-show host (see `image-requests.md` §8.1).
Her voice is bright, sing-song and encouraging, with sparkle and energy but
**not shrill**. She sounds like a friendly kids'-TV presenter who is
thrilled for everyone. A soft fairy-chime shimmer may be layered on
"Charlie Party!", the winner callouts and "Everyone's a star!". Each line is
≤ 1.8 s, mono, with no music bed. Deliver 1 take each (2 for the most
frequent: `ready`, `go`, `finish`).

| Key | Line | When |
| --- | --- | --- |
| `host/charlie-party` | "Charlie Party!" | Title screen, on press start |
| `host/welcome` | "Welcome to Charlie Party!" | First visit to character select |
| `host/pick-character` | "Pick your character!" | Character select |
| `host/how-to` | "Here's how to play!" | How-to screen opens |
| `host/press-a` | "Press A when you're ready!" | How-to screen |
| `host/ready` | "Ready?" | Before the countdown |
| `host/count-3`, `host/count-2`, `host/count-1` | "Three!", "Two!", "One!" | Countdown (each ≤ 0.6 s, so they can sit on 1-second ticks) |
| `host/go` | "Go!" | Start |
| `host/finish` | "Finish!" | End of a minigame |
| `host/time-up` | "Time's up!" | Timed games end |
| `host/next-round` | "Next round!" | Multi-round games |
| `host/final-round` | "Final round!" | Last round |
| `host/winner-is` | "And the winner is…" | Before the results reveal (pairs with `drumroll`) |
| `host/name/<charId>` ×12 | "Felicity and Fellowfox!", "The KPop Girls!", "Bronze!", "Cotton Candy!", "Fox!", "Hotdog!", "Marina!", "Scale!", "Birthday Cake!", "Princess Amber!", "Snowstar!", "The Last Unicorn!" | Winner callout (use the `charId`s from §4) |
| `host/tie` | "It's a tie!" | Shared first place |
| `host/everyone-star` | "Everyone's a star!" | Play Studio results |
| `host/showstopper` | "Showstopper!" | Studio games' 🏅 award |
| `host/so-close` | "So close!" | Consolation (sparingly) |
| `host/great-job` | "Great job!" | General praise |
| `host/perfect` | "Perfect!" | Rhythm and memory streaks |
| `host/oops` | "Oopsie!" | Funny fails (fell off, fizzled) |
| `host/random` | "Random pick!" | Roulette on game select |
| `host/marathon` | "Party Marathon!" | Starting a marathon |
| `host/last-game` | "Last game!" | Marathon game 5 |
| `host/champion` | "Our party champion is…" | Marathon trophy ceremony |
| `host/title/<gameId>` ×20 | The game's name, said with flair | How-to screen opens |

The game titles for `host/title/<gameId>` are: `sprinkle-catch` "Sprinkle
Catch!", `bumper-bounce` "Bumper Bounce!", `pass-the-present` "Pass the
Present!", `balloon-pump` "Balloon Pump!", `troll-trouble` "Troll Trouble!",
`spotlight-dance` "Spotlight Dance-Off!", `wizard-quickdraw` "Wizard
Quick-Draw!", `cookie-crumble` "Cookie Crumble!", `paint-party` "Paint
Party!", `broomstick-dash` "Broomstick Dash!", `fairy-count` "Fairy Count!",
`crown-keeper` "Crown Keeper!", `fashion-show` "Royal Fashion Show!",
`art-studio` "Art Studio!", `cake-bakery` "Cake Bakery!", `pet-spa` "Pet
Spa!", `pop-star-stage` "Pop Star Stage!", `fairy-garden` "Fairy Garden!",
`potion-class` "Potion Class!", `memory-match` "Unicorn Memory Match!".

### 5.2 NPC sounds (`npc/…`)

| Key | Sound | Notes |
| --- | --- | --- |
| `npc/troll/grumble` | Low grumpy muttering "hrmmph-grumble-grr", 1–1.5 s | Troll Trouble idle/walk. 3 variants. Comic, never scary |
| `npc/troll/laugh` | Big belly "HUR-HUR-HUR!", about 1 s | After he catches someone. 2 variants |
| `npc/troll/yawn` | Huge cavernous yawn ending in a smack of the lips, about 1.5 s | Before sleeping |
| `npc/troll/windup` | Rising strained "hnnnnnn-" grunt, about 0.8 s | Ground-pound telegraph (it must cue kids to dodge) |
| `npc/hoot/hoo` | Warm owl "Hoo-hoo!" | Professor Hoot. 2 variants |
| `npc/hoot/ready` | "Wands at the ready…" in a kindly, slightly dramatic professor voice, ≤ 1.8 s | Wizard Quick-Draw lead-in |
| `npc/hoot/bravo` | "Splendid!" / "Bravo!" | Potion success. 2 variants |
| `npc/imp/giggle` | Tiny mischievous gremlin giggle, high and squeaky, 0.4–0.7 s | Shadow Imps taunting. 3 variants |
| `npc/imp/eep` | Startled squeak, ≤ 0.3 s | Imp caught in the spotlight |
| `npc/imp/poof` | Glittery poof plus a fading "nyaa~" raspberry, ≤ 0.6 s | Imp banished |
| `npc/fairy/chime` | Tiny bell twinkle, ≤ 0.4 s | Garden fairies flitting. 3 variants |

### 5.3 Extra SFX keys games will likely want (also need wiring)

| Key | Sound | For |
| --- | --- | --- |
| `applause` | Kids clapping and cheering, 2–3 s | Fashion Show runway, Art Studio gallery, results |
| `crowd-ooh` | Impressed crowd "ooooh!", about 1 s | Close calls, big combos |
| `crowd-gasp` | Crowd gasp, ≤ 0.6 s | Present about to pop, someone falling off |
| `tick-tock` | Cartoon ticking clock loop, 1 s (seamless) | Pass the Present's ticking present |
| `balloon-stretch` | Rubbery balloon squeak or stretch, ≤ 0.4 s | Balloon Pump red zone |
| `fizzle` | Comic spell fizzle "pfft-pffzz", ≤ 0.6 s | Early press in Wizard Quick-Draw, wrong potion |
| `zap` | Bright magic spell cast "fwoosh-ting!", ≤ 0.5 s | Wand casts |
| `cauldron` | Bubbling cauldron, 2 s seamless loop | Potion Class ambience |
| `stir` | Wooden spoon stir swish, ≤ 0.4 s | Potion Class |
| `squeak` | Rubber duck squeak | Pet Spa |
| `towel` | Fluffy towel rub, ≤ 0.5 s | Pet Spa |
| `thunder` | Small cartoon thunder rumble, ≤ 1 s | Storm clouds in Broomstick Dash |
| `ring` | Bright sparkly "shwing" for flying through a star ring | Broomstick Dash boost |
| `grow-flower` | Magical plant growth sweep with leaves rustling, about 1 s | Fairy Garden |

---

## 6. Music

### 6.1 General requirements

- **Kid-friendly, upbeat and non-annoying on repeat.** A song may loop 3–5
  times per minigame and play across a long party night. Avoid shrill leads
  that are always on, constant high hats or relentless busy melodies. Give
  each loop a lighter breakdown section.
- **Original** compositions in a modern, bright "party game" style
  (chiptune-flavored pop, toy-box orchestral, light EDM). No recognizable
  melodies.
- **Instrumental only** (no vocals), so the host voice and character voices
  sit on top. Keep the 1–4 kHz presence region a bit clear for voices.
- **Exact tempo** as listed (matching `SONGS` in `audio.js`), straight 16ths
  (no swing), and no tempo or key changes inside the loop.
- **Seamless loop.** The file length is an exact whole number of bars
  (samples = bars × 4 × 60 / bpm × sample rate). The downbeat is at sample 0,
  with no lead-in silence, no fade-out and no count-in. Wrap any reverb or
  delay tail from the end back onto the start so the seam is inaudible.
- **Length** of about 45–75 s per loop (memory, §2).
- **Codec padding:** MP3 and AAC can add a few ms of silence at the edges in
  some browsers, which causes a click or gap at the loop seam. Test in Chrome
  **and** Safari (§7). If there's an audible gap, try the other codec (AAC
  `.m4a` encoded with gapless metadata usually behaves best). If neither is
  clean, tell the lead: the engine should then support loop points
  (`{"file": …, "loopStart": s, "loopEnd": s}`), see §8.

### 6.2 Song briefs (names must match `SONGS`)

Root and scale are those of the current synth version. Matching them keeps
the feel, and it is **required for `dance`**. Usage is the lead's suggestion
(each game chooses its song in `meta.music`).

| Song | BPM | Key (synth) | Mood and use | Instrumentation ideas | Loop |
| --- | --- | --- | --- | --- | --- |
| `title` | **124** | C major | **The theme of Charlie Party.** Joyful, inviting, "the party is starting!" A memorable 4-bar hook that kids will hum. Title screen | Bright synth-pop with glockenspiel lead, claps, plucky bass, a big but friendly chorus lift | 16–32 bars (31–62 s) |
| `menu` | **112** | F major | Relaxed, happy browsing. Character and game select (people chat over it) | Soft ukulele/marimba, light shaker, warm pad, gentle bass; low energy, no busy lead | 16–24 bars (34–51 s) |
| `party` | **138** | D major | Energetic, bouncy competition: the default for party minigames (Sprinkle Catch, Cookie Crumble, Paint Party, Crown Keeper…) | Chiptune-pop: square-wave arps plus real drums, slap bass, brass stabs | 32 bars (≈56 s) |
| `chase` | **156** | A minor | Playful-urgent "run!", **comic, not scary**. Troll Trouble, Bumper Bounce, Broomstick Dash | Galloping bass, pizzicato strings, tom fills, a cheeky bassoon/tuba line, staccato synth | 32 bars (≈49 s) |
| `tense` | **120** | G minor | Suspenseful but cute: "ooh, who will it be?" Pass the Present, Wizard Quick-Draw, Balloon Pump | Ticking percussion, plucked low strings, celesta motif, sparse; builds without peaking (gameplay provides the peaks) | 24–32 bars (48–64 s) |
| `chill` | **92** | E major | Cozy, dreamy, creative. Fairy Garden, Pet Spa, Art Studio, Memory Match, Fairy Count | Music box, soft Rhodes, felt piano, acoustic guitar, light brushes, gentle chimes | 16–24 bars (42–63 s) |
| `dance` | **120 (exact)** | **C minor** | **Drives the rhythm games** (Pop Star Stage, Spotlight Dance-Off): a catchy, empowering K-pop-style idol anthem with heroes banishing shadows with music. Sparkly and confident | Four-on-the-floor kick **on every beat**, claps on 2 and 4, punchy synth bass, bright synth lead, sparkle FX | **Exactly 16 or 32 bars (32.000 s or 64.000 s)**. See §6.3 |
| `bouncy` | **128** | G major | Silly and boingy, cartoon fun: Balloon Pump, Cake Bakery, Sprinkle Catch (alternative) | Bouncy tuba/bass, xylophone, slide whistle accents (sparingly), kazoo-ish lead, woodblocks | 16–32 bars (30–60 s) |
| `victory` | **132** | C major | Triumphant celebration. Results podium, after the fanfare | Brass fanfare-pop, drum-corps snare, bells, a big major-key chorus | 16 bars (≈29 s) |

### 6.3 `dance` precision requirements (rhythm game sync)

The rhythm games compute hit timing from `music.beat()`. That is
`(now − start) × 120 / 60`, where `start` is the moment the file starts
playing, so **beat 0 must be the very first sample of the file**.

- Tempo exactly **120.000 BPM** (one beat = 0.5 s), quantized, with no
  humanized drift.
- **Downbeat (kick) at sample 0**, with no pickup and no silence.
- Length exactly **N × 2.000 s** with N = 16 or 32 bars. At 44.1 kHz,
  16 bars is exactly 1,411,200 samples. At 48 kHz it is 1,536,000.
- An audible kick on every beat throughout (with no drop-outs longer than
  2 beats, and the beat stays felt in breakdowns), so kids can feel the
  pulse.
- Key of **C minor** (or its relative Eb major palette), because the game
  plays pitched `note` SFX on hits that are tuned to that scale.
- After encoding, verify that the decoded length is still exact and the
  first transient is within 5 ms of the start (§7).

### 6.4 Jingles and stings (`sfx` keys, not looping)

These replace or add one-shot jingles. Produce them in the same palette as
`title` and `victory` so they feel like one soundtrack.

| Key | Status | Length | Brief |
| --- | --- | --- | --- |
| `fanfare` | Overrides the synth | 2–3 s | **Winner fanfare** at the results reveal: brass and bells, triumphant, ending on a bright held chord |
| `win` | Overrides the synth | 1–1.5 s | **Round won**: quick happy ascending flourish |
| `lose` | Overrides the synth | 1.5–2 s | **Lose**: a gentle comic "wah-wah" (a soft muted trombone, *kind*, not mocking), ending with a little upbeat "oh well!" button so it doesn't feel like a punishment |
| `star` | Overrides the synth (optional) | 0.3–0.5 s | Star award chime as each star flies into a player's total (it plays several times in a row, so keep it short and sweet) |
| `jingle/results` | New | 3–4 s | **Results screen sting**: drumroll-to-ta-da as the podium appears |
| `jingle/star-award` | New | 1.5–2 s | Glittery "you got stars!" swell for the star-tally moment |
| `jingle/showstopper` | New | 1.5 s | Shiny medal sting for the studio 🏅 |
| `jingle/trophy` | New | 5–7 s | **Party Marathon champion**: the grandest moment, with a full fanfare, choir "aah" pad and cymbal swell, ending on a held chord with sparkle |
| `jingle/marathon-start` | New | 2–3 s | "Here we go!" Marathon kickoff, with a rising, exciting build |
| `jingle/round` | New | ≤ 1 s | Short transition sting for the next round in multi-round games |

---

## 7. Delivery and test steps

1. **Drop the files** into `party/assets/audio/` using the folder layout in
   §2.
2. **Update `party/assets/audio/manifest.json`.** Keep it valid JSON
   (`python3 -m json.tool party/assets/audio/manifest.json`).
3. **Check that every listed file exists and decodes.** The engine skips bad
   files silently. From the repo root:

   ```bash
   python3 - <<'EOF'
   import json, os, subprocess
   base = 'party/assets/audio/'
   m = json.load(open(base + 'manifest.json'))
   files = [f for v in m.get('sfx', {}).values() for f in (v if isinstance(v, list) else [v])] + list(m.get('music', {}).values())
   for f in files:
       p = base + f
       if not os.path.exists(p): print('MISSING', p); continue
       out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=sample_rate,channels', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.split()
       print(f, out)
   EOF
   ```

   Check loudness with
   `ffmpeg -i file -af ebur128=peak=true -f null - 2>&1 | tail -12`.
   For loops, confirm the exact duration (bars × 4 × 60 / bpm) and listen to
   the seam: `ffmpeg -stream_loop 2 -i music/dance.m4a seam-test.wav`.
4. **Listen in the game.** Serve the repo (for example
   `npx http-server /home/user/charlie -p 8123 -c-1`) and open
   `http://localhost:8123/party/` in Chrome. Press any key first to unlock
   audio. Then, in the DevTools console:

   ```js
   const a = await import('./src/engine/audio.js');   // same module instance the game uses
   a.sfx('cheer'); a.voice('felicity', 'yay'); a.sfx('host/go');
   a.music.play('dance'); setInterval(() => console.log(a.music.beat().toFixed(2)), 500);   // clap along: whole numbers = kicks
   a.music.stop();
   ```

   Play a few real games (`?game=<id>` with the ids in §5.1) to hear the
   files in context against the synth SFX and music. The console should show
   no errors (`node party/tools/shot.mjs "?game=sprinkle-catch&auto=1" /tmp/s.png`
   prints console errors). Some games may not exist yet.
5. **Test on Safari/iOS (iPad) if at all possible**, because it is the
   strictest decoder. Listen for loop clicks, silent files and memory
   trouble.
6. Record the sources and licenses in `party/assets/audio/CREDITS.md`.
7. **Commit and push.** Per the repo's `CLAUDE.md`, commit on `main` and
   `git push origin main` (Pages deploys automatically). Commit in small
   batches (for example "crowd SFX", "voices: bronze", "music: dance").
   Don't edit engine code from the audio task. Report needed wiring
   (§5) to the lead instead.

---

## 8. Notes for the lead (engine follow-ups)

Done: `host()` helper with no-overlap, music entries may be objects
`{ "file", "loopStart", "loopEnd", "offset" }`, music decodes lazily on
first play (max 3 decoded songs kept). Still open: `?scene=audio` test page.


- **Wire the new keys** in §5 (`host/*`, `npc/*`, the extra SFX in §5.3, and
  `jingle/*` in §6.4). `sfx()` already plays any manifest key and ignores
  unknown ones, so the wiring is just calls at the right moments. Consider a
  small helper such as `host('go')` that skips silently when absent, and a
  per-key cooldown so host lines never overlap.
- **Music loop points and sync offset**: allow a music manifest entry to be
  an object `{ "file", "loopStart", "loopEnd", "offset" }` (set
  `AudioBufferSourceNode.loopStart/loopEnd` and shift `music.start` by
  `offset`). This makes MP3/AAC padding harmless and lets the rhythm game be
  calibrated.
- **Lazy-load music**: decode a song on its first `music.play()` (keep the
  synth playing until the buffer is ready) instead of decoding all nine at
  boot. That saves roughly 150–250 MB of PCM on iPads.
- An audio test scene (`?scene=audio`) that lists every SFX, voice and
  music key with play buttons would make §7 easier.
