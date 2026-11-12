import {BackgroundFloorRecovery} from './backgroundFloorRecovery.mjs';
import {ControlledPoundCandidate,PoundEventLedger,POUND_RECOVERY_REVISION} from './controlledPoundRecovery.mjs';
export {POUND_RECOVERY_REVISION};
const PIXEL_CONFIRMATION_GRACE_SECONDS = .9;
export function createPoundRecoverySession(options){
 return {counter:new ControlledPoundCandidate(options),
  backgroundFloor:options?.backgroundFloorRecovery?new BackgroundFloorRecovery(options):null,
  pixelFloor:options?.pixelFloorEvidence?new ControlledPoundCandidate({guardFirstReturn:true}):null,
  pendingPixelEvents:[],ledger:new PoundEventLedger(options),measurement:null};
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
  const rows=pixel?[...candidates,{box:pixel.box,score:.02,source:'floor_pixels'}]:candidates;
  const events=recovery.pixelFloor.update(rows,person,time,diameter,deadline,measurement);
  for(const event of events){
   if(event.floor_evidence==='observed_floor_pixels')recovery.pendingPixelEvents.push(event);
  }
  // Give the original counters their return window before reporting the same bounce.
  recovery.pendingPixelEvents=recovery.pendingPixelEvents.filter(event=>{
   if(time-event.floor_contact_time_seconds<PIXEL_CONFIRMATION_GRACE_SECONDS)return true;
   const accepted=recovery.ledger.add(event,'pixel_floor_recovery',time);
   if(accepted)confirmed.push(accepted);
   return false;
  });
 }
 recovery.measurement=recovery.counter.measurement;
 return {confirmed,count:recovery.ledger.count,measurement:recovery.measurement};
}
