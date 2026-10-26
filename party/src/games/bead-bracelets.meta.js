// Sparkle Bead Shop: menu data only (the game code in bead-bracelets.js loads lazily).
export const meta = {
  id: 'bead-bracelets',
  title: 'Sparkle Bead Shop',
  category: 'studio',
  type: 'Patterns · Everyone wins',
  goal: 'Finish each customer\'s bead pattern, then design your own sparkly jewelry!',
  controls: [['stick', 'Pick a bead (X: the next one)'], ['a', "Thread the bead · on Done: I'm ready!"], ['b', 'Take the last bead off'], ['y', 'Show me! (a hint, in the pattern rounds)'], ['lb', 'Design: LB / RB = Beads, Charms, Done']],
  tips: ['Look at the card: what comes next?', 'Press Y and the next bead sparkles.', 'Last round: make anything you like, then go to Done with RB and press A to twirl!'],
  music: 'cozy',
  duration: 'about 3 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
