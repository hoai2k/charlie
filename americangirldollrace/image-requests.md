# American Girl Doll Race: image requests

This brief is for whoever makes art for the race (a person or an image agent).
It lists the images needed for two new screens:

1. **A title screen.** Today the game opens straight onto the character menu.
2. **A redesigned join and character-select screen.** It should be controller
   first, with up to 8 players who can drop in at any time.

It also covers the small set of images that dropping in mid-race needs.

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
- [ ] Full-body poses (#2, #3 and #23) share the sprite sheets' 418 frame,
      scale and foot baseline. To check, overlay one on a row-0 frame and make
      sure the feet line up.
- [ ] Nothing important sits outside the 1280×720 safe centre of full-screen
      art.
- [ ] Badges and glyphs stay legible at 50% size.
- [ ] Commit per batch with a message listing the files. If any CSS or JS
      changes, bump the `?v=` string in `index.html`.
