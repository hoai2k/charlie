// Dream Aquarium: menu data only (the game code loads when it is played).
export const meta = {
  id: 'aquarium',
  title: 'Dream Aquarium',
  category: 'studio',
  type: 'Create · Everyone wins',
  goal: 'Design a fish tank, name your fish, then put on a glowing night show!',
  controls: [['stick', 'Move your hand (right stick: tiny nudges)'], ['lb', 'LB / RB: pick a category: plants, castles, fish... Tap, and last Done'], ['dpad', 'D-pad left / right (or LT / RT): next thing  ·  D-pad up / down: colours'], ['x', 'Put one in and stay (as many as you like)'], ['a', 'Put one in and go on to the next category (just go on if X already did) · on a thing: pick it up · on Done: I\'m ready!'], ['b', 'Remove'], ['y', 'Feed the fish']],
  tips: ['X puts in another and another; A puts one in and moves on.', 'Name each new fish: left and right, then A.', 'Bubblers give fish rides; castles are for peekaboo!', 'Press the moon on the lid for glowing night lights.', 'On a keyboard, press Y while carrying something (or on the item bar) to change its colour.', 'All finished? Press A (or RB) until Done, then A. The show starts when everyone is ready.'],
  music: 'splash',
  duration: 'about 3 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
