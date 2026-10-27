// bed-bounce: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'bed-bounce',
  title: 'No Jumping on the Bed!',
  category: 'molly',
  type: 'Sneaky bouncing',
  goal: 'Bounce on the bed and grab stars - but hide when Nanny Moo comes!',
  controls: [['stick', 'Steer left and right'], ['a', 'Hold: bounce higher! Tap: pillow bonk']],
  tips: ['Light under the door + thump thump = LET GO to hide under the duvet!', 'Touch the glowing ceiling stars for big points.', 'Caught? A few stars fall out - grab them back!'],
  goalEasy: 'Hold A to bounce on the bed and grab stars - let go to hide when Nanny Moo comes!',
  controlsEasy: [['a', 'Hold: bounce higher! Let go: hide'], ['stick', 'Float left or right if you like']],
  tipsEasy: ['Hold A - you float to the stars by yourself (or steer with either stick)!', 'Light under the door + thump thump = let go of A!', 'Tap A in the air for a pillow bonk!'],
  music: 'sneaky',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
