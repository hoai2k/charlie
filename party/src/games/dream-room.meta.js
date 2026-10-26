// Dream Room: menu data only (the game code in dream-room.js loads lazily).
export const meta = {
  id: 'dream-room',
  title: 'Dream Room',
  category: 'studio',
  type: 'Decorate · Everyone wins',
  goal: 'Decorate a cozy bedroom together, then give everyone a room tour!',
  controls: [['stick', 'Move your hand (right stick: tiny nudges)'], ['lb', 'LB / RB: pick a category: things, Move, Paint, and last Done'], ['x', 'X (or D-pad): next item · holding something: flip it'], ['a', 'Place / move / paint · on Done: I\'m ready!'], ['b', 'Remove'], ['y', 'Surprise present!']],
  tips: ['Paint the wall or the floor for new wallpaper!', 'Flip the light switch by the door for night time.', 'A pet bed brings a sleepy kitty!', 'All finished? Press RB until Done, then A. The tour starts when everyone is ready.'],
  music: 'cozy',
  duration: 'about 3 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
