// A failed camera check must have an end. This is a usability budget, not
// permission to start with inadequate observations or a slower speed gate.
export const SETUP_ATTEMPT_REVISION='SETUP LIMIT 01';
export const SETUP_LIMIT_SECONDS=30;
export const MODEL_LOADING_LIMIT_SECONDS=45;

export function setupBlockerKey(checks={},speedReady=false,lockReady=false){
 if(checks.refreshingBody)return 'freshness';
 if(!checks.body||!checks.hand||!checks.floor)return 'framing';
 if(!checks.ball||!checks.owned||checks.issue==='ball-edge'||!lockReady)return 'ball';
 if(!speedReady)return 'speed';
 return checks.valid?'ready':'framing';
}

export function setupRecovery(key){
 if(key==='speed')return {key,title:'Your position is good.',message:'Tracking is processing too slowly on this phone. Keep the phone still; moving it will not improve processing speed.'};
 if(key==='freshness')return {key,title:'Waiting for fresh camera frames.',message:'Keep this page open and the phone still. The tracker needs a fresh camera check before Go.'};
 if(key==='ball')return {key,title:'Your frame is ready.',message:'Hold the basketball clear of your torso, with your wrists visible. Keep the phone where it is.'};
 if(key==='ready')return {key,title:'Confirming your position.',message:'Keep holding the ball. The countdown starts when the checks stay ready.'};
 return {key:'framing',title:'Check the camera preview.',message:'Use the instruction above to adjust your view. The phone can be on a stable, angled support; it does not have to be high up.'};
}

export class SetupAttempt {
 constructor(startedAt){this.startedAt=startedAt;this.lastAt=startedAt;this.lastKey=null;this.seconds={};this.latest=null;}
 update(now,checks,speedReady,lockReady){
  if(!Number.isFinite(now)||now<this.lastAt)return this.snapshot(this.lastAt);
  if(this.lastKey)this.seconds[this.lastKey]=(this.seconds[this.lastKey]??0)+now-this.lastAt;
  this.lastAt=now;this.lastKey=setupBlockerKey(checks,speedReady,lockReady);
  this.latest={...checks};return this.snapshot(now);
 }
 snapshot(now){
  const elapsed=Math.max(0,now-this.startedAt),expired=elapsed>=SETUP_LIMIT_SECONDS;
  // Show the current issue, rather than blaming a body check that failed
  // earlier while the player was walking into position.
  const key=this.lastKey??'freshness';
  return {revision:SETUP_ATTEMPT_REVISION,elapsed,limitSeconds:SETUP_LIMIT_SECONDS,expired,key,seconds:{...this.seconds},...setupRecovery(key)};
 }
}
