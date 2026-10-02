# Doll Puppets: image requests

Completed 2026-10-02: all seven requested images are saved at the paths and
sizes below. The Camera thumbnail and dismissible first-play gesture hint
strip are wired into the game. Generated with the built-in image generator;
the final prompt set is recorded in `assets/image-generation-prompts.json`.
Title, selection, and hint layouts were checked at 390×844 and 1280×720.

Reviewed in game on 2026-10-02: all seven images were accepted as delivered,
and no new images are needed right now. One follow-up fix was code only. The
race portraits stop at the waist, so the bobbing title parade now sits
below the screen edge and the cut edge never comes into view.

This brief is for whoever makes art for Doll Puppets (a person or an image
agent). The game now opens on a **title screen** and then a **"Choose your
doll" screen**, before the camera puppet starts. Both screens already work with
CSS styling and the doll portraits borrowed from the race. Each image below
replaces one CSS fallback.

**Nothing here is required for the game to run.** P1 images are picked up
automatically: drop the file at the listed path and it appears on the next load,
with no code change. P2 images need a small code change once they exist.

All paths are relative to `dollpuppets/`.

---

## 1. House rules

| Rule | Detail |
| --- | --- |
| Format | WebP. Use lossless alpha for anything with transparency. Convert with Pillow (`quality=82-90, method=6`). Don't commit large PNGs (see the repo `CLAUDE.md`). |
| Location | Put screen art in `assets/ui/` and card portraits in `assets/portraits/`. Use lowercase snake_case names. |
| Style | Match `../americangirldollrace/assets/ui/logo.webp` and the scene backgrounds in `assets/backgrounds/`: bright, soft-painted storybook scenery with chunky, toy-like lettering. The characters must look like **these exact dolls**. Use each doll's `assets/<key>/reference.webp` (face) and `../americangirldollrace/assets/portraits/<key>.webp` (outfit) as identity references. |
| Audience | A 2nd-grader on an iPad or laptop, holding it at arm's length. Use big, simple shapes. Don't bake text into images, except the logo. |
| Transparency | Logos and portraits need clean alpha with no white halos. Check them on both the purple card colour and the light sky. |

### Roster

| Key | Name | Card colour | Portrait today |
| --- | --- | --- | --- |
| `rumi` | Rumi | `#7b3bb8` | race portrait |
| `juliette` | Juliette | `#c58a28` | race portrait |
| `marisol` | Marisol | `#f25ca5` | race portrait |
| `kaya` | Kaya | `#9a6426` | race portrait |
| `lily` | Lily | `#d33b2f` | race portrait |
| `whirlpool` | Whirlpool | `#5a3a86` | race portrait |
| `claudia` | Claudia | `#25897f` | race portrait |
| `amanda` | Amanda | `#263d8f` | race portrait |
| `troll` | Troll | `#5f7a3a` | **head only**: needs a portrait (#3) |
| `kpop` | K-Pop | `#d65fb4` | **head only**: needs a portrait (#4) |

---

## 2. The screens

### Title screen

```
┌──────────────────────────────────────────────┐
│               [ LOGO: Doll Puppets ]          │
│        "Make a face, your doll makes it too!" │
│                                              │
│              ( Tap to start )                │
│   ▄▄  ▄▄  ▄▄  ▄▄  ▄▄  ▄▄  ▄▄  ▄▄  ← bobbing  │
│   doll portraits peek up from the bottom      │
└──────────────────────────────────────────────┘
```

The background today is the blurred farm scene with a spinning sunburst behind
the logo. The logo today is CSS text ("Doll" in gold, "Puppets" in pink).

### Choose-your-doll screen

The live puppet is drawn behind this screen and switches as each card is
tapped. A cream tray at the bottom holds a row of portrait cards, a row of scene
thumbnails and a big pink **Play!** button. A purple "Choose your doll" pill
sits at the top.

---

## 3. Requests, in priority order

Sizes are final pixel sizes. The game scales art down but never up.

### P1: picked up automatically

| # | File | Size | What |
| --- | --- | --- | --- |
| 1 | `assets/ui/logo.webp` | 1100×420, alpha | **"Doll Puppets" logo.** It's a sister logo to the race logo, in the same chunky storybook lettering, gold outline, ribbon banner and stars. Swap the race's horse and horseshoe for a puppet motif, such as marionette strings and a wooden cross-bar hanging from the top of the letters, or a small theatre curtain swag. Use a pink-and-gold palette (`#e04f97`, `#ffc94a`, outline `#2b1838`). Keep it wide, because it's shown up to 760px wide over a busy background. |
| 2 | `assets/ui/title_background.webp` | 2172×724, no alpha | **Title key art: a puppet-show stage.** Paint a storybook puppet theatre with red velvet curtains pulled open, a warm footlight glow and bunting. Set it outdoors on the farm meadow from `assets/backgrounds/farm.webp`, so it ties to the default scene. **Leave the centre stage empty and fairly plain**, because the logo sits in the top third and the doll portraits fill the bottom 35%. Keep the important content in the middle 1280×720 and use the rest as bleed. |
| 3 | `assets/portraits/troll.webp` | 320×400, alpha | **Troll card portrait.** Show the troll from the waist up, facing three-quarters toward the viewer. It should be a little goofy rather than scary, because this is a kids' game. Keep the face from `assets/troll/reference.webp`. Use a transparent background, and have the head fill the top 55%, matching the race portraits. |
| 4 | `assets/portraits/kpop.webp` | 320×400, alpha | **K-Pop card portrait.** Use the same framing as #3, and keep the face and hair from `assets/kpop/reference.webp`. Give her a stage outfit consistent with her `body_pose_*.webp` sprites. |

### P2: needs a small code change after it lands

| # | File | Size | What |
| --- | --- | --- | --- |
| 5 | `assets/ui/scene_camera.webp` | 176×104, no alpha | Thumbnail for the **Camera** scene, which shows the player's real camera instead of a painted background. A friendly cartoon camera or a mirror with sparkles would work. Today it's a 📷 emoji on a dark purple tile. |
| 6 | `assets/ui/try_these.webp` | 6 cells × 160×160, one row, alpha | **"Try this!" sticker icons**, for a hint strip shown the first time someone plays. In order: a big smile, a laugh (head back), a kiss or pucker (with a heart), tongue out, a surprised "O" mouth, and making a heart with the hands. Draw each one as a cute cartoon face on a round sticker with a white die-cut border. These match the gestures the game already reacts to. |
| 7 | `favicon.png` (replace) | 128×128 | A new icon matching the logo, such as Rumi's face with puppet strings. It's also used on the library landing page card. |

---

## 4. Checking your work

1. Serve the repo root (`python3 -m http.server`), then open
   `http://localhost:8000/dollpuppets/`.
2. The title screen should show your logo and background (#1, #2). Tap it, and
   the Troll and K-Pop cards should show full portraits (#3, #4).
3. Check both a phone-portrait window (about 390×844) and a laptop window
   (1280×720).
