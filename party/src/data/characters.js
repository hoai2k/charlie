// The playable roster (12 party entries built from the 15 canonical
// characters) plus the Troll NPC. A party entry has one or more "members";
// each member is an independent sprite set keyed by its asset id, so the
// KPop Girls are three sprite sets and Felicity brings Fellowfox along.
//
// Member fields:
//   asset    sprite/asset id -> assets/characters/<asset>.webp (base art) and
//            assets/sprites/<asset>/ (generated pose sprites, when present)
//   h        on-screen height in logical px at actor scale 1 (1080p canvas)
//   dx, dy   formation offset from the entry's anchor, in px at scale 1,
//            when facing right (mirrored when facing left). dy < 0 = further back.
//   follow   seconds of lag when following the leader (0 = leader)
//   face     portrait crop of the base art: [cx, cy, r] as fractions of the
//            image height (cx is also a fraction of height, measured from left)
//   top      top of the head (where a hat or crown sits) as a fraction of h
//            above the feet; the head's x comes from the face crop
//   facing   which way the base art looks: 1 right, -1 left, 0 front
//   motion   procedural movement style used for the fallback animation:
//            walk | trot | glide | bounce | clunk | hop | stomp

export const CHARACTERS = [
  {
    id: 'felicity', name: 'Felicity', subtitle: '& Fellowfox', color: '#ff8a2a',
    blurb: 'Fox girl with her best pet pal',
    members: [
      { asset: 'felicity', h: 178, dx: 0, dy: 0, follow: 0, face: [0.46, 0.27, 0.19], top: 0.92, facing: 0, motion: 'walk' },
      { asset: 'fellowfox', h: 72, dx: -78, dy: 6, follow: 0.18, face: [0.36, 0.38, 0.32], top: 0.95, facing: -1, motion: 'trot' },
    ],
  },
  {
    id: 'kpop-girls', name: 'KPop Girls', subtitle: 'Trio', color: '#b04dff',
    blurb: 'Three performers, always together',
    members: [
      { asset: 'kpop-girl-center', h: 158, dx: 0, dy: 0, follow: 0, face: [0.165, 0.22, 0.1], top: 0.97, facing: 0, motion: 'walk' },
      { asset: 'kpop-girl-left', h: 154, dx: -58, dy: -10, follow: 0.1, face: [0.165, 0.21, 0.1], top: 0.95, facing: 0, motion: 'walk' },
      { asset: 'kpop-girl-right', h: 156, dx: 58, dy: -10, follow: 0.14, face: [0.23, 0.21, 0.1], top: 0.97, facing: 0, motion: 'walk' },
    ],
  },
  {
    id: 'bronze', name: 'Bronze', color: '#3fa86b', blurb: 'One-eyed robot with bouncy boots',
    members: [{ asset: 'bronze', h: 176, face: [0.33, 0.27, 0.17], top: 0.9, facing: 0, motion: 'clunk' }],
  },
  {
    id: 'cotton-candy', name: 'Cotton Candy', color: '#ff7ac6', blurb: 'Pony with the longest rainbow hair',
    members: [{ asset: 'cotton-candy', h: 172, face: [0.48, 0.19, 0.13], top: 0.93, facing: -1, motion: 'trot' }],
  },
  {
    id: 'fox', name: 'Fox', color: '#ff6a1a', blurb: 'Springy, speedy, always smiling',
    members: [{ asset: 'fox', h: 142, face: [0.8, 0.26, 0.19], top: 0.92, facing: 1, motion: 'trot' }],
  },
  {
    id: 'hotdog', name: 'Hotdog', color: '#ffcc22', blurb: 'Fluffy rainbow ball of silly',
    members: [{ asset: 'hotdog', h: 124, face: [0.57, 0.58, 0.3], top: 0.85, facing: 0, motion: 'hop' }],
  },
  {
    id: 'marina', name: 'Marina', color: '#e8364a', blurb: 'Red-haired mermaid with a sparkly crown',
    members: [{ asset: 'marina', h: 178, face: [0.25, 0.22, 0.13], top: 0.95, facing: 0, motion: 'glide' }],
  },
  {
    id: 'scale', name: 'Scale', color: '#2a9d8f', blurb: 'Blonde mermaid in a flower top',
    members: [{ asset: 'scale', h: 178, face: [0.23, 0.22, 0.14], top: 0.92, facing: 0, motion: 'glide' }],
  },
  {
    id: 'marshmallow-birthday-cake', name: 'Birthday Cake', subtitle: 'Marshmallow', color: '#ff8fb6',
    blurb: 'A happy cake that bounces everywhere',
    members: [{ asset: 'marshmallow-birthday-cake', h: 140, face: [0.47, 0.52, 0.42], top: 0.92, facing: 0, motion: 'bounce' }],
  },
  {
    id: 'princess-amber', name: 'Princess Amber', color: '#ff9a1f', blurb: 'Kind princess in a starry gown',
    members: [{ asset: 'princess-amber', h: 184, face: [0.29, 0.27, 0.11], top: 0.93, facing: 0, motion: 'walk' }],
  },
  {
    id: 'snowstar', name: 'Snowstar', color: '#39c46a', blurb: 'Big curious face, cozy green sweater',
    members: [{ asset: 'snowstar', h: 172, face: [0.36, 0.31, 0.22], top: 0.95, facing: 0, motion: 'walk' }],
  },
  {
    id: 'unicorn', name: 'The Last Unicorn', color: '#a98bff', blurb: 'Gentle, graceful and serene',
    members: [{ asset: 'unicorn', h: 186, face: [0.77, 0.18, 0.12], top: 0.88, facing: 1, motion: 'trot' }],
  },
];

export const TROLL = {
  id: 'troll', name: 'Troll', color: '#6f7d3c', npc: true,
  members: [{ asset: 'troll', h: 270, face: [0.49, 0.13, 0.12], top: 0.97, facing: 1, motion: 'stomp' }],
};

export const ALL_ENTRIES = [...CHARACTERS, TROLL];
export const charById = (id) => ALL_ENTRIES.find((c) => c.id === id);

// Fill defaults.
for (const c of ALL_ENTRIES) {
  for (const m of c.members) {
    m.dx = m.dx || 0; m.dy = m.dy || 0; m.follow = m.follow || 0;
  }
}

/** Every distinct asset id (for preloading). */
export const ALL_ASSETS = [...new Set(ALL_ENTRIES.flatMap((c) => c.members.map((m) => m.asset)))];

/** Player slot colors (P1..P8). */
export const PLAYER_COLORS = ['#ff4d6d', '#3fa7ff', '#36d17a', '#ffc12e', '#b36bff', '#ff8c3a', '#25d0c8', '#ff6fd0'];
export const PLAYER_COLORS_DARK = ['#b3203f', '#1d6fc0', '#1b8f4f', '#c48a00', '#7637c4', '#c4560f', '#138f89', '#c2349a'];
