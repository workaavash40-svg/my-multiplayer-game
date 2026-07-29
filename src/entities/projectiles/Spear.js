/* ============================================================
   entities/projectiles/Spear.js
   Thrown weapon: flies out, sticks briefly, then returns to its
   owner (sets owner.spearReady = true on return). No dependencies.
   ============================================================ */

export class Spear {
  constructor(x, y, angle, speed, damage, ownerId, owner) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.ownerId = ownerId;
    this.owner = owner; // reference so it can return to them
    this.state = 'flying'; // flying -> stuck -> returning
    this.dead = false;
    this.stuckTimer = 0;
    this.angle = angle;
  }

  update() {
    if (this.state === 'flying') {
      this.angle = Math.atan2(this.vy, this.vx);
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.35;
      if (this.x < 0 || this.x > 1280 || this.y > 800) this.state = 'stuck';
    } else if (this.state === 'stuck') {
      this.stuckTimer++;
      if (this.stuckTimer > 45) this.state = 'returning';
    } else if (this.state === 'returning') {
      const dx = this.owner.x - this.x;
      const dy = (this.owner.y - 30) - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.angle = Math.atan2(dy, dx);
      this.x += (dx / d) * 18;
      this.y += (dy / d) * 18;
      if (d < 24) {
        this.dead = true;
        this.owner.spearReady = true;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#c9a24b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(6, -5);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
