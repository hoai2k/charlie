# Party character design reference

This guide records the 15 characters in Charlie's drawings, their approved cartoon references, and Troll, an occasional NPC adapted from the existing games. Use it alongside the [canonical gallery](canonical/index.html) when designing the game, generating sprites, or writing animation briefs. Individual images define each character's appearance; group images show how companions belong together.

Visual descriptions below refer to the approved cartoon art and the new Troll reference. Relationship and NPC rules come from the creator's instructions. Personality, movement, and gameplay ideas are marked **suggested** and remain design options rather than established character lore. Ages, powers, backstories, statistics, and individual KPop names have not been specified.

## Reference files and design rules

The original photographs remain in this directory as `drawing_*.JPG`. The canonical art uses smooth dark navy outlines, rounded forms, expressive eyes, bright colors, and simple cel shading. WebP files in `canonical/` preserve the generated artwork and transparency losslessly. These are character references, not animation sheets.

Keep each character's hair, clothing, ornaments, proportions, and main colors consistent across future sprites. At small sizes, simplify decoration before changing the silhouette. Keep tails, hair, and crowns recognizable. Use a shared foot or tail contact point across animation frames so characters do not jump between frames.

Group references supplement the separate character files. Generate and animate each group member independently, then arrange them together in the game. Relative scale in the new group art is a working art direction choice, not a confirmed measurement from the drawings.

## Companions and groups

| Group | Established relationship | Sprite requirement | Group reference |
| --- | --- | --- | --- |
| Felicity and Fellowfox | Fellowfox is Felicity's pet and accompanies her everywhere. | Separate Felicity and Fellowfox sprites. | [Pair reference](canonical/felicity-and-fellowfox.webp) |
| KPop Girls | Three distinct characters who always travel together. | Three separate sprite sets, one for each member. | [Trio reference](canonical/kpop-girls.webp) |
| Marina and Scale | Two distinct characters in one original drawing: Scale on the left, Marina on the right. Always traveling together has not been specified. | Separate Marina and Scale sprites. | [Original shared drawing](drawing_marine_and_scale.JPG) |

**Suggested game treatment:** Represent Felicity and Fellowfox as one party entry with a companion, and the KPop Girls as one party entry with three visible members. This preserves their relationships without deciding yet whether every member has independent controls, collisions, or abilities. Let followers catch up smoothly and rejoin after obstacles; avoid leaving a required companion behind during transitions or results scenes.

## Individual characters

### Bronze

[Canonical image](canonical/bronze.webp) · [Original drawing](drawing_bronze.JPG) · Asset ID: `bronze`

Bronze is interpreted in the approved art as a quirky robot with a green-rimmed gray dome head and one oversized black eye ringed in orange and blue. A purple antenna ends in a violet jewel. A bent gray pipe rises beside the dome, above a cylindrical gray body with a purple panel and a green button. Mismatched mechanical legs end in large purple shoes with orange rims.

Preserve the single eye, dome, antenna, pipe, and uneven legs. The surrounding swirls and stars in the drawing are omitted from the character reference. **Suggested personality and motion:** curious and earnest, with a tilting eye, blinking indicator, and a slightly clunky bouncing walk. Robot construction is an art interpretation; special technology or powers remain undefined.

### Cotton Candy

[Canonical image](canonical/cotton-candy.webp) · [Original drawing](drawing_cottoncandy.JPG) · Asset ID: `cotton-candy`

Cotton Candy is a white pony with blue eyes, a small yellow crown accented in blue, and exceptionally long pink, lavender, and sky-blue hair. The mane and tail form broad flowing ribbons. A yellow flower with a blue center marks the flank.

Keep four legs, the small crown, flower, and abundant multicolored hair. The approved design has no horn. **Suggested personality and motion:** sunny and graceful, with a light trot and delayed swishes of the mane and tail. Use broad color bands so the hair stays readable in small sprites.

### Felicity

[Canonical image](canonical/felicity.webp) · [Original drawing](drawing_felicity_and_fellowfox.JPG) · Asset ID: `felicity`

Felicity is a fox girl with orange facial fur, a cream muzzle, large teal eyes, brown bangs, and two sweeping pigtails tied with yellow ornaments. Her fox ears include a white daisy. She wears an orange and black dress with a white flower at the collar and purple flowers on the skirt, plus orange shoes. A large orange tail has a white tip.

Keep the pigtails, daisy, floral dress, and fox tail as identifying features. Fellowfox is her constant pet companion. **Suggested personality and motion:** welcoming and adventurous, with expressive ears and a lively walk. Show her checking on Fellowfox during idle or reunion animations.

### Fellowfox

[Canonical image](canonical/fellowfox.webp) · [Original drawing](drawing_felicity_and_fellowfox.JPG) · Asset ID: `fellowfox`

Fellowfox is the small pet beside Felicity in the original drawing. The approved design has a round orange body, oversized warm-colored eyes, cream muzzle and chest, dark paws and ear tips, a black flower near one ear, and a bushy tail with a white tip.

Keep the compact proportions and flower distinct from the standalone Fox character. Fellowfox always accompanies Felicity, but still needs separate sprites. **Suggested personality and motion:** affectionate and eager, with tiny quick steps, head tilts, and a wagging tail. The pair reference uses a pet scale with the ears around Felicity's waist; treat that as a starting point for game scale.

### Fox

[Canonical image](canonical/fox.webp) · [Original drawing](drawing_fox.JPG) · Asset ID: `fox`

Fox is a separate orange quadruped with a slender body, large upright white-tipped tail, white chest, muzzle and lower legs, dark ear tips, pink inner ears, and a cheerful visible tongue. Fox has longer legs and a less rounded body than Fellowfox, and no flower accessory.

Do not merge Fox with Fellowfox or assume that Fox belongs to Felicity. **Suggested personality and motion:** playful and alert, with springy strides, perked ears, and an expressive raised tail.

### Hotdog

[Canonical image](canonical/hotdog.webp) · [Original drawing](drawing_hotdog.JPG) · Asset ID: `hotdog`

Hotdog is rendered as a whimsical rainbow animal. The broad fluffy body has enormous rounded gray ears edged in navy, a navy facial mask, glossy eyes, a red forehead heart, tiny navy paws, and a long striped tail. A tall red, yellow, and orange tuft resembles a flame. Pink, orange, yellow, lime, blue, and lavender bands cross the fur.

Preserve the ears, heart, flame-shaped tuft, stripes, and low silhouette. The tuft's shape does not establish a fire power. **Suggested personality and motion:** exuberant and silly, with squat hops and large ear flops. Simplify fur detail while keeping the stripe order and face mask recognizable.

### KPop Girl Left

[Canonical image](canonical/kpop-girl-left.webp) · [Original drawing](drawing_kpopgirls.JPG) · Asset ID: `kpop-girl-left`

The left member has light skin, brown eyes, brown hair swept into a side bun, a light-blue sleeveless shirt with a navy collar, loose dark-blue trousers, and pale shoes. The bun and wide trousers distinguish her from the other two members.

Left refers to her position in the original drawing, not a permanent formation slot during gameplay. Her individual name is not established. **Suggested personality and motion:** relaxed and rhythmic, with broad steps and easy arm swings. She always travels with the other KPop Girls.

### KPop Girl Center

[Canonical image](canonical/kpop-girl-center.webp) · [Original drawing](drawing_kpopgirls.JPG) · Asset ID: `kpop-girl-center`

The center member has tan skin, brown eyes, purple braided hair, red drop earrings, an orange jacket with charcoal trim over a pale shirt, an orange and gold paneled skirt, and tall purple boots. A simple geometric badge replaces the drawing's small unclear lettering.

Preserve the purple hair, orange jacket, skirt panels, and boots. Her individual name and any leadership role are not established. **Suggested personality and motion:** confident and upbeat, with crisp gestures and quick turns. She always travels with the other KPop Girls.

### KPop Girl Right

[Canonical image](canonical/kpop-girl-right.webp) · [Original drawing](drawing_kpopgirls.JPG) · Asset ID: `kpop-girl-right`

The right member has light skin, brown eyes, very long coral hair, a navy shirt with abstract pink and purple graphics, a golden skirt with brown panels, and tall navy boots with pink knee accents.

Preserve the long coral hair, shirt colors, skirt, and knee details. Her individual name is not established. **Suggested personality and motion:** expressive and cheerful, with flowing hair movement and sweeping gestures. She always travels with the other KPop Girls. Use coordinated trio animations without making the members identical.

### Marina

[Canonical image](canonical/marina.webp) · [Original drawing](drawing_marine_and_scale.JPG) · Asset ID: `marina`

Marina is the character on the right of the original shared drawing. She has long red hair, teal eyes, a gold crown with purple jewels, a purple shell top, and a teal scaled mermaid tail crossed by bold purple bands. Large purple fins end the tail.

Keep the red hair and teal/purple tail distinct from Scale. The filename uses `marine`, but the creator's character name is Marina. **Suggested personality and motion:** friendly and confident, with smooth tail undulations and flowing hair. Land movement remains a game design decision; a gentle magical glide could preserve her mermaid form without adding legs.

### Scale

[Canonical image](canonical/scale.webp) · [Original drawing](drawing_marine_and_scale.JPG) · Asset ID: `scale`

Scale is the character on the left of the original shared drawing. She has blonde hair, teal eyes, a gold crown with teal fin-like flourishes, and a layered dark-green top decorated with blue flowers and a red dotted edge. Her red mermaid tail is crossed by a blue lattice and ends in teal fins.

Keep the layered top, blue flowers, red tail, and crisscross pattern. Do not swap her identity with Marina. The mermaid construction follows the approved interpretation of the drawing. **Suggested personality and motion:** poised and thoughtful, with gentle tail curls and a swaying layered top. No family relationship or mandatory pairing with Marina has been specified.

### Marshmallow Birthday Cake

[Canonical image](canonical/marshmallow-birthday-cake.webp) · [Original drawing](drawing_marshmallowbirthdaycake.JPG) · Asset ID: `marshmallow-birthday-cake`

This character is a smiling domed pink cake with stacked layers, white marshmallow borders, a pink frosting band, multicolored sprinkles, large black eyes with lashes, and a tiny candle with a red/yellow flame. The face is part of the cake body. The approved design has no arms or legs.

Preserve the rounded tiered silhouette and marshmallow rows. **Suggested personality and motion:** cheerful and celebratory, using squash, stretch, and small bounces. Keep the candle anchored to the top rather than drifting between frames. Treat it as a character, not an edible pickup, unless a later game brief says otherwise.

### Princess Amber

[Canonical image](canonical/princess-amber.webp) · [Original drawing](drawing_princessamber.JPG) · Asset ID: `princess-amber`

Princess Amber has long copper/auburn hair, warm brown eyes, an amber crown topped by a star/flower shape, and a floor-length orange gown. Black sleeves and bodice accents contrast with large white star/flower motifs outlined in black.

Preserve the orange, black, and white palette, long hair, crown, and decorated gown. **Suggested personality and motion:** kind and composed, with a gentle curtsy and skirt sway. Keep decorative stars attached to the costume; the surrounding motifs in the drawing do not establish orbiting objects or abilities.

### Snowstar

[Canonical image](canonical/snowstar.webp) · [Original drawing](drawing_snowstar.JPG) · Asset ID: `snowstar`

Snowstar's defining feature is an exceptionally large round face with enormous blue/green eyes, flower highlights, and a smile. Multicolored patchwork bangs, rainbow curls, a bow, and floral ornaments surround the face. She wears a green turtleneck.

The creator explicitly identified the big face and green turtleneck and permitted a new body. The approved cartoon adds a compact green sweater body, dark teal trousers, and green boots. Those lower-body details are newly designed. **Suggested personality and motion:** imaginative and curious, with small steps, head tilts, and expressive blinks. Keep the head disproportionately large; the name alone does not establish snow or ice powers.

### The Last Unicorn

[Canonical image](canonical/unicorn.webp) · [Original drawing](drawing_unicorn.JPG) · Asset ID: `unicorn`

The Last Unicorn is a white unicorn with one long pale horn, a slender neck, four slim legs, a flowing white mane and tail, and a serene closed-lash eye. Soft lavender shading defines the white body without changing its main color. The name follows the words written in the original drawing.

Preserve the horn, graceful horse silhouette, white hair, and calm expression. The approved design has no wings or crown. **Suggested personality and motion:** gentle and serene, with an elegant trot and softly following tail. This is Charlie's drawn character; no connection to another story or franchise is established.

### Troll

[Canonical image](canonical/troll.webp) · Asset ID: `troll` · Role: **NPC only**

Troll appears occasionally in the party game and needs independent sprite animations. He is not part of the playable character selection. His source identity comes from the [race monster sprite sheet](../../americangirldollrace/assets/monster_sprites.webp), the [Doll Puppets face](../../dollpuppets/assets/troll/reference.webp), and the [Doll Puppets body](../../dollpuppets/assets/troll/body_pose_1.webp).

Preserve the olive green/gray skin, dark shoulder-length hair, heavy furrowed brow, amber eyes, broad nose, lower fangs, enormous shoulders and hands, rounded belly, long arms, bare feet, and ragged brown loincloth. The party reference adapts the existing gritty rendering to the roster's rounded cartoon style, using harmless skin spots rather than detailed wounds. Keep the hunched, broad silhouette; do not add horns or change him into a costumed hero.

The race already has idle, walking, grab, lift, throw, falling, grounded, sleeping, and drop states. These are existing-game reference behavior, not a requirement to reproduce all of those mechanics in the party game. Doll Puppets adds facial expressions and talking mouth variants.

**Suggested personality and encounter role:** comically grumpy and mischievous. He could briefly interrupt a round or block a route, then leave or fall asleep. His appearance frequency, target selection, and exact interactions remain game design decisions.

**Suggested animation brief:** Start with idle breathing and blinks, notice/surprise, a heavy walk, one clearly telegraphed interaction, a hit/stagger response, and an exit. Add sleep/wake, grab/lift/throw, fall/recover, or talking only when the chosen encounter needs them. Keep the feet on a stable baseline, the belly and shoulders consistent, and hand contact points readable. Separate the action's anticipation, contact, and recovery so players can understand and react to it. Use this canonical image for identity; generate the sprite sheets as a later task.

## Decisions for the game brief

The next game design pass can choose controls and collision behavior for companion groups, names for the KPop members, the movement model for mermaids on land, and shared sprite scale. Choose abilities, strengths, and personality from the suggestions only when the creator approves them. Use the separate canonical images for sprite identity and the group references for companionship and relative placement.
