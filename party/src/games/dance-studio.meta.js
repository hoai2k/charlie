// Dance Studio: menu data only (the game code loads when it is played).
export const meta = {
  id: 'dance-studio',
  title: 'Dance Studio',
  category: 'studio',
  type: 'Make a dance · Everyone wins',
  goal: 'Make up your own dance, pick the music, lights and stage, then put on a show together!',
  controls: [['lb', 'LB / RB: steps - moves, music, lights, stage, then Done'], ['stick', 'Pick a beat (1 to 8) · on the other steps: pick a card'], ['dpad', 'D-pad (or LT / RT): pick a dance move (or song, light, stage)'], ['x', 'Put the move in on this beat (swaps what\'s there) and stay'], ['a', 'Put the move in · all 8 beats danced: next step · OK, next step · on Done: I\'m ready!'], ['b', 'Take a move out · back a step'], ['y', 'Surprise me! (asks first if your dance has moves in it)']],
  tips: ['Every card is one beat. Fill all 8 beats!', 'Pick a move with the D-pad (LT / RT), then X or A puts it in.', 'When your show is all set, go to Done with A or RB and press A.', 'In the show everybody dances YOUR dance together.', 'Free dance at the end: every button is a pose!'],
  music: 'dance',
  duration: 'about 3 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  flyIn: false,
};
