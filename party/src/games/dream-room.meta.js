// Dream Room: menu data only (the game code in dream-room.js loads lazily).
export const meta = {
  id: 'dream-room',
  title: 'Dream Room',
  category: 'studio',
  type: 'Decorate · Everyone wins',
  goal: 'Decorate a cozy bedroom together, then give everyone a room tour!',
  controls: [['stick', 'Move your hand (right stick: tiny nudges)'], ['lb', 'LB / RB: pick a category: things, Move, Paint, and last Done'], ['dpad', 'D-pad left / right (or LT / RT): next item · holding something: turn it'], ['x', 'Place / move / paint and stay (as many as you like)'], ['a', 'Place / paint once and go on to the next category (just go on if X already did) · Move: pick up, put down and go on · on Done: I\'m ready!'], ['b', 'Remove'], ['y', 'Surprise present!']],
  tips: ['X puts in another and another; A puts one in and moves on.', 'Paint the wall or the floor for new wallpaper!', 'Flip the light switch by the door for night time.', 'A pet bed brings a sleepy kitty!', 'All finished? Press A (or RB) until Done, then A. The tour starts when everyone is ready.'],
  music: 'cozy',
  duration: 'about 3 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
