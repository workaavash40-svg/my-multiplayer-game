/* ============================================================
   engine/physics.js
   Shared physics constants + collision helpers used by entities,
   weapons, and the game loop. No dependencies on other modules —
   this is the base of the dependency graph.

   NOTE: this is a verbatim port of the original physics.js. The
   only change from the pre-refactor version is `export const`
   instead of a bare global `const`.
   ============================================================ */

export const Physics = {
  // Base tuning values. Individual maps can override GRAVITY via
  // MAPS[id].gravityMultiplier (see features/maps).
  BASE_GRAVITY: 0.62,
  JUMP_FORCE: -14.5,
  MOVE_SPEED: 4.4,
  AIR_CONTROL: 0.75,      // fraction of MOVE_SPEED usable mid-air
  FRICTION: 0.82,         // ground deceleration
  MAX_FALL_SPEED: 18,
  PLAYER_W: 22,
  PLAYER_H: 58,

  // Default hard arena boundaries (invisible walls/ceiling/floor) so
  // players — especially flying ones on Wind/Space maps, or high-jumping
  // ones on the Moon map — can never leave the visible play field.
  ARENA: { left: 26, right: 1254, top: 40, bottom: 690 },

  // Axis aligned bounding box overlap test
  aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  },

  // Resolve a player against a single solid platform (rects: {x,y,w,h})
  // Returns true if the player landed on top of the platform this frame.
  resolvePlatform(entity, platform) {
    const ex = entity.x - Physics.PLAYER_W / 2;
    const ew = Physics.PLAYER_W;
    const ey = entity.y - Physics.PLAYER_H;
    const eh = Physics.PLAYER_H;

    if (!Physics.aabbOverlap(ex, ey, ew, eh, platform.x, platform.y, platform.w, platform.h)) {
      return false;
    }

    // Compute penetration depth on each side to figure out which
    // face we hit. This is a simple "shallowest side" resolver which
    // works well for mostly-flat platform levels like this game's maps.
    const fromTop = (platform.y) - (ey + eh);
    const fromBottom = (ey) - (platform.y + platform.h);
    const fromLeft = (platform.x) - (ex + ew);
    const fromRight = (ex) - (platform.x + platform.w);

    const penTop = Math.abs(fromTop);
    const penBottom = Math.abs(fromBottom);
    const penLeft = Math.abs(fromLeft);
    const penRight = Math.abs(fromRight);
    const min = Math.min(penTop, penBottom, penLeft, penRight);

    if (min === penTop && entity.vy >= 0) {
      entity.y = platform.y;
      entity.vy = 0;
      entity.grounded = true;
      return true;
    } else if (min === penBottom && entity.vy < 0) {
      entity.y = platform.y + platform.h + Physics.PLAYER_H;
      entity.vy = 0;
    } else if (min === penLeft) {
      entity.x = platform.x - Physics.PLAYER_W / 2;
    } else if (min === penRight) {
      entity.x = platform.x + platform.w + Physics.PLAYER_W / 2;
    }
    return false;
  },

  // Apply gravity + integrate velocity into position for any entity
  // with {x,y,vx,vy}. gravityMultiplier comes from the active map.
  integrate(entity, gravityMultiplier = 1) {
    entity.vy += Physics.BASE_GRAVITY * gravityMultiplier;
    if (entity.vy > Physics.MAX_FALL_SPEED) entity.vy = Physics.MAX_FALL_SPEED;
    entity.x += entity.vx;
    entity.y += entity.vy;
  },

  // Simple circle-vs-rect check used for bullet/spear collision against
  // a player's hitbox (treated as a rect centered on entity.x, feet at entity.y).
  pointInPlayer(px, py, entity) {
    const ex = entity.x - Physics.PLAYER_W / 2;
    const ey = entity.y - Physics.PLAYER_H;
    return px >= ex && px <= ex + Physics.PLAYER_W && py >= ey && py <= entity.y;
  },

  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }
};
