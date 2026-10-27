// Potion Class: menu data only (the game code in potion-class.js loads lazily).
export const meta = {
  id: 'potion-class',
  title: 'Potion Class',
  category: 'studio',
  type: 'Wizard School',
  goal: 'Brew Professor Hoot\'s recipes and see what magic happens!',
  controls: [['stick', 'Pick an ingredient / stir in circles'], ['x', 'Next ingredient'], ['a', 'Toss it in · wave your wand: POOF!'], ['b', 'Oops! Take the last one out']],
  tips: ['Match the ingredients on the chalkboard.', 'Spin the stick round and round to stir.', 'When it\'s ready, press A to wave your wand!', 'The last round is a free experiment!'],
  music: 'spooky',
  duration: '3 recipes',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
