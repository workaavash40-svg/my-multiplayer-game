/**
 * server.js — serves the game AND runs online multiplayer on ONE port.
 *
 *   node server.js        ->  open http://localhost:3001
 *
 * Because the page and the Socket.io server share an address, players never
 * type a server URL: they just create a room or enter a room code.
 * On Render: Web Service, build `npm install`, start `node server.js`.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

// Only these files are ever served (so server.js / package.json stay private)
const PUBLIC_FILES = {
  'index.html': 'text/html; charset=utf-8',
  'style.css': 'text/css; charset=utf-8',
  'physics.js': 'text/javascript; charset=utf-8',
  'weapons.js': 'text/javascript; charset=utf-8',
  'player.js': 'text/javascript; charset=utf-8',
  'ui.js': 'text/javascript; charset=utf-8',
  'touch.js': 'text/javascript; charset=utf-8',
  'multiplayer.js': 'text/javascript; charset=utf-8',
  'game.js': 'text/javascript; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath.startsWith('/socket.io')) return; // handled by Socket.io
  const name = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  const type = PUBLIC_FILES[name];
  if (!type) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  fs.readFile(path.join(__dirname, name), (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Server error');
    }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const io = new Server(server, { cors: { origin: '*' } });

// roomCode -> { players: [socketId, ...], mapId }
const rooms = new Map();
const VALID_MAPS = new Set(['whitearena', 'moon', 'wind']);

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function leaveRoom(socket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;
  socket.data.roomCode = null;
  socket.leave(roomCode);
  const room = rooms.get(roomCode);
  if (!room) return;
  socket.to(roomCode).emit('opponentLeft');
  rooms.delete(roomCode);
}

io.on('connection', (socket) => {
  socket.on('createRoom', (opts, cb) => {
    if (typeof cb !== 'function') return;
    leaveRoom(socket); // one room per player
    const mapId = VALID_MAPS.has(opts && opts.mapId) ? opts.mapId : 'whitearena';
    const roomCode = makeRoomCode();
    rooms.set(roomCode, { players: [socket.id], mapId });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    cb({ roomCode, mapId });
  });

  socket.on('joinRoom', (data, cb) => {
    if (typeof cb !== 'function') return;
    const roomCode = String((data && data.roomCode) || '').trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return cb({ error: 'Room not found. Check the code and try again.' });
    if (room.players.includes(socket.id)) return cb({ error: 'You are already in this room.' });
    if (room.players.length >= 2) return cb({ error: 'That room is already full.' });

    leaveRoom(socket);
    room.players.push(socket.id);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    cb({ roomCode, mapId: room.mapId });
    io.to(roomCode).emit('startMatch', { mapId: room.mapId });
  });

  socket.on('cancelRoom', () => leaveRoom(socket));

  socket.on('input', (input) => {
    const roomCode = socket.data.roomCode;
    if (roomCode) socket.to(roomCode).emit('opponentInput', input);
  });

  socket.on('disconnect', () => leaveRoom(socket));
});

server.listen(PORT, () => {
  console.log(`Stickman Arena running on http://localhost:${PORT}`);
});
