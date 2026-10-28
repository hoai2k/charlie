// Gingerbread House: menu data only (the game code in gingerbread-house.js loads lazily).
export const meta = {
  id: 'gingerbread-house',
  title: 'Gingerbread House',
  category: 'studio',
  type: 'Build & decorate · Everyone wins',
  goal: 'Build a gingerbread house, pipe on the icing and cover it in candy, then visit the village at night!',
  controls: [
    ['lb', 'LB / RB: the steps (the last one is Done)'],
    ['x', 'Build: drop the next piece in · Icing: hold to pipe (let go of the stick and it runs along the edge) · Candy: stick one on and stay (hold for sprinkles)'],
    ['stick', 'Build: pick a house · Icing and Candy: move the piping bag / your hand'],
    ['dpad', 'D-pad (keyboard: LT / RT): pick the icing or the candy'],
    ['a', "Keep it and go on · on Done: I'm ready!"],
    ['b', 'Undo / take a candy off'],
    ['stick', 'Village: walk about, A jumps, X nibbles a candy off your house'],
  ],
  tips: [
    'Press X to drop each piece of your house into place.',
    'Hold X near a roof edge and let go of the stick: the icing runs along it all by itself!',
    'The candy in your hand goes exactly where you see it.',
    'Hold X with sprinkles to shake them all over.',
    'At night, walk up to your house and press X for a nibble!',
  ],
  music: 'cozy',
  duration: 'about 4 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
