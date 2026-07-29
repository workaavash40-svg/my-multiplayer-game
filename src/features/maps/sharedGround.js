/* ============================================================
   features/maps/sharedGround.js
   Full-width platform used by every ground map so players can
   never run off the edge and fall through. Depends on
   engine/physics.js for the arena bounds.
   ============================================================ */

import { Physics } from '../../engine/physics.js';

export function makeGroundPlatform() {
  return { x: Physics.ARENA.left, y: 520, w: Physics.ARENA.right - Physics.ARENA.left, h: 30 };
}
