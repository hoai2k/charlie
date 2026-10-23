// kitten-yarn: menu data only (the game code loads on demand).
export const meta = {
  id: 'kitten-yarn',
  title: 'Kitten Cuddles',
  category: 'molly',
  type: 'Everyone plays',
  goal: 'Catch the bouncy kittens in your basket and give them cuddles!',
  controls: [['stick', 'Run with your basket'], ['a', 'Cuddle! (or hop)']],
  tips: ['Kittens bounce off your head into the basket.', 'Cuddle 3 at once for a Triple Cuddle!', 'Fairy kittens count for 3!'],
  goalEasy: 'Your basket runs to the kittens by itself. Press A to cuddle them!',
  controlsEasy: [['a', 'Cuddle! (or hop)'], ['stick', 'Run with either stick if you like']],
  tipsEasy: ['You run to the kittens all by yourself - or steer with the stick.', 'When the A glows, press it for cuddles!', 'Wait for 3 kittens for a Triple Cuddle!'],
  music: 'bouncy',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
