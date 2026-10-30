// Read elapsed time from a monotonic clock, rather than counting UI callbacks.
export function createRoundClock(now = () => performance.now()) {
  let remaining = 0;
  let startedAt = null;
  const value = () => Math.max(0, remaining - (startedAt === null ? 0 : Math.max(0, now() - startedAt)));
  return {
    start(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid round duration');
      remaining = seconds * 1000;
      startedAt = now();
    },
    pause() { remaining = value(); startedAt = null; },
    resume() { if (startedAt === null && remaining > 0) startedAt = now(); },
    seconds() { return Math.ceil(value() / 1000); },
    reset() { remaining = 0; startedAt = null; },
  };
}
