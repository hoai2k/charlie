// garden-grow: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'garden-grow',
  title: 'Silly Garden',
  category: 'molly',
  type: 'Grow together',
  goal: 'Plant seeds, water them and see what silly plant pops up!',
  controls: [['stick', 'Run around the garden'], ['a', 'Hold on dirt: plant, then water'], ['b', 'Dash']],
  tips: ['Hold A by a patch: a seed goes in, then water it until it pops!', 'Watch out for the rolling pumpkin and the sneezy flower!', 'Water together to grow plants super fast.'],
  // Easy (A only): you walk to the next patch by yourself.
  goalEasy: 'Plant seeds, water them and see what silly plant pops up!',
  controlsEasy: [['a', 'Hold: plant, then water'], ['stick', 'Walk (if you like)'], ['b', 'Dash (if you like)']],
  tipsEasy: ['You walk to a dirt patch all by yourself!', 'Want a different patch? Walk there with either stick if you like!', 'When the big A bounces, hold A to plant and water!', 'Keep holding until the plant pops up!'],
  music: 'bouncy',
  duration: '50 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
