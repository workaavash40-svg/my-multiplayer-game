# Prompt: Refactor

Use/adapt this when asking an AI assistant to refactor part of Stickman
Duel (this file is itself describing the process that produced the
current architecture — follow the same discipline for future ones).

---

1. **Analyze before changing.** Read every file that will be touched.
   Explain your understanding of what it currently does before proposing
   what changes. Don't refactor code you haven't actually read.
2. **State the plan and get approval before large changes.** "Large"
   means: touches more than ~3 files, changes a module boundary, or
   changes how the app is built/served/deployed. Small changes (rename a
   variable, extract a 10-line helper within one file) don't need this.
3. **Flag tradeoffs explicitly, don't make silent judgment calls on
   behalf of the user.** If a structural decision changes user-facing
   behavior (e.g. the classic-scripts-vs-ES-modules decision that
   determined this whole refactor), present it as an explicit choice,
   not a fait accompli.
4. **Preserve behavior unless changing it is the explicit goal.** If you
   notice a bug or quirk while refactoring (like the FPS-counter-freezes-
   on-menu quirk noted in `context/Roadmap.md`), do NOT silently fix it
   as part of a "just reorganizing" refactor — flag it separately and
   let the human decide.
5. **Do it in verifiable phases**, not one giant pass:
   - Extract pure-data / zero-dependency modules first (lowest risk).
   - Extract modules with few dependencies next.
   - Save the highest-traffic, most-imported files (like
     `engine/gameLoop.js`) for last, after everything they depend on is
     already verified working.
   - After each phase, verify (build + test, or manual reproduction) and
     report what changed before moving to the next phase.
6. **Verify mechanically, not just by inspection.** A successful build
   (`npm run build` completing without errors) is necessary but not
   sufficient — actually run the game and exercise the changed paths.
   Prefer scripted checks (Playwright, numeric state assertions) over
   "it looks right" when the tooling allows it.

After the refactor:

- Update `docs/Architecture.md` / `docs/Systems.md` if module
  responsibilities changed.
- Update `context/Architecture.md`'s "Where does X go?" table if the
  answer to that question changed for anything.
- Provide: final folder tree, summary of what changed and why, list of
  moved/renamed files, and anything flagged-but-not-fixed per rule 4.
