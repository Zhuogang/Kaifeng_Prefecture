# U1b: make the captions readable

You own `index.html` and `src/scroll/`. Don't touch anything else. Another agent is still working in `src/paint/`. Write under `out/U1b/`.

Caption text is grey on busy paint and hard to read, and the gloss panel covers the rail. Replace both with a **paper title slip**, like the 题签 on a handscroll.

- A narrow vertical strip of the opening's paper colour at about 94% opacity, soft shadow, thin darker inner rule. Dark ink text, `writing-mode: vertical-rl`. The scene name is larger at the head of the slip, and the line of text follows.
- The English gloss goes on the same paper colour, in one small block beside or under the slip, in ink. Readable contrast, at least 4.5:1, at 14 px or larger.
- Place it so it doesn't cover the main building or the bridge's near end. In 宣德樓, use the sky at top right, clear of the hall's roof. In 州橋, use the water at lower right. Keep it small: they should be able to go on looking at the picture.
- Phone width: slip and gloss still fit without overflow, and the caption still doesn't cover the on-screen controls.
- The control hint at the bottom gets the same paper backing, and fades out for good after about 8 s or at the first input.

Keep the timing, the `C` key and `window.__scroll` exactly as they are. `node test/gates/scroll.mjs` must still pass. Run it on a copy of `dist/` under `out/U1b/`, because another agent may rebuild `dist/`.

Open screenshots of both scenes with both lines, at desktop and phone width, and report what you saw.
