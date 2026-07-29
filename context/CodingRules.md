# Coding Rules

Rules for any AI assistant (or human) making changes to this codebase.
Violating these isn't a style nitpick — most of them exist because
breaking them caused a real bug during the original refactor (noted
inline where relevant).

## Structure

1. **Never mix UI and game logic.** `ui/*` files touch the DOM;
   `entities/*` and `engine/gameLoop.js` touch game state; `rendering/*`
   touches the canvas. A function that does two of these should be split.
2. **Simulation and rendering are separate files.** `entities/Player.js`
   has state + `update()`. `rendering/playerRenderer.js` has
   `drawPlayer()`/`drawPlayerDeath()`/`drawPlayerOverhead()`, reading
   that state. Don't reunite them "for convenience."
3. **One responsibility per module.** If you're adding a second unrelated
   concern to a file, make a new file instead. (`game.js` before the
   refactor was 599 lines doing six jobs — that's the failure mode this
   rule prevents.)
4. **Reuse existing systems.** Before adding a new particle/timer/cooldown
   pattern, check `engine/particles.js` and how `Player.js` already does
   cooldowns (`somethingCooldown` frame counters, decremented in
   `update()`) — match the existing pattern rather than inventing a new one.
5. **Avoid duplicate code.** If you're about to copy-paste a map's
   platform setup, use `features/maps/sharedGround.js` instead (this is
   why it exists).
6. **Keep files focused.** A map file should only contain that map's
   data + `draw()`. A weapon's special art goes in `weaponArt.js`, not
   inline in `playerRenderer.js`.
7. **Prefer composition over duplication.** The 5 maps all share
   `makeGroundPlatform()` rather than each hardcoding a platform rect.
8. **Document public APIs.** Every exported function/class should have a
   comment explaining what it does and what it depends on — see any
   existing file's header comment for the expected format.

## Timing/event bugs to specifically avoid

These are real bugs that happened during development — call them out
explicitly because they're easy to reintroduce:

- **Comparing floating-point time windows for one-shot events is
  fragile.** `if (t >= X - 1/FPS && t < X)` can silently miss the target
  frame due to float rounding. Use a *crossing* check instead:
  `prevT < X && t >= X`. (This isn't currently used anywhere in the
  shipped game code, but came up during animation work — mentioned here
  so it isn't reintroduced if frame-precise timing is ever added.)
- **Don't compare two different clocks against the same event list.** If
  something is scheduled in "real time," check it against real time
  everywhere, not against a separately-accumulated "story time" that can
  drift from a rate-changing multiplier. If you need slow-motion-style
  effects, prefer choreographing content across a longer real-time window
  over introducing a second clock.

## When editing `engine/gameLoop.js` specifically

This file imports nearly everything — it has the widest blast radius in
the codebase. Before changing `update()` or `render()`:
- Re-read `docs/Systems.md#scoring--match-flow` — the `wasAlive`
  before/after check exists specifically so a death is scored exactly
  once regardless of whether a bullet or a dash caused it. Don't add a
  second death-detection path.
- Test all of: local multiplayer, vs-AI, and (if you have two browser
  tabs / a server running) online host and guest — a change that only
  gets tested in local mode can silently break the online branch, since
  it has separate input-routing logic.

## No magic numbers

Tunable values (canvas size, target score, key bindings, weapon damage,
cooldowns) live in `config/constants.js` or the relevant feature's data
file (`weaponData.js`, map files). If you're about to write a bare number
like `5` for "rounds to win," check whether it already has a named
constant before adding a new literal.

## Naming

- Descriptive names over short ones (`drawPlayerOverhead`, not
  `drawOH`).
- Files are named after what they export (`playerRenderer.js` exports
  player-rendering functions; `weaponData.js` exports weapon data).
