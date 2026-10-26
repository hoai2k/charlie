// Art Studio: menu data only (the game code in art-studio.js loads lazily).
export const meta = {
  id: 'art-studio',
  title: 'Art Studio',
  category: 'studio',
  type: 'Paint together · Everyone wins',
  goal: 'Paint a masterpiece together on one big canvas, then hang it in the museum!',
  controls: [['stick', 'Move your paintbrush'], ['a', "Hold to paint · on Done: I'm ready!"], ['lb', 'LB / RB: change tool (the last one is Done)'], ['x', 'Color / stamp (or D-pad left/right) · LT / RT: brush size'], ['b', 'Undo your last stroke']],
  cornerControls: { at: 'br', items: [['a', 'Paint'], ['rb', 'Tool'], ['x', 'Color'], ['b', 'Undo']] },
  tips: ['B takes back your last stroke.', 'When your picture is finished, press RB until you reach Done, then press A. When the clock runs out you can keep painting.', 'LT and RT make the brush smaller or bigger.', 'In the museum, press X to save your picture.'],
  music: 'cozy',
  duration: 'about 5 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
