# Stickman Duel

A 2D multiplayer stickman shooter — local 2-player (same keyboard), vs-AI,
and online multiplayer (room codes, host-authoritative relay), 5 maps,
5 weapons, a dash/flight special ability, and in-match chat for online play.
Pure HTML5 Canvas + vanilla JS (ES modules), no game framework.

This is the **refactored, modular version** of the project. Gameplay,
controls, and balance are unchanged from the previous single-bundle
version — only the internal organization changed. See
[`docs/Architecture.md`](docs/Architecture.md) for *why* it's organized
this way, and [`context/Roadmap.md`](context/Roadmap.md) for known gaps
and ideas.

## Folder structure

```
src/
  main.js              Entry point
  config/               Tunable constants, key bindings
  engine/                Game loop, physics, particles, audio, input
  entities/               Player + projectile classes (simulation only)
  rendering/               Canvas drawing: player renderer, HUD
  features/
    weapons/                Weapon data + AK-47 art
    maps/                    One file per map + a registry
    ai/                      AI bot heuristic
    multiplayer/             Socket.IO client
  ui/                    DOM screen management, menu bindings, chat
server/                 Node/Express/Socket.IO backend (separate runtime)
build/                  Build script (esbuild) + zero-dependency dev server
public/                 Dev HTML/CSS (multi-file, needs a local server)
dist/                   BUILD OUTPUT — single-file game (gitignored)
tests/                  Playwright smoke tests
docs/                   Architecture & systems documentation
context/                AI-assistant context files (read these first if you're an AI working on this repo)
prompts/                Reusable prompt templates for common tasks
```

## Running it

**Local dev (multi-file ES modules — requires a local server, browsers
block ES module imports over `file://`):**

```
npm install
npm run dev
```

Open **http://localhost:5173/public/index.html**. Local Multiplayer and
vs-AI-Bot work immediately.

**Single-file build (for static hosting / drag-and-drop deploy):**

```
npm run build
```

Produces `dist/index.html` — one file containing everything (JS bundled
via esbuild, CSS inlined). Open it directly via double-click, or upload it
to any static host (GitHub Pages, Netlify, etc.).

**With online multiplayer (also serves the built game itself):**

```
npm install
npm start
```

Runs the build, then starts `server/server.js` at `http://localhost:3000`.
Open that URL in two browser tabs to test online play locally, or deploy
this whole project to Render/Railway/Fly.io/a VPS for a public URL. See
[`docs/Systems.md`](docs/Systems.md#online-multiplayer) for the full
online-play flow (room codes, host/guest roles, color assignment).

## Testing

```
npx playwright install   # first time only
npm run build
npm test
```

Runs `tests/smoke.spec.js` — loads the built game, exercises all 5 maps,
pause/resume, local multiplayer input, and a regression check for the
Space-map zero-gravity descend controls.

## Adding a feature

See [`prompts/AddFeature.md`](prompts/AddFeature.md) for a step-by-step
template. Quick version:
- **New weapon** → add its data to `src/features/weapons/weaponData.js`
  and (if it needs custom art) a new file in `src/features/weapons/`.
- **New map** → add a new file in `src/features/maps/` (copy an existing
  one as a template) and register it in `src/features/maps/index.js`.
- **New screen/menu** → add markup to `public/index.html`, wire buttons
  in `src/ui/menuBindings.js`.

## Coding standards

- One responsibility per module — see `context/CodingRules.md` for the
  full list before making structural changes.
- Simulation and rendering are separate (`entities/` vs `rendering/`).
  Don't add drawing code to an entity class; don't add game-state
  mutation to a `ui/` or `rendering/` file.
- Config/tunable values go in `src/config/constants.js` or the relevant
  feature's data file (e.g. `weaponData.js`), not hard-coded inline.
- Keep imports explicit — import the specific functions/values you need,
  not whole modules as a dumping ground.

## Known gaps / things not yet done

- `entities/projectiles/LaserBeam.js` is currently unused dead code
  (inherited from before the refactor — the laser gun actually fires a
  fast `Bullet`, not a `LaserBeam`). Flagged here rather than silently
  removed; see `context/Roadmap.md`.
- No automated tests existed before this refactor; `tests/smoke.spec.js`
  is a first pass, not full coverage (e.g. no automated online-multiplayer
  test, since that needs two real socket connections).
- `public/index.html` and `dist/index.html`'s built version must be kept
  in sync manually if you edit HTML/CSS directly — always re-run
  `npm run build` after changing `public/`.
