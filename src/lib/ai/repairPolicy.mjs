import {poundCounterOptions} from './poundCore.mjs';
export const REPAIR_REVISION='TRACKING REPAIR 02';
const repairRank=revision=>{
 if(!['TRACKING REPAIR 01',REPAIR_REVISION].includes(revision))throw new Error('Unsupported saved repair revision.');
 return revision===REPAIR_REVISION?2:1;
};
const visible=(p,i)=>p?.confidence?.[i]>=.5&&p.xy?.[i]?.every(Number.isFinite);
export function repairObservationPolicy(drillKey,revision=REPAIR_REVISION){
 repairRank(revision);
 return Object.freeze({revision,asyncPose:true,poseEveryPass:false,
  refreshBallFrame:true,freshAtAdmission:true,nativeCapture:true,floorView:false,cropRevision:'SESSION ROI 01',
  maxPoseAge:.3,maxActivePoseSkew:.3,maxWristSkew:.12,
  poseRequestIntervalSeconds:.12,poseMaximumIntervalSeconds:.22,setupPoseRequestIntervalSeconds:.08});
}
export function repairConfiguration(base,drillKey,revision=REPAIR_REVISION){
 const rank=repairRank(revision),counterRevision=drillKey==='right-hand-pound'?(rank===2?'COUNT 10':'COUNT 09'):'CROSS 12';
 return Object.freeze({...base,id:base.id.replace(/^(COUNT08|CROSS11)/,counterRevision.replaceAll(' ',''))+'/REPAIR0'+rank,
  counterRevision,repairRevision:revision,
  ...(rank===2&&drillKey==='right-hand-pound'&&base.recoveryRevision?{recoveryOptions:Object.freeze({guardFirstReturn:true})}:{}),
  counterOptions:Object.freeze(drillKey==='right-hand-pound'?poundCounterOptions(counterRevision):{...base.counterOptions,gapReceiptRecovery:true}),
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
