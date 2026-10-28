// leaf-pile-leap: menu data only (the game code in leaf-pile-leap.js loads lazily).
export const meta = {
  id: 'leaf-pile-leap',
  title: 'Leaf Pile Leap',
  category: 'molly',
  type: 'Team up',
  goal: 'Rake the leaves into one giant pile together - then climb the ladder and jump in!',
  controls: [['stick', 'Run around the garden'], ['a', 'Rake! (Granny\'s pile: jump in!)'], ['b', 'Dash (Granny\'s pile: jump in!)']],
  tips: [
    'Press A by the leaves: whoosh, they fly onto the big pile!',
    'Cheeky squirrels! Bump into them or press A to shoo them off.',
    'Psst... Granny Goose\'s neat little pile by the gate is fun to jump in!',
    'When the pile is HUGE, climb the ladder - press A lots for a giant splash!',
  ],
  // Easy (A only): A rakes where you are; press it again and again to walk to more leaves.
  goalEasy: 'Rake the leaves into one giant pile together - then jump in!',
  controlsEasy: [['a', 'Rake! Keep pressing to walk to more leaves'], ['stick', 'Walk (if you like)'], ['b', 'Dash (if you like)']],
  tipsEasy: [
    'Press A to rake - the leaves fly onto the big pile!',
    'No leaves near you? Keep pressing A and you walk to some!',
    'Sometimes you walk to Granny\'s little pile... jump in!',
    'At the end, press A lots for a giant leafy splash!',
  ],
  music: 'bouncy',
  duration: '~75 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
