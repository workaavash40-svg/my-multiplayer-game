/* ============================================================
   rendering/playerRenderer.js
   Canvas rendering for a Player entity. This used to be
   Player.draw()/drawDeath()/drawOverhead() directly on the class;
   moved here so entities/Player.js stays simulation-only and this
   module owns "how a player looks", per the separation-of-concerns
   rule in context/CodingRules.md.

   This is a mechanical extraction: `this.` became `player.`, no
   behavior changed. Field names match entities/Player.js exactly.

   Depends on: features/weapons/weaponData.js, features/weapons/weaponArt.js
   ============================================================ */

import { WEAPONS } from '../features/weapons/weaponData.js';
import { WeaponArt } from '../features/weapons/weaponArt.js';

export function drawPlayer(ctx, player) {
  if (!player.alive) {
    drawPlayerDeath(ctx, player);
    return;
  }
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.dashing) {
    ctx.save();
    ctx.strokeStyle = player.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-player.facing * i * 14, -46);
      ctx.lineTo(-player.facing * i * 14, -6);
      ctx.globalAlpha = 0.35 - i * 0.08;
      ctx.stroke();
    }
    ctx.restore();
  }

  const flash = player.hitFlash > 0 ? '#ff5555' : '#1a1a1a';
  ctx.strokeStyle = flash;
  ctx.fillStyle = flash;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  const bob = player.walking && player.grounded ? Math.sin(player.animFrame) * 3 : 0;
  const headY = -50 + bob * 0.3;
  const hipY = -20;
  const shoulderY = -38;

  // legs
  ctx.beginPath();
  if (player.grounded && player.walking) {
    const swing = Math.sin(player.animFrame) * 10;
    ctx.moveTo(0, hipY); ctx.lineTo(swing, 0);
    ctx.moveTo(0, hipY); ctx.lineTo(-swing, 0);
  } else if (!player.grounded) {
    ctx.moveTo(0, hipY); ctx.lineTo(8, -2);
    ctx.moveTo(0, hipY); ctx.lineTo(-6, -4);
  } else {
    ctx.moveTo(0, hipY); ctx.lineTo(6, 0);
    ctx.moveTo(0, hipY); ctx.lineTo(-6, 0);
  }
  ctx.stroke();

  // torso
  ctx.beginPath();
  ctx.moveTo(0, hipY); ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // arms + weapon (aim direction)
  const armAngle = -player.aim * 0.6;
  const ax = Math.cos(armAngle) * 18 * player.facing;
  const ay = Math.sin(armAngle) * 18 - shoulderY * 0 + shoulderY;
  ctx.beginPath();
  ctx.moveTo(0, shoulderY); ctx.lineTo(ax, ay + 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, shoulderY); ctx.lineTo(-3 * player.facing, shoulderY + 14);
  ctx.stroke();

  // weapon
  if (player.weapon === 'ak47') {
    ctx.save();
    ctx.translate(ax, ay + 18);
    if (player.facing === -1) ctx.scale(-1, 1);
    ctx.rotate(armAngle);
    WeaponArt.drawAK47(ctx);
    ctx.restore();
  } else {
    ctx.strokeStyle = player.currentWeaponDef.color || '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ax, ay + 18);
    ctx.lineTo(ax + Math.cos(armAngle) * 20 * player.facing, ay + 18 + Math.sin(armAngle) * 20);
    ctx.stroke();
  }

  // head
  ctx.beginPath();
  ctx.arc(0, headY, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#f2c9a0';
  ctx.fill();
  ctx.strokeStyle = flash;
  ctx.stroke();

  // hat (color-coded per player)
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.moveTo(-11, headY - 4);
  ctx.lineTo(11, headY - 4);
  ctx.lineTo(9, headY - 12);
  ctx.lineTo(-9, headY - 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-13, headY - 5, 26, 3);

  // shield bubble
  if (player.shieldActive) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(player.animFrame * 2) * 0.1;
    ctx.fillStyle = WEAPONS.shield.color;
    ctx.beginPath();
    ctx.arc(0, hipY - 20, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // flight glow
  if (player.flying) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#bff2ff';
    ctx.beginPath();
    ctx.arc(0, -10, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // Charge indicator for bow
  if (player.charging) {
    const def = player.currentWeaponDef;
    const ratio = player.chargeTime / def.maxCharge;
    ctx.save();
    ctx.fillStyle = '#222';
    ctx.fillRect(player.x - 20, player.y - 68, 40, 5);
    ctx.fillStyle = '#e8c07d';
    ctx.fillRect(player.x - 20, player.y - 68, 40 * ratio, 5);
    ctx.restore();
  }
}

export function drawPlayerDeath(ctx, player) {
  if (player.deathTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, player.deathTimer / 30);
  ctx.translate(player.x, player.y);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -6); ctx.lineTo(14, -6);
  ctx.moveTo(-10, -14); ctx.lineTo(10, 2);
  ctx.moveTo(10, -14); ctx.lineTo(-10, 2);
  ctx.stroke();
  ctx.restore();
}

// Above-head name + health bar, drawn in world space.
export function drawPlayerOverhead(ctx, player) {
  if (player.deathTimer > 0 && !player.alive) return;
  const barW = 60, barH = 7;
  const bx = player.x - barW / 2;
  const by = player.y - 92;
  ctx.save();
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(player.name, player.x, by - 6);
  ctx.fillText(player.name, player.x, by - 6);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(bx, by, barW, barH);
  const pct = Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = player.color;
  ctx.fillRect(bx, by, barW * pct, barH);
  ctx.restore();
}

// A bobbing marker above the local human's own character — shown when
// which character is "yours" isn't obvious (AI mode: you're always
// Blue/p1; online mode: your color is randomly assigned per match).
export function drawYourCharacterIndicator(ctx, player, frame) {
  const bob = Math.sin(frame * 0.08) * 4;
  const px = player.x;
  const py = player.y - 112 + bob;

  ctx.save();
  ctx.translate(px, py);

  // Soft dark outline so the marker reads against any background.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, 11);
  ctx.lineTo(-9, -7);
  ctx.lineTo(9, -7);
  ctx.closePath();
  ctx.fill();

  // Bright downward-pointing chevron.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(-7, -6);
  ctx.lineTo(7, -6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
