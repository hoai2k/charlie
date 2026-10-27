// snowflake-catch: menu data only (the game code loads on demand).
export const meta = {
  id: 'snowflake-catch',
  title: 'Snowflake Giggles',
  category: 'molly',
  type: 'Team up',
  goal: 'Catch snowflakes on your tongue to build a giant snowman together!',
  controls: [['stick', 'Run around'], ['a', 'Hold: tongue out!']],
  tips: ['Stand on a flake\'s shadow and stick your tongue out.', 'Big sparkly flakes count for 3!', 'Snowballs go POOF into glitter - a bonus!'],
  goalEasy: 'You run to the snowflakes by yourself. Press A to catch them on your tongue!',
  controlsEasy: [['a', 'Tongue out!'], ['stick', 'Run with either stick if you like']],
  tipsEasy: ['You walk to a snowflake all by yourself - or steer with the stick.', 'When the big A bounces, press A!', 'Big sparkly flakes count for 3!'],
  music: 'chase',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
