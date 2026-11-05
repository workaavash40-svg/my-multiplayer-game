/**
 * multiplayer.js (CLIENT)
 * Talks to the Node + Socket.io server in server.js. Networking model:
 * each client runs the full local physics simulation (same Player/physics
 * code as local play) for BOTH players. Only raw per-frame input is sent
 * over the wire - the local player's input drives their own body directly,
 * and the most recently received remote input drives the opponent's body.
 * This keeps the netcode simple while reusing 100% of the local game logic.
 *
 * Requires the socket.io client script (loaded from CDN in index.html) and
 * a running instance of server.js reachable at the URL the user enters
 * (defaults to the same host the page is served from).
 */

let remoteInputBuffer = {
  left: false, right: false, jumpPressed: false, jumpHeld: false,
  firePressed: false, fireHeld: false, aimUp: false, aimDown: false,
  switchPressed: false, shieldPressed: false, specialPressed: false
};

function initOnlineLobby() {
  const createBtn = document.getElementById('online-create');
  const joinBtn = document.getElementById('online-join');
  const joinInput = document.getElementById('online-room-code');
  const serverInput = document.getElementById('online-server-url');
  const statusEl = document.getElementById('online-status');
  const mapButtons = document.querySelectorAll('#online-map-pick .map-card');

  let chosenMapId = 'whitearena';
  mapButtons.forEach(card => {
    card.addEventListener('click', () => {
      chosenMapId = card.dataset.map;
      mapButtons.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  createBtn.addEventListener('click', () => {
    statusEl.textContent = 'Connecting...';
    connectSocket(serverInput.value.trim(), () => {
      socket.emit('createRoom', {}, (res) => {
        if (!res || res.error) {
          statusEl.textContent = res?.error || 'Could not create room.';
          return;
        }
        window.__roomCode = res.roomCode;
        window.__mySlot = 0;
        statusEl.textContent = `Room created — code: ${res.roomCode}. Share it and wait for your opponent...`;
      });
    });
  });

  joinBtn.addEventListener('click', () => {
    const code = joinInput.value.trim().toUpperCase();
    if (!code) { statusEl.textContent = 'Enter a room code first.'; return; }
    statusEl.textContent = 'Connecting...';
    connectSocket(serverInput.value.trim(), () => {
      socket.emit('joinRoom', { roomCode: code }, (res) => {
        if (!res || res.error) {
          statusEl.textContent = res?.error || 'Could not join room.';
          return;
        }
        window.__roomCode = code;
        window.__mySlot = 1;
        statusEl.textContent = `Joined room ${code}. Starting shortly...`;
      });
    });
  });

  function connectSocket(url, onConnected) {
    if (window.__socket && window.__socket.connected) { onConnected(); return; }
    if (typeof io === 'undefined') {
      statusEl.textContent = 'Socket.io client not loaded — check your network/CDN access.';
      return;
    }
    window.__socket = io(url || undefined, { transports: ['websocket', 'polling'] });
    const socket = window.__socket;

    socket.on('connect', onConnected);
    socket.on('connect_error', () => {
      statusEl.textContent = 'Could not reach server. Check the server URL and that server.js is running.';
    });
    socket.on('startMatch', (payload) => {
      statusEl.textContent = 'Match starting!';
      startOnlineMatch(payload.mapId || chosenMapId);
    });
    socket.on('opponentInput', (input) => {
      remoteInputBuffer = input;
    });
    socket.on('opponentLeft', () => {
      leaveMatch();
      statusEl.textContent = 'Opponent disconnected.';
      UI.showScreen('online-lobby');
    });
  }
}

function startOnlineMatch(mapId) {
  const socket = window.__socket;
  State.online = { socket, mySlot: window.__mySlot ?? 0 };
  startMatch(mapId, 'online', false);
}
