# Architecture (AI quick reference)

Full detail: [`docs/Architecture.md`](../docs/Architecture.md) and
[`docs/Systems.md`](../docs/Systems.md) — read those for anything this
file doesn't answer. This file is the condensed version for quick
orientation before making a change.

## The one-sentence version

Vanilla JS ES-module browser game; `engine/gameLoop.js` is the
orchestrator that imports everything and runs the `update()`/`render()`
loop; `entities/` is simulation-only, `rendering/` is drawing-only,
`features/` is where game-specific content (weapons/maps/AI/multiplayer)
lives, `ui/` is DOM-only.

## Where does X go?

- New weapon stat or tuning number → `src/features/weapons/weaponData.js`
- New weapon's custom drawing → new file in `src/features/weapons/`
- New map → new file in `src/features/maps/`, register in `index.js`
- New player ability/behavior → `src/entities/Player.js` (state +
  `update()` logic only — no drawing)
- New visual for an existing entity → `src/rendering/playerRenderer.js`
- New HUD element → `src/rendering/hud.js`
- New menu screen → markup in `public/index.html`, wiring in
  `src/ui/menuBindings.js`
- New tunable constant (canvas size, target score, etc.) →
  `src/config/constants.js`
- Anything server-side (rooms, relay logic) → `server/server.js`
- Anything client-side about online play → `src/features/multiplayer/client.js`

## Two things that will bite you if you forget them

1. **`dist/index.html` is generated, never edit it directly.** Edit
   `public/index.html` / `public/style.css` / anything in `src/`, then
   run `npm run build`.
2. **`entities/Player.js` has no `draw()` method on purpose.** If you're
   tempted to add rendering code there, it goes in
   `rendering/playerRenderer.js` instead, reading the entity's fields.

## Dependency direction (no cycles)

```
config, engine/physics  →  entities  →  rendering, features/maps, features/ai
                                              ↓
                                    engine/gameLoop.js (imports ~everything)
                                              ↓
                                    ui/menuBindings.js, main.js
```

`features/multiplayer/client.js` receives the `Game` instance as a
parameter (`Multiplayer.init(game)`) instead of importing
`engine/gameLoop.js`, specifically to avoid a circular import.
