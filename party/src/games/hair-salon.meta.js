// Hair Salon: menu data only (the game code loads when it is played).
export const meta = {
  id: 'hair-salon',
  title: 'Hair Salon',
  category: 'studio',
  type: 'Styling · Everyone together',
  goal: 'Give your salon client a fabulous new hairdo!',
  controls: [['stick', 'Move your hand'], ['a', "Use the tool (hold) · on Done: I'm done!"], ['lb', 'LB / RB: pick a tool (the last one is Done)'], ['x', 'Next colour / style / bling (or d-pad ↑ ↓)'], ['b', 'Spin the chair / take bling off'], ['y', 'Start over (asks first)']],
  tips: ['First pick which girl you want to style!', 'Brush the messy hair smooth, then snip, grow, curl and colour it!', 'Press X for the next colour, style or bling. Press A on bling to move it.', 'When your look is ready for the mirror, press RB to Done and press A!'],
  music: 'runway',
  duration: 'about 4 min, then you choose',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
