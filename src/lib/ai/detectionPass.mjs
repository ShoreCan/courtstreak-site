export const LIVE_FRAME_REVISION = 'FRAME 02';

// A pose pass can take much longer than a ball pass. For the live camera only,
// refresh the ball pixels after pose finishes instead of detecting an image
// that has been frozen throughout pose inference. Diagnostics omit the hook
// and retain their original, identical frozen input for both models.
export async function runDetectionPass({frame, roi, withPose, runPose, runBall,
  refreshBallFrame, clock = () => performance.now()}) {
  const started = clock(), width = frame.width, height = frame.height;
  const person = withPose ? await runPose(frame) : undefined;
  let ballFrame = frame, refreshed = null;
  if (withPose && refreshBallFrame) {
    refreshed = refreshBallFrame();
    if (refreshed === null) return {cancelled: true};
    if (refreshed !== undefined && (!refreshed?.frame || !Number.isFinite(refreshed.capturedAt) ||
      !Number.isFinite(refreshed.sourceVideoTime))) {
      throw new Error('The camera did not provide a fresh ball frame.');
    }
    if (refreshed !== undefined) ballFrame = refreshed.frame;
    if (ballFrame.width !== width || ballFrame.height !== height) {
      throw new Error('Camera framing changed during detection.');
    }
  }
  const balls = await runBall(ballFrame, roi);
  return {person: person?.value, balls: balls.value, ms: clock() - started,
    timings: {pose: person?.timings ?? null, ball: balls.timings},
    ...(refreshed ? {ballFrameRefreshed: true, capturedAt: refreshed.capturedAt,
      sourceVideoTime: refreshed.sourceVideoTime} : {})};
}
