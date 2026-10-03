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
| sprite `cotton-candy` `run` (4) | About 0.7× size; she shrinks when running. | Scale ≈ 1.4 on head size. |
| sprite `cotton-candy` `ride` | Anchor below the hooves; floats above the broom. | Anchor at the belly/hoof line. |
| sprite `cotton-candy` `giggle` | About 1.35× too big (Pet Spa). | Scale ≈ 0.75. |
| sprite `unicorn` `sad`, `run`, `celebrate`, `jump`, `land`, `action`, `throw`, `bow`, `strike1/3`, `stir`, `catch`, `look-around` | `hand` lands off the art. | Re-annotate `hand` (mouth, or horn tip for cast). |
| sprite `kpop-girl-left` / `kpop-girl-center` (`ready`, `celebrate`, `dance`, `pout`, `sad`, `think`, `clap`, `strike*`) | `hand` 16 px or more from the actual hand. | Re-annotate `hand`. |
| sprite `marina`, `scale` (all non-idle poses) | `head`/`neck` landmarks inconsistent with idle (~1.26×) though the art is fine; necklaces drift in Fashion Show. | Re-check `neck`/`eyes`/`head` landmarks. |
| sprite `marina`, `scale` | No `carry`, `cast`, `action`, `clap`, `bow`, `sing`. | Add `carry` and `cast` first (Pass the Present, Wizard Quick-Draw, Potion Class). |
| `prop/ing-rainbow-feather`, `ing-stardust-jar`, `ing-moon-drop` | Match no ingredient in Potion Class (unused). | No re-generation needed. Either keep them for a future recipe, or tell the lead to add them as ingredients. |

Engine-side notes from the same review: several keys are aliases of one
file (`prop/sky-cake` = `prop/giant-cake`, `prop/pump` = `prop/balloon-pump`,
`prop/gem` = `prop/gem-red`, `prop/cookie-tile` = `prop/cookie-1`). That's
fine; the code uses one of each pair.


### Resolved (integrated and checked in game)

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
