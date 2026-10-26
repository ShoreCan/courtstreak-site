export const BALL_PROPOSAL_POLICY_REVISION = 'PROPOSALS 02';
export const ORDINARY_BALL_SCORE = .008;
export const CONTINUATION_BALL_SCORE = .0001;

// Broaden emitted proposals only after ownership/calibration. Identity still
// prefers ordinary proposals; weak scores are never promoted to strong ones.
export function ballProposalMinimumScore({phase, calibrated, weakContinuity}) {
  return weakContinuity && calibrated && ['active','review'].includes(phase)
    ? CONTINUATION_BALL_SCORE : ORDINARY_BALL_SCORE;
}
