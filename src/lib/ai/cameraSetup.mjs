import { geometry } from './poundCore.mjs';

export const CAMERA_SETUP_REVISION = 'CAMERA 05';
export const POSITION_CONFIRM_SECONDS = .9;

// Setup framing is separate from rep validation. A wide stance or a small
// held-ball adjustment is allowed; the body, feet, right wrist and ball still
// have to be visible, and a visible hand must be holding the selected ball.
export function evaluateCameraSetup(person, ball, w, h, {handMode='right'}={}) {
  const r = { body:false, hand:false, ball:!!ball, floor:false, owned:false, rightHand:false, valid:false, message:'' };
  if (!person) { r.message='Looking for your body. Face the camera with your basketball visible.'; return r; }
  const visible = (i, confidence=.2) => person.confidence[i]>=confidence &&
    person.xy[i][0]>0 && person.xy[i][0]<w && person.xy[i][1]>0 && person.xy[i][1]<h;
  const b=person.box, ph=b[3]-b[1], pw=b[2]-b[0];
  r.body=pw>=w*.10 && ph>=h*.28 && ph<=h*.98 &&
    b[0]>=-w*.02 && b[2]<=w*1.02 && b[1]>=-h*.02 && b[3]<=h*1.02 && visible(0);
  r.hand=visible(10,.22) && (handMode!=='both'||visible(9,.22)) && [5,6,11,12].filter(i=>visible(i)).length>=3;
  const feet=[15,16].filter(i=>visible(i));
  r.floor=feet.length===2 && Math.max(...feet.map(i=>person.xy[i][1]))<h*.92 &&
    Math.min(...feet.map(i=>person.xy[i][1]))>h*.35;
  if (!r.body) {
    r.message = b[0]<-w*.02 || b[2]>w*1.02 ? 'Your body reaches the side of the picture. Move toward the center of the preview.' :
      b[1]<-h*.02 || b[3]>h*1.02 || ph>h*.98 ? 'Your body reaches the top or bottom of the picture. Adjust the phone angle or step back slightly.' :
      !visible(0) ? 'Your face is not clear to the camera. Look toward the phone briefly; keep your position.' :
      'Your body looks small in the picture. Tilt the phone to center yourself; move closer only if you still look small.';
    return r;
  }
  if (!r.hand) { r.message=handMode==='both'?'Keep both wrists and your torso visible':'Keep your right wrist and torso visible'; return r; }
  if (!r.floor) {
    r.message=feet.length<2 ? 'Both feet are not clearly detected. Keep them visible and uncrossed.' :
      Math.max(...feet.map(i=>person.xy[i][1]))>=h*.92 ? 'Your feet are near the bottom edge. Tilt the phone down slightly to include floor below them.' :
      'There is a lot of floor below you. Tilt the phone up slightly to center your body.';
    return r;
  }
  if (!ball) { r.message='Body framing is good. Rechecking the basketball; hold it clear of your torso.'; return r; }
  const g=geometry(ball), radius=g.diameter/2;
  if (g.center[0]-radius<w*.055 || g.center[0]+radius>w*.945) { r.issue='ball-edge'; r.message='The basketball is near the side edge. Bring it toward the center of the preview.'; return r; }
  r.owned=[9,10].filter(i=>visible(i)).some(i=>Math.hypot(g.center[0]-person.xy[i][0],g.center[1]-person.xy[i][1])<=Math.max(110,g.diameter*2.3));
  r.rightHand=visible(10,.22) && Math.hypot(g.center[0]-person.xy[10][0],g.center[1]-person.xy[10][1])<=Math.max(110,g.diameter*2.3);
  if (!r.owned) { r.message='Hold the basketball in either hand to confirm ball lock'; return r; }
  r.valid=true; r.message='Good position. Hold the ball comfortably'; return r;
}

export class CameraPositionGate {
  constructor() { this.reset(); }
  reset() { this.since=null; }
  update(now, checks, ball, tracker, performanceReady) {
    if (!checks.valid || !ball || !performanceReady || !tracker.ready()) { this.reset(); return 0; }
    this.since ??= now;
    return Math.min(1,(now-this.since)/POSITION_CONFIRM_SECONDS);
  }
}
