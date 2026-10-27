# Treasure Dig art generation record

Generated with built-in imagegen on 2026-10-05. Scene files are opaque RGB WebP; all fourteen prop files are lossless RGBA WebP at the requested target canvas sizes. Sources and exact prompts are recorded below. The final background source is an image edit of the initial background to lower the edge decoration; the towel is still somewhat above its requested y≈900 position, so exact intake measurements are noted.

| Key | Output | Size | ImageGen source |
|---|---|---:|---|
| `bg/treasure-dig` | `party/assets/art/bg/treasure-dig.webp` | 1920×1080 RGB | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-36758ef3-1b59-48e0-a320-bd784320cdd0.png` |
| `thumb/treasure-dig` | `party/assets/art/thumb/treasure-dig.webp` | 800×500 RGB | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-b617cf2d-ba25-4166-9ec0-643c94ffce4f.png` |
| `prop/treasure-shell` | `party/assets/art/prop/treasure-shell.webp` | 192×192 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-bfec4290-5366-4078-9cfb-d2b93a1a0267.png` |
| `prop/treasure-pearl` | `party/assets/art/prop/treasure-pearl.webp` | 192×192 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-c47db936-0792-47bb-afe6-a758b6dac894.png` |
| `prop/treasure-gem` | `party/assets/art/prop/treasure-gem.webp` | 192×192 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-b60ed0f8-9296-4b16-a879-13e6bf258781.png` |
| `prop/treasure-coins` | `party/assets/art/prop/treasure-coins.webp` | 192×192 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-fcdd69ee-83a2-4ccc-8058-0574cbd8a85f.png` |
| `prop/treasure-crown` | `party/assets/art/prop/treasure-crown.webp` | 192×192 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-e63dc604-d2e1-4620-b63b-724d18f79ae1.png` |
| `prop/treasure-chest` | `party/assets/art/prop/treasure-chest.webp` | 300×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-ee15266f-f0b0-4f8d-a75e-60a86adf41ad.png` |
| `prop/treasure-chest-open` | `party/assets/art/prop/treasure-chest-open.webp` | 300×300 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-ba8a1625-b379-4d26-845f-ffa89c577959.png` |
| `prop/shell-detector` | `party/assets/art/prop/shell-detector.webp` | 128×128 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-de27f015-753d-4835-bc11-7514dfc0eecc.png` |
| `prop/beach-crab` | `party/assets/art/prop/beach-crab.webp` | 192×192 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-bfd5acf0-1309-4827-a370-b62d4b2d43a9.png` |
| `prop/beach-seaweed` | `party/assets/art/prop/beach-seaweed.webp` | 160×160 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-0c67a86c-435f-4c65-b50d-1f87eb1a1783.png` |
| `prop/beach-sock` | `party/assets/art/prop/beach-sock.webp` | 160×160 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-916aa613-da98-46f1-b280-23353f654b3a.png` |
| `prop/beach-duck` | `party/assets/art/prop/beach-duck.webp` | 160×160 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-f6af3ba5-9f13-4e31-8ade-ec4b6954d12e.png` |
| `prop/beach-starfish` | `party/assets/art/prop/beach-starfish.webp` | 128×128 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-25925c6b-5831-4795-b96a-24ff1d133b40.png` |
| `prop/sand-hole` | `party/assets/art/prop/sand-hole.webp` | 256×128 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-e54f4fd4-b301-46df-ae18-b92008fb42f8.png` |

## Exact prompts

### `bg/treasure-dig` (initial source, then image-edited)

> Opaque full-screen 16:9 background, intended for exact 1920x1080 export, children's Treasure Dig game. Strict beach bands: turquoise sea from y=0 to y=262, with soft horizontal white wave lines; a scalloped white foam edge exactly around y=262; a darker wet-sand band from y=262 to y=330; warm golden dry sand begins y=330 and fills below. Keep the top 200 px calm. Most important: keep x=130–1790 and y=350–1030 as plain low-detail dry sand with faint wind ripples only, no objects. Decor only on extreme far left/right borders: partial sandcastle on left around y=640, small folded towel on left around y=900, folded towel on right around y=640, striped beach umbrella in bottom-right corner. Keep bottom-left 120x120 empty, and no tall decor above y=720. No shells, treasure, holes, people, or text. Gentle high 3/4 top-down view, bright sunny children's illustration, bold navy #24163f outlines, soft cel shading.

The source above was edited with this prompt:

> Edit this beach background while preserving its sea, scalloped foam boundary, wet-sand band, colors, and plain central play field. Correct only the edge decorations to match these screen coordinates on a 1920x1080 canvas: sandcastle on far left centered around y=640; small blue-and-white folded beach towel at far left around y=900; small red-and-white folded towel at far right around y=640; striped beach umbrella tucked into bottom-right corner, mostly in the bottom-right 250x260 area. Keep the bottom-left 120x120 plain. Leave all decor off the middle x=130–1790, y=350–1030 play area. Keep sea top to y≈262, foam line at y≈262, wet sand to y≈330, dry sand below. No text or new objects.

The final source was edited once more:

> Keep all beach layers, colors, and other decorations exactly as they are. Move only the blue-and-white folded beach towel on the far left down to the bottom-left edge so its center is at y=900 of a 1920x1080 frame. Do not leave a towel at the current y≈700 position. Preserve the lower-left corner play-safe area: towel must stay within x=0–120 and y=850–960, leaving the bottom-left 120x120 (x=0–120,y=960–1080) plain. Keep the central sand clear. No new objects or text.

### `thumb/treasure-dig`

> Opaque exact 800x500 landscape game-select illustration for a children's Treasure Dig beach game, no text. Centre a half-dug friendly wooden treasure chest glowing gold with gold coins flying out, a pink scallop-shell treasure detector gadget with small antenna beaming concentric hot ripple rings, a cute orange crab peeking from a dark sand hole; turquoise sea and foam visible only across the top background. Bold navy #24163f outlines, warm bright candy colours, soft cel shading, polished game art; keep subjects fully visible and centred with clear margins.

### `prop/treasure-shell`

> Single isolated centered prop, transparent RGBA background, square 192x192 canvas, no text. Peach-and-pink scallop seashell viewed from a gentle front three-quarter angle, ridged fan shell with soft pearly shine, friendly collectible look. Deep navy #24163f outline, soft cel shading, bright candy colours, full silhouette visible with transparent breathing margin.

### `prop/treasure-pearl`

> Single isolated centered prop, transparent RGBA background, square 192x192 canvas, no text. A small open lilac clam shell in a gentle front three-quarter view, two ridged lavender shell halves holding one large glowing white pearl. Pearl and shell fully visible; deep navy #24163f outline, soft cel shading, bright candy colours, transparent breathing margin.

### `prop/treasure-gem`

> Single isolated centered prop, transparent RGBA background, square 192x192 canvas, no text. A brilliant-cut sky-blue gemstone with a flat table facet on top, crisp geometric facets and a few bright white glints. Slight front three-quarter view; deep navy #24163f outline, soft cel shading, polished children's game collectible, full gem visible with transparent breathing margin.

### `prop/treasure-coins`

> Single isolated centered prop, transparent RGBA background, square 192x192 canvas, no text. A little stack of shiny gold coins in a gentle front three-quarter view, with one coin standing upright at the front showing a simple embossed star (not letters or numbers). Deep navy #24163f outline, warm gold gleams, soft cel shading, full stack visible with transparent breathing margin.

### `prop/treasure-crown`

> Single isolated centered prop, transparent RGBA background, square 192x192 canvas, no text. A sparkly golden royal crown just dug up, friendly rounded points, one large pink jewel at the center, a few little grains of sand clinging to its base, extra shiny highlights. Gentle front three-quarter view, deep navy #24163f outline, bright cel shading, full crown visible with transparent breathing margin.

### `prop/treasure-chest`

> Single isolated prop on transparent RGBA background, wide 300x240 canvas, no text. A friendly closed wooden treasure chest seen from front three-quarter view, rounded honey-brown plank lid, broad gold bands, centered gold lock, visible wood grain, not scary. Bottom-centre anchored: chest base rests exactly at the bottom edge. Deep navy #24163f outline, soft cel shading, entire chest visible with transparent margin.

### `prop/treasure-chest-open`

> Single isolated prop on transparent RGBA background, square 300x300 canvas, no text. The same friendly honey-brown wooden treasure chest with gold bands and lock, now open with lid flipped up; heaped with shiny gold coins and a pearl necklace, warm golden glow inside. Front three-quarter view. Bottom-centre anchored: chest base rests exactly at the bottom edge. Deep navy #24163f outline, soft cel shading, whole open chest visible with transparent margin.

### `prop/shell-detector`

> Single isolated centered prop, transparent RGBA background, square 128x128 canvas, no text. Cute treasure detector gadget shaped like a pink scallop shell, with a small curly antenna and ball tip rising from top and a large plain smooth rounded lens dome at center. Keep center lens blank and unobstructed so code can draw a light on it. Deep navy #24163f outline, soft cel shading, transparent margin.

### `prop/beach-crab`

> Single isolated centered prop, transparent RGBA background, square 192x192 canvas, no text. A round friendly red-orange crab facing front, two eyes on short stalks, big cheerful smile, rosy cheeks and both claws raised in a welcoming pose; cute not scary. Deep navy #24163f outline, soft cel shading, full crab silhouette visible with transparent breathing margin.

### `prop/beach-seaweed`

> Single isolated centered prop, transparent RGBA background, square 160x160 canvas, no text. A soft clump of exactly three long wavy green seaweed ribbons, glossy and silly, hanging down from a small connected top bunch like a loose headpiece. Deep navy #24163f outline, soft cel shading, full shape visible with transparent margin.

### `prop/beach-sock`

> Single isolated centered prop, transparent RGBA background, square 160x160 canvas, no text. A single lost ankle sock floating upright with toe pointing down, bold clean stripes in pink, blue and yellow, solid pink toe and cuff. Slight front three-quarter view, deep navy #24163f outline, soft cel shading, whole sock visible with transparent breathing margin.

### `prop/beach-duck`

> Single isolated centered prop, transparent RGBA background, square 160x160 canvas, no text. A sweet yellow rubber duck toy with orange beak and small black eyes, slightly sandy with a few grains and one subtle sand smudge, still clean and cheerful. Gentle front three-quarter view, deep navy #24163f outline, soft cel shading, full duck visible with transparent breathing margin.

### `prop/beach-starfish`

> Single isolated centered prop, transparent RGBA background, square 128x128 canvas, no text. A cheerful bright orange five-armed starfish with tiny pale dots and a small happy face, softly rounded tips and a faint warm glow. Top-down slight angle, deep navy #24163f outline, soft cel shading, entire starfish visible with transparent breathing margin.

### `prop/sand-hole`

> Single isolated wide prop, transparent RGBA background, horizontal 256x128 canvas, no text. A freshly dug oval hole in warm golden beach sand seen from above at a gentle angle: dark damp brown interior with soft depth shading and a small raised rim of scooped sand around it, few tiny sand grains nearby. Hole remains clearly empty with no treasure. Deep navy #24163f outline, soft cel shading, centered with transparent margin.

## Intake measurements and QA

The final opaque background is 1920×1080 RGB, stretched from a 16:9 source. Approximate measured bands: sea/foam boundary y=260–285, wet-sand band to y≈360, dry sand below. The broad gameplay rectangle is clear. The right towel is around y=640; the sandcastle’s main mass spans approximately y=430–710 along the far left. The left folded towel remains higher than requested, roughly y=800–900 after export, despite two image-edit attempts; it stays at the far left and above the bottom-left 120×120 safe area. The umbrella occupies the bottom-right corner. Thumb is 800×500 RGB. All fourteen prop outputs were visually reviewed on a contact sheet and are transparent RGBA WebP with non-empty alpha at their exact requested sizes. Chest bases are bottom-aligned in their canvases.
