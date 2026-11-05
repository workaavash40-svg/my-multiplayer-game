/**
 * weapons.js
 * Weapon definitions + Projectile entity + firing helpers.
 * Weapons cycle with Q: ak47 -> bow -> spear -> laser -> (back to ak47)
 * Shield is a separate ability bound to E, not part of the cycle.
 */

const WEAPON_ORDER = ['ak47', 'bow', 'spear', 'laser'];

const WEAPONS = {
  ak47: {
    key: 'ak47',
    name: 'AK-47',
    damage: 9,
    fireCooldown: 9,      // frames between shots (auto)
    bulletSpeed: 15,
    spread: 0.035,
    color: '#ffd23f',
    auto: true,
    ammoMax: 30,
    reloadFrames: 70
  },
  bow: {
    key: 'bow',
    name: 'Bow & Arrow',
    damage: 32,
    fireCooldown: 45,
    minChargeSpeed: 9,
    maxChargeSpeed: 21,
    maxChargeFrames: 55,
    color: '#c88a3a',
    auto: false
  },
  spear: {
    key: 'spear',
    name: 'Spear',
    damage: 42,
    fireCooldown: 95,     // acts as throw cooldown / return time
    bulletSpeed: 17,
    color: '#d8d8e0',
    auto: false
  },
  laser: {
    key: 'laser',
    name: 'Laser Gun',
    damage: 30,
    fireCooldown: 80,
    hitscan: true,
    color: '#ff35e1',
    auto: false
  }
};

const SHIELD_CONFIG = {
  activeFrames: 120,   // ~2s active
  cooldownFrames: 420  // 7s cooldown at 60fps
};

const FLIGHT_CONFIG = {
  activeFrames: 240,   // 4s flight
  cooldownFrames: 1200 // 20s cooldown
};

class Projectile {
  constructor(opts) {
    Object.assign(this, {
      x: 0, y: 0, vx: 0, vy: 0,
      width: 10, height: 4,
      damage: 10,
      owner: null,
      type: 'bullet',
      color: '#fff',
      life: 150,
      gravity: 0,
      thrown: false,
      returning: false,
      spearRef: null
    }, opts);
    this.age = 0;
    this.dead = false;
  }

  update() {
    this.age++;
    if (this.returning && this.owner) {
      // spear returns to owner
      const dx = (this.owner.x + this.owner.width / 2) - this.x;
      const dy = (this.owner.y + this.owner.height / 2) - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = 18;
      this.vx = (dx / d) * speed;
      this.vy = (dy / d) * speed;
      if (d < 24) {
        this.dead = true;
        if (this.owner) this.owner.spearAvailable = true;
      }
    } else if (this.type === 'spear' && this.age > 40) {
      this.returning = true;
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.gravity) this.vy += this.gravity;
    if (this.age > this.life) this.dead = true;
  }
}

const WeaponSystem = {
  /** Spawns a bullet/arrow/spear projectile from a player, returns Projectile or null */
  fire(player, world) {
    const w = WEAPONS[player.weapon];
    if (!w) return null;

    const muzzle = player.getMuzzlePosition();
    const angle = player.aimAngle;
    const dir = player.facing;

    if (w.key === 'ak47') {
      const spread = (Math.random() - 0.5) * w.spread;
      const a = angle + spread;
      return new Projectile({
        x: muzzle.x, y: muzzle.y,
        vx: Math.cos(a) * w.bulletSpeed * dir,
        vy: Math.sin(a) * w.bulletSpeed,
        damage: w.damage,
        owner: player,
        type: 'bullet',
        color: w.color,
        life: 90
      });
    }

    if (w.key === 'bow') {
      const chargeRatio = Math.min(player.chargeFrames / w.maxChargeFrames, 1);
      const speed = w.minChargeSpeed + (w.maxChargeSpeed - w.minChargeSpeed) * chargeRatio;
      return new Projectile({
        x: muzzle.x, y: muzzle.y,
        vx: Math.cos(angle) * speed * dir,
        vy: Math.sin(angle) * speed,
        damage: w.damage * (0.5 + chargeRatio * 0.5),
        owner: player,
        type: 'arrow',
        color: w.color,
        gravity: 0.15,
        life: 140
      });
    }

    if (w.key === 'spear') {
      if (!player.spearAvailable) return null;
      player.spearAvailable = false;
      return new Projectile({
        x: muzzle.x, y: muzzle.y,
        vx: Math.cos(angle) * w.bulletSpeed * dir,
        vy: Math.sin(angle) * w.bulletSpeed,
        damage: w.damage,
        owner: player,
        type: 'spear',
        color: w.color,
        life: 400
      });
    }

    // laser is hitscan - handled separately in game.js (instant ray), no projectile object needed
    return null;
  }
};
