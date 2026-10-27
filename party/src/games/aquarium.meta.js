// Dream Aquarium: menu data only (the game code loads when it is played).
export const meta = {
  id: 'aquarium',
  title: 'Dream Aquarium',
  category: 'studio',
  type: 'Create · Everyone wins',
  goal: 'Design a fish tank, name your fish, then put on a glowing night show!',
  controls: [['stick', 'Move your hand (right stick: tiny nudges)'], ['dpad', 'D-pad up / down (or LB / RB): pick a category: fish, plants, castles... Feed, Tap, and last Done'], ['dpad', 'D-pad left / right (or LT / RT): next thing in that category'], ['a', 'A or X (the same): put one in (again and again) · on a thing: pick it up / put it down · Feed: sprinkle food · Tap: tap the glass · on Done: I\'m ready!'], ['b', 'Remove'], ['y', 'Change the colour']],
  tips: ['Everything is optional: A puts in another and another, as many as you like.', 'Name each new fish: left and right, then A.', 'Bubblers give fish rides; castles are for peekaboo!', 'Press the moon on the lid for glowing night lights.', 'Y changes the colour of the thing you picked, or of what you are carrying.', 'All finished? D-pad down to Done, then A. The show starts when everyone is ready.'],
  music: 'splash',
  duration: 'about 3 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
