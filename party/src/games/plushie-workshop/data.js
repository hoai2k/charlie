// Plushie Workshop: shared data - the plush frame, bodies, fabrics, sewn pieces,
// clothes and names. Everything is in "plush frame" units: one 512 x 560 cell
// (image-requests.md, plushie-workshop), the same for every body, so sewn pieces
// and clothes line up on all of them.
import { shuffle, pick } from '../../engine/util.js';

export const NAVY = '#24163f';

// --- the plush frame (cell px) -------------------------------------------------
export const CW = 512, CH = 560;
export const F = {
  cx: 256, seat: 540, headTop: 88,
  head: { x: 256, y: 200, r: 115 },
  eyeY: 195, eyeDX: 50,
  nose: { x: 256, y: 240 },
  mouth: { x: 256, y: 272 },
  neck: { x: 256, y: 322 },
  back: { x: 256, y: 350 },
  tummy: { x: 256, y: 425 },
  waist: { x: 256, y: 470 },
};
// The flat (unstuffed) skin is the stuffed shape squashed about the seat line.
export const FLAT = { sx: 1.12, sy: 0.6 };
export const squashAt = (p) => ({ sx: FLAT.sx + (1 - FLAT.sx) * p, sy: FLAT.sy + (1 - FLAT.sy) * p });

// --- bodies --------------------------------------------------------------------
export const BODIES = [
  { id: 'bear', name: 'Bear', fabric: 'honey' },
  { id: 'bunny', name: 'Bunny', fabric: 'snow' },
  { id: 'unicorn', name: 'Unicorn', fabric: 'lavender' },
  { id: 'kitty', name: 'Kitty', fabric: 'sunny' },
  { id: 'puppy', name: 'Puppy', fabric: 'cocoa' },
  { id: 'dragon', name: 'Dragon', fabric: 'mint' },
];

// --- fabrics (colour + pattern) ------------------------------------------------
export const FABRICS = [
  { id: 'honey', name: 'Honey', c: '#e0a868' },
  { id: 'bubblegum', name: 'Bubblegum', c: '#ff9ec8' },
  { id: 'lavender', name: 'Lavender', c: '#c6aaff' },
  { id: 'mint', name: 'Mint', c: '#93e3bf' },
  { id: 'sky', name: 'Sky', c: '#9fd2ff' },
  { id: 'snow', name: 'Snowy', c: '#fff4e8' },
  { id: 'sunny', name: 'Sunny', c: '#ffd76b' },
  { id: 'cocoa', name: 'Cocoa', c: '#b07c58' },
  { id: 'dots', name: 'Polka dots', c: '#ff9ec8', pat: 'dots', pc: '#ffffff' },
  { id: 'gingham', name: 'Gingham', c: '#a8d2ff', pat: 'gingham', pc: '#ffffff' },
  { id: 'stars', name: 'Starry', c: '#b7a0ff', pat: 'stars', pc: '#ffe066' },
  { id: 'hearts', name: 'Hearts', c: '#ffc7a6', pat: 'hearts', pc: '#ff6f9f' },
  { id: 'stripes', name: 'Stripes', c: '#93e3bf', pat: 'stripes', pc: '#ffffff' },
  { id: 'rainbow', name: 'Rainbow', c: '#ffb3c8', pat: 'rainbow' },
];
export const FABRIC_IDX = Object.fromEntries(FABRICS.map((f, i) => [f.id, i]));

// --- sewn pieces ---------------------------------------------------------------
// Rows of the Sew step. `atlas`: [key, cols, rows, row]; `size`: frame px across.
// Face pieces (eyes, nose, mouth) are one each: stitching a new one replaces the old.
export const SEW_ROWS = [
  { id: 'eyes', name: 'Eyes', size: 58, face: true, atlas: ['prop/plushie-face', 8, 3, 0], at: () => ({ x: F.cx, y: F.eyeY }),
    items: ['Button eyes', 'Shiny eyes', 'Sleepy eyes', 'Heart eyes', 'Star eyes', 'Googly eyes', 'Sparkly eyes', 'Happy eyes'] },
  { id: 'nose', name: 'Nose', size: 52, face: true, atlas: ['prop/plushie-face', 8, 3, 1], at: () => ({ ...F.nose }),
    items: ['Bear nose', 'Bunny nose', 'Heart nose', 'Button nose', 'Kitty nose', 'Puppy nose', 'Dragon nose', 'Pompom nose'] },
  { id: 'mouth', name: 'Mouth', size: 92, face: true, atlas: ['prop/plushie-face', 8, 3, 2], at: () => ({ ...F.mouth }),
    items: ['Stitched smile', 'Happy mouth', 'Kitty mouth', 'Little "o"', 'Bunny teeth', 'Silly tongue', 'Tiny fangs', 'Big grin'] },
  { id: 'heart', name: 'Hearts', size: 76, face: false, atlas: ['prop/plushie-patches', 8, 2, 0], at: () => ({ ...F.tummy }),
    items: ['Red heart', 'Pink heart', 'Rainbow heart', 'Heart button', 'Lilac heart', 'Tiny hearts', 'Gold heart', 'Patchwork heart'] },
  { id: 'patch', name: 'Patches', size: 76, face: false, atlas: ['prop/plushie-patches', 8, 2, 1], at: () => ({ ...F.tummy }),
    items: ['Star', 'Daisy', 'Round patch', 'Gingham patch', 'Moon', 'Cloud', 'Rainbow', 'Paw print'] },
];
export const SEW_IDX = Object.fromEntries(SEW_ROWS.map((r, i) => [r.id, i]));
export const MAX_PIECES = 16;

// --- clothes ---------------------------------------------------------------------
// Each item: art key (or atlas cell) + where it goes in the frame. `box`: [cx, cy, w]
// (frame px, centre and width) or with `bottom: y` the art's bottom edge sits on y.
// `pd` is the procedural stand-in.
export const DRESS_ROWS = [
  { id: 'head', name: 'Head', items: [
    { name: 'Nothing' },
    { name: 'Pink bow', key: 'prop/bow-pink', box: [322, 104, 128], rot: 0.28, pd: ['bow', '#ff8ec4'] },
    { name: 'Blue bow', key: 'prop/bow-blue', box: [322, 104, 128], rot: 0.28, pd: ['bow', '#6fb6ff'] },
    { name: 'Purple bow', key: 'prop/pet-bow-purple', box: [322, 104, 116], rot: 0.28, pd: ['bow', '#a77bff'] },
    { name: 'Big red bow', key: 'prop/bow-back', box: [256, 92, 170], pd: ['bow', '#ff4d6d'] },
    { name: 'Top hat', key: 'prop/hat-top', bottom: 106, box: [256, 0, 150], pd: ['tophat', '#3a3150'] },
    { name: 'Party hat', key: 'prop/hat-party', bottom: 102, box: [262, 0, 104], rot: 0.12, pd: ['party', '#ffd23f'] },
    { name: 'Witch hat', key: 'prop/hat-witch', bottom: 108, box: [256, 0, 200], pd: ['witch', '#8a5cff'] },
    { name: 'Gold crown', key: 'prop/crown-gold', bottom: 104, box: [256, 0, 150], pd: ['crown', '#ffd23f'] },
    { name: 'Flower crown', key: 'prop/crown-flower', bottom: 118, box: [256, 0, 210], pd: ['flowers', '#ff8ec4'] },
    { name: 'Star tiara', key: 'prop/tiara-star', bottom: 108, box: [256, 0, 160], pd: ['tiara', '#e8eefc'] },
  ] },
  { id: 'neck', name: 'Neck', items: [
    { name: 'Nothing' },
    { name: 'Stripy scarf', atlas: ['prop/plushie-clothes', 4, 2, 0, 0], pd: ['scarf', '#ff5d6c', '#ffffff'] },
    { name: 'Pompom scarf', atlas: ['prop/plushie-clothes', 4, 2, 1, 0], pd: ['scarf', '#5d9bff', '#bfe0ff'] },
    { name: 'Dotty scarf', atlas: ['prop/plushie-clothes', 4, 2, 2, 0], pd: ['scarf', '#ff8ec4', '#ffffff'] },
    { name: 'Rainbow scarf', atlas: ['prop/plushie-clothes', 4, 2, 3, 0], pd: ['scarf', 'rainbow'] },
    { name: 'Bow tie', key: 'prop/snowman-bowtie', box: [256, 330, 130], pd: ['bowtie', '#ff4d6d'] },
    { name: 'Heart necklace', key: 'prop/necklace-heart', box: [256, 352, 150], pd: ['necklace', '#ffd23f'] },
  ] },
  { id: 'waist', name: 'Tutu', items: [
    { name: 'Nothing' },
    { name: 'Pink tutu', atlas: ['prop/plushie-clothes', 4, 2, 0, 1], pd: ['tutu', '#ffa6d2'] },
    { name: 'Sparkle tutu', atlas: ['prop/plushie-clothes', 4, 2, 1, 1], pd: ['tutu', '#cdb2ff'] },
    { name: 'Star tutu', atlas: ['prop/plushie-clothes', 4, 2, 2, 1], pd: ['tutu', '#9ff0cf'] },
    { name: 'Rainbow tutu', atlas: ['prop/plushie-clothes', 4, 2, 3, 1], pd: ['tutu', 'rainbow'] },
  ] },
  { id: 'back', name: 'Back', behind: true, items: [
    { name: 'Nothing' },
    { name: 'Royal cape', key: 'prop/cape-royal', top: 300, box: [256, 0, 330], pd: ['cape', '#e8334a'] },
    { name: 'Starry cape', key: 'prop/cape-starry', top: 300, box: [256, 0, 330], pd: ['cape', '#2e3f8f'] },
    { name: 'Rainbow cape', key: 'prop/cape-rainbow', top: 300, box: [256, 0, 330], pd: ['cape', 'rainbow'] },
    { name: 'Fairy wings', key: 'prop/wings-fairy', box: [256, 360, 420], pd: ['wings', '#ffb3e6'] },
    { name: 'Butterfly wings', key: 'prop/wings-butterfly', box: [256, 360, 420], pd: ['wings', '#ffa94d'] },
    { name: 'Dragon wings', key: 'prop/wings-dragon', box: [256, 352, 440], pd: ['bat', '#8fe0b8'] },
  ] },
];
export const DRESS_IDX = Object.fromEntries(DRESS_ROWS.map((r, i) => [r.id, i]));

// --- names -----------------------------------------------------------------------
const NAMES = ['Bubbles', 'Buttons', 'Snuggles', 'Pudding', 'Marshmallow', 'Biscuit', 'Cupcake', 'Peaches', 'Pickle', 'Noodle',
  'Waffles', 'Jellybean', 'Sprinkles', 'Muffin', 'Poppy', 'Daisy', 'Clover', 'Pumpkin', 'Cookie', 'Teacup', 'Mochi', 'Bean',
  'Twinkle', 'Dumpling', 'Pancake', 'Sugarplum', 'Sunny', 'Button', 'Fluffy', 'Cuddles', 'Pebble', 'Nugget', 'Tofu', 'Gumdrop'];
const BY_BODY = {
  bear: ['Teddy', 'Honey', 'Bearnie', 'Bruno', 'Barnaby', 'Fuzzy Wuzzy'],
  bunny: ['Hoppy', 'Cottontail', 'Thumper', 'Clover', 'Bun Bun', 'Carrots'],
  unicorn: ['Sparkle', 'Stardust', 'Rainbow', 'Moonbeam', 'Glitter', 'Celeste'],
  kitty: ['Whiskers', 'Mittens', 'Purrcy', 'Kitkat', 'Socks', 'Meowmy'],
  puppy: ['Waggles', 'Biscuit', 'Scruffy', 'Patches', 'Barkley', 'Floppy'],
  dragon: ['Ember', 'Puff', 'Sir Spikey', 'Scales', 'Smokey', 'Toasty'],
};
const TITLES = ['Princess', 'Captain', 'Sir', 'Lady', 'Little', 'Baby', 'Mister', 'Miss', 'Professor', 'Duchess', 'Lord'];
const CUTE = ['Snuggles', 'Fluff', 'Buttons', 'Wiggles', 'Puddles', 'Sparkles', 'Bean', 'Muffin', 'Noodle', 'Cuddles', 'Pom Pom', 'Jelly'];
const STARTS = ['Snug', 'Fluff', 'Cud', 'Wig', 'Bub', 'Puff', 'Twink', 'Doo', 'Boo', 'Squish', 'Fuzz', 'Bop', 'Snick', 'Tum'];
const ENDS = ['gles', 'ykins', 'dle', 'sy', 'bean', 'muffin', 'kins', 'puff', 'paws', 'berry', 'ster', 'boo', 'let', 'wump'];

/** A made-up name: "Captain Wiggles", "Fluffykins", "Little Bean"... */
export function makeName() {
  const r = Math.random();
  if (r < 0.4) return `${pick(TITLES)} ${pick(CUTE)}`;
  return pick(STARTS) + pick(ENDS);
}

/** A fresh batch of name ideas for this body (avoiding `used`). */
export function nameIdeas(bodyId, used = new Set(), n = 6) {
  const out = [];
  const add = (s) => { if (s && !used.has(s) && !out.includes(s) && s.length <= 16) out.push(s); };
  for (const s of shuffle(BY_BODY[bodyId] || [])) { if (out.length >= 2) break; add(s); }
  for (const s of shuffle(NAMES)) { if (out.length >= 4) break; add(s); }
  for (let k = 0; out.length < n && k < 40; k++) add(makeName());
  return shuffle(out);
}
