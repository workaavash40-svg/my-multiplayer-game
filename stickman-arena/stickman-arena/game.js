/**
 * game.js
 * Orchestrates everything: canvas + fixed-timestep loop, maps, input polling,
 * countdown / round flow, projectile + collision resolution, particles,
 * screen shake, AI bot, audio and menu wiring.
 * Online hooks live in multiplayer.js; touch input lives in touch.js (it
 * feeds virtual keys into `keysDown`, so nothing here is touch-specific).
 */

// ---------- Constants ----------
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');

const LOGICAL_W = 960;
const LOGICAL_H = 540;
const GROUND_Y = 390;
const COUNTDOWN_FRAMES = 180;   // 3 seconds of "3 · 2 · 1" at 60 updates/sec
const FIGHT_FRAMES = 48;        // "FIGHT!" flash; controls unlock on its first frame
const STEP_MS = 1000 / 60;
const IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

let renderScale = 1;

// ---------- Canvas sizing (crisp on hi-dpi phones) ----------
function resizeCanvas() {
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(2, Math.round(r.width * dpr));
  const h = Math.round(w * LOGICAL_H / LOGICAL_W);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderScale = canvas.width / LOGICAL_W;
  if (!State.running) renderBackdrop();
}

// ---------- Maps ----------
function drawCloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 20 * s, y + 6, 14 * s, 0, Math.PI * 2);
  ctx.arc(x - 20 * s, y + 6, 14 * s, 0, Math.PI * 2);
  ctx.fill();
}

const MAPS = {
  whitearena: {
    id: 'whitearena',
    name: 'White Arena',
    gravityScale: 1,
    jumpScale: 1,
    width: LOGICAL_W,
    platforms: [{ x: 0, y: GROUND_Y, width: LOGICAL_W, height: 24 }],
    drawBackground(ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, GROUND_Y, LOGICAL_W, 24);
    }
  },
  moon: {
    id: 'moon',
    name: 'Moon / Space',
    gravityScale: 0.5,
    jumpScale: 1.1,
    width: LOGICAL_W,
    platforms: [
      { x: 40, y: GROUND_Y, width: LOGICAL_W - 80, height: 26 },
      { x: 120, y: 290, width: 160, height: 16 },
      { x: LOGICAL_W - 280, y: 290, width: 160, height: 16 },
      { x: LOGICAL_W / 2 - 90, y: 205, width: 180, height: 16 }
    ],
    stars: null,
    drawBackground(ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
      g.addColorStop(0, '#02010a');
      g.addColorStop(1, '#161a35');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      if (!this.stars) {
        this.stars = Array.from({ length: 90 }, () => ({
          x: Math.random() * LOGICAL_W, y: Math.random() * (LOGICAL_H - 60), r: Math.random() * 1.6 + 0.3
        }));
      }
      ctx.fillStyle = '#fff';
      for (const s of this.stars) {
        ctx.globalAlpha = 0.4 + Math.sin(t * 0.002 + s.x) * 0.3 + 0.3;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8f5bd6';
      ctx.beginPath(); ctx.arc(LOGICAL_W - 110, 150, 36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c67bd9';
      ctx.beginPath(); ctx.arc(120, 130, 18, 0, Math.PI * 2); ctx.fill();
      for (const p of this.platforms) {
        ctx.fillStyle = '#9aa0b8';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#6d7290';
        ctx.fillRect(p.x, p.y, p.width, 4);
      }
    }
  },
  wind: {
    id: 'wind',
    name: 'Wind Map',
    gravityScale: 1,
    jumpScale: 1,
    width: LOGICAL_W,
    platforms: [{ x: 0, y: GROUND_Y, width: LOGICAL_W, height: 24 }],
    clouds: null,
    leaves: null,
    drawBackground(ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
      g.addColorStop(0, '#8fd0ff');
      g.addColorStop(1, '#d9f2ff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      if (!this.clouds) {
        this.clouds = Array.from({ length: 8 }, () => ({
          x0: Math.random() * (LOGICAL_W + 160), y: 40 + Math.random() * 170,
          s: 0.6 + Math.random() * 1.2, speed: 1.2 + Math.random() * 1.6
        }));
        this.leaves = Array.from({ length: 26 }, () => ({
          x0: Math.random() * (LOGICAL_W + 20), y0: Math.random() * LOGICAL_H, speed: 2 + Math.random() * 3
        }));
      }
      // positions derive from time (not per-frame increments) so speed is identical at 60/120/144 Hz
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const c of this.clouds) {
        drawCloud(ctx, (c.x0 + c.speed * t * 0.06) % (LOGICAL_W + 160) - 80, c.y, c.s);
      }
      ctx.fillStyle = '#a3742b';
      for (const l of this.leaves) {
        const x = (l.x0 + l.speed * t * 0.06) % (LOGICAL_W + 20) - 10;
        const y = l.y0 + Math.sin(t * 0.002 + l.x0) * 14;
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 2, t * 0.004 + l.x0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, GROUND_Y, LOGICAL_W, 24);
      ctx.fillStyle = '#3f7a35';
      ctx.fillRect(0, GROUND_Y - 4, LOGICAL_W, 5);
    }
  }
};

// ---------- Audio (generated placeholder tones) ----------
const Audio_ = {
  ctx: null,
  enabled: true,
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type = 'square', gain = 0.05) {
    if (!this.enabled) return;
    try {
      this.ensure();
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(this.ctx.destination);
      const now = this.ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now);
      o.stop(now + dur);
    } catch (e) { /* audio unavailable */ }
  },
  play(name) {
    switch (name) {
      case 'ak47': this.tone(180, 0.06, 'square', 0.06); break;
      case 'bow': this.tone(320, 0.12, 'triangle', 0.05); break;
      case 'spear': this.tone(140, 0.15, 'sawtooth', 0.05); break;
      case 'laser': this.tone(900, 0.15, 'sawtooth', 0.05); break;
      case 'jump': this.tone(440, 0.08, 'sine', 0.04); break;
      case 'shield': this.tone(600, 0.2, 'sine', 0.05); break;
      case 'hit': this.tone(120, 0.08, 'square', 0.06); break;
      case 'switch': this.tone(700, 0.05, 'sine', 0.03); break;
      case 'death': this.tone(90, 0.4, 'sawtooth', 0.06); break;
      case 'tick': this.tone(520, 0.12, 'triangle', 0.07); break;
      case 'go': this.tone(1040, 0.3, 'square', 0.06); break;
      case 'victory':
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.06), i * 140));
        break;
      case 'menu': this.tone(500, 0.05, 'sine', 0.03); break;
    }
  }
};

// ---------- Global game state ----------
const State = {
  mode: null,          // 'local' | 'online'
  mapId: 'whitearena',
  players: [],
  bot: false,
  botLevel: 2,         // 1 (Rookie) .. 6 (Impossible), see bot.js
  screen: 'menu',
  running: false,
  paused: false,
  winTarget: 5,
  matchSeconds: 0,
  round: 1,
  countdownT: 0,       // update frames since round start; < COUNTDOWN_FRAMES means controls are locked
  roundOver: false,
  banner: null,        // { text, color, t, total }
  pendingWinner: null, // player index who just won the whole match (shown after the banner)
  projectiles: [],
  beams: [],
  particles: [],
  shake: { time: 0, mag: 0 },
  fps: 0,
  online: null
};

// ---------- Input ----------
const keysDown = new Set();
let prevKeysDown = new Set();

const BLOCKED_DEFAULT_CODES = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown', 'Slash'
]);

window.addEventListener('keydown', (e) => {
  if (BLOCKED_DEFAULT_CODES.has(e.code)) e.preventDefault();
  keysDown.add(e.code);
  if (e.code === 'Escape') togglePause();
});
window.addEventListener('keyup', (e) => keysDown.delete(e.code));
window.addEventListener('blur', () => keysDown.clear());

function buildInput(controls) {
  const held = (k) => keysDown.has(controls[k]);
  const justPressed = (k) => keysDown.has(controls[k]) && !prevKeysDown.has(controls[k]);
  return {
    left: held('left'), right: held('right'),
    jumpPressed: justPressed('jump'), jumpHeld: held('jump'),
    firePressed: justPressed('shoot'), fireHeld: held('shoot'),
    aimUp: held('aimUp'), aimDown: held('aimDown'),
    switchPressed: justPressed('switchWeapon'),
    shieldPressed: justPressed('shield'),
    specialPressed: justPressed('special')
  };
}

function neutralInput() {
  return {
    left: false, right: false, jumpPressed: false, jumpHeld: false,
    firePressed: false, fireHeld: false, aimUp: false, aimDown: false,
    switchPressed: false, shieldPressed: false, specialPressed: false
  };
}

/**
 * Returns [inputForP1, inputForP2]. While `locked` (countdown / between rounds)
 * both are neutral so stickmen just settle on the ground.
 */
function getFrameInputs(p1, p2, locked) {
  if (State.mode === 'online' && State.online) {
    const mySlot = State.online.mySlot;
    const localInput = locked ? neutralInput() : buildInput(CONTROL_SCHEMES.p1);
    if (State.online.socket && State.online.socket.connected) State.online.socket.emit('input', localInput);
    if (locked) return [neutralInput(), neutralInput()];
    const remote = typeof remoteInputBuffer !== 'undefined' ? remoteInputBuffer : neutralInput();
    return mySlot === 0 ? [localInput, remote] : [remote, localInput];
  }
  if (locked) return [neutralInput(), neutralInput()];
  return [buildInput(p1.controls), State.bot ? computeBotInput(p2, p1, State.projectiles) : buildInput(p2.controls)];
}

// ---------- Particles & shake ----------
function spawnParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    State.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 1,
      life: 24 + Math.random() * 12,
      color
    });
  }
}
function addShake(mag, time = 12) {
  State.shake.mag = Math.max(State.shake.mag, mag);
  State.shake.time = Math.max(State.shake.time, time);
}

// ---------- Match / round flow ----------
let loopHandle = 0;
let lastTime = 0;
let acc = 0;
let lastFpsTime = 0;
let frameCount = 0;

function setInMatch(on) {
  document.body.classList.toggle('in-match', on);
}

function enterFullscreenLandscape() {
  const el = document.getElementById('game-container');
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen().then(() => {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  }).catch(() => {});
}

function startMatch(mapId, mode, botEnabled) {
  cancelAnimationFrame(loopHandle);
  State.mapId = mapId;
  State.mode = mode;
  State.bot = mode === 'local' && (IS_TOUCH || !!botEnabled); // a phone has no second keyboard

  const p1 = new Player('p1', 'Blue', 140, 300, '#2b6fff', '#2b6fff', CONTROL_SCHEMES.p1, 1);
  const p2 = new Player('p2', State.bot ? 'Bot L' + State.botLevel : 'Red', LOGICAL_W - 160, 300, '#ff3b3b', '#ff3b3b', CONTROL_SCHEMES.p2, -1);
  State.players = [p1, p2];
  State.matchSeconds = 0;
  State.round = 1;
  State.pendingWinner = null;
  State.screen = 'playing';
  State.paused = false;
  State.running = true;
  document.getElementById('pause-menu').classList.remove('active');

  startRound();
  UI.hideAllScreens();
  setInMatch(true);
  if (IS_TOUCH && mode === 'local') enterFullscreenLandscape();

  prevKeysDown = new Set(keysDown);
  lastTime = 0;
  acc = 0;
  loopHandle = requestAnimationFrame(loop);
}

function startRound() {
  const p1 = State.players[0], p2 = State.players[1];
  if (State.bot) {   // fresh brain every round; high levels also get bonus HP / faster shield
    p2.ai = createBotAI(State.botLevel, -1);
    p2.maxHp = p2.ai.cfg.hp;
    p2.shieldCdScale = p2.ai.cfg.shieldCd;
  }
  p1.respawn(140, 300);
  p2.respawn(LOGICAL_W - 160, 300);
  p1.facing = 1; p2.facing = -1;
  p1.aimAngle = 0; p2.aimAngle = 0;
  State.projectiles = [];
  State.beams = [];
  State.countdownT = 0;
  State.roundOver = false;
  State.banner = null;
  if (typeof remoteInputBuffer !== 'undefined') remoteInputBuffer = neutralInput();
}

function endRound(loserIdx) {
  State.roundOver = true;
  Audio_.play('death');
  if (loserIdx < 0) {
    State.banner = { text: 'DRAW — REPLAY', color: '#f1f1ee', t: 0, total: 120 };
    return;
  }
  const winner = State.players[1 - loserIdx];
  winner.score++;
  State.banner = { text: `${winner.name.toUpperCase()} SCORES`, color: winner.barColor, t: 0, total: 120 };
  State.pendingWinner = winner.score >= State.winTarget ? (1 - loserIdx) : null;
}

function leaveMatch() {
  State.running = false;
  State.paused = false;
  State.screen = 'menu';
  cancelAnimationFrame(loopHandle);
  setInMatch(false);
  document.getElementById('pause-menu').classList.remove('active');
  if ((typeof TouchControls !== "undefined")) TouchControls.releaseAll();
  if (State.mode === 'online' && State.online && State.online.socket) {
    State.online.socket.disconnect();
    window.__socket = null;
    State.online = null;
  }
  renderBackdrop();
}

function showVictory(winnerIdx) {
  State.running = false;
  State.screen = 'menu';
  setInMatch(false);
  if ((typeof TouchControls !== "undefined")) TouchControls.releaseAll();
  const winner = State.players[winnerIdx];
  UI.setVictoryScreen(winner.name, winner.barColor, State.players[0], State.players[1]);
  document.getElementById('victory-next-level').hidden = !(State.bot && winnerIdx === 0 && State.botLevel < 6);
  UI.showScreen('victory-screen');
  Audio_.play('victory');
}

// ---------- Main loop (fixed 60 Hz simulation, render per display frame) ----------
function loop(ts) {
  if (!State.running) return;
  loopHandle = requestAnimationFrame(loop);

  if (!lastTime) lastTime = ts;
  const dt = Math.min(ts - lastTime, 100);
  lastTime = ts;
  if (State.paused) return;

  acc += dt;
  while (acc >= STEP_MS) {
    update();
    prevKeysDown = new Set(keysDown); // per step, so one tap can never register twice
    acc -= STEP_MS;
    if (!State.running) return;
  }
  render();

  frameCount++;
  if (ts - lastFpsTime > 1000) {
    State.fps = frameCount;
    frameCount = 0;
    lastFpsTime = ts;
  }
}

function update() {
  const map = MAPS[State.mapId];
  const world = {
    width: map.width,
    platforms: map.platforms,
    gravityScale: map.gravityScale,
    jumpScale: map.jumpScale,
    mapId: map.id,
    playSound: (n) => Audio_.play(n)
  };
  const [p1, p2] = State.players;

  // countdown bookkeeping (controls unlock on the first "FIGHT!" frame)
  const locked = State.countdownT < COUNTDOWN_FRAMES || State.roundOver;
  if (State.countdownT < COUNTDOWN_FRAMES + FIGHT_FRAMES) {
    const t = State.countdownT;
    if (t < COUNTDOWN_FRAMES && t % 60 === 0) Audio_.play('tick');
    if (t === COUNTDOWN_FRAMES) { Audio_.play('go'); addShake(4, 8); }
    State.countdownT++;
  }

  const [in1, in2] = getFrameInputs(p1, p2, locked);
  p1.update(in1, world);
  p2.update(in2, world);

  if (!locked) {
    handleFireRequest(p1, p2, world);
    handleFireRequest(p2, p1, world);
    State.matchSeconds += 1 / 60;
  }

  // ring-out
  for (const p of State.players) {
    if (p.alive && p.y > LOGICAL_H + 150) { p.hp = 0; p.alive = false; p.deathTimer = 0; }
  }

  if (!State.roundOver) {
    const d1 = !p1.alive, d2 = !p2.alive;
    if (d1 || d2) endRound(d1 && d2 ? -1 : (d1 ? 0 : 1));
  } else if (State.banner) {
    State.banner.t++;
    if (State.banner.t >= State.banner.total) {
      if (State.pendingWinner !== null) {
        showVictory(State.pendingWinner);
        return;
      }
      State.round++;
      startRound();
    }
  }

  updateProjectiles();
  updateParticles();
  if (State.shake.time > 0) State.shake.time--;
}

function handleFireRequest(shooter, target, world) {
  if (!shooter.consumeFireRequest()) return;
  const wCfg = WEAPONS[shooter.weapon];

  if (shooter.weapon === 'laser') {
    Audio_.play('laser');
    const muzzle = shooter.getMuzzlePosition();
    const angle = shooter.aimAngle;
    const dir = shooter.facing;
    const endX = muzzle.x + Math.cos(angle) * dir * 1200;
    const endY = muzzle.y + Math.sin(angle) * 1200;
    State.beams.push({ x1: muzzle.x, y1: muzzle.y, x2: endX, y2: endY, life: 8, color: wCfg.color });

    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const sx = muzzle.x + (endX - muzzle.x) * t;
      const sy = muzzle.y + (endY - muzzle.y) * t;
      if (sx > target.x && sx < target.x + target.width && sy > target.y && sy < target.y + target.height) {
        target.takeDamage(wCfg.damage, dir * 4, -2);
        spawnParticles(sx, sy, wCfg.color, 12);
        addShake(6, 10);
        Audio_.play('hit');
        break;
      }
    }
    return;
  }

  Audio_.play(shooter.weapon === 'ak47' ? 'ak47' : shooter.weapon === 'bow' ? 'bow' : 'spear');
  const proj = WeaponSystem.fire(shooter, world);
  if (proj) State.projectiles.push(proj);
}

function updateProjectiles() {
  const [p1, p2] = State.players;
  for (const proj of State.projectiles) {
    proj.update();
    const target = proj.owner === p1 ? p2 : p1;

    if ((!proj.returning || proj.type !== 'spear') && !State.roundOver) {
      if (target.alive && Physics.rectsIntersect(proj, target)) {
        target.takeDamage(proj.damage, (proj.vx > 0 ? 1 : -1) * 3, -3);
        spawnParticles(proj.x, proj.y, proj.color, 14);
        addShake(5, 8);
        Audio_.play('hit');
        if (proj.type === 'spear') proj.returning = true;
        else proj.dead = true;
      }
    }

    if (proj.y > LOGICAL_H + 50 || proj.x < -50 || proj.x > LOGICAL_W + 50) {
      if (proj.type === 'spear') proj.returning = true;
      else proj.dead = true;
    }
  }
  State.projectiles = State.projectiles.filter(p => !p.dead);
  State.beams.forEach(b => b.life--);
  State.beams = State.beams.filter(b => b.life > 0);
}

function updateParticles() {
  for (const p of State.particles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life--;
  }
  State.particles = State.particles.filter(p => p.life > 0);
}

// ---------- Render ----------
function beginFrame() {
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
}

function renderBackdrop() {
  beginFrame();
  MAPS[State.mapId].drawBackground(ctx, performance.now());
}

function render() {
  const map = MAPS[State.mapId];
  beginFrame();

  // world layer (shakes)
  ctx.save();
  if (State.shake.time > 0) {
    const m = State.shake.mag;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  map.drawBackground(ctx, performance.now());

  for (const p of State.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const camera = { x: 0 };
  for (const player of State.players) player.draw(ctx, camera);
  for (const player of State.players) player.drawNameAndHealth(ctx, camera);

  for (const proj of State.projectiles) {
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(Math.atan2(proj.vy, proj.vx));
    ctx.fillStyle = proj.color;
    if (proj.type === 'spear') {
      ctx.fillRect(-14, -1.5, 28, 3);
      ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(20, 0); ctx.lineTo(14, 4); ctx.fill();
    } else if (proj.type === 'arrow') {
      ctx.fillRect(-10, -1, 20, 2);
      ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(15, 0); ctx.lineTo(10, 3); ctx.fill();
    } else {
      ctx.fillRect(-5, -1.5, 10, 3);
    }
    ctx.restore();
  }

  for (const b of State.beams) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.2, b.life / 8);
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // HUD layer (never shakes)
  const [p1, p2] = State.players;
  const showFly = map.id === 'wind';
  UI.drawScoreboard(ctx, LOGICAL_W, p1, p2, State.winTarget);
  UI.drawMatchTimer(ctx, LOGICAL_W, State.matchSeconds);
  UI.drawWeaponHUD(ctx, LOGICAL_W, p1, 'left', showFly);
  UI.drawWeaponHUD(ctx, LOGICAL_W, p2, 'right', showFly);

  UI.drawCountdown(ctx, LOGICAL_W, LOGICAL_H, State.countdownT, State.round, State.winTarget);
  if (State.banner) UI.drawRoundBanner(ctx, LOGICAL_W, LOGICAL_H, State.banner);

  if (document.getElementById('fps-toggle').checked) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`FPS: ${State.fps}`, 10, LOGICAL_H - 10);
  }

  if (IS_TOUCH && (typeof TouchControls !== "undefined")) {
    const local = State.mode === 'online' && State.online ? State.online.mySlot : 0;
    TouchControls.sync(State.players[local], map.id);
  }
}

// ---------- Pause / fullscreen ----------
function togglePause() {
  if (!State.running || State.screen !== 'playing') return;
  State.paused = !State.paused;
  lastTime = 0;
  document.getElementById('pause-menu').classList.toggle('active', State.paused);
  if (State.paused && (typeof TouchControls !== "undefined")) TouchControls.releaseAll();
}

function toggleFullscreen() {
  const el = document.getElementById('game-container');
  if (!document.fullscreenElement) el.requestFullscreen && el.requestFullscreen().catch(() => {});
  else document.exitFullscreen && document.exitFullscreen();
}

// ---------- Menu wiring ----------
let pendingMode = 'local';
let pendingBot = false;

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.toggle('touch', IS_TOUCH);
  if (document.fonts && document.fonts.load) {
    document.fonts.load('28px "Bungee"').catch(() => {});
    document.fonts.load('600 16px "Barlow Condensed"').catch(() => {});
  }

  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(stage);
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 250));

  UI.showScreen('main-menu');

  const click = (id, fn) => document.getElementById(id).addEventListener('click', () => { Audio_.play('menu'); fn(); });

  click('btn-local', () => UI.showScreen('local-setup'));
  click('btn-online', () => UI.showScreen('online-lobby'));
  click('btn-choose-map', () => UI.showScreen('map-select-standalone'));
  click('btn-controls', () => {
    UI.drawControlGuide(document.getElementById('controls-p1-full'), CONTROL_SCHEMES.p1, 'Player 1 (Blue)');
    UI.drawControlGuide(document.getElementById('controls-p2-full'), CONTROL_SCHEMES.p2, 'Player 2 (Red)');
    UI.showScreen('controls-screen');
  });
  click('btn-settings', () => UI.showScreen('settings-screen'));

  document.querySelectorAll('.btn-back-menu').forEach(b => b.addEventListener('click', () => {
    Audio_.play('menu');
    UI.showScreen('main-menu');
  }));

  click('local-continue', () => {
    pendingMode = 'local';
    pendingBot = IS_TOUCH || document.getElementById('bot-toggle').checked;
    UI.showScreen('map-select');
  });

  document.querySelectorAll('#map-select .map-card, #map-select-standalone .map-card').forEach(card => {
    card.addEventListener('click', () => {
      const mapId = card.dataset.map;
      Audio_.play('menu');
      if (card.closest('#map-select-standalone')) {
        State.mapId = mapId;
        renderBackdrop();
        UI.showScreen('main-menu');
        return;
      }
      startMatch(mapId, pendingMode || 'local', pendingBot);
    });
  });

  document.getElementById('sound-toggle').addEventListener('change', (e) => { Audio_.enabled = e.target.checked; });
  document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

  // in-match controls
  document.getElementById('pause-btn').addEventListener('click', togglePause);
  document.getElementById('resume-btn').addEventListener('click', togglePause);
  document.getElementById('pause-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('pause-change-map').addEventListener('click', () => {
    leaveMatch();
    pendingMode = 'local';
    UI.showScreen('map-select');
  });
  document.getElementById('pause-main-menu').addEventListener('click', () => {
    leaveMatch();
    UI.showScreen('main-menu');
  });

  // victory screen
  // bot level picker
  const levelBtns = document.querySelectorAll('.level-btn');
  const levelDesc = document.getElementById('level-desc');
  const picker = document.getElementById('bot-level-picker');
  function selectLevel(n) {
    State.botLevel = n;
    levelBtns.forEach(b => b.classList.toggle('selected', Number(b.dataset.level) === n));
    levelDesc.textContent = `Level ${n} · ${BOT_LEVELS[n].name} — ${BOT_LEVELS[n].blurb}`;
  }
  levelBtns.forEach(b => b.addEventListener('click', () => { Audio_.play('menu'); selectLevel(Number(b.dataset.level)); }));
  const botToggle = document.getElementById('bot-toggle');
  const syncPicker = () => { picker.hidden = !(IS_TOUCH || botToggle.checked); };
  botToggle.addEventListener('change', syncPicker);
  selectLevel(State.botLevel);
  syncPicker();

  click('victory-next-level', () => {
    selectLevel(Math.min(6, State.botLevel + 1));
    startMatch(State.mapId, State.mode, true);
  });
  click('victory-play-again', () => startMatch(State.mapId, State.mode, State.bot));
  click('victory-change-map', () => UI.showScreen('map-select'));
  click('victory-main-menu', () => UI.showScreen('main-menu'));

  UI.drawControlGuide(document.getElementById('controls-left'), CONTROL_SCHEMES.p1, 'Player 1 · Blue');
  UI.drawControlGuide(document.getElementById('controls-right'), CONTROL_SCHEMES.p2, 'Player 2 · Red');

  if ((typeof TouchControls !== "undefined")) TouchControls.init();
  initOnlineLobby(); // multiplayer.js
});
