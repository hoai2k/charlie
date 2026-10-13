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

Engine-side notes from the same review: several keys are aliases of one
file (`prop/sky-cake` = `prop/giant-cake`, `prop/pump` = `prop/balloon-pump`,
`prop/gem` = `prop/gem-red`, `prop/cookie-tile` = `prop/cookie-1`). That's
fine; the code uses one of each pair.

No open image or re-generation requests remain after the Play Studio delivery (2026-10-12). See IMAGE-WORK-QUEUE.md for the publication checkpoint.

## New Molly Party game: cupcake-stack

### cupcake-stack — Cupcake Tower   (requested by the cupcake-stack agent, 2026-10-05, priority: nice-to-have)

Everyone stacks ONE shared tower of cupcakes on a big cake stand in the
middle of a garden birthday party. Each player's cupcake zips back and forth
above the tower (carried by a little garden fairy in the player's colour);
press A to drop it. Sticky icing means every drop sticks, even crooked ones,
and the tower wobbles and giggles instead of falling. Cherries, candles and
golden super-cupcakes land on top; as the tower grows the camera climbs into
the sky (clouds, rainbow, twilight stars). Finale: everyone blows out all the
candles. Every key has a procedural fallback that ships today. House style:
navy `#24163f` outlines, soft cel shading, bright candy colours, **no text**
in any image. Reused as they are: the roster sprites (`toss`, `cheer`,
`blow`, `balance`, `giggle`, `celebrate`, `look-up`) and the
`garden-fairy-*` NPC sprites.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/cupcake-stack` | 1920×1080, opaque | Full screen at ground level; it scrolls down as the camera climbs, so its TOP edge must blend into a plain sky colour `#8fd6ff` (the code continues the sky above it). Characters stand on a lawn band at y≈900–1010; the cake stand sits centred at x=960 with its foot at y≈930 | A sunny garden birthday party: soft blue sky with a few clouds near the top, bunting and paper lanterns strung between two trees at the far left and right, a pastel picket fence, balloons tied to the fence, a striped grass lawn in the foreground. Calm, empty centre column (the tower goes there) |
| `thumb/cupcake-stack` | 800×500, opaque | Game-select shelf and how-to screen | A wobbly, tall, slightly crooked tower of colourful cupcakes on a white cake stand, lit candles and cherries poking out at funny angles, a garden fairy dropping one more cupcake from above, sparkles and confetti. Subject centred |
| `prop/cake-stand` | 640×320, transparent | Anchor bottom-centre on the lawn, drawn 560 px wide. The top plate surface is at 18% from the top; the first cupcake sits on it | A big white-and-pink porcelain cake stand: a wide flat round plate with a scalloped frilly edge, a curvy pedestal and a round foot, front view, slightly from above |
| `prop/cupcake-pink`, `prop/cupcake-blue`, `prop/cupcake-mint`, `prop/cupcake-lemon`, `prop/cupcake-lilac`, `prop/cupcake-choc`, `prop/cupcake-gold` | 256×224 each, transparent | Anchor centre; drawn 130 px wide (squashed and tilted by code). Bottom 45% wrapper, top 55% frosting. **Flattish frosting top with no topping** (the next cupcake sits on it) and a smiling face on the wrapper | A cute cupcake with a happy face (smiling eyes, rosy cheeks) on a striped paper wrapper, a puffy swirl of <pink / sky-blue / mint / lemon / lilac / chocolate / shiny gold> frosting with a few rainbow sprinkles, front view |
| `prop/cupcake-cherry` | 128×128, transparent | Anchor bottom of the cherry; drawn 46 px, perched on a frosting edge at a jaunty angle | One glossy red cherry with a curly green stem and a white shine |
| `prop/cupcake-candle` | 64×192, transparent | Anchor bottom-centre; drawn 26×78 px, poking out of the frosting at an angle. The code draws the flame | A thin twisted birthday candle with pastel spiral stripes (pink/white/blue), no flame, front view |
| `prop/candle-flame` | 96×128, transparent | Anchor bottom-centre at the wick; flickers via code scale | A small cartoon candle flame: orange outside, yellow inside, white core, soft glow |
| `prop/cupcake-topper-cake` | 760×600, transparent | Anchor bottom-centre, drawn 380×300 on top of the tower for the finale. The code draws the candles: keep the TOP of the upper tier flat and plain at about 68% up (lower-tier top at about 37% up) | A two-tier birthday cake with a happy face on the upper tier: pink bottom tier, cream top tier, white frosting drips, rainbow sprinkles, no candles, front view |

## New Molly Party game: ladybug-spots

> **ON HOLD (2026-10-13):** `ladybug-spots` is being replaced by `prank-troll` (the user wants some cheeky, rule-breaking Molly games). Don't start new art for this section. The replacement may reuse some of these keys; its own section will say which, and the rest will move to history as dropped.

### ladybug-spots — Ladybug Spots   (requested by the ladybug-spots agent, 2026-10-05, priority: nice-to-have)

A bright garden meadow seen from a high 3/4 view. A friendly ladybug (or a
bee, or a butterfly) zooms in and lands on a big daisy pad in the centre;
empty dashed circles on her back show how many spots she wants (1–5).
Players dash around catching the bouncy dots that zip about the meadow, then
bring them to her (touch or A). She counts them with chimes and zooms off;
an extra spot makes her sneeze it off. Bees want fluffy yellow pollen puffs,
butterflies want dots of the colour shown on their wings. **The code draws
the spots and slots on top of the critter art,** so shells and wings must be
plain areas (positions below). Every key has a procedural fallback that
ships today. House style: navy `#24163f` outlines, soft cel shading, bright
candy colours, **no text**.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/ladybug-spots` | 1920×1080, opaque | Full screen. The daisy pad is drawn by code at (960, 560); players run everywhere from y≈200 to y≈1010. Keep the top 110 px calm (HUD) | A sunny garden meadow from a high 3/4 view: soft green grass with mowed stripes, little daisies and clover dotted around, a few pebbles, tall flowers and leaves framing the left and right edges. Open, uncluttered middle |
| `thumb/ladybug-spots` | 800×500, opaque | Game-select shelf and how-to screen | A big smiling ladybug with a few black spots and some empty dashed circles on her shell, a bee and a butterfly flying behind, bouncy black dots in the air, flowers, sparkles. Subject centred |
| `prop/ladybug-pad` | 760×460, transparent | Anchor centre at (960, 560), drawn 620 px wide | A giant pink-and-white daisy lying flat, seen from above at a slight angle, with a yellow centre, used as a landing pad |
| `prop/ladybug` | 512×448, transparent | Anchor centre, drawn 300 px wide, facing right (the code flips her). **Shell:** a plain red dome (no spots) filling an ellipse centred at 44% x / 55% y, radii 33% × 35% of the image; the code draws slots and spots inside it. Head on the right | A cute chubby cartoon ladybug seen from above-front, glossy plain red shell with NO spots, black head with big sparkly eyes, rosy cheeks, a happy smile and two curly antennae |
| `prop/bee` | 512×448, transparent | Same layout as the ladybug: a plain pale-yellow fuzzy back in an ellipse centred at 44% x / 55% y (radii 33% × 35%) with two thin brown stripes only at its far left edge; the code draws pollen slots there | A round fluffy cartoon bumblebee seen from above-front, small clear wings, big happy eyes, rosy cheeks, two antennae |
| `prop/butterfly` | 640×448, transparent | Anchor centre, drawn 360 px wide. Two big plain pale upper wings: the code draws coloured dot slots in circles centred at 27%/40% (left wing) and 73%/40% (right wing), radius 16% of the width each. Body in the middle | A pretty cartoon butterfly seen from the front, wings open, pale lilac-white wings with a thin pastel rim and NO spots, a smiling face, curly antennae |
| `prop/ladybug-dot` | 128×128, transparent | Anchor centre, drawn 64 px; bounces around the meadow | A glossy round black dot with a white shine, slightly squishy, with tiny happy eyes |
| `prop/pollen-puff` | 128×128, transparent | Anchor centre, drawn 64 px | A fluffy round yellow pollen puff ball with soft fuzzy edges and tiny happy eyes |
| `prop/wing-dot-pink`, `prop/wing-dot-blue`, `prop/wing-dot-purple`, `prop/wing-dot-orange` | 128×128 each, transparent | Anchor centre, drawn 64 px | A glossy round <pink / blue / purple / orange> candy dot with a white shine and tiny happy eyes |

## New Molly Party game: rainbow-painter

### rainbow-painter — Rainbow Painter   (requested by the rainbow-painter agent, 2026-10-13, priority: nice-to-have)

A grey, sleepy sky world. Every player zooms around on a little paint cloud
and holds A to rain colour below it. Together they paint a huge rainbow band
by band, then two trees, a castle and a flower bed, and finally a sleepy sun
that wakes up and grins. Painted things come alive (birds sing, flowers
dance, castle flags wave). The rainbow itself stays procedural. Paint is
revealed through blobby "splat" masks, so every object needs a **grey**
version and a **colour** version with identical framing (same canvas size,
same silhouette position): the code draws the grey one, then the colour one
clipped to the painted blobs. Everything below has a procedural fallback.
House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, no text.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/rainbow-painter` | 1920×1080, opaque | Full screen, drawn first. Grey version of the world (no rainbow, trees, castle, flowers or sun: the code draws those). Rolling hills along the bottom from y≈880; open sky above. Keep it low-detail | A gentle cartoon landscape drained of colour: soft grey sky with pale grey puffy clouds, rolling light-grey hills at the bottom with a darker grey meadow strip, all in shades of cool grey with navy outlines on the hills |
| `bg/rainbow-painter-color` | 1920×1080, opaque | **Same framing as the grey bg.** Cross-faded on top of it as the whole picture gets painted (0 → 100 %) | The exact same landscape in full colour: bright sky blue fading to pale pink at the horizon, fluffy white clouds, lush green rolling hills with tiny daisies |
| `thumb/rainbow-painter` | 800×500, opaque | Game-select shelf / how-to (procedural `drawIcon` is the fallback) | A little garden fairy (no Charlie Party roster character) riding a tiny white cloud, raining rainbow paint drops onto a half-grey, half-coloured rainbow arc; a smiling sun peeking in the corner; sparkles |
| `prop/rp-cloud` | 400×220, transparent | The paint cloud each player rides. Drawn centred under the character's feet at about 230×126 px, wobbling. Keep the top flat-ish so a character can stand on it | A plump, soft white cartoon cloud with a flat-ish top, a faint lilac underside and two rosy blush spots, no face |
| `prop/rp-tree`, `prop/rp-tree-grey` | 420×560 each, transparent | Bottom-centre anchor (trunk base) at the canvas bottom; drawn about 300×400 px | A round lollipop-style cartoon tree: a big fluffy green crown with a few red apples and a brown trunk. Grey version: identical drawing in flat greys |
| `prop/rp-castle`, `prop/rp-castle-grey` | 720×680 each, transparent | Bottom-centre anchor; drawn about 470×445 px under the middle of the rainbow. The code adds waving flags on the two tower tips (towers peak at roughly x 25 % and 75 %, y 6 %) | A small fairy-tale castle: pink walls, lilac cone roofs on two side towers and a taller centre tower, a big round door, heart windows. Grey version: identical in flat greys |
| `prop/rp-flower-1`, `prop/rp-flower-2`, `prop/rp-flower-3`, `prop/rp-flower-grey` | 200×260 each, transparent | Bottom-centre anchor; drawn ~110×143 px in a row along the meadow, bobbing and dancing (the code rotates and squashes around the base) | A single cartoon flower with two leaves and a happy face in the middle: 1 pink daisy, 2 yellow tulip, 3 blue bell-flower. Grey version: the daisy in greys with its eyes closed |
| `prop/rp-sun-grey`, `prop/rp-sun-sleep`, `prop/rp-sun-awake` | 400×400 each, transparent | Centred, drawn ~300 px, top-right corner (x 1730, y 200). The code adds rotating rays behind it | A round cartoon sun face. Grey: pale grey, eyes shut, sleepy. Sleep: golden yellow, eyes shut, rosy cheeks. Awake: golden yellow, big open smile, sparkly open eyes |
| `prop/rp-bird`, `prop/rp-bird-flap` | 128×128 each, transparent | Centred, ~70 px, flutters around the painted trees; the flap frame alternates | A round little bluebird, side view facing right, open singing beak; wings up (bird) and wings down (flap) |
| `prop/rp-paint-star` | 256×256, transparent | Centred, drawn ~110 px; bounces across the sky, rotating a little (the code adds a soft glow) | A plump golden star with a happy face and a few rainbow paint drips running off its points |

Poses on player avatars: existing `idle`, `paint`, `cheer`, `celebrate`, `dance`, `surprised` only.

## New Molly Party game: garden-grow

### garden-grow — Silly Garden   (requested by the garden-grow agent, 2026-10-13, priority: nice-to-have)

Players run around a garden of dirt patches (3 rows × 5). A plants a seed;
holding A beside it waters it with a watering can. Each plant shoots up into
a silly surprise: a giggling giant sunflower, a carrot that pops out and
waves, bouncing strawberries, a pumpkin that rolls away across the garden,
or a flower that sneezes pollen everywhere. Ends with a garden party and
butterflies. Everything below has a procedural fallback. House style: navy
`#24163f` outlines, soft cel shading, bright candy colours, no text. All
plant props are seen from the front, standing on the ground.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/garden-grow` | 1920×1080, opaque | Full screen. Sky and picket fence above y≈330, lawn below where players run (the code draws the dirt patches at rows y 500 / 680 / 860). Keep the lawn plain | A sunny cottage garden seen from slightly above: blue sky with fluffy clouds, a white picket fence with rose bushes across the top third, then a wide plain bright-green lawn with soft mowing stripes |
| `thumb/garden-grow` | 800×500, opaque | Game-select / how-to | A little garden fairy (no Charlie Party roster character) with a watering can watering a giant giggling sunflower, a carrot waving from the dirt, a pumpkin rolling away, butterflies, water droplets |
| `prop/gg-dirt` | 260×140, transparent | Centred on each plot, drawn ~200×108 | A round mound of soft brown tilled garden soil with a few pebbles, top-down 3/4 view |
| `prop/gg-sprout` | 160×200, transparent | Bottom-centre on the plot, ~90×112 | A tiny green sprout with two round leaves popping out of the soil, cute and perky |
| `prop/gg-bud` | 200×280, transparent | Bottom-centre, ~120×168 | A taller leafy stalk with a closed round bud on top, wobbling as if about to burst |
| `prop/gg-sunflower`, `prop/gg-sunflower-giggle` | 360×720 each, transparent | Bottom-centre, drawn ~230×460 (much taller than the players), swaying | A giant sunflower on a tall stem with big leaves and a happy face in the brown centre. Giggle: same flower, eyes squeezed shut, mouth wide open laughing |
| `prop/gg-carrot` | 240×340, transparent | Bottom-centre, ~150×212; pops up from the soil and the code rocks it side to side | An orange carrot standing half out of the ground, leafy green top, cheerful face, one little arm raised waving |
| `prop/gg-strawberry-bush`, `prop/gg-strawberry` | 260×180 / 120×130, transparent | Bush bottom-centre ~190×130; three berries ~66×72 bounce up and down above it | A low leafy strawberry plant with white flowers; a single plump red strawberry with seeds, a leafy cap and a smiling face |
| `prop/gg-pumpkin`, `prop/gg-vine` | 260×240 / 260×120, transparent | Pumpkin centred (it rolls, the code rotates it), ~170×157; the vine stays on the plot, bottom-centre | A round orange pumpkin with a curly stem and a big friendly grin (not a jack-o'-lantern); a curly green pumpkin vine with leaves |
| `prop/gg-sneeze-flower`, `prop/gg-sneeze-flower-achoo` | 240×400 each, transparent | Bottom-centre, ~150×250 | A pink puffball flower with a face, nose twitching (eyes half shut, about to sneeze). Achoo: same flower, eyes shut tight, mouth wide in a big sneeze, petals blown back |
| `prop/gg-watering-can` | 160×120, transparent | Held in the character's hand, spout facing right, drawn ~70×52, tilted by code | A small shiny blue watering can with a sprinkler rose spout |
| `prop/gg-butterfly` | 160×128, transparent | Centred, ~80 px, flapping (the code squashes it horizontally) | A pretty butterfly seen from above, wings fully open, pink and purple wings with yellow dots |
| `prop/gg-rain-cloud` | 400×230, transparent | Centred, drawn ~300×170, drifts across the top of the lawn while the code rains drops under it | A plump happy rain cloud, white-blue with a smiling face and rosy cheeks, flat-ish bottom |

Poses on player avatars: existing `idle`, `walk`, `run` (moveAnim), `water`, `action`, `cheer`, `surprised`, `dizzy`, `dance`, `celebrate`.

## New Molly Party game: trick-or-treat

### trick-or-treat — Trick or Treat!   (requested by the trick-or-treat agent, 2026-10-05, priority: nice-to-have)

A friendly Halloween street at dusk. Everyone (in a dress-up costume from the
shared wardrobe, carrying a pumpkin bucket) dashes along the sidewalk, knocks
on doors with A, and silly visitors pop out with candy (or a harmless funny
trick). Every key below has a procedural fallback that ships today; the code
already looks each one up. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **nothing scary** (big friendly eyes, smiles),
no text. Existing candy art is reused when present (`prop/candy-wrapped`,
`prop/candy-lollipop`, `prop/candy-golden`, `prop/treat-candy`). The visiting
troll is the existing Troll NPC sprite wearing bunny ears.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/trick-or-treat` | 1920×1080, opaque | Full screen. Top ~110 px stays calm (HUD). The code draws six houses standing on a line at y≈700, so paint only sky, a far skyline and the ground: a sidewalk band from y≈700 to y≈1010 (players walk there) and a strip of street below it | A cosy, friendly Halloween evening street: purple-to-peach twilight sky with a big smiling-soft full moon, a few stars and wispy clouds, far rolling hills with tiny lit cottages and bare curly trees, a warm brick-and-stone sidewalk band across the lower third with fallen orange leaves, a lilac street strip at the very bottom. Empty of houses in the middle (the code draws them) |
| `thumb/trick-or-treat` | 800×500, opaque | Game-select shelf and how-to screen | Two little garden fairies (the existing pink and blue garden-fairy NPCs, no Charlie Party player characters) in tiny witch-hat and kitty-ear costumes, holding glowing pumpkin buckets at a decorated front door, a giggling friendly mummy leaning out of the door tossing wrapped candies, jack-o'-lanterns on the steps, purple twilight, sparkles |
| `prop/tot-house-0` … `prop/tot-house-5` | 400×560 each, transparent | Drawn 300×420, **anchored bottom-centre** on y≈700. The code draws the door over a rectangle centred horizontally from 58% to 93% of the height, 26% of the width wide, so paint a plain warm-dark doorway there; the porch steps are below 93% | Six different friendly decorated houses, front view: pastel siding (mint, lilac, peach, sky, pink, butter), porch light, glowing windows with a cat silhouette or cobweb with a smiling spider, jack-o'-lanterns, a garland of orange and purple bunting, little ghost cut-outs. Cute, never spooky |
| `prop/tot-door` | 160×240, transparent | Stretched over the door rect; the code swings it open (horizontal squash) | A rounded-top wooden front door painted purple with a round knocker and a tiny wreath of autumn leaves |
| `prop/tot-skeleton` | 256×320, transparent | Bottom-centre on the porch step, drawn ~190 px tall, the code bobs and wiggles it | A goofy friendly cartoon skeleton in a bow tie doing a happy dance, big round eye holes with sparkles, wide grin |
| `prop/tot-witch` | 256×320, transparent | Same | A sweet grandma witch with round glasses, a purple pointy hat with a flower, holding a plate of star cookies, rosy cheeks |
| `prop/tot-scarecrow` | 256×320, transparent | Same | A cheerful scarecrow with a smiling carved-pumpkin head, straw sticking out of a patched plaid shirt, waving |
| `prop/tot-mummy` | 256×320, transparent | Same | A small giggling mummy wrapped in loose bandages with one bandage trailing, hand over mouth laughing, big cute eyes |
| `prop/tot-cat` | 256×256, transparent | Same, drawn ~130 px tall | A fluffy black kitten with a big orange bow, sitting, green sparkly eyes, mouth open in a happy meow |
| `prop/tot-ghost` | 256×320, transparent | Same, floats | A round little white sheet ghost with rosy cheeks and a tiny witch hat, giggling |
| `prop/tot-candy-ghost` | 360×300, transparent | Centre; floats across the sky dropping candy | A chubby friendly white ghost flying, holding an open sack spilling colourful candy, happy face |
| `prop/tot-bucket` | 128×128, transparent | Held at the hand, drawn ~70 px, anchored at the top of the handle | A jack-o'-lantern trick-or-treat bucket with a black handle and a happy carved face (no candy; the code draws the candy heap) |
| `prop/tot-candy-0` … `prop/tot-candy-5` | 96×96 each, transparent | Centred, drawn ~44 px, spun | Halloween candies: orange wrapped candy, purple wrapped candy, a swirl lollipop, a chocolate bar in a green wrapper, a candy corn, a pink gumdrop |
| `prop/tot-chicken` | 160×160, transparent | Centred, bonks a player's head and bounces | A yellow rubber chicken, squeaky toy, mouth open, silly |
| `prop/tot-jack` | 200×260, transparent | Bottom-centre in the doorway; the code springs it up | A jack-in-the-box: a striped box with a silly sock-puppet ghost on a spring, confetti |
| `prop/tot-candy-pile` | 900×520, transparent | Bottom-centre in the middle of the street for the finale, drawn scaled up as it grows | A huge mountain of colourful Halloween candy: wrapped candies, lollipops, candy corn, chocolate bars, gumdrops, sparkles |

## New Molly Party game: dance-freeze

> **ON HOLD (2026-10-13):** `dance-freeze` is being replaced by `sneaky-dance` (the user wants some cheeky, rule-breaking Molly games). Don't start new art for this section. The replacement may reuse some of these keys; its own section will say which, and the rest will move to history as dropped.

### dance-freeze — Dance & Freeze   (requested by the dance-freeze agent, 2026-10-05, priority: nice-to-have)

Musical statues on a disco stage: while the music plays everyone dances
(stick = dance moves, A = jump-spin); when the record scratches and the lights
go icy blue, everyone FREEZES. Wiggly friends get tickled by a giant feather
(no one is out). Every key below has a procedural fallback that ships today.
House style: navy `#24163f` outlines, soft cel shading, bright candy colours,
no text. Professor Hoot (existing NPC) is the DJ.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/dance-freeze` | 1920×1080, opaque | Full screen. Top ~110 px calm (HUD). The code draws the light-up dance floor tiles from y≈560 to y≈1040 across the full width, the DJ booth at top-centre (x 960, y≈470) and the disco ball at (960, 150) | A sparkly kids' disco party hall: deep purple walls with big rounded arch windows, pink and gold stage curtains at both sides, string lights and paper stars, big speakers at the far left and right, a glossy floor area at the bottom (plain; tiles drawn on top) |
| `thumb/dance-freeze` | 800×500, opaque | Game-select shelf and how-to screen | Two little garden fairies (the existing yellow and purple garden-fairy NPCs, no Charlie Party player characters) on a glowing rainbow disco floor, one frozen in a silly flamingo pose with frosty sparkles, a giant pink feather tickling the other who is giggling, Professor Hoot at a DJ booth and a disco ball above |
| `prop/df-disco-ball` | 256×320, transparent | Hangs from the top: anchored top-centre (the string's top), drawn ~170 px | A big sparkly mirror disco ball on a short gold chain, pink and blue reflections |
| `prop/df-dj-booth` | 560×300, transparent | Bottom-centre at (960, 560), drawn 520 wide; Professor Hoot stands behind it, the code draws the spinning record on top at 35% from the left, 25% from the top | A rounded pastel DJ booth with rainbow light strips on the front, two turntables on top, a heart-shaped speaker grille |
| `prop/df-feather` | 160×420, transparent | Rotates around its quill end (bottom-centre), drawn ~200 px long, wiggles over a player | A huge fluffy pink-and-purple tickle feather with a gold quill |
| `prop/df-snowflake` | 256×256, transparent | Centred, the FREEZE icon in the HUD and over frozen players (60–220 px) | A chunky shiny ice-blue snowflake with a cute face and frosty sparkles |
| `prop/df-music` | 256×256, transparent | Centred, the DANCE icon in the HUD | Two bouncing rainbow music notes with sparkles |

## New Molly Party game: bubble-pop

### bubble-pop — Bubble Pop   (requested by the bubble-pop agent, 2026-10-05, priority: nice-to-have)

A cheeky bubble machine bobs on a little cloud at the top of a sunny garden
and blasts out streams of soap bubbles that swirl and drift down. Players
dash along the lawn and jump to pop them (combos chain!); each bubble holds a
surprise (duckling, star, confetti, rainbow, cupcake or a boing frog), shown
small inside the bubble and released on the pop. Giant bubbles take a few
bonks. Everyone's pops fill a shared bubble meter; when it is full, foam
surges up from the bottom for a bubble-bath finale with rubber ducks. Every
key has a procedural fallback that ships today. House style: navy `#24163f`
outlines, soft cel shading, bright candy colours, **no text**. Characters
use existing poses only (jump, fall, cheer, celebrate, eat, surprised,
giggle, float).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/bubble-pop` | 1920×1080, opaque | Full screen. Characters stand with their feet on y≈905; the lawn band runs from y≈870 to the bottom. The machine (drawn by code) sits top centre around y 90–360, the HUD meter at the top centre and chips along y≈985, so keep the top centre and the middle open sky | A sunny back garden at bath time: bright blue sky with a few light clouds, a pastel picket fence and round hedges with pink and yellow flowers along the far back, a bright green lawn across the bottom fifth with tiny daisies, a washing line with little towels far off at one side. Calm and open in the middle |
| `thumb/bubble-pop` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A tiny garden fairy (Charlie Party NPC style, pastel petal dress and sparkly wings; no Charlie Party player characters) mid-jump popping a big rainbow soap bubble with a little yellow duckling tumbling out, other bubbles with a star and a cupcake inside swirling around, a cute bubble machine with a face on a cloud above blasting bubbles. Energetic, subject centred |
| `prop/bubble-machine` | 640×480, transparent | Anchor bottom centre (the bottom of its cloud), drawn 520×390 at x≈W/2 (it slides left and right), bottom y≈360; the code squashes it when it puffs and spins a bubble wand ring in front of its nozzle | A chubby pastel-pink and mint bubble machine with a cheeky grinning face (big shiny eyes, rosy cheeks), a round nozzle on its front with a purple bubble-wand ring, a little crank on the side, sitting on a small fluffy cloud |
| `prop/bubble` | 256×256, transparent | Centred, drawn at 2.15 × the bubble radius (radii 46–64 normal, 120 giant), over the surprise inside, so the middle **must stay see-through** | A single soap bubble: a thin iridescent rim (pink, gold, mint, lilac swirls), a soft curved white highlight at the upper left and a tiny one at the lower right, an almost fully transparent centre. No outline |
| `prop/bubble-duckling` | 160×160, transparent | Centred, drawn about 90 px; flips horizontally to waddle; it flutters down and waddles away fast | A fluffy yellow duckling, side view facing right, tiny wings up as if giggling, eyes squeezed shut with happiness, orange beak open in a laugh |
| `prop/bubble-star` | 128×128, transparent | Centred, drawn about 80 px, spinning as it zips up to the meter | A plump golden star with a happy face (closed smiling eyes, rosy cheeks), a soft glow |
| `prop/bubble-cupcake` | 128×128, transparent | Centred, drawn about 80 px; it drops into the popper's hands | A tiny cupcake: mint wrapper, swirly pink frosting, rainbow sprinkles and a cherry |
| `prop/bubble-frog` | 160×160, transparent | Anchor bottom centre on the lawn, drawn about 100 px, flips to face its hop direction | A round little green frog sitting, side view facing right, big happy eyes on top, wide grin, pink cheeks |
| `prop/bubble-frog-hop` | 160×160, transparent | Same anchor and size as `prop/bubble-frog`, shown mid-hop | The same frog mid-boing: legs stretched out behind, arms forward, mouth open in a happy "wheee" |
| `prop/bubble-rainbow` | 400×220, transparent | Anchor bottom centre at the pop point, drawn 300 wide; it grows and fades | A small cartoon rainbow arc with a puffy white cloud at each end, little sparkles |
| `prop/rubber-duck` | 160×160, transparent | Centred, drawn about 110 px, bobbing on the finale foam | A classic yellow rubber duck toy, side view facing right, orange beak, a little shine, a tiny pink bow on its head |

## New Molly Party game: balloon-float

### balloon-float — Balloon Float   (requested by the balloon-float agent, 2026-10-05, priority: nice-to-have)

Every player holds a bunch of five balloons and flies over a meadow while a
brisk breeze rushes the sky past from right to left (it speeds up into gusts
and a final star storm). Hold A to zoom up, let go to swoop down; touching
the grass is a big friendly boing bounce. Hearts and stars stream past on
the breeze, puffy clouds with funny faces giggle when you burst through
them, and little birds wave hello and drop a heart. Every key has a
procedural fallback that ships today. House style: navy `#24163f` outlines,
soft cel shading, bright candy colours, **no text**. Characters use existing
poses only (float, cheer, celebrate, surprised, wave, giggle).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/balloon-float` | 1920×1080, opaque, **tiles seamlessly left to right** | Drawn twice side by side and scrolled left (parallax). The grass top edge must be at y≈960 all the way across (players bounce off it); HUD chips sit at the top (y 40–116) | A wide spring sky: bright blue fading to pale peach near the horizon, a few faint distant clouds, far-off rolling green hills with tiny trees and a little windmill, and a bright flowery meadow strip along the bottom (top edge at y≈960) with daisies and tulips. Left and right edges must match |
| `thumb/balloon-float` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A tiny garden fairy (Charlie Party NPC style, pastel petal dress and sparkly wings; no Charlie Party player characters) zooming through a blue sky holding a bunch of five bright balloons, a cloud with a silly face sticking its tongue out, a little bluebird waving its wing, hearts and stars streaming past. Energetic, subject centred |
| `prop/balloon-pink`, `prop/balloon-blue`, `prop/balloon-yellow`, `prop/balloon-mint`, `prop/balloon-purple` | 128×176 each, transparent | Anchor bottom centre at the knot, drawn 74×102 (scaled with the player); the code draws the strings from the knot to the player's hand and tilts/squashes the balloon | A single shiny round party balloon in <pink / sky blue / lemon yellow / mint / lilac>, slightly egg-shaped, a little tied knot at the bottom, a big soft white highlight at the upper left. No string |
| `prop/float-heart` | 128×128, transparent | Centred, drawn about 74 px, bobbing | A puffy glossy pink heart with a tiny sparkle |
| `prop/float-star` | 128×128, transparent | Centred, drawn about 78 px, spinning | A plump golden-yellow star with a soft glow and a tiny sparkle |
| `prop/float-golden-star` | 192×192, transparent | Centred, drawn about 130 px with a glow behind (worth 3) | A big shining rainbow-edged golden star with a happy face (closed smiling eyes, rosy cheeks) and twinkles around it |
| `prop/cloud-face` | 480×300, transparent | Centred, drawn 360×225 (some 1.3× bigger), drifting left | A big puffy white cloud with a silly face: small dot eyes, rosy cheeks, a little "o" mouth |
| `prop/cloud-face-giggle` | 480×300, transparent | Same cloud, same size and position; shown for ~1 s after someone bursts through it (the code squashes it) | The same cloud giggling: eyes squeezed shut, big open laughing mouth with its tongue sticking out, cheeks extra rosy |
| `prop/bird-fly` | 160×128, transparent | Centred, drawn about 96 px, facing left (flies right to left), alternates with `prop/bird-wave` | A round little bluebird flying, side view facing left, wings up, tiny orange beak, happy eyes |
| `prop/bird-wave` | 160×128, transparent | Same size; shown when it waves hello to a player | The same bluebird hovering and waving one wing like a hand, beak open in a cheerful chirp |

## New Molly Party game: ballet-butterflies

> **ON HOLD (2026-10-13):** `ballet-butterflies` is being replaced by `opposite-ballet` (the user wants some cheeky, rule-breaking Molly games). Don't start new art for this section. The replacement may reuse some of these keys; its own section will say which, and the rest will move to history as dropped.

### ballet-butterflies — Butterfly Ballet   (requested by the ballet-butterflies agent, 2026-10-13, priority: nice-to-have)

A follow-the-leader ballet class on a flower stage. A butterfly-fairy teacher
hovers at the top centre and shows a move (arms up, twirl, plié, side step)
next to a big picture card; everyone copies it, and each good copy sends
butterflies swirling round the dancer. Everything below has a procedural
fallback that ships today; the code already looks up every key. House style:
navy `#24163f` outlines, soft cel shading, bright candy colours, **no text**.
Reused as they are: the roster sprites (`dance-up`, `dance-down`,
`dance-side`, `pose-twirl`, `bow`, `cheer`, `celebrate`, `balance`) and the
shared wardrobe (`butterfly-wings`, `fairy-wings`, `petal-wings`, `tiara`,
`flower-crown`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/ballet-butterflies` | 1920×1080, opaque | Full screen. The stage floor runs from y≈600 to the bottom; dancers stand on it at y≈760–1010. The teacher hovers at the top centre (x 960, y 120–460) and the move card sits to her right (x≈1300–1640, y≈130–470): keep those areas calm. Top ~120 px stays calm for the HUD chips | A magical garden ballet stage at golden hour: a big round stage floor made of a giant pale-pink flower (petal-edged, glossy), framed by arching rose-and-vine curtains on the left and right, a soft lilac sky with fluffy clouds behind, tall tulips and daisies at the stage edges, tiny fairy lights strung across the top corners |
| `thumb/ballet-butterflies` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A little pink garden fairy in a tutu doing a ballet twirl on a flower stage, Madame Papillon the butterfly-fairy teacher (see `prop/ballet-teacher`) with huge rainbow wings above her (no Charlie Party player characters), colourful butterflies swirling around, petals in the air. Subject centred |
| `prop/ballet-teacher` | 512×640, transparent | The teacher idle. Anchor: bottom centre = her feet (she hovers; the code adds a bob and a soft shadow). Drawn 330 px tall, facing the viewer | Madame Papillon, a friendly butterfly fairy ballet teacher: tall graceful fairy with a lilac bun, a sparkly pink tutu leotard, ballet slippers, huge monarch-meets-rainbow butterfly wings, a tiny wand, warm smile. Standing in first position |
| `prop/ballet-teacher-up`, `prop/ballet-teacher-twirl`, `prop/ballet-teacher-plie`, `prop/ballet-teacher-side`, `prop/ballet-teacher-bow` | 512×640 each, transparent | Same anchor/size as `prop/ballet-teacher`; shown while she demonstrates each move (code still adds a spin for twirl and a dip for plié) | The same teacher, same scale: arms raised in a high round fifth position; mid-pirouette on one toe with the tutu flaring; deep plié with knees bent out and arms rounded low; a big side step with one leg pointed out and arms open to the side; a graceful curtsy-bow |
| `prop/ballet-move-up`, `prop/ballet-move-twirl`, `prop/ballet-move-plie`, `prop/ballet-move-side` | 256×256 each, transparent | Drawn centred inside the white move card (fitted to 240 px); the code draws the card, an arrow/button glyph under it and the animation | Simple bold pictograms a 4-year-old reads instantly: a little ballerina silhouette (pink, round head) with both arms straight up; spinning on one toe with swirl lines; knees bent low with a down-motion bounce line; stepping sideways with motion lines. Flat colours, navy outline |
| `prop/ballet-butterfly-pink`, `prop/ballet-butterfly-blue`, `prop/ballet-butterfly-yellow`, `prop/ballet-butterfly-purple` | 128×128 each, transparent | Seen from above, wings fully open, body vertical, centred. The code flaps it by squashing x and draws it 44–70 px wide | Cute cartoon butterflies with big rounded wings: pink with white polka dots; sky blue with lilac edges; lemon yellow with orange tips; purple with a pink heart pattern. Tiny dark body, curly antennae |
| `prop/ballet-petal` | 64×64, transparent | Centred, spun and drifted by the code for the final bow shower, drawn 22–34 px | A single soft pink rose petal, slightly curled, gentle gradient |

## New Molly Party game: wand-shapes

### wand-shapes — Magic Wand Shapes   (requested by the wand-shapes agent, 2026-10-13, priority: nice-to-have)

A big dotted shape appears in the twilight sky; everyone traces it together
with their wand sparkle (stick moves the sparkle). Finishing it casts a
spell and the shape comes alive. Everything has a procedural fallback; the
code already looks up every key. House style: navy `#24163f` outlines, soft
cel shading, bright candy colours, **no text**. Reused: roster sprites
(`wand-up`, `cast`, `cheer`, `celebrate`, `look-up`) and the wardrobe
`magic-wand`.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/wand-shapes` | 1920×1080, opaque | Full screen. Characters stand on a cloud ledge along the bottom (feet at y≈1010, ledge top y≈900). The dotted shapes fill the centre (circle of radius ~330 around x 960, y 480): keep it calm and darkish so glowing dots read. Top ~120 px calm for the HUD | A dreamy twilight sky: deep violet at the top fading to rose and peach at the horizon, a few soft stars, wispy pastel clouds at the sides, a row of big fluffy pink-lilac clouds along the bottom forming a standing ledge |
| `thumb/wand-shapes` | 800×500, opaque | Game-select shelf and how-to screen | A little blue garden fairy waving a glowing wand that draws a sparkly golden heart in the twilight sky (no Charlie Party player characters), the heart turning into a pink balloon, a frog in a bubble and a sleepy moon nearby. Subject centred |
| `prop/wand-sparkle` | 128×128, transparent | Each player's cursor, centred, drawn 70–90 px and spun; the code draws a player-coloured glow ring behind it | A chunky four-point magic sparkle star, white-gold core, soft glow edges |
| `prop/wand-bubble-frog` | 400×400, transparent | The circle spell, centred, drawn at 2× the circle's radius then shrunk as it floats | A big shiny soap bubble (rainbow sheen, highlight at upper left) with a cheerful little green frog sitting inside it, waving |
| `prop/wand-heart-balloon` | 360×480, transparent | The heart spell. Anchor: the heart's centre at (180, 180); the string hangs down from it | A glossy pink heart-shaped balloon with a white shine and a curly string with a little bow |
| `prop/wand-shooting-star` | 256×256, transparent | The star spell, centred, spun; the code draws its rainbow trail | A plump golden star with a happy face (closed smiling eyes, rosy cheeks), sparkles round its tips |
| `prop/wand-sleepy-moon` | 400×400, transparent | The moon spell, centred; the code bobs it and draws the Zzz | A smiling crescent moon (opening to the right) asleep, wearing a blue polka-dot nightcap with a pom-pom, eyes closed, rosy cheek |
| `prop/wand-rainbow` | 1000×520, transparent | The rainbow spell. Anchor: bottom centre; drawn ~800 px wide over the dotted arc | A bright seven-stripe rainbow arc with a smiling fluffy cloud at each foot |

## New Molly Party game: shape-train

> **ON HOLD (2026-10-13):** `shape-train` is being replaced by `bed-bounce` (the user wants some cheeky, rule-breaking Molly games). Don't start new art for this section. The replacement may reuse some of these keys; its own section will say which, and the rest will move to history as dropped.

### shape-train — Choo-Choo Shapes   (requested by the shape-train agent, 2026-10-05, priority: nice-to-have)

A happy toy train with a face zooms into the station. Each car has
shape-shaped windows (circle, square, triangle, star, heart), each shape in
its own colour; toy animals on the platform hold up matching shapes. Players
carry the animals to the right car and pop them in; full trains toot and
zoom around a loop in the background (through a tunnel, over a bridge, past
a waving cow). Everything below has a procedural fallback that ships today
and the code already looks up every key. House style: navy `#24163f`
outlines, soft cel shading, bright candy colours, **no text** in any image.
Shape colours used by the code: circle red `#ff5a5f`, square blue `#3fa2ff`,
triangle green `#3fcf6e`, star yellow `#ffcf2e`, heart pink `#ff6fbf`.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/shape-train` | 1920×1080, opaque | Full screen. **Layout must match:** sky y 0–230 (keep the top ~110 px calm, the HUD sits there); a far-away train track runs straight across at y≈318 (the small loop train drives on it, right to left); a green hill with a tunnel straddles the far track between x≈1370 and x≈1590 (dark tunnel mouths on the track at both x); a blue river crosses under the far track between x≈820 and x≈1080 with a little bridge carrying the track; a flowery meadow on the left (the code draws a cow standing at x≈560 with its feet at y≈300; it pops up from behind the meadow when the little train passes, so keep that spot plain grass). The foreground track (rails, sleepers, gravel) runs straight across with the rail tops at y≈486; the station platform (pale stone tiles, a yellow safety stripe along the edge at y≈530) fills y 520–1080. Leave the platform mostly plain (players walk all over it); small decorations only along the bottom and far left/right edges (flower pots, a bench, a lamp). Keep the bottom-left 120×120 calm | A sunny toy-town railway station in a storybook countryside: rolling green hills, a red-roofed station house far left (x 40–290, standing in front of the far track: the little train disappears behind it), pastel sky with puffy clouds, a toy railway looping through the scenery |
| `thumb/shape-train` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A smiling red toy steam engine with big eyes pulling two candy-coloured carriages with a star window and a heart window; a little bunny peeking out of the heart window waving; puffs of steam, a rainbow, sparkles. Subject centred |
| `prop/shape-train-engine` | 640×400, transparent | Side view facing **right**, bottom-centre anchored on the rail (wheel bottoms on the bottom edge), fitted to 400×250 at scale 1. The code draws the **face** on the round boiler front (centre at about 86% x, 50% y, radius ~16% of the width) and puffs steam from the funnel (about 66% x, top), so keep the boiler front a plain round disc | A chunky, glossy red-and-gold toy steam engine: cab with a round window at the back (left), a fat boiler, a tall funnel, a gold bell, a little cowcatcher, big red wheels with gold hubs |
| `prop/shape-train-car-red`, `-blue`, `-green`, `-yellow`, `-pink` | 560×340 each, transparent | Side view, bottom-centre anchored on the rail, stretched over the car (about 330×200 at scale 1). The code draws the shape windows (and the animal faces in them) across the side panel at 30–70% x, 25–70% y, so keep that panel plain; roof riders sit on the roof (top ~12%) | Toy train carriages in candy colours (a pastel version of the shape colour), a rounded roof with white trim, little wheels, chunky couplers at both ends, cute rivets, no windows |
| `prop/shape-train-animal-bunny`, `-bear`, `-duck`, `-pig`, `-cat`, `-frog`, `-elephant`, `-penguin` | 256×256 each, transparent | Front view, standing, **both paws raised** (the code draws a shape placard held above the head between the paws). Bottom-centre anchored at the feet, drawn ~110 px tall. The top 45% (the head) is also reused, clipped inside the train windows | Chubby wooden/plush toy animals with big shiny eyes, rosy cheeks and tiny smiles, each with a little scarf or bow in a bright colour |
| `prop/shape-train-cow` | 320×260, transparent | Bottom-centre anchored in the meadow at (560, 300), drawn ~110 px tall; the code bobs and tilts it when it waves at the passing train | A friendly black-and-white spotted cow with a pink nose, a flower behind one ear and a little bell, three-quarter view, looking at the viewer, one front hoof raised in a wave |
| `prop/shape-train-tunnel` | 260×220, transparent | Stone arch portal drawn bottom-centre on the far track at x≈1370 and x≈1590 (mirrored for the left mouth) over the little train, ~120 px wide, so the train vanishes into the hill | A rounded storybook stone tunnel arch with ivy and two little flowers, dark inside |

New poses: none required (uses carry, hold-present, toss, wave, cheer,
celebrate, surprised, laugh, dizzy).

## New Molly Party game: duckling-parade

### duckling-parade — Duckling Parade   (requested by the duckling-parade agent, 2026-10-05, priority: nice-to-have)

A sunny pond in a meadow. Lost ducklings hide around it (in reeds, on lily
pads, in a rubber boot, behind flower bushes); players run near one, it hops
into a quacking line behind them, and they lead the line to mama duck's nest.
Finale: mama leads every duckling in a parade around the pond. Every key has a
procedural fallback that ships today; the code looks each one up with
`art()`/`drawArt()`. House style: navy `#24163f` outlines, soft cel shading,
bright candy colours, **no text**. Ducklings wear code-drawn extras (flower
hat, bow, tiny crown, sunglasses), so the duckling art itself is plain.

**Layout (the bg must match):** pond = ellipse centred (960, 650), radii
380 × 165 (water; players run around it). Mama's nest sits on the bank above
the pond at (960, 400). Players run anywhere from y≈250 to y≈1040. Keep the
top 110 px calm (timer/HUD) and the bottom 120 px plain grass (scoreboard).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/duckling-parade` | 1920×1080, opaque | Full screen. Pond ellipse centred (960, 650), radii 380×165; a clear grassy bank at (960, 400) for the nest (the code draws nest, mama, reeds, lily pads, boot and bushes on top) | A bright sunny meadow seen from a high three-quarter view: soft green grass with tiny daisies and buttercups, a clear blue oval pond in the middle with a sandy rim and sparkles on the water, a few far trees and rolling hills along the top edge, a blue sky strip with fluffy clouds at the very top. No ducks, no characters |
| `thumb/duckling-parade` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | Mama duck marching proudly in front of a line of five yellow ducklings beside a blue pond; one duckling wears a flower hat, one is mid-sneeze with a tiny puff cloud. Sunny meadow, sparkles. Subject centred |
| `prop/duckling` | 160×160, transparent | Centred, feet near the bottom ~10% of the canvas; drawn ~70 px tall, mirrored for left; the code bobs/squashes it and adds hats on its head | A round fluffy yellow duckling, side view facing right, orange beak and feet, big shiny eye, happy, wings tucked |
| `prop/duckling-quack` | 160×160, transparent | Same framing as `prop/duckling`; shown for 0.2 s when a duckling quacks | The same duckling with its beak wide open quacking, little wings out |
| `prop/mama-duck` | 320×320, transparent | Bottom-centre anchor, drawn ~170 px tall in the nest and leading the parade, mirrored for left | A plump white mother duck with an orange beak, a pink bow on her head and a proud happy expression, side view facing right, standing |
| `prop/duck-nest` | 400×220, transparent | Bottom-centre anchor at (960, 430), drawn 300 px wide; delivered ducklings sit inside it | A big round cosy straw nest with soft feathers inside, seen from a slight high angle, empty |
| `prop/lily-pad` | 220×130, transparent | Centred, drawn 150 px wide floating on the pond; a duckling sits on top | A round green lily pad with a notch and a small pink water lily flower on one side, seen from above at an angle |
| `prop/reeds` | 240×280, transparent | Bottom-centre anchor, drawn ~190 px tall; a duckling peeks out from behind | A clump of tall green reeds and brown cattails |
| `prop/rubber-boot` | 160×190, transparent | Bottom-centre anchor, drawn ~120 px tall; a duckling's head pokes out of the opening at the top | One bright red rubber rain boot with white polka dots, standing upright, side view |
| `prop/flower-bush` | 260×190, transparent | Bottom-centre anchor, drawn ~200 px wide; a duckling peeks out | A round leafy bush covered in pink and white flowers |

## New Molly Party game: puppy-splash

> **ON HOLD (2026-10-13):** `puppy-splash` is being replaced by `muddy-mayhem` (the user wants some cheeky, rule-breaking Molly games). Don't start new art for this section. The replacement may reuse some of these keys; its own section will say which, and the rest will move to history as dropped.

### puppy-splash — Puppy Splash   (requested by the puppy-splash agent, 2026-10-05, priority: nice-to-have)

Muddy puppies zoom around a backyard; players hold A to blast them with a
garden hose until they are clean and fluffy, then each puppy shakes water
everywhere (on whoever is close!), barks and bounds to the porch to sit on a
dog bed. A bubble pool gives a bubble hose; mud puddles make puppies muddy
again. Every key has a procedural fallback that ships today. House style:
navy `#24163f` outlines, soft cel shading, bright candy colours, **no text**.
Mud splotches and water are drawn by the code over the puppy art, so the
puppy art is clean.

**Layout (the bg must match):** house wall from y=0 to ≈170, a wooden porch
deck band from y≈170 to y≈330 across the full width (clean puppies sit on dog
beds on it at y≈300), grass yard below. The code draws the bubble pool
(around (1560, 820)), mud puddles and dog beds as props. Keep the top 110 px
calm (timer) and the bottom 120 px plain grass (scoreboard).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/puppy-splash` | 1920×1080, opaque | Full screen. House wall 0–170, porch deck 170–330, lawn below; low detail on the lawn | A sunny cartoon backyard from a high three-quarter view: the bottom of a cheerful pastel-blue house with windows and a pink door across the top, a honey-wood porch deck along its whole width, then a bright green lawn with a few daisies, a white picket fence along the far left and right edges, flower beds in the corners. No animals, no characters, no pool |
| `thumb/puppy-splash` | 800×500, opaque | Game-select shelf and how-to screen | A garden hose nozzle in the foreground spraying a sparkling arc of water at a giggling muddy puppy while a clean fluffy white puppy shakes water drops everywhere; soap bubbles, rainbow mist, sunny backyard with a porch. No Charlie Party characters. Subject centred |
| `prop/puppy-1` … `prop/puppy-4` | 220×180 each, transparent | Bottom-centre anchor (feet), drawn ~100 px tall, mirrored for left; the code adds mud splotches, wag, hop and squash. 1 cream golden-retriever pup, 2 white fluffy poodle pup, 3 brown-and-white beagle pup, 4 black-and-white spotty pup | A cute fluffy puppy, side view facing right, standing on four legs, tongue out, tail up, big shiny eyes, clean and soft |
| `prop/puppy-shake` | 220×180, transparent | Optional, same framing as the puppies; used only for puppy 1 during its shake (others wiggle their normal art) | The cream puppy mid-shake: fur flared out in a blur, ears flying, eyes squeezed shut, happy |
| `prop/bubble-pool` | 440×280, transparent | Centred at (1560, 820), drawn 360 px wide; the code adds rising bubbles | A round inflatable kiddie pool, pink and white striped rim, overflowing with fluffy soap foam, seen from a high angle |
| `prop/mud-puddle` | 320×170, transparent | Centred, drawn ~260 px wide flat on the grass | A wide flat glossy brown mud puddle with a few splashes at the edge, seen from above at an angle |
| `prop/dog-bed` | 220×120, transparent | Bottom-centre anchor on the porch, drawn ~150 px wide; a clean puppy sits in it | A round plush dog bed, soft pink with a white fluffy rim, seen from a slight high angle |
| `prop/hose-nozzle` | 120×70, transparent | Held at the character's hand, pointing right (rotated to the aim), drawn ~70 px long | A chunky green garden-hose spray nozzle with a yellow trigger, pointing right |

## New Molly Party game: fairy-flutter

### fairy-flutter — Fairy Flutter   (requested by the fairy-flutter agent, 2026-10-13, priority: nice-to-have)

Everyone flies as a fairy (each character wears fancy wings from the shared
wardrobe) through a dreamy flower sky, zooming after sparkles, dewdrops and
petals, booping giggling bumblebees and surfing rainbow wind streams. Every
pickup flies up into the Moon's sparkle jar (top centre); when it is full the
Moon cheers and the jar bursts into a sparkle-firework finale. Every key below
has a procedural fallback that ships today, and the code already looks each
one up. House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Reused as they are: the players' own avatar sprites
(`float`, `tuck`, `cheer`, `celebrate`, `high-five`, `surprised`) and the
garden fairy NPC sets (flying friends in the background). No Charlie Party
player characters appear in any of these images.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/fairy-flutter` | 1920×1080, opaque | Full screen, static (the code drifts its own clouds and rainbow streams on top). Keep the top-centre area (x 700–1220, y 0–260) calm: the Moon and jar sit there. Fairies fly everywhere from y≈170 to y≈980 | A dreamy pastel twilight sky: lavender to peach to soft pink gradient, a few big puffy pink-gold clouds, faint stars high up, and a band of giant glowing flowers (tulips, daisies, bluebells, taller than houses) along the bottom ~20%, softly blurred. Magical, no characters |
| `thumb/fairy-flutter` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Two of the garden fairy NPCs (the pink Tulip Fairy and the blue Bluebell Fairy, no Charlie Party player characters) with big sparkly wings zooming through a pastel flower sky past a smiling crescent Moon holding a glowing jar of sparkles, a rainbow ribbon swooping across, a chubby bumblebee giggling. Subject centred |
| `prop/ff-moon` | 512×512, transparent | Drawn centred at ~230 px, top centre (x 960, y 110), gently bobbing | A friendly smiling crescent Moon face (pale gold, rosy cheeks, happy eyes), soft glow edge |
| `prop/ff-moon-happy` | 512×512, transparent | Same placement; swapped in when the jar fills (finale) | The same Moon, eyes squeezed shut in a huge open-mouthed laugh, little sparkles around |
| `prop/ff-jar` | 320×400, transparent | Drawn centred under the Moon at 128×160 px. The code draws the glowing sparkle fill **behind** it, clipped to the jar's inside, so the glass must be mostly see-through (pale highlights only) and the inner area plain | A round glass mason jar with a cork stopper tied with a pink ribbon bow, clear glass with white highlight streaks, front view |
| `prop/ff-sparkle` | 128×128, transparent | Pickup (worth 1), drawn centred at 64 px, spinning | A chunky golden four-point sparkle star with a white glint, soft glow |
| `prop/ff-dewdrop` | 128×128, transparent | Pickup (worth 2), centred at 70 px, bobbing | A big shiny water dewdrop, pale aqua with a rainbow sheen and a white highlight |
| `prop/ff-petal` | 128×128, transparent | Pickup (worth 1), centred at 64 px, tumbles (rotates) as it drifts | A single soft pink flower petal with a deeper pink base, slightly curled |
| `prop/ff-star` | 192×192, transparent | Rare big pickup (worth 5), centred at 110 px, pulsing | A plump shiny golden star with a happy little face and a short rainbow sparkle trail on the left |
| `prop/ff-bee` | 256×256, transparent | Bumblebee NPC, centred at 120 px, facing right (the code mirrors it), wings flap by a code squash | A chubby round cartoon bumblebee with soft yellow and brown stripes, tiny clear wings, big shiny eyes and a happy smile |
| `prop/ff-bee-giggle` | 256×256, transparent | Same placement, shown for ~1 s after someone boops the bee (the code spins it) | The same bee, eyes squeezed shut, giggling with an open smile, tiny hearts |

## New Molly Party game: fairy-hide-seek

### fairy-hide-seek — Fairy Hide & Seek   (requested by the fairy-hide-seek agent, 2026-10-13, priority: nice-to-have)

Little fairies hide behind giant garden things. Each player runs around the
garden holding a big magnifying glass: looking through the lens shows what is
behind a hiding spot (the spot turns see-through inside the lens), and A
checks the spot. Fairies pop out giggling and twirl; decoys are silly (a frog
jumps out going "ribbit!", a snail waves, a ladybug zooms off). Every key
below has a procedural fallback that ships today, and the code already looks
each one up. House style: navy `#24163f` outlines, soft cel shading, bright
candy colours, **no text** in any image. Hiding spots are seen from the front,
slightly from above (3/4 garden view), and are drawn **bottom-centre
anchored** (the base touching the lawn). Fairies reuse the garden fairy NPC
sets. No Charlie Party player characters appear in any of these images.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/fairy-hide-seek` | 1920×1080, opaque | Full screen, static. The code places 10 hiding spots across the lawn (y≈330–900), so keep the lawn plain-ish. Keep the top ~120 px calm (timer) and the bottom ~140 px plain (scoreboard) | A sunny storybook garden lawn in 3/4 view: soft green grass with mown stripes, a winding pale stone path, tiny daisies and clover dotted around, a white picket fence and rose hedge along the top, a blue sky strip with fluffy clouds above it. No big objects, no characters |
| `thumb/fairy-hide-seek` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A giant magnifying glass held over a red spotted mushroom in a garden, and through the lens a giggling little pink fairy with sparkly wings is revealed hiding behind it; a frog peeks from behind a teapot nearby. Subject centred |
| `prop/fhs-flower-pink` | 360×480, transparent | Hiding spot, bottom-centre anchored, drawn ~210 px wide; it wiggles (code rotates it around the base) | A giant pink tulip-daisy flower on a thick green stem with two big leaves, bloom at the top, big enough to hide behind |
| `prop/fhs-flower-yellow` | 360×480, transparent | Same as above | A giant yellow sunflower-daisy with a smiley orange centre on a thick stem with big leaves |
| `prop/fhs-mushroom` | 400×380, transparent | Hiding spot, bottom-centre, ~230 px wide | A big red toadstool with white spots and a chunky cream stalk, a tiny clump of grass at the base |
| `prop/fhs-leaf` | 440×340, transparent | Hiding spot, bottom-centre, ~250 px wide | A big leafy fern-and-hosta clump: broad overlapping glossy green leaves fanning up from the ground |
| `prop/fhs-teapot` | 420×360, transparent | Hiding spot, bottom-centre, ~240 px wide | A giant round china teapot, white with pink roses and a gold rim, spout to the right, sitting on the grass |
| `prop/fhs-can` | 440×340, transparent | Hiding spot, bottom-centre, ~240 px wide | A big shiny mint-green watering can with a rose spout pointing right |
| `prop/fhs-pot` | 360×360, transparent | Hiding spot, bottom-centre, ~210 px wide | A terracotta flowerpot overflowing with purple pansies and leaves |
| `prop/fhs-boot` | 360×400, transparent | Hiding spot, bottom-centre, ~190 px wide | A big yellow rain boot standing upright with daisies growing out of the top |
| `prop/fhs-frog` | 256×256, transparent | Decoy, bottom-centre at ~120 px, hops (code arcs it) | A cute round green frog sitting, big smiley mouth, rosy cheeks, front view |
| `prop/fhs-snail` | 256×200, transparent | Decoy, bottom-centre at ~130 px wide, facing right (mirrored by code) | A happy snail with a swirly pink-and-lilac shell, waving one eye stalk |
| `prop/fhs-ladybug` | 160×160, transparent | Decoy, centred at ~70 px, zooms off in a loop | A round red ladybug with black spots, wings open mid-flight, smiling |
| `prop/fhs-magnifier` | 320×320, transparent | Each player's glass. The lens centre is at (120, 120) in this image with a 200 px lens; the handle runs to the lower right. The code draws a player-colour ring and the see-through view inside the lens, so the lens area must be **empty** (fully transparent) | A chunky toy magnifying glass: a thick pearly-white rim with a gold inner edge and a rounded pink handle with a gold cap, lens empty |

## New Molly Party game: tea-party

> **ON HOLD (2026-10-13):** `tea-party` is being replaced by `whoopee-tea` (the user wants some cheeky, rule-breaking Molly games). Don't start new art for this section. The replacement may reuse some of these keys; its own section will say which, and the rest will move to history as dropped.

### tea-party — Teddy Tea Party   (requested by the tea-party agent, 2026-10-05, priority: nice-to-have)

A garden tea party for Molly Party (age 4–5). Guests sit behind a long tea
table and show a picture bubble of the treat they want; players dash to the
treat carts at the bottom, grab the matching treat and toss it to the guest,
who does a silly happy reaction (teddy tips the tea onto his own head and
laughs, the unicorn's hat pops off in confetti...). Every key below has a
procedural fallback that ships today and is looked up with `art()` /
`drawArt()`, so a file listed in `assets/art/index.json` drops in with no code
change. House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Players use their normal roster sprites
(`carry`, `toss`, `cheer`, `laugh`, `celebrate`, `dizzy`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/tea-party` | 1920×1080, opaque | Full screen. The code draws the table over x 240–1680, y 452–612, guests above it (heads up to y≈250), picture bubbles at y≈150–250, and two treat carts at the bottom (x≈560 and x≈1360, y 830–1060). Players run on the lawn from y≈650 to y≈850. Keep the top 110 px calm (scoreboard + timer) | A sunny storybook garden tea party: soft blue sky, a pastel bunting garland zig-zagging across the top, a big round blossom tree on each side, rose bushes and a white garden arch in the distance, a bright mowed lawn in the lower half. No table, no characters (the code draws them) |
| `thumb/tea-party` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A brown teddy bear at a pink tea table laughing with a pink teacup tipped upside down on his head and tea splashing, a unicorn in a fancy flowered hat beside him, a cupcake and strawberry flying toward them, sparkles. Subject centred |
| `prop/tea-table` | 1440×160, transparent | Stretched over x 240–1680, y 452–612. Top 64 px = the table top seen at a slight angle (the code draws the teapot and plates on it), the rest = the tablecloth skirt hanging down | A long tea table with a pink-and-white gingham tablecloth with a scalloped lace hem, slightly angled top surface, empty |
| `prop/tea-teapot` | 300×260, transparent | Centre-piece on the table, bottom-anchored at (960, 500), drawn 170×150; the code wobbles it | A round fancy porcelain teapot, white with pink roses and a gold lid knob, steam curl |
| `prop/tea-cart` | 480×300, transparent | Bottom-anchored at the cart centre (x≈560 / x≈1360, y 1060), drawn 460×290. The code sets four treats on the top shelf at y≈862 (≈69% up from the bottom), spaced 100 px | A little pastel-mint wooden tea trolley with two shelves, curly wheels, a scalloped pink awning trim; top shelf empty |
| `prop/tea-cup-pink` | 160×160, transparent | Centred, drawn 80–110 px (cart shelf, overhead carry, flying toss, wish bubble, upside-down on a teddy's head) | A chunky pink teacup on a saucer with a white heart and a steam curl |
| `prop/tea-cupcake` | 160×160, transparent | Same as above | A cupcake with a blue wrapper, swirly pink frosting, sprinkles and a cherry |
| `prop/tea-strawberry` | 160×160, transparent | Same as above | A big shiny red strawberry with a green leafy top and a sparkle highlight |
| `prop/tea-cookie` | 160×160, transparent | Same as above | A round golden cookie with chocolate chips |
| `prop/tea-cake` | 200×200, transparent | Same as above, a little bigger (the rare "rainbow cake" bonus wish, worth 3) | A slice of rainbow layer cake with white frosting, sprinkles and a strawberry on top |
| `prop/tea-guest-teddy` | 400×360, transparent | Guest bust, bottom-anchored at the seat (y 478, behind the table), drawn 300×270. The bottom edge is hidden behind the table top. The code bobs/squashes it and draws the bubble, crumbs and tea splash | A chubby brown teddy bear sitting at a table, seen from the waist up, paws resting forward, a red bow tie, happy open eyes, front view |
| `prop/tea-guest-teddy-happy` | 400×360, transparent | Same framing, shown during the happy reaction | The same brown teddy laughing with eyes squeezed shut, mouth open, paws up |
| `prop/tea-guest-honey` | 400×360, transparent | Same framing | A honey-yellow teddy bear with a big pink bow on one ear, waist up, front view |
| `prop/tea-guest-honey-happy` | 400×360, transparent | Same framing | The same honey teddy giggling, eyes shut, rosy cheeks |
| `prop/tea-guest-bunny` | 400×360, transparent | Same framing (ears may reach the top edge) | A white bunny with long pink-lined ears and a lace collar, waist up, front view |
| `prop/tea-guest-bunny-happy` | 400×360, transparent | Same framing | The same bunny delighted, ears flung up, eyes shut |
| `prop/tea-guest-unicorn` | 400×360, transparent | Same framing (hat and horn may reach the top edge) | A white unicorn with a lavender-and-pink mane and a gold horn, wearing a fancy wide-brimmed pink hat with flowers and a feather, waist up, front view, very elegant |
| `prop/tea-guest-unicorn-happy` | 400×360, transparent | Same framing; the code pops a separate (procedural) hat off into the air | The same unicorn laughing with eyes shut, **no hat** |
| `prop/tea-guest-panda` | 400×360, transparent | Same framing | A little panda teddy with a mint-green neck ribbon, waist up, front view |
| `prop/tea-guest-panda-happy` | 400×360, transparent | Same framing | The same panda teddy giggling, eyes shut |

## New Molly Party game: sock-match

### sock-match — Silly Sock Match   (requested by the sock-match agent, 2026-10-05, priority: nice-to-have)

A backyard laundry-day game for Molly Party (age 4–5). A basket bursts a
fountain of silly socks onto the lawn; players grab a sock and run it to its
twin. Matched pairs spin-dance and rocket up to the laundry line, a cheeky
puppy zooms around stealing socks, and everyone shares the line (cooperative).
Every key below has a procedural fallback that ships today and is looked up
with `art()` / `drawArt()`. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text** in any image. Socks: one image per
pattern, upright, cuff at the top, toe pointing **right**; the code mirrors
it for the second sock of a pair and rotates it freely, so keep it centred.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/sock-match` | 1920×1080, opaque | Full screen. The code draws the laundry line from (150, 236) to (1770, 236), sagging to y≈290, with wooden poles under each end, the basket at (1730, 1010), and socks/players on the lawn from y≈560 to y≈960. Keep the top 110 px calm (scoreboard + timer) | A sunny backyard on laundry day: blue sky with puffy clouds, a white picket fence across the middle with hollyhocks and sunflowers, a bright green lawn filling the lower 55% with a few daisies and clover. No laundry line, no poles, no characters |
| `thumb/sock-match` | 800×500, opaque | Game-select shelf and how-to screen | A laundry line full of silly patterned socks (stripes, dots, hearts, one with googly eyes), a white puppy with a brown ear patch running off with a striped sock in its mouth, two matching socks dancing in the air with sparkles. Subject centred |
| `prop/sock-stripes` | 140×200, transparent | Centred, drawn about 100×143 (bigger while carried or dancing), rotated and mirrored by code | A chunky cartoon sock with wide pink and white stripes, cuff at the top, toe pointing right |
| `prop/sock-dots` | 140×200, transparent | Same | A sky-blue sock with big yellow polka dots |
| `prop/sock-hearts` | 140×200, transparent | Same | A light-pink sock covered in red hearts |
| `prop/sock-stars` | 140×200, transparent | Same | A navy-purple sock with bright yellow stars |
| `prop/sock-googly` | 140×200, transparent | Same | A lime-green sock with two big googly eyes and a silly smile with a tongue near the toe |
| `prop/sock-rainbow` | 140×200, transparent | Same | A sock with rainbow stripes (red to purple) |
| `prop/sock-zigzag` | 140×200, transparent | Same | An orange sock with a bold purple zig-zag band |
| `prop/sock-flowers` | 140×200, transparent | Same | A mint sock with white daisies with yellow centres |
| `prop/sock-checks` | 140×200, transparent | Same | A lilac-and-white checkerboard sock |
| `prop/sock-paws` | 140×200, transparent | Same | A peach sock with brown paw prints |
| `prop/sock-puppy` | 320×240, transparent | Bottom-anchored at the puppy's feet, facing **right** (mirrored by code), drawn 210×158 | A small round white puppy with a brown patch over one ear, floppy ears, wagging tail, standing happily, side view |
| `prop/sock-puppy-run` | 320×240, transparent | Same; the code bounces it and draws the stolen sock in its mouth (at the front, about 85% across, 45% down) | The same puppy running full speed, ears flying, mouth open (empty) |
| `prop/sock-puppy-bow` | 320×240, transparent | Same; shown when a player catches up and when it drops a sock | The same puppy in a play bow, bottom up, tail wagging, tongue out |
| `prop/sock-basket` | 360×260, transparent | Bottom-anchored at (1730, 1010), drawn 260×188; the code bounces it when it bursts socks | A round wicker laundry basket overflowing with a few colourful socks |
| `prop/clothespin` | 48×96, transparent | Pins each sock on the line, centred on the line, drawn 22×44 | A wooden clothespin, upright, light wood with a metal spring |

## New Molly Party game: unicorn-jump

### unicorn-jump — Unicorn Hop   (requested by the unicorn-jump agent, 2026-10-05, priority: nice-to-have)

A fast, bouncy side-scroller for 4–5 year olds: every player rides a unicorn
(four-legged characters gallop themselves wearing the wardrobe Unicorn Horn)
along a candy meadow that scrolls to the left, faster and faster. A = hop over
puddles, bouncy mushrooms and sleeping bunnies; grab stars and rainbow
candies; a rainbow trail streams behind riders who keep hopping cleanly. 1–4
lanes stacked top to bottom (5–8 players share lanes, two riders each).
Everything has a procedural fallback that ships today; the code already looks
up every key below. House style: navy `#24163f` outlines, soft cel shading,
bright candy colours, **no text**, and no Charlie Party roster characters in any image (the mount is a generic pastel cartoon unicorn; the code tints it per player). Side view; riders face right and the
props scroll in from the right.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/unicorn-jump` | 1920×1080, opaque, **seamless left-right tile** | Drawn twice side by side, scrolling left at ~0.2× the ground speed (parallax). The lanes (thin grass paths drawn by code) sit in bands between y≈260 and y≈1000, so the top 250 px and the overall colour matter most; keep the middle low-detail | A dreamy candy meadow: pastel pink-to-lilac sky with puffy clouds and a faint rainbow arc, far rolling hills in mint and pink with gumdrop trees and lollipop flowers, a tiny castle silhouette on one hill. Soft, bright, cheerful |
| `thumb/unicorn-jump` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A tiny garden fairy with petal wings riding a chubby pastel-pink cartoon unicorn with a rainbow mane mid-hop over a puddle, a rainbow trail streaming behind, stars and swirl candies floating ahead, candy meadow background. Subject centred |
| `prop/uj-mount` | 512×384, transparent | The unicorn the riders sit on, side view **facing right**, mid-gallop. Anchor: bottom centre at the hooves; drawn ~1.1× the rider's height wide. The code seats the rider at ~62% of the image height (the saddle, a bit left of centre) and bobs/tilts the whole image | A cute chubby pale-pink cartoon unicorn (a generic mount, not any roster character) with a flowing rainbow mane and tail, gold spiral horn, pink hooves, a little pink saddle blanket with a heart, big friendly eye, galloping (front legs forward, back legs back). No rider |
| `prop/uj-mount-jump` | 512×384, transparent | Same as above, shown while hopping. Same anchor and scale so it swaps cleanly | The same unicorn leaping: legs tucked up under its body, mane and tail streaming back, joyful face |
| `prop/uj-puddle` | 320×96, transparent | Anchor bottom centre on the lane ground; ~170 px wide at lane scale 1 | A shallow sky-blue rain puddle seen from the side at a low angle, with a white shine and two small ripples, a tiny rubber duck floating in it |
| `prop/uj-mushroom` | 256×256, transparent | Anchor bottom centre; ~120 px tall at lane scale 1. The code squashes it when it boings a rider | A bouncy red-and-white spotted mushroom with a cheeky smile, round fat cap like a trampoline |
| `prop/uj-bunny` | 256×192, transparent | Anchor bottom centre; ~90 px tall. Sleeping; the code draws the Zz | A fluffy white bunny curled up asleep on the grass, pink ears, closed happy eyes |
| `prop/uj-bunny-awake` | 256×256, transparent | Same anchor; shown when a rider hops over (it pops up) or bumps it | The same bunny sitting up wide awake, surprised-happy face, one paw waving |
| `prop/uj-star` | 128×128, transparent | Centred; floats at hop height, ~70 px. The code spins and bobs it | A chunky glossy golden star with a cute smile and a white highlight |
| `prop/uj-candy` | 128×128, transparent | Centred; just above the lane ground, ~64 px | A round wrapped swirl candy with rainbow stripes, twisted pink wrapper ends |
| `prop/uj-lollipop` | 192×256, transparent | Anchor bottom centre; the rare 3-point treat at hop height, ~110 px tall | A giant rainbow-spiral lollipop on a white stick with a pink ribbon bow, sparkling |

Optional pose (the code asks for it; it falls back to `sit`, then `ride`):
`ride-sit` (loop) — sitting astride a mount, side-on facing right, both hands
(paws) holding imaginary reins forward, happy bouncy posture.

## New Molly Party game: mermaid-pearls

### mermaid-pearls — Mermaid Pearls   (requested by the mermaid-pearls agent, 2026-10-05, priority: nice-to-have)

A lively cooperative underwater game: everyone swims freely (stick), zooms
with A, grabs pearls from clams that snap open and shut, rides fizzy bubble
currents up the screen, and tickles a sleepy octopus (A) until it giggles and
sprays pearls everywhere. Every pearl flies into one shared treasure chest;
when it's full there's a sparkly finale. Little friendly fish follow each
swimmer in a conga line. Everything has a procedural fallback that ships
today; the code already looks up every key below. House style: navy
`#24163f` outlines, soft cel shading, bright candy colours, **no text**.
Nothing scary: big friendly eyes everywhere. No Charlie Party roster characters in any image.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/mermaid-pearls` | 1920×1080, opaque | Full screen. Sandy seabed from y≈930 down; swimmers use y 150–920, so keep the middle open water. Top 110 px = HUD band (scoreboard + chest meter) | A bright friendly coral reef: turquoise water fading lighter toward the top with sun rays slanting down, pink and purple coral and swaying green kelp along the left and right edges, a pale sandy seabed with shells and starfish at the bottom. Cheerful and sparkling |
| `thumb/mermaid-pearls` | 800×500, opaque | Game-select shelf and how-to screen | A wide-open smiling clam with a big glowing pearl in the foreground, a giggling pink octopus in a lilac nightcap tossing pearls, a small open treasure chest overflowing with pearls, a rainbow fish, bubbles and little friendly fish around. No people or mermaids (Molly Party art never shows the Charlie Party roster) |
| `prop/mp-clam-open` | 256×224, transparent | Anchor bottom centre on the seabed or a rock ledge, ~170 px wide. The code draws the pearl itself in the opening (about 40% up the image, centred), so leave the inside empty | A big scalloped pink-and-lilac clam shell wide open, a cute face on the lower shell (happy eyes and smile), pale pink inside |
| `prop/mp-clam-closed` | 256×160, transparent | Same anchor and width | The same clam shut tight, cheeks puffed with a cheeky closed-eye grin |
| `prop/mp-pearl` | 96×96, transparent | Centred, ~44 px | A glossy white-pink pearl with a soft rainbow sheen and a white highlight |
| `prop/mp-pearl-gold` | 96×96, transparent | Centred, ~58 px; the rare 3-pearl bonus | A shiny golden pearl with sparkles |
| `prop/mp-octopus` | 512×448, transparent | Anchor bottom centre on the seabed, ~340 px wide. Sleeping; the code squishes/wobbles it and draws the Zz bubbles | A round chubby pink octopus asleep on the sand, curly tentacles spread out, eyes closed, tiny smile, a little lilac nightcap |
| `prop/mp-octopus-awake` | 512×448, transparent | Same anchor and size; shown while giggling and throwing pearls | The same octopus wide awake and giggling, tentacles waving up in the air, eyes squeezed happy, cheeks blushing |
| `prop/mp-chest` | 384×320, transparent | Anchor bottom centre on the seabed, ~250 px wide. Shown until the finale; the code draws a glow that grows as it fills | A wooden treasure chest with gold trim and a heart-shaped lock, lid slightly ajar with a glow peeking out, sitting on sand |
| `prop/mp-chest-open` | 384×384, transparent | Same anchor and width; shown when the chest is full | The same chest wide open, overflowing with pearls and gems, rays of light |
| `prop/mp-fish-1`, `prop/mp-fish-2`, `prop/mp-fish-3` | 160×112 each, transparent | Centred, **facing right**, ~70 px long; the code flips them | Tiny friendly fish: a yellow-and-blue striped one, a round pink pufferfish (not puffed), an orange clownfish-like one with a bow. Big eyes, smiling |
| `prop/mp-vent` | 256×128, transparent | Anchor bottom centre on the seabed under each bubble current, ~200 px wide | A rounded mossy rock with a sparkly hole at the top where bubbles come out, little sea flowers |

No new poses needed (uses `swim`, `dash`, `celebrate`, `cheer`, `laugh`, `surprised`).

## New Molly Party game: pumpkin-peekaboo

### pumpkin-peekaboo — Pumpkin Peekaboo   (requested by the pumpkin-peekaboo agent, 2026-10-05, priority: nice-to-have)

A fast, friendly Halloween whack-a-mole: silly jack-o'-lanterns pop up out of
holes in a moonlit pumpkin patch; players dash over and boop them with A, the
pumpkin giggles, changes its face and spits out candy. Golden pumpkins make
it rain candy, and sometimes a kitty in a witch hat pops up instead (boop it
and it purrs). Friendly and funny, **never scary**: round cute faces, no
sharp teeth, warm orange glow. Every key has a procedural fallback that
ships today; files listed in `assets/art/index.json` drop in with no code
change. House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, no text.

Layout: sky and horizon (moon, a little cottage with warm windows, a fence)
fill y 0–360; the patch ground fills y 360–1080. Holes sit in 4 staggered
rows at y ≈ 450, 590, 740, 880, x 300–1620. Players run anywhere on the
ground. Scoreboard chips sit along the bottom (y ≈ 985), the timer at the top
centre.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/pumpkin-peekaboo` | 1920×1080, opaque | Full screen. Keep the top ~110 px calm (timer). The code draws holes, pumpkins and players on the ground area (y 380–1000), so keep it plain soil and grass with low detail there | A cosy, friendly autumn night: deep purple-blue sky with a big soft yellow full moon at the upper right, twinkly stars, a little wooden cottage with warm glowing windows and a string of round orange lanterns at the far left horizon, a low wooden fence and a friendly smiling scarecrow at the horizon (y ≈ 300–380), then a wide dark-green-and-brown pumpkin patch with curly vines and a few leaves around the edges, hay bales in the bottom corners. Warm, inviting, not spooky |
| `thumb/pumpkin-peekaboo` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | Three cute jack-o'-lanterns popping out of holes in a moonlit patch, the middle one giggling and spitting out wrapped candies, a golden glowing pumpkin at the side and a kitty in a purple witch hat peeking from a hole. Subject centred |
| `prop/pp-hole` | 320×160, transparent | Drawn centred on each hole point, 200 px wide at depth scale 1 (smaller at the back rows). Pumpkins rise out of its centre (the code hides everything below the hole's centre line) | A round dark dirt hole in the ground seen from a 3/4 top-down view, with a soft brown soil rim and a ring of curly green pumpkin vines and two leaves around it |
| `prop/pp-pumpkin-1`, `prop/pp-pumpkin-2`, `prop/pp-pumpkin-3`, `prop/pp-pumpkin-4` | 320×320 each, transparent | Anchor: bottom centre at the hole, drawn 190 px wide; the bottom of the pumpkin touches the bottom edge of the canvas. The code squashes and wobbles it and clips the part below the hole | A cute round orange jack-o'-lantern with a curly green stem and a leaf, glowing warm yellow inside its carved face. Four silly faces: (1) big grin with the tongue sticking out; (2) winking, one eye a happy arc, lopsided smile; (3) crossed googly eyes and a goofy buck-tooth smile; (4) puffed cheeks blowing a raspberry. Round soft shapes, no pointy teeth |
| `prop/pp-pumpkin-giggle` | 320×320, transparent | Same anchor and size as the faces; shown for ~1 s after a boop | The same pumpkin laughing hard: eyes squeezed into happy arcs, a huge open laughing mouth, rosy cheeks, a tiny happy tear |
| `prop/pp-pumpkin-golden`, `prop/pp-pumpkin-golden-giggle` | 320×320 each, transparent | Same anchor and size as the faces; the code adds a glow and sparkles | A shiny golden jack-o'-lantern with a sparkly gold stem, beaming smile (normal) and laughing (giggle) |
| `prop/pp-witch-cat`, `prop/pp-witch-cat-purr` | 320×320 each, transparent | Same anchor and size as the pumpkins (it pops out of a hole) | A fluffy lilac-grey kitten in a purple witch hat with a gold star, peeking up out of a hole with both paws on the rim, big sparkly eyes (normal); eyes closed blissfully, smiling, cheeks pink, purring (purr) |
| `prop/pp-candy-1`, `prop/pp-candy-2`, `prop/pp-candy-3`, `prop/pp-candy-4` | 128×128 each, transparent | Drawn centred, ~60 px, spinning as they fly | Halloween candy: (1) a twist-wrapped round sweet in orange-and-purple stripes; (2) a swirly rainbow lollipop; (3) a chunky candy corn; (4) a pink wrapped chocolate with a bow |
| `prop/pp-bucket` | 160×160, transparent | Held in every player's hand, ~60 px, centred on the hand; the code piles candy on top as the score grows | A plastic jack-o'-lantern trick-or-treat bucket with a black handle and a happy carved face |

New pose (optional, the code falls back to `high-five` → `action`): `boop`,
one-shot, a quick friendly poke forward with one finger (paw or nose for
four-legged characters), happy face.

## New Molly Party game: ghost-giggles

### ghost-giggles — Ghost Giggles   (requested by the ghost-giggles agent, 2026-10-05, priority: nice-to-have)

Little white sheet ghosts zoom around a cosy, cute haunted house. Players
(in Halloween costumes from the shared wardrobe) tickle them with A; they
giggle and turn rainbow colours. Shy ghosts hide behind the curtains and
peek out. When every ghost is colourful, a disco ball drops and the ghosts
throw a dance party. Cute and funny, **never scary**. Every key has a
procedural fallback that ships today. House style: navy `#24163f` outlines,
soft cel shading, bright candy colours, no text.

Layout: back wall y 0–470, floor y 470–1080. Three tall windows on the back
wall centred at x = 330, 1260, 1620 (y 120–420); the code draws curtains over
them. A fireplace centred at x = 780 (base on y 470). A chandelier at the top
centre (x 960) where the disco ball comes down. Two costume trunks on the
floor at x = 150 and 1770, y ≈ 590. Ghosts float anywhere over the floor;
scoreboard chips along the bottom (y ≈ 985).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/ghost-giggles` | 1920×1080, opaque | Full screen. Keep the top ~110 px calm. **Must match the layout above**: the three windows (frames with a moonlit night view, no curtains), the fireplace at x 780 and a big plain floor (the code draws a rug, trunks, ghosts and players) | A cute cosy "haunted" parlour at night: lilac-and-plum striped wallpaper with tiny stars, three tall arched windows showing a starry sky and a big friendly moon, a stone fireplace with a cheerful orange fire, two smiling carved pumpkins and candles on the mantel, smiling portraits of a cat and a pumpkin, a little cobweb in one corner with a smiling spider, warm honey-wood floorboards. Warm, inviting, more birthday party than spooky |
| `thumb/ghost-giggles` | 800×500, opaque | Game-select shelf and how-to screen | Three little sheet ghosts giggling in a cosy parlour, one white, one pink, one rainbow-striped, one of them tickled by a little hand in a purple wizard-robe sleeve; a disco ball and sparkles above. Subject centred |
| `prop/gg-ghost` | 256×320, transparent | Drawn centred, ~150×190 px, bobbing and squashing. **Keep it pure white with light-grey/lavender shading**: the code tints it pink, sky, mint, gold, lilac or rainbow | A cute little sheet ghost with a round top, a wavy hem, two tiny stubby arms, big shiny black eyes and a small happy smile with pink cheeks. Front view |
| `prop/gg-ghost-giggle` | 256×320, transparent | Same anchor, size and tinting; shown while it is being tickled | The same ghost laughing: eyes squeezed into happy arcs, big open laughing mouth, arms hugging its tummy, wiggly hem |
| `prop/gg-ghost-peek` | 160×200, transparent | A shy ghost peeking from behind a curtain edge; drawn at the curtain's side (mirrored on the other side), ~110×140 | Half of the ghost (its left half cut off by the image edge as if behind a curtain), one big eye and a tiny hand curled around the edge, shy blushing smile |
| `prop/gg-curtain` | 160×340, transparent | One curtain panel (the left one; the code mirrors it for the right), stretched over half a window and squeezed sideways to open | A plum velvet theatre-style curtain panel with soft folds, a gold fringe at the bottom and a gold rope tassel |
| `prop/gg-trunk` | 300×240, transparent | Anchor bottom centre at the trunk spot, drawn 210 px wide; it bounces when a costume pops out | An open wooden dress-up trunk with brass corners overflowing with costume bits: a purple wizard hat, a star cape, a pair of fairy wings and a cat-ear headband |
| `prop/gg-disco-ball` | 200×200, transparent | Drawn centred, ~150 px, hanging from a line and spinning (the code adds light beams) | A sparkly mirror disco ball with pink and lilac glints |

## New Molly Party game: kitten-yarn

### kitten-yarn — Kitten Cuddles   (requested by the kitten-yarn agent, 2026-10-13, priority: nice-to-have)

Side-view living room. Kittens tumble off two cat trees and roll in on yarn
balls; each player stands behind a cosy basket, catches kittens in it and
presses A to cuddle them, then the kittens hop onto a big cushion bed where
a nap pile grows. Everything below has a procedural fallback that ships
today and the code already looks up every key. House style: navy `#24163f`
outlines, soft cel shading, bright candy colours, **no text**. Floor line
(players' feet) is y = 900.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/kitten-yarn` | 1920×1080, opaque | Full screen. The wooden floor / rug starts at about y=840 (feet at y=900); the wall is above it. The two cat trees stand at the far left and right (x≈150 and x≈1770) and the cushion bed sits on the floor in the centre, all drawn by code, so keep those spots plain. Keep the top ~120 px calm (timer) | A cosy pastel living room in afternoon sun: soft peach-and-cream striped wallpaper, a big window in the upper middle with sunbeams and a view of blue sky, framed paw-print pictures, a few potted plants, a honey-wood floor with a big round pink rug, bunting across the top. No cats or furniture in the middle |
| `thumb/kitten-yarn` | 800×500, opaque | Game-select shelf and how-to screen | A little garden fairy (pink tulip fairy with petal wings, no Charlie Party characters) hugging a fluffy ginger kitten inside a wicker basket, more kittens tumbling down from a cat tree and one riding a pink yarn ball, hearts flying. Lively and bouncy. Subject centred |
| `prop/kitten-cattree` | 680×1520 (ratio 340:760), transparent | Drawn bottom-anchored at (150, 910) in a 340×760 box; the right-hand tree is the same image mirrored. **Three round platforms stick out toward the right (screen centre) with their top surfaces at 34%, 63% and 92% of the height measured from the bottom**; kittens peek out and leap off at the right edge of each platform | A tall pastel cat tree: sisal-rope posts, three round lilac carpeted platforms stepping up and out to the right, a little cubby house on the middle level, a dangling pom-pom toy. Front view, no cats |
| `prop/kitten-atlas` | 1152×960 (6 columns × 5 rows of 192 px cells), transparent | One kitten per cell, drawn centred and fitted to about 110 px. **Columns are coats, in this order:** ginger tabby, silver-grey tabby, snowy white, black-and-white tuxedo, calico, cream. **Rows are states:** sit (front view, sitting, big smile), tumble (curled into a ball, paws tucked, for spinning), pounce (side view, leaping to the right, paws forward), sleep (curled up asleep, eyes shut, tail around), cuddle (eyes closed, blissful, paws up, as if being hugged) | Super cute chibi kittens with big sparkly eyes, pink noses and fluffy cheeks; all 30 share lighting, outline weight and scale so mixed kittens look like one set |
| `prop/kitten-fairy` | 256×256, transparent | The rare sparkly kitten (worth 3). Drawn centred at about 130 px; the code flaps it with a small squash | A white kitten with shimmering pastel fairy wings (lilac and pink, with dots), a tiny flower crown, sitting and smiling, faint sparkles around it |
| `prop/yarn-ball-pink`, `prop/yarn-ball-blue`, `prop/yarn-ball-yellow` | 128×128 each, transparent | Drawn centred at 76 px and spun by the code while it rolls; the loose thread trail is drawn by code | A fluffy round ball of wool yarn with visible wound strands and a short loose end, in candy pink / sky blue / lemon yellow |
| `prop/kitten-basket`, `prop/kitten-basket-front` | 600×360 each (ratio 5:3), transparent, **same canvas** | Drawn bottom-anchored just below the player's feet in a 170×102 box (smaller with many players): the back layer first, then the kittens, then the front layer, so kittens sit inside. The back layer is the far rim plus the inside with a blanket; the front layer is the near half of the weave and rim only | A round wicker picnic basket with a soft pink gingham blanket inside and a red bow on the front, seen from the front at a slight top-down angle |
| `prop/kitten-bed` | 1120×440 (ratio 280:110), transparent | Drawn bottom-anchored at (960, 885) in a 560×220 box; the sleeping kittens are stacked by the code inside the middle 70%, from about 35% height upward | A huge round plush pet bed: a puffy lavender cushion rim with a soft mint pillow inside, little stars embroidered on the rim, front view |

New pose (until registered it falls back to `catch`, then `cheer`): `cuddle`
(one-shot) — hugging something small held against the chest with both arms
(or paws / chin for armless characters), eyes closed, happy, a tiny sway.

## New Molly Party game: snowflake-catch

### snowflake-catch — Snowflake Giggles   (requested by the snowflake-catch agent, 2026-10-13, priority: nice-to-have)

Top-down 2.5D snowy meadow. Everyone races around catching giggly falling
snowflakes on their tongue (hold A); every flake helps build one big shared
snowman at the back of the meadow. A playful snowman friend tosses snowballs
that burst into glitter, and sledding penguins zoom across the meadow
spraying extra flakes. Everything below has a procedural fallback that ships
today and the code already looks up every key. House style: navy `#24163f`
outlines, soft cel shading, bright candy colours, **no text**.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/snowflake-catch` | 1920×1080, opaque | Full screen. Sky and distant hills in the top ~330 px; the walkable snowy meadow is from y≈470 to the bottom. The big shared snowman stands at the back centre (x=960, base at y≈455) and the snowman friend at the back right (x≈1660, y≈450): keep both spots plain snow. Keep the top ~110 px calm (scoreboard) | A sparkly winter meadow at soft lilac-pink dusk: rolling snowy hills, frosted pine trees along the back edge and sides, a frozen pond peeking in at one corner, gentle blue shadows and twinkles on the snow, a few snow-covered bushes along the bottom corners. Wide open snow in the middle |
| `thumb/snowflake-catch` | 800×500, opaque | Game-select shelf and how-to screen | A little garden fairy (blue bluebell fairy with petal wings, no Charlie Party characters) with her head tipped back and tongue out catching a big sparkly smiling snowflake, a friendly snowman behind, a penguin zooming past on a red sled, snowflakes everywhere. Energetic. Subject centred |
| `prop/snowflake` | 128×128, transparent | Normal falling flake (worth 1), drawn centred at 58 px, spun by the code | A chunky six-pointed snowflake crystal, icy white and pale blue, with a tiny smiling face in the middle |
| `prop/snowflake-big` | 256×256, transparent | The big sparkly flake (worth 3), drawn centred at 120 px with a glow drawn by code | A large ornate six-pointed snowflake with a pastel rainbow sheen (lilac, pink, aqua), glittering tips and a happy giggling face in the middle |
| `prop/snowball` | 128×128, transparent | Thrown by the snowman friend, drawn centred at 64 px; it bursts into glitter when it lands | A round fluffy snowball with soft blue shading and a couple of sparkles |
| `prop/snowman-friend`, `prop/snowman-friend-throw` | 480×640 each (ratio 3:4), transparent, **same canvas** | Drawn bottom-anchored at (1660, 455) in a 180×240 box; the code swaps to the throw frame for 0.4 s when a snowball leaves | A small cheerful snowman with a striped pink bobble hat, a mint scarf, twig arms and a big grin. Idle: arms down, waving slightly. Throw: right twig arm up high mid-toss, cheeky wink |
| `prop/penguin-sled` | 384×256, transparent | Drawn centred at 200×133, facing right (the code mirrors it for the other direction) | A chubby happy penguin with a little red scarf riding a red wooden sled, wings out, beak open in a "wheee", snow spray behind. Side view |
| `prop/bigsnowman-1` … `prop/bigsnowman-6` | 600×900 each, transparent, **same canvas, bottom-centred** | The shared snowman as it is built, drawn bottom-anchored at (960, 455) in a 240×360 box; stage N shows everything from stages 1..N. **All six must line up exactly** (the code pops between them) | 1: one big snowball base. 2: + middle ball. 3: + head with a happy coal-dot face. 4: + carrot nose and a tall purple top hat with a pink ribbon. 5: + a long rainbow-striped scarf and twig arms. 6: complete: arms raised in a cheer, rosy cheeks, coal buttons, a little flower on the hat, sparkles |

New pose (until registered it falls back to `look-up`, then `think`):
`tongue-out` (loop) — head tipped back looking up, mouth open with the
tongue stuck out to catch snowflakes, a silly happy face.

## Molly Party: Glimmer and the five garden fairies as playable characters (requested 2026-10-13, priority: high, after Molly Party games land)

The user wants the five garden fairies (`garden-fairy-pink`, `-blue`,
`-yellow`, `-green`, `-purple`; today tiny ~54 px NPCs with only
`idle/walk/fly/celebrate/surprised`) developed into **playable characters for
Molly Party** (a shelf of simple, lively games for a 4–5 year old; see the
`## New Molly Party game:` sections). They are not used in Charlie Party
games, so they need **only the poses the Molly Party games use** (list
below; the lead finalises it from the merged games' code).

**Glimmer counts as one of them** (user, 2026-10-13): the host fairy
`glimmer` (canonical already approved; sprite set has `idle, walk, talk,
point, cast, present, ready, wave, cheer, celebrate, think, surprised, sad,
pout`) becomes the sixth Molly Party player. She needs only the missing
Molly poses below, at the same playable resolution and with all landmarks.

**Step 1 — canonical first (§8 rules, user approval):** one canonical per
garden fairy at playable resolution (same family look: round-faced garden fairy,
flower cap, dragonfly wings, glowing outfit), but each now a distinct,
lovable character with her own personality, outfit details and wing shape,
while keeping her colour + flower cap so the existing NPC uses stay
recognisable: pink (tulip), blue (bluebell), yellow (daisy), green (leaf),
purple (violet). Fancy, beautiful wings and dresses; cute, expressive faces.
Save to `reference/canonical/garden-fairy-<colour>.webp`, record prompts,
**show the user, stop for approval.**

**Step 2 — playable sprite sets (after approval):** for each fairy a full
sprite set in `assets/sprites/garden-fairy-<colour>/` at roster resolution
(`bodyHeight` like the other playables, ~260–300 px tall art), with all five
landmarks on every frame (`head/hand/eyes/neck/back`; `back` = between the
wings so dress-up wings/capes sit right; §3.6), portraits (§7), and a
`motion` that suits fluttering (`glide` or a gentle bob). Keep the existing
NPC pose names working (`idle`, `walk`, `fly`, `celebrate`, `surprised`).

**Poses (provisional; final list follows when the games are merged):**
`idle` (hovering, wings fluttering), `walk`, `run`, `fly`, `jump`, `land`,
`cheer`, `celebrate`, `wave`, `surprised`, `giggle`, `laugh`, `dizzy`
(funny bump), `sad` (gentle), `catch`, `toss`, `carry`, `cast` (wand
flourish), `dance`, `dance-star`, `pose-twirl`, `bow`, `sit`, `sleep`,
`clap`, plus the shared photo poses (`photo`, `strike3`, `high-five`).

**Step 3 — character data (lead):** the lead registers them as a Molly Party
roster (character select shows fairies when playing Molly Party) once the
user confirms the decision after trying the games.
