// Charlie Party - boot, main loop and debug entry points.
//
// URL parameters (handy for testing):
//   ?scene=sprites                     sprite viewer (all characters x all poses)
//   ?game=<id>                         jump straight to a minigame's intro
//     &players=4 &humans=1             player count / how many are human (rest CPU)
//     &chars=fox,bronze                characters for P1, P2...
//     &auto=1                          every player is CPU (watch the AI play)
//     &skipintro=1                     skip the how-to-play screen
//     &level=0..2                      CPU difficulty
//   ?speed=3                           run the simulation faster
//   ?nosprites=1                       ignore generated sprites (base art only)
//   ?mute=1
//
// Keys anywhere: M sound on/off, F fullscreen on/off (also the corner buttons).

import { setupCanvas, beginFrame, endFrame, W, H } from './engine/canvas.js';
import { input } from './engine/input.js';
import { initAudio, unlockAudio, setMuted, preloadVoices } from './engine/audio.js';
import { loadSprites } from './engine/sprites.js';
import { loadArt, requestedKeys } from './engine/art.js';
import { particles } from './engine/particles.js';
import { fx } from './engine/fx.js';
import { scenes } from './engine/scenes.js';
import { shell } from './engine/shell.js';
import { corner } from './engine/corner.js';
import * as ui from './engine/ui.js';
import { session, makePlayer, newAIController, randomFreeCharacter } from './state.js';
import { CHARACTERS } from './data/characters.js';

import { SpriteViewerScene } from './scenes/spriteviewer.js';

const params = new URLSearchParams(location.search);
const speed = parseFloat(params.get('speed') || '1') || 1;
if (params.has('mute')) setMuted(true);

const canvas = document.getElementById('game');
const g = setupCanvas(canvas);
input.init(canvas);
corner.init(canvas);

// Fullscreen + sound need a user gesture (see engine/shell.js).
input.onUserGesture = () => {
  unlockAudio();
  if (shell.wantFullscreen) shell.tryFullscreen();
};

// Screens that show the sound / fullscreen corner buttons (play: only while paused).
const MENU_SCENES = new Set(['title', 'charselect', 'gameselect', 'intro', 'results', 'trophy']);
const showCorner = () => MENU_SCENES.has(scenes.name) || (scenes.name === 'play' && !!scenes.current.paused);

let loadProgress = 0;
let loaded = false;

function drawLoading() {
  ui.partyBackdrop(g, performance.now() / 1000);
  ui.text(g, 'Charlie Party', W / 2, H / 2 - 80, { size: 120, color: '#ffd23f', strokeWidth: 22, weight: 800 });
  ui.bar(g, W / 2 - 300, H / 2 + 40, 600, 40, loadProgress, '#ff6fb1');
  ui.text(g, 'Loading...', W / 2, H / 2 + 130, { size: 40 });
}

async function boot() {
  initAudio();
  // Wait (briefly) for the font so the first frames use it.
  try { await Promise.race([document.fonts.load('700 40px Fredoka'), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* ignore */ }
  await Promise.all([loadSprites((p) => { loadProgress = p; }), loadArt()]);

  scenes.register('sprites', new SpriteViewerScene());
  const extra = await import('./scenes/index.js').catch((e) => { console.warn('Scenes not available yet', e); return null; });
  if (extra) extra.registerScenes(scenes);

  loaded = true;
  const sceneParam = params.get('scene');
  const gameParam = params.get('game');
  if (sceneParam) scenes.go(sceneParam, {}, { instant: true });
  else if (gameParam && extra) {
    setupDebugPlayers();
    scenes.go(params.has('skipintro') ? 'play' : 'intro', { gameId: gameParam }, { instant: true });
  } else if (extra) scenes.go('title', {}, { instant: true });
  else scenes.go('sprites', {}, { instant: true });
}

function setupDebugPlayers() {
  const n = Math.max(1, Math.min(8, parseInt(params.get('players') || '4', 10)));
  const auto = params.has('auto');
  const humans = auto ? 0 : Math.min(n, parseInt(params.get('humans') || '1', 10));
  const chars = (params.get('chars') || '').split(',').filter((c) => CHARACTERS.some((x) => x.id === c));
  session.cpuLevel = parseInt(params.get('level') || '0', 10) || 0;
  const humanCtrls = [input.keyboards[0], input.keyboards[1]];
  session.players = [];
  for (let i = 0; i < n; i++) {
    const isAI = i >= humans;
    const ctrl = isAI ? newAIController() : (humanCtrls[i] || input.keyboards[0]);
    const charId = chars[i] || randomFreeCharacter(session.players);
    session.players.push(makePlayer(i, charId, ctrl, isAI));
  }
  setTimeout(() => preloadVoices(session.players.map((p) => p.charId)), 500);
}

let last = performance.now();
function frame(now) {
  const rawDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.update(rawDt);
  beginFrame();
  if (!loaded) {
    drawLoading();
  } else {
    const steps = Math.max(1, Math.round(speed));
    for (let i = 0; i < steps; i++) {
      const dt = (rawDt * speed) / steps;
      const wdt = fx.timeScale(dt);
      scenes.update(wdt);
      particles.update(wdt);
      fx.update(dt);
      if (i < steps - 1) input.update(0);
    }
    corner.visible = showCorner();
    corner.update(rawDt);
    ui.resetHotspots();
    g.save();
    g.translate(fx.ox, fx.oy);
    scenes.draw(g);
    g.restore();
    fx.drawFlash(g, W, H);
    corner.draw(g);
  }
  endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
boot().catch((e) => { console.error(e); });

// Expose for automated tests / the console.
window.party = { scenes, session, input, particles, fx, artRequests: requestedKeys };
