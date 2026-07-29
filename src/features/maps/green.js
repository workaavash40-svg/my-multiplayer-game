/* ============================================================
   features/maps/green.js
   Green Valley — rolling hills scenery map, normal gravity, Dash
   special ability. Depends on sharedGround.js for the platform.
   ============================================================ */

import { makeGroundPlatform } from './sharedGround.js';

export const greenMap = {
  id: 'green', name: 'Green Valley', gravityMultiplier: 1, specialType: 'dash',
  platforms: [makeGroundPlatform()],
  hills: [
    { x: 120, r: 140 }, { x: 420, r: 190 }, { x: 760, r: 160 }, { x: 1080, r: 200 }
  ],
  clouds: Array.from({ length: 5 }, () => ({ x: Math.random() * 1280, y: 60 + Math.random() * 100, s: 0.7 + Math.random() * 0.6 })),
  draw(ctx, w, h, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#8fd3f4'); sky.addColorStop(1, '#e3f6ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fff9c4';
    ctx.beginPath(); ctx.arc(1120, 90, 40, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const c of this.clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 16 * c.s, 0, Math.PI * 2);
      ctx.arc(c.x + 20 * c.s, c.y + 4, 12 * c.s, 0, Math.PI * 2);
      ctx.arc(c.x - 20 * c.s, c.y + 4, 12 * c.s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#6fbf6f';
    for (const hl of this.hills) {
      ctx.beginPath();
      ctx.arc(hl.x, 520, hl.r, Math.PI, 0);
      ctx.fill();
    }

    ctx.fillStyle = '#4f9d4f';
    for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#3d7d3d';
    ctx.fillRect(this.platforms[0].x, this.platforms[0].y, this.platforms[0].w, 6);

    // simple trees
    ctx.fillStyle = '#7a4b21';
    [220, 560, 900, 1150].forEach(x => ctx.fillRect(x - 4, 480, 8, 40));
    ctx.fillStyle = '#2e8b3d';
    [220, 560, 900, 1150].forEach(x => {
      ctx.beginPath(); ctx.arc(x, 470, 26, 0, Math.PI * 2); ctx.fill();
    });
  }
};
