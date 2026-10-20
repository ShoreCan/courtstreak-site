export const POSE_SCHEDULE_REVISION = 'PACE 01';
export const POSE_REFRESH_SECONDS = .18;

// A slow pose pass must not consume the waiting interval itself. Otherwise a
// pass taking >=180ms schedules another pose on the very next camera frame.
// The caller separately retains the pose's capture time for freshness checks.
export class PoseRefreshClock {
  constructor() { this.lastCompletedAt = -Infinity; }
  shouldRun(capturedAt, hasPerson) {
    return !hasPerson || capturedAt >= this.lastCompletedAt + POSE_REFRESH_SECONDS;
  }
  completed(completedAt) { this.lastCompletedAt = completedAt; }
}
