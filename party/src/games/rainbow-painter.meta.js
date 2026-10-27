// rainbow-painter: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'rainbow-painter',
  title: 'Rainbow Painter',
  category: 'molly',
  type: 'Team paint',
  goal: 'Fly your paint cloud and colour in the whole grey world together!',
  controls: [['stick', 'Fly your cloud'], ['a', 'Hold to rain paint']],
  tips: ['Rain paint on the grey rainbow: the sparkly stripe is a good place to start!', 'Grab the golden Paint Star for a MEGA SPLASH!', 'Paint the sleepy sun last to wake him up.'],
  // Easy (A only): your cloud floats by itself to the next grey spot.
  goalEasy: 'Rain paint on the grey world and colour it in together!',
  controlsEasy: [['a', 'Hold to rain paint'], ['stick', 'Fly (if you like)']],
  tipsEasy: ['Your cloud flies all by itself!', 'Want to fly somewhere else? Move with either stick if you like!', 'Hold A when the big A bounces over grey!', 'Your cloud zooms to the golden star - hold A to catch it for a MEGA SPLASH!'],
  music: 'bouncy',
  duration: '66 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
