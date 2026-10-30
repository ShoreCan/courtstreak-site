import {ReadinessClock,BALL_LOCK_GRACE_SECONDS} from './cameraReadiness.mjs';
import {setupCondition} from './setupGuidance.mjs';

export const SETUP_TIMING_REVISION='SETUP CLOCK 01';
export const SETUP_REFRESH_BRIDGE_SECONDS=.65;

// A queued body refresh is not an observed change in the player's position.
// Bridge only this short scheduling gap after a fully verified check, while
// the live ball, calibrated identity and throughput remain healthy. The result
// is never "ready" until fresh body/wrist evidence returns. Active rep checks
// and pose freshness limits do not use this clock.
export class SetupReadinessClock {
 constructor(options={}){this.options=options;this.clock=new ReadinessClock();this.lastVerifiedAt=-Infinity;}
 reset(now=null,{retainPosition=false}={}){
  this.clock.reset(now);
  if(!retainPosition)this.lastVerifiedAt=-Infinity;
 }
 update(now,checks,speedReady,lockReady){
  const condition=setupCondition(checks,speedReady,lockReady,this.options);
  if(condition.valid)this.lastVerifiedAt=now;
  else if(!checks.refreshingBody||!checks.ball||!speedReady||!lockReady)this.lastVerifiedAt=-Infinity;
  const refreshExpired=checks.refreshingBody===true&&Number.isFinite(this.lastVerifiedAt)&&now-this.lastVerifiedAt>=BALL_LOCK_GRACE_SECONDS;
  if(refreshExpired)this.reset(now);
  const refreshBridged=!condition.valid&&checks.refreshingBody===true&&checks.ball&&speedReady&&lockReady&&
   now>=this.lastVerifiedAt&&now-this.lastVerifiedAt<SETUP_REFRESH_BRIDGE_SECONDS;
  const result=this.clock.update(now,condition.valid||refreshBridged,condition);
  if(result.reset&&!condition.valid)this.lastVerifiedAt=-Infinity;
  const ready=result.ready&&condition.valid;
  // Pending fresh verification must keep every pre-Go counter sample negative.
  // A wall-time countdown can reach its end between two body observations.
  const countdownElapsed=Math.min(ready?5:4.999,result.elapsed);
  return {...result,reset:result.reset||refreshExpired,ready,ticking:result.ready,countdownElapsed,
   refreshBridged:!!refreshBridged,condition};
 }
}
