// pumpkin-peekaboo: menu data only (the game code loads on demand).
export const meta = {
  id: 'pumpkin-peekaboo',
  title: 'Pumpkin Peekaboo',
  category: 'molly',
  type: 'Candy hunt',
  goal: 'Boop the silly pumpkins to get candy!',
  controls: [['stick', 'Run around the patch'], ['a', 'Boop!'], ['b', 'Dash']],
  tips: ['Run to a pumpkin and press A. Boop boop!', 'Golden pumpkins make it rain candy for everyone!', 'Boop the kitty in the witch hat for a big lollipop.'],
  // Molly Easy: you walk to the pumpkins by yourself; A boops
  goalEasy: 'You walk to the pumpkins by yourself. Press A to boop them!',
  controlsEasy: [['a', 'Boop! (A runs you to the nearest pumpkin)'], ['stick', 'Move with either stick if you like'], ['b', 'Dash (if you like)']],
  tipsEasy: ['Press A when the big A bounces. Boop boop!', 'Want a different pumpkin? Walk over with the stick, then press A!', 'Golden pumpkins make it rain candy for everyone!'],
  music: 'spooky',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
