// bubble-pop: menu data only (the game code loads on demand).
export const meta = {
  id: 'bubble-pop',
  title: 'Bubble Pop',
  category: 'molly',
  type: 'Team-up',
  goal: 'Jump and pop the bubbles to fill the bubble meter for a bubble bath!',
  controls: [['stick', 'Run'], ['a', 'Jump and pop'], ['b', 'Dash']],
  tips: ['Every pop bounces you up again - pop pop pop in the air!', 'Giant bubbles need three bonks.', 'Every bubble has a surprise inside!'],
  goalEasy: 'You run under the bubbles by yourself - press A to jump and pop them!',
  controlsEasy: [['a', 'Jump and pop'], ['stick', 'Run (if you like)'], ['b', 'Dash (if you like)']],
  tipsEasy: ['Jump when the A pops up over your head!', 'You run by yourself - or move with either stick if you like!', 'Every pop bounces you up again - pop pop pop!', 'Every bubble has a surprise inside!'],
  music: 'bouncy',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
