// The ladder spends reflection work before surface resolution. Times are supplied
// by the shell, so the policy can also be exercised with a synthetic frame clock.
export class ScrollQuality {
  constructor(maxRatio, lockedRatio = null) {
    this.maxRatio = maxRatio;
    this.locked = lockedRatio !== null;
    this.ratios = [maxRatio];
    while (this.ratios.at(-1) > .75) this.ratios.push(Math.max(.75, this.ratios.at(-1) - .125));
    this.level = 0;
    this.ratio = lockedRatio ?? maxRatio;
    this.windowMs = 0; this.samples = 0; this.comfortableMs = 0;
    this.lastUp = -Infinity; this.retryAfter = new Map();
  }
  get reflectionInterval() { return this.level >= 1 ? 2 : 1; }
  get reflectionScale() { return this.level >= 2 ? .25 : .5; }
  resetWindow() { this.windowMs = 0; this.samples = 0; this.comfortableMs = 0; }
  update(delta, now) {
    if (this.locked || delta <= 0) return false;
    this.windowMs += delta; this.samples++;
    if (this.windowMs < 2000) return false;
    const mean = this.windowMs / this.samples, duration = this.windowMs;
    this.windowMs = 0; this.samples = 0;
    const budget=this.level<2?20:33;
    if (mean > budget && this.level < this.ratios.length + 1) {
      if (now - this.lastUp < 5000) this.retryAfter.set(this.level + 1, now + 30000);
      this.level++; this.comfortableMs = 0;
    } else if (mean < 24 && this.level > 0) {
      this.comfortableMs += duration;
      if (this.comfortableMs < 6000 || now < (this.retryAfter.get(this.level) ?? 0)) return false;
      this.level--; this.lastUp = now; this.comfortableMs = 0;
    } else { this.comfortableMs = 0; return false; }
    this.ratio = this.ratios[Math.max(0, this.level - 2)];
    return true;
  }
}
