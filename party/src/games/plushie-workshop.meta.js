// Plushie Workshop: menu data only (the game code in plushie-workshop.js loads lazily).
export const meta = {
  id: 'plushie-workshop',
  title: 'Plushie Workshop',
  category: 'studio',
  type: 'Create · Everyone wins',
  goal: 'Make your very own plushie: stuff it, sew it, dress it and give it a name!',
  controls: [
    ['lb', 'LB / RB: the steps (Body, Stuff, Sew, Dress, Name, then Done)'],
    ['dpad', 'D-pad up/down: pick a row · left/right: try it'],
    ['x', 'Stuff: hold to puff stuffing in · Sew: stitch it on · Name: new ideas'],
    ['stick', 'Sew: move the needle (either stick)'],
    ['a', 'OK, next step! · on Done: my plushie is ready'],
    ['b', 'Back (on Sew: unpick the last stitch)'],
  ],
  tips: [
    'Hold X to stuff your plushie until it squeaks!',
    'On Sew, the piece sits right under the needle\'s point: X sews it exactly there.',
    'B unpicks the last thing you sewed.',
    'Press X on Name for more name ideas.',
  ],
  music: 'cozy',
  duration: 'about 4 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
