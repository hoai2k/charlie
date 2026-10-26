// Hair Salon: menu data only (the game code loads when it is played).
export const meta = {
  id: 'hair-salon',
  title: 'Hair Salon',
  category: 'studio',
  type: 'Styling · Everyone together',
  goal: 'Give your salon client a fabulous new hairdo!',
  controls: [['stick', 'Move your hand'], ['x', 'Use the tool (hold) · tap: style, bling'], ['a', "Next tool (Styles / Bling: does it once first) · on Done: I'm done!"], ['lb', 'LB / RB: pick a tool (the last one is Done)'], ['dpad', 'D-pad left / right or LT / RT: next colour / style / bling'], ['b', 'Spin the chair / take bling off']],
  tips: ['First pick which girl you want to style!', 'Hold X to brush the messy hair smooth, then snip, grow, curl and colour it! A goes on to the next tool.', 'The d-pad (or LT / RT) picks the colour, style or bling. On Bling, A puts one on and moves on; X adds as many as you like, and moves one you point at.', 'When your look is ready for the mirror, press RB to Done and press A!'],
  music: 'runway',
  duration: 'about 4 min, then you choose',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
