// unicorn-jump: menu data only (the game code loads on demand).
export const meta = {
  id: 'unicorn-jump',
  title: 'Unicorn Hop',
  category: 'molly',
  type: 'Hop & collect',
  goal: 'Ride your unicorn, hop over things and grab the treats!',
  controls: [['a', 'Hop!'], ['stick', 'Gallop faster or slower']],
  tips: ['Hop over puddles, mushrooms and sleepy bunnies to grow a rainbow trail.', 'Stars float up high - hop to grab them!', 'Bumping is just silly: mushrooms go BOING!'],
  // Molly Easy: the unicorn gallops by itself; A hops when the big A shows
  goalEasy: 'Your unicorn gallops by itself. Press A to hop over things!',
  controlsEasy: [['a', 'Hop!'], ['stick', 'Gallop faster or slower with either stick if you like']],
  tipsEasy: ['Press A when the big A pops up!', 'No need to steer - your unicorn gallops by itself.', 'Hop over things to win the treats after them!', 'Bumping is just silly: mushrooms go BOING!'],
  music: 'bouncy',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
