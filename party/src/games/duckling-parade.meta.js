// duckling-parade: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'duckling-parade',
  title: 'Duckling Parade',
  category: 'molly',
  type: 'Team up',
  goal: 'Find the lost ducklings and lead them home to Mama Duck!',
  controls: [['stick', 'Run - ducklings follow you'], ['a', 'Quack call'], ['b', 'Dash']],
  tips: ['Run close to a duckling and it hops in line behind you.', 'Run your line to Mama\'s nest to bring them home.', 'Catch the sparkly golden duckling for 3!'],
  goalEasy: 'You walk round the pond by yourself - quack with A to call the lost ducklings!',
  controlsEasy: [['a', 'Quack call'], ['stick', 'Walk (if you like)'], ['b', 'Dash (if you like)']],
  tipsEasy: ['When a duckling sparkles and the A pops up, press A!', 'No duckling close? Press A and you walk to the nearest one!', 'You walk by yourself - or move with either stick if you like!', 'Every lap you pass Mama\'s nest and your ducklings go home.', 'Catch the sparkly golden duckling for 3!'],
  music: 'splash',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
