// Pet Spa data shared by the game logic (pet-spa.js) and its drawing (draw.js).

export const SPRAY_LEN = 240;   // how far the shower's water falls (px at station scale 1)

export const TOOLS = [
  { id: 'sponge', name: 'Soap' },
  { id: 'shower', name: 'Rinse' },
  { id: 'towel', name: 'Towel' },
  { id: 'brush', name: 'Brush' },
  { id: 'bow', name: 'Bows' },
  { id: 'treat', name: 'Treat' },
];
export const TOOL_IDX = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));

export const ACCESSORIES = [
  { kind: 'bow', color: '#ff6fb1' },
  { kind: 'flower', color: '#ffd23f' },
  { kind: 'star', color: '#ffd23f' },
  { kind: 'heart', color: '#ff4d6d' },
  { kind: 'crown', color: '#ffd23f' },
  { kind: 'bow', color: '#7fd3ff' },
  { kind: 'gem', color: '#9b5cff' },
  { kind: 'flower', color: '#ff8fd0' },
  { kind: 'bow', color: '#ffd23f' },
  { kind: 'bow', color: '#ff4d4d' },
  { kind: 'bow', color: '#36d17a' },
  { kind: 'bow', color: '#b36bff' },
  { kind: 'bow', color: '#ff8c3a' },
  { kind: 'bow', color: '#25d0c8' },
];
