/**
 * bot.js
 * Six-level bot AI. Each level is just a row of numbers in BOT_LEVELS, so
 * balancing means editing the table, not the logic.
 *
 *  reaction   frames before the bot reacts to a threat / re-rolls its aim error
 *  aimErr     max aim error in radians (0 = perfect)
 *  aimRate    max aim correction per frame (Infinity = instant snap)
 *  burstOn/Off  frames it holds the trigger / pauses (long On + 0 Off = never stops)
 *  turnDelay  frames it needs to turn around after you cross to its other side.
 *             Levels 1-3 are slow to turn; 4+ is 0 = turns and fires instantly.
 *  desired    preferred fighting distance (px)
 *  strafe     fraction of time it side-steps while in range
 *  jump       random jump chance per frame
 *  dodge      how reliably it jumps over incoming shots (0-1)
 *  shield     0 never, 1 only when hurt, 2 reactive, 3 perfectly timed (also vs laser)
 *  lead       how well it leads a moving target (0-1)
 *  laser      uses the laser to finish you off when you're at 30 HP or less
 *  hp         bot's max health (players always have 100)
 *  shieldCd   multiplier on the shield cooldown (1 = same as players, 0.5 = twice as fast)
 */

const BOT_LEVELS = {
  1: { name: 'Rookie',     blurb: 'Slow, misses a lot, turns around slowly.',
       reaction: 36, aimErr: 0.60, aimRate: 0.012, burstOn: 14,   burstOff: 90, turnDelay: 80, desired: 400, strafe: 0.00, jump: 0.003, dodge: 0,    shield: 0, lead: 0,   laser: false, hp: 100, shieldCd: 1 },
  2: { name: 'Easy',       blurb: 'Still sloppy, but shoots longer bursts.',
       reaction: 24, aimErr: 0.38, aimRate: 0.020, burstOn: 24,   burstOff: 60, turnDelay: 55, desired: 360, strafe: 0.10, jump: 0.006, dodge: 0,    shield: 0, lead: 0,   laser: false, hp: 100, shieldCd: 1 },
  3: { name: 'Average',    blurb: 'Decent aim, jumps, shields when hurt. Still slow to turn.',
       reaction: 14, aimErr: 0.20, aimRate: 0.030, burstOn: 45,   burstOff: 30, turnDelay: 30, desired: 320, strafe: 0.25, jump: 0.010, dodge: 0.15, shield: 1, lead: 0.2, laser: false, hp: 100, shieldCd: 1 },
  4: { name: 'Hard',       blurb: 'Strongest of the normal bots. Turns and fires instantly.',
       reaction: 6,  aimErr: 0.09, aimRate: 0.050, burstOn: 120,  burstOff: 6,  turnDelay: 0,  desired: 280, strafe: 0.50, jump: 0.020, dodge: 0.50, shield: 2, lead: 0.5, laser: true, hp: 100, shieldCd: 1 },
  5: { name: 'Expert',     blurb: 'Deadly aim, leads your movement, dodges and shields. 125 HP.',
       reaction: 2,  aimErr: 0.03, aimRate: 0.090, burstOn: 9999, burstOff: 0,  turnDelay: 0,  desired: 250, strafe: 0.70, jump: 0.030, dodge: 0.85, shield: 2, lead: 0.9, laser: true, hp: 125, shieldCd: 0.8 },
  6: { name: 'Impossible', blurb: 'Perfect aim and timing, 175 HP, shield recharges twice as fast. Good luck.',
       reaction: 0,  aimErr: 0,    aimRate: Infinity, burstOn: 9999, burstOff: 0, turnDelay: 0,  desired: 240, strafe: 0.80, jump: 0.030, dodge: 1.00, shield: 3, lead: 1.0, laser: true, hp: 175, shieldCd: 0.5 }
};

function createBotAI(level, facing) {
  return {
    level,
    cfg: BOT_LEVELS[level] || BOT_LEVELS[2],
    facing,            // the way the bot is *really* facing; may lag behind the opponent on levels 1-3
    turnTimer: 0,
    recover: 0,
    aimOffset: 0,
    aimTimer: 0,
    bursting: true,
    burstTimer: 30,
    strafeDir: 1,
    strafeTimer: 0,
    strafeActive: false,
    threatSeen: 0,
    jumpCd: 0,
    weaponTimer: 0
  };
}

function botThreat(bot, opp, projectiles) {
  // earliest incoming enemy projectile that will pass through the bot's body
  const cx = bot.x + bot.width / 2;
  const cy = bot.y + bot.height / 2;
  let best = null, count = 0;
  for (const p of projectiles) {
    if (p.owner !== opp || p.vx === 0) continue;
    if (p.type === 'spear' && p.returning) continue;
    const t = (cx - p.x) / p.vx;
    if (t <= 0 || t > 40) continue;
    const yAt = p.y + p.vy * t + (p.gravity ? 0.5 * p.gravity * t * t : 0);
    if (Math.abs(yAt - cy) < bot.height / 2 + 10) {
      count++;
      if (!best || t < best) best = t;
    }
  }
  return { t: best, count };
}

function computeBotInput(bot, opp, projectiles) {
  const ai = bot.ai;
  const c = ai.cfg;
  const input = neutralInput();
  input.face = ai.facing;
  if (!bot.alive || !opp.alive) return input;

  const bx = bot.x + bot.width / 2, by = bot.y + 25;
  const ox = opp.x + opp.width / 2, oy = opp.y + opp.height * 0.4;
  const dx = ox - bx, dist = Math.abs(dx);
  const side = dx >= 0 ? 1 : -1;

  // ---- turning: slow on levels 1-3, instant on 4+ ----
  if (ai.facing !== side) {
    if (c.turnDelay === 0) {
      ai.facing = side;
    } else {
      if (ai.turnTimer <= 0) ai.turnTimer = c.turnDelay + Math.floor(Math.random() * c.turnDelay * 0.4);
      if (--ai.turnTimer <= 0) { ai.facing = side; ai.recover = Math.round(c.reaction * 0.5); }
    }
  } else {
    ai.turnTimer = 0;
  }
  input.face = ai.facing;
  if (ai.recover > 0) ai.recover--;
  const facingOpp = ai.facing === side;

  // ---- threats: incoming shots ----
  const threat = botThreat(bot, opp, projectiles);
  if (threat.t !== null) ai.threatSeen++; else ai.threatSeen = 0;
  const reacted = threat.t !== null && ai.threatSeen >= c.reaction;

  // ---- shield ----
  if (!bot.shieldActive && bot.shieldCooldown <= 0) {
    let shield = false;
    if (c.shield === 1) shield = reacted && bot.hp < 40;
    else if (c.shield === 2) shield = reacted && threat.t < 18 && (bot.hp < 80 || threat.count >= 2);
    else if (c.shield === 3) {
      shield = (threat.t !== null && threat.t < 14);
      // also pre-empt a laser that is lined up on us
      if (!shield && opp.weapon === 'laser' && opp.fireTimer <= 0 && opp.facing === -side) {
        const want = Math.atan2((bot.y + bot.height / 2) - (opp.y + 25), dist || 1);
        if (Math.abs(want - opp.aimAngle) < 0.10) shield = true;
      }
    }
    if (shield) input.shieldPressed = true;
  }

  // ---- movement ----
  let move = 0;
  if (dist > c.desired + 70) move = side;
  else if (dist < c.desired - 90) move = -side;
  else {
    if (--ai.strafeTimer <= 0) {
      ai.strafeTimer = 30 + Math.floor(Math.random() * 60);
      ai.strafeDir = Math.random() < 0.5 ? -1 : 1;
      ai.strafeActive = Math.random() < c.strafe;
    }
    if (ai.strafeActive) move = ai.strafeDir;
  }
  if (bx < 80 && move < 0) move = c.strafe > 0 ? 1 : 0;           // stay away from the edges (ring-outs)
  if (bx > LOGICAL_W - 80 && move > 0) move = c.strafe > 0 ? -1 : 0;
  if (move < 0) input.left = true; else if (move > 0) input.right = true;

  // ---- jumping / dodging ----
  if (ai.jumpCd > 0) ai.jumpCd--;
  if (bot.onGround && ai.jumpCd <= 0) {
    const dodge = reacted && threat.t < 24 && Math.random() < c.dodge * 0.3;
    if (dodge || Math.random() < c.jump) {
      input.jumpPressed = true;
      input.jumpHeld = true;
      ai.jumpCd = 45;
    }
  }

  // ---- aiming ----
  if (--ai.aimTimer <= 0) {
    ai.aimTimer = Math.max(1, c.reaction);
    ai.aimOffset = (Math.random() * 2 - 1) * c.aimErr;
  }
  const speed = bot.weapon === 'ak47' ? 15 : 17;
  const flight = dist / speed;
  const tx = ox + opp.vx * flight * c.lead;
  const ty = oy + opp.vy * flight * c.lead;
  const targetAngle = Math.max(-1.3, Math.min(1.3,
    Math.atan2(ty - by, Math.abs(tx - bx) || 1) + ai.aimOffset));
  const diff = targetAngle - bot.aimAngle;
  input.aimSet = bot.aimAngle + Math.max(-c.aimRate, Math.min(c.aimRate, diff));

  // ---- weapon: AK-47, laser as a finisher on higher levels ----
  if (ai.weaponTimer > 0) ai.weaponTimer--;
  const wantWeapon = (c.laser && opp.hp <= 30 && bot.fireTimer <= 0) ? 'laser' : 'ak47';
  if (bot.weapon !== wantWeapon && ai.weaponTimer <= 0) {
    input.switchPressed = true;
    ai.weaponTimer = 4;
  }

  // ---- firing: only while facing you, in bursts, roughly lined up ----
  if (c.burstOff === 0) {
    ai.bursting = true;                      // never lets go of the trigger
  } else if (--ai.burstTimer <= 0) {
    ai.bursting = !ai.bursting;
    const base = ai.bursting ? c.burstOn : c.burstOff;
    ai.burstTimer = Math.max(1, Math.round(base * (0.7 + Math.random() * 0.6)));
  }
  const alignTol = 0.12 + c.aimErr * 0.6;
  const lined = Math.abs(targetAngle - bot.aimAngle) < alignTol;
  if (facingOpp && ai.recover <= 0 && ai.bursting && lined && bot.weapon === wantWeapon) {
    input.fireHeld = true;
    input.firePressed = true;
  }
  return input;
}
