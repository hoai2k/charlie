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
| `thumb/cupcake-stack` (Molly, 2026-10-13) | Plain white background with no scene; the only blank-white tile on the Molly shelf and how-to screen | Same subject, opaque 800×500 with a garden-party background (lawn, bunting, sky) like the other Molly thumbnails |
| `prop/cupcake-gold` (Molly, 2026-10-13) | Looks almost the same as `prop/cupcake-lemon`, so the golden super-cupcake doesn't stand out (the code only adds a glow) | 256×224, same anchor: shiny gold-foil wrapper, glittery gold frosting, sparkles, a little star or crown on top |
| `bg/unicorn-jump` (Molly, 2026-10-13) | Too busy behind the lanes: big gumdrops, lollipops and flowers fill the middle and bottom, so riders are hard to read (the code adds a milky wash for now) | Same seamless 1920×1080 tile; candy detail mostly in the top ~250 px, the lane area (y 260–1000) a soft, low-contrast meadow |

Engine-side notes from the same review: several keys are aliases of one
file (`prop/sky-cake` = `prop/giant-cake`, `prop/pump` = `prop/balloon-pump`,
`prop/gem` = `prop/gem-red`, `prop/cookie-tile` = `prop/cookie-1`). That's
fine; the code uses one of each pair.

No open image or re-generation requests remain after the Play Studio delivery (2026-10-12). See IMAGE-WORK-QUEUE.md for the publication checkpoint.

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

## New Molly Party game: ballet-butterflies

> **REPLACED (2026-10-13):** `ballet-butterflies` is off the Molly shelf; `opposite-ballet` replaced it and reuses only the rows left below. The other rows moved to history as dropped.


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
| `prop/ballet-teacher` | 512×640, transparent | The teacher idle. Anchor: bottom centre = her feet (she hovers; the code adds a bob and a soft shadow). Drawn 330 px tall, facing the viewer | Madame Papillon, a friendly butterfly fairy ballet teacher: tall graceful fairy with a lilac bun, a sparkly pink tutu leotard, ballet slippers, huge monarch-meets-rainbow butterfly wings, a tiny wand, warm smile. Standing in first position |
| `prop/ballet-teacher-up`, `prop/ballet-teacher-twirl`, `prop/ballet-teacher-plie`, `prop/ballet-teacher-side`, `prop/ballet-teacher-bow` | 512×640 each, transparent | Same anchor/size as `prop/ballet-teacher`; shown while she demonstrates each move (code still adds a spin for twirl and a dip for plié) | The same teacher, same scale: arms raised in a high round fifth position; mid-pirouette on one toe with the tutu flaring; deep plié with knees bent out and arms rounded low; a big side step with one leg pointed out and arms open to the side; a graceful curtsy-bow |
| `prop/ballet-move-up`, `prop/ballet-move-twirl`, `prop/ballet-move-plie`, `prop/ballet-move-side` | 256×256 each, transparent | Drawn centred inside the white move card (fitted to 240 px); the code draws the card, an arrow/button glyph under it and the animation | Simple bold pictograms a 4-year-old reads instantly: a little ballerina silhouette (pink, round head) with both arms straight up; spinning on one toe with swirl lines; knees bent low with a down-motion bounce line; stepping sideways with motion lines. Flat colours, navy outline |
| `prop/ballet-butterfly-pink`, `prop/ballet-butterfly-blue`, `prop/ballet-butterfly-yellow`, `prop/ballet-butterfly-purple` | 128×128 each, transparent | Seen from above, wings fully open, body vertical, centred. The code flaps it by squashing x and draws it 44–70 px wide | Cute cartoon butterflies with big rounded wings: pink with white polka dots; sky blue with lilac edges; lemon yellow with orange tips; purple with a pink heart pattern. Tiny dark body, curly antennae |
| `prop/ballet-petal` | 64×64, transparent | Centred, spun and drifted by the code for the final bow shower, drawn 22–34 px | A single soft pink rose petal, slightly curled, gentle gradient |

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

> **REPLACED (2026-10-13):** `puppy-splash` is off the Molly shelf; `muddy-mayhem` replaced it and reuses only the rows left below. The other rows moved to history as dropped.


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
| `prop/puppy-1` … `prop/puppy-4` | 220×180 each, transparent | Bottom-centre anchor (feet), drawn ~100 px tall, mirrored for left; the code adds mud splotches, wag, hop and squash. 1 cream golden-retriever pup, 2 white fluffy poodle pup, 3 brown-and-white beagle pup, 4 black-and-white spotty pup | A cute fluffy puppy, side view facing right, standing on four legs, tongue out, tail up, big shiny eyes, clean and soft |
| `prop/mud-puddle` | 320×170, transparent | Centred, drawn ~260 px wide flat on the grass | A wide flat glossy brown mud puddle with a few splashes at the edge, seen from above at an angle |

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

**Step 1 — canonical first (§8 identity rules; Molly approval gate waived):** one canonical per
garden fairy at playable resolution (same family look: round-faced garden fairy,
flower cap, dragonfly wings, glowing outfit), but each now a distinct,
lovable character with her own personality, outfit details and wing shape,
while keeping her colour + flower cap so the existing NPC uses stay
recognisable: pink (tulip), blue (bluebell), yellow (daisy), green (leaf),
purple (violet). Fancy, beautiful wings and dresses; cute, expressive faces.
Save to `reference/canonical/garden-fairy-<colour>.webp`, record prompts,
**Self-review and proceed: the user waived further Molly Party character approvals on 2026-10-13.**

**Step 2 — playable sprite sets (approved; future Molly approvals waived):** for each fairy a full
sprite set in `assets/sprites/garden-fairy-<colour>/` at roster resolution
(`bodyHeight` like the other playables, ~260–300 px tall art), with all five
landmarks on every frame (`head/hand/eyes/neck/back`; `back` = between the
wings so dress-up wings/capes sit right; §3.6), portraits (§7), and a
`motion` that suits fluttering (`glide` or a gentle bob). Keep the existing
NPC pose names working (`idle`, `walk`, `fly`, `celebrate`, `surprised`).

**Poses (from all 23 Molly games on the shelf, 2026-10-13):**
`celebrate`, `cheer`, `idle`, `surprised`, `run`, `walk`, `wave`, `giggle`, `dance`, `dizzy`, `action`, `laugh`, `jump`, `fall`, `pose-twirl`, `throw`, `catch`, `float`, `dance-up`, `dance-side`, `dance-star`, `dance-down`, `ready`, `carry`, `high-five`, `swim`, `spring-jump`, `tuck`, `balance`, `look-around`, `ride-sit`, `sit`, `dash`, `boop`, `cuddle`, `tongue-out`, `hurt`, `wand-up`, `cast`, `look-up`, `toss`, `blow`, `eat`, `paint`, `water`, `shake`, `strike3`, `sleep`, `flip`, `crouch`, `tumble`, `bow`, `silly-pose`, `push`, `think`, `tiptoe`.

Used by only one or two games (draw these after the common ones): `carry` (sock-match, whoopee-tea), `high-five` (sock-match, fairy-flutter), `swim` (mermaid-pearls, bubble-pop), `spring-jump` (trick-or-treat, bed-bounce), `tuck` (fairy-flutter, bed-bounce), `balance` (sneaky-dance, opposite-ballet), `look-around` (sock-match), `ride-sit` (unicorn-jump), `sit` (unicorn-jump), `dash` (mermaid-pearls), `boop` (pumpkin-peekaboo), `cuddle` (kitten-yarn), `tongue-out` (snowflake-catch), `hurt` (trick-or-treat), `wand-up` (wand-shapes), `cast` (wand-shapes), `look-up` (cupcake-stack), `toss` (cupcake-stack), `blow` (cupcake-stack), `eat` (bubble-pop), `paint` (rainbow-painter), `water` (garden-grow), `shake` (muddy-mayhem), `strike3` (sneaky-dance), `sleep` (bed-bounce), `flip` (bed-bounce), `crouch` (prank-troll), `tumble` (prank-troll), `bow` (opposite-ballet), `silly-pose` (opposite-ballet), `push` (whoopee-tea), `think` (whoopee-tea), `tiptoe` (whoopee-tea).
New Molly poses (descriptions in `POSES`, src/engine/sprites.js): `ride-sit` (unicorn-jump), `boop` (pumpkin-peekaboo), `cuddle` (kitten-yarn), `tongue-out` (snowflake-catch), `silly-pose` (opposite-ballet), `tiptoe` (whoopee-tea). In `float`, `swim` and `idle` the wings keep fluttering.

**Step 3 — character data (lead):** the lead registers them as a Molly Party
roster (character select shows fairies when playing Molly Party) once the
user confirms the decision after trying the games.

## New Molly Party game: bed-bounce

### bed-bounce — No Jumping on the Bed!   (requested by the bed-bounce agent, 2026-10-13, priority: nice-to-have)

Replaces Choo-Choo Shapes (`shape-train`); it reuses none of its art. A huge
fluffy bed in a cosy bedroom at night, seen from the side. Nanny Moo (a NEW
character: a kindly, slightly pompous cow in a nightcap and a pink dressing
gown) says goodnight and shuts the door. BOUNCE! Players hold A to bounce
higher and higher (stick steers left/right), grab stars and feathers in the
air, bonk each other with pillows (feather explosions) and touch the
glow-star stickers on the ceiling. When the hallway light shows under the
door, thump-thump footsteps come and the handle wiggles, everyone lets go
and flops under the duvet fake-snoring before Nanny Moo peeks in. Anyone
still bouncing gets a pompous stare and a few stars wobble out. Teddies and
the cat start bouncing too; feathers fill the room. Finale: Nanny Moo comes
in, sighs at the feather storm... and jumps on the bed herself. Every key has
a procedural fallback that ships today. House style: navy `#24163f`
outlines, soft cel shading, bright candy colours, cosy night palette (deep
blue-violet with warm lamp-glow accents), **no text** in any image. Player
avatars use existing poses (see the bed-bounce final report for the list).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/bed-bounce` | 1920×1080, opaque | Full screen. **No bed and no door in it** (both are drawn by code). The code draws the bed over x≈90–1490, y≈440–1040, the door in the right wall at x≈1580–1820, y≈380–930 (keep that wall area plain, wallpaper only), glow-star stickers along the ceiling at y≈150–200. Floor line at y≈930. Keep the top 110 px calm (HUD) | A cosy child's bedroom at night, side view: deep blue-violet wallpaper with tiny pale stars, a round window on the upper left with a big smiling crescent moon and twinkling stars outside, a toy shelf with books and toys, a fluffy round rug on a warm wooden floor, a little night-light glow. Calm and dreamy, soft lamp-glow highlights |
| `thumb/bed-bounce` | 800×500, opaque | Game-select shelf and how-to screen | A giant fluffy bed with kids'-party energy: a cartoon fairy and a teddy bear bouncing sky-high with pillows, feathers exploding everywhere, a cow in a nightcap peeking round a door with one eyebrow raised, a moonlit window. Subject centred, no recognisable roster characters |
| `prop/bb-bed` | 1400×600, transparent | Drawn at x=90, y=440 at 1400×600 (top-left anchor); the code squashes it slightly when people land. Headboard on the LEFT (0–14% of the width, full height). **The mattress top where feet land is at 53% from the top (y≈760 on screen), flat from 14% to 100% of the width**; the duvet covers it (code draws sleeper lumps on top). Legs reach the bottom edge | A huge puffy cartoon bed, side view: a tall rounded wooden headboard with a heart cut-out on the left, a thick bouncy mattress, a fluffy pastel-pink quilted duvet with a star pattern draped over the side, two big pillows by the headboard, short stubby legs |
| `prop/bb-door` | 240×550, transparent | Anchor top-left at (1580, 380), drawn 240×550 when shut. When peeking the code squeezes it horizontally towards the hinge (right side) to swing it open | A rounded-top wooden bedroom door, front view, painted cream with a little moon-and-star decoration, a round brass knob on the LEFT side |
| `prop/nanny-moo` | 512×640, transparent | Anchor bottom-centre on the floor (y≈930); drawn 400 px tall, facing left. Used for the goodnight wave and the finale walk-in | Nanny Moo: a kindly, slightly prim cartoon cow standing upright, white with soft black patches, pink snout, little curved horns, a long droopy blue-striped nightcap with a pompom, a fluffy pink dressing gown with a belt, bunny slippers, holding a small glowing night-light lantern (electric, no flame). Raised eyebrow, warm smile |
| `prop/nanny-moo-peek` | 400×480, transparent | Anchor bottom-RIGHT; drawn 300 px wide with its right edge at the door's opening edge (x≈1600, bottom at y≈800) so she leans out round the door frame | Nanny Moo leaning in sideways to peek: just her head with the nightcap, one shoulder and a hand holding the night-light lantern, one eyebrow raised suspiciously, looking left |
| `prop/nanny-moo-jump` | 512×640, transparent | Anchor centre; drawn 420 px tall in the finale, bouncing high above the bed (the code moves and squashes her) | Nanny Moo mid-bounce with delight: arms flung up, dressing gown flapping, nightcap flying up, slippers kicked off, eyes shut laughing |
| `prop/bb-pillow` | 256×192, transparent | Anchor centre; drawn 90 px wide in each player's hand (code rotates it for swings) | A fluffy white rectangular pillow with soft puffy corners and a tiny lace edge |
| `prop/bb-feather` | 128×128, transparent | Anchor centre; drawn 40–70 px, drifting and spinning | A single soft white downy feather with a faint pink tip |
| `prop/bb-star` | 128×128, transparent | Anchor centre; drawn 70 px, floating collectible (golden variant tinted by code) | A plump golden five-point star with a happy face, rosy cheeks and a white shine |
| `prop/bb-glowstar` | 128×128, transparent | Anchor centre; drawn 60 px, stuck to the ceiling in a row (code makes them glow when touched) | A pale yellow-green glow-in-the-dark plastic star sticker, softly glowing |
| `prop/bb-teddy` | 256×256, transparent | Anchor bottom-centre; drawn 120 px tall, bouncing on the bed | A cuddly brown teddy bear with a red bow tie, arms up, mid-bounce, happy face |
| `prop/bb-cat` | 256×256, transparent | Anchor bottom-centre; drawn 110 px tall, bouncing on the bed | A fluffy ginger cat leaping with all four paws spread out and a delighted face, tail up |

## New Molly Party game: prank-troll

### prank-troll — Prank the Sleeping Troll   (requested by the prank-troll agent, 2026-10-13, priority: nice-to-have)

Replaces Ladybug Spots (`ladybug-spots`). Reuses: nothing from it (the
meadow is new because of the big tree). The big friendly troll (the Charlie
Party NPC, same look as `assets/sprites/troll`) is snoring against a big
tree in a sunny meadow. Players tiptoe to prank baskets around the meadow
(a crayon, flowers, bows, a party hat, a tickle feather, glitter, nail
polish), carry one to the troll and press A: a curly moustache appears,
flowers in his hair, bows on his ears, a party hat, glitter in his beard,
pink toenails. Feather tickles build to a huge flower-shower SNEEZE. When he
stirs (snore stops, an eye cracks open, a big "!"), everyone freezes and
turns into a bush; anyone wiggling gets a sleepy swat and tumbles away
giggling. Finale: he wakes, a garden fairy holds up a mirror, he ROARS with
laughter and dances in his prank outfit. **The code draws every prank on top
of the troll art,** so the troll images must match the face/hair/feet
positions below. Every key has a procedural fallback that ships today.
House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text**. The mirror fairy is a `garden-fairy-*` NPC sprite.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/prank-troll` | 1920×1080, opaque | Full screen. A big tree trunk centred at x=960 with its base at y≈560 (the troll sits against it; the code draws him, so leave the trunk base clear). Players walk everywhere below y≈540. Keep the top 110 px calm (HUD) | A sunny summer meadow from a high 3/4 view: a huge old friendly oak in the top middle with a wide leafy crown, soft green grass with mowed stripes, daisies, buttercups and clover, a few tall flowers and bushes framing the left and right edges, butterflies, blue sky peeking at the top corners |
| `thumb/prank-troll` | 800×500, opaque | Game-select shelf and how-to screen | A big friendly troll snoring against a tree with a curly drawn-on moustache, flowers in his hair, a party hat and bows on his ears, little giggling fairies tiptoeing up with a feather and a crayon, Zzz bubbles. Subject centred |
| `prop/pt-troll-asleep` | 900×760, transparent | Anchor bottom-centre at (960, 640), drawn 640×540 (front view, sitting against the tree with legs stretched out towards the viewer, big bare feet at the bottom). **Positions (fractions of the image, x / y):** face centre 0.50 / 0.27; eyes at 0.44 and 0.56 / 0.24; nose 0.50 / 0.30 (moustache sits just under it at 0.50 / 0.34); ears at 0.31 and 0.69 / 0.26; top of the head 0.50 / 0.06; hair sides 0.36 and 0.64 / 0.16; beard/chin 0.50 / 0.42; big toes at 0.27 and 0.73 / 0.92. Eyes **closed**, mouth open snoring, no moustache, no beard decorations | The big friendly troll from Charlie Party (olive-green spotted skin, long shaggy dark-brown hair, a scruffy short brown beard, brown ragged loincloth, big bare feet), sitting asleep against a tree trunk, arms folded on his round belly, head tilted, mouth open snoring, front view, legs stretched towards the viewer with the soles of his big feet showing |
| `prop/pt-troll-awake` | 900×760, transparent | Same size, anchor and face/ear/toe positions as `pt-troll-asleep` (the pranks stay on). Used in the finale; the code bobs and sways it | The same troll, same sitting framing, eyes wide open and a huge belly-laugh with mouth wide open, arms flung up, tears of laughter |
| `prop/pt-basket` | 256×192, transparent | Anchor bottom-centre; drawn 150 px wide at each prank station; the code draws the item floating above it | A small woven wicker picnic basket with a gingham cloth, front view |
| `prop/pt-crayon` | 128×128, transparent | Anchor centre; drawn 70 px (carried overhead, station item) | A chunky dark-brown wax crayon with a paper wrapper, tilted |
| `prop/pt-moustache` | 256×128, transparent | Anchor centre at the moustache point; drawn 170 px wide (grows to 230 px for the second level) | A big curly hand-drawn cartoon moustache with twirly ends, dark brown, looking like crayon |
| `prop/pt-flower` | 128×128, transparent | Anchor centre; drawn 56 px, stuck in the troll's hair (several, tinted pink/yellow/blue by code) | A cheerful daisy-like flower with white petals and a yellow centre |
| `prop/pt-bow` | 160×128, transparent | Anchor centre; drawn 90 px on each ear | A big glossy pink ribbon bow with white polka dots |
| `prop/pt-party-hat` | 192×256, transparent | Anchor bottom-centre at the top of the head; drawn 120×160, slightly tilted | A striped cone party hat (pink, yellow, blue stripes) with a fluffy pompom and an elastic string |
| `prop/pt-feather` | 192×128, transparent | Anchor at the quill end; drawn 110 px, wiggling at his nose | A long fluffy rainbow tickle feather |
| `prop/pt-glitter` | 128×160, transparent | Anchor centre; drawn 60 px (station item / carried) | A small round shaker jar of rainbow glitter with a pink lid, sparkles |
| `prop/pt-polish` | 96×160, transparent | Anchor centre; drawn 50 px (station item / carried) | A tiny bottle of bubblegum-pink nail polish with a silver cap |
| `prop/pt-bush` | 320×300, transparent | Anchor bottom-centre on a frozen player; drawn about 1.2× the player's width. The code shows the player's eyes peeking through | A round leafy cartoon bush with a few little flowers on it, front view, with two small gaps in the leaves near the top |
| `prop/pt-mirror` | 192×256, transparent | Anchor centre; drawn 130 px, held up by the fairy in the finale | An oval hand mirror with a golden curly frame and a handle, the glass shining pale blue with a sparkle |

## New Molly Party game: opposite-ballet

### opposite-ballet — Opposite Ballet   (requested by the opposite-ballet agent, 2026-10-13, priority: nice-to-have)

The cheeky flip of Butterfly Ballet. Madame Papillon, the butterfly-fairy
ballet teacher, is VERY serious: she shows a move on a big picture card, then
a cheeky little imp pops up and flips the card round to the OPPOSITE move
(arms up ↔ plié down, step left ↔ step right, twirl ↔ stand still like a
statue), and that's what everyone does. Every correct opposite is a silly
flamboyant pose with butterflies and giggles, and Madame gets more and more
flustered (antennae droop, her tiara spins off, she stamps her foot, her tutu
sproings). Every few moves a golden "copy me for real!" card (golden sparkle,
the imp is shooed away) swaps back to normal. At the end Madame gives up,
laughs and does the silliest dance of all. Every key has a procedural
fallback that ships today; the code looks up every key with `art()`. House
style: navy `#24163f` outlines, soft cel shading, bright candy colours,
**no text**.

Reuses (keep alive): `bg/ballet-butterflies` (fallback background when
`bg/opposite-ballet` is missing), `prop/ballet-teacher`,
`prop/ballet-teacher-up`, `-twirl`, `-plie`, `-side`, `-bow`,
`prop/ballet-move-up`, `-twirl`, `-plie`, `-side`,
`prop/ballet-butterfly-pink`, `-blue`, `-yellow`, `-purple`,
`prop/ballet-petal`, and the shared wardrobe (`butterfly-wings`,
`fairy-wings`, `petal-wings`, `tiara`, `flower-crown`). Player poses used:
`dance-up`, `dance-down`, `dance-side`, `pose-twirl`, `balance`, `bow`,
`celebrate`, `cheer`, `dance`, `laugh`, `surprised`, plus the new pose below.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/opposite-ballet` | 1920×1080, opaque | Full screen, same layout as `bg/ballet-butterflies`: stage floor from y≈600 down (dancers at y≈760–1010), Madame at top centre (x 960, y 120–460), the move card to her right (x≈1300–1640, y≈130–470) and the control hint on the left (x≈300–580, y≈160–440): keep those calm. Top ~120 px calm for the HUD | The same magical flower ballet stage at golden hour, but topsy-turvy and cheeky: a few things upside down (a potted tulip hanging upside down from the vine arch, a ballet barre bent into a wiggle, a mirror on a stand that shows a rainbow), giant pale-pink flower stage floor, rose-and-vine arches left and right, lilac sky with clouds, fairy lights |
| `thumb/opposite-ballet` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | Madame Papillon the butterfly-fairy teacher (see `prop/ballet-teacher`) pointing her arms UP, looking flustered with her tiara spinning off, while a little pink garden fairy in a tutu does a deep silly plié DOWN with her tongue out and a cheeky grin; a tiny purple imp holds a big curly "flip" arrow between them; butterflies everywhere. No Charlie Party player characters. Subject centred |
| `prop/oballet-imp` | 256×256, transparent | The card-flipping imp. Anchor: centre. Drawn ~150 px tall peeking up from behind the move card's bottom-left corner, then hops over it; the code tilts, bounces and flips it horizontally | A tiny cheeky purple imp (friendly, round, big grin, little horns that are really just curls, a striped jester collar), one hand reaching up as if grabbing a card edge, the other hand covering a giggle. Cute, not scary |
| `prop/oballet-imp-shoo` | 256×256, transparent | Same anchor/size; shown when a golden card comes and the imp is shooed off | The same imp tumbling away backwards with a pouty "aww" face, little stars round its head |
| `prop/oballet-flip-arrow` | 256×256, transparent | Centred badge on the flipped card's corner (90–120 px), the code spins it | A chunky curved two-headed swirl arrow (like a U-turn loop), rainbow gradient, sparkly, navy outline |
| `prop/oballet-move-statue` | 256×256, transparent | Drawn centred inside the white move card (fitted to 240 px), like the reused `prop/ballet-move-*` pictograms | The same little pink ballerina silhouette (round head, bun) standing perfectly still like a statue: arms by her sides, feet together, a small pedestal under her feet, two tiny "still" lines either side |
| `prop/oballet-card-gold` | 360×360, transparent | The golden "copy me for real!" card frame, drawn 300×300 centred behind the pictogram (the code adds the sparkles) | A rounded square card with a shiny gold frame, cream centre (empty), little gold stars on the corners |
| `prop/oballet-teacher-statue` | 512×640, transparent | Same anchor and size as `prop/ballet-teacher` (bottom centre = her feet, drawn 330 px tall); shown while she demonstrates the new "statue" move | Madame Papillon frozen like an elegant garden statue: chin up, arms in a graceful low fifth, standing very straight on her toes, eyes closed, very proud |
| `prop/oballet-teacher-flustered` | 512×640, transparent | Same anchor/size; shown between moves once she is flustered | Madame Papillon flustered and pompous: antennae drooping, bun coming loose, cheeks pink, hands on hips, one foot stamping, tutu sproinging out, eyebrows up in exasperation (comic, not angry). No tiara (the code draws/spins it) |
| `prop/oballet-teacher-silly` | 512×640, transparent | Same anchor/size; finale (the code spins and bounces it) | Madame Papillon giving up and laughing: doing the silliest dance, one leg kicked up, arms flapping like a chicken, tongue out, wings flapping wildly, big belly laugh |
| `prop/oballet-tiara` | 128×96, transparent | Centred; sits on Madame's bun, pops off and spins as she gets flustered (drawn ~70 px wide) | A small sparkly gold ballet tiara with pink gems |

New player pose (for every playable incl. the garden fairies): `silly-pose`
| loop: no | fallback: `strike3`, `dance-star` | A flamboyant goofy ta-da: one leg
kicked up behind, arms flung wide, tongue poking out with a cheeky grin.

## New Molly Party game: whoopee-tea

### whoopee-tea — Whoopee Tea Party   (requested by the whoopee-tea agent, 2026-10-13, priority: nice-to-have)

The cheeky flip of Teddy Tea Party. The very posh Duchess Teddy (monocle,
pearls, enormous hat) is having a garden tea party, and her prim guests (a
poodle, a bunny, a fancy pig, a kitty) stroll in through the garden gates and
head for a chair (the chair glows in their colour and dotted pawprints lead
to it). Players grab whoopee cushions from a basket and sneak them onto
chairs before the guest sits: PFFFT! The guest gasps, their hat flies off,
the teacups and jelly on that table jump, then everybody collapses giggling.
A penguin butler patrols and politely confiscates any cushion he catches you
carrying (you just grab another). A spring toy frog can be hidden in a
table's sugar bowl. The finale is a giant golden super-whoopee that everyone
pushes onto the Duchess's throne: a huge slow-motion PFFFT, and she laughs so
hard her hat flies to the moon. Every key has a procedural fallback that
ships today; the code looks up every key with `art()`. House style: navy
`#24163f` outlines, soft cel shading, bright candy colours, **no text**. No
Charlie Party player characters anywhere (the guests, the Duchess and the
butler are new characters).

Reuses: nothing from `tea-party` (its art keys can move to history as
dropped). Player poses used: `idle`, `walk`, `run`, `carry`, `catch`,
`action`, `push`, `surprised`, `giggle`, `laugh`, `cheer`, `celebrate`,
`clap`, plus the new pose below.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/whoopee-tea` | 1920×1080, opaque | Full screen. A tall garden hedge runs across the back (top of the lawn at y≈330) with an arched garden gate in it at the left (x≈170) and the right (x≈1750) where guests walk in. Lawn from y≈330 to the bottom (players run on y 380–1040). The code draws the tea tables, chairs, the throne at the top centre (x 960, y≈430), the cushion baskets and everyone. Top ~110 px calm for the HUD | A posh storybook garden tea party lawn: neatly clipped tall green hedge with two white arched garden gates, a striped pastel bunting garland, topiary balls in pots, rose bushes, a smooth striped mowed lawn, soft blue sky with a couple of clouds peeping over the hedge. No tables, chairs or characters |
| `thumb/whoopee-tea` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A very posh teddy bear Duchess with a monocle, pearls and a giant flowery hat just sat on a pink whoopee cushion: a huge comic puff cloud, her monocle popping out, hat flying up, teacups jumping off the table, a little garden fairy behind the chair giggling with a hand over her mouth. Subject centred |
| `prop/whoopee-cushion` | 192×144, transparent | Centred; drawn ~110×80 on a chair seat, carried overhead, in the basket. Code squashes it | A classic cartoon whoopee cushion: round pink rubber bladder with a little nozzle at the front, a shiny highlight, slightly puffy |
| `prop/whoopee-cushion-flat` | 192×144, transparent | Same anchor; shown for a moment after it goes off | The same cushion completely flattened and wrinkly after use |
| `prop/whoopee-golden` | 480×320, transparent | Centred, the giant golden super-whoopee, drawn ~300×200; the code adds sparkles and a squash | A giant shiny GOLD whoopee cushion with sparkles and a little gold bow on the nozzle |
| `prop/whoopee-basket` | 320×240, transparent | Bottom-anchored on the lawn (bottom centre at the basket's feet), drawn 220×165 | A wicker picnic basket overflowing with pink and lilac whoopee cushions |
| `prop/whoopee-table` | 320×280, transparent | Small round garden tea table, bottom-anchored (bottom centre = its feet), drawn 230×200. The code draws the jelly and sugar bowl on the top surface (≈62% up from the bottom) | A small round tea table with a white lace tablecloth, a rose-pattern teapot and two teacups with saucers |
| `prop/whoopee-chair` | 220×300, transparent | A garden chair seen 3/4 from the front, bottom-anchored, drawn 140×190. The seat is ≈42% up from the bottom (the code places the cushion and the sitter there) | A dainty white wrought-iron garden chair with a curly heart-shaped back and a pale sky-blue seat pad (NOT pink, so the pink whoopee cushion stands out on it) |
| `prop/whoopee-throne` | 360×440, transparent | The Duchess's chair at the top centre, bottom-anchored at (960, 430), drawn 230×280; seat ≈40% up from the bottom | A grand pink-velvet high-backed armchair with gold frame, a crown on top of the back, tassels |
| `prop/whoopee-guest-poodle`, `prop/whoopee-guest-bunny`, `prop/whoopee-guest-pig`, `prop/whoopee-guest-kitty` | 320×420 each, transparent | Full body standing, front-facing (bottom centre = feet), drawn ~200 px tall; the code bobs and flips it for walking. **No hat** (drawn separately) | Prim and proper party guests, a little pompous and very lovable: a pink poodle with a pom-pom hairdo and pearls; a white bunny with a lace collar and a parasol; a round pink pig in a frilly dress, nose in the air; a fluffy white kitty with a big blue bow, holding a teacup with pinkie out |
| `prop/whoopee-guest-<kind>-sit` (poodle, bunny, pig, kitty) | 320×420 each, transparent | Same size; drawn sitting on a chair seat (bottom centre = their bottom on the seat) | The same four guests sitting very primly, legs together, sipping tea, eyes closed in a posh way. No hat |
| `prop/whoopee-guest-<kind>-gasp` (poodle, bunny, pig, kitty) | 320×420 each, transparent | Same framing as `-sit`; shown the instant the cushion goes off | The same guests jolted upright, eyes huge, mouth an "O" of shock, ears/fur sticking straight up, cheeks blushing. No hat |
| `prop/whoopee-guest-<kind>-laugh` (poodle, bunny, pig, kitty) | 320×420 each, transparent | Same framing; shown after the gasp | The same guests collapsing with laughter: eyes squeezed shut, holding their tummies, tears of laughter. No hat |
| `prop/whoopee-hat-<kind>` (poodle, bunny, pig, kitty) | 160×120 each, transparent | Centred; sits on the guest's head and flies off spinning when the cushion goes off (drawn ~90 px) | Each guest's hat on its own: tiny feathered pink hat; straw bonnet with ribbons; flowery wide hat; blue pillbox hat |
| `prop/whoopee-duchess` | 360×460, transparent | The Duchess walking in (bottom centre = feet, drawn ~250 px tall) | Duchess Teddy: a plump honey-brown teddy bear in a lavender ball gown, long pearl necklace, a monocle on a gold chain, nose in the air, very grand and pompous but lovable, front view. **No hat** (drawn separately) |
| `prop/whoopee-duchess-sit`, `prop/whoopee-duchess-gasp`, `prop/whoopee-duchess-laugh` | 360×460 each, transparent | Same framing, sitting on the throne (bottom centre = her bottom on the seat) | The Duchess sitting regally; the same jolted upright with her monocle popping out and mouth wide open; the same rocking back in a huge belly laugh, eyes shut, tears of joy. No hat |
| `prop/whoopee-duchess-hat` | 320×200, transparent | Centred; drawn ~200 px wide on her head, then rockets to the moon spinning | An enormous lilac Sunday hat piled with roses, feathers and ribbons |
| `prop/whoopee-butler` | 280×420, transparent | The penguin butler, bottom centre = feet, drawn ~210 px tall, side view facing right (the code flips him) | A very proper penguin butler in a tail-coat and white gloves, a bow tie, holding a silver tray with a teapot high on one flipper, beak in the air |
| `prop/whoopee-butler-ahem` | 280×420, transparent | Same framing; shown when he has spotted someone carrying a cushion | The same penguin butler leaning forward with one eyebrow raised, flipper up as if about to clear his throat, comic and polite (no text) |
| `prop/whoopee-frog` | 160×160, transparent | Centred, drawn ~90 px; carried overhead, then springs out of a sugar bowl | A green wind-up toy frog on a big silly spring, googly eyes, wide grin |
| `prop/whoopee-sugarbowl` | 128×112, transparent | Centred on a tea table top, drawn ~64 px; its lid jumps when the frog springs out | A little white porcelain sugar bowl with pink roses and a lid |
| `prop/whoopee-jelly` | 128×128, transparent | Bottom-anchored on a tea table, drawn ~70 px; the code wobbles and hops it | A shiny wobbly strawberry jelly on a plate with a cherry on top |
| `prop/whoopee-moon` | 256×256, transparent | Top-right of the screen in the finale (centred ~(1620, 240), drawn 200 px) with the Duchess's hat landing on it | A big smiling crescent moon with rosy cheeks, laughing, sparkles around it |

New player pose (for every playable incl. the garden fairies): `tiptoe` |
loop: yes | fallback: `carry`, `walk` | Sneaking on tiptoe, hunched, holding
something hidden overhead, cheeky sideways grin.

## New Molly Party game: muddy-mayhem

### muddy-mayhem — Muddy Mayhem   (requested by the muddy-mayhem agent, 2026-10-13, priority: nice-to-have)

Replaces Puppy Splash. Laundry day in the backyard: Granny Goose has hung
sparkling white sheets and set out her clean things. Players run through mud
puddles to get muddier, then press A next to the sheets, the fancy rug, the
washing basket or the white picket fence to shake and SPLAT mud all over
them; a pack of cheeky muddy puppies follows the muddiest player and adds
their own splats. Granny Goose patrols with a hose (a big "!" first) and
sprays muddy players clean again (giggles, no penalty). Surprise: a giant mud
puddle bubbles up in the middle and erupts. Finale: Granny slips into the
big puddle, sits up covered in mud and laughs. Every key has a procedural
fallback that ships today; the code already looks up every key. House style:
navy `#24163f` outlines, soft cel shading, bright candy colours, **no text**.
**Mud splats are drawn by the code on top of the clean props, so every prop
is drawn spotless white/clean.** Granny Goose is a new character (not a
Charlie Party player character).

**Reuses (keep alive):** `bg/puppy-splash` (fallback when
`bg/muddy-mayhem` is missing), `prop/puppy-1` … `prop/puppy-4`,
`prop/mud-puddle`.

**Layout (the bg must match):** same as Puppy Splash: house wall from y=0 to
≈170, a wooden porch deck band from y≈170 to ≈330, lawn below. The code
draws the washing line (posts at x≈230 and x≈1690, line at y≈330, four
sheets hanging to y≈540), the puddles, the rug, the basket and the fence as
props. Keep the lawn plain (few flowers) and the top 110 px calm (HUD chips +
timer).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/muddy-mayhem` | 1920×1080, opaque | Full screen. House wall 0–170, porch deck 170–330, lawn below; low detail on the lawn (no washing line, no puddles, no props: the code draws them) | A sunny cartoon backyard on laundry day from a high three-quarter view: the bottom of a cosy cream cottage with lace-curtained windows and a duck-egg-blue door across the top, a honey-wood porch deck along its whole width with a pot of geraniums at each end, then a bright green lawn with a few daisies, flower beds in the far corners. No characters, no animals |
| `thumb/muddy-mayhem` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A cheeky muddy puppy mid-shake flinging big brown mud splats onto a sparkling white sheet on a washing line, more mud splats on the sheet, a prim white goose granny in a frilly apron and pink hair curlers gasping in the background with a garden hose; sunny backyard. No Charlie Party characters. Subject centred |
| `prop/mm-granny` | 400×520, transparent | Granny Goose walking with her hose. Anchor: bottom centre = her feet; drawn ~230 px tall, side view facing right, mirrored for left; the code adds the waddle bob | Granny Goose: a plump, prim, lovable white goose standing upright, orange beak and feet, a frilly lavender apron with a pocket, pink hair curlers on her head under a little hairnet, small round spectacles, a strand of pearls; holding a green garden-hose nozzle in one wing. Proud, a bit pompous, kind eyes |
| `prop/mm-granny-spray` | 400×520, transparent | Same anchor/size; shown while she sprays (the code draws the water stream from the nozzle, which should be at the right edge, about 55% of the way up) | The same goose, leaning forward, both wings gripping the hose nozzle pointed to the right, determined squint, curlers bouncing |
| `prop/mm-granny-gasp` | 400×520, transparent | Same anchor/size; shown for a moment when something near her gets splatted, and during her "!" before spraying | The same goose gasping in horror: wings thrown up, beak wide open, spectacles askew, one curler popping off |
| `prop/mm-granny-muddy` | 480×420, transparent | Finale. Anchor: bottom centre; drawn ~220 px tall sitting in the big puddle (the code draws the puddle under her) | The same goose sitting in mud, covered in brown mud splotches from head to toe, curlers drooping, laughing her head off with eyes squeezed shut and wings up |
| `prop/mm-sheet` | 300×300, transparent | One white bedsheet hanging from the line by two pegs. Anchor: top centre = the line; drawn 230 px wide × ~210 px tall; the code sways it and draws mud splats over it | A sparkling clean white bedsheet hanging from a washing line (line not included) with two wooden clothes pegs at the top corners, soft folds |
| `prop/mm-rug` | 420×220, transparent | Flat on the lawn, centred, drawn 330 px wide | A fancy cream-white rug with a tasselled fringe and a pale-pink rose border, lying flat on the grass, seen from a high angle |
| `prop/mm-basket` | 260×220, transparent | Bottom-centre anchor, drawn 180 px wide | A wicker laundry basket piled high with neatly folded white towels and a frilly white pillowcase on top |
| `prop/mm-fence` | 420×220, transparent | Bottom-centre anchor, drawn 300 px wide | A short section of freshly painted white picket fence (five pickets with pointed tops), standing on the grass |
| `prop/mm-mega-puddle` | 640×300, transparent | Centred at (960, 748), drawn up to 450 px wide (the code scales it up while it bubbles) | A huge glossy chocolate-brown mud puddle with big bubbles and ripples, seen from a high angle |
| `prop/mm-splat` | 160×160, transparent | Centred, drawn 40–110 px wide and rotated by the code; drawn on the sheets, rug, basket and fence | A single wet brown mud splat with a few round droplets around it, glossy highlight |

Player poses used: `run`, `walk`, `idle`, `shake` (the mud shake, A),
`surprised`, `laugh`, `cheer`, `celebrate`, `throw` (finale mud fight).
No new poses needed.

## New Molly Party game: sneaky-dance

### sneaky-dance — Sneaky Dance   (requested by the sneaky-dance agent, 2026-10-13, priority: nice-to-have)

Replaces Dance & Freeze. Professor Hoot is napping in his armchair in the
library ("Shhh!"). While he snores, everyone dances as wildly as they can
around the library rug (the stick moves and wiggles, A is a jump-spin) and
earns stars; a shared party meter fills and things escalate: books fly off
the shelves, the lamp starts dancing, a disco ball comes down. When Hoot
stirs (snore stops, one eye slowly pops open, a big "?"), everyone FREEZES
and pretends to be reading a book, a lamp or a statue. Anyone still moving
gets a pompous "Hmm?!" stare and drops a couple of bouncy stars they can grab
again. Finale: Hoot wakes fully, puts on sunglasses and joins the dance
party. Every key has a procedural fallback that ships today; the code
already looks up every key. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text**. Professor Hoot is the Charlie
Party NPC (brown owl, purple star wizard hat, round gold glasses, blue robe
with stars and moons; match `assets/sprites/professor-hoot`).

**Reuses (keep alive):** `prop/df-disco-ball` (the descending disco ball).

**Layout (the bg must match):** a library seen from the front. Back wall
with tall bookshelves from y=0 to ≈560; Hoot's armchair stands at the top
centre (x 960, seat ≈y 520, chair bottom y≈612, ~420 px wide; the code
draws the chair); a reading lamp prop at x≈1440; the dancers move over a big
round rug on the wooden floor from y≈610 to the bottom (they stand at
y 680–1030). Keep the top 110 px calm (HUD chips + timer), the area to the
upper right of the chair (x 1050–1250, y 120–290) calm for the "Zzz"/"?"
bubble, and x 1760–1840, y 90–460 calm for the party meter. The disco ball
comes down at x≈520.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/sneaky-dance` | 1920×1080, opaque | Full screen, layout above. No chair, no lamp, no owl, no books in the air (all drawn by the code) | A cosy old library at night from the front: tall dark-wood bookshelves stuffed with colourful books across the back wall, a rolling ladder, a round window with a crescent moon, warm candle-coloured light, a big round plum-and-gold patterned rug on a honey wooden floor in the foreground, potted fern in a corner. Calm and cosy, nothing spooky |
| `thumb/sneaky-dance` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | Professor Hoot the owl asleep in a big red wingback armchair with a book on his tummy and "Zzz" bubbles (no letters: just bubbles), while in front of him a little garden fairy and a puppy dance wildly on tiptoe with music notes, a dancing lamp and flying books around them; cosy night library. No Charlie Party player characters. Subject centred |
| `prop/sd-armchair` | 560×520, transparent | Bottom-centre anchor at (960, 612), drawn 420 px wide; Hoot is drawn sitting in it | A big plush red-velvet wingback armchair with gold buttons and tassels, front view, empty, a small patchwork cushion |
| `prop/sd-hoot-sleep` | 420×460, transparent | Hoot sitting asleep in the chair. Bottom-centre anchor = his seat on the cushion (960, 520); drawn ~360 px tall; the code adds breathing squash, "Zzz" and nods | Professor Hoot sitting slumped and fast asleep: eyes shut as happy curved lines, wizard hat tipped over one eye, glasses slipped down his beak, an open book lying on his round tummy, wings folded, a little drool-free smile |
| `prop/sd-hoot-peek` | 420×460, transparent | Same anchor/size; shown while he stirs (the code also shows a big "?") | The same owl, still slumped, with ONE eye popped wide open (big round suspicious eye) and the other still shut, one eyebrow feather raised |
| `prop/sd-hoot-stare` | 420×460, transparent | Same anchor/size; the look: both eyes wide, used for the "Hmm?!" stare at wigglers | The same owl sitting up straight, both eyes huge and narrowed in a pompous suspicious stare, one wing pointing forward, beak pursed, glasses pushed up |
| `prop/sd-hoot-yawn` | 420×460, transparent | Same anchor/size; the fake-out (he yawns and dozes off again) | The same owl stretching both wings up in an enormous yawn, beak wide open, eyes squeezed shut |
| `prop/sd-hoot-party` | 420×520, transparent | Finale. Bottom-centre anchor = his feet standing on the chair seat; drawn ~400 px tall; the code bounces and sways him | The same owl standing up on the chair dancing: cool pink star-shaped sunglasses, wizard hat jauntily tilted, one wing pointing up disco-style, the other on his hip, robe swirling, huge grin |
| `prop/sd-lamp` | 220×440, transparent | Bottom-centre anchor at (1440, 640), drawn 300 px tall; the code makes it hop, sway and squash when it "dances" | A tall brass reading lamp with a frilly pink fringed lampshade, a cute little face on the shade (two dot eyes and a smile), curved neck, round base |
| `prop/sd-book-1`, `prop/sd-book-2`, `prop/sd-book-3` | 160×120 each, transparent | Flying books: centred, drawn ~80 px wide, the code flaps them open and shut | An open hardback book flapping like a bird, pages fanned: red with gold corners; teal with a star; purple with a moon |
| `prop/sd-disguise-book` | 200×160, transparent | Held in front of a frozen player's face (centred at the eyes anchor), drawn ~90 px wide | An open storybook held up, seen from the front cover side: bright yellow cover with a simple duck picture, a little crooked |
| `prop/sd-lampshade` | 180×150, transparent | Worn on a frozen player's head (bottom centre at the head anchor), drawn ~100 px wide | A pink pleated lampshade with a fringe, worn like a hat, slightly tilted |
| `prop/sd-sunglasses` | 200×80, transparent | Finale: Hoot's sunglasses (and on dancers' faces at the eyes anchor), drawn ~110 px wide | Cool pink star-shaped party sunglasses with dark lenses and a shine streak |

Player poses used: `walk`, `run`, `idle`, `dance`, `dance-up`,
`dance-down`, `dance-side`, `dance-star`, `pose-twirl`, `strike3`,
`balance`, `surprised`, `cheer`, `celebrate`, `laugh` (fallbacks all
existing). No new poses needed.
