/**
 * touch.js
 * On-screen controls for phones/tablets. Instead of a parallel input path,
 * every touch control presses a *virtual key* from the Player-1 scheme in the
 * shared `keysDown` set (see game.js), so edge detection, online play and the
 * bot all keep working unchanged.
 *
 * Controls:
 *  - Floating joystick (left half): left/right = move, push up = jump
 *  - FIRE (hold = auto-fire / bow charge). Drag up/down while holding to aim.
 *  - JUMP, aim ▲/▼, SWAP weapon, SHIELD, FLY (wind map) with cooldown fills
 */

const TouchControls = (() => {
  const K = CONTROL_SCHEMES.p1;
  const sources = {};   // code -> Set(sourceId)
  const pressedAt = {};
  const pending = {};
  const MIN_HOLD_MS = 70; // so a very quick tap still lasts long enough to be seen by an update step

  function press(code, src) {
    if (pending[code]) { clearTimeout(pending[code]); delete pending[code]; }
    if (!sources[code]) sources[code] = new Set();
    if (!sources[code].size) pressedAt[code] = performance.now();
    sources[code].add(src);
    keysDown.add(code);
  }

  function release(code, src) {
    const s = sources[code];
    if (!s) return;
    s.delete(src);
    if (s.size) return;
    const wait = Math.max(0, MIN_HOLD_MS - (performance.now() - (pressedAt[code] || 0)));
    pending[code] = setTimeout(() => {
      delete pending[code];
      if (!sources[code] || !sources[code].size) keysDown.delete(code);
    }, wait);
  }

  function releaseAll() {
    Object.keys(pending).forEach(c => { clearTimeout(pending[c]); delete pending[c]; });
    Object.keys(sources).forEach(c => { sources[c].clear(); keysDown.delete(c); });
    document.querySelectorAll('.tbtn.down').forEach(b => b.classList.remove('down'));
    if (joy) joy.reset();
  }

  // ---------------- Floating joystick ----------------
  let joy = null;

  function initJoystick() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const thumb = document.getElementById('joystick-thumb');
    if (!zone) return;

    let pid = null, cx = 0, cy = 0, zr = null;
    const state = { left: false, right: false, up: false };
    const radius = () => base.offsetWidth / 2;

    function placeBase(x, y) {
      base.style.left = x + 'px';
      base.style.top = y + 'px';
    }
    function placeDefault() {
      const r = zone.getBoundingClientRect();
      const R = radius();
      placeBase(Math.max(R + 12, r.width * 0.22), r.height - R - 14);
    }
    function setKey(name, code, on) {
      if (state[name] === on) return;
      state[name] = on;
      on ? press(code, 'joy') : release(code, 'joy');
    }
    function move(e) {
      const R = radius();
      const dx = e.clientX - zr.left - cx;
      const dy = e.clientY - zr.top - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const k = dist > R ? R / dist : 1;
      const tx = dx * k, ty = dy * k;
      thumb.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
      setKey('left', K.left, tx < -R * 0.3);
      setKey('right', K.right, tx > R * 0.3);
      setKey('up', K.jump, ty < -R * 0.6);
    }
    function end() {
      pid = null;
      setKey('left', K.left, false);
      setKey('right', K.right, false);
      setKey('up', K.jump, false);
      base.classList.remove('active');
      thumb.style.transform = 'translate(-50%, -50%)';
      placeDefault();
    }

    zone.addEventListener('pointerdown', (e) => {
      if (pid !== null) return;
      e.preventDefault();
      pid = e.pointerId;
      zone.setPointerCapture(pid);
      zr = zone.getBoundingClientRect();
      const R = radius();
      cx = Math.min(Math.max(e.clientX - zr.left, R), zr.width - R);
      cy = Math.min(Math.max(e.clientY - zr.top, R), zr.height - R);
      placeBase(cx, cy);
      base.classList.add('active');
      move(e);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === pid) { e.preventDefault(); move(e); } });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev =>
      zone.addEventListener(ev, (e) => { if (e.pointerId === pid) end(); }));

    window.addEventListener('resize', () => { if (pid === null) placeDefault(); });
    placeDefault();
    joy = { reset: end, placeDefault };
  }

  // ---------------- Buttons ----------------
  function bindButton(el) {
    const code = el.dataset.key;
    const dragAim = el.dataset.dragaim === '1';
    let pid = null, startY = 0;

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (pid !== null || el.classList.contains('disabled')) return;
      pid = e.pointerId;
      startY = e.clientY;
      el.setPointerCapture(pid);
      el.classList.add('down');
      press(code, el.id);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid || !dragAim) return;
      const dy = e.clientY - startY;
      dy < -14 ? press(K.aimUp, 'drag') : release(K.aimUp, 'drag');
      dy > 14 ? press(K.aimDown, 'drag') : release(K.aimDown, 'drag');
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      el.classList.remove('down');
      release(code, el.id);
      if (dragAim) { release(K.aimUp, 'drag'); release(K.aimDown, 'drag'); }
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, end));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------------- Per-frame sync (cooldown fills, labels) ----------------
  const cache = {};
  function setVar(el, name, value) {
    const key = el.id + name;
    if (cache[key] === value) return;
    cache[key] = value;
    el.style.setProperty(name, value);
  }

  function sync(player, mapId) {
    if (!player) return;
    const shield = document.getElementById('t-shield');
    const fly = document.getElementById('t-fly');
    const swap = document.getElementById('t-swap');
    if (!shield) return;

    setVar(shield, '--cd', player.shieldActive ? '0' : Math.min(player.shieldCooldown / SHIELD_CONFIG.cooldownFrames, 1).toFixed(2));
    shield.classList.toggle('on', player.shieldActive);

    const windMap = mapId === 'wind';
    fly.classList.toggle('disabled', !windMap);
    setVar(fly, '--cd', !windMap || player.flying ? '0' : Math.min(player.flightCooldown / FLIGHT_CONFIG.cooldownFrames, 1).toFixed(2));
    fly.classList.toggle('on', player.flying);

    const sub = swap.querySelector('.sub');
    const name = WEAPONS[player.weapon].name;
    if (sub.textContent !== name) sub.textContent = name;
  }

  function init() {
    initJoystick();
    document.querySelectorAll('.tbtn').forEach(bindButton);
    // Block pinch-zoom / long-press menus / scroll rubber-banding while playing
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('touchmove', (e) => { if (document.body.classList.contains('in-match')) e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', (e) => { if (document.body.classList.contains('touch')) e.preventDefault(); });
    window.addEventListener('blur', releaseAll);
  }

  return { init, sync, releaseAll };
})();
