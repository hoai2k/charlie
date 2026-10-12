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


> **Start here: [Open requests](#open-requests)** at the end of this
> document: the re-generation table and any new game sections.
>
> **History rule:** this file holds only standing guidance and **open**
> requests. When a request is fielded (delivered and checked in game, or
> resolved/dropped), move its section or table row to
> [`image-requests-history.md`](image-requests-history.md) (newest at the
> top, with the date and outcome). Keep anything that is still useful
> context (style rules, specs, lessons) here.

## 1. Purpose, audience and phases

Charlie is a 2nd-grade girl, and the characters are hers. The game is a couch
party game for kids aged about 5 to 10 on a TV with Xbox controllers.
Success looks like this: her characters look like *her* characters in every
frame, and they are bursting with personality. They jump for joy when they
win, and they pout dramatically (arms crossed, lip out, stomping a foot) when
they lose.

### Phases

The original A–E delivery plan (NPC canonicals, the Felicity pilot, roster poses and portraits, game art, Troll/NPC sprites) is done; it is archived in `image-requests-history.md`. The gates still apply to new work: **a new NPC needs the user's approval of its canonical before anything that shows it** (§8), and party games come before studio games.

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
      "bodyHeight": 320,       // optional per-pose size correction (a frame object may carry its own; see Scale)
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
**no size jump**. Poses that reach
higher (arms up, jumping) simply extend above it.

**Size corrections.** Generated frames are not always drawn at idle's scale.
When a pose's head/face is a different size from idle's, fix it in data: give
the pose (or one frame object) its own `bodyHeight` = set `bodyHeight` ×
(that frame's head size ÷ idle's head size), in frame pixels. The engine draws
that frame, its anchor and its landmarks with it (frame `bodyHeight`, then pose,
then set). Judge by head/face size, never by total height: crouches and jumps
legitimately change height. The October size audit set these for every
playable set (Fox's `hip-bump` was drawn at 0.7× idle, Amber's dig/snow-scoop/
spring-jump/skip-hop at 1.36×).

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

**All five points on every frame** (`head`, `hand`, `eyes`, `neck`, `back`,
frame pixels, inside the frame). `validate.py` rejects a frame that lacks
one. The October landmark audit (all 15 playable sets, every frame) settled
these conventions:

- `eyes`: the point **between the eyes** (bridge of the nose), not one eye
  or the nose tip. A **true back view** (the `pose-twirl` back frame) sets
  `"eyes": null`: the face is hidden, so games hide glasses and face items.
  Never null it for a side or three-quarter view.
- `neck`: the base of the neck / collar line where a necklace hangs, below
  the chin. Quadrupeds: the throat below the jaw. Cake: just under the mouth.
  Bronze: the rim under the dome.
- `back`: between the shoulder blades (the top of the spine for
  quadrupeds), where wings or a cape attach. Fashion Show draws quadruped
  wings 45% of the way from `neck` to `back`.
- `head` with an existing crown or tiara: on that crown (Marina, Scale,
  Cotton Candy: the top of the crown band; Amber: the tiara band). Upside
  down or tumbling: still the crown of the skull (between downward ears),
  wherever it points. The cake's `head` is the base of the candle.
- `hand` for quadrupeds (Fox, Fellowfox, Unicorn, Cotton Candy) is the
  mouth in every pose, except poses whose art grips a tool in a front
  paw/hoof (pump, pull, reel, swing, putt, putt-swing, dig, snow-scoop,
  flip), which keep the paw. Hotdog uses its front paws (it holds things
  like a squirrel). The cake's hand is the cake top just under the candle,
  except tool poses where the drawn grip is used.
- Poses drawn looking the other way set the pose `facing` (Cotton Candy
  `sit` -1, Fox `strike3` 1, KPop right `swim` -1), so `hand` is still the
  forward side.

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
§7 for the format.

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

The proposed-pose table (cast, clap, eat, ride, bow, strike1–3, dance-*, shake, stir) is archived in `image-requests-history.md`; all are in `POSES` with frames.

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

## 7. Expression portraits (spec for every character)

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

The individual NPC requests (§8.1–8.5: Glimmer, Shadow Imps, Professor Hoot, ambient creatures, Troll) were delivered and are archived in `image-requests-history.md`.

---

## 9. Game art: logo, backgrounds, thumbnails, props (conventions)

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

The original lists (§9.1 logo and menu backdrops, §9.2 minigame backgrounds, §9.3 thumbnails, §9.4 props) were delivered and are archived in `image-requests-history.md`. New games add their own section under "Open requests" below.

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
a need while building their game. The image agent processes them in order,
or sooner if they are marked as blocking. Use this format:

```
### <game id> — <short title>   (requested by <agent/date>, priority: blocking | nice-to-have)
- Key: `prop/<name>` (or bg/…, pose name for a sprite set, portrait expression)
- What: <one-line visual description, size, anchor, states/variants>
- Where it's used: <how the code draws or attaches it; fallback used today>
```

New game sections go under [Open requests](#open-requests); fielded ones
move to `image-requests-history.md`.

### Optional action extension (implemented in the sprite engine)

`look-around`, `high-five`, `crouch`, `dash`, `catch`, and `wave-goodbye` are
optional actions with procedural motion and fallback chains. See
`reference/RECOMMENDED-ACTIONS.md` for use, timing and gameplay boundaries.
Felicity is the first authored reference set; other members remain compatible
through fallbacks until their own frames are generated.
## Lessons from the Felicity pilot (Round 3)

Written by the lead after running Felicity + Fellowfox through all 20
minigames in the game itself (CPU rounds, per-frame pose logging, close-up
crops around her). The pilot works: attachments track her art, aliases and
fallbacks behave, and nothing broke. These are the considerations for the
rest of the roster. (Its delivered list and request list are archived.)

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

## Open requests

New requests go here: re-generation rows in the table below, and new
games' sections (format under "Requests added by minigames") after it.

### Re-generation requests (lead's in-game review)

Each item below was integrated and looked at in the running game. The code
works around every one today, so nothing is broken. A re-generation would
make it read better. Newest first; fixed items move to
`image-requests-history.md` ("Resolved re-generation requests").

| Key | What's wrong in game | Ask |
| --- | --- | --- |
| `prop/backpack-teddy` | Characters face three-quarter right, so the back is on the LEFT; the teddy peeks out at the top-RIGHT, behind the head, and is invisible on every two-legged character even after refitting (the original request said top-right, wrongly). | Same 140×200 pack, but the teddy head and ears peek out at the top-LEFT corner, head reaching the canvas top; keep the pack bottom-centred with no bottom padding (the code puts the `back` point at 80% of the height). |
| `prop/fishing-rod` (optional) | Even drawn undistorted, the 8:1 handle is too long for a 110–175 px rod, so the code skips the middle of the cork to shorten it. | 256×64, transparent: a short chunky cork grip (about 2.5× as long as it is thick) with the big yellow reel at the right end, butt at the left edge, shaft start at the right edge, so the code can draw it whole. |

Engine-side notes from the same review: several keys are aliases of one
file (`prop/sky-cake` = `prop/giant-cake`, `prop/pump` = `prop/balloon-pump`,
`prop/gem` = `prop/gem-red`, `prop/cookie-tile` = `prop/cookie-1`). That's
fine; the code uses one of each pair.


No open image or re-generation requests remain as of 2026-10-12.

## New Play Studio game: puppet-theater

### puppet-theater — Puppet Theater   (requested by the puppet-theater agent, 2026-10-05, priority: nice-to-have)

A little puppet booth on a 1920×1080 screen. Players pick a painted
backdrop and stand cardboard props on the stage, then act out a two-act
show with their puppets (their character on a wooden stick, or a sock
puppet), and the audience in the front rows laughs and claps. Everything
below has a procedural fallback that ships today; the code already looks up
every key, so a file listed in `assets/art/index.json` drops in with no code
change. House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image.

**Layout the art must match.** The booth fills the screen: stage window
(where the backdrop shows) x 270–1650, y 150–740; scalloped valance across
the top (y 40–175); the front playboard (the ledge the puppets pop up from)
y 720–820, x 220–1700; a fabric skirt below it to the floor; three rows of
audience heads (backs of heads) along the bottom, y 900–1080. Sock
puppets, sticks and sparkles are drawn by code.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/puppet-theater` | 1920×1080, opaque | Full screen, behind everything. Only the edges show (x < 220 and x > 1700, and above y 40); the booth covers the middle | A cosy little playroom theatre: warm plum wallpaper with gold stars, a string of round party bulbs across the top, a wooden floor. Calm, low detail in the middle |
| `prop/pt-booth` | 1920×1080, transparent | Drawn full screen **in front of** the backdrop and the puppets. Must be fully transparent inside the stage window (x 270–1650, y 150–720) and outside the booth (x < 200, x > 1720). The playboard top edge sits at exactly y = 720 | A front-view wooden puppet booth: a deep pink scalloped valance with gold fringe and gold stars across the top, thin red velvet curtains tied back at each side of the window, a chunky honey-wood playboard ledge painted with little stars, and a purple fabric skirt below it to the floor |
| `prop/pt-curtain` | 760×1000, transparent | The **left** curtain panel (the code mirrors it for the right one) when it closes between scenes. Drawn stretched over x 230–960 (left half) by y 120–760, sliding sideways | A tall red velvet theatre curtain panel with soft vertical folds, a gold rope trim along the inner edge and gold tassel fringe at the bottom |
| `bg/puppet-theater-castle` | 1380×590, opaque | Stretched over the stage window. The bottom ~120 px is hidden behind the playboard, so keep the horizon/ground around 60–75% height | A painted stage backdrop (gouache / cut-paper look): a pastel fairy-tale castle on a green hill, blue sky, puffy clouds |
| `bg/puppet-theater-sea` | 1380×590, opaque | Same as above | Painted backdrop under the sea: turquoise water with light rays, coral, swaying seaweed, bubbles, sandy floor |
| `bg/puppet-theater-forest` | 1380×590, opaque | Same as above | Painted backdrop of a friendly sunny forest clearing: round green trees, mushrooms, flowers, soft sunbeams |
| `bg/puppet-theater-space` | 1380×590, opaque | Same as above | Painted backdrop of cute outer space: deep purple-blue sky with stars, a ringed planet, a smiling crescent moon, a grey cratered ground strip |
| `bg/puppet-theater-candy` | 1380×590, opaque | Same as above | Painted backdrop of Candy Land: pink sky, candy-cane trees, gumdrop hills, a chocolate river, lollipop flowers |
| `bg/puppet-theater-beach` | 1380×590, opaque | Same as above | Painted backdrop of a sunny beach: bright sky, sea with small waves, sand, a palm tree at the edge, a sailboat far away |
| `prop/pt-tree`, `prop/pt-flower`, `prop/pt-castle`, `prop/pt-house`, `prop/pt-mushroom`, `prop/pt-palm`, `prop/pt-lollipop`, `prop/pt-rocket` | 512×512 each, transparent | **Bottom-centre anchored** (the object's base on the bottom edge of the canvas), fitted into a box of about 240, 120, 280, 220, 130, 260, 180, 240 px tall respectively. They wobble a little around the base | Stage props as **painted cardboard cut-outs** (flat, a thin pale cardboard edge showing around the outline, a little wooden stand foot at the base): a round green tree; a big pink flower on a stem; a pastel castle tower with a flag; a cottage with a heart window; a red spotted mushroom; a palm tree; a giant swirl lollipop; a red-and-white cartoon rocket |
| `prop/pt-cloud`, `prop/pt-sun`, `prop/pt-moon`, `prop/pt-star`, `prop/pt-rainbow`, `prop/pt-fish` | 512×512 each, transparent | **Centre anchored**, fitted into a box of about 170, 150, 140, 110, 300 (wide), 130 (wide) px; they hang in the sky on a thin string (the code draws the string) | Matching cardboard cut-outs: a puffy cloud; a smiling sun with rays; a smiling crescent moon; a yellow star with a face; a rainbow arch with cloud ends; a smiling orange fish |
| `prop/pt-audience-bunny`, `prop/pt-audience-bear`, `prop/pt-audience-cat`, `prop/pt-audience-duck` | 256×256 each, transparent | **Bottom-centre anchored**, drawn about 140–180 px tall in the audience rows, bobbing when they laugh. Seen **from behind** (back of the head and shoulders, no faces) | Cute audience members seen from behind: a white bunny with tall ears and a pink bow; a brown teddy bear; a grey kitten with pointy ears; a yellow duckling with a little tuft |
| `prop/pt-rose` | 128×128, transparent | Centre anchored, ~70 px, thrown onto the stage at the curtain call (spins in flight) | A single red rose with a short green stem and one leaf |
| `thumb/puppet-theater` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A tiny puppet booth with the curtains open: Fox on a wooden stick and a striped sock puppet with googly eyes waving on stage in front of a castle backdrop, a heart speech bubble, the backs of bunny ears in the audience. Subject centred |

No new sprite poses are needed (stick puppets use existing poses: wave,
laugh, celebrate, dance, surprised, think, sad, sleep, bow, cheer, jump).

## New Play Studio game: nail-studio

### nail-studio — Sparkle Nails   (requested by the nail-studio agent, 2026-10-05, priority: nice-to-have)

Everyone runs a nail-salon table (split stations, 1–8 players). A client
(a roster character, Glimmer, Professor Hoot or Fellowfox) peeks over the
table and rests a big cartoon hand, or a paw for animal clients, on a
cushion. Steps: polish colours, designs (glitter, stripes, dots, hearts,
stars, tips, rainbow tips), gems and stickers (place, move, remove), then a
little hand fan dries the nails. Finale: a nail gallery with every hand on a
pedestal and a photo. Everything below has a procedural fallback that ships
today; the code already looks up every key. The hand/paw, the nails and the
polish bottles stay procedural on purpose (the paint is clipped to exact
nail shapes). House style: navy `#24163f` outlines, soft cel shading, bright
candy colours, **no text** in any image. Reused as they are: roster sprites
(`paint`, `action`, `cheer`, `celebrate`, `present`, `clap`, `laugh`,
`surprised`, `wave`, `pose-twirl`, the photo poses) and the NPCs as clients.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/nail-studio` | 1920×1080, opaque | Full screen behind the split stations; shows as side columns at 1 player and as thin bands between stations at 2–8 players. Keep the top ~110 px calm (player chips sit there) | A bright pastel nail salon: lilac-and-pink wallpaper with tiny hearts, white shelves along the far left and right edges with rows of colourful nail polish bottles, a string of round bulb lights across the top, a pink-and-white checker floor strip at the bottom. Low detail in the centre |
| `bg/nail-studio-station` | 1290×900 (ratio 860:600), opaque | Stretched over one station. **Layout must match:** wall from y=0 to 36% (215/600), a rounded white table edge at 36%, a pink marble table top below. The client peeks over the table at the far left; the code draws the hand, tray and step list on top | One salon table seen from the manicurist's side: soft mint wallpaper with tiny white polka dots and a little round mirror on the upper 36%, then a white rounded table lip and a pale pink marble table top with faint veins. Nothing on the table |
| `bg/nail-studio-show` | 1920×1080, opaque | Full screen for the finale (the nail gallery). Pedestals stand on the floor band from y≈700 to y≈1000; a gentle camera punch zooms up to 1.15× | A small sparkly gallery stage: pink velvet curtains at both sides and a scalloped valance at the top, a lilac back wall with soft spotlight circles, a glossy pink stage floor in the lower third. No characters, no pedestals |
| `thumb/nail-studio` | 800×500, opaque | Game-select shelf and how-to screen (`drawIcon` is the fallback) | A cute cartoon hand on a pink velvet cushion with five freshly painted nails (pink with white polka dots, a rainbow tip, a gold glitter nail, a heart nail, a nail with a tiny gem), a little nail polish bottle and a mini hand fan beside it, sparkles. Subject centred |
| `prop/nail-cushion` | 512×256, transparent | The hand rests on it: drawn centred under the palm, 400 units wide in hand space (about 400 px at 1 player). Top edge of the cushion at 30% of the image | A plump pink velvet hand-rest cushion with a button tuft in the middle and gold piping, seen slightly from above |
| `prop/nail-pedestal` | 400×480, transparent | Finale: anchor **bottom-centre** on the floor; the code puts the hand on the cushion top, which must be at 12–20% from the top of the image | A white-and-gold display column with a small pink velvet cushion on top, like a jewellery display stand |
| `prop/nail-fan` | 256×256, transparent | Dry step: follows the player's cursor, blade hub at (50%, 36%) of the image, drawn ~110 units tall; the code adds a spinning blur ring over the blades | A cute handheld mini fan: round pastel-mint cage with three soft pink blades, a short rounded handle below, a tiny heart button on the handle. Front view |
| `prop/nail-sticker-gem-pink`, `prop/nail-sticker-gem-blue`, `prop/nail-sticker-gem-purple`, `prop/nail-sticker-pearl`, `prop/nail-sticker-star`, `prop/nail-sticker-heart`, `prop/nail-sticker-flower`, `prop/nail-sticker-butterfly`, `prop/nail-sticker-bow`, `prop/nail-sticker-crown` | 128×128 each, transparent | Placed on nails: drawn centred at ~44 units (about the width of a nail), slightly rotated; also shown in the tray. Centre each in its canvas with a little margin | Tiny nail-art decorations, front view, glossy: a faceted pink rhinestone (round brilliant cut); a faceted blue rhinestone; a purple heart-shaped rhinestone; a round white pearl; a gold star stud; a red heart sticker; a white daisy sticker with a yellow centre; a pink-and-purple butterfly sticker; a little pink ribbon bow; a tiny gold crown with gems |

Possible later sprite pose (not needed now; the game uses `present` →
`cheer`): `show-nails` (one-shot, about 1 s): the character holds one hand
up in front of the face, fingers spread, admiring their nails, with a happy
face. Fallback chain: `present` → `cheer` → `idle`.

## New Play Studio game: dance-studio

### dance-studio — Dance Studio   (requested by the dance-studio agent, 2026-10-05, priority: nice-to-have)

A creative choreography toy: every player builds an 8-count dance from move
cards at their own rehearsal station (with a mini stage preview), picks the
music, the stage lights and a backdrop, then the whole group performs each
player's dance together on a big stage with a mirror ball and a shiny mirror
floor, ending in a free dance and a "Freeze!" photo. Everything below has a
procedural fallback that ships today; the code already looks up every key.
House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Reused as they are: the roster sprites
(`dance-up`, `dance-side`, `dance-down`, `dance-star`, `pose-twirl`, `clap`,
`wave`, `hip-bump`, `swim`, `dash`, `photo`, `strike3`, `balance`, `bow`,
`spring-jump`, `float`, `dance`, `celebrate`, `cheer` and the photo poses).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/dance-studio` | 1920×1080, opaque | Full screen behind the rehearsal stations (setup phase). It shows as side columns at 1 player and as thin gaps/bands at 2–8 players. Keep the top ~110 px calm (title band) | A bright dance rehearsal studio: a long wall of mirrors with a pastel-pink frame, a wooden ballet barre in front of it, a honey-wood floor at the bottom, fairy lights strung across the top, a few pom-poms and a boombox on a bench at the far edges. Low detail in the centre |
| `bg/dance-studio-stage-stars` | 1920×1080, opaque | Stage backdrop "Starry Night", full screen behind the dancers. **The code covers y > 780 with the stage floor** and puts curtains over the left/right ~200 px and the top ~90 px, so keep the interesting part in the centre band y≈90–780. Also shown cover-fitted, tiny, in each station's preview | A deep-indigo night sky full of twinkly stars, a big smiling crescent moon at the upper right, soft purple clouds near the bottom, a few shooting stars |
| `bg/dance-studio-stage-candy` | 1920×1080, opaque | Same layout as above ("Candy Land") | A pastel candy landscape: lollipop trees, gumdrop hills, a wavy pink frosting river, cotton-candy clouds in a mint sky |
| `bg/dance-studio-stage-sea` | 1920×1080, opaque | Same layout as above ("Under the Sea") | A cheerful underwater scene: turquoise water with light rays from the top, pink coral and swaying seaweed at the bottom, bubbles, a few smiling little fish and a starfish |
| `bg/dance-studio-stage-rainbow` | 1920×1080, opaque | Same layout as above ("Rainbow Sky") | A sunny sky-blue background with a huge rainbow arc across the middle, fluffy white clouds at both ends of the rainbow, small sparkles |
| `bg/dance-studio-stage-castle` | 1920×1080, opaque | Same layout as above ("Castle Ballroom") | A fairy-tale ballroom: tall arched windows with a twilight view, pink marble pillars, gold chandeliers at the top, heart-shaped garlands |
| `bg/dance-studio-stage-city` | 1920×1080, opaque | Same layout as above ("Neon City") | A friendly night-time city skyline in purples and blues with glowing pastel windows, rounded buildings, a big round moon, colourful glowing shapes (stars, hearts, musical notes as shapes only, no letters) |
| `prop/dance-studio-curtains` | 1920×1080, transparent | Drawn full screen over the stage backdrop and lights, under the dancers. Velvet curtains fill the left ~200 px and right ~200 px (gathered with gold tie-backs) and a scalloped valance the top ~90 px; **everything else transparent** | Plush magenta-red velvet theatre curtains with gold fringe and gold tassel tie-backs, a scalloped valance across the top with gold trim |
| `prop/dance-studio-floor` | 1920×300, opaque | Stretched across the bottom of the stage from y=780 to 1080. The code draws translucent dancer reflections and coloured light pools on top, so keep it fairly plain and glossy | A glossy polished stage floor in dark plum wood planks seen at a low angle, with a gold edge strip along the top and soft shine streaks; slightly darker toward the bottom |
| `prop/mirror-ball` | 256×256, transparent | Hangs from the valance at the top centre, drawn centred at 170 px; the code spins its sparkle highlights and casts light specks on top | A shiny disco mirror ball made of small silver-and-lilac square mirror tiles, a few bright glints, a short chain loop at the top |
| `prop/dance-move-up`, `prop/dance-move-point`, `prop/dance-move-knees`, `prop/dance-move-star`, `prop/dance-move-twirl`, `prop/dance-move-clap`, `prop/dance-move-wave`, `prop/dance-move-bump`, `prop/dance-move-swim`, `prop/dance-move-slide`, `prop/dance-move-peace`, `prop/dance-move-tada`, `prop/dance-move-wobble`, `prop/dance-move-bow`, `prop/dance-move-hop`, `prop/dance-move-float` | 160×160 each, transparent | Move cards: fitted (contain) into a square card in the 4×4 move palette (≈60–110 px) and in the 8 timeline slots (≈40–90 px); the code draws the card, its colour and a label below | One chunky friendly dancer pictogram per card, the same simple round-headed kid figure each time (white body with a navy outline, rosy cheeks, motion swooshes in candy colours): arms straight up / pointing up and to the side while leaning / hands on bent knees / jumping in a star shape / spinning on one foot with a swirl / clapping with little clap lines / waving one hand / bumping a hip out to the side / doing "the swim" (one arm forward like a stroke, wavy lines) / sliding sideways with speed lines / peace sign by the face / ta-da arms out wide with sparkles / wobbling with both arms out / a polite bow / a little hop with feet tucked / floating on tiptoes with arms out like wings |
| `thumb/dance-studio` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Felicity and Fellowfox dancing together on a small stage under a sparkling mirror ball, pink and blue spotlights, a row of colourful dance-move cards along the bottom like a filmstrip, confetti. Subject centred |

## New Play Studio game: acrobat-circus

### acrobat-circus — Acrobat Circus   (requested by the acrobat-circus agent, 2026-10-05, priority: nice-to-have)

A cosy big-top circus. Each player has their own little ring (split
stations) for four acts: trampoline, flying trapeze, tightrope and ball
balancing, with flips, twists and star jumps in the air. Then everyone
builds a human pyramid in the big ring, and a finale show replays each
player's best trick under a spotlight. Everything below has a procedural
fallback that ships today; the code already looks up every key, so a file
listed in `assets/art/index.json` drops in with no code change. House
style: navy `#24163f` outlines, soft cel shading, bright candy colours,
**no text** in any image. Reused as they are: the roster sprites (`jump`,
`fall`, `crouch`, `dance-star`, `pose-twirl`, `balance`, `walk`, `ready`,
`cheer`, `celebrate`, `bow`, `dizzy`, `clap`), the Troll (a friendly
strongman at the base of the pyramid in 1–2 player games) and Glimmer (the
ringmaster).

Station geometry (all station props are drawn in "station units": a
station is 540 units tall, its floor line is at y = 504 and its width
varies with the player count, 460–1080 units).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/acrobat-circus` | 1920×1080, opaque | Full screen. Behind the split stations during the acts (shows as a thin frame and the top HUD band; keep the top ~110 px calm), and the whole stage for the pyramid and the finale show: characters stand on the ring floor at y≈930, the ring curb runs across at about y≈980 | Inside a big-top circus tent: red-and-cream canvas stripes radiating up to a centre pole at the top, strings of round bulb lights and pennant bunting swagged across, tiered audience benches on the left and right edges (soft silhouettes only, no faces), two soft spotlight cones, and a round sawdust-and-velvet ring floor in the lower third with a red-and-gold padded ring curb. Warm, friendly, evening light. No characters |
| `bg/acrobat-circus-ring` | 1440×1080 (4:3), opaque | One per station, drawn "cover" and anchored at the **bottom centre**, so the sides and top crop on wide or tall stations. The floor (sawdust ring) is the bottom 7% (y = 504 of 540 station units); keep everything above it plain, because the code draws the trampoline, trapezes, net, tightrope towers and ball on top | A close view of a circus ring's back wall: soft red-and-cream vertical tent stripes, a faint string of bulb lights along the top, a low red-and-gold ring curb in front of a sawdust floor band along the bottom 7%. Low detail and soft focus; nothing in the middle |
| `thumb/acrobat-circus` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Fox mid-somersault high above a bright blue circus trampoline inside a big top, confetti and sparkles around, a trapeze bar and a tightrope with a striped ball in the background. Subject centred |
| `prop/acrobat-trampoline` | 480×200, transparent | Bottom-centre anchor on the floor, drawn 300×125 station units (also 2.1× bigger in the finale). **The bed's top surface is 28% of the image height down from the top**; the character's feet touch it there. The code squashes the whole image up to 12% vertically when someone lands | A round-cornered circus trampoline seen from the front, slightly from above: a bright blue padded frame with yellow and red stripes, a dark navy stretchy bed, little spring zig-zags around the rim and four short sturdy legs |
| `prop/acrobat-trapeze` | 256×48, transparent | The bar only, centred on the bar point and drawn 120×22 station units; the characters stand on it. The ropes are drawn by the code from each end up to the pivot | A wooden trapeze bar wrapped in white tape with red stripes, with a small gold ring at each end where a rope ties on |
| `prop/acrobat-tower` | 160×480, transparent | One at each end of the tightrope, bottom-centre anchor on the floor, drawn 90×270 station units. **Its top deck surface is 7% of the image height down from the top**; the rope is tied there (both towers use the same image, the right one mirrored) | A slim circus tightrope tower: a red-and-white striped pole with a little ladder of gold rungs and a round blue platform deck with a gold rim at the top |
| `prop/acrobat-ball` | 256×256, transparent | Centred, drawn 130 station units across, and rotated by the code as it rolls (so it should look fine at any angle) | A big glossy circus balance ball with bold candy-coloured segments (pink, yellow, blue, mint) and a gold star on the side, highlight at the upper left |
| `prop/acrobat-parasol` | 160×160, transparent | Held for balance on the tightrope. Anchored at the **bottom of the handle** (bottom centre of the image), drawn 70 station units tall at the character's hand, tilted with the wobble | A small open frilly parasol: pink and white scalloped canopy with a little gold tip, a curved handle |
| `prop/acrobat-balloon-pink`, `prop/acrobat-balloon-blue`, `prop/acrobat-balloon-yellow`, `prop/acrobat-balloon-mint` | 96×128 each, transparent | Targets in the ball act (popped by hopping into them). Centred, drawn 52×68 station units; the code draws the string under it, so no string in the image | A round shiny party balloon with a little knot at the bottom and a white highlight, in pink / sky blue / sunny yellow / mint |

Optional pose for every roster character (the code already asks for it and
falls back to `crouch` until it exists): `tuck`, loop, fallback
`crouch` → `jump`: knees hugged to the chest in a tight somersault ball,
eyes squeezed happily shut (seen side-on; the game spins it).

## New Play Studio game: snowman-builder

### snowman-builder — Snowman Builder   (requested by the snowman-builder agent, 2026-10-05, priority: nice-to-have)

Every player has a snowy yard. They push a snowball that grows as it rolls
through the snow (leaving a grassy track behind it), stack three balls on
their snowman spot, then the view zooms in and they decorate it with coal
eyes, carrot noses, hats, scarves, stick arms, buttons and friends. Finale:
night falls, all the snowmen line up under twinkle lights, come alive and
wave, and everyone poses for a photo. Every key below has a procedural
fallback that ships today, and the code already looks each one up, so a file
listed in `assets/art/index.json` drops in with no code change. House style:
navy `#24163f` outlines, soft cel shading, bright candy colours, **no text**.
Decorations are drawn at a size relative to the ball they sit on; the "box"
below is the size in game units at the reference ball radius of 60 (the code
fits the image into it, contain). The pixel sizes asked for are 4× that.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/snowman-builder` | 1920×1080, opaque | Full screen behind the split yards (gutters and the top ~110 px HUD band show). Keep the top band calm | A cosy snowy village at blue hour: snow-capped gingerbread-style cottages with warm windows far left and right, pine trees, gentle snowfall, a pale lilac-blue sky. Low detail in the middle (yards cover it) |
| `bg/snowman-builder-yard` | 2400×1200, opaque | Covers one player's yard (scaled to the yard's width, cropped at the sides on narrow yards). **The horizon must be at y = 400 px** (one third down): sky, hills and pines above it; below it a **plain, flat, smooth snow field** with no props, footprints or trails (the code draws the rolled grassy tracks, balls and snowman on it) | A sunny winter meadow seen from a little above: soft blue sky with two small clouds, rounded snowy hills with a few frosted pine trees along the horizon, a tiny red barn far away; the foreground is an even field of fresh, slightly sparkly snow with soft blue shading |
| `bg/snowman-builder-night` | 1920×1080, opaque | Full screen for the finale. The snowmen stand in one row with their bases on y ≈ 900 and their builders beside them. Keep y 300–1000 across the centre clear of big objects | A magical snowy hilltop at night: deep navy-to-violet sky with a soft green-pink aurora, a big round moon, twinkling stars; strings of warm fairy lights looping between pine trees at the far left and right; a smooth moonlit snow floor from y ≈ 760 down |
| `thumb/snowman-builder` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A cheerful three-ball snowman with coal eyes, a carrot nose, a red bobble hat, a striped scarf and waving stick arms, next to a big snowball leaving a grassy track; Fox pushing the snowball; sparkles and snowflakes. Subject centred |
| `prop/snowman-ball` | 512×512, transparent | A snowball fitted to its diameter, centred on the ball. Not rotated (the code adds rolling speckles on top), so light from the upper left | A single round packed snowball: white with soft lilac-blue cel shading on the lower right, a few tiny sparkles, slightly lumpy edge. Round silhouette filling the canvas |
| `prop/snowman-coal` | 88×88, transparent | Coal eye / coal button; centred on the placed point; box 22×22 | A small shiny lump of coal, dark navy-charcoal with a white glint |
| `prop/snowman-googly` | 120×120, transparent | Googly eye; centred; box 30×30 | A round googly eye: white disc, navy outline, big navy pupil low-right |
| `prop/snowman-carrot` | 256×96, transparent | Carrot nose; the **thick end is at the left edge, vertically centred** (the anchor stuck in the snow), pointing right (mirrored on the left side); box 64×24 | A chunky orange cartoon carrot with soft ridges and a tiny green tuft at the thick end, pointing right |
| `prop/snowman-smile` | 280×120, transparent | Coal smile; centred; box 70×30 | Five little coal lumps in a happy smile arc |
| `prop/snowman-cheek` | 120×72, transparent | Rosy cheek; centred; box 30×18 | A soft pink blush oval with a tiny white sparkle |
| `prop/snowman-shades` | 360×136, transparent | Sunglasses; centred; box 90×34 | Fun heart-shaped pink sunglasses, front view |
| `prop/snowman-tophat` | 320×320, transparent | Top hat; **anchor bottom-centre (brim)**; box 80×80; tilted with the head | A navy top hat with a red ribbon band and a sprig of holly |
| `prop/snowman-bobble` | 336×320, transparent | Bobble hat; anchor bottom-centre; box 84×80 | A knitted red-and-white striped beanie with a fat white pompom and a folded cuff |
| `prop/snowman-partyhat` | 224×336, transparent | Party hat; anchor bottom-centre; box 56×84 | A tall pink-and-yellow polka-dot party cone with a pompom on top |
| `prop/snowman-tiara` | 288×160, transparent | Tiara; anchor bottom-centre; box 72×40 | A sparkly silver-and-pink princess tiara with a heart gem, front view |
| `prop/snowman-earmuffs` | 480×240, transparent | Earmuffs; centred on the placed point (top of the head); box 120×60 | Fluffy lilac earmuffs on a curved band, front view |
| `prop/snowman-arm` | 480×240, transparent | Stick arm; **anchor at the left edge, vertically centred (the shoulder)**, pointing right; the code rotates and mirrors it and swings it to wave; box 120×60 | A brown twig arm with a knobbly bend and three little twig fingers at the end |
| `prop/snowman-mitten` | 136×160, transparent | Mitten; centred; box 34×40 | A cosy knitted teal mitten with a white snowflake pattern and cuff |
| `prop/snowman-heart` | 120×112, transparent | Heart button; centred; box 30×28 | A glossy candy-pink heart button with two stitch holes |
| `prop/snowman-star` | 136×136, transparent | Star badge; centred; box 34×34 | A plump golden star with a white highlight |
| `prop/snowman-bowtie` | 240×120, transparent | Bow tie; centred; box 60×30 | A red bow tie with white polka dots |
| `prop/snowman-flower` | 160×160, transparent | Flower; centred; box 40×40 | A cheerful five-petal pink flower with a yellow centre |
| `prop/snowman-bird` | 224×176, transparent | Little bird friend; **anchor bottom-centre (its feet)**, facing right (mirrored on the left); box 56×44; it hops and flaps in the finale | A round little red cardinal-style bird with a tiny orange beak, smiling, sitting |
| `prop/snowman-broom` | 240×680, transparent | Broom; centred; box 60×170; leaned by the code | A rustic straw broom with a wooden handle tied with red string |
| `prop/snowman-scarf` | 240×400, transparent | Scarf tail only (the code draws the wrap around the ball in the chosen colour); anchor top-centre; box 60×100. Paint it plain white/light grey (it is recoloured in code) | A knitted scarf end with a fringe, plain white with soft grey shading, hanging straight down |

**New sprite pose (optional; the game reads fine without it):**
`roll-push` (loop; fallback `push` → `walk`): walking bent forward with both
hands (or paws, or the head for armless characters) pressed against a big
snowball in front, pushing it along. Used the whole time a player rolls a
snowball. Until it exists the game uses `walk`.

## New Play Studio game: star-maker

### star-maker — Star Maker   (requested by the star-maker agent, 2026-10-05, priority: nice-to-have)

A cosy night sky on a hilltop: players place stars, join them into
constellations, and each finished constellation comes alive as a glowing
"star spirit" animal that plays in the sky. A friendly Moon in a nightcap
crosses the sky as the clock. Everything below has a procedural fallback that
ships today; the code already looks up every key, so a file listed in
`assets/art/index.json` drops in with no code change. House style: navy
`#24163f` outlines (except the glowing spirits, see below), soft cel shading,
bright candy colours, **no text** in any image. The stars, constellation
lines, shooting stars and the twinkling star field stay procedural (they are
tinted per player and animated). Reused as they are: the roster sprites
(`look-up`, `cast`, `cheer`, `celebrate`, `wave`, `photo`, `strike3` and the
shared photo poses).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/star-maker` | 1920×1080, opaque | Full screen, drawn at 0,0. The sky (y 0–840) must stay calm: the code draws ~250 twinkling stars, the players' constellations, the Moon and the spirits on top. The hill crest runs across the width at about y 930–960; characters stand on it with their feet at y≈1040. Keep the bottom-left 120×120 plain (an "i" button sits there) and the top ~100 px calm (HUD band) | A cosy hilltop under a deep night sky: a smooth gradient from deep indigo at the top to soft violet-plum near the horizon, a faint pink-teal milky-way haze running diagonally, only a handful of tiny painted stars. Below, soft rolling hills in layered indigo/purple with a gentle moonlit rim, a few round silhouetted trees at the far left and right edges, a small striped tent with a warm glowing lantern at the left, a little brass telescope on a tripod at the right, a long picnic blanket along the crest, fireflies. Cosy and calm, not dark or spooky |
| `thumb/star-maker` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Night sky over a little hill: a glowing star-line constellation of a bunny with its luminous pastel bunny spirit hopping out of it, a smiling crescent Moon wearing a pink striped nightcap, a shooting star, and a girl character on the hill pointing up with a star wand. Subject centred, candy-bright on deep indigo |
| `prop/star-maker-moon` | 400×400, transparent | The Moon friend. Drawn centred on the moon position, fitted to a 190×190 box (the moon disc is ~150 px across). Bobs and tilts in code. Disc centred, about 70% of the canvas; the nightcap may poke out at the top-right | A round, pale buttery-yellow full Moon with a soft cratered texture, a sweet sleepy-happy face (closed happy arc eyes, rosy cheeks, small smile) and a pink-and-white striped nightcap with a white pompom flopping to the right, soft glow edge |
| `prop/star-maker-moon-wow` | 400×400, transparent | Same framing as `prop/star-maker-moon`; shown for ~1 s when a constellation comes alive or a wish is caught | Same Moon and nightcap, delighted: big open sparkly eyes and a round "oo" mouth, cheeks extra rosy |
| `prop/star-maker-moon-wink` | 400×400, transparent | Same framing; shown when the Moon talks (text bubbles) | Same Moon and nightcap, winking with one eye and a big smile |
| `prop/star-maker-moon-sleepy` | 400×400, transparent | Same framing; shown at the end of the night (showcase) | Same Moon and nightcap, eyes half closed, a tiny yawn, very cosy |
| `prop/star-maker-bunny`, `prop/star-maker-kitty`, `prop/star-maker-bird`, `prop/star-maker-butterfly`, `prop/star-maker-fish`, `prop/star-maker-whale`, `prop/star-maker-unicorn`, `prop/star-maker-dragon` | 512×512 each, transparent | The star spirits. Drawn centred on the creature, fitted to a square of 2 × its size (the constellation's size), mirrored in code to face left, with code-side hop, bob, squash, spin and a soft coloured halo drawn underneath in the owner's colour. So: **facing right, side view (butterfly: front view), centred, filling ~85% of the canvas**, no ground, no shadow | Luminous constellation spirits, like a star chart drawing come to life: a cute <bunny / kitty / little songbird / butterfly / round fish / friendly whale / unicorn / small friendly dragon with tiny wings> made of soft glowing white-to-pastel light with a bright white glowing outline (instead of the navy outline), a translucent pale lilac-blue body with tiny star sparkles inside, a few bright star points at its joints (eye, paws, tail tip), happy closed-arc or dot eyes. Gentle and cuddly, never scary |

Optional future upgrade (no code change needed until frames exist): a
`point-up` pose (loop: no; fallback `cast` → `action`) of the character
pointing a finger or paw up at the sky, would sell placing a star better than
`cast`.

## New Play Studio game: aquarium

### aquarium — Dream Aquarium   (requested by the aquarium agent, 2026-10-05, priority: nice-to-have)

Everyone shares one big fish tank: pick a sand colour, place plants,
castles, shells, bubblers and glow lights on the sand, then add and name
fish that swim around with their own personalities. The finale is a night
show (lights out, glowing decorations) with fish close-ups and a group
photo. Everything below has a procedural fallback that ships today, and the
code already looks up every key, so a file listed in
`assets/art/index.json` drops in with no code change.

**How the tank is laid out (1920×1080 screen).** Title ribbon above the
tank (y 20–110); lid y 118–176; water x 290–1630, y 190–890 (surface line
at y 196); sand floor from y 730 (back) to y 890 (front), drawn by code
(the colour is swappable, so sand is **not** requested); a wooden cabinet
y 890–950; the players' item bars cover y 950–1074. Characters stand on
the floor left (x < 260) and right (x > 1660) of the tank while building,
and in a row in front of the cabinet during the show.

**Decor props** stand on the sand: anchor = bottom centre, drawn at the
listed world size × a depth scale of 0.78 (back of the sand) to 1.05
(front). The code adds sway (a gentle skew from the base) to plants, the
bubbles, and all night-time glows on top, so images are **daytime, no glow
halos, no bubbles**. Request size is 2× the world size. Keys with a colour
suffix are one image per colour (the code recolours nothing).

**Fish** are side views facing **right**, centred in the canvas, drawn at
the listed size × 0.72–1.05; the code mirrors them to swim left and adds a
tail wiggle (horizontal squash), so the tail should be a separate-looking
fan at the left end and the body plain enough to wiggle. Friendly, big
eyes, closed smiling mouths, nothing scary. House style: navy `#24163f`
outlines, soft cel shading, bright candy colours, **no text**.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/aquarium` | 1920×1080, opaque | Full screen behind everything. The tank (code-drawn frame, water, sand, cabinet) covers x 270–1650, y 110–950, so that area can be plain; the title ribbon sits at the top centre; characters stand on the floor at both sides (y ≈ 760–940) | A cozy pastel playroom wall: soft aqua-and-cream striped wallpaper with tiny bubbles and starfish, a round porthole-style window at the upper left showing a sunny sky, a little shelf with plants and books at the upper right, a warm honey-wood floor from y≈930 down. Calm in the centre |
| `bg/aquarium-water` | 1340×700, opaque | Stretched over the water rect (x 290–1630, y 190–890), behind all decor and fish. The code draws the sand over the bottom ~160 px, and adds light rays, caustics, the surface line and the night overlay | A printed aquarium backdrop: a soft turquoise-to-deep-blue underwater scene with faint, low-contrast distant rocks, coral and seaweed silhouettes near the bottom, gentle light from the top. No fish, no bubbles, no sand in front |
| `thumb/aquarium` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A bright, happy fish tank seen from the front: a pink sandcastle on golden sand, swaying green seaweed, a bubbling diver helmet, a smiling goldfish, a striped clownfish by a pink anemone, a yellow pufferfish and a little seahorse; bubbles and sparkles. Centred |
| `prop/aq-kelp-green`, `-teal`, `-plum` | 240×720, transparent | World 120×360, bottom anchor; swayed by a skew that grows toward the top | Tall wavy seaweed: three ribbon fronds with round air-bladder bobbles, in green / teal / plum purple |
| `prop/aq-fern-green`, `-lime`, `-red` | 400×340 | World 200×170, bottom anchor, sways | A bushy aquarium plant (java-fern style) with long rounded leaves fanning out from a short base, in green / lime / ruby red |
| `prop/aq-anemone-pink`, `-purple`, `-orange` | 360×300 | World 180×150, bottom anchor; tentacle tips sway; clownfish nestle in it | A friendly sea anemone: a round squat body with a crown of soft, fat, rounded tentacles with lighter tips, in pink / purple / orange |
| `prop/aq-coral-pink`, `-orange`, `-purple` | 380×380 | World 190×190, bottom anchor | Branching coral with rounded, knobby fingers on a small rock base, in pink / orange / purple |
| `prop/aq-seagrass-green`, `-gold`, `-blue` | 340×300 | World 170×150, bottom anchor, sways | A clump of slender grass blades from a small mound, in green / golden yellow / blue |
| `prop/aq-castle-pink`, `-lilac`, `-sky` | 660×660 | World 330×330, bottom anchor. Fish "swim through" the arched door at the bottom centre (they are hidden for a moment and pop out of a window) | A storybook aquarium castle: two round towers with cone roofs and a taller centre keep, a round arched doorway at the bottom centre (dark inside), round windows, little flags, cute stone texture, in pink / lilac / sky blue |
| `prop/aq-tower-pink`, `-lilac`, `-sky` | 300×520 | World 150×260, bottom anchor | A single slim castle turret with a cone roof, a round window and a small arched door, matching the castle |
| `prop/aq-shellhouse-pink`, `-peach`, `-lilac` | 460×460 | World 230×230, bottom anchor | A cute house made from a giant spiral seashell lying on its side: a round front door, a round window with a flower box, a little chimney, in pink / peach / lilac |
| `prop/aq-arch-grey`, `-sand`, `-pink` | 600×400 | World 300×200, bottom anchor. Fish swim through the opening (centre, lower 60 %) | A smooth rounded rock arch, wide opening, with a few small pebbles at the feet and a tuft of moss, in soft grey / sandstone / pink |
| `prop/aq-boat` | 680×460 | World 340×230, bottom anchor, slightly tilted already | A cute little sunken sailboat resting on the sand: round wooden hull with portholes, a short mast with a patched pastel sail, a heart on the bow. Friendly, not spooky |
| `prop/aq-scallop-peach`, `-pink`, `-white` | 180×160 | World 90×80, bottom anchor | A scallop shell standing up like a fan, ridged, in peach / pink / pearly white |
| `prop/aq-conch-pink`, `-cream`, `-lilac` | 220×160 | World 110×80, bottom anchor | A spiral conch shell lying on its side with a glossy pink opening, in pink / cream / lilac |
| `prop/aq-starfish-orange`, `-pink`, `-purple`, `-yellow` | 180×160 | World 90×80, bottom anchor, standing upright and slightly tilted | A chubby five-armed starfish with dotted texture and a sweet little smile, in orange / pink / purple / yellow |
| `prop/aq-clam-white`, `-pink`, `-blue` | 240×180 | World 120×90, bottom anchor. **Shell only, open**: the code draws the pearl in the middle | An open clam shell (hinge at the back) with ridged halves, in pearly white / pink / pale blue |
| `prop/aq-pebbles-rainbow`, `-ocean`, `-candy` | 280×120 | World 140×60, bottom anchor | A small heap of round, glossy aquarium pebbles: rainbow mix / blues and teals / pinks and lilacs |
| `prop/aq-rock-grey`, `-sand`, `-slate` | 400×280 | World 200×140, bottom anchor | A big smooth rounded boulder with a flat-ish top and a small moss patch, in grey / sandstone / blue slate |
| `prop/aq-airstone-blue`, `-pink` | 140×80 | World 70×40, bottom anchor. Bubbles stream up from its top centre (code) | A small round aquarium air stone on a tiny disc, porous texture, in blue / pink |
| `prop/aq-diver-brass`, `-silver` | 280×300 | World 140×150, bottom anchor. Bubbles puff from the top valve (code) | A vintage diving helmet toy sitting on the sand: round dome, three round windows (front one a bit larger), bolts, a little valve on top, in brass / silver |
| `prop/aq-volcano-red`, `-purple` | 360×320 | World 180×160, bottom anchor. The code adds bubbles from the crater and a lava glow at night | A cute little volcano ornament with a wide crater, smooth rocky sides and bright lava stripes running down, in red-orange lava / purple-pink lava |
| `prop/aq-chest` | 300×240 | World 150×120, bottom anchor. **Closed chest only**: the code draws the lid popping open (a burst of bubbles and sparkles) by itself | A treasure chest with a rounded wooden lid, gold bands, a heart-shaped lock and a few gold coins and pearls peeking out at the seam |
| `prop/aq-glowstone-blue`, `-pink`, `-green` | 200×240 | World 100×120, bottom anchor; glows at night (code) | A cluster of 3–4 smooth, rounded crystal points on a small rock, translucent, in blue / pink / green |
| `prop/aq-lantern` | 160×280 | World 80×140, bottom anchor; the code lights the glass at night | A little underwater lantern on a short post: round glass globe in a brass frame with a ring handle |
| `prop/aq-glowshroom-teal`, `-pink`, `-purple` | 240×220 | World 120×110, bottom anchor; caps glow at night (code) | Three cute round-capped mushrooms of different heights with white spots, in teal / pink / purple |
| `prop/aq-moonlight` | 200×300 | World 100×150, bottom anchor; glows at night | A smiling crescent-moon lamp on a curly stand with a little star hanging from its tip, pale yellow |
| `prop/aq-goldfish-orange`, `-gold`, `-calico`, `-red` | 220×160 | Fish, world 110×80, centred, facing right | A chubby goldfish with a big double fan tail, round eyes, rosy cheeks: orange / gold / calico (white with orange and black patches) / red |
| `prop/aq-clownfish-orange`, `-pink`, `-purple`, `-blue` | 200×128 | Fish, world 100×64 | A round clownfish with three white navy-edged stripes and rounded fins: orange / pink / purple / blue |
| `prop/aq-angelfish-lilac`, `-gold`, `-sky`, `-pink` | 220×260 | Fish, world 110×130 (tall) | A tall triangular angelfish with long trailing top and bottom fins and soft vertical stripes: lilac / gold / sky / pink |
| `prop/aq-puffer-yellow`, `-sky`, `-pink`, `-mint` (+ `-puffed` for each, e.g. `prop/aq-puffer-yellow-puffed`) | 200×168 normal, 260×260 puffed | Fish, world 100×84 (puffed 130×130). Puffed = a round ball with soft little spikes and a surprised-happy face | A plump pufferfish with tiny fins, round body, freckled back: yellow / sky / pink / mint |
| `prop/aq-betta-blue`, `-red`, `-purple`, `-pink` | 260×220 | Fish, world 130×110 | A betta fish with huge flowing veil fins and tail like a ballgown: royal blue / red / purple / pink |
| `prop/aq-tetra-neon`, `-rainbow`, `-pink`, `-gold` | 108×52 | Fish, world 54×26 (they swim in threes) | A tiny slim tetra with a glowing stripe along its side: neon blue-and-red / rainbow / pink / gold |
| `prop/aq-seahorse-yellow`, `-pink`, `-orange`, `-purple` | 120×240 | Upright, world 60×120, centred, facing right; the code bobs and sways it | A cute seahorse with a curled tail, little back fin, snout and a crown-like crest: yellow / pink / orange / purple |
| `prop/aq-jellyfish-pink`, `-lilac`, `-blue`, `-peach` | 180×280 | World 90×140, centred on the bell's centre (bell in the top 45 %); the code pulses it (squash) and glows it at night | A friendly translucent jellyfish with a round bell, a sweet face and soft frilly ribbon tentacles: pink / lilac / blue / peach |

No new sprite poses are needed: the game uses `cheer`, `point`, `toss`,
`surprised`, `giggle`, `wave`, `dance`, `celebrate` and the shared photo
poses.

## New Play Studio game: sandcastle-beach

### sandcastle-beach — Sandcastle Beach   (requested by the sandcastle-beach agent, 2026-10-05, priority: nice-to-have)

Everyone builds a sandcastle on their own patch of a sunny beach: bucket
molds (round towers, pointy towers, walls, domes), moats dug with a spade
that fill with sea water, and shells, starfish and flags. Friendly crabs
wander across the sand. The finale is a gentle wave (it fills the moats and
leaves a present, it never knocks anything down) and a sunset tour of every
castle. Everything below has a procedural fallback that ships today; the
code already looks up every key. House style: navy `#24163f` outlines, soft
cel shading, bright candy colours, **no text**. Castle pieces are seen in a
gentle three-quarter view from the front and slightly above (we see the top
of each mold as an ellipse about 0.45 × as deep as it is wide).

"Units" below are the game's world units; on screen they are scaled by the
plot zoom k (about 0.75 at 8 players, 1.25 at 1–2 players). Props are
drawn with `drawArt(..., { anchor: 'bottom' })`, so the **bottom centre of
the image is the front edge of the piece's footprint on the sand** (the
lowest point of its base ellipse). Leave no empty margin at the bottom.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/sandcastle-beach` | 1920×1080, opaque | Full screen. **Layout must match:** sky from y=0 to the horizon at y=150, calm sea from 150 to the foamy shoreline at about y=330, a band of darker wet sand to y≈370, then dry sand to the bottom. The players' plots are drawn on the dry sand (y 360–1066), so keep it plain and low-contrast; a few beach things (umbrella, towel, ball, bucket) only at the far left/right edges between y 380 and 600. Keep the top 110 px calm (HUD) | A sunny cartoon beach seen from the sand looking out to sea: pale blue sky with two soft clouds, a turquoise sea with gentle sparkles, a lacy white foam line, smooth golden sand with a faint ripple texture. A striped umbrella at the far left and a towel at the far right |
| `bg/sandcastle-beach-sunset` | 1920×1080, opaque | Same layout as `bg/sandcastle-beach` (horizon y=150, shoreline y≈330); crossfaded over it during the sunset tour. The code draws the sun itself (setting at the horizon around x=960), so leave the sun out | The same beach at sunset: peach-pink-lilac sky with soft orange clouds, a deep coral-and-violet sea with a golden glitter path down the middle, sand washed warm apricot with long soft shadows |
| `thumb/sandcastle-beach` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A big cheerful sandcastle with round towers, a pointy tower, little pink and blue flags, shells and an orange starfish, a blue moat around it, a smiling red crab waving a claw in the front corner, a sand bucket and spade, blue sea and sky behind. Subject centred |
| `prop/sandcastle-tower` | 192×256, transparent | Round bucket tower, footprint radius 40 units; drawn in a 96×128-unit box. Its flat top (the stacking surface, which the code uses at 104 units up) has square battlements around the rim | A round sandcastle tower made with a bucket: packed golden sand with faint horizontal bucket ridges, little square battlements on top, soft shading on the right side |
| `prop/sandcastle-tower-window` | 192×256, transparent | Same as `prop/sandcastle-tower` (style 2) | The same tower with a small arched dark window in the middle and a shell pressed above it |
| `prop/sandcastle-tower-door` | 192×256, transparent | Same as `prop/sandcastle-tower` (style 3) | The same tower with an arched wooden-brown door at the base and two tiny windows |
| `prop/sandcastle-pointy` | 160×320, transparent | Pointy tower, footprint radius 28 units; drawn in a 70×150-unit box. Nothing stacks on it | A slim sand turret with a cone roof made with a cone mold, drippy sand rings on the cone, a tiny round window |
| `prop/sandcastle-wall` | 256×176, transparent | Wall running left-right, footprint 120×34 units; drawn in a 128×84-unit box. Top at 58 units | A straight sand wall with square battlements along the top, packed golden sand with a few pressed-in pebbles |
| `prop/sandcastle-wall-side` | 128×208, transparent | The same wall turned to run away from the viewer (style 2), footprint 34 wide × 100 deep; drawn in a 60×100-unit box. Top at 58 units | The same sand wall seen end-on, receding into the distance (a narrow slab with battlements, longer top than front) |
| `prop/sandcastle-dome` | 224×160, transparent | Round sand dome (bowl mold), footprint radius 50 units; drawn in a 110×80-unit box. Top at 52 units | A smooth half-sphere of packed sand like an upside-down bowl, with a scalloped pattern pressed around its middle |
| `prop/beach-shell-scallop`, `prop/beach-shell-conch`, `prop/beach-shell-clam` | 96×80 each, transparent | Decorations, drawn in a 40×34-unit box on the sand or on top of a piece | A pink scallop shell; a cream-and-peach spiral conch; a lilac clam shell slightly open with a tiny pearl |
| `prop/beach-starfish-orange`, `prop/beach-starfish-pink`, `prop/beach-starfish-purple` | 96×96 each, transparent | Decoration, drawn in a 44×44-unit box, slightly tilted toward the viewer | A friendly five-armed starfish with little bumps (dots) on its arms, in orange / bubblegum pink / lavender. No face |
| `prop/sandcastle-flag-pink`, `-blue`, `-yellow`, `-mint` | 96×192 each, transparent | Flag on a stick, drawn in a 40×80-unit box; the bottom of the stick is the anchor (it pokes into the sand or a tower top). The code waves it by skewing | A thin wooden stick with a triangular pennant flag in pink / sky blue / sunny yellow / mint, with a small white star on the pennant |
| `prop/beach-crab` | 256×192, transparent | The wandering crab NPC, drawn in a 64×48-unit box (bottom = its feet). The code bobs it, squashes it and tilts it while it walks sideways | A small round friendly red-coral crab, front view, two big claws raised happily, eyes on stalks, rosy cheeks and a smile, six little legs |
| `prop/sand-bucket` | 192×192, transparent | UI: the mold tools' icon on the tool bar and the hand cursor (drawn at 40–60 px) | A bright pink plastic beach bucket with a yellow handle and a little sand on the rim |
| `prop/sand-spade` | 160×192, transparent | UI: the moat tool's icon and the cursor while digging (40–60 px) | A blue plastic beach spade with a yellow handle |

No new sprite poses are needed: the code uses `dig`, `action`, `cheer`,
`surprised`, `giggle`, `celebrate`, `jump` and the shared photo poses.

## New Play Studio game: hair-salon

### hair-salon — Hair Salon   (requested by the hair-salon agent, 2026-10-05, priority: nice-to-have)

Every player runs a salon chair: a big friendly client sits in front of
them with messy hair, and the player brushes, snips, grows, curls,
straightens, colours (incl. rainbow streaks and glitter), ties it up
(ponytail, pigtails, bun, space buns, braid) and adds bows, flowers, clips
and tiaras. Then a hand-mirror reveal and a photo-wall showcase. The game
ships fully procedural today: every key below is already looked up with
`art()`/`drawArt()` and drops in with no code change once it is in
`assets/art/index.json`. **The clients and their hair stay procedural**
(the hair is live strand geometry that gets cut, grown and coloured), so
no client art is needed. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text** in any image. Reused as they
are: the roster sprites (`paint`, `cheer`, `celebrate`, `surprised`,
`wave`, `photo` and the shared photo poses).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/hair-salon` | 1920×1080, opaque | Full screen behind the split stations (shows as side columns at 1 player and as thin gutters at 2–8). Keep the top ~110 px calm (the HUD band and clock sit there) | A bright, cosy kids' hair salon wall: mint-and-pink striped wallpaper, a row of round lightbulb vanity mirrors along the top edge, shelves of colourful shampoo bottles and hair-spray cans at the far left and right, a black-and-white checkered floor strip at the bottom. Low detail in the centre |
| `bg/hair-salon-station` | 1200×1200, opaque | Cover-fitted (cropped, centred) behind one station's scene, between its header and tool bar; the code draws the chair, client and stylist on top. Keep the bottom ~22% as floor | One salon booth seen from the front: pastel wallpaper with tiny scissors-and-heart pattern feel (no text), a soft rounded arch outline on the wall, checkered pink-and-cream floor in the bottom 22%. Empty, nothing in the middle |
| `bg/hair-salon-photo` | 1920×1080, opaque | Full screen for the photo showcase. Client busts stand on pedestals with their heads around y≈260–620; stylists walk on the floor band y≈820–1010; the camera zooms in up to 1.6× | A glamorous photo wall in a salon: a sparkly pink sequin backdrop with a gold star-light garland across the top, two big gold-framed bulb mirrors at the far edges, a glossy pink stage floor in the bottom quarter. Centre kept plain for the clients |
| `thumb/hair-salon` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A happy cartoon salon client with big rainbow-streaked curly hair and a pink bow sitting in a pink salon chair, a pair of scissors, a comb and a spray bottle floating around her with sparkles, mint salon wall behind. Subject centred |
| `prop/salon-chair` | 640×720, transparent | Drawn behind the client, anchor bottom-centre at the bottom of the scene, width = 1.7 × the client's head width. Only the tall chair back shows above the client's shoulders, plus the base | A front-facing retro salon chair: tall rounded pink vinyl back with tufted buttons, chrome arms and a round chrome pump base. Empty |
| `prop/salon-hand-mirror` | 360×560, transparent | Mirror-reveal moment: anchor centre, the code draws the client's reflection inside an oval at the top 62% of the image (centre at 36% height, oval 78% of the width × 58% of the height), so that area must be plain glass | A big gold hand mirror with an oval glass, heart and pearl details on the frame, a pink handle with a bow. The glass is pale blue with a soft diagonal shine |
| `prop/salon-brush`, `prop/salon-scissors`, `prop/salon-grow-spray`, `prop/salon-curler`, `prop/salon-straightener`, `prop/salon-color-spray`, `prop/salon-hairtie`, `prop/salon-bling` | 160×160 each, transparent | Tool bar buttons and the cursor (hand) icon, drawn centred, fitted to ~1.1 × the slot. The colour spray is drawn with a separate colour swatch beside it, so keep its can neutral (white/silver) | Chunky toy-like salon tools: a pink paddle hairbrush; round-handled pink scissors (slightly open); a sparkly green "magic grow" spray bottle with a star nozzle; a purple barrel curling wand; a mint flat iron (hair straightener); a white spray-paint can with a rainbow band; a stretchy pink hair tie with a pearl; a glittery gold bow-and-star bling badge |
| `prop/hair-bow-pink`, `prop/hair-bow-blue`, `prop/hair-bow-yellow`, `prop/hair-flower-pink`, `prop/hair-daisy`, `prop/hair-clip-star`, `prop/hair-clip-heart`, `prop/hair-butterfly`, `prop/hair-tiara`, `prop/hair-crown` | 192×192 each (tiara and crown 256×192), transparent | Placed on the client's hair, anchor centre; drawn at ~0.55 × the head width (tiara/crown 0.8 ×) with a small tilt. Front view, centred | Hair accessories: a pink satin bow, a sky-blue bow with white polka dots, a sunny yellow bow; a pink five-petal flower with a yellow centre; a white daisy; a gold star hair clip with a gem; a red heart clip; a purple-and-pink butterfly clip; a silver tiara with pink gems; a small gold princess crown with three gems |

## New Play Studio game: pottery-wheel

### pottery-wheel — Pottery Wheel   (requested by the pottery-wheel agent, 2026-10-05, priority: nice-to-have)

Every player throws a pot at their own wheel (the clay is a smooth spinning
profile drawn by code), fires it in a little brick kiln (doors burst open for
a reveal), then glazes and decorates it on a slowly turning wheel with stripes,
dots and stickers. Finale: all pots on a gallery shelf with ribbons and a
photo. Everything below has a procedural fallback that ships today and is
looked up with `art()`/`drawArt()`, so a file in `assets/art/index.json` drops
in with no code change. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text** in any image. The pots themselves
are always drawn by code (their shape and paint are the player's), so they
are **not** requested. In the table, `k` is the station's pot scale
(pot units to pixels; about 0.44 at 8 players, 1.25 at 1 player).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/pottery-wheel` | 1920×1080, opaque | Full screen behind the split stations (shows as side columns at 1 player, thin gutters at 2–8). Keep the top ~110 px calm (title band) | A sunny pottery studio: whitewashed brick walls, wooden shelves along the far left and right edges with rows of colourful finished pots and bowls, hanging plants, a big window with soft daylight, a warm wooden floor strip at the bottom. Low detail in the centre |
| `bg/pottery-wheel-station` | 1200×900, opaque | Stretched (not cropped) over one station, so keep it simple and stretch-safe. The code paints its own wooden floor over the bottom ~22%, so that part is never seen | A cosy studio wall corner: soft cream plaster with a pastel tile strip, a small shelf high on the left with two tiny clay pots, a pegboard with clay tools (wire, sponges, ribs) at the upper right. No floor, no furniture in the middle |
| `bg/pottery-wheel-gallery` | 1920×1080, opaque | Full screen for the showcase. The code draws 1–2 long shelves across it (plank tops at y≈620 for 1–4 players, y≈430 and y≈760 for 5–8) and the characters stand on the floor band y≈930–1060 | A bright little craft gallery: pale lilac wall with a soft wainscot, two spotlights on a ceiling track at the top, potted plants in the corners, honey wooden floor from y≈930 down. Wall area kept plain (shelves and pots go on it) |
| `thumb/pottery-wheel` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A cute character (Cotton Candy) at a potter's wheel shaping a tall wet clay vase with both hands, clay splashes, a finished glazed pink-and-blue striped vase with heart stickers and a little brick kiln glowing in the background, sparkles |
| `prop/pottery-wheel` | 1040×520 (2:1), transparent | `drawArt(..., wheelX, floorY, 520k, 260k, { anchor: 'bottom' })`. **The wheel head's flat top surface is centred at x 50%, y 46% from the top**, as an ellipse 73% of the image wide and ~16% tall (the pot base sits on its centre). Above the head is empty. The code draws its own spin streaks on the head | A chunky kid-friendly electric potter's wheel seen from the front, slightly above: a round grey-blue metal wheel head on a rounded pastel-mint body with a splash pan ring, a little foot pedal on a cord on the floor at the right, small rubber feet |
| `prop/pottery-kiln` | 1280×1240, transparent | `drawArt(..., cx, floorY, 640s, 620s, { anchor: 'bottom' })`. The code draws the pot *inside* the door opening and the two doors on top, so the **opening must be an empty (transparent) arch**: centred at x 50%, 75% of the width wide, from y 18% (top of the arch) to y 87% (the inner floor, where the pot stands). Walls around it are the kiln | A cute rounded beehive kiln made of warm red-orange bricks with a navy outline, a little chimney on top-right puffing nothing (code adds smoke), a stone base with a glowing grate slot below the door, two small round vents on the sides |
| `prop/pottery-kiln-door` | 256×560, transparent | One door leaf, drawn twice (mirrored for the right one), hinged at its outer edge and squashed horizontally as it swings open; stretched to half the opening | A tall arched-top iron kiln door half: dark plum metal with rivets, a round porthole window near the top that glows orange, a gold handle on the inner edge |
| `prop/pottery-shelf` | 1800×160, transparent | Stretched over each showcase shelf, x 80–1840. **The plank's top surface line is at 25% from the top**; the pots stand on it | A long honey-wood display shelf plank seen from the front, slightly above, with two curly wrought-iron brackets underneath |
| `prop/pottery-rib` | 96×256, transparent | The shaping-tool cursor: drawn with its **working tip at the bottom centre** on the cursor, rotated ~25°, about 50k×130k | A wooden potter's rib/shaping stick: a smooth pale wood paddle with a rounded tip and a hole near the top |
| `prop/pottery-sponge` | 128×128, transparent | Cursor while smoothing (B held), centred on the cursor, ~60k | A soft round yellow craft sponge with little holes, a bit wet and shiny |
| `prop/pottery-brush` | 96×256, transparent | Paint cursor: **bristle tip at the bottom centre** on the cursor, rotated ~25°. The code tints a blob of the current colour over the tip, so keep the bristles light | A chubby paintbrush with a pink wooden handle, silver ferrule and pale cream bristles |
| `prop/pottery-sticker-heart`, `-star`, `-flower`, `-butterfly`, `-rainbow`, `-moon`, `-cat`, `-fish`, `-sun`, `-strawberry` | 128×128 each, transparent | Stuck on the turning pot: drawn centred, fitted to a ~44-unit box and squashed horizontally as the pot turns. Fill ~90% of the canvas, front view, flat sticker look | Glossy kawaii stickers with a thin white sticker border outside the navy outline: a pink heart; a yellow star; a five-petal pink flower with a yellow centre; a lilac butterfly; a rainbow arc with clouds; a smiling yellow crescent moon; an orange cat face; a sky-blue fish; a smiling sun; a strawberry |
| `prop/pottery-rosette` | 192×256, transparent | Award ribbon pinned under each pot on the shelf: drawn with the rosette's round centre at x 50%, y 38%; the code writes nothing on it | A gold prize rosette: a pleated gold ring around a plain cream centre disc, two short gold ribbon tails below |

Sprite pose (optional upgrade): `mold` (loop) — fallback `stir` → `paint`.
Leaning in, both hands (or paws/hooves) cupped forward at waist height around
something round, shaping it; used all through the shaping step. The game
reads fine with the fallback.
