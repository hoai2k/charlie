# Fishing Frenzy art generation record

Generated with built-in imagegen on 2026-10-05. Background and thumbnail are opaque RGB WebP; all fourteen props are transparent RGBA WebP at target canvas sizes. Catch props were generated side-on facing right and visually reviewed on a contact sheet. Exact source coordinates for the final pond are measured below; the pond is slightly narrower and deeper than the requested geometry.

| Key | Output | Size | ImageGen source |
|---|---|---:|---|
| `bg/fishing-frenzy` | `party/assets/art/bg/fishing-frenzy.webp` | 1920×1080 RGB | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-4fb91ff6-4591-41ba-bed9-bf8ab13f5724.png` |
| `thumb/fishing-frenzy` | `party/assets/art/thumb/fishing-frenzy.webp` | 800×500 RGB | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-7a2ebb6d-67ca-4d3d-afd0-0ff6fe60cf0b.png` |
| `prop/fishing-sunny` | `party/assets/art/prop/fishing-sunny.webp` | 320×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-aa690d85-f683-439f-a4c5-74f6088bdefa.png` |
| `prop/fishing-darty` | `party/assets/art/prop/fishing-darty.webp` | 320×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-05ff6744-f720-4da3-ba0d-cd2200ca5f66.png` |
| `prop/fishing-puffy` | `party/assets/art/prop/fishing-puffy.webp` | 320×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-b89040f0-465c-44fa-bb31-6981197cf0a1.png` |
| `prop/fishing-bubba` | `party/assets/art/prop/fishing-bubba.webp` | 320×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-1b842a5a-d983-442b-ae2c-3e4892cb83f0.png` |
| `prop/fishing-golden` | `party/assets/art/prop/fishing-golden.webp` | 320×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-b95f6135-7ff6-434b-b64d-f8f69078c20d.png` |
| `prop/fishing-boot` | `party/assets/art/prop/fishing-boot.webp` | 320×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-7338e2e9-ef12-41f0-8007-113e0668b77d.png` |
| `prop/fishing-duck` | `party/assets/art/prop/fishing-duck.webp` | 320×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-b253008a-379f-4a56-b2ef-6914eec59dca.png` |
| `prop/fishing-chest` | `party/assets/art/prop/fishing-chest.webp` | 320×240 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-5eeb939b-02b2-4e7a-b198-9e192456d8fa.png` |
| `prop/fishing-bobber` | `party/assets/art/prop/fishing-bobber.webp` | 96×128 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-83fc48a4-985e-422d-a1ae-7fe4bba51501.png` |
| `prop/fishing-rod` | `party/assets/art/prop/fishing-rod.webp` | 512×64 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-3baa7a73-3732-481f-bbe9-457facb428a1.png` |
| `prop/fishing-basket` | `party/assets/art/prop/fishing-basket.webp` | 240×176 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-20fafe45-3ac3-4b21-9a28-1754a0a8b35c.png` |
| `prop/fishing-lilypad` | `party/assets/art/prop/fishing-lilypad.webp` | 240×160 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-516782d5-a65e-4af2-ae0c-4eea19b53bc2.png` |
| `prop/fishing-lilypad-flower` | `party/assets/art/prop/fishing-lilypad-flower.webp` | 240×160 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-1ed55947-2d34-4b8b-8276-b650bc20d271.png` |
| `prop/fishing-frog` | `party/assets/art/prop/fishing-frog.webp` | 180×152 RGBA | `/Users/hoai/.codex/generated_images/01a10d4b-2696-7c80-a945-30312dc0c01c/exec-64767f2d-7baf-45b9-8198-8c2d2850a37c.png` |

## Exact prompts

### `bg/fishing-frenzy`

The first source (`exec-b43ee5aa-8445-4015-a500-4d34df8dc250.png`) was too wide. The final source was created by an explicit smaller-pond generation and two geometry edits. Full source sequence:

> Opaque full-screen 16:9 background for a children's Fishing Frenzy game, export at exact 1920x1080. Geometry is critical: draw one large clean horizontal oval pond centered exactly at (960,580), with outer water ellipse radii 700 wide by 280 high, so the visible water boundary reaches x=260 and x=1660, y=300 and y=860. Surround that oval with a continuous narrow cream sand-and-pebble rim approximately 40px thick. Keep water entirely inside this oval; clear sparkling turquoise, deeper blue in middle, lighter near shore, faint underwater weeds and tiny stones only. Keep top 0–110 px calm for scoreboard. Outside the rim is plain bright green grass and pale shore, especially bottom shore y≈975 and left/right banks, no docks and no characters. Add only background scenery beyond the pond: soft blue sky and rolling green hills at top with a sparse row of round lollipop trees, a few pink-blossom trees, cattails and reeds on far bank. Do not let scenery overlap the pond. Navy #24163f outlines, soft cel shading, bright candy colours, no text.

Second generation, which was then edited:

> Opaque children's game background, wide 16:9 composition. Draw a meadow around a pond. Exact layout on 1920x1080 canvas: one centered oval pond water spans x=260 to x=1660 only (73% of width) and y=300 to y=860 (52% of height), center (960,580). It must NOT reach the left or right image edges: leave 260 px green shore on each side at the widest point. It must NOT touch the bottom: leave grass below y=860. Add a narrow cream sand and pebble rim about 40 px thick outside the blue water. The pond is a broad flattened oval, not a circle. Keep top 110 px calm; sky, rolling hills and a sparse row of round trees behind pond. Reeds and cattails only on the far top bank, with small patches at left/right banks. Leave bottom shore plain grass for player docks to be drawn later; no docks, characters, props or text. Water is clear sparkling turquoise, deeper blue center, pale at shore, faint underwater weeds. Bright children's illustration, bold navy #24163f outlines, soft cel shading.

First edit:

> Edit the background by shrinking the entire pond plus cream rim to 78% of its current width, keeping it centered. This must create broad visible green grass banks along BOTH left and right edges, each about 250–260 pixels wide in a 1920x1080 frame. Keep pond center at (960,580); its outer rim should span x≈220–1700 and y≈250–910, with the blue water inside and rim about 40 px. Preserve existing sky, hills, trees, grass style, colors and central water appearance. Do not let pond or rim touch image edges. No text or additional objects.

Final vertical edit:

> Keep this background's composition and horizontal pond size. Adjust ONLY the pond vertically: stretch the blue water and cream pebble rim into a taller flattened oval so the water boundary reaches y≈300 at its top and y≈860 at its bottom on a 1920x1080 canvas, centered y≈580. Keep pond horizontal width and its center x=960 unchanged; retain approximately 40 px rim. Preserve grass, hills, trees, and style. Leave bottom shore green and open, and keep pond inside screen edges. No text or new objects.

### `thumb/fishing-frenzy`

> Opaque exact 800x500 landscape game-select illustration for children's Fishing Frenzy, no text and no letters. Centre a shiny golden fish leaping out of a sparkling blue pond in a smooth arc with droplets; a red-and-white fishing bobber with ripple rings nearby; fishing rod reaches in from lower left with visible line; a green lily pad with a pink flower rests on water; add one large yellow comic exclamation burst shape (symbol shape only, no punctuation mark or letters) beside the bobber. Bright friendly game art, bold navy #24163f outlines, soft cel shading, balanced centered composition with clean margins.

### `prop/fishing-sunny`

> Single isolated prop on transparent RGBA background, wide 320x240 canvas. A small round cheerful yellow fish, SIDE VIEW facing RIGHT, nose on the right and tail tip on the left; orange tail and fins, pale cream belly, one big friendly eye, rosy pink cheek and tiny smile. The entire fish silhouette is horizontally centered, nose-to-tail spans nearly full canvas width, breathing margins, no scenery, no text. Deep navy #24163f outline, polished children's game art with soft cel shading.

### `prop/fishing-darty`

> Single isolated prop on transparent RGBA background, wide 320x240 canvas. A slim speedy pink minnow, SIDE VIEW facing RIGHT, nose right and tail tip left, streamlined body, small purple fins, one clean white stripe along the side, quick but cute expression. Fish spans nearly full canvas width and stays centered with transparent breathing margins. No scenery or text. Deep navy #24163f outline, soft cel shading, polished children's game art.

### `prop/fishing-puffy`

> Single isolated prop on transparent RGBA background, wide 320x240 canvas. A shy round purple pufferfish, SIDE VIEW facing RIGHT, nose right and tail tip left, little soft pink nubs along its back, rosy cheeks, one big shy eye and a small timid smile. Fish silhouette spans almost full canvas width, centered with transparent breathing margins. No scenery or text. Deep navy #24163f outline, smooth cel shading, polished children's game art.

### `prop/fishing-bubba`

> Single isolated prop on transparent RGBA background, wide 320x240 canvas. A big chubby teal fish with bright yellow spots, orange fins and pouty pink lips, happy goofy face; SIDE VIEW facing RIGHT, nose right and tail tip left. The fish is broader and plumper than a minnow and fills the canvas width with clear transparent margin. No scenery or text. Deep navy #24163f outline, smooth bright cel shading, polished children's game art.

### `prop/fishing-golden`

> Single isolated prop on transparent RGBA background, wide 320x240 canvas. A shining golden fish with flowing pale-gold fins and tail, sparkling highlights and sweet smile; SIDE VIEW facing RIGHT, nose right and tail tip left. One clear eye, elegant flowing silhouette, fish spans nearly full canvas width with transparent breathing margins. No scenery or text. Deep navy #24163f outline, polished soft cel shading, children's game art.

### `prop/fishing-boot`

> Single isolated prop on transparent RGBA background, wide 320x240 canvas. A silly old blue-grey rain boot seen in SIDE VIEW facing RIGHT, upright with its toe pointing right, a pink patch on the side, and a white daisy with yellow centre growing out of the top. Transparent breathing margin; boot/flower centered. No water, scenery or text. Deep navy #24163f outline, cheerful soft cel shading, polished children's game art.

### `prop/fishing-duck`

> Single isolated prop on transparent RGBA background, wide 320x240 canvas. A classic yellow rubber duck with orange beak and small black eye, SIDE VIEW facing RIGHT, floating level with a gentle curved base, toy shine. Keep entire duck in clear side silhouette, centered with transparent margins. No waterline, scenery or text. Deep navy #24163f outline, cheerful soft cel shading, children's game art.

### `prop/fishing-chest`

> Single isolated prop on transparent RGBA background, wide 320x240 canvas. A small wooden treasure chest seen from the SIDE facing RIGHT, honey-brown planks, gold bands and lock; lid slightly open with warm golden glow and a few coins peeking out. Cute and collectible, not scary. Centered with transparent margins; no water, scenery or text. Deep navy #24163f outline, polished children's game art, soft cel shading.

### `prop/fishing-bobber`

> Single isolated centered prop on transparent RGBA background, tall 96x128 canvas. A classic round fishing bobber, red upper half and white lower half, with a short upright stick ending in a small yellow ball on top; glossy highlight and simple clear silhouette. No waterline, string, scenery or text. Deep navy #24163f outline, soft cel shading, entire bobber visible with transparent margin.

### `prop/fishing-rod`

> Single isolated horizontal prop on transparent RGBA background, very wide 512x64 canvas. A kid's fishing rod laid perfectly straight horizontally: cork butt handle at the LEFT edge, thin white rod with pink bands extending to the RIGHT, tiny pink tip at far right, yellow reel mounted about 18 percent from the left end. Clean side view, full rod fits nearly full canvas width with transparent margin. No hand, line, scenery or text. Deep navy #24163f outline, simple polished cel shading.

### `prop/fishing-basket`

> Single isolated prop on transparent RGBA background, wide 240x176 canvas. A woven wicker fishing basket seen from the FRONT, warm honey-brown weave, open top clearly visible in the upper quarter with a rolled rim, dark empty opening, sturdy rounded base. Centered; no fish, scenery or text. Deep navy #24163f outline, soft cel shading, whole basket visible with transparent margin.

### `prop/fishing-lilypad`

> Single isolated prop on transparent RGBA background, wide 240x160 canvas. A round green lily pad with one wedge-shaped notch, seen from a 3/4 top-down angle; soft light veins radiate from center toward edge, slightly cupped leaf. No flower, frog, water, scenery or text. Deep navy #24163f outline, soft cel shading, whole leaf centered with transparent margin.

### `prop/fishing-lilypad-flower`

> Single isolated prop on transparent RGBA background, wide 240x160 canvas. A green lily pad with one wedge-shaped notch and light radiating veins, same size and 3/4 top-down view, with one pretty pink water-lily flower blooming at its center. No frog, water, scenery or text. Deep navy #24163f outline, soft cel shading, entire pad and flower centered with transparent margin.

### `prop/fishing-frog`

> Single isolated prop on transparent RGBA background, wide 180x152 canvas. A cute little green frog sitting upright facing front, large round eyes, pink cheeks, tiny happy smile, front feet tucked neatly and hind legs folded. No lily pad, water, scenery or text. Deep navy #24163f outline, soft cel shading, full seated frog visible with transparent margin.

## Pond geometry measurements

The selected background source is 1672×941 RGB. Pixel segmentation of the contiguous cyan/blue water surface (excluding cream pebble rim) gives source bounding box x=290..1387, y=255..789. The exported 1920×1080 background uses direct LANCZOS resize, so the actual water is approximately x=333..1592, y=293..905. This differs from the request x=260..1660, y=300..860; the cream rim is outside that box. The final source and measurements are recorded for root intake and physics alignment. Do not assume the pond reaches the requested bounds. Top scoreboard region stays calm and the lower shore is open grass.

## QA

Thumbnail was visually reviewed. All fourteen props were visually reviewed together; fish catches face right, rod butt is at left with the reel near 18% from left, basket opening is visible at top, and frog is bottom-aligned. Every prop is exact-canvas RGBA WebP with nonempty alpha; background and thumb are opaque RGB WebP.

## Shipping pond registration

The consumer maps the measured water bounds (333,293)-(1592,905) in the1920x1080 export onto the physics bounds (260,300)-(1660,860), centered (960,580), radii700x280. Nine contiguous image regions fit the surrounding sky/banks without cropping them. The original generated raster is preserved. Root reviewed live fish/dock alignment without browser warnings or errors.
