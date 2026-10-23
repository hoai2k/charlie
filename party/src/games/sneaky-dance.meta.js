// sneaky-dance: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'sneaky-dance',
  title: 'Sneaky Dance',
  category: 'molly',
  type: 'Sneaky freeze',
  goal: 'Dance like crazy while Professor Hoot naps - FREEZE when he peeks!',
  controls: [['stick', 'Wiggle to dance'], ['a', 'Big jump-spin']],
  tips: ['Zzz = dance! When the snoring stops and his eye opens: let go and freeze!', 'Wild wiggles and spins earn more stars.', 'Caught? Grab your bouncing stars back!'],
  goalEasy: 'Hold A to dance while Professor Hoot naps - let go to FREEZE when he peeks!',
  controlsEasy: [['a', 'Hold to dance, let go to freeze'], ['stick', 'Dance around with either stick if you like']],
  tipsEasy: ['Zzz = hold A and dance - or wiggle a stick!', 'His eye opens? Let go of everything - freeze!', 'Tap A for a big jump-spin!'],
  music: 'sneaky',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
