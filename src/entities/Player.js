/* ============================================================
   entities/Player.js
   Player entity: movement, aiming, weapons, ability state.

   REFACTOR NOTE: in the original codebase this class also owned
   draw()/drawDeath()/drawOverhead() (canvas rendering). Those have
   been moved to rendering/playerRenderer.js so this file is pure
   simulation state + behavior, per "business logic should never
   manipulate rendering directly." Field names are unchanged so the
   renderer can read them 1:1 — see that file for the drawing code
   that used to live here.

   Depends on: engine/physics.js, features/weapons/weaponData.js,
   entities/projectiles/Bullet.js, entities/projectiles/Spear.js
   ============================================================ */

import { Physics } from '../engine/physics.js';
import { WEAPONS, WEAPON_ORDER, SPECIALS } from '../features/weapons/weaponData.js';
import { Bullet } from './projectiles/Bullet.js';
import { Spear } from './projectiles/Spear.js';

export class Player {
  constructor(id, name, x, groundY, color, facing = 1) {
    this.id = id;                 // 'p1' | 'p2'
    this.name = name;
    this.x = x;
    this.y = groundY;
    this.groundY = groundY;
    this.vx = 0; this.vy = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.color = color;           // hat + health bar color
    this.facing = facing;         // 1 = right, -1 = left
    this.aim = 0;                 // -1 down, 0 level, 1 up (visual tilt)
    this.grounded = true;
    this.alive = true;
    this.score = 0;

    // Weapon state
    this.weaponIndex = 0;
    this.weapon = WEAPON_ORDER[0];
    this.fireCooldown = 0;
    this.charging = false;
    this.chargeTime = 0;
    this.spearReady = true;
    this.spearCooldown = 0;

    // Shield state
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldCooldown = 0;

    // Special ability (fly on wind/space maps, dash elsewhere)
    this.flying = false;
    this.flyTimer = 0;
    this.flyCooldown = 0;

    this.dashing = false;
    this.dashFrames = 0;
    this.dashTotalFrames = SPECIALS.dash.frames;
    this.dashStartX = 0;
    this.dashTargetX = 0;
    this.dashCooldown = 0;
    this.dashHitApplied = false;

    // Animation (read by playerRenderer.js)
    this.animFrame = 0;
    this.walking = false;
    this.deathTimer = 0;
    this.hitFlash = 0;
    this.respawnTimer = 0;

    // Knockback impulse applied externally
    this.recoil = 0;
  }

  get currentWeaponDef() { return WEAPONS[this.weapon]; }

  switchWeapon() {
    this.weaponIndex = (this.weaponIndex + 1) % WEAPON_ORDER.length;
    this.weapon = WEAPON_ORDER[this.weaponIndex];
    this.charging = false;
    this.chargeTime = 0;
  }

  takeDamage(amount, knockbackDir) {
    if (this.shieldActive || !this.alive) return false;
    this.hp -= amount;
    this.hitFlash = 10;
    this.vx += knockbackDir * 6;
    this.vy -= 3;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
    return true;
  }

  die() {
    this.alive = false;
    this.deathTimer = 60;
  }

  respawn(x, groundY) {
    this.x = x;
    this.y = groundY;
    this.vx = 0; this.vy = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.deathTimer = 0;
    this.shieldActive = false;
    this.flying = false;
  }

  // input: { left, right, up, shoot, aimUp, aimDown, switchWeapon, shield, special }
  // each is a boolean "held" state except switchWeapon/shield/special which
  // the caller should already debounce to "just pressed" where appropriate.
  update(input, map, opponent, spawnProjectile, sfx, particles) {
    if (!this.alive) {
      if (this.deathTimer > 0) this.deathTimer--;
      return;
    }

    // --- Dash special ability (all maps except Wind, which uses flight) ---
    if (map.specialType === 'dash') {
      if (this.dashCooldown > 0) this.dashCooldown--;
      if (input.special && !this.dashing && this.dashCooldown <= 0) {
        const bounds = map.bounds || Physics.ARENA;
        const distance = (bounds.right - bounds.left) / 3;
        this.dashing = true;
        this.dashFrames = this.dashTotalFrames;
        this.dashStartX = this.x;
        this.dashHitApplied = false;
        this.dashTargetX = Math.max(bounds.left, Math.min(bounds.right, this.x + this.facing * distance));
      }
    }

    if (this.dashing) {
      const t = 1 - this.dashFrames / this.dashTotalFrames;
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic for a snappy-but-smooth dash
      this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * eased;
      if (particles) particles.burst(this.x, this.y - 30, this.color, 2, 1.5);
      // Deal dash damage once if it sweeps through the opponent.
      if (!this.dashHitApplied && opponent && opponent.alive) {
        const lo = Math.min(this.dashStartX, this.dashTargetX);
        const hi = Math.max(this.dashStartX, this.dashTargetX);
        if (opponent.x >= lo - 18 && opponent.x <= hi + 18 && Math.abs(opponent.y - this.y) < 40) {
          opponent.takeDamage(SPECIALS.dash.damage, this.facing);
          this.dashHitApplied = true;
          if (sfx) sfx.play('hit');
        }
      }
      this.dashFrames--;
      if (this.dashFrames <= 0) { this.dashing = false; this.dashCooldown = SPECIALS.dash.cooldown; }
    }

    const zeroG = !!map.zeroGravity;
    const gravMult = zeroG ? 0 : (this.flying ? 0.15 : (map.gravityMultiplier || 1));

    // --- Movement (skipped horizontally while mid-dash so the dash tween owns X) ---
    const speed = Physics.MOVE_SPEED * (this.grounded ? 1 : Physics.AIR_CONTROL);
    if (this.dashing) {
      this.vx = 0;
    } else if (input.left) { this.vx = -speed; this.facing = -1; this.walking = true; }
    else if (input.right) { this.vx = speed; this.facing = 1; this.walking = true; }
    else { this.vx *= Physics.FRICTION; this.walking = Math.abs(this.vx) > 0.3; }

    if (zeroG) {
      // Space map: no gravity at all — thrust freely. Dedicated Up/Down
      // keys are the primary controls; the aim keys also work as a
      // fallback so muscle memory from Wind/Moon still does something.
      const thrustUp = input.up || input.aimUp;
      const thrustDown = input.down || input.aimDown;
      if (thrustUp) this.vy -= 0.55;
      if (thrustDown) this.vy += 0.55;
      this.vy *= 0.94;
      this.vy = Math.max(-7, Math.min(7, this.vy));
      this.grounded = false;
    } else if (input.up && this.grounded && !this.flying && !this.dashing) {
      this.vy = Physics.JUMP_FORCE * (map.id === 'moon' ? 1.6 : 1);
      this.grounded = false;
      if (sfx) sfx.play('jump');
    }

    // --- Special ability: timed burst flight (Wind map only) ---
    if (map.specialType === 'fly') {
      if (input.special && this.flyCooldown <= 0 && !this.flying) {
        this.flying = true;
        this.flyTimer = SPECIALS.fly.duration;
        this.flyCooldown = SPECIALS.fly.cooldown;
      }
      if (this.flying) {
        if (input.up) this.vy = -3.2;
        this.flyTimer--;
        if (this.flyTimer <= 0) this.flying = false;
      }
      if (this.flyCooldown > 0) this.flyCooldown--;
    }

    if (!this.dashing) {
      this.grounded = false; // set true again by platform resolution in the game loop
      Physics.integrate(this, gravMult);
    }

    // --- Hard arena bounds: keep the player on-screen at all times ---
    const b = map.bounds || Physics.ARENA;
    this.x = Math.max(b.left, Math.min(b.right, this.x));
    if (this.y - Physics.PLAYER_H < b.top) {
      this.y = b.top + Physics.PLAYER_H;
      if (this.vy < 0) this.vy = 0;
    }
    if (this.y > b.bottom) {
      this.y = b.bottom;
      if (this.vy > 0) this.vy = 0;
      if (zeroG) this.grounded = true;
    }

    // --- Aiming ---
    if (input.aimUp) this.aim = Math.min(1, this.aim + 0.12);
    else if (input.aimDown) this.aim = Math.max(-1, this.aim - 0.12);
    else this.aim *= 0.85;

    // --- Shield ---
    if (this.shieldCooldown > 0) this.shieldCooldown--;
    if (input.shield && this.shieldCooldown <= 0 && !this.shieldActive && this.weapon !== 'shield_locked') {
      this.shieldActive = true;
      this.shieldTimer = WEAPONS.shield.duration;
      this.shieldCooldown = WEAPONS.shield.cooldown;
      if (sfx) sfx.play('shield');
    }
    if (this.shieldActive) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) this.shieldActive = false;
    }

    // --- Weapon switch ---
    if (input.switchWeapon) this.switchWeapon();

    // --- Firing ---
    if (this.fireCooldown > 0) this.fireCooldown--;
    if (this.spearCooldown > 0) { this.spearCooldown--; if (this.spearCooldown <= 0) this.spearReady = true; }

    const def = this.currentWeaponDef;
    const originX = this.x + this.facing * 16;
    const originY = this.y - 40 + this.aim * -14;
    const baseAngle = -this.aim * 0.6;
    const angle = this.facing === 1 ? baseAngle : Math.PI - baseAngle;

    if (def.type === 'auto') {
      if (input.shoot && this.fireCooldown <= 0) {
        const spread = (Math.random() - 0.5) * def.spread;
        spawnProjectile(new Bullet(originX, originY, angle + spread, def.bulletSpeed, def.damage, this.id, 'bullet', '#fff3b0'));
        this.fireCooldown = def.fireRate;
        this.recoil = 6;
        if (sfx) sfx.play('gunshot');
      }
    } else if (def.type === 'charge') {
      if (input.shoot) {
        this.charging = true;
        this.chargeTime = Math.min(def.maxCharge, this.chargeTime + 1);
      } else if (this.charging) {
        const chargeRatio = this.chargeTime / def.maxCharge;
        const dmg = def.minDamage + (def.damage - def.minDamage) * chargeRatio;
        const spd = def.bulletSpeed + def.chargeSpeedBonus * chargeRatio;
        spawnProjectile(new Bullet(originX, originY, angle, spd, dmg, this.id, 'arrow', '#e8c07d'));
        this.charging = false;
        this.chargeTime = 0;
        this.recoil = 4;
        if (sfx) sfx.play('bow');
      }
    } else if (def.type === 'throw') {
      if (input.shoot && this.spearReady && this.fireCooldown <= 0) {
        spawnProjectile(new Spear(originX, originY, angle, def.bulletSpeed, def.damage, this.id, this));
        this.spearReady = false;
        this.spearCooldown = def.cooldown;
        this.fireCooldown = def.fireRate;
        this.recoil = 5;
        if (sfx) sfx.play('gunshot');
      }
    } else if (def.type === 'beam') {
      if (input.shoot && this.fireCooldown <= 0) {
        const spread = (Math.random() - 0.5) * def.spread;
        spawnProjectile(new Bullet(originX, originY, angle + spread, def.beamSpeed, def.damage, this.id, 'laser', '#ff3b6f'));
        this.fireCooldown = def.fireRate;
        this.recoil = 7;
        if (sfx) sfx.play('laser');
      }
    }

    if (this.recoil > 0) this.recoil *= 0.8;
    if (this.hitFlash > 0) this.hitFlash--;
    this.animFrame += 0.18;
  }
}
