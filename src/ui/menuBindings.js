/* ============================================================
   ui/menuBindings.js
   Wires up all main-menu / map-select / controls / settings /
   online / pause / victory screen buttons. Pure event wiring —
   mutates the passed-in `game` instance's mode/state/mapId and
   calls its methods; does not contain simulation logic itself.

   Depends on: engine/audio.js, ui/screens.js, features/multiplayer/client.js
   ============================================================ */

import { SFX } from '../engine/audio.js';
import { showScreen, hideAllScreens } from './screens.js';
import { Multiplayer } from '../features/multiplayer/client.js';

export function bindMenuEvents(game) {
  document.getElementById('btn-local').onclick = () => {
    SFX.play('menu'); game.mode = 'local'; game.aiEnabled = false; showScreen('map-select');
  };
  document.getElementById('btn-ai').onclick = () => {
    SFX.play('menu'); game.mode = 'local'; game.aiEnabled = true; showScreen('map-select');
  };
  document.getElementById('btn-online').onclick = () => {
    SFX.play('menu'); game.mode = 'online'; showScreen('online-screen');
    if (!game._mpInitDone) {
      Multiplayer.init(game);
      game._mpInitDone = true;
    }
  };
  document.getElementById('btn-controls').onclick = () => { SFX.play('menu'); showScreen('controls-screen'); };
  document.getElementById('btn-settings').onclick = () => { SFX.play('menu'); showScreen('settings-screen'); };
  document.querySelectorAll('.back-btn').forEach(b => b.onclick = () => { SFX.play('menu'); showScreen('main-menu'); });

  document.querySelectorAll('.map-card').forEach(card => {
    card.onclick = () => {
      SFX.play('menu');
      game.mapId = card.dataset.map;
      game.startMatch();
    };
  });

  document.getElementById('mute-toggle').onchange = (e) => { SFX.muted = e.target.checked; };

  document.getElementById('btn-resume').onclick = () => { game.state = 'playing'; hideAllScreens(); };
  document.getElementById('btn-restart').onclick = () => { game.startMatch(); };
  document.getElementById('btn-quit').onclick = () => { game.state = 'menu'; showScreen('main-menu'); };

  document.getElementById('btn-play-again').onclick = () => { game.startMatch(); };
  document.getElementById('btn-change-map').onclick = () => { showScreen('map-select'); };
  document.getElementById('btn-main-menu').onclick = () => { game.state = 'menu'; showScreen('main-menu'); };

  document.getElementById('btn-fullscreen').onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };
}
