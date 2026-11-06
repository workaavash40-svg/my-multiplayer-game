# Stickman Arena

A 2D stickman shooter inspired by Mini Militia and Deadshot.io, built with plain HTML/CSS/JS (no build step, no frameworks) plus an optional Node + Socket.io server for online play.

## Play locally (single/local multiplayer) — no install needed

Local multiplayer, bot mode, maps, weapons, and the whole UI work straight from the files:

1. Open `index.html` in a modern browser (Chrome/Edge/Firefox).
   - Because the game fetches nothing external except the Google Font and the Socket.io client script, it's easiest to serve it rather than double-click it, e.g.:
     ```
     npx serve .
     # or
     python3 -m http.server 8080
     ```
     then visit `http://localhost:8080`.
2. Click **Play Local Multiplayer**, optionally check **Fight a bot**, pick a map, and go.

## Mobile / touch

Open the page on a phone (landscape). On touch devices the keyboard panels are replaced by on-screen controls and you play Blue vs a bot:

- **Joystick** (left half, floats under your thumb): left/right to move, push up to jump
- **FIRE** (hold): auto-fire / bow charge. **Drag up/down while holding** to aim, or use the ▲ ▼ buttons
- **JUMP**, **SWAP** (weapon), **SHIELD**, **FLY** (Wind map) — the shield/fly buttons show their cooldown draining

Every round (and the match start) opens with an animated 3 · 2 · 1 · FIGHT! countdown; controls unlock on FIGHT!.
The simulation runs at a fixed 60 Hz, so 90/120 Hz phones play at the same speed as desktops.

## Bot levels (1-6)

Tick "Fight a bot" in Local Multiplayer and pick a level (touch devices always play a bot).

| Level | Name | Behaviour |
|---|---|---|
| 1 | Rookie | Slow aim, misses a lot, short bursts, slow to turn around |
| 2 | Easy | Sloppy aim, longer bursts, slow to turn |
| 3 | Average | Decent aim, jumps, shields when hurt, still slow to turn |
| 4 | Hard | Strong aim and dodging; **turns and fires instantly** |
| 5 | Expert | Leads your movement, dodges and shields, 125 HP |
| 6 | Impossible | Perfect aim and timing, 175 HP, shield recharges twice as fast |

Levels 1-3 need time to turn around when you cross to their other side; levels 4+ turn and shoot immediately. After beating a bot, the victory screen offers **Next Level**. All numbers live in the `BOT_LEVELS` table at the top of `bot.js`.

## Controls

**Player 1 (Blue):** A/D move, W jump, F shoot, R/V aim up/down, Q switch weapon, E shield, C special.
**Player 2 (Red):** ←/→ move, ↑ jump, `/` shoot, PgUp/PgDn aim up/down, Right Shift switch weapon, Enter shield, Right Ctrl special.

Both control panels are shown permanently on screen during a match.

## Online multiplayer (room codes, no URL)

`server.js` serves the game *and* the multiplayer server on one port, so players never type a server address.

```bash
npm install
node server.js        # then open http://localhost:3001
```

1. Host: **Play Online Multiplayer** -> pick a map -> **Create Room** -> share the 4-character code.
2. Friend: **Play Online Multiplayer** -> type the code -> **Join**. The match starts automatically.

Open the game from the Node server's address (not Live Server / a static host) or online play will say the server is missing.

### Deploy on Render
Create a **Web Service** from your GitHub repo: Build `npm install`, Start `node server.js`. Share your `https://your-app.onrender.com` link; everyone plays from it. (Free instances sleep when idle, so the first load can take ~30s.)

Networking model: each client runs the same physics for both stickmen and only per-frame input is relayed. The host's map choice is used for both players.

## File structure

| File | Purpose |
|---|---|
| `index.html` | Page shell, all menu/HUD screens |
| `style.css` | Visual styling |
| `physics.js` | Gravity, friction, platform collision helpers |
| `weapons.js` | Weapon configs + `Projectile` class + firing logic |
| `player.js` | `Player` class: movement, combat state, stickman rendering |
| `touch.js` | Mobile joystick + buttons (feed virtual keys into the shared input) |
| `bot.js` | Six-level bot AI (`BOT_LEVELS` table) |
| `ui.js` | Canvas HUD (scoreboard, weapon/cooldown bar) + DOM menu helpers |
| `game.js` | Main loop, maps, input polling, AI bot, particles, audio, screen wiring |
| `multiplayer.js` | Client-side Socket.io room/input relay |
| `server.js` | Node + Socket.io room server |

## Notes & known simplifications

- Audio is generated on the fly with the Web Audio API (oscillator "blips") rather than shipped sound files, so there's nothing to download and no missing-asset errors — swap in real files in `Audio_.play()` (in `game.js`) whenever you have some.
- The online netcode is an input-relay model, not a fully authoritative server — great for a LAN/friends game, but a competitive-grade version would want server-side simulation and reconciliation.
- Ring-outs: knockback can push a player off a platform edge into a fall, which counts as a death (round point to the opponent) — this is intentional on the Moon map's floating platforms, and only reachable via strong knockback on the wider maps.
