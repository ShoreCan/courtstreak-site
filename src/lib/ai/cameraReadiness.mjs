// Brief detector flicker pauses setup; sustained loss requires a new lock.
// Only fresh, valid observations advance the clock or allow Go.
export const CAMERA_REVIEW_REVISION = 'CAMERA 03';
export const SETUP_GRACE_SECONDS = .65;
export const BALL_LOCK_GRACE_SECONDS = 1.5;

// Never ask the player to reposition for a detector/calibration interruption.
// Framing loss and an unobserved camera gap keep their shorter timeout.
export function cameraReadiness(checks, speedReady, lockReady) {
  const valid = checks.valid && speedReady && lockReady;
  const ballRecheck = checks.body && checks.hand && checks.floor &&
    (!checks.ball || (checks.valid && !lockReady));
  const message = !checks.valid ? checks.message : !speedReady ?
    'Checking tracking speed on this phone. Keep the phone still.' : !lockReady ?
    'Body framing is good. Rechecking the ball lock; hold the ball comfortably.' :
    'Position locked. Small movements are okay; wait for Go.';
  return { valid, recoveryGrace: ballRecheck && speedReady ? BALL_LOCK_GRACE_SECONDS : SETUP_GRACE_SECONDS, message };
}

export class ReadinessClock {
  constructor(grace = SETUP_GRACE_SECONDS) {
    this.grace = grace;
    this.reset();
  }
  reset(now = null) {
    this.lastAt = now;
    this.invalidSince = null;
    this.invalidGrace = null;
    this.elapsed = 0;
  }
  update(now, valid, { recoveryGrace = this.grace } = {}) {
    const previous = this.lastAt ?? now;
    const gap = Math.max(0, now - previous);
    const allowed = Math.max(this.grace, recoveryGrace);
    if (!valid && this.invalidSince !== null) this.invalidGrace = Math.min(this.invalidGrace, allowed);
    const timedOut = gap >= this.grace ||
      (this.invalidSince !== null && now - this.invalidSince >= this.invalidGrace);
    if (timedOut) this.reset(now);
    this.lastAt = now;
    if (!valid) {
      this.invalidSince ??= timedOut ? now : previous;
      this.invalidGrace ??= allowed;
      return { ready: false, reset: timedOut, elapsed: this.elapsed };
    }
    if (!timedOut && this.invalidSince === null) this.elapsed += gap;
    this.invalidSince = null;
    this.invalidGrace = null;
    return { ready: true, reset: timedOut, elapsed: this.elapsed };
  }
}
