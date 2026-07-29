/* ============================================================
   ui/screens.js
   DOM screen show/hide management, FPS counter, and victory/online
   text updates. Pure DOM manipulation — no game/business logic and
   no canvas drawing here (see rendering/hud.js for canvas HUD).
   ============================================================ */

const screens = {};
let fpsEl = null;
let frames = 0;
let lastFpsTime = 0;
let fps = 60;

export function initScreens() {
  document.querySelectorAll('.screen').forEach(el => { screens[el.id] = el; });
  fpsEl = document.getElementById('fps-counter');
  frames = 0;
  lastFpsTime = performance.now();
  fps = 60;
}

export function showScreen(id) {
  Object.values(screens).forEach(el => el.classList.add('hidden'));
  if (id && screens[id]) screens[id].classList.remove('hidden');
}

export function hideAllScreens() {
  Object.values(screens).forEach(el => el.classList.add('hidden'));
}

export function updateFps() {
  frames++;
  const now = performance.now();
  if (now - lastFpsTime >= 500) {
    fps = Math.round((frames * 1000) / (now - lastFpsTime));
    frames = 0;
    lastFpsTime = now;
    if (fpsEl) fpsEl.textContent = `${fps} FPS`;
  }
}

export function setVictory(winnerName, winnerColor, s1, s2) {
  document.getElementById('victory-title').textContent = `${winnerName} Wins!`;
  document.getElementById('victory-title').style.color = winnerColor;
  document.getElementById('victory-score').textContent = `Final Score: ${s1} - ${s2}`;
}

// Online matches show a personalized result per screen: the winner sees
// "You Win!" and the loser sees "You Lose!" rather than a shared label.
export function setVictoryOnline(amIWinner, winnerColor, s1, s2) {
  const title = document.getElementById('victory-title');
  title.textContent = amIWinner ? 'You Win!' : 'You Lose!';
  title.style.color = amIWinner ? '#5be36a' : '#ff5b5b';
  document.getElementById('victory-score').textContent = `Final Score: ${s1} - ${s2}`;
}

// In online mode only one human plays per screen, and they always use
// the Blue/WASD scheme locally regardless of which character color
// they were assigned — so show just one "Your Controls" guide.
export function setOnlineControlGuide(isOnline) {
  const left = document.querySelector('.control-guide.left');
  const right = document.querySelector('.control-guide.right');
  const chatToggle = document.getElementById('chat-toggle');
  if (!left || !right) return;
  if (isOnline) {
    right.classList.add('hidden-guide');
    left.querySelector('h4').textContent = 'YOUR CONTROLS';
    if (chatToggle) chatToggle.classList.remove('hidden-guide');
  } else {
    right.classList.remove('hidden-guide');
    left.querySelector('h4').textContent = 'PLAYER 1 — BLUE';
    if (chatToggle) chatToggle.classList.add('hidden-guide');
    const panel = document.getElementById('chat-panel');
    if (panel) panel.classList.add('hidden');
  }
}

export function formatTime(frameCount) {
  const totalSec = Math.floor(frameCount / 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
