// ladybug-spots: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'ladybug-spots',
  title: 'Ladybug Spots',
  category: 'molly',
  type: 'Count together',
  goal: 'Catch bouncy dots and give the ladybug just the right number of spots!',
  controls: [['stick', 'Run around'], ['a', 'Zoom dash']],
  tips: [
    'Run into a dot to catch it, then run to the ladybug to give it to her.',
    'Empty circles on her back show how many she wants. Count them!',
    'Bees want yellow fluff. Butterflies want their own colour. Too many? ACHOO!',
  ],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
