# U1: the painted scroll, a way to experience the scenes

Read `docs/IMPRESSION.md` first. There are two painted scenes, `src/modules/paint_xuande.js` and `src/modules/paint_zhouqiao.js`. Build the thin experience around them, so a person opening the
page drifts through them. Not a walkable world.

**You own** `src/main.js`, `index.html`, `src/scroll/` (new), `src/paint/playback.js`, `tools/build.mjs`, new tools named `tools/paint/scroll-*`, and `src/core/engine.js` for the one change in item 1. Another agent is
changing the rest of `src/paint/` and the paint modules at the same time, so don't edit those. If you need something from them, say so in your report. Renders may look different between runs for that
reason. Write under `out/U1/`.

Don't change anything for `?test=`, `?shot=` or `mode=still`. `tools/render.mjs` must keep working, and byte-identical renders must stay byte-identical.

## 1. Fast start

`paint_*` first render takes about 14 s before anything appears, and the painted scenes don't use the old sky, clouds or atmosphere. Trace where the time goes, in `window.__STATS`, and skip what the painted scenes don't use, with an option to `createEngine` that leaves the
old world's behaviour unchanged. Target: build under 3 s on this machine, excluding first shader compile. Report before and after, and report time to first frame.

## 2. Routing

- No `test`, `shot`, `mode` or `world` in the URL: the scroll. `?scene=0` or `1` opens that scene directly, without the opening.
- `?world=1` opens the old walkable world as it was.

## 3. Moving between scenes

Use a **full page navigation** between scenes, not in-page teardown, so nothing can leak. Hide it: on leaving, a paper-coloured panel with a soft edge sweeps across in about 1 s, like a scroll being rolled on. The new page starts already covered, using inline CSS so there's no flash,
builds, then sweeps off. Order: 宣德楼, then 州桥.

## 4. In a scene

- The camera drifts slowly along the scene's path and back, using the module's `paintView(fraction)` and the existing playback code.
- The pointer looks around a little, up to ±3° yaw and ±1.5° pitch, eased. Dragging or the wheel scrubs along the path, and drift resumes about 4 s after the last input. On touch, drag scrubs.
- ← and → or discreet on-screen edge controls change scene. Show a small position mark, 一 and 二. `C` toggles captions. `P` toggles a small frame-rate readout: frame time, FPS, draw calls, triangles, pixel ratio. The client will use it to report real-GPU performance, so make it easy to read.
- `prefers-reduced-motion`: no drift, and scrubbing still works. If WebGL2 is unavailable or the context is lost, show a plain message.

## 5. Opening and captions

- Opening: paper-coloured, vertical title 东京梦华, a small line 孟元老《東京夢華錄》, and a 开卷 button once the first scene is ready. Show quiet progress before that.
- Captions: vertical text, `writing-mode: vertical-rl`, placed where it doesn't fight the composition, fading in after about 2 s and out after about 12 s. Use a system serif stack: `"Songti SC", "STSong", "Noto Serif CJK SC", "SimSun", serif`. **No downloaded fonts.** Small English gloss beneath.

Use exactly this text. It comes from `docs/sources/dongjing_juan1.txt` and `dongjing_juan2.txt`.

| Scene | Name | Line | Gloss |
|---|---|---|---|
| 宣德楼 | 宣德樓 | 大內正門宣德樓列五門，門皆金釘朱漆。 | The palace's main gate, Xuande Tower, has five doors, all vermilion lacquer with gold nails. |
| 宣德楼 | | 近岸植桃李梨杏，雜花相間，春夏之間，望之如繡。 | Peach, plum, pear and apricot were planted along the banks, their blossoms mingled. In spring and summer it looked like embroidery. |
| 州桥 | 州橋 | 州橋（正名天漢橋），正對於大內御街。 | Zhou Bridge, properly Tianhan Bridge, faces straight up the palace avenue. |
| 州桥 | | 橋下密排石柱，蓋車駕御路也。 | Stone columns stand close-set beneath it, for this is the imperial carriage road. |

Show the two lines of a scene one after the other.

## 6. Keep it smooth

- Interactive pixel ratio starts at `min(devicePixelRatio, 1.5)`. If frames average over 28 ms for 2 s, step it down, to a floor of .75. Don't step back up within a scene. The readout shows the current value.
- Pause rendering when the tab is hidden.

## 7. Static delivery

`tools/build.mjs` must produce a `dist/` that runs all of this from a sub-path, with no `node_modules` requests, with both backdrops and with no errors in the console.

## Test interface

Expose `window.__scroll = { scene(), ready(), fraction(), scrub(f), next(), prev(), captionsVisible(), status() }`. `status()` returns `{ frameMs, fps, pixelRatio, calls, triangles }`. The lead's gate uses it, so don't rename anything.

## Done means

- Screenshots of opening, each scene with its caption, and mid-transition under `out/U1/`, opened and looked at. Check phone width too: controls and caption mustn't collide or overflow.
- Report: build and first-frame times before and after, the tests, a scripted run through opening, scene 0, next, scene 1, prev, using `tools/paint/scroll-check.mjs` from a sub-path of `dist/`, and that `?world=1` and `?test=` still work.
