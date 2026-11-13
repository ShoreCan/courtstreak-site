import {SetupReadinessClock} from './setupReadiness.mjs';
import {SETUP_GRACE_SECONDS} from './cameraReadiness.mjs';

export const COUNTDOWN_READINESS_REVISION='COUNTDOWN 01';
export const BALL_BRIDGE_COUNTDOWN_REVISION='COUNTDOWN 02';
export const TRACKING_CHECK_COUNTDOWN_REVISION='COUNTDOWN 03';

// Setup establishes the initial framing/ball reference. Once the countdown
// begins, detector interruptions pause it; they do not send the player through
// setup again. Fresh checks must still pass before Go. No stale frame can
// authorize a round, and unobserved wall time is never added to the countdown.
export class CountdownReadinessClock{
 constructor(options={}){this.verification=new SetupReadinessClock(options);this.revision=options.trackingCheck?TRACKING_CHECK_COUNTDOWN_REVISION:options.bridgeBallDropouts?BALL_BRIDGE_COUNTDOWN_REVISION:COUNTDOWN_READINESS_REVISION;this.reset();}
 reset(now=null){this.verification.reset(now);this.elapsed=0;this.lastAt=now;this.wasTicking=false;this.last=null;}
 update(now,checks,speedReady,lockReady,trackingReady=true){
  if(!Number.isFinite(now)||(this.lastAt!==null&&now<this.lastAt))return {...this.last,ready:false,ticking:false,reset:false,clockError:true,countdownElapsed:Math.min(4.999,this.elapsed)};
  const result=this.verification.update(now,checks,speedReady,lockReady);
  const gap=this.lastAt===null?0:now-this.lastAt;
  if(gap>0&&gap<SETUP_GRACE_SECONDS&&result.ticking&&this.wasTicking)this.elapsed=Math.min(5,this.elapsed+gap);
  this.lastAt=now;this.wasTicking=result.ticking;
  const ready=result.ready&&trackingReady;
  this.last={...result,ready,verificationReset:result.reset,reset:false,elapsed:this.elapsed,
   countdownElapsed:Math.min(ready?5:4.999,this.elapsed)};
  return this.last;
 }
}
