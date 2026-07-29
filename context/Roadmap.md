# Roadmap / Known Gaps

## Carried over from before the refactor (not introduced by it)

- **`entities/projectiles/LaserBeam.js` is dead code.** The Laser Gun
  weapon actually fires a fast `Bullet` (`kind: 'laser'`), not a
  `LaserBeam`. The class was ported over verbatim (per "preserve
  existing behavior") rather than silently deleted — worth either wiring
  it up as a real instant-hitscan beam, or removing it, as a deliberate
  follow-up decision rather than an accidental one.
- **The FPS counter freezes on the main menu.** `render()`'s early-return
  for `state === 'menu'` skips the `updateFps()` call at the bottom of
  the function — this was true before the refactor too, and was
  preserved exactly rather than "fixed" silently. Worth a deliberate
  decision on whether that's actually desired.
- **No automated test coverage existed before this refactor.**
  `tests/smoke.spec.js` is a first pass covering menu load, all 5 maps,
  pause/resume, and the Space-map descend regression — it is not full
  coverage (no scoring/win-condition test, no online-multiplayer test).

## Introduced by the refactor (tradeoffs made, documented for visibility)

- **The raw `public/` source can no longer be opened via `file://`.**
  This was an explicit, confirmed tradeoff for real ES module boundaries.
  `npm run dev` (a zero-dependency static server) or the built
  `dist/index.html` are the two ways to run it now.
- **`server/server.js` now serves `dist/`, not its own directory.** If
  you deploy the server without running the build first, it'll 404 on
  `/`. `npm start` handles this (`build && start` in one script) but a
  manual `node server/server.js` without a prior build won't.

## Suggested next steps (not started)

1. **Online multiplayer test coverage.** `tests/smoke.spec.js`
   deliberately doesn't test online play since it needs two real Socket.IO
   connections; a `tests/online.spec.js` using two Playwright browser
   contexts against a locally-started `server/server.js` would close
   this gap.
2. **Decide the LaserBeam question** (see above) — either delete the
   unused class or make the Laser Gun actually use it for a true
   instant-hitscan feel.
3. **Client-side prediction/interpolation for the online guest.**
   Currently the guest only renders whatever state the host last
   broadcast — fine on a LAN, but will look choppy over real internet
   latency. `docs/Systems.md#online-multiplayer` has the current
   architecture; this would add local prediction on top of it.
4. **Extract magic numbers still living inside individual map files**
   (hill positions, building counts, star counts) into each map's own
   config section, if maps become user-configurable or numerous enough
   that hand-tuning inline arrays becomes painful.
5. **A `context/Roadmap.md` maintenance habit** — update this file
   whenever a known gap is closed or a new one is found, so it stays
   trustworthy as an AI-context file rather than going stale.

## Areas that still need human judgment (not mechanical to fix)

- Whether to invest in the online-play robustness items above depends on
  how much real (non-LAN) online play this game actually gets — not
  worth doing speculatively.
- The AI bot (`features/ai/aiBot.js`) is intentionally simple
  (probabilistic, no real decision tree). Whether to invest in a smarter
  bot is a product decision, not a code-quality one.
