// prank-troll: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'prank-troll',
  title: 'Prank the Sleeping Troll',
  category: 'molly',
  type: 'Sneaky pranks',
  goal: 'Sneak up and give the sleeping troll a silly makeover!',
  controls: [['stick', 'Tiptoe around'], ['a', 'Grab a prank / prank the troll']],
  tips: ['Grab a prank from a basket, then press A next to the troll!', 'When he stirs and the "!" pops up: FREEZE and you turn into a bush!', 'Three feather tickles make him sneeze!'],
  goalEasy: 'Hold A to tiptoe to a prank basket and then to the troll - let go when he stirs!',
  controlsEasy: [['a', 'Hold: tiptoe, grab and prank'], ['a', 'Let go of everything: freeze like a bush'], ['stick', 'Tiptoe anywhere with either stick if you like']],
  tipsEasy: ['Hold A and you tiptoe where the arrow points (or steer with a stick)!', 'When the "!" pops up, LET GO of everything and you turn into a bush!', 'Three feather tickles make him sneeze!'],
  music: 'sneaky',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
