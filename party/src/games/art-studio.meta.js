// Art Studio: menu data only (the game code in art-studio.js loads lazily).
export const meta = {
  id: 'art-studio',
  title: 'Art Studio',
  category: 'studio',
  type: 'Paint together · Everyone wins',
  goal: 'Paint a masterpiece together on one big canvas, then hang it in the museum!',
  controls: [['stick', 'Move your paintbrush'], ['x', 'Hold to paint (tap: stamp, fill)'], ['a', "Next tool (stamps / fills once first) · on Done: I'm ready!"], ['lb', 'LB / RB: change tool (the last one is Done)'], ['dpad', 'D-pad left / right: color or stamp (keyboard: LT / RT) · D-pad up / down or LT / RT: brush size'], ['b', 'Undo your last stroke']],
  cornerControls: { at: 'br', items: [['x', 'Paint'], ['a', 'Next'], ['dpad', 'Color'], ['b', 'Undo']] },
  tips: ['Hold X to paint. The d-pad (or LT / RT on a keyboard) picks the color.', 'On Stamps, A stamps once and goes on to the next tool; X stamps as many as you like.', 'B takes back your last stroke.', 'When your picture is finished, press RB until you reach Done, then press A. When the clock runs out you can keep painting.', 'On a controller, d-pad up / down or LT / RT make the brush smaller or bigger.', 'In the museum, press X to save your picture.'],
  music: 'cozy',
  duration: 'about 5 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
