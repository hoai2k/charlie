// Dream Room: menu data only (the game code in dream-room.js loads lazily).
export const meta = {
  id: 'dream-room',
  title: 'Dream Room',
  category: 'studio',
  type: 'Decorate · Everyone wins',
  goal: 'Decorate a cozy bedroom together, then give everyone a room tour!',
  controls: [['stick', 'Move your hand'], ['lb', 'LB / RB / D-pad: pick an item'], ['a', 'Place it'], ['x', 'Tool: place, move, paint'], ['b', 'Remove'], ['y', 'Surprise present!']],
  tips: ['Paint the wall or the floor for new wallpaper!', 'Flip the light switch by the door for night time.', 'A pet bed brings a sleepy kitty!'],
  music: 'cozy',
  duration: 'about 3 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
