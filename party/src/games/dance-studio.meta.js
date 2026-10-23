// Dance Studio: menu data only (the game code loads when it is played).
export const meta = {
  id: 'dance-studio',
  title: 'Dance Studio',
  category: 'studio',
  type: 'Make a dance · Everyone wins',
  goal: 'Make up your own dance, pick the music, lights and stage, then put on a show together!',
  controls: [['stick', 'Pick a beat (1 to 8)'], ['dpad', 'Pick a dance move'], ['a', 'Put the move in, or pick one up to move it'], ['b', 'Take a move out'], ['lb', 'Steps: moves, music, lights, stage (LB / RB)'], ['y', 'Surprise me!']],
  tips: ['Every card is one beat. Fill all 8 beats!', 'In the show everybody dances YOUR dance together.', 'Free dance at the end: every button is a pose!'],
  music: 'dance',
  duration: 'about 3 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  flyIn: false,
};
