# Architecture

## Why this structure

The pre-refactor codebase was 10 files sharing one global `window` scope
(classic `<script>` tags, no `import`/`export`). It worked, but one file
(`game.js`, 599 lines) did six different jobs at once: map data, map
rendering, audio synthesis, particles, input constants, AI, and the whole
state machine. This refactor:

1. Introduces real ES modules with explicit `import`/`export`, so
   dependencies are visible and enforced by the JS engine itself, not
   just by script-tag ordering in `index.html`.
2. Splits by responsibility (engine vs. entities vs. rendering vs.
   features vs. ui), not just by "what was already in one file".
3. Keeps a build step (`build/build.js`, esbuild) so the single-file,
   drag-and-drop-to-a-static-host distributable is preserved exactly —
   this was a hard requirement, not a nice-to-have.

## Folder responsibilities

| Folder | Responsibility | Should NOT contain |
|---|---|---|
| `src/config/` | Tunable constants, key bindings | Any logic |
| `src/engine/` | Game loop, physics math, particles, audio, input handling — generic systems with no game-specific content | Map data, weapon data, DOM manipulation |
| `src/entities/` | `Player` and projectile classes — state + `update()` behavior only | Canvas drawing (`draw()` methods) |
| `src/rendering/` | Canvas drawing functions, given entity state | Game-state mutation |
| `src/features/weapons/` | Weapon stats, special-ability tuning, weapon-specific art | Player movement/physics logic |
| `src/features/maps/` | One map = one file (data + its own `draw()`) | Anything not map-visual-specific |
| `src/features/ai/` | AI bot input heuristic | Rendering |
| `src/features/multiplayer/` | Socket.IO client, online state sync | Server code (see `server/`) |
| `src/ui/` | DOM screen show/hide, menu button wiring, chat DOM | Canvas drawing, simulation logic |
| `server/` | Node/Express/Socket.IO backend — a different runtime, deliberately outside `src/` | Anything that runs in the browser |
| `build/` | Bundling (esbuild) + local dev server | Game logic |

## Game loop

`src/main.js` → `Game.init()` (in `engine/gameLoop.js`) →
`requestAnimationFrame(Game.loop)` → `loop()` calls `update()` then
`render()` every frame, forever.

**`update()`**: reads keyboard state (`engine/input.js`) → branches on
local / AI / online mode → steps both `Player`s (`entities/Player.js`) →
resolves platform collisions (`engine/physics.js`) → steps
bullets/collisions → checks win condition (`onPlayerDeath`) → steps
particles/screen-shake → if hosting online, broadcasts state.

**`render()`**: draws the active map background (`features/maps/`) →
both players (`rendering/playerRenderer.js`) → projectiles → particles →
HUD (`rendering/hud.js`).

## Data flow

```
DOM buttons (public/index.html)
  → ui/menuBindings.js handlers
    → mutate Game.state / Game.mode / Game.mapId
    → ui/screens.js (show/hide DOM screens)

Keyboard
  → engine/input.js (raw keys{} state)
    → readInput() → per-player logical input object
      → entities/Player.js update()

Online (features/multiplayer/client.js):
  local input → Multiplayer.tick() → socket → server/server.js (relay)
    → other client's Multiplayer.remoteInput
  Host's Player state → Multiplayer.serializeState() → socket
    → guest's Multiplayer.applyState() → Object.assign onto guest's
      local Player objects (the guest never runs its own physics —
      the host is the sole authority for collision/scoring).
```

## Module dependency direction

Dependencies flow one way, no cycles:

```
config/constants.js  (no deps)
engine/physics.js    (no deps)
       ↓
entities/*           (physics, weapons data)
       ↓
rendering/*           (entities' field shapes, weapons art)
features/maps/*        (physics for bounds)
features/ai/*           (no deps beyond plain data)
       ↓
engine/gameLoop.js       (imports nearly everything — the orchestrator)
       ↓
ui/menuBindings.js         (gameLoop's Game instance passed in, not imported)
main.js                      (wires it all together)
```

`features/multiplayer/client.js` is intentionally decoupled from
`engine/gameLoop.js` — it receives the `Game` instance via `.init(game)`
rather than importing it, specifically to avoid a circular dependency
(`gameLoop.js` imports `Multiplayer`, so the reverse import would cycle).

## Build pipeline

```
src/**/*.js (ES modules)
      │
      │  esbuild (bundle: true, format: 'iife')
      ▼
  one JS string
      │
      │  inlined into public/index.html's <script type="module"> slot,
      │  alongside public/style.css inlined into a <style> block
      ▼
  dist/index.html   (single file, everything except the Socket.IO
                      CDN <script> — the one legitimate external dep)
```
