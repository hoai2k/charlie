// wand-shapes: menu data only (the game code loads on demand).
export const meta = {
  id: 'wand-shapes',
  title: 'Magic Wand Shapes',
  category: 'molly',
  type: 'Team magic',
  goal: 'Trace the dotted shapes together with your wand sparkle to bring them to life!',
  controls: [['stick', 'Fly your wand sparkle'], ['a', 'Sparkle burst']],
  tips: ['Touch the dots to light them up - any order is fine!', 'Press A for a big sparkle burst.', 'Finish a shape and it comes alive!'],
  goalEasy: 'Hold A and your wand sparkle flies along the dots to light them up!',
  controlsEasy: [['a', 'Hold: fly to the dots'], ['a', 'Tap: sparkle burst'], ['stick', 'Move (if you like)']],
  tipsEasy: ['Hold A - your sparkle finds the dots by itself!', 'Let go of A and it waits for you.', 'Move with either stick if you like!', 'Light every dot and the shape comes alive!'],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
