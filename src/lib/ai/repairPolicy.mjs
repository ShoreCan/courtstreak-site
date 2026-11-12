import {poundCounterOptions} from './poundCore.mjs';
import {POUND_PIXEL_FLOOR_REVISION} from './poundFloorPixels.mjs';
export const REPAIR_REVISION='TRACKING REPAIR 08';
export const POUND_SEARCH_REVISION='POUND SEARCH 01';
const REPAIR_REVISIONS=['TRACKING REPAIR 01','TRACKING REPAIR 02','TRACKING REPAIR 03','TRACKING REPAIR 04','TRACKING REPAIR 05','TRACKING REPAIR 06','TRACKING REPAIR 07',REPAIR_REVISION];
const repairRank=revision=>{
 const rank=REPAIR_REVISIONS.indexOf(revision)+1;
 if(!rank)throw new Error('Unsupported saved repair revision.');
 return rank;
};
const visible=(p,i)=>p?.confidence?.[i]>=.5&&p.xy?.[i]?.every(Number.isFinite);
export function repairObservationPolicy(drillKey,revision=REPAIR_REVISION){
 const rank=repairRank(revision);
 return Object.freeze({revision,asyncPose:true,poseEveryPass:false,
  refreshBallFrame:true,freshAtAdmission:true,nativeCapture:true,floorView:false,cropRevision:'SESSION ROI 01',
  maxPoseAge:.3,maxActivePoseSkew:.3,maxWristSkew:.12,
  poseRequestIntervalSeconds:.12,poseMaximumIntervalSeconds:.22,setupPoseRequestIntervalSeconds:.08,
  ...(rank>=3?{flightAwarePose:true,receiptPoseRequestIntervalSeconds:.09}: {}),
  ...(rank>=6&&drillKey==='right-hand-pound'?{cropRevision:POUND_SEARCH_REVISION}:{}),
  ...(rank>=7&&drillKey==='right-hand-pound'?{pixelFloorRevision:POUND_PIXEL_FLOOR_REVISION}:{}),
  ...(rank>=8&&drillKey==='right-hand-pound'?{cameraFloorBridge:true}:{})});
}

// Keep the crop stable through a bounce. Expand only when current evidence is
// clipped or the ball has been missing longer than a brief detector dropout.
export function poundSearchROI({tracker, person, poseAt, ball, lastBallSeenAt, now, width, height}) {
 const roi = tracker.roi(width, height);
 if (!ball && tracker.missed >= 3 && now - (lastBallSeenAt ?? -Infinity) >= .4) return [0, 0, width, height];

 const [left, top, right] = roi;
 const hand = visible(person, 10) && now >= poseAt && now - poseAt <= .18 ? person.xy[10] : null;
 const diameter = tracker.typical() || 72;
 const handClipped = hand && (hand[0] < left || hand[0] > right || hand[1] < top);
 const box = ball?.box;
 const ballClipped = box && (box[0] < left - diameter * .2 || box[2] > right + diameter * .2 || box[1] < top - diameter * .2);
 if (!handClipped && !ballClipped) return roi;

 const handMargin = diameter * 1.05;
 const ballMargin = diameter * .35;
 const x1 = Math.min(left, hand ? hand[0] - handMargin : left, box ? box[0] - ballMargin : left);
 const x2 = Math.max(right, hand ? hand[0] + handMargin : right, box ? box[2] + ballMargin : right);
 const y1 = Math.min(top, hand ? hand[1] - handMargin : top, box ? box[1] - ballMargin : top);
 return [Math.max(0, Math.floor(x1)), Math.max(0, Math.floor(y1)), Math.min(width, Math.ceil(x2)), height];
}
export function repairConfiguration(base,drillKey,revision=REPAIR_REVISION){
 const rank=repairRank(revision),counterRevision=drillKey==='right-hand-pound'?(rank>=2?'COUNT 10':'COUNT 09'):(rank>=5?'CROSS 15':rank>=4?'CROSS 14':rank>=3?'CROSS 13':'CROSS 12');
 return Object.freeze({...base,id:base.id.replace(/^(COUNT08|CROSS1[12345])/,counterRevision.replaceAll(' ',''))+'/REPAIR0'+rank,
  counterRevision,repairRevision:revision,
  ...(rank>=2&&drillKey==='right-hand-pound'&&base.recoveryRevision?{recoveryOptions:Object.freeze({guardFirstReturn:true,...(rank>=4?{backgroundFloorRecovery:true}:{}),...(rank>=5?{cycleAwareDedup:true,recoverFloorRedirect:true}:{}),...(rank>=7?{pixelFloorEvidence:true}:{}),...(rank>=8?{cameraFloorBridge:true,adaptiveRecoveryScale:true}:{})})}:{}),
  counterOptions:Object.freeze(drillKey==='right-hand-pound'?poundCounterOptions(counterRevision):{...base.counterOptions,gapReceiptRecovery:true,...(rank>=3?{carryReceivingHand:true}:{}),...(rank>=4?{independentRelease:true}:{}),...(rank>=5?{observeRejectedFloor:true}:{})}),
  observationPolicy:repairObservationPolicy(drillKey,revision)});
}
// A recent floor/body anchor can remain useful while a wrist is too old to
// establish possession. Never move or invent wrist coordinates.
export function repairCounterPose(person,poseAt,ballAt,completedAt){
 if(!person||!Number.isFinite(poseAt)||poseAt>ballAt||completedAt-poseAt>.3||ballAt-poseAt>.3)return null;
 if(ballAt-poseAt<=.12)return person;
 const confidence=[...person.confidence];confidence[9]=confidence[10]=0;
 return {...person,confidence,wristEvidence:'stale_masked'};
}
export function repairPoseNeeded({person,poseAt=-Infinity,lastRequestedAt=-Infinity,now,ball,phase}){
 const sinceRequest=now-lastRequestedAt,age=now-poseAt;
 const counting=['active','review'].includes(phase);
 if(sinceRequest<(counting?.12:.08))return false;
 if(!person||!counting||age>=.22)return true;
 if(!ball)return age>=.16;
 const d=Math.sqrt((ball.box[2]-ball.box[0])*(ball.box[3]-ball.box[1]));
 const center=[(ball.box[0]+ball.box[2])/2,(ball.box[1]+ball.box[3])/2];
 return [9,10].some(i=>visible(person,i)&&Math.hypot(center[0]-person.xy[i][0],center[1]-person.xy[i][1])<=d*2.5);
}
// Schedule pose using the last two actual ball observations. Projections are
// used only for scheduling and are never sent to either counter.
export function flightPoseDecision({person, poseAt, lastRequestedAt, now, ball, ballAt, previousBall, poseSeconds, phase, policy, drillKey}) {
 const base = {person, poseAt, lastRequestedAt, now, ball, phase};
 const routine = () => repairPoseNeeded(base) ? 'routine' : null;
 if (!['active', 'review'].includes(phase) || !person || !ball || !Number.isFinite(ballAt)) return routine();

 const age = now - poseAt;
 const sinceRequest = now - (lastRequestedAt ?? -Infinity);
 if (age >= policy.poseMaximumIntervalSeconds) return routine();
 if (now - ballAt > .14 || now < ballAt) return routine();

 const [x1, y1, x2, y2] = ball.box;
 const diameter = Math.sqrt((x2 - x1) * (y2 - y1));
 if (!Number.isFinite(diameter) || diameter <= 0) return routine();
 const x = (x1 + x2) / 2;
 const y = (y1 + y2) / 2;
 const delta = ballAt - (previousBall?.at ?? -Infinity);
 let vx = 0, vy = 0;
 if (delta >= .018 && delta <= .14) {
  const [a, b, c, d] = previousBall.ball.box;
  const scale = Math.sqrt((c - a) * (d - b)) / diameter;
  if (scale >= .7 && scale <= 1.4 && Math.abs(x - (a + c) / 2) <= diameter * 3) {
   vx = (x - (a + c) / 2) / delta;
   vy = (y - (b + d) / 2) / delta;
  }
 }

 const feet = [15, 16].filter(i => visible(person, i));
 const floor = feet.length === 2 ? Math.max(...feet.map(i => person.xy[i][1])) : null;
 const lead = Math.max(.07, Math.min(.13, (poseSeconds || .07) + .033));
 if (floor !== null && vy >= 0 && y2 + vy * (now - ballAt + lead) >= floor - diameter * 1.05) {
  return 'protect_floor';
 }

 if (vy < -diameter && sinceRequest >= policy.receiptPoseRequestIntervalSeconds && age >= .065) {
  const hands = drillKey === 'right-hand-pound' ? [10] : [9, 10];
  const approaching = hands.filter(i => visible(person, i)).some(i => {
   const [wx, wy] = person.xy[i];
   const arrival = (y - wy - diameter * 1.3) / -vy;
   if (arrival > now - ballAt + lead || arrival < -(now - ballAt)) return false;
   return Math.abs(x + vx * Math.max(0, arrival) - wx) <= diameter * 2;
  });
  if (approaching) return 'anticipate_receipt';
 }
 return routine();
}

// Diagnostic-only crop. The paired saved-frame comparison regressed indoors;
// it is deliberately not used by the live candidate.
// Concentrate the same model on the hand-to-floor region. Missing ball/body
// evidence expands the crop, then returns to a full-view reacquisition.
export function repairBallROI({person,ball,diameter,width,height,now,poseAt,lastBallAt,drillKey}){
 if(!person||!Number.isFinite(poseAt)||now-poseAt>.3||!Number.isFinite(lastBallAt)||now-lastBallAt>.25)
  return [0,0,width,height];
 const hands=(drillKey==='right-hand-pound'?[10]:[9,10]).filter(i=>visible(person,i));
 const feet=[15,16].filter(i=>visible(person,i));
 if(!hands.length||feet.length!==2)return [0,0,width,height];
 const d=Number.isFinite(diameter)&&diameter>0?diameter:80;
 const gap=Math.max(0,now-lastBallAt),margin=d*(1.3+gap*5);
 const xs=hands.map(i=>person.xy[i][0]),ys=hands.map(i=>person.xy[i][1]);
 if(ball){xs.push(ball.box[0],ball.box[2]);ys.push(ball.box[1]);}
 const left=Math.max(0,Math.floor(Math.min(...xs)-margin)),right=Math.min(width,Math.ceil(Math.max(...xs)+margin));
 const top=Math.max(0,Math.floor(Math.min(...ys)-d*1.2));
 const bottom=Math.min(height,Math.ceil(Math.max(...feet.map(i=>person.xy[i][1]))+d*1.2));
 if(right-left<d*2||bottom-top<d*2)return [0,0,width,height];
 return [left,top,right,bottom];
}
