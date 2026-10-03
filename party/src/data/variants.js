// Colour variants: alternate colour schemes so several players can pick the
// same character. Variant 0 is the canonical art; 1..3 are the palettes below,
// baked at runtime by engine/recolor.js (cached per frame) and shown with the
// palette's swatch on portraits and in character select.
//
// regions: asset -> rules { id, from (source key colour), hue [a,b] deg (wraps
//   if a > b), sat/lit [min,max] 0..1, feather, protect: [{at:'eyes', r}],
//   below/above: {at:'neck'|'eyes'|'head'|'anchor', dy} (fractions of
//   bodyHeight), mask: 1|2|3 (R/G/B channel of masks/<frame>.webp, made by
//   tools/sprites/make_masks.py), minArea (drop specks) }
// palettes: [{ name, swatch, to: { regionId: '#target' } }]
//
// Scale's Violet (red tail -> violet) and Amber's non-orange gowns change a
// signature colour on purpose; the user approved them.
const EYES = { at: 'eyes', r: 0.13 };

export const RECOLOR = {
  felicity: {
    regions: {
      felicity: [
        // Dress + shoes share hue/sat/lightness with her fox fur and skin, so they
        // come from an offline region mask (masks/felicity, red channel).
        { id: 'dress', mask: 1, from: '#e9781c', hue: [5, 50], feather: 10, sat: [0.3, 1], lit: [0.12, 0.92] },
      ],
      fellowfox: [],
    },
    palettes: [
      { name: 'Bluebell', swatch: '#3b8fe0', to: { dress: '#2f86dc' } },
      { name: 'Berry', swatch: '#e2428a', to: { dress: '#e0408a' } },
      { name: 'Meadow', swatch: '#3fb06a', to: { dress: '#33a860' } },
    ],
  },
  'kpop-girls': {
    regions: {
      'kpop-girl-left': [
        { id: 'top', from: '#6ea3eb', hue: [195, 235], sat: [0.3, 1], lit: [0.5, 0.95], litFeather: 0.1 },
        { id: 'pants', from: '#013796', hue: [200, 240], sat: [0.4, 1], lit: [0.1, 0.5] },
      ],
      'kpop-girl-center': [
        // jacket/skirt share hue with her tan skin -> offline mask (R = jacket+skirt, G = boots)
        { id: 'jacket', mask: 1, from: '#d16218', hue: [8, 50], feather: 10, sat: [0.3, 1], lit: [0.1, 0.9] },
        { id: 'boots', mask: 2, from: '#6230ac', hue: [240, 305], sat: [0.2, 1], lit: [0.08, 0.85] },
      ],
      'kpop-girl-right': [
        { id: 'tee', from: '#0b3295', hue: [210, 260], sat: [0.35, 1], lit: [0.1, 0.7], below: { at: 'neck', dy: -0.02 } },
        // gold skirt (hue ~40) and its dark brown panels; her light skin (hue ~25, light) is left out
        { id: 'skirt', from: '#eba81a', hue: [33, 58], feather: 5, sat: [0.45, 1], lit: [0.12, 0.88], below: { at: 'neck', dy: 0.12 }, protect: [EYES] },
        { id: 'skirt', from: '#eba81a', hue: [14, 34], feather: 4, sat: [0.4, 1], lit: [0.08, 0.42], below: { at: 'neck', dy: 0.2 }, protect: [EYES] },
      ],
    },
    palettes: [
      { name: 'Bubblegum', swatch: '#f06aa8', to: { top: '#f7a3cb', pants: '#a0175f', jacket: '#e2457f', boots: '#2d2a8f', tee: '#8a1a6a', skirt: '#c9a0f0' } },
      { name: 'Mint', swatch: '#2fbf8f', to: { top: '#8ee0bf', pants: '#0b6b58', jacket: '#1fa58a', boots: '#2a6fc9', tee: '#0d6a48', skirt: '#9fe0c8' } },
      { name: 'Sunny', swatch: '#ffc12e', to: { top: '#fbd65e', pants: '#b2321f', jacket: '#e8b21c', boots: '#c0392b', tee: '#b0301e', skirt: '#ffe27a' } },
    ],
  },
  bronze: {
    regions: {
      bronze: [
        { id: 'purple', from: '#713586', hue: [255, 325], sat: [0.22, 1], lit: [0.1, 0.9], protect: [{ at: 'eyes', r: 0.1 }] },
        { id: 'green', from: '#49ba6c', hue: [100, 170], sat: [0.22, 1], lit: [0.1, 0.9], protect: [{ at: 'eyes', r: 0.1 }] },
      ],
    },
    palettes: [
      { name: 'Ocean', swatch: '#1f8aa8', to: { purple: '#1b7fa0', green: '#f08a24' } },
      { name: 'Ruby', swatch: '#c0303a', to: { purple: '#b3242e', green: '#e8c32a' } },
      { name: 'Bubblegum', swatch: '#f06aa8', to: { purple: '#2f56c4', green: '#f06aa8' } },
    ],
  },
  'cotton-candy': {
    regions: {
      'cotton-candy': [
        { id: 'pink', minArea: 250, from: '#f897c0', hue: [305, 352], sat: [0.3, 1], lit: [0.15, 0.95] },
        { id: 'lav', minArea: 250, from: '#ac81e1', hue: [240, 300], sat: [0.22, 1], lit: [0.15, 0.8] },
        // the sky-blue band is left alone: her blue eyes and crown gems share its hue
      ],
    },
    palettes: [
      { name: 'Sherbet', swatch: '#ffa57d', to: { pink: '#ffa57d', lav: '#62d6a6' } },
      { name: 'Berry', swatch: '#c2389a', to: { pink: '#d83f8f', lav: '#5a3fc8' } },
      { name: 'Seafoam', swatch: '#5fd6c0', to: { pink: '#7fe0bf', lav: '#2aa5a0' } },
    ],
  },
  fox: {
    regions: {
      fox: [{ id: 'fur', from: '#f87107', hue: [8, 45], sat: [0.4, 1], lit: [0.12, 0.93], protect: [{ at: 'eyes', r: 0.09 }] }],
    },
    palettes: [
      { name: 'Crimson', swatch: '#d8341c', to: { fur: '#dc3a1a' } },
      { name: 'Golden', swatch: '#f2b51e', to: { fur: '#f2ae18' } },
      { name: 'Cocoa', swatch: '#9a5530', to: { fur: '#a2562a' } },
    ],
  },
  hotdog: {
    regions: {
      hotdog: [
        // big gray ears: neutral pixels in the mid lightness band (the white chest is lighter)
        { id: 'ears', from: '#a5a5ad', hueMode: 'set', satMode: 'set', sat: [0, 0.2], satFeather: 0.06, lit: [0.38, 0.8], protect: [{ at: 'eyes', r: 0.17 }] },
      ],
    },
    palettes: [
      { name: 'Rose', swatch: '#e79ac0', to: { ears: '#d79ab8' } },
      { name: 'Mint', swatch: '#8fd6b8', to: { ears: '#94cdb4' } },
      { name: 'Lilac', swatch: '#b39be6', to: { ears: '#ad9fdc' } },
    ],
  },
  marina: {
    regions: {
      marina: [
        { id: 'tail', from: '#0aa198', hue: [160, 200], sat: [0.3, 1], lit: [0.1, 0.9], protect: [EYES], below: { at: 'neck', dy: 0.1 } },
        { id: 'purple', from: '#66169e', hue: [255, 300], sat: [0.3, 1], lit: [0.1, 0.9], protect: [EYES], below: { at: 'neck', dy: 0.0 } },
      ],
    },
    palettes: [
      { name: 'Sapphire', swatch: '#2563d8', to: { tail: '#2563d8', purple: '#e0479a' } },
      { name: 'Emerald', swatch: '#22a04a', to: { tail: '#22a04a', purple: '#d99a12' } },
      { name: 'Lilac', swatch: '#9a6ee0', to: { tail: '#8c5fd8', purple: '#0a8f8a' } },
    ],
  },
  scale: {
    regions: {
      scale: [
        { id: 'fins', from: '#068f88', hue: [168, 200], sat: [0.3, 1], lit: [0.1, 0.9], below: { at: 'neck', dy: 0.15 } },
        { id: 'tail', from: '#d81b22', hue: [340, 12], sat: [0.35, 1], lit: [0.1, 0.85], below: { at: 'neck', dy: 0.05 } },
        { id: 'top', from: '#065e49', hue: [135, 168], sat: [0.3, 1], lit: [0.05, 0.5], below: { at: 'neck', dy: 0.0 }, protect: [EYES] },
      ],
    },
    palettes: [
      { name: 'Rose', swatch: '#ec4f95', to: { tail: '#e8488f', top: '#5b2a8f', fins: '#f08ab8' } },
      { name: 'Sunset', swatch: '#f08a1c', to: { tail: '#ec7a12', top: '#1b3f8f', fins: '#e8b51e' } },
      { name: 'Violet', swatch: '#8a35d0', to: { tail: '#8a2ad0', top: '#0b5e2a', fins: '#e05aa0' } },
    ],
  },
  'marshmallow-birthday-cake': {
    regions: {
      'marshmallow-birthday-cake': [
        // the white marshmallow rows get a flavour colour; the pink cake stays pink
        { id: 'mallow', from: '#fcefe6', hue: [10, 58], feather: 6, sat: [0.15, 1], lit: [0.76, 1.0], litFeather: 0.06, protect: [{ at: 'eyes', r: 0.2 }], below: { at: 'head', dy: 0.12 } },
      ],
    },
    palettes: [
      { name: 'Mint', swatch: '#6fd9a8', to: { mallow: '#86e0b6' } },
      { name: 'Lemon', swatch: '#f6d23c', to: { mallow: '#f9dc5a' } },
      { name: 'Blueberry', swatch: '#79aef0', to: { mallow: '#93bff4' } },
    ],
  },
  'princess-amber': {
    regions: {
      'princess-amber': [
        // the mask already follows the torso (flips and tumbles too), so no row gate
        { id: 'gown', mask: 1, from: '#fc9f1f', hue: [21, 50], feather: 6, sat: [0.72, 1], satFeather: 0.08, lit: [0.18, 0.85] },
      ],
    },
    palettes: [
      { name: 'Rose', swatch: '#f0609a', to: { gown: '#f0609a' } },
      { name: 'Lagoon', swatch: '#24a8c4', to: { gown: '#22a6c6' } },
      { name: 'Lilac', swatch: '#a070e0', to: { gown: '#9f6fe0' } },
    ],
  },
  snowstar: {
    regions: {
      snowstar: [
        { id: 'pants', from: '#1c5766', hue: [175, 215], sat: [0.25, 1], lit: [0.08, 0.7], below: { at: 'neck', dy: 0.1 } },
        // boots share the sweater green; split them off by height (feet band above the anchor)
        { id: 'boots', from: '#597819', hue: [60, 140], sat: [0.25, 1], lit: [0.08, 0.8], below: { at: 'anchor', dy: -0.11, f: 0.015 } },
        { id: 'sweater', from: '#597819', hue: [60, 140], sat: [0.25, 1], lit: [0.08, 0.8], below: { at: 'neck', dy: -0.02 } },
      ],
    },
    palettes: [
      // sweater stays green (creator-identified) but changes shade; pants+boots change more
      { name: 'Berry', swatch: '#c2338a', to: { pants: '#8a1f66', boots: '#d23c8e', sweater: '#2f8a3a' } },
      { name: 'Denim', swatch: '#2f6fd8', to: { pants: '#23409e', boots: '#2f6fd8', sweater: '#88a81c' } },
      { name: 'Sunny', swatch: '#f2b51e', to: { pants: '#7a4a1a', boots: '#f0b020', sweater: '#1f8a6a' } },
    ],
  },
  unicorn: {
    regions: {
      unicorn: [{ id: 'shade', from: '#d8d1f6', hue: [215, 290], sat: [0.08, 1], lit: [0.3, 0.98], litFeather: 0.02 }],
    },
    palettes: [
      { name: 'Rose', swatch: '#f4b6d4', to: { shade: '#f5c6dd' } },
      { name: 'Sky', swatch: '#a9d4f5', to: { shade: '#c4e2f8' } },
      { name: 'Gold', swatch: '#f5d79a', to: { shade: '#f7e1b0' } },
    ],
  },
};


/** Sprite sets whose rules use region masks (tools/sprites/make_masks.py). */
export const MASK_SETS = new Set(['felicity', 'princess-amber', 'kpop-girl-center']);
/** Portraits that recolour cleanly without landmarks (others only get the swatch). */
export const PORTRAIT_SAFE = new Set(['fox', 'cotton-candy', 'hotdog', 'unicorn', 'bronze', 'marshmallow-birthday-cake']);
/** Characters whose recolour is subtle at game size: duplicates also get a player-colour outline. */
export const WEAK_VARIANTS = new Set(['hotdog', 'marshmallow-birthday-cake', 'unicorn', 'felicity']);

/** Number of alternate palettes for a character (0 if none). */
export const variantCount = (charId) => RECOLOR[charId]?.palettes.length || 0;
/** Palette for variant v (1..n), or null for the canonical colours. */
export function variantPalette(charId, v) {
  const e = RECOLOR[charId];
  return v && e ? e.palettes[(v - 1) % e.palettes.length] : null;
}
/** Rules (with targets) for one sprite set of a character in variant v; [] for canonical. */
export function rulesFor(charId, asset, v) {
  const pal = variantPalette(charId, v);
  if (!pal) return [];
  return (RECOLOR[charId].regions[asset] || []).filter((r) => pal.to[r.id]).map((r) => ({ ...r, to: pal.to[r.id] }));
}
