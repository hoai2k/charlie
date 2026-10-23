// shape-train: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'shape-train',
  title: 'Choo-Choo Shapes',
  category: 'molly',
  type: 'Team up!',
  goal: 'Help the animals ride the train - match their shape to the window!',
  controls: [['stick', 'Run around the platform'], ['a', 'Pick up a friend / pop them in']],
  tips: [
    'Look at the shape your animal holds, then find the window with the same shape. An arrow shows the way!',
    'Wrong window? Boing! Your friend bounces back - try another car.',
    'Fill every seat and the train goes TOOT TOOT and zooms around the loop!',
  ],
  music: 'bouncy',
  duration: '~60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
