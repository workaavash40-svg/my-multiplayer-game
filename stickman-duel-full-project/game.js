/* ============================================================
   game.js
   Main entry point: state machine, game loop, maps, input,
   particles, screen shake, simple synthesized SFX, optional AI bot.
   Depends on: physics.js, weapons.js, player.js, ui.js, multiplayer.js
   ============================================================ */

// Full-width platform used by every ground map so players can never run
// off the edge and fall through (item: "borders so it does not fall").
const GROUND_PLATFORM = { x: Physics.ARENA.left, y: 520, w: Physics.ARENA.right - Physics.ARENA.left, h: 30 };

// ---------- Map definitions ----------
const MAPS = {
  green: {
    id: 'green', name: 'Green Valley', gravityMultiplier: 1, specialType: 'dash',
    platforms: [{ ...GROUND_PLATFORM }],
    hills: [
      { x: 120, r: 140 }, { x: 420, r: 190 }, { x: 760, r: 160 }, { x: 1080, r: 200 }
    ],
    clouds: Array.from({ length: 5 }, () => ({ x: Math.random() * 1280, y: 60 + Math.random() * 100, s: 0.7 + Math.random() * 0.6 })),
    draw(ctx, w, h, t) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#8fd3f4'); sky.addColorStop(1, '#e3f6ff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#fff9c4';
      ctx.beginPath(); ctx.arc(1120, 90, 40, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const c of this.clouds) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 16 * c.s, 0, Math.PI * 2);
        ctx.arc(c.x + 20 * c.s, c.y + 4, 12 * c.s, 0, Math.PI * 2);
        ctx.arc(c.x - 20 * c.s, c.y + 4, 12 * c.s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#6fbf6f';
      for (const hl of this.hills) {
        ctx.beginPath();
        ctx.arc(hl.x, 520, hl.r, Math.PI, 0);
        ctx.fill();
      }

      ctx.fillStyle = '#4f9d4f';
      for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#3d7d3d';
      ctx.fillRect(this.platforms[0].x, this.platforms[0].y, this.platforms[0].w, 6);

      // simple trees
      ctx.fillStyle = '#7a4b21';
      [220, 560, 900, 1150].forEach(x => ctx.fillRect(x - 4, 480, 8, 40));
      ctx.fillStyle = '#2e8b3d';
      [220, 560, 900, 1150].forEach(x => {
        ctx.beginPath(); ctx.arc(x, 470, 26, 0, Math.PI * 2); ctx.fill();
      });
    }
  },

  city: {
    id: 'city', name: 'City Rooftops', gravityMultiplier: 1, specialType: 'dash',
    platforms: [{ ...GROUND_PLATFORM }],
    buildings: Array.from({ length: 14 }, (_, i) => ({
      x: i * 96, w: 70 + Math.random() * 20, h: 120 + Math.random() * 260
    })),
    draw(ctx, w, h, t) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#2b3358'); sky.addColorStop(1, '#7c6a92');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffe28a';
      ctx.beginPath(); ctx.arc(1000, 100, 34, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#1e2340';
      for (const b of this.buildings) {
        ctx.fillRect(b.x, 520 - b.h, b.w, b.h);
        ctx.fillStyle = 'rgba(255,220,120,0.65)';
        for (let wy = 520 - b.h + 12; wy < 510; wy += 22) {
          for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 18) {
            if ((wx + wy) % 5 !== 0) ctx.fillRect(wx, wy, 8, 10);
          }
        }
        ctx.fillStyle = '#1e2340';
      }

      ctx.fillStyle = '#37394a';
      for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#4a4c60';
      ctx.fillRect(this.platforms[0].x, this.platforms[0].y, this.platforms[0].w, 5);
    }
  },

  moon: {
    id: 'moon', name: 'Moon', gravityMultiplier: 0.45, specialType: 'dash',
    platforms: [{ ...GROUND_PLATFORM }],
    stars: Array.from({ length: 90 }, () => ({
      x: Math.random() * 1280, y: Math.random() * 460, r: Math.random() * 1.6 + 0.3
    })),
    draw(ctx, w, h, t) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#04051c'); grad.addColorStop(1, '#0c0f33');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      for (const s of this.stars) {
        ctx.globalAlpha = 0.5 + Math.sin(t / 30 + s.x) * 0.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#d8cfc0';
      ctx.beginPath(); ctx.arc(1050, 90, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8b8477';
      [[1040, 78, 6], [1065, 100, 4], [1030, 100, 3]].forEach(([cx, cy, r]) => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#c7bfa6';
      for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#9c9380';
      for (let i = 0; i < 26; i++) ctx.fillRect(26 + i * 46, 520, 14, 6);
    }
  },

  wind: {
    id: 'wind', name: 'Wind Map', gravityMultiplier: 1, specialType: 'fly',
    platforms: [{ ...GROUND_PLATFORM }],
    clouds: Array.from({ length: 10 }, () => ({
      x: Math.random() * 1280, y: 40 + Math.random() * 180, s: 0.6 + Math.random() * 0.8
    })),
    leaves: Array.from({ length: 30 }, () => ({
      x: Math.random() * 1280, y: Math.random() * 560, s: 1 + Math.random() * 2, a: Math.random() * Math.PI * 2
    })),
    draw(ctx, w, h, t) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#9fd4f2'); grad.addColorStop(1, '#e8f6ff');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const c of this.clouds) {
        c.x -= 2.4 * c.s;
        if (c.x < -80) c.x = w + 80;
        this.drawCloud(ctx, c.x, c.y, c.s);
      }
      ctx.fillStyle = '#8a6d3b';
      for (const l of this.leaves) {
        l.x -= 3 * l.s; l.a += 0.1;
        if (l.x < -10) l.x = w + 10;
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.a);
        ctx.fillRect(-3, -1.5, 6, 3);
        ctx.restore();
      }
      ctx.fillStyle = '#3a2b1a';
      for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, p.h);
    },
    drawCloud(ctx, x, y, s) {
      ctx.beginPath();
      ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
      ctx.arc(x + 22 * s, y + 6 * s, 14 * s, 0, Math.PI * 2);
      ctx.arc(x - 22 * s, y + 6 * s, 14 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  space: {
    id: 'space', name: 'Deep Space', gravityMultiplier: 0, zeroGravity: true, specialType: 'dash',
    platforms: [], // no floor — free-floating arena, contained by bounds
    bounds: { left: 30, right: 1250, top: 36, bottom: 660 },
    stars: Array.from({ length: 140 }, () => ({
      x: Math.random() * 1280, y: Math.random() * 720, r: Math.random() * 1.8 + 0.3
    })),
    asteroids: Array.from({ length: 6 }, () => ({
      x: Math.random() * 1280, y: 80 + Math.random() * 500, r: 10 + Math.random() * 18, spin: Math.random() * Math.PI * 2
    })),
    draw(ctx, w, h, t) {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 800);
      grad.addColorStop(0, '#141433'); grad.addColorStop(1, '#020208');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      for (const s of this.stars) {
        ctx.globalAlpha = 0.4 + Math.sin(t / 25 + s.x) * 0.4;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8a7f74';
      for (const a of this.asteroids) {
        a.spin += 0.004;
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.spin);
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2;
          const r = a.r * (0.8 + Math.sin(i * 2.1) * 0.2);
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // Faint energy-field boundary so players can see the play area edges.
      const b = this.bounds;
      ctx.strokeStyle = 'rgba(120,180,255,0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    }
  }
};


// ---------- Synthesized sound effects (no external audio files needed) ----------
const SFX = {
  ctx: null,
  muted: false,
  ensure() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  play(name) {
    if (this.muted) return;
    this.ensure();
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.connect(gain);

    const presets = {
      gunshot: { type: 'square', f0: 220, f1: 60, dur: 0.08, vol: 0.15 },
      laser: { type: 'sawtooth', f0: 900, f1: 200, dur: 0.15, vol: 0.12 },
      bow: { type: 'triangle', f0: 300, f1: 500, dur: 0.12, vol: 0.12 },
      jump: { type: 'sine', f0: 300, f1: 500, dur: 0.1, vol: 0.1 },
      shield: { type: 'sine', f0: 500, f1: 700, dur: 0.2, vol: 0.1 },
      hit: { type: 'square', f0: 150, f1: 50, dur: 0.08, vol: 0.13 },
      victory: { type: 'triangle', f0: 440, f1: 880, dur: 0.6, vol: 0.15 },
      menu: { type: 'sine', f0: 500, f1: 650, dur: 0.06, vol: 0.08 }
    };
    const p = presets[name] || presets.menu;
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(p.f1, 1), t0 + p.dur);
    gain.gain.setValueAtTime(p.vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + p.dur);
    osc.start(t0);
    osc.stop(t0 + p.dur + 0.02);
  }
};

// ---------- Particle system ----------
class Particles {
  constructor() { this.list = []; }
  burst(x, y, color, count = 10, speed = 4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * speed + 1;
      this.list.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 24 + Math.random() * 14, color, size: 2 + Math.random() * 2
      });
    }
  }
  update() {
    for (const p of this.list) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.96;
      p.life--;
    }
    this.list = this.list.filter(p => p.life > 0);
  }
  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Key bindings (guaranteed no overlap) ----------
// `down` is only used for descending in zero-gravity maps (Space) — it's
// separate from `aimDown` (which still also works, for consistency with
// the Wind/Moon aim-tilt keys) but gives an intuitive dedicated key.
const P1_KEYS = {
  left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', shoot: 'KeyF',
  aimUp: 'KeyR', aimDown: 'KeyV', switchWeapon: 'KeyQ', shield: 'KeyE', special: 'KeyC'
};
const P2_KEYS = {
  left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', shoot: 'Slash',
  aimUp: 'PageUp', aimDown: 'PageDown', switchWeapon: 'ShiftRight', shield: 'Enter', special: 'ControlRight'
};

// ============================================================
// Game object: owns state machine + main loop
// ============================================================
const Game = {
  canvas: null, ctx: null,
  state: 'menu', // menu | controls | settings | mapselect | playing | paused | matchover
  mode: 'local', // local | ai | online
  mapId: 'green',
  targetScore: 5,
  keys: {},
  prevKeys: {},
  bullets: [],
  particles: new Particles(),
  shake: 0,
  matchFrames: 0,
  roundDelay: 0,
  p1: null, p2: null,
  aiEnabled: false,
  running: false,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    UI.init();
    this.bindMenuEvents();
    this.bindInput();
    UI.show('main-menu');
    requestAnimationFrame(this.loop.bind(this));
  },

  bindMenuEvents() {
    document.getElementById('btn-local').onclick = () => {
      SFX.play('menu'); this.mode = 'local'; this.aiEnabled = false; UI.show('map-select');
    };
    document.getElementById('btn-ai').onclick = () => {
      SFX.play('menu'); this.mode = 'local'; this.aiEnabled = true; UI.show('map-select');
    };
    document.getElementById('btn-online').onclick = () => {
      SFX.play('menu'); this.mode = 'online'; UI.show('online-screen');
      if (typeof Multiplayer !== 'undefined' && !this._mpInitDone) {
        Multiplayer.init(this);
        this._mpInitDone = true;
      }
    };
    document.getElementById('btn-controls').onclick = () => { SFX.play('menu'); UI.show('controls-screen'); };
    document.getElementById('btn-settings').onclick = () => { SFX.play('menu'); UI.show('settings-screen'); };
    document.querySelectorAll('.back-btn').forEach(b => b.onclick = () => { SFX.play('menu'); UI.show('main-menu'); });

    document.querySelectorAll('.map-card').forEach(card => {
      card.onclick = () => {
        SFX.play('menu');
        this.mapId = card.dataset.map;
        this.startMatch();
      };
    });

    document.getElementById('mute-toggle').onchange = (e) => { SFX.muted = e.target.checked; };

    document.getElementById('btn-resume').onclick = () => { this.state = 'playing'; UI.hideAll(); };
    document.getElementById('btn-restart').onclick = () => { this.startMatch(); };
    document.getElementById('btn-quit').onclick = () => { this.state = 'menu'; UI.show('main-menu'); };

    document.getElementById('btn-play-again').onclick = () => { this.startMatch(); };
    document.getElementById('btn-change-map').onclick = () => { UI.show('map-select'); };
    document.getElementById('btn-main-menu').onclick = () => { this.state = 'menu'; UI.show('main-menu'); };

    document.getElementById('btn-fullscreen').onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    };
  },

  bindInput() {
    const isTyping = () => {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    window.addEventListener('keydown', (e) => {
      if (isTyping()) return; // let text fields (chat, room code, server URL) work normally
      this.keys[e.code] = true;
      if (e.code === 'Escape' && this.state === 'playing') this.togglePause();
      if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      if (isTyping()) return;
      this.keys[e.code] = false;
    });
  },

  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; UI.show('pause-menu'); }
    else if (this.state === 'paused') { this.state = 'playing'; UI.hideAll(); }
  },

  readInput(keymap, prevmap) {
    const held = (code) => !!this.keys[code];
    return {
      left: held(keymap.left), right: held(keymap.right), up: held(keymap.up), down: held(keymap.down),
      shoot: held(keymap.shoot), aimUp: held(keymap.aimUp), aimDown: held(keymap.aimDown),
      switchWeapon: held(keymap.switchWeapon) && !prevmap[keymap.switchWeapon],
      shield: held(keymap.shield), special: held(keymap.special) && !prevmap[keymap.special]
    };
  },

  aiInput(p1, p2, map) {
    // Very small heuristic bot: approach/retreat to stay at medium range,
    // jump occasionally, shoot when roughly facing the opponent.
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
  },

  startMatch() {
    const map = MAPS[this.mapId];
    const groundY = map.platforms[0] ? map.platforms[0].y : 360;
    this.p1 = new Player('p1', 'Player 1 (Blue)', 380, groundY, '#2f6fed', 1);
    this.p2 = new Player('p2', this.aiEnabled ? 'Bot (Red)' : 'Player 2 (Red)', 900, groundY, '#e83a3a', -1);
    this.bullets = [];
    this.particles = new Particles();
    this.matchFrames = 0;
    this.roundDelay = 0;
    this.winnerColor = null;
    this.state = 'playing';
    UI.hideAll();
    UI.setOnlineControlGuide(this.mode === 'online');
  },

  spawnProjectile(p) { this.bullets.push(p); },

  screenShake(amount) { this.shake = Math.max(this.shake, amount); },

  resolveHit(bullet, target) {
    const knockDir = bullet.vx > 0 ? 1 : -1;
    const wasHit = target.takeDamage(bullet.damage, knockDir);
    if (wasHit) {
      this.particles.burst(bullet.x, bullet.y, target.shieldActive ? '#8fd7ff' : '#ff5b5b', 14, 5);
      this.screenShake(bullet.damage > 20 ? 10 : 5);
      SFX.play('hit');
    }
  },

  onPlayerDeath(loser) {
    const winner = loser === this.p1 ? this.p2 : this.p1;
    winner.score++;
    this.roundDelay = 90;
    if (winner.score >= this.targetScore) {
      this.state = 'matchover';
      this.winnerColor = winner.id;
      SFX.play('victory');
      const online = this.mode === 'online' && typeof Multiplayer !== 'undefined' && Multiplayer.roomCode;
      if (online) {
        const amIWinner = Multiplayer.myColor === winner.id;
        UI.setVictoryOnline(amIWinner, winner.color, this.p1.score, this.p2.score);
      } else {
        UI.setVictory(winner.name, winner.color, this.p1.score, this.p2.score);
      }
      setTimeout(() => UI.show('victory-screen'), 900);
    }
  },

  respawnRound() {
    const map = MAPS[this.mapId];
    const groundY = map.platforms[0] ? map.platforms[0].y : 360;
    this.p1.respawn(380, groundY);
    this.p2.respawn(900, groundY);
    this.bullets = [];
  },

  update() {
    if (this.state !== 'playing') return;
    this.matchFrames++;
    const map = MAPS[this.mapId];

    const in1 = this.readInput(P1_KEYS, this.prevKeys);
    const localIn2 = this.readInput(P2_KEYS, this.prevKeys);
    const online = this.mode === 'online' && typeof Multiplayer !== 'undefined' && Multiplayer.roomCode;

    if (online) {
      // Online: the local human always plays with the Blue/WASD control
      // scheme locally, regardless of which color (p1/p2) they were
      // randomly assigned for this match. The guest sends that raw input
      // to the host, which applies it to whichever side is theirs.
      Multiplayer.tick(in1);
    }

    if (online && !Multiplayer.isHost) {
      // Guest does not simulate physics; it waits for host state updates
      // (see Multiplayer.applyState) instead of running Physics locally.
      this.prevKeys = { ...this.keys };
      return;
    }

    const wasAlive1 = this.p1.alive, wasAlive2 = this.p2.alive;

    if (this.roundDelay > 0) {
      this.roundDelay--;
      if (this.roundDelay === 0 && this.state === 'playing') this.respawnRound();
    } else if (online) {
      // Host is authoritative: route local vs. remote input to whichever
      // color (p1/p2) each participant was randomly assigned.
      const myColor = Multiplayer.myColor || 'p1';
      const mine = myColor === 'p1' ? this.p1 : this.p2;
      const theirs = myColor === 'p1' ? this.p2 : this.p1;
      mine.update(in1, map, theirs, this.spawnProjectile.bind(this), SFX, this.particles);
      theirs.update(Multiplayer.remoteInput, map, mine, this.spawnProjectile.bind(this), SFX, this.particles);
    } else {
      const in2 = this.aiEnabled ? this.aiInput(this.p1, this.p2, map) : localIn2;
      this.p1.update(in1, map, this.p2, this.spawnProjectile.bind(this), SFX, this.particles);
      this.p2.update(in2, map, this.p1, this.spawnProjectile.bind(this), SFX, this.particles);
    }

    // Platform collision for both players (arena bounds/ceiling/floor are
    // now enforced inside Player.update itself, see player.js).
    for (const pl of [this.p1, this.p2]) {
      for (const plat of map.platforms) Physics.resolvePlatform(pl, plat);
    }

    // Bullets
    for (const b of this.bullets) {
      b.update();
      const targets = [this.p1, this.p2].filter(p => p.id !== b.ownerId && p.alive);
      for (const t of targets) {
        if (Physics.pointInPlayer(b.x, b.y, t)) {
          this.resolveHit(b, t);
          b.dead = true;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => !b.dead);

    // A death can come from a bullet OR a dash hit — check once per frame
    // regardless of cause so scoring never double-fires or gets missed.
    if (wasAlive1 && !this.p1.alive) this.onPlayerDeath(this.p1);
    else if (wasAlive2 && !this.p2.alive) this.onPlayerDeath(this.p2);

    this.particles.update();
    if (this.shake > 0) this.shake *= 0.85; else this.shake = 0;

    if (online && Multiplayer.isHost) {
      Multiplayer.broadcastState();
    }

    this.prevKeys = { ...this.keys };
  },

  render() {
    const ctx = this.ctx, canvas = this.canvas;
    const map = MAPS[this.mapId];
    ctx.save();
    if (this.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    if (this.state === 'menu' || this.state === 'controls' || this.state === 'settings') {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      return;
    }

    map.draw(ctx, canvas.width, canvas.height, this.matchFrames);

    if (this.p1 && this.p2) {
      for (const pl of [this.p1, this.p2]) { pl.draw(ctx); pl.drawOverhead(ctx); }
      for (const b of this.bullets) b.draw(ctx);
      this.particles.draw(ctx);

      UI.drawHUD(ctx, canvas.width, this.p1, this.p2, this.targetScore, this.matchFrames);
      UI.drawWeaponBar(ctx, canvas.width, canvas.height, this.p1, 'left');
      UI.drawWeaponBar(ctx, canvas.width, canvas.height, this.p2, 'right');
      UI.drawSpecialCooldown(ctx, canvas.width, canvas.height, this.p1, 'left', map);
      UI.drawSpecialCooldown(ctx, canvas.width, canvas.height, this.p2, 'right', map);
      if (map.zeroGravity) UI.drawZeroGHint(ctx, canvas.width);

      if (this.roundDelay > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Round Point!', canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }
    }

    ctx.restore();
    UI.updateFps();
  },

  loop(ts) {
    this.update();
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
};

window.addEventListener('DOMContentLoaded', () => Game.init());
