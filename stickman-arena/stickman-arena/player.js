/**
 * player.js
 * Player entity: physics body, weapon/ability state machine, stickman
 * rendering with walk/jump/aim/shoot/death animation, and input mapping.
 */

// Uses KeyboardEvent.code (physical key), so layout/case never matters and
// Right Shift / Right Ctrl are distinguishable from their left counterparts.
const CONTROL_SCHEMES = {
  p1: {
    left: 'KeyA', right: 'KeyD', jump: 'KeyW', shoot: 'KeyF',
    aimUp: 'KeyR', aimDown: 'KeyV', switchWeapon: 'KeyQ', shield: 'KeyE', special: 'KeyC'
  },
  p2: {
    left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', shoot: 'Slash',
    aimUp: 'PageUp', aimDown: 'PageDown', switchWeapon: 'ShiftRight', special: 'ControlRight',
    shield: 'Enter'
  }
};

let PROJECTILE_ID = 1;

class Player {
  constructor(id, name, x, y, hatColor, barColor, controls, facing = 1) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.prevY = y;
    this.width = 22;
    this.height = 66; // matches drawn stickman (head top to feet)
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = facing; // 1 = right, -1 = left

    this.hatColor = hatColor;
    this.barColor = barColor;
    this.controls = controls;

    this.maxHp = 100;
    this.hp = 100;
    this.alive = true;
    this.respawnTimer = 0;

    this.score = 0;

    // aiming
    this.aimAngle = 0; // radians, 0 = horizontal in facing dir

    // weapon state
    this.weaponIndex = 0;
    this.weapon = WEAPON_ORDER[0];
    this.ammo = WEAPONS.ak47.ammoMax;
    this.reloading = false;
    this.reloadTimer = 0;
    this.fireTimer = 0;
    this.chargeFrames = 0;
    this.charging = false;
    this.spearAvailable = true;

    // shield
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldCooldown = 0;
    this.shieldCdScale = 1; // bots on high levels recharge faster

    // special (flight on wind map)
    this.flying = false;
    this.flightTimer = 0;
    this.flightCooldown = 0;

    // animation
    this.walkCycle = 0;
    this.muzzleFlash = 0;
    this.deathTimer = 0;
    this.hitFlash = 0;

    this.prevKeys = {};
  }

  get isMoving() {
    return Math.abs(this.vx) > 0.3 && this.onGround;
  }

  getMuzzlePosition() {
    const cx = this.x + this.width / 2;
    const shoulderY = this.y + 25; // matches arm origin in draw()
    const reach = 32;              // matches barrel tip in drawWeapon()
    return {
      x: cx + Math.cos(this.aimAngle) * reach * this.facing,
      y: shoulderY + Math.sin(this.aimAngle) * reach
    };
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.respawnTimer = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.flying = false;
    this.spearAvailable = true;
    this.ammo = WEAPONS.ak47.ammoMax;
    this.reloading = false;
  }

  takeDamage(amount, knockbackX, knockbackY) {
    if (!this.alive) return;
    if (this.shieldActive) return; // shield blocks all incoming damage
    this.hp -= amount;
    this.hitFlash = 10;
    this.vx += knockbackX;
    this.vy += knockbackY;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathTimer = 0;
    }
  }

  /**
   * input: { left, right, jumpPressed, jumpHeld, firePressed, fireHeld,
   *          aimUp, aimDown, switchPressed, shieldPressed, specialPressed }
   */
  update(input, world) {
    this.prevY = this.y;

    if (!this.alive) {
      this.deathTimer++;
      // slow settle
      Physics.applyGravity(this, world.gravityScale);
      this.y += this.vy;
      Physics.resolvePlatformCollision(this, world.platforms);
      return;
    }

    // --- Aiming ---
    if (typeof input.aimSet === 'number') {
      this.aimAngle = Math.max(-1.3, Math.min(1.3, input.aimSet)); // bots set the angle directly
    } else {
      if (input.aimUp) this.aimAngle -= 0.06;
      if (input.aimDown) this.aimAngle += 0.06;
      this.aimAngle = Math.max(-1.3, Math.min(1.3, this.aimAngle));
      if (!input.aimUp && !input.aimDown) {
        this.aimAngle *= 0.9; // drift back toward horizontal
      }
    }

    // --- Horizontal movement ---
    if (input.left && !input.right) {
      this.vx -= Physics.MOVE_ACCEL;
      this.facing = -1;
    } else if (input.right && !input.left) {
      this.vx += Physics.MOVE_ACCEL;
      this.facing = 1;
    }
    this.vx = Math.max(-Physics.MAX_MOVE_SPEED, Math.min(Physics.MAX_MOVE_SPEED, this.vx));
    if (input.face) this.facing = input.face; // bots decide their own facing (lets them lag when turning)

    // --- Jump ---
    if (input.jumpPressed && this.onGround) {
      this.vy = Physics.JUMP_FORCE * world.jumpScale;
      this.onGround = false;
      if (world.playSound) world.playSound('jump');
    }

    // --- Flight special (wind map) ---
    if (world.mapId === 'wind') {
      if (input.specialPressed && !this.flying && this.flightCooldown <= 0) {
        this.flying = true;
        this.flightTimer = FLIGHT_CONFIG.activeFrames;
      }
      if (this.flying) {
        this.flightTimer--;
        this.vy = input.jumpHeld ? -4 : -1.5;
        if (this.flightTimer <= 0) {
          this.flying = false;
          this.flightCooldown = FLIGHT_CONFIG.cooldownFrames;
        }
      } else if (this.flightCooldown > 0) {
        this.flightCooldown--;
      }
    }

    // --- Gravity & physics ---
    if (!this.flying) {
      Physics.applyGravity(this, world.gravityScale);
    }
    Physics.applyFriction(this);
    this.x += this.vx;
    this.y += this.vy;
    Physics.clampToWorld(this, world.width);
    Physics.resolvePlatformCollision(this, world.platforms);

    if (this.onGround && Math.abs(this.vx) > 0.3) {
      this.walkCycle += 0.25;
    }

    // --- Weapon switch ---
    if (input.switchPressed) {
      this.weaponIndex = (this.weaponIndex + 1) % WEAPON_ORDER.length;
      this.weapon = WEAPON_ORDER[this.weaponIndex];
      this.charging = false;
      this.chargeFrames = 0;
      if (world.playSound) world.playSound('switch');
    }

    // --- Shield ---
    if (this.shieldActive) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
        this.shieldCooldown = Math.round(SHIELD_CONFIG.cooldownFrames * this.shieldCdScale);
      }
    } else if (this.shieldCooldown > 0) {
      this.shieldCooldown--;
    }
    if (input.shieldPressed && !this.shieldActive && this.shieldCooldown <= 0) {
      this.shieldActive = true;
      this.shieldTimer = SHIELD_CONFIG.activeFrames;
      if (world.playSound) world.playSound('shield');
    }

    // --- Weapon timers ---
    if (this.fireTimer > 0) this.fireTimer--;
    if (this.muzzleFlash > 0) this.muzzleFlash--;
    if (this.hitFlash > 0) this.hitFlash--;

    const wCfg = WEAPONS[this.weapon];

    if (this.weapon === 'ak47' && this.reloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammo = wCfg.ammoMax;
      }
    }

    let wantsFire = wCfg.auto ? input.fireHeld : input.firePressed;

    // Bow charging behavior
    if (this.weapon === 'bow') {
      if (input.fireHeld && this.fireTimer <= 0) {
        this.charging = true;
        this.chargeFrames = Math.min(this.chargeFrames + 1, wCfg.maxChargeFrames);
      }
      if (this.charging && !input.fireHeld) {
        // release -> fire
        this._requestFire = true;
        this.charging = false;
      }
      wantsFire = false; // handled via release above
    }

    if (this.weapon === 'ak47' && wantsFire && !this.reloading) {
      if (this.ammo <= 0) {
        this.reloading = true;
        this.reloadTimer = wCfg.reloadFrames;
      } else if (this.fireTimer <= 0) {
        this._requestFire = true;
        this.ammo--;
        this.fireTimer = wCfg.fireCooldown;
      }
    } else if (this.weapon === 'spear' && wantsFire && this.fireTimer <= 0 && this.spearAvailable) {
      this._requestFire = true;
      this.fireTimer = wCfg.fireCooldown;
    } else if (this.weapon === 'laser' && wantsFire && this.fireTimer <= 0) {
      this._requestFire = true;
      this.fireTimer = wCfg.fireCooldown;
    }

    if (this._requestFire) {
      this.muzzleFlash = 6;
    }
  }

  /** Called by game.js after update() to consume + clear the fire request */
  consumeFireRequest() {
    const wantsFire = !!this._requestFire;
    this._requestFire = false;
    return wantsFire;
  }

  // ---------------- Rendering ----------------

  draw(ctx, camera) {
    const x = this.x - camera.x;
    const y = this.y;

    if (!this.alive) {
      this.drawDeathAnim(ctx, x, y);
      return;
    }

    ctx.save();
    ctx.translate(x + this.width / 2, y);

    const bob = this.onGround ? Math.sin(this.walkCycle) * 4 : 0;
    const legSwing = this.onGround && Math.abs(this.vx) > 0.3 ? Math.sin(this.walkCycle) * 0.6 : 0;

    ctx.strokeStyle = this.hitFlash > 0 ? '#ff4444' : '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const headR = 8;
    const headY = 10 + Math.abs(bob) * 0.2;
    const shoulderY = headY + headR + 4;
    const hipY = shoulderY + 22;
    const footY = hipY + 22;

    // legs
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(-6 + legSwing * 8, footY);
    ctx.moveTo(0, hipY);
    ctx.lineTo(6 - legSwing * 8, footY);
    ctx.stroke();

    // torso
    ctx.beginPath();
    ctx.moveTo(0, shoulderY);
    ctx.lineTo(0, hipY);
    ctx.stroke();

    // back arm
    const aimA = this.aimAngle;
    ctx.beginPath();
    ctx.moveTo(0, shoulderY + 3);
    ctx.lineTo(Math.cos(aimA) * 14 * this.facing, shoulderY + 3 + Math.sin(aimA) * 14 - 4);
    ctx.stroke();

    // weapon
    this.drawWeapon(ctx, shoulderY);

    // front arm (over weapon)
    ctx.beginPath();
    ctx.moveTo(0, shoulderY + 3);
    ctx.lineTo(Math.cos(aimA) * 18 * this.facing, shoulderY + 3 + Math.sin(aimA) * 18);
    ctx.stroke();

    // head
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.stroke();

    // hat
    ctx.fillStyle = this.hatColor;
    ctx.beginPath();
    ctx.arc(0, headY - 2, headR + 1, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-headR - 2, headY - 3, (headR + 2) * 2, 3);

    // shield bubble
    if (this.shieldActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(80,180,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, this.height / 2, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(80,180,255,0.12)';
      ctx.fill();
      ctx.restore();
    }

    // muzzle flash
    if (this.muzzleFlash > 0) {
      const m = this.getMuzzlePosition();
      ctx.save();
      ctx.translate(-(this.x + this.width / 2), 0);
      ctx.translate(m.x, m.y - this.y);
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  drawWeapon(ctx, shoulderY) {
    const aimA = this.aimAngle;
    const cx = Math.cos(aimA);
    const sy = Math.sin(aimA);
    ctx.save();
    ctx.strokeStyle = WEAPONS[this.weapon] ? WEAPONS[this.weapon].color : '#999';
    ctx.lineWidth = 3;
    const len = this.weapon === 'bow' ? 12 : 20;
    ctx.beginPath();
    ctx.moveTo(cx * 10 * this.facing, shoulderY + 3 + sy * 10);
    ctx.lineTo(cx * (10 + len) * this.facing, shoulderY + 3 + sy * (10 + len));
    ctx.stroke();
    if (this.weapon === 'bow' && this.charging) {
      ctx.strokeStyle = '#ffdca8';
      ctx.lineWidth = 1.5;
      const pull = 6 + (this.chargeFrames / WEAPONS.bow.maxChargeFrames) * 6;
      ctx.beginPath();
      ctx.arc(cx * 16 * this.facing, shoulderY + 3 + sy * 16, pull, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDeathAnim(ctx, x, y) {
    const t = Math.min(this.deathTimer / 24, 1);
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.7;
    ctx.translate(x + this.width / 2, y + this.height * 0.6);
    ctx.rotate((Math.PI / 2) * t * this.facing);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(0, 10);
    ctx.moveTo(0, -20); ctx.arc(0, -20, 8, 0, Math.PI * 2);
    ctx.moveTo(0, 10); ctx.lineTo(-8, 24);
    ctx.moveTo(0, 10); ctx.lineTo(8, 24);
    ctx.moveTo(0, -5); ctx.lineTo(-14, 4);
    ctx.moveTo(0, -5); ctx.lineTo(14, 4);
    ctx.stroke();
    ctx.restore();
  }

  drawNameAndHealth(ctx, camera) {
    if (!this.alive && this.deathTimer > 30) return;
    const x = this.x - camera.x + this.width / 2;
    const y = this.y - 12;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#222';
    ctx.fillText(this.name, x, y - 10);

    const barW = 56, barH = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - barW / 2, y - 6, barW, barH);
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = this.barColor;
    ctx.fillRect(x - barW / 2 + 1, y - 5, (barW - 2) * pct, barH - 2);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barW / 2, y - 6, barW, barH);
    ctx.restore();
  }
}
