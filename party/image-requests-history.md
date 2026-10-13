## Delivered trick-or-treat — 2026-10-13

All 26 keys delivered and checked in game (2026-10-13): door rect, porch light and painted pumpkins aligned to the house art; bucket, jack-in-the-box and finale candy pile resized in code.

### Original request

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

## Delivered duckling-parade — 2026-10-13

All keys delivered and checked in game (2026-10-13): hats/glasses moved onto the art duckling, boot peek and reeds box fixed, HUD uses the art. New key `prop/dp-mushroom` (and optional `prop/duckling-golden`) filed in Re-generation requests.

### Original request

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

## Delivered mermaid-pearls — 2026-10-13

All keys delivered and checked in game (2026-10-13): clams, pearls, octopus, chest, fish and vents line up. Optional new key `prop/mp-ledge` filed in Re-generation requests.

### Original request

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

## Delivered pumpkin-peekaboo — 2026-10-13

All keys delivered and checked in game (2026-10-13): sweets heap on the bucket rim, teasing pumpkin uses pp-pumpkin-4. Optional ring-less witch-cat filed in Re-generation requests.

### Original request

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

## Delivered fairy-flutter — 2026-10-13

All 11 keys delivered and checked in game (2026-10-13): moon and jar sit in the calm top centre with the code-drawn fill inside the glass; happy moon, bees and the four pickups read well.

### Original request

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

## Delivered unicorn-jump — 2026-10-13

All keys delivered and checked in game (2026-10-13): the rider sits on the saddle and the jump art swaps cleanly; sleeping-bunny box enlarged in code; a milky lane wash added because the background is busy (re-generation row filed for `bg/unicorn-jump`).

### Original request

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

## Delivered ghost-giggles — 2026-10-13

All keys delivered and checked in game (2026-10-13): curtains, peeking ghost, ghost colours, trunks and the disco finale line up.

### Original request

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

## Delivered kitten-yarn — 2026-10-13

All keys delivered and checked in game (2026-10-13): basket front/back layering, kittens on the cat-tree platforms, the bed pile and the rug line are right at 1, 4 and 8 players.

### Original request

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

## Delivered Molly art batches — 2026-10-13

Published and checked in actual games: Garden Grow, Wand Shapes, Silly Sock Match, Fairy Hide and Seek, Cupcake Stack, Bubble Pop and Balloon Float. Previously delivered Dance and Freeze remains available by id and for replacement reuse. Latest batch `2ad4cda9`. These assets retain procedural fallbacks; new playable fairy sets remain in production.

### New Molly Party game: cupcake-stack

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


### New Molly Party game: garden-grow

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


### New Molly Party game: dance-freeze

> **REPLACED (2026-10-13):** `dance-freeze` is off the Molly shelf; `sneaky-dance` replaced it and reuses only the rows left below. The other rows moved to history as dropped.


### dance-freeze — Dance & Freeze   (requested by the dance-freeze agent, 2026-10-05, priority: nice-to-have)

Musical statues on a disco stage: while the music plays everyone dances
(stick = dance moves, A = jump-spin); when the record scratches and the lights
go icy blue, everyone FREEZES. Wiggly friends get tickled by a giant feather
(no one is out). Every key below has a procedural fallback that ships today.
House style: navy `#24163f` outlines, soft cel shading, bright candy colours,
no text. Professor Hoot (existing NPC) is the DJ.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `prop/df-disco-ball` | 256×320, transparent | Hangs from the top: anchored top-centre (the string's top), drawn ~170 px | A big sparkly mirror disco ball on a short gold chain, pink and blue reflections |


### New Molly Party game: bubble-pop

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


### New Molly Party game: balloon-float

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


### New Molly Party game: wand-shapes

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


### New Molly Party game: fairy-hide-seek

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


### New Molly Party game: sock-match

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


## Dropped Molly requests: replaced by cheeky games — 2026-10-13

The user asked for some rule-breaking Molly games; these six were taken off the shelf (still playable by id) and their unreused requests dropped. Art already delivered for them stays in the repo.

### New Molly Party game: ladybug-spots


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

### dance-freeze (rows not reused by sneaky-dance)

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
|---|---|---|---|
| `bg/dance-freeze` | 1920×1080, opaque | Full screen. Top ~110 px calm (HUD). The code draws the light-up dance floor tiles from y≈560 to y≈1040 across the full width, the DJ booth at top-centre (x 960, y≈470) and the disco ball at (960, 150) | A sparkly kids' disco party hall: deep purple walls with big rounded arch windows, pink and gold stage curtains at both sides, string lights and paper stars, big speakers at the far left and right, a glossy floor area at the bottom (plain; tiles drawn on top) |
| `thumb/dance-freeze` | 800×500, opaque | Game-select shelf and how-to screen | Two little garden fairies (the existing yellow and purple garden-fairy NPCs, no Charlie Party player characters) on a glowing rainbow disco floor, one frozen in a silly flamingo pose with frosty sparkles, a giant pink feather tickling the other who is giggling, Professor Hoot at a DJ booth and a disco ball above |
| `prop/df-dj-booth` | 560×300, transparent | Bottom-centre at (960, 560), drawn 520 wide; Professor Hoot stands behind it, the code draws the spinning record on top at 35% from the left, 25% from the top | A rounded pastel DJ booth with rainbow light strips on the front, two turntables on top, a heart-shaped speaker grille |
| `prop/df-feather` | 160×420, transparent | Rotates around its quill end (bottom-centre), drawn ~200 px long, wiggles over a player | A huge fluffy pink-and-purple tickle feather with a gold quill |
| `prop/df-snowflake` | 256×256, transparent | Centred, the FREEZE icon in the HUD and over frozen players (60–220 px) | A chunky shiny ice-blue snowflake with a cute face and frosty sparkles |
| `prop/df-music` | 256×256, transparent | Centred, the DANCE icon in the HUD | Two bouncing rainbow music notes with sparkles |

### ballet-butterflies (rows not reused by opposite-ballet)

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
|---|---|---|---|
| `thumb/ballet-butterflies` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A little pink garden fairy in a tutu doing a ballet twirl on a flower stage, Madame Papillon the butterfly-fairy teacher (see `prop/ballet-teacher`) with huge rainbow wings above her (no Charlie Party player characters), colourful butterflies swirling around, petals in the air. Subject centred |

### New Molly Party game: shape-train


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

### puppy-splash (rows not reused by muddy-mayhem)

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
|---|---|---|---|
| `thumb/puppy-splash` | 800×500, opaque | Game-select shelf and how-to screen | A garden hose nozzle in the foreground spraying a sparkling arc of water at a giggling muddy puppy while a clean fluffy white puppy shakes water drops everywhere; soap bubbles, rainbow mist, sunny backyard with a porch. No Charlie Party characters. Subject centred |
| `prop/puppy-shake` | 220×180, transparent | Optional, same framing as the puppies; used only for puppy 1 during its shake (others wiggle their normal art) | The cream puppy mid-shake: fur flared out in a blur, ears flying, eyes squeezed shut, happy |
| `prop/bubble-pool` | 440×280, transparent | Centred at (1560, 820), drawn 360 px wide; the code adds rising bubbles | A round inflatable kiddie pool, pink and white striped rim, overflowing with fluffy soap foam, seen from a high angle |
| `prop/dog-bed` | 220×120, transparent | Bottom-centre anchor on the porch, drawn ~150 px wide; a clean puppy sits in it | A round plush dog bed, soft pink with a white fluffy rim, seen from a slight high angle |
| `prop/hose-nozzle` | 120×70, transparent | Held at the character's hand, pointing right (rotated to the aim), drawn ~70 px long | A chunky green garden-hose spray nozzle with a yellow trigger, pointing right |

### New Molly Party game: tea-party


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

## Delivered aquarium — 2026-10-12

All 101 assets delivered: 36 fish images (including four puffed colours) and 65 room, plant, decoration and thumbnail images. Actual CPU build/night scene checked with all registered art; fish swim separately, doors/arches remain transparent and bottom anchors sit on sand. Jelly bell anchoring, generated clam pearl, authored chest lid animation and matching night silhouettes have focused passing regressions. No browser warnings or errors.

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


## Delivered puppet-theater — 2026-10-12

All 29 assets delivered. Actual two-player stage reviewed after a transient local-server module fetch retry: backdrop fills the transparent booth aperture, playboard hides lower puppets at the authored 720px ledge, prop menu and audience render correctly. No new warnings or errors after reload.

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


## Delivered sandcastle-beach — 2026-10-12

All 22 missing assets delivered; existing approved beach crab reused (23 total keys). Actual CPU construction checked with unicorn and KPop trio: measured tower surfaces stack roofs and flags correctly, side walls meet the front footprint, and code-drawn sun sits over matching day shoreline. No browser warnings or errors.

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


## Delivered star-maker — 2026-10-12

All 14 assets delivered from approved Moon and eight spirit designs. Actual two-player sky checked: round Moon remains readable at runtime scale, sky leaves the drawing field clear, and characters stand on the field baseline; no browser warnings or errors. Three expression variants and eight spirits reviewed on contact sheet.

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


## Delivered acrobat-circus — 2026-10-12

All 12 assets delivered. Actual two-player trampoline act checked with unicorn and mermaid: apparatus fits split rings, transparent cutouts and the bouncing characters render cleanly; no browser warnings or errors. Contact sheet reviews bar, tower, ball, parasol and balloons.

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
| `prop/acrobat-trampoline` | 480×200, transparent | Bottom-centre anchor on the floor, drawn 300×125 station units (1.6–2.1× bigger in the finale show). **The bed's top surface is 28% of the image height down from the top**; the character's feet touch it there. The code squashes the whole image up to 12% vertically when someone lands | A round-cornered circus trampoline seen from the front, slightly from above: a bright blue padded frame with yellow and red stripes, a dark navy stretchy bed, little spring zig-zags around the rim and four short sturdy legs |
| `prop/acrobat-trapeze` | 256×48, transparent | The bar only, centred on the bar point and drawn 120×22 station units (stretched wider, same height, under the KPop trio); the characters stand on it. The ropes are drawn by the code from each end up to the pivot | A wooden trapeze bar wrapped in white tape with red stripes, with a small gold ring at each end where a rope ties on |
| `prop/acrobat-tower` | 160×480, transparent | One at each end of the tightrope, bottom-centre anchor on the floor, drawn 90×270 station units. **Its top deck surface is 7% of the image height down from the top**; the rope is tied there (both towers use the same image, the right one mirrored) | A slim circus tightrope tower: a red-and-white striped pole with a little ladder of gold rungs and a round blue platform deck with a gold rim at the top |
| `prop/acrobat-ball` | 256×256, transparent | Centred, drawn 124 station units across, and rotated by the code as it rolls (so it should look fine at any angle) | A big glossy circus balance ball with bold candy-coloured segments (pink, yellow, blue, mint) and a gold star on the side, highlight at the upper left |
| `prop/acrobat-parasol` | 160×160, transparent | Held for balance on the tightrope. Anchored at the **bottom of the handle** (bottom centre of the image), drawn 0.6 × the character's height tall (about 55–80 station units) at the character's hand, tilted with the wobble | A small open frilly parasol: pink and white scalloped canopy with a little gold tip, a curved handle |
| `prop/acrobat-balloon-pink`, `prop/acrobat-balloon-blue`, `prop/acrobat-balloon-yellow`, `prop/acrobat-balloon-mint` | 96×128 each, transparent | Targets in the ball act (popped by hopping into them). Centred, drawn 52×68 station units; the code draws the string under it, so no string in the image | A round shiny party balloon with a little knot at the bottom and a white highlight, in pink / sky blue / sunny yellow / mint |

Optional pose for every roster character (the code already asks for it and
falls back to `crouch` until it exists): `tuck`, loop, fallback
`crouch` → `jump`: knees hugged to the chest in a tight somersault ball,
eyes squeezed happily shut (seen side-on; the game spins it).


## Delivered dance-studio — 2026-10-12

All 27 assets delivered. Actual two-player setup reviewed: transparent curtains reveal the selected stage, floor aligns below dancers, and all sixteen move pictograms remain readable on small cards; no browser warnings or errors.

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


## Delivered snowman-builder — 2026-10-12

All 25 assets delivered using the approved cardinal design. Two-player yard and CPU rolling/stacking/decorating checked: snowballs stack cleanly, stick-arm anchor and decoration palette display correctly; no browser warnings or errors.

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


## Delivered hair-salon — 2026-10-12

All 24 assets delivered. Actual two-player salon checked: mirror framing, chair baseline and tool palette work with the procedural hair and cape; no browser warnings or errors.

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
| `bg/hair-salon-photo` | 1920×1080, opaque | Full screen for the photo showcase. Client busts stand on pedestals with their heads around y≈300–550 (1 player) down to y≈530–730 (8 players); stylists walk on the floor band y≈820–1010; the camera zooms in up to 1.6× | A glamorous photo wall in a salon: a sparkly pink sequin backdrop with a gold star-light garland across the top, two big gold-framed bulb mirrors at the far edges, a glossy pink stage floor in the bottom quarter. Centre kept plain for the clients |
| `thumb/hair-salon` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A happy cartoon salon client with big rainbow-streaked curly hair and a pink bow sitting in a pink salon chair, a pair of scissors, a comb and a spray bottle floating around her with sparkles, mint salon wall behind. Subject centred |
| `prop/salon-chair` | 640×720, transparent | Drawn behind the client, anchor bottom-centre at the bottom of the scene, width = 1.7 × the client's head width. Only the tall chair back shows above the client's shoulders, plus the base | A front-facing retro salon chair: tall rounded pink vinyl back with tufted buttons, chrome arms and a round chrome pump base. Empty |
| `prop/salon-hand-mirror` | 360×560, transparent | Mirror-reveal moment: anchor centre, the code draws the client's reflection inside an oval at the top 62% of the image (centre at 36% height, oval 78% of the width × 58% of the height), so that area must be plain glass | A big gold hand mirror with an oval glass, heart and pearl details on the frame, a pink handle with a bow. The glass is pale blue with a soft diagonal shine |
| `prop/salon-brush`, `prop/salon-scissors`, `prop/salon-grow-spray`, `prop/salon-curler`, `prop/salon-straightener`, `prop/salon-color-spray`, `prop/salon-hairtie`, `prop/salon-bling` | 160×160 each, transparent | Tool bar buttons and the cursor (hand) icon, drawn centred, fitted to ~1.1 × the slot. The colour spray is drawn with a separate colour swatch beside it, so keep its can neutral (white/silver) | Chunky toy-like salon tools: a pink paddle hairbrush; round-handled pink scissors (slightly open); a sparkly green "magic grow" spray bottle with a star nozzle; a purple barrel curling wand; a mint flat iron (hair straightener); a white spray-paint can with a rainbow band; a stretchy pink hair tie with a pearl; a glittery gold bow-and-star bling badge |
| `prop/hair-bow-pink`, `prop/hair-bow-blue`, `prop/hair-bow-yellow`, `prop/hair-flower-pink`, `prop/hair-daisy`, `prop/hair-clip-star`, `prop/hair-clip-heart`, `prop/hair-butterfly`, `prop/hair-tiara`, `prop/hair-crown` | 192×192 each (tiara and crown 256×192), transparent | Placed on the client's hair, anchor centre; drawn at ~0.55 × the head width (tiara/crown 0.8 ×) with a small tilt. Front view, centred | Hair accessories: a pink satin bow, a sky-blue bow with white polka dots, a sunny yellow bow; a pink five-petal flower with a yellow centre; a white daisy; a gold star hair clip with a gem; a red heart clip; a purple-and-pink butterfly clip; a silver tiara with pink gems; a small gold princess crown with three gems |


## Delivered nail-studio — 2026-10-12

All 17 assets delivered. Actual two-player nail workstation checked: table lip, cushion, avatars and polish controls align; no browser warnings or errors.

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


## Resolved re-generation requests — 2026-10-12

Teddy now peeks above the left shoulder in the actual wearable render. Fishing uses a compact 256×64 grip drawn whole, with its procedural bending shaft retained. Full game run and focused handle tests pass.

| Key | Previous issue | Requested replacement |
| --- | --- | --- |
| `prop/backpack-teddy` | Characters face three-quarter right, so the back is on the LEFT; the teddy peeks out at the top-RIGHT, behind the head, and is invisible on every two-legged character even after refitting (the original request said top-right, wrongly). | Same 140×200 pack, but the teddy head and ears peek out at the top-LEFT corner, head reaching the canvas top; keep the pack bottom-centred with no bottom padding (the code puts the `back` point at 80% of the height). |
| `prop/fishing-rod` (optional) | Even drawn undistorted, the 8:1 handle is too long for a 110–175 px rod, so the code skips the middle of the cork to shorten it. | 256×64, transparent: a short chunky cork grip (about 2.5× as long as it is thick) with the big yellow reel at the right end, butt at the left edge, shaft start at the right edge, so the code can draw it whole. |

# Charlie Party: image request history

## Current studio delivery — Pottery Wheel

All22 requested art keys generated and reviewed with measured wheel/shelf/kiln geometry. Shaping and firing placement checked in game; full CPU run had no console errors. Exact prompts/source intake: reference/pending/STUDIO-pottery-wheel.json. Optional mold pose remains future backlog.

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


## 2026-10-12 — Remaining prop revisions delivered

Cloud thumbnail now has content smile and striped trampoline; open chest isfront-on; cookiebridge has two rows at correctaspect; fishinghandle art now joins proceduralbending shaft. Fishing complete CPUrun hasno newconsoleerrors afterimportfix; handle/fallbackregression test passes. Exactprompts/sources: reference/pending/OCT12-PROP-REVISIONS.json.

| Key | Previous issue | Completed request |
| --- | --- | --- |
| `prop/fishing-rod` (optional) | The rod fills only the middle 37% of its canvas (x 161–350 of 512) with a 2–3 px shaft, so in game it was a near-invisible hairline. A static rod also can't bend, and the rod bends on every nibble and tug as tension feedback, so the game now always draws the rod itself and this file is unused. | Only if rod art is wanted: 512×64, transparent, a chunky kid's rod **handle only** (cork grip plus a big yellow reel), butt at the left edge, the shaft's start at the right edge, filling the full width, about 24 px thick, navy outline. The code would draw it from the butt to the hand and keep its own bending shaft. Otherwise drop the key. |
| `thumb/cloud-hop` (optional) | The rain cloud frowns (the request asked for sleepy and content) and the trampoline is blue instead of the in-game pink-and-white stripes. | Same composition; make the rain cloud sleepy and content, and the trampoline pink-and-white striped like `prop/cloudhop-trampoline`. 800×500, opaque. |
| `prop/treasure-chest-open` (optional) | Drawn in 3/4 view (lid hinged to the right) while `prop/treasure-chest` is straight front-on, so the chest seems to turn when it opens. | Same front-on view, scale and outline as `prop/treasure-chest` (same plank and band layout and lock position), lid flipped up behind, heaped coins and a pearl necklace; 300×300, transparent, bottom-centre at the base, a few px of padding below the base. |
| `prop/golf-cookie-bridge` (optional) | The visible cookie is a thin 3.3:1 strip (411×123) inside the 440×230 canvas; the code trims it and stretches it to the 1.9:1 bridge, so the crackers become tall planks and the chips stretch. | Fill the 440×230 canvas edge to edge (≤8 px padding) at the requested 1.9:1: a wide graham-cracker bridge seen from above (e.g. two rows of square crackers, or one big cracker with perforations), chocolate chips, crumbs only inside the canvas. |


## 2026-10-12 — Fashion Show and dress-up accessories delivered

All32 new props generated with built-in imagegen, alpha/anchor/eyehole audited and reviewed on actual Actor/outfit renderer in everycategory. Three headband attachment fractions adjusted to measured seating points whilepreserving fullsilhouettes. Sources/geometry/prompts: reference/pending/OCT12-FASHION-HEAD.json and OCT12-FASHION-OTHER.json; runtime gallery: OCT12-WEARABLE-REVIEW.html.

## Fashion Show: new items (2026-10-12)

New wardrobe items for `fashion-show` (requested by the Fashion Show agent, priority: nice-to-have). Every item already ships with a procedural drawing (the wardrobe lives in `src/engine/outfits.js`, shared with the game-wide dress-up look); the code looks up `prop/<key>` and uses the art **only for the item's default colour** (the colour named in the description), so the other palette colours keep the drawing. Same conventions as the existing fashion-show props: transparent background, WebP-able PNG, no text, bold navy (#24163f) outlines, cel shading, candy colours, front view unless stated, art facing right where it has a side (the game mirrors it). "S" below is the code's size unit for the category (head items: head width; face/neck: face width; back, hand: body height); the code fits the image into the given box and puts the anchor on the character's landmark for every frame.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `prop/headband-unicorn` | 160×136, transparent | `head` point; fit 1.0×0.85 S, band bottom-centre at 78% of the height (horn rises above) | Pearl-white headband with a spiral unicorn horn in the middle, pastel stripes on the horn, a pink and a yellow flower at the sides, a tiny sparkle at the tip |
| `prop/headband-kitty` | 160×88, transparent | `head`; fit 1.0×0.55 S, band bottom-centre at 70% | Pink headband with two pointed kitty ears (light pink insides) and a small white bow with a gold centre on the right |
| `prop/hat-princess` | 160×174, transparent | `head`; fit 0.85×0.9 S, brim at 88% | Tall pink princess cone hat (hennin) with a gold band, three little gold stars up the side and a soft pale-pink veil streaming back from the tip |
| `prop/headband-hearts` | 160×120, transparent | `head`; fit 1.0×0.75 S, band bottom at 80% | Ruby-red headband with two bobbing heart antennae on springy stalks |
| `prop/halo-fairy` | 160×56, transparent | floats above `head`: fit 1.0×0.35 S, anchor 1.4× the height below the top (the ring hovers about a third of a head-width over the hair) | Glowing golden fairy halo ring seen slightly from above, soft yellow glow, two or three tiny sparkles on the ring |
| `prop/mask-masquerade` | 140×76, transparent | `eyes` point (eye line); fit 1.1×0.6 S, eye line at 55% | Lilac masquerade eye mask with gold-rimmed eye holes, a red gem between the eyes and a sky-blue feather plume on the right; eye holes see-through |
| `prop/glasses-monocle` | 60×106, transparent | `eyes`; fit 0.42×0.75 S, lens centre at 22% from the top, shifted 0.24 S toward the facing side (over the forward eye) | Gold monocle: one round glass lens with a thick gold rim and a gold chain curling down from it |
| `prop/face-whiskers` | 140×70, transparent | `eyes`; fit 1.0×0.5 S, eye line at the top 20% of the canvas (the paint sits below it) | Kitty face paint: a pink heart nose in the centre and three navy whisker strokes on each cheek, nothing else |
| `prop/face-butterfly` | 140×70, transparent | `eyes`; fit 1.0×0.5 S, eye line at 20% | Face paint: a small sky-blue butterfly on the right cheek and two white sparkles on the left cheek |
| `prop/glasses-goggles` | 140×60, transparent | `eyes`; fit 1.05×0.45 S, centred on the eye line | Mint party goggles: one wide wrap-around tinted mint lens with a navy strap, big glossy shine streak |
| `prop/necklace-pendant` | 160×126, transparent | `neck` point; fit 0.7×0.55 S, chain top at 10% | Gold chain with a round royal pendant: a big sky-blue cut gem in a gold setting ringed with tiny pearls |
| `prop/collar-ruffle` | 160×66, transparent | `neck`; fit 0.85×0.35 S, top at 25% | Pearl-white ruffled royal collar (a ring of soft ruffles) with a small red gem in front |
| `prop/necklace-candy` | 160×66, transparent | `neck`; fit 0.85×0.35 S, top at 10% | Candy necklace: a string of little round candy beads in rainbow pastel colours |
| `prop/medal-star` | 160×117, transparent | `neck`; fit 0.75×0.55 S, ribbon top at 15% | Champion medal: a blue-and-red ribbon V with a round gold medal with a raised star |
| `prop/boa-feather` | 160×136, transparent | `neck`; fit 1.0×0.85 S, top at 20% | Fluffy pink feather boa looped around the neck with one end hanging down the front on the right |
| `prop/wings-dragonfly` | 300×183, transparent | `back` point, drawn behind the body; fit 0.9×0.55 S, root (centre) at 55%; the code flaps it by squashing horizontally | Two pairs of long slim mint dragonfly wings, see-through with darker vein lines, spreading left and right from the centre |
| `prop/wings-petal` | 300×240, transparent | `back`, behind; fit 0.75×0.6 S, centre at 50% | Flower-petal fairy wings: pink and light-pink petals fanning out on both sides from a small white flower in the middle |
| `prop/wings-dragon` | 300×158, transparent | `back`, behind; fit 0.95×0.5 S, centre at 60% | Cute mint baby-dragon wings, rounded scalloped edges, light finger struts, small pearl claw tips; friendly, not scary |
| `prop/bow-back` | 300×220, transparent | `back`, behind; fit 0.75×0.55 S, knot at 40% | Huge ruby-red ribbon bow (like a present bow) with two long tails hanging down, glossy satin shine |
| `prop/cape-star` | 300×292, transparent | like `cape-royal`: top-centre at the neck, stretched to the fitted cape box (behind the body, hanging to the floor) | Lilac velvet cape scattered with little white and pale-yellow stars, scalloped hem, light-lilac collar |
| `prop/backpack-teddy` | 140×200, transparent | `back`, behind; fit 0.3×0.42 S, the `back` point at 75% of the height (the pack rides high); the teddy's head must reach the top-right corner so it peeks over the shoulder | Small pink backpack with a darker flap, and a little brown teddy bear sitting in it, its head and ears peeking out of the top right |
| `prop/scepter-royal` | 60×200, transparent | `hand` point = grip; fit 0.15×0.5 S, grip at 84% of the height | Gold royal scepter: a slim gold rod with two rings and a round gold orb with a tiny crown on top |
| `prop/lollipop-swirl` | 90×200, transparent | `hand`; fit 0.2×0.45 S, grip at 88% | Big round pink swirl lollipop on a white stick with a red ribbon bow under the candy |
| `prop/handbag` | 120×140, transparent | `hand`; fit 0.22×0.26 S, top of the handle at 5% (the bag hangs below the hand) | Little lilac handbag with a gold handle, a darker flap and a gold heart clasp |
| `prop/fan-lace` | 200×114, transparent | `hand`; fit 0.42×0.24 S, pivot (bottom centre) at 90% | Open pearl-white lace hand fan, half circle with pleats, a scalloped edge of tiny pearls and a gold pivot |
| `prop/balloon-star` | 120×320, transparent | `hand`; fit 0.3×0.8 S, string end at the bottom (98%) | Gold star-shaped foil balloon on a long thin navy string, shiny highlight |
| `prop/wand-bubble` | 110×200, transparent | `hand`; fit 0.18×0.32 S, grip at 90% | Sky-blue bubble wand: a ring on a short handle with three soap bubbles floating up to the right |
| `prop/aura-butterfly` | 96×96, transparent | one particle of the Butterflies aura (lilac default); drawn about 0.1 body heights wide, the code flaps it | A single small lilac butterfly seen from the front, wings open |
| `prop/aura-shooting-star` | 160×80, transparent | one particle of the Shooting Stars aura (gold default); star at the left end, trail rising to the right | A small gold shooting star with a soft white trail |
| `prop/aura-snowflake` | 96×96, transparent | one particle of the Snowflakes aura (sky default), rotated by the code | A single sky-blue and white six-pointed snowflake |
| `prop/aura-note` | 96×96, transparent | one particle of the Music Notes aura (lilac default) | A single lilac eighth music note with a navy stem |
| `prop/aura-petal` | 64×64, transparent | one particle of the Flower Petals aura (pink default), rotated by the code | A single pink cherry-blossom petal |


## 2026-10-12 — Cake grips and Hotdog pulling revised

Cake six idle/walk hands moved to body front; Hotdog two pull frames regenerated with paws34–35%height abovefeet. Tug of War rope and Mini Golf club checked in-game. Allunaffected runtimepoints and rasters preserved; source specs synchronized with Octoberlandmark audit. Builder now retains explicit eyes:null and framebodyHeight, regressiontested. Prompts/data: reference/pending/OCT12-SPRITE-FIXES.json.

| Key | Previous issue | Completed request |
| --- | --- | --- |
| `sprites/marshmallow-birthday-cake`: `hand` point on idle and walk frames | The idle/walk `hand` is at the top centre of the head, so the Mini-Golf putter and the Piñata Party bat (drawn while aiming or walking) come out of its head and the putter crosses its face. | Move the `hand` landmark on the cake's idle and walk frames to its front edge at mid-body height (where its `reel`/`putt` frames hold things). Landmark data only; no new pixels needed. |
| `sprites/hotdog`: `pull` (frames pull-00, pull-01) (low priority) | The paws (hand point, about 0.47× height) sit right under the mouth, so the Tug-of-War rope covers the lower face and part of the eyes. | Redraw with the paws held at chest or belly height (about 0.30–0.35× height above the feet) so the face stays clear above the rope. |


## 2026-10-12 — Jump Rope bunny expressions delivered

Six face variants generated and registered, same600x660 canvas retained. Runtime Jump Rope shoulder/handle alignment and console checked. Exact prompts/sources: reference/pending/OCT12-BUNNIES.json.

| Key | Previous issue | Completed request |
| --- | --- | --- |
| `prop/jump-rope-bunny-pink-cheer`, `-sneaky`, `-oops`; `prop/jump-rope-bunny-mint-cheer`, `-sneaky`, `-oops` (optional) | The painted face never changes, so the bunnies' moods only show through an emote the code adds next to the head. The code already looks up these keys (`excited` uses `-cheer`). | 6 images, each 600×660, transparent: the same canvas, pose, outfit, feet point (300, 660) and shoulder points (343, 370) / (249, 367) as the base bunny, no arms; only the face changes. **cheer:** eyes closed in happy arcs, big open smile. **sneaky:** sleepy half-closed sly eyes, a little smirk. **oops:** squeezed-shut wince eyes, a small round "o" mouth. No sweat drops, zzz or sparkles (the code draws those). |


## 2026-10-12 — Cake Bakery toppings delivered

All15 built-in imagegen assets reviewed, registered and checked in a complete three-player CPU bakery run with no console warnings/errors. Bottom contacts and candle wick verified. Prompts/sources: reference/pending/OCT12-TOPPINGS.json.

## Cake Bakery: new toppings (2026-10-12)

New Decorate choices in `src/games/cake-bakery/cake.js`. Every one already
has a procedural drawing that ships today, and the code looks up each key
below, so a file listed in `assets/art/index.json` drops in with no code
change. Same family as the existing `prop/topper-*` art (about 96 px tall,
transparent, navy `#24163f` outline, soft cel shading, glossy candy colours,
**no text**). All are drawn in cake-local units at the station's scale: the
code fits the image inside *H* tall × 2.2*H* wide (H given per row),
**bottom-centre on the point where it touches the cake**, and sinks it the
given few units into the frosting, so the base must touch the canvas's bottom
edge with no padding and no shadow. They sit on the top face, and the ones
marked "sides too" also stick on a layer's side, so they must read
front-on. Rows marked **tinted** get a random colour per topping by
hue-rotating the whole image: paint the main colour in the given hue and
keep everything else white, cream or navy so only that part changes.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `prop/topper-macaron` | 112×96, transparent | H 32, sink 2; sides too. **Tinted**: shells pink `#ff9fd0` | One French macaron seen from the front, slightly from above: two smooth domed shells with a ruffled "foot", a thick white cream filling between them, a soft highlight on the top shell |
| `prop/topper-choco-drop` | 96×96, transparent | H 34, sink 2; sides too | A chocolate drop (kiss shape): a glossy milk-chocolate cone with a flat round base and a little curled tip, darker shading on the right, a cream-coloured highlight on the left |
| `prop/topper-butterfly` | 112×96, transparent | H 40, sink 2; sides too. **Tinted**: wings pink `#ff6fd0`. The code squashes it sideways (x scale 0.72–1) to flap the wings, so draw it front-on, wings fully open and symmetric about the centre | A sugar butterfly seen from the front: four rounded wings (big upper, small lower) with white polka dots, a plum body down the centre and two curly antennae; the bottom of the body touches the bottom edge |
| `prop/topper-bow` | 128×80, transparent | H 30, sink 2; sides too. **Tinted**: ribbon pink `#ff6fd0` | A chunky candy ribbon bow, front view: two puffy loops, a round knot in the middle, two short tails pointing down, white polka dots on the loops |
| `prop/topper-pearls` | 96×80, transparent | H 26, sink 2; sides too | A little pyramid of three shiny sugar pearls (two below, one on top), pearly white with a faint lilac shade and a bright highlight on each |
| `prop/topper-lollipop` | 80×160, transparent | H 88, sink 4 (the stick end is pushed into the cake); top only. **Tinted**: swirl pink `#ff6fd0` | A round swirl lollipop on a white stick: a flat disc with a pink-and-white spiral, a glossy highlight at the upper left, the stick straight down to the bottom edge |
| `prop/topper-candy-cane` | 80×160, transparent | H 74, sink 4; top only. The hook bends to the right | A red-and-white striped candy cane standing upright on its straight end, the hook at the top curling to the right, diagonal stripes, a soft highlight down one side |
| `prop/topper-cupcake` | 96×112, transparent | H 58, sink 3; top only | A tiny cupcake: a sky-blue pleated paper wrapper, a three-tier swirl of pink frosting with a few rainbow sprinkles, and a red cherry with a stem on top |
| `prop/topper-crown` | 112×96, transparent | H 44, sink 3; top only | A small gold princess crown, front view: a band with three gems (red, blue, green), three tall points each topped with a white pearl, bright gold with a shine stripe |
| `prop/topper-rainbow` | 192×112, transparent | H 52, sink 4; top only. Wide: both cloud bottoms touch the bottom edge | A chunky arched rainbow (red, orange, yellow, green, blue, purple bands) with a fluffy white cloud at each end, standing on the clouds |
| `prop/topper-shooting-star` | 112×192, transparent | H 92, sink 4; top only. The stick's bottom is at the bottom centre | A cake pick: a thin gold stick with a plump yellow star at the top, a curved rainbow trail (pink, blue, green) streaming down-left from the star, a tiny twinkle beside it |
| `prop/topper-fairy` | 112×176, transparent | H 78, sink 3; top only. The feet/skirt hem are at the bottom centre | A tiny sugar fairy figurine standing on the cake: blonde bun, rosy cheeks, closed happy eyes, a pink bell-shaped dress, pale-blue translucent wings, holding up a wand with a gold star. Toy-like, not a roster character |
| `prop/candle-swirl` | 48×160, transparent | Same as `prop/candle` (tinted from its pink, hue 334), drawn 82 tall, bottom-centre on the cake; the **wick tip must be about 3 px below the top edge, centred**, because the code draws the flame (`prop/candle-flame`) there | A tall thin twisted birthday candle: white wax with a pink spiral stripe, a little gold drip-catcher ring at the bottom, a short dark wick on top, no flame |
| `prop/sprinkles-stars` | 128×128, transparent | Menu and hand-cursor icon for Star Sprinkles, drawn centred like `prop/sprinkles` (fallback: a shaker jar) | A loose scatter of tiny star-shaped sprinkles in gold, pale yellow, white, pink and sky blue |
| `prop/sprinkles-dots` | 128×128, transparent | Menu and hand-cursor icon for Rainbow Dots, drawn centred like `prop/sprinkles` | A loose scatter of tiny round nonpareil dots in rainbow colours (red, orange, yellow, green, blue, purple) |



## 2026-10-12 — Snowball Splat revisions delivered

Regenerated the clear snow arena and parallel side wall with built-in imagegen.
Geometric intake aligns the fence above250 and pond to(960,652); restored
ARENA_TOP_ART280 and removed the old taper correction. Running three-player
CPU game reviewed with no console errors. Exact prompts/sources in
reference/pending/OCT12-REGENERATIONS.json.

| Key | Previous issue | Completed request |
| --- | --- | --- |
| `bg/snowball-splat` | The fence is painted at y≈270–365, not the requested 200–245, so players at the top of the play area stood on the fence rail. The code now starts the play area at y 345 while this background is in use (about 65 px of field lost). Pine trees and snowbanks also come well into the play area (x 90–1830, y 280–1028): bottom-left trees from y≈870, a bush at x 1110–1300 from y≈940, bottom-right trees from x≈1550 / y≈830, right-edge trees at x>1700 / y 380–760; players walk over them. The pond is perfect. | 1920×1080, opaque. Keep the cottages, pond (centre (960, 652), 205×88 plus a ~20 px rim) and style exactly. Move the fence up so its snowy base line is at y ≤ 250, with only sky, cottages and trees above it. Keep x 90–1830, y 260–1028 plain open snow (gentle drifts only); trees and banks only outside that box (x < 90, x > 1830, or y > 1028). When it lands, set `ARENA_TOP_ART` back to 280 in `snowball-splat.js`. |
| `prop/snow-wall-side` | The top face narrows from 170 px at the front to 60 px at the far end (a vanishing point), but the game has no perspective (front walls don't narrow), so it read as a tall white obelisk. The code now crops each row of the top face to its painted width, which leaves thin side outlines. | 176×1016, transparent, same style as `prop/snow-wall`. The top face (top 67%) must be a straight-sided strip **as wide as the front end the whole way up** (no taper), with a lumpy snow edge and a navy outline on both long sides and the far end. Bottom 33%: the front end with brick seams, as now. |


Fielded image requests (delivered and checked in game, or resolved or dropped),
moved out of [`image-requests.md`](image-requests.md) to keep that file to
standing guidance and open requests. **Newest at the top.** When you field a
request, move its section or row here under a dated heading with its outcome.
Section numbers (§) refer to `image-requests.md`.

---

## 2026-10-06 — archive of everything fielded up to the new party games

Everything below was delivered and checked in game. The new game sections
were also QA-ed in game on 2026-10-06; the follow-ups from that QA are rows in
the open re-generation table in `image-requests.md`.


### Archived: New Play Studio and Party game sections (2026-10-05; all delivered and checked in game 2026-10-06)

#### New Play Studio game: melody-maker

##### melody-maker — Melody Maker   (requested by the melody-maker agent, 2026-10-05, priority: nice-to-have)

A step-sequencer music garden (`src/games/melody-maker.js`). Everything below
is drawn procedurally today and each key drops in with no code change
(`art()` / `drawArt()` lookups are already in place). Use the §10.5
background and §10.6 prop templates; sizes are logical px at 1080p.

**Pitch-row colours** (the flowers and notes use these; low → high, key
number in brackets): red `#ff5a6e` (1), orange `#ff9f1c` (2), yellow
`#ffd23f` (3), green `#6fdc5a` (4), teal `#2fd3c0` (5), blue `#3fa7ff` (6),
purple `#9b6bff` (7), pink `#ff6fd0` (8).

###### Backgrounds and thumbnail

| Key | Size | What | Layout constraints |
| --- | --- | --- | --- |
| `bg/melody-maker` | 1920×1080, opaque | Front view of a sunny garden bandstand at golden hour: pastel pink-to-lavender sky, soft clouds, rolling green hills, a string of fairy lights along the very top, and a **wooden stage floor from y≈812 to the bottom** (warm honey planks with a darker front lip at y≈812). | The code draws the button bar (y 16–100), a big cream music panel (x 22–1636, y 118–798) and a legend card (x 1650–1898, y 118–798) on top, so the area above the stage may stay simple. Characters stand on the stage at y≈1064 and speakers sit at both stage ends. When this art exists the code stops drawing its own stage planks. No characters, no text. |
| `bg/melody-maker-concert` | 1920×1080, opaque | Front view of a cosy evening concert stage in the garden: dark plum backdrop with twinkly stars and fairy lights, a warm wooden stage floor from y≈860 down. | Code draws red curtains at both sides (~100 px each, plus a valance in the top 34 px), a strip of song cards at y 54–224, performers centre stage with feet at y≈900, and a row of singing flowers along the front at y≈1030. Keep the middle uncluttered; no characters, no text, no curtains. |
| `thumb/melody-maker` | 800×500, opaque | Two characters (e.g. Felicity and the Unicorn) on a garden stage beside a giant rainbow music grid of bells and singing flowers, music notes floating up, golden playhead glow. | Matches the other `thumb/<id>` cards; no text. |

###### Props and icons (transparent PNG → WebP, centred unless noted)

| Key | Size | What / anchor | Used for |
| --- | --- | --- | --- |
| `prop/melody-flower-1` … `prop/melody-flower-8` | 160×160 | A round smiling flower head (6 petals, cream face, rosy cheeks, closed-mouth smile, eyes open) in the row colour above (1 = red … 8 = pink). Head only, no stem; centred on the face; fills ~90% of the canvas. | The singer at the left of each pitch row (drawn at ~60 px) and the flower chorus in the concert (~96 px). |
| `prop/melody-flower-1-sing` … `prop/melody-flower-8-sing` | 160×160 | Same flower and framing, singing: eyes happily closed, mouth open in an "O" / "la". | Shown for ~0.4 s each time its row's note plays (falls back to the idle art). |
| `prop/melody-note-bells`, `prop/melody-note-piano`, `prop/melody-note-marimba`, `prop/melody-note-choir` | 128×128 | Note tokens drawn in **neutral white/light grey with soft grey shading** and navy outlines; the code multiplies them with the row colour. Bells: a small handbell with a clapper. Piano: a single rounded piano key with a little black key on top. Marimba: a short rounded wooden bar with two pins (wide, ~2:1). Choir: a round smiley face singing "la" (eyes closed, open O mouth). | Every placed note (drawn at ~56 px, bounces when it plays). |
| `prop/melody-kick`, `prop/melody-clap`, `prop/melody-shaker` | 128×128, full colour | Kick: a small coral bass drum, side view, white zigzag lacing. Clap: two clapping hands with a yellow burst behind. Shaker: a green spotted maraca. | Drum-lane notes (~46 px) and the drum players in the concert (~110 px). |
| `prop/melody-speaker` | 150×220, bottom-centre anchor | A cute purple stage speaker cabinet with two yellow cones (no face needed). | Both ends of the stage in the editor. (The cones thump by code only when drawn procedurally.) |
| `icon/inst-bells`, `icon/inst-piano`, `icon/inst-marimba`, `icon/inst-choir` | 128×128, full colour | Instrument badges: a gold handbell with a wooden handle; a mini keyboard (white keys, 3 black keys); a rainbow xylophone with a mallet; a pink singing face with a music note. | Each player's "sound" badge on their cursor, above their character, and held in their hand during the concert (24–44 px). |
| `icon/tortoise`, `icon/hare` | 128×128, full colour, facing right | A friendly green tortoise; a white bunny mid-hop. | The Speed button (slow / fast). |

**Reused, no new art needed:** `icon/eraser` (Clear button), `icon/undo`
(undo badge), `prop/confetti` (concert confetti), `applause` sfx.

**Prompt lines** (fill the §10.6 template):
- Flower: "A single round cartoon flower head with six soft <colour> petals and a cream face with rosy cheeks, two dot eyes and a small smile (sing version: eyes closed in happy arcs, mouth open in a round O, singing). Front view, centered, entirely visible with margin, no stem."
- Note tokens: "A single <handbell | rounded piano key with a small black key on top | short rounded wooden marimba bar with two pins | round smiley face singing with an open O mouth>, rendered in plain white and light grey only (it will be recolored in code), bold navy outline. Front view, centered."
- Instrument badge: "A single <object> as a chunky game icon, front view, centered, fills the canvas."

#### New Play Studio game: bead-bracelets

##### bead-bracelets — Sparkle Bead Shop   (requested by the bead-bracelets agent, 2026-10-05, priority: nice-to-have)

Everything below has a procedural fallback that ships today (glossy vector
beads, drawn charms, trays, cards and shop). The code already looks up every
key, so a file listed in `assets/art/index.json` drops in with no code
change. House style: navy `#24163f` outlines, soft cel shading, glossy
highlights, **no text** in any image. Reused as they are: the roster sprites
(`pose-twirl`, `photo`, `strike2`, `strike3`, `cheer`, `celebrate`, `think`,
`action`, `wave`), and Glimmer, Professor Hoot and Fellowfox as customers.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/bead-bracelets` | 1920×1080, opaque | Full screen behind the split stations. It shows as side columns at 1 player and as top/bottom bands at 2–8 players. Keep the top ~110 px calm (the HUD band sits there) | A cozy pastel bead boutique wall: pink-and-cream vertical stripes, wooden shelves along the far left and right edges holding glass jars full of colourful beads, a swag of giant beads hanging across the top, a warm wooden floor strip at the bottom. Low detail in the centre (stations cover it) |
| `bg/bead-bracelets-station` | 1290×900 (ratio 860:600), opaque | Stretched over one station. **The layout must match:** wall from y=0 to about y=37% (222/600), a rounded wooden counter edge at 37%, wooden counter top below. The customer stands at the far left behind the counter; the code draws the pattern card and display shelf on the wall | A bead-shop counter seen from the shopkeeper's side: soft pastel wallpaper with tiny polka dots on the upper 37%, a honey-wood counter lip, then a light wooden counter top with faint grain. Nothing on the counter (the code draws the string, tray and beads) |
| `bg/bead-bracelets-mirror` | 1920×1080, opaque | Full screen for the finale. Characters stand on the floor band from y≈740 to y≈960; a camera punch zooms in up to 1.18× | A boutique dressing nook with a giant arched gold mirror (rounded top, bulb lights around the frame) filling almost the whole picture. The glass is pale blue-lilac with soft diagonal sheen streaks, with a pink carpet floor reflected at the bottom. No characters |
| `thumb/bead-bracelets` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Cotton Candy at a bead-shop table holding up a finished bead bracelet (hearts, stars, a gold heart charm), a strand of pink-heart and blue-star beads with a needle in the foreground, sparkles. Subject centred |
| `prop/bead-atlas` | 768×576 (8 columns × 6 rows of 96 px cells), transparent | One cell per bead, drawn centred at 2.3 × the bead radius. **Columns are colours, in this order:** pink `#ff7ac6`, red `#ff4d5e`, orange `#ff9f1c`, yellow `#ffd23f`, mint `#4fd98a`, sky `#4fb8ff`, purple `#a77bff`, pearl `#f3ecfa`. **Rows are shapes:** heart, star, round, flower, moon (crescent opening to the upper right), gem (faceted, table at the top). Each bead fills ~85% of its cell, centred, front view, upright | Glossy plastic/glass craft beads for kids: chunky and candy-bright, with a navy outline, a white highlight at the upper left and a tiny string hole on the round bead. All 48 must share lighting, outline weight and scale so a mixed bracelet looks uniform |
| `prop/charm-heart`, `prop/charm-star`, `prop/charm-crown`, `prop/charm-butterfly`, `prop/charm-shell`, `prop/charm-cupcake`, `prop/charm-rainbow`, `prop/charm-horn` | 128×128 each, transparent | Drawn centred, fitted to 2.5 × the bead radius. On the string the code hangs it from its own jump ring, so the image needs **no ring** and should be centred in the canvas | Little jewellery charms: a gold heart locket with a pink gem; a gold star; a gold crown with three gems; a pink-and-purple butterfly; a peachy scallop seashell; a cupcake with a blue wrapper, pink frosting and a cherry; a small four-stripe rainbow with clouds; a gold-and-pearl spiral unicorn horn |
| `prop/bead-tray` | 1300×392 (ratio 650:196), transparent | Stretched over the tray rect. The code draws the bead dimples and beads on top, so the inner area must be plain (from 36 px in at the sides and 14 px at the top and bottom, in 650×196 units) | A shallow wooden craft tray with a rounded honey-wood rim and a deep purple velvet lining, seen from above at a slight angle |
| `prop/pattern-card` | 812×376 (ratio 406:188), transparent | Stretched over the customer's order card; the code draws a speech tail on the left. Keep the top 30 px band and the centre plain: beads go across the middle, and a Y hint glyph sits at the lower right | A cream recipe-style card with a pink washi-tape band at the top, a red pushpin at the top centre and slightly curled corners |
| `prop/bead-shelf` | 448×288 (ratio 224:144), transparent | Stretched under the display of finished bracelets. The pegs are at fixed spots (two rows of three) and the code draws the bracelets on them | A small honey-wood pegboard display stand: a plain board with a pale pattern of pegboard holes |

Optional: the game already asks for the `pose-twirl` pose. Frames for it
for every roster character would replace the code's horizontal squash-spin.

#### New Play Studio game: dream-room

_Requested by the dream-room agent, 2026-10-05. Priority: nice-to-have. The
game is fully playable without any of this: every key below has a
procedural fallback, and the code picks the art up automatically once the
key is in `assets/art/index.json`._

**How the room is built.** A cut-away dollhouse bedroom: back wall
x 420–1500, y 200–590; floor from y 590 (back) to y 930 (front, x 270–1650);
two side walls in perspective (door and light switch on the right one); a
pink roof with the title ribbon above. Wallpapers and floors are drawn by
code (they are swappable patterns), so they are **not** requested. Items
stand on the floor (bottom-centre anchor) or hang on the wall (centre
anchor) and are scaled by depth (×0.78 at the back wall, ×1 at the front).

**Item art rules (all `prop/room-<id>`).**
- Transparent WebP, quality 86, lossless alpha, ≤ 60 KB each. House style:
  navy outlines, cel shading, cute and rounded, soft pastel colours. No text.
- The code fits each image into the item's box (listed below) keeping its
  aspect ratio. Floor items are **bottom-centre anchored** (feet or legs on
  the bottom edge of the canvas). Wall items and rugs are **centred**. Trim
  to the object, with no extra padding.
- Paint the main fabric or paint in the colour listed. The Paint tool
  recolours the art in code (the new colour's hue and saturation over the
  art's own shading), so keep the colourable part in that one colour and
  the other parts (wood, metal, white trim) neutral.
- Draw items from the front and a little above, like the room. Not top-down.
- Items that animate stay procedural and are not requested: fairy lights,
  lava lamp, fish bowl, music box, balloon, butterflies, mirror, bunting,
  rainbow rug, plushies, and the character poster and picture.

##### Backdrop and thumbnail

| Key | Size | Description |
| --- | --- | --- |
| `bg/dream-room` | 1920×1080, opaque, ≤ 350 KB | The playroom **around** the dollhouse: a soft pastel lilac or pink wall with faint stars or polka dots, a blurred toy shelf or window light at the far left and right edges, and a light wooden table top from y≈930 to the bottom. Keep x 250–1670 and y 20–950 plain and soft, because the dollhouse, roof and title are drawn on top. The top-left (x 0–260, y 0–350) and top-right (x 1660–1920, y 0–200) corners hold UI panels, and the characters stand in the bottom corners. |
| `thumb/dream-room` | 800×500 (16:10), opaque, ≤ 90 KB | Menu card: a cozy pink-striped bedroom seen from the front: a window with pink curtains, a white bed with a pink polka-dot blanket and a heart headboard, a unicorn plushie on the pillow, a nightstand with a glowing yellow lamp, a round purple rug, a teddy bear, a potted plant, fairy lights and a framed picture. Warm and sparkly. No text. The code's `drawIcon` shows this layout today. |

##### Furniture (`floor`, bottom-centre anchored)

| Key | Canvas | Box in game | Colour to paint | Notes / prompt |
| --- | --- | --- | --- | --- |
| `prop/room-bed` | 720×424 | 360×212 | blanket **pink #ff8fc2** | Side view, headboard on the **left** (the code flips it). Cream wooden frame, a tall rounded headboard with a heart cut-out, a lower rounded footboard, a white mattress and pillow, and a pink polka-dot blanket over the right two-thirds with a folded top edge. The mattress top must sit about **54% of the height up from the bottom**, because characters bounce on it and plushies sit there. |
| `prop/room-nightstand` | 232×252 | 116×126 | paint **cream #fff1e2** | Small two-drawer bedside table with gold round knobs and short legs. Flat top at the very top of the canvas, since small items sit on it. |
| `prop/room-armchair` | 380×332 | 190×166 | fabric **pink #ff8fc2** | Front view: a puffy rounded armchair with tufted back buttons, a plump seat cushion, round arms and little wooden legs. Seat cushion top at about 50% of the height. |
| `prop/room-beanbag` | 320×224 | 160×112 | fabric **pink #ff8fc2** | Squishy teardrop beanbag with a dent where you sit and a shiny highlight. |
| `prop/room-dresser` | 428×332 | 214×166 | paint **cream #fff1e2** | Three-drawer dresser with two gold knobs per drawer and a flat top, since items sit on it. |
| `prop/room-bookshelf` | 320×512 | 160×256 | paint **cream #fff1e2** | Tall bookcase with three shelves full of rainbow books (a few leaning) and a flat top. |
| `prop/room-toychest` | 372×240 | 186×120 | paint **cream #fff1e2** | Toy chest with a rounded lid, two wooden straps and a big gold star on the front. |
| `prop/room-desk` | 472×296 | 236×148 | paint **cream #fff1e2** | Simple writing desk with two legs on the left, a two-drawer unit on the right and a flat top. |
| `prop/room-rockinghorse` | 440×340 | 220×170 | mane and saddle **pink #ff8fc2** | Side view, head on the **right**: a cream wooden rocking horse on curved wooden rockers, with a pink curly mane, tail and saddle and a happy face. The bottom of the rockers sits on the canvas bottom, because the code rocks it around that point. |
| `prop/room-dollhouse` | 300×320 | 150×160 | roof **pink #ff8fc2** | A tiny toy dollhouse: cream walls, a pink roof with a white heart, blue windows and a little door. |
| `prop/room-petbed` | 320×140 | 160×70 | cushion **pink #ff8fc2** | Round, plump pet bed seen from the front and above: the **back half** of the rim plus the soft inner cushion. The code draws a kitty curled up on the cushion. |
| `prop/room-petbed-front` | 320×140 | 160×70 | cushion **pink #ff8fc2** | The **front half of the rim only**, aligned pixel for pixel with `room-petbed`, with a small paw print. It is drawn over the sleeping kitty. |

##### Lights (the code adds the night glow)

| Key | Canvas | Box | Colour | Notes / prompt |
| --- | --- | --- | --- | --- |
| `prop/room-lamp` | 144×212 | 72×106 | shade **pink #ff8fc2** | Table lamp with a round cream base, a gold stem and a flared pleated shade. Bottom-centre anchored (it stands on tables and on the floor). |
| `prop/room-floorlamp` | 200×524 | 100×262 | shade **pink #ff8fc2** | Tall floor lamp with a thin pole, a round base and a flared shade at the top. |
| `prop/room-nightlight` | 128×144 | 64×72 | star **yellow #ffd23f** | A star-shaped night light with a sleepy smiling face (closed eyes) on a small round base. |

##### Wall decorations (centre anchored)

| Key | Canvas | Box | Colour | Notes / prompt |
| --- | --- | --- | --- | --- |
| `prop/room-window` | 512×464 | 256×232 | curtains **pink #ff8fc2** | White window frame with a cross bar, a sill, a gold curtain rod and two pink curtains tied back with gold bands. **The glass must be transparent**: the code draws the day or night sky behind it in the rectangle x 84–428, y 64–384 of the 512×464 canvas (window centre at 256, 232). |
| `prop/room-poster` | 300×392 | 150×196 | paper **cream #fffaf0** | Taped-on poster: a rainbow arching over two fluffy clouds, with a few stars, hearts and sparkles. |
| `prop/room-clock` | 232×248 | 116×124 | body **pink #ff9ec4** | Round alarm clock with two gold bells on top and little feet. **No hands**: the code draws them at the real time, and the face centre is at (116, 136). |
| `prop/room-shelf` | 428×120 | 214×60 | paint **cream #fff1e2** | A floating wall shelf: a plank with two little brackets underneath. The top of the plank must be at **y≈36** of 120, because plushies and lamps sit there. |

##### Plants, toys and rugs

| Key | Canvas | Box | Colour | Notes / prompt |
| --- | --- | --- | --- | --- |
| `prop/room-plant` | 260×412 | 130×206 | pot **pink #ff9ec4** | Big leafy house plant (monstera-like) in a pot with a white heart. Bottom-centre anchored. |
| `prop/room-flowers` | 140×216 | 70×108 | vase **pink #ff9ec4** | Little vase with a daisy, a pink tulip and a purple flower. |
| `prop/room-cactus` | 128×192 | 64×96 | pot **pink #ff9ec4** | Cute cactus with two arms, a smiling face, blush and a pink flower on top, in a small pot. |
| `prop/room-teddy` | 172×188 | 86×94 | fur **brown #c98a5a** | Sitting teddy bear with a pink bow tie. |
| `prop/room-ball` | 120×120 | 60×60 | **red #ff4d6d** stripes | Beach ball with red, white and yellow wedges. |
| `prop/room-blocks` | 200×180 | 100×90 | **pink #ff6fb1** | Three toy blocks, two on the bottom and one on top, with heart, star and circle symbols (no letters). |
| `prop/room-rug-round` | 660×280 | 330×140 | **pink #ff9ec4** | Round rug seen at a low angle (a wide 2.4:1 oval) with pink, white and light-pink rings. Centred. |
| `prop/room-rug-heart` | 660×300 | 330×150 | **pink #ff9ec4** | Heart-shaped fluffy rug, flattened by the same low angle, with a lighter inner heart. |
| `prop/room-rug-star` | 740×320 | 370×160 | **pink #ff9ec4** | Star-shaped rug, flattened the same way, with a lighter inner star. |

**Reused existing art (no new image needed):** `prop/rubber-duck` (the
rubber duck toy, recoloured), `prop/present` (the present toy and the
surprise box, recoloured), `prop/balloon-<colour>` (the balloon toy, 8
colours), every character's base art (plushies with a stitched white
outline, and the star poster) and the portraits (the framed picture).

**Poses the room tour uses** (already in `POSES`, with fallbacks): `sit`
(in the armchair or beanbag), `jump` and `fall` (bouncing on the bed),
`dance`, `wave`, `cheer`, and `photo` (a peace sign for the group photo).
Authored frames for `sit` and `photo` would help the most.

#### New Play Studio game: seek-and-find

_Hide & Seek Picnic_ (requested by the seek-and-find agent, 2026-10-05,
priority: nice-to-have). The game is fully playable today: every scene,
occluder and creature is drawn in code, and the objects already use existing
props (`prop/golden-cupcake`, `prop/treat-cupcake`, `prop/rubber-duck`,
`prop/gem-blue|purple|green`, `prop/topper-strawberry`, `prop/topper-star`,
`prop/crown-gold`, `prop/tiara-star`, `prop/wand-star`, `prop/treat-lollipop`,
`prop/treat-donut`, `prop/owl-mail`, `prop/present`, `prop/lantern-on`,
`prop/potion-bottle`, `prop/ing-snow-crystal`, `prop/ing-moon-drop`,
`prop/fairy-pink|blue|yellow`, `prop/firefly`, `prop/cookie-1`, the
`prop/balloon-<color>` set, `prop/plant-*-bloom` / `prop/plant-*-glow` for
flower clumps and `prop/plant-glow-mushroom-glow` for the big forest
mushrooms). The friends who hide are the players' own characters plus
Fellowfox, Glimmer and Professor Hoot (their sprite sets).

**How a scene is built (read before drawing anything).** Each round has three
layers: (1) a **back layer** `bg/seek-and-find-<scene>` with no hiding places
in it; (2) the hidden things, drawn by code; (3) **occluders**: separate props
(`prop/seek-<type>`) that the code places on top at the positions below, and
that the hidden things peek out from behind. The code measures how much of
each hidden thing shows past the occluder's actual pixels, so occluder art
can have any silhouette. It must be **opaque** wherever it should hide things
(soft or semi-transparent edges count as see-through). Half the time a scene
is **mirrored left-right**, so nothing may contain text and the back layer
must look fine flipped. Positions are in the 1920x1080 canvas, unmirrored.
"Base" = the bottom center of an occluder. Keep the top 120 px calm (player
chips and round icons sit there) and the bottom 170 px plain (the picture
list and the controls legend cover it).

##### Backgrounds (`bg/<key>`, 1920x1080, opaque, WebP q80-85, <= 350 KB)

| Key | Prompt-style description | Must line up with (unmirrored px) |
| --- | --- | --- |
| `bg/seek-and-find-picnic` | Sunny spring meadow for a picnic, gentle three-quarter view: soft blue sky with 3-4 puffy clouds and a cheerful sun in the top-right corner, rolling pale-green hills with tiny round trees on the horizon (y about 470-540), a bright meadow sprinkled with tiny daisies, a winding sandy path from the bottom right up to the hills, a small blue pond on the left with two lily pads, and a red-and-white gingham picnic blanket in the middle with a large plate, a smaller plate, a blue flowered teapot and two cups. No bushes, trees, rocks, logs or tall grass (code adds those). | Blanket corners (690,640) (1190,640) (1270,822) (610,822). Plates centered at (842,734) rx 70 and (1036,780) rx 54 (code draws cupcakes and cookies on them). Teapot at (960,690). Pond ellipse center (330,770), radii 250x86. Lily pads at (250,792) and (436,774) (things sit on them). Sun near (1760,112). |
| `bg/seek-and-find-toyshop` | Cozy pastel toy shop, straight-on: pink-and-cream striped wallpaper with little white stars, a mint wainscot band, bunting along the very top, a big four-pane window in the top center showing sky, clouds and a green hill, a white window sill, two tall empty wooden shelf units (left and right) with three shelf boards each, two small framed star pictures and a round wall clock, a warm wooden plank floor, and a big oval lilac rug in the middle of the floor. The shelves are empty except for a couple of small balls at the ends (code places books, jars and block towers on them). | Wall/floor line y = 710. Window frame (770,120)-(1150,410); sill top y = 400 from x 740 to 1180 (things sit on it at (860,404) and (1060,404)). Shelf units x 60-500 and x 1400-1860, y 150-710; tops of the shelf boards at y = 336, 512 and 690. Rug center (960,830), radii 440x96. Curtains are code props hung at x 735 and 1185, so keep the sides of the window plain. |
| `bg/seek-and-find-forest` | Magical starry forest at night, three-quarter view: deep indigo-to-violet sky with soft stars, a big friendly yellow moon with a halo top-left, a row of soft dark-blue pine silhouettes on the horizon (y about 450-540), dark teal mossy ground with faint glowing specks, a path of softly glowing stepping stones winding up the middle, and a calm dark-blue pond on the right reflecting the moon, with two lily pads. Gentle and cozy, not scary; keep the middle readable (things hide there). **No fireflies anywhere** (finding fireflies is a task). No trees, bushes, mushrooms or ferns in the foreground (code adds those). | Moon center (330,170), r 68. Pond ellipse center (1460,775), radii 244x82; lily pads at (1400,792) and (1540,764). The ground starts around y = 556. |

##### Thumbnail

| Key | Size | Description |
| --- | --- | --- |
| `thumb/seek-and-find` | 800x500, opaque, WebP q85, <= 90 KB | A sunny picnic meadow with a gingham blanket. A giant magnifying glass with a pink handle in the right half shows a golden cupcake hidden in the grass, magnified. A white bunny's ears and eyes peek over a round bush on the left, and a ladybug sits on the blanket edge. Optionally Felicity peeking from behind a tree trunk (use her canonical). No text. |

##### Occluder props (`prop/seek-<type>`, transparent, bottom center = base)

The code fits each image (contain) into the box and stands it on the base,
so match the box aspect. Sizes are the box at scale 1; deliver at 1.5-2x,
because the zoom glass magnifies up to 2.4x. House style: bold navy outlines,
cel shading, soft colors. Types that also appear in the night forest need a
`-night` twin with the same silhouette in moonlit colors (dark teal leaves,
violet-grey rocks, glowing cyan/yellow accents).

| Key | Box (w x h) | Anchor / layout notes | Description |
| --- | --- | --- | --- |
| `prop/seek-tree` + `prop/seek-tree-night` | 430 x 552 | Base = middle of the trunk foot; roots reach 12 px below it. Trunk about 70 wide, with a dark round **hollow** centered 150 px above the base (an owl or a gem sits in it). Big round canopy from 230 to 540 px up, about 400 wide. | Big friendly cartoon oak: a round lumpy canopy of overlapping leaf clusters with a few red apples (night: dark teal leaves with tiny glowing yellow fruit), and a sturdy brown trunk with root flares and a round knot-hole. |
| `prop/seek-bush` + `prop/seek-bush-night` | 276 x 148 | Bottom center; dome shape, flat bottom. | Round leafy bush made of 5-6 overlapping puffs, with a few tiny pink flowers or yellow berries (night: dark teal with glowing berries). |
| `prop/seek-rock` + `prop/seek-rock-night` | 184 x 92 | Flat bottom; the top is fairly flat so a snail can sit on it (92 px up). | Smooth lavender-grey boulder with two crack lines (night: violet-grey with a cap of glowing green moss). |
| `prop/seek-log` + `prop/seek-log-night` | 256 x 84 | Lying on its side. The cut end, with a dark **hole**, is on the right, centered about 100 px right of and 34 px above the base. | Fallen log with bark lines, a ring-cut end with a dark hollow, and two tiny mushrooms on top (night: mossy, with glowing mushrooms). |
| `prop/seek-tuft` + `prop/seek-tuft-night` | 96 x 62 | Flat bottom. | Small clump of 6 pointy grass blades fanning out. |
| `prop/seek-reeds` + `prop/seek-reeds-night` | 220 x 156 | Flat bottom (stands on the back edge of the pond). | Cluster of tall pond reeds and 4 cattails. |
| `prop/seek-fern` | 200 x 126 | Flat bottom (night forest only). | Six arching dark-green fern fronds fanning out, with moonlit edges. |
| `prop/seek-basket` + `prop/seek-basket-back` | 200 x 136 (both) | The front is the woven body, the front half of the rim and the handle. The **back** image is only the dark inside and the back half of the rim, with a pink napkin corner. Things peek up out of the basket between the two, so the front must be opaque below the rim line (74 px up). | Classic wicker picnic basket, open, with an arched handle. |
| `prop/seek-books` | 160 x 100 | Stands on a shelf board; uneven top edge. | A row of 7-8 chunky colorful picture books standing upright, in different heights. |
| `prop/seek-blocks` | 180 x 154 | Stands on the base: a stepped pyramid of 6 cubes (3-2-1). | Wooden toy blocks with painted stars and dots in bright colors. |
| `prop/seek-jar` + `prop/seek-jar-back` | 88 x 116 (both) | A **see-through** glass candy jar: the glass must be mostly transparent (alpha under 40%), so a hidden lollipop shows through. The lid and the sweets are opaque. | Round glass sweet jar with a colored lid and three gumballs at the bottom. |
| `prop/seek-chest` + `prop/seek-chest-back` | 260 x 216 (both) | Front = the chest body (bottom 116 px) with its rim. **Back** = the open lid leaning back, and the dark inside. Things and friends peek up out of the chest between the two. | Pastel striped toy chest with a gold rim and a star on the front, lid open. |
| `prop/seek-curtain` | 180 x 604 | Hangs from the top (600 px up) to the floor. The **inner edge** (the right side, unmirrored) bows inward, with a gold tie-back 330 px up. Used twice (once mirrored) beside the window. | Soft pink velvet curtain with vertical folds and a gold tie-back. |
| `prop/seek-dollhouse` + `prop/seek-dollhouse-back` | 300 x 334 (both) | Front = walls and roof with **transparent window and door holes** at these rectangles, relative to the base: windows (-100,-200)-(-36,-144), (36,-200)-(100,-144) and (-100,-96)-(-36,-40); door (32,-100)-(88,0). Things are seen through them. Back = the warm interior wall (only needed behind the holes). | Cute two-storey dollhouse with a pink roof, a round attic window and flower boxes. |
| `prop/seek-bigteddy` | 240 x 256 | Sitting, flat bottom. | Giant sitting teddy bear with a red bow tie, cuddly and soft. |
| `prop/seek-presents` | 240 x 174 | Flat bottom. | Stack of three gift boxes (blue, pink, lilac) with ribbons and bows. |
| `prop/seek-drum` | 160 x 114 | Flat bottom; a drumstick rests on top at the right. | Toy drum with a zigzag pattern and a cream drumhead. |

##### Hideable creature and toy props (`prop/seek-<id>`, transparent, centered)

Each one replaces a drawn version. Hidden things are small in the scene (the
height below, in px) and are also drawn big (about 80 px) on the picture
cards, so they need a clear, chunky silhouette that reads at both sizes.
Deliver at about 3x the scene height. The drawn versions animate (ears
twitch, tails swish, wings flap); with art, the code adds a gentle wobble,
hop or flap instead.

| Key | Scene height | Description |
| --- | --- | --- |
| `prop/seek-ladybug` | 28 | Top-down ladybug facing right: red shell with black spots and a center line, black head with two white eyes and curly antennae. |
| `prop/seek-bunny` | 74 | Sitting white bunny, front view: tall pink-lined ears, rosy cheeks, pink nose. The ears are the part that peeks out, so keep them long. |
| `prop/seek-butterfly` | 40 | Butterfly seen from above with wings open: pink upper wings with purple spots. |
| `prop/seek-snail` | 36 | Side-view snail facing right: pink spiral shell, pale yellow-green body, eyes on stalks, a smile. |
| `prop/seek-mouse` | 36 | Side-view grey mouse facing right: big round pink-lined ear, long pink tail curling up behind. |
| `prop/seek-bird` | 44 | Round little bluebird facing right: pale belly, orange beak, tiny head tuft. |
| `prop/seek-frog` | 42 | Sitting green frog, front view: big eyes on top, wide smile, pale throat. |
| `prop/seek-owl` | 58 | Small round purple owl, front view: ear tufts, big amber eyes (not Professor Hoot). |
| `prop/seek-scarf` | 46 | **Fox's lost scarf**: a knitted orange-and-cream striped scarf lying in a loose S-curve, with fringed ends. |
| `prop/seek-teddy` | 62 | Small sitting brown teddy bear with a pink nose. |
| `prop/seek-block` | 40 | One toy block in three-quarter view, pink with a yellow star on the front. |
| `prop/seek-ball` | 44 | Beach ball with red, white, blue and yellow segments. |

#### New Party game: cloud-hop

##### cloud-hop — Cloud Hop   (requested by the cloud-hop agent, 2026-10-05, priority: nice-to-have)

A vertical platformer race: everyone bounces up one shared sky tower of
clouds (side view) to a golden rainbow summit. The camera scrolls up; the sky
colour shifts with altitude in code (morning blue → lavender → sunset pink →
twilight purple with stars), so the background art is tinted over by the
code and should stay a calm, neutral sky. Every key below has a procedural
fallback that ships today and is picked up automatically once it is in
`assets/art/index.json`. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text**. Characters are drawn at 0.56–0.7
scale (≈ 75–130 px tall), so platforms are sized to match. Clouds are
squashed/stretched by code when bounced on, so keep them as single objects
with no cast shadows.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/cloud-hop` | 1920×1080, opaque | Screen-fixed behind everything (it does not scroll), then washed 35% toward the altitude colour by code. Code draws the sun/moon, parallax clouds, hot-air balloons and twinkles on top. Keep the top ~120 px and the right 140 px calm (HUD chips and the height track) | A soft, dreamy open sky with no ground and no horizon: a gentle pastel gradient (light blue at the top to pale pink-peach at the bottom) with a few very faint, wispy far-away clouds and tiny pale sparkles. Low contrast and low detail so foreground clouds and characters read clearly |
| `thumb/cloud-hop` | 800×500, opaque | Game-select shelf and how-to screen, drawn with `cover` fit (procedural `drawIcon` is the fallback) | A cheerful character bouncing high off a fluffy white cloud with motion lines, a stack of clouds climbing up the picture (a pink springy cloud, a grey sleepy rain cloud, a trampoline), a glowing gold star, and a big rainbow arch with a gold star on top at the summit, against a sunset-pink-to-lavender sky. Subject centred |
| `prop/cloudhop-cloud` | 512×200, transparent | A normal cloud platform, **stretched** (not aspect-kept) into a box (platform width + 20) × (≈96 px) for widths 160–250 px. The landing line (where feet touch) is about **16% down from the top edge** of the image; the puffy bumps rise slightly above it, the rounded body hangs below | A fluffy white cartoon cloud seen from the side: a row of round puffs on top, a soft rounded underside with pale periwinkle cel shading, navy outline, a small highlight on the top-left puffs. Optional tiny happy closed-eye face with pink cheeks on the lower body. Wide and fairly flat (about 2.6:1) |
| `prop/cloudhop-cloud-pink` | 512×200, transparent | Same box and landing line as `prop/cloudhop-cloud`. The super-bouncy cloud (launches you very high) | The same cloud shape in bubblegum pink with deeper pink shading, a surprised "ooh" face, little gold coil springs peeking out underneath, and a white sparkle. Looks bouncy and fun |
| `prop/cloudhop-cloud-rain` | 512×200, transparent | Same box and landing line as `prop/cloudhop-cloud`. Puffs away after one bounce (code fades/scales it and adds drops) | The same cloud shape in soft blue-grey, with a sleepy, content closed-eye face (not grumpy, not scary), two or three tiny light-blue raindrops dangling underneath |
| `prop/cloudhop-cloud-drift` | 512×200, transparent | Same box and landing line as `prop/cloudhop-cloud`. Slides left and right (code adds wind swooshes) | The same cloud shape in pale lavender with white highlights and a couple of tiny curly wind swirls on its sides |
| `prop/cloudhop-trampoline` | 384×200, transparent | Bottom-centre anchored 70 px below the landing line, fitted (aspect kept) into (≈190)×100 px. The **top of the trampoline mat is 30% down from the top edge** | A small round party trampoline on a little white cloud: a pink-and-white striped stretchy mat, yellow ball rims at the ends, short sky-blue legs, side view |
| `prop/cloudhop-bridge` | 1440×280, transparent | A wide rainbow bridge platform, **stretched** into 720×140 px centred 40 px below the landing line. The landing line is **21% down from the top edge**, flat across | A short, gently sagging rainbow-striped bridge (red, orange, yellow, green, blue, purple bands) with a navy outline and a white shine stripe, resting on a fluffy white cloud puff at each end. Side view, flat top |
| `prop/cloudhop-star` | 256×256, transparent | Collectible star, drawn centred and fitted into 72×72 px (code adds a soft glow and a gentle wobble) | A chubby glossy gold five-point star with rounded tips, navy outline, a white shine on the upper left. Optional tiny happy face |
| `prop/cloudhop-bubble` | 256×256, transparent | The rescue bubble that floats a fallen player back up, drawn centred over the character and fitted to ≈2.1 × the bubble radius (≈ 150–220 px). The character must show through it | A big round soap bubble: mostly transparent centre, an iridescent pink-blue-lilac rim, a white curved highlight at the upper left, a thin white outline |
| `prop/cloudhop-summit` | 1640×520, transparent | The goal, bottom-centre anchored 60 px below the summit landing line and fitted into 1640×520; the code draws a full-width golden cloud bank over the bottom ~70 px | A huge, glowing rainbow arch (seven bands with a navy outline and a white shimmer) spanning almost the full width, with a big chubby gold star on top at the centre and golden sparkles around. No ground: the arch feet are hidden by clouds drawn in code |
| `prop/cloudhop-balloon` | 260×360, transparent | Background decoration, centred and fitted into ≈ 75–110 × 100–155 px, drawn at 85% opacity drifting slowly | A cute hot-air balloon with candy stripes (pink and white), a little woven basket on ropes, navy outline, soft shading. Empty basket |

New sprite pose wished for (optional; the game reads fine with the
fallbacks): `spring-jump` (one-shot; fallback `dance-star` → `jump`) —
launching upward off a trampoline, arms straight up, knees tucked, big grin.
The game already uses the existing poses `jump`, `fall`, `dance-star`
(flutter hop / rocket), `float` (in the rescue bubble), `hurt`, `dizzy`,
`cheer`, `celebrate` and `pout`.

#### New Party game: mini-golf

##### mini-golf — Candy Mini-Golf   (requested by the mini-golf agent, 2026-10-05, priority: nice-to-have)

Everyone putts at the same time on a top-down candyland mini-golf green (3
short holes: gumdrop bumpers + a spinning lollipop spinner; a chocolate river
with a cookie bridge and a jelly bounce pad; a hairpin with a slope and a
donut warp). Every key below has a procedural fallback that ships today; the
code already looks each one up, so a file listed in `assets/art/index.json`
drops in with no code change. The course itself (mint felt, candy-cane rails,
the river, the slope) is drawn by code because its shape changes per hole.
The balls are drawn by code in each player's colour. House style: navy
`#24163f` outlines, soft cel shading, bright candy colours, **no text** in any
image. Props are seen **from above** (top-down, a slight 3/4 tilt is fine).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/mini-golf` | 1920×1080, opaque | Full screen, behind everything. The code paints the course over the middle (x 100–1820, y 240–935), so keep that area plain pink meadow. Top ~110 px sits under the scoreboard (keep calm). The bottom strip y 960–1080 is the sidewalk where finished players stand and cheer | A candyland meadow seen from above: soft pink cotton-candy grass with pastel sprinkles, lollipop trees, gumdrop bushes, candy-cane posts and ice-cream-cone shrubs around the edges, and a pastel rainbow-tiled sidewalk along the bottom edge. Low detail in the middle |
| `thumb/mini-golf` | 800×500, opaque | Game-select shelf and how-to screen (procedural `drawIcon` is the fallback) | A mint mini-golf green with candy-cane rails, a pink flag in the cup, three colourful golf balls rolling toward it, a gumdrop bumper and a spinning lollipop, a candy-cane putter in the foreground, sparkles. Subject centred |
| `prop/golf-gumdrop` | 128×128, transparent | Centred on each round bumper, fitted to 2.3 × its radius (≈ 70–92 px). Squashes when hit | A big shiny gumdrop seen from above at a slight tilt: a sugar-crystal dome (pink), round footprint, navy outline, white highlight |
| `prop/golf-lollipop` | 96×96, transparent | The candy at the end of each spinner blade, centred on the blade tip, drawn 62 px and **rotated with the blade** (the code draws the stick) | A round swirl lollipop seen straight from above: pink-and-white spiral, navy outline, glossy highlight. Perfectly round, centred |
| `prop/golf-spinner-hub` | 96×96, transparent | Centred on the spinner's axle, 68 px, rotated with the blades | A round peppermint-candy hub seen from above: red-and-white pinwheel stripes, a small gold cap in the middle |
| `prop/golf-donut` | 160×160, transparent | The warp entrance, centred, 120×120. The ball disappears into the hole (hole diameter ≈ 47% of the donut) | A pink-frosted donut seen from above with rainbow sprinkles; the hole is a deep magical purple swirl with tiny stars |
| `prop/golf-donut-exit` | 160×160, transparent | The warp exit by the cup, centred, 120×120 (same layout as `prop/golf-donut`) | The same donut with chocolate frosting and white sprinkles; the hole is a bright sparkly swirl |
| `prop/golf-jelly` | 160×160, transparent | The bounce pad, centred, 2.2 × its radius (≈ 132 px). The code wobbles it when a ball bounces | A round wobbly strawberry jelly pad seen from above: translucent red-pink, glossy highlights, a little heart in the middle |
| `prop/golf-cookie-bridge` | 440×230, transparent | Stretched over the bridge rectangle (220×115 in game units), crossing a chocolate river from left to right | A bridge made of a long golden graham-cracker cookie with chocolate chips, seen from above, slightly rounded corners, little crumbs on the edges |
| `prop/golf-flag` | 96×200, transparent | Bottom-anchored at the cup centre (pole foot = bottom centre of the image), drawn 64×134 | A golf flag on a red-and-white candy-cane pole with a pink pennant with a white star, slight 3/4 view (pole upright) |
| `prop/golf-cup` | 64×64, transparent | Centred on the hole, 56 px | A round mini-golf cup seen from above: dark inside, white rim, light felt edge |

New sprite poses (optional; the game works with existing poses today):

| Pose | Loop | Fallback (existing) | Description |
| --- | --- | --- | --- |
| `putt` | yes | `crouch` → `idle` | Standing side-on over the ball holding a putter low with both hands, knees bent, looking down (the code draws the putter) |
| `putt-swing` | no | `action` | A gentle putting stroke: arms swing the putter forward, then look up hopefully |

#### New Party game: musical-cushions

##### musical-cushions — Musical Cushions   (requested by the musical-cushions agent, 2026-10-05, priority: nice-to-have)

Musical chairs at a cosy party: fluffy cushions sit in a ring on a big round
rug, everyone dances around while the record player plays, and when the
needle lifts they race to plop down. Everything below has a procedural
fallback that ships today; the code already looks up every key. House style:
navy `#24163f` outlines, soft cel shading, bright candy colours, **no text**.
Characters use the existing `sit`, `dance`, `hip-bump`, `knockback`, `dizzy`,
`clap`, `pout` and `celebrate` poses.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/musical-cushions` | 1920×1080, opaque | Full screen under everything. **Layout must match:** back wall from y=0 to y=400 (floor line at y=400); a big round rug centred at (960, 735), radius 640×300 (ellipse); cheer mats on the far left (x 16–196) and far right (x 1724–1904), y 460–980. Keep the wall centre (x 620–1300, y 180–400) plain: the code draws the record-player table and two speakers there. Keep the top 110 px calm (score chips) | A cosy pastel party room seen from a high 3/4 angle: pink-and-lilac striped wallpaper with tiny hearts, two windows with an evening sky and pink curtains, balloon bunches in the top corners, rainbow bunting across the wall, a white wainscot; honey-wood floorboards; a huge round scalloped rug in pink, mint and cream rings with polka dots and a yellow star in the middle; small fluffy mats with pom-poms along the left and right edges. No furniture in the middle, no characters |
| `thumb/musical-cushions` | 800×500, opaque | Game-select shelf and how-to screen | Four fluffy pastel cushions in a ring on a round rug, two characters mid-dance about to dive for them, a pink record player with music notes flying out, party bunting. Subject centred |
| `prop/cushion-0` … `prop/cushion-7` | 280×224 each, transparent | Drawn bottom-anchored: the image bottom = the bottom of the cushion's front side, centred horizontally; fitted to 1.12× the cushion width (118 px at 1–4 players, smaller with more). The code squashes it when someone sits and hops it on the beat. Players sit on the top face | A plump square floor cushion seen from a high 3/4 angle (top face plus a thin front side), puffy bulging edges, a tufted button in the centre with soft creases, little tassels at the two back corners. Colours (top / button): 0 pink / yellow, 1 mint / pink, 2 lilac / yellow, 3 lemon / pink, 4 sky blue / white, 5 peach / mint, 6 coral / cream, 7 lime / lilac. All eight identical except colour |
| `prop/record-player` | 560×380, transparent | Drawn bottom-anchored on top of the code's little wooden table, fitted to 280×190 px, centre x 960, bottom y 316. The code draws the **tone arm** itself (pivot at the back right, needle resting on the disc left of centre), so leave the arm out | A cute retro pink suitcase record player, lid open behind, a black vinyl record with a yellow label on the platter, three candy-coloured knobs and a little speaker grille on the front. 3/4 view from slightly above |
| `prop/party-speaker` | 240×340, transparent | Bottom-anchored on the floor at (735, 408) and (1185, 408), fitted to 120×170; the code pulses it on the beat | A rounded lilac party speaker box with two round cones (small tweeter on top, big woofer below) with pink centres, a soft highlight on the left edge |

#### New Party game: pancake-tower

##### pancake-tower — Pancake Tower   (requested by the pancake-tower agent, 2026-10-05, priority: nice-to-have)

A diner-kitchen stacking game. Every player has a plate on a long pink
counter (one lane each, 1–8 lanes side by side) and a flying chef pan that
slides back and forth above the tower; A drops what is in the pan. Badly
stacked towers wobble and topple in a cartoon crash. Everything below has
a procedural fallback that ships today, and the code already looks up every
key. House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Stack items are seen **from the side,
very slightly from above** (a thin sliver of the top surface shows), so
they stack flush on each other. All props are transparent WebP, trimmed to
the object with no padding. Lane scale is 0.48× (8 players) to 1.25× (1–3
players) of the design sizes below, and the whole scene zooms out further
as towers grow, so props must read when small.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/pancake-tower` | 1920×1080, opaque | Full screen behind the lanes. The counter top edge is at y=920 (plates and characters stand on it); the counter front fills y 920–1080. The top ~120 px hold the scoreboard and timer; the middle is mostly covered by translucent lane columns, so keep it low-detail | A bright, cozy pastel diner kitchen: butter-yellow wall with soft white vertical stripes, a big round window with blue sky and clouds at the top centre, copper pans and whisks hanging along the upper left and right edges, a shelf with syrup bottles and a jar of strawberries at the far sides. A long counter across the bottom: pink marble top edge at y≈920, mint-and-white checker tiles on the counter front. Warm morning light |
| `thumb/pancake-tower` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A tall, slightly leaning stack of fluffy pancakes on a white plate with butter, strawberries and syrup dripping down, a smiling frying pan with a tiny chef hat flipping one more pancake high in the air above it, sparkles, pastel diner background. Subject centred |
| `prop/pancake` | 520×98, transparent | Bottom-centre anchored, **stretched** to the item box (pancake 200×30 design units → box 208×39). Stacks of these sit flush on each other | One fluffy golden-brown pancake seen from the side: a thick rounded slab with a darker cooked edge, a lighter fluffy top sliver, a few tiny bubbles on the rim |
| `prop/pancake-golden` | 754×104, transparent | Same as `prop/pancake`, box 302×42 (the extra-wide bonus pancake; the code adds twinkles) | An extra-wide magical golden pancake from the side: shiny gold-yellow, glowing edge, a few sparkles on its rim |
| `prop/waffle` | 458×130, transparent | Same, box 183×52 | A thick square Belgian waffle seen straight from the side: golden grid pockets on its front face, crisp edges |
| `prop/butter-pat` | 188×65, transparent | Same, box 75×26. Squashed flat (×0.45 tall, ×1.2 wide) by code when covered | A small pale-yellow butter pat block with soft rounded corners and a tiny melting drip |
| `prop/strawberries` | 322×110, transparent | Same, box 129×44. Squashed when covered | Three cute red strawberries with green leaf tops in a little cluster, seen from the side, sitting on a flat bottom |
| `prop/cream-swirl` | 291×150, transparent | Same, box 116×60. Squashed when covered | A white whipped-cream swirl in three tiers with a pointed tip and a red cherry on top, flat bottom |
| `prop/pancake-plate` | 780×80, transparent | Bottom-centre anchored on the counter (box 312×32 design units); the code adds a player-colour band at the bottom, so keep the plate white/pale | A plain round white diner plate seen from the side, slightly from above: a thin oval rim on top of a short tapered foot, soft blue-grey shading |
| `prop/chef-pan` | 740×264, transparent | Box 295×105 design units, bottom edge on the bowl's bottom; the bowl's centre is **42% from the left edge** of the image (the bowl spans 0–83% of the width, the handle the rest). The pancake sits in the bowl. The code tilts it to drop the pancake | A cute flying frying pan character: dark blue-grey non-stick bowl seen from the side with a friendly face (big eyes, rosy cheeks, smile) on its front, a lighter rim, a **short** wooden handle on the right angled up about 25°, with a tiny white chef hat perched on the handle end |
| `prop/syrup-bottle` | 320×480, transparent | Centred, box 100×150; the code rotates it to pour from the spout (spout up at rotation 0) | A cartoon maple-syrup bottle: rounded amber glass bottle full of syrup with a red cap, a cream label with a pink heart (no text), glossy highlight |

Poses: existing ones only (`idle`, `balance` while the tower wobbles,
`cheer`, `action`, `surprised`, `dizzy`, `celebrate`, `clap`).

#### New Party game: pinata-party

##### pinata-party — Piñata Party   (requested by the pinata-party agent, 2026-10-05, priority: nice-to-have)

A backyard birthday party: big crepe-paper piñatas swing on ropes from a
striped wooden frame, players whack them with padded party bats, and a
shower of candy bursts out for everyone to scramble after. Everything below
has a procedural fallback that ships today; the code already looks up every
key, so a file listed in `assets/art/index.json` drops in with no code
change. House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Piñatas are cute and friendly (they giggle
when hit); keep them cheerful, never scary. Characters reuse the roster
sprites (`action`, `cheer`, `celebrate`, `pout`, `hurt`, `dizzy`, `walk`, `run`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/pinata-party` | 1920×1080, opaque | Full screen, drawn as is. **Layout must match:** keep the top ~110 px calm (score chips sit there); a wooden crossbar spans the width at y≈145–170 (x 40–1880) on two candy-cane striped posts at x≈64 and x≈1856 that stand on the lawn at y≈470 (the ropes hang from the crossbar, the code draws ropes and knots); sky and trees above a white picket fence at y≈300–410; lawn from y≈400 to the bottom. The play area (x 100–1820, y 455–1035) must stay open, plain grass | A sunny backyard birthday party seen from a slightly raised angle: soft blue sky with puffy clouds and a sun at the upper right, round green trees behind a white picket fence with balloon bunches tied to it, a party table with a striped cloth, a small cake and presents at the back right just behind the fence line, rainbow triangle bunting hanging under a honey-wood crossbar held up by red-and-white striped posts at both edges, and a wide bright striped lawn with a few daisies |
| `thumb/pinata-party` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A rainbow star piñata with crepe-paper fringe and tassels swinging on a rope over a backyard lawn, a cute character swinging a striped padded party bat at it, wrapped candies, lollipops and one glowing golden candy bursting out with confetti. Subject centred |
| `prop/pinata-star` | 520×520, transparent | Body centre at pixel (260, 280); fills ~70% of the width; drawn rotated/squashed/twirled as it swings (scale ~0.7–1.1). The rope ties on at the **top point**, pixel ≈ (260, 100). The code adds the rainbow tassels on the four lower points, cracks over the middle and nothing else, so **include a cute face** (two eyes, smile, pink cheeks) | A classic five-pointed star piñata covered in horizontal rows of rainbow crepe-paper fringe (pink, orange, yellow, green, blue, purple), cute smiling face in the middle, front view |
| `prop/pinata-unicorn` | 520×520, transparent | Body centre (middle of the torso) at pixel (260, 280), facing **right**, spanning about x 80–480. The rope ties on the middle of the back, pixel ≈ (240, 232). The code draws the rainbow tail tassel at the rump (left) | A unicorn piñata in side view: pastel white, pink, lilac and sky crepe-paper fringe rows, a rainbow curly mane, a gold spiral horn, lilac hooves, a cute happy eye and smile |
| `prop/pinata-llama` | 520×520, transparent | Same placement as the unicorn: torso centre at (260, 280), facing right, rope on the middle of the back ≈ (240, 245) | A llama piñata in side view with a long neck and banana ears: cream, pink, mint and yellow fringe rows, a woven red/yellow/teal blanket with pom-poms on its back, a cute happy eye and smile |
| `prop/pinata-donkey` | 520×520, transparent | Same placement as the unicorn: torso centre at (260, 280), facing right, rope on the middle of the back ≈ (244, 238). The code draws the tail tassel at the rump | A classic donkey (burro) piñata in side view with tall ears: bright rainbow crepe-paper fringe rows, a pink spiky fringe mane, a cute happy eye and smile |
| `prop/party-bat` | 480×120, transparent | Horizontal, knob at the left edge, the hand's grip point 20% in (x=96, vertical centre), padded barrel out to the right edge. Drawn rotated in the character's hand at 1.2 × 0.6 × the character's height long (≈120–150 px), swung overhead | A soft padded party bat for kids: a blue grip-taped handle with a yellow knob and a fat rounded foam barrel with pink-and-white candy stripes. Clearly soft and toy-like |
| `prop/candy-wrapped` | 128×128, transparent | Centred, drawn at 72×72 (contain); bounces and spins on the lawn | A twist-wrapped round sweet (bow-tie wrapper ends), glossy pink wrapper with white diagonal stripes |
| `prop/candy-lollipop` | 128×128, transparent | Centred, drawn at 72×72 (contain) | A round swirl lollipop (blue and white spiral) on a short white stick |
| `prop/candy-golden` | 128×128, transparent | Centred, drawn at 72×72 (contain); the code adds a pulsing glow behind it | A shiny golden twist-wrapped candy with a white sparkle on it, extra glossy (worth 5 points) |

New pose wanted (the game already asks for it; until it exists it falls back
to `action`): **`swing`** — one-shot, a two-handed overhead swing of a bat
from behind the shoulder forward and up (as if hitting something just above
head height), cheerful face. Quadrupeds can rear up on the hind legs; the
cake can do a big hop forward.

#### New Party game: snowball-splat

##### snowball-splat — Snowball Splat   (requested by the snowball-splat agent, 2026-10-05, priority: nice-to-have)

A top-down snowball free-for-all in a snowy cottage garden: players pack
snowballs, throw them across the yard, hide behind snow-fort walls and
snowmen (which crumble when hit and pop back up), and grab a giant rolling
snowball or a red triple-throw mitten. Everything below has a procedural
fallback that ships today (`party/src/games/snowball-splat/art.js`); the code
already looks up every key, so a file listed in `assets/art/index.json` drops
in with no code change. House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text** in any image. Characters use
existing poses (`crouch` while scooping, `throw`, `carry` with the giant
snowball overhead, `knockback` → `dizzy` when splatted, `cheer`, `celebrate`,
`clap`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/snowball-splat` | 1920×1080, opaque | Full screen, 1:1 (the camera zooms up to ~1.2×). **Layout must match:** sky and backdrop above y≈200, a wooden picket fence along y≈200–245, open snowy ground below. Players walk in x 90–1830, y 280–1028. A **frozen pond** sits exactly at the centre: ellipse centre (960, 652), radii 205×88, with a ~20 px snowy rim. Keep the top ~110 px calm (scoreboard chips) and the ground plain — the code draws the walls, snowmen, splats and scoop dents | A cozy winter cottage garden seen from a high 3/4 top-down angle: pale blue sky with soft clouds, snowy hills, two candy-coloured cottages with thick snow on the roofs and warm yellow windows, snow-tipped pine trees, a honey-wood picket fence with snow caps and a string of colourful party lights; below it a wide smooth field of fresh snow with gentle blue-shaded drifts and tiny sparkles, a small oval frozen pond (pale cyan ice with white streaks) in the middle, snowbanks and pines along the left, right and bottom edges |
| `thumb/snowball-splat` | 800×500, opaque | Game-select shelf and how-to screen (`drawIcon` is the fallback) | Two cheerful roster characters mid snowball fight in a snowy garden: one ducking behind a snow-fort wall, a snowball flying in a dotted arc toward a snowman with a red scarf, a white splat burst, a giant snowball and a red knitted mitten in the corners, falling snowflakes. Subject centred |
| `prop/snowball` | 64×64, transparent | Centred on the ball, drawn at 2.3 × its radius (7–12 px radius: in hands, in flight, and as the 3 ammo pips over each head). The ball should fill ~87% of the canvas | A single round packed snowball: white with soft blue shading at the lower right, a small white highlight at the upper left, a few tiny lumps, thin navy outline |
| `prop/giant-snowball` | 256×256, transparent | Centred on the ball, drawn at 2.15 × its radius (26–66 px). The code does not rotate it, so keep it nearly round | A huge round snowball, lumpy packed snow with blue cel shading and a big white highlight, navy outline |
| `prop/powerup-giant` | 192×192, transparent | Centred inside the floating pickup bubble, ~97 px wide; the code draws the glow and the bubble around it | Power-up icon: a giant sparkly snowball with a little gold star twinkle on it, cheerful and chunky |
| `prop/triple-mitten` | 160×160, transparent | Centred, drawn 30–100 px tall: on the pickup bubble (the code adds "x3" beside it), in the player's hand, and next to the ammo pips | A red knitted mitten with a yellow and a white stripe and a fluffy white cuff, upright, thumb on the left |
| `prop/snow-splat` | 256×256, transparent | Ground decal centred where a snowball landed; **the code squashes it vertically to 42%** and fades it out. Drawn 36–150 px wide, so paint it as a round splat seen from straight above | A white snow splat seen from above: a star-shaped burst of packed snow with little round blobs flung around it, faint blue shading, thin soft-blue outline |
| `prop/face-splat` | 128×128, transparent | Centred on a character's eyes for ~2 s after a hit, drawn at 2.4 × (15% of the character's height), fades out | A cartoony blob of white snow stuck on a face: a round splat with three bumps and two little drips, navy outline, light blue shading |
| `prop/snow-wall` | 460×256 (ratio 230:128), transparent | **Stretched** over a horizontal fort-wall block: footprint 230×44 plus an 84 px front face, so the **top 34%** of the image is the top face and the **bottom 66%** the front face. Damage lowers it to ~60% height (stretched) and the code adds cracks | A packed-snow fort wall made of stacked snow bricks, seen from a high 3/4 angle: flat white top face with a slightly lumpy edge, blue-shaded front face with brick seams, navy outline |
| `prop/snow-wall-side` | 176×1016 (ratio 44:254), transparent | Same, for the two walls that run away from the viewer at the sides: footprint 44 wide × 170 deep plus the 84 px front face, so the **top 67%** is the top face and the **bottom 33%** the front face | The same snow-brick fort wall seen end-on: a long narrow white top face and a short blue-shaded front end with brick seams |
| `prop/snow-rubble` | 520×120, transparent | Bottom-centre anchored at the wall's front edge, fitted into (wall length + 30)×60 px; shown while a crumbled wall waits to rebuild | A low pile of broken snow bricks and lumps, white with blue shading, navy outline |
| `prop/snowman` | 300×420, transparent | Bottom-centre (base of the bottom ball) on the snowman's foot point, fitted into 150×210 px. Hit 1 swaps to `-nohat`, hit 2 to `-body`, hit 3 to `-pile` | A friendly three-ball snowman: coal eyes and smile, carrot nose, pink cheeks, twig arms, a red knitted scarf, a blue bobble hat |
| `prop/snowman-nohat` | 300×420, transparent | Same canvas, scale and placement as `prop/snowman` | The same snowman without its hat |
| `prop/snowman-body` | 300×420, transparent | Same canvas, scale and placement as `prop/snowman` | The same snowman with only the two lower balls, the scarf and twig arms (its head has been knocked off) |
| `prop/snowman-pile` | 260×140, transparent | Bottom-centre on the snowman's foot point, fitted into 130×70 px, until it rebuilds | A flattened snowman: a lumpy snow heap with the red scarf and the carrot on top |

Optional future pose (the game reads fine without it): `snow-scoop` (loop,
fallback `crouch` → `land`): crouched, both hands (or paws) packing a
snowball on the ground. The game uses `crouch` for scooping today.

#### New Party game: treasure-dig

##### treasure-dig — Treasure Dig   (requested by the treasure-dig agent, 2026-10-05, priority: nice-to-have)

A hot/cold treasure hunt on a sunny beach (2.5D top-down). Everything below
has a procedural fallback that ships today. The code already looks up every
key, so a file listed in `assets/art/index.json` drops in with no code change.
House style: navy `#24163f` outlines, soft cel shading, bright candy colours,
**no text** in any image. Props are seen from a slight front three-quarter
view (like the roster sprites) and centred in a transparent canvas unless the
anchor says otherwise. Reused as they are: the roster sprites (`crouch`,
`action`, `cheer`, `celebrate`, `surprised`, `hurt`, `walk`, `run`), plus
`prop/crown`, `prop/rubber-duck`, `prop/gem-blue` and `prop/charm-shell` as
second-choice fallbacks.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/treasure-dig` | 1920×1080, opaque | Full screen. **The layout must match:** sea from y=0 to y≈262 (the code animates lapping foam at y≈262 and big waves that wash down to y≈560–680), a darker wet-sand band at y≈262–330, dry sand below. Players walk in x 130–1790, y 350–1030, so keep that area flat sand with only faint ripples (the code draws holes, chests and starfish). The top ~200 px sit under the score chips and timer. Put edge decor only at the far left and right edges: a sandcastle (left, y≈640) and a towel (left, y≈900), a towel (right, y≈640) and a striped beach umbrella (bottom-right corner). Keep the bottom-left 120×120 plain and nothing tall above y≈720 (the waves wash over the top part) | A bright, sunny cartoon beach seen from above at a gentle angle: turquoise sea with soft white wave lines at the top, a scalloped foam line, warm golden sand with faint wind ripples and a few pebbles, and cheerful beach decor along the far left and right edges. No shells or treasure on the sand (those are gameplay) |
| `thumb/treasure-dig` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A half-dug-out wooden treasure chest glowing gold on a sunny beach with gold coins flying out, a pink scallop-shell gadget with an antenna beaming red "hot" ripple rings, a cute crab peeking out of a sand hole, sea at the top. Subject centred |
| `prop/treasure-shell` | 192×192, transparent | Centred, fitted into a 70 px box when held up over the finder's head | A peach-and-pink scallop seashell with ridges and a soft shine |
| `prop/treasure-pearl` | 192×192, transparent | Centred, 70 px box | A small open lilac clam shell holding a big glowing white pearl |
| `prop/treasure-gem` | 192×192, transparent | Centred, 70 px box | A faceted sky-blue gem (brilliant cut, table on top) with white glints |
| `prop/treasure-coins` | 192×192, transparent | Centred, 70 px box | A little stack of shiny gold coins with one coin standing up in front showing a star |
| `prop/treasure-crown` | 192×192, transparent | Centred, 96 px box (the jackpot). Falls back to `prop/crown` | A sparkly golden crown with a big pink jewel, just dug up (a few sand grains), extra shiny |
| `prop/treasure-chest` | 300×240, transparent | Bottom-centre anchored at the chest's base, drawn 150 px wide. The code clips it at the sand line, raises it out of a hole as players dig, and draws a sand lip over the bottom | A closed wooden treasure chest (friendly, not scary): honey-brown planks, gold bands, a gold lock, a rounded lid |
| `prop/treasure-chest-open` | 300×300, transparent | Bottom-centre anchored, drawn 150 px wide (taller because the lid stands open) | The same chest with the lid flipped open, heaped with gold coins and a pearl necklace, warm golden glow inside |
| `prop/shell-detector` | 128×128, transparent | Centred, drawn 50 px, floating beside each character. **The code draws a round coloured light (blue → yellow → red) over the centre** (about a third of the width), so leave the middle a plain rounded dome | A cute treasure-detector gadget shaped like a pink scallop shell, with a little curly antenna with a ball tip on top and a round lens in the middle |
| `prop/beach-crab` | 192×192, transparent | Centred, drawn 76 px. It pops out of a hole, snaps its claws, then scuttles sideways | A round, friendly red-orange crab, front view, eyes on stalks, a big smile and rosy cheeks, both claws raised |
| `prop/beach-seaweed` | 160×160, transparent | Centred, drawn 74 px and draped on a character's head (the top of the image sits at the top of the head) | A soft clump of three wavy green seaweed ribbons hanging down, glossy and silly |
| `prop/beach-sock` | 160×160, transparent | Centred, 70 px box, held up over the head | A single lost striped sock (pink, blue and yellow stripes) with a pink toe |
| `prop/beach-duck` | 160×160, transparent | Centred, 70 px box. Optional: falls back to `prop/rubber-duck` | A yellow rubber duck, a little sandy |
| `prop/beach-starfish` | 128×128, transparent | Centred, drawn 56 px. Waves wash it up; it bobs with a glow | A cheerful orange starfish with tiny dots and a small happy face |
| `prop/sand-hole` | 256×128, transparent | Centred on the dig spot, drawn 2.6r × 1.3r (r ≈ 30 px). It fades out when the waves smooth it | A freshly dug hole in golden sand, seen from above at an angle: dark damp inside, with a little rim of scooped sand around it |

Optional pose: the game digs with `crouch` + `action` today. A dedicated
`dig` pose (crouched, scooping sand back between the legs; loop; fallback
`crouch`, `action`) for every roster character would replace that later.

#### New Party game: tug-of-war

##### tug-of-war — Rainbow Tug-of-War   (requested by the tug-of-war agent, 2026-10-05, priority: nice-to-have)

A team game in side view: Pink Team (left) and Blue Team (right) pull a
rainbow rope across a little puddle of wobbly rainbow jelly; the losers
slide in with a splash and pop out giggling. Everything below has a
procedural fallback that ships today, and the code already looks up every
key, so a file listed in `assets/art/index.json` drops in with no code
change. The rope itself stays procedural (it bends through every
character's hands). House style: navy `#24163f` outlines, soft cel
shading, bright candy colours, **no text** in any image. Reused as they
are: the roster sprites (`knockback` as the pulling stance until `pull`
exists, `run`, `jump`, `tumble`, `swim`, `giggle`, `dizzy`, `surprised`,
`celebrate`, `cheer`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/tug-of-war` | 1920×1080, opaque | Full screen, static. The meadow's grass line sits at y≈790; characters stand on y≈862 across the whole width; the jelly puddle is drawn by code at the centre (x 750–1170, y 830–940), so keep that patch plain grass. Team mats are drawn on the ground at x 10–740 and 1180–1910, y 812–904. Keep the top ~230 px calm (team panels, timer and tug meter) and the centre band y 250–420 calm (the beat heart) | A sunny spring meadow: soft blue sky with a few puffy clouds, a big gentle pastel rainbow arching over the whole scene from behind rolling green hills, round cartoon trees on the far hills, a strip of bright grass with tiny flowers across the bottom third, and two cream party poles at the far left and right edges with a string of pink, yellow and blue bunting sagging between them. Left half has a faint pink tint in the flowers, right half faint blue |
| `thumb/tug-of-war` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Two cute characters from opposite sides (one in pink, one in blue) leaning back and pulling a thick rainbow-striped rope over a small glossy puddle of rainbow jelly, a pink bow tied at the rope's middle, a splash of jelly droplets and sparkles, rainbow in the sky. Subject centred |
| `prop/tug-jelly-pool` | 960×280, transparent | Centred on the puddle centre (960, 884) and drawn 2.3 × 205 px wide (≈470 px, height by aspect). The code squashes it on splashes (wobble), draws characters sunk to the chest in it and adds its own ripple rings, so keep the surface clean | A shallow oval puddle of glossy rainbow jelly set into the grass, seen from a low side angle: concentric bands from pink at the rim through orange, yellow, green, blue to purple in the middle, a sugary pale-pink crust rim, bright white highlights and a few tiny bubbles. The oval fills ~88% of the width |
| `prop/tug-mat-pink`, `prop/tug-mat-blue` | 1460×184 each, transparent | Stretched (fit: stretch) over each team's zone, 730×92 on screen, top edge at y≈812. Characters stand on its middle | A long picnic blanket on the grass seen from the front at a low angle: gingham check in pink and white (blue and white for the blue one), a soft fringe along the bottom edge, slightly wrinkled. Plain, no objects on it |
| `prop/tug-flag-pink`, `prop/tug-flag-blue` | 220×300 each, transparent | Bottom-centre anchored (foot of the pole) at the puddle rim, x 785 (pink) and x 1135 (blue), fitted into 110×150. The pink pennant points left, the blue one right. These are the "finish lines" the bow must reach | A small cream wooden pole stuck in the grass with a triangular cloth pennant waving at the top: hot pink with a white heart (pink), sky blue with a white star (blue) |
| `prop/tug-bow` | 300×300, transparent | Drawn centred 40 px below the rope point at x = 960 + rope offset, fitted into 150×150, so the knot of the bow sits at about (150, 70) in the image and the pennant hangs below. It rides the rope and sways | A big glossy hot-pink ribbon bow with a gold button knot and two ribbon tails, with a small three-stripe pennant (pink, yellow, blue) hanging straight down under the knot |
| `prop/tug-banana` | 220×160, transparent | Centred ~18 px above the ground point, fitted into 110×80; the code spins it as it slides along the ground under one team's feet | A cartoon banana peel lying flat with three floppy yellow peel petals splayed out and a little brown stem, glossy and cute (not mushy) |
| `prop/tug-beat-heart` | 256×256, transparent | HUD at screen centre (960, 330), fitted into 2.1 × 60 px (126 px) and scaled up on every beat; the code draws the shrinking timing ring around it | A chunky glossy candy-pink heart with a navy outline and a white shine at the upper left, slightly puffy like a sticker |

New sprite pose wished for (registered by the lead; the code already uses it
when `POSES.pull` exists and falls back to `knockback` meanwhile):

| Pose | Loop | Fallback | Description |
| --- | --- | --- | --- |
| `pull` | yes | `knockback`, `balance` | Tug-of-war heave: side-on, leaning far back away from the facing direction, both hands (paws, fins, mouth for the cake) gripping a rope held out in front at waist height, feet dug in, determined happy grin (not scared). Hand anchor = the grip point |

#### New Party game: fishing-frenzy

##### fishing-frenzy — Fishing Frenzy   (requested by the fishing-frenzy agent, 2026-10-05, priority: nice-to-have)

Everyone fishes in one sparkling pond seen in 3/4 top-down view. Every key
below has a procedural fallback that ships today, and the code already looks
each one up, so a file in `assets/art/index.json` drops in with no code
change. **Pond geometry (must match):** an ellipse centred at (960, 580) with
radii 700 × 280 (water from x 260–1660, y 300–860), ringed by a ~40 px
pebble/sand rim. The code draws the player docks (they change with the
player count), lily pads, frog, fish, bobbers, rods and baskets on top.
House style: navy `#24163f` outlines, soft cel shading, bright candy
colours, **no text** in any image. Characters use existing poses (`cast`,
`pump`, `balance`, `catch`, `cheer`, `celebrate`, `laugh`, `hurt`, `sad`,
`surprised`); the new `reel` pose is listed at the end.

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/fishing-frenzy` | 1920×1080, opaque | Full screen. The pond ellipse above must sit exactly there; keep the top ~110 px calm (scoreboard + timer). Players stand on docks along the bottom shore (y≈975) and the left/right banks, so keep those shore areas plain grass/sand. No docks, no characters | A sunny meadow pond in 3/4 top-down view: blue sky with puffy clouds and soft green hills at the top, a row of round lollipop trees (some pink-blossom) behind the pond, cattails and reeds on the far bank, a large oval pond of clear sparkling turquoise water (deeper blue in the middle, light near the edges, faint water weeds and pebbles visible underwater) ringed by cream sand and pebbles, bright green grass with tiny flowers around it |
| `thumb/fishing-frenzy` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | A golden fish leaping out of a sparkling pond in an arc with water droplets, a red-and-white bobber with ripples, a fishing rod reaching in from the lower left with its line, a lily pad with a pink flower, a big yellow "!" burst shape (no letters) near the bobber. Subject centred |
| `prop/fishing-sunny` | 320×240, transparent | One catch, side view **facing right**, centred, nose and tail tip spanning the full width (drawn into a 1.25 L × 0.94 L box, contain; flipped by code to face left). Same for all `prop/fishing-*` catches below | A small round cheerful yellow fish with an orange tail and fins, pale belly, big friendly eye, pink cheek, tiny smile |
| `prop/fishing-darty` | 320×240, transparent | as above | A slim speedy pink minnow with purple fins and a white stripe along its side, sleek and quick-looking |
| `prop/fishing-puffy` | 320×240, transparent | as above | A shy round purple pufferfish with little soft pink nubs along its back, pink cheeks, big shy eye |
| `prop/fishing-bubba` | 320×240, transparent | as above (drawn bigger by code) | A big chubby teal fish with yellow spots, orange fins, pink pouty lips, happy goofy face |
| `prop/fishing-golden` | 320×240, transparent | as above (code adds a glow) | A shining golden fish with flowing pale-gold fins and tail, sparkly highlights, sweet smile |
| `prop/fishing-boot` | 320×240, transparent | as above; standing upright, toe to the right | An old blue-grey rain boot with a pink patch, a white daisy with a yellow centre growing out of the top (silly catch) |
| `prop/fishing-duck` | 320×240, transparent | as above; floats on the surface (code adds the water line) | A classic yellow rubber duck with an orange beak, side view facing right |
| `prop/fishing-chest` | 320×240, transparent | as above | A small wooden treasure chest with gold bands and lock, lid slightly open with golden glow and coins peeking out |
| `prop/fishing-bobber` | 96×128, transparent | Drawn centred 12 px above the water line in a 30×40 box; code sinks it on a bite and draws the water line over its base | A round fishing bobber: red top half, white bottom half, a short stick with a yellow ball on top, glossy highlight |
| `prop/fishing-rod` | 512×64, transparent | Straight rod, **butt at the left edge, tip at the right edge**, reel ~18% from the left; code rotates it from the character's hand (20% behind the hand) when the rod is not bent | A kid's fishing rod: wooden cork handle, a yellow reel, a white rod with pink stripes, pink tip |
| `prop/fishing-basket` | 240×176, transparent | Bottom-centre at the basket spot, drawn 120×88 (× player scale). The code draws caught fish poking up out of the top **before** it, so the opening must be at the top ~25% and the front must cover them | A woven wicker fishing basket, front view, open top with a rolled rim, warm honey colour |
| `prop/fishing-lilypad` | 240×160, transparent | Centred on the pad, drawn into a 2.2 r × 1.5 r box (r = 34–52 px), seen from 3/4 top-down | A round green lily pad with a notch, light veins, seen at an angle from above |
| `prop/fishing-lilypad-flower` | 240×160, transparent | as above | The same lily pad with a pink water-lily flower on it |
| `prop/fishing-frog` | 180×152, transparent | Bottom-centre, drawn 90×76 × 0.8, sits on a lily pad | A cute little green frog sitting, front view, big eyes, pink cheeks, tiny smile |

New pose (optional): `reel` (loop) — holding a fishing rod up with both
hands, leaning back and cranking the reel (code draws the rod from the
hand anchor). Fallback chain: `pump`, `action`.

#### New Party game: jump-rope

##### jump-rope — Jump Rope Jamboree   (requested by the jump-rope agent, 2026-10-05, priority: nice-to-have)

Two friendly bunnies turn a giant candy-striped jump rope in a sunny park;
the players stand in a row on a sandy mat in the middle and hop as the rope
sweeps under their feet; out players sit on a picnic blanket in front and
cheer. Everything below has a procedural fallback that ships today, and the
code already looks up every key. The rope itself, the bunnies' arms and the
timing rings stay procedural (they animate with the rope). House style: navy
`#24163f` outlines, soft cel shading, bright candy colours, **no text** in
any image. Reused as they are: the roster sprites (`jump`, `fall`, `land`,
`tumble`, `dizzy`, `clap`, `cheer`, `celebrate`, `walk`, `ready`).

| Key | Size / format | Anchor and how the code draws it | Prompt-style description |
| --- | --- | --- | --- |
| `bg/jump-rope` | 1920×1080, opaque | Full screen behind everything (when present, it replaces the whole procedural park, so it must contain the mat and blanket). **Layout must match:** horizon/fence band around y≈580–640; a flat sandy oval jump mat centred at (960, 796), about 1500 px wide and 250 px tall (players stand on y≈735–845); a pink gingham picnic blanket (trapezoid) spanning x≈500–1420, y≈948–1068 where out players sit. Keep the top ~150 px calm (HUD chips + timer) and the far left/right ~300 px of ground plain (the bunnies stand at x≈150 and x≈1770) | A sunny kids' park: bright blue sky with a soft sun at the upper right, rolling green hills, round blossom trees along the horizon (open sky in the middle), a white picket fence, a string of candy-coloured bunting flags sagging across the sky, lush striped lawn, a big flat sandy oval play mat with a dashed white chalk border and faint chalk heart/star doodles, flowers in the foreground grass, and a pink-and-white gingham picnic blanket at the bottom centre. No characters |
| `thumb/jump-rope` | 800×500, opaque | Game-select shelf and how-to screen (the procedural `drawIcon` is the fallback) | Two cute bunnies (one pink in a polka-dot pinafore, one mint in blue overalls) turning a big red-and-white candy-striped jump rope in a park; the rope arcs high overhead and a happy kid character is mid-hop in the middle, sparkles and motion swooshes. Subject centred |
| `prop/jump-rope-bunny-pink` | 600×660, transparent | Fitted into a 300×330 box, **bottom-centre anchored at the feet**, drawn at x≈150 facing right (toward the middle). **No arms**: the code draws both arms from the shoulders to the rope handles — near shoulder at about (368, 316) and far shoulder at about (308, 308) in image pixels — so leave the sides of the body clean there | A big friendly standing bunny, three-quarter view facing right: pale pink fur, tall ears (one slightly floppy) with pink insides, a yellow bow between the ears, big shiny dark eyes, rosy cheeks, little pink nose and smile, a hot-pink polka-dot pinafore with yellow buttons, fluffy white tail, big soft feet. Arms omitted |
| `prop/jump-rope-bunny-mint` | 600×660, transparent | Same size, anchor and shoulder points as the pink bunny; drawn at x≈1770 and **mirrored by the code** to face left, so draw it facing right | The pink bunny's friend: mint-white fur, tall ears with pink insides, a purple bow, big shiny eyes, rosy cheeks, sky-blue overalls with yellow dots and yellow buttons, fluffy white tail, big soft feet. Arms omitted |
| `prop/jump-rope-handle` | 210×78, transparent | Drawn centred on the paw at 63×23 px, rotated so the **rope end points right** (turned 180° for the right-hand bunny). Used for both ropes and the golden rope | A chunky wooden jump-rope handle lying horizontally: rounded honey-wood grip with a pink painted band, a small yellow bead cap at the right end where the rope comes out |
| `prop/jump-rope-blanket` | 1920×300, transparent | Only used when `bg/jump-rope` is missing: stretched over 960×150 at (960, 1008), under the seated out players | A pink-and-white gingham picnic blanket seen from the front at a low angle, a gentle trapezoid (wider at the bottom), soft folds, navy outline |

Optional sprite pose (later upgrade, the game reads fine without it): `skip-hop`
(loop: no; fallback `jump` → `fall`) — a light two-footed jump-rope hop, knees
tucked, arms out to the sides, happy face.

### Archived: Resolved re-generation requests (integrated and checked in game)

##### Resolved (integrated and checked in game)

- `sprites/princess-amber` `dig`, `spring-jump`, `snow-scoop`, `skip-hop` drawn ~1.36× too big: fixed in data with per-pose `bodyHeight` (the October size audit, which also normalized head size across all 15 playable sets); no new art needed.
- `prop/ing-rainbow-feather`, `ing-stardust-jar`, `ing-moon-drop`: now Potion Class ingredients (Rainbow Feather, Stardust, Moon Drop). Each class stocks a random 8 of the 11 on its shelf.
- `prop/cake-stand` v3: Cake Bakery's stand (plate stretched to the code's plate ellipse; the drawn stand is the fallback).
- `pump` pose (all 15 playable characters, 2 frames): Balloon Pump plays it while a player pumps; checked in game with 4 CPUs (2026-10-05).
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
- `prop/cape-royal-side` delivered: four-legged characters wear it draped over the back in Fashion Show, recoloured for every cape colour (rainbow = stripes).
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

- `prop/cape-royal-side`: 520x300 red velvet animal-back cape with right collar and ermine trim; integrated Fashion Show consumer and reviewed on Fox in full mode; optimized loader regression checks passed.

- Marina and Scale: complete75-key/92-frame/five-portrait sets, matching neutral blink and full per-frame attachment landmark review; paint and card-reach art included, optimized export fresh.
- Hotdog: complete75-key/96-frame/five-portrait set, repaired original dance tails and all attachment points, reviewed Spotlight Dance full and Pop Star Stage optimized.

- Cotton Candy: full75-key/96-frame/five-portrait set, repaired run size, broom anchors, Pet Spa giggle scale and source-local mouth attachments; full Broomstick Dash and optimized Pet Spa reviewed.

- KPop trio: each74 keys/96frames/sixportraits; corrected original and new hand/eye points, preserved complete boot crops, fresh center recolor masks including true rear turn. Reviewed full Pop Star Stage and optimized Spotlight Dance with alternate outfits.

- Unicorn: full75-key/98-frame/six-portrait set, reviewed source-local muzzle/horn attachments and turned/low-face points, fresh optimized copy; full Wizard Quickdraw and optimized Broomstick Dash reviewed.

### Archived: Round 3 — R3.3 delivered list and R3.4 next requests (delivered)

##### R3.3 Already delivered (as of this round)

Approved canonicals for every NPC (Glimmer, Shadow Imps ×3, Professor Hoot,
Garden Fairies ×5, Grumpy Broccoli, Storm Cloud); sprite sets for
**Felicity, Fellowfox, Bronze, Troll and Glimmer**; the logo, title, menu,
how-to, results and marathon backdrops; `bg/<id>` for all 20 games (plus
`fairy-garden-night`, `fashion-show-dressing`, `art-gallery`); `thumb/<id>`
for all 20; props `giant-cake`, `cake-platform`, `seat-cloud`, `present`,
`crown`. All of it renders in game with no errors (checked by the lead).

##### R3.4 Next requests, in priority order

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

### Archived: Round 2 — compiled by the lead from the minigame agents (2026-10-02; delivered)

##### Round 2 — compiled by the lead from the minigame agents (2026-10-02)

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

###### New character poses (all characters)

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

###### Backgrounds (`bg/<id>`, 1920×1080 unless noted)

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

###### Props (`prop/<name>`, transparent)

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

###### Added with the last six games

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

### Archived: §9.1–9.4 Logo, backdrops, minigame backgrounds, thumbnails, props starter list (all delivered)

##### 9.1 Logo and menu backdrops

| Key | Brief |
| --- | --- |
| `ui/logo` | **"Charlie Party"** wordmark: chunky bubbly rounded letters, "Charlie" in candy pink-to-orange and "Party" in sunny yellow-to-mint, thick navy outline, glossy highlights, a gold star replacing the dot of the "i", confetti and a few stars tucked around the letters, slight playful bounce in the baseline. Transparent background. **Check the spelling letter by letter**, and regenerate until it's perfect |
| `bg/title` | A festive outdoor party stage at golden hour: bunting, balloons, a striped tent, fairy lights, confetti in the air, rolling candy-colored hills. The center-bottom stage is open (the code lines up characters there), and the upper center is clear for the logo |
| `bg/menu` | A calmer version for character and game select: a soft pastel party room with bunting along the top edge and gentle bokeh lights. Low detail, mostly flat in the middle |
| `bg/results` | Awards stage: velvet curtains, spotlights converging on the center (the podium is drawn by code, or by `prop/podium`), confetti, sparkly backdrop |
| `bg/howto` | Glimmer's cozy presenting nook: a storybook-stage with curtains and a soft starry backdrop; left two-thirds calm for the rules panel |
| `bg/marathon` | Grand trophy ceremony: golden curtains, fireworks in a night sky, a giant star banner (no text) |

##### 9.2 Minigame backgrounds (`bg/<id>`, 1920×1080)

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

##### 9.3 Thumbnails (`thumb/<id>`, 800×500)

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

##### 9.4 Props starter list (`prop/<name>`)

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

### Archived: §8.1–8.5 NPC requests (Glimmer, Shadow Imps, Professor Hoot, ambient creatures, Troll; all delivered)

##### 8.1 Glimmer, the fairy host (`glimmer`)

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

##### 8.2 Shadow Imps (`shadow-imp`, `shadow-imp-blue`, `shadow-imp-pink`)

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

##### 8.3 Professor Hoot (`professor-hoot`)

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

##### 8.4 Ambient creatures (each needs an approved canonical too)

| Id | What | Used in | Canonical prompt subject (append to the NPC template, §10.4) |
| --- | --- | --- | --- |
| `garden-fairy` (+ `-pink`, `-blue`, `-yellow`, `-green`, `-purple`) | Tiny glowing garden fairies about 50 px tall in-game. **One design, recolored**, with each color also wearing a **different flower cap** (pink: tulip, blue: bluebell, yellow: daisy, green: leaf, purple: violet) so color-blind kids can still count them | fairy-count (count the pink ones!), fairy-garden visitors | "a tiny round-faced garden fairy sprite with a flower-cap hat, dragonfly wings, a single-color glowing outfit, simple face, cute and readable at very small size; show five color variants in a row (pink tulip cap, blue bluebell cap, yellow daisy cap, green leaf cap, purple violet cap)". For the sprite set, generate one fairy and recolor it |
| `grumpy-broccoli` | The falling hazard in Sprinkle Catch: a little broccoli floret with a grumpy-funny face (frown, folded arms of stalk) | sprinkle-catch | "a small grumpy broccoli floret character with a comically frowning face, kid-friendly, not gross". Deliver as `prop/broccoli` (+ `prop/broccoli-bonk` with a dizzy face) |
| `storm-cloud` | A puffy gray thundercloud with a sleepy-grumpy face and a tiny cartoon lightning squiggle | broomstick-dash | "a puffy gray-lavender storm cloud with a sleepy grumpy face and a tiny cartoon lightning squiggle underneath". Deliver as `prop/storm-cloud` (+ `-zap`) |

Garden fairies need a small sprite set (`idle`/`walk` = fly with 2–3 wing
frames, `celebrate` = twirl, `surprised`) and can be registered as NPC
entries like the others. The broccoli and cloud are props with two states,
not sprite sets.

##### 8.5 Troll sprites (`troll`, Phase E; canonical already approved)

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

### Archived: §4.3 Proposed new poses (all registered in POSES and delivered)

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

### Archived: Phases and gates (the original delivery plan; all phases delivered)

##### Phases and gates

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
