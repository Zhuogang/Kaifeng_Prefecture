# R0: Generate the look-target references

Generate 9 cinematic target images with your image generation tool. They play the role athenaion's 9
reference images did: the quality bar every later render gets compared against. Write only to
`refs/generated/`. Touch no code.

Attached images: two athenaion references, showing the photoreal quality and richness we want (**style only,
no Greek content**), plus 《瑞鹤图》, the Song scroll's city gate, 《金明池争标图》 and 晋祠圣母殿, for Song
architecture. Read `docs/ART_BIBLE.md` first, especially the Song-not-Qing table.

## Output

- `refs/generated/ref1.png` … `ref9.png`, landscape, as close to 16:9 and as high-resolution as the tool
  allows. Copy them from wherever the tool saves them.
- `refs/generated/PROMPTS.md`: the exact final prompt used for each.
- Up to 3 attempts per shot. Look at each result and retry if it breaks a hard rule. Keep the best and say what's
  still wrong with it.

## Include in every prompt

> Photorealistic cinematic film still, ultra-detailed, natural light, rich but natural colour, deep contrast.
> Northern Song dynasty capital Kaifeng, China, year 1120. Song dynasty architecture as in the Yingzao Fashi and
> the surviving Hall of the Holy Mother at Jinci: large structural dougong brackets, very deep eaves, stout
> vermilion columns that lean slightly inward, a roofline curving gently and continuously up toward the corners,
> upright fishtail chiwei ridge ornaments, deep green glazed tiles, white plaster walls. Completely flat land, no
> hills or mountains. No people, no animals except where stated, no text, no modern objects.

## Hard rules: a shot fails if it shows

- People, or any modern object
- Imperial yellow roofs, Forbidden City proportions, or dragon-headed Qing ridge ornaments
- Round arched gate passages, or an arched 州桥
- Mountains or hills
- Japanese or Korean roof styling, or fantasy pagoda clusters

## The shots

1. **宣德楼, hero view.** From 180 m south at eye level, slightly off-axis. Golden morning sun from the right.
   A U-shaped gate complex: a 7-bay hall on a very tall sloped masonry platform of grey brick and stone courses
   carved with dragons, phoenixes and clouds; L-shaped wing towers stepping forward on each side; two pavilion
   towers at the front ends, facing each other. **Five vermilion doors studded with gold, flat-topped timber
   lintels, no arches.** Vermilion fences in the foreground on empty stone paving.

2. **御街, eye level, looking north.** An immense ceremonial avenue over 300 m wide on flat land, as wide as a great
   square, completely empty, 宣德楼 small on the axis in morning haze beyond a low flat stone bridge flanked by two
   tower gates. Centre: a coursed bluestone road 60 m wide with worn cart ruts. Either side: straight brick-lined
   canals with floating lotus leaves (no flowers), then banks of peach, plum, pear and apricot trees in blossom,
   then vermilion fences. Then wide paved lanes, and far away at the left and right edges long open-fronted timber
   corridors with tiled roofs and black fences. Long raking shadows. Petals on the water. Vastness, depth and
   repetition are the subject, and it must feel majestic, not like an empty airfield.

3. **Cranes.** Telephoto from below, a photorealistic homage to 《瑞鹤图》: the great green-grey tiled hip of the main
   hall along the bottom third, its two fishtail chiwei with small fork-shaped ornaments on top. Eighteen white
   red-crowned cranes wheeling against a deep cyan-blue sky, two more standing on the chiwei. Low clouds lit
   gold below the roofline.

4. **Aerial over the palace.** From 300 m up, south-east, looking north-west. 宣德楼 in the centre foreground, the
   palace behind it: a vast courtyard, a huge double-eaved hall, more halls and long galleries receding. The
   avenue running out of frame bottom-left. An endless plain of grey-tiled city roofs to a flat hazy horizon with
   river mist. A slender 13-storey octagonal brown-glazed brick pagoda far off to the right.

5. **州桥 from the water.** Water-level view along the Bian river at late afternoon. **A low, nearly flat stone beam
   bridge on many closely spaced bluestone columns. No arches at all, too low for boats.** Long bluestone
   embankment walls on both sides carved with continuous relief of winged horses, cranes and clouds. Two tower gates at
   the north end of the bridge. Weeping willows, a moored empty wooden river boat, calm silt-green water.

6. **Carved wall.** Close-up of the bluestone embankment in raking sunset light: a winged sea-horse leaping among
   curling clouds, a crane either side, carved in deep relief, about 3 m tall. Tool marks, weathering, algae at the
   waterline, ripples in the foreground, willow whips framing the top of the frame.

7. **御廊, inside.** Standing in the long open corridor beside the avenue, looking down its length. Stout vermilion
   columns with soft sun-faded paint, large dougong brackets and exposed rafters overhead, worn bluestone paving,
   morning sun slanting through and casting long shadows of columns. Composition like the attached 晋祠 porch but
   empty, no plaques or barriers. The avenue's blossom trees glowing out of focus outside.

8. **大庆殿.** From across a vast empty stone courtyard, at eye level, early morning. A huge 9-bay double-eaved hipped
   hall with colossal brackets on a tall tiered stone platform with railings. Long covered galleries enclosing the
   court on both sides. Two smaller bell-tower pavilions standing in the courtyard. Mist low on the ground, first sun
   catching the upper roof.

9. **Blue hour over the city.** From the wing tower of 宣德楼, looking south-east, with a vermilion railing and the
   underside of bracketed eaves framing the foreground. Below: the avenue and a sea of grey tiled roofs running to the
   horizon, the first warm lantern lights coming on in windows and along the river, cooking smoke hanging in layers,
   deep blue-to-orange sky.

## Report

For each shot: which attempt you kept, what's still wrong, and which hard rules it breaks, if any. Be blunt. I'll be
looking at them myself.
