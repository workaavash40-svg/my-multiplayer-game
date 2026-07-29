/* ============================================================
   ui/chat.js
   In-match text chat for online multiplayer — pure DOM rendering.
   Message sending/receiving lives in features/multiplayer/client.js;
   this module only appends/clears the visible log.
   ============================================================ */

export function addChatMessage(text, who) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const line = document.createElement('div');
  line.className = `chat-line ${who}`;
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

export function clearChat() {
  const log = document.getElementById('chat-log');
  if (log) log.innerHTML = '';
}
