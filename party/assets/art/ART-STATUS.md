# Charlie Party art delivery and handoff

Updated 2026-10-02. Final assets are WebP files in this directory; `index.json` maps runtime keys. `generation-manifest.json` records every exact prompt, built-in imagegen source, dimensions, file size and inspected status. Generation masters remain outside the repository. No API fallback was used.

## Delivered

230 indexed keys, 220 unique images, 7,651,244 bytes; every indexed file decoded successfully with Pillow at this checkpoint. Includes logo, shared backgrounds, all 20 game backgrounds and thumbnails, variants, all Round 3 D priority props, all 30 plant stages, NPC cutouts and reaction states, 28 fashion accessories, and most secondary props. Full exact inventory is `index.json`.

All NPC canonicals were approved. Professor Hoot, five fairies and normal Broccoli reuse approved canonical cutouts. Cloud normal/zap use NPC-agent generated sources without bolts; lightning must remain a separate code effect. Broccoli bonk also supplied by NPC agent.

All new art uses transparent alpha except opaque background/thumbnail images. Props were cropped and reduced proportionally to requested maximum dimensions. Head pieces attach bottom-center, glasses center, necklaces top-center, capes top-center; wings connect at their central jewel/feather junction (roughly 50% width, 50–65% height). Broom seat is center; plants and NPC cutouts use bottom-center. Generated reference sizing is a maximum box, not a promise of square dimensions.

## Remaining generation

Original section 9.4 still requests these; no calls are pending:

- `prop/frame-gold` (1600×1000, transparent center, 9-slice friendly).
- `icon/brush`, `icon/rainbow`, `icon/glitter`, `icon/stamp`, `icon/bucket`, `icon/shapes`, `icon/eraser`, `icon/undo` (128 px).
- `prop/candle-flame`, `prop/sprinkles` (scatter sprite); unlit candle and all cake layers/toppers/stand are delivered.
- `prop/bathtub-front` as matched overlay derived via imagegen edit of delivered `prop/bathtub`; transparent upper opening so pets sit inside. Check matching size/placement. Plain bathtub, foam, shampoo and tools delivered.
- `prop/pet-bow-<color>` (colors unspecified; sensible 8 player colors or aliases to fashion bows where identical).
- Older ingredient names `prop/ing-glow-mushroom`, `ing-rainbow-feather`, `ing-stardust-jar`, `ing-moon-drop`, `ing-bubble-berries`, `ing-sparkle-flower`, `ing-snow-crystal`, `ing-sneezy-pepper`. New Round 2 ingredients ×8 are delivered. Use semantic aliases where appropriate; feather/jar are distinct subjects still missing.
- Round 2 later props `prop/fountain`, `prop/hedge` (match crown-keeper collision layout exactly).
- Optional original `prop/arena-cake` (top-down; Round 2 cake-platform is 3/4 and already delivered), `arena-cake-crumb`, `danger-ring`.

Round 2 replaced original three-kind plant list with six kinds × five stages; all 30 replacements delivered. Round 2 giant-cake superseded original sky-cake composition; key sky-cake aliases giant-cake. Other compatible old keys alias current art (broccoli, golden-cupcake, cheer-cloud, pump, card-back, cookie-tile, gem, balloon).

## Integration handoff (not edited by art agent)

Root integration checkpoint: matching-color Fashion Show accessories now use
generated art with existing procedural fallbacks. Wizard Quickdraw uses
lantern-off/on while retaining separate signal rays. Pass the Present uses its
ticking variant above the existing urgency threshold. The image loader shares
aliases, limits concurrency to six and retries once; regression tests pass.
All literal art keys currently referenced by game code exist in the index.
The remaining notes below retain the original handoff for future work.

1. Fashion Show: `src/games/fashion-show.js` currently imports wardrobe and uses procedural accessory render paths; only vanity is directly hooked. All 28 requested accessories now exist. Map wardrobe IDs to keys and use current Actor head/eyes/neck/back/hand anchors, retaining procedural fallback. Check wands, wings junction and necklaces carefully at both facings.
2. Results: trophy/podium/ui star/ui medal generated but `src/scenes/results.js` had no direct art keys on last scan. Preserve variable player-count podium layout; generated podium is three joined blocks, no numbers.
3. Cake Bakery: all four cake layers, cake stand, six toppers and unlit candle generated; game had no prop hooks on last scan. Candle flame and sprinkles still pending.
4. Pet Spa: tools and duck already hooked; bath/foam/shampoo newly available, front overlay pending.
5. Cookie Crumble, Wizard Quickdraw, Present: add state-specific cookie cracked/crumbling (matching cookie-1), lantern-off/on and present-ticking lookups where useful. The cookie variants preserve the source design closely but not pixel-identically; use same draw box.
6. Other available secondary art: mic-stand/light-stick/spotlight-beam, soot/fizzle puffs, white tintable splat/paint-bomb, potion puffy hair/polka dots/cauldron bubbles, recipe/card fronts, seed/soil, all treats.

Broomstick background was generated as coherent sky but is not mathematically seamless. Root was advised to alternate mirrored tiles for seamless edge joins. Crown Keeper background intentionally omits center fountain and collision hedges; code draws exact arena obstacles.

## Resume workflow

Read imagegen skill. One built-in call per asset or variant, transparent_background=true for props; inspect local edit targets before passing referenced_image_paths. Save generated WebPs inside repository. Last checked usage 46% used; root requests stop starting new generation at 57% used and preserve state near 40% remaining. Root handles commits/merges; art agent made no shared-code edits.

Current handoff has no running tool calls or unsaved generated output. Root should commit the latest art + manifests. Do not claim all section 9.4 requests complete until the remaining list is resolved.

## Resumed production checkpoint

Published additions: gold gallery frame; all eight art-tool icons; separate
candle flame and sprinkle cluster; rainbow feather, stardust jar and moon drop;
matched bathtub-front overlay on the same 454×300 canvas as the bathtub.
Legacy mushroom/berries/flower/crystal/pepper keys alias the matching current
ingredients. Pink/blue/yellow pet bows reuse corresponding fashion bows.
Remaining generation: fountain, hedge, top-down arena cake, crumb, danger ring
and red/green/purple/orange/teal pet bows. Sprite production is resumed by
the user; the previous budget pause no longer applies.
