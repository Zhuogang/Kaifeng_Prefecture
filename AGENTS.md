# Working agreement

You are the implementer on 东京梦华, a fully procedural, photoreal reconstruction of Northern Song
Kaifeng in three.js. Claude Code is the tech lead. It writes the specs, reviews every diff and validates
by re-running and looking at the renders itself. Work counts as done when it passes the lead's gate, not
when you report it finished.

Read these before coding: `docs/CONTRACT.md`, `docs/ART_BIBLE.md`, `docs/YINGZAO.md`, and your task brief
in `docs/tasks/`.

## Rules

1. **Scope.** Do what the brief says. Don't refactor, rename or "improve" anything outside it. If you spot
   something else worth doing, put it in your final report.
2. **Lead-owned files.** Never edit `AGENTS.md`, `docs/`, `test/` or `refs/historical/`. If a spec or test
   looks wrong, stop working on that item and explain why in your report. Never weaken, skip or delete a
   test, and never special-case code to satisfy one.
3. **Git.** Don't run `git add`, `commit`, `push`, `pull`, `fetch`, `stash`, `reset`, `checkout` or `clean`. The
   lead owns history.
   **Stay in this repo.** Don't read outside it except `athenaion` and the Chromium install named in your brief,
   and never read `~/.ssh`, credentials, tokens or other projects. External network is off and dependencies are
   already installed. If you need another package, stop and ask in your report.
4. **Zero external assets.** Every runtime mesh, texture and shader is generated in code. No downloaded
   models, textures, HDRIs or fonts. Reference images never load at runtime.
5. **No camera-specific content.** This is a world people walk through. Nothing may exist, change or be
   dressed for one viewpoint. `src/world/shots.js` holds validation cameras only, and no module may import
   it or react to which shot is active.
6. **Determinism.** Use `engine.rng(label)` and `engine.time`. Never `Math.random` or `Date` in world code.
   The same code must produce the same image.
7. **Sources over instinct.** If the docs give a rule or number, implement exactly that. If you have to
   invent something, mark it `// inferred:` in code and list it in your report. When in doubt about Song
   architecture, read `docs/sources/` and look at `refs/historical/`. Your instinct for "Chinese
   architecture" is mostly Qing, and Qing is wrong here (see the table in the art bible).
8. **Look at your work.** Render it and open the PNG before finishing. A clean exit proves nothing about
   how it looks.
9. **Report honestly.** If something failed, was skipped or looks wrong, say so plainly. Don't claim a
   check you didn't run.

## Final report format

- **Changed:** files and what each does
- **Ran:** each command with its actual result (timings, tris, draw calls)
- **Renders:** paths to the PNGs, and your honest opinion of each
- **Inferred:** anything you invented that isn't in the sources
- **Gaps:** what's missing, broken or not verified
