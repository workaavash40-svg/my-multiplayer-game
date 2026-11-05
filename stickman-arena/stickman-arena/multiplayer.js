/**
 * multiplayer.js (CLIENT)
 * Room-code online play. No server URL: the page is served by server.js, so
 * Socket.io connects to the same address automatically.
 *
 * Flow:  Create Room -> big room code appears -> friend types it -> match starts.
 * Netcode: each client simulates both players with the shared local code; only
 * per-frame input is relayed (see server.js). The host's map choice is used.
 */

let remoteInputBuffer = {
  left: false, right: false, jumpPressed: false, jumpHeld: false,
  firePressed: false, fireHeld: false, aimUp: false, aimDown: false,
  switchPressed: false, shieldPressed: false, specialPressed: false
};

function initOnlineLobby() {
  const $ = (id) => document.getElementById(id);
  const statusEl = $('online-status');
  const joinInput = $('online-room-code');
  const createBtn = $('online-create');
  const joinBtn = $('online-join');
  const choosePane = $('lobby-choose');
  const waitPane = $('lobby-waiting');
  const codeEl = $('room-code-display');
  const copyBtn = $('room-copy');
  const cancelBtn = $('room-cancel');
  const mapCards = document.querySelectorAll('#online-map-pick .map-card');

  let chosenMapId = 'whitearena';
  mapCards.forEach(card => card.addEventListener('click', () => {
    chosenMapId = card.dataset.map;
    mapCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  }));

  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('error', !!isError);
  }
  function showChoose() { choosePane.hidden = false; waitPane.hidden = true; }
  function showWaiting(code) {
    codeEl.textContent = code;
    choosePane.hidden = true;
    waitPane.hidden = false;
  }
  function dropSocket() {
    if (window.__socket) { window.__socket.disconnect(); window.__socket = null; }
  }

  // Dev convenience: if the page came from Live Server / another static server
  // (e.g. localhost:5500), look for the Node server on port 3001 of the same host.
  // On a real deployment (no custom port) this never triggers.
  let serverUrl;
  function ensureSocketLib(done) {
    if (typeof io !== 'undefined') return done(true);
    const devPort = location.port && location.port !== '3001';
    if (!devPort || location.protocol === 'file:') return done(false);
    const base = `${location.protocol}//${location.hostname}:3001`;
    const s = document.createElement('script');
    s.src = base + '/socket.io/socket.io.js';
    s.onload = () => { serverUrl = base; done(typeof io !== 'undefined'); };
    s.onerror = () => done(false);
    document.head.appendChild(s);
  }

  function connect(onReady) {
    if (window.__socket && window.__socket.connected) { onReady(window.__socket); return; }
    setStatus('Connecting…');
    ensureSocketLib((ok) => {
      if (!ok) {
        setStatus('Game server not found. In a terminal run "node server.js" (after "npm install"), then open http://localhost:3001 — or use your deployed Render link.', true);
        return;
      }
      dropSocket();
      const socket = io(serverUrl, { transports: ['websocket', 'polling'] });
      window.__socket = socket;

      socket.on('connect', () => onReady(socket));
      socket.on('connect_error', () => {
        setStatus('Could not reach the server. Check your connection and try again.', true);
        showChoose();
      });
      socket.on('startMatch', (payload) => {
        setStatus('');
        showChoose();
        startOnlineMatch(payload.mapId || chosenMapId);
      });
      socket.on('opponentInput', (input) => { remoteInputBuffer = input; });
      socket.on('opponentLeft', () => {
        if (State.running) leaveMatch();
        showChoose();
        setStatus('Your opponent left the room.', true);
        UI.showScreen('online-lobby');
      });
    });
  }

  createBtn.addEventListener('click', () => {
    connect((socket) => {
      socket.emit('createRoom', { mapId: chosenMapId }, (res) => {
        if (!res || res.error) { setStatus((res && res.error) || 'Could not create a room.', true); return; }
        window.__mySlot = 0;
        setStatus('');
        showWaiting(res.roomCode);
      });
    });
  });

  function join() {
    const code = joinInput.value.trim().toUpperCase();
    if (code.length < 4) { setStatus('Enter the 4-character room code.', true); return; }
    connect((socket) => {
      socket.emit('joinRoom', { roomCode: code }, (res) => {
        if (!res || res.error) { setStatus((res && res.error) || 'Could not join that room.', true); return; }
        window.__mySlot = 1;
        setStatus('Joined! Starting…');
      });
    });
  }
  joinBtn.addEventListener('click', join);
  joinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
  joinInput.addEventListener('input', () => {
    joinInput.value = joinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  copyBtn.addEventListener('click', async () => {
    const code = codeEl.textContent;
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = 'Copied ✓';
    } catch (e) {
      copyBtn.textContent = 'Select & copy';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy code'; }, 1500);
  });

  cancelBtn.addEventListener('click', () => {
    if (window.__socket) window.__socket.emit('cancelRoom');
    dropSocket();
    showChoose();
    setStatus('');
  });

  // leaving the lobby screen via Back also drops any waiting room
  document.querySelectorAll('#online-lobby .btn-back-menu').forEach(b => b.addEventListener('click', () => {
    if (!State.running) { dropSocket(); showChoose(); setStatus(''); }
  }));
}

function startOnlineMatch(mapId) {
  State.online = { socket: window.__socket, mySlot: window.__mySlot ?? 0 };
  startMatch(mapId, 'online', false);
}
