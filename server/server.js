/* ============================================================
   server/server.js  (SERVER SIDE)
   Node.js + Socket.IO relay server for online multiplayer.

   Setup (from the project root):
     npm install
     npm start          # builds dist/ then starts this server
   Then either:
     a) open http://localhost:3000 directly (serves the built,
        single-file dist/index.html), or
     b) deploy this whole project somewhere public (Render/Railway/
        Fly.io/a VPS) and, on a separately-hosted copy of the game,
        enter that server's URL on the "Play Online Multiplayer"
        screen and click Connect before creating/joining a room.

   Responsibilities:
     - Serve the built game (dist/) — optional, only used if you
       open this server's own URL directly rather than hosting the
       static build elsewhere.
     - Let a client create a room (gets an 8-character room code).
     - Let a second client join that room with the code.
     - Randomly assign each participant a character color (Blue/Red,
       i.e. p1/p2) once both are present and the host starts the
       match — independent of who is host/guest.
     - Relay the guest's input to the host, and the host's simulated
       state back to the guest, every frame. The host is authoritative
       for physics/collision to prevent desync and simple cheating.
     - Relay chat messages between the two players in a room.

   NOTE: this is a verbatim port of the original server.js — only
   the static-file path changed (now serves ../dist, the build
   output, instead of its own directory).
   ============================================================ */

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
// CORS is wide open here because this server may be hosted separately
// from the static game build (e.g. game on a static host, server on
// Render/Railway). Tighten `origin` to your real domain in production.
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Serve the built single-file game from dist/ (see build/build.js).
app.use(express.static(path.join(__dirname, '..', 'dist')));

// In-memory room registry: { code: { hostId, guestId } }
const rooms = {};

function generateRoomCode() {
  // 8-character alphanumeric code, uppercase, no ambiguous characters
  // (no 0/O, 1/I/L) so it's easy to read aloud/type on another device.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms[code]);
  return code;
}

io.on('connection', (socket) => {
  socket.on('create-room', () => {
    const code = generateRoomCode();
    rooms[code] = { hostId: socket.id, guestId: null };
    socket.join(code);
    socket.data.room = code;
    socket.data.isHost = true;
    socket.emit('room-created', code);
  });

  socket.on('join-room', (code) => {
    const room = rooms[code];
    if (!room) return socket.emit('room-error', 'Room not found.');
    if (room.guestId) return socket.emit('room-error', 'Room is full.');
    room.guestId = socket.id;
    socket.join(code);
    socket.data.room = code;
    socket.data.isHost = false;
    socket.emit('room-joined', code);
    io.to(room.hostId).emit('peer-joined');
  });

  // Host chooses the map and kicks off the match for both clients.
  // Each participant is randomly assigned 'p1' (Blue) or 'p2' (Red),
  // independent of host/guest role, per player-experience requirements.
  socket.on('start-match', ({ room, mapId }) => {
    const r = rooms[room];
    if (!r || r.hostId !== socket.id || !r.guestId) return;
    const hostColor = Math.random() < 0.5 ? 'p1' : 'p2';
    const guestColor = hostColor === 'p1' ? 'p2' : 'p1';
    io.to(r.hostId).emit('match-start', { mapId, yourColor: hostColor });
    io.to(r.guestId).emit('match-start', { mapId, yourColor: guestColor });
  });

  // Guest -> Host: forward raw input every frame.
  socket.on('input', ({ room, input }) => {
    const r = rooms[room];
    if (!r) return;
    io.to(r.hostId).emit('peer-input', input);
  });

  // Host -> Guest: forward authoritative simulation state every frame.
  socket.on('state-update-broadcast', ({ room, state }) => {
    const r = rooms[room];
    if (!r || !r.guestId) return;
    io.to(r.guestId).emit('state-update', state);
  });

  // Relay chat between the two players in a room.
  socket.on('chat-message', ({ room, text }) => {
    const r = rooms[room];
    if (!r || !text) return;
    const clean = String(text).slice(0, 200);
    const otherId = socket.id === r.hostId ? r.guestId : r.hostId;
    if (otherId) io.to(otherId).emit('chat-message', { text: clean, mine: false });
  });

  socket.on('disconnect', () => {
    const code = socket.data.room;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    const otherId = socket.id === room.hostId ? room.guestId : room.hostId;
    if (otherId) io.to(otherId).emit('peer-disconnected');
    delete rooms[code];
  });
});

server.listen(PORT, () => {
  console.log(`Stickman Duel server running at http://localhost:${PORT}`);
});
