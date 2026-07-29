/* ============================================================
   entities/projectiles/Bullet.js
   Used for the AK-47 (kind='bullet'), Bow & Arrow (kind='arrow'),
   and Laser Gun (kind='laser'). No dependencies.
   ============================================================ */

export class Bullet {
  constructor(x, y, angle, speed, damage, ownerId, kind = 'bullet', color = '#ffe066') {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.ownerId = ownerId;
    this.kind = kind; // 'bullet' | 'arrow' | 'laser'
    this.color = color;
    this.dead = false;
    this.life = 120; // frames before despawning
    this.trail = [];
  }

  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
    this.x += this.vx;
    this.y += this.vy;
    if (this.kind !== 'laser') this.vy += 0.05; // slight bullet drop
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.kind === 'laser' ? 4 : 2;
    ctx.beginPath();
    if (this.trail.length) {
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (const p of this.trail) ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.kind === 'arrow' ? 3 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
