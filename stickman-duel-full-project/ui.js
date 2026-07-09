/* ============================================================
   ui.js
   Screen management (menus/HUD/victory) + in-canvas HUD drawing.
   Depends on: weapons.js (for weapon names/colors)
   ============================================================ */

const UI = {
  screens: {},

  init() {
    document.querySelectorAll('.screen').forEach(el => {
      this.screens[el.id] = el;
    });
    this.fpsEl = document.getElementById('fps-counter');
    this.frames = 0;
    this.lastFpsTime = performance.now();
    this.fps = 60;
  },

  show(id) {
    Object.values(this.screens).forEach(el => el.classList.add('hidden'));
    if (id && this.screens[id]) this.screens[id].classList.remove('hidden');
  },

  hideAll() {
    Object.values(this.screens).forEach(el => el.classList.add('hidden'));
  },

  updateFps() {
    this.frames++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastFpsTime));
      this.frames = 0;
      this.lastFpsTime = now;
      if (this.fpsEl) this.fpsEl.textContent = `${this.fps} FPS`;
    }
  },

  setVictory(winnerName, winnerColor, s1, s2) {
    document.getElementById('victory-title').textContent = `${winnerName} Wins!`;
    document.getElementById('victory-title').style.color = winnerColor;
    document.getElementById('victory-score').textContent = `Final Score: ${s1} - ${s2}`;
  },

  // Online matches show a personalized result per screen: the winner sees
  // "You Win!" and the loser sees "You Lose!" rather than a shared label.
  setVictoryOnline(amIWinner, winnerColor, s1, s2) {
    const title = document.getElementById('victory-title');
    title.textContent = amIWinner ? 'You Win!' : 'You Lose!';
    title.style.color = amIWinner ? '#5be36a' : '#ff5b5b';
    document.getElementById('victory-score').textContent = `Final Score: ${s1} - ${s2}`;
  },

  // In online mode only one human plays per screen, and they always use
  // the Blue/WASD scheme locally regardless of which character color
  // they were assigned — so show just one "Your Controls" guide.
  setOnlineControlGuide(isOnline) {
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
  },

  // --- Chat (online multiplayer) ---
  addChatMessage(text, who) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const line = document.createElement('div');
    line.className = `chat-line ${who}`;
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  },

  formatTime(frames) {
    const totalSec = Math.floor(frames / 60);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  // Draws the top-center scoreboard, bottom weapon/ammo/cooldown bar,
  // and match timer directly on the game canvas.
  drawHUD(ctx, canvasW, p1, p2, targetScore, matchFrames, roundLabel) {
    ctx.save();

    // --- Scoreboard (top center) ---
    const scoreText = `${p1.name} ${p1.score}  |  First to ${targetScore}  |  ${p2.score} ${p2.name}`;
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(scoreText).width + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(canvasW / 2 - tw / 2, 8, tw, 38);
    ctx.fillStyle = p1.color;
    ctx.fillText(`${p1.name} ${p1.score}`, canvasW / 2 - tw / 2 + 70, 34);
    ctx.fillStyle = '#fff';
    ctx.fillText(`First to ${targetScore}`, canvasW / 2, 34);
    ctx.fillStyle = p2.color;
    ctx.fillText(`${p2.score} ${p2.name}`, canvasW / 2 + tw / 2 - 70, 34);

    // --- Timer under scoreboard ---
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ddd';
    ctx.fillText(this.formatTime(matchFrames), canvasW / 2, 58);

    ctx.restore();
  },

  // Bottom-center weapon/ammo/cooldown readout for a single player.
  // side: 'left' | 'right' controls anchor position.
  drawWeaponBar(ctx, canvasW, canvasH, player, side) {
    ctx.save();
    const anchorX = side === 'left' ? 150 : canvasW - 150;
    const y = canvasH - 26;
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(anchorX - 130, y - 34, 260, 56);

    const def = player.currentWeaponDef;
    ctx.fillStyle = player.color;
    ctx.fillText(def.name, anchorX, y - 12);

    // Cooldown / status line
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff';
    let status = '';
    if (player.weapon === 'bow' && player.charging) {
      status = `Charging ${Math.round((player.chargeTime / def.maxCharge) * 100)}%`;
    } else if (player.weapon === 'spear' && !player.spearReady) {
      status = `Spear returning ${Math.ceil(player.spearCooldown / 60)}s`;
    } else if (player.fireCooldown > 0 && def.type === 'beam') {
      status = `Cooling ${Math.ceil(player.fireCooldown / 60)}s`;
    } else {
      status = 'Ready';
    }
    ctx.fillText(status, anchorX, y + 6);

    // Shield cooldown pip
    const shieldPct = player.shieldCooldown > 0
      ? 1 - player.shieldCooldown / WEAPONS.shield.cooldown
      : 1;
    ctx.fillStyle = '#222';
    ctx.fillRect(anchorX - 60, y + 14, 120, 6);
    ctx.fillStyle = WEAPONS.shield.color;
    ctx.fillRect(anchorX - 60, y + 14, 120 * shieldPct, 6);
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#bff';
    ctx.fillText('Shield', anchorX, y + 26);

    ctx.restore();
  },

  // Special ability cooldown (flight burst on Wind, dash everywhere else).
  drawSpecialCooldown(ctx, canvasW, canvasH, player, side, map) {
    ctx.save();
    const anchorX = side === 'left' ? 150 : canvasW - 150;
    const y = canvasH - 60;
    let pct, label, activeColor;
    if (map.specialType === 'fly') {
      pct = player.flyCooldown > 0 ? 1 - player.flyCooldown / SPECIALS.fly.cooldown : 1;
      label = player.flying ? 'Flying!' : 'Flight ability';
      activeColor = player.flying ? '#7CFC00' : '#87CEFA';
    } else {
      pct = player.dashCooldown > 0 ? 1 - player.dashCooldown / SPECIALS.dash.cooldown : 1;
      label = player.dashing ? 'Dashing!' : 'Dash ability';
      activeColor = player.dashing ? '#ffd166' : '#ff9f43';
    }
    ctx.fillStyle = '#222';
    ctx.fillRect(anchorX - 60, y, 120, 6);
    ctx.fillStyle = activeColor;
    ctx.fillRect(anchorX - 60, y, 120 * pct, 6);
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#eee';
    ctx.textAlign = 'center';
    ctx.fillText(label, anchorX, y - 3);
    ctx.restore();
  },

  // Brief on-screen reminder of the Space map's flight keys, since it's
  // the one map where "up" alone doesn't cover full movement.
  drawZeroGHint(ctx, canvasW) {
    ctx.save();
    ctx.font = 'bold 12.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(120,180,255,0.9)';
    ctx.fillText('Zero-G: hold Up/W to rise · Down/S to descend', canvasW / 2, 76);
    ctx.restore();
  }
};
