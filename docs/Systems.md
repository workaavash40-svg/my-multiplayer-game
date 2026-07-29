# Systems

Documentation for each major system. For folder-level architecture, see
[`Architecture.md`](Architecture.md).

## Physics (`src/engine/physics.js`)

Constants: `BASE_GRAVITY`, `JUMP_FORCE`, `MOVE_SPEED`, `MAX_FALL_SPEED`,
`ARENA` (hard world bounds). Functions: `aabbOverlap`, `resolvePlatform`
(AABB-vs-platform collision with shallowest-side resolution),
`integrate` (gravity + velocity integration), `pointInPlayer` (bullet
hit-test), `distance`.

Per-map gravity is a *multiplier* on `BASE_GRAVITY` (`map.gravityMultiplier`),
not a replacement — Moon is `0.45`, Space is `0` (see zero-gravity below).

## Player (`src/entities/Player.js`)

Owns all per-player state (position, velocity, HP, weapon, ability
timers) and `update(input, map, opponent, spawnProjectile, sfx, particles)`.
Does **not** draw itself — see `rendering/playerRenderer.js`.

Key behaviors:
- **Movement**: standard platformer movement/friction/air-control, plus
  map-specific variants (zero-gravity thrust for Space, higher jumps on
  Moon).
- **Dash** (`specialType: 'dash'`, all maps except Wind): eases across
  1/3 of the arena width over 14 frames, deals `SPECIALS.dash.damage`
  (3 = 3% of 100 max HP) once if it sweeps through the opponent's
  position. Cooldown `SPECIALS.dash.cooldown` (7s).
- **Flight** (`specialType: 'fly'`, Wind map only): timed burst
  (`SPECIALS.fly.duration`, 4s) with its own cooldown (20s), separate
  from Space's always-available zero-gravity thrust.
- **Zero gravity** (`map.zeroGravity`, Space only): no gravity applied at
  all; Up/Down (or the aim-up/aim-down keys as a fallback) apply thrust
  directly to `vy`, with drag toward a hover state.
- **Hard arena bounds**: every frame, position is clamped to
  `map.bounds || Physics.ARENA` — this is what stops flying/dashing
  players from leaving the visible play field.

## Weapons (`src/features/weapons/`)

`weaponData.js` is pure config — `WEAPONS` (per-weapon stats),
`WEAPON_ORDER` (cycle order for the switch-weapon key), `SPECIALS`
(dash/fly tuning). `weaponArt.js` has the AK-47's hand-drawn mini-skin
(other weapons use a simple colored line, drawn directly in
`playerRenderer.js`).

Five weapons: AK-47 (auto), Bow & Arrow (charge — hold to charge, release
to fire, damage/speed scale with charge time), Shield (blocks all damage
while active, 10s cooldown), Spear (thrown, sticks briefly, then returns
and sets `player.spearReady = true`), Laser Gun (high damage, wide
spread, long cooldown — currently implemented as a fast `Bullet`, not the
unused `LaserBeam` class — see Known Gaps in the README).

## Maps (`src/features/maps/`)

Each map file exports an object: `{ id, name, gravityMultiplier,
specialType, platforms, draw(ctx, w, h, t) }`, plus optional
`zeroGravity: true` and a custom `bounds` (Space only — no platforms,
free-floating, contained by `bounds` instead). `index.js` aggregates them
into the `MAPS` registry keyed by id, which is what the rest of the
codebase imports.

All ground maps use a full-arena-width platform (`sharedGround.js`) so
players can't run off the sides and fall through.

## AI Bot (`src/features/ai/aiBot.js`)

A small heuristic, not a real AI: maintains medium range from the
opponent, shoots when in range with some probability per frame, jumps/
dashes/shields/switches weapons at low random probability, and adjusts
aim up/down based on relative height. On the Space map it drifts
vertically toward the opponent's altitude instead of jumping.

## Online Multiplayer

**Client** (`src/features/multiplayer/client.js`) + **Server**
(`server/server.js`), connected via Socket.IO.

Flow:
1. Host clicks **Create Room** → server generates an 8-character
   alphanumeric room code, returns it.
2. Guest enters that code, clicks **Join Room**.
3. Host picks a map, clicks **Start Match** → server randomly assigns
   each participant `'p1'` (Blue) or `'p2'` (Red) — independent of
   host/guest role — and sends `{ mapId, yourColor }` to each client.
4. **Host is authoritative**: it runs the real `Player.update()`/physics
   for both players every frame (using its own local input for whichever
   color it was assigned, and `Multiplayer.remoteInput` — sent by the
   guest every frame — for the other color), then broadcasts the full
   state to the guest.
5. **Guest never runs physics** — it only sends its local input to the
   host and renders whatever state the host broadcasts
   (`Multiplayer.applyState`).
6. Both humans always play with the same Blue/WASD-style key layout
   locally, regardless of which color (`p1`/`p2`) they were assigned —
   this is why `readInput()` is always called with `P1_KEYS` for the
   local player in `engine/gameLoop.js`'s online branch.
7. Chat messages relay through the server to the other participant in
   the same room; each client renders its own sent messages immediately
   without waiting for an echo.
8. On match end, the host determines the winner and both clients show a
   **personalized** result (`setVictoryOnline` — "You Win!"/"You Lose!"),
   using each client's own `Multiplayer.myColor` compared to the
   winner's color.

## Particles & Audio

`engine/particles.js` — a flat list of `{x,y,vx,vy,life,color,size}`
squares with simple gravity/drag, used for hit sparks and dash trails.

`engine/audio.js` — every sound effect is synthesized at runtime with the
Web Audio API (oscillator + gain envelope per named preset). No audio
files are shipped or loaded.

## Scoring / Match Flow (`engine/gameLoop.js`)

First to `TARGET_SCORE` (5, `config/constants.js`) round-wins takes the
match. A round ends when either player's HP reaches 0 (from a bullet or
a dash hit — `gameLoop.js`'s `update()` checks `wasAlive` before/after
both players update each frame, so a death is only ever scored once
regardless of which mechanic caused it). After a round, `roundDelay`
(90 frames) pauses input before both players respawn at full HP with
score preserved.
