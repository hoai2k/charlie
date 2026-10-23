// Art Studio: menu data only (the game code in art-studio.js loads lazily).
export const meta = {
  id: 'art-studio',
  title: 'Art Studio',
  category: 'studio',
  type: 'Paint together · Everyone wins',
  goal: 'Paint a masterpiece together on one big canvas, then hang it in the museum!',
  controls: [['stick', 'Move your paintbrush'], ['a', 'Hold to paint'], ['x', 'Change tool (or D-pad up/down)'], ['rb', 'Color / stamp (LB/RB or D-pad left/right)'], ['y', 'Brush size']],
  cornerControls: { at: 'br', items: [['a', 'Paint'], ['x', 'Tool'], ['rb', 'Color'], ['y', 'Size'], ['b', 'Undo']] },
  tips: ['B takes back your last stroke.', 'Go to "Done!" at the top when your picture is finished. When the clock runs out you can keep painting.', 'In the museum, press X to save your picture.'],
  music: 'cozy',
  duration: 'about 5 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
