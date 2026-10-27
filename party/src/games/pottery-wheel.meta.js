// Pottery Wheel: menu data only (the game code loads when it is played).
export const meta = {
  id: 'pottery-wheel',
  title: 'Pottery Wheel',
  category: 'studio',
  type: 'Shape, bake & paint · Everyone wins',
  goal: 'Shape a spinning lump of clay into a vase, bowl or cup, bake it in the kiln, then paint it!',
  controls: [
    ['stick', 'Move your tool'],
    ['x', 'Hold to shape the clay, or paint (tap: dip, stripe, dot, sticker)'],
    ['y', 'Shaping: Y: Bake (asks first) · Painting: Y: Done (asks first)'],
    ['a', "Painting: next tool (dips / stripes / dots / sticks one first) · on Done: I'm ready! · Shaping: bake it too"],
    ['b', 'Smooth the clay / take paint off'],
    ['dpad', 'Painting: D-pad \u25c0\u25b6 / LB RB: colour or sticker · D-pad \u25b2\u25bc: tool (the last one is Done) · Shaping: d-pad or LT / RT: handles'],
    ['lt', 'Keyboard: LB RB: colour, LT RT: tool (WASD moves your tool)'],
  ],
  tips: [
    'Squeeze the clay in and it grows taller! Grab the top edge to pull it up.',
    'Mash A at the kiln to puff the fire hotter.',
    'Hold X with the brush or dots and the wheel paints all the way round!',
    'D-pad \u25c0\u25b6 / LB RB: colour. D-pad \u25b2\u25bc: tool. A on a tool puts one on and goes to the next. When your pot is perfect, Y: Done!',
  ],
  music: 'cozy',
  duration: 'about 4 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
