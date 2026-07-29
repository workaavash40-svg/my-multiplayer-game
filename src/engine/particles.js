/* ============================================================
   engine/particles.js
   Lightweight particle system used for hit sparks, dash trail
   puffs, etc. No dependencies.
   ============================================================ */

export class Particles {
  constructor() { this.list = []; }

  burst(x, y, color, count = 10, speed = 4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * speed + 1;
      this.list.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 24 + Math.random() * 14, color, size: 2 + Math.random() * 2
      });
    }
  }

  update() {
    for (const p of this.list) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.96;
      p.life--;
    }
    this.list = this.list.filter(p => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
