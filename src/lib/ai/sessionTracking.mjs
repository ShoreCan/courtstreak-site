import {createPoundTrackingState,resetPoundTrackingCounter,resetPoundTrackingIdentity} from './poundTrackingState.mjs';
import {createCrossoverCounter,CROSSOVER_COUNTER_REVISION,crossoverROI} from './crossoverCounter.mjs';
import {sessionObservationPolicy} from './sessionObservationPolicy.mjs';
export const CROSSOVER_DRILL_KEY='stationary-crossover';
export function createSessionTrackingState(freshFrames,drillKey,counterRevision=CROSSOVER_COUNTER_REVISION,independentCrossoverPose=false){
 const state=createPoundTrackingState(freshFrames);
 if(drillKey!==CROSSOVER_DRILL_KEY)return state;
 state.crossover=true;
 const observationPolicy=sessionObservationPolicy(drillKey,freshFrames,independentCrossoverPose);
 const rank=Number(counterRevision.slice(-2)),identityRank=rank>=11?3:rank>=9?2:1;
 const identityRevision=`TWOHAND 0${identityRank}`;
 state.configuration=Object.freeze({...state.configuration,id:`${counterRevision.replaceAll(' ','')}/${state.configuration.id}/${identityRevision.replaceAll(' ','')}/${observationPolicy.revision.replaceAll(' ','')}`,counterRevision,identityRevision:state.configuration.identityRevision+' + '+identityRevision,
  identityOptions:Object.freeze({...state.configuration.identityOptions,twoHandedMotion:true,...(rank>=9?{crossoverReconnect:true}:{}),...(rank>=11?{motionLock:true}:{})}),
  counterOptions:Object.freeze({oppositeHand:true,floorEvidence:true,kneeHeightRule:false,sizeOutlierRecovery:true,preFloorSizeRecovery:true,releaseSizeRecovery:rank>=5,...(rank>=6?{nearFloorRelease:true}:{}),...(rank>=7?{reanchorAfterGap:true}:{}),...(rank>=8?{stableReleaseSize:true}:{}),...(rank>=9?{ignoreOneOversizedSample:true}:{}),...(rank>=10?{finishWindowSeconds:.15}:{})}),observationPolicy});
 resetPoundTrackingIdentity(state);resetSessionTrackingCounter(state);return state;
}
export function resetSessionTrackingCounter(state){
 if(!state.crossover)return resetPoundTrackingCounter(state);
 state.counter=createCrossoverCounter(state.configuration.counterRevision);state.validator=state.counter;
}
export function updateSessionCounter(state,time,measurement,person,height,deadline){
 if(state.crossover){const confirmed=state.validator.update([],measurement,person,time,deadline);return {confirmed,proposals:state.counter.proposalsThisFrame};}
 const proposals=state.counter.update(time,measurement?[measurement[1],measurement[2]]:null,height);
 const confirmed=state.validator.update(proposals,measurement,person,time,deadline);
 confirmed.forEach(event=>state.counter.rememberControlledFloor(event));
 return {proposals,confirmed};
}
export function sessionROI(state,person,w,h){return state.crossover?crossoverROI(person,state.tracker,w,h):state.tracker.roi(w,h);}
