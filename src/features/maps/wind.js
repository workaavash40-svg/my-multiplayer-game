/* ============================================================
   features/maps/wind.js
   Wind Map — animated clouds/leaves, timed flight burst ability
   (the only map with specialType 'fly' instead of 'dash').
   ============================================================ */

import { makeGroundPlatform } from './sharedGround.js';

export const windMap = {
  id: 'wind', name: 'Wind Map', gravityMultiplier: 1, specialType: 'fly',
  platforms: [makeGroundPlatform()],
  clouds: Array.from({ length: 10 }, () => ({
    x: Math.random() * 1280, y: 40 + Math.random() * 180, s: 0.6 + Math.random() * 0.8
  })),
  leaves: Array.from({ length: 30 }, () => ({
    x: Math.random() * 1280, y: Math.random() * 560, s: 1 + Math.random() * 2, a: Math.random() * Math.PI * 2
  })),
  draw(ctx, w, h, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#9fd4f2'); grad.addColorStop(1, '#e8f6ff');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of this.clouds) {
      c.x -= 2.4 * c.s;
      if (c.x < -80) c.x = w + 80;
      this.drawCloud(ctx, c.x, c.y, c.s);
    }
    ctx.fillStyle = '#8a6d3b';
    for (const l of this.leaves) {
      l.x -= 3 * l.s; l.a += 0.1;
      if (l.x < -10) l.x = w + 10;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.a);
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    }
    ctx.fillStyle = '#3a2b1a';
    for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
  },
  drawCloud(ctx, x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 22 * s, y + 6 * s, 14 * s, 0, Math.PI * 2);
    ctx.arc(x - 22 * s, y + 6 * s, 14 * s, 0, Math.PI * 2);
    ctx.fill();
  }
};
