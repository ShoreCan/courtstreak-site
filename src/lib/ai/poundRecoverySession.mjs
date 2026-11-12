import {BackgroundFloorRecovery} from './backgroundFloorRecovery.mjs';
import {ControlledPoundCandidate,PoundEventLedger,POUND_RECOVERY_REVISION} from './controlledPoundRecovery.mjs';
export {POUND_RECOVERY_REVISION};
const PIXEL_CONFIRMATION_GRACE_SECONDS = .9;
const SUPPLEMENTAL_CONFIRMATION_GRACE_SECONDS = 1.08;
export function createPoundRecoverySession(options){
 return {counter:new ControlledPoundCandidate(options),
  backgroundFloor:options?.backgroundFloorRecovery?new BackgroundFloorRecovery(options):null,
  pixelFloor:options?.pixelFloorEvidence?new ControlledPoundCandidate({guardFirstReturn:true}):null,
  bridgedFloor:options?.cameraFloorBridge?new ControlledPoundCandidate({guardFirstReturn:true}):null,
  scaledFloor:options?.adaptiveRecoveryScale?new ControlledPoundCandidate({guardFirstReturn:true,adaptiveScale:true}):null,
  previousPose:null,
  pendingPixelEvents:[],ledger:new PoundEventLedger(options),measurement:null};
}

function withPixel(candidates,pixel,betweenPasses=false){
 return pixel?[...candidates,{box:pixel.box,score:.02,source:'floor_pixels',betweenPasses}]:candidates;
}
// Shared by recorded diagnostics and the opt-in live test. All proposals refer
// to one captured image; primary state and its floor learning stay independent.
export function updatePoundRecoverySession(recovery,{primaryEvents,candidates,person,time,diameter,deadline=Infinity,measurement=null,context,observations}){
 const cycles=recovery.counter.update(candidates,person,time,diameter,deadline,measurement),confirmed=[];
 const background=recovery.backgroundFloor?.update(context,observations,diameter,deadline)??[];
 for(const [source,events]of [['primary',primaryEvents],['controlled_floor_recovery',cycles],['background_floor_recovery',background]])for(const event of events){
  const accepted=recovery.ledger.add(event,source,time);if(accepted)confirmed.push(accepted);
 }
 if(recovery.pixelFloor){
  const pixel=observations?.floorPixelEvidence;
  const rows=withPixel(candidates,pixel);
  const events=recovery.pixelFloor.update(rows,person,time,diameter,deadline,measurement);
  for(const event of events){
   if(event.floor_evidence==='observed_floor_pixels')recovery.pendingPixelEvents.push(event);
  }
  if(recovery.bridgedFloor){
   const bridge=observations?.floorPixelBridge, shadow=recovery.bridgedFloor;
   const previous=recovery.previousPose;
   for(const row of bridge?.intermediate??[]){
    const at=time+row.offset;
    if(previous&&row.offset<0&&at>previous.time&&at-previous.time<=.2){
     // A between-pass frame carries ball pixels only. Hand ownership can
     // come from model observations on either side of that frame.
     shadow.update(withPixel([],row,true),previous.person,at,diameter,deadline);
    }
   }
   const denseRows=bridge?withPixel(candidates,bridge.evidence):rows;
   for(const event of shadow.update(denseRows,person,time,diameter,deadline,measurement)){
    if(event.between_passes)recovery.pendingPixelEvents.push(event);
   }
   recovery.previousPose={time,person};
  }
  if(recovery.scaledFloor){
   for(const event of recovery.scaledFloor.update(rows,person,time,diameter,deadline,measurement)){
    if(event.rescaled)recovery.pendingPixelEvents.push({...event,floor_evidence:event.floor_evidence??'observed_rescaled_ball_and_feet'});
   }
  }
  // Give the original counters their return window before reporting the same bounce.
  recovery.pendingPixelEvents=recovery.pendingPixelEvents.filter(event=>{
   const delay=event.between_passes||event.rescaled?SUPPLEMENTAL_CONFIRMATION_GRACE_SECONDS:PIXEL_CONFIRMATION_GRACE_SECONDS;
   if(time-event.floor_contact_time_seconds<delay)return true;
   const source=event.between_passes?'between_pass_floor_recovery':event.rescaled?'adaptive_scale_recovery':'pixel_floor_recovery';
   const accepted=recovery.ledger.add(event,source,time);
   if(accepted)confirmed.push(accepted);
   return false;
  });
 }
 recovery.measurement=recovery.counter.measurement;
 return {confirmed,count:recovery.ledger.count,measurement:recovery.measurement};
}
