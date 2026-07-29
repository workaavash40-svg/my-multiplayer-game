/* ============================================================
   config/constants.js
   Central place for tunable/config values that were previously
   magic numbers or bare globals scattered across game.js.
   Import from here instead of hard-coding these values elsewhere.
   ============================================================ */

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const TARGET_SCORE = 5;      // first player to this many round-wins takes the match
export const ROUND_RESPAWN_DELAY_FRAMES = 90;

// ---------- Key bindings (guaranteed no overlap between the two local players) ----------
// `down` is only used for descending in zero-gravity maps (Space) — it's
// separate from `aimDown` (which still also works, for consistency with
// the Wind/Moon aim-tilt keys) but gives an intuitive dedicated key.
export const P1_KEYS = {
  left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', shoot: 'KeyF',
  aimUp: 'KeyR', aimDown: 'KeyV', switchWeapon: 'KeyQ', shield: 'KeyE', special: 'KeyC'
};

export const P2_KEYS = {
  left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', shoot: 'Slash',
  aimUp: 'PageUp', aimDown: 'PageDown', switchWeapon: 'ShiftRight', shield: 'Enter', special: 'ControlRight'
};
