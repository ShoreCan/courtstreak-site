export const CROSSOVER_OBSERVATION_REVISION='PAIRED 02';
const crossover=Object.freeze({revision:CROSSOVER_OBSERVATION_REVISION,asyncPose:false,poseEveryPass:true,refreshBallFrame:false,nativeCapture:true});
const currentPound=Object.freeze({revision:'WORKER 01 / FRAME 02',asyncPose:true,poseEveryPass:false,refreshBallFrame:true});
const legacyPound=Object.freeze({revision:'SEQUENTIAL / FRAME 00',asyncPose:false,poseEveryPass:false,refreshBallFrame:false});

// Crossovers need the wrists and ball to describe the same instant. Run both
// existing models on one captured image; adequate joint throughput is still
// required before Go. The pound paths keep their existing scheduling.
export function sessionObservationPolicy(drillKey,freshFrames=true){
 return drillKey==='stationary-crossover'?crossover:freshFrames?currentPound:legacyPound;
}

export function poseFrameSkew(ballCapturedAt,poseCapturedAt){
 return Number.isFinite(ballCapturedAt)&&Number.isFinite(poseCapturedAt)?ballCapturedAt-poseCapturedAt:null;
}
