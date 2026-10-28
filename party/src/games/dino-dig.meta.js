// dino-dig: menu data only (the game code in dino-dig.js loads on demand).
export const meta = {
  id: 'dino-dig',
  title: 'Dino Dig',
  category: 'molly',
  type: 'Team up',
  goal: 'Dig up dinosaur bones and build one giant, silly dinosaur together!',
  controls: [['stick', 'Walk around the sandbox'], ['a', 'Dig! (hold to keep digging)'], ['b', 'Dash'], ['x', 'Throw sand in the air']],
  tips: ['Dig a sandy mound three times and a bone pops out!', 'Some mounds hide silly surprises: a duck, a sock, a teapot...', 'When the dino is finished it comes alive - press A to make it dance!'],
  goalEasy: 'Press A to dig up dinosaur bones and build one giant, silly dinosaur together!',
  controlsEasy: [['a', 'Dig!'], ['stick', 'Walk with either stick if you like'], ['b', 'Dash (if you like)']],
  tipsEasy: ['When the big A bounces, press A to dig!', 'Press A again and again and you walk to the next mound by yourself.', 'When the dino comes alive, press A to make it dance!'],
  music: 'bouncy',
  duration: '~80 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
