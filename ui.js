/**
 * ui.js
 * Canvas HUD (scoreboard, timer, weapon panels, countdown, round banner)
 * plus DOM helpers for menu screens. All canvas drawing uses the 960x540
 * logical coordinate space; game.js scales it to the real canvas size.
 */

const UI_FONT_DISPLAY = '"Bungee", Impact, "Arial Black", sans-serif';
const UI_FONT_BODY = '"Barlow Condensed", "Segoe UI", sans-serif';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const UI = {
  /** Top-centre panel: [BLUE  2 | FIRST TO 5 | 3  RED] — every item shares one vertical midline */
  drawScoreboard(ctx, W, p1, p2, winTarget) {
    const panelW = 360, panelH = 42, x = W / 2 - panelW / 2, y = 8;
    const midY = y + panelH / 2;
    const sideW = 128;

    ctx.save();
    ctx.textBaseline = 'middle';

    // base
    ctx.fillStyle = 'rgba(12,13,17,0.88)';
    roundRect(ctx, x, y, panelW, panelH, 8);
    ctx.fill();

    // coloured sides (clipped to the rounded panel)
    ctx.save();
    roundRect(ctx, x, y, panelW, panelH, 8);
    ctx.clip();
    ctx.fillStyle = p1.barColor;
    ctx.fillRect(x, y, sideW, panelH);
    ctx.fillStyle = p2.barColor;
    ctx.fillRect(x + panelW - sideW, y, sideW, panelH);
    ctx.restore();

    // names
    ctx.fillStyle = '#fff';
    ctx.font = `700 13px ${UI_FONT_BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText(p1.name.toUpperCase(), x + 12, midY + 1);
    ctx.textAlign = 'right';
    ctx.fillText(p2.name.toUpperCase(), x + panelW - 12, midY + 1);

    // scores
    ctx.font = `22px ${UI_FONT_DISPLAY}`;
    ctx.textAlign = 'right';
    ctx.fillText(String(p1.score), x + sideW - 12, midY + 1);
    ctx.textAlign = 'left';
    ctx.fillText(String(p2.score), x + panelW - sideW + 12, midY + 1);

    // centre label
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1f1ee';
    ctx.font = `600 12px ${UI_FONT_BODY}`;
    ctx.fillText(`FIRST TO ${winTarget}`, W / 2, midY + 1);

    ctx.restore();
  },

  drawMatchTimer(ctx, W, seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(12,13,17,0.6)';
    roundRect(ctx, W / 2 - 28, 56, 56, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#f1f1ee';
    ctx.font = `600 13px ${UI_FONT_BODY}`;
    ctx.fillText(`${m}:${s}`, W / 2, 66.5);
    ctx.restore();
  },

  /** Weapon + cooldown panel pinned to a top corner. Left-aligned content in both corners. */
  drawWeaponHUD(ctx, W, player, side, showFly) {
    const w = WEAPONS[player.weapon];
    const boxW = 188, boxH = 80, margin = 10;
    const bx = side === 'left' ? margin : W - margin - boxW;
    const by = margin;
    const pad = 14;

    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(12,13,17,0.78)';
    roundRect(ctx, bx, by, boxW, boxH, 8);
    ctx.fill();

    // player colour tab on the outer edge
    ctx.fillStyle = player.barColor;
    ctx.save();
    roundRect(ctx, bx, by, boxW, boxH, 8);
    ctx.clip();
    ctx.fillRect(side === 'left' ? bx : bx + boxW - 5, by, 5, boxH);
    ctx.restore();

    const tx = bx + pad + (side === 'left' ? 4 : 0);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = `700 16px ${UI_FONT_BODY}`;
    ctx.fillText(w.name.toUpperCase(), tx, by + 22);

    ctx.font = `500 13px ${UI_FONT_BODY}`;
    ctx.fillStyle = '#b9bcc4';
    let status = '';
    if (player.weapon === 'ak47') status = player.reloading ? 'Reloading…' : `Ammo ${player.ammo} / ${w.ammoMax}`;
    else if (player.weapon === 'bow') status = player.charging ? 'Drawing…' : 'Ready';
    else if (player.weapon === 'spear') status = player.spearAvailable ? 'Ready' : 'Returning…';
    else status = player.fireTimer > 0 ? 'Cooling down…' : 'Ready';
    ctx.fillText(status, tx, by + 40);

    // cooldown bars
    const barW = showFly ? 76 : boxW - pad * 2 - 4;
    const barY = by + 52;
    const shieldPct = player.shieldActive ? 1 : 1 - Math.min(player.shieldCooldown / SHIELD_CONFIG.cooldownFrames, 1);
    drawMiniBar(ctx, tx, barY, barW, 7, shieldPct, player.shieldActive ? '#3fb8ff' : '#7fd3ff', 'SHIELD');
    if (showFly) {
      const flyPct = player.flying ? 1 : 1 - Math.min(player.flightCooldown / FLIGHT_CONFIG.cooldownFrames, 1);
      drawMiniBar(ctx, tx + barW + 10, barY, barW, 7, flyPct, player.flying ? '#9b7bff' : '#c9b8ff', 'FLY');
    }
    ctx.restore();
  },

  /**
   * 3 · 2 · 1 · FIGHT! — t counts update frames since the round started.
   * Each number pops in, a shock-ring expands, a timer ring drains over exactly one second.
   */
  drawCountdown(ctx, W, H, t, round, winTarget) {
    const CD = COUNTDOWN_FRAMES, FIGHT = FIGHT_FRAMES;
    if (t >= CD + FIGHT) return;
    const cx = W / 2, cy = H * 0.40;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    if (t < CD) {
      const n = 3 - Math.floor(t / 60);
      const lt = (t % 60) / 60;
      const pop = easeOutBack(Math.min(lt / 0.3, 1));
      const scale = 2.2 - 1.2 * pop;
      const fade = lt > 0.8 ? 1 - ((lt - 0.8) / 0.2) * 0.8 : 1;
      const col = n === 1 ? '#ffd23f' : '#f1f1ee';

      ctx.fillStyle = 'rgba(6,8,12,0.42)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#b9bcc4';
      ctx.font = `600 20px ${UI_FONT_BODY}`;
      ctx.fillText(`ROUND ${round}  ·  FIRST TO ${winTarget}`, cx, cy + 128);

      // track + draining ring
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.arc(cx, cy, 92, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, 92, -Math.PI / 2, -Math.PI / 2 + (1 - lt) * Math.PI * 2);
      ctx.stroke();

      // shock ring
      ctx.globalAlpha = (1 - lt) * 0.45;
      ctx.lineWidth = 4;
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(cx, cy, 92 + lt * 70, 0, Math.PI * 2); ctx.stroke();

      // number
      ctx.globalAlpha = fade;
      ctx.translate(cx, cy + 4);
      ctx.scale(scale, scale);
      drawStencilText(ctx, String(n), 0, 0, 118, col);
    } else {
      const lt = (t - CD) / FIGHT;
      const slam = lt < 0.18 ? 2.2 - 1.2 * easeOutCubic(lt / 0.18) : 1 + (lt - 0.18) * 0.22;
      const fade = lt < 0.6 ? 1 : 1 - (lt - 0.6) / 0.4;

      ctx.fillStyle = `rgba(6,8,12,${0.42 * (1 - lt)})`;
      ctx.fillRect(0, 0, W, H);
      if (lt < 0.12) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - lt / 0.12)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // sweeping hazard bars
      const sweep = easeOutCubic(Math.min(lt / 0.35, 1));
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(cx - sweep * 300, cy - 78, sweep * 600, 4);
      ctx.fillRect(cx - sweep * 300, cy + 74, sweep * 600, 4);

      ctx.translate(cx, cy);
      ctx.scale(slam, slam);
      drawStencilText(ctx, 'FIGHT!', 0, 0, 92, '#ffd23f');
    }
    ctx.restore();
  },

  /** Slide-in banner shown between rounds. banner = { text, color, t, total } */
  drawRoundBanner(ctx, W, H, banner) {
    const inT = easeOutCubic(Math.min(banner.t / 16, 1));
    const p = banner.t / banner.total;
    const out = p > 0.85 ? (p - 0.85) / 0.15 : 0;
    const bh = 76, by = H * 0.36;

    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate((1 - inT) * -W, 0);
    ctx.fillStyle = 'rgba(8,9,12,0.86)';
    ctx.fillRect(0, by, W, bh);
    ctx.fillStyle = banner.color;
    ctx.fillRect(0, by, W, 5);
    ctx.fillRect(0, by + bh - 5, W, 5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = `30px ${UI_FONT_DISPLAY}`;
    ctx.fillText(banner.text, W / 2, by + bh / 2 + 2);
    ctx.restore();
  },

  drawControlGuide(el, controls, label) {
    if (!el) return;
    el.innerHTML = `<h4>${label}</h4>` + Object.entries(controls).map(([action, key]) =>
      `<div class="ctrl-row"><span class="ctrl-action">${labelForAction(action)}</span><span class="ctrl-key">${displayKey(key)}</span></div>`
    ).join('');
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  },

  setVictoryScreen(winnerName, winnerColor, p1, p2) {
    const w = document.getElementById('victory-winner');
    w.textContent = `${winnerName} Wins!`;
    w.style.color = winnerColor;
    document.getElementById('victory-score').textContent = `${p1.name} ${p1.score} – ${p2.score} ${p2.name}`;
  }
};

/** Chunky stencil text: black outline, blue/red offset echoes (matches the title style), main fill */
function drawStencilText(ctx, text, x, y, size, fill) {
  ctx.font = `${size}px ${UI_FONT_DISPLAY}`;
  ctx.lineWidth = Math.max(6, size * 0.1);
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#2b6fff';
  ctx.fillText(text, x + size * 0.04, y + size * 0.05);
  ctx.fillStyle = '#ff3b3b';
  ctx.fillText(text, x - size * 0.035, y - size * 0.03);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawMiniBar(ctx, x, y, w, h, pct, color, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, x, y, w, h, 3.5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, Math.max(h, w * pct), h, 3.5);
  ctx.fill();
  ctx.font = `600 10px ${UI_FONT_BODY}`;
  ctx.fillStyle = '#b9bcc4';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x, y + h + 12);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function labelForAction(action) {
  const map = {
    left: 'Move Left', right: 'Move Right', jump: 'Jump', shoot: 'Shoot',
    aimUp: 'Aim Up', aimDown: 'Aim Down', switchWeapon: 'Swap Weapon',
    shield: 'Shield', special: 'Special'
  };
  return map[action] || action;
}

function displayKey(code) {
  const map = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    PageUp: 'PgUp', PageDown: 'PgDn', ShiftRight: 'R-Shift', ControlRight: 'R-Ctrl',
    Enter: 'Enter', Slash: '/', Space: 'Space'
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  return code;
}
