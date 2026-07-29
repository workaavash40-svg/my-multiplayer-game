/* ============================================================
   features/ai/aiBot.js
   Very small heuristic bot for "vs AI" mode: approach/retreat to
   stay at medium range, jump/dash/shield occasionally, shoot when
   roughly facing the opponent. No dependencies beyond the plain
   player/map data passed in.
   ============================================================ */

export function aiInput(p1, p2, map) {
  const dx = p1.x - p2.x;
  const dist = Math.abs(dx);
  const input = { left: false, right: false, up: false, down: false, shoot: false, aimUp: false, aimDown: false, switchWeapon: false, shield: false, special: false };

  if (dist > 260) { input[dx > 0 ? 'right' : 'left'] = true; }
  else if (dist < 120) { input[dx > 0 ? 'left' : 'right'] = true; }

  if (map && map.zeroGravity) {
    // Free-floating bot: drift toward the opponent's altitude.
    if (p1.y < p2.y - 15) input.up = Math.random() < 0.5;
    else if (p1.y > p2.y + 15) input.down = Math.random() < 0.5;
  } else if (Math.random() < 0.02 && p2.grounded) input.up = true;

  if (Math.random() < 0.01) input.switchWeapon = true;
  if (Math.random() < 0.006 && !p2.shieldActive) input.shield = true;
  if (Math.random() < 0.004) input.special = true;
  input.shoot = dist < 500 && Math.random() < 0.6;
  if (p1.y < p2.y - 20) input.aimUp = Math.random() < 0.5;

  return input;
}
