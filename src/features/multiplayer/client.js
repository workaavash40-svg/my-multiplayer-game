/* ============================================================
   features/multiplayer/client.js
   Online multiplayer using Socket.IO. Requires server/server.js
   running somewhere reachable and the Socket.IO client library
   loaded (via CDN script tag in public/index.html — `io` is used
   below as an AMBIENT GLOBAL from that non-module script, it is
   intentionally not imported).

   Architecture: "host authoritative" relay.
   - The player who creates the room is the HOST and runs the real
     physics simulation locally (the same Game used offline).
   - The GUEST sends only their input each frame to the host.
   - The HOST simulates both players and broadcasts the resulting
     state to the guest every frame.
   - Character color (Blue/Red, i.e. which of Game.p1/p2 you are) is
     assigned RANDOMLY per match by the server and is independent of
     who is host/guest. Regardless of assigned color, each human
     always plays with the same Blue/WASD key layout locally.

   Depends on: ui/screens.js, ui/chat.js, engine/audio.js
   ============================================================ */

import { setVictoryOnline, hideAllScreens, showScreen } from '../../ui/screens.js';
import { addChatMessage, clearChat } from '../../ui/chat.js';
import { SFX } from '../../engine/audio.js';

export const Multiplayer = {
  socket: null,
  game: null,
  roomCode: null,
  isHost: false,
  connected: false,
  myColor: null,       // 'p1' | 'p2' — assigned randomly at match start

  remoteInput: { left: false, right: false, up: false, shoot: false, aimUp: false, aimDown: false, switchWeapon: false, shield: false, special: false },

  init(game) {
    this.game = game;
    this.bindUI();
    this.setStatus('Enter a server address and click Connect.');
  },

  bindUI() {
    const connectBtn = document.getElementById('btn-connect-server');
    if (connectBtn) connectBtn.onclick = () => this.connect();

    document.getElementById('btn-create-room').onclick = () => {
      if (!this.connected) return this.setStatus('Connect to a server first.');
      this.socket.emit('create-room');
    };
    document.getElementById('btn-join-room').onclick = () => {
      if (!this.connected) return this.setStatus('Connect to a server first.');
      const code = document.getElementById('room-code-input').value.trim().toUpperCase();
      if (code) this.socket.emit('join-room', code);
      else this.setStatus('Enter a room code first.');
    };
    document.getElementById('btn-host-start').onclick = () => {
      if (this.isHost && this.roomCode) {
        const mapId = document.getElementById('online-map-select').value;
        this.socket.emit('start-match', { room: this.roomCode, mapId });
      }
    };

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendChat();
      });
    }
    const chatToggle = document.getElementById('chat-toggle');
    if (chatToggle) {
      chatToggle.onclick = () => {
        document.getElementById('chat-panel').classList.toggle('hidden');
      };
    }
  },

  connect() {
    const urlInput = document.getElementById('server-url-input');
    const url = (urlInput && urlInput.value.trim()) || '';

    if (typeof io === 'undefined') {
      this.setStatus('Socket.IO failed to load (no internet access?). Online play needs the Socket.IO client library.');
      return;
    }

    if (this.socket) { this.socket.disconnect(); this.socket = null; }

    this.setStatus('Connecting...');
    this.socket = url ? io(url, { transports: ['websocket', 'polling'] })
                       : io({ transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      this.connected = true;
      this.setStatus('Connected! Create a room or join one with a code.');
    });

    this.socket.on('connect_error', (err) => {
      this.connected = false;
      this.setStatus(`Could not reach server (${err.message || 'connection error'}). Check the server URL and that the server is running.`);
    });

    this.socket.on('room-created', (code) => {
      this.roomCode = code;
      this.isHost = true;
      this.setStatus(`Room created: ${code} — share this code. Waiting for opponent...`);
    });

    this.socket.on('room-joined', (code) => {
      this.roomCode = code;
      this.isHost = false;
      this.setStatus(`Joined room ${code} — waiting for host to start the match...`);
    });

    this.socket.on('peer-joined', () => {
      this.setStatus('Opponent joined! Pick a map and click "Start Match".');
    });

    this.socket.on('room-error', (msg) => this.setStatus(`Error: ${msg}`));

    this.socket.on('match-start', (payload) => {
      // payload: { mapId, yourColor }
      this.myColor = payload.yourColor;
      this.game.mode = 'online';
      this.game.mapId = payload.mapId;
      this.game.startMatch();
      clearChat();
      this.setStatus('');
      hideAllScreens();
    });

    // Guest receives authoritative state from host every tick.
    this.socket.on('state-update', (state) => {
      if (this.isHost || !this.game.p1 || !this.game.p2) return;
      this.applyState(state);
    });

    // Host receives guest's input every tick.
    this.socket.on('peer-input', (input) => {
      if (!this.isHost) return;
      this.remoteInput = input;
    });

    this.socket.on('peer-disconnected', () => {
      this.setStatus('Opponent disconnected.');
    });

    this.socket.on('chat-message', ({ text, mine }) => {
      addChatMessage(text, mine ? 'me' : 'them');
    });
  },

  setStatus(msg) {
    const el = document.getElementById('online-status');
    if (el) el.textContent = msg;
  },

  sendChat() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim() || !this.socket || !this.roomCode) return;
    const text = input.value.trim().slice(0, 200);
    this.socket.emit('chat-message', { room: this.roomCode, text });
    addChatMessage(text, 'me');
    input.value = '';
  },

  // Called once per frame from the game loop when Game.mode === 'online'.
  // The guest sends its raw local input to the host every frame.
  tick(localInput) {
    if (!this.socket || !this.connected || !this.roomCode) return;
    if (!this.isHost) {
      this.socket.emit('input', { room: this.roomCode, input: localInput });
    }
  },

  // Called once per frame by the HOST after simulating, to push the
  // authoritative state to the guest.
  broadcastState() {
    if (!this.socket || !this.connected || !this.roomCode || !this.isHost) return;
    this.socket.emit('state-update-broadcast', { room: this.roomCode, state: this.serializeState() });
  },

  serializeState() {
    const g = this.game;
    const pack = (p) => ({
      x: p.x, y: p.y, vx: p.vx, vy: p.vy, hp: p.hp, alive: p.alive,
      score: p.score, weapon: p.weapon, facing: p.facing, aim: p.aim,
      shieldActive: p.shieldActive, flying: p.flying, dashing: p.dashing,
      hitFlash: p.hitFlash, deathTimer: p.deathTimer, walking: p.walking, grounded: p.grounded
    });
    return {
      p1: pack(g.p1), p2: pack(g.p2),
      bullets: g.bullets.map(b => ({ x: b.x, y: b.y, kind: b.kind, color: b.color })),
      matchFrames: g.matchFrames,
      matchOver: g.state === 'matchover',
      winnerColor: g.winnerColor || null
    };
  },

  applyState(state) {
    Object.assign(this.game.p1, state.p1);
    Object.assign(this.game.p2, state.p2);
    this.game.matchFrames = state.matchFrames;
    // Bullets are cosmetic-only on the guest (host owns collision truth).
    this.game.bullets = state.bullets.map(b => ({
      ...b,
      update() {},
      draw(ctx) {
        ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }));

    if (state.matchOver && this.game.state !== 'matchover') {
      this.game.state = 'matchover';
      const winner = state.winnerColor === 'p1' ? this.game.p1 : this.game.p2;
      const amIWinner = this.myColor === state.winnerColor;
      SFX.play('victory');
      setVictoryOnline(amIWinner, winner.color, this.game.p1.score, this.game.p2.score);
      setTimeout(() => showScreen('victory-screen'), 900);
    }
  }
};
