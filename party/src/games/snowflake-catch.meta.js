// snowflake-catch: menu data only (the game code loads on demand).
export const meta = {
  id: 'snowflake-catch',
  title: 'Snowflake Giggles',
  category: 'molly',
  type: 'Team up',
  goal: 'Hold up your snow jar to catch giggly snowflakes and build a giant snowman together!',
  controls: [['stick', 'Run around'], ['a', 'Hold: jar up!']],
  tips: ['Stand on a flake\'s shadow and hold your jar up high.', 'Big sparkly flakes count for 3!', 'Six flakes fill your jar - watch it glow!', 'Snowballs go POOF into glitter - a bonus!'],
  goalEasy: 'You run to the snowflakes by yourself. Press A to catch them in your snow jar!',
  controlsEasy: [['a', 'Jar up!'], ['stick', 'Run with either stick if you like']],
  tipsEasy: ['You walk to a snowflake all by yourself - or steer with the stick.', 'When the big A bounces, press A!', 'Big sparkly flakes count for 3!'],
  music: 'chase',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
