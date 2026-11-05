# D1b: wrap up D1

**The client's number was misread. It's 16.7 ms, 60 FPS, locked to vsync, on an RTX 3070 Laptop GPU.** It wasn't 15 FPS. That was my mistake, not yours.

So nothing is wrong with the frame rate. What you've saved so far (164 ms and 280 ms against 351 and 638) is room for D2's detail, and the client's priority is now the detail and the angles.

1. **Stop chasing the 40% target.** Keep what you have and don't start any further optimisation.
2. **The look now outranks frame cost.** Go through your changes. If any of them softened a surface, changed a colour, or removed something visible in the main image at any path fraction and look corner, revert that change, even if it costs time.
3. **Adaptive ladder.** Protect 60 FPS without giving up resolution early. Above 20 ms sustained, take the reflection rungs. Only above 33 ms sustained, take pixel-ratio steps. Stepping back up works as you've built it.
4. **Sharpness.** Start at `min(devicePixelRatio, 2)`, not 1.5. The ladder protects weaker machines.
5. **Finish the work you've started:** make sure the tree works, then run the checks the D1 brief lists and send the report it asks for. Say plainly which targets were missed. A missed 40% target is fine now.
