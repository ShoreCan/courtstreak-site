import { BALL_TRACKER_REVISION, EXPERIMENTAL_COUNTER_REVISION, BALL_IDENTITY_REVISION, poundCounterOptions } from './poundCore.mjs';
import { LIVE_FRAME_REVISION } from './detectionPass.mjs';

export const TRACKER_CHECK_REVISION = 'CHECK 09';
export const CURRENT_POUND_MODE = 'iphone-fresh-frame-test';
export const CURRENT_POUND_SESSION_PATH = `/lab/drill/right-hand-pound/session?mode=${CURRENT_POUND_MODE}`;
export const isPoundCameraMode = mode => [CURRENT_POUND_MODE, 'iphone-vision-test'].includes(mode);

const identityOptions = rank => Object.freeze({
  handContinuity:rank>=2, objectBackgroundRadius:rank>=3, timedContinuity:rank>=4,
  strongContinuity:rank>=5, corroboratedContinuity:rank>=6, floorContinuity:rank>=7, turnContinuity:rank>=8, ...(rank>=9?{weakContinuity:true}:{}), ...(rank>=10?{regularFloorContinuity:true}:{}),
});
const configuration = (counterRevision, identityRevision, rank, liveFrameRevision) => Object.freeze({
  id:`${counterRevision.replaceAll(' ','')}/${identityRevision?.replaceAll(' ','')??'legacy'}/${liveFrameRevision.replaceAll(' ','')}`,
  counterRevision, identityRevision, liveFrameRevision,
  identityOptions:identityOptions(rank), counterOptions:Object.freeze({...poundCounterOptions(counterRevision)}),
});

export const CURRENT_POUND_CONFIGURATION = configuration(EXPERIMENTAL_COUNTER_REVISION, BALL_IDENTITY_REVISION, 10, LIVE_FRAME_REVISION);
export const LEGACY_POUND_CONFIGURATION = configuration(BALL_TRACKER_REVISION, null, 1, 'FRAME 00');

// A missing historical identity revision cannot be guessed from the counter.
// Counter-only replay remains available independently through recordedProfile.
export function configurationForEvidence(data) {
  const counterRevision=data?.trackerRevision;
  poundCounterOptions(counterRevision);
  const identityRevision=data.ballIdentityRevision;
  const match=/^LOCK (0[2-9]|10)$/.exec(identityRevision??'');
  if(!match)throw new Error('The saved identity revision is missing or unsupported; exact identity configuration is unavailable.');
  const result=configuration(counterRevision,identityRevision,Number(match[1]),data.liveFrameRevision??'unrecorded');
  if(data.trackerConfiguration){
    const saved=data.trackerConfiguration;
    const sameOptions=(a,b)=>a&&Object.keys(a).length===Object.keys(b).length&&Object.keys(b).every(key=>a[key]===b[key]);
    if(saved.id!==result.id||saved.counterRevision!==result.counterRevision||saved.identityRevision!==result.identityRevision
      ||saved.liveFrameRevision!==result.liveFrameRevision
      ||!sameOptions(saved.identityOptions,result.identityOptions)||!sameOptions(saved.counterOptions,result.counterOptions)){
      throw new Error('Saved tracker configuration conflicts with its revision labels.');
    }
  }
  return result;
}

export function replayOptionsForConfiguration(config) {
  return {...config.identityOptions,...config.counterOptions};
}
