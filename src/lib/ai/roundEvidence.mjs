export const REP_REVIEW_REVISION = 'REPLAY 03';

export function replayStart(time, duration = Infinity, reviewFrom) {
  const start = Math.max(0, Number.isFinite(reviewFrom) ? Math.min(reviewFrom, Number.isFinite(time)?time:Infinity) : Number.isFinite(time) ? time - .35 : 0);
  return Number.isFinite(duration) ? Math.min(start, Math.max(0, duration - .01)) : start;
}

const copyDetection = value => value ? {
  box: [...value.box], score: value.score,
  ...(value.xy ? { xy: value.xy.map(point => [...point]), confidence: [...value.confidence] } : {})
} : null;

// No pixels or uploads: keep the inputs and decisions needed to inspect a count.
// Copy events before later validator updates can change their state.
export class RoundEvidence {
  constructor(limit = 2400) {
    this.frames = []; this.repEvents = []; this.proposals = [];
    this.limit = limit; this.nextFrame = 1; this.droppedFrames = 0;
  }
  record({ capturedAt, sourceVideoTime, inputPhase, phase, roi, balls, person, selected, ms, timings, fps, poseUpdated, poseAge, poseCapturedAt, poseInferenceMs, positionChecks,
    passStartedAt, ballFrameRefreshed, setupReadiness, counterFrame, proposedCount, count, selectionDecisions, ballProposalMinimumScore, handoffState, poseSourceVideoTime, poseFrameSkewSeconds, sourceVideoFrameNumber, proposals = [], confirmed = [] }) {
    const frameId = this.nextFrame++;
    this.frames.push({ frameId, capturedAt, sourceVideoTime, inputPhase, phase, roi: [...roi],
      ...(handoffState?{handoffState:{...handoffState}}:{}),
      ...(Number.isFinite(poseSourceVideoTime)?{poseSourceVideoTime}:{}),
      ...(Number.isFinite(poseFrameSkewSeconds)?{poseFrameSkewSeconds}:{}),
      ...(Number.isFinite(sourceVideoFrameNumber)?{sourceVideoFrameNumber}:{}),
      balls: balls.map(copyDetection), person: copyDetection(person), selected: copyDetection(selected),
      ...(selectionDecisions?{selectionDecisions:selectionDecisions.map(d=>({...d}))}:{}),
      ...(Number.isFinite(ballProposalMinimumScore)?{ballProposalMinimumScore}:{}),
      inferenceMs: ms, ...(timings?{detectorTimings:{pose:timings.pose?{...timings.pose}:null,ball:{...timings.ball}}}:{}), ...(Number.isFinite(passStartedAt)?{passStartedAt,ballFrameRefreshed:!!ballFrameRefreshed}:{}), trackingFps: fps, poseUpdated, poseAge, ...(Number.isFinite(poseCapturedAt)?{poseCapturedAt}:{}), ...(Number.isFinite(poseInferenceMs)?{poseInferenceMs}:{}), ...(setupReadiness?{setupReadiness:{...setupReadiness}}:{}), positionChecks: {...positionChecks}, counterFrame, proposedCount, count });
    if (this.frames.length > this.limit) { this.frames.shift(); this.droppedFrames++; }
    for (const proposal of proposals) this.proposals.push({ ...proposal, proposedOnFrame: frameId });
    for (const event of confirmed) this.repEvents.push({ rep: event.count,
      time: event.event_timestamp_exact ?? event.event_time_seconds,
      confirmedOnFrame: frameId, confirmedAt: capturedAt, counterFrame: event.event_frame,
      path: event.validation_path,...(event.from_hand?{fromHand:event.from_hand,toHand:event.to_hand,floorTime:event.floor_contact_time_seconds,reviewFrom:Math.max(0,event.release_time_seconds),controlEvidence:event.control_evidence}:{}) });
  }
  export({ startedAt = null, ...metadata }) {
    return { schema: 'courtstreak-round-evidence-v1', reviewRevision: REP_REVIEW_REVISION, ...metadata,
      droppedFrameRecords: this.droppedFrames,
      frames: this.frames.map(frame => ({ ...frame,
        elapsed: startedAt === null ? null : frame.capturedAt - startedAt })),
      proposals: this.proposals,
      countedReps: this.repEvents.map(event => ({ ...event,
        confirmedElapsed: startedAt === null ? null : event.confirmedAt - startedAt })) };
  }
}
