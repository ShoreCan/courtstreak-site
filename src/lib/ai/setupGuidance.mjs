import { cameraReadiness } from './cameraReadiness.mjs';

// Presentation only. Raw, fresh checks still decide readiness and counting.
export const SETUP_GUIDANCE_REVISION = 'SETUP 08';
export const SETUP_HELP_SECONDS = 12;

export function setupCondition(checks, speedReady, lockReady, {handMode='right'}={}) {
  // Acquiring/calibrating the ball can use either visible hand. Before the
  // countdown, confirm the right hand used by the right-pound validator.
  const rightHandChecks = handMode==='right' && checks.valid && checks.rightHand === false
    ? {...checks, valid:false, message:'Hold the ball in your right hand, in view.'}
    : checks;
  return cameraReadiness(rightHandChecks, speedReady, lockReady);
}

function setupInstructionDetails(checks, speedReady, lockReady, condition, {handMode='right'}={}) {
  if (checks.refreshingBody) return {key:'refresh', stage:'frame', title:'Keep your position.', message:'Rechecking your view. You do not need to move.'};
  if (!checks.body || !checks.hand || !checks.floor) return {
    key:checks.cue || checks.issue || condition.message, stage:'frame', title:'Let’s check your view.', message:condition.message,
  };
  if (!checks.ball) return {key:'ball', stage:'ball', title:'Show your basketball.', message:handMode==='either'?'Your framing is good. Hold the ball in either hand, clear of your torso.':'Your framing is good. Hold the ball beside your right hip, clear of your torso.'};
  if (checks.issue==='ball-edge') return {key:'ball-edge',stage:'ball',title:'Keep the ball in view.',message:condition.message};
  if (!checks.owned || (handMode==='right'&&checks.rightHand === false)) return {key:'hand', stage:'ball', title:handMode==='either'?'Hold the ball in one hand.':'Ball in your right hand.', message:handMode==='either'?'Hold the ball in either visible hand.':'Hold the ball in your right hand, in view.'};
  if (!lockReady) return {key:'lock', stage:'ball', title:'Basketball found.', message:'Hold it comfortably while we confirm your ball.'};
  if (!speedReady) return {key:'speed', stage:'ready', title:'You’re in position.', message:'Checking tracking speed. Keep the phone still.'};
  return {key:'ready', stage:'ready', title:'You’re ready.', message:handMode==='either'?'Hold the ball in either hand. Your countdown starts automatically.':'Keep the ball in your right hand. Your countdown starts automatically.'};
}

const screenWords=Object.freeze({'find-body':'Finding your position','center-body':'Center yourself','step-back':'Step back a little','look-at-phone':'A glance toward the phone','move-closer':'Move a little closer','both-wrists':'Both wrists in view','right-wrist':'Right wrist in view','show-feet':'Both feet in view','tilt-down':'Tilt down slightly','tilt-up':'Tilt up slightly','show-ball':'Finding your ball','center-ball':'Bring the ball inward','hold-ball':'Ball by your side','hold-position':'Hold comfortably'});
export function setupInstruction(checks,speedReady,lockReady,condition,options){
 const next=setupInstructionDetails(checks,speedReady,lockReady,condition,options);
 const states={refresh:'Checking body tracking',speed:'Checking tracking speed',lock:'Locking onto the ball',ready:'Starting countdown'};
 if(states[next.key])return {...next,screenText:states[next.key]};
 const cue=['refresh','speed','ready','lock'].includes(next.key)?'hold-position':next.key==='hand'?'hold-ball':next.key==='ball'?'show-ball':checks.cue;
 return {...next,screenText:screenWords[cue]||'Hold comfortably'};
}

export const CALM_SETUP_START={key:'checking',stage:'frame',title:'Checking your view.',screenText:'Finding your position',message:'Hold the ball comfortably while we check your framing.'};

// A single missed landmark must not send a new instruction to someone who is
// already correctly positioned. This does not retain stale detector evidence.
export class SetupGuidance {
  constructor(delay=.45,{minimumHold=0,initial=null}={}) { this.delay=delay;this.minimumHold=minimumHold;this.current=initial;this.changedAt=null;this.pending=null;this.since=null; }
  update(now, next) {
    if (!this.current) this.current=next;
    this.changedAt??=now;
    // Let the next actual body observation confirm or contradict the cue.
    // Resetting its debounce on every queued refresh otherwise prevents a
    // 400ms pose worker from ever displaying a stable framing instruction.
    if(next.key==='refresh')return this.current;
    if (this.current.key === next.key) { this.current=next; this.pending=null; this.since=null; return this.current; }
    if (this.pending?.key !== next.key) { this.pending=next; this.since=now; }
    const positive=['ready','lock','speed'].includes(next.key),delay=positive?Math.min(this.delay,.45):this.delay;
    if (now-this.since >= delay && (positive||now-this.changedAt>=this.minimumHold)) { this.current=this.pending;this.changedAt=now;this.pending=null;this.since=null; }
    return this.current;
  }
}

// Approach-to-camera samples are not calibration for the final phone setup.
// Begin calibration once the player is framed; re-arm after sustained framing
// loss, while tolerating brief landmark flicker and queued body work.
export class FramedCalibration {
  constructor() { this.armed=false; this.lostAt=null; }
  update(now, framed, refreshing=false) {
    if (refreshing) return false;
    if (!framed) { this.lostAt??=now; if(now-this.lostAt>=1.5)this.armed=false; return false; }
    this.lostAt=null;
    if(this.armed)return false;
    this.armed=true;return true;
  }
}

// Every pre-Go consumer must use the same origin when a countdown pauses or
// the detector completes after its frame was captured. In particular, the
// control validator's hand-before/hand-after context cannot keep the old time.
export function shiftPreGoTimeline(state, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  for (const point of state.counter.points) point.timestamp-=seconds;
  for (const context of state.validator.context) context.time-=seconds;
}
