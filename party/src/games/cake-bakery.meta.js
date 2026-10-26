// Cake Bakery: menu data only (the game code in cake-bakery.js loads lazily).
export const meta = {
  id: 'cake-bakery',
  title: 'Cake Bakery',
  category: 'studio',
  type: 'Bake & decorate · Everyone wins',
  goal: 'Bake the most beautiful birthday cake, then blow out the candles and taste it!',
  controls: [['lb', 'LB / RB: the steps (the last one is Done)'], ['stick', 'Stick up/down or X: pick shape, flavor... · left/right: layer or frosting style'], ['a', "Keep it and go on · on Done: I'm ready!"], ['stick', 'Decorate: move your hand, X (or D-pad) picks the topping, A adds it'], ['b', 'Back · decorating: take a topping off / undo'], ['y', 'Take the toppings off (asks first) · a bare cake: surprise me!']],
  tips: ['Press X to try the next choice, and A to keep it.', 'Hold A over your cake to shake sprinkles.', 'Press A on a topping to pick it up, then A again to put it somewhere new!', 'When your cake is perfect, go to Done with RB and press A.'],
  music: 'bouncy',
  duration: 'about 3 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
