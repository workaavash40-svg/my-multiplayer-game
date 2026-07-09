/* ============================================================
   player.js
   Player entity: movement, aiming, weapons, animation, drawing.
   Depends on: physics.js, weapons.js
   ============================================================ */

class Player {
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

    // Animation
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
      this.grounded = false; // set true again by platform resolution in game.js
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

  // --- Stickman rendering ---
  draw(ctx) {
    if (!this.alive) {
      this.drawDeath(ctx);
      return;
    }
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.dashing) {
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 3;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-this.facing * i * 14, -46);
        ctx.lineTo(-this.facing * i * 14, -6);
        ctx.globalAlpha = 0.35 - i * 0.08;
        ctx.stroke();
      }
      ctx.restore();
    }

    const flash = this.hitFlash > 0 ? '#ff5555' : '#1a1a1a';
    ctx.strokeStyle = flash;
    ctx.fillStyle = flash;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const bob = this.walking && this.grounded ? Math.sin(this.animFrame) * 3 : 0;
    const headY = -50 + bob * 0.3;
    const hipY = -20;
    const shoulderY = -38;

    // legs
    ctx.beginPath();
    if (this.grounded && this.walking) {
      const swing = Math.sin(this.animFrame) * 10;
      ctx.moveTo(0, hipY); ctx.lineTo(swing, 0);
      ctx.moveTo(0, hipY); ctx.lineTo(-swing, 0);
    } else if (!this.grounded) {
      ctx.moveTo(0, hipY); ctx.lineTo(8, -2);
      ctx.moveTo(0, hipY); ctx.lineTo(-6, -4);
    } else {
      ctx.moveTo(0, hipY); ctx.lineTo(6, 0);
      ctx.moveTo(0, hipY); ctx.lineTo(-6, 0);
    }
    ctx.stroke();

    // torso
    ctx.beginPath();
    ctx.moveTo(0, hipY); ctx.lineTo(0, shoulderY);
    ctx.stroke();

    // arms + weapon (aim direction)
    const armAngle = -this.aim * 0.6;
    const ax = Math.cos(armAngle) * 18 * this.facing;
    const ay = Math.sin(armAngle) * 18 - shoulderY * 0 + shoulderY;
    ctx.beginPath();
    ctx.moveTo(0, shoulderY); ctx.lineTo(ax, ay + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, shoulderY); ctx.lineTo(-3 * this.facing, shoulderY + 14);
    ctx.stroke();

    // weapon
    if (this.weapon === 'ak47') {
      ctx.save();
      ctx.translate(ax, ay + 18);
      if (this.facing === -1) ctx.scale(-1, 1);
      ctx.rotate(armAngle);
      WeaponArt.drawAK47(ctx);
      ctx.restore();
    } else {
      ctx.strokeStyle = this.currentWeaponDef.color || '#333';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax, ay + 18);
      ctx.lineTo(ax + Math.cos(armAngle) * 20 * this.facing, ay + 18 + Math.sin(armAngle) * 20);
      ctx.stroke();
    }

    // head
    ctx.beginPath();
    ctx.arc(0, headY, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#f2c9a0';
    ctx.fill();
    ctx.strokeStyle = flash;
    ctx.stroke();

    // hat (color-coded per player)
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(-11, headY - 4);
    ctx.lineTo(11, headY - 4);
    ctx.lineTo(9, headY - 12);
    ctx.lineTo(-9, headY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-13, headY - 5, 26, 3);

    // shield bubble
    if (this.shieldActive) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.animFrame * 2) * 0.1;
      ctx.fillStyle = WEAPONS.shield.color;
      ctx.beginPath();
      ctx.arc(0, hipY - 20, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // flight glow
    if (this.flying) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#bff2ff';
      ctx.beginPath();
      ctx.arc(0, -10, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Charge indicator for bow
    if (this.charging) {
      const def = this.currentWeaponDef;
      const ratio = this.chargeTime / def.maxCharge;
      ctx.save();
      ctx.fillStyle = '#222';
      ctx.fillRect(this.x - 20, this.y - 68, 40, 5);
      ctx.fillStyle = '#e8c07d';
      ctx.fillRect(this.x - 20, this.y - 68, 40 * ratio, 5);
      ctx.restore();
    }
  }

  drawDeath(ctx) {
    if (this.deathTimer <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.deathTimer / 30);
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -6); ctx.lineTo(14, -6);
    ctx.moveTo(-10, -14); ctx.lineTo(10, 2);
    ctx.moveTo(10, -14); ctx.lineTo(-10, 2);
    ctx.stroke();
    ctx.restore();
  }

  // Above-head name + health bar, drawn in world space.
  drawOverhead(ctx) {
    if (this.deathTimer > 0 && !this.alive) return;
    const barW = 60, barH = 7;
    const bx = this.x - barW / 2;
    const by = this.y - 92;
    ctx.save();
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(this.name, this.x, by - 6);
    ctx.fillText(this.name, this.x, by - 6);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(bx, by, barW, barH);
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = this.color;
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.restore();
  }
}
