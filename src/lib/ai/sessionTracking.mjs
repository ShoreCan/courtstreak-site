import {createPoundTrackingState,resetPoundTrackingCounter,resetPoundTrackingIdentity} from './poundTrackingState.mjs';
import {createCrossoverCounter,CROSSOVER_COUNTER_REVISION,crossoverROI} from './crossoverCounter.mjs';
export const CROSSOVER_DRILL_KEY='stationary-crossover';
export function createSessionTrackingState(freshFrames,drillKey){
 const state=createPoundTrackingState(freshFrames);
 if(drillKey!==CROSSOVER_DRILL_KEY)return state;
 state.crossover=true;
 state.configuration=Object.freeze({...state.configuration,id:`${CROSSOVER_COUNTER_REVISION.replaceAll(' ','')}/${state.configuration.id}/TWOHAND01`,counterRevision:CROSSOVER_COUNTER_REVISION,identityRevision:state.configuration.identityRevision+' + TWOHAND 01',identityOptions:Object.freeze({...state.configuration.identityOptions,twoHandedMotion:true}),counterOptions:Object.freeze({oppositeHand:true,floorEvidence:true,kneeHeightRule:false})});
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
