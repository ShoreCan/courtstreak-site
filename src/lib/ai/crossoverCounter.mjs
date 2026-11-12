export const CROSSOVER_COUNTER_REVISION='CROSS 04';
export const CROSSOVER_TEST_REVISION='CROSSOVER TEST 10';
export const CROSSOVER_RULE='controlled hand → observed floor bounce → opposite hand under control';
export const CROSSOVER_FINISH_WINDOW_SECONDS=.15;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const opposite=hand=>hand==='right'?'left':'right';
const visible=(p,index)=>p&&p.confidence[index]>=.22&&p.xy[index]?.every(Number.isFinite)&&p.xy[index][0]>0&&p.xy[index][1]>0;

function observation(frame,measurement,person,time){
 const row={frame,time,measurement:measurement?[...measurement]:null,owner:null,feetY:null};
 if(visible(person,15)&&visible(person,16))row.feetY=Math.max(person.xy[15][1],person.xy[16][1]);
 if(!measurement||!measurement.every(Number.isFinite)||measurement[2]<=0)return row;
 const hands=[['left',9],['right',10]].filter(([,index])=>visible(person,index)).map(([hand,index])=>({hand,wrist:[...person.xy[index]],distance:distance(measurement,person.xy[index])/measurement[2]})).sort((a,b)=>a.distance-b.distance);
 // A position between two indistinguishable wrists is not a verified receipt.
 if(hands[0]?.distance<=1.35&&(hands.length===1||hands[1].distance-hands[0].distance>=.2))row.owner=hands[0];
 return row;
}

// This pilot follows possession, a floor turn and the receiving hand. It does
// not count midline crossings, use knee height, or infer a bounce from a pass.
export class CrossoverCounter {
 constructor({legacy=false,sizeOutlierRecovery=false,preFloorSizeRecovery=false,releaseSizeRecovery=false,nearFloorRelease=false,reanchorAfterGap=false,stableReleaseSize=false,ignoreOneOversizedSample=false,finishWindowSeconds=0,gapReceiptRecovery=false,carryReceivingHand=false,independentRelease=false}={}){Object.assign(this,{independentRelease,carryReceivingHand,gapReceiptRecovery,legacy,sizeOutlierRecovery,preFloorSizeRecovery,releaseSizeRecovery,nearFloorRelease,reanchorAfterGap,stableReleaseSize,ignoreOneOversizedSample,finishWindowSeconds});this.frame=0;this.count=0;this.points=[];this.context=[];this.confirmed=[];this.rejected=[];this.pending=[];this.held=null;this.flight=null;this.proposalsThisFrame=[];this.lastDecision='waiting_for_hand';}
 reject(reason,row){
  if(this.flight)this.rejected.push({from_hand:this.flight.source.owner.hand,event_frame:row.frame,event_time_seconds:row.time,control_status:reason,floor_contact_time_seconds:this.flight.floor?.time??null});
  this.flight=null;this.held=null;this.pending=[];this.lastDecision=reason;
 }
 begin(source,row){
  let diameter=source.measurement[2];
  if(this.stableReleaseSize){
   const sizes=this.context.filter(p=>p.time<source.time&&source.time-p.time<=.35&&p.owner?.hand===source.owner.hand).slice(-5).map(p=>p.measurement[2]).sort((a,b)=>a-b);
   if(sizes.length>=3){
    const reference=sizes[Math.floor(sizes.length/2)];
    const consistent=sizes.at(-1)/sizes[0]<=1.35||(this.ignoreOneOversizedSample&&sizes.length>=4&&sizes.at(-2)/sizes[0]<=1.35);
    if(consistent&&diameter/reference>=.45&&diameter/reference<.80)diameter=reference;
   }
  }
  this.flight={source,diameter,last:source,peak:source,floor:null,receiving:[],sourceReturns:[],lastSeen:source.time};
  this.pending=[{from_hand:source.owner.hand,started_at:source.time}];
  this.lastDecision='following_release';
 }
 // Start from newly observed control after an unsuccessful cycle. The next
 // flight gets its own release, floor, and receipt history.
 startFromReacquiredHand(reacquired, row, canStartFlight) {
  const {best, control} = reacquired;
  if (!this.independentRelease || !canStartFlight || control !== 'receiving_hand_redirect' ||
      !best || row.owner?.hand !== best.owner.hand ||
      row.measurement[1] - best.measurement[1] < best.measurement[2] * .2) return false;
  this.begin(best, row);
  this.flight.last = this.flight.peak = row;
  this.flight.lastSeen = row.time;
  return true;
 }
 canAwaitGapReceipt(now){
  const f=this.flight;
  return this.gapReceiptRecovery&&f?.floor&&now-f.lastSeen<=.35&&now-f.floor.time<=.55&&now-f.source.time<=1.2;
 }
 canReconnectReceipt(row){
  const f=this.flight,d=f?.diameter,m=row.measurement;
  return this.canAwaitGapReceipt(row.time)&&m&&row.owner?.hand===opposite(f.source.owner.hand)&&row.owner.distance<=1.15&&
   m[2]/d>=.65&&m[2]/d<=1.5&&m[1]<=f.floor.measurement[1]-d*.25&&Math.abs(m[0]-f.floor.measurement[0])<=d*3;
 }
 snapshot(){return {phase:this.flight?.floor?'awaiting_opposite_hand':this.flight?'following_flight':this.held?'hand_controlled':'waiting_for_hand',sourceHand:this.flight?.source.owner.hand??this.held?.owner.hand??null,floorTime:this.flight?.floor?.time??null,decision:this.lastDecision};}
 update(_proposals,measurement,person,now,deadline=Infinity){
  this.proposalsThisFrame=[];
  if(!Number.isFinite(now)||now<=(this.context.at(-1)?.time??-Infinity))return [];
  const row=observation(++this.frame,measurement,person,now);
  this.points.push({frame:this.frame,timestamp:now,y:measurement?.[1]??null,diameter:measurement?.[2]??null,observed:!!measurement});
  this.context.push(row);this.context=this.context.slice(-96);
  if(now<0){this.held=row.owner?row:null;this.flight=null;this.pending=[];return [];}
  const canStartFlight=!this.finishWindowSeconds||now<deadline;
  if(!canStartFlight&&!this.flight)return [];
  if(!row.measurement){
   if(this.reanchorAfterGap&&this.flight&&!this.flight.floor)this.flight.preFloorObservationGap=true;
   if(this.flight&&now-this.flight.lastSeen>.25){if(this.canAwaitGapReceipt(now))this.lastDecision='awaiting_gap_receipt';else this.reject('rejected_tracking_gap',row);}
   if(this.held&&now-this.held.time>.65)this.held=null;
   return [];
  }
  if(!this.flight){
   // An oversized release box can overlap the releasing wrist. Preserve the
   // previous ball scale and use the new center only as a release cue.
   const held=this.held;
   if(this.releaseSizeRecovery&&held&&row.owner?.hand===held.owner.hand&&
    now-held.time<=.25&&row.measurement[2]>held.measurement[2]*1.5&&
    row.measurement[1]-held.measurement[1]>=held.measurement[2]){
    this.begin(held,row);
    this.flight.lastSeen=now;
    this.flight.preFloorSizeGap=true;
    return [];
   }
   // The free hand can be nearer during the downward crossing. Retain the
   // releasing hand until a bounce and controlled return verify a transfer.
   const descendingChange=!this.legacy&&this.held&&row.owner&&row.owner.hand!==this.held.owner.hand&&
    now-this.held.time<=.65&&row.measurement[1]>=this.held.measurement[1]-this.held.measurement[2]*.1;
   // A wrist can follow the ball down without still controlling it. Start
   // the flight from the last held sample when the tracked ball nears the floor.
   const descendingNearFloor=this.nearFloorRelease&&held&&row.feetY!==null&&
    row.measurement[2]>=held.measurement[2]*.85&&
    row.measurement[1]-held.measurement[1]>=held.measurement[2]*.2&&
    row.measurement[1]+row.measurement[2]*.5>=row.feetY-row.measurement[2]*.65;
   if(row.owner&&!descendingChange&&!descendingNearFloor){this.held=row;this.lastDecision='hand_controlled';return [];}
   if(!this.held||now-this.held.time>.65){this.held=null;return [];}
   const d=this.held.measurement[2];
   if(row.measurement[1]-this.held.measurement[1]<d*.2)return [];
   this.begin(this.held,row);
  }
  const flight=this.flight,d=flight.diameter;
  if(now-flight.lastSeen>.25){
   if(!this.canReconnectReceipt(row)){
    if(this.canAwaitGapReceipt(now)&&!row.owner){this.lastDecision='awaiting_gap_receipt';return [];}
    this.reject('rejected_tracking_gap',row);this.held=row.owner?row:null;return [];
   }
   flight.reconnectedAfterGap=true;
  }
  if(now-flight.source.time>1.8){this.reject('rejected_uncontrolled_flight',row);this.held=row.owner?row:null;return [];}
  if(row.measurement[2]/d<.65||row.measurement[2]/d>1.5){
   if(!this.sizeOutlierRecovery||(!flight.floor&&!this.preFloorSizeRecovery)){this.reject('rejected_ball_size_change',row);this.held=null;return [];}
   // A partial or false box cannot establish a floor turn or hand receipt.
   // Treat its geometry as missing, including during descent. Keep the existing
   // 250ms observation limit; a later observed floor turn and control are still
   // required. Historical CROSS 03 only permits this after a verified turn.
   row.measurement=null;row.owner=null;
   if(!flight.floor)flight.preFloorSizeGap=true;
   Object.assign(this.points.at(-1),{observed:false,y:null,diameter:null,ignoredReason:'ball_size_outlier'});
   if(now-flight.lastSeen>.25)this.reject('rejected_ball_size_change',row);
   else this.lastDecision='waiting_for_consistent_ball_size';
   return [];
  }
  if(this.reanchorAfterGap&&!flight.floor&&now-flight.lastSeen>=.12)flight.preFloorObservationGap=true;
  flight.lastSeen=now;
  if(row.measurement[1]>flight.peak.measurement[1])flight.peak=row;
  const peak=flight.peak;
  if(!flight.floor&&peak.feetY!==null&&peak.time>flight.source.time&&now>peak.time){
   const scale=peak.measurement[2],bottom=peak.measurement[1]+scale*.5;
   const down=peak.measurement[1]-flight.source.measurement[1],up=peak.measurement[1]-row.measurement[1];
   // Ankle/ball geometry is a floor-contact proxy, not a hand-height rule.
   const nearFloor=bottom>=peak.feetY-scale*.65&&bottom<=peak.feetY+scale*1.6;
   if(nearFloor&&down>=scale*.35&&up>=scale*.25){
    flight.floor=peak;this.lastDecision='floor_turn_observed';
    this.proposalsThisFrame.push({event_frame:peak.frame,event_timestamp_exact:peak.time,event_time_seconds:peak.time,from_hand:flight.source.owner.hand,validation_path:'crossover_floor_turn',bottom_center_y:peak.measurement[1],ball_scale_pixels:scale});
   }
  }
  let secondBounce=false;
  if(flight.floor){
   flight.returnHigh=Math.min(flight.returnHigh??row.measurement[1],row.measurement[1]);
   const bottom=row.measurement[1]+row.measurement[2]*.5;
   // A second trip to the floor without a verified receipt is a loose ball.
   secondBounce=row.feetY!==null&&row.measurement[1]-flight.returnHigh>=d*.5&&bottom>=row.feetY-d*.65;
   if(this.legacy&&secondBounce){
    this.reject('rejected_second_bounce_without_receipt',row);this.held=row.owner?row:null;return [];
   }
  }
  const sourceHand=flight.source.owner.hand;
  if(row.owner?.hand===sourceHand){
   // Wrist proximity at the beginning of a release is not a completed return.
   if(flight.floor){
    if(this.legacy){this.reject('rejected_same_hand_return',row);this.held=row;return [];}
    flight.sourceReturns.push(row);flight.sourceReturns=flight.sourceReturns.slice(-8);
   }
   if(now-flight.source.time<.2){flight.last=row;return [];}
  }
  if(row.owner?.hand===opposite(sourceHand)){
   if(!flight.floor&&this.legacy){this.reject('rejected_no_floor_bounce',row);this.held=row;return [];}
   if(flight.floor){flight.receiving.push(row);flight.receiving=flight.receiving.slice(-8);}
  }
  const receipt=samples=>{
   const best=samples.filter(r=>r.owner.distance<=1.15).sort((a,b)=>a.owner.distance-b.owner.distance)[0];
   let control=null;
   if(best){
   const controlled=samples.some(prior=>{
    if(prior===row||!row.owner||row.owner.hand!==prior.owner.hand||row.time-prior.time<.04||row.time-prior.time>.2)return false;
    const motion=distance(row.measurement,prior.measurement),wristMotion=distance(row.owner.wrist,prior.owner.wrist);
    const relativeBefore=prior.measurement.slice(0,2).map((v,i)=>v-prior.owner.wrist[i]),relativeNow=row.measurement.slice(0,2).map((v,i)=>v-row.owner.wrist[i]);
    return distance(relativeBefore,relativeNow)<=d*.3&&(motion<=d*.5||wristMotion>=d*.2);
   });
   const redirected=now>best.time&&now-best.time<=.25&&row.measurement[1]-best.measurement[1]>=d*.18;
   if(controlled)control='observed_hand_control';
   else if(redirected)control='receiving_hand_redirect';
   }
   return {best,control};
  };
  if(this.preFloorSizeRecovery&&(flight.preFloorSizeGap||flight.preFloorObservationGap)&&!flight.floor){
   // If the bounce was never observed, do not carry the old releasing hand
   // into the next dribble. Reacquire verified possession without awarding a
   // rep. A later crossover must establish its own observed floor turn.
   if(row.owner?.hand===opposite(sourceHand))flight.unverifiedReceiving=[...(flight.unverifiedReceiving??[]),row].slice(-8);
   const reacquired=receipt(flight.unverifiedReceiving??[]);
   if(reacquired.control){
    this.reject('rejected_no_floor_bounce',row);this.held=row.owner?row:reacquired.best;
    if(this.startFromReacquiredHand(reacquired,row,canStartFlight))return [];
    if(canStartFlight&&!row.owner&&row.measurement[1]-reacquired.best.measurement[1]>=d*.2){this.begin(reacquired.best,row);this.flight.last=row;this.flight.peak=row;this.flight.lastSeen=now;}
    return [];
   }
  }
  const {best,control}=receipt(flight.receiving);
  if(control){
   const afterTime=best.time>=deadline;
   const buzzerFinish=afterTime&&this.finishWindowSeconds>0&&now<=deadline+this.finishWindowSeconds&&flight.source.time<deadline&&flight.floor.time<deadline;
   if(afterTime&&!buzzerFinish){this.reject('rejected_after_deadline',row);this.held=row.owner?row:null;return [];}
   const event={count:++this.count,event_frame:best.frame,event_timestamp_exact:best.time,event_time_seconds:+best.time.toFixed(3),floor_contact_time_seconds:flight.floor.time,release_time_seconds:flight.source.time,from_hand:sourceHand,to_hand:opposite(sourceHand),validation_path:'controlled_crossover',control_evidence:control,control_status:'confirmed',receiving_hand_distance_ball_diameters:best.owner.distance};
   if(buzzerFinish)event.finished_after_time=true;
   this.confirmed.push(event);this.flight=null;this.pending=[];this.held=best;this.lastDecision='controlled_crossover';
   // A fast receiving hand can already have launched the following crossover.
   // The receiving wrist can follow the ball down through the next release.
   // Use the verified receipt as the anchor when its redirect is already visible.
   const receivingWristFollowsRelease=this.carryReceivingHand&&control==='receiving_hand_redirect'&&
    row.owner?.hand===best.owner.hand&&row.measurement[1]-best.measurement[1]>=best.measurement[2]*.2;
   if(canStartFlight&&((!row.owner&&row.measurement[1]-best.measurement[1]>=d*.2)||receivingWristFollowsRelease)){
    this.begin(best,row);this.flight.last=row;this.flight.peak=row;this.flight.lastSeen=now;
   }else if(row.owner)this.held=row;
   return [event];
  }
  if(!this.legacy&&flight.floor){
   // Proximity to the releasing wrist on the way up is not, by itself,
   // possession. Verify the same control evidence used for the other hand.
   const sameHandReturn=receipt(flight.sourceReturns);
   if(sameHandReturn.control){
    this.reject('rejected_same_hand_return',row);this.held=row.owner?row:null;
    this.startFromReacquiredHand(sameHandReturn,row,canStartFlight);
    return [];
   }
   // A low, quick receiving hand may already have sent the next bounce. Give
   // its observed receipt/redirect a decision before rejecting a loose ball.
   if(secondBounce){this.reject('rejected_second_bounce_without_receipt',row);this.held=row.owner?row:null;return [];}
  }
  if(best&&now-best.time>.3&&(!row.owner||row.owner.hand!==best.owner.hand)){this.reject('rejected_uncontrolled_receipt',row);this.held=null;return [];}
  flight.last=row;
  return [];
 }
}

// A supplemental receipt check never changes the primary release/floor state.
// It may only complete the SAME previously observed floor contact after a short
// gap, with the original opposite-hand control checks. It cannot invent a floor.
export class SupplementalCrossoverCounter {
 constructor({carryReceivingHand=false,independentRelease=false}={}){this.primary=createCrossoverCounter('CROSS 11');this.primary.carryReceivingHand=carryReceivingHand;this.primary.independentRelease=independentRelease;this.shadows=[];this.confirmed=[];this.count=0;this.lastSupplemental=false;}
 get frame(){return this.primary.frame;}get points(){return this.primary.points;}get context(){return this.primary.context;}
 get held(){return this.primary.held;}get flight(){return this.primary.flight;}
 get pending(){return this.primary.pending;}get proposalsThisFrame(){return this.primary.proposalsThisFrame;}
 get rejected(){return this.primary.rejected;}
 snapshot(){return {...this.primary.snapshot(),...(this.lastSupplemental?{decision:'supplemental_receipt_confirmed'}:{})};}
 accept(event,source){
  const prior=this.confirmed.find(e=>e.from_hand===event.from_hand&&Math.abs(e.floor_contact_time_seconds-event.floor_contact_time_seconds)<=.16);
  if(prior){if(!prior.evidence_sources.includes(source))prior.evidence_sources.push(source);return null;}
  const accepted={...event,count:++this.count,evidence_sources:[source]};this.confirmed.push(accepted);return accepted;
 }
 update(proposals,measurement,person,now,deadline=Infinity){
  const p=this.primary,f=p.flight;
  if(f?.floor&&now-f.lastSeen>.25&&now-f.lastSeen<=.35&&now-f.floor.time<=.55&&now-f.source.time<=1.2&&
   !this.shadows.some(s=>s.floorTime===f.floor.time&&s.sourceHand===f.source.owner.hand)){
   const counter=new CrossoverCounter({sizeOutlierRecovery:true,preFloorSizeRecovery:true,releaseSizeRecovery:true,
    nearFloorRelease:true,reanchorAfterGap:true,stableReleaseSize:true,ignoreOneOversizedSample:true,finishWindowSeconds:.15,gapReceiptRecovery:true,carryReceivingHand:p.carryReceivingHand});
   counter.frame=p.frame;counter.flight=structuredClone(f);counter.held=structuredClone(p.held);
   counter.context=structuredClone(p.context.slice(-12));counter.pending=structuredClone(p.pending);
   this.shadows.push({counter,floorTime:f.floor.time,sourceHand:f.source.owner.hand});this.shadows=this.shadows.slice(-2);
  }
  const events=[],primary=p.update(proposals,measurement,person,now,deadline);this.lastSupplemental=false;
  for(const e of primary){const accepted=this.accept(e,'primary');if(accepted)events.push(accepted);}
  this.shadows=this.shadows.filter(shadow=>{
   if(now-shadow.floorTime>.55)return false;
   const found=shadow.counter.update([],measurement,person,now,deadline);
   for(const e of found){
    if(e.from_hand!==shadow.sourceHand||Math.abs(e.floor_contact_time_seconds-shadow.floorTime)>1e-9)continue;
    const accepted=this.accept(e,'observed_floor_gap_receipt');if(accepted){events.push(accepted);this.lastSupplemental=true;}
   }
   return !found.length&&shadow.counter.flight?.floor?.time===shadow.floorTime;
  });
  return events;
 }
}

export function createCrossoverCounter(revision=CROSSOVER_COUNTER_REVISION){
 const rank=Number(/^CROSS (\d{2})$/.exec(revision)?.[1]);
 if(!(rank>=1&&rank<=14))throw new Error(`Unsupported crossover counter revision: ${revision}`);
 if(rank>=12)return new SupplementalCrossoverCounter({carryReceivingHand:rank>=13,independentRelease:rank>=14});
 return new CrossoverCounter({legacy:rank===1,sizeOutlierRecovery:rank>=3,preFloorSizeRecovery:rank>=4,releaseSizeRecovery:rank>=5,nearFloorRelease:rank>=6,reanchorAfterGap:rank>=7,stableReleaseSize:rank>=8,ignoreOneOversizedSample:rank>=9,finishWindowSeconds:rank>=10?CROSSOVER_FINISH_WINDOW_SECONDS:0});
}

export function crossoverROI(person,tracker,w,h){
 if(!person)return [0,0,w,h];
 const xs=[person.box[0],person.box[2],...[9,10].filter(i=>visible(person,i)).map(i=>person.xy[i][0]),...(tracker.last?[tracker.last[0]]:[])];
 const margin=Math.max(100,(tracker.typical()||65)*1.8);
 return [Math.max(0,Math.floor(Math.min(...xs)-margin)),Math.floor(h*.08),Math.min(w,Math.ceil(Math.max(...xs)+margin)),h];
}
