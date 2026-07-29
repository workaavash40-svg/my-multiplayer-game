/* ============================================================
   engine/input.js
   Keyboard state tracking + translating raw key state into a
   per-player logical input object. Key bindings live in
   config/constants.js (P1_KEYS/P2_KEYS) — import from there.
   ============================================================ */

// Reads the current held/pressed state for one player's key map.
// `keys` is a { [KeyboardEvent.code]: boolean } live state object;
// `prevKeys` is the previous frame's snapshot, used to debounce
// one-shot actions (switchWeapon, special) to "just pressed".
export function readInput(keys, prevKeys, keymap) {
  const held = (code) => !!keys[code];
  return {
    left: held(keymap.left), right: held(keymap.right), up: held(keymap.up), down: held(keymap.down),
    shoot: held(keymap.shoot), aimUp: held(keymap.aimUp), aimDown: held(keymap.aimDown),
    switchWeapon: held(keymap.switchWeapon) && !prevKeys[keymap.switchWeapon],
    shield: held(keymap.shield), special: held(keymap.special) && !prevKeys[keymap.special]
  };
}

// Keys where the browser's default action (page scroll, etc.) should
// be suppressed during gameplay.
export const PREVENT_DEFAULT_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];

function isTypingIntoField() {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

// Wires window keydown/keyup listeners into a live `keys` state object.
// `onEscape` is called when Escape is pressed (used for pause toggling).
export function bindKeyboard(keys, onEscape) {
  window.addEventListener('keydown', (e) => {
    if (isTypingIntoField()) return; // let text fields (chat, room code, server URL) work normally
    keys[e.code] = true;
    if (e.code === 'Escape' && onEscape) onEscape();
    if (PREVENT_DEFAULT_KEYS.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (isTypingIntoField()) return;
    keys[e.code] = false;
  });
}
