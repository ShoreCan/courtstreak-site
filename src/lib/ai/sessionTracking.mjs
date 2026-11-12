import {STREAM_POUND_CONFIGURATION} from './trackerConfiguration.mjs';
import {createPoundTrackingState,resetPoundTrackingCounter,resetPoundTrackingIdentity} from './poundTrackingState.mjs';
import {createCrossoverCounter,CROSSOVER_COUNTER_REVISION,crossoverROI} from './crossoverCounter.mjs';
import {sessionObservationPolicy} from './sessionObservationPolicy.mjs';
import {createPoundRecoverySession,updatePoundRecoverySession,POUND_RECOVERY_REVISION} from './poundRecoverySession.mjs';
export const CROSSOVER_DRILL_KEY='stationary-crossover';
export function createSessionTrackingState(freshFrames,drillKey,counterRevision=CROSSOVER_COUNTER_REVISION,independentCrossoverPose=false,{enhancedTracking=false,streamingPound=false}={}){
 if(enhancedTracking&&!['right-hand-pound',CROSSOVER_DRILL_KEY].includes(drillKey))throw new Error('Camera Test 20 currently supports right-hand pounds and crossovers.');
 if(streamingPound&&(!enhancedTracking||drillKey!=='right-hand-pound'))throw new Error('Streaming pound is an independent right-hand-pound test.');
 const state=createPoundTrackingState(freshFrames);
 if(streamingPound){state.configuration=STREAM_POUND_CONFIGURATION;resetPoundTrackingIdentity(state);}
 if(drillKey!==CROSSOVER_DRILL_KEY){
  if(enhancedTracking){state.configuration=Object.freeze({...state.configuration,id:state.configuration.id+'/OBSERVEDFLOOR01',recoveryRevision:POUND_RECOVERY_REVISION,observationPolicy:sessionObservationPolicy(drillKey,freshFrames,false,true,streamingPound)});state.recovery=createPoundRecoverySession();}
  return state;
 }
 state.crossover=true;
 const observationPolicy=sessionObservationPolicy(drillKey,freshFrames,independentCrossoverPose);
 const rank=Number(counterRevision.slice(-2)),identityRank=rank>=11?3:rank>=9?2:1;
 const identityRevision=`TWOHAND 0${identityRank}`;
 state.configuration=Object.freeze({...state.configuration,id:`${counterRevision.replaceAll(' ','')}/${state.configuration.id}/${identityRevision.replaceAll(' ','')}/${observationPolicy.revision.replaceAll(' ','')}`,counterRevision,identityRevision:state.configuration.identityRevision+' + '+identityRevision,
  identityOptions:Object.freeze({...state.configuration.identityOptions,twoHandedMotion:true,...(rank>=9?{crossoverReconnect:true}:{}),...(rank>=11?{motionLock:true}:{})}),
  counterOptions:Object.freeze({oppositeHand:true,floorEvidence:true,kneeHeightRule:false,sizeOutlierRecovery:true,preFloorSizeRecovery:true,releaseSizeRecovery:rank>=5,...(rank>=6?{nearFloorRelease:true}:{}),...(rank>=7?{reanchorAfterGap:true}:{}),...(rank>=8?{stableReleaseSize:true}:{}),...(rank>=9?{ignoreOneOversizedSample:true}:{}),...(rank>=10?{finishWindowSeconds:.15}:{}),...(rank>=12?{gapReceiptRecovery:true}:{}),...(rank>=13?{carryReceivingHand:true}:{}),...(rank>=14?{independentRelease:true}:{})}),observationPolicy});
 resetPoundTrackingIdentity(state);resetSessionTrackingCounter(state);return state;
}
export function resetSessionTrackingCounter(state){
 if(!state.crossover){resetPoundTrackingCounter(state);if(state.configuration.recoveryRevision)state.recovery=createPoundRecoverySession(state.configuration.recoveryOptions);return;}
 state.counter=createCrossoverCounter(state.configuration.counterRevision);state.validator=state.counter;
}
export function updateSessionCounter(state,time,measurement,person,height,deadline,candidates=[],observations=null){
 if(state.crossover){const confirmed=state.validator.update([],measurement,person,time,deadline);return {confirmed,proposals:state.counter.proposalsThisFrame,count:state.validator.count};}
 const proposals=state.counter.update(time,measurement?[measurement[1],measurement[2]]:null,height);
 const confirmed=state.validator.update(proposals,measurement,person,time,deadline);
 confirmed.forEach(event=>state.counter.rememberControlledFloor(event));
 if(state.recovery){const recovered=updatePoundRecoverySession(state.recovery,{primaryEvents:confirmed,candidates,person,time,diameter:state.tracker.typical(),deadline,measurement,context:state.validator.context,observations});return {proposals,confirmed:recovered.confirmed,primaryConfirmed:confirmed,count:recovered.count,recoveryMeasurement:recovered.measurement};}
 return {proposals,confirmed,count:state.validator.count};
}
export function sessionROI(state,person,w,h){return state.crossover?crossoverROI(person,state.tracker,w,h):state.tracker.roi(w,h);}
