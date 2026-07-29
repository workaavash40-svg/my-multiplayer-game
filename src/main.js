/* ============================================================
   main.js
   Application entry point. Wires up the DOM-dependent init calls
   in the same order the original single-bundle game.js did:
   screens → menu button bindings → game loop init.
   ============================================================ */

import { initScreens, showScreen } from './ui/screens.js';
import { bindMenuEvents } from './ui/menuBindings.js';
import { Game } from './engine/gameLoop.js';

window.addEventListener('DOMContentLoaded', () => {
  initScreens();
  bindMenuEvents(Game);
  showScreen('main-menu');
  Game.init();
});
