import {ControlledPoundCandidate,PoundEventLedger,POUND_RECOVERY_REVISION} from './controlledPoundRecovery.mjs';
export {POUND_RECOVERY_REVISION};
export function createPoundRecoverySession(){return {counter:new ControlledPoundCandidate(),ledger:new PoundEventLedger(),measurement:null};}
// Shared by recorded diagnostics and the opt-in live test. All proposals refer
// to one captured image; primary state and its floor learning stay independent.
export function updatePoundRecoverySession(recovery,{primaryEvents,candidates,person,time,diameter,deadline=Infinity}){
 const cycles=recovery.counter.update(candidates,person,time,diameter,deadline),confirmed=[];
 for(const [source,events]of [['primary',primaryEvents],['controlled_floor_recovery',cycles]])for(const event of events){
  const accepted=recovery.ledger.add(event,source,time);if(accepted)confirmed.push(accepted);
 }
 recovery.measurement=recovery.counter.measurement;
 return {confirmed,count:recovery.ledger.count,measurement:recovery.measurement};
}
