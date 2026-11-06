export const PARTIAL_BALL_REVISION = 'SHAPE 01';
export function partialBallDecision(candidate) {
  const b = candidate?.box, score = candidate?.score;
  if (!Array.isArray(b) || b.length !== 4 || ![...b, score].every(Number.isFinite) || b[2] <= b[0] || b[3] <= b[1])
    return {allowed: false, reason: 'invalid_geometry'};
  const aspect = (b[2] - b[0]) / (b[3] - b[1]);
  return score < .1 && (aspect < .5 || aspect > 2.2)
    ? {allowed: false, reason: 'uncertain_partial_object'} : {allowed: true};
}
