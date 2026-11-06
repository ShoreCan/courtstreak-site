export const SAFARI_REVISION = 'SAFARI GPU 01';
export function safariObservationPolicy(drillKey) {
  return Object.freeze({revision: SAFARI_REVISION, asyncPose: true, poseEveryPass: false,
    refreshBallFrame: false, nativeCapture: true, floorView: drillKey === 'right-hand-pound',
    maxPoseAge: .3, maxActivePoseSkew: drillKey === 'stationary-crossover' ? .12 : .3,
    poseRequestIntervalSeconds: .08});
}
export function safariConfiguration(base, drillKey) {
  return Object.freeze({...base, id: base.id + '/SAFARIGPU01/SHAPE01', safariRevision: SAFARI_REVISION,
    shapePolicyRevision: 'SHAPE 01', identityOptions: Object.freeze({...base.identityOptions,
      partialObjectGuard: true, ...(drillKey === 'right-hand-pound' ? {observedIdentity: true, cadenceAwareWeakGuard: true} : {})}),
    observationPolicy: safariObservationPolicy(drillKey)});
}
export function overlayFreshness(ballAt, poseAt, now) {
  const ballAge = now - ballAt, poseAge = now - poseAt;
  return {ballVisible: Number.isFinite(ballAge) && ballAge >= 0 && ballAge <= .15,
    ballUncertain: ballAge > .08, poseVisible: Number.isFinite(poseAge) && poseAge >= 0 && poseAge <= .3};
}
export function nextOverlayExpiry(ballAt, poseAt, now) {
  const times = [ballAt + .081, ballAt + .151, poseAt + .301].filter(t => Number.isFinite(t) && t > now);
  return times.length ? Math.min(...times) : null;
}
