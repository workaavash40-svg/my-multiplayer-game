/* ============================================================
   weapons.js
   Weapon definitions + projectile classes (Bullet, Spear, Laser).
   Depends on: physics.js
   ============================================================ */

const WEAPONS = {
  ak47: {
    id: 'ak47', name: 'AK-47', type: 'auto',
    damage: 9, fireRate: 7,        // frames between shots
    bulletSpeed: 16, spread: 0.06,
    ammo: Infinity, reloadTime: 0,
    color: '#3b3b3b'
  },
  bow: {
    id: 'bow', name: 'Bow & Arrow', type: 'charge',
    damage: 26, minDamage: 10, fireRate: 45,
    bulletSpeed: 13, chargeSpeedBonus: 8,
    maxCharge: 40, spread: 0.01,
    ammo: Infinity, reloadTime: 0,
    color: '#7a4b21'
  },
  shield: {
    id: 'shield', name: 'Shield', type: 'block',
    duration: 90, cooldown: 10 * 60,
    color: '#3fa7ff'
  },
  spear: {
    id: 'spear', name: 'Spear', type: 'throw',
    damage: 34, fireRate: 60, cooldown: 60,
    bulletSpeed: 15,
    color: '#c9a24b'
  },
  laser: {
    id: 'laser', name: 'Laser Gun', type: 'beam',
    damage: 30, fireRate: 55,
    beamSpeed: 22, spread: 0.14, // hard to aim = wider spread
    color: '#ff3b6f'
  }
};

// Order players cycle through with the "switch weapon" key.
const WEAPON_ORDER = ['ak47', 'bow', 'spear', 'laser'];
// Shield is a separate action bound to its own key, not part of the cycle.

// Special-ability tuning (bound to the "special" key; which one is active
// depends on the current map's `specialType`, see MAPS in game.js).
const SPECIALS = {
  fly: { duration: 4 * 60, cooldown: 20 * 60 },
  dash: { cooldown: 7 * 60, damage: 3, frames: 14 } // damage = 3% of 100 max HP
};

// Small hand-drawn "mini skin" for the AK-47, used instead of a plain line
// when the player is holding that weapon. Assumes the canvas is already
// translated to the weapon's shoulder origin and rotated to the aim angle,
// and that +x is "forward" (the drawing is mirrored by the caller for
// players facing left).
const WeaponArt = {
  drawAK47(ctx) {
    ctx.save();
    // Wooden stock (angled back)
    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.moveTo(-14, 3);
    ctx.lineTo(-2, 6);
    ctx.lineTo(-2, 1);
    ctx.lineTo(-14, -2);
    ctx.closePath();
    ctx.fill();

    // Receiver / body
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(-3, -4, 20, 7);

    // Front sight post
    ctx.fillStyle = '#111';
    ctx.fillRect(24, -7, 2, 5);

    // Barrel
    ctx.fillStyle = '#151515';
    ctx.fillRect(11, -2, 18, 3);

    // Curved magazine (the AK's signature banana shape)
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.quadraticCurveTo(8, 16, 14, 22);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4a4a4a';
    ctx.stroke();

    // Pistol grip
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.moveTo(-1, 3);
    ctx.lineTo(3, 3);
    ctx.lineTo(1, 12);
    ctx.lineTo(-2, 11);
    ctx.closePath();
    ctx.fill();

    // Wooden handguard highlight
    ctx.fillStyle = '#8a5a2f';
    ctx.fillRect(6, -3, 8, 2);

    ctx.restore();
  }
};

class Bullet {
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

class Spear {
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

// Instant hitscan beam for the laser gun. Represented briefly for drawing
// then discarded; damage is applied immediately on fire.
class LaserBeam {
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
