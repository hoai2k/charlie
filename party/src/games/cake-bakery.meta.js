// Cake Bakery: menu data only (the game code in cake-bakery.js loads lazily).
export const meta = {
  id: 'cake-bakery',
  title: 'Cake Bakery',
  category: 'studio',
  type: 'Bake & decorate · Everyone wins',
  goal: 'Bake the most beautiful birthday cake, then blow out the candles and taste it!',
  controls: [['lb', 'Next / previous step (LB / RB)'], ['dpad', 'Pick: shape, flavor, topping...'], ['stick', 'Move your topping hand'], ['a', 'Add topping, or pick one up to move it'], ['b', 'Take a topping off'], ['y', 'Surprise me!']],
  tips: ['Hold A over your cake to shake sprinkles.', 'Press A on a topping to pick it up, then A again to put it somewhere new!', 'B over a topping takes it off.'],
  music: 'bouncy',
  duration: 'about 2 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
