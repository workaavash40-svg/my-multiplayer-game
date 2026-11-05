/**
 * server.js
 * Minimal authoritative-lite relay server for online multiplayer.
 * Responsibilities:
 *   - let a client create a room (gets a 4-letter code)
 *   - let a second client join that room with the code
 *   - once 2 players are present, tell both clients to start the match
 *   - relay each player's raw input to the other player in the room
 *   - clean up rooms when players disconnect
 *
 * Run with:  node server.js
 * (npm install first — see package.json)
 *
 * The client (multiplayer.js) points at this server's URL. By default the
 * game expects it on the same origin; for local testing you can run this
 * on http://localhost:3001 and enter that URL in the online lobby's
 * "Server URL" field.
 */

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Stickman Arena multiplayer server is running.\n');
});

const io = new Server(server, {
  cors: { origin: '*' }
});

// roomCode -> { players: [socketId, socketId], mapId }
const rooms = new Map();

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

io.on('connection', (socket) => {
  socket.on('createRoom', (opts, cb) => {
    const roomCode = makeRoomCode();
    rooms.set(roomCode, { players: [socket.id], mapId: opts?.mapId || 'whitearena' });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    cb({ roomCode });
  });

  socket.on('joinRoom', ({ roomCode }, cb) => {
    const room = rooms.get(roomCode);
    if (!room) return cb({ error: 'Room not found.' });
    if (room.players.length >= 2) return cb({ error: 'Room is full.' });

    room.players.push(socket.id);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    cb({ roomCode });

    io.to(roomCode).emit('startMatch', { mapId: room.mapId });
  });

  socket.on('input', (input) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    socket.to(roomCode).emit('opponentInput', input);
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    socket.to(roomCode).emit('opponentLeft');
    rooms.delete(roomCode);
  });
});

server.listen(PORT, () => {
  console.log(`Stickman Arena server listening on port ${PORT}`);
});
