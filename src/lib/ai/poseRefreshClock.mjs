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

// Held-ball setup can reuse a recent body check while observing every new ball
// frame. Active paired counting keeps its original per-frame wrist evidence.
export const SETUP_POSE_SCHEDULE_REVISION='SETUP PACE 01';
export function poseNeededForPass({policy,phase,enhancedTracking=false,clock,capturedAt,hasPerson,countdown=Infinity}){
 const preparing=enhancedTracking&&['setup','countdown'].includes(phase);
 return ((!preparing||phase==='countdown'&&countdown<=1)&&policy.poseEveryPass)||clock.shouldRun(capturedAt,hasPerson);
}
