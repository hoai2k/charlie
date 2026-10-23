// Pottery Wheel: menu data only (the game code loads when it is played).
export const meta = {
  id: 'pottery-wheel',
  title: 'Pottery Wheel',
  category: 'studio',
  type: 'Shape, bake & paint · Everyone wins',
  goal: 'Shape a spinning lump of clay into a vase, bowl or cup, bake it in the kiln, then paint it!',
  controls: [
    ['stick', 'Move your tool'],
    ['a', 'Hold to shape the clay, or paint'],
    ['b', 'Smooth the clay / take paint off'],
    ['x', 'Handles / next paint tool'],
    ['y', 'Surprise shape / next colour'],
    ['rb', 'Next step: bake it, then Done!'],
  ],
  tips: [
    'Squeeze the clay in and it grows taller! Grab the top edge to pull it up.',
    'Mash A at the kiln to puff the fire hotter.',
    'Hold A with the brush or dots and the wheel paints all the way round!',
  ],
  music: 'cozy',
  duration: 'about 4 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
