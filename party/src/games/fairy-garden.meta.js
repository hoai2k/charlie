// Fairy Garden: menu data only (the game code in fairy-garden.js loads lazily).
export const meta = {
  id: 'fairy-garden',
  title: 'Fairy Garden',
  category: 'studio',
  type: 'Cooperative · Grow it together',
  goal: 'Plant magic seeds, water them and watch them bloom — then catch fireflies at night!',
  controls: [['stick', 'Walk'], ['a', 'Plant / water / catch'], ['rb', 'Pick a seed (LB / RB or D-pad)'], ['x', 'Sing to plants'], ['y', 'Fairy dust']],
  cornerControls: { at: 'tr', top: 180, items: [['a', 'Plant / water'], ['rb', 'Seed'], ['x', 'Sing'], ['y', 'Fairy dust']] },
  tips: ['A blue drop means a plant is thirsty — water it!', 'Singing and fairy dust make plants grow faster.', 'When night falls, press A next to a firefly to catch it.'],
  music: 'chill',
  duration: 'About 2 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
