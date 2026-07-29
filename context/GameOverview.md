# Game Overview

## What it is

Stickman Duel — a 2D canvas-based dueling shooter. Two stickman
characters (Blue/Player 1, Red/Player 2) fight to a set number of
round-wins across one of 5 maps, using 5 weapons and a map-dependent
special ability (dash or flight).

## Modes

- **Local Multiplayer** — two people, one keyboard, split key sets
  (WASD+FRVQEC for Player 1; arrows+/,PgUp/PgDn,RShift,Enter,RCtrl for
  Player 2). No key is shared between the two sets.
- **vs AI Bot** — Player 2 is controlled by a simple heuristic
  (`features/ai/aiBot.js`).
- **Online Multiplayer** — room-code based (create/join an 8-character
  code), host-authoritative netcode via Socket.IO, in-match text chat.
  See `docs/Systems.md#online-multiplayer` for the full flow.

## Maps

| Map | Gravity | Special ability | Notable mechanic |
|---|---|---|---|
| Green Valley | normal | Dash | Scenery only, no gimmick |
| City Rooftops | normal | Dash | Night skyline scenery |
| Moon | 0.45× | Dash | Much higher jumps |
| Wind Map | normal | **Flight** (timed burst, 4s/20s cooldown) | Only map with flight instead of dash |
| Deep Space | **zero** | Dash | Free-floating, no platform, thrust-based movement, hard arena bounds instead of a floor |

## Weapons (cycle with Q / Right Shift)

AK-47 (fast automatic) → Bow & Arrow (charge for damage/range) → Spear
(thrown, returns) → Laser Gun (high damage, wide spread, long cooldown).
Shield is a separate action (E / Enter, not in the cycle) — blocks all
damage while active, 10s cooldown.

## Special ability (C / Right Ctrl)

- **Dash** (every map except Wind): instantly (eased over ~0.23s)
  crosses 1/3 of the arena in the facing direction, dealing 3 damage
  (3% of 100 max HP) to anyone it sweeps through. 7s cooldown.
- **Flight** (Wind map only): 4-second burst allowing free vertical
  movement. 20s cooldown.

## Scoring

First to 5 round-wins takes the match. A round ends when either player's
HP hits 0; both respawn at full HP with score kept. Reaching 5 shows the
victory screen (Play Again / Change Map / Main Menu). Online matches
personalize this to "You Win!"/"You Lose!" per screen.

## What this game does NOT have

No save system, no inventory, no crafting, no quests, no dialogue trees —
this is a self-contained arcade duel, not an RPG. If you're an AI
assistant that received a generic "add a `features/inventory/` folder"
instruction, check whether it actually applies to this project first.
