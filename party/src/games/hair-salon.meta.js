// Hair Salon: menu data only (the game code loads when it is played).
export const meta = {
  id: 'hair-salon',
  title: 'Hair Salon',
  category: 'studio',
  type: 'Styling · Everyone together',
  goal: 'Give your salon client a fabulous new hairdo!',
  controls: [['stick', 'Move your hand'], ['a', "Use the tool (hold) · tap: style, bling · on Done: I'm done!"], ['x', 'Use the tool, just like A'], ['lb', 'LB / RB or d-pad left / right: pick a tool (the last one is Done)'], ['dpad', 'D-pad up / down (keyboard: LT / RT): pick a colour / style / bling from the list'], ['b', 'Spin the chair / take bling off']],
  tips: ['First pick which girl you want to style!', 'Hold A or X to brush the messy hair smooth, then snip, grow, curl and colour it! Every tool is up to you.', 'The list beside your client picks the colour, style or bling: d-pad up / down (or LT / RT). "No style" lets the hair down.', 'On Bling, A or X puts one on; point at one and press again to move it.', 'When your look is ready for the mirror, go to Done (the last tool) and press A!'],
  music: 'runway',
  duration: 'about 4 min, then you choose',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
};
