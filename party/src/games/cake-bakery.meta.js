// Cake Bakery: menu data only (the game code in cake-bakery.js loads lazily).
export const meta = {
  id: 'cake-bakery',
  title: 'Cake Bakery',
  category: 'studio',
  type: 'Bake & decorate · Everyone wins',
  goal: 'Bake the most beautiful birthday cake, then blow out the candles and taste it!',
  controls: [['lb', 'LB / RB: the steps (the last one is Done)'], ['stick', 'Stick up/down or X: pick shape, flavor... · left/right: layer or frosting style'], ['a', "Keep it and go on · on Done: I'm ready!"], ['x', 'Decorate: pick a topping with the D-pad (or LT / RT), move your hand, X adds it (hold X to shake sprinkles), A when done'], ['b', 'Back · decorating: take a topping off / undo'], ['y', 'Surprise me! (asks first if your cake has toppings)'], ['stick', 'Party: walk about, A jumps (even onto the cake!), X blows the candle up close, then X takes bites']],
  tips: ['Press X to try the next choice, and A to keep it.', 'Decorating starts on None: press A to skip it.', 'Hold X over your cake to shake sprinkles.', 'Press X on a topping to pick it up, then X again to put it somewhere new!', 'Sneak up to your candle and press X to blow it out before the song ends!', 'Jump onto your cake to take a big bite where you land!'],
  music: 'bouncy',
  duration: 'about 3 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
