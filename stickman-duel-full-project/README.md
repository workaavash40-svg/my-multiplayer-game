# Stickman Duel

A 2D multiplayer stickman shooter inspired by Mini Militia and Deadshot.io, built
with plain HTML5 Canvas + vanilla JavaScript (no frameworks), plus an optional
Node.js + Socket.IO server for online play.

## File structure

```
index.html      Screens (menus, HUD shell, control guides) + script includes
style.css       All visual styling, layout, permanent control guides
physics.js      Gravity, platform collision, integration helpers
weapons.js      Weapon data + Bullet / Spear / LaserBeam projectile classes
player.js       Player entity: movement, aiming, shooting, stickman drawing
ui.js           Screen switching, HUD drawing (scoreboard, weapon bar, FPS)
game.js         Main loop, state machine, maps, particles, SFX, AI bot
multiplayer.js  Client-side Socket.IO integration for online rooms
server.js       Node.js + Socket.IO relay server for online multiplayer
package.json    Server dependencies
```

## Playing locally (no install needed)

Local multiplayer and the AI bot mode run entirely in the browser with no
build step. Just open `index.html` directly, or serve the folder with any
static file server, e.g.:

```
npx serve .
```

Then choose **Play Local Multiplayer** (two people, one keyboard) or
**Play vs AI Bot** from the main menu, pick a map, and play.

### Controls

| Action | Player 1 (Blue) | Player 2 (Red) |
|---|---|---|
| Move | A / D | ← / → |
| Jump | W | ↑ |
| Shoot | F | / |
| Aim Up / Down | R / V | Page Up / Page Down |
| Switch Weapon | Q | Right Shift |
| Shield | E | Enter |
| Special Ability | C | Right Ctrl |
| Pause | Esc | Esc |

No key is shared between the two players. Controls are also shown as
permanent side panels during gameplay.

## Playing online

Online mode requires running the bundled server, since browsers can't open
raw WebSocket listeners to each other directly.

```
npm install
npm start
```

Then open `http://localhost:3000` (or your server's public address) in two
browser tabs/devices. From the main menu choose **Play Online Multiplayer**:

1. One player clicks **Create Room** and shares the 5-letter room code.
2. The other player enters that code and clicks **Join Room**.
3. Once both are connected, the room creator (host) picks a map and clicks
   **Start Match (Host Only)**.

The host runs the authoritative physics simulation; the guest sends inputs
to the host and receives synced state back every frame. To play over the
public internet rather than a LAN, deploy `server.js` to any Node hosting
provider (Render, Railway, Fly.io, a VPS, etc.) and share that URL instead
of `localhost`.

## Maps

- **White Arena** — minimalist white background, one long black platform, no obstacles.
- **Moon / Space** — starfield + moon backdrop, low gravity, much higher jumps.
- **Wind Map** — animated clouds/leaves, grants a 4-second flight special ability (20s cooldown).

## Weapons

AK-47 (fast automatic), Bow & Arrow (charge for more damage/range), Shield
(blocks incoming damage, 7s cooldown), Spear (thrown, returns after a short
delay), Laser Gun (high damage, wide spread, long cooldown). Cycle weapons
with Q / Right Shift.

## Scoring

First player to 5 round wins takes the match. Winning a round respawns both
players with full health and keeps the score; reaching 5 wins shows the
victory screen with **Play Again**, **Change Map**, and **Main Menu** options.

## Notes on audio

All sound effects (gunshots, laser, bow, jump, shield, hits, victory jingle,
menu blips) are synthesized at runtime with the Web Audio API — no external
audio files are required. Toggle sound off in **Settings**.

## Extending the game

The code is split into small, single-purpose modules so it's easy to expand:
add a weapon by extending `WEAPONS`/`WEAPON_ORDER` in `weapons.js`, add a map
by adding an entry (with its own `draw()`) to `MAPS` in `game.js`, or add a
new screen by adding a `.screen` div in `index.html` and wiring it up in
`Game.bindMenuEvents()`.
