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

> **Status, round 1 (ElevenLabs sound generation):** SFX, NPC sounds, extra SFX,
> jingles and all 12 characters' voice clips are delivered and wired in the
> manifest (marked in the tables below). Host lines and music are still open.
> Details, prompts and the listening checklist are in **§9**. Audition
> everything at `?scene=audio`.

---


> **Design decision (from the user): no spoken words.** Characters and the
> host never say words out loud. Speech is shown as text bubbles
> (`actor.say(text, dur, kind)`), and each bubble launches with that
> character's **non-word** voice clip (giggle, yip, beep, gasp — plus
> "Yay!"-style exclamations). The `voice/*` clips below are kept on that
> basis (the user auditioned them and they're good). **Glimmer's host lines
> (§5.1) and Professor Hoot's spoken lines are no longer wanted**; `host()`
> is a silent no-op. Any future voice request must be wordless.

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
  engine fades it in over 0.4 s. A long song can instead be listed as
  `{ "file": "music/x.mp3", "stream": true }`: it plays through an `<audio>`
  element routed into the music bus, so it isn't decoded into memory (the
  loop-length budget below doesn't apply). The title and `party` songs use this
  for *Bubblegum Radar*.
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

| Name | Where it plays | What to deliver | Variants | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| `cheer` | Results, wins, big moments, Fashion Show crowd | **Crowd of kids cheering and whooping** (party-sized, 15–30 voices, not a stadium), 1.5–2.5 s, fast attack and natural decay | 3 | 1 | ✅ 3 file(s) |
| `aww` | Losing a round, near misses | **Sympathetic crowd "awww"**: warm, kind, a little comic, never mocking, 0.8–1.2 s | 2–3 | 1 | ✅ 2 file(s) |
| `yay` | Scoring, small wins | **Small group of kids: "Yay!"**, short and bright, 0.4–0.7 s | 3 | 1 | ✅ 3 file(s) |
| `giggle` | Silly moments, laugh stand-in | **Kids giggling**, 0.5–0.9 s | 3 | 2 | ✅ 3 file(s) |
| `roar` | Troll appears or slams | **Comic grumpy troll grumble-roar**: big, belly-deep "GRRAAWWRR-hmph!", more grouchy grandpa than monster, 0.8–1.2 s. Must not frighten a 5-year-old | 2 | 1 | ✅ 2 file(s) |
| `snore` | Troll sleeping (loops by repetition) | **Cartoon troll snore**: rumbling inhale plus whistling exhale, about 1.5 s, starts and ends quiet so it repeats | 2 | 2 | ✅ 2 file(s) |
| `stomp` | Troll footsteps, heavy landings | **Heavy cartoon footstep thud** with a little ground rumble, ≤ 0.35 s | 3 | 2 | ✅ 3 file(s) |
| `munch` | Eating and tasting (Cake Bakery, Pet Spa treat, Sprinkle Catch) | **Crunchy cartoon munch-munch**, 0.3–0.5 s | 3 | 2 | ✅ 3 file(s) |
| `splash` | Pet Spa bath, water | **Bath-water splash**, playful, 0.4–0.8 s | 2 | 2 | ✅ 2 file(s) |
| `shutter` | Fashion Show photo finale | **Camera shutter click plus flash-charge whine**, ≤ 0.6 s | 1–2 | 2 | ✅ 2 file(s) |
| `bigpop` | Balloon pops (Balloon Pump), present pops | **Real balloon pop**, sweetened with a confetti rustle, ≤ 0.5 s | 2 | 1 | ✅ 2 file(s) |
| `boom` | Present explodes into confetti and soot, big impacts | **Cartoon poof-boom**: soft "fwoomp" plus confetti, not an explosion, ≤ 0.8 s | 2 | 2 | ✅ 2 file(s) |
| `crack` | Cookie tile cracks (Cookie Crumble) | **Cookie snap**, ≤ 0.25 s | 3 | 2 | ✅ 3 file(s) |
| `crumble` | Cookie tile falls | **Cookie crumbling into crumbs**, 0.3–0.5 s | 2 | 2 | ✅ 2 file(s) |
| `pump` | Each pump in Balloon Pump (mashed up to about 8/s) | **Bicycle/hand pump "pff"** with a hint of rubber squeak. **Very short (≤ 0.15 s)** so mashing doesn't smear | 3 | 1 | ✅ 3 file(s) |
| `splat` | Paint splat bombs, wet hits | **Wet paint splat**, ≤ 0.3 s | 3 | 2 | ✅ 3 file(s) |
| `water` | Watering plants (Fairy Garden), rinsing | **Watering-can sprinkle/pour**, 0.5–0.8 s | 2 | 3 | ✅ 2 file(s) |
| `drumroll` | Before the results reveal | **Snare drum roll**, 1.5 s, ending on a clean stop (no cymbal; the fanfare follows) | 1 | 2 | ✅ 1 file(s) |
| `whistle` | Round start/end in some games | **Referee pea-whistle**, short, ≤ 0.5 s | 1 | 3 | ✅ 1 file(s) |
| `bubble` | Pet Spa bubbles, potion bubbles | **Single soft bubble pop** (blip-y), ≤ 0.12 s | 4 | 3 | ✅ 3 file(s) |
| `brush` | Pet Spa brushing, Art Studio | **Soft brush stroke or scrub**, ≤ 0.2 s | 3 | 3 | ✅ 3 file(s) |
| `flip` | Memory Match card flip | **Card flip "fwip"**, ≤ 0.15 s | 2 | 3 | ✅ 2 file(s) |

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

| `charId` | Character | Voice direction | Status |
| --- | --- | --- | --- |
| `felicity` | Fox girl **+ Fellowfox** | Welcoming, adventurous girl with a bright and lively voice. **Layer a tiny Fellowfox yip** after hello, yay and woo ("Hi! *yip!*"). For aww, add a little sympathetic whimper from Fellowfox | ✅ 8/8 kinds, 18 files |
| `kpop-girls` | The trio | **Three distinct voices together**: overlapping or in quick succession, sometimes in harmony. hello is a staggered "Hi! / Hey! / Hiii!". ready is a unison "Let's go!". yay is a harmonized "Yeah!". aww is a group "awww". laugh is a three-way giggle. Confident and upbeat, like idol performers | ✅ 8/8 kinds, 17 files |
| `bronze` | One-eyed robot | **Cute robot beeps, boops and servo whirs, no words.** hello is a rising boop-beep-bweep. yay is a happy chirp arpeggio plus a spring "boing". aww is a descending, slowing "bwoo-oo-oo" power-down. ouch is a clank plus a static sputter. gasp is a sharp up-chirp. laugh is a rapid beeping trill. Earnest and curious, not menacing. (Original sounds; no imitation of famous movie robots) | ✅ 8/8 kinds, 18 files |
| `cotton-candy` | Pony with rainbow mane | Sunny, sweet **pony whinny-giggles**: a light "hee-hee-neigh" for hello and yay, a soft nicker for ready, a little huff for aww, a short squeal for gasp | ✅ 8/8 kinds, 18 files |
| `fox` | Springy orange fox | Playful **fox yips, chirps and chatter** ("ack-ack-ack!"), happy panting for yay and woo, a yelp for ouch, a high whine for aww | ✅ 8/8 kinds, 18 files |
| `hotdog` | Fluffy rainbow creature | **Exuberant, silly creature gibberish**: goofy trills, "hoo-hoo!", a raspberry for aww, big bouncy "wheee!" for woo, a squeaky giggle for laugh. Fuzzy and lovable | ✅ 8/8 kinds, 18 files |
| `marina` | Red-haired mermaid | Friendly and confident: "Hi there!", a splashy "Woo-hoo!", a bubbly laugh. A light watery shimmer layered under yay and woo is a nice touch | ✅ 8/8 kinds, 18 files |
| `scale` | Blonde mermaid | Poised and gentle, a little royal: a soft "Hello!", a delighted "Oh!" for gasp, a graceful "Hooray!" for yay, a prim "hmph" for aww | ✅ 8/8 kinds, 18 files |
| `marshmallow-birthday-cake` | Birthday Cake | **Squishy, bouncy marshmallow squeaks** with a cheerful high voice. yay ends with a **party-horn toot**. aww is a deflating "awww" like a sinking soufflé. ouch is a "squish!". laugh is a jiggly giggle | ✅ 8/8 kinds, 17 files |
| `princess-amber` | Kind princess | Warm, composed and kind: "Hello!", "How lovely!" for yay, a gentle giggle, a soft "oh dear" for aww | ✅ 8/8 kinds, 18 files |
| `snowstar` | Big-face curious girl | Imaginative and full of wonder: a big "Ooooh!" for woo and gasp, "Hiii!" for hello, an excited squeal for yay, and a wobbly, big-eyed "awww" | ✅ 8/8 kinds, 18 files |
| `unicorn` | The Last Unicorn | **Serene and gentle, no words**: a soft, airy whinny layered with a delicate **magical chime shimmer**. hello is a soft nicker plus chime. yay is a brighter whinny plus a sparkle swell. aww is a quiet sigh. gasp is a soft intake plus a bell. Never loud | ✅ 8/8 kinds, 18 files |

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

| Key | Line | When | Status |
| --- | --- | --- | --- |
| `host/charlie-party` | "Charlie Party!" | Title screen, on press start | skipped: needs TTS (§9.3) |
| `host/welcome` | "Welcome to Charlie Party!" | First visit to character select | skipped: needs TTS (§9.3) |
| `host/pick-character` | "Pick your character!" | Character select | skipped: needs TTS (§9.3) |
| `host/how-to` | "Here's how to play!" | How-to screen opens | skipped: needs TTS (§9.3) |
| `host/press-a` | "Press A when you're ready!" | How-to screen | skipped: needs TTS (§9.3) |
| `host/ready` | "Ready?" | Before the countdown | skipped: needs TTS (§9.3) |
| `host/count-3`, `host/count-2`, `host/count-1` | "Three!", "Two!", "One!" | Countdown (each ≤ 0.6 s, so they can sit on 1-second ticks) | skipped: needs TTS (§9.3) |
| `host/go` | "Go!" | Start | skipped: needs TTS (§9.3) |
| `host/finish` | "Finish!" | End of a minigame | skipped: needs TTS (§9.3) |
| `host/time-up` | "Time's up!" | Timed games end | skipped: needs TTS (§9.3) |
| `host/next-round` | "Next round!" | Multi-round games | skipped: needs TTS (§9.3) |
| `host/final-round` | "Final round!" | Last round | skipped: needs TTS (§9.3) |
| `host/winner-is` | "And the winner is…" | Before the results reveal (pairs with `drumroll`) | skipped: needs TTS (§9.3) |
| `host/name/<charId>` ×12 | "Felicity and Fellowfox!", "The KPop Girls!", "Bronze!", "Cotton Candy!", "Fox!", "Hotdog!", "Marina!", "Scale!", "Birthday Cake!", "Princess Amber!", "Snowstar!", "The Last Unicorn!" | Winner callout (use the `charId`s from §4) | skipped: needs TTS (§9.3) |
| `host/tie` | "It's a tie!" | Shared first place | skipped: needs TTS (§9.3) |
| `host/everyone-star` | "Everyone's a star!" | Play Studio results | skipped: needs TTS (§9.3) |
| `host/showstopper` | "Showstopper!" | Studio games' 🏅 award | skipped: needs TTS (§9.3) |
| `host/so-close` | "So close!" | Consolation (sparingly) | skipped: needs TTS (§9.3) |
| `host/great-job` | "Great job!" | General praise | skipped: needs TTS (§9.3) |
| `host/perfect` | "Perfect!" | Rhythm and memory streaks | skipped: needs TTS (§9.3) |
| `host/oops` | "Oopsie!" | Funny fails (fell off, fizzled) | skipped: needs TTS (§9.3) |
| `host/random` | "Random pick!" | Roulette on game select | skipped: needs TTS (§9.3) |
| `host/marathon` | "Party Marathon!" | Starting a marathon | skipped: needs TTS (§9.3) |
| `host/last-game` | "Last game!" | Marathon game 5 | skipped: needs TTS (§9.3) |
| `host/champion` | "Our party champion is…" | Marathon trophy ceremony | skipped: needs TTS (§9.3) |
| `host/title/<gameId>` ×20 | The game's name, said with flair | How-to screen opens | skipped: needs TTS (§9.3) |

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

| Key | Sound | Notes | Status |
| --- | --- | --- | --- |
| `npc/troll/grumble` | Low grumpy muttering "hrmmph-grumble-grr", 1–1.5 s | Troll Trouble idle/walk. 3 variants. Comic, never scary | ✅ 3 file(s) |
| `npc/troll/laugh` | Big belly "HUR-HUR-HUR!", about 1 s | After he catches someone. 2 variants | ✅ 2 file(s) |
| `npc/troll/yawn` | Huge cavernous yawn ending in a smack of the lips, about 1.5 s | Before sleeping | ✅ 1 file(s) |
| `npc/troll/windup` | Rising strained "hnnnnnn-" grunt, about 0.8 s | Ground-pound telegraph (it must cue kids to dodge) | ✅ 1 file(s) |
| `npc/hoot/hoo` | Warm owl "Hoo-hoo!" | Professor Hoot. 2 variants | ✅ 2 file(s) |
| `npc/hoot/ready` | "Wands at the ready…" in a kindly, slightly dramatic professor voice, ≤ 1.8 s | Wizard Quick-Draw lead-in | skipped: speech line, needs TTS (§9.3) |
| `npc/hoot/bravo` | "Splendid!" / "Bravo!" | Potion success. 2 variants | skipped: speech line, needs TTS (§9.3) |
| `npc/imp/giggle` | Tiny mischievous gremlin giggle, high and squeaky, 0.4–0.7 s | Shadow Imps taunting. 3 variants | ✅ 3 file(s) |
| `npc/imp/eep` | Startled squeak, ≤ 0.3 s | Imp caught in the spotlight | ✅ 1 file(s) |
| `npc/imp/poof` | Glittery poof plus a fading "nyaa~" raspberry, ≤ 0.6 s | Imp banished | ✅ 1 file(s) |
| `npc/fairy/chime` | Tiny bell twinkle, ≤ 0.4 s | Garden fairies flitting. 3 variants | ✅ 3 file(s) |

### 5.3 Extra SFX keys games will likely want (also need wiring)

| Key | Sound | For | Status |
| --- | --- | --- | --- |
| `applause` | Kids clapping and cheering, 2–3 s | Fashion Show runway, Art Studio gallery, results | ✅ 2 file(s) |
| `crowd-ooh` | Impressed crowd "ooooh!", about 1 s | Close calls, big combos | ✅ 1 file(s) |
| `crowd-gasp` | Crowd gasp, ≤ 0.6 s | Present about to pop, someone falling off | ✅ 1 file(s) |
| `tick-tock` | Cartoon ticking clock loop, 1 s (seamless) | Pass the Present's ticking present | ✅ 1 file(s) |
| `balloon-stretch` | Rubbery balloon squeak or stretch, ≤ 0.4 s | Balloon Pump red zone | ✅ 1 file(s) |
| `fizzle` | Comic spell fizzle "pfft-pffzz", ≤ 0.6 s | Early press in Wizard Quick-Draw, wrong potion | ✅ 2 file(s) |
| `zap` | Bright magic spell cast "fwoosh-ting!", ≤ 0.5 s | Wand casts | ✅ 2 file(s) |
| `cauldron` | Bubbling cauldron, 2 s seamless loop | Potion Class ambience | ✅ 1 file(s) |
| `stir` | Wooden spoon stir swish, ≤ 0.4 s | Potion Class | ✅ 1 file(s) |
| `squeak` | Rubber duck squeak | Pet Spa | ✅ 2 file(s) |
| `towel` | Fluffy towel rub, ≤ 0.5 s | Pet Spa | ✅ 1 file(s) |
| `thunder` | Small cartoon thunder rumble, ≤ 1 s | Storm clouds in Broomstick Dash | ✅ 1 file(s) |
| `ring` | Bright sparkly "shwing" for flying through a star ring | Broomstick Dash boost | ✅ 2 file(s) |
| `grow-flower` | Magical plant growth sweep with leaves rustling, about 1 s | Fairy Garden | ✅ 1 file(s) |

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

| Song | BPM | Key (synth) | Mood and use | Instrumentation ideas | Loop | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `title` | **124** | C major | **The theme of Charlie Party.** Joyful, inviting, "the party is starting!" A memorable 4-bar hook that kids will hum. Title screen | Bright synth-pop with glockenspiel lead, claps, plucky bass, a big but friendly chorus lift | 16–32 bars (31–62 s) | skipped: needs music permission or a composer (§9.3) |
| `menu` | **112** | F major | Relaxed, happy browsing. Character and game select (people chat over it) | Soft ukulele/marimba, light shaker, warm pad, gentle bass; low energy, no busy lead | 16–24 bars (34–51 s) | skipped: needs music permission or a composer (§9.3) |
| `party` | **138** | D major | Energetic, bouncy competition: the default for party minigames (Sprinkle Catch, Cookie Crumble, Paint Party, Crown Keeper…) | Chiptune-pop: square-wave arps plus real drums, slap bass, brass stabs | 32 bars (≈56 s) | skipped: needs music permission or a composer (§9.3) |
| `chase` | **156** | A minor | Playful-urgent "run!", **comic, not scary**. Troll Trouble, Bumper Bounce, Broomstick Dash | Galloping bass, pizzicato strings, tom fills, a cheeky bassoon/tuba line, staccato synth | 32 bars (≈49 s) | skipped: needs music permission or a composer (§9.3) |
| `tense` | **120** | G minor | Suspenseful but cute: "ooh, who will it be?" Pass the Present, Wizard Quick-Draw, Balloon Pump | Ticking percussion, plucked low strings, celesta motif, sparse; builds without peaking (gameplay provides the peaks) | 24–32 bars (48–64 s) | skipped: needs music permission or a composer (§9.3) |
| `chill` | **92** | E major | Cozy, dreamy, creative. Fairy Garden, Pet Spa, Art Studio, Memory Match, Fairy Count | Music box, soft Rhodes, felt piano, acoustic guitar, light brushes, gentle chimes | 16–24 bars (42–63 s) | skipped: needs music permission or a composer (§9.3) |
| `dance` | **120 (exact)** | **C minor** | **Drives the rhythm games** (Pop Star Stage, Spotlight Dance-Off): a catchy, empowering K-pop-style idol anthem with heroes banishing shadows with music. Sparkly and confident | Four-on-the-floor kick **on every beat**, claps on 2 and 4, punchy synth bass, bright synth lead, sparkle FX | **Exactly 16 or 32 bars (32.000 s or 64.000 s)**. See §6.3 | skipped: needs music permission or a composer (§9.3) |
| `bouncy` | **128** | G major | Silly and boingy, cartoon fun: Balloon Pump, Cake Bakery, Sprinkle Catch (alternative) | Bouncy tuba/bass, xylophone, slide whistle accents (sparingly), kazoo-ish lead, woodblocks | 16–32 bars (30–60 s) | skipped: needs music permission or a composer (§9.3) |
| `victory` | **132** | C major | Triumphant celebration. Results podium, after the fanfare | Brass fanfare-pop, drum-corps snare, bells, a big major-key chorus | 16 bars (≈29 s) | skipped: needs music permission or a composer (§9.3) |

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

| Key | Status | Length | Brief | Delivered |
| --- | --- | --- | --- | --- |
| `fanfare` | Overrides the synth | 2–3 s | **Winner fanfare** at the results reveal: brass and bells, triumphant, ending on a bright held chord | ✅ 1 file(s) |
| `win` | Overrides the synth | 1–1.5 s | **Round won**: quick happy ascending flourish | ✅ 2 file(s) |
| `lose` | Overrides the synth | 1.5–2 s | **Lose**: a gentle comic "wah-wah" (a soft muted trombone, *kind*, not mocking), ending with a little upbeat "oh well!" button so it doesn't feel like a punishment | ✅ 1 file(s) |
| `star` | Overrides the synth (optional) | 0.3–0.5 s | Star award chime as each star flies into a player's total (it plays several times in a row, so keep it short and sweet) | ✅ 1 file(s) |
| `jingle/results` | New | 3–4 s | **Results screen sting**: drumroll-to-ta-da as the podium appears | ✅ 1 file(s) |
| `jingle/star-award` | New | 1.5–2 s | Glittery "you got stars!" swell for the star-tally moment | ✅ 1 file(s) |
| `jingle/showstopper` | New | 1.5 s | Shiny medal sting for the studio 🏅 | ✅ 1 file(s) |
| `jingle/trophy` | New | 5–7 s | **Party Marathon champion**: the grandest moment, with a full fanfare, choir "aah" pad and cymbal swell, ending on a held chord with sparkle | ✅ 1 file(s) |
| `jingle/marathon-start` | New | 2–3 s | "Here we go!" Marathon kickoff, with a rising, exciting build | ✅ 1 file(s) |
| `jingle/round` | New | ≤ 1 s | Short transition sting for the next round in multi-round games | ✅ 1 file(s) |

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
first play (max 3 decoded songs kept), and the `?scene=audio` test page
(`src/scenes/audiotest.js`).


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

---

## 9. Delivery log: ElevenLabs sound generation, round 1

Everything here was generated with the ElevenLabs **sound-generation** API
(`POST /v1/sound-generation`, `duration_seconds` set per sound,
`prompt_influence` 0.55 for voices, 0.6 for SFX and 0.7 to 0.75 for jingles),
then processed with ffmpeg: mono, 44.1 kHz, 30 Hz high-pass (removes DC and
sub-rumble), leading and trailing silence trimmed, a 5 ms fade-in and a short
fade-out, then gain. SFX are peak-normalized to −3.3 dBFS (UI-like sounds
−6.3 dBFS). Crowds, voices and jingles are normalized to about −16 LUFS with
the peak capped at −3.3 dBFS. Clips with a lot of energy above 4 kHz are
placed 3 dB lower so shrill sounds don't poke out. Voices use a 9.5 kHz
low-pass. **All verification was by measurement** (ffprobe/ffmpeg loudness
and silence detection, FFT spectra, pitch and envelope checks, spectrogram
images, and a Chromium `decodeAudioData` run over every manifest file, with
no failures and no 404s). **Nobody has listened to these yet.**

### 9.1 What was delivered

| Category | Manifest keys | Files |
| --- | --- | --- |
| §3 replace-with-recordings SFX and §5.3 extra SFX, plus `fanfare`, `win`, `lose`, `star` | 40 | 76 |
| §5.2 NPC sounds (`npc/…`) | 9 | 17 |
| §6.4 `jingle/*` | 6 | 6 |
| §4 character voices (`voice/<charId>/<kind>`, 12 characters × 8 kinds) | 96 | 214 |
| **Total** | 151 | 313 |

Total size of `assets/audio/` is about 4.2 MB (under the 5 MB non-music
budget). Variants per key: cheer 3, aww 2, yay 3, giggle 3, roar 2, snore 2,
stomp 3, munch 3, splash 2, shutter 2, bigpop 2, boom 2, crack 3, crumble 2,
pump 3, splat 3, water 2, drumroll 1, whistle 1, **bubble 3** (the fourth take
was only 44 ms and was dropped), brush 3, flip 2. Voices: 2 variants per kind
and 3 for `yay` and `ouch`, except `voice/marshmallow-birthday-cake/gasp`
(1; its other take was only 0.13 s).

**Format deviations from §2** (on purpose, so nothing is lengthened by codec
padding): clips shorter than 0.4 s (pump, bubble, brush, flip, crack, splat,
stomp, eep, chimes, star, short voice `ouch`/`gasp`, …) are **16-bit mono WAV**
(13 to 35 KB each), as §2 allows for timing-critical clips. The two
seamless loops (`tick-tock`, `cauldron`) are also WAV so there is no encoder
gap at the seam. Everything else is mono 96 kbps MP3.
`tick-tock` is a 1.000 s cut of 4 evenly spaced ticks (0.25 s apart), and
`cauldron` has a 120 ms equal-power crossfade of its tail into its head.
The manifest lists the exact file names (including extensions).

### 9.2 Prompts used (for regenerating)

Columns: file, final duration in seconds, final peak in dBFS, and the exact prompt sent (voice prompts end in ", no music"). Where a key has several takes they use different wordings of the same idea, because the API returns a single take per call.


**SFX and extra SFX (§3, §5.3, `fanfare`/`win`/`lose`/`star`)**

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `sfx/applause-1.mp3` | 2.35 | -3.7 | Kids clapping and cheering at a party, applause with happy whoops, small crowd |
| `sfx/applause-2.mp3` | 2.56 | -3.7 | Applause from a group of children clapping hands and cheering, warm and happy, small room |
| `sfx/aww-1.mp3` | 1.10 | -5.7 | A small crowd of kids saying a warm sympathetic "awwww" together, gentle, kind, a little comical, never mocking |
| `sfx/aww-2.mp3` | 0.99 | -7.0 | Group of children sighing a soft sympathetic "aww" in unison, cute and kind, descending pitch |
| `sfx/balloon-stretch.mp3` | 0.44 | -3.6 | Rubbery balloon stretching squeak, tight rubber squeal, short |
| `sfx/bigpop-1.wav` | 0.32 | -3.3 | Loud balloon bursting bang with a short echo, followed by crinkly confetti paper rustle and sprinkle |
| `sfx/bigpop-2.wav` | 0.17 | -3.3 | Balloon pop with a sharp bang and a quick shower of confetti falling, cheerful party sound |
| `sfx/boom-1.wav` | 0.16 | -3.3 | Cartoon poof-boom, a soft "fwoomp" with a bright confetti burst and sparkle, friendly not an explosion, audible on small speakers |
| `sfx/boom-2.mp3` | 0.84 | -3.7 | Deep soft cartoon fwoomp thump of a party popper cannon, bass puff then confetti showering, playful |
| `sfx/brush-1.wav` | 0.20 | -6.3 | Soft paintbrush stroke swish on paper, one short stroke |
| `sfx/brush-2.wav` | 0.20 | -6.3 | Gentle scrub brush swipe, one quick soft stroke |
| `sfx/brush-3.wav` | 0.20 | -6.3 | One light brush stroke sound |
| `sfx/bubble-2.wav` | 0.12 | -6.3 | One tiny water bubble blip pop |
| `sfx/bubble-3.wav` | 0.12 | -6.3 | Small cute bubble bloop |
| `sfx/bubble-4.wav` | 0.08 | -6.3 | Soft quick bubble pop, gentle |
| `sfx/cauldron.wav` | 2.13 | -3.3 | Bubbling witch cauldron, gentle potion bubbling loop, cartoon, steady |
| `sfx/cheer-1.mp3` | 2.22 | -4.3 | Crowd of about 20 happy kids cheering and whooping at a birthday party, bright and joyful, fast attack, natural decay, small room |
| `sfx/cheer-2.mp3` | 2.14 | -6.6 | A group of excited children cheering "yeah!" and whooping together at a party, joyful, fast attack then natural fade |
| `sfx/cheer-3.mp3` | 2.14 | -5.1 | Party-sized crowd of 20 kids cheering and screaming with joy, whoops and hooray, cheerful, not a stadium |
| `sfx/crack-1.wav` | 0.25 | -3.3 | Single crisp cookie snap |
| `sfx/crack-2.wav` | 0.12 | -3.3 | One sharp biscuit crack, snapping a cookie in half |
| `sfx/crack-3.wav` | 0.23 | -3.3 | Short brittle cookie crack |
| `sfx/crowd-gasp.mp3` | 0.63 | -3.7 | Crowd of kids gasping together in surprise, quick sharp inhale |
| `sfx/crowd-ooh.mp3` | 0.94 | -5.8 | Impressed crowd of kids saying "ooooh!" together, awestruck, rising then falling |
| `sfx/crumble-1.mp3` | 0.44 | -3.5 | Cookie crumbling into small crumbs falling and scattering |
| `sfx/crumble-2.wav` | 0.31 | -3.3 | A cookie breaking apart into crumbs, dry crunchy crumble |
| `sfx/drumroll.mp3` | 1.49 | -3.5 | Snare drum roll building up, 1.5 seconds, ends with a clean abrupt stop, no cymbal, no crash |
| `sfx/fanfare.mp3` | 2.35 | -5.0 | Triumphant short brass fanfare with bells, bright C major, kids party game winner reveal, ending on a bright held chord |
| `sfx/fizzle-1.mp3` | 0.57 | -3.5 | Comic spell fizzle "pfft pffzz", failed magic spark sputtering out, cartoon |
| `sfx/fizzle-2.mp3` | 0.63 | -3.6 | Funny failed magic spell, sputtering fizzle and a little pop, cartoon |
| `sfx/flip-1.wav` | 0.15 | -6.3 | Playing card flip "fwip", one quick flick |
| `sfx/flip-2.wav` | 0.15 | -6.3 | A single card being flipped over on a table, quick fwip |
| `sfx/giggle-1.mp3` | 0.76 | -4.4 | Two or three little kids giggling together, cute and bubbly |
| `sfx/giggle-2.mp3` | 0.76 | -6.8 | Children giggling and snickering happily, short, adorable |
| `sfx/giggle-3.mp3` | 0.76 | -3.6 | A few small kids laughing with a little squeaky giggle, cute |
| `sfx/grow-flower.mp3` | 0.81 | -4.0 | Magical plant growth sweep with leaves rustling and a soft sparkle, cartoon, rising |
| `sfx/lose.mp3` | 1.59 | -3.7 | Gentle comic wah-wah-wah-wahh with a soft muted trombone, kind not mocking, ending with a little upbeat oh-well button |
| `sfx/munch-1.wav` | 0.34 | -3.3 | Crunchy cartoon munch munch, someone biting into a cookie, two quick chews |
| `sfx/munch-2.wav` | 0.35 | -3.3 | Cute crunchy cartoon eating sound, munch-munch of a crisp snack |
| `sfx/munch-3.wav` | 0.35 | -3.3 | Quick crunchy chomp chomp eating sound, playful cartoon |
| `sfx/pump-1.wav` | 0.15 | -6.3 | Single short bicycle hand pump puff "pff" with a tiny rubber squeak |
| `sfx/pump-2.wav` | 0.15 | -6.3 | One quick air pump puff, short "pff", hint of rubber squeak |
| `sfx/pump-3.wav` | 0.15 | -6.3 | Short soft puff of air from a bicycle pump, "pfft", airy |
| `sfx/ring-1.mp3` | 0.63 | -3.8 | Bright sparkly "shwing" magical whoosh through a ring, glittering |
| `sfx/ring-2.mp3` | 0.50 | -3.3 | Quick sparkly shimmer swoosh with a bright ting, magical boost sound |
| `sfx/shutter-1.mp3` | 0.50 | -2.5 | Camera shutter click followed by a short flash charging whine rising in pitch |
| `sfx/shutter-2.mp3` | 0.47 | -3.1 | Photo camera shutter click and a quick electronic flash recharge whine |
| `sfx/splash-1.mp3` | 0.55 | -3.6 | Playful bath water splash, cartoon, a pet being washed in a tub, one splash |
| `sfx/splash-2.mp3` | 0.68 | -3.9 | Fun splash of water in a bathtub with a few drips, cheerful cartoon |
| `sfx/splat-1.wav` | 0.21 | -3.3 | Wet paint splat, one single squishy splat |
| `sfx/splat-2.wav` | 0.12 | -3.3 | Single cartoon wet splat of paint hitting a wall |
| `sfx/splat-3.wav` | 0.18 | -3.3 | Short squelchy paint splat |
| `sfx/squeak-1.wav` | 0.35 | -3.3 | Rubber duck squeak, one single squeak |
| `sfx/squeak-2.wav` | 0.35 | -3.3 | Cute rubber bath toy squeak, short |
| `sfx/star.mp3` | 0.52 | -6.6 | Sweet short star award chime, three quick ascending bell notes, sparkly |
| `sfx/stir.wav` | 0.23 | -3.3 | Wooden spoon stirring a pot, one slow swish |
| `sfx/stomp-1.wav` | 0.34 | -3.3 | Heavy cartoon giant footstep: a punchy thud with a crunchy gravel slap on top, one hit, audible on small speakers |
| `sfx/stomp-2.wav` | 0.23 | -3.3 | One big cartoon stomp on a wooden floor, solid thump with a crisp slap and a short rumble, one hit |
| `sfx/stomp-3.wav` | 0.34 | -3.3 | Giant troll single footstep, punchy mid-range thump with a bit of dirt crunch, cartoon, one hit |
| `sfx/thunder.mp3` | 0.76 | -3.8 | Small cartoon thunder crack and rumble, a gentle rolling boom with a crackle, not scary, kids animation |
| `sfx/tick-tock.wav` | 1.00 | -3.3 | Cartoon wall clock ticking, one tick and one tock, one second loop, steady |
| `sfx/towel.wav` | 0.32 | -3.3 | Fluffy towel rubbing, soft cloth rub, short |
| `sfx/troll-roar-1.mp3` | 0.84 | -3.7 | Comic grumpy cartoon troll grumble-roar, big belly-deep "grraawwrr hmph", like a grouchy grandpa not a monster, funny and friendly |
| `sfx/troll-roar-2.mp3` | 1.02 | -3.9 | Cartoon troll giving a big deep grumpy growl then a "hmph", comical and gruff, not scary, kids animation |
| `sfx/troll-snore-1.mp3` | 1.18 | -3.7 | Cartoon giant troll snoring: deep rumbling inhale then a soft whistling exhale, starts and ends quiet, comical |
| `sfx/troll-snore-2.mp3` | 1.39 | -3.5 | Funny cartoon snore of a big sleepy ogre, low rumbling snort in and a whistling puff out, quiet at both ends |
| `sfx/water-1.mp3` | 0.78 | -3.5 | Watering can sprinkling and pouring water gently on plants |
| `sfx/water-2.mp3` | 0.73 | -3.7 | Gentle watering can pour sprinkle, water droplets falling |
| `sfx/whistle.mp3` | 0.52 | -3.8 | Referee pea whistle, one short sharp blast |
| `sfx/win-1.mp3` | 1.23 | -3.8 | Quick cheerful ascending four note arpeggio C E G C on bright marimba and brass with a bell sparkle on top, one second, video game round won |
| `sfx/win-2.mp3` | 1.23 | -7.2 | Short happy rising flourish of notes going up the scale, glockenspiel and trumpet, bright major key, ends on a high note, game win jingle |
| `sfx/yay-1.mp3` | 0.65 | -3.8 | A small group of 4 kids shouting "Yay!" together, short and bright, happy |
| `sfx/yay-2.mp3` | 0.73 | -3.6 | Several children cheering a quick bright "Yay!" at a party, cute, excited |
| `sfx/yay-3.mp3` | 0.73 | -7.8 | Little kids all yelling "Yaaay!" joyfully, short, bright and sweet |
| `sfx/zap-1.mp3` | 0.52 | -4.0 | Bright magic spell cast "fwoosh ting", sparkly whoosh ending with a bell ting |
| `sfx/zap-2.mp3` | 0.52 | -3.1 | Magic wand cast, quick sparkly whoosh and a chime ting |

**NPC sounds (§5.2)**

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `npc/fairy/chime-1.mp3` | 0.47 | -6.7 | Tiny fairy bell twinkle, a quick high magical chime |
| `npc/fairy/chime-2.mp3` | 0.47 | -6.5 | Little sparkling glass bell tinkle, fairy dust |
| `npc/fairy/chime-3.mp3` | 0.47 | -7.3 | Delicate tiny bell twinkle, short and magical |
| `npc/hoot/hoo-1.mp3` | 0.70 | -9.1 | Warm friendly owl hooting "hoo-hoo", gentle, cartoon, wise |
| `npc/hoot/hoo-2.mp3` | 0.84 | -5.8 | Soft cute owl "hoo hoo" hoot, kind and cozy |
| `npc/imp/eep.wav` | 0.30 | -5.7 | Startled tiny squeak "eep!", very short, cute cartoon creature |
| `npc/imp/giggle-1.mp3` | 0.55 | -3.9 | Tiny mischievous gremlin giggle, high and squeaky, cartoon, cute |
| `npc/imp/giggle-2.mp3` | 0.57 | -6.2 | Squeaky little imp tee-hee-hee laugh, mischievous but cute, high pitched cartoon |
| `npc/imp/giggle-3.mp3` | 0.55 | -4.1 | Cute high pitched little cartoon creature giggling "tee hee hee", playful and silly |
| `npc/imp/poof.mp3` | 0.50 | -3.3 | Glittery magical poof of smoke with a fading comedic raspberry "nyaa", cartoon |
| `npc/troll/grumble-1.mp3` | 1.12 | -3.7 | Low grumpy muttering "hrmmph, grumble grr" of a big grouchy cartoon troll, comic, never scary |
| `npc/troll/grumble-2.mp3` | 1.20 | -4.1 | Cartoon troll grumbling under his breath, deep gruff mumble, funny grandpa, kids animation |
| `npc/troll/grumble-3.mp3` | 1.07 | -4.3 | Big friendly grumpy ogre mumbling "hmph grrr hmm", low and comical |
| `npc/troll/laugh-1.mp3` | 0.94 | -3.6 | Big deep belly laugh "HUR HUR HUR" of a cartoon troll, jolly and silly |
| `npc/troll/laugh-2.mp3` | 0.78 | -4.4 | Huge deep jolly cartoon giant laughing "har har har", comic, friendly |
| `npc/troll/windup.mp3` | 0.78 | -6.0 | Rising strained "hnnnnnn" grunt of a cartoon giant winding up a big ground pound, building effort, pitch rising |
| `npc/troll/yawn.mp3` | 1.41 | -5.4 | Huge cavernous cartoon troll yawn ending with a smack of the lips, comical |

**Jingles (§6.4)**

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `jingle/marathon-start.mp3` | 2.51 | -3.6 | Exciting rising build here we go, cheerful playful party game kickoff sting with drums and brass |
| `jingle/results.mp3` | 2.56 | -4.8 | Short snare drumroll that leads into a bright triumphant ta-da orchestral hit with brass and bells, kids game results reveal |
| `jingle/round.mp3` | 0.84 | -3.8 | Short cheerful transition sting, two quick bright notes with a bell, next round |
| `jingle/showstopper.mp3` | 1.51 | -3.9 | Shiny medal award sting, bright bell shimmer and a short triumphant brass hit, cheerful |
| `jingle/star-award.mp3` | 1.80 | -7.8 | Glittery magical rising swell with sparkling bells and chimes, you got stars, cheerful |
| `jingle/trophy.mp3` | 5.64 | -3.8 | Grand triumphant champion fanfare with full brass, choir aah pad and cymbal swell, ending on a held major chord with sparkle, kids game trophy ceremony |

**Character voices (§4)**


`felicity`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/felicity/hello-1.mp3` | 0.91 | -3.7 | Cheerful young cartoon girl saying "Hi!" brightly, followed by a tiny cute fox yip, no music |
| `voice/felicity/hello-2.mp3` | 0.65 | -8.7 | Friendly adventurous girl says "Hiya!" with a little fox yip after, cartoon, no music |
| `voice/felicity/ready-1.mp3` | 0.91 | -8.8 | Bright eager young girl says "Ready!" with adventurous energy, cartoon, no music |
| `voice/felicity/ready-2.mp3` | 0.84 | -9.4 | Lively young girl says "Let's go!" excited, cartoon, no music |
| `voice/felicity/yay-1.mp3` | 1.04 | -6.1 | Excited young girl cheers "Yay!" followed by a tiny happy fox yip, cartoon, no music |
| `voice/felicity/yay-2.mp3` | 0.91 | -9.2 | Happy young girl shouts "Yippee!" bright and lively, cartoon, no music |
| `voice/felicity/yay-3.mp3` | 0.86 | -4.8 | Young girl cheers "Woohoo yay!" joyful and bubbly, tiny fox yip, no music |
| `voice/felicity/aww-1.mp3` | 1.04 | -7.9 | Young girl says a sad little "aww" and a tiny sympathetic fox whimper, cartoon, no music |
| `voice/felicity/aww-2.mp3` | 1.04 | -6.6 | Disappointed girl says "awww" gently, small fox whimper, no music |
| `voice/felicity/ouch-1.wav` | 0.39 | -7.3 | Young cartoon girl says "Ow!" quick and cute, no music |
| `voice/felicity/ouch-2.mp3` | 0.44 | -3.6 | Short surprised "Oof!" from a young girl, cartoon, no music |
| `voice/felicity/ouch-3.mp3` | 0.52 | -3.8 | Young girl "Ouch!" quick, cartoon, no music |
| `voice/felicity/woo-1.mp3` | 0.84 | -8.3 | Young girl shouts "Woo-hoo!" excited, tiny fox yip, cartoon, no music |
| `voice/felicity/woo-2.mp3` | 0.84 | -3.7 | Excited girl whoops "Whee!" energetic, cartoon, no music |
| `voice/felicity/laugh-1.mp3` | 1.04 | -3.7 | Happy young girl giggling and laughing, bright, cartoon, no music |
| `voice/felicity/laugh-2.mp3` | 1.04 | -3.6 | Cheerful girl laughing "hehehe" playful, cartoon, no music |
| `voice/felicity/gasp-1.wav` | 0.37 | -9.4 | Young girl gasps in surprise, short, cartoon, no music |
| `voice/felicity/gasp-2.mp3` | 0.52 | -6.0 | Quick surprised gasp "oh!" from a young girl, no music |

`kpop-girls`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/kpop-girls/hello-1.mp3` | 1.23 | -7.1 | Three young women idol singers greeting "Hi! Hey! Hiii!" one after another, staggered, upbeat, cartoon, no music |
| `voice/kpop-girls/hello-2.mp3` | 1.23 | -7.7 | Three cheerful girls say "Hi! Hello! Heyyy!" in quick succession, bright pop idol group, no music |
| `voice/kpop-girls/ready-1.mp3` | 1.23 | -7.0 | Three young women shout "Let's go!" together in unison, confident pop idol group, no music |
| `voice/kpop-girls/ready-2.mp3` | 1.15 | -7.5 | Three girls say "Ready? Let's go!" in unison, confident and upbeat, no music |
| `voice/kpop-girls/yay-1.mp3` | 0.97 | -6.1 | Three young women shout "Yeah!" together in harmony, upbeat pop idol group, no music |
| `voice/kpop-girls/yay-2.mp3` | 1.28 | -9.9 | Three girls cheer "Yeah! Woo!" harmonized, joyful, no music |
| `voice/kpop-girls/aww-1.mp3` | 1.23 | -6.5 | Three girls say "awww" together, group disappointed, cute, no music |
| `voice/kpop-girls/aww-2.mp3` | 1.33 | -4.4 | Group of three young women sigh "awww" in harmony, gentle, no music |
| `voice/kpop-girls/ouch-1.mp3` | 0.70 | -8.9 | Three girls say "Ow!" quickly, cartoon, no music |
| `voice/kpop-girls/ouch-2.mp3` | 0.78 | -6.4 | Three girls "Ouch!" in surprise, short, no music |
| `voice/kpop-girls/ouch-3.mp3` | 0.68 | -6.3 | Three young women "Oops!" short, cute, no music |
| `voice/kpop-girls/woo-1.mp3` | 0.99 | -8.3 | Three young women whoop "Woo!" together, excited pop group, no music |
| `voice/kpop-girls/woo-2.mp3` | 1.10 | -8.5 | Three girls "Woo-hoo!" one after another, upbeat, no music |
| `voice/kpop-girls/laugh-1.mp3` | 1.20 | -4.5 | Three girls giggling together, three distinct voices, cute, no music |
| `voice/kpop-girls/laugh-2.mp3` | 1.20 | -3.9 | Three young women laughing and giggling together, bright, no music |
| `voice/kpop-girls/gasp-1.mp3` | 0.70 | -5.0 | Three girls gasp in surprise together, short, no music |
| `voice/kpop-girls/gasp-2.mp3` | 0.84 | -6.0 | Three young women gasp "oh!" together, quick, no music |

`bronze`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/bronze/hello-1.mp3` | 0.86 | -7.1 | Cute friendly little robot greeting: rising boop beep bweep, no words, cartoon robot sound, no music |
| `voice/bronze/hello-2.mp3` | 0.73 | -7.6 | Small curious robot rising beep-boop greeting with a servo whir, cute, no speech, no music |
| `voice/bronze/ready-1.mp3` | 0.86 | -7.8 | Cute little robot two short determined confirmation beeps boop-beep with a tiny servo whir, no music |
| `voice/bronze/ready-2.mp3` | 0.91 | -6.3 | Robot cheerful "bip-bop" ready beeps, cute, no words, no music |
| `voice/bronze/yay-1.mp3` | 1.04 | -8.0 | Happy little robot chirp arpeggio of beeps then a springy boing, cute, no words, no music |
| `voice/bronze/yay-2.mp3` | 0.81 | -5.0 | Joyful robot rising chirps and a cartoon spring boing, no music |
| `voice/bronze/yay-3.mp3` | 1.04 | -3.6 | Cute robot celebrating with fast happy beeps and a boing, no words, no music |
| `voice/bronze/aww-1.mp3` | 1.04 | -6.6 | Cute little robot powering down, descending and slowing "bwoo-oo-oo" sad tone, cartoon, no music |
| `voice/bronze/aww-2.mp3` | 1.04 | -9.7 | Sad small robot slow descending whirr and beep winding down, cute, no music |
| `voice/bronze/ouch-1.wav` | 0.40 | -3.3 | Cartoon robot metal clank with a short static sputter, comical, light, no music |
| `voice/bronze/ouch-2.mp3` | 0.52 | -3.1 | Little robot bonk clank and a sputtering zzt, funny, no music |
| `voice/bronze/ouch-3.wav` | 0.34 | -3.3 | Tin robot clunk and a small electric sputter, cute, no music |
| `voice/bronze/woo-1.mp3` | 0.81 | -7.3 | Excited little robot rising chirpy whoop of beeps and servo whirr, cute, no music |
| `voice/bronze/woo-2.mp3` | 0.84 | -4.2 | Happy robot fast rising beep whoosh with a whirr, cartoon, no music |
| `voice/bronze/laugh-1.mp3` | 1.04 | -6.3 | Cute robot rapid happy beeping trill like laughing, cartoon, no words, no music |
| `voice/bronze/laugh-2.mp3` | 0.89 | -6.4 | Little robot giggling in fast bleeps and boops, cute, no music |
| `voice/bronze/gasp-1.wav` | 0.29 | -8.3 | Cute robot sharp surprised up-chirp beep, no music |
| `voice/bronze/gasp-2.mp3` | 0.52 | -10.1 | Little robot quick startled rising bleep, cartoon, no music |

`cotton-candy`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/cotton-candy/hello-1.mp3` | 0.91 | -3.7 | Sweet cartoon pony light whinny with a giggle, "hee-hee-neigh", sunny and cute, no music |
| `voice/cotton-candy/hello-2.mp3` | 0.91 | -7.1 | Cute happy pony greeting, a light bright whinny with a tiny giggle, no music |
| `voice/cotton-candy/ready-1.mp3` | 0.84 | -4.3 | Soft friendly pony nicker, gentle and eager, cute, no music |
| `voice/cotton-candy/ready-2.mp3` | 0.91 | -3.7 | Little pony soft excited nicker and a snort, cute cartoon, no music |
| `voice/cotton-candy/yay-1.mp3` | 1.04 | -7.3 | Happy cartoon pony joyful whinny with a giggle, "hee-hee-neigh!", cute, no music |
| `voice/cotton-candy/yay-2.mp3` | 0.86 | -5.9 | Pony excited bright neigh and giggle, sweet and sunny, no music |
| `voice/cotton-candy/yay-3.mp3` | 1.04 | -6.6 | Joyful little pony whinny and squeal of delight, cartoon, no music |
| `voice/cotton-candy/aww-1.mp3` | 0.99 | -4.9 | Cute pony little sad huff and soft low whinny, cartoon, no music |
| `voice/cotton-candy/aww-2.mp3` | 0.84 | -5.3 | Disappointed pony sigh and a small whinny, sweet, no music |
| `voice/cotton-candy/ouch-1.wav` | 0.31 | -9.6 | Cute pony short yelp squeal, cartoon, no music |
| `voice/cotton-candy/ouch-2.mp3` | 0.47 | -5.0 | Little pony quick surprised yip neigh, cute, no music |
| `voice/cotton-candy/ouch-3.mp3` | 0.52 | -4.3 | Small pony short squeaky whinny "eep", cartoon, no music |
| `voice/cotton-candy/woo-1.mp3` | 0.84 | -8.3 | Excited cartoon pony whinny whoop, joyful gallop energy, no music |
| `voice/cotton-candy/woo-2.mp3` | 0.84 | -4.4 | Happy pony bright rising neigh, cartoon, no music |
| `voice/cotton-candy/laugh-1.mp3` | 1.04 | -3.4 | Cute pony giggle-neigh laughing "hee hee hee", sweet, no music |
| `voice/cotton-candy/laugh-2.mp3` | 1.04 | -3.3 | Cartoon pony laughing giggly whinny, bright and happy, no music |
| `voice/cotton-candy/gasp-1.wav` | 0.35 | -10.2 | Cute pony short surprised squeal, no music |
| `voice/cotton-candy/gasp-2.mp3` | 0.52 | -4.6 | Little pony startled sharp whinny gasp, cartoon, no music |

`fox`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/fox/hello-1.mp3` | 0.86 | -6.0 | Playful cartoon fox cheerful chirpy yip yip, friendly greeting, no music |
| `voice/fox/hello-2.mp3` | 0.91 | -4.0 | Cute fox happy bark and chirp hello, bouncy, no music |
| `voice/fox/ready-1.mp3` | 0.78 | -4.2 | Excited cartoon fox chatter "ack ack ack" eager, playful, no music |
| `voice/fox/ready-2.mp3` | 0.55 | -3.7 | Fox quick eager yip yip yip, ready to go, no music |
| `voice/fox/yay-1.mp3` | 0.86 | -5.2 | Happy cartoon fox yips and joyful panting, celebrating, no music |
| `voice/fox/yay-2.mp3` | 0.70 | -5.1 | Fox joyful yipping bark and excited chatter, no music |
| `voice/fox/yay-3.mp3` | 1.04 | -3.9 | Cute fox happy howl-yip and panting, cartoon, no music |
| `voice/fox/aww-1.mp3` | 0.86 | -9.3 | Cute cartoon fox high sad whine, little whimper, no music |
| `voice/fox/aww-2.mp3` | 0.84 | -7.9 | Fox soft sad whine and sigh, cute, no music |
| `voice/fox/ouch-1.mp3` | 0.52 | -6.8 | Cartoon fox quick short yelp, no music |
| `voice/fox/ouch-2.mp3` | 0.47 | -4.3 | Fox little yip of pain, quick, cute, no music |
| `voice/fox/ouch-3.mp3` | 0.47 | -3.7 | Small fox squeaky yelp, cartoon, no music |
| `voice/fox/woo-1.mp3` | 0.73 | -5.7 | Excited fox yipping bark whoop with panting, energetic, cartoon, no music |
| `voice/fox/woo-2.mp3` | 0.55 | -3.7 | Fox fast happy yip yip yip, springy, no music |
| `voice/fox/laugh-1.mp3` | 0.84 | -3.8 | Cartoon fox giggly chattering "ack ack ack" laugh, cute, no music |
| `voice/fox/laugh-2.mp3` | 0.91 | -3.5 | Fox chuckling chatter and yips, playful, no music |
| `voice/fox/gasp-1.wav` | 0.28 | -7.0 | Fox surprised short yip bark, cartoon, no music |
| `voice/fox/gasp-2.mp3` | 0.52 | -5.4 | Cute fox startled quick yap, no music |

`hotdog`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/hotdog/hello-1.mp3` | 0.89 | -5.6 | Silly fluffy cartoon creature goofy excited trill gibberish "hoo-hoo!", cute and bouncy, no music |
| `voice/hotdog/hello-2.mp3` | 0.91 | -6.0 | Fuzzy silly little creature greeting with a goofy trill and "hoo hoo", kids cartoon, no music |
| `voice/hotdog/ready-1.mp3` | 0.89 | -6.6 | Silly fluffy creature bouncy "hoo hoo!" gibberish, eager, cartoon, no music |
| `voice/hotdog/ready-2.mp3` | 0.84 | -6.7 | Goofy little creature excited trill "ooh-ooh!", cute, no music |
| `voice/hotdog/yay-1.mp3` | 0.84 | -5.6 | Happy goofy cartoon creature squealing a bouncy "wheee!" and trill, cute, no music |
| `voice/hotdog/yay-2.mp3` | 1.04 | -5.6 | Silly fuzzy creature joyful squeaky whoop and trill, no music |
| `voice/hotdog/yay-3.mp3` | 0.97 | -7.6 | Cute creature excited goofy "hoo-hoo-wheee!", cartoon, no music |
| `voice/hotdog/aww-1.mp3` | 0.89 | -6.7 | Silly cartoon creature blowing a sad raspberry, funny, no music |
| `voice/hotdog/aww-2.mp3` | 0.76 | -9.6 | Goofy creature sad "bwaaa" and a raspberry, comical, cute, no music |
| `voice/hotdog/ouch-1.mp3` | 0.52 | -5.3 | Squeaky silly creature "oof" with a boing squeak, cartoon, no music |
| `voice/hotdog/ouch-2.mp3` | 0.52 | -6.0 | Cute creature squeaky yelp and a boing, funny, no music |
| `voice/hotdog/ouch-3.mp3` | 0.52 | -5.9 | Goofy fluffy creature "eek!" squeak, cartoon, no music |
| `voice/hotdog/woo-1.mp3` | 0.84 | -7.8 | Big bouncy "wheeeee!" from a silly little cartoon creature, joyful, no music |
| `voice/hotdog/woo-2.mp3` | 0.65 | -6.6 | Goofy creature excited bouncing "wee-hee-hee!" cartoon, no music |
| `voice/hotdog/laugh-1.mp3` | 0.81 | -4.9 | Squeaky giggle of a silly fuzzy cartoon creature, cute, no music |
| `voice/hotdog/laugh-2.mp3` | 1.04 | -3.7 | Goofy creature tee-hee giggle and snort, silly, no music |
| `voice/hotdog/gasp-1.mp3` | 0.52 | -7.4 | Silly cartoon creature surprised "oooh!" squeak, short, no music |
| `voice/hotdog/gasp-2.wav` | 0.33 | -5.9 | Goofy creature startled squeak gasp, cute, no music |

`marina`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/marina/hello-1.mp3` | 0.78 | -8.7 | Friendly confident young woman says "Hi there!" bright and warm, cartoon mermaid, no music |
| `voice/marina/hello-2.mp3` | 0.91 | -8.5 | Cheerful young woman says "Hello!" with a smile, confident, cartoon, no music |
| `voice/marina/ready-1.mp3` | 0.86 | -9.3 | Confident young woman says "Ready!" cheerful and determined, no music |
| `voice/marina/ready-2.mp3` | 0.84 | -7.0 | Bright young woman says "Let's do this!" confident, cartoon, no music |
| `voice/marina/yay-1.mp3` | 1.04 | -8.9 | Young woman shouts "Woo-hoo!" splashy and joyful with a light water shimmer, cartoon mermaid, no music |
| `voice/marina/yay-2.mp3` | 1.04 | -8.9 | Happy young woman cheers "Yay!" bubbly with a little splash, no music |
| `voice/marina/yay-3.mp3` | 0.84 | -6.7 | Cheerful woman "Yes!" delighted, light water shimmer, no music |
| `voice/marina/aww-1.mp3` | 0.91 | -8.3 | Young woman says "aww, man" lightly disappointed, friendly, cartoon, no music |
| `voice/marina/aww-2.mp3` | 1.04 | -6.6 | Mild disappointed "aww" from a young woman, cute and funny, no music |
| `voice/marina/ouch-1.mp3` | 0.52 | -8.1 | Young woman says "Ow!" quick, cartoon, no music |
| `voice/marina/ouch-2.mp3` | 0.52 | -3.7 | Young woman "Oof!" short surprised, no music |
| `voice/marina/ouch-3.mp3` | 0.52 | -3.7 | Short "Ouch!" from a young woman, cute, no music |
| `voice/marina/woo-1.mp3` | 0.76 | -8.7 | Young woman shouts "Woo-hoo!" excited with a splashy water shimmer, cartoon, no music |
| `voice/marina/woo-2.mp3` | 0.84 | -3.6 | Excited woman whoops "Whee!" splash and bubbles, no music |
| `voice/marina/laugh-1.mp3` | 0.84 | -4.4 | Bubbly happy laugh of a young woman, bright, cartoon, no music |
| `voice/marina/laugh-2.mp3` | 0.81 | -3.4 | Young woman cheerful giggling laugh with bubbles, no music |
| `voice/marina/gasp-1.wav` | 0.28 | -3.3 | Young woman gasps in surprise, short, no music |
| `voice/marina/gasp-2.mp3` | 0.52 | -7.0 | Quick surprised "oh!" gasp of a young woman, no music |

`scale`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/scale/hello-1.mp3` | 0.84 | -8.6 | Gentle poised young woman softly says "Hello!" graceful, a little royal, cartoon, no music |
| `voice/scale/hello-2.mp3` | 0.78 | -7.8 | Calm elegant young woman says "Hello there" softly, kind, no music |
| `voice/scale/ready-1.mp3` | 0.57 | -7.3 | Poised young woman says "Ready." with quiet confidence, graceful, no music |
| `voice/scale/ready-2.mp3` | 0.91 | -6.2 | Elegant gentle young woman says "I am ready" softly, no music |
| `voice/scale/yay-1.mp3` | 1.04 | -6.1 | Graceful young woman says "Hooray!" delighted, elegant, cartoon, no music |
| `voice/scale/yay-2.mp3` | 0.94 | -3.8 | Elegant young woman cheers "Wonderful!" delighted, soft, no music |
| `voice/scale/yay-3.mp3` | 1.04 | -7.7 | Poised young woman "Hooray!" with delight, gentle, no music |
| `voice/scale/aww-1.mp3` | 0.68 | -8.3 | Prim young woman says a small "hmph" with a disappointed sigh, cute, no music |
| `voice/scale/aww-2.mp3` | 0.99 | -5.1 | Elegant young woman soft disappointed "oh..." sigh, no music |
| `voice/scale/ouch-1.mp3` | 0.52 | -8.1 | Gentle young woman says "Oh!" small wince, quick, no music |
| `voice/scale/ouch-2.mp3` | 0.52 | -3.7 | Poised woman soft "Oof" quick, no music |
| `voice/scale/ouch-3.wav` | 0.35 | -9.3 | Short gentle "Ow" from an elegant young woman, no music |
| `voice/scale/woo-1.mp3` | 0.76 | -4.0 | Delighted young woman says "Wheee!" light and graceful, cartoon, no music |
| `voice/scale/woo-2.mp3` | 0.84 | -5.9 | Elegant woman joyful "Oh yes!" light cheer, no music |
| `voice/scale/laugh-1.mp3` | 0.84 | -3.7 | Soft elegant giggle of a young woman, gentle, cartoon, no music |
| `voice/scale/laugh-2.mp3` | 0.84 | -3.9 | Graceful light laugh of a poised young woman, no music |
| `voice/scale/gasp-1.mp3` | 0.52 | -6.4 | Delighted young woman says "Oh!" soft gasp, graceful, no music |
| `voice/scale/gasp-2.wav` | 0.37 | -5.7 | Elegant young woman small surprised gasp, no music |

`marshmallow-birthday-cake`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/marshmallow-birthday-cake/hello-1.mp3` | 0.91 | -5.0 | Squishy bouncy marshmallow cartoon creature, cheerful high squeaky "hiii!" with a squishy boing, no music |
| `voice/marshmallow-birthday-cake/hello-2.mp3` | 0.63 | -7.1 | Cute squeaky marshmallow character high voice "hello!" with squish, cartoon, no music |
| `voice/marshmallow-birthday-cake/ready-1.mp3` | 0.84 | -4.8 | Bouncy squeaky "ready!" from a cute marshmallow character, squishy, no music |
| `voice/marshmallow-birthday-cake/ready-2.mp3` | 0.86 | -5.3 | Cute squishy cartoon character high cheerful "let's go!" with squeak, no music |
| `voice/marshmallow-birthday-cake/yay-1.mp3` | 1.04 | -4.6 | Happy squeaky marshmallow character squeals "yay!" ending with a party horn toot, cartoon, no music |
| `voice/marshmallow-birthday-cake/yay-2.mp3` | 1.04 | -5.8 | Cute squishy character cheers high "wheee!" then a party horn toot, no music |
| `voice/marshmallow-birthday-cake/yay-3.mp3` | 1.04 | -3.8 | Squeaky happy cheer and a party blower toot, cartoon, no music |
| `voice/marshmallow-birthday-cake/aww-1.mp3` | 1.04 | -3.8 | Deflating "awww" like a sinking soufflé, slow squeaky air leak, cute cartoon, no music |
| `voice/marshmallow-birthday-cake/aww-2.mp3` | 0.91 | -4.5 | Sad marshmallow character slow deflating squeaky sigh, comical, no music |
| `voice/marshmallow-birthday-cake/ouch-1.mp3` | 0.50 | -6.9 | Squishy "squish!" squeak, cute cartoon marshmallow, no music |
| `voice/marshmallow-birthday-cake/ouch-2.mp3` | 0.44 | -3.7 | Soft squishy squeak and boing, cartoon, no music |
| `voice/marshmallow-birthday-cake/ouch-3.mp3` | 0.52 | -7.7 | Cute squeaky "eep" squish, cartoon, no music |
| `voice/marshmallow-birthday-cake/woo-1.mp3` | 0.84 | -3.6 | Bouncy squeaky "wooo!" with boing, happy marshmallow character, no music |
| `voice/marshmallow-birthday-cake/woo-2.mp3` | 0.47 | -4.4 | Cute squishy cartoon bouncing squeal and boing, no music |
| `voice/marshmallow-birthday-cake/laugh-1.mp3` | 1.02 | -3.3 | Jiggly squeaky giggle of a cute marshmallow character, cartoon, no music |
| `voice/marshmallow-birthday-cake/laugh-2.mp3` | 0.91 | -3.7 | Bouncy squishy giggle, high pitched, cute, no music |
| `voice/marshmallow-birthday-cake/gasp-2.mp3` | 0.44 | -5.0 | Cute squishy startled "eep" squeak, no music |

`princess-amber`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/princess-amber/hello-1.mp3` | 0.70 | -8.5 | Warm kind young woman says "Hello!" composed and gentle, cartoon princess, no music |
| `voice/princess-amber/hello-2.mp3` | 0.91 | -6.1 | Kind friendly princess voice says "Hello, friend!" warm, no music |
| `voice/princess-amber/ready-1.mp3` | 0.73 | -8.5 | Composed warm young woman says "Ready!" kind, cartoon princess, no music |
| `voice/princess-amber/ready-2.mp3` | 0.91 | -7.3 | Gentle princess says "I'm ready!" warm and sweet, no music |
| `voice/princess-amber/yay-1.mp3` | 0.99 | -8.7 | Kind young woman says "How lovely!" delighted, warm, cartoon princess, no music |
| `voice/princess-amber/yay-2.mp3` | 0.94 | -6.8 | Warm princess cheers "Hooray!" gracefully happy, no music |
| `voice/princess-amber/yay-3.mp3` | 0.99 | -3.7 | Gentle woman "Oh, wonderful!" delighted, no music |
| `voice/princess-amber/aww-1.mp3` | 0.94 | -7.4 | Soft gentle "oh dear" from a kind young woman, cartoon princess, no music |
| `voice/princess-amber/aww-2.mp3` | 1.04 | -8.1 | Warm princess says "oh dear" softly disappointed, no music |
| `voice/princess-amber/ouch-1.mp3` | 0.52 | -5.6 | Gentle young woman "Oh!" small wince, quick, no music |
| `voice/princess-amber/ouch-2.mp3` | 0.52 | -6.4 | Kind woman soft "Ow" quick, cartoon, no music |
| `voice/princess-amber/ouch-3.mp3` | 0.52 | -8.3 | Princess quick small "oh my" wince, no music |
| `voice/princess-amber/woo-1.mp3` | 0.76 | -7.1 | Warm young woman says "Wonderful!" excited and kind, cartoon, no music |
| `voice/princess-amber/woo-2.mp3` | 0.84 | -3.9 | Princess happy "Wheee!" gentle and delighted, no music |
| `voice/princess-amber/laugh-1.mp3` | 0.94 | -3.5 | Gentle warm giggle of a kind young woman, cartoon princess, no music |
| `voice/princess-amber/laugh-2.mp3` | 0.84 | -3.7 | Soft sweet laugh of a princess, gentle, no music |
| `voice/princess-amber/gasp-1.mp3` | 0.52 | -4.2 | Kind young woman small gasp "oh!" surprised, no music |
| `voice/princess-amber/gasp-2.wav` | 0.36 | -4.3 | Princess soft startled gasp, gentle, no music |

`snowstar`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/snowstar/hello-1.mp3` | 0.91 | -3.7 | Imaginative curious young girl says "Hiii!" full of wonder, cartoon, no music |
| `voice/snowstar/hello-2.mp3` | 0.91 | -8.4 | Excited curious girl says "Hi hi hi!" with big wonder, no music |
| `voice/snowstar/ready-1.mp3` | 0.78 | -6.2 | Curious wonder-filled girl says "Ready!" eager, cartoon, no music |
| `voice/snowstar/ready-2.mp3` | 0.91 | -6.1 | Imaginative girl says "Okay, let's see!" excited, no music |
| `voice/snowstar/yay-1.mp3` | 1.04 | -5.0 | Girl excited squeal of joy "Yaaay!" full of wonder, cartoon, no music |
| `voice/snowstar/yay-2.mp3` | 0.97 | -7.4 | Curious girl cheering "Wow, yay!" delighted squeal, no music |
| `voice/snowstar/yay-3.mp3` | 1.02 | -7.9 | Young girl "Yippee!" excited squeal, bright, no music |
| `voice/snowstar/aww-1.mp3` | 0.94 | -7.5 | Wobbly big-eyed "awww" from a curious young girl, sad and cute, cartoon, no music |
| `voice/snowstar/aww-2.mp3` | 0.91 | -6.4 | Girl sad wobbly "awww..." sniffle, cute, no music |
| `voice/snowstar/ouch-1.mp3` | 0.52 | -3.5 | Young girl "Ow!" quick, cartoon, no music |
| `voice/snowstar/ouch-2.mp3` | 0.52 | -3.8 | Curious girl "Oof!" short, no music |
| `voice/snowstar/ouch-3.mp3` | 0.44 | -4.0 | Young girl small "ouchie" quick, no music |
| `voice/snowstar/woo-1.mp3` | 0.84 | -7.7 | Amazed cartoon girl says a big happy "Ooooh wow!" full of wonder, no music |
| `voice/snowstar/woo-2.mp3` | 0.84 | -9.6 | Girl amazed "Woooow!" delighted whoop, no music |
| `voice/snowstar/laugh-1.mp3` | 0.86 | -3.8 | Delighted curious girl giggling, bright, cartoon, no music |
| `voice/snowstar/laugh-2.mp3` | 0.86 | -5.3 | Young girl joyful laugh with wonder, cute, no music |
| `voice/snowstar/gasp-1.mp3` | 0.52 | -6.2 | Young girl big amazed "Ooooh!" gasp of wonder, short, no music |
| `voice/snowstar/gasp-2.mp3` | 0.52 | -3.7 | Curious girl quick gasp "oh!" wide-eyed, no music |

`unicorn`

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `voice/unicorn/hello-1.mp3` | 0.86 | -3.8 | Warm soft breathy horse nicker, low and gentle, with a quiet glockenspiel chime, serene magical unicorn, no words, no music |
| `voice/unicorn/hello-2.mp3` | 0.91 | -6.9 | Soft gentle horse whinny with warm breathy tone and a soft celesta twinkle, calm and magical, no music |
| `voice/unicorn/ready-1.mp3` | 0.78 | -6.3 | Soft airy unicorn whinny with a gentle chime, serene, quiet, no music |
| `voice/unicorn/ready-2.mp3` | 0.70 | -3.6 | Calm warm horse soft snort and low gentle whinny with a soft chime, magical, no music |
| `voice/unicorn/yay-1.mp3` | 1.04 | -7.9 | Brighter gentle unicorn whinny with a sparkle swell of chimes, magical, soft, no music |
| `voice/unicorn/yay-2.mp3` | 1.04 | -3.7 | Magical unicorn joyful soft whinny and sparkling shimmer, no music |
| `voice/unicorn/yay-3.mp3` | 0.86 | -5.2 | Gentle unicorn happy airy whinny with glittering chimes, no music |
| `voice/unicorn/aww-1.mp3` | 0.81 | -7.5 | Quiet gentle unicorn sigh, soft breath, delicate, sad, no music |
| `voice/unicorn/aww-2.mp3` | 0.78 | -8.4 | Soft sad horse sigh with a faint bell, serene, no music |
| `voice/unicorn/ouch-1.wav` | 0.36 | -3.3 | Soft unicorn small startled snort with a tiny chime, gentle, no music |
| `voice/unicorn/ouch-2.wav` | 0.33 | -4.0 | Warm gentle horse small startled huff and snort with a soft low bell, quiet, no music |
| `voice/unicorn/ouch-3.mp3` | 0.50 | -6.0 | Soft warm horse whuff and a short low breathy whinny, gentle, with a faint chime, no music |
| `voice/unicorn/woo-1.mp3` | 0.68 | -8.5 | Graceful unicorn soft airy whinny rising with chime sparkle, magical, no music |
| `voice/unicorn/woo-2.mp3` | 0.84 | -6.5 | Serene unicorn joyful light whinny and shimmer, no music |
| `voice/unicorn/laugh-1.mp3` | 0.89 | -5.9 | Gentle unicorn soft airy whinny-laugh with delicate chimes, magical, no music |
| `voice/unicorn/laugh-2.mp3` | 1.02 | -5.3 | Serene unicorn light happy huffing whinny and tinkling bells, no music |
| `voice/unicorn/gasp-1.wav` | 0.39 | -3.8 | Soft horse quick intake of breath and a short warm whinny with a faint celesta note, gentle, no music |
| `voice/unicorn/gasp-2.wav` | 0.38 | -6.3 | Gentle unicorn quick soft inhale with a tiny bell, no music |

### 9.3 Skipped, failed or rewritten

- **Host Glimmer lines (§5.1, all `host/*` keys): skipped.** Spoken lines need
  text-to-speech (the key has only the sound-generation permission) or a
  human recording. The test page lists every `host/*` key as "no file".
- **Music (§6.1 to 6.3, all nine songs): skipped.** Needs the music-generation
  permission or a composer. `dance` has the exact-tempo requirements in §6.3.
- **`npc/hoot/ready` ("Wands at the ready…") and `npc/hoot/bravo`
  ("Splendid!"/"Bravo!"): skipped.** They are spoken lines, and sound
  generation can't be trusted to say exact words. They need TTS or a recording.
- **Moderation blocks (HTTP 403, "may violate our Terms of Service"):** two
  prompts were refused: an imp giggle written as "tiny naughty goblin
  sniggering" and a snowstar `woo` ("curious young girl … Ooooh!"). Both were
  reworded and succeeded. No character voice needed a non-vocal fallback, but
  the `unicorn`, `bronze`, `fox`, `hotdog`, `cotton-candy` and
  `marshmallow-birthday-cake` sets are creature or robot sounds by design.
- **Unicorn rework:** the first unicorn `hello`, `ready`, `ouch` and `gasp`
  takes came out as pure high-frequency hiss or chime (over 95 % of the energy
  above 4 kHz, which would be shrill). Six of them were regenerated with
  "warm, low, breathy horse nicker plus a quiet chime" wording.
- `win` was first generated as one sustained bell ping (no ascending flourish
  in the pitch track), so it was replaced by two takes that do rise
  (`sfx/win-1` marimba arpeggio, `sfx/win-2` bell flourish).
- `stomp` and `boom` first came out as pure sub-bass (energy under 100 Hz),
  which tablets and laptops can't reproduce, so they were regenerated asking
  for a "punchy thump with a slap". `stomp-2`, `stomp-3` and both `boom` files
  are still mostly low-frequency (see the checklist).
- Synth sounds that must stay synthesized (`note`, `collect`) have no
  manifest keys, as the brief says.
- Credits: 337 successful generations (about 290 s of requested audio) and 4
  HTTP 403 moderation refusals, with no quota or rate-limit errors. The
  account balance can't be read with this key, so the remaining credit is
  unknown.

### 9.4 Listening pass needed

Open `?scene=audio` (press a key or click once to unlock audio; the `X` button
plays the next file variant on its own so you can reject individual takes).
Listen to these first, because the measurements can't tell if they are right:

- [ ] **Voices, all 12 sets.** Are they cute and clearly the right character,
  with no adult, creepy or mushy takes? Pay most attention to `felicity`
  (fox yip layering), `kpop-girls` (three distinct voices?), `bronze`
  (robot beeps, not words), `hotdog` (silly gibberish and raspberry),
  `marshmallow-birthday-cake` (squeaks and the party-horn toot on `yay`),
  `scale`/`princess-amber` (gentle and kind) and `unicorn` (soft, never
  shrill).
- [ ] `roar`, `npc/troll/*` and `snore`: comic and grumpy, not scary for a
  5-year-old. `npc/troll/windup` must clearly cue a dodge.
- [ ] `cheer`, `aww`, `yay`, `giggle`, `applause`, `crowd-*`: kids, not adults;
  `aww` kind, not mocking.
- [ ] `stomp`, `boom` (both takes), `thunder`: enough punch on a small speaker?
  `bigpop` is a very short pop with little confetti.
- [ ] `pump` (mashed 8 times a second), `bubble`, `brush`, `flip`, `crack`,
  `splat`: short and clean, no smearing or clicks.
- [ ] `tick-tock` and `cauldron` loops: no bump at the seam when repeated.
- [ ] Jingles (`fanfare`, `win-1`/`win-2`, `lose`, `star`, `jingle/*`): in key
  and cheerful? `lose` should be a kind wah-wah with an upbeat button.
  `jingle/trophy` ends on a long quiet reverb tail (5.6 s total).
- [ ] `drumroll` ends on a clean stop with no cymbal.
- [ ] `shutter`, `fizzle`, `zap`, `ring`, `grow-flower`, `towel`, `stir`:
  sound like what the name says?



## 10. Round 2 — sound wishes from the minigames (wordless only)

Compiled by the lead from the minigame agents. Every key below already has a
synth fallback, so add files at your own pace. **All of them are now
delivered** (round 2, see §11); the Status column gives the number of files per
key in row order. Keys marked *(wired)* are
already called by the code and play as soon as a file is listed in the
manifest; the others need a one-line code hook when delivered (tell the
lead or the game's owner).

| Key | Sound | Game | Status |
| --- | --- | --- | --- |
| `tick-tock` *(wired)* | Distinct tick/tock pair for the ticking present | Pass the Present | delivered (round 1) |
| `fuse-sizzle` | Fuse sizzle loop rising in pitch as the present heats | Pass the Present | delivered, loop |
| `golden-chime` | Short sparkly 2-note chime (golden cupcake / golden gem) | Sprinkle Catch, Troll Trouble | delivered |
| `cake-blorp` | Cake plops a treat out | Sprinkle Catch | delivered |
| `rubber-bounce` | Soft rubbery bounce for treats | Sprinkle Catch | delivered (2) |
| `boing` | Cartoon boing for dash bumps | Bumper Bounce, Crown Keeper | delivered (2) |
| `frosting-crumble` | Frosting crumble/crack for the edge stages | Bumper Bounce | delivered |
| `wheee-fall` | Falling "wheee"-style whoosh (no words) | Bumper Bounce | delivered (no voice) |
| `balloon-stretch` *(wired)* | Rubbery creak at 50/75/90% size | Balloon Pump | delivered (round 1) |
| `hose-sputter` | Comic sputter/raspberry for the red-zone hose | Balloon Pump | delivered |
| `npc/troll/*` *(wired)* | grumble, windup, yawn, laugh (delivered round 1) | Troll Trouble | delivered (round 1) |
| `note-u`, `note-d`, `note-l`, `note-r`, `note-star` | Five dance-move notes (now synth midi 72/67/70/75/79) | Spotlight Dance-Off | delivered, exact pitches |
| `sparkle-beam` | Sparkle-beam zap | Spotlight Dance-Off, Pop Star Stage, Wizard Quick-Draw | delivered |
| `cookie-snap`, `crumble-plop` | Cookie crack snap; crumble and milk plop | Cookie Crumble | delivered (2 + 2) |
| `paint-splat-wet`, `roller-ding` | Squishy splat with drip; roller pickup ding | Paint Party | delivered (2 + 1) |
| `crown-sting`, `crown-land`, `bonk` | Royal sting on pickup; boing/thunk on landing; bonk on bump | Crown Keeper | delivered (1 + 1 + 2) |
| `ring-combo` | Sparkly ding in 6–8 pitch steps | Broomstick Dash | delivered, one base tone (MIDI 79) |
| `broom-whoosh` | Short whoosh loop (boost and glide variants) | Broomstick Dash | delivered, plus `broom-glide` loop |
| `wing-twinkle` | Magical wing-twinkle loop | Fairy Count | delivered, loop |
| `count-chime` | Soft counting chime in 12 pitch steps | Fairy Count | delivered, one base tone (MIDI 79) |
| `double-time` | "Double time!" style instrumental sting (no words) | Crown Keeper, Paint Party | delivered (instrumental) |
| `cauldron-plop`, `hic`, `giant-stomp`, `tiny-squeak` | Potion effects (hic = cute non-word hiccup) | Potion Class | delivered (1 + 1 + 2 + 2) |
| `card-flip`, `card-whoosh`, `match-chime` | Paper card flip; whoosh into the pile; match chime | Memory Match | delivered (2 + 1 + 1) |
| `camera-flash` | Crowd of camera clicks | Fashion Show | delivered (2) |
| `sprinkle-shake`, `candle-blow` | Sprinkle-jar rattle loop; "fwoo" breath | Cake Bakery | delivered (loop + 1) |
| `crowd-aww` | Crowd "awww" (wordless) | Fashion Show, results | delivered (2) |
| `jingle/happy-birthday` | Instrumental Happy Birthday (public-domain tune) | Cake Bakery | delivered (rendered, not generated) |
| `scrub`, `shower`, `pet-shake` | Soapy squeak scrub; short spray; wet-fur flap | Pet Spa | delivered (2 + 1 + 2) |
| `note-hit-a`, `note-hit-b`, `note-hit-x`, `note-hit-y`, `fever`, `big-imp-poof` | Pitched hit chimes, fever riser, big imp poof | Pop Star Stage | delivered (exact pitches) + 1 + 1 |
| `plant-seed`, `firefly-catch`, `petal-firework`, `night-crickets` | Soil pat; twinkly bloop; soft pop + shimmer; ambience loop | Fairy Garden | delivered (3 + 3 + 2 + loop) |


## 11. Delivery log: round 2 (§10 sound wishes)

Generated on 2026-10-02 with the same ElevenLabs **sound-generation** API as
round 1 (`POST /v1/sound-generation`, `prompt_influence` 0.6 for SFX, 0.55
for `crowd-aww`, 0.7 for the stings; loop sources were requested with
`loop: true`), then processed with the §9 chain. One file,
`jingle/happy-birthday`, was **rendered in Python/numpy, not generated** (the
sound API can't play a given melody). Every sound is wordless. **All checks
were by measurement; nobody has listened to these yet** (see §11.5).

### 11.1 What was delivered

All 51 missing §10 keys plus `broom-glide` (the softer glide variant of
`broom-whoosh`): **52 keys, 70 files, 1.59 MiB** (1,662,600 bytes: 42 WAV
files 1.20 MiB, 28 MP3 files 0.38 MiB). "Level" is integrated loudness for
loops and long clips, otherwise the sample peak in dBFS.

| Key | Files | Seconds | Type | Level |
| --- | --- | --- | --- | --- |
| `fuse-sizzle` | `sfx/fuse-sizzle.wav` | 0.80 | loop 0.8 s | -22 LUFS |
| `golden-chime` | `sfx/golden-chime.mp3` | 0.78 | two-note chime, MIDI 83→88 | pk -6.8 |
| `cake-blorp` | `sfx/cake-blorp.wav` | 0.22 | one-shot | pk -3.3 |
| `rubber-bounce` | `sfx/rubber-bounce-1.wav`, `sfx/rubber-bounce-2.wav` | 0.28–0.34 | one-shot | pk -3.3 |
| `boing` | `sfx/boing-1.mp3`, `sfx/boing-2.mp3` | 0.47–0.50 | one-shot | pk -3.7 |
| `frosting-crumble` | `sfx/frosting-crumble.wav` | 0.34 | one-shot | pk -3.3 |
| `wheee-fall` | `sfx/wheee-fall.mp3` | 1.15 | one-shot | -15 LUFS |
| `hose-sputter` | `sfx/hose-sputter.mp3` | 0.60 | one-shot | pk -3.7 |
| `note-u` | `sfx/note-u.wav` | 0.27 | pitched, MIDI 72 | pk -6.3 |
| `note-d` | `sfx/note-d.wav` | 0.27 | pitched, MIDI 67 | pk -6.3 |
| `note-l` | `sfx/note-l.wav` | 0.27 | pitched, MIDI 70 | pk -6.3 |
| `note-r` | `sfx/note-r.wav` | 0.27 | pitched, MIDI 75 | pk -6.3 |
| `note-star` | `sfx/note-star.wav` | 0.27 | pitched, MIDI 79 | pk -6.3 |
| `sparkle-beam` | `sfx/sparkle-beam.mp3` | 0.65 | one-shot | pk -6.0 |
| `cookie-snap` | `sfx/cookie-snap-1.wav`, `sfx/cookie-snap-2.wav` | 0.23–0.28 | one-shot | pk -6.3 |
| `crumble-plop` | `sfx/crumble-plop-1.mp3`, `sfx/crumble-plop-2.wav` | 0.29–0.52 | one-shot | pk -3.8, pk -3.3 |
| `paint-splat-wet` | `sfx/paint-splat-wet-1.wav`, `sfx/paint-splat-wet-2.wav` | 0.17–0.24 | one-shot | pk -3.3 |
| `roller-ding` | `sfx/roller-ding.wav` | 0.38 | one-shot | pk -6.3 |
| `crown-sting` | `sfx/crown-sting.mp3` | 0.99 | one-shot | -16 LUFS |
| `crown-land` | `sfx/crown-land.mp3` | 0.44 | one-shot | pk -3.8 |
| `bonk` | `sfx/bonk-1.wav`, `sfx/bonk-2.wav` | 0.31–0.33 | one-shot | pk -3.3 |
| `ring-combo` | `sfx/ring-combo.wav` | 0.34 | pitched, MIDI 79 | pk -6.3 |
| `broom-whoosh` | `sfx/broom-whoosh.wav` | 1.00 | loop 1.0 s, 22.05 kHz | -18 LUFS |
| `broom-glide` | `sfx/broom-glide.wav` | 1.00 | loop 1.0 s, 22.05 kHz | -23 LUFS |
| `wing-twinkle` | `sfx/wing-twinkle.wav` | 0.80 | loop 0.8 s | -29 LUFS |
| `count-chime` | `sfx/count-chime.wav` | 0.34 | pitched, MIDI 79 | pk -6.3 |
| `double-time` | `sfx/double-time.mp3` | 1.18 | one-shot | -16 LUFS |
| `cauldron-plop` | `sfx/cauldron-plop.mp3` | 0.57 | one-shot | pk -3.8 |
| `hic` | `sfx/hic.wav` | 0.13 | one-shot | pk -3.3 |
| `giant-stomp` | `sfx/giant-stomp-1.mp3`, `sfx/giant-stomp-2.wav` | 0.25–0.50 | one-shot | pk -3.8, pk -3.3 |
| `tiny-squeak` | `sfx/tiny-squeak-1.mp3`, `sfx/tiny-squeak-2.wav` | 0.36–0.44 | one-shot | pk -6.7, pk -3.3 |
| `card-flip` | `sfx/card-flip-1.wav`, `sfx/card-flip-2.wav` | 0.16–0.25 | one-shot | pk -6.3, pk -9.3 |
| `card-whoosh` | `sfx/card-whoosh.wav` | 0.25 | one-shot | pk -6.3 |
| `match-chime` | `sfx/match-chime.wav` | 0.34 | two-note chime, MIDI 79→84 | pk -6.3 |
| `camera-flash` | `sfx/camera-flash-1.mp3`, `sfx/camera-flash-2.mp3` | 0.73–0.73 | one-shot | pk -3.6, pk -6.5 |
| `sprinkle-shake` | `sfx/sprinkle-shake.wav` | 0.96 | loop 0.96 s | -27 LUFS |
| `candle-blow` | `sfx/candle-blow.mp3` | 0.70 | one-shot | pk -3.9 |
| `crowd-aww` | `sfx/crowd-aww-1.mp3`, `sfx/crowd-aww-2.mp3` | 1.18–1.20 | one-shot | -16 LUFS, -17 LUFS |
| `jingle/happy-birthday` | `jingle/happy-birthday.mp3` | 13.90 | jingle (rendered) | -16 LUFS |
| `scrub` | `sfx/scrub-1.mp3`, `sfx/scrub-2.wav` | 0.40–0.52 | one-shot | pk -4.1, pk -3.3 |
| `shower` | `sfx/shower.mp3` | 0.50 | one-shot | pk -8.3 |
| `pet-shake` | `sfx/pet-shake-1.mp3`, `sfx/pet-shake-2.mp3` | 0.68–0.73 | one-shot | pk -4.0, pk -3.8 |
| `note-hit-a` | `sfx/note-hit-a.wav` | 0.27 | pitched, MIDI 72 | pk -6.3 |
| `note-hit-b` | `sfx/note-hit-b.wav` | 0.27 | pitched, MIDI 75 | pk -6.3 |
| `note-hit-x` | `sfx/note-hit-x.wav` | 0.27 | pitched, MIDI 79 | pk -6.3 |
| `note-hit-y` | `sfx/note-hit-y.wav` | 0.27 | pitched, MIDI 82 | pk -6.3 |
| `fever` | `sfx/fever.mp3` | 1.15 | one-shot | -16 LUFS |
| `big-imp-poof` | `sfx/big-imp-poof.mp3` | 0.50 | one-shot | pk -3.7 |
| `plant-seed` | `sfx/plant-seed-1.wav`, `sfx/plant-seed-2.wav`, `sfx/plant-seed-3.wav` | 0.08–0.12 | one-shot | pk -3.3 |
| `firefly-catch` | `sfx/firefly-catch-1.wav`, `sfx/firefly-catch-2.mp3`, `sfx/firefly-catch-3.wav` | 0.17–0.44 | one-shot | pk -6.3, pk -6.7, pk -6.3 |
| `petal-firework` | `sfx/petal-firework-1.mp3`, `sfx/petal-firework-2.mp3` | 0.76–0.81 | one-shot | pk -4.3, pk -3.6 |
| `night-crickets` | `sfx/night-crickets.wav` | 2.50 | loop 2.5 s, 22.05 kHz | -27 LUFS |

**Notes for wiring** (no code was changed in this delivery):

- `note-u`/`d`/`l`/`r`/`star` sound at exactly MIDI 72/67/70/75/79 at
  `rate` 1 (measured within ±1 cent). `note-hit-a`/`b`/`x`/`y` match
  `BTN_MIDI` in `pop-star-stage.js` (72/75/79/82, not the 72/76/79/84
  fallback); a "perfect" hit one octave up is `rate: 2`.
- `count-chime` and `ring-combo` are one tone each at **MIDI 79** (G5), the
  same base as the synth `collect`, so `rate: 2 ** (step / 12)` reproduces the
  synth's steps (Fairy Count up to +12, Broomstick Dash up to +14).
- `fuse-sizzle` is meant to be pitched up with `rate` as the present heats.
- Loops are mixed as beds, quieter than one-shots (whoosh −18, glide −23,
  fuse −22, sprinkle −27, wing −29, crickets −27 LUFS); raise them with `vol`
  if needed. All six loops are short WAVs that loop seamlessly (§11.3).
- `golden-chime` and `match-chime` are two rising notes, not one ping.
- `jingle/happy-birthday` is 13.9 s: C major, 3/4, 112 BPM with a small
  ritardando in the last two bars.

### 11.2 Prompts used (for regenerating)

Same columns as §9.2. Where a file was cut, repitched, layered or assembled,
the note in italics says how; the prompt is the take it came from.

| File | s | Peak | Prompt |
| --- | --- | --- | --- |
| `sfx/fuse-sizzle.wav` | 0.80 | -12.8 | Cartoon fuse sizzling steadily, soft crackling sparkler hiss, continuous and even, no explosion, no bang |
| `sfx/golden-chime.mp3` | 0.78 | -6.8 | *(tone repitched to MIDI 83/88)* One clean celesta bell note struck once, bright and pure, short decay |
| `sfx/cake-blorp.wav` | 0.22 | -3.3 | Cartoon cake plopping out a treat, a soft squishy blorp pop, cute and bouncy |
| `sfx/rubber-bounce-1.wav` | 0.34 | -3.3 | One playful rubbery boing-bounce, a squishy jelly candy bouncing off a plate, cartoon, mid pitched |
| `sfx/rubber-bounce-2.wav` | 0.28 | -3.3 | One gentle rubbery bounce, jelly sweet bouncing once, soft cartoon boink |
| `sfx/boing-1.mp3` | 0.50 | -3.7 | Cartoon spring boing, one bouncy boinggg with a springy wobble, comic |
| `sfx/boing-2.mp3` | 0.47 | -3.7 | Classic cartoon jaw harp boing, short springy bounce sound, funny |
| `sfx/frosting-crumble.wav` | 0.34 | -3.3 | Thick frosting and cake edge crumbling and cracking away, soft sugary crumbly crack, cartoon |
| `sfx/wheee-fall.mp3` | 1.15 | -7.0 | Cartoon falling sound: a slide whistle gliding down in pitch with a soft whoosh of air, playful, instrumental only, no voice |
| `sfx/hose-sputter.mp3` | 0.60 | -3.7 | Garden hose sputtering and gurgling, wet bubbly blubbering splutter of water and air, comic cartoon, no voice |
| `sfx/note-u.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 72)* One mellow marimba tone, a single note struck once, warm and round, dry |
| `sfx/note-d.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 67)* One mellow marimba tone, a single note struck once, warm and round, dry |
| `sfx/note-l.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 70)* One mellow marimba tone, a single note struck once, warm and round, dry |
| `sfx/note-r.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 75)* One mellow marimba tone, a single note struck once, warm and round, dry |
| `sfx/note-star.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 79)* One mellow marimba tone, a single note struck once, warm and round, dry |
| `sfx/sparkle-beam.mp3` | 0.65 | -6.0 | Magic sparkle beam zap, a quick shimmering whoosh of glitter with a soft bright ting, cute and magical, not harsh |
| `sfx/cookie-snap-1.wav` | 0.28 | -6.3 | One sharp crunchy biscuit snap, short |
| `sfx/cookie-snap-2.wav` | 0.23 | -6.3 | Short crisp cracker snap, one break |
| `sfx/crumble-plop-1.mp3` | 0.52 | -3.8 | Cookie crumbs falling into a glass of milk with a soft little plop |
| `sfx/crumble-plop-2.wav` | 0.29 | -3.3 | Small cookie chunk plopping into a cup of milk, soft cute plunk |
| `sfx/paint-splat-wet-1.wav` | 0.24 | -3.3 | Squishy wet paint splat with a little drip, cartoon, one splat |
| `sfx/paint-splat-wet-2.wav` | 0.17 | -3.3 | One gooey paint blob splat with a short drippy tail, playful |
| `sfx/roller-ding.wav` | 0.38 | -6.3 | Cheerful pickup ding, one warm mid-pitched bell note, item collected, short and round |
| `sfx/crown-sting.mp3` | 0.99 | -5.5 | Short royal fanfare sting, regal trumpets with a bright bell sparkle, kids game, celebratory, ending on a held major chord, instrumental |
| `sfx/crown-land.mp3` | 0.44 | -3.8 | Toy crown landing on a head, a soft wooden thunk with a short springy boing, cute cartoon |
| `sfx/bonk-1.wav` | 0.33 | -3.3 | Cartoon bonk on the head, a hollow wooden coconut knock, comic, bright, one hit |
| `sfx/bonk-2.wav` | 0.31 | -3.3 | Comic cartoon bonk, a hollow woodblock clonk with a tiny boing, one hit |
| `sfx/ring-combo.wav` | 0.34 | -6.3 | *(tone repitched to MIDI 79)* A single sparkly bell ding, one clear bright note, glockenspiel, no reverb |
| `sfx/broom-whoosh.wav` | 1.00 | -5.3 | Constant fast wind rush heard while flying, steady strong airflow at an unchanging level, no swells, smooth, exciting |
| `sfx/broom-glide.wav` | 1.00 | -10.5 | *(cut from the `broom-whoosh` take, filtered 120 Hz–1.6 kHz, 5 dB quieter)* Constant fast wind rush heard while flying, steady strong airflow at an unchanging level, no swells, smooth, exciting |
| `sfx/wing-twinkle.wav` | 0.80 | -6.3 | Soft fluttering of small wings, gentle airy flapping with a warm faint twinkle of chimes, continuous, steady, calm |
| `sfx/count-chime.wav` | 0.34 | -6.3 | *(tone repitched to MIDI 79)* One soft music box note, pure and sweet, single tone |
| `sfx/double-time.mp3` | 1.18 | -5.9 | Fast upbeat instrumental sting: a quick rising xylophone run and two bright brass stabs, exciting and playful, speeding up, no voice |
| `sfx/cauldron-plop.mp3` | 0.57 | -3.8 | Something plopping into a bubbling potion cauldron, thick liquid bloop with a bubble |
| `sfx/hic.wav` | 0.13 | -3.3 | Cute cartoon hiccup sound effect, a single small squeaky hic |
| `sfx/giant-stomp-1.mp3` | 0.50 | -3.8 | *(hit cut at 0.43 s of one multi-hit take, plus saturation and crunch layers)* Heavy wooden boxes dropped one at a time on a wooden floor, four separate thick clunks with pauses, punchy, crunchy, cartoon |
| `sfx/giant-stomp-2.wav` | 0.25 | -3.3 | *(hit cut at 0.92 s of one multi-hit take, plus saturation and crunch layers)* Heavy wooden boxes dropped one at a time on a wooden floor, four separate thick clunks with pauses, punchy, crunchy, cartoon |
| `sfx/tiny-squeak-1.mp3` | 0.44 | -6.7 | One small squeaky toy squeak, very short and cute |
| `sfx/tiny-squeak-2.wav` | 0.36 | -3.3 | Little cartoon critter squeak, tiny and sweet, single chirp |
| `sfx/card-flip-1.wav` | 0.25 | -6.3 | Paper playing card flipped over on a table, crisp quick flick |
| `sfx/card-flip-2.wav` | 0.16 | -9.3 | One playing card turned over, quick soft paper snap |
| `sfx/card-whoosh.wav` | 0.25 | -6.3 | A card sliding fast across a table into a stack, short swish and tap |
| `sfx/match-chime.wav` | 0.34 | -6.3 | *(tone repitched to MIDI 79/84)* One mellow marimba tone, a single note struck once, warm and round, dry |
| `sfx/camera-flash-1.mp3` | 0.73 | -3.6 | Crowd of photographers taking pictures, several camera shutters clicking quickly with flash pops, fashion runway |
| `sfx/camera-flash-2.mp3` | 0.73 | -6.5 | Burst of many camera clicks and flashes at a red carpet, quick overlapping shutter clicks |
| `sfx/sprinkle-shake.wav` | 0.96 | -6.3 | Shaking a small jar of candy sprinkles back and forth, steady even rhythmic rattle, continuous |
| `sfx/candle-blow.mp3` | 0.70 | -3.9 | Soft breath blowing out birthday candles, a gentle fwoo puff of air |
| `sfx/crowd-aww-1.mp3` | 1.20 | -5.3 | Small group of children making a warm wordless awww sigh together, gentle and adoring, sweet, no words |
| `sfx/crowd-aww-2.mp3` | 1.18 | -3.7 | A few young children going awww together, a soft high adoring sigh, cute and kind, wordless |
| `jingle/happy-birthday.mp3` | 13.90 | -4.3 | *(rendered in Python/numpy, no prompt; see §11.3)* |
| `sfx/scrub-1.mp3` | 0.52 | -4.1 | Soapy sponge scrubbing with squeaky foam bubbles, one short scrub |
| `sfx/scrub-2.wav` | 0.40 | -3.3 | Quick squeaky soapy scrub on fur, bubbly lather, short |
| `sfx/shower.mp3` | 0.50 | -8.3 | Short spray of a handheld shower hose, gentle water spray burst then stops, bath time |
| `sfx/pet-shake-1.mp3` | 0.68 | -4.0 | Wet puppy shaking off water, fur flapping and droplets spraying, cartoon, short |
| `sfx/pet-shake-2.mp3` | 0.73 | -3.8 | Little wet dog shaking itself dry, floppy ears flapping and fur rustling, droplets pattering, cute |
| `sfx/note-hit-a.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 72)* Single vibraphone note, one clean soft mallet hit, bright and round, short decay, no tremolo |
| `sfx/note-hit-b.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 75)* Single vibraphone note, one clean soft mallet hit, bright and round, short decay, no tremolo |
| `sfx/note-hit-x.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 79)* Single vibraphone note, one clean soft mallet hit, bright and round, short decay, no tremolo |
| `sfx/note-hit-y.wav` | 0.27 | -6.3 | *(tone repitched to MIDI 82)* Single vibraphone note, one clean soft mallet hit, bright and round, short decay, no tremolo |
| `sfx/fever.mp3` | 1.15 | -4.3 | Rainbow fever power-up riser, a rising sparkly synth sweep with shimmering bells, exciting, ends bright |
| `sfx/big-imp-poof.mp3` | 0.50 | -3.7 | Big magical poof: a cartoon puff of smoke, airy whoosh with a soft pop and twinkling sparkles, friendly, mid-range |
| `sfx/plant-seed-1.wav` | 0.09 | -3.3 | *(hit cut at 0.7 s of one multi-hit take)* Hand patting soft garden soil, five separate gentle pats with pauses, crunchy earthy pat, close up |
| `sfx/plant-seed-2.wav` | 0.12 | -3.3 | *(hit cut at 1.77 s of one multi-hit take)* Hand patting soft garden soil, five separate gentle pats with pauses, crunchy earthy pat, close up |
| `sfx/plant-seed-3.wav` | 0.08 | -3.3 | *(hit cut at 2.69 s of one multi-hit take)* Hand patting soft garden soil, five separate gentle pats with pauses, crunchy earthy pat, close up |
| `sfx/firefly-catch-1.wav` | 0.35 | -6.3 | Twinkly cute bloop, a little magical blip with a sparkle |
| `sfx/firefly-catch-2.mp3` | 0.44 | -6.7 | Tiny bright magical bloop with a twinkle, cute catch sound |
| `sfx/firefly-catch-3.wav` | 0.17 | -6.3 | Short sparkly pop bloop, firefly caught in a jar, cute |
| `sfx/petal-firework-1.mp3` | 0.81 | -4.3 | Soft round pop like a bubble, then a warm low twinkling shimmer of glockenspiel notes, magical flower bloom, gentle |
| `sfx/petal-firework-2.mp3` | 0.76 | -3.6 | Gentle magical firework: a soft round pop then a warm sparkling chime cascade, cute, not loud |
| `sfx/night-crickets.wav` | 2.50 | -15.2 | Crickets chirping at night, close and clear, gentle rhythmic chirps, calm countryside, steady |

Pitched tone sources (single takes, measured fundamentals): `note-*` from
"One mellow marimba tone, a single note struck once, warm and round, dry"
(526.1 Hz, MIDI 72.09); `note-hit-*` from "Single vibraphone note, one clean
soft mallet hit, bright and round, short decay, no tremolo" (1050.9 Hz, MIDI
84.07); `count-chime` from "One soft music box note, pure and sweet, single
tone" (1478.1 Hz); `ring-combo` from "A single sparkly bell ding, one clear
bright note, glockenspiel, no reverb" (2096.5 Hz); `golden-chime` from "One
clean celesta bell note struck once, bright and pure, short decay" (1875.2
Hz). Each source holds over 94 % of its energy at the fundamental.

### 11.3 Processing and deviations from §9

- **Chain:** as §9 (mono, 44.1 kHz, 30 Hz high-pass, silence trim, peak −3.3
  dBFS for SFX and −6.3 for UI-like chimes/dings, about −16 LUFS with a −3.3
  dBFS peak cap for `crowd-aww`, `crown-sting`, `double-time`, `fever` and
  the jingle). Changes: the fade-in is 5 ms; the "shrill" rule (more than
  60 % of the energy above 4 kHz → 3 dB lower) now applies to every clip, not
  only crowds and voices; peak-normalized clips of 0.4 s or more are capped at
  −14 LUFS so a sustained tone doesn't jump out (only `wheee-fall` was
  affected); the trim also drops a stray click that sits more than 100 ms
  before the main sound, or a blip after a 100 ms gap at the end.
- **Formats:** clips under 0.4 s and all loops are 16-bit mono WAV, the rest
  mono 96 kbps MP3, as in round 1. Deviation: `broom-whoosh` and
  `broom-glide` are 22.05 kHz WAV (like `night-crickets`) because they have no
  energy above 4 kHz, which halves their size.
- **Loops:** a steady stretch of a `loop: true` take was picked by measuring
  level variance, preferring a seam at a quieter moment, and the extra tail
  was equal-power crossfaded into the head (60 to 250 ms). The last sample of
  each loop runs straight into the first, because the wrap is the source's own
  continuation. Measured for every loop: the sample jump at the wrap is below
  the 99th percentile of normal sample-to-sample steps, the level change
  across the wrap (20 ms windows) is inside the loop's own range, and the
  crossfaded region is within the 5–95 % level range of the rest of the loop.
  `sprinkle-shake` is exactly 4 shake periods (4 × 0.24 s).
- **Pitched notes:** one clean generated tone per set, its fundamental
  measured by FFT peak with sub-harmonic check, then repitched tape-style (soxr
  resampler) to each target and trimmed to 0.27 s (`count-chime` and
  `ring-combo` 0.34 s) with an 80 to 120 ms fade. Measured error after
  repitching: −0.7 to +0.4 cents, `ring-combo` +3 cents.
- **`golden-chime`, `match-chime`:** the API returned a single sustained ping
  for both (twice for `golden-chime`), so each is assembled from a generated
  bell or marimba tone repitched to two rising notes 0.10–0.11 s apart
  (B5→E6 and G5→C6).
- **`giant-stomp`:** nine single-footstep takes and one multi-step take were
  all sub-bass (95 to 100 % of the energy under 300 Hz, inaudible on
  tablets). The two files are
  wooden clunks cut from one "wooden boxes dropped" take, with a
  soft-saturation layer above 250 Hz and a 50 ms crunch from the
  `frosting-crumble` take under the attack, which moves the spectral centroid
  from about 300 to 400 Hz with real 250 Hz–3.5 kHz content.
- **`plant-seed`:** three single pats cut from one take of several soil pats
  (single-pat prompts came out near-silent or as sub-bass thuds).
- **`broom-glide`:** a different stretch of the `broom-whoosh` take, filtered
  120 Hz–1.6 kHz and 5 dB quieter. Four dedicated glide takes were rejected
  (two pure sub-bass rumble, one that swelled up from silence, one 8 kHz
  hiss).
- **`jingle/happy-birthday` (rendered, not generated):** the public-domain
  melody played as a music box/celesta in additive synthesis (partials 1, 2,
  3, 4.16 and 5.43 × f with bell-like exponential decays and a faint octave
  sparkle), over a soft waltz accompaniment (root on beat 1, two-note chords on
  beats 2 and 3: C, G7, C7, F). It has a small synthetic room reverb, about
  2 dB of soft limiting and −16.4 LUFS, mono 96 kbps MP3. The script is
  `hbday.py` in the generating session's scratchpad; it is not in the repo.

### 11.4 Skipped, failed or rewritten

- **Nothing skipped.** 123 generation calls (about 143 s of requested audio),
  no moderation refusals, no errors or quota problems.
- **Prompts reworded after measurement** (the first wording's take was
  rejected): `rubber-bounce` 1–2 (sub-bass or near-silent), `bonk` 1 and 3
  (pure sub-bass), `crown-land` 1–2 (sub-bass, then 9–10 kHz tinny),
  `plant-seed` (near-silent, see above), `petal-firework` 1–2 (near-silent,
  12 kHz and 8 kHz shrill takes), `night-crickets` (9.6 kHz hiss, then a
  near-silent take), `wing-twinkle` (10 kHz
  hiss; the kept take is warmer but still mostly above 4 kHz), `hose-sputter`
  (8 kHz hiss), `card-whoosh` 1 (12 kHz hiss), `roller-ding` (4.8 kHz pure
  tone), `pet-shake` 2 (98 % above 4 kHz), `crowd-aww` 2
  (centroid 430 Hz, likely adult voices), `big-imp-poof`
  (90 % sub-bass), `broom-whoosh` (swelled instead of staying steady).
- **Takes dropped** (generated but not shipped), to stay near the size budget
  or because they were the weakest take: `rubber-bounce`, `cookie-snap`,
  `card-flip`, `scrub`, `tiny-squeak`, `crumble-plop`, `paint-splat-wet`,
  `bonk`, `boing`, `camera-flash` and `giant-stomp` each lost one take (all
  keep 2, the minimum for repeated hits); the second takes of `cake-blorp`,
  `crown-land`, `cauldron-plop`, `card-whoosh`, `hic`, `candle-blow` and
  `frosting-crumble` were dropped (1 take each, like other non-repeated
  sounds).
- **Size:** 1.59 MiB, a little over the ~1.5 MB target, because the 0.4 s WAV
  rule makes each short hit 10 to 35 KB. If needed: drop `firefly-catch-3`
  and `plant-seed-3` (−22 KB), shorten `night-crickets` to 2 s (−22 KB), or
  encode non-timing-critical hits as MP3.

### 11.5 Listening pass needed

Open `?scene=audio`; the new keys are in the SFX and Jingles tabs (`X` plays
the next variant). Listen to these first:

- [ ] `crowd-aww` (both): kids, not adults, and **no words**. `hic`: a cute
  hiccup, not a voice. `wheee-fall`: slide whistle, no voice. `double-time`,
  `crown-sting`, `fever`: instrumental only.
- [ ] `giant-stomp`: is the layered wooden clunk punchy and funny (not a
  door slam)? `plant-seed`: very short dull pats (0.08–0.12 s). Do they read
  as soil?
- [ ] `jingle/happy-birthday`: correct melody and rhythm, cute music-box
  sound, ending not cut off.
- [ ] Pitched sets: `note-*` (marimba) and `note-hit-*` (vibraphone) in tune
  against the backing music; `count-chime`/`ring-combo` stepped up with
  `rate` to +12/+14 semitones still sound sweet, not chipmunky.
- [ ] Loops, repeated for 30 s: no bump at the seam in `fuse-sizzle`,
  `broom-whoosh`, `broom-glide`, `wing-twinkle`, `sprinkle-shake`,
  `night-crickets`. `sprinkle-shake` and `wing-twinkle` are very bright (most
  energy above 4 kHz), so check they aren't piercing. `night-crickets` should be
  calm, not shrill.
- [ ] Bright noisy hits (placed 3 dB lower): `cookie-snap`, `card-flip-2`,
  `shower`, `camera-flash-2`, `sparkle-beam`, `tiny-squeak`. Pleasant, not
  harsh? `camera-flash` should sound like several cameras.
- [ ] `crumble-plop-1` is crumbs, a pause, then a plop (0.52 s). Fine, or too
  gappy? `hose-sputter`: comic, not rude.
- [ ] `golden-chime`/`match-chime` (two rising notes), `roller-ding`,
  `firefly-catch`: cheerful and soft.
