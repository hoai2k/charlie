// Registers every scene with the scene manager.
import { TitleScene } from './title.js';
import { CharSelectScene } from './charselect.js';
import { GameSelectScene } from './gameselect.js';
import { IntroScene } from './intro.js';
import { PlayScene } from './play.js';
import { ResultsScene } from './results.js';
import { TrophyScene } from './trophy.js';

export function registerScenes(scenes) {
  scenes.register('title', new TitleScene());
  scenes.register('charselect', new CharSelectScene());
  scenes.register('gameselect', new GameSelectScene());
  scenes.register('intro', new IntroScene());
  scenes.register('play', new PlayScene());
  scenes.register('results', new ResultsScene());
  scenes.register('trophy', new TrophyScene());
}
