// Brief detector flicker pauses setup; sustained loss requires a new lock.
// Only fresh, valid observations advance the clock or allow Go.
export const CAMERA_REVIEW_REVISION = 'CAMERA 01';
export const SETUP_GRACE_SECONDS = .65;

export class ReadinessClock {
  constructor(grace = SETUP_GRACE_SECONDS) {
    this.grace = grace;
    this.reset();
  }
  reset(now = null) {
    this.lastAt = now;
    this.invalidSince = null;
    this.elapsed = 0;
  }
  update(now, valid) {
    const previous = this.lastAt ?? now;
    const gap = Math.max(0, now - previous);
    const timedOut = gap >= this.grace ||
      (this.invalidSince !== null && now - this.invalidSince >= this.grace);
    if (timedOut) this.reset(now);
    this.lastAt = now;
    if (!valid) {
      this.invalidSince ??= timedOut ? now : previous;
      return { ready: false, reset: timedOut, elapsed: this.elapsed };
    }
    if (!timedOut && this.invalidSince === null) this.elapsed += gap;
    this.invalidSince = null;
    return { ready: true, reset: timedOut, elapsed: this.elapsed };
  }
}
