/* ============================================================
   engine/gameLoop.js
   The Game object: state machine (menu/playing/paused/matchover),
   the update/render loop, scoring, and local/AI/online input
   routing. This is the central orchestrator — it imports from
   nearly every other module, so changes here have the widest
   blast radius. See docs/Architecture.md for the full data-flow
   diagram before editing.

   Depends on: physics, particles, audio, input, config/constants,
   entities/Player, rendering/{playerRenderer,hud}, features/{maps,ai,multiplayer}
   ============================================================ */

import { Physics } from './physics.js';
import { Particles } from './particles.js';
import { SFX } from './audio.js';
import { readInput, bindKeyboard } from './input.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TARGET_SCORE, COUNTDOWN_SECONDS, P1_KEYS, P2_KEYS } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { drawPlayer, drawPlayerOverhead, drawYourCharacterIndicator } from '../rendering/playerRenderer.js';
import { drawHUD, drawWeaponBar, drawSpecialCooldown, drawZeroGHint } from '../rendering/hud.js';
import { MAPS } from '../features/maps/index.js';
import { aiInput } from '../features/ai/aiBot.js';
import { Multiplayer } from '../features/multiplayer/client.js';
import { updateFps, showScreen, hideAllScreens, setOnlineControlGuide, setVictory, setVictoryOnline } from '../ui/screens.js';

export const Game = {
  canvas: null, ctx: null,
  state: 'menu', // menu | countdown | playing | paused | matchover
  mode: 'local', // local | online
  mapId: 'green',
  targetScore: TARGET_SCORE,
  keys: {},
  prevKeys: {},
  bullets: [],
  particles: new Particles(),
  shake: 0,
  matchFrames: 0,
  roundDelay: 0,
  p1: null, p2: null,
  aiEnabled: false,
  winnerColor: null,
  _mpInitDone: false,
  countdownFrames: 0,
  countdownLastSecondPlayed: -1,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    bindKeyboard(this.keys, () => { if (this.state === 'playing') this.togglePause(); });
    requestAnimationFrame(this.loop.bind(this));
  },

  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; showScreen('pause-menu'); }
    else if (this.state === 'paused') { this.state = 'playing'; hideAllScreens(); }
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
    this.state = 'countdown';
    this.countdownFrames = COUNTDOWN_SECONDS * 60;
    this.countdownLastSecondPlayed = -1;
    hideAllScreens();
    setOnlineControlGuide(this.mode === 'online');
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
      const online = this.mode === 'online' && Multiplayer.roomCode;
      if (online) {
        const amIWinner = Multiplayer.myColor === winner.id;
        setVictoryOnline(amIWinner, winner.color, this.p1.score, this.p2.score);
      } else {
        setVictory(winner.name, winner.color, this.p1.score, this.p2.score);
      }
      setTimeout(() => showScreen('victory-screen'), 900);
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
    if (this.state === 'countdown') {
      this.countdownFrames--;
      const secondsLeft = Math.ceil(this.countdownFrames / 60);
      if (secondsLeft !== this.countdownLastSecondPlayed) {
        this.countdownLastSecondPlayed = secondsLeft;
        SFX.play(secondsLeft > 0 ? 'countdown' : 'countdownGo');
      }
      if (this.countdownFrames <= 0) this.state = 'playing';
      this.prevKeys = { ...this.keys };
      return; // no physics/input/damage while the countdown is running
    }
    if (this.state !== 'playing') return;
    this.matchFrames++;
    const map = MAPS[this.mapId];

    const in1 = readInput(this.keys, this.prevKeys, P1_KEYS);
    const localIn2 = readInput(this.keys, this.prevKeys, P2_KEYS);
    const online = this.mode === 'online' && Multiplayer.roomCode;

    if (online) {
      // Online: the local human always plays with the Blue/WASD control
      // scheme locally, regardless of which color (p1/p2) they were
      // randomly assigned for this match. The guest sends that input
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
      const in2 = this.aiEnabled ? aiInput(this.p1, this.p2, map) : localIn2;
      this.p1.update(in1, map, this.p2, this.spawnProjectile.bind(this), SFX, this.particles);
      this.p2.update(in2, map, this.p1, this.spawnProjectile.bind(this), SFX, this.particles);
    }

    // Platform collision for both players (arena bounds/ceiling/floor are
    // enforced inside Player.update itself, see entities/Player.js).
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

    if (this.state === 'menu') {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      return;
    }

    map.draw(ctx, canvas.width, canvas.height, this.matchFrames);

    if (this.p1 && this.p2) {
      for (const pl of [this.p1, this.p2]) { drawPlayer(ctx, pl); drawPlayerOverhead(ctx, pl); }
      for (const b of this.bullets) b.draw(ctx);
      this.particles.draw(ctx);

      // Points at whichever character the local human is controlling —
      // only meaningful where that's ambiguous (AI mode: always p1;
      // online mode: color is randomly assigned per match).
      const myPlayer = this.mode === 'online'
        ? (Multiplayer.myColor === 'p1' ? this.p1 : (Multiplayer.myColor === 'p2' ? this.p2 : null))
        : (this.aiEnabled ? this.p1 : null);
      if (myPlayer) drawYourCharacterIndicator(ctx, myPlayer, this.matchFrames);

      drawHUD(ctx, canvas.width, this.p1, this.p2, this.targetScore, this.matchFrames);
      drawWeaponBar(ctx, canvas.width, canvas.height, this.p1, 'left');
      drawWeaponBar(ctx, canvas.width, canvas.height, this.p2, 'right');
      drawSpecialCooldown(ctx, canvas.width, canvas.height, this.p1, 'left', map);
      drawSpecialCooldown(ctx, canvas.width, canvas.height, this.p2, 'right', map);
      if (map.zeroGravity) drawZeroGHint(ctx, canvas.width);

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

      if (this.state === 'countdown') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const secondsLeft = Math.ceil(this.countdownFrames / 60);
        ctx.textAlign = 'center';
        if (secondsLeft > 0) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 130px "Segoe UI", sans-serif';
          ctx.fillText(String(secondsLeft), canvas.width / 2, canvas.height / 2 + 45);
        } else {
          ctx.fillStyle = '#ffd166';
          ctx.font = 'bold 90px "Segoe UI", sans-serif';
          ctx.fillText('FIGHT!', canvas.width / 2, canvas.height / 2 + 30);
        }
        ctx.restore();
      }
    }

    ctx.restore();
    updateFps();
  },

  loop(ts) {
    this.update();
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
};
