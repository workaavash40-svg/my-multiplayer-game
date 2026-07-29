/* ============================================================
   entities/projectiles/LaserBeam.js
   Instant hitscan beam for the laser gun. Represented briefly for
   drawing then discarded; damage is applied immediately on fire
   (see entities/Player.js). No dependencies.

   NOTE: currently unused by Player.js, which fires the laser as a
   fast Bullet (kind='laser') instead of an instant hitscan. Kept
   from the original codebase for parity — flagged in docs/Systems.md
   as a possible future cleanup (dead code) rather than removed
   silently, per the "preserve existing behavior" instruction.
   ============================================================ */

export class LaserBeam {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
    this.life = 8;
    this.dead = false;
  }
  update() { this.life--; if (this.life <= 0) this.dead = true; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / 8;
    ctx.strokeStyle = '#ff3b6f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
    ctx.strokeStyle = '#ffd0dc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
