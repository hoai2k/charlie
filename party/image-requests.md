# Charlie Party: image requests and sprite system brief

This brief is for the image agent, which has image-generation tools and repo
access. It covers every image Charlie Party wants: NPC canonical references,
character pose sprites, expression portraits, backgrounds, thumbnails, the
logo and props. It also documents the sprite system as it is implemented today
in `src/engine/sprites.js`, and invites you to improve it.

**Nothing here is required for the game to run.** The game is fully playable
with the 16 base images in `assets/characters/`, which it animates with
procedural motion and vector emotes. Each asset you add replaces a fallback
for that asset only. Partial work is fine, so ship in phases.

Read these first, then come back:

| File | Why |
| --- | --- |
| `PLAN.md` | Game flow, roster, NPCs, and the 20 minigames with their actions |
| `reference/CHARACTERS.md` | Identity rules for every character, plus companion rules and Troll notes |
| `reference/canonical/*.webp` | **The** identity references. Every generation uses one as an input image |
| `reference/canonical/generation-manifest.json` (+ `group-`, `troll-`) | The exact style language that produced the approved art |
| `src/engine/sprites.js` | Sprite loader, the `POSES` vocabulary, `Actor` and portraits |
| `src/data/characters.js` | Roster, members, on-screen heights `h`, `face`, `top`, `facing`, `motion` |
| `src/engine/art.js` | Loader for backgrounds, thumbnails, props, icons and the logo |
| `src/scenes/spriteviewer.js`, `tools/shot.mjs` | How you test before committing |

All paths in this document are relative to `party/` unless they start with
`/` or the repo root `charlie/`.

---


> **Start here (current round): [Round 3](#round-3--lessons-from-the-felicity-pilot-and-next-requests)**
> at the end of this document. It records what the Felicity + Fellowfox
> pilot taught us and lists the next requests in priority order.

## 1. Purpose, audience and phases

Charlie is a 2nd-grade girl, and the characters are hers. The game is a couch
party game for kids aged about 5 to 10 on a TV with Xbox controllers.
Success looks like this: her characters look like *her* characters in every
frame, and they are bursting with personality. They jump for joy when they
win, and they pout dramatically (arms crossed, lip out, stomping a foot) when
they lose.

### Phases and gates

| Phase | Deliverable | Gate / dependency |
| --- | --- | --- |
| **A** | NPC canonicals: Glimmer, Shadow Imp (+ variants), Professor Hoot, Garden Fairy (+ colors), Grumpy Broccoli, Storm Cloud (§8) | **Stop and get the user's explicit approval** of each design before making any sprites, thumbnails or props that show it. Phase B can run while you wait. |
| **B** | Pilot first: **Felicity + Fellowfox** end to end (Tier-1 poses + 5 portraits), tested in the sprite viewer. Then Tier-1 poses + 5 portraits for the remaining 13 roster members | Commit per character or per small batch once it passes §6 |
| **C** | Tier-2 and Tier-3 poses for all 15 roster members, including the proposed new poses (§4.3) | If you add poses to `POSES`, do it in the same commit as the frames (§5) |
| **D** | `ui/logo`, title/menu/results backdrops, `bg/<game>` ×20, `thumb/<game>` ×20, props (§9) | Thumbnails that show an NPC wait for that NPC's Phase A approval |
| **E** | Troll sprites, plus sprites for every **approved** NPC | Troll's canonical is already approved, so Troll can start any time. Other NPCs wait for Phase A |

Priority inside a phase: party games before studio games, and anything the
results/character-select screens show (idle, wave, ready, celebrate, pout,
portraits) before anything else.

---

## 2. Art direction

### 2.1 House style (from the approved canonical manifests, reuse verbatim)

> Bold smooth dark navy outlines, rounded appealing shapes, expressive eyes,
> bright original colors, simple clean cel shading, no photorealism, no 3D.
> One single full-body character, centered and entirely visible with generous
> margin. Transparent background, no scenery, no floating decorations, no
> text, no watermark, no other characters. Preserve distinctive colors,
> clothing, anatomy, and motifs from the reference.

Sprite-specific additions:

- **No baked-in effects.** Leave out ground shadows, motion lines, dust,
  sparkles, sweat drops, stars, tears, hearts, glow and halos. The engine
  draws the shadow ellipse, particles and emotes, and baked effects double up
  or get stuck to the sprite when it flips. Exceptions: tears or a blush that
  are *part of the face* in sad/pout frames are fine, and so are Bronze's eye
  graphics and the cake's candle flame.
- **Same outline weight and shading at every size.** Generate large, then
  downsample (§5.3) so the outline stays crisp.
- **Same palette in every frame.** Check hex colors of key areas against the
  canonical (hair, outfit and fur). Image models drift toward more saturated
  or more pastel colors over a batch.
- **Kid-safe.** Use cartoon violence only (bonks, dizzy stars, soot puffs).
  Nothing scary, and nobody is ever hurt for real. Imps are banished in a
  puff of glitter. They do not die.

### 2.2 Identity preservation (non-negotiable)

Always pass the character's canonical image as input image 1 with the words
"reproduce this exact character". Never generate a roster character from text
alone. Per-character "must keep" lists:

| Asset | Must keep in every frame | Watch out for |
| --- | --- | --- |
| `felicity` | Orange fox face, cream muzzle, huge teal eyes, brown bangs, two long brown pigtails with yellow ties, white daisy by ear, orange/black dress with white collar flower and purple skirt flowers, orange shoes, big white-tipped tail | Pigtails turning into one ponytail; daisy disappearing |
| `fellowfox` | Tiny, round, orange; huge dark eyes; cream muzzle/chest; dark paws and ear tips; black flower by one ear; bushy white-tipped tail | Becoming the slender `fox`; losing the flower |
| `kpop-girl-left` | Light skin, brown side bun, light-blue sleeveless top with navy collar, wide dark-blue trousers, pale shoes | Bun moving or doubling; trousers becoming jeans |
| `kpop-girl-center` | Tan skin, purple hair braided at the sides, red drop earrings, orange jacket with charcoal trim and geometric badge, orange/gold paneled skirt, tall purple boots | Badge growing text; jacket losing trim |
| `kpop-girl-right` | Light skin, very long coral hair, navy tee with pink/purple abstract graphic, golden skirt with brown panels, tall navy boots with pink knee accents | Hair turning red (that is Marina's) |
| `bronze` | Green-rimmed gray dome, **one** big eye (black with orange/blue ring), purple antenna with violet jewel, bent gray pipe on one side, gray cylinder body with purple panel and green button, mismatched legs, orange-rimmed purple shoes. **No arms, no mouth** | Getting a second eye, arms or a mouth |
| `cotton-candy` | White pony, blue eye, small yellow crown with blue accents, very long pink/lavender/sky-blue ribbon mane and tail, yellow flower on flank. **No horn** | Gaining a horn and becoming a unicorn |
| `fox` | Slender orange fox, big upright white-tipped tail, white socks, white muzzle and chest, black ear tips with pink inner ears, little red tongue | Merging with Fellowfox; gaining a flower |
| `hotdog` | Low fluffy body; rainbow stripes in order pink, orange, yellow, lime, blue, lavender; huge gray ears edged navy; navy face mask; red forehead heart; tall red/orange/yellow flame tuft; tiny navy paws; long striped tail | Becoming a food hot dog; shuffled stripes |
| `marina` | Long red hair, teal eyes, gold crown with purple jewels, purple shell top, teal scaled tail with purple bands, big purple fins. **No legs** | Swapping colors with Scale |
| `scale` | Blonde hair, gold crown with teal fin flourishes, flared dark-green layered top with blue flowers and a red dotted edge, red tail with blue crisscross lattice, teal fins. **No legs** | Swapping colors with Marina; dropping the lattice |
| `marshmallow-birthday-cake` | Pink domed tiered cake, white marshmallow rows, pink frosting band, multicolor sprinkles, big black lash eyes and a smile on the front, tiny candle with red/yellow flame. **No arms or legs, ever** | Models love adding arms. Say "no limbs" twice |
| `princess-amber` | Long copper/auburn hair, amber star/flower crown, floor-length orange gown, black sleeves/bodice accents, white star/flower motifs outlined in black | Gown changing color; stars floating off the dress |
| `snowstar` | **Enormous** round face with huge blue/green eyes with tiny flower highlights, patchwork multicolor bangs, rainbow side curls, bow and floral ornaments, green turtleneck sweater, dark teal pants, green boots | Head shrinking to normal proportions |
| `unicorn` | White horse silhouette, one long pale horn, flowing white mane/tail with lavender shading, serene closed-lash eye. **No wings, no crown** | Wings; rainbow mane; open eye in calm poses |
| `troll` | Olive green/gray spotted skin, dark shoulder-length hair, heavy brow, amber eyes, broad nose, lower fangs, huge shoulders and hands, pot belly, long arms, bare feet, ragged brown loincloth. Hunched. **No horns or weapon** | Becoming scary; getting a club |

### 2.3 Expressiveness: big, readable, fun

At gameplay size a character is only 124–186 px tall on a 1080p TV, and kids
read **silhouette first, face second**. So:

- **Push the poses.** Arms way up, whole body leaning, big tail and hair
  swings. If a pose reads the same as idle in silhouette, it isn't done yet.
- **Faces are at least 2× more exaggerated than feels natural.** Use a huge
  open grin, eyes squeezed into happy arcs (^ ^), a giant pout lip, saucer
  eyes.
- **Celebrate (win) must feel like pure joy.** Leap with both arms up, legs
  kicked, eyes closed in a grin, hair and tail flying. Kids should want to
  win just to see it.
- **Pout (lose) must be funny-sad, not sad-sad.** Arms crossed tight, bottom
  lip stuck way out, brows angled, head turned away with a "hmph", shoulders
  slumped, and one foot stomping (alternate a stomp frame with a slumped
  frame). It is a tantrum a kid recognizes and laughs at. The engine adds the
  little rain cloud.
- **Personality through the whole body** (§4.4): Fox is springy, Unicorn is
  graceful, Hotdog is floppy, Bronze is clunky, Snowstar is all face.

---

## 3. The sprite system (as implemented in `src/engine/sprites.js`)

### 3.1 How the game uses it

Minigames never touch images. They create an `Actor` for a party entry and
request **poses** by name:

```js
const a = new Actor('felicity');      // party entry id (or 'troll')
a.x = 400; a.y = 800;                 // the FOOT point, logical px on a 1920x1080 canvas
a.facing = -1;                        // 1 right, -1 left (the engine mirrors)
a.setPose('walk');                    // looping pose
a.playOnce('throw', 0.35);            // one-shot for 0.35 s, then back to the previous pose
a.squash(0.25); a.flash('#fff'); a.emote('heart');
a.attach((g, info) => drawCrown(g, info.head.x, info.head.y));  // props ride the pose
```

The Actor draws in one of two modes for each pose:

1. **Sprite mode.** The set has the pose (or a fallback pose, §3.5), so the
   engine plays those frames. It adds procedural motion (hop, tilt, squash)
   on top, scaled by the pose's `motion` weight (0..1).
2. **Base-art mode.** There is no sprite set or no usable pose, so the engine
   draws `assets/characters/<asset>.webp` with full procedural motion. It
   adds **fallback emotes** that stand in for facial expressions: a star on
   cheer, a tear on sad, `!` on surprised, `?` on think, and so on.

`?nosprites=1` (or the **A** button in the sprite viewer) forces base-art mode
so you can compare.

### 3.2 File layout

```
assets/sprites/index.json                 { "sets": ["felicity", "fellowfox", ...] }
assets/sprites/<asset>/sprites.json       the set manifest (below)
assets/sprites/<asset>/*.webp             frames, strips or atlases, and portraits
```

- `index.json` lists **asset ids** (member assets such as `kpop-girl-center`),
  not party entry ids (`kpop-girls`). **A set that is not listed in
  `index.json` is never loaded.** The index exists to avoid 404 noise.
- Every image path inside `sprites.json` is relative to that set's folder.
- `sprites.json` is fetched with `cache: 'no-cache'`, but images are not.
  GitHub Pages caches for about 10 minutes, so after regenerating a frame you
  may see the old one briefly. You can give regenerated files new names to
  avoid this.

### 3.3 `sprites.json` fields (every field the loader reads)

```jsonc
{
  "frameSize": [400, 440],     // informational only (the loader ignores it); handy for tools and humans
  "anchor": [200, 424],        // default FOOT point in frame pixels (x, y): ground contact, horizontally centered on the body
  "bodyHeight": 320,           // frame pixels that map to the member's on-screen height h (see below)
  "facing": 1,                 // which way the ART looks: 1 right, -1 left, 0 front
  "atlas": "atlas.webp",       // optional single atlas; frames given as [x,y,w,h] rects come from it
  "poses": {
    "idle": {
      "frames": [ ... ],       // see frame forms below
      "fps": 6,                // default 8
      "loop": true,            // default: POSES[name].loop, else true (custom pose names default to LOOPING)
      "motion": 0.3,           // procedural overlay weight 0..1, default 0.25
      "anchor": [200, 424],    // optional per-pose default anchor
      "head": [212, 96],       // optional per-pose head point (top of head, where a hat sits)
      "hand": [262, 236],      // optional per-pose hand point (grip of the forward hand)
      "bodyHeight": 320,       // optional per-pose override (avoid; keep one scale per set)
      "holdLast": true,        // false returns to idle after a non-looping clip ends
      "facing": 1              // optional per-pose override of the set facing
    },
    "run": "walk",                                   // alias (string form)
    "wave": { "alias": "cheer", "fps": 6, "loop": true, "motion": 0.5 }   // alias with overrides
  },
  "portraits": {
    "neutral": "portrait-neutral.webp", "happy": "portrait-happy.webp", "sad": "portrait-sad.webp",
    "surprised": "portrait-surprised.webp", "determined": "portrait-determined.webp"
  }
}
```

**Frame forms** (you can mix them in one pose):

| Form | Meaning |
| --- | --- |
| `"walk-0.webp"` | A whole image file is one frame. Uses the pose or set `anchor` |
| `[x, y, w, h]` | A rect inside the set `atlas` |
| `{ "src": "walk.webp", "rect": [x,y,w,h], "anchor": [ax,ay], "dur": 0.12, "head": [hx,hy], "hand": [px,py] }` | Object form. `src` with no `rect` is a whole file. `src` with `rect` is a rect in **that** file, which lets you use **per-pose strips** with no global atlas. `rect` with no `src` uses the atlas. `dur` (seconds) overrides fps for that frame. When any frame has `dur`, frames without one use `1/fps` |

**Coordinates.** `anchor`, `head` and `hand` are **frame-local pixels**:
(0, 0) is the top-left of the frame's own rect, not of the atlas.

**Scale.** The engine computes `pxScale = h × actorScale / bodyHeight`, where
`h` is the member's `h` in `characters.js`. In base-art mode the whole base
image height maps to `h`, and the base images are alpha-cropped neutral poses,
so `bodyHeight` should equal **the height in frame pixels of the
idle/neutral figure, from the lowest foot pixel to the highest pixel** (ear
tip, antenna jewel, crown point, candle flame). Measure it exactly the way the
base art is cropped. Then toggling sprites ↔ base art in the viewer shows
**no size jump**. Keep `bodyHeight` the same for every pose. Poses that reach
higher (arms up, jumping) simply extend above it.

**Anchor.** In base-art mode the anchor is the bottom-center of the cropped
base image. Match that: `anchor.x` is the horizontal center of the body's
ground contact (between the feet for bipeds, between the front and back hooves
for quadrupeds, under the tail curl for mermaids, center of the base for the
cake), and `anchor.y` is the ground line. **Every frame of every pose must put
the ground contact on the same anchor**, or the character visibly jitters.
For airborne frames, see §5.3.

**Facing.** The engine works in *forward space*: +x is the direction the actor
faces. If `facing` is `-1` the art is pre-mirrored. Otherwise it is drawn as
is when facing right and mirrored when facing left. **Recommendation: draw
every pose of every set in three-quarter view looking toward screen-right and
set `"facing": 1`.** Then `hand` is simply the hand on the right side of the
image. Asymmetric details (Bronze's pipe, the left KPop girl's bun, Snowstar's
bow) mirror when the character walks left. The base art already does this, so
it is accepted.

**Aliases** copy another pose's frames with optional `fps`/`loop`/`motion`
overrides. Aliases may point to other aliases, in any manifest order. Missing targets and
cycles are rejected. The alias uses the named pose's loop default when available.
Explicit per-frame `dur` remains authoritative over an alias fps override.

**Custom pose names.** Any name in `poses` is loaded, even if it is not in
`POSES`. A game can request it and it plays. It has no fallback chain or
procedural motion until it is added to `POSES`, and it **loops unless you set
`"loop": false`**.

### 3.4 Procedural overlay and the `motion` weight

With a sprite pose active, the engine still adds the pose's procedural motion
(hop height, lean, squash) multiplied by `motion`. The procedural values are
in `procedural()` in `sprites.js`. Rules of thumb:

| Your frames… | `motion` |
| --- | --- |
| …are a single key pose (one frame) that should still hop, sway or squash | `0.8–1.0` |
| …animate limbs/face but stay planted (idle, wave, think, pout, paint) | `0.2–0.4` |
| …already contain the vertical motion (a jump arc drawn in the frames) | `0–0.15` |
| …are a walk/run cycle with drawn bob | `0.1–0.2` |

There are no procedural twirls: the engine never squashes a sprite through
zero width to fake a spin (it reads as a flat piece of paper turning). Any
spin or twirl in `celebrate`, `ready` or `pose-twirl` must be **drawn in the
frames** (front → three-quarter → back → three-quarter). Without frames,
those poses just hop.
Any `motion` weight is safe; choose it based on motion already in the artwork.

`playOnce(name)` uses the generated clip's duration when present (0.5 seconds
for base-art fallback). An explicit `playOnce(name, seconds)` fits the **whole**
clip to that duration, so quick actions do not skip their follow-through.
Follower one-shots begin at frame zero; looping poses keep their phase offsets.
Non-looping clips normally hold their last frame; `holdLast: false` switches
to idle. Frame durations must be positive finite seconds.

Other overlays that also apply in sprite mode: the blue "sad wash" tint on
pout/sad (at half strength), the red hit tint on hurt (half strength),
`squash()` springs, `flash()`, and the per-member phase offset for followers.

### 3.5 Pose fallbacks and partial sets

When a set lacks a requested pose, `resolvePose` walks the `fallback` chain in
`POSES` breadth-first (for example `pout → sad`, `carry → walk → run`). If the
chain finds nothing, it uses the set's `idle`. If the set has no idle either,
the member drops to base-art mode. **A partial set works.** You can ship
idle + walk + celebrate + pout today and everything else falls back.

Fallback poses keep at least 0.9 procedural motion so a partial set still
expresses the requested action. Fallback expression emotes are suppressed
only when the exact requested pose/alias exists, not merely because the
member has a sprite set. Authored aliases should be chosen for a compatible
expression. Missing images or invalid frames are skipped without breaking
base-art fallback.

`auto` emotes are always drawn, sprites or not: sparkles on celebrate, a rain
cloud on pout, circling dizzy stars, music notes on dance, and Zzz on sleep.
Don't draw those into the frames.

### 3.6 Attachments and anchor points (why per-frame `head`/`hand` matter)

Games draw props on characters with `actor.attach(fn)`. The callback receives
`info = { h, w, head, hand, eyes, neck, back (each {x,y}), headAngle, pose, facing, member }` in forward
space (origin at the feet, +x forward, −y up, screen px). Attachments ride all
the procedural motion and mirroring. They are used for:

| Game | Attachment | Point |
| --- | --- | --- |
| Crown Keeper | Big jeweled crown on the holder's head | `head` |
| Royal Fashion Show | Crowns, tiaras, hats, bows (and glasses, necklaces, capes, wings; see §5.5 for extra points) | `head`, `eyes`, `neck`, `back` |
| Pass the Present | Ticking present held overhead | `hand` (in `carry`: top of the raised hands) |
| Wizard Quick-Draw, Potion Class | Wand | `hand` |
| Potion Class | Spoon/ladle while stirring | `hand` |
| Party Marathon | Trophy held up | `hand` in `celebrate`/`carry` |
| Sprite viewer debug (**Y**) | Test crown on `head`, blue dot on `hand` | both |

Without sprite data, `head` comes from the member's `face`/`top` fields
(computed for the base art) and `hand` is a guess (0.28 h forward, 0.5 h up).
Those guesses are wrong for any frame where the head moves. **Provide `head`
on every frame (or per pose when the head doesn't move), and `hand` on every
pose that could hold something** (idle, walk, run, carry, throw, action, push,
paint, celebrate, cheer, plus the new cast, eat and ride). Definitions:

- `head` is the **top-center of the skull**, where a hat brim would rest. Do
  not use the tip of tall hair, ears, an antenna or an existing crown. For
  characters that already wear a crown (Cotton Candy, Marina, Scale, Amber),
  use the top of the existing crown so new crowns stack on it.
- `hand` is the **grip point of the forward hand** (the image's right side
  when `facing: 1`). In `carry`, it is the point **between both raised
  hands** where the bottom-center of an overhead object rests. For
  characters without usable hands:

| Asset | What "hand" means |
| --- | --- |
| `bronze` | Tip of the bent pipe (it works as a gripper). Things can also "float magnetically" just in front of the panel. Don't invent arms |
| `cotton-candy`, `unicorn`, `fox`, `fellowfox` | The mouth (held in the teeth). For overhead `carry`, the middle of the back. The Unicorn's horn tip works as a wand for cast |
| `hotdog` | Between the tiny front paws, held up near the face |
| `marshmallow-birthday-cake` | Top of the cake beside the candle. Things balance on the cake |
| `marina`, `scale` | Normal hands |

### 3.7 Groups, followers and special anatomy

- **Members are independent sets.** The KPop Girls are three sets
  (`kpop-girl-center` leads, `-left` and `-right` follow with 0.10 s and
  0.14 s lag). Felicity brings `fellowfox` (0.18 s lag, a quarter her height,
  trotting behind). Every member plays the **same pose name** as the leader
  with a small phase offset. So **Fellowfox needs every pose too**, in pet
  form: Fellowfox's `celebrate` is happy zoomies, its `pout` is flopping down
  with its chin on its paws, its `throw` is a little pounce. Attachments
  default to the leader, so the crown goes on Felicity and on the center
  KPop girl.
- Make the trio's versions of each pose **coordinated but not identical**:
  same energy, different arm positions, as in the group reference.
- **Mermaids (`marina`, `scale`) glide.** Their motion style `glide` lifts
  them 10–16 px with a floating shadow, so the "foot" anchor is the lowest
  point of the tail curl. Walk/run is a forward lean with a tail undulation
  (2–4 frames), not steps. Jumps are a tail-flip leap. A pout can include a
  tail slap.
- **Birthday Cake has no limbs.** It expresses everything with face, candle
  and body: squash and stretch, lean, frosting droop, and the candle flame
  growing (happy) or shrinking to a wisp of smoke (sad). Walking is bouncing
  (`motion: bounce`). Many cake poses can be a single expressive frame with
  `motion: 1`.
- **Bronze has one eye and no mouth.** It emotes with the eye (iris size,
  eyelid "shutter" shapes, a happy ^ arc, spiral when dizzy, a big wobbly
  highlight when sad), with antenna droop or perk, jewel glow, pipe puffs and
  bouncy legs. Panel lights may change color with mood.
- **The quadrupeds (`cotton-candy`, `fox`, `fellowfox`, `unicorn`, `hotdog`)**
  express with ears, tail, head height and rearing or crouching.

### 3.8 Portraits

`drawPortrait(g, charId, x, y, r, { expr })` fills a circle with the entry's
color (or a given `bg`), then draws the portrait image scaled so that its
**shorter side equals the circle's diameter**, centered and clipped to the
circle. It then strokes a ring. A `gray` option desaturates eliminated
players. Expressions the code uses are `neutral`, `happy`, `sad`,
`surprised` and `determined`. A missing expression falls back to `neutral`,
and a missing portraits map falls back to a crop of the base art. **Group
entries use the leader's portraits**: `felicity` and `kpop-girl-center`. See
§7 for the deliverable.

---

## 4. The complete action list

### 4.1 Existing `POSES` (in code today)

Tier 1 is every screen and most games. Tier 2 is several games. Tier 3 is one
or two games. Frame counts are suggestions: use fewer frames plus procedural
motion where it reads well (§5.2).

| Pose | Loop | Fallback chain | What it is | Used by | Tier | Suggested frames / fps / motion | Read of the motion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `idle` | ✓ | — | Standing, breathing, blinking. Default | Everywhere: character select, how-to, results (non-podium), waiting in every game | 1 | 3–4 @ 5–6 fps (neutral, breathe-in, blink), motion 0.3 | Subtle; a character-specific fidget (ear twitch, tail swish, eye scan) |
| `walk` | ✓ | run | Normal movement (side view and top-down) | sprinkle-catch, bumper-bounce, cookie-crumble, paint-party, crown-keeper, troll-trouble, fashion-show runway, fairy-garden, pet-spa, viewer **X** | 1 | 4 @ 8–10 (contact, passing, contact, passing), motion 0.15. Quadrupeds can use 2–4; mermaids 3 tail-wave frames | Clear alternating legs; character gait (§4.4) |
| `run` | ✓ | walk | Fast, leaning forward | sprinkle-catch, troll-trouble (fleeing), paint-party, crown-keeper, bumper-bounce dash | 1 (alias of walk with higher fps is OK at first) | 4 @ 12, motion 0.15 | Strong forward lean, longer stride, hair and tail streaming back |
| `celebrate` | ✓ | cheer → dance | **Big** victory celebration (1st place, trophy) | Results podium, Party Marathon trophy, studio finales (art-studio gallery, cake-bakery, potion success), memory-match winner | **1 (hero pose)** | 4–6 @ 8 (crouch → leap with arms up → peak → land), motion ≤ 0.15 (or 1 with a single frame) | Anticipation (crouch), explosive leap, held joy at the peak; eyes ^ ^, mouth wide open |
| `cheer` | — | celebrate | Small happy fist-pump/hop (scored a point) | sprinkle-catch (golden cupcake), balloon-pump (pop), spotlight-dance (correct), fairy-count (exact), broomstick-dash (ring), paint-party, results 2nd/3rd, eliminated players cheering from the side | 1 | 3 @ 10 (dip, pump up, hold), motion 0.4. **Last frame is held** (it is a one-shot), so make it a nice "yes!" | Quick and punchy; reads in under 0.3 s |
| `pout` | ✓ | sad | Lost: crossed arms, lip out, slumped | Results last place, cookie-crumble out, fairy-count miss, lost rounds | **1 (hero pose)** | 4 @ 4–5 (slump → hmph head turn → **foot stomp** → slump), motion 0.3 | Funny tantrum; the stomp sells it. Engine adds the rain cloud |
| `sad` | ✓ | pout | Disappointed, teary (gentler than pout) | Results 2nd-to-last, a lost heart or round, wrong potion, Pass the Present soot | 2 | 2–3 @ 4, motion 0.3 | Droopy: head down, ears and tail low, wobbly-lip teary eyes (tears drawn on the face) |
| `hurt` | — | dizzy → surprised | Bonked/bumped; recoil | bumper-bounce, crown-keeper (bumped loose), spotlight-dance (miss), broomstick-dash (storm cloud), troll-trouble | 1 | 2–3 @ 12 (impact squash, recoil lean back, recover), motion 0.5 | Snappy: eyes squeezed shut, mouth "ow" |
| `dizzy` | ✓ | hurt | Stunned; stars circle (auto emote) | sprinkle-catch (broccoli, 1 s), pass-the-present (after the pop), troll-trouble (caught), wizard-quickdraw (fizzle) | 1 | 2–4 @ 6 (sway left, sway right), motion 0.4 | Spiral or X eyes, tongue out, wobbly knees. Bronze: spiral eye |
| `surprised` | — | hurt | Startled jump, eyes wide | pass-the-present (catching the present, the pop), balloon-pump (pop), troll-trouble (Troll notices you), potion silly fizz, memory-match mismatch | 1 | 2 @ 10 (jolt up with arms out, hold), motion 0.6 | Saucer eyes, O mouth, ears straight up, hair puffed |
| `think` | ✓ | idle | Pondering / waiting | wizard-quickdraw (waiting for the lantern), fairy-count (counting), memory-match (choosing), potion-class (reading the recipe) | 2 | 2–3 @ 3 (finger to chin, eyes up, tap), motion 0.3 | Clearly "hmm": head tilt, eyes to the side. **No `?` emote with sprites**, so the pose must say it |
| `wave` | ✓ | cheer | Friendly hello | Character select (joined/hovering), title, how-to | 1 | 3 @ 8 (hand left, center, right), motion 0.3 | Big open-palm wave, smile. Quadrupeds: raise a front paw/hoof, tail wag. Cake: lean side to side. Bronze: antenna wave and hop |
| `ready` | — | cheer → wave | Confident "I'm ready!" lock-in | Character select confirm, how-to (press A) | 1 | 2–3 @ 10 (quick spin or pose pop into a confident stance), motion ≤ 0.15 or 1 | Signature confident pose: thumbs up, hands on hips, wink, a trio formation pose |
| `jump` | — | fall → cheer | Takeoff and rising | cookie-crumble (hop a gap), broomstick-dash (rise), any hop | 2 | 2 @ 10 (crouch, launch), motion 0.15 | Anticipation crouch, then a stretched launch |
| `fall` | — | jump | Airborne/coming down, arms out | bumper-bounce (off the edge), cookie-crumble (dropping through), broomstick-dash (glide down) | 2 | 2 @ 8 (flail A, flail B), motion 0.2 | Arms windmilling, legs dangling, worried face |
| `land` | — | idle | Landing squash, recover | After every jump | 2 | 2 @ 12 (squash, recover), motion 0.3 | Knees bent, arms out for balance |
| `action` | — | cheer | Generic quick action: grab, tap, swing, pump | balloon-pump (**pump**), crown-keeper (grab), troll-trouble (pick up gem), memory-match (flip), fairy-garden (plant/water), pet-spa (scrub), cake-bakery (add layer) | 2 | 3 @ 14 (wind-up, strike, recover), motion 0.4 | Short and readable. For balloon pumping: both hands pushing down on a plunger |
| `throw` | — | action | Throwing forward | pass-the-present (toss), paint-party (splat bomb), wizard-quickdraw (cast, until `cast` exists), potion-class (add ingredient) | 2 | 3 @ 14 (arm back, release, follow-through), motion 0.3 | Big wind-up, clear release frame |
| `push` | — | action | Shove/bump forward | crown-keeper (bump) | 2 | 2–3 @ 14 (brace, shove with both hands/shoulder), motion 0.4 | Whole body leans in; determined face |
| `carry` | ✓ | walk | Walking while holding something **overhead** | pass-the-present (holding the present), trophy walk, fairy-garden (carrying a seed or can) | 2 | 4 @ 8 (walk cycle with both arms up), motion 0.15; `hand` = top of the hands | Arms locked up, careful steps. Quadrupeds: object on the back, cake: on top |
| `dance` | ✓ | celebrate | Dancing on the beat | spotlight-dance, pop-star-stage, fashion-show crowd, title screen | 2 | 4–8 frames, cycle = **exactly 2 beats at 120 bpm (1.0 s)**: 4 @ 4 fps or 8 @ 8 fps, motion ≤ 0.15 | Groovy and bouncy, distinct per character; the trio is coordinated |
| `paint` | ✓ | action | Painting/crafting with a brush (loop) | art-studio, potion-class (stir, until `stir` exists), pet-spa (brushing), cake-bakery (frosting) | 3 | 3 @ 6 (brush up, across, down), motion 0.3 | Focused tongue-out concentration |
| `sleep` | ✓ | idle | Sleeping (auto Zzz) | Troll naps (required for Troll); fairy-garden night finale (optional for the roster) | 3 (Troll: 1) | 2 @ 2 (breathe in/out), motion 0.3 | Curled up, eyes closed, a drool bubble for the Troll |

### 4.2 Screen and game usage summary

| Screen / game (id) | Poses it needs |
| --- | --- |
| Title / character select | idle, wave, ready, dance (title), portraits (all five) |
| How-to-play | idle, ready, wave; Glimmer (§8) |
| Results / podium | celebrate (1st), cheer (2nd/3rd), sad, pout (last), portraits happy/sad |
| Party Marathon trophy | celebrate holding the trophy (`hand`), clap (proposed) for others |
| `sprinkle-catch` | walk, run, cheer, dizzy, celebrate, pout |
| `bumper-bounce` | walk, hip-bump, knockback, hurt, fall, clap/cheer (cheering from a cloud after falling out) |
| `pass-the-present` | idle, carry, throw, surprised, dizzy, sad |
| `balloon-pump` | action (pump), surprised, cheer, pout |
| `troll-trouble` | run, walk, action (grab gem), surprised, dizzy, hurt; Troll set |
| `spotlight-dance` | dance, dance-up/down/side/star (proposed), cheer, hurt; Shadow Imps |
| `wizard-quickdraw` | think, cast (proposed; else throw), dizzy, cheer; Professor Hoot |
| `cookie-crumble` | walk, jump, fall, land, pout |
| `paint-party` | walk, run, throw, cheer |
| `broomstick-dash` | ride (proposed; else jump/fall), hurt, cheer |
| `fairy-count` | think, cheer, pout; Garden Fairies; Glimmer |
| `crown-keeper` | run, walk, carry-ish (crown on `head`), push, hurt |
| `fashion-show` | walk (runway), strike1–3 (proposed), bow (proposed), clap, celebrate; head/eyes/neck/back points |
| `art-studio` | paint, celebrate |
| `cake-bakery` | action, paint, eat (proposed), celebrate (hearts) |
| `pet-spa` | idle, happy celebrate, eat, shake (proposed), sad (when soggy) for pets; action/paint for helpers |
| `pop-star-stage` | dance, dance-star, cheer, celebrate; Shadow Imps |
| `fairy-garden` | action (plant/water), carry, cast, celebrate, sleep (night, optional); Glimmer, Garden Fairies |
| `potion-class` | think, throw (add ingredient), stir/paint, cast, surprised, celebrate; Professor Hoot |
| `memory-match` | think, action (flip), cheer, celebrate, pout |

### 4.3 Proposed new poses

**These are now in `POSES`** (with the fallbacks below and procedural motion
for base art), as are the NPC poses from §8 (talk, present, point, laugh,
poof, hoot, lantern, windup, slam, grab, exit). Games may request them today;
your frames upgrade them. If you invent further poses, add them to `POSES`
(desc, loop, fallback, optional `proc` motion) in the same commit as their
frames.

| Pose | Loop | Fallback | Description | Games | Frames |
| --- | --- | --- | --- | --- | --- |
| `cast` | — | throw → action | Wand/spell thrust forward (wand in `hand`) | wizard-quickdraw, potion-class, fairy-garden | 3 @ 14: draw back, thrust, hold |
| `clap` | ✓ | wave → cheer | Spectator clapping/cheering (a looping cheer) | Eliminated players, fashion-show audience, results, marathon | 2–3 @ 8 |
| `eat` | — | action | Taste/munch with happy cheeks | cake-bakery (tasting), pet-spa (treat) | 3 @ 8: bite, chew, yum |
| `ride` | ✓ | fall → jump | Riding a broom: seated, leaning forward, hair streaming (the broom is a prop drawn `behind` at the feet) | broomstick-dash | 2 @ 6. Quadrupeds lie along the broom; mermaids sit sidesaddle; cake perches on it |
| `bow` | — | wave | Bow or curtsy | fashion-show finale, results, studio showcase | 2–3 @ 8 |
| `strike1`, `strike2`, `strike3` | — | ready → cheer | Three distinct runway/photo poses (hand on hip, peace sign by the face, arms-up star) | fashion-show (A to pose), pop-star-stage finale, snapshot | 1 key frame each, motion 1 |
| `dance-up` | — | dance | Arms straight up | spotlight-dance (also performed by imps), pop-star-stage hits | 1–2 |
| `dance-down` | — | dance | Crouch, hands on knees | same | 1–2 |
| `dance-side` | — | dance | Point and lean to the forward side; the game sets `facing` for left/right | same | 1–2 |
| `dance-star` | — | celebrate | The **A** move: jump into a star shape | same | 1–2 |
| `shake` | — | dizzy | Wet-dog shake (pets after a bath) | pet-spa | 3 @ 14 |
| `stir` | ✓ | paint | Stirring a cauldron with a big spoon (`hand`) | potion-class | 3 @ 6 |

NPC-only poses are listed with each NPC in §8.

### 4.4 Per-character flavor

Use these personalities (the suggestions in `CHARACTERS.md`) to make the
same pose feel different for each character.

| Asset | Idle fidget | Walk feel | Celebrate | Pout / sad |
| --- | --- | --- | --- | --- |
| `felicity` | Glances down at Fellowfox, ear twitch, tail swish | Lively skip, pigtails bounce | Leaps with arms wide, pigtails and tail flying, huge grin | Arms crossed, ears flat, tail drooping, lip out, stomps a shoe |
| `fellowfox` | Head tilt, tail wag, looks up at Felicity | Tiny quick steps | Zoomies: spins chasing its tail, pounce-hop | Flops down, chin on paws, ears back, big wet eyes |
| `kpop-girl-center` | Snaps fingers to a beat, weight shift | Crisp confident strut | Sharp idol victory pose: point to the sky, jump, finger-heart | Hands on hips, head turned away "hmph", foot tap |
| `kpop-girl-left` | Easy sway, hands in her wide-trouser pockets | Relaxed broad steps | Both arms up swaying side to side, laughing | Big shrug, slumped shoulders, kicks the floor |
| `kpop-girl-right` | Tucks her long hair, sways | Bouncy steps, hair streaming | Spin with a hair flip, jump, hands clasped | Arms crossed, hair flopped over her face, lip out |
| `bronze` | Eye scans side to side, iris pulses, antenna jewel blinks | Clunky uneven bounce (mismatched legs) | Spring-hops, antenna jewel flashing, happy ^ eye, pipe puffs little celebratory clouds | Eye half-lidded and drooping, antenna limp, pipe puffs a sad gray cloud, one shoe stomps clank |
| `cotton-candy` | Mane sway, ear flick, tail swish | Light graceful trot | Rears up prancing, mane swirling in ribbons | Head low, mane over one eye, stamps a hoof, turns away |
| `fox` | Ears perk, tail wag, tongue out | Springy strides | Pounce-jumps in a circle, tongue out | Sits, ears flat, tail wrapped around itself, looks away |
| `hotdog` | Ear flops, tail curls | Squat hops | Huge squat-hops, ears flapping like wings, flame tuft flares tall | Flattens like a pancake, ears droop over its eyes, lip out |
| `marina` | Tail sway, hair drifts | Glide with a tail undulation | Tail flip into the air, arms up, hair fanning | Arms crossed, tail curled under, hair flopped, a tail slap |
| `scale` | Gentle tail curl, adjusts her crown | Poised glide | Graceful twirl, hands clasped to her chest | Chin up and turned away, arms crossed, prim fin slap |
| `marshmallow-birthday-cake` | Breathing jiggle, candle flicker, blink | Bounce (squash on land) | Big squash-and-stretch bounces, candle flame grows big, eyes ^ ^ | Frosting sags, candle shrinks to a smoking wisp, lip out, teary eyes |
| `princess-amber` | Gentle sway, smooths her gown | Graceful glide-walk | Twirl with the gown flaring, hands up | Polite pout, arms crossed, little foot stamp under the gown hem |
| `snowstar` | Big head tilt, slow giant blinks | Small steps under a big wobbling head | Giant face grin, jumps with both arms up, curls bouncing | Huge teary eyes, wobbling lip, arms crossed |
| `unicorn` | Tail swish, head bob, serene closed eye | Elegant trot | Graceful rear, mane flowing (sparkles come from the engine) | Head bowed low, turns away; gentle and dignified even when sad |
| `troll` | Belly breathing, scratches his head, grumpy blink | Heavy stomp | (Rare) grumpy-happy belly laugh | Sulky arms crossed, lower lip over his fangs |

---

## 5. Building sprites, and how to improve the system

### 5.1 You own the method

You know image generation better than this document does. Above is **what**
must be represented. **How** (strips or single key poses, frame counts,
layered parts, overlays) is your call. You may extend `src/engine/sprites.js`
(for example part-based rigs, blink/mouth/eye overlays, extra anchor points,
per-pose facing) **as long as**:

1. The public Actor API keeps working unchanged: `setPose`, `playOnce`,
   `squash`, `flash`, `emote`, `attach`/`detach`, `anchor`, `draw`,
   `moveAnim`, `snap`, `update`, plus `drawPortrait` and `POSES`/`POSE_NAMES`.
2. Characters without sprites still fall back to base art.
3. Existing `sprites.json` forms keep loading (new fields are additive).
4. You **update §3 of this document** whenever you change the format, so it
   remains the spec.

### 5.2 Generation techniques that work

- **Same reference every time.** Input image 1 is always the canonical. Once
  a set's idle frame is approved, pass it as input image 2 ("match this
  scale, camera and rendering") for every other pose of that set.
- **Edit rather than redraw.** For expression variants (portraits, face-only
  changes) and small pose changes, use image editing on the canonical or on
  the idle frame ("change only the face to…", "raise only the right arm…").
  Identity holds far better than with fresh generations.
- **Short strips, not big grids.** One image with 2–4 frames of the same pose
  side by side keeps the frames consistent with each other, and models handle
  that well. Large grids (4×4) drift, merge figures and miscount. If a strip
  drifts, generate single key poses instead.
- **Fixed camera.** Use the same square canvas (1024×1024 or the model's
  largest), a full body with margin, three-quarter view facing screen-right,
  and "feet resting on the same invisible ground line near the bottom" in
  every call.
- **Fewer key frames plus procedural motion beat many weak frames.** Two
  strong frames for walk plus `motion 0.15` look better than six wobbly ones.
  The cake, the mermaids' glide and the quadrupeds' trots lean on procedure.
  Spend frames on faces and silhouettes. Leave bobbing and squash to the
  engine.
- **Quadruped walk cycles are hard for models.** Use a 2–4 frame trot
  (extended / gathered) and let `motion` do the bounce.
- **Transparent background.** Prefer native transparency. If you must key,
  pick a flat color the character doesn't contain: **magenta `#FF00FF`** for
  greens (Bronze, Snowstar, Scale, Troll, Marina's tail) and **pure green
  `#00FF00`** for pinks and whites (Cotton Candy, Cake, Unicorn, Amber,
  KPop-right). Never white (Unicorn and Cotton Candy are white).
- **Layered parts (optional).** If you judge a rig works better for a
  character (for example the cake: one body plus face overlays and candle
  states; Bronze: body plus eye states; Snowstar: head plus body), you may add
  a part/overlay system (§5.1). A cheap high-value variant is a **blink/face
  overlay**: idle frames stay static and the engine swaps eye/mouth layers
  for blinks and expressions.

### 5.3 Post-processing pipeline (Pillow)

Write a reusable script (for example `tools/sprites/build.py`) driven by a
per-asset config, and commit it. Do **not** commit the large generation
masters (keep them outside the repo or gitignored). Steps:

1. **Cut out**: native alpha, or chroma key plus 1 px edge erosion. Then
   **defringe**: remove halo pixels whose color is close to the key or glow,
   and zero any alpha < 8. Drop specks smaller than about 30 px that aren't
   connected to the body, but keep detached bits that belong (hair
   ornaments, the candle flame), so merge components after a small dilation.
2. **Split strips** into frames with connected components on alpha (after
   dilation) or with equal cells. Check the frame count.
3. **Scale-normalize.** Downsample with LANCZOS so the idle figure height
   equals `bodyHeight`. Scale other poses by a stable measure, not their bbox
   (arms-up frames are taller): the same generation scale, head width, or
   foot-line-to-eye-line distance. **Verify with an onion-skin**: composite
   each frame over the idle frame at 40 % opacity into a contact sheet and
   look at it (the Read tool shows images).
4. **Anchor.** The ground point is the lowest opaque row of the contact area,
   and x is the center of the opaque pixels in the bottom ~4 % rows (between
   the feet). For airborne frames (jump peak, celebrate leap, fall), keep the
   **body** where it would be in the take-off frame (align hips or torso x
   with idle) and let the figure sit *above* the anchor inside the frame. The
   shadow stays on the ground. Lower `motion` accordingly so the leap isn't
   doubled.
5. **Place** on a common canvas (`frameSize`) with the anchor at the same
   pixel for every frame. Optionally **trim and pack** into strips or an
   atlas and write per-frame `anchor` = common anchor − crop offset. This
   saves a lot of memory.
6. **Points.** Write `head` and `hand` per frame. Auto-detection plus manual
   correction works well. Re-check them in the viewer with **Y**.
7. **Save** with `img.save(path, 'WEBP', quality=86, method=6)`. Per the repo
   convention (quality 82–90, method 6), alpha stays lossless because
   Pillow's default `alpha_quality=100`. Atlas or strip sheets should be at
   most **2048×2048** (iPad decode memory).
8. **Generate `sprites.json`** from the script, and add the asset to
   `assets/sprites/index.json`.

### 5.4 Resolution and budgets

The canvas is 1920×1080 logical and the backing store tops out at 2× (4K TVs).

| Member | `h` (px) | Suggested `bodyHeight` (~1.8×h) |
| --- | --- | --- |
| felicity | 178 | 320 |
| fellowfox | 72 | 150 |
| kpop-girl-center / left / right | 158 / 154 / 156 | 285 / 280 / 280 |
| bronze | 176 | 320 |
| cotton-candy | 172 | 310 |
| fox | 142 | 260 |
| hotdog | 124 | 230 |
| marina, scale | 178 | 320 |
| marshmallow-birthday-cake | 140 | 260 |
| princess-amber | 184 | 330 |
| snowstar | 172 | 310 |
| unicorn | 186 | 335 |
| troll | 270 | 440 |
| glimmer (shown large on how-to) | ~110 | 360 |
| shadow-imp | ~95 | 200 |
| professor-hoot | ~200 | 360 |
| garden-fairy | ~50 | 120 |

Budgets: start with about 30–48 frames per roster member, expanding for the
requested actions and cycles. Aim for **≤ 1.5 MB of WebP per member including
portraits** and enforce **≤ 25 MiB decoded per member** (Round 3). Sets load
on demand for characters that appear, rather than all at boot. The original
25 MiB total download target is now a warning for the expanded roster.
iPads have limited decode memory, so prefer trimmed frames over large empty
canvases and inspect party-size memory usage when adding animation frames.

### 5.5 Recommended engine improvements (yours to make or to report)

Items 1–4 are **done** (the lead implemented them; documented here for
reference). Item 5 is now done too; item 6 remains optional:

1. **Fallback poses keep full expressiveness.** When `resolvePose` returns a
   pose other than the one requested, use `motion` 1.0 (or `max(motion,
   0.8)`). Decide `usingSprites` (which suppresses fallback emotes) per
   resolved pose, not per set.
2. **Twirl blend.** Done differently: the paper-style procedural twirl was
   removed entirely (only dance's instant left/right mirror remains), so
   spins come from drawn frames only.
3. **More attachment points** for the Fashion Show: `eyes` (glasses), `neck`
   (necklaces), and `back` (capes and wings, drawn `behind`), passed through
   `info` with sensible defaults derived from `head` when a frame lacks them.
   An optional `headAngle` lets hats tilt with the head.
4. **Proposed poses** (§4.3 and §8) added to `POSES` with fallbacks, so the
   viewer can show them and games can request them safely. The viewer cycles
   `POSE_NAMES`, so custom names are invisible there until they're added.
5. **Done:** per-pose `facing` override (for a front-facing celebrate in an
   otherwise right-facing set).
6. Optional lazy loading of sprite sets that only NPCs use, to cut boot time.

If you change engine JS, bump `?v=` on `src/main.js` in `party/index.html`.
Bump nothing else.

Reusable intake and validation are in `tools/sprites/README.md`. The viewer
also accepts `chars`, `debug=1`, `zoom` and frozen `time` query parameters.
Press **P** to pause and **.** to advance 1/12 second for foot/loop inspection.
Coverage labels distinguish authored poses, aliases and fallback art.

---

## 6. Test before committing

Run everything from the repo root (`charlie/`). `tools/shot.mjs` serves the
repo, loads `/party/<query>`, presses keys, saves screenshots and prints
console errors. Keyboard player 1: **Space** = A, **KeyL** = X, **KeyI** = Y,
**KeyZ** = LB, **KeyC** = RB. The arrow keys move between poses (left/right)
and zoom (up/down) in the viewer.

```bash
# every character in one pose, with the debug overlay (foot cross, target height line, test crown, hand dot)
node party/tools/shot.mjs "?scene=sprites&pose=celebrate" /tmp/celebrate.png --keys "KeyI"
# the same pose in base-art mode for comparison
node party/tools/shot.mjs "?scene=sprites&pose=celebrate&nosprites=1" /tmp/celebrate-base.png --keys "KeyI"
# animation over time (4 shots, 250 ms apart)
node party/tools/shot.mjs "?scene=sprites&pose=walk" /tmp/walk.png --keys "KeyL" --shots 4 --every 250
# a real minigame with CPUs
node party/tools/shot.mjs "?game=sprinkle-catch&auto=1&players=4&chars=felicity,kpop-girls,bronze,marina&skipintro=1" /tmp/g.png --wait 6000 --shots 3 --every 2000
```

### Sprite viewer checklist (`?scene=sprites`), for every pose of every new set

- [ ] **Scale**: press A to toggle sprites ↔ base art. There is no size jump,
      and the top of the idle figure touches the dashed target-height line
      (Y overlay).
- [ ] **Feet planted**: the ground contact stays on the pink foot cross in
      every frame (watch idle, walk, pout, the stomp frame, and land). No
      sliding or popping between frames.
- [ ] **Facing**: press X to walk both ways. The character faces its
      movement direction both ways, with no moonwalking. Followers
      (Fellowfox, the trio) trail and turn properly.
- [ ] **Head point**: press Y. The test crown sits on top of the head in
      every frame of every pose (including celebrate peaks, pout head-turns
      and bows) without floating or sinking into the hair.
- [ ] **Hand point**: the blue dot is in the forward hand (or the mouth,
      pipe tip or cake top, §3.6). In `carry` it is on top of the raised
      hands.
- [ ] **Reads at size**: at 1× zoom, every pose is identifiable from its
      silhouette, the face reads, and celebrate and pout are funny.
- [ ] **Loops** loop seamlessly. **One-shots** read within about 0.3 s and
      end on a good held frame.
- [ ] **No baked effects**, halos, fringe pixels or stray specks (check on
      both the light viewer background and a dark game background).
- [ ] **Portraits** (the row at the top cycles neutral/happy/sad): face
      centered, nothing important clipped by the circle.
- [ ] **Identity**: compare side by side with the canonical. Colors, details
      and proportions match (§2.2).

### In-game checks

Test in real minigames with `?game=<id>&auto=1` (all CPUs; add
`&players=8&chars=...` to force characters, `&speed=3` to run faster, and
`&skipintro=1` to skip the how-to). Game ids: `sprinkle-catch`,
`bumper-bounce`, `pass-the-present`, `balloon-pump`, `troll-trouble`,
`spotlight-dance`, `wizard-quickdraw`, `cookie-crumble`, `paint-party`,
`broomstick-dash`, `fairy-count`, `crown-keeper`, `fashion-show`,
`art-studio`, `cake-bakery`, `pet-spa`, `pop-star-stage`, `fairy-garden`,
`potion-class`, `memory-match`. **Some games may not exist yet** (they are
being written in parallel). Test the ones that load, and rely on the viewer
for the rest.

- [ ] There are no `Missing image …` or `Sprite set failed …` warnings in the
      console (shot.mjs prints them).
- [ ] Results screen: the winner's celebrate and the loser's pout look great
      together on the podium.
- [ ] Download size is within budget (`du -sh party/assets/sprites`).

### Commit

Follow the repo's `CLAUDE.md`: commit on `main` and `git push origin main`
when a batch passes. Commit the final WebP frames, `sprites.json`, the updated
`assets/sprites/index.json`, your build script, any engine changes, and
updates to this document. Don't commit generation masters or large PNGs.
Commit in small batches (one character or one asset type at a time) so a bad
batch is easy to revert.

---

## 7. Expression portraits (Phase B)

**What:** a square **head-and-shoulders bust** in five expressions for each
of the **15 roster member assets** (all three KPop girls, Felicity and
Fellowfox separately, and the rest). Make the Troll's in Phase E, and approved
NPCs' as they're approved. The game currently shows the leader's portraits
for group entries (`felicity`, `kpop-girl-center`), but generate all members
so future screens can use them. Memory Match card faces use portraits too.

**Format:** 384×384 WebP with a **transparent background**. The game paints
the circle with the entry's color (or the player's color) behind the image,
desaturates eliminated players, and reuses the same images on different
backgrounds, so a baked background would fight all of that. Fill the frame:
the bust's shoulders run off the bottom edge.

**Framing:** the image's square maps onto the circle's bounding square and is
clipped to the circle. Center the face horizontally, with the eyes at about
45 % height. Keep the whole face, the ears and the main head ornament
(crowns, daisy, bow, antenna jewel, horn base, candle) **inside the inscribed
circle with about 6 % margin**. Long hair, tails and big ears may run out.
Use a three-quarter view facing right, matching the sprites. For small or
wide characters (Fellowfox, Hotdog, Cake, the quadrupeds), crop to the face
and the top of the body.

**Expressions:**

| Key | Read |
| --- | --- |
| `neutral` | Friendly default, soft smile, eyes open (the Unicorn keeps her serene closed eye) |
| `happy` | Huge open grin, eyes ^ ^ or sparkling, cheeks up |
| `sad` | Brows up, wobbling pout lip, teary eyes (tears drawn on the face) |
| `surprised` | Saucer eyes, small O mouth, ears or hair up |
| `determined` | Focused brows, confident smirk, game face |

Character notes: Bronze uses eye shapes only (no mouth). The Cake's candle
flame is big for happy, a wisp for sad, and tall and flickering for
surprised. The Unicorn opens her eye only for surprised and determined.

**Files and manifest:** save them as
`assets/sprites/<asset>/portrait-<expr>.webp` and add them to the set's
`sprites.json`:

```json
"portraits": { "neutral": "portrait-neutral.webp", "happy": "portrait-happy.webp", "sad": "portrait-sad.webp",
               "surprised": "portrait-surprised.webp", "determined": "portrait-determined.webp" }
```

You may add extra expressions (for example `pout`, `dizzy`, `laugh`, `talk`).
They load automatically, and code can request them later.

**Method:** edit the canonical: crop it to a bust, then make one edit per
expression ("change only the facial expression to …"). Keep the hair and
ornaments pixel-consistent.

---

## 8. New NPCs: canonical reference FIRST, then sprites

**Rule:** every new NPC, bad guy or ambient creature gets **one canonical
reference image first**. It defines the character's look and personality. The
**user must approve** it before you generate any sprites, thumbnails or props
that show it.

**Workflow:**

1. Generate the canonical with the prompt below. Input image 1 is
   `reference/canonical/felicity.webp` as the style reference only.
2. Save it to `reference/canonical/<id>.webp` (lossless WebP with alpha,
   like the others).
3. Record the prompt in `reference/canonical/npc-generation-manifest.json`
   (same shape as `troll-generation-manifest.json`) with
   `"status": "Awaiting approval"`.
4. **Show the user the image and stop for that NPC.** Iterate on feedback.
   When they approve, set `"status": "User-approved"`, add a section to
   `reference/CHARACTERS.md` and a card to `reference/canonical/index.html`,
   and commit.
5. Make the base art: alpha-crop the canonical, resize so its **max dimension
   is 520 px**, and save it to `assets/characters/<id>.webp`.
6. Register the NPC in `src/data/characters.js` (a code change; coordinate
   with the lead or do it yourself). Add an entry shaped like `TROLL` and
   include it in `ALL_ENTRIES`, which preloads it and puts it in the sprite
   viewer:

```js
export const GLIMMER = {
  id: 'glimmer', name: 'Glimmer', color: '#7fe3d4', npc: true,
  members: [{ asset: 'glimmer', h: 110, face: [cx, cy, r], top: 0.9, facing: 0, motion: 'glide' }],
};
```

Member fields:

- `h`: on-screen height at scale 1, in logical px.
- `face`: `[cx, cy, r]`, the portrait crop of the base art as **fractions of
  the base image height**. `cx` is measured from the left edge, also as a
  fraction of the height.
- `top`: the top of the head (where a hat sits) as a fraction of `h` above
  the feet.
- `facing`: the way the base art looks (1 right, −1 left, 0 front).
- `motion`: `glide` for hoverers (Glimmer, imps, fairies), `hop` for the owl,
  or one of `walk`, `trot`, `bounce`, `clunk`, `stomp`.

7. Then make the NPC's sprite set exactly like a roster set (§3–§6), using
   custom pose names where listed and adding them to `POSES` (§5.5).

### 8.1 Glimmer, the fairy host (`glimmer`)

**Role:** the Mario-Party-style host. She presents every how-to screen, counts
down, announces results and hosts the fairy games. She is on screen a lot,
often large, so she needs the most polish of any NPC.

**Design:**
- A tiny fairy girl about a hand's height in-world.
- Warm light-brown skin, rosy cheeks, big sparkly violet eyes, a huge
  friendly smile.
- A bouncy chin-length **mint-to-teal bob** with two little gold star clips.
- A **pink-and-coral flower-petal dress** like an upside-down tulip, with a
  gold star belt buckle.
- Mint-and-white striped tights and tiny curly-toed gold slippers.
- Four **translucent iridescent wings** (aqua fading to lilac, navy-outlined,
  clearly readable on any background).
- She holds a **star wand that is also a microphone**: a gold star whose
  center is a mic grille, on a pink handle.
- She is deliberately **not** blonde, not in a green leaf dress, and not a
  copy of any famous fairy.

**Personality:** bubbly and encouraging game-show host, sing-song, cheers
for everyone, gasps dramatically at close finishes, and never mocks a loser
("So close! Everyone's a star!"). She is always hovering, never standing.

**Canonical prompt:**

```
Use case: stylized-concept. Asset type: canonical character reference for a children's party video game, not a sprite sheet. Input image 1: Felicity canonical STYLE reference only; match its linework, cel shading and charm, do not borrow her anatomy or costume. Consistent style: bold smooth dark navy outlines, rounded appealing shapes, expressive eyes, bright colors, simple clean cel shading, no photorealism, no 3D. Subject: Glimmer, an original tiny fairy girl who hosts the party games like a cheerful game-show presenter. Warm light-brown skin, rosy cheeks, big sparkly violet eyes, huge friendly open smile. Bouncy chin-length mint-to-teal bob haircut with two small gold star hair clips. Pink and coral flower-petal dress shaped like an upside-down tulip with a gold star belt buckle, mint-and-white striped tights, tiny curly-toed gold slippers. Four translucent iridescent fairy wings, aqua fading to lilac, with clean navy outlines so they read on any background. In one hand she holds a star-topped wand that doubles as a microphone: a gold star with a mic grille in its center on a short pink handle. Pose: hovering in mid-air with feet pointed, free hand waving hello, leaning slightly toward the viewer, three-quarter view facing right. One single full-body character, centered and entirely visible with generous margin. Transparent background, no scenery, no sparkles or floating decorations, no text, no watermark, no other characters. Not blonde, no green leaf dress; an original design.
```

**Sprite poses** (asset `glimmer`; `facing: 1`; hovering, with `motion:
glide`):

| Pose | Loop | Fallback (add to POSES) | Description |
| --- | --- | --- | --- |
| `idle` | ✓ | — | Hover: 3–4 frames with the wings fluttering (wing frames carry it), gentle bob |
| `talk` | ✓ | idle | Talking to camera, mic-wand near her mouth, 2–3 mouth shapes, small gestures |
| `present` | ✓ | wave | "Ta-da!": open arm presenting to the side (toward the how-to panel), the other holding the mic |
| `point` | — | present | Points the wand forward at something |
| `cheer` / `celebrate` | — / ✓ | (existing) | Fist pump; loop-the-loop with joy |
| `surprised` | — | (existing) | Big gasp, hands to cheeks, wings flared |
| `wave` | ✓ | (existing) | Hello/goodbye wave |
| `cast` | — | throw | Sparkle-cast: flick of the wand (the engine adds sparkles) |
| `sad` | ✓ | (existing) | Sympathetic "awww" for the losers |
| `think` | ✓ | (existing) | "Who will win…?" during drumrolls |

Portraits: the five standard expressions plus `talk` (open mouth).

### 8.2 Shadow Imps (`shadow-imp`, `shadow-imp-blue`, `shadow-imp-pink`)

**Role:** the playful baddies in the music games (Spotlight Dance-Off and Pop
Star Stage). In a theme of K-pop idol heroes banishing cute shadow imps with
music, the imps sneak in to steal the spotlight. They demonstrate the dance
moves and get banished in a puff of glitter when players hit the right
notes. **Cute, mischievous and never scary.**

**Design:**
- Small round **smoky-velvet blob** bodies (plum purple for the default),
  with a lighter lavender belly.
- Wispy curling tail-smoke at the bottom instead of legs.
- Two little rounded **cat-ear nubs**, tiny stubby arms.
- Huge round glowing **lemon-yellow eyes** (round, not slitted) and a cheeky
  grin with one tiny tooth.
- Optional little bat-wing flaps.
- **Variants by recolor** (do the hue shift in post-processing so poses stay
  identical): `shadow-imp` plum, `shadow-imp-blue` midnight blue,
  `shadow-imp-pink` berry magenta. Eyes stay yellow.

**Personality:** giggly pranksters, show-offs, sore losers who stick out their
tongues when banished. They are like cats knocking things off tables.

**Canonical prompt:**

```
Use case: stylized-concept. Asset type: canonical character reference for a children's party video game, not a sprite sheet. Input image 1: Felicity canonical STYLE reference only; match its linework, cel shading and charm. Consistent style: bold smooth dark navy outlines, rounded appealing shapes, expressive eyes, simple clean cel shading, no photorealism, no 3D. Subject: a Shadow Imp, a small cute mischievous shadow creature for a kids' music game, as cuddly as a plush toy and not scary at all. Round soft velvety plum-purple body with a lighter lavender belly, a wispy curling smoke tail instead of legs so it floats, two small rounded cat-ear nubs, tiny stubby arms, little optional bat-wing flaps, huge round glowing lemon-yellow eyes with round shapes (no slit pupils), and a cheeky grin showing one tiny tooth. Pose: floating, giggling with one hand over its mouth, playful sideways lean, three-quarter view facing right. One single full-body character, centered with generous margin. Transparent background, no glow haze, no scenery, no text, no watermark, no other characters. No horns, no claws, no fangs, no menace.
```

**Sprite poses** (`motion: glide`):

| Pose | Loop | Fallback | Description |
| --- | --- | --- | --- |
| `idle` | ✓ | — | Hover with a smoke-tail swirl, blink |
| `walk` | ✓ | — | Sneak: tiptoe-float, hunched, finger to lips |
| `laugh` | ✓ | cheer | Taunt/giggle: hand over mouth, belly shake, tongue out |
| `dance`, `dance-up`, `dance-down`, `dance-side`, `dance-star` | ✓/— | (as §4.3) | They **demonstrate** the Spotlight Dance-Off moves, so these must be very clear |
| `hurt` | — | (existing) | Zapped by sparkles: squash with eyes squeezed |
| `poof` | — | hurt | Banished: 3–4 frames of the body puffing into a cloud of glitter. The last frame is nearly empty (the engine adds sparkles) |
| `surprised` | — | (existing) | "Eep!" when the spotlight lands on it |

### 8.3 Professor Hoot (`professor-hoot`)

**Role:** a kindly owl professor at a wizard school. He hosts Wizard
Quick-Draw (his lantern flash is the "GO"), Broomstick Dash (starter) and
Potion Class (shows the recipe card).

**Design:**
- A plump round tawny-brown owl with a cream face disc, big amber eyes
  behind **round gold spectacles**, and small ear tufts poking out under the
  hat.
- A deep **midnight-blue robe** trimmed with silver stars and moons.
- A **tall floppy purple pointed hat** with a gold star band.
- Wing-hands. He carries a brass **lantern** (separate prop so the game
  controls the light, §9.4) and a short wooden wand.
- No school crests, house colors, scarves, lightning bolts or other
  trademarked wizard-school insignia.

**Personality:** warm, a little dramatic and absent-minded. He loves a good
"Hoo-hoo!", polishes his spectacles when thinking, and applauds every
student.

**Canonical prompt:**

```
Use case: stylized-concept. Asset type: canonical character reference for a children's party video game, not a sprite sheet. Input image 1: Felicity canonical STYLE reference only; match its linework, cel shading and charm, do not borrow her anatomy or costume. Consistent style: bold smooth dark navy outlines, rounded appealing shapes, expressive eyes, bright colors, simple clean cel shading, no photorealism, no 3D. Subject: Professor Hoot, an original kindly owl teacher at a magical wizard school. Plump round tawny-brown owl with a cream heart-shaped face disc, big warm amber eyes behind round gold spectacles, small ear tufts peeking out, short orange beak, feathered wings used like hands, little orange talons. Wears a deep midnight-blue robe with silver star and crescent-moon trim and a tall floppy purple pointed wizard hat with a gold star band. Holds a short wooden wand in one wing; the other wing is raised as if starting a lesson. Friendly, slightly dramatic, absent-minded professor expression. Three-quarter view facing right, standing upright. No school crest, no house scarf, no lightning bolt, no logos. One single full-body character, centered and entirely visible with generous margin. Transparent background, no scenery, no floating decorations, no text, no watermark, no other characters.
```

**Sprite poses** (`motion: hop`):

| Pose | Loop | Fallback | Description |
| --- | --- | --- | --- |
| `idle` | ✓ | — | Blink (a slow owl blink is also a Quick-Draw fake-out), head swivel |
| `talk` | ✓ | idle | Lecturing, beak open and closed, wing gesturing |
| `hoot` | — | surprised | Feathers puff, beak wide "HOO!" |
| `lantern` | ✓ | present → wave | Lantern raised high in the `hand` (Quick-Draw anticipation; the lantern prop provides the flash) |
| `present` | ✓ | wave | Wing gestures at the recipe card or the course |
| `clap` | ✓ | (proposed) | Applauding wings |
| `surprised` | — | (existing) | Spectacles pop up, feathers flare |
| `think` | ✓ | (existing) | Polishing his spectacles, "hmm" |
| `cast` | — | throw | Wand flourish (Potion demo) |

### 8.4 Ambient creatures (each needs an approved canonical too)

| Id | What | Used in | Canonical prompt subject (append to the NPC template, §10.4) |
| --- | --- | --- | --- |
| `garden-fairy` (+ `-pink`, `-blue`, `-yellow`, `-green`, `-purple`) | Tiny glowing garden fairies about 50 px tall in-game. **One design, recolored**, with each color also wearing a **different flower cap** (pink: tulip, blue: bluebell, yellow: daisy, green: leaf, purple: violet) so color-blind kids can still count them | fairy-count (count the pink ones!), fairy-garden visitors | "a tiny round-faced garden fairy sprite with a flower-cap hat, dragonfly wings, a single-color glowing outfit, simple face, cute and readable at very small size; show five color variants in a row (pink tulip cap, blue bluebell cap, yellow daisy cap, green leaf cap, purple violet cap)". For the sprite set, generate one fairy and recolor it |
| `grumpy-broccoli` | The falling hazard in Sprinkle Catch: a little broccoli floret with a grumpy-funny face (frown, folded arms of stalk) | sprinkle-catch | "a small grumpy broccoli floret character with a comically frowning face, kid-friendly, not gross". Deliver as `prop/broccoli` (+ `prop/broccoli-bonk` with a dizzy face) |
| `storm-cloud` | A puffy gray thundercloud with a sleepy-grumpy face and a tiny cartoon lightning squiggle | broomstick-dash | "a puffy gray-lavender storm cloud with a sleepy grumpy face and a tiny cartoon lightning squiggle underneath". Deliver as `prop/storm-cloud` (+ `-zap`) |

Garden fairies need a small sprite set (`idle`/`walk` = fly with 2–3 wing
frames, `celebrate` = twirl, `surprised`) and can be registered as NPC
entries like the others. The broccoli and cloud are props with two states,
not sprite sets.

### 8.5 Troll sprites (`troll`, Phase E; canonical already approved)

Follow the Troll section of `CHARACTERS.md`: idle, notice, heavy walk, one
clearly telegraphed attack, a hit/stagger, and an exit. Separate anticipation,
contact and recovery so kids can read and dodge. He is drawn at `h` 270 (the
viewer shows him at 0.75 scale). `facing: 1`, `motion: stomp`.

| Pose | Loop | Fallback | Description | Frames |
| --- | --- | --- | --- | --- |
| `idle` | ✓ | — | Belly breathing, grumpy blink, head scratch | 3–4 @ 4 |
| `walk` | ✓ | — | Heavy stomp, knuckles swinging, shoulders rolling (the game shakes the screen on footfalls) | 4 @ 6 |
| `surprised` (notice) | — | (existing) | "Hm?!": head snaps toward a player, brows up | 2 @ 8 |
| `windup` | ✓ | think | **Ground-pound telegraph**: both fists raised overhead, belly out, teeth gritted. Held for about 0.8 s while the danger ring grows, so it must be unmistakable | 2 @ 4 (tremble) |
| `slam` | — | action | Contact: fists hit the ground, knees bent, cheeks puffed. Then recovery: straightens up dusting his hands | 3 @ 10 |
| `grab` | — | action | Lunge with both huge hands reaching forward (wind-up, reach, close) | 3 @ 10 |
| `laugh` | ✓ | cheer | Mischievous belly laugh after catching someone | 2 @ 6 |
| `dizzy` | ✓ | (existing) | Stagger, crossed eyes, swaying (when he bonks himself or the round ends) | 2–3 @ 6 |
| `hurt` | — | (existing) | Stubbed toe or bonk, hopping on one foot | 2 @ 10 |
| `sleep` | ✓ | (existing) | Slumped sitting, snoring, a drool bubble (the engine adds Zzz) | 2 @ 2 |
| `exit` | ✓ | walk | Trudging away, grumbling, waving a dismissive hand (an alias of walk is acceptable) | — |

---

## 9. Game art: logo, backgrounds, thumbnails, props (Phase D)

Everything here is optional and has a procedural fallback, so it is pure
upgrade. Code asks for art by key:

```js
const bg = art('bg/sprinkle-catch'); if (bg) g.drawImage(bg, 0, 0, W, H); else drawProcedural(g);
drawArt(g, 'prop/present', x, y, w, h, { anchor: 'bottom' });   // 'center' | 'bottom' | 'topleft'; fit 'contain' | 'cover' | 'stretch'
```

**Index:** `assets/art/index.json` maps keys to files relative to
`assets/art/`:

```json
{ "images": { "ui/logo": "ui/logo.webp", "bg/sprinkle-catch": "bg/sprinkle-catch.webp", "thumb/sprinkle-catch": "thumb/sprinkle-catch.webp", "prop/present": "prop/present.webp" } }
```

Key conventions: `bg/<gameId>`, `thumb/<gameId>`, `prop/<name>`,
`icon/<name>`, `ui/logo`, `ui/<name>`. Every listed image is loaded at boot,
so watch the file sizes. **No text in any image except the logo** (the game
draws all text). Use the same house style as the characters (navy outlines,
cel shading), slightly softer and less saturated for backgrounds so the
characters pop.

| Type | Size | Format / budget |
| --- | --- | --- |
| `bg/*` | 1920×1080, opaque | WebP quality 80–85, ≤ 350 KB |
| `thumb/*` | 800×500 (16:10), opaque | WebP quality 85, ≤ 90 KB |
| `prop/*` | Longest side 128–512 px (as listed), transparent, trimmed | WebP quality 86, alpha lossless, ≤ 60 KB |
| `icon/*` | 128×128, transparent | ≤ 15 KB |
| `ui/logo` | about 1600×700, transparent | ≤ 250 KB |

### 9.1 Logo and menu backdrops

| Key | Brief |
| --- | --- |
| `ui/logo` | **"Charlie Party"** wordmark: chunky bubbly rounded letters, "Charlie" in candy pink-to-orange and "Party" in sunny yellow-to-mint, thick navy outline, glossy highlights, a gold star replacing the dot of the "i", confetti and a few stars tucked around the letters, slight playful bounce in the baseline. Transparent background. **Check the spelling letter by letter**, and regenerate until it's perfect |
| `bg/title` | A festive outdoor party stage at golden hour: bunting, balloons, a striped tent, fairy lights, confetti in the air, rolling candy-colored hills. The center-bottom stage is open (the code lines up characters there), and the upper center is clear for the logo |
| `bg/menu` | A calmer version for character and game select: a soft pastel party room with bunting along the top edge and gentle bokeh lights. Low detail, mostly flat in the middle |
| `bg/results` | Awards stage: velvet curtains, spotlights converging on the center (the podium is drawn by code, or by `prop/podium`), confetti, sparkly backdrop |
| `bg/howto` | Glimmer's cozy presenting nook: a storybook-stage with curtains and a soft starry backdrop; left two-thirds calm for the rules panel |
| `bg/marathon` | Grand trophy ceremony: golden curtains, fireworks in a night sky, a giant star banner (no text) |

### 9.2 Minigame backgrounds (`bg/<id>`, 1920×1080)

General rules: no characters, no gameplay objects that the code draws (tiles,
platforms, notes, cards, canvases), a calm HUD band across the top ~140 px,
and a play area that is low-contrast and low-detail. Side-view games need a
clear ground line. Top-down games are seen straight down.

| id | View | Brief | Keep clear / notes |
| --- | --- | --- | --- |
| `sprinkle-catch` | Side | Candy-land sky in pink, peach and lavender, with cotton-candy clouds and sprinkle "stars". Frosting-grass meadow along the bottom (ground top edge at about y = 900) with gumdrop bushes at the far left and right | Upper center clear: the giant sky cake is a separate prop so it can wobble (`prop/sky-cake`) |
| `bumper-bounce` | Top-down | Looking down from high in the sky: soft clouds far below, pastel gradient, tiny balloons drifting | Center 1200×900 calm: the floating cake arena is drawn on top (`prop/arena-cake`) |
| `pass-the-present` | Top-down ¾ | A birthday party room floor (rug in a circle pattern), streamers and balloons hugging the edges, gift piles in the corners | Center circle clear for players |
| `balloon-pump` | Side | A sunny fairground with bunting, a distant Ferris wheel and striped tents; grass at the bottom | Lower half and the sky above the players open (balloons rise there) |
| `troll-trouble` | Top-down | Lush meadow with flower patches, mossy rocks and mushroom rings around the borders, a cave mouth at the top edge where the Troll appears | Grass in the center slightly textured but calm (gems must pop) |
| `spotlight-dance` | Side, stage | Night concert stage in purples and magentas, truss lights, speakers, glittery backdrop; the corners are shadowy-cute (where imps lurk), not scary | Stage floor across the bottom third |
| `wizard-quickdraw` | Side | Moonlit wizard-school courtyard: stone towers with glowing windows, floating candles, starry sky, a stone perch at top center for Professor Hoot | Row along the bottom for up to 8 players |
| `cookie-crumble` | Top-down | Looking down into a swirling sea of milk with floating chocolate chips and marshmallow boats | Fairly uniform (cookie tiles are props drawn over it) |
| `paint-party` | Top-down | A big plaza with **near-white** floor tiles, framed by paint pots, brushes and rainbow splats at the edges | The center must be light and plain (paint is drawn on it) |
| `broomstick-dash` | Side-scroll | Wizard-school sky at dusk to night: castle silhouette with glowing windows on the horizon, moon, layered clouds. **Must tile seamlessly left-to-right** | Optionally also `bg/broomstick-dash-far` (a parallax layer, needs code) |
| `fairy-count` | Side | Moonlit garden: giant flowers, mushroom cottages, a big moon, a few fireflies, deep blue and teal palette | **No pink anywhere** (the kids count pink fairies). Mid-height band open where fairies fly |
| `crown-keeper` | Top-down | Princess castle courtyard: warm cobblestones, rose hedges, a fountain at one edge, banners on the walls framing it | Center open |
| `fashion-show` | Side | Royal palace runway: pink-gold curtains, chandeliers, a runway across the bottom third, cute silhouette audience with sparkly camera flashes | Also `bg/fashion-show-dressing`: a vanity/dressing room with a mirror (the mirror area is plain, since the code draws the character there) |
| `art-studio` | Front | Sunny art studio wall: shelves of paint jars, plants, a window, a string of kids' drawings (abstract, no text) around the edges | Central about 1400×800 plain light wall (the code draws the shared canvas there) |
| `cake-bakery` | Side | Bright pastel bakery: tiled wall, mixer, sprinkle jars, oven, bunting; a long counter top across the bottom third | Counter-top band clear for 1–4 cake stations |
| `pet-spa` | Side | Bubbly pet spa salon: pastel tiles, fluffy towels on shelves, round mirrors, plants, floating bubbles at the edges | Floor band clear for tubs |
| `pop-star-stage` | Front, stage | Big bright arena concert: giant LED screens with abstract shapes (no text), lasers, a crowd silhouette waving light sticks, confetti | Keep a calm vertical lane on one side or the middle for the note highway (the code draws it) |
| `fairy-garden` | Side | Day garden: rainbow flowers, a picket fence, butterflies, a soft blue sky; an even band of soil and grass along the bottom | Also `bg/fairy-garden-night` with the same layout at night: glowing flowers, fireflies, aurora sky |
| `potion-class` | Side | Wizard-school potion classroom: stone walls, shelves of colorful bottles, hanging herbs, arched windows with a night sky, a **blank** blackboard at top center | Lower center for the cauldrons (props) |
| `memory-match` | Top-down | Magical unicorn meadow at twilight: rainbow arcing across the top, pastel stars, a soft velvet-purple tablecloth filling the center | Center tablecloth plain (cards drawn on it) |

### 9.3 Thumbnails (`thumb/<id>`, 800×500)

These are used on the game-select shelves and the how-to screen. Each shows
**one iconic moment** of the game with 1–2 roster characters (use their
canonicals as input images to keep them on model). The suggested casting
features every character. No text, and keep the subject centered (the cards
may round their corners).

| id | Moment (suggested cast) | Needs approval of |
| --- | --- | --- |
| `sprinkle-catch` | Felicity and Fellowfox catching cupcakes raining from a giant sky cake | — |
| `bumper-bounce` | Bronze bumping Hotdog on a frosted floating cake | — |
| `pass-the-present` | Snowstar holding a ticking present, wide-eyed | — |
| `balloon-pump` | Birthday Cake bouncing on a pump, balloon about to pop | — |
| `troll-trouble` | The Troll stomping while Cotton Candy grabs a gem | — |
| `spotlight-dance` | Marina and Scale dancing in a spotlight, an imp poofing into glitter | Shadow Imp |
| `wizard-quickdraw` | Princess Amber with a wand at the ready, Professor Hoot's lantern flashing | Professor Hoot |
| `cookie-crumble` | Fox mid-hop over a gap between cookie tiles | — |
| `paint-party` | Hotdog leaving a rainbow paint trail | — |
| `broomstick-dash` | Marina riding a broom through a star ring | — |
| `fairy-count` | The Unicorn watching pink fairies zip by | Garden Fairy |
| `crown-keeper` | Scale holding the big crown aloft | — |
| `fashion-show` | Cotton Candy on the runway in heart sunglasses and a cape | — |
| `art-studio` | Snowstar painting a rainbow on a big canvas | — |
| `cake-bakery` | Birthday Cake proudly beside a towering decorated cake | — |
| `pet-spa` | Fellowfox in a bubble bath with a rubber duck | — |
| `pop-star-stage` | The KPop Girls singing on a big stage | — |
| `fairy-garden` | Felicity watering glowing flowers, fairies around her | Garden Fairy |
| `potion-class` | Bronze stirring a bubbling cauldron, rainbow fizz | — |
| `memory-match` | The Unicorn with a fan of face-up character cards | — |

### 9.4 Props starter list (`prop/<name>`)

Draw props facing right / front. Attached props are mirrored with the
character. Give the anchor convention for each in the index notes or the
filename table (most are `bottom`). Prioritize the ★ ones.

| Game | Props |
| --- | --- |
| sprinkle-catch | ★`treat-donut`, ★`treat-cupcake`, ★`treat-candy`, `treat-cookie`, `treat-icecream`, `treat-lollipop` (≈128 px); ★`golden-cupcake` (glowing gold, 160 px); `broccoli`, `broccoli-bonk` (§8.4); ★`sky-cake` (giant 3-tier cake on a cloud, 900 px wide) |
| bumper-bounce | `arena-cake` (top-down round frosted cake 1000 px, sprinkles; optional `arena-cake-crumb` edge pieces); `cheer-cloud` (fluffy cloud seat for knocked-out players, 260 px) |
| pass-the-present | ★`present` (wrapped box with a big bow, 200 px), `present-ticking` (bulging, wobbly ribbon), `soot-puff` |
| balloon-pump | ★`balloon-<color>` in the 8 player colors `ff4d6d`, `3fa7ff`, `36d17a`, `ffc12e`, `b36bff`, `ff8c3a`, `25d0c8`, `ff6fd0` (named `balloon-red`, `-blue`, `-green`, `-yellow`, `-purple`, `-orange`, `-teal`, `-pink`; 300 px, knot at bottom); ★`pump` (plunger pump, 220 px) |
| troll-trouble | ★`gem-red`, `gem-blue`, `gem-green`, `gem-purple`, `gem-yellow` (chunky cut gems, 96 px); `danger-ring` optional |
| spotlight-dance / pop-star-stage | ★`note-a` (green gem), `note-b` (red), `note-x` (blue), `note-y` (yellow): round gem notes **without letters** (code adds the glyph), 128 px; `mic-stand`, `spotlight-beam` (soft cone, alpha), `light-stick` |
| wizard-quickdraw | ★`lantern-off`, ★`lantern-on` (brass lantern, the same image with flame lit and glow, 160 px); `wand-wizard` (wood, star tip, 140 px); `fizzle-puff` |
| cookie-crumble | ★`cookie-tile`, `cookie-tile-cracked`, `cookie-tile-crumbling` (top-down square-ish chocolate-chip cookie, 200 px, the three states identical except for cracks) |
| paint-party | `paint-bomb` (paint-filled balloon, 96 px), `splat` (white splat shape for code tinting, 256 px) |
| broomstick-dash | ★`broom` (rideable broom drawn horizontally, bristles at the back-left, 300 px; anchor at the seat), ★`star-ring` (glowing gold ring, 220 px), `storm-cloud`, `storm-cloud-zap` (§8.4) |
| fairy-count / fairy-garden | `firefly` (64 px glow dot with wings); `seed-magic` (sparkly seed, 64 px); `watering-can` (160 px); plants in stages for 3 kinds (`moonflower`, `star-tulip`, `rainbow-rose`): `plant-<kind>-sprout`, `-bud`, `-bloom`, `-glow` (night glowing version), 256 px tall, anchor bottom; `garden-plot` (soil mound) |
| crown-keeper | ★`crown` (big jeweled royal crown, distinct from the characters' crowns, 160 px, anchor bottom) |
| fashion-show | Crowns: `crown-gold`, `crown-silver`, `crown-flower`; tiaras: `tiara-pearl`, `tiara-star`; hats: `hat-top`, `hat-witch`, `hat-sun`, `hat-beret`, `hat-party`; bows: `bow-pink`, `bow-blue`, `bow-gold`; glasses: `glasses-heart`, `glasses-star`, `glasses-round`, `glasses-sun`; capes: `cape-royal`, `cape-starry`, `cape-rainbow`; wings: `wings-fairy`, `wings-butterfly`, `wings-feather`; necklaces: `necklace-pearls`, `necklace-heart`, `necklace-lei`; wands: `wand-star`, `wand-heart`. Head items 160 px wide (anchor bottom-center = brim). Glasses are front view, 140 px. Capes and wings are back pieces about 300 px (anchor top-center = neck) |
| art-studio | `frame-gold` (ornate gallery frame, 9-slice friendly, transparent center, 1600×1000); icons `icon/brush`, `icon/rainbow`, `icon/glitter`, `icon/stamp`, `icon/bucket`, `icon/shapes`, `icon/eraser`, `icon/undo` |
| cake-bakery | `cake-layer-vanilla`, `-chocolate`, `-strawberry`, `-rainbow` (side view, 400 px wide); `cake-stand`; toppers `topper-strawberry`, `-cherry`, `-star`, `-heart`, `-flower`, `-unicorn-horn`; `candle` (separate `candle-flame`); `sprinkles` (scatter sprite) |
| pet-spa | ★`bathtub` (clawfoot tub, front, 500 px; also `bathtub-front` as an overlay piece so pets sit "in" it), `bubbles` (foam cluster), `towel`, `brush`, `sponge`, `shampoo`, `rubber-duck`, `pet-treat` (bone-shaped cookie), `pet-bow-<color>` |
| potion-class | ★`cauldron` (black iron, 360 px) + `cauldron-bubbles` (overlay); ingredients (≈128 px): `ing-glow-mushroom`, `ing-rainbow-feather`, `ing-stardust-jar`, `ing-moon-drop`, `ing-bubble-berries`, `ing-sparkle-flower`, `ing-snow-crystal`, `ing-sneezy-pepper`; `potion-bottle`; `recipe-card` (blank parchment, 600×800); `spoon` (big wooden spoon for stir, `hand` held) |
| memory-match | ★`card-back` (unicorn-and-stars pattern, 300×400, rounded corners), `card-front` (blank frame; the code draws portraits inside) |
| results / marathon | ★`trophy` (big gold cup with a star, 300 px), `podium` (3-step pastel podium, 1000 px wide, no numbers), `ui/star` (the star currency, 128 px), `ui/medal` (showstopper medal, 128 px), `confetti` (sheet of pieces) |

---

## 10. Prompt templates (copy, then fill the `<…>`)

Always attach the input images named in the template.

### 10.1 Pose strip (2–4 frames)

```
Use case: sprite animation keyframes for a 2D children's party video game. Input image 1: approved canonical reference of <CHARACTER NAME>; reproduce this exact character with identical face, proportions, colors, outfit and outline weight. Input image 2: approved idle sprite frame of the same character; match its size, camera and rendering exactly.
Create a horizontal strip of <N> frames showing <CHARACTER NAME> performing "<POSE>": frame 1 <description: anticipation>, frame 2 <description: main action / contact>, frame 3 <description: follow-through / hold>[, frame 4 <...>].
Every frame: the same character at the same size, full body entirely visible, three-quarter view facing screen-right, <feet / hooves / tail curl / cake base> resting on the same invisible ground line near the bottom, equal-width cells with clear empty space between figures, no overlapping. Big, exaggerated, kid-readable silhouette and facial expression: <expression notes>. Must keep: <must-keep list from section 2.2>.
Style: bold smooth dark navy outlines, rounded appealing shapes, expressive eyes, bright original colors, simple clean cel shading, no photorealism, no 3D. Fully transparent background. No ground shadow, no motion lines, no dust, no sparkles, no effects, no text, no panel borders, no extra characters, no props<, except: PROP>.
```

### 10.2 Single key pose

```
Use case: single sprite key pose for a 2D children's party video game. Input image 1: approved canonical reference of <CHARACTER NAME> (reproduce exactly). Input image 2: approved idle frame (match size, camera and rendering).
Show <CHARACTER NAME> in this pose: <precise body description: weight, arms, legs/tail, head angle, hair/tail/ear motion>. Facial expression: <expression>. Full body visible with generous margin, three-quarter view facing screen-right, <contact point> on an invisible ground line near the bottom <or: airborne, about N% of body height above the ground line>. Must keep: <must-keep list>.
Style: bold smooth dark navy outlines, rounded shapes, bright original colors, simple clean cel shading, no 3D. Transparent background, no shadow, no effects, no text, no other characters.
```

For an edit-based variant, attach the idle frame only and write: "Edit this
image: keep the character identical and change only <arms/face/...> to
<...>; keep the same size, position, ground line and transparent background."

### 10.3 Expression portrait

```
Use case: character expression portrait for a children's party video game HUD. Input image 1: approved canonical reference of <CHARACTER NAME> (reproduce exactly).
Square head-and-shoulders bust of <CHARACTER NAME>, three-quarter view facing right, face centered horizontally with eyes at about 45% height, the whole face, ears and main head ornament (<ornament>) inside a centered circle with margin, shoulders running off the bottom edge. Expression: <neutral friendly smile | huge open grin with eyes squeezed into happy arcs | teary pout with wobbly lip and raised brows | wide saucer eyes with a small O mouth | focused determined brows with a confident smirk>. <Character note, e.g. "Bronze has one eye and no mouth; express it with the eye shape only.">
Style: bold smooth dark navy outlines, rounded shapes, bright original colors, simple clean cel shading, no 3D. Transparent background, no text, no frame, no other characters.
```

### 10.4 NPC canonical

```
Use case: stylized-concept. Asset type: canonical character reference for a children's party video game, not a sprite sheet. Input image 1: Felicity canonical STYLE reference only; match its linework, cel shading and charm, do not borrow her anatomy or costume. Consistent style: bold smooth dark navy outlines, rounded appealing shapes, expressive eyes, bright colors, simple clean cel shading, no photorealism, no 3D.
Subject: <NAME>, <role in one line>. <Body, face, colors, outfit, accessories, in concrete visual terms>. Personality shown through the pose and expression: <...>. Pose: <readable neutral action pose>, three-quarter view facing right.
One single full-body character, centered and entirely visible with generous margin. Transparent background, no scenery, no floating decorations, no text, no watermark, no other characters. Kid-friendly, never scary. Original design; no trademarked characters, logos or insignia.
```

### 10.5 Background

```
Use case: 2D video game background for a children's party game, 1920x1080, landscape. <side view | top-down view looking straight down | front view of a stage>.
Scene: <brief from section 9.2>. Keep <area> open, plain and low-contrast for gameplay; keep the top 140 px calm for the score bar; <ground line at about y = 900 | tile seamlessly left-to-right | no pink anywhere>.
Style: matches a cartoon character roster with bold smooth dark navy outlines and simple clean cel shading, but slightly softer and less saturated than the characters so they stand out; bright, cheerful, kid-friendly; no photorealism, no 3D. No characters, no people, no animals, no text, no letters, no logos, no watermark.
```

### 10.6 Prop

```
Use case: game prop sprite for a 2D children's party video game. A single <object> — <details: shape, colors, material, state>. <Front view | three-quarter view facing right | top-down view>, centered, entirely visible with margin, <anchor note, e.g. "flat bottom so it can sit on a head">.
Style: bold smooth dark navy outlines, rounded appealing shapes, bright colors, simple clean cel shading, no photorealism, no 3D. Transparent background, no shadow, no text, no other objects.
```

---

## Requests added by minigames

Minigame agents append prop, background or pose requests here when they find
a need while building their game. The image agent processes them after the
phases above, or sooner if they are marked as blocking. Use this format:

```
### <game id> — <short title>   (requested by <agent/date>, priority: blocking | nice-to-have)
- Key: `prop/<name>` (or bg/…, pose name for a sprite set, portrait expression)
- What: <one-line visual description, size, anchor, states/variants>
- Where it's used: <how the code draws or attaches it; fallback used today>
```

_(none yet)_

### Optional action extension (implemented in the sprite engine)

`look-around`, `high-five`, `crouch`, `dash`, `catch`, and `wave-goodbye` are
optional actions with procedural motion and fallback chains. See
`reference/RECOMMENDED-ACTIONS.md` for use, timing and gameplay boundaries.
Felicity is the first authored reference set; other members remain compatible
through fallbacks until their own frames are generated.
### Round 2 — compiled by the lead from the minigame agents (2026-10-02)

> **Status (lead):** every round-2 pose below is now registered in `POSES`
> (`src/engine/sprites.js`) with a fallback chain, and the games request
> these names directly. Adding frames for a pose to a character's sprite set
> upgrades every game that uses it, with no code change. Felicity +
> Fellowfox were verified in all 20 games: attachments (wand, crown,
> fashion items) track her `head`/`hand`/`eyes` points, `ride` reads well on
> the broom, and her `dash`, `catch`, `look-around` and `crouch` frames are
> picked up by the fallbacks (dash → bumps, catch → Pass the Present and
> Fairy Garden fireflies, look-around → Fairy Count's look-up).

Everything below has a working procedural fallback today; all are
nice-to-have unless marked. Sizes are logical px at 1080p. New poses are for
**all roster characters** unless noted; until frames exist the game maps
them to the nearest pose (listed in parentheses), so add each new pose name
to `POSES` in `sprites.js` with that fallback in the same commit as its frames.

#### New character poses (all characters)

| Pose | Read | Games | Today's fallback |
| --- | --- | --- | --- |
| `swim` | Treading water, head and shoulders up, paddling | cookie-crumble | walk, clipped at the waterline |
| `balance` | Arms-out wobble on a cracking cookie | cookie-crumble | surprised + "!" |
| `splat-throw` | Underhand lob of a paint balloon | paint-party | throw |
| `wand-up` | Wand held high, trembling with anticipation | wizard-quickdraw | ready |
| `broom-rise` / `broom-glide` | On a broom: leaning forward with hair streaming / upright and relaxed | broomstick-dash | ride |
| `broom-zapped` | Frizzy hair, startled, tipped sideways on the broom | broomstick-dash | hurt |
| `count` | Pointing a finger and counting along | fairy-count | think |
| `look-up` | Head tilted back watching the sky | fairy-count | idle |
| `crowned` | Proud royal strut, chin up (crown attached by code at `head`) | crown-keeper | walk |
| `dash` | Forward lunge, arms out (a bump). 2 frames (launch, held lunge with hair/ears streaming back) with `holdLast` | crown-keeper | push |
| `hip-bump` | **Hip bump** as on the Bumper Bounce thumbnail: body turned side-on, upper body leaning away, hip swung out toward the facing direction, arms up for balance, cheeky grin. 2 frames @ 10 (hip cocked back, hip swung out) with `holdLast`; `motion` 0.3. Held ~0.5 s while sliding in, replayed on contact | bumper-bounce | idle + procedural hip lean |
| `knockback` | **Just got bumped:** skidding backward on the heels, torso leaning way back away from the hit, arms windmilling, wide "whoa!" eyes, mouth open. Facing toward the bumper. 2 frames @ 8 (arms windmill A/B) with a strong lean; `motion` 0.3 (code adds the teeter wobble, red flash and skid dust). Held ~0.7 s while the character slides | bumper-bounce (could serve crown-keeper bumps later) | balance → hurt |
| `catch` | Arms up in a basket catching something falling | sprinkle-catch | cheer |
| `sit` | Sitting on a little cloud, legs dangling | bumper-bounce (spectators) | idle |
| `tumble` | Tumbling off an edge | bumper-bounce | fall |
| `hold-present` | Box held overhead, nervous | pass-the-present | carry |
| `toss` | Two-handed underhand toss | pass-the-present | throw |
| `catch-present` | Startled catch | pass-the-present | surprised |
| `sooty` | Dizzy with a soot-smudged face | pass-the-present | dizzy |
| `drink` | Sipping from a potion bottle | potion-class | eat |
| `float` | Arms out, drifting (Floaty potion) | potion-class | idle + lift |
| `hiccup` | A jolt with puffed cheeks | potion-class | surprised |
| `giggle` | Hand over mouth, laughing | potion-class | laugh |
| `stomp-giant` | Proud wide stance (Giant potion) | potion-class | ready |
| `squeak-tiny` | Surprised little hop (Tiny potion) | potion-class | surprised |
| `flip` | Reaching out to flip a card | memory-match | action |
| `blow` | Cheeks puffed, blowing out candles | cake-bakery | action |
| `shake-sprinkles` | Shaking a sprinkle jar | cake-bakery | paint |
| `pose-twirl` | Runway dress twirl | fashion-show | strike* |
| `photo` | Peace sign facing the camera for a group photo | fashion-show | cheer |

**NPC poses:** Glimmer `point`/`present` for the Fairy Count question
reveal (already in §8.1). Professor Hoot: `talk`, `point` (at the
chalkboard), `hoot`, `laugh`, `bravo` (wings up), `idle` with blink (§8.3).
Troll: as §8.5 (Troll Trouble and solo Bumper Bounce / Pass the Present use
him as the opponent).

#### Backgrounds (`bg/<id>`, 1920×1080 unless noted)

| Key | Description | Keep clear / constraints |
| --- | --- | --- |
| `bg/sprinkle-catch` | Candy-land sky, rainbow, hills, lollipops, frosting ground strip from y≈880 | Sky open for falling treats |
| `bg/bumper-bounce` | Bright sky with clouds below, **no platform** | Center for the cake platform |
| `bg/pass-the-present` | Birthday party room with bunting and gift tables; floor to the bottom | Rug is drawn separately |
| `bg/wizard-quickdraw` | Night wizard-school courtyard, moon, castle silhouette | Top-center for the owl + lantern; lower third open |
| `bg/cookie-crumble` | Milk lake with sprinkle graham-cracker shores (~215 px each side) | Open middle |
| `bg/paint-party` | Plaza with a flat, light floor (drawn at 25% under the paint) | Flat and light |
| `bg/broomstick-dash` | Dusk wizard-school sky with stars and a distant castle | Drawn behind stacked lanes |
| `bg/fairy-count` | Moonlit garden at dusk | Sky open for fairies |
| `bg/crown-keeper` | Top-down castle garden, hedge border | **Must match code layout**: arena x 160–1760, y 290–985, fountain at (960,640) r=104, four hedge boxes — or skip |
| `bg/memory-match` | Pastel pink-lavender sky, big soft rainbow, clouds | Center covered by the board |
| `bg/fashion-show` | Purple fashion hall, pink curtain stage, runway in perspective, no crowd | — |
| `bg/cake-bakery` | Pastel tiled bakery wall with bunting (~960×540, drawn per station) | — |
| `bg/art-studio` | Bright art-studio wall, paint splats, wood floor | Easel drawn by code |
| `bg/art-gallery` | Museum wall with spotlights, wood floor, velvet rope | Empty space for the framed painting |

#### Props (`prop/<name>`, transparent)

| Key | Description | Size |
| --- | --- | --- |
| `prop/giant-cake` | Floating 3-layer birthday cake with a happy face, candles lit; origin bottom-center | ~520×420 |
| `prop/treat-sprinkle`, `prop/treat-cupcake`, `prop/treat-golden`, `prop/treat-broccoli` | Sprinkle burst, cupcake, sparkly golden cupcake, grumpy broccoli | ~150 sq |
| `prop/seat-cloud` | Small cloud seat | ~190×120 |
| `prop/party-rug` | Round party rug | ~1480×800 |
| `prop/present` | Gift box with bow in neutral pink (code tints it red as it heats up) | ~110 sq |
| `prop/professor-hoot` | Full-body owl teacher: purple star wizard hat, round gold glasses, pink bow tie (until his sprites exist) | ~260×340, feet at bottom |
| `prop/ingredient-<id>` ×8 | moonberry, starflower, unicornhair, dragonpepper, bubbleroot, rainbowdew, snowcrystal, mushroom | 256 sq |
| `prop/puffy-hair-cloud`, `prop/polka-dots` | Silly potion overlays | ~200 sq |
| `prop/memory-card-back` | Unicorn head with rainbow mane and gold horn, rainbow arc, sparkles, rounded corners | ~400×526 |
| `prop/cookie-1`…`prop/cookie-4` | Top-down cookie tiles (choc chip, pink sprinkle, double choc, oatmeal) with visible thickness | ~148×164 |
| `prop/storm-cloud` | Grumpy purple storm cloud with face and a small bolt | ~400×340 |
| `prop/owl-mail` | Winged cream envelope with a red heart seal | ~300×240 |
| `prop/star-ring` | Tall gold ring seen from the side with a small star | ~160×400 |
| `prop/broom` | Side-view broom, bristles to the left | ~560×120 |
| `prop/vanity-mirror` | Oval dressing-room mirror ringed with bulbs | ~600×700 |
| Later | `prop/fairy-<color>`, `prop/crown`, `prop/fountain`, `prop/hedge` | — |

#### Added with the last six games

**Poses (all characters unless noted):** `sing` (holding a mic and
singing — Pop Star Stage, Fairy Garden X; falls back to dance), `water`
(tilting a watering can; action), `catch` also covers swiping a firefly jar
(Fairy Garden). Pets only (fox, fellowfox, cotton-candy, unicorn, hotdog):
`giggle` (squirming while scrubbed), `catch-toy` (leap for a rubber duck).
Two-handed `action` pump read for Balloon Pump. Troll: `windup`, `slam`,
`sleep`, `laugh` (already called with fallbacks).

**NPCs:** the Shadow Imp canonical (§8.2) is now wanted by two games —
Spotlight Dance-Off (poses: idle bounce, dance-up, dance-down, dance-side,
dance-star spin, laugh, eep, poof) and Pop Star Stage (poof, laugh,
surprised; the code switches to the sprites automatically once a
`shadow-imp` entry with art exists). Garden fairies (§8.4) would need a
small code change to replace the drawn ones.

**Backgrounds (1920×1080):**

| Key | Description | Keep clear / constraints |
| --- | --- | --- |
| `bg/balloon-pump` | Party room: pastel striped wall, bunting, floating balloons, counter/floor strip | Floor strip at y≈925 (one row) or y≈540 and y≈965 (two rows); open sky for balloons |
| `bg/troll-trouble` | Top-down sunny meadow, back hedge in the top ~215 px, grass, flowers, dirt path | Leave rocks out (code draws them as obstacles) |
| `bg/spotlight-dance` | K-pop concert stage: LED wall, truss lights, curtains, glossy floor, audience silhouettes at the bottom | Floor from y≈610 (one row) / y≈520 (two rows); open center for imps and prompts |
| `bg/pet-spa` | Cheerful pet salon wall (window, shelves) | Stations drawn by code |
| `bg/pop-star-stage` | Neon concert stage, dark edges where imps lurk | Lanes and performers drawn by code |

**Props:** `prop/gem` (5 colors + big gold gem), `prop/rock`,
`prop/flower` (Troll Trouble); `prop/balloon-pump` (hand pump),
`prop/balloon` (8 player colors, pinched knot); `prop/sponge`,
`prop/towel`, `prop/brush`, `prop/pet-treat`, `prop/rubber-duck` (~128 px),
`prop/shower-head` (~160 px); `prop/note-a`, `prop/note-b`, `prop/note-x`,
`prop/note-y` (128 px gems, no letters); `prop/watering-can` (160 px),
`prop/firefly` (64 px); plants `prop/plant-<kind>-<stage>` for kind in
rose, sunflower, star-bloom, rainbow-tulip, glow-mushroom, crystal-flower
and stage in seed, sprout, bud, bloom, glow (night) — 256 px tall,
bottom-anchored (replaces the plant list in §9.4).

**Thumbnails:** optional `thumb/<id>` for all 20 games (each game's
procedural `drawIcon` is the fallback).



---

## Round 3 — lessons from the Felicity pilot, and next requests

Written by the lead after running Felicity + Fellowfox through all 20
minigames in the game itself (CPU rounds, per-frame pose logging, close-up
crops around her). The pilot works: attachments track her art, aliases and
fallbacks behave, and nothing broke. These are the considerations for the
rest of the roster, then the next requests.

### R3.1 What worked — keep doing it

- **Per-frame anchor points.** Wands, crowns, glasses, bunny ears and
  necklaces landed exactly on her `hand`/`head`/`eyes`/`neck` points in every
  game. Supply all five points on every frame of every character.
- **One shared foot anchor + `bodyHeight`.** No foot sliding, no scale pops
  between poses, and her size matched the base-art characters beside her.
- **Trimmed frames with per-frame anchors** (her frames are ~250×325, not the
  640×496 canvas). Keep trimming: it is what keeps memory sane.
- **Single key frames at `motion` 0.85.** In play, the procedural squash,
  hop and tilt carry one good key pose convincingly. Don't spend frames on
  poses that hold still or last under ~0.4 s.
- **Distinctive pose silhouettes.** `ride` (crouched, gripping) is the best
  example: it reads as broom-flying instantly and the scarf/broom props sit
  right. Aim for that clarity in every pose.

### R3.2 Considerations for the next characters

1. **Where extra frames pay off (measured screen time).** Logging which pose
   Felicity was in, frame by frame, across the games gives this ranking of
   on-screen time: `idle` ≫ `walk` > `run` > `ready` (Wizard Quick-Draw holds
   it all game) > `carry` (Pass the Present) > `broom-glide`/`ride` > `dance`
   (Spotlight, Pop Star) > `look-up`/`count` > `hurt` ≈ `dizzy` ≈ `cheer`; plus
   `celebrate` and `pout` on the podium after **every** game. So for each
   character, beyond the 4-frame walk:
   - `idle`: add a **blink** frame (`dur` ≈ 0.12 s) — the cheapest life there is.
   - `celebrate`: 3–4 frames (anticipation crouch → leap → peak → land) — it's
     the emotional payoff of every game.
   - `pout`: 2 frames (arms crossed ↔ foot stomp) — the "funny tantrum".
   - `dance`: 4 frames timed so one cycle = 2 beats at 120 bpm (fps 4), so the
     rhythm games look on-beat.
   - `ride`: 2 frames (hair/ears flutter) for Broomstick Dash's 40 s race.
   - `run`: its own 4 frames if the character's run differs from a faster
     walk (quadrupeds: a gallop).
   Everything else stays a single key frame.
2. **Give `cheer` and `sad` their own key frames.** Felicity aliases them to
   `celebrate`/`pout`; in play that makes a small "+1" moment look like a
   victory and a tiny setback look like losing. A quick fist-pump (`cheer`)
   and a droopy sigh (`sad`) are distinct and used constantly.
3. **Memory budget — now enforced by loading on demand.** Sets now load only
   for characters that appear (the party, hovered characters, the sprite
   viewer), not all at boot. Still, aim for **≤ 1.5 MB on disk and ≤ 25 MB
   decoded per character** (`validate.py` prints both; Felicity is 1.3 MB /
   15.9 MB). With multi-frame poses, keep frames trimmed and `bodyHeight`
   ≈ 300–320 (the largest in-game draw is ~1.5× of `h` ≈ 270 px).
4. **Groups.** The KPop Girls are three sets drawn together: identical
   `bodyHeight`, identical pose list and frame counts, and slightly
   different idle timing (vary `dur`) so they don't move in lockstep. Give
   each girl her own `celebrate`/`dance` personality (see §4.4).
5. **Followers.** Fellowfox needs only movement + reaction poses as a
   follower, **but** she is now also a standalone pet in Pet Spa
   (`new Actor('fellowfox')`, scale ~110 px). Pets need: `idle`, `sad`
   (muddy), `shake` (wet-dog), `eat`, `giggle` (squirm while scrubbed),
   `catch-toy`, `celebrate`, `dance` (brushed). The same applies to **Fox,
   Cotton Candy, The Last Unicorn and Hotdog**, who are Pet Spa's pets too.
6. **Non-humanoid "hands".** Follow §3.6: Bronze grips with the pipe, ponies
   and foxes with the mouth, Cake balances things on top. Games attach wands,
   brooms, jars and watering cans at `hand` — check those three props in the
   viewer's debug overlay for each animal.
7. **Mermaids.** Marina and Scale glide (`motion: 'glide'`); their `walk` is
   a tail-swish glide, `ride` is side-saddle, `jump` is a tail flip. Keep the
   foot anchor at the bottom of the tail curl so the shadow sits right.
8. **Portraits are seen tiny.** HUD chips draw them in a 30 px-radius circle.
   Keep the face big and centered (eyes ~45% from the top), and check them at
   60 px across before committing.
9. **Test in real games, not just the viewer.** The quickest check:
   `?game=crown-keeper&players=2&auto=1&skipintro=1&chars=<id>,fox` (crown on
   head + dash + hurt), `wizard-quickdraw` (wand at hand, `ready` held long),
   `broomstick-dash` (ride), `pass-the-present` (carry overhead),
   `fashion-show` (glasses/necklace/wings), and a results podium. The lead's
   per-frame pose logger pattern: hook `Actor.prototype.draw` and record
   `this.pose` for your `charId`.

### R3.3 Already delivered (as of this round)

Approved canonicals for every NPC (Glimmer, Shadow Imps ×3, Professor Hoot,
Garden Fairies ×5, Grumpy Broccoli, Storm Cloud); sprite sets for
**Felicity, Fellowfox, Bronze, Troll and Glimmer**; the logo, title, menu,
how-to, results and marathon backdrops; `bg/<id>` for all 20 games (plus
`fairy-garden-night`, `fashion-show-dressing`, `art-gallery`); `thumb/<id>`
for all 20; props `giant-cake`, `cake-platform`, `seat-cloud`, `present`,
`crown`. All of it renders in game with no errors (checked by the lead).

### R3.4 Next requests, in priority order

**A. Finish the approved NPCs (they're designed but not usable in play yet).**
- **Shadow Imp sprite set** (+ base art `assets/characters/shadow-imp.webp`
  and the two color variants): `idle` (bounce), `dance-up`, `dance-down`,
  `dance-side`, `dance-star` (spin), `laugh`, `surprised` (eep), `poof`.
  Register a `SHADOW_IMP` entry in `src/data/characters.js` (shape like
  `GLIMMER`, `motion: 'glide'`). Pop Star Stage switches to it
  automatically; the lead will wire Spotlight Dance-Off (still procedural).
- **Professor Hoot**: at minimum the cut-out `prop/professor-hoot`
  (~260×340, feet at the bottom edge) from the approved canonical — both
  Wizard Quick-Draw and Potion Class draw it today if it exists. Better: a
  small sprite set (`idle` + blink, `talk`, `point`, `hoot`, `laugh`,
  `lantern`, `surprised`) and the lead will switch both games to an Actor.
- **Cut-outs from approved canonicals:** `prop/treat-broccoli` (Sprinkle
  Catch), `prop/storm-cloud` (Broomstick Dash), `prop/fairy-pink|blue|
  yellow|green|purple` (~128 px, wings spread; the lead will switch Fairy
  Count and Fairy Garden from drawn fairies to these).
- **Troll**: own `run`, `ready`, `pout`/`sad` and portraits (validate.py
  lists them missing; he's the solo opponent in two games and loses often).

**B. Felicity / Fellowfox / Bronze upgrades** (R3.2 items 1–2): multi-frame
`idle` blink, `celebrate`, `pout`, `dance`, `ride`; own `cheer` and `sad`
keys; then the most-used round-2 poses: `sing`, `water`, `count`,
`look-up`, `hold-present`, `toss`, `sooty`, `swim`, `sit`, `balance`, `blow`,
`float`. Fellowfox additionally the pet set from R3.2 item 5 (`giggle`,
`catch-toy`).

**C. Next roster sets.** Suggested order (the user may prefer another):
1. **Fox** — simplest quadruped, a player *and* a Pet Spa pet; validates the
   animal conventions (mouth `hand`, gallop `run`).
2. **Cotton Candy, The Last Unicorn, Hotdog** — the other pets; shared
   quadruped/pet pose list (R3.2 item 5).
3. **KPop Girls** (three sets together, R3.2 item 4) — very visible in the
   music games.
4. **Princess Amber, Snowstar** — humanoids, straightforward after Felicity.
5. **Marina, Scale** — mermaid conventions (R3.2 item 7).
6. **Birthday Cake** — no limbs; the most care (Bronze already proved the
   non-humanoid `hand` convention works).
Each set: Tier-1 poses + five portraits first, commit, then the rest.

**D. Remaining game art.** The Round 2 prop list minus what's delivered,
in this order (most visible first): `prop/balloon` (8 colors) and
`prop/balloon-pump`; `prop/gem` (5 colors + gold); Pet Spa tools (`sponge`,
`towel`, `brush`, `pet-treat`, `rubber-duck`, `shower-head`); Fairy Garden
`prop/plant-<kind>-<stage>` (30 images) and `watering-can`; Potion Class
`prop/ingredient-<id>` ×8; `prop/memory-card-back`; `prop/note-a|b|x|y`;
`prop/cookie-1…4`; `prop/broom`, `prop/star-ring`, `prop/owl-mail`;
`prop/vanity-mirror`. Each is drawn procedurally today, so any subset helps.

---

## Intake: optimize and test every delivery

Every sprite set delivery must be **optimized and tested in game** before it's
committed (full steps: `tools/sprites/README.md`, "Intake checklist"): run
`tools/sprites/optimize.py <asset>`, validate, then play it in real games with
both "Pictures: Optimized" (default) and `&quality=full`. Keep the originals —
the game's Settings screen can switch to them. For `felicity`,
`kpop-girl-center` and `princess-amber` also re-run
`tools/sprites/make_masks.py <asset>` (colour-variant region masks).

Colour variants (several players on one character) are recoloured in code
(`src/data/variants.js`), so no extra art is needed. Optional, for future
sets: a flat region-ID layer per frame (outfit, hair...) would replace the
hand-tuned colour ranges and the mask classifier.

## Re-generation requests (lead's in-game review)

Each item below was integrated and looked at in the running game. The code
works around every one today, so nothing is broken. A re-generation would
make it read better. Newest first; items move to "Resolved" once fixed.

| Key | What's wrong in game | Ask |
| --- | --- | --- |
| `prop/fishing-rod` (optional) | The rod fills only the middle 37% of its canvas (x 161–350 of 512) with a 2–3 px shaft, so in game it was a near-invisible hairline. A static rod also can't bend, and the rod bends on every nibble and tug as tension feedback, so the game now always draws the rod itself and this file is unused. | Only if rod art is wanted: 512×64, transparent, a chunky kid's rod **handle only** (cork grip plus a big yellow reel), butt at the left edge, the shaft's start at the right edge, filling the full width, about 24 px thick, navy outline. The code would draw it from the butt to the hand and keep its own bending shaft. Otherwise drop the key. |
| `thumb/cloud-hop` (optional) | The rain cloud frowns (the request asked for sleepy and content) and the trampoline is blue instead of the in-game pink-and-white stripes. | Same composition; make the rain cloud sleepy and content, and the trampoline pink-and-white striped like `prop/cloudhop-trampoline`. 800×500, opaque. |
| `prop/treasure-chest-open` (optional) | Drawn in 3/4 view (lid hinged to the right) while `prop/treasure-chest` is straight front-on, so the chest seems to turn when it opens. | Same front-on view, scale and outline as `prop/treasure-chest` (same plank and band layout and lock position), lid flipped up behind, heaped coins and a pearl necklace; 300×300, transparent, bottom-centre at the base, a few px of padding below the base. |
| `prop/golf-cookie-bridge` (optional) | The visible cookie is a thin 3.3:1 strip (411×123) inside the 440×230 canvas; the code trims it and stretches it to the 1.9:1 bridge, so the crackers become tall planks and the chips stretch. | Fill the 440×230 canvas edge to edge (≤8 px padding) at the requested 1.9:1: a wide graham-cracker bridge seen from above (e.g. two rows of square crackers, or one big cracker with perforations), chocolate chips, crumbs only inside the canvas. |
| `bg/snowball-splat` | The fence is painted at y≈270–365, not the requested 200–245, so players at the top of the play area stood on the fence rail. The code now starts the play area at y 345 while this background is in use (about 65 px of field lost). Pine trees and snowbanks also come well into the play area (x 90–1830, y 280–1028): bottom-left trees from y≈870, a bush at x 1110–1300 from y≈940, bottom-right trees from x≈1550 / y≈830, right-edge trees at x>1700 / y 380–760; players walk over them. The pond is perfect. | 1920×1080, opaque. Keep the cottages, pond (centre (960, 652), 205×88 plus a ~20 px rim) and style exactly. Move the fence up so its snowy base line is at y ≤ 250, with only sky, cottages and trees above it. Keep x 90–1830, y 260–1028 plain open snow (gentle drifts only); trees and banks only outside that box (x < 90, x > 1830, or y > 1028). When it lands, set `ARENA_TOP_ART` back to 280 in `snowball-splat.js`. |
| `prop/snow-wall-side` | The top face narrows from 170 px at the front to 60 px at the far end (a vanishing point), but the game has no perspective (front walls don't narrow), so it read as a tall white obelisk. The code now crops each row of the top face to its painted width, which leaves thin side outlines. | 176×1016, transparent, same style as `prop/snow-wall`. The top face (top 67%) must be a straight-sided strip **as wide as the front end the whole way up** (no taper), with a lumpy snow edge and a navy outline on both long sides and the far end. Bottom 33%: the front end with brick seams, as now. |
| `prop/jump-rope-bunny-pink-cheer`, `-sneaky`, `-oops`; `prop/jump-rope-bunny-mint-cheer`, `-sneaky`, `-oops` (optional) | The painted face never changes, so the bunnies' moods only show through an emote the code adds next to the head. The code already looks up these keys (`excited` uses `-cheer`). | 6 images, each 600×660, transparent: the same canvas, pose, outfit, feet point (300, 660) and shoulder points (343, 370) / (249, 367) as the base bunny, no arms; only the face changes. **cheer:** eyes closed in happy arcs, big open smile. **sneaky:** sleepy half-closed sly eyes, a little smirk. **oops:** squeezed-shut wince eyes, a small round "o" mouth. No sweat drops, zzz or sparkles (the code draws those). |

Engine-side notes from the same review: several keys are aliases of one
file (`prop/sky-cake` = `prop/giant-cake`, `prop/pump` = `prop/balloon-pump`,
`prop/gem` = `prop/gem-red`, `prop/cookie-tile` = `prop/cookie-1`). That's
fine; the code uses one of each pair.


### Resolved (integrated and checked in game)

- `prop/ing-rainbow-feather`, `ing-stardust-jar`, `ing-moon-drop`: now Potion Class ingredients (Rainbow Feather, Stardust, Moon Drop). Each class stocks a random 8 of the 11 on its shelf.
- `prop/cake-stand` v3: Cake Bakery's stand (plate stretched to the code's plate ellipse; the drawn stand is the fallback).
- `pump` pose (all 15 playable characters, 2 frames): Balloon Pump plays it while a player pumps; checked in game with 4 CPUs (2026-10-05).
- `prop/podium-1..4`: results podium blocks; the top face keeps its shape and only the front stretches to each place's height.
- `prop/confetti`: 8x4 atlas used by every confetti particle (column picked by the particle's hue; greys keep drawn rectangles).
- `prop/card-back` v2: the visible card is 272x391 (0.70) inside a 300x400 canvas, so the code trims the padding and stretches about 9% to the 0.76 cards. Reads fine.
- `prop/fizzle-puff` (green), `prop/hedge` (outlined), `prop/tiara-pearl` (silver), `prop/rock` (trimmed), `prop/balloon-<color>` (aligned), `prop/plant-<kind>-glow` v2 (clearly glowing): drop-in.
- `prop/party-rug` v2: flat 2.6:1 oval, drawn under the circle without the old squash.
- `prop/cauldron` v2 (empty pot, rim opening 125x39 at 200,58), `prop/cauldron-bubbles` and `prop/potion-bottle` v2 (white liquid): recolored with a new neutral tint mode.
- `prop/danger-ring` v3: thin hazard-stripe ring (image agent updated Bumper Bounce's ring constant).
- `prop/storm-cloud-lightning`: bolt art under the storm clouds in Broomstick Dash (bigger on a zap).
- `prop/cookie-{2,3,4}-{cracked,crumbling}`: every flavor now shows art crack states in Cookie Crumble.
- `prop/cake-platform` v3 + `prop/cake-platform-crumble-1..3`, `prop/arena-cake-crumb-1..4`: Bumper Bounce's breaking edge (image agent integration, checked in game).
- `prop/cape-royal-side` delivered: four-legged characters wear it draped over the back in Fashion Show, recoloured for every cape colour (rainbow = stripes).
- `prop/cake-sponge-round/heart/star`: Cake Bakery multiplies the round sponge's crumb texture over every layer side (any shape, tinted by flavor; frosting band left smooth). The heart/star files are not needed for that and stay unused.
- `prop/plant-<kind>-seed` v2 and `bg/fairy-garden(-night)` v2 (overhead): image agent integration, checked in game.

- `bg/potion-class`: recipe content now aligns with the painted blackboard; in-game review passed, so no regeneration is needed.
- `bg/fairy-garden` day/night v2: matching overhead lawns, integrated and reviewed with the night glow cross-fade.
- `prop/arena-cake-crumb-1..4`: navy outlined pink-frosted variants, alternated by Bumper Bounce.
- `prop/cake-stand` v3: 500x200 low white/lilac stand with a higher plate view and very short base; provided for future bakery use.
- Six `prop/plant-<kind>-seed` v2 images: tiny bottom-anchored soil stages on consistent 256-square canvases; the consumer preserves that framing.
- Plain neutral `prop/cake-layer-round|heart|star`: shape aliases for the sponge art; round crumb texture is integrated into configurable bakery layers.

- `prop/cake-platform` v3: 1024x680 broad top and shallow front band, with three independently transparent damage rings. Bumper Bounce maps the fallback's new geometry and shows progressive crumble edges on the main arena.

- Snowstar and Birthday Cake: authored carry, four-frame dance and cast, plus full requested player vocabulary; published with optimized copies and reviewed in game.
- Troll windup/grab/cheer/wave/dizzy: hand points corrected to actual fists/palms, reviewed in full and optimized gameplay; published 7d11066.
- Professor Hoot: distinct two-frame point/laugh/bravo and corrected original face/wing points; Potion Class uses the new reactions, published fb24927.
- Glimmer and all five Garden Fairies: unique wing cycles, blink and fairy rear turns; head size/skin colors preserved, reviewed in both quality modes, published 4a6343a.

- Fox ride/dance/think/dance-star: head scales matched and ride anchor on belly/paws; eat/catch/look-around/strike2/strike3/fall/bow attachment points individually corrected. Full 75-key set reviewed with optimized copies in Broomstick Dash.

- Princess Amber: four-frame dance scale corrected; original landmarks re-annotated. Full 74-key set includes card-reaching flip and peace-sign photo, with refreshed color masks and both-quality rhythm-game review.

- `prop/cape-royal-side`: 520x300 red velvet animal-back cape with right collar and ermine trim; integrated Fashion Show consumer and reviewed on Fox in full mode; optimized loader regression checks passed.

- Marina and Scale: complete75-key/92-frame/five-portrait sets, matching neutral blink and full per-frame attachment landmark review; paint and card-reach art included, optimized export fresh.
- Hotdog: complete75-key/96-frame/five-portrait set, repaired original dance tails and all attachment points, reviewed Spotlight Dance full and Pop Star Stage optimized.

- Cotton Candy: full75-key/96-frame/five-portrait set, repaired run size, broom anchors, Pet Spa giggle scale and source-local mouth attachments; full Broomstick Dash and optimized Pet Spa reviewed.

- KPop trio: each74 keys/96frames/sixportraits; corrected original and new hand/eye points, preserved complete boot crops, fresh center recolor masks including true rear turn. Reviewed full Pop Star Stage and optimized Spotlight Dance with alternate outfits.

- Unicorn: full75-key/98-frame/six-portrait set, reviewed source-local muzzle/horn attachments and turned/low-face points, fresh optimized copy; full Wizard Quickdraw and optimized Broomstick Dash reviewed.

## New Play Studio game: melody-maker

### melody-maker — Melody Maker   (requested by the melody-maker agent, 2026-10-05, priority: nice-to-have)

A step-sequencer music garden (`src/games/melody-maker.js`). Everything below
is drawn procedurally today and each key drops in with no code change
(`art()` / `drawArt()` lookups are already in place). Use the §10.5
background and §10.6 prop templates; sizes are logical px at 1080p.

**Pitch-row colours** (the flowers and notes use these; low → high, key
number in brackets): red `#ff5a6e` (1), orange `#ff9f1c` (2), yellow
`#ffd23f` (3), green `#6fdc5a` (4), teal `#2fd3c0` (5), blue `#3fa7ff` (6),
purple `#9b6bff` (7), pink `#ff6fd0` (8).

#### Backgrounds and thumbnail

| Key | Size | What | Layout constraints |
| --- | --- | --- | --- |
| `bg/melody-maker` | 1920×1080, opaque | Front view of a sunny garden bandstand at golden hour: pastel pink-to-lavender sky, soft clouds, rolling green hills, a string of fairy lights along the very top, and a **wooden stage floor from y≈812 to the bottom** (warm honey planks with a darker front lip at y≈812). | The code draws the button bar (y 16–100), a big cream music panel (x 22–1636, y 118–798) and a legend card (x 1650–1898, y 118–798) on top, so the area above the stage may stay simple. Characters stand on the stage at y≈1064 and speakers sit at both stage ends. When this art exists the code stops drawing its own stage planks. No characters, no text. |
| `bg/melody-maker-concert` | 1920×1080, opaque | Front view of a cosy evening concert stage in the garden: dark plum backdrop with twinkly stars and fairy lights, a warm wooden stage floor from y≈860 down. | Code draws red curtains at both sides (~100 px each, plus a valance in the top 34 px), a strip of song cards at y 54–224, performers centre stage with feet at y≈900, and a row of singing flowers along the front at y≈1030. Keep the middle uncluttered; no characters, no text, no curtains. |
| `thumb/melody-maker` | 800×500, opaque | Two characters (e.g. Felicity and the Unicorn) on a garden stage beside a giant rainbow music grid of bells and singing flowers, music notes floating up, golden playhead glow. | Matches the other `thumb/<id>` cards; no text. |

#### Props and icons (transparent PNG → WebP, centred unless noted)

| Key | Size | What / anchor | Used for |
| --- | --- | --- | --- |
| `prop/melody-flower-1` … `prop/melody-flower-8` | 160×160 | A round smiling flower head (6 petals, cream face, rosy cheeks, closed-mouth smile, eyes open) in the row colour above (1 = red … 8 = pink). Head only, no stem; centred on the face; fills ~90% of the canvas. | The singer at the left of each pitch row (drawn at ~60 px) and the flower chorus in the concert (~96 px). |
| `prop/melody-flower-1-sing` … `prop/melody-flower-8-sing` | 160×160 | Same flower and framing, singing: eyes happily closed, mouth open in an "O" / "la". | Shown for ~0.4 s each time its row's note plays (falls back to the idle art). |
| `prop/melody-note-bells`, `prop/melody-note-piano`, `prop/melody-note-marimba`, `prop/melody-note-choir` | 128×128 | Note tokens drawn in **neutral white/light grey with soft grey shading** and navy outlines; the code multiplies them with the row colour. Bells: a small handbell with a clapper. Piano: a single rounded piano key with a little black key on top. Marimba: a short rounded wooden bar with two pins (wide, ~2:1). Choir: a round smiley face singing "la" (eyes closed, open O mouth). | Every placed note (drawn at ~56 px, bounces when it plays). |
| `prop/melody-kick`, `prop/melody-clap`, `prop/melody-shaker` | 128×128, full colour | Kick: a small coral bass drum, side view, white zigzag lacing. Clap: two clapping hands with a yellow burst behind. Shaker: a green spotted maraca. | Drum-lane notes (~46 px) and the drum players in the concert (~110 px). |
| `prop/melody-speaker` | 150×220, bottom-centre anchor | A cute purple stage speaker cabinet with two yellow cones (no face needed). | Both ends of the stage in the editor. (The cones thump by code only when drawn procedurally.) |
| `icon/inst-bells`, `icon/inst-piano`, `icon/inst-marimba`, `icon/inst-choir` | 128×128, full colour | Instrument badges: a gold handbell with a wooden handle; a mini keyboard (white keys, 3 black keys); a rainbow xylophone with a mallet; a pink singing face with a music note. | Each player's "sound" badge on their cursor, above their character, and held in their hand during the concert (24–44 px). |
| `icon/tortoise`, `icon/hare` | 128×128, full colour, facing right | A friendly green tortoise; a white bunny mid-hop. | The Speed button (slow / fast). |

**Reused, no new art needed:** `icon/eraser` (Clear button), `icon/undo`
(undo badge), `prop/confetti` (concert confetti), `applause` sfx.

**Prompt lines** (fill the §10.6 template):
- Flower: "A single round cartoon flower head with six soft <colour> petals and a cream face with rosy cheeks, two dot eyes and a small smile (sing version: eyes closed in happy arcs, mouth open in a round O, singing). Front view, centered, entirely visible with margin, no stem."
- Note tokens: "A single <handbell | rounded piano key with a small black key on top | short rounded wooden marimba bar with two pins | round smiley face singing with an open O mouth>, rendered in plain white and light grey only (it will be recolored in code), bold navy outline. Front view, centered."
- Instrument badge: "A single <object> as a chunky game icon, front view, centered, fills the canvas."

## New Play Studio game: bead-bracelets

### bead-bracelets — Sparkle Bead Shop   (requested by the bead-bracelets agent, 2026-10-05, priority: nice-to-have)

Everything below has a procedural fallback that ships today (glossy vector
beads, drawn charms, trays, cards and shop). The code already looks up every
key, so a file listed in `assets/art/index.json` drops in with no code
change. House style: navy `#24163f` outlines, soft cel shading, glossy
highlights, **no text** in any image. Reused as they are: the roster sprites
(`pose-twirl`, `photo`, `strike2`, `strike3`, `cheer`, `celebrate`, `think`,
`action`, `wave`), and Glimmer, Professor Hoot and Fellowfox as customers.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/bead-bracelets` | 1920×1080, opaque | Full screen behind the split stations. It shows as side columns at 1 player and as top/bottom bands at 2–8 players. Keep the top ~110 px calm (the HUD band sits there) | A cozy pastel bead boutique wall: pink-and-cream vertical stripes, wooden shelves along the far left and right edges holding glass jars full of colourful beads, a swag of giant beads hanging across the top, a warm wooden floor strip at the bottom. Low detail in the centre (stations cover it) |
| `bg/bead-bracelets-station` | 1290×900 (ratio 860:600), opaque | Stretched over one station. **The layout must match:** wall from y=0 to about y=37% (222/600), a rounded wooden counter edge at 37%, wooden counter top below. The customer stands at the far left behind the counter; the code draws the pattern card and display shelf on the wall | A bead-shop counter seen from the shopkeeper's side: soft pastel wallpaper with tiny polka dots on the upper 37%, a honey-wood counter lip, then a light wooden counter top with faint grain. Nothing on the counter (the code draws the string, tray and beads) |
| `bg/bead-bracelets-mirror` | 1920×1080, opaque | Full screen for the finale. Characters stand on the floor band from y≈740 to y≈960; a camera punch zooms in up to 1.18× | A boutique dressing nook with a giant arched gold mirror (rounded top, bulb lights around the frame) filling almost the whole picture. The glass is pale blue-lilac with soft diagonal sheen streaks, with a pink carpet floor reflected at the bottom. No characters |
| `thumb/bead-bracelets` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Cotton Candy at a bead-shop table holding up a finished bead bracelet (hearts, stars, a gold heart charm), a strand of pink-heart and blue-star beads with a needle in the foreground, sparkles. Subject centred |
| `prop/bead-atlas` | 768×576 (8 columns × 6 rows of 96 px cells), transparent | One cell per bead, drawn centred at 2.3 × the bead radius. **Columns are colours, in this order:** pink `#ff7ac6`, red `#ff4d5e`, orange `#ff9f1c`, yellow `#ffd23f`, mint `#4fd98a`, sky `#4fb8ff`, purple `#a77bff`, pearl `#f3ecfa`. **Rows are shapes:** heart, star, round, flower, moon (crescent opening to the upper right), gem (faceted, table at the top). Each bead fills ~85% of its cell, centred, front view, upright | Glossy plastic/glass craft beads for kids: chunky and candy-bright, with a navy outline, a white highlight at the upper left and a tiny string hole on the round bead. All 48 must share lighting, outline weight and scale so a mixed bracelet looks uniform |
| `prop/charm-heart`, `prop/charm-star`, `prop/charm-crown`, `prop/charm-butterfly`, `prop/charm-shell`, `prop/charm-cupcake`, `prop/charm-rainbow`, `prop/charm-horn` | 128×128 each, transparent | Drawn centred, fitted to 2.5 × the bead radius. On the string the code hangs it from its own jump ring, so the image needs **no ring** and should be centred in the canvas | Little jewellery charms: a gold heart locket with a pink gem; a gold star; a gold crown with three gems; a pink-and-purple butterfly; a peachy scallop seashell; a cupcake with a blue wrapper, pink frosting and a cherry; a small four-stripe rainbow with clouds; a gold-and-pearl spiral unicorn horn |
| `prop/bead-tray` | 1300×392 (ratio 650:196), transparent | Stretched over the tray rect. The code draws the bead dimples and beads on top, so the inner area must be plain (from 36 px in at the sides and 14 px at the top and bottom, in 650×196 units) | A shallow wooden craft tray with a rounded honey-wood rim and a deep purple velvet lining, seen from above at a slight angle |
| `prop/pattern-card` | 812×376 (ratio 406:188), transparent | Stretched over the customer's order card; the code draws a speech tail on the left. Keep the top 30 px band and the centre plain: beads go across the middle, and a Y hint glyph sits at the lower right | A cream recipe-style card with a pink washi-tape band at the top, a red pushpin at the top centre and slightly curled corners |
| `prop/bead-shelf` | 448×288 (ratio 224:144), transparent | Stretched under the display of finished bracelets. The pegs are at fixed spots (two rows of three) and the code draws the bracelets on them | A small honey-wood pegboard display stand: a plain board with a pale pattern of pegboard holes |

Optional: the game already asks for the `pose-twirl` pose. Frames for it
for every roster character would replace the code's horizontal squash-spin.

## New Play Studio game: dream-room

_Requested by the dream-room agent, 2026-10-05. Priority: nice-to-have. The
game is fully playable without any of this: every key below has a
procedural fallback, and the code picks the art up automatically once the
key is in `assets/art/index.json`._

**How the room is built.** A cut-away dollhouse bedroom: back wall
x 420–1500, y 200–590; floor from y 590 (back) to y 930 (front, x 270–1650);
two side walls in perspective (door and light switch on the right one); a
pink roof with the title ribbon above. Wallpapers and floors are drawn by
code (they are swappable patterns), so they are **not** requested. Items
stand on the floor (bottom-centre anchor) or hang on the wall (centre
anchor) and are scaled by depth (×0.78 at the back wall, ×1 at the front).

**Item art rules (all `prop/room-<id>`).**
- Transparent WebP, quality 86, lossless alpha, ≤ 60 KB each. House style:
  navy outlines, cel shading, cute and rounded, soft pastel colours. No text.
- The code fits each image into the item's box (listed below) keeping its
  aspect ratio. Floor items are **bottom-centre anchored** (feet or legs on
  the bottom edge of the canvas). Wall items and rugs are **centred**. Trim
  to the object, with no extra padding.
- Paint the main fabric or paint in the colour listed. The Paint tool
  recolours the art in code (the new colour's hue and saturation over the
  art's own shading), so keep the colourable part in that one colour and
  the other parts (wood, metal, white trim) neutral.
- Draw items from the front and a little above, like the room. Not top-down.
- Items that animate stay procedural and are not requested: fairy lights,
  lava lamp, fish bowl, music box, balloon, butterflies, mirror, bunting,
  rainbow rug, plushies, and the character poster and picture.

### Backdrop and thumbnail

| Key | Size | Description |
| --- | --- | --- |
| `bg/dream-room` | 1920×1080, opaque, ≤ 350 KB | The playroom **around** the dollhouse: a soft pastel lilac or pink wall with faint stars or polka dots, a blurred toy shelf or window light at the far left and right edges, and a light wooden table top from y≈930 to the bottom. Keep x 250–1670 and y 20–950 plain and soft, because the dollhouse, roof and title are drawn on top. The top-left (x 0–260, y 0–350) and top-right (x 1660–1920, y 0–200) corners hold UI panels, and the characters stand in the bottom corners. |
| `thumb/dream-room` | 800×500 (16:10), opaque, ≤ 90 KB | Menu card: a cozy pink-striped bedroom seen from the front: a window with pink curtains, a white bed with a pink polka-dot blanket and a heart headboard, a unicorn plushie on the pillow, a nightstand with a glowing yellow lamp, a round purple rug, a teddy bear, a potted plant, fairy lights and a framed picture. Warm and sparkly. No text. The code's `drawIcon` shows this layout today. |

### Furniture (`floor`, bottom-centre anchored)

| Key | Canvas | Box in game | Colour to paint | Notes / prompt |
| --- | --- | --- | --- | --- |
| `prop/room-bed` | 720×424 | 360×212 | blanket **pink #ff8fc2** | Side view, headboard on the **left** (the code flips it). Cream wooden frame, a tall rounded headboard with a heart cut-out, a lower rounded footboard, a white mattress and pillow, and a pink polka-dot blanket over the right two-thirds with a folded top edge. The mattress top must sit about **54% of the height up from the bottom**, because characters bounce on it and plushies sit there. |
| `prop/room-nightstand` | 232×252 | 116×126 | paint **cream #fff1e2** | Small two-drawer bedside table with gold round knobs and short legs. Flat top at the very top of the canvas, since small items sit on it. |
| `prop/room-armchair` | 380×332 | 190×166 | fabric **pink #ff8fc2** | Front view: a puffy rounded armchair with tufted back buttons, a plump seat cushion, round arms and little wooden legs. Seat cushion top at about 50% of the height. |
| `prop/room-beanbag` | 320×224 | 160×112 | fabric **pink #ff8fc2** | Squishy teardrop beanbag with a dent where you sit and a shiny highlight. |
| `prop/room-dresser` | 428×332 | 214×166 | paint **cream #fff1e2** | Three-drawer dresser with two gold knobs per drawer and a flat top, since items sit on it. |
| `prop/room-bookshelf` | 320×512 | 160×256 | paint **cream #fff1e2** | Tall bookcase with three shelves full of rainbow books (a few leaning) and a flat top. |
| `prop/room-toychest` | 372×240 | 186×120 | paint **cream #fff1e2** | Toy chest with a rounded lid, two wooden straps and a big gold star on the front. |
| `prop/room-desk` | 472×296 | 236×148 | paint **cream #fff1e2** | Simple writing desk with two legs on the left, a two-drawer unit on the right and a flat top. |
| `prop/room-rockinghorse` | 440×340 | 220×170 | mane and saddle **pink #ff8fc2** | Side view, head on the **right**: a cream wooden rocking horse on curved wooden rockers, with a pink curly mane, tail and saddle and a happy face. The bottom of the rockers sits on the canvas bottom, because the code rocks it around that point. |
| `prop/room-dollhouse` | 300×320 | 150×160 | roof **pink #ff8fc2** | A tiny toy dollhouse: cream walls, a pink roof with a white heart, blue windows and a little door. |
| `prop/room-petbed` | 320×140 | 160×70 | cushion **pink #ff8fc2** | Round, plump pet bed seen from the front and above: the **back half** of the rim plus the soft inner cushion. The code draws a kitty curled up on the cushion. |
| `prop/room-petbed-front` | 320×140 | 160×70 | cushion **pink #ff8fc2** | The **front half of the rim only**, aligned pixel for pixel with `room-petbed`, with a small paw print. It is drawn over the sleeping kitty. |

### Lights (the code adds the night glow)

| Key | Canvas | Box | Colour | Notes / prompt |
| --- | --- | --- | --- | --- |
| `prop/room-lamp` | 144×212 | 72×106 | shade **pink #ff8fc2** | Table lamp with a round cream base, a gold stem and a flared pleated shade. Bottom-centre anchored (it stands on tables and on the floor). |
| `prop/room-floorlamp` | 200×524 | 100×262 | shade **pink #ff8fc2** | Tall floor lamp with a thin pole, a round base and a flared shade at the top. |
| `prop/room-nightlight` | 128×144 | 64×72 | star **yellow #ffd23f** | A star-shaped night light with a sleepy smiling face (closed eyes) on a small round base. |

### Wall decorations (centre anchored)

| Key | Canvas | Box | Colour | Notes / prompt |
| --- | --- | --- | --- | --- |
| `prop/room-window` | 512×464 | 256×232 | curtains **pink #ff8fc2** | White window frame with a cross bar, a sill, a gold curtain rod and two pink curtains tied back with gold bands. **The glass must be transparent**: the code draws the day or night sky behind it in the rectangle x 84–428, y 64–384 of the 512×464 canvas (window centre at 256, 232). |
| `prop/room-poster` | 300×392 | 150×196 | paper **cream #fffaf0** | Taped-on poster: a rainbow arching over two fluffy clouds, with a few stars, hearts and sparkles. |
| `prop/room-clock` | 232×248 | 116×124 | body **pink #ff9ec4** | Round alarm clock with two gold bells on top and little feet. **No hands**: the code draws them at the real time, and the face centre is at (116, 136). |
| `prop/room-shelf` | 428×120 | 214×60 | paint **cream #fff1e2** | A floating wall shelf: a plank with two little brackets underneath. The top of the plank must be at **y≈36** of 120, because plushies and lamps sit there. |

### Plants, toys and rugs

| Key | Canvas | Box | Colour | Notes / prompt |
| --- | --- | --- | --- | --- |
| `prop/room-plant` | 260×412 | 130×206 | pot **pink #ff9ec4** | Big leafy house plant (monstera-like) in a pot with a white heart. Bottom-centre anchored. |
| `prop/room-flowers` | 140×216 | 70×108 | vase **pink #ff9ec4** | Little vase with a daisy, a pink tulip and a purple flower. |
| `prop/room-cactus` | 128×192 | 64×96 | pot **pink #ff9ec4** | Cute cactus with two arms, a smiling face, blush and a pink flower on top, in a small pot. |
| `prop/room-teddy` | 172×188 | 86×94 | fur **brown #c98a5a** | Sitting teddy bear with a pink bow tie. |
| `prop/room-ball` | 120×120 | 60×60 | **red #ff4d6d** stripes | Beach ball with red, white and yellow wedges. |
| `prop/room-blocks` | 200×180 | 100×90 | **pink #ff6fb1** | Three toy blocks, two on the bottom and one on top, with heart, star and circle symbols (no letters). |
| `prop/room-rug-round` | 660×280 | 330×140 | **pink #ff9ec4** | Round rug seen at a low angle (a wide 2.4:1 oval) with pink, white and light-pink rings. Centred. |
| `prop/room-rug-heart` | 660×300 | 330×150 | **pink #ff9ec4** | Heart-shaped fluffy rug, flattened by the same low angle, with a lighter inner heart. |
| `prop/room-rug-star` | 740×320 | 370×160 | **pink #ff9ec4** | Star-shaped rug, flattened the same way, with a lighter inner star. |

**Reused existing art (no new image needed):** `prop/rubber-duck` (the
rubber duck toy, recoloured), `prop/present` (the present toy and the
surprise box, recoloured), `prop/balloon-<colour>` (the balloon toy, 8
colours), every character's base art (plushies with a stitched white
outline, and the star poster) and the portraits (the framed picture).

**Poses the room tour uses** (already in `POSES`, with fallbacks): `sit`
(in the armchair or beanbag), `jump` and `fall` (bouncing on the bed),
`dance`, `wave`, `cheer`, and `photo` (a peace sign for the group photo).
Authored frames for `sit` and `photo` would help the most.

## New Play Studio game: seek-and-find

_Hide & Seek Picnic_ (requested by the seek-and-find agent, 2026-10-05,
priority: nice-to-have). The game is fully playable today: every scene,
occluder and creature is drawn in code, and the objects already use existing
props (`prop/golden-cupcake`, `prop/treat-cupcake`, `prop/rubber-duck`,
`prop/gem-blue|purple|green`, `prop/topper-strawberry`, `prop/topper-star`,
`prop/crown-gold`, `prop/tiara-star`, `prop/wand-star`, `prop/treat-lollipop`,
`prop/treat-donut`, `prop/owl-mail`, `prop/present`, `prop/lantern-on`,
`prop/potion-bottle`, `prop/ing-snow-crystal`, `prop/ing-moon-drop`,
`prop/fairy-pink|blue|yellow`, `prop/firefly`, `prop/cookie-1`, the
`prop/balloon-<color>` set, `prop/plant-*-bloom` / `prop/plant-*-glow` for
flower clumps and `prop/plant-glow-mushroom-glow` for the big forest
mushrooms). The friends who hide are the players' own characters plus
Fellowfox, Glimmer and Professor Hoot (their sprite sets).

**How a scene is built (read before drawing anything).** Each round has three
layers: (1) a **back layer** `bg/seek-and-find-<scene>` with no hiding places
in it; (2) the hidden things, drawn by code; (3) **occluders**: separate props
(`prop/seek-<type>`) that the code places on top at the positions below, and
that the hidden things peek out from behind. The code measures how much of
each hidden thing shows past the occluder's actual pixels, so occluder art
can have any silhouette. It must be **opaque** wherever it should hide things
(soft or semi-transparent edges count as see-through). Half the time a scene
is **mirrored left-right**, so nothing may contain text and the back layer
must look fine flipped. Positions are in the 1920x1080 canvas, unmirrored.
"Base" = the bottom center of an occluder. Keep the top 120 px calm (player
chips and round icons sit there) and the bottom 170 px plain (the picture
list and the controls legend cover it).

### Backgrounds (`bg/<key>`, 1920x1080, opaque, WebP q80-85, <= 350 KB)

| Key | Prompt-style description | Must line up with (unmirrored px) |
| --- | --- | --- |
| `bg/seek-and-find-picnic` | Sunny spring meadow for a picnic, gentle three-quarter view: soft blue sky with 3-4 puffy clouds and a cheerful sun in the top-right corner, rolling pale-green hills with tiny round trees on the horizon (y about 470-540), a bright meadow sprinkled with tiny daisies, a winding sandy path from the bottom right up to the hills, a small blue pond on the left with two lily pads, and a red-and-white gingham picnic blanket in the middle with a large plate, a smaller plate, a blue flowered teapot and two cups. No bushes, trees, rocks, logs or tall grass (code adds those). | Blanket corners (690,640) (1190,640) (1270,822) (610,822). Plates centered at (842,734) rx 70 and (1036,780) rx 54 (code draws cupcakes and cookies on them). Teapot at (960,690). Pond ellipse center (330,770), radii 250x86. Lily pads at (250,792) and (436,774) (things sit on them). Sun near (1760,112). |
| `bg/seek-and-find-toyshop` | Cozy pastel toy shop, straight-on: pink-and-cream striped wallpaper with little white stars, a mint wainscot band, bunting along the very top, a big four-pane window in the top center showing sky, clouds and a green hill, a white window sill, two tall empty wooden shelf units (left and right) with three shelf boards each, two small framed star pictures and a round wall clock, a warm wooden plank floor, and a big oval lilac rug in the middle of the floor. The shelves are empty except for a couple of small balls at the ends (code places books, jars and block towers on them). | Wall/floor line y = 710. Window frame (770,120)-(1150,410); sill top y = 400 from x 740 to 1180 (things sit on it at (860,404) and (1060,404)). Shelf units x 60-500 and x 1400-1860, y 150-710; tops of the shelf boards at y = 336, 512 and 690. Rug center (960,830), radii 440x96. Curtains are code props hung at x 735 and 1185, so keep the sides of the window plain. |
| `bg/seek-and-find-forest` | Magical starry forest at night, three-quarter view: deep indigo-to-violet sky with soft stars, a big friendly yellow moon with a halo top-left, a row of soft dark-blue pine silhouettes on the horizon (y about 450-540), dark teal mossy ground with faint glowing specks, a path of softly glowing stepping stones winding up the middle, and a calm dark-blue pond on the right reflecting the moon, with two lily pads. Gentle and cozy, not scary; keep the middle readable (things hide there). **No fireflies anywhere** (finding fireflies is a task). No trees, bushes, mushrooms or ferns in the foreground (code adds those). | Moon center (330,170), r 68. Pond ellipse center (1460,775), radii 244x82; lily pads at (1400,792) and (1540,764). The ground starts around y = 556. |

### Thumbnail

| Key | Size | Description |
| --- | --- | --- |
| `thumb/seek-and-find` | 800x500, opaque, WebP q85, <= 90 KB | A sunny picnic meadow with a gingham blanket. A giant magnifying glass with a pink handle in the right half shows a golden cupcake hidden in the grass, magnified. A white bunny's ears and eyes peek over a round bush on the left, and a ladybug sits on the blanket edge. Optionally Felicity peeking from behind a tree trunk (use her canonical). No text. |

### Occluder props (`prop/seek-<type>`, transparent, bottom center = base)

The code fits each image (contain) into the box and stands it on the base,
so match the box aspect. Sizes are the box at scale 1; deliver at 1.5-2x,
because the zoom glass magnifies up to 2.4x. House style: bold navy outlines,
cel shading, soft colors. Types that also appear in the night forest need a
`-night` twin with the same silhouette in moonlit colors (dark teal leaves,
violet-grey rocks, glowing cyan/yellow accents).

| Key | Box (w x h) | Anchor / layout notes | Description |
| --- | --- | --- | --- |
| `prop/seek-tree` + `prop/seek-tree-night` | 430 x 552 | Base = middle of the trunk foot; roots reach 12 px below it. Trunk about 70 wide, with a dark round **hollow** centered 150 px above the base (an owl or a gem sits in it). Big round canopy from 230 to 540 px up, about 400 wide. | Big friendly cartoon oak: a round lumpy canopy of overlapping leaf clusters with a few red apples (night: dark teal leaves with tiny glowing yellow fruit), and a sturdy brown trunk with root flares and a round knot-hole. |
| `prop/seek-bush` + `prop/seek-bush-night` | 276 x 148 | Bottom center; dome shape, flat bottom. | Round leafy bush made of 5-6 overlapping puffs, with a few tiny pink flowers or yellow berries (night: dark teal with glowing berries). |
| `prop/seek-rock` + `prop/seek-rock-night` | 184 x 92 | Flat bottom; the top is fairly flat so a snail can sit on it (92 px up). | Smooth lavender-grey boulder with two crack lines (night: violet-grey with a cap of glowing green moss). |
| `prop/seek-log` + `prop/seek-log-night` | 256 x 84 | Lying on its side. The cut end, with a dark **hole**, is on the right, centered about 100 px right of and 34 px above the base. | Fallen log with bark lines, a ring-cut end with a dark hollow, and two tiny mushrooms on top (night: mossy, with glowing mushrooms). |
| `prop/seek-tuft` + `prop/seek-tuft-night` | 96 x 62 | Flat bottom. | Small clump of 6 pointy grass blades fanning out. |
| `prop/seek-reeds` + `prop/seek-reeds-night` | 220 x 156 | Flat bottom (stands on the back edge of the pond). | Cluster of tall pond reeds and 4 cattails. |
| `prop/seek-fern` | 200 x 126 | Flat bottom (night forest only). | Six arching dark-green fern fronds fanning out, with moonlit edges. |
| `prop/seek-basket` + `prop/seek-basket-back` | 200 x 136 (both) | The front is the woven body, the front half of the rim and the handle. The **back** image is only the dark inside and the back half of the rim, with a pink napkin corner. Things peek up out of the basket between the two, so the front must be opaque below the rim line (74 px up). | Classic wicker picnic basket, open, with an arched handle. |
| `prop/seek-books` | 160 x 100 | Stands on a shelf board; uneven top edge. | A row of 7-8 chunky colorful picture books standing upright, in different heights. |
| `prop/seek-blocks` | 180 x 154 | Stands on the base: a stepped pyramid of 6 cubes (3-2-1). | Wooden toy blocks with painted stars and dots in bright colors. |
| `prop/seek-jar` + `prop/seek-jar-back` | 88 x 116 (both) | A **see-through** glass candy jar: the glass must be mostly transparent (alpha under 40%), so a hidden lollipop shows through. The lid and the sweets are opaque. | Round glass sweet jar with a colored lid and three gumballs at the bottom. |
| `prop/seek-chest` + `prop/seek-chest-back` | 260 x 216 (both) | Front = the chest body (bottom 116 px) with its rim. **Back** = the open lid leaning back, and the dark inside. Things and friends peek up out of the chest between the two. | Pastel striped toy chest with a gold rim and a star on the front, lid open. |
| `prop/seek-curtain` | 180 x 604 | Hangs from the top (600 px up) to the floor. The **inner edge** (the right side, unmirrored) bows inward, with a gold tie-back 330 px up. Used twice (once mirrored) beside the window. | Soft pink velvet curtain with vertical folds and a gold tie-back. |
| `prop/seek-dollhouse` + `prop/seek-dollhouse-back` | 300 x 334 (both) | Front = walls and roof with **transparent window and door holes** at these rectangles, relative to the base: windows (-100,-200)-(-36,-144), (36,-200)-(100,-144) and (-100,-96)-(-36,-40); door (32,-100)-(88,0). Things are seen through them. Back = the warm interior wall (only needed behind the holes). | Cute two-storey dollhouse with a pink roof, a round attic window and flower boxes. |
| `prop/seek-bigteddy` | 240 x 256 | Sitting, flat bottom. | Giant sitting teddy bear with a red bow tie, cuddly and soft. |
| `prop/seek-presents` | 240 x 174 | Flat bottom. | Stack of three gift boxes (blue, pink, lilac) with ribbons and bows. |
| `prop/seek-drum` | 160 x 114 | Flat bottom; a drumstick rests on top at the right. | Toy drum with a zigzag pattern and a cream drumhead. |

### Hideable creature and toy props (`prop/seek-<id>`, transparent, centered)

Each one replaces a drawn version. Hidden things are small in the scene (the
height below, in px) and are also drawn big (about 80 px) on the picture
cards, so they need a clear, chunky silhouette that reads at both sizes.
Deliver at about 3x the scene height. The drawn versions animate (ears
twitch, tails swish, wings flap); with art, the code adds a gentle wobble,
hop or flap instead.

| Key | Scene height | Description |
| --- | --- | --- |
| `prop/seek-ladybug` | 28 | Top-down ladybug facing right: red shell with black spots and a center line, black head with two white eyes and curly antennae. |
| `prop/seek-bunny` | 74 | Sitting white bunny, front view: tall pink-lined ears, rosy cheeks, pink nose. The ears are the part that peeks out, so keep them long. |
| `prop/seek-butterfly` | 40 | Butterfly seen from above with wings open: pink upper wings with purple spots. |
| `prop/seek-snail` | 36 | Side-view snail facing right: pink spiral shell, pale yellow-green body, eyes on stalks, a smile. |
| `prop/seek-mouse` | 36 | Side-view grey mouse facing right: big round pink-lined ear, long pink tail curling up behind. |
| `prop/seek-bird` | 44 | Round little bluebird facing right: pale belly, orange beak, tiny head tuft. |
| `prop/seek-frog` | 42 | Sitting green frog, front view: big eyes on top, wide smile, pale throat. |
| `prop/seek-owl` | 58 | Small round purple owl, front view: ear tufts, big amber eyes (not Professor Hoot). |
| `prop/seek-scarf` | 46 | **Fox's lost scarf**: a knitted orange-and-cream striped scarf lying in a loose S-curve, with fringed ends. |
| `prop/seek-teddy` | 62 | Small sitting brown teddy bear with a pink nose. |
| `prop/seek-block` | 40 | One toy block in three-quarter view, pink with a yellow star on the front. |
| `prop/seek-ball` | 44 | Beach ball with red, white, blue and yellow segments. |

## New Party game: cloud-hop

### cloud-hop — Cloud Hop   (requested by the cloud-hop agent, 2026-10-05, priority: nice-to-have)

A vertical platformer race: everyone bounces up one shared sky tower of
clouds (side view) to a golden rainbow summit. The camera scrolls up; the sky
colour shifts with altitude in code (morning blue → lavender → sunset pink →
twilight purple with stars), so the background art is tinted over by the
code and should stay a calm, neutral sky. Every key below has a procedural
fallback that ships today and is picked up automatically once it is in
`assets/art/index.json`. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text**. Characters are drawn at 0.56–0.7
scale (≈ 75–130 px tall), so platforms are sized to match. Clouds are
squashed/stretched by code when bounced on, so keep them as single objects
with no cast shadows.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/cloud-hop` | 1920×1080, opaque | Screen-fixed behind everything (it does not scroll), then washed 35% toward the altitude colour by code. Code draws the sun/moon, parallax clouds, hot-air balloons and twinkles on top. Keep the top ~120 px and the right 140 px calm (HUD chips and the height track) | A soft, dreamy open sky with no ground and no horizon: a gentle pastel gradient (light blue at the top to pale pink-peach at the bottom) with a few very faint, wispy far-away clouds and tiny pale sparkles. Low contrast and low detail so foreground clouds and characters read clearly |
| `thumb/cloud-hop` | 800×500, opaque | Game-select shelf and how-to screen, drawn with `cover` fit (procedural `drawIcon` is the fallback) | A cheerful character bouncing high off a fluffy white cloud with motion lines, a stack of clouds climbing up the picture (a pink springy cloud, a grey sleepy rain cloud, a trampoline), a glowing gold star, and a big rainbow arch with a gold star on top at the summit, against a sunset-pink-to-lavender sky. Subject centred |
| `prop/cloudhop-cloud` | 512×200, transparent | A normal cloud platform, **stretched** (not aspect-kept) into a box (platform width + 20) × (≈96 px) for widths 160–250 px. The landing line (where feet touch) is about **16% down from the top edge** of the image; the puffy bumps rise slightly above it, the rounded body hangs below | A fluffy white cartoon cloud seen from the side: a row of round puffs on top, a soft rounded underside with pale periwinkle cel shading, navy outline, a small highlight on the top-left puffs. Optional tiny happy closed-eye face with pink cheeks on the lower body. Wide and fairly flat (about 2.6:1) |
| `prop/cloudhop-cloud-pink` | 512×200, transparent | Same box and landing line as `prop/cloudhop-cloud`. The super-bouncy cloud (launches you very high) | The same cloud shape in bubblegum pink with deeper pink shading, a surprised "ooh" face, little gold coil springs peeking out underneath, and a white sparkle. Looks bouncy and fun |
| `prop/cloudhop-cloud-rain` | 512×200, transparent | Same box and landing line as `prop/cloudhop-cloud`. Puffs away after one bounce (code fades/scales it and adds drops) | The same cloud shape in soft blue-grey, with a sleepy, content closed-eye face (not grumpy, not scary), two or three tiny light-blue raindrops dangling underneath |
| `prop/cloudhop-cloud-drift` | 512×200, transparent | Same box and landing line as `prop/cloudhop-cloud`. Slides left and right (code adds wind swooshes) | The same cloud shape in pale lavender with white highlights and a couple of tiny curly wind swirls on its sides |
| `prop/cloudhop-trampoline` | 384×200, transparent | Bottom-centre anchored 70 px below the landing line, fitted (aspect kept) into (≈190)×100 px. The **top of the trampoline mat is 30% down from the top edge** | A small round party trampoline on a little white cloud: a pink-and-white striped stretchy mat, yellow ball rims at the ends, short sky-blue legs, side view |
| `prop/cloudhop-bridge` | 1440×280, transparent | A wide rainbow bridge platform, **stretched** into 720×140 px centred 40 px below the landing line. The landing line is **21% down from the top edge**, flat across | A short, gently sagging rainbow-striped bridge (red, orange, yellow, green, blue, purple bands) with a navy outline and a white shine stripe, resting on a fluffy white cloud puff at each end. Side view, flat top |
| `prop/cloudhop-star` | 256×256, transparent | Collectible star, drawn centred and fitted into 72×72 px (code adds a soft glow and a gentle wobble) | A chubby glossy gold five-point star with rounded tips, navy outline, a white shine on the upper left. Optional tiny happy face |
| `prop/cloudhop-bubble` | 256×256, transparent | The rescue bubble that floats a fallen player back up, drawn centred over the character and fitted to ≈2.1 × the bubble radius (≈ 150–220 px). The character must show through it | A big round soap bubble: mostly transparent centre, an iridescent pink-blue-lilac rim, a white curved highlight at the upper left, a thin white outline |
| `prop/cloudhop-summit` | 1640×520, transparent | The goal, bottom-centre anchored 60 px below the summit landing line and fitted into 1640×520; the code draws a full-width golden cloud bank over the bottom ~70 px | A huge, glowing rainbow arch (seven bands with a navy outline and a white shimmer) spanning almost the full width, with a big chubby gold star on top at the centre and golden sparkles around. No ground: the arch feet are hidden by clouds drawn in code |
| `prop/cloudhop-balloon` | 260×360, transparent | Background decoration, centred and fitted into ≈ 75–110 × 100–155 px, drawn at 85% opacity drifting slowly | A cute hot-air balloon with candy stripes (pink and white), a little woven basket on ropes, navy outline, soft shading. Empty basket |

New sprite pose wished for (optional; the game reads fine with the
fallbacks): `spring-jump` (one-shot; fallback `dance-star` → `jump`) —
launching upward off a trampoline, arms straight up, knees tucked, big grin.
The game already uses the existing poses `jump`, `fall`, `dance-star`
(flutter hop / rocket), `float` (in the rescue bubble), `hurt`, `dizzy`,
`cheer`, `celebrate` and `pout`.

## New Party game: mini-golf

### mini-golf — Candy Mini-Golf   (requested by the mini-golf agent, 2026-10-05, priority: nice-to-have)

Everyone putts at the same time on a top-down candyland mini-golf green (3
short holes: gumdrop bumpers + a spinning lollipop spinner; a chocolate river
with a cookie bridge and a jelly bounce pad; a hairpin with a slope and a
donut warp). Every key below has a procedural fallback that ships today; the
code already looks each one up, so a file listed in `assets/art/index.json`
drops in with no code change. The course itself (mint felt, candy-cane rails,
the river, the slope) is drawn by code because its shape changes per hole.
The balls are drawn by code in each player's colour. House style: navy
`#24163f` outlines, soft cel shading, bright candy colours, **no text** in any
image. Props are seen **from above** (top-down, a slight 3/4 tilt is fine).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/mini-golf` | 1920×1080, opaque | Full screen, behind everything. The code paints the course over the middle (x 100–1820, y 240–935), so keep that area plain pink meadow. Top ~110 px sits under the scoreboard (keep calm). The bottom strip y 960–1080 is the sidewalk where finished players stand and cheer | A candyland meadow seen from above: soft pink cotton-candy grass with pastel sprinkles, lollipop trees, gumdrop bushes, candy-cane posts and ice-cream-cone shrubs around the edges, and a pastel rainbow-tiled sidewalk along the bottom edge. Low detail in the middle |
| `thumb/mini-golf` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A mint mini-golf green with candy-cane rails, a pink flag in the cup, three colourful golf balls rolling toward it, a gumdrop bumper and a spinning lollipop, a candy-cane putter in the foreground, sparkles. Subject centred |
| `prop/golf-gumdrop` | 128×128, transparent | Centred on each round bumper, fitted to 2.3 × its radius (≈ 70–92 px). Squashes when hit | A big shiny gumdrop seen from above at a slight tilt: a sugar-crystal dome (pink), round footprint, navy outline, white highlight |
| `prop/golf-lollipop` | 96×96, transparent | The candy at the end of each spinner blade, centred on the blade tip, drawn 62 px and **rotated with the blade** (the code draws the stick) | A round swirl lollipop seen straight from above: pink-and-white spiral, navy outline, glossy highlight. Perfectly round, centred |
| `prop/golf-spinner-hub` | 96×96, transparent | Centred on the spinner's axle, 68 px, rotated with the blades | A round peppermint-candy hub seen from above: red-and-white pinwheel stripes, a small gold cap in the middle |
| `prop/golf-donut` | 160×160, transparent | The warp entrance, centred, 120×120. The ball disappears into the hole (hole diameter ≈ 47% of the donut) | A pink-frosted donut seen from above with rainbow sprinkles; the hole is a deep magical purple swirl with tiny stars |
| `prop/golf-donut-exit` | 160×160, transparent | The warp exit by the cup, centred, 120×120 (same layout as `prop/golf-donut`) | The same donut with chocolate frosting and white sprinkles; the hole is a bright sparkly swirl |
| `prop/golf-jelly` | 160×160, transparent | The bounce pad, centred, 2.2 × its radius (≈ 132 px). The code wobbles it when a ball bounces | A round wobbly strawberry jelly pad seen from above: translucent red-pink, glossy highlights, a little heart in the middle |
| `prop/golf-cookie-bridge` | 440×230, transparent | Stretched over the bridge rectangle (220×115 in game units), crossing a chocolate river from left to right | A bridge made of a long golden graham-cracker cookie with chocolate chips, seen from above, slightly rounded corners, little crumbs on the edges |
| `prop/golf-flag` | 96×200, transparent | Bottom-anchored at the cup centre (pole foot = bottom centre of the image), drawn 64×134 | A golf flag on a red-and-white candy-cane pole with a pink pennant with a white star, slight 3/4 view (pole upright) |
| `prop/golf-cup` | 64×64, transparent | Centred on the hole, 56 px | A round mini-golf cup seen from above: dark inside, white rim, light felt edge |

New sprite poses (optional; the game works with existing poses today):

| Pose | Loop | Fallback (existing) | Description |
| --- | --- | --- | --- |
| `putt` | yes | `crouch` → `idle` | Standing side-on over the ball holding a putter low with both hands, knees bent, looking down (the code draws the putter) |
| `putt-swing` | no | `action` | A gentle putting stroke: arms swing the putter forward, then look up hopefully |

## New Party game: musical-cushions

### musical-cushions — Musical Cushions   (requested by the musical-cushions agent, 2026-10-05, priority: nice-to-have)

Musical chairs at a cosy party: fluffy cushions sit in a ring on a big round
rug, everyone dances around while the record player plays, and when the
needle lifts they race to plop down. Everything below has a procedural
fallback that ships today; the code already looks up every key. House style:
navy `#24163f` outlines, soft cel shading, bright candy colours, **no text**.
Characters use the existing `sit`, `dance`, `hip-bump`, `knockback`, `dizzy`,
`clap`, `pout` and `celebrate` poses.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/musical-cushions` | 1920×1080, opaque | Full screen under everything. **Layout must match:** back wall from y=0 to y=400 (floor line at y=400); a big round rug centred at (960, 735), radius 640×300 (ellipse); cheer mats on the far left (x 16–196) and far right (x 1724–1904), y 460–980. Keep the wall centre (x 620–1300, y 180–400) plain: the code draws the record-player table and two speakers there. Keep the top 110 px calm (score chips) | A cosy pastel party room seen from a high 3/4 angle: pink-and-lilac striped wallpaper with tiny hearts, two windows with an evening sky and pink curtains, balloon bunches in the top corners, rainbow bunting across the wall, a white wainscot; honey-wood floorboards; a huge round scalloped rug in pink, mint and cream rings with polka dots and a yellow star in the middle; small fluffy mats with pom-poms along the left and right edges. No furniture in the middle, no characters |
| `thumb/musical-cushions` | 800×500, opaque | Game-select shelf and how-to screen | Four fluffy pastel cushions in a ring on a round rug, two characters mid-dance about to dive for them, a pink record player with music notes flying out, party bunting. Subject centred |
| `prop/cushion-0` … `prop/cushion-7` | 280×224 each, transparent | Drawn bottom-anchored: the image bottom = the bottom of the cushion's front side, centred horizontally; fitted to 1.12× the cushion width (118 px at 1–4 players, smaller with more). The code squashes it when someone sits and hops it on the beat. Players sit on the top face | A plump square floor cushion seen from a high 3/4 angle (top face plus a thin front side), puffy bulging edges, a tufted button in the centre with soft creases, little tassels at the two back corners. Colours (top / button): 0 pink / yellow, 1 mint / pink, 2 lilac / yellow, 3 lemon / pink, 4 sky blue / white, 5 peach / mint, 6 coral / cream, 7 lime / lilac. All eight identical except colour |
| `prop/record-player` | 560×380, transparent | Drawn bottom-anchored on top of the code's little wooden table, fitted to 280×190 px, centre x 960, bottom y 316. The code draws the **tone arm** itself (pivot at the back right, needle resting on the disc left of centre), so leave the arm out | A cute retro pink suitcase record player, lid open behind, a black vinyl record with a yellow label on the platter, three candy-coloured knobs and a little speaker grille on the front. 3/4 view from slightly above |
| `prop/party-speaker` | 240×340, transparent | Bottom-anchored on the floor at (735, 408) and (1185, 408), fitted to 120×170; the code pulses it on the beat | A rounded lilac party speaker box with two round cones (small tweeter on top, big woofer below) with pink centres, a soft highlight on the left edge |

## New Party game: pancake-tower

### pancake-tower — Pancake Tower   (requested by the pancake-tower agent, 2026-10-05, priority: nice-to-have)

A diner-kitchen stacking game. Every player has a plate on a long pink
counter (one lane each, 1–8 lanes side by side) and a flying chef pan that
slides back and forth above the tower; A drops what is in the pan. Badly
stacked towers wobble and topple in a cartoon crash. Everything below has
a procedural fallback that ships today, and the code already looks up every
key. House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Stack items are seen **from the side,
very slightly from above** (a thin sliver of the top surface shows), so
they stack flush on each other. All props are transparent WebP, trimmed to
the object with no padding. Lane scale is 0.48× (8 players) to 1.25× (1–3
players) of the design sizes below, and the whole scene zooms out further
as towers grow, so props must read when small.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/pancake-tower` | 1920×1080, opaque | Full screen behind the lanes. The counter top edge is at y=920 (plates and characters stand on it); the counter front fills y 920–1080. The top ~120 px hold the scoreboard and timer; the middle is mostly covered by translucent lane columns, so keep it low-detail | A bright, cozy pastel diner kitchen: butter-yellow wall with soft white vertical stripes, a big round window with blue sky and clouds at the top centre, copper pans and whisks hanging along the upper left and right edges, a shelf with syrup bottles and a jar of strawberries at the far sides. A long counter across the bottom: pink marble top edge at y≈920, mint-and-white checker tiles on the counter front. Warm morning light |
| `thumb/pancake-tower` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A tall, slightly leaning stack of fluffy pancakes on a white plate with butter, strawberries and syrup dripping down, a smiling frying pan with a tiny chef hat flipping one more pancake high in the air above it, sparkles, pastel diner background. Subject centred |
| `prop/pancake` | 520×98, transparent | Bottom-centre anchored, **stretched** to the item box (pancake 200×30 design units → box 208×39). Stacks of these sit flush on each other | One fluffy golden-brown pancake seen from the side: a thick rounded slab with a darker cooked edge, a lighter fluffy top sliver, a few tiny bubbles on the rim |
| `prop/pancake-golden` | 754×104, transparent | Same as `prop/pancake`, box 302×42 (the extra-wide bonus pancake; the code adds twinkles) | An extra-wide magical golden pancake from the side: shiny gold-yellow, glowing edge, a few sparkles on its rim |
| `prop/waffle` | 458×130, transparent | Same, box 183×52 | A thick square Belgian waffle seen straight from the side: golden grid pockets on its front face, crisp edges |
| `prop/butter-pat` | 188×65, transparent | Same, box 75×26. Squashed flat (×0.45 tall, ×1.2 wide) by code when covered | A small pale-yellow butter pat block with soft rounded corners and a tiny melting drip |
| `prop/strawberries` | 322×110, transparent | Same, box 129×44. Squashed when covered | Three cute red strawberries with green leaf tops in a little cluster, seen from the side, sitting on a flat bottom |
| `prop/cream-swirl` | 291×150, transparent | Same, box 116×60. Squashed when covered | A white whipped-cream swirl in three tiers with a pointed tip and a red cherry on top, flat bottom |
| `prop/pancake-plate` | 780×80, transparent | Bottom-centre anchored on the counter (box 312×32 design units); the code adds a player-colour band at the bottom, so keep the plate white/pale | A plain round white diner plate seen from the side, slightly from above: a thin oval rim on top of a short tapered foot, soft blue-grey shading |
| `prop/chef-pan` | 740×264, transparent | Box 295×105 design units, bottom edge on the bowl's bottom; the bowl's centre is **42% from the left edge** of the image (the bowl spans 0–83% of the width, the handle the rest). The pancake sits in the bowl. The code tilts it to drop the pancake | A cute flying frying pan character: dark blue-grey non-stick bowl seen from the side with a friendly face (big eyes, rosy cheeks, smile) on its front, a lighter rim, a **short** wooden handle on the right angled up about 25°, with a tiny white chef hat perched on the handle end |
| `prop/syrup-bottle` | 320×480, transparent | Centred, box 100×150; the code rotates it to pour from the spout (spout up at rotation 0) | A cartoon maple-syrup bottle: rounded amber glass bottle full of syrup with a red cap, a cream label with a pink heart (no text), glossy highlight |

Poses: existing ones only (`idle`, `balance` while the tower wobbles,
`cheer`, `action`, `surprised`, `dizzy`, `celebrate`, `clap`).

## New Party game: pinata-party

### pinata-party — Piñata Party   (requested by the pinata-party agent, 2026-10-05, priority: nice-to-have)

A backyard birthday party: big crepe-paper piñatas swing on ropes from a
striped wooden frame, players whack them with padded party bats, and a
shower of candy bursts out for everyone to scramble after. Everything below
has a procedural fallback that ships today; the code already looks up every
key, so a file listed in `assets/art/index.json` drops in with no code
change. House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Piñatas are cute and friendly (they giggle
when hit); keep them cheerful, never scary. Characters reuse the roster
sprites (`action`, `cheer`, `celebrate`, `pout`, `hurt`, `dizzy`, `walk`, `run`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/pinata-party` | 1920×1080, opaque | Full screen, drawn as is. **Layout must match:** keep the top ~110 px calm (score chips sit there); a wooden crossbar spans the width at y≈145–170 (x 40–1880) on two candy-cane striped posts at x≈64 and x≈1856 that stand on the lawn at y≈470 (the ropes hang from the crossbar, the code draws ropes and knots); sky and trees above a white picket fence at y≈300–410; lawn from y≈400 to the bottom. The play area (x 100–1820, y 455–1035) must stay open, plain grass | A sunny backyard birthday party seen from a slightly raised angle: soft blue sky with puffy clouds and a sun at the upper right, round green trees behind a white picket fence with balloon bunches tied to it, a party table with a striped cloth, a small cake and presents at the back right just behind the fence line, rainbow triangle bunting hanging under a honey-wood crossbar held up by red-and-white striped posts at both edges, and a wide bright striped lawn with a few daisies |
| `thumb/pinata-party` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A rainbow star piñata with crepe-paper fringe and tassels swinging on a rope over a backyard lawn, a cute character swinging a striped padded party bat at it, wrapped candies, lollipops and one glowing golden candy bursting out with confetti. Subject centred |
| `prop/pinata-star` | 520×520, transparent | Body centre at pixel (260, 280); fills ~70% of the width; drawn rotated/squashed/twirled as it swings (scale ~0.7–1.1). The rope ties on at the **top point**, pixel ≈ (260, 100). The code adds the rainbow tassels on the four lower points, cracks over the middle and nothing else, so **include a cute face** (two eyes, smile, pink cheeks) | A classic five-pointed star piñata covered in horizontal rows of rainbow crepe-paper fringe (pink, orange, yellow, green, blue, purple), cute smiling face in the middle, front view |
| `prop/pinata-unicorn` | 520×520, transparent | Body centre (middle of the torso) at pixel (260, 280), facing **right**, spanning about x 80–480. The rope ties on the middle of the back, pixel ≈ (240, 232). The code draws the rainbow tail tassel at the rump (left) | A unicorn piñata in side view: pastel white, pink, lilac and sky crepe-paper fringe rows, a rainbow curly mane, a gold spiral horn, lilac hooves, a cute happy eye and smile |
| `prop/pinata-llama` | 520×520, transparent | Same placement as the unicorn: torso centre at (260, 280), facing right, rope on the middle of the back ≈ (240, 245) | A llama piñata in side view with a long neck and banana ears: cream, pink, mint and yellow fringe rows, a woven red/yellow/teal blanket with pom-poms on its back, a cute happy eye and smile |
| `prop/pinata-donkey` | 520×520, transparent | Same placement as the unicorn: torso centre at (260, 280), facing right, rope on the middle of the back ≈ (244, 238). The code draws the tail tassel at the rump | A classic donkey (burro) piñata in side view with tall ears: bright rainbow crepe-paper fringe rows, a pink spiky fringe mane, a cute happy eye and smile |
| `prop/party-bat` | 480×120, transparent | Horizontal, knob at the left edge, the hand's grip point 20% in (x=96, vertical centre), padded barrel out to the right edge. Drawn rotated in the character's hand at 1.2 × 0.6 × the character's height long (≈120–150 px), swung overhead | A soft padded party bat for kids: a blue grip-taped handle with a yellow knob and a fat rounded foam barrel with pink-and-white candy stripes. Clearly soft and toy-like |
| `prop/candy-wrapped` | 128×128, transparent | Centred, drawn at 72×72 (contain); bounces and spins on the lawn | A twist-wrapped round sweet (bow-tie wrapper ends), glossy pink wrapper with white diagonal stripes |
| `prop/candy-lollipop` | 128×128, transparent | Centred, drawn at 72×72 (contain) | A round swirl lollipop (blue and white spiral) on a short white stick |
| `prop/candy-golden` | 128×128, transparent | Centred, drawn at 72×72 (contain); the code adds a pulsing glow behind it | A shiny golden twist-wrapped candy with a white sparkle on it, extra glossy (worth 5 points) |

New pose wanted (the game already asks for it; until it exists it falls back
to `action`): **`swing`** — one-shot, a two-handed overhead swing of a bat
from behind the shoulder forward and up (as if hitting something just above
head height), cheerful face. Quadrupeds can rear up on the hind legs; the
cake can do a big hop forward.

## New Party game: snowball-splat

### snowball-splat — Snowball Splat   (requested by the snowball-splat agent, 2026-10-05, priority: nice-to-have)

A top-down snowball free-for-all in a snowy cottage garden: players pack
snowballs, throw them across the yard, hide behind snow-fort walls and
snowmen (which crumble when hit and pop back up), and grab a giant rolling
snowball or a red triple-throw mitten. Everything below has a procedural
fallback that ships today (`party/src/games/snowball-splat/art.js`); the code
already looks up every key, so a file listed in `assets/art/index.json` drops
in with no code change. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text** in any image. Characters use
existing poses (`crouch` while scooping, `throw`, `carry` with the giant
snowball overhead, `knockback` → `dizzy` when splatted, `cheer`, `celebrate`,
`clap`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/snowball-splat` | 1920×1080, opaque | Full screen, 1:1 (the camera zooms up to ~1.2×). **Layout must match:** sky and backdrop above y≈200, a wooden picket fence along y≈200–245, open snowy ground below. Players walk in x 90–1830, y 280–1028. A **frozen pond** sits exactly at the centre: ellipse centre (960, 652), radii 205×88, with a ~20 px snowy rim. Keep the top ~110 px calm (scoreboard chips) and the ground plain — the code draws the walls, snowmen, splats and scoop dents | A cozy winter cottage garden seen from a high 3/4 top-down angle: pale blue sky with soft clouds, snowy hills, two candy-coloured cottages with thick snow on the roofs and warm yellow windows, snow-tipped pine trees, a honey-wood picket fence with snow caps and a string of colourful party lights; below it a wide smooth field of fresh snow with gentle blue-shaded drifts and tiny sparkles, a small oval frozen pond (pale cyan ice with white streaks) in the middle, snowbanks and pines along the left, right and bottom edges |
| `thumb/snowball-splat` | 800×500, opaque | Game-select shelf and how-to screen (`drawIcon` is the fallback) | Two cheerful roster characters mid snowball fight in a snowy garden: one ducking behind a snow-fort wall, a snowball flying in a dotted arc toward a snowman with a red scarf, a white splat burst, a giant snowball and a red knitted mitten in the corners, falling snowflakes. Subject centred |
| `prop/snowball` | 64×64, transparent | Centred on the ball, drawn at 2.3 × its radius (7–12 px radius: in hands, in flight, and as the 3 ammo pips over each head). The ball should fill ~87% of the canvas | A single round packed snowball: white with soft blue shading at the lower right, a small white highlight at the upper left, a few tiny lumps, thin navy outline |
| `prop/giant-snowball` | 256×256, transparent | Centred on the ball, drawn at 2.15 × its radius (26–66 px). The code does not rotate it, so keep it nearly round | A huge round snowball, lumpy packed snow with blue cel shading and a big white highlight, navy outline |
| `prop/powerup-giant` | 192×192, transparent | Centred inside the floating pickup bubble, ~97 px wide; the code draws the glow and the bubble around it | Power-up icon: a giant sparkly snowball with a little gold star twinkle on it, cheerful and chunky |
| `prop/triple-mitten` | 160×160, transparent | Centred, drawn 30–100 px tall: on the pickup bubble (the code adds "x3" beside it), in the player's hand, and next to the ammo pips | A red knitted mitten with a yellow and a white stripe and a fluffy white cuff, upright, thumb on the left |
| `prop/snow-splat` | 256×256, transparent | Ground decal centred where a snowball landed; **the code squashes it vertically to 42%** and fades it out. Drawn 36–150 px wide, so paint it as a round splat seen from straight above | A white snow splat seen from above: a star-shaped burst of packed snow with little round blobs flung around it, faint blue shading, thin soft-blue outline |
| `prop/face-splat` | 128×128, transparent | Centred on a character's eyes for ~2 s after a hit, drawn at 2.4 × (15% of the character's height), fades out | A cartoony blob of white snow stuck on a face: a round splat with three bumps and two little drips, navy outline, light blue shading |
| `prop/snow-wall` | 460×256 (ratio 230:128), transparent | **Stretched** over a horizontal fort-wall block: footprint 230×44 plus an 84 px front face, so the **top 34%** of the image is the top face and the **bottom 66%** the front face. Damage lowers it to ~60% height (stretched) and the code adds cracks | A packed-snow fort wall made of stacked snow bricks, seen from a high 3/4 angle: flat white top face with a slightly lumpy edge, blue-shaded front face with brick seams, navy outline |
| `prop/snow-wall-side` | 176×1016 (ratio 44:254), transparent | Same, for the two walls that run away from the viewer at the sides: footprint 44 wide × 170 deep plus the 84 px front face, so the **top 67%** is the top face and the **bottom 33%** the front face | The same snow-brick fort wall seen end-on: a long narrow white top face and a short blue-shaded front end with brick seams |
| `prop/snow-rubble` | 520×120, transparent | Bottom-centre anchored at the wall's front edge, fitted into (wall length + 30)×60 px; shown while a crumbled wall waits to rebuild | A low pile of broken snow bricks and lumps, white with blue shading, navy outline |
| `prop/snowman` | 300×420, transparent | Bottom-centre (base of the bottom ball) on the snowman's foot point, fitted into 150×210 px. Hit 1 swaps to `-nohat`, hit 2 to `-body`, hit 3 to `-pile` | A friendly three-ball snowman: coal eyes and smile, carrot nose, pink cheeks, twig arms, a red knitted scarf, a blue bobble hat |
| `prop/snowman-nohat` | 300×420, transparent | Same canvas, scale and placement as `prop/snowman` | The same snowman without its hat |
| `prop/snowman-body` | 300×420, transparent | Same canvas, scale and placement as `prop/snowman` | The same snowman with only the two lower balls, the scarf and twig arms (its head has been knocked off) |
| `prop/snowman-pile` | 260×140, transparent | Bottom-centre on the snowman's foot point, fitted into 130×70 px, until it rebuilds | A flattened snowman: a lumpy snow heap with the red scarf and the carrot on top |

Optional future pose (the game reads fine without it): `snow-scoop` (loop,
fallback `crouch` → `land`): crouched, both hands (or paws) packing a
snowball on the ground. The game uses `crouch` for scooping today.

## New Party game: treasure-dig

### treasure-dig — Treasure Dig   (requested by the treasure-dig agent, 2026-10-05, priority: nice-to-have)

A hot/cold treasure hunt on a sunny beach (2.5D top-down). Everything below
has a procedural fallback that ships today. The code already looks up every
key, so a file listed in `assets/art/index.json` drops in with no code change.
House style: navy `#24163f` outlines, soft cel shading, bright candy colours,
**no text** in any image. Props are seen from a slight front three-quarter
view (like the roster sprites) and centred in a transparent canvas unless the
anchor says otherwise. Reused as they are: the roster sprites (`crouch`,
`action`, `cheer`, `celebrate`, `surprised`, `hurt`, `walk`, `run`), plus
`prop/crown`, `prop/rubber-duck`, `prop/gem-blue` and `prop/charm-shell` as
second-choice fallbacks.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/treasure-dig` | 1920×1080, opaque | Full screen. **The layout must match:** sea from y=0 to y≈262 (the code animates lapping foam at y≈262 and big waves that wash down to y≈560–680), a darker wet-sand band at y≈262–330, dry sand below. Players walk in x 130–1790, y 350–1030, so keep that area flat sand with only faint ripples (the code draws holes, chests and starfish). The top ~200 px sit under the score chips and timer. Put edge decor only at the far left and right edges: a sandcastle (left, y≈640) and a towel (left, y≈900), a towel (right, y≈640) and a striped beach umbrella (bottom-right corner). Keep the bottom-left 120×120 plain and nothing tall above y≈720 (the waves wash over the top part) | A bright, sunny cartoon beach seen from above at a gentle angle: turquoise sea with soft white wave lines at the top, a scalloped foam line, warm golden sand with faint wind ripples and a few pebbles, and cheerful beach decor along the far left and right edges. No shells or treasure on the sand (those are gameplay) |
| `thumb/treasure-dig` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A half-dug-out wooden treasure chest glowing gold on a sunny beach with gold coins flying out, a pink scallop-shell gadget with an antenna beaming red "hot" ripple rings, a cute crab peeking out of a sand hole, sea at the top. Subject centred |
| `prop/treasure-shell` | 192×192, transparent | Centred, fitted into a 70 px box when held up over the finder's head | A peach-and-pink scallop seashell with ridges and a soft shine |
| `prop/treasure-pearl` | 192×192, transparent | Centred, 70 px box | A small open lilac clam shell holding a big glowing white pearl |
| `prop/treasure-gem` | 192×192, transparent | Centred, 70 px box | A faceted sky-blue gem (brilliant cut, table on top) with white glints |
| `prop/treasure-coins` | 192×192, transparent | Centred, 70 px box | A little stack of shiny gold coins with one coin standing up in front showing a star |
| `prop/treasure-crown` | 192×192, transparent | Centred, 96 px box (the jackpot). Falls back to `prop/crown` | A sparkly golden crown with a big pink jewel, just dug up (a few sand grains), extra shiny |
| `prop/treasure-chest` | 300×240, transparent | Bottom-centre anchored at the chest's base, drawn 150 px wide. The code clips it at the sand line, raises it out of a hole as players dig, and draws a sand lip over the bottom | A closed wooden treasure chest (friendly, not scary): honey-brown planks, gold bands, a gold lock, a rounded lid |
| `prop/treasure-chest-open` | 300×300, transparent | Bottom-centre anchored, drawn 150 px wide (taller because the lid stands open) | The same chest with the lid flipped open, heaped with gold coins and a pearl necklace, warm golden glow inside |
| `prop/shell-detector` | 128×128, transparent | Centred, drawn 50 px, floating beside each character. **The code draws a round coloured light (blue → yellow → red) over the centre** (about a third of the width), so leave the middle a plain rounded dome | A cute treasure-detector gadget shaped like a pink scallop shell, with a little curly antenna with a ball tip on top and a round lens in the middle |
| `prop/beach-crab` | 192×192, transparent | Centred, drawn 76 px. It pops out of a hole, snaps its claws, then scuttles sideways | A round, friendly red-orange crab, front view, eyes on stalks, a big smile and rosy cheeks, both claws raised |
| `prop/beach-seaweed` | 160×160, transparent | Centred, drawn 74 px and draped on a character's head (the top of the image sits at the top of the head) | A soft clump of three wavy green seaweed ribbons hanging down, glossy and silly |
| `prop/beach-sock` | 160×160, transparent | Centred, 70 px box, held up over the head | A single lost striped sock (pink, blue and yellow stripes) with a pink toe |
| `prop/beach-duck` | 160×160, transparent | Centred, 70 px box. Optional: falls back to `prop/rubber-duck` | A yellow rubber duck, a little sandy |
| `prop/beach-starfish` | 128×128, transparent | Centred, drawn 56 px. Waves wash it up; it bobs with a glow | A cheerful orange starfish with tiny dots and a small happy face |
| `prop/sand-hole` | 256×128, transparent | Centred on the dig spot, drawn 2.6r × 1.3r (r ≈ 30 px). It fades out when the waves smooth it | A freshly dug hole in golden sand, seen from above at an angle: dark damp inside, with a little rim of scooped sand around it |

Optional pose: the game digs with `crouch` + `action` today. A dedicated
`dig` pose (crouched, scooping sand back between the legs; loop; fallback
`crouch`, `action`) for every roster character would replace that later.

## New Party game: tug-of-war

### tug-of-war — Rainbow Tug-of-War   (requested by the tug-of-war agent, 2026-10-05, priority: nice-to-have)

A team game in side view: Pink Team (left) and Blue Team (right) pull a
rainbow rope across a little puddle of wobbly rainbow jelly; the losers
slide in with a splash and pop out giggling. Everything below has a
procedural fallback that ships today, and the code already looks up every
key, so a file listed in `assets/art/index.json` drops in with no code
change. The rope itself stays procedural (it bends through every
character's hands). House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text** in any image. Reused as they
are: the roster sprites (`knockback` as the pulling stance until `pull`
exists, `run`, `jump`, `tumble`, `swim`, `giggle`, `dizzy`, `surprised`,
`celebrate`, `cheer`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/tug-of-war` | 1920×1080, opaque | Full screen, static. The meadow's grass line sits at y≈790; characters stand on y≈862 across the whole width; the jelly puddle is drawn by code at the centre (x 750–1170, y 830–940), so keep that patch plain grass. Team mats are drawn on the ground at x 10–740 and 1180–1910, y 812–904. Keep the top ~230 px calm (team panels, timer and tug meter) and the centre band y 250–420 calm (the beat heart) | A sunny spring meadow: soft blue sky with a few puffy clouds, a big gentle pastel rainbow arching over the whole scene from behind rolling green hills, round cartoon trees on the far hills, a strip of bright grass with tiny flowers across the bottom third, and two cream party poles at the far left and right edges with a string of pink, yellow and blue bunting sagging between them. Left half has a faint pink tint in the flowers, right half faint blue |
| `thumb/tug-of-war` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Two cute characters from opposite sides (one in pink, one in blue) leaning back and pulling a thick rainbow-striped rope over a small glossy puddle of rainbow jelly, a pink bow tied at the rope's middle, a splash of jelly droplets and sparkles, rainbow in the sky. Subject centred |
| `prop/tug-jelly-pool` | 960×280, transparent | Centred on the puddle centre (960, 884) and drawn 2.3 × 205 px wide (≈470 px, height by aspect). The code squashes it on splashes (wobble), draws characters sunk to the chest in it and adds its own ripple rings, so keep the surface clean | A shallow oval puddle of glossy rainbow jelly set into the grass, seen from a low side angle: concentric bands from pink at the rim through orange, yellow, green, blue to purple in the middle, a sugary pale-pink crust rim, bright white highlights and a few tiny bubbles. The oval fills ~88% of the width |
| `prop/tug-mat-pink`, `prop/tug-mat-blue` | 1460×184 each, transparent | Stretched (fit: stretch) over each team's zone, 730×92 on screen, top edge at y≈812. Characters stand on its middle | A long picnic blanket on the grass seen from the front at a low angle: gingham check in pink and white (blue and white for the blue one), a soft fringe along the bottom edge, slightly wrinkled. Plain, no objects on it |
| `prop/tug-flag-pink`, `prop/tug-flag-blue` | 220×300 each, transparent | Bottom-centre anchored (foot of the pole) at the puddle rim, x 785 (pink) and x 1135 (blue), fitted into 110×150. The pink pennant points left, the blue one right. These are the "finish lines" the bow must reach | A small cream wooden pole stuck in the grass with a triangular cloth pennant waving at the top: hot pink with a white heart (pink), sky blue with a white star (blue) |
| `prop/tug-bow` | 300×300, transparent | Drawn centred 40 px below the rope point at x = 960 + rope offset, fitted into 150×150, so the knot of the bow sits at about (150, 70) in the image and the pennant hangs below. It rides the rope and sways | A big glossy hot-pink ribbon bow with a gold button knot and two ribbon tails, with a small three-stripe pennant (pink, yellow, blue) hanging straight down under the knot |
| `prop/tug-banana` | 220×160, transparent | Centred ~18 px above the ground point, fitted into 110×80; the code spins it as it slides along the ground under one team's feet | A cartoon banana peel lying flat with three floppy yellow peel petals splayed out and a little brown stem, glossy and cute (not mushy) |
| `prop/tug-beat-heart` | 256×256, transparent | HUD at screen centre (960, 330), fitted into 2.1 × 60 px (126 px) and scaled up on every beat; the code draws the shrinking timing ring around it | A chunky glossy candy-pink heart with a navy outline and a white shine at the upper left, slightly puffy like a sticker |

New sprite pose wished for (registered by the lead; the code already uses it
when `POSES.pull` exists and falls back to `knockback` meanwhile):

| Pose | Loop | Fallback | Description |
| --- | --- | --- | --- |
| `pull` | yes | `knockback`, `balance` | Tug-of-war heave: side-on, leaning far back away from the facing direction, both hands (paws, fins, mouth for the cake) gripping a rope held out in front at waist height, feet dug in, determined happy grin (not scared). Hand anchor = the grip point |

## New Party game: fishing-frenzy

### fishing-frenzy — Fishing Frenzy   (requested by the fishing-frenzy agent, 2026-10-05, priority: nice-to-have)

Everyone fishes in one sparkling pond seen in 3/4 top-down view. Every key
below has a procedural fallback that ships today, and the code already looks
each one up, so a file in `assets/art/index.json` drops in with no code
change. **Pond geometry (must match):** an ellipse centred at (960, 580) with
radii 700 × 280 (water from x 260–1660, y 300–860), ringed by a ~40 px
pebble/sand rim. The code draws the player docks (they change with the
player count), lily pads, frog, fish, bobbers, rods and baskets on top.
House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Characters use existing poses (`cast`,
`pump`, `balance`, `catch`, `cheer`, `celebrate`, `laugh`, `hurt`, `sad`,
`surprised`); the new `reel` pose is listed at the end.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/fishing-frenzy` | 1920×1080, opaque | Full screen. The pond ellipse above must sit exactly there; keep the top ~110 px calm (scoreboard + timer). Players stand on docks along the bottom shore (y≈975) and the left/right banks, so keep those shore areas plain grass/sand. No docks, no characters | A sunny meadow pond in 3/4 top-down view: blue sky with puffy clouds and soft green hills at the top, a row of round lollipop trees (some pink-blossom) behind the pond, cattails and reeds on the far bank, a large oval pond of clear sparkling turquoise water (deeper blue in the middle, light near the edges, faint water weeds and pebbles visible underwater) ringed by cream sand and pebbles, bright green grass with tiny flowers around it |
| `thumb/fishing-frenzy` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A golden fish leaping out of a sparkling pond in an arc with water droplets, a red-and-white bobber with ripples, a fishing rod reaching in from the lower left with its line, a lily pad with a pink flower, a big yellow "!" burst shape (no letters) near the bobber. Subject centred |
| `prop/fishing-sunny` | 320×240, transparent | One catch, side view **facing right**, centred, nose and tail tip spanning the full width (drawn into a 1.25 L × 0.94 L box, contain; flipped by code to face left). Same for all `prop/fishing-*` catches below | A small round cheerful yellow fish with an orange tail and fins, pale belly, big friendly eye, pink cheek, tiny smile |
| `prop/fishing-darty` | 320×240, transparent | as above | A slim speedy pink minnow with purple fins and a white stripe along its side, sleek and quick-looking |
| `prop/fishing-puffy` | 320×240, transparent | as above | A shy round purple pufferfish with little soft pink nubs along its back, pink cheeks, big shy eye |
| `prop/fishing-bubba` | 320×240, transparent | as above (drawn bigger by code) | A big chubby teal fish with yellow spots, orange fins, pink pouty lips, happy goofy face |
| `prop/fishing-golden` | 320×240, transparent | as above (code adds a glow) | A shining golden fish with flowing pale-gold fins and tail, sparkly highlights, sweet smile |
| `prop/fishing-boot` | 320×240, transparent | as above; standing upright, toe to the right | An old blue-grey rain boot with a pink patch, a white daisy with a yellow centre growing out of the top (silly catch) |
| `prop/fishing-duck` | 320×240, transparent | as above; floats on the surface (code adds the water line) | A classic yellow rubber duck with an orange beak, side view facing right |
| `prop/fishing-chest` | 320×240, transparent | as above | A small wooden treasure chest with gold bands and lock, lid slightly open with golden glow and coins peeking out |
| `prop/fishing-bobber` | 96×128, transparent | Drawn centred 12 px above the water line in a 30×40 box; code sinks it on a bite and draws the water line over its base | A round fishing bobber: red top half, white bottom half, a short stick with a yellow ball on top, glossy highlight |
| `prop/fishing-rod` | 512×64, transparent | Straight rod, **butt at the left edge, tip at the right edge**, reel ~18% from the left; code rotates it from the character's hand (20% behind the hand) when the rod is not bent | A kid's fishing rod: wooden cork handle, a yellow reel, a white rod with pink stripes, pink tip |
| `prop/fishing-basket` | 240×176, transparent | Bottom-centre at the basket spot, drawn 120×88 (× player scale). The code draws caught fish poking up out of the top **before** it, so the opening must be at the top ~25% and the front must cover them | A woven wicker fishing basket, front view, open top with a rolled rim, warm honey colour |
| `prop/fishing-lilypad` | 240×160, transparent | Centred on the pad, drawn into a 2.2 r × 1.5 r box (r = 34–52 px), seen from 3/4 top-down | A round green lily pad with a notch, light veins, seen at an angle from above |
| `prop/fishing-lilypad-flower` | 240×160, transparent | as above | The same lily pad with a pink water-lily flower on it |
| `prop/fishing-frog` | 180×152, transparent | Bottom-centre, drawn 90×76 × 0.8, sits on a lily pad | A cute little green frog sitting, front view, big eyes, pink cheeks, tiny smile |

New pose (optional): `reel` (loop) — holding a fishing rod up with both
hands, leaning back and cranking the reel (code draws the rod from the
hand anchor). Fallback chain: `pump`, `action`.

## New Party game: jump-rope

### jump-rope — Jump Rope Jamboree   (requested by the jump-rope agent, 2026-10-05, priority: nice-to-have)

Two friendly bunnies turn a giant candy-striped jump rope in a sunny park;
the players stand in a row on a sandy mat in the middle and hop as the rope
sweeps under their feet; out players sit on a picnic blanket in front and
cheer. Everything below has a procedural fallback that ships today, and the
code already looks up every key. The rope itself, the bunnies' arms and the
timing rings stay procedural (they animate with the rope). House style: navy
`#24163f` outlines, soft cel shading, bright candy colours, **no text** in
any image. Reused as they are: the roster sprites (`jump`, `fall`, `land`,
`tumble`, `dizzy`, `clap`, `cheer`, `celebrate`, `walk`, `ready`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/jump-rope` | 1920×1080, opaque | Full screen behind everything (when present, it replaces the whole procedural park, so it must contain the mat and blanket). **Layout must match:** horizon/fence band around y≈580–640; a flat sandy oval jump mat centred at (960, 796), about 1500 px wide and 250 px tall (players stand on y≈735–845); a pink gingham picnic blanket (trapezoid) spanning x≈500–1420, y≈948–1068 where out players sit. Keep the top ~150 px calm (HUD chips + timer) and the far left/right ~300 px of ground plain (the bunnies stand at x≈150 and x≈1770) | A sunny kids' park: bright blue sky with a soft sun at the upper right, rolling green hills, round blossom trees along the horizon (open sky in the middle), a white picket fence, a string of candy-coloured bunting flags sagging across the sky, lush striped lawn, a big flat sandy oval play mat with a dashed white chalk border and faint chalk heart/star doodles, flowers in the foreground grass, and a pink-and-white gingham picnic blanket at the bottom centre. No characters |
| `thumb/jump-rope` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Two cute bunnies (one pink in a polka-dot pinafore, one mint in blue overalls) turning a big red-and-white candy-striped jump rope in a park; the rope arcs high overhead and a happy kid character is mid-hop in the middle, sparkles and motion swooshes. Subject centred |
| `prop/jump-rope-bunny-pink` | 600×660, transparent | Fitted into a 300×330 box, **bottom-centre anchored at the feet**, drawn at x≈150 facing right (toward the middle). **No arms**: the code draws both arms from the shoulders to the rope handles — near shoulder at about (368, 316) and far shoulder at about (308, 308) in image pixels — so leave the sides of the body clean there | A big friendly standing bunny, three-quarter view facing right: pale pink fur, tall ears (one slightly floppy) with pink insides, a yellow bow between the ears, big shiny dark eyes, rosy cheeks, little pink nose and smile, a hot-pink polka-dot pinafore with yellow buttons, fluffy white tail, big soft feet. Arms omitted |
| `prop/jump-rope-bunny-mint` | 600×660, transparent | Same size, anchor and shoulder points as the pink bunny; drawn at x≈1770 and **mirrored by the code** to face left, so draw it facing right | The pink bunny's friend: mint-white fur, tall ears with pink insides, a purple bow, big shiny eyes, rosy cheeks, sky-blue overalls with yellow dots and yellow buttons, fluffy white tail, big soft feet. Arms omitted |
| `prop/jump-rope-handle` | 210×78, transparent | Drawn centred on the paw at 63×23 px, rotated so the **rope end points right** (turned 180° for the right-hand bunny). Used for both ropes and the golden rope | A chunky wooden jump-rope handle lying horizontally: rounded honey-wood grip with a pink painted band, a small yellow bead cap at the right end where the rope comes out |
| `prop/jump-rope-blanket` | 1920×300, transparent | Only used when `bg/jump-rope` is missing: stretched over 960×150 at (960, 1008), under the seated out players | A pink-and-white gingham picnic blanket seen from the front at a low angle, a gentle trapezoid (wider at the bottom), soft folds, navy outline |

Optional sprite pose (later upgrade, the game reads fine without it): `skip-hop`
(loop: no; fallback `jump` → `fall`) — a light two-footed jump-rope hop, knees
tucked, arms out to the sides, happy face.
