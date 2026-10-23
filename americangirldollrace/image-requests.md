# American Girl Doll Race: image requests

**New queued round:** [Marisol refresh — approved lower-hairline canonical](image-requests-marisol.md). Use that brief for all new Marisol sprites; its approved canonical overrides the old sprite-sheet identity guidance below.


This brief is for whoever makes art for the race (a person or an image agent).
It lists the images needed for two new screens:

1. **A title screen.** Today the game opens straight onto the character menu.
2. **A redesigned join and character-select screen.** It should be controller
   first, with up to 8 players who can drop in at any time.

It also covers the small set of images that dropping in mid-race needs.

3. **Track themes (§5).** Each track gets its own hurdle, power-up skins and
   thrown "snowball", and there are nine new race tracks.

**Nothing here is required for the game to run.** The game keeps working with
the current art, and each new image replaces a CSS or canvas fallback for that
one element. Ship in the priority order below; partial work is fine.

All paths are relative to `americangirldollrace/`.

---

## 1. House rules for every image

| Rule | Detail |
| --- | --- |
| Format | WebP. Use lossless alpha for anything with transparency. Convert with Pillow (`quality=82-90, method=6`). Never commit large PNGs (see repo `CLAUDE.md`). |
| Location | `assets/ui/` for title and select art, and `assets/portraits/` for the per-doll art. Use lowercase snake_case names. |
| Style | Match the existing art: bright, soft-painted storybook scenery (see `assets/background_*.webp`) and the photoreal-toy look of the doll sprites (`assets/doll_*_sprites.webp`). The dolls must look like **these exact dolls**, so always use the doll's sprite sheet as the identity reference. Keep the same hair, outfit, shoes and accessories. |
| Canvas | The game renders at a height of 720 and a variable width (minimum 640 wide, typically 1280 at 16:9, up to about 1700 on ultrawide). Full-screen art must have a **safe centre of 1280×720**, with extra bleed out to 2172 wide (the same width as the current backgrounds). |
| Audience | A 2nd-grader and her friends on a TV with Xbox controllers. Prefer big, readable shapes and names. Avoid fine text baked into images. The game draws all text itself, except the logo. |
| Transparency | Sprites, portraits, badges and frames need clean alpha with no white halos. Check them on dark and light backgrounds. |
| Track monsters | A new monster sheet is registered by adding its entry to `monsters.js` (size, grab hands, sounds, defeat effect) and setting `monster` on its track in `tracks.js`; this replaces the older "add it to `TRACK_SHARED_ART`" step in §9, §14 and §16. |

### Roster (the identity references)

| Key | Name | Colour used in game | Sprite sheet |
| --- | --- | --- | --- |
| `whirlpool` | Whirlpool | `#5a3a86` | `assets/doll_whirlpool_sprites.webp` |
| `juliette` | Juliette | `#c58a28` | `assets/doll_juliette_sprites.webp` |
| `claudia` | Claudia | `#25897f` | `assets/doll_claudia_sprites.webp` |
| `kaya` | Kaya | `#9a6426` | `assets/doll_kaya_sprites.webp` |
| `lily` | Lily | `#d33b2f` | `assets/doll_lily_sprites.webp` |
| `marisol` | Marisol | `#f25ca5` | `assets/doll_marisol_sprites.webp` |
| `amanda` | Amanda | `#263d8f` | `assets/doll_amanda_sprites.webp` |
| `rumi` | Rumi | `#7b3bb8` | `assets/doll_rumi_sprites.webp` |
| `penelope` | Penelope (hidden; unlocked by the "All dolls" special) | `#8f4f6f` | `assets/doll_penelope_sprites.webp` |

Each doll sheet is 3 columns × 4 rows of 418×418 frames. Row 0 is idle, row 1
is run, row 2 is jump, and row 3 is push/fall. There is no wave, cheer or
riding pose yet, and no close-up face. Most of the requests below fill those
gaps.

The mounts (`horse`, `unicorn`, `pegasus`) are 3×3 sheets of 418 frames.

---

## 2. The two screens these images serve

The images only make sense against the layouts, so here they are in brief.

### 2.1 Title screen (new)

- Full-bleed animated key art: the dolls galloping left to right on a horse, a
  unicorn and a pegasus, with parallax clouds behind them.
- The **logo** sits upper centre. It replaces today's plain "American Girl Doll
  Race" heading and the duplicate heading in the HUD bar.
- A pulsing **"Press Ⓐ to start"** prompt sits near the bottom, with "Tap to
  start" on touch devices. The game draws the text; the art supplies the
  button glyph.
- Any button on any controller, any key, or a tap goes to the select screen.
  That press also joins the player who made it.

### 2.2 Join and character-select screen (redesign)

Today's screen is two native `<select>` dropdowns over a cluttered strip of
overlapping dolls, with the player count hidden in Settings. The redesign
works like a fighting-game or kart-game select screen:

```
┌──────────────────────────────────────────────────────────────┐
│ [logo, small]                  [◀ track card: Farm ▶]   [⚙]  │
│                                                              │
│        ┌────┐┌────┐┌────┐┌────┐┌────┐                        │
│        │Lily││Rumi││Kaya││Aman││Juli│   roster grid of       │
│        └────┘└────┘└────┘└────┘└────┘   portrait cards; each │
│        ┌────┐┌────┐┌────┐┌────┐┌────┐   player's coloured    │
│        │Clau││Whir││Mari││Pene││ ?  │   cursor badge (P1–P8) │
│        └────┘└────┘└────┘└────┘└────┘   sits on a card       │
│                                                              │
│  ┌P1──┐ ┌P2──┐ ┌P3──┐ ┌P4──┐ ┌P5──┐ ┌P6──┐ ┌P7──┐ ┌P8──┐      │
│  │doll│ │doll│ │ Ⓐ  │ │ Ⓐ  │ │ Ⓐ  │ │ Ⓐ  │ │ Ⓐ  │ │ Ⓐ  │      │
│  │pose│ │RDY!│ │join│ │join│ │join│ │join│ │join│ │join│      │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘      │
│     8 player slots on pedestals        Hold Ⓐ to race!       │
└──────────────────────────────────────────────────────────────┘
```

- **Joining.** Each empty slot shows "Press Ⓐ to join". Pressing any button on
  an unassigned controller claims the next free slot and gives that player a
  coloured cursor on the roster grid.
- **Picking.** Moving the cursor previews the doll full-body on that player's
  pedestal. Pressing Ⓐ locks her in with a cheer pose, a confetti burst and a
  "READY!" ribbon. Pressing Ⓑ unlocks her, and pressing Ⓑ again leaves the slot.
- **Computer racers.** Pressing Ⓨ on an empty slot adds a computer racer, and
  pressing it again removes the racer. This replaces the nine "N Players + M AI"
  modes in Settings.
- **Track.** Pressing LB or RB cycles the track card (Farm, Fairy, Village,
  Winter or Castles). This brings back the background picker that is hidden
  today.
- **Starting.** When every joined player is ready, a "Hold Ⓐ to race!" meter
  fills, so one child can't start the race before the others have chosen.
- **The "?" card** picks a random doll.
- **Duplicates.** More than one player may pick the same doll. Their cursor
  badges stack on the card.
- **Touch and mouse.** Tapping a portrait assigns it to P1, as the menu does
  now. A "+" on an empty slot adds another touch or keyboard player.

### 2.3 Mid-race drop-in

When a new controller presses a button during a race, a compact picker slides
up inside that player's split-screen pane, or in a corner if they share a
view. It has one row of portraits and their slot badge. After the player picks,
they spawn near the back of the pack with a short "Here comes P5!" banner.

---

## 3. Requests, in priority order

Sizes are final pixel sizes. The game scales art down but never up.

### P1: needed for the select-screen redesign to look right

| # | File | Size | What |
| --- | --- | --- | --- |
| 1 | `assets/portraits/<key>.webp` ×9 | 320×400, alpha | **Roster card portrait.** Show each doll from the waist up, facing about three-quarters toward the viewer and smiling. The head should fill the top 55% of the frame. Use a transparent background; the game draws the card frame and the colour behind it. Make one for every doll in §1, including Penelope. |
| 2 | `assets/portraits/<key>_cheer.webp` ×9 | 418×418, alpha | **"Ready!" pose.** Show the full body with both arms up or a joyful jump, in the **same frame size, scale and foot baseline as the sprite sheets**. The game swaps it onto the pedestal in place of an idle frame, so feet must land where they land in row 0. |
| 3 | `assets/portraits/<key>_wave.webp` ×9 | 418×418, alpha | **Hover or preview pose.** Show the full body with a friendly wave, using the same framing contract as #2. It plays while a cursor sits on that doll. If time is short, skip this one; the game can fall back to idle frames. |
| 4 | `assets/ui/player_badges.webp` | 8 cells × 128×128, one row, alpha | **Cursor and slot badges P1–P8**: a rosette or horseshoe shape in eight distinct, colour-blind-safe colours, each with a large numeral. These colours become the player colours everywhere (cursor, slot frame and in-race name tags), so pick them to read clearly against the farm, winter and castle backgrounds. Suggested order: red, blue, yellow, green, purple, orange, teal and pink. |
| 5 | `assets/ui/slot_pedestal.webp` | 220×90, alpha | A round wooden or stone show-ring pedestal, seen slightly from above. Each joined player's doll stands on one. Keep it neutral so it can be tinted with the player colour. |
| 6 | `assets/ui/slot_empty.webp` | 220×300, alpha | An empty player slot: a dashed or soft-glow silhouette of a doll with a gentle stable-door frame. The game overlays "Press Ⓐ to join" and the slot number. |
| 7 | `assets/ui/ready_ribbon.webp` | 240×90, alpha | A blue-ribbon or prize-rosette banner for "READY!". The game writes the word itself, so keep the centre plain. |
| 8 | `assets/ui/button_glyphs.webp` | 6 cells × 96×96, alpha | Controller button glyphs for Ⓐ (green), Ⓑ (red), Ⓧ (blue), Ⓨ (yellow), LB and RB, in a friendly rounded style. They are used in every prompt on both screens. |
| 9 | `assets/ui/select_background.webp` | 2172×724, opaque | **The select-screen backdrop.** Show the inside of a cosy, sunlit stable or tack room. The lower third has a row of stall doors or show-ring space where the 8 slots sit, and the upper middle area is calm and uncluttered for the roster grid. Keep it a little softer and lower-contrast than the race backgrounds so that portraits and badges stand out. |

### P2: the title screen

| # | File | Size | What |
| --- | --- | --- | --- |
| 10 | `assets/ui/logo.webp` | 1100×420, alpha | **The "American Girl Doll Race" wordmark.** Make it playful and storybook, with a horseshoe or ribbon motif and maybe a small galloping horse or a hurdle worked in. It must read at 50% size on the select screen and on a phone. This is the only image with baked-in text. |
| 11 | `assets/ui/title_sky.webp` | 2172×724, opaque | The title backdrop's far layer: a sunrise sky, distant rolling hills and a castle on a far hill, which nods to the five tracks. |
| 12 | `assets/ui/title_hills.webp` | 2172×400, alpha | The mid layer: a meadow, white picket hurdles and fence posts. It tiles horizontally so it can scroll for parallax. Its left and right edges must match. |
| 13 | `assets/ui/title_clouds.webp` | 2172×300, alpha | Soft clouds that tile horizontally, for a slow parallax drift. |
| 14 | `assets/ui/title_hero.webp` | 1600×640, alpha | **Hero group shot**: Whirlpool on a horse, Juliette on a unicorn and Claudia on a pegasus mid-gallop, with Lily, Rumi and Kaya running alongside them, all heading right. Use the existing mount sprite sheets as references for the mounts. The game slides it in and gently bobs it over the parallax layers. If one composite is hard, provide each rider as a separate alpha cut-out instead (`title_hero_<key>.webp`). |
| 15 | `assets/ui/press_start_plate.webp` | 640×110, alpha | A wooden sign or ribbon plate behind the "Press Ⓐ to start" prompt, with a plain centre. |

### P3: nice to have (select-screen extras and drop-in)

| # | File | Size | What |
| --- | --- | --- | --- |
| 16 | `assets/ui/track_cards.webp` | 5 cells × 400×225, opaque | Track thumbnails for Farm, Fairy, Village, Winter and Castles. Make each a painted vignette of that background with a hurdle in the foreground, rather than a crop. |
| 17 | `assets/ui/random_card.webp` | 320×400, alpha | The "?" roster card: a doll silhouette under a sparkly question mark. |
| 18 | `assets/ui/ai_badge.webp` | 128×128, alpha | The badge for a computer racer's slot: a friendly robot horse head or a toy wind-up key. |
| 19 | `assets/ui/difficulty_icons.webp` | 4 cells × 160×160, alpha | No Monsters (a sleeping monster), Normal (one monster), Extra (two monsters) and Too Many (a monster pile-up). Base them on `assets/monster_sprites.webp` so they read as the same troll. |
| 20 | `assets/ui/specials_icons.webp` | 6 cells × 160×160, alpha | None, All Unicorns, All Pegasi, All Dolls, Horsing Around and Amanda Mode. For the last one, show Amanda's face with a crown. |
| 21 | `assets/ui/join_toast.webp` | 520×120, alpha | A banner shape for "Here comes P5!" when a player drops in mid-race. The game writes the text, and the slot colour tints it. |
| 22 | `assets/ui/confetti.webp` | 6 cells × 64×64, alpha | Confetti and ribbon pieces for the lock-in burst and the title screen. The game handles the motion. |

### P4: optional, but would make the select screen sing

| # | File | Size | What |
| --- | --- | --- | --- |
| 23 | `assets/portraits/<key>_ride.webp` ×9 | 418×418, alpha | Each doll **seated in a riding pose**: legs astride, hands forward on reins, and no mount drawn. Today the race draws the idle frame on top of the mount. A true riding pose would fix the stiff look and make the seat offsets in `game.js` easier to set. Add a 1-px magenta dot on a separate guide layer, or note in the commit message where the seat (the crotch point) is, so offsets can be measured. |
| 24 | `assets/ui/mount_tokens.webp` | 3 cells × 160×160, alpha | Horse, unicorn and pegasus head tokens. They could become a per-player mount preference on the select screen later. |

---

## 4. Acceptance checklist (per image)

- [ ] The image is a WebP of the size above, with clean alpha where needed.
- [ ] Each doll matches her sprite sheet (hair, outfit, shoes and accessories),
      checked side by side with frame row 0.
- [ ] **The same clothes in every pose.** Across all of a doll's sheets
      (sprites, toys, actions, portraits), every frame shows the same outfit,
      shoes, socks and accessories (bag, glasses, hat, hair clips), in the same
      places. The only change allowed is the item the pose is for: skates
      replace her shoes, and a pogo stick, wand or surfboard is added. An
      accessory she wears in a pose on her sprite sheet appears in the
      matching pose on every other sheet. Never let it come and go between frames.
- [ ] Full-body poses (#2, #3 and #23) share the sprite sheets' 418 frame,
      scale and foot baseline. To check, overlay one on a row-0 frame and make
      sure the feet line up.
- [ ] Nothing important sits outside the 1280×720 safe centre of full-screen
      art.
- [ ] Badges and glyphs stay legible at 50% size.
- [ ] Commit per batch with a message listing the files. If any CSS or JS
      changes, run `node americangirldollrace/tools/stamp/stamp.mjs`.

---

## 5. Track themes: hurdles, power-ups and new tracks

> **Status (2026-10-21):** delivered and checked in game: every §5.4 row (all
> five original tracks), T1-T10 (all files), the §5.6 mounts (now pickups on
> Farm, Winter, Toy Room and Night Festival) and both §6 sheets.
> Fairy Woods includes a repaired direct-repeat background, calibrated track
> edge, straight-on log hurdle, five-cell pickup strip, acorn and picker card.
> The seven liquid-only puddle redos R1–R7 are delivered and checked under
> a standing doll; the other 28 atlas cells are pixel-identical.
> Beach's R8 jump cell is now a pool-ring spring, with its new POOL SPRING label.
> The §8 riding toys are in for fourteen dolls; K3 (trial falls) and the
> §8.1 icons R10, R12–R14 are delivered.
> **Current art queue:** §27 FW2 twilight re-render of the fairy wings (new files beside FW1). SW2, MB2, the first wings, TF1 and all fifteen dolls' ledge sheets are delivered, in the game and checked.
> Delivered: Hermione/Lily/Mira action trial, all §10.2 shared sprites and both
> §9 monsters; retained sources, calibration and in-game reviews accompany them.

Every track uses the same white picket hurdle and the same power-up icons
today. These requests give each track its own look. **Only the art changes.**
A themed jump spring still gives a high jump, and a themed oil puddle still
makes you slip.

### 5.1 How the game picks the art up

- Put each file in `assets/tracks/<track key>/<file>.webp`.
- In the same commit, add the file's name to that track's `art` list in
  `tracks.js`. The game loads only listed files. Anything not listed falls
  back to today's look, so tracks can be delivered one file at a time.
- A **new** track joins the race rotation (and the track picker) as soon as
  its `background` is listed.
- After changing `tracks.js`, run `node americangirldollrace/tools/stamp/stamp.mjs`.
- `tracks.js` also holds each track's power-up names (shown in the pop-up
  text once its power-up art is in) and its mount odds. Edit those freely.

### 5.2 File specs (the same for every track)

| File | Size | What |
| --- | --- | --- |
| `background.webp` | 2172×724, opaque | **New tracks only.** The race backdrop, in the same painted storybook style and layout as `assets/background_farm.webp`: sky and scenery on top, a fence or border along the back, and a plain dirt (or sand, snow-packed, carpet…) **path from y≈535 down to the bottom edge**. This is the farm's top edge, carried all the way to the bottom so the racers get a wide band (see 5.3). Nothing stands on the path. The game mirrors every other copy to scroll forever, so **no words or numbers anywhere**, and nothing that looks wrong flipped. Keep the top corners calm (the HUD cards sit there) and the important things in the 1280-wide centre. |
| `hurdle.webp` | 160×170, alpha | The fence racers jump. It is drawn at **64×68**, the same size as today's picket, so use bold, simple shapes that read at 40% size. Its **base sits on the bottom edge** and it fills about 150 px of the width. It must look jumpable: no taller than it is wide, and no spikes. |
| `powerups.webp` | 1280×256, alpha | **5 cells of 256×256** in this order: **jump, boost, EMP, oil, snowball.** Centre each object in its cell, no bigger than about 220 px. They are drawn at about 68 px with a gentle bob, so they need chunky outlines and bright colour, like `assets/icons_alpha.webp`. The oil cell is the one to **avoid**: a **flat puddle of liquid only**, with no cup, jar, pot, box or other object in or beside it. It is drawn lying still on the ground (no bob), so paint it as seen from slightly above, wider than it is tall. Sticky tracks (`oilEffect: "sticky"` in `tracks.js`: honey, mud, jam, chocolate…) should look thick and gooey; slippery ones glossy and slick. It must read as a mess, never a treat. The other four should look like treats you want. |
| `projectile.webp` | 128×128, alpha | The thing thrown with the snowball power-up. It is drawn at about 34 px and spins, so make it round-ish and centred. |
| `card.webp` | 400×225, opaque | The track's thumbnail for the picker and the "Next race" card: a painted vignette with the track's hurdle in front (same as request #16). The five original tracks already have cards in `track_cards.webp`, so this file is for new tracks. |

Primary hurdles use the original **straight-on front view**: horizontal rails,
vertical posts and the same 64×68 runtime footprint. Keep a compact, roughly
square silhouette. Longer/taller and thicker/slightly angled alternatives are
experimental assets only; do not select a strong three-quarter view in game.

### 5.3 Track geometry (backgrounds)

**Race backgrounds must loop seamlessly while scrolling right to left.** New
art must support ordinary horizontal repetition, without relying on reflected
copies. A prompt saying "tileable" is not proof: inspect at least two direct
repeats and the moving wrap in game. Bring the original edge join into the
middle with a half-width offset, repaint that transition with ImageGen, then
un-offset the reviewed result. Preserve the horizontal path edge throughout.
Set `loopMode: "repeat"` on a track only after its repaired repeat is checked.
Existing art retains its mirror-repeat fallback until similarly revised.

The game renders at 720 high. Racers' feet can go anywhere from the path's
top edge to the bottom of the screen, so the painted path sets the usable
band. Each track's edge is stored as `dirtTop` in `game.js`/`tracks.js`, and
new tracks use **532 at 720 high (y≈535 in the 724-high file)**, the farm's
edge. A path that starts lower squeezes the racers (the castle path starts at
586 and is the tightest today), so don't. If a delivered background's edge
ends up elsewhere, change its `dirtTop` to match. Check by racing with a doll
pressed against the top of the track: her feet should touch the path's top
edge.

### 5.4 Existing tracks: hurdle, power-ups and projectile

The labels are the pop-up names already set in `tracks.js`.

| Track (key) | `hurdle` | `powerups`: jump · boost · EMP · oil · snowball | `projectile` |
| --- | --- | --- | --- |
| Farm (`farm`) | Keep the white picket, or a hay bale with a sunflower tucked in, or a split-rail fence | hay-bale trampoline · carrot · crowing rooster · mud puddle · basket of red apples | red apple |
| Fairy (`fairy`) | A twisty vine arch with flowers and a glowing mushroom at each foot, or the white fence wrapped in a flower garland (match the fence in the background) | bouncy spotted toadstool · swirl of fairy dust · magic wand with a star burst · sticky golden honey puddle · cluster of rainbow bubbles | iridescent bubble |
| Village (`town`) | A low stone wall with a flower box on top, or a stack of market crates (apples, bread loaves) | pogo stick · pair of roller skates · brass bell · sticky lemonade puddle · bunch of water balloons | water balloon |
| Winter (`winter`) | A snow-capped fence with icicles, an ice-block wall, or a snowbank with two candy-cane posts | ski jump ramp · wooden sled · thunder-snow cloud with a zigzag · shiny ice patch with a crack · snowman (today's icon is fine) | snowball (keep the round white look) |
| Castles (`castles`) | A stone wall with pink bunting swags (match the background), or a striped jousting rail with a pennant | royal trampoline drum · golden fanfare trumpet · bronze gong · strawberry-jam puddle · tray of cream puffs | cream puff |

### 5.5 New tracks

Each needs `background`, `hurdle`, `powerups`, `projectile` and `card`. A
track is playable with just `background`, using the picket and today's icons
until the rest arrives. Toy Room, Wizard School, Beach, Night Festival and
Fairy Woods already have their own songs waiting, so their backgrounds come
first.
The other tracks share the songs that suit any board (set in `tracks.js`). In
priority order:

| # | Track (key) | `background` | `hurdle` | `powerups`: jump · boost · EMP · oil · snowball | `projectile` |
| --- | --- | --- | --- | --- | --- |
| T1 | **Horse Show** (`horseshow`) | A sunny show-jumping arena: grandstand with a cheering crowd, flags and bunting, a judges' booth and ribbon board, white rails along the back, and a raked sand arena floor. | Striped show jump: two wing stands with red-and-white poles | springboard · golden horseshoe · starter's bell · water-jump splash pool · bucket of sugar cubes | sugar cube |
| T2 | **Toy Room** (`toyroom`) | A kid's bedroom seen at doll size: giant bed, bookshelf and toy chest behind; a row of books or blocks as the back border; a big woven rug as the path. | A row of chunky crayons, or a wall of alphabet blocks | jack-in-the-box · wind-up key · toy drum · sticky juice puddle · bag of marshmallows | marshmallow |
| T3 | **Candy Land** (`candy`) | Lollipop trees, gumdrop hills, a frosting castle and a chocolate river behind a candy-cane fence; a graham-cracker or sugar-sand path. | Candy-cane fence with a gumdrop on each post | big gumdrop · peppermint swirl · popping candy burst · chocolate puddle · gumball jar | gumball |
| T4 | **Beach** (`beach`) | A seaside boardwalk: waves, lighthouse, beach umbrellas and a pier behind a low rope-and-post boardwalk rail; smooth sand path. | Sandcastle wall with a little flag | beach ball · surfboard · conch shell · slick seawater puddle · bucket of water balloons | water balloon |
| T5 | **Wizard School** (`wizard`) | A magical school castle at dusk with floating candles, an owl tower and a broom-racing pitch with hoops in the distance, behind a clipped hedge; flagstone or gravel path. Keep it generic: no house crests or names. | Clipped hedge with a little stone bird bath, or a stack of spell books | spell book with a spring · bubbling potion bottle · wand zap · green potion puddle · bag of puffs | glowing pixie puff |
| T6 | **Pumpkin Patch** (`autumn`) | Autumn farm: orange and red trees, a scarecrow, pumpkins, a corn maze and a hay wagon behind a split-rail fence; leafy dirt path. | Row of pumpkins on a hay bale | leaf pile · gust of swirling leaves · scarecrow · muddy puddle · basket of apples | apple |
| T7 | **Cloud Kingdom** (`clouds`) | A sky kingdom: cloud castles, rainbows and hot-air balloons, with a puffy cloud bank along the back; a firm pastel cloud path. | Cloud puff wall with a rainbow arch | cloud puff spring · rainbow · thunderclap cloud · rain puddle · hailstone pile | hailstone |
| T8 | **Moon Base** (`space`) | Moon surface with Earth in a starry sky, domes and a parked rocket behind a row of glowing beacons; grey moon-dust path. | Moon-rock wall with a little flag | moon boots · rocket · laser blaster (toy) · glowing space goo · moon-rock pile | moon rock |
| T9 | **Night Festival** (`festival`) | An evening fair: lanterns, a Ferris wheel, carousel and fireworks behind a string-light rope fence; a warm lantern-lit path. Keep the path bright enough to see the dolls. | Lantern-post rope barrier | trampoline · sparkler · firework burst · fizzy soda puddle · water balloons | water balloon |
| T10 | **Fairy Woods** (`woods`) | A deep, mossy fairy forest at twilight: giant old trees with fairy doors, glowing toadstools, fireflies, ferns and a babbling brook, behind a fence of twisted branches and roots; a soft, mossy dirt path. Its song is "Fairies in the Woods". | A fallen log with mushrooms and moss | giant bouncy mushroom · swirl of fireflies · acorn bell · mossy bog puddle · pile of acorns | acorn |

### 5.6 New mounts (later, optional)

The game rolls a mount from each mount pickup, and every track has its own
odds in `tracks.js` (more unicorns in Fairy and Candy Land, more griffons in
Castles, more brooms in Wizard School). These new mounts would fit specific
tracks. Each is a sheet with **exactly the same 3×3 grid of 418 frames, poses
and foot baseline as `assets/horse_sprites.webp`**, so it can reuse the horse
seat positions. Delivered: each is a mount pickup on its track (`mountOdds` in `tracks.js`).

| File | Track | What |
| --- | --- | --- |
| `assets/reindeer_sprites.webp` | Winter | A friendly reindeer with a red harness and bells |
| `assets/rocking_horse_sprites.webp` | Toy Room | A painted wooden rocking horse that gallops along on its rockers |
| `assets/carousel_horse_sprites.webp` | Night Festival | A gilded carousel horse on a twisted golden pole |
| `assets/pony_sprites.webp` | Farm, Horse Show | A small fluffy pony with a braided mane |

### 5.7 Delivered redo: puddles with objects in them

These oil cells show a container or a non-liquid object, so the honey pot
reads as a treat and the cups look like props. Repaint **only cell 4 (oil,
x 768-1023)** of each `assets/tracks/<key>/powerups.webp` and keep the other
four cells pixel-identical. Each must be a flat puddle of liquid only, as in
the §5.2 spec, filling about the same area as the farm's mud puddle.

| # | Track (key) | Now | Repaint as |
| --- | --- | --- | --- |
| R1 | Fairy (`fairy`) | Tipped honey pot | A thick, gooey golden honey puddle with drips and a few slow bubbles (sticky) |
| R2 | Village (`town`) | Lemonade with a tipped cup and ice cubes | A sticky yellow lemonade puddle, just liquid (no cup, no ice) |
| R3 | Castles (`castles`) | Tipped jam jar | A glossy red strawberry-jam puddle with a few seeds, no jar (sticky) |
| R4 | Toy Room (`toyroom`) | Juice box | A sticky orange-juice puddle, no box (sticky) |
| R5 | Wizard School (`wizard`) | Tipped cauldron | A glowing green potion puddle with a faint shimmer, no cauldron (slippery) |
| R6 | Night Festival (`festival`) | Tipped soda cup | A fizzy brown soda puddle with tiny bubbles, no cup (sticky) |
| R7 | Beach (`beach`) | Tangle of seaweed | A slick, wet seawater puddle with a little foam at its edge, no seaweed clump (slippery) |
| R8 | Beach (`beach`), **cell 1 (jump, x 0-255)** instead of cell 4 | A beach ball | Beach now has real kickable beach balls on the sand, so the high-jump pickup must not look like one: an inflatable pool ring on a big coiled spring. Then change the `jump` label in `tracks.js` from "BEACH BALL" to "POOL SPRING". |

Acceptance: overlay the new sheet on the old one; only cell 4 changed. In
game the puddle lies flat under a doll standing in it, and it reads as
something to avoid.

### 5.8 Acceptance (track art)

- [ ] The file is in `assets/tracks/<key>/`, has the size above, and is listed
      in that track's `art` in `tracks.js`.
- [ ] Race the track. The hurdle sits on the ground where the picket did,
      power-ups are centred and readable at full speed, and the oil cell looks
      like something to avoid.
- [ ] New backgrounds: a doll pressed to the top of the track has her feet on
      the path's top edge (adjust `dirtTop` if not), and the scroll seam looks
      right when mirrored.

---

## 6. Horse Show riding: the troll's skeleton horse

On the Horse Show track (`horseshow` in `tracks.js`) everyone races on
horseback from the start, and the troll rides too. Until these sheets arrive,
he rides a darkened, larger copy of the normal horse and sits on it in his
standing frames. List each file in `TRACK_SHARED_ART` in `tracks.js` (as
`"skeleton_horse"` or `"troll_riding"`) in the same commit that adds it.

| # | File | Size | What |
| --- | --- | --- | --- |
| S1 | `assets/skeleton_horse_sprites.webp` | 1254×1254 (3×3 of 418), alpha | **The Skeleton Horse.** Spooky but kid-friendly, not gory: bone-white skeleton horse with glowing green eyes, wisps of ghostly purple mane and tail, and a tattered dark saddle blanket. It should be noticeably bulkier than the normal horse, to carry a big troll. Use **exactly the layout, poses and foot baseline of `assets/horse_sprites.webp`**: row 0 standing (3 frames), row 1 gallop (3 frames), row 2 jump (3 frames), feet on the same baseline and facing right. Keep the saddle where the horse's saddle is in each matching frame, so a sheet overlaid on the horse sheet lines up at the seat. The game draws it 1.3× the size of a normal horse. |
| S2 | `assets/troll_riding_sprites.webp` | 1254×836 (3×2 of 418), alpha | **The troll riding**, drawn without the horse and in the same frame, scale and anchor as S1, so he sits in the saddle when the two are overlaid. The troll must match `assets/monster_sprites.webp`. Row 0 is riding, matching S1's gallop frames 1-3 (legs astride, leaning forward, one hand on the reins). Row 1 is grabbing from the saddle, lined up with S1's standing frame 1: **reach** (leaning far to the side with long arms out), **lift** (a doll-sized grip held up overhead) and **throw** (arms flung forward). The game draws the grabbed doll itself, so leave the hands empty. |

When he's knocked down he falls off, and the game uses his normal on-foot
frames next to the standing skeleton horse, so that needs no new art.

Acceptance: race the Horse Show (it uses the farm backdrop until its own
background, T1, arrives). The troll gallops in on the skeleton horse, stays in
the saddle through a gallop cycle, and his reach, lift and throw line up with
the doll he grabs.

---

## 8. Delivered riding toys: roller skates and pogo stick

On tracks with roller skates or a pogo stick, a doll who picks one up actually
skates or pogos while it lasts. Skates last twice as long as an ordinary speed
boost, and the pogo stick twice as long as high jump. Skates attached to the
existing run frames don't work (a mock-up showed lifted back feet and knees
reading as running, not gliding, and long skirts hiding a foot), so each doll
needs dedicated poses with the skates or stick painted in, including the
poses she uses mid-race (standing, pushing or throwing, falling backwards).

**Delivered and checked in game:** Lily, Mira, Hermione, Whirlpool, Juliette
Claudia, Kaya, Amanda, Penelope, Rumi, Barbie, Cinnamon, Felicity and Luna (K1/K2).
Their twelve poses, alternate outfits, both directions, baseline overlays and
pickup selection pass; see `tools/dolls/toys/reports/`. A side-by-side
clothing check against each sprite sheet (2026-10-21) passed for all of them
except Juliette's purse (K4 below). Felicity and Luna followed and pass too.
**Marisol also delivered:** complete approved `marisol-v2` identity, toys and actions; all fifteen dolls now pass.

**Clothing must not change between poses** (see §4). A toy pose shows exactly
the outfit, shoes and accessories of the same pose on her sprite sheet. The
only differences: the skates replace her shoes (on skates only), and the pogo
stick is added. Anything she carries keeps its place: if her sheet shows a
bag in the stand, run and fall frames, so do the matching toy frames.
During a race the game swaps between her sprite sheet and her toy sheet
whenever a toy starts, ends or she falls, so any difference flickers on screen.

| # | File | Size | What |
| --- | --- | --- | --- |
| K1 | `assets/doll_<key>_toys.webp` | **1254×1672 (3×4 of 418)**, alpha | Same frame, scale, facing (right) and **foot baseline 409** as `assets/doll_<key>_sprites.webp`, and the doll must match her sheet exactly. The skates are classic four-wheel quad roller skates, white boots with wheels in her colour from the roster table (§1), and the wheels sit on the baseline. The pogo stick is one design for every doll: a red pole, a silver coil spring, black foot pegs and grips, and a rubber tip at the bottom, centred at x 209. |
| K2 | `assets/masks/<key>_toys_mask.webp` | 1254×1672, same as K1 | The outfit mask for K1, made exactly like `assets/masks/<key>_sheet_mask.webp` (the same clothing areas, on the same black background). The game uses it to recolour her outfit on skates and on the pogo stick, as it does in every other pose. Skates and the stick are not clothing. |

Once a doll's K1 and K2 are in, add her key to `RIDE_TOY_SHEETS` in
`doll-art.js` in the same commit; the game uses the sheet only once it's listed.

| Row | On | Frames (left to right) |
| --- | --- | --- |
| 1 | Skates | **Glide cycle**: (1) pushing off with the back foot gliding out behind on its wheels; (2) feet together, gliding (also used mid-jump); (3) pushing off with the other foot. Both feet stay low, the body leans forward a little and the arms swing loosely. |
| 2 | Skates | (1) **Standing still**, balanced, feet together; (2) **pushing / throwing**: the same thrust as her push frame (row 4 cell 2 of her sheet), still on skates; (3) **falling backwards**: copy her fall frame (row 4 cell 3 of her sheet) exactly, with the **same body angle** and the same arms and legs, only wearing the skates. Don't lie flatter than her normal fall. |
| 3 | Pogo stick | **Bounce**: (1) compressed, knees bent, spring squashed, tip on the baseline; (2) extended, legs straight, spring stretched, tip on the baseline; (3) airborne, a little tucked (the game lifts it). Both feet on the pegs, both hands on the handlebar at chest height. |
| 4 | Pogo stick | (1) **Balancing** upright on the stick, tip on the baseline; (2) **pushing / throwing** with one hand off the handlebar, thrust forward; (3) **falling backwards** off the stick: copy her fall frame (row 4 cell 3 of her sheet) exactly, with the **same body angle**, arms and legs, plus the stick tipping away beside her. Don't lie flatter than her normal fall. |

### 8.0.1 Delivered redo: trial falls match normal falls

K3 is delivered. Each fall was drawn from the exact normal fall reference,
then aligned using the doll body (excluding the separate stick). Other ten
image cells and ten mask cells per doll are decoded-pixel-identical. See
`tools/dolls/toys/fall-redo/comparison.webp` and its verification hashes.

The delivered trial sheets work in game, but both falling cells lie much
flatter than each doll's normal fall (measured from the body only: Lily about
18° flatter on skates and on the pogo stick, Hermione about 16° on the pogo
stick, and Mira clearly flatter on both). Falls are seen side by side with
normal falls during a race, so they should match.

| # | File | Cells | Fix |
| --- | --- | --- | --- |
| K3 | `assets/doll_{lily,mira,hermione}_toys.webp` and their masks | Row 2 cell 3 (skate fall) and row 4 cell 3 (pogo fall) only | Redraw each to match that doll's normal fall (`doll_<key>_sprites.webp` row 4 cell 3): the same tilt, arm and leg positions and place in the frame, with the skates on, or with the stick tipping away. Keep every other cell pixel-identical and update the masks to match. |

### 8.0.2 Delivered redo: Juliette's purse (K4)

K4 is delivered and reviewed in game, including alternate colours and both directions.
Only the eight requested cells changed; both pushes and both falls remain
decoded-pixel-identical. Sources, overrides and checks are in
`tools/dolls/toys/purse-redo/`.

Juliette's sprite sheet shows her gold crescent-moon purse in every pose
except the push/throw frame (row 4 cell 2). Her toy sheet drops it from
every cell except the two falls, so it vanishes when she picks up skates or
a pogo stick, then pops back in when she falls.

| # | File | Cells | Fix |
| --- | --- | --- | --- |
| K4 | `assets/doll_juliette_toys.webp` and `assets/masks/juliette_toys_mask.webp` | Row 1 cells 1–3 and row 2 cell 1 (skates); row 3 cells 1–3 and row 4 cell 1 (pogo) | Add the purse, the same size and design as on her sprite sheet, hanging from her wrist (on skates) or from its strap at her hip (on the pogo stick, both hands on the grips). Leave the push/throw cells (row 2 cell 2, row 4 cell 2) without it, to match her sheet's push frame, and keep both falls as they are. Every other cell stays pixel-identical. Update the mask the same way her sheet mask treats the purse. |

### 8.1 Pickup icons for the tracks that get skates or a pogo stick

**Delivered:** R10 and R12–R14. Beach surfboard and Toy Room wind-up key
remain in use for their dedicated §10 behaviours. The two extra skate
concepts in the generation source are experimental and are not installed.

Village already shows skates (speed) and a pogo stick (high jump). These
tracks get them too. Repaint only the named cell of
`assets/tracks/<key>/powerups.webp`, in that track's existing icon style, and
keep the other cells pixel-identical. When one lands, set the label in
`tracks.js` and add the toy to that track's `rideToys` (Village has
`rideToys: { boost: "skates", jump: "pogo" }`), so the pickup becomes skates
or a pogo stick only once its icon shows them.

| # | Track (key) | Cell | Now | Repaint as | Label in `tracks.js` |
| --- | --- | --- | --- | --- | --- |
| ~~R9~~ | ~~Beach~~ | | | **Cancelled:** Beach's surfboard is now its own item (§10). | |
| R10 | Night Festival (`festival`) | 2 (speed) | Sparkler | Roller skates with glowing light-up wheels | `boost: "SKATES"` |
| ~~R11~~ | ~~Toy Room~~ | | | **Cancelled:** the wind-up key now releases wind-up cars (§10). | |
| R12 | Toy Room (`toyroom`) | 1 (jump, x 0-255) | Jack-in-the-box | A toy pogo stick with a jack-in-the-box spring | `jump: "POGO"` |
| R13 | Night Festival (`festival`) | 1 (jump) | Trampoline | A pogo stick with string lights wound around the pole | `jump: "POGO"` |
| R14 | Candy Land (`candy`) | 1 (jump) | Gumdrop | A candy-cane-striped pogo stick with a gumdrop tip | `jump: "POGO"` |

How the game uses them: during skates a doll on foot glides through row 1
with the frames paced to how far she has moved, so her speed and stride match.
Standing still she uses row 2 cell 1, pushing or throwing row 2 cell 2, and
falling back row 2 cell 3. During the pogo stick she bounces continuously
through row 3 while moving at her normal speed (row 4 for balancing,
pushing and falling). With both, she keeps the look of the one she picked
up first and has both powers; when it runs out she switches to the other.
Mounted racers keep their mount.

Acceptance: overlay cell 1 of rows 1 and 3 on the doll's idle frame; the
wheels or pogo tip sit on the same baseline and the doll matches her sheet.
Then race on the Village with a skates pickup and a pogo pickup.

---

## 9. Delivered track monsters: a jack-o'-lantern scarecrow and a skeleton

Two alternates for the troll, in the **same painted, slightly photoreal style
as `assets/monster_sprites.webp`** (look at it side by side). They behave
exactly like the troll; only the look changes. The **scarecrow** replaces the
troll on Pumpkin Patch (`autumn`), the **skeleton** on Wizard School
(`wizard`). Both must stay kid-friendly: spooky-silly, not scary.

| # | File | Size | What |
| --- | --- | --- | --- |
| M1 | `assets/scarecrow_sprites.webp` | 1254×1672 (3×4 of 418), alpha | A tall, lanky scarecrow with a carved **jack-o'-lantern head** (goofy grin, warm glow), a patched plaid shirt, overalls and a floppy straw hat, straw poking from the cuffs and collar. |
| M2 | `assets/skeleton_sprites.webp` | 1254×1672 (3×4 of 418), alpha | A cartoon **skeleton** with a big grinning skull, chunky friendly bones and a tattered purple wizard-school scarf. |

**Use exactly the troll sheet's layout, scale, facing (right, matching the actual source sheet) and foot
baseline**, cell for cell, because the game swaps the sheet in without other
changes:

| Row | Cells (left to right) |
| --- | --- |
| 1 | Idle, 3 frames of a slight sway |
| 2 | Walk cycle, 3 frames |
| 3 | **Grab** (lunging forward with arms out), **lift** (arms raised overhead), **throw** (arms flung forward). The game draws the grabbed doll, so the hands are empty. |
| 4 | **Knocked over** (falling backwards), **collapsing**, and **defeated**. Defeated is the big difference from the troll, which lies asleep. The scarecrow's defeated cell is **an empty heap of its clothes and straw with the pumpkin head sitting on top**. The skeleton's is **a pile of bones with the skull on top**. Both stay put on the ground until the race ends. |

In the same commit, add `"scarecrow"` / `"skeleton"` to `TRACK_SHARED_ART` in
`tracks.js`; the game loads a sheet only once it is listed.

Acceptance: overlay each sheet on `monster_sprites.webp` and check that the
feet sit on the same baseline in rows 1-3 and the figures are about the same
size. Then race Pumpkin Patch and Wizard School on "Extra" monsters. Each
one walks in, grabs and throws a doll, and after five knock-backs ends as its
pile.

---

## 10. New items: spell book, surfboard, wind-up cars (plus missing poses)

Three track pickups now do something of their own instead of copying speed
or high jump:

- **Wizard School, spell book (the high-jump pickup):** the doll raises a
  wand and casts at the nearest racer or monster, who turns into a frog and
  can only hop for a few seconds.
- **Beach, surfboard (the speed pickup):** the doll rides a wave along the
  track. It's fast, washes over hurdles and is hard to steer.
- **Toy Room, wind-up key (the speed pickup):** it releases little wind-up
  toy cars that drive ahead and bump anyone in their way.

The game already draws stand-ins in code (a wand line, a code-drawn wave,
board and cars, a frog emoji). These files replace them. Each must be listed
as described below in the same commit that adds it; the game uses a file
only once it's listed.

### 10.1 Per-doll actions sheet

| # | File | Size | What |
| --- | --- | --- | --- |
| A1 | `assets/doll_<key>_actions.webp` | 1254×1254 (3×3 of 418), alpha | Same frame, scale, facing (right) and foot baseline 409 as the doll's sheet. She must match her sheet exactly: the same outfit, shoes and accessories as the matching sprite-sheet pose (§4), with only the wand or surfboard added. |
| A2 | `assets/masks/<key>_actions_mask.webp` | 1254×1254 | Its outfit mask, made like `<key>_sheet_mask.webp`. |

Add the doll's asset key to `ACTION_SHEETS` in `doll-art.js` when both land.
**Delivered and reviewed:** all fifteen dolls, including Marisol’s complete `marisol-v2` migration. Their nine poses, alternate outfits, both directions, saddle seat and wand-tip origins pass; see `tools/dolls/actions/reports/`.

| Row | Frames (left to right) |
| --- | --- |
| 1 | **Casting with a wand** (one wand for every doll: dark wood, gold handle, a little gold star at the tip): (1) wand raised high, (2) arm thrust forward pointing the wand straight ahead at chest height (the game sends sparkles from its tip), (3) a follow-through swish that ends **in front of her** (the wand still pointing ahead and a little down, never swung back behind her). The other hand stays natural. |
| 2 | **Surfing** on one board for every doll (turquoise with a coral stripe and a small fin), with the board's bottom on the baseline: (1) crouched and balanced, arms out; (2) leaning forward, carving; (3) wobbling, arms windmilling. |
| 3 | (1) **Pushing / throwing from the saddle**: seated exactly like her riding pose (`assets/portraits/<key>_ride.webp`, same seat position) with one arm thrust forward. It's used for pushes and snowballs on horseback. (2) **Stuck in a sticky puddle**: feet planted, toppling forward with arms windmilling. (3) **Floating in moon boots**: arms and legs spread wide, a happy astronaut float. |

### 10.2 Delivered shared sprites

| # | File | Size | What |
| --- | --- | --- | --- |
| A3 | `assets/frog_sprites.webp` | 768×512 (3×2 of 256), alpha | Spell-book frogs, side view facing right, feet on the cell's bottom edge. **Row 1:** a small cute green frog (the doll it came from is shown by her name above it): (1) sitting, (2) crouched to hop, (3) mid-leap. **Row 2:** a bigger, warty, grumpy olive frog for a troll, scarecrow or skeleton, same three poses. List it as `"frog"` in `TRACK_SHARED_ART`. |
| A4 | `assets/tracks/beach/wave.webp` | 1536×384 (3×1 of 512×384), alpha | The wave a surfer rides: a curling turquoise wave with white foam, about 3× as long as a doll is tall, its base on the cell's bottom edge, curling toward the right. Three frames of the curl rolling, for a loop. Add `"wave"` to Beach's `art`. |
| A5 | `assets/tracks/toyroom/windup_car.webp` | 768×512 (3×2 of 256), alpha | Wind-up toy cars, side view facing right, wheels on the cell's bottom edge, each with a big wind-up key on top. **Row 1:** a red tin race car. **Row 2:** a yellow tin bus. Three frames each of wheels turning and the key spinning. Add `"windup_car"` to the Toy Room's `art`. |

### 10.3 Delivered redo: Kaya's follow-through (A6)

| # | File | Cells | Fix |
| --- | --- | --- | --- |
| A6 | `assets/doll_kaya_actions.webp` and `assets/masks/kaya_actions_mask.webp` | Row 1, cell 3 only | Her follow-through swings the wand back behind her (pointing left while she faces right). Redraw it as a forward follow-through like Whirlpool's and Claudia's: arm still out in front, wand pointing ahead and a little down, a short sparkle swish. Same outfit and moccasins; keep the other eight cells pixel-identical and update the mask cell to match. |

Acceptance: race each track and check that the casting sparkles leave the wand
tip, the frog hops where the victim was, the surfer's board sits on the wave,
and the cars drive along the ground.

---

## 11. Delivered run-cycle redos: Felicity, Claudia and Barbie

RC1–RC3 are delivered and reviewed at race speed beside Rumi, in both
directions and alternate outfits. Only each run row and its mask changed;
the other nine image and nine mask cells are pixel-identical. Measured source
hip pivots, updated broom carry hands, narrow-footprint checks and screenshots
are retained in `tools/dolls/run-redo/`.

A doll's run (sprite sheet row 2, three cells) plays as a loop. For it to read
as running, the three cells must be **(1) a stride with one leg forward,
(2) the passing pose with the feet together under the body (one foot planted,
the other just lifting past it), and (3) the stride with the other leg
forward.** Felicity's, Claudia's and Barbie's run cells are all strides with
the same leg forward, so in game they jiggle on the spot instead of running.
Compare with Rumi's or Barbie's run row, which work. (Measured from the
sheets: across the feet, every other doll has a cell much narrower than the
others; Felicity and Claudia don't, and a side-by-side check of every run row
found Barbie's middle cell is a shorter stride, not a passing pose.)

| # | File | Cells | Fix |
| --- | --- | --- | --- |
| RC1 | `assets/doll_felicity_sprites.webp` and `assets/masks/felicity_sheet_mask.webp` (source `tools/dolls/sources/felicity/run.webp`) | Row 2, cells 1–3 | Redraw as stride, passing (feet together), opposite stride, in her same outfit and boots (§4), on the 409 baseline. Keep every other cell pixel-identical and update the mask to match. |
| RC2 | `assets/doll_claudia-v2_sprites.webp` and `assets/masks/claudia-v2_sheet_mask.webp` (source `tools/dolls/sources/claudia/run.webp`) | Row 2, cells 1–3 | The same fix for Claudia, in her same dress and silver shoes. |
| RC3 | `assets/doll_barbie_sprites.webp` and `assets/masks/barbie_sheet_mask.webp` (source `tools/dolls/sources/barbie/run.webp`) | Row 2, cells 1–3 | The same fix for Barbie, in her same swimsuit, sunglasses and slides. |

Acceptance: play the three cells in a loop at race speed next to Rumi's; the
legs should alternate, not shuffle. The throw and ride cells don't change, so
`tools/dolls/measure_hands.py` needn't be re-run.

---

## 12. Delivered EMP pickups that look like triggers

The EMP pickup (cell 3 of each track's `powerups.webp`, x 512–767) zaps
everyone it reaches, so its icon should read as **something you press or
pull to set it off**: a plunger, a big button, a lever or a pull cord, with
the track's theme built around it. Today several are just an item (a
rooster, a shell, a drum) that doesn't say "press me". The game now draws
lightning, sparks or fireworks from the racer to everyone it hits, so the
trigger is the start of that effect.

Repaint only cell 3 of `assets/tracks/<key>/powerups.webp`, in that track's
existing icon style, at the same size and padding as its other cells; keep
the other four cells pixel-identical. Keep the label in `tracks.js` (or
propose a better one in the commit).

| # | Track (key) | Label | Trigger to paint |
| --- | --- | --- | --- |
| E1 | Night Festival (`festival`) | FIREWORK | A TNT-style plunger handle in front of a crate of fireworks, rockets poking out of the top. |
| E2 | Farm (`farm`) | ROOSTER | A big red push-button on a little wooden post, with a tin rooster weathervane on top. |
| E3 | Fairy (`fairy`) | WAND ZAP | A glowing toadstool push-button with a fairy wand standing up as its lever. |
| E4 | Village (`town`) | BELL | A brass bell on a bracket with a striped pull-cord and handle hanging down. |
| E5 | Winter (`winter`) | THUNDERSNOW | A frosty plunger detonator under a small grey snow cloud with a zigzag of lightning. |
| E6 | Castles (`castles`) | GONG | A small gong on a stand with a lever-arm mallet you pull down to strike it. |
| E7 | Horse Show (`horseshow`) | STARTER BELL | A starter's box with one big red button and a bell on top. |
| E8 | Toy Room (`toyroom`) | TOY DRUM | A toy plunger box (bright colours, wind-up key) wired to a toy drum. |
| E9 | Candy Land (`candy`) | POP ROCKS | A gumdrop push-button on top of a crate of pop rocks. |
| E10 | Beach (`beach`) | CONCH SHELL | A conch shell horn on a bicycle-horn squeeze bulb. |
| E11 | Wizard School (`wizard`) | WAND ZAP | A crystal on a stone pedestal with a big glowing rune push-button. |
| E12 | Pumpkin Patch (`autumn`) | SCARECROW | A pumpkin push-button (the stem is the button) on a hay crate. |
| E13 | Cloud Kingdom (`clouds`) | THUNDERCLAP | A fluffy cloud-shaped plunger with a lightning-bolt handle. |
| E14 | Moon Base (`space`) | LASER | A big red console button under a clear flip-up cover, with a small laser dish. |
| E15 | Fairy Woods (`woods`) | ACORN BELL | An acorn-cap push-button on a mossy stump with a tiny bell. |

Acceptance: at pickup size in game, each one reads as "press or pull this"
at a glance, and still fits its track's look next to the other four cells.

---

## 13. Title screen: Hermione on the pegasus (delivered)

Claudia has a new outfit (`claudia-v2`), so the title screen's pegasus rider
(`assets/ui/title_hero_claudia.webp`, old mint-and-gingham Claudia) is out of
date. Put **Hermione** on the pegasus instead.

| # | File | Size | What |
| --- | --- | --- | --- |
| H1 | `assets/ui/title_hero_hermione.webp` | 680×550, alpha | Hermione riding the same white pegasus, in the same style, lighting, scale and pose as `title_hero_claudia.webp`: wings raised, galloping right in the air, the whole tail and all four legs visible, small transparent margin. Hermione as on her sprite sheet (`doll_hermione_sprites.webp`, portrait `portraits/hermione_ride.webp`): wavy brown hair, grey school jumper over a white shirt and tie, grey pleated skirt, grey knee socks and black school shoes, seated and holding the reins (§4: the same clothes as her other art). Rider and pegasus are one cutout so they move together. No ground shadow, text or other subjects. |

Integration, in the same commit:
- In `assets/ui/title_hero_layout.json`, change the first layer's `key` to
  `"hermione"` and `file` to `"title_hero_hermione.webp"`. Keep its x, y,
  size and animation values (the new cutout matches the old one's frame).
- In `index.html`, preload `title_hero_hermione.webp` instead of
  `title_hero_claudia.webp`, and bump the `?v=` on
  `title_hero_layout.json` in `menu.js`.
- Remove `title_hero_claudia.webp` once nothing references it (the original
  `title_hero.webp` composite stays as the fallback).

Acceptance: on the title screen Hermione's pegasus sits where Claudia's was,
in front of the sky and behind Juliette, and bobs with the group.

H1 delivered: complete 680×550 transparent cutout, matching layer position and animation. Checked over cream/navy and on the title screen; all other layout values are unchanged. Original Claudia cutout archived under `tools/imagegen/hermione-hero/`; original composite retained.

E1–E5 delivered: new trigger devices checked at native pickup size, with transparent gutters and all four other cells preserved exactly.

E6–E10 delivered: castle gong, starter bell button, wind-up drum plunger, gumdrop button and squeeze-bulb conch. Native pickup review and exact preservation of other cells passed.

E11–E15 delivered: rune button, pumpkin button, lightning plunger, covered laser console and acorn bell button. All fifteen devices reviewed in the game renderer; transparent gutters, alpha and the four untouched cells per strip passed.

Actions delivered for Juliette, Barbie and Cinnamon (nine poses each), with Juliette’s purse retained. A6 Kaya follow-through is corrected, as are Barbie and Cinnamon: the wand now stays in front. Only each corrected follow-through cell changed; the other eight art and mask cells remain exact. Native actions/outfits/mirrors and measured star-origin checks passed.

Felicity and Luna action sheets delivered: all nine poses, outfit masks, wand tips and seated alignment checked; Luna keeps her glasses throughout. Marisol followed in the complete migration batch.

Marisol’s §8 toys and §10 special actions delivered with the complete approved `marisol-v2` identity; see `image-requests-marisol.md`. All fifteen dolls now have registered toy and special-action sheets.

---

## 14. Delivered Moon Base monster: an evil robot troll

A third alternate for the troll, for Moon Base (`space`), in the **same
painted, slightly photoreal style as `assets/monster_sprites.webp`** (look at
it side by side). It behaves exactly like the troll; only the look changes.
Kid-friendly: a grumpy, clunky toy-like villain, not scary.

| # | File | Size | What |
| --- | --- | --- | --- |
| M3 | `assets/robot_sprites.webp` | 1254×1672 (3×4 of 418), alpha | A big, chunky **evil robot troll** about the troll's size and build: a dented gunmetal-and-silver body with a few red warning lights, a boxy head with a scowling visor of glowing red eyes and a crooked antenna, oversized clamp hands, stubby piston legs with heavy feet, and a few rivets and scuffed hazard stripes. It reads as a troll made into a robot: hunched shoulders, long arms, a grumpy face. |

**Use exactly the troll sheet's layout, scale, facing (right, matching the
actual source sheet) and foot baseline**, cell for cell, because the game
swaps the sheet in without other changes:

| Row | Cells (left to right) |
| --- | --- |
| 1 | Idle, 3 frames of a slight sway, the visor eyes flickering |
| 2 | Walk cycle, 3 frames, clanking steps |
| 3 | **Grab** (lunging forward with clamp hands open), **lift** (arms raised overhead), **throw** (arms flung forward). The game draws the grabbed doll, so the hands are empty. |
| 4 | **Knocked over** (falling backwards, sparks at the joints), **collapsing** (sinking to the ground, a panel popping open), and **defeated**: **the whole robot lying flat on its back on the ground like a broken robot**: visor dark or flickering, antenna bent, a chest panel hanging open with loose wires, one leg twitched up. Paint no sparks or smoke in this cell: the game adds crackling sparks over it. It stays put on the ground until the race ends. |

In the same commit, add `"robot"` to `TRACK_SHARED_ART` in `tracks.js`, and
set `monster: "robot"` on the `space` track. The game loads the sheet only
once it's listed and uses the plain troll until then. Its sounds
(`robot_*`) are already in the game.

Acceptance: overlay the sheet on `monster_sprites.webp` and check that the
feet sit on the same baseline in rows 1–3 and the figures are about the same
size. Then race Moon Base on "Extra" monsters. It walks in, grabs and throws
a doll, gets knocked down by a push, a snowball and an EMP, and after five
knock-backs lies broken on the ground, sparking.

M3 delivered: twelve transparent poses registered on Moon Base, with troll-size comparison, overlay, baseline/gutters and real-alpha review passed. Controlled Moon Base Extra browser review passed grab/lift/throw, push/snowball/EMP, mirrored art and the five-hit broken-robot state with live sparks. Evidence: `tools/effects/reports/robot-*`.

---

## 15. Delivered track picker cards without a foreground hurdle

The track cards on the select screen each show a hurdle or obstacle front and
centre (the picket and pole jumps, Beach's sandcastle, Night Festival's rope,
Moon Base's rocks, Cloud Kingdom's rainbow arch, Toy Room's crayon box, Fairy
Woods' log steps, Wizard School's hedge, Pumpkin Patch's hay bales), and it
steals the eye. Redo every card as **just the theme's landscape**: the same
scenery and mood as that track's background, with nothing in the foreground.
The near ground can be the track's path or ground, open and empty, with no
hurdle, fence, sign, prop or character placed in front.

| # | File | Size | What |
| --- | --- | --- | --- |
| C1 | `assets/ui/track_cards.webp` | 2000×225 (5 cells of 400×225), opaque | Farm, Fairy, Village, Winter and Castles, in that order. |
| C2 | `assets/tracks/<key>/card.webp` for `horseshow`, `toyroom`, `candy`, `beach`, `wizard`, `autumn`, `clouds`, `space`, `woods`, `festival` | 400×225, opaque | One per track. |

Keep each card's look and colours close to today's (the landmarks stay: the
barn, castles, pier and lighthouse, Ferris wheel, rocket and Earth, and so
on), painted in the same style as the track art, with the landscape filling
the card edge to edge and the main landmark readable at half size. No text.

Acceptance: on the select screen, each card reads at a glance as its track,
and no object in the front draws the eye ahead of the scenery.

---

## 16. Delivered Toy Room and Beach monsters

Two more alternates for the troll, in the **same painted, slightly photoreal
style as `assets/monster_sprites.webp`** (look at it side by side). They
behave exactly like the troll; only the look changes. Both kid-friendly:
grumpy and funny, not scary. Like the troll, each fills the frame to about
the troll's height (feet to the top of the head, not counting a hat or key).

| # | File | Size | What |
| --- | --- | --- | --- |
| M4 | `assets/tintroll_sprites.webp` | 1254×1672 (3×4 of 418), alpha | For the **Toy Room** (`toyroom`): a **wind-up tin toy troll**, the troll's hunched shape made as a vintage painted tin toy: bright chipped enamel (green body, red and yellow trim), visible seams and tabs, round rivet eyes and a big painted grin, stiff jointed arms and legs, and a large brass **wind-up key** turning in its back. |
| M5 | `assets/sandtroll_sprites.webp` | 1254×1672 (3×4 of 418), alpha | For the **Beach** (`beach`): a **sand monster troll**, the troll's hunched shape made of packed wet and dry sand, with seashell eyes, a seaweed tuft for hair, little shells and a starfish stuck in it, and sand trickling from its elbows and fingers. |

**Use exactly the troll sheet's layout, scale, facing (right, matching the
actual source sheet) and foot baseline**, cell for cell, because the game
swaps the sheet in without other changes:

| Row | Cells (left to right) |
| --- | --- |
| 1 | Idle, 3 frames of a slight sway (the tin troll's key turning; sand trickling) |
| 2 | Walk cycle, 3 frames (stiff toy steps; heavy sandy steps) |
| 3 | **Grab** (lunging forward with arms out), **lift** (arms raised overhead), **throw** (arms flung forward). The game draws the grabbed doll, so the hands are empty. |
| 4 | **Knocked over** (falling backwards), **collapsing**, and **defeated**. The tin troll's defeated cell is **the toy tipped over on its side, legs stuck mid-step and its key stopped**. The sand monster **collapses into a pile of sand**: the collapsing cell shows it pouring down, and the defeated cell is **just a heap of sand on the ground, the figure gone**, with its two shell eyes and seaweed tuft lying on the heap. Both stay put until the race ends. |

In the same commit, add `"tintroll"` / `"sandtroll"` to `TRACK_SHARED_ART`
in `tracks.js`, and set `monster: "tintroll"` on `toyroom` and
`monster: "sandtroll"` on `beach`. The game loads a sheet only once it's
listed. Their sounds (`tintroll_*`, `sandtroll_*`) are already in the game.

Acceptance: overlay each sheet on `monster_sprites.webp` and check that the
feet sit on the same baseline in rows 1–3 and the figures are about the same
size. Then race the Toy Room and the Beach on "Extra" monsters. Each one walks
in, grabs and throws a doll (held in its hands), and after five knock-backs
ends in its defeated pose.

C1 delivered: the five original track cards are landscape-only. Native/half-size and browser card rendering passed; the ten C2 cards and M4/M5 are being verified separately.

C2 first batch delivered: Horse Show, Toy Room, Candy Land, Beach and Wizard School cards now have empty foregrounds; native/half-size and browser checks passed.

C2 final batch delivered: Pumpkin Patch, Cloud Kingdom, Moon Base, Fairy Woods and Night Festival. All fifteen C1/C2 cards pass RGB/dimensions/hash, half-size landmark readability and browser rendering checks. `tools/tracks/card-redo/` retains sources, prompts and evidence.

M4/M5 delivered with the owner’s revised designs: M4 is a glossy vintage wind-up lagoon creature, with gills, webbed hands/feet and a brass key. Its final frame lies flat on its back, legs straight and rigid arms straight up. M5 is made purely of loose sand, without eyes, shells or seaweed; sand spills from all poses and its collapse ends in a plain heap. These later instructions supersede the initial character descriptions above. Twelve poses each, true alpha, baseline409, original-troll scale comparison and measured hand anchors verified. Browser review passed grabs/lifts/throws in both directions, push/snowball/EMP and five-hit defeat states. Sources, exact built-in ImageGen prompts and proofs: `tools/effects/`.

---

## 17. Delivered Wizard School magic wand pickup icon

Wizard School's high-jump pickup is now the **magic wand** (the doll casts a
spell that turns the nearest racer or monster into a frog), but its icon,
cell 1 of `assets/tracks/wizard/powerups.webp` (x 0–255), still shows a spring
with a spell book on it, which reads as a jump.

| # | File | Cell | Repaint as |
| --- | --- | --- | --- |
| W1 | `assets/tracks/wizard/powerups.webp` | 1 (x 0–255) | **A magic wand**: the same wand the dolls cast with (dark wood, gold handle, a little gold star at the tip), tilted, with a few sparkles around the star. No spring or book. Same style, size and padding as the track's other cells; keep the other four cells pixel-identical. |

The game already names it "MAGIC WAND". Acceptance: on Wizard School the
pickup reads as a wand at a glance, next to the other icons.

---

## 18. Delivered Moon Base moon buggy

On Moon Base the plain horse (the base mount a mount pickup gives) becomes a
**moon buggy**. It rides like the themed ground mounts in §5.6 (pony,
reindeer, rocking horse), so it uses the same sheet layout and seat.

| # | File | Size | What |
| --- | --- | --- | --- |
| B1 | `assets/moon_buggy_sprites.webp` | 1254×1254 (3×3 of 418), alpha | A cheerful kid-sized **moon buggy**, side view facing right: a small open lunar rover with four big wire-mesh wheels, a white-and-silver body with a few orange stripes, a little dish antenna and a flag on a whip pole at the back, and one open seat in the middle. Painted in the same style as the race's mounts (`assets/horse_sprites.webp`, `assets/rocking_horse_sprites.webp`). |

**Use exactly the same 3×3 grid, poses and foot baseline as
`assets/horse_sprites.webp`**, with the **seat at (226, 242)** in every frame
(like the other themed mounts) so the doll sits in it without new
calibration. No rider: the game draws the doll in the seat.

| Row | Frames (left to right) |
| --- | --- |
| 1 | Standing still: wheels on the baseline, antenna swaying a little |
| 2 | Driving: wheels turning, a puff of moon dust behind, body bobbing on its suspension |
| 3 | Jumping: (1) take-off, nose up; (2) airborne, wheels hanging down; (3) landing, suspension squashed |

In the same commit add `"moon_buggy"` to `THEMED_MOUNT_TYPES` in `game.js`
and set `baseMount: "moon_buggy"` on the `space` track in `tracks.js`. Until
the sheet is in, Moon Base keeps the plain horse.

Acceptance: race Moon Base, take a mount pickup, and check the doll sits in
the seat in every frame both ways, and the wheels stay on the ground line.

W1 delivered: dark wood/gold star-tipped wand replaces only cell 1. The remaining four decoded RGBA cells are pixel-identical; alpha/padding and thumbnail readability reviewed. Source, prompt and before/after evidence: `tools/tracks/wizard-wand/`.

Candy Land and Cloud Kingdom trolls delivered from the owner’s approved colorful-candy and storm-cloud canonicals. Twelve normal poses each; candy defeat is a headless pile with eight matching candy particle sprites. Cloud has a separate three-frame lightning attack, a golden bolt projectile, and dissipates completely including its shadow. Measured grab anchors, alpha/gutters/baseline, both attack directions and interruption/defeat reviewed; sources and prompts in `tools/effects/new-trolls/`.

B1 delivered with the owner’s later Apollo-rover photo reference: open silver tube frame, webbed seat, gold-foil equipment and umbrella dish. Nine right-facing transparent poses, baseline409 and mirrored rider review passed. Its lower Apollo-style seat uses measured per-frame calibration in `mounts.js`, superseding the initial fixed (226,242) seat suggestion without distorting the rover. Source, exact prompt, seat measurements and proofs: `tools/mounts/moon-buggy/`.

B1 owner follow-up delivered: thinner Apollo frame/small wheels, no painted dirt
or dust in any frame. Level animation poses cover wheels and suspension; code
adds shared driver/chassis driving bounce and jump tilt. Pickup remains smaller
than the ridden rover, matching other mounts.

## 19. Delivered: a crowing rooster for the Farm's EMP

The Farm's EMP is a ROOSTER: when a doll takes it, a rooster pops up in front
of her, bobs and crows, and sound waves ripple out from it to everyone it
hits (they're left dizzy). Today the game bobs the pickup icon (cell 2 of
`assets/tracks/farm/powerups.webp`) as a stand-in.

| # | File | Size | What |
| --- | --- | --- | --- |
| RC1 | `assets/rooster_crow_sprites.webp` | 768×256 (3 cells of 256 in one row), alpha | The same rooster as the Farm's EMP icon (same colours and style), **full body, side view facing right**, standing, crowing. |

| Cell | Pose |
| --- | --- |
| 1 | Winding up: chest puffed, head pulled back a little, beak closed |
| 2 | Crowing: head thrown back, beak wide open, wings lifted slightly from the body |
| 3 | Crow at full stretch: neck stretched up and forward, beak open, tail feathers fanned |

Feet on a common baseline at y = 250 in every cell, centred at x = 128, about
200 px tall with its comb; no ground, shadow, sound lines or text (the game
draws the waves). In the same commit add `"rooster_crow"` to
`TRACK_SHARED_ART` in `tracks.js`; the game then uses the sheet (cycling the
three cells while it bobs) instead of the icon.

Acceptance: race the Farm, take the ROOSTER EMP facing each way, and check
the rooster stands in front of the doll on the ground, crows through the
three poses, and reads clearly at its in-game size (about 96 px).


RC1 delivered: three matching full-body crow poses at 768×256, real alpha,
common y=250 feet baseline, uniform scale and about 200px height. Registered
as shared art; world placement now uses the doll's ground baseline before
the existing pop/bob. All three cells and facing directions passed silent
browser review. Source, built-in ImageGen prompt and packing report:
`tools/effects/rooster-crow/`.

## 20. Delivered: Pumpkin Patch crows: the EMP trigger and flying crows

Pumpkin Patch's EMP sends crows flying from the trigger to everyone it hits;
they circle each head and leave them dizzy. Today the trigger is a pumpkin
button (E12) and the crows are simple shapes drawn in code. Make the trigger
plainly the crows' perch, and give the flying crows real art.

| # | File | Size | What |
| --- | --- | --- | --- |
| CR1 | `assets/tracks/autumn/powerups.webp` | cell 2 only (x 512–767) | **Crows crowded round a push-button**: a big round push-button (a pumpkin-orange cap on a short hay-crate base, as in today's E12, so it still reads as a trigger) with four or five glossy black cartoon crows perched on and around it, jostling: on the crate edges, one on top beside the button cap, wings half open, beaks open, bright eyes. Same style, size and padding as the other cells; keep the other four cells pixel-identical. In the same commit change the Pumpkin Patch `labels.emp` in `tracks.js` from `"SCARECROW"` to `"CROWS"`. |
| CR2 | `assets/crow_sprites.webp` | 512×128 (4 cells of 128 in one row), alpha | **One crow flying**, side view facing right, the same crow as CR1, as a four-frame wing-flap loop: (1) wings up, (2) wings level, (3) wings down, (4) wings level coming back up. |

CR2: the body (centre about x 64, y 70) stays in the same place in all four
cells, so only the wings move; about 90 px from beak to tail. No ground,
shadow, motion lines or text. In the same commit add `"crow"` to
`TRACK_SHARED_ART` in `tracks.js`; the game then draws the crows from this
sheet (cycling the four cells as they fly) instead of the code shapes.

Acceptance: race Pumpkin Patch (or use the workbench on Pumpkin Patch) and
take the CROWS EMP with someone in range: the pickup reads as crows on a
button at its in-game size, and the crows that fly out and circle each head
flap smoothly, facing the way they fly.


CR1/CR2 delivered: five glossy black crows gather around the orange hay-crate
button; other four decoded pickup cells are pixel-identical. Four right-facing
flight cells use uniform scale and fixed head/body alignment. Shared crow art
and CROWS label registered; actual flight, circling and both directions passed
review. Sources, prompts, export report and proofs: `tools/effects/autumn-crows/`.

## 21. Delivered: Cloud Kingdom floor clouds

Cloud Kingdom's course is now a row of separate clouds (game-terrain.js):
each cloud sits a little higher or lower than the last (steps of up to 12
px), its middle domed up about 8 px, neighbours overlapping by about 60 px,
and now and then a 95–130 px gap between two that the dolls must jump (the
game paints falling-away sky in the gaps). Today the clouds are plain shapes
drawn in code. The background's own flat cloud floor is covered by them.

| # | File | Size | What |
| --- | --- | --- | --- |
| CL1 | `assets/tracks/clouds/floor.webp` | 2304×640 (3×2 cells of 768×320), alpha | **Six walkable floor clouds**, one per cell, in the background's soft pastel style (white tops, lilac-pink shading underneath). Seen from a little above, as the ground the dolls run on: **plainly a big soft puffy cloud, not flat ground**: the whole top is rounded billows and lumps of different sizes, soft and fluffy, with gentle shading between the puffs, filling the cell from its back edge down to the bottom. Dolls sink a little into it when they stand still and bounce on it as they run, so it should look soft enough for that. |
| CL2 | `assets/tracks/clouds/puff.webp` | 128×128, alpha | **A little cloud puff** in the same style: a soft white-lilac lump of cloud, wider than tall, centred. A few gather over a doll's feet when she sinks into the cloud standing still. In the same commit add `"puff"` to the `clouds` track's `art` list. |

Each cell: the cloud's **back edge** (its far, top silhouette: a row of soft
puffs) sits at about **y = 40**, gently domed (the middle about 8 px higher
than the ends). Below the back edge the whole cell is cloud top, getting
slightly lilac towards the bottom, which is cut off straight (it carries on
below the screen). The **left and right ends are rounded, puffy cloud
ends**, curling under, filling the cell edge to edge (about 6 px padding),
so that where two clouds overlap they read as one cloud tucked against the
next, and at a gap they plainly end with open sky between. Vary the six:
puff sizes, a few little wisps on top, one or two with a faint rainbow
glint; no objects, characters, shadows or text. The billows can be clearly
lumpy (that's the point) but keep any single lump under about 20 px tall so
dolls' feet still sit on the top.

In the same commit add `"floor"` to the `clouds` track's `art` list in
`tracks.js`; the game then draws each cloud from a random cell, stretched to
its width (about 430–670 px), instead of the code shapes. If the back edge
sits elsewhere than y = 40, set `CLOUD_FLOOR_ART_TOP` in `game.js` to match.

Acceptance: race Cloud Kingdom (or the workbench on Cloud Kingdom): the
floor reads as separate soft clouds one after another, steps between them
look natural, dolls' feet sit on the tops, and each gap looks like a hole
between two clouds.

## 22. Delivered: Moon Base laser trigger

Moon Base's EMP is LASER: lasers zap everyone in range. Its pickup today
(E14, a red console button under a flip-up cover) doesn't say "lasers".

| # | File | Size | What |
| --- | --- | --- | --- |
| LZ1 | `assets/tracks/space/powerups.webp` | cell 2 only (x 512–767) | **Laser guns round a button**: a big round red push-button in the middle of a small silver-and-white space console, with four chunky toy-like ray guns mounted on it pointing **outward** (left, right and two up at angles), glowing tips. Same style, size and padding as the other cells; keep the other four cells pixel-identical. |

Acceptance: race Moon Base (or the workbench on Moon Base): the LASER pickup
reads as laser guns round a button at its in-game size (about 68 px).

## 23. Art delivered: moon boots to wear in every pose

With MOON BOOTS on (Moon Base's jump pickup) a doll's jumping pose already
shows her in big white moon boots (actions sheet, row 3 cell 3). In every
other pose the game will now draw a moon boot over each foot, at the foot's
measured position and angle (`feet.js`, from `tools/dolls/measure_feet.py`).
It needs the boot, **matching the boots in that jumping pose** (see
`assets/doll_barbie_actions.webp`, the bottom-right cell): chunky, padded,
glossy white moon boots with a flat grey rubber sole and a soft cuff.

| # | File | Size | What |
| --- | --- | --- | --- |
| MB1 | `assets/moon_boot_sprites.webp` | 768×256 (3 cells of 256), alpha | One moon boot as **worn**, three views: (1) **side view, toe pointing right**; (2) **three-quarter view**, toe pointing towards us and to the right (about halfway between side and front: the dolls' feet are most often like this); (3) **front view**, toe towards us. |

The boots are on the dolls' feet, so **don't show the opening at the top**:
the cuff is closed off (a soft rounded padded top, as if the leg goes in
behind it), never a visible hole or inside lining. Each cell: the sole's
bottom centre at **(128, 244)**, sole flat and level; the boot about 150 px
wide in the side view (about 130 px in three-quarter, 110 px in front) and
about 170 px tall including the cuff. No leg, shadow or text. The game picks
the view nearest each foot's measured shape, scales the boot to the foot and
tilts it to the foot's angle.

Acceptance: on Moon Base (or the workbench on Moon Base) take MOON BOOTS:
standing, running, pushing, falling back and landing, both boots cover the
feet in the same boots as the jumping pose, facing the right way.


CL1/LZ1 delivered: six pastel cloud-floor cells at2304×640 with transparent
rounded ends and back edge40; actual overlapping steps, open gaps, doll feet
and right-to-left scrolling reviewed. Laser trigger has four outward ray guns
and a central red button; other four decoded pickup cells remain identical.
36 unit and34 silent browser checks passed. Sources/prompts/proofs:
`tools/tracks/cloud-floor/` and `tools/effects/moon-equipment/`.
MB1 revised art delivered:768×256, side/three-quarter/front views, closed padded cuff tops, no visible openings. Soles at(128,244), widths150/130/110, height170. Runtime view selection/registration is left to the gameplay agent per the owner. CL1 now uses the updated fully billowy cloud surface brief; the earlier smooth floor was superseded before publishing.

CL2 art delivered:128×128 soft white-lilac cloud puff, registered in the
Cloud Kingdom art list, source/prompt/report in `tools/tracks/cloud-floor/`.

CL1, LZ1 and MB1 checked in game: the billowy floor clouds step and dome
naturally with dolls standing, bouncing and sinking on them, and each gap
reads as a hole (the sky painted in it now runs under the clouds' rounded
ends and fades in at the top, so there's no straight edge). The laser
trigger reads at pickup size (Moon Base's own `powerupArtVersion` is now
honoured, so the new sheet isn't cached over). The moon boots are
registered (`moon_boot` in TRACK_SHARED_ART) and cover both feet in
standing, running, crouching and landing poses, both facings, with closed
cuffs matching the jump pose's boots.

CL2 retired by the owner's direction: rather than a cloud over sunk feet,
the floor's own clouds are painted back over them below the surface with a
feathered edge (game-terrain.js drawCloudSink), so the feet sink into the
cloud under them. `puff.webp` is kept but no longer loaded.

## 25. Delivered: Beach seaweed puddle

The Beach's oil pickup is SEAWEED, but its cell (an R-series puddle redo)
reads as a plain blue water puddle.

| # | File | Size | What |
| --- | --- | --- | --- |
| SW1 | `assets/tracks/beach/powerups.webp` | cell 3 only (x 768–1023) | **A slippery patch of seaweed** lying flat on the sand, seen from a little above like the other tracks' puddles: a tangle of glossy dark-green and olive kelp ribbons and bladder-wrack with a wet sheen and a thin film of seawater round it, so it plainly looks slippery and not like plain water. No other objects; same style, size and flat-lying angle as the other puddle cells; keep the other four cells pixel-identical. In the same commit bump the beach track's `powerupArtVersion` in `tracks.js` (add one if it has none). |

Acceptance: race the Beach: the SEAWEED pickup reads as a slippery
seaweed patch lying on the sand at its in-game size, and a doll slides on
it as before.

**SW2 art delivered (integration separate).** SW1 is lovely close up, but at its
in-game size (about 55 px across) the tall, bushy tangle reads as a little
dark shrub sitting on the sand, not something slippery lying flat.

**SW2 checked in game:** at race size it reads as flat kelp ribbons in a shiny pool, a wet slippery spill. Accepted.

| # | File | Size | What |
| --- | --- | --- | --- |
| SW2 | `assets/tracks/beach/powerups.webp` | cell 3 only (x 768–1023) | The same slippery seaweed, redrawn **flat and wide**: a low, spread-out mat of glossy green and olive kelp ribbons lying flat on the sand, much wider than tall (filling most of the cell's width, like the other tracks' puddles), with few bladders and no height or bushy clumps, sitting in a **bright, shiny pool of seawater** that shows round its edges with white glints, so even small it reads as a wet, slippery spill. Lighter, brighter greens than SW1, so it stands out against the sand. Keep the other four cells pixel-identical and bump the beach track's `powerupArtVersion` in `tracks.js`. |

Acceptance as SW1, judged at the size it's drawn in a race.

SW2 sources, exact built-in prompt, decoded-cell checks and55px review:
`tools/tracks/beach-seaweed-v2/`. Other atlas cells remain unchanged.
Per owner, the gameplay agent handles the Beach cache-version bump.

## 26. Art delivered: more moon boot angles

MB1's side, three-quarter and front views cover standing and planted feet.
Running, kicking back, tumbling and sitting on a mount show feet at angles
those can't match, so feet peek out round the boots. Add the same boot
(MB1's look exactly: glossy white padded boot, grey sole, closed cuff with
no opening) in four more views, extending the sheet.

| # | File | Size | What |
| --- | --- | --- | --- |
| MB2 | `assets/moon_boot_sprites.webp` | 1792×256 (7 cells of 256), alpha | Cells 1–3 unchanged (MB1: side toe right, three-quarter, front). Add: (4) **back three-quarter**, toe pointing away from us and to the right, heel and back of the cuff towards us (a back foot kicked up behind her mid-stride); (5) **sole view**, the bottom of the boot facing us, toe up, the grey tread and a little of the white sides showing (soles towards us as she tumbles backwards); (6) **pointed toe**, side view with the foot stretched down at the ankle, toe pointing down and right, as when a foot trails behind or dangles from a saddle; (7) **side view seen from the inside**, toe pointing **left** (the far foot when she runs, so the pair don't look identical). |

Same rules as MB1: the sole's bottom centre (or, for the sole view, the
heel's bottom edge centre) at **(128, 244)**; boot about 170 px tall and
150 px across its longest side; no leg, shadow or text; cuff closed. In the
same commit nothing else need change: the game picks the view per foot
from the measured feet (`feet.js`), as described in game-draw.js
drawMoonBootsOn.

Acceptance: on Moon Base with MOON BOOTS, running (both feet, front and
kicked back), knocked back, landing and riding, both boots cover the feet
and look like the jump pose's boots from the angle the foot is seen at.

**Integrated and checked in game:** drawMoonBootsOn now picks the view per
foot (game-draw.js moonBootView): back three-quarter for a foot kicked up
behind her, pointed toe for a foot pointing well down, the sole for feet
turned towards us as she's knocked over, the inside view (mirrored) for
her planted back foot. Checked running, crouching, knocked over and
standing across Barbie, Felicity, Lily, Juliette, Mira, Whirlpool and
Kaya: the boots cover the feet. Mira's knee-high boots still show above
the moon boots' cuffs, which reads as boots over boots.

## 27. Art delivered: fairy wings

On Fairy Woods a mount pickup can be **fairy wings**. They work like the
broomstick (she runs with them and flies up with jump), but nothing is
ridden: the wings are drawn on her back, behind her, over every doll's own
poses. They flutter a little while she stands or runs and beat properly
while she flies. Until this sheet is in, the game draws plain see-through
stand-in wings.

| # | File | Size | What |
| --- | --- | --- | --- |
| FW1 | `assets/fairy_wings_sprites.webp` | 3072×1024 (2 rows of 6 cells of 512), alpha | One pair of delicate fairy wings in **two views**, one per row. **Row 1, side view**, as on a girl facing right and seen side on (running): both wings rise up and back (to the left) from one root point, the near wing in front of and a little lower than the far one. **Row 2, three-quarter view**, as on a girl facing right but turned half towards us (most of the dolls' standing and jumping poses are between facing us and facing right): we see more of her back, so the near wing spreads up and back to the left, broad and open towards us, and the far wing shows above and behind her far (right) shoulder, smaller and foreshortened. Both rows have the same six cells (below), so every flutter and wingbeat frame exists in both views. Gauzy and see-through (partly transparent, the background shows through), iridescent pink, lilac and pale aqua with fine darker veins and a soft glittery edge, like dragonfly or butterfly-shaped fairy wings: an upper and a lower lobe each. Cells: (1) **resting**, half open, swept back; (2) the same a touch more open (cells 1–2 alternate for the gentle flutter while she stands or runs); (3–6) **one full wingbeat** for flying: (3) raised high, (4) level and spread wide, (5) swept down below the root, (6) coming back up (between 5 and 3). |

**Owner addition:** also deliver a separate **single wing, seen side-on**,
which the renderer can mirror to make a left/right pair for idle dolls
whose bodies face almost straight towards the camera. This is additional
to both FW1 views above, not a replacement. Use
`assets/fairy_wing_single_sprites.webp`, six 512px cells (3072×512, alpha),
the same six phases, colours, material, scale and root (330, 300).
Draw only one wing with its upper and lower lobes; no second wing or body.
Check a mirrored pair behind a nearly front-facing idle doll before delivery.

Rules: the root (where the wings join her back) at **(330, 300)** in every
cell of both rows, so cells and views swap without the wings jumping; the pair about 340 px tall
at rest and never reaching the cell's edges; no girl, body, shadow,
sparkles floating off them, or text. Same colours and wing shapes in every
cell; only their spread and angle change.

Acceptance: on Fairy Woods with the WINGS pickup, standing, running and
flying, the wings sit on her back for every doll and look right for the way
she's turned (side on running, three-quarter standing and jumping),
flutter softly on the ground and beat while she flies, and the pickup shows
the resting wings. Winged trolls (half of Fairy Woods' trolls) wear the
same sheet's three-quarter row.

Wing art delivered: both paired views plus the additional mirrorable single
wing; six phases each, calibrated transparent membranes and fixed330,300
joints. Source, built-in prompts, rebuild and all-doll review:
`tools/mounts/fairy-wings/`. Owner requests art-only delivery; the gameplay
agent handles registration, view selection and live acceptance.

**In the game and checked (FW1):** listed in `TRACK_SHARED_ART`; the side row for running and knocked-about poses, three-quarter for jumping, actions poses and trolls, and the single wing as a mirrored pair (85% size) for standing poses facing us, rooted on the measured middle of her back. Placement checked on six dolls in every pose and flying. FW1 stays as the pastel wings for the bright Fairy board (where wings turn up once they've been found in Fairy Woods that day); FW2 above is Fairy Woods' own.

**Open: FW2 twilight re-render (checked in game on Fairy Woods).** The
wings belong to **Fairy Woods** (`woods`), a dusky twilight woodland lit by
warm lanterns, glowing purple and pink toadstools and fireflies. Against
it FW1's pale, cool, very see-through pastels wash out; on a small doll at
race size they nearly vanish. The shapes, layout and wingbeat are right.

| # | File | Size | What |
| --- | --- | --- | --- |
| FW2 | **new files** `assets/fairy_wings_twilight_sprites.webp` and `assets/fairy_wing_single_twilight_sprites.webp` (keep FW1's files as they are: the bright Fairy board keeps the pastel wings) | as FW1 (3072×1024 two rows, and 3072×512) | The same wings, cell for cell (same shapes, spread in each of the six phases, views and root (330, 300)), repainted for a twilight fairy wood: **luminous**, as if lit from within like the board's glowing toadstools: richer violet, magenta and teal, a soft glowing rim and glowing veins, a faint warm-gold shimmer near the root, and more opaque (about 75%, so they hold their colour against dark foliage), with the background still faintly showing through the membranes. No sparkles floating off them, no halo beyond the wing edge. |

Acceptance: on Fairy Woods at race size, the wings read clearly on every
doll (dark-haired ones included) and on the winged trolls, and look like
they belong with the glowing toadstools and fireflies. List both as
`"fairy_wings_twilight"` and `"fairy_wing_single_twilight"` in
`TRACK_SHARED_ART`; the game then uses them on Fairy Woods.

## 28. Art delivered: flying troll

Half of Fairy Woods' trolls wear fairy wings and fly up after girls in the
air. Today they fly in their walking poses; give the troll real flying
poses. The game draws the wings itself (behind his back), so **no wings in
these frames**.

| # | File | Size | What |
| --- | --- | --- | --- |
| TF1 | `assets/troll_flying_sprites.webp` | 1254×418 (3 cells of 418), alpha | The troll from `assets/monster_sprites.webp` (same painted, slightly photoreal style, colours, face and build; grumpy and funny, not scary), facing right, flying: (1) **swooping forward**, body leaning far forward, nearly level, both arms stretched out ahead with grabbing hands, legs trailing out behind; (2) the same swoop a beat later, arms pulled back a little and legs kicked, so cells 1–2 alternate as he flies along; (3) **hovering**, upright and a little hunched, arms reaching forward and up to grab, legs dangling loosely below with toes pointed down. |

Rules: the same scale as the troll sheet (a 418 cell, the troll about as
big as in his walk cells); his **hips** at the same place in each cell as
in the troll's walking cells (about x 205, y 250), so swapping between
walking and flying doesn't make him jump; nothing touching a cell edge; no
wings, shadow, ground or text. In the same commit add `"troll_flying"` to
`TRACK_SHARED_ART` in `tracks.js`.

Acceptance: on Fairy Woods, a winged troll chasing a flier swoops along in
cells 1–2 and hovers in cell 3 when he's level with her, with the wings on
his back, and is back in his walk cells once he's landed.

SW1 delivered: glossy dark-green/olive seaweed ribbons and wrack in a thin
water film, same flat puddle angle. Cells0,1,2,4 remain decoded-RGBA identical;
Beach cache version bumped. Native/68px and light/dark alpha reviewed.
Source, exact built-in ImageGen prompt and report: `tools/tracks/beach-seaweed/`.

MB2 art delivered: seven256px boot cells at1792×256; original three cells
remain decoded-RGBA pixel-identical. Added back-quarter, grey tread sole,
extended pointed toe and inside-left views with sole/heel anchors128,244.
Source, prompts and export report: `tools/effects/boot-angles/`.

TF1 art delivered: `tools/effects/flying-troll/` contains source, prompts,
scale/hip calibration and native-size comparison. No wings or ground shadow
are baked in. Per owner, the gameplay agent handles registration and use.

**In the game and checked:** listed in `TRACK_SHARED_ART`; a winged troll swoops (cells 1–2) after a flier and hovers (cell 3) once he's level with her, wings on his back. About the size of the walking troll, which reads right next to him and the dolls.

## 29. Delivered: cloud ledge grab (every doll)

On Cloud Kingdom a girl who falls into a gap can press towards the cloud
to catch its edge and climb back up. She catches it like hugging a big
pillow, not hanging straight down from her fingers. Until these sheets are
in, the game borrows her other poses.

| # | File | Size | What |
| --- | --- | --- | --- |
| LG1 | `assets/doll_<key>_ledge.webp` for every key in `ACTION_SHEETS` (`doll-art.js`: hermione, lily, mira, whirlpool, claudia-v2, kaya, amanda, penelope, rumi-v2, juliette, barbie, cinnamon, felicity, luna, marisol-v2) | 1254×418 (3 cells of 418), alpha | Facing right, towards a soft cloud edge that is **not drawn**: imagine the cloud's flat top at **y 230** and its rounded front corner at **x 300**, with the cloud filling everything right of and below that corner. (1) **Hug hold:** both arms wrapped over the top of the cloud edge as if hugging a big pillow, forearms and hands resting on the top (right of x 300, along y 230), her cheek or chin resting on it, chest against the cloud's side, body hanging a little slanted below with legs dangling and feet loose, a determined, slightly worried face. (2) **Climbing up:** pulling herself up, one knee hooked over onto the top (on y 230 just right of the corner), hips level with the top, arms pushing down on it. (3) **Back on top:** kneeling on the cloud top just right of the corner (knees and shins on y 230), body upright, about to stand, a relieved smile. |
| LG2 | `assets/masks/<key>_ledge_mask.webp` | 1254×418 | Its outfit mask, made like `<key>_actions_mask.webp`. |

**Owner-approved geometry revision:** preserve normal doll size and record
a separate ledge contact anchor for each pose. The original fixed y230 is
superseded: kneeling needs a lower anchor, while a dangling body needs room
below its forearms. The renderer aligns each recorded anchor to the same
world ledge. Gameplay integration is left to the other agent.

She must match her sprite sheet exactly: the same outfit, hair, shoes and
accessories, at the same scale as her sheet (her whole figure in cell 3
about as tall as her crouch). Nothing touches a cell edge; no cloud,
shadow or text. Add the key to a new `LEDGE_SHEETS` list in `doll-art.js`
when both land (the game uses a doll's ledge sheet only once she's listed).

Acceptance: on Cloud Kingdom, run off a gap's edge and press back towards
it: she catches the edge in the hug hold, with her arms on the cloud top
and the rest of her hanging in the gap, then climbs up (cell 2) and is back
on top (cell 3) before she stands, for every doll and outfit.


LG1/LG2 first art batch delivered: Hermione, Mira, Claudia-v2, Amanda and
Penelope. Per-pose contact anchors, source art, exact built-in prompts and
mask/identity reviews are under `tools/dolls/ledge/`; gameplay integration
and registration remain with the other agent per owner.

LG1/LG2 second art batch delivered: Barbie, Cinnamon, Felicity, Luna and
Marisol-v2. Corrected Cinnamon/Felicity/Marisol have no glasses; Luna keeps
her canonical pink glasses. All five include masks and contact anchors.

LG1/LG2 final art batch delivered: Lily, Whirlpool, Kaya, Rumi-v2 and
Juliette. All15 dolls now have all three poses, matching outfit masks and
per-pose contact anchors. No cloud is baked into the sprites. Juliette
retains her moon purse; hair/skin/accessories are protected in the masks.
Gameplay registration and live acceptance are left to the integration agent.

**In the game and checked (all fifteen dolls):** `LEDGE_SHEETS`, `LEDGE_ART_VERSION` and `LEDGE_ANCHORS` (from the anchors JSON) in `doll-art.js`, outfits through `DollOutfits` ("ledge"). The hug hold, climb and kneel sit on the cloud edge.
