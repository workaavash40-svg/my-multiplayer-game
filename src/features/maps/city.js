/* ============================================================
   features/maps/city.js
   City Rooftops — night skyline, normal gravity, Dash ability.
   ============================================================ */

import { makeGroundPlatform } from './sharedGround.js';

export const cityMap = {
  id: 'city', name: 'City Rooftops', gravityMultiplier: 1, specialType: 'dash',
  platforms: [makeGroundPlatform()],
  buildings: Array.from({ length: 14 }, (_, i) => ({
    x: i * 96, w: 70 + Math.random() * 20, h: 120 + Math.random() * 260
  })),
  draw(ctx, w, h, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2b3358'); sky.addColorStop(1, '#7c6a92');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffe28a';
    ctx.beginPath(); ctx.arc(1000, 100, 34, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#1e2340';
    for (const b of this.buildings) {
      ctx.fillRect(b.x, 520 - b.h, b.w, b.h);
      ctx.fillStyle = 'rgba(255,220,120,0.65)';
      for (let wy = 520 - b.h + 12; wy < 510; wy += 22) {
        for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 18) {
          if ((wx + wy) % 5 !== 0) ctx.fillRect(wx, wy, 8, 10);
        }
      }
      ctx.fillStyle = '#1e2340';
    }

    ctx.fillStyle = '#37394a';
    for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#4a4c60';
    ctx.fillRect(this.platforms[0].x, this.platforms[0].y, this.platforms[0].w, 5);
  }
};
