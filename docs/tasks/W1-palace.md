# Whole-world round 1: palace (T7b)

The lead saw the whole world together (shots 4 and 8). 大庆殿 has real weight at eye level, so keep it. Fix, biggest first:

1. **From the air the palace is a dark flat rectangle** with a few lines on it (shot 4), and you can't see any halls or courts behind 宣德楼. `ref4` shows halls, courtyards and galleries receding. Your far LODs have to be real building shapes with visible roofs, seen from 300-500 m up. Check the LOD selection, which may be using camera distance incorrectly from high up. The court
   surface shouldn't be black.
2. **Build time.** The palace takes 16.9 s of the world's 20.4 s build. Reduce it to ≤ 4 s by sharing geometry between identical halls and instancing. Report what was slow.
3. **Shot 8:** court paving is flat and dark, and needs real coursed stone with joints, worn paths and morning mist as in `ref8`. Brackets read as a dark band, and they should catch light. The terrace needs its 勾阑 and 踏道 to read clearly. Use a closer framing near `ref8`.
4. **Walkable route.** `node test/gates/reachability.mjs` must pass for 大庆门, the court and the terrace front. T4b will open 宣德楼's central door passage, so leave the route through.

At least 5 compare rounds.
