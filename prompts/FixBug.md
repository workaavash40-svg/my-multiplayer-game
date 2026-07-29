# Prompt: Fix a Bug

Use/adapt this when asking an AI assistant to fix a bug in Stickman Duel.

---

Before changing anything:

1. Reproduce the bug's *symptom* first, don't guess at the cause from
   the description alone. If you have a way to run the game (see
   README.md "Running it"), do so — Playwright + a manual reproduction
   script is how every bug in this codebase's history was actually
   diagnosed (not by reading code and assuming). Prefer **numeric or
   pixel-diff verification** over relying on visually inspecting
   screenshots, since that hasn't always been reliably available.
2. Identify which module actually owns the broken behavior — use
   `context/Architecture.md`'s "Where does X go?" table in reverse: if
   movement is broken, that's `entities/Player.js`; if it's a rendering
   glitch, that's `rendering/`; if it's a race between two systems (like
   the historical `simT`-vs-`videoT` timing bug in
   `context/CodingRules.md`), look for two things that should be reading
   the same clock/state but aren't.
3. Check `context/Roadmap.md` — is this a known, already-documented gap?
   If so, this may be a deliberate tradeoff, not a bug; confirm before
   "fixing" it.

While fixing:

- Make the smallest change that fixes the root cause. Don't refactor
  surrounding code in the same pass unless the bug literally can't be
  fixed without it — do that as a separate, called-out change.
- If the bug was caused by a pattern that could recur elsewhere (e.g. a
  floating-point boundary check), search for other instances of the same
  pattern in the codebase and flag them, even if you don't fix all of
  them in this pass.

After fixing:

- Re-verify with the same reproduction method from step 1 — confirm the
  fix actually resolves the symptom, not just that the code "looks
  right" now.
- Run `npm run build && npm test`.
- Add a regression test to `tests/smoke.spec.js` if the bug was in
  gameplay-visible behavior and isn't already covered.
- Report: root cause (not just symptom), the fix, why it's the smallest
  correct fix, and whether you found the same pattern elsewhere.
