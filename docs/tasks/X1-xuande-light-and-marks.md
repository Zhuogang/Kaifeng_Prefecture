# X1: bring 宣德楼 up to 州桥

州桥 went through W1 to W3b and no longer looks plastic: baked sun shadows, sun and shade pigments, contact occlusion, a stroke atlas with light per mark, tile rows, deep brackets. The client approved the result and asked for the same on 宣德楼. **That's this task: reuse those recipes on the `xuande` profile, and don't invent new systems.**

The client also said the water is fine: **don't touch the canal.** And **州桥 is now locked**: `test/gates/views.mjs` compares it with `out/X0/`. Generalise shared code without changing a pixel of it.

`refs/style/c1.png` is the target, and `refs/style/crops/c1-hall.jpg`, `c1-near.jpg` and `c1-wall.jpg` are its close-ups. `out/X0/f0.png` is today's render. Camera and composition stay.

## Measurements

`python3 -I test/gates/look-xuande.py <render.png>` measures whole regions against `c1`, with no mask, at p10, p30, p50, p70 and p90. I learned the hard way that a saturation mask misleads, so use this one. They're a guide. The eye decides. Don't copy 州桥's colour constants: this scene has its own palette.

## 1. Light

- **A baked sun shadow map,** as on 州桥, covering this scene. In `c1` the light comes from the viewer's left, low and warm. The evidence: the left sloping wing is in violet shade and the right one is in full sun. Tune it by looking.
- It must produce: shadow on the left wing, eaves and brackets shadowed on the hall, the cornice's shadow on the top of the wall, deep shadow in each door reveal, rails casting on the paving, and the hall and its side pavilions shading each other.
- **The paving's dapple** is composed to `c1`, and nothing in frame casts it. Keep its pattern, combine it with the real shadow, and don't lose it.
- **Sun and shade pigments,** and violet contact occlusion on rails, brackets and door reveals, as on 州桥.

## 2. Marks

Use the same atlas and per-mark light on paving, wall, doors, rails, stone kerbs and trunks.

- **Wall:** `c1-wall.jpg` has large flaked stones in warm tones, not an even wash. Build it from big, flat, overlapping marks, darker and cooler toward the base and sides. Median about 226 173 136, a little redder and brighter than ours.
- **Paving:** values already measure close to `c1`. What's missing is warmth and hand. The sun pools should be warm cream, the shade a lilac-violet with warm strokes in it, and the big slabs should show soft, brushed marks.
- **Doors:** brighter vermilion, median about 207 93 73 against our 170 78 58, with worn marks. Keep the gold nails.
- **Rails:** paint worn pale in the sun, as in `c1-near.jpg`: p70 about 165 115 102 and p90 about 190 148 129. Today they're a smooth, saturated orange-red. Hue should lean a little more crimson.

## 3. The hall

- **Roof:** warm grey, median about 153 142 140, against our cool blue-grey at 138 144 150. The rows are too even and slightly metallic. `c1-hall.jpg` has hand-laid, irregular rows with lighter and darker tiles. Use W3's tile recipe with more irregularity and no sheen.
- **Ridge ornaments:** the 鸱尾 are pale cream. In `c1` they're dark grey like the ridge. Fix them.
- **Brackets:** W3's recipe. Today's p10 is 49 31 26 against `c1`'s 93 69 62: lift the darkest parts to a warm violet-brown, as I did on 州桥 (`tower-detail.js`), and keep the members separate. The pale panels between the sets should go dark and warm.
- **Side pavilions:** the same.

## 4. The branch and trees

- **The big arching branch is the worst thing in the frame.** It's a nearly black, smooth bar. `c1`'s is brown bark with visible form: warm gold on its upper side, darker below, with strokes along the growth. Use the hero trunk's bark recipe. Region shade about 85 65 55, against our 45 39 36.
- **The trees by the wall** have thin, near-black trunks. Same bark, in warmer browns.
- **Blossom:** colours measure close, so keep them. Add leaf-green accents and darker centres if it's cheap. More blossom work is a later task.

## Keep

- `node test/gates/views.mjs out/X1`: 州桥 unchanged, no holes, budget of 50 calls and 1.6 M triangles, controls.
- `test/gates/perf.mjs`: 宣德楼 at most 400 ms in software (today 304), 州桥 unchanged.
- `shimmer.py` under .05% on 10 fixed-camera frames of 宣德楼 at fractions 0 and 1. Also render 24 frames along the path and look: no crawling marks.
- The specs, and `scroll.mjs` after `build.mjs`.

## Files

`src/paint/`, `src/modules/paint_*.js`, `tools/paint/`.

## Report

The usual format, with `look-xuande.py` before and after. Attach 1080p renders at fractions 0, .5 and 1 in `out/X1/`, and crops of the hall, the wall and a door, the near rail, and the branch next to the matching `c1` crop. Compare honestly, and name the most plastic thing left.
