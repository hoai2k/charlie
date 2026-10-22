// Charlie Party - boot, main loop and debug entry points.
//
// URL parameters (handy for testing):
//   ?scene=sprites                     sprite viewer (all characters x all poses)
//   ?game=<id>                         jump straight to a minigame's intro
//     &players=4 &humans=1             player count / how many are human (rest CPU)
//     &chars=fox,bronze                characters for P1, P2... (repeats get the next colour scheme; NPC ids such as glimmer work for testing)
//     &auto=1                          every player is CPU (watch the AI play)
//     &skipintro=1                     skip the how-to-play screen
//     &level=0..2                      CPU difficulty
//   ?speed=3                           run the simulation faster
//   ?nosprites=1                       ignore generated sprites (base art only)
//   ?mute=1
//
// Keys anywhere: M sound on/off, F fullscreen on/off (also the corner buttons).
// O or a controller's View button on menu screens: Settings.

import { setupCanvas, beginFrame, endFrame, W, H } from './engine/canvas.js';
import { input } from './engine/input.js';
import { initAudio, unlockAudio, setMuted, preloadVoices, music } from './engine/audio.js';
import { loadSprites } from './engine/sprites.js';
import { loadArt, requestedKeys } from './engine/art.js';
import { particles } from './engine/particles.js';
import { fx } from './engine/fx.js';
import { scenes } from './engine/scenes.js';
import { shell } from './engine/shell.js';
import { corner } from './engine/corner.js';
import { settings } from './engine/settings.js';
import { songTag } from './engine/songtag.js';
import * as ui from './engine/ui.js';
import { session, makePlayer, newAIController, randomFreeCharacter, assignGlows } from './state.js';
import { variantCount } from './data/variants.js';
import { ALL_ENTRIES } from './data/characters.js';

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

// Screens that show the corner buttons (sound / fullscreen / settings, and the
// "i" how-to-play as a fourth while a game is paused): menus and the pause
// screen only, never during play.
const MENU_SCENES = new Set(['title', 'charselect', 'gameselect', 'intro', 'results', 'trophy']);
const showCorner = () => MENU_SCENES.has(scenes.name) || (scenes.name === 'play' && !!(scenes.current.paused || scenes.current.howto));
// Phones/tablets: fullscreen on a tap in landscape, iPhone's swipe-up bars.
shell.initMobile({ isPlaying: () => scenes.name === 'play' && !scenes.current.paused && !scenes.current.howto });

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
  const chars = (params.get('chars') || '').split(',').filter((c) => ALL_ENTRIES.some((x) => x.id === c));   // NPCs too (testing)
  session.cpuLevel = parseInt(params.get('level') || '0', 10) || 0;
  const humanCtrls = [input.keyboards[0], input.keyboards[1]];
  session.players = [];
  for (let i = 0; i < n; i++) {
    const isAI = i >= humans;
    const ctrl = isAI ? newAIController() : (humanCtrls[i] || input.keyboards[0]);
    const charId = chars[i] || randomFreeCharacter(session.players);
    const variant = Math.min(variantCount(charId), session.players.filter((p) => p.charId === charId).length);
    session.players.push(makePlayer(i, charId, ctrl, isAI, variant));
  }
  assignGlows(session.players);
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
      // Settings overlay pauses the screen underneath (it keeps its state).
      if (settings.isOpen) settings.update(dt);
      else {
        if (corner.visible && corner.mode === 'full' && input.humans().some((c) => c.pressed('back'))) settings.open();
        else scenes.update(wdt);
      }
      particles.update(wdt);
      fx.update(dt);
      if (i < steps - 1) input.update(0);
    }
    corner.mode = 'full';
    corner.visible = showCorner();
    songTag.update(rawDt);
    corner.update(rawDt);
    ui.resetHotspots();
    // keep a bottom scoreboard's chips clear of the song tag (bottom-left)
    ui.boardInsets.l = songTag.rect ? songTag.rect.x + songTag.rect.w + 8 : 0;
    ui.boardInsets.r = 0;
    g.save();
    g.translate(fx.ox, fx.oy);
    scenes.draw(g);
    g.restore();
    fx.drawFlash(g, W, H);
    songTag.draw(g);
    settings.draw(g);
    corner.draw(g);
  }
  endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
boot().catch((e) => { console.error(e); });

// Expose for automated tests / the console.
window.party = { scenes, session, input, particles, fx, music, artRequests: requestedKeys };
