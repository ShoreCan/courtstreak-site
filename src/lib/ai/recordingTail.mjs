export const RECORDING_TAIL_REVISION = 'CAPTURE 02';
// Reliability failure freezes the partial count. It need not discard the rest
// of a healthy, already-running camera recording. Never extend the deadline.
export function recordingTailSeconds({ phase, started, now, duration, recorderState }) {
  if (phase !== 'active' || recorderState !== 'recording' || !Number.isFinite(started) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.min(duration, started + duration - now));
}
