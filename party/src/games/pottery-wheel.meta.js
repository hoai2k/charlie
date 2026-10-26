// Pottery Wheel: menu data only (the game code loads when it is played).
export const meta = {
  id: 'pottery-wheel',
  title: 'Pottery Wheel',
  category: 'studio',
  type: 'Shape, bake & paint · Everyone wins',
  goal: 'Shape a spinning lump of clay into a vase, bowl or cup, bake it in the kiln, then paint it!',
  controls: [
    ['stick', 'Move your tool'],
    ['x', 'Hold to shape the clay, or paint'],
    ['a', "Shaping: bake it! · Painting: next tool · on Done: I'm ready!"],
    ['b', 'Smooth the clay / take paint off'],
    ['y', 'Next colour or sticker · Shaping: surprise shape! (asks first if you have shaped the clay)'],
    ['rb', 'Painting: LB / RB = tools (the last one is Done) · Shaping: RT / LT = handles'],
  ],
  tips: [
    'Squeeze the clay in and it grows taller! Grab the top edge to pull it up.',
    'Mash A at the kiln to puff the fire hotter.',
    'Hold X with the brush or dots and the wheel paints all the way round!',
    'Press Y for the next colour. When your pot is perfect, go to Done with RB and press A.',
  ],
  music: 'cozy',
  duration: 'about 4 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
