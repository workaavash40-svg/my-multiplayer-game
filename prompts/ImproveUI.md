# Prompt: Improve UI

Use/adapt this when asking an AI assistant to change a menu screen, the
HUD, or other visual/interaction elements in Stickman Duel.

---

First, identify which of the two UI systems you're touching — they're
deliberately separate:

- **DOM screens** (main menu, map select, controls, settings, online,
  pause, victory) → markup in `public/index.html`, styling in
  `public/style.css`, behavior in `src/ui/screens.js` (show/hide) and
  `src/ui/menuBindings.js` (button wiring).
- **Canvas HUD** (scoreboard, weapon bar, cooldown bars, zero-G hint) →
  `src/rendering/hud.js`. This is drawn fresh every frame inside
  `engine/gameLoop.js`'s `render()` — there's no persistent DOM element
  to inspect in devtools, only canvas draw calls.

Don't blur these two — a new HUD element does not go in `ui/screens.js`,
and a new menu screen does not get canvas-drawn.

While implementing:

- Match the existing visual language: dark translucent backgrounds
  (`rgba(0,0,0,0.45)`) behind HUD text, the existing color coding (Blue
  `#2f6fed` / Player 1, Red `#e83a3a` / Player 2), and the existing font
  stack (`"Segoe UI", sans-serif`).
- For DOM screens, reuse the existing `.screen`/`.menu-btn`/`.back-btn`
  classes in `style.css` rather than inventing new ones, unless the new
  element is genuinely a new pattern.
- Keep control guides and other "always visible during play" elements
  working in both local and online modes — check
  `ui/screens.js#setOnlineControlGuide` if your change interacts with
  that toggle.

After implementing:

- Run `npm run build` and visually check `dist/index.html` — take a
  screenshot at minimum; prefer testing actual interaction (click
  through the flow) over a static screenshot alone.
- Verify at the canvas's native 1280×720 — the game doesn't currently
  have a responsive/mobile layout, don't assume one exists.
- Report: what changed, which of the two UI systems it touched, and a
  screenshot or description of the result.
