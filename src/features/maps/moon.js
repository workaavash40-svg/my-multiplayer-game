/* ============================================================
   features/maps/moon.js
   Moon — low gravity, higher jumps, Dash ability.
   ============================================================ */

import { makeGroundPlatform } from './sharedGround.js';

export const moonMap = {
  id: 'moon', name: 'Moon', gravityMultiplier: 0.45, specialType: 'dash',
  platforms: [makeGroundPlatform()],
  stars: Array.from({ length: 90 }, () => ({
    x: Math.random() * 1280, y: Math.random() * 460, r: Math.random() * 1.6 + 0.3
  })),
  draw(ctx, w, h, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#04051c'); grad.addColorStop(1, '#0c0f33');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (const s of this.stars) {
      ctx.globalAlpha = 0.5 + Math.sin(t / 30 + s.x) * 0.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d8cfc0';
    ctx.beginPath(); ctx.arc(1050, 90, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8b8477';
    [[1040, 78, 6], [1065, 100, 4], [1030, 100, 3]].forEach(([cx, cy, r]) => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#c7bfa6';
    for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#9c9380';
    for (let i = 0; i < 26; i++) ctx.fillRect(26 + i * 46, 520, 14, 6);
  }
};
