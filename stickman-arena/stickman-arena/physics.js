/**
 * physics.js
 * Shared physics constants and helper functions used by player.js,
 * weapons.js and game.js. Kept map-aware via a `gravityScale` param
 * so maps like Moon can alter jump/fall feel without duplicating code.
 */

const Physics = {
  GRAVITY: 0.65,
  MAX_FALL_SPEED: 19,
  GROUND_FRICTION: 0.80,
  AIR_FRICTION: 0.92,
  MOVE_ACCEL: 1.1,
  MAX_MOVE_SPEED: 5.2,
  JUMP_FORCE: -13.2,

  applyGravity(entity, gravityScale = 1) {
    entity.vy += this.GRAVITY * gravityScale;
    if (entity.vy > this.MAX_FALL_SPEED) entity.vy = this.MAX_FALL_SPEED;
  },

  applyFriction(entity) {
    entity.vx *= entity.onGround ? this.GROUND_FRICTION : this.AIR_FRICTION;
    if (Math.abs(entity.vx) < 0.05) entity.vx = 0;
  },

  rectsIntersect(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  },

  // Simple one-sided platform collision: only lands on top of platforms.
  resolvePlatformCollision(entity, platforms) {
    entity.onGround = false;
    for (const p of platforms) {
      const withinX = entity.x + entity.width > p.x && entity.x < p.x + p.width;
      if (!withinX) continue;
      const wasAbove = entity.prevY + entity.height <= p.y + 1;
      const nowBelowOrAt = entity.y + entity.height >= p.y;
      if (entity.vy >= 0 && wasAbove && nowBelowOrAt && entity.y < p.y + p.height) {
        entity.y = p.y - entity.height;
        entity.vy = 0;
        entity.onGround = true;
      }
    }
  },

  clampToWorld(entity, worldWidth) {
    if (entity.x < 0) entity.x = 0;
    if (entity.x + entity.width > worldWidth) entity.x = worldWidth - entity.width;
  },

  distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  }
};
