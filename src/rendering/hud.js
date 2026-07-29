/* ============================================================
   rendering/hud.js
   In-canvas HUD: scoreboard, weapon/ammo/cooldown bar, special
   ability cooldown, and the Space-map control hint. This is
   canvas drawing only — DOM screen management lives in ui/screens.js.

   Depends on: features/weapons/weaponData.js, ui/screens.js (formatTime)
   ============================================================ */

import { WEAPONS, SPECIALS } from '../features/weapons/weaponData.js';
import { formatTime } from '../ui/screens.js';

// Draws the top-center scoreboard and match timer directly on the
// game canvas.
export function drawHUD(ctx, canvasW, p1, p2, targetScore, matchFrames) {
  ctx.save();

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

  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ddd';
  ctx.fillText(formatTime(matchFrames), canvasW / 2, 58);

  ctx.restore();
}

// Bottom-center weapon/ammo/cooldown readout for a single player.
// side: 'left' | 'right' controls anchor position.
export function drawWeaponBar(ctx, canvasW, canvasH, player, side) {
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
}

// Special ability cooldown (flight burst on Wind, dash everywhere else).
export function drawSpecialCooldown(ctx, canvasW, canvasH, player, side, map) {
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
}

// Brief on-screen reminder of the Space map's flight keys, since it's
// the one map where "up" alone doesn't cover full movement.
export function drawZeroGHint(ctx, canvasW) {
  ctx.save();
  ctx.font = 'bold 12.5px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(120,180,255,0.9)';
  ctx.fillText('Zero-G: hold Up/W to rise · Down/S to descend', canvasW / 2, 76);
  ctx.restore();
}
