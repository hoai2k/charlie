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


All Play Studio, Molly, grown-up reaction, October16 audit, October27 Dance Studio, nail-hand and Charlie Sister action image requests are delivered and checked. Add new requests or regeneration feedback above; delivery details are in image-requests-history.md and reference/IMAGE-WORK-QUEUE.md.

### beach-ball-soccer — Beach Ball Soccer   (requested by the beach-ball-soccer agent, 2026-10-28, priority: nice-to-have)

Pink Team vs Blue Team on a sunny beach: everyone runs about bumping one
giant, light, bouncy beach ball into the other team's goal (A kicks, B
dashes). Goals get confetti and a cheer, then a reset to kickoff. Every key
has a procedural fallback that ships today, and the code already asks for
every key below. House style: navy `#24163f` outlines, soft cel shading,
bright candy colours, slightly softer than the characters, **no text, no
characters, no animals**. The code draws the ball's shadow, its spin and
squash, the confetti and the net wobble, so none of that is baked in.

**Reuses (keep alive):** `bg/sandcastle-beach` (today's background: the code
draws the pitch lines and goals on its sand), `prop/confetti`.

**Layout (the bg must match; screen px on the 1920×1080 canvas, high
three-quarter view looking down at the sand):** sky and sea across the top
(y 0 to ≈330, keep the top 150 px calm for the team scores and the clock),
wet sand to ≈400, the pitch on dry sand: sidelines at y = 420 (far) and
y = 1010 (near), goal lines at x = 150 (pink, left) and x = 1770 (blue,
right), halfway line x = 960, centre circle radius ≈150 px around (960, 715)
(drawn as an ellipse ≈300 × 210 for the angle). Goal mouths span y = 595 to
835 on each goal line; the goals themselves are separate props (leave the
area x < 150 and x > 1770 between y 430 and 870 plain sand).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/beach-ball-soccer` | 1920×1080, opaque | Full screen, under everything. Pitch lines exactly as in the layout above; otherwise plain, low-contrast sand inside the pitch | A sunny cartoon beach from a high three-quarter view: blue sky with two soft clouds and a calm turquoise sea with a white foam line across the top third, then smooth golden sand with a beach soccer pitch marked in it by a low white rope on little wooden stakes along both sidelines, raked white sand lines for the goal lines, halfway line and centre circle; a striped beach umbrella and a bucket in the top-left corner off the pitch, a rolled beach towel and a few shells in the top-right corner off the pitch. No goals, no ball, no characters |
| `prop/bbs-goal-pink` | 320×860, transparent | The Pink goal on the left end, opening to screen-right, drawn at half size into the box x 0–160, y 415–845 (so the front post stands at (150, 835) and the far post at (150, 595) on screen). In the image: the front post's foot at about (300, 840), the far post's foot at about (300, 360), posts about 280 px tall in the image with a crossbar between their tops, the net sloping back and down to the image's left edge. The code wobbles the net when a goal goes in | A cheerful beach soccer goal for a kids' game seen from the side at a high three-quarter angle, opening to the right: two rounded candy-pink posts and a crossbar wrapped in white stripes like a candy cane, a soft white rope net with big diamond holes, little pink pennant at the top of each post, posts planted in the sand |
| `prop/bbs-goal-blue` | 320×860, transparent | The Blue goal on the right end. Draw it opening to screen-right like the pink one (same anchor points); the code mirrors it to open to the left | The same goal with sky-blue posts and crossbar wrapped in white stripes, white rope net, little blue pennants |
| `prop/bbs-beach-ball` | 256×256, transparent | The giant ball, centred, drawn about 110–130 px across; the code spins it in plane as it rolls, squashes it on bounces and draws its shadow | A big glossy inflatable beach ball seen straight on: six curved panels in pink, white, sky blue, sunny yellow, white and mint meeting at a small white cap in the middle, a soft white shine highlight at the top left. Round, fully visible, no shadow |
| `thumb/beach-ball-soccer` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A giant pink-white-and-blue beach ball flying into a candy-pink beach soccer goal with the net bulging, confetti bursting, sand spraying, sunny sea behind. No characters. Subject centred |

Player poses used: `run`, `walk`, `idle`, `dash` (B), `push` (the kick, A),
`windup` (charging a kick), `cheer`, `celebrate`, `pout`, `surprised`. No new
poses needed.

### gopher-garden — Gopher Gardens   (requested by the gopher-garden agent, 2026-10-28, priority: nice-to-have)

A sunny whack-a-mole party game (Charlie Party, 1–8 players, 60 s): everyone
runs around **one shared garden** full of dirt-mound holes and bops the cheeky
gophers that pop up with a soft squeaky toy mallet (A; B dashes). A bopped
gopher ducks down dazed and happy-silly (+1). Sometimes a garden fairy pops
up instead (don't bop her: she goes dizzy, you lose a point), and now and then
the Troll pops up and grabs your mallet for a tug-of-war. Every key below has
a procedural fallback that ships today, and the code already asks for each
one (it drops in as soon as it is in `assets/art/index.json`; add it to a
`gopher-garden` group). House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text**. No baked-in shadows, sparkles,
stars, motion lines or dust (the code draws them).

**Reused, no art needed:** the garden fairy sprite sets
(`garden-fairy-*`: `idle`/`float` popping up, `dizzy` when bopped), the troll
sprite set (`laugh` popping up, `grab` holding the mallet), and the players'
own `swing` (the bop), `pull` (tugging the mallet back from the troll),
`surprised` (bopped a fairy), `dash`, `run`, `cheer`, `celebrate`, `pout`.
No new poses.

**Layout (screen px on the 1920×1080 canvas, high three-quarter view looking
down at the lawn):** a garden hedge, flower beds and sky in the top band
(y 0 to ≈330; keep the top 130 px calm for the clock); the lawn from y ≈340
to the bottom. The code draws the 18 holes itself in 4 staggered rows:
y ≈ 445 (4 holes), 595 (5), 750 (4), 905 (5), x ≈ 300–1620, 330 px apart.
Holes are drawn 230 px wide at the front row and ≈190 px at the back row.
The score chips sit along the bottom (y ≈ 990).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/gopher-garden` | 1920×1080, opaque | Full screen, under everything. Keep the lawn y 380–1040 plain, even, low-contrast mown grass (the holes, critters and players go there); detail only in the top band and the extreme left/right edges | A cheerful sunny back garden from a high three-quarter view: soft blue sky with two puffy clouds, a neat green hedge across the back with a white picket gate, flower beds of tulips and daisies, a little red wheelbarrow and a watering can at the far left, a birdbath and a sunflower patch at the far right, then a wide, smooth, gently striped mown lawn filling the lower two-thirds. No holes, no animals, no characters |
| `prop/gopher-hole` | 320×160, transparent | The **back** of a hole, drawn centred on the hole point (x, y), 230 px wide at depth 1. Its dark opening must be an ellipse centred at (160, 78) in the image, about 170×64 px; critters rise out of it | A small round dirt mound with a dark open burrow hole in its middle, seen from a high three-quarter view: crumbly warm brown soil, a few pebbles and two tiny grass tufts on the far side, the hole's inside a deep soft brown-black |
| `prop/gopher-hole-front` | 320×160, transparent | Same canvas and placement as `prop/gopher-hole`, drawn **over** the critter so it looks like it pops out from behind the lip. Only the near (bottom) half of the mound: everything above the opening's centre line (y < 78) fully transparent; its top edge follows the lower arc of the opening exactly | Just the front lip of the same dirt mound: the crumbly brown soil rim curving round the front of the hole, a pebble and a grass tuft, matching `prop/gopher-hole` pixel for pixel where they overlap |
| `prop/gopher-up`, `prop/gopher-up-2` | 320×320 each, transparent | Bottom-centre anchor at the hole's opening, drawn 160 px wide at depth 1 (cut off below the hole's front lip by the code). The body runs off the bottom edge of the canvas, cut flat (that part is hidden in the hole). Facing the viewer | A cute chubby gopher popping up out of a burrow, from the tummy up: warm caramel-brown fur, cream muzzle and tummy, two big buck teeth, round black shiny eyes, little pink nose, small round ears, tiny paws. (1) cheeky grin, paws up by its cheeks as if saying "peekaboo!"; (2) a teasing wink with its tongue poking out. Round, soft, friendly, never scary |
| `prop/gopher-bonked` | 320×320, transparent | Same anchor and size as `prop/gopher-up`; shown after a bop while it wobbles and sinks back down (the code adds circling stars, a squash and a small bump) | The same gopher just bopped, dazed and happy-silly: squished down a little, eyes turned into dizzy swirls, a goofy lopsided grin with the tongue lolling out, a little round pink bump on top of its head, cheeks rosy. Clearly giggly, not hurt |
| `prop/gopher-mallet` | 480×200, transparent | Held in each player's hand and swung overhead; drawn about 0.65× the player's height long, rotated about the grip. Horizontal, **handle on the left**, the hand's grip point at (96, 100); the head at the right end, centred on y = 100 | A soft squeaky toy mallet for a kids' game, lying horizontal: a short striped candy-pink-and-white wooden handle with a round yellow knob on its left end, and on the right a big chunky barrel-shaped head made of squishy pastel-pink rubber with white rounded end caps and a small yellow star on its side. Bouncy and harmless-looking, not a real hammer |
| `prop/gopher-troll-up` (optional) | 400×400, transparent | Bottom-centre anchor at the hole's opening, drawn 260 px wide at depth 1 (cut off below the hole's front lip). Today the code uses the troll sprite's `laugh` frame clipped in the hole | The game's Troll (attach the troll canonical `reference/canonical/troll.webp`: olive-green spotted skin, long shaggy brown hair, brown ragged tunic) popping up out of a burrow from the waist up, both big hands on the hole's rim, a huge mischievous toothy grin, eyebrows waggling. Cheeky, never scary |
| `prop/gopher-troll-tug` (optional) | 400×400, transparent | Same anchor and size as `prop/gopher-troll-up`; the code draws the player's mallet in his hands with its head at the grip point **(300, 170)** and wobbles him side to side. Today the code uses the troll sprite's `grab` frame | The same Troll from the waist up, leaning back and clutching something with both fists held together forward and to the right, at about (300, 170) in the image (no mallet in the art), grinning cheekily with his tongue poking out, as if winning a playful tug-of-war |
| `thumb/gopher-garden` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A sunny garden lawn with three dirt-mound holes: a cheeky gopher popping up from the middle one with a pink squeaky mallet bopping down on it (only the mallet, no player), a little pink flower fairy peeking out of the left hole, and the troll's big green hand reaching out of the right one. Subject centred |

### gingerbread-house — Gingerbread House   (requested by the gingerbread-house agent, 2026-10-28, priority: nice-to-have)

A Play Studio game (1–8 players, everyone wins). Each player has a station on
a cosy kitchen table: pick a house shape (cottage, tall house, castle) and
press X to drop each gingerbread piece into place (it lands with a squish of
icing glue), then hold X to pipe icing that runs along the roof edges,
windows and door, then stick candy all over it. Finale: night falls, every
house moves into a little snowy gingerbread village, the windows light up
warm, a gingerbread person peeks out of each door, snow falls and the players
walk about (X nibbles a candy). Every key below has a procedural fallback
that ships today, and the code already asks for each one (it drops in as soon
as it is in `assets/art/index.json`; add it to the `gingerbread-house`
group). House style: navy `#24163f` outlines, soft cel shading, warm
gingerbread browns and bright candy colours, **no text**. No baked-in
shadows, sparkles, glow or snow (the code draws them).

**Reused, no art needed:** `prop/topper-candy-cane` (candy cane) and
`prop/topper-lollipop` (lollipop), both common art loaded at boot (keep them
out of this group: grouping them would stop Cake Bakery's boot load). Icing, sprinkles, the cake
board, the door and the window glow are drawn by the code.

**House pieces: one shared canvas per shape.** Every piece key is a
**960×880** transparent WebP. All pieces of one shape share that canvas, so
drawing each placed piece at the same rect rebuilds the house; the code draws
every piece at the same box. Coordinates below are house units: 1 unit =
2 px, unit (0, 0) = pixel **(480, 880)** (the middle of the house's base, on
the bottom edge; up is negative y). Keep each piece's outline within about
6 px of the polygon given (the code's icing runs along those edges and the
pieces drop into exactly these spots). **Windows and the door are fully
transparent holes** (the code draws sugar-glass windows that light up at
night, and the door, behind the wall). Gingerbread: warm golden-brown
cookie with a slightly darker baked edge, a few tiny dimples, flat front
view, no icing, no candy (the players add those).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/gingerbread-house` | 1920×1080, opaque | Behind each player's station, scaled to cover it so that **image y = 760 lands on the station's table edge** (the house board and the player stand there; the table top is y 760 → 1080). Keep a calm, plain area in the middle (x 500–1420, y 150–760): the house is built there | A cosy farmhouse kitchen at Christmas time, front view: a warm cream wall with a frosty window showing gentle snowfall in the upper left, a shelf with jars of sweets and a rolling pin, a string of paper snowflakes and a little garland across the top, a wooden table top with a red-and-white checked cloth from y ≈ 760 to the bottom. Soft, warm, slightly desaturated |
| `bg/gingerbread-house-night` | 1920×1080, opaque | Full screen for the finale village. The houses stand in one row with their bases on **y = 880** (5–8 players: a second, smaller row behind on y = 690); the characters walk on those lines. Keep y 300–960 across the middle free of big objects, and the top 140 px calm (the title banner) | A magical snowy night: deep navy-to-violet sky with twinkling stars and a big soft full moon, distant snowy hills with tiny pine trees, a smooth moonlit snowy village square from y ≈ 620 to the bottom with soft blue shadows, a lamp post at far left and far right, gentle bunting of tiny lights between them high up. No houses in the middle |
| `thumb/gingerbread-house` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` fallback) | A cute gingerbread cottage covered in white icing drips, gumdrops, peppermints, candy canes and a lollipop by the door, warm light in its windows, snow falling, a little gingerbread person waving from the open door, a piping bag squeezing icing on the roof edge. Subject centred |
| `prop/gh-cottage-wall` | 960×880, transparent | Cottage front wall: polygon (-150, 0), (150, 0), (150, -170), (0, -300), (-150, -170). Holes: arched door x -36…36, y -112…0 (top is a half circle of radius 36 centred at (0, -76)); square windows x -118…-66 and 66…118, y -150…-96; round attic window centre (0, -218), radius 24 | The front wall of a gingerbread cottage: a house-shaped (pentagon) slab of gingerbread with an arched door hole, two square window holes and a round attic window hole |
| `prop/gh-cottage-roof-left`, `prop/gh-cottage-roof-right` | 960×880 each, transparent | The two roof slabs, each a straight gingerbread plank lying along a roof slope. Left: corners (-175.7, -147.7), (19.6, -317.0), (0, -339.7), (-195.4, -170.4). Right: the mirror image (x → -x). They overlap at the ridge (the right one draws on top) | A thick, straight gingerbread plank seen front-on, slanting up toward the middle like one half of a roof, its outer long edge gently scalloped like a biscuit |
| `prop/gh-cottage-chimney` | 960×880, transparent | Rectangle x 62…104, y -318…-200 (its lower part is hidden behind the right roof slab) | A little gingerbread chimney with a few piped-looking brick lines pressed into the dough (not icing, just baked-in grooves) |
| `prop/gh-tall-wall` | 960×880, transparent | Tall house front wall: polygon (-105, 0), (105, 0), (105, -300), (0, -410), (-105, -300). Holes: arched door x -30…30, y -104…0 (half circle radius 30 at (0, -74)); windows x -78…-30 and 30…78 at y -196…-140 and y -280…-228; round window centre (0, -338), radius 20 | A tall, narrow gingerbread house front wall with a steep pointed gable: an arched door hole, four window holes in two rows and a round window hole near the top |
| `prop/gh-tall-roof-left`, `prop/gh-tall-roof-right` | 960×880 each, transparent | Left: corners (-125.7, -278.3), (20.2, -431.2), (0, -450.5), (-145.9, -297.6); right: the mirror image | Two steep gingerbread roof planks, like the cottage's but longer and steeper |
| `prop/gh-tall-porch` | 960×880, transparent | A small canopy over the door: rectangle x -50…50, y -124…-106 | A short flat gingerbread plank used as a little porch roof |
| `prop/gh-castle-tower-left`, `prop/gh-castle-tower-right` | 960×880 each, transparent | Left tower: rectangle x -210…-122, y -290…0, with an arched window-slit hole x -176…-156, y -250…-196; right tower: the mirror image | A tall rectangular gingerbread castle tower slab with a narrow arched window hole |
| `prop/gh-castle-keep` | 960×880, transparent | The middle wall: rectangle x -126…126, y -200…0 with five battlement teeth on top (each 30 wide, y -228…-200, centred at x -100, -50, 0, 50, 100). Holes: arched door x -40…40, y -128…0 (half circle radius 40 at (0, -88)); arched windows x -104…-74 and 74…104, y -170…-118 | A gingerbread castle wall with battlements along the top, a big arched door hole and two arched window holes |
| `prop/gh-castle-cone-left`, `prop/gh-castle-cone-right` | 960×880 each, transparent | Pointed tower roofs: triangle (-226, -282), (-106, -282), (-166, -420); right: the mirror image | A pointed cone-shaped gingerbread tower roof, seen front-on as a tall triangle, edge gently scalloped |
| `prop/gh-candy` | 640×320 atlas, transparent, **4 columns × 2 rows of 160×160 cells, on an exact even grid** (run `tools/sprites/repack_atlas.py --cols 4 --rows 2`) | Each candy centred in its cell, filling about 80% of it; the code cuts the cells and draws one centred on the spot it sticks to, about 30 house units (60 px) across. Order: row 1 gumdrop red, gumdrop green, gumdrop yellow, gumdrop purple; row 2 peppermint red, peppermint green, chocolate button, candy heart | Sugar-coated gumdrops (domed, sparkly sugar texture) in four colours; round peppermint swirl candies (white with red, and white with green, pinwheel stripes) seen flat; a round flat milk-chocolate button; a little pink sugar candy heart. All seen straight on, flat lighting from the upper left |
| `prop/gh-gingerbread-person` | 240×320, transparent | Bottom-centred (feet on the bottom edge, x = 120). Drawn about 70 house units tall rising up in the open doorway in the finale (clipped to the door hole), rocking side to side in plane to wave | A cute little gingerbread person, front view, waving one arm up high: white icing squiggles on wrists and ankles, two icing dot eyes, a big icing smile, rosy pink cheeks, three gumdrop buttons (red, green, yellow). Cheerful |

### plushie-workshop — Plushie Workshop   (requested by the plushie-workshop agent, 2026-10-28, priority: nice-to-have)

A Play Studio game (1–8 players, everyone wins). Each player has a station on
a sewing-workshop table: pick a plush body (bear, bunny, unicorn, kitty, puppy,
dragon) and a fabric, hold X to puff stuffing in until it plumps from a flat
empty skin to fluffy (squeak!), sew on eyes, a nose, a mouth, hearts and
patches exactly where the needle points (X stitches), dress it (bows, hats,
scarves, tutus, capes, wings) and give it a name. Finale: every player's
character hugs their plushie (the `cuddle` pose) while hearts float up, then
the plushies hop onto a big toy shelf with name tags; the game ends on that
shelf. Every key below has a procedural fallback that ships today, and the
code already asks for each one (it drops in as soon as it is in
`assets/art/index.json`; add it to the `plushie-workshop` group, which is
already there). House style: navy `#24163f` outlines, soft cel shading,
bright candy colours, a soft felt / plush fabric texture on the toys,
**no text**. No baked-in shadows, sparkles, hearts, glow or motion lines (the
code draws them).

**Reused, no art needed:** clothes `prop/bow-pink`, `prop/bow-blue`,
`prop/pet-bow-purple`, `prop/bow-back`, `prop/hat-top`, `prop/hat-party`,
`prop/hat-witch`, `prop/crown-gold`, `prop/crown-flower`, `prop/tiara-star`,
`prop/cape-royal`, `prop/cape-starry`, `prop/cape-rainbow`,
`prop/wings-fairy`, `prop/wings-butterfly`, `prop/wings-dragon`,
`prop/necklace-heart`, `prop/snowman-bowtie` (in the group). Every character
set already has the `cuddle` pose; no new poses.

**The plush frame (shared by every body, so eyes, patches and clothes line
up on all six).** Each body is one 512×560 cell. In every cell of every body
these landmarks are at the same pixel (cell px, origin top-left):

| Landmark | Cell px | Used for |
| --- | --- | --- |
| Seat line (bottom of the bottom and feet) | y = 540, centred on x = 256 | The plush sits on it (table, arms, shelf) |
| Top of the head (hat line) | y = 88 (ears / horn / dragon horns stick up above it, up to y ≈ 12) | Hats and crowns sit on it |
| Head | circle centred (256, 200), radius ≈ 115 | Face area |
| Eye line | y = 195; default eyes at x = 206 and 306 | Eyes |
| Nose | (256, 240) | Nose |
| Mouth | (256, 272) | Mouth |
| Neck / chin line | y = 322 | Scarves, bow ties, necklaces |
| Shoulders / back | (256, 350) | Capes hang from here, wings centre at (256, 375), both drawn **behind** the body |
| Tummy | centred (256, 425), a calm plain area about 180×140 | Hearts and patches |
| Waist | y = 470 | Tutus |

Pose: sitting, front view, chubby and round (a big head about 45% of the
height, a round body, short stubby arms resting at the sides from y ≈ 340 to
430 that do **not** cover the tummy, short legs sticking forward with round
feet at about (186, 515) and (326, 515)), tail behind, peeking out to one
side. **Blank face**: no eyes, no nose, no mouth (the players sew them on);
a muzzle shape (bear, puppy) or cheek fluff is fine.

**Flat (unstuffed) state:** the same plush as an empty, limp fabric skin
slumped onto the seat line: the stuffed outline squashed about the seat line
to **60% height and 112% width** (so its head top lies at y ≈ 269 and its eye
line at y ≈ 333), ears flopped down, soft wrinkles and loose folds, a little
gap in the side seam. The code moves sewn-on items with exactly this squash
while it puffs up, and cross-fades flat → stuffed.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `prop/plushie-body-bear`, `prop/plushie-body-bunny`, `prop/plushie-body-unicorn`, `prop/plushie-body-kitty`, `prop/plushie-body-puppy`, `prop/plushie-body-dragon` | 1024×1120 each, transparent, **2 columns × 2 rows of 512×560 cells, on an exact even grid** (run `tools/sprites/repack_atlas.py --cols 2 --rows 2` but keep the landmarks above, do not re-centre) | Columns: **flat** (left), **stuffed** (right). Rows: **fabric** (top): the whole plush in plain **white fabric** with soft light-grey cel shading and navy outlines, which the code tints to the chosen fabric (multiply) and lays the fabric pattern over (clipped to it); **trim** (bottom): only the parts that keep their own colour, exactly registered over row 1 (same pixels), transparent elsewhere: inner ears, paw pads, muzzle/snout, cheek blush, the unicorn's golden horn and pastel rainbow mane and tail tuft, the dragon's soft spikes, little horns and wing membranes, the bunny's pink inner ears and cotton tail. Drawn bottom-anchored on the seat line, about 300–440 px tall at a station and 230 px on the shelf | A cute handmade plush toy (teddy-bear-style stuffed animal) sitting, front view, chubby and round with a big head and stubby limbs, soft felt and minky fabric texture with visible little seams. **bear**: round ears, oval muzzle; **bunny**: two long upright ears (one bent at the tip), round cotton tail; **unicorn**: small pointed ears, a spiral horn, a short fluffy mane and a tail tuft; **kitty**: pointed ears, cheek fluff, long curled tail; **puppy**: long floppy ears hanging down, round muzzle, short tail; **dragon**: two little soft horns, a row of soft spikes over the head and back, tiny folded wings behind the shoulders, a chunky tail. Each in the flat (empty limp skin) and stuffed state described above |
| `prop/plushie-face` | 1024×384 atlas, transparent, **8 columns × 3 rows of 128×128 cells, on an exact even grid** | Each piece centred in its cell, filling about 75% of it; the code draws an eye about 58 px across (cell px of the plush frame), a nose about 52 px, a mouth about 92 px wide, centred exactly on the needle point. Eyes are drawn as a pair 100 px apart: the cell holds the eye on the **viewer's right**; the code mirrors it for the other eye. Row 1 eyes: black button eye with two thread holes; big shiny black eye with two white highlights; sleepy closed arc with lashes; pink heart eye; gold star eye; googly eye (white with a black pupil); big blue sparkly eye with lashes; embroidered happy arc (^). Row 2 noses: rounded brown triangle (bear); pink bunny Y nose; pink heart nose; round black button nose; small pink kitty triangle; big shiny black oval (puppy); two little dark nostril dots (dragon); red pompom nose. Row 3 mouths: stitched smile (one navy thread line); open happy mouth with pink tongue; kitty "w" mouth; small "o" mouth; smile with two bunny buck teeth; silly tongue-out; little smile with two tiny fangs; big grin | Felt and embroidered plush-toy face pieces, as if sewn on: tiny running stitches round each edge, flat front view, soft lighting from the upper left |
| `prop/plushie-patches` | 1024×256 atlas, transparent, **8 columns × 2 rows of 128×128 cells, on an exact even grid** | Each centred, filling about 80% of its cell; the code draws one about 76 px across (plush frame px) centred exactly on the needle point. Row 1 hearts: red felt heart; pink felt heart with white stitches; rainbow-striped heart; heart-shaped button with two holes; lilac heart with a tiny gold star; three tiny hearts in a cluster; gold glitter heart; patchwork heart (four little fabric squares). Row 2 patches: yellow star; white daisy; round blue patch with cross-stitch edge; red gingham square; crescent moon; fluffy cloud; rainbow arc; paw print | Felt appliqué patches for a plush toy with visible running-stitch edges, flat front view, bright candy colours |
| `prop/plushie-clothes` | 1024×512 atlas, transparent, **4 columns × 2 rows of 256×256 cells, on an exact even grid** | Row 1 **scarves**, worn round the neck: the knot centre at (128, 96) of the cell, the wrap spanning x ≈ 24–232, tails hanging down on the viewer's right; drawn about 240 px wide (plush frame px) with the knot on the neck point (256, 322). Order: red-and-white striped knit; blue knit with pompoms; pink with white polka dots; rainbow stripes. Row 2 **tutus**, front view: the waistband's centre at (128, 80) of the cell, the skirt spanning x ≈ 8–248 and flaring down to y ≈ 190, the band's opening about 60% of the width; drawn about 300 px wide with the band on the waist (256, 470). Order: pink tulle; lavender with sparkles; mint with little stars; rainbow layers | Doll-sized clothes for a plush toy, front view: chunky cosy knitted scarves wrapped once round a neck (no neck drawn); fluffy layered tulle tutus seen from the front (no body drawn) |
| `bg/plushie-workshop` | 1920×1080, opaque | Behind each player's station, scaled to cover it so that **image y = 780 lands on the station's table edge** and image x = 960 on the plush (stations are 470–1320 px wide, so only the middle part shows with many players). The table top runs from y = 780 to the bottom. Keep the middle (x 560–1360, y 180–780) calm and low-contrast: the plush sits there | A cosy, sunny toy-maker's sewing workshop, front view: a pastel wall with a pegboard of colourful thread spools and scissors, shelves of folded fabric bolts in candy colours, a big round window with a soft sky, a string of fabric bunting across the top, a big pincushion and a basket of yarn at the far edges; a warm honey-wood worktable top with a measuring tape lying along the front edge from y ≈ 780 to the bottom. Soft and slightly desaturated. No toys, no people |
| `bg/plushie-shelf` | 1920×1080, opaque | Full screen for the finale and the gallery ending. Two long shelf boards whose **top surfaces are at y = 430 and y = 760**, spanning at least x = 200–1720, each with a front lip about 40 px deep (the code pins a name tag on the lip under each plushie). The plushies sit on the boards between x = 330 and 1590: keep that part of each board and the wall above it empty and calm. A few small decorations may sit on the boards' far ends (x < 330, x > 1590). Keep the top 170 px calm (the title banner) and y ≥ 900 calm (the stars bar) | A big friendly wooden toy shelf (bookcase) filling the screen, front view: warm cream-painted wood with rounded corners, the back panel in soft mint wallpaper with tiny stars, two long empty shelves, a stack of picture books and a wooden toy block at the far left end of the upper shelf, a yarn basket and a little toy drum at the far right end of the lower shelf, a cosy rug and floorboards below. No plush toys, no characters |
| `thumb/plushie-workshop` | 800×500, opaque | Game-select shelf and how-to screen | A freshly made cute plush bunny with a pink bow and a sewn-on heart patch sitting on a sewing table, a big needle with pink thread stitching a button eye on a little plush bear next to it, fluffy white stuffing puffs flying, thread spools and a pincushion around. No characters. Subject centred |
| `prop/plushie-stuffing` | 256×256, transparent | One fluffy puff of white toy stuffing, centred; the code draws many of them (40–110 px across) flying from the stuffer into the plush, spinning and shrinking, and a little pile beside the plush | A fluffy tuft of white polyester toy stuffing, like a small soft cloud of cotton, soft light-grey shading |
| `prop/plushie-stuffer` | 384×384, transparent | Stands on the table beside the plush; **its nozzle's tip at (40, 300)** of the image points at the plush's side (the code puffs stuffing from that point) | A cute stuffing machine for a toy workshop: a round pastel-pink tank with a clear dome on top full of white fluff, a little crank handle on the right, a curved nozzle sticking out to the lower left, four stubby feet |
| `prop/plushie-needle` | 256×256, transparent | The sewing cursor: **its point at pixel (28, 228)**, which the code puts exactly on the spot where the next piece lands; the code bobs it up and down while stitching and draws the thread trail | A big shiny silver sewing needle lying diagonally, its sharp point at the bottom-left and its eye at the top-right, a loop of pink thread through the eye curling away. Friendly, chunky, cartoon |
| `prop/plushie-tag` | 384×160, transparent | A blank name tag pinned on the shelf lip under each plushie, drawn about 190 px wide; the code writes the plushie's name in the area x 80–360, y 30–130 | A blank cream paper luggage tag with rounded corners, a punched hole on the left with a loop of pink ribbon through it, a thin stitched border. No text |
