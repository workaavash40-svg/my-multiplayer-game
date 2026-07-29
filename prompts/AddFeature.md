# Prompt: Add a Feature

Use/adapt this when asking an AI assistant to add something new to
Stickman Duel.

---

Before writing any code:

1. Read `context/Architecture.md` and `context/GameOverview.md` to
   understand where things live and what already exists.
2. Check `context/CodingRules.md` — follow it, don't ask permission to.
3. Identify which existing folder this feature belongs in (see the
   "Where does X go?" table in `context/Architecture.md`). If it doesn't
   fit any existing folder, propose a new one and explain why before
   creating it.
4. Check whether something similar already exists that you should extend
   instead of duplicating (e.g. a new weapon should follow the exact
   shape of an existing entry in `weaponData.js`, not invent a new data
   format).

While implementing:

- Keep the change scoped to the folders it actually belongs in. A new
  weapon should touch `features/weapons/`, maybe `entities/Player.js` if
  it needs new firing logic, and `rendering/playerRenderer.js` only if it
  needs custom on-player art — it should NOT need changes to
  `engine/gameLoop.js` unless it fundamentally changes match flow.
- Match the existing code's style in the file you're editing (naming,
  comment header format, how cooldowns/timers are tracked).
- If you're adding a new map, copy `features/maps/green.js` as a
  starting template and register it in `features/maps/index.js` — don't
  hand-roll the platform, use `sharedGround.js`.
- If you're adding a new screen/menu, add markup to `public/index.html`
  and wire it in `src/ui/menuBindings.js` — don't create ad hoc DOM
  manipulation elsewhere.

After implementing:

- Run `npm run build` and manually verify in `dist/index.html`
  (`file://` should still work with zero console errors).
- Run `npm test` if the feature affects gameplay behavior covered by
  `tests/smoke.spec.js`; add a new test case there if it's a map,
  mode, or control-scheme change.
- Update `docs/Systems.md` if you added or changed a system's behavior.
- Report: what you changed, which files, and anything you deliberately
  chose NOT to do (e.g. "didn't add online-mode support for this since
  it's local-only by design — confirm if that's wrong").
