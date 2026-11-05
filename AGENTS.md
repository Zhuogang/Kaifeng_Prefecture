# Working agreement

You are the implementer on 东京梦华, a painted impression of Northern Song Kaifeng in three.js (see
`docs/IMPRESSION.md`, which overrides older docs where they conflict). Claude Code is the tech lead. It writes the specs, reviews every diff and validates
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
   **Stay in this repo.** The sandbox enforces this. You can see only this repo, athenaion (read-only, at
   `/lambda/nfs/jo-dc/PROJECTS/experiments/athenaion`), the headless Chromium and system files. `docs/`, `test/`,
   `refs/`, `AGENTS.md`, `.codex/`, `.git/`, the package files and `node_modules/` are read-only, and external
   network is blocked. Your home directory is throwaway. If something you need is blocked, stop and say so in your
   report. Don't look for a way around it, and if you need another package, ask.
4. **Assets.** Everything is generated in code, with one exception: the client allowed painted backdrops, for sky and
   far distance only, from `assets/backdrops/`. Buildings, water, trees and everything near stay in code. No downloaded
   models, textures, HDRIs or fonts. Reference images never load at runtime.
5. **Composed scenes.** Scene-specific composition and dressing are allowed, and no longer need to hold from every
   angle. Judge in motion along the scene's camera path.
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
