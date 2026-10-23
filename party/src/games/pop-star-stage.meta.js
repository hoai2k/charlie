// Pop Star Stage: menu data only (the game code in pop-star-stage.js loads lazily).
import { rhythmOptions } from './rhythm/songs.js';

export const meta = {
  id: 'pop-star-stage',
  title: 'Pop Star Stage',
  category: 'studio',
  type: 'Rhythm · Highest score wins',
  goal: 'Press the matching button when each note reaches the line — your music poofs the Shadow Imps!',
  controls: [['a', 'Green notes'], ['b', 'Red notes'], ['x', 'Blue notes'], ['y', 'Yellow notes']],
  tips: ['Press right when the note touches the circle!', 'Play really well and your stars go up: trickier notes, more points! Miss a few and it gets easier.', 'Hit 20 in a row for rainbow FEVER — double points!'],
  music: 'dance',
  options: rhythmOptions('pop-star-stage'),
  duration: 'about 1–1½ min',
  minPlayers: 1, maxPlayers: 8,
  countdown: true,
};
