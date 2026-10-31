export const CROSSOVER_COUNTER_REVISION='CROSS 02';
export const CROSSOVER_TEST_REVISION='CROSSOVER TEST 03';
export const CROSSOVER_RULE='controlled hand → observed floor bounce → opposite hand under control';
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
 constructor({legacy=false}={}){this.legacy=legacy;this.frame=0;this.count=0;this.points=[];this.context=[];this.confirmed=[];this.rejected=[];this.pending=[];this.held=null;this.flight=null;this.proposalsThisFrame=[];this.lastDecision='waiting_for_hand';}
 reject(reason,row){
  if(this.flight)this.rejected.push({from_hand:this.flight.source.owner.hand,event_frame:row.frame,event_time_seconds:row.time,control_status:reason,floor_contact_time_seconds:this.flight.floor?.time??null});
  this.flight=null;this.held=null;this.pending=[];this.lastDecision=reason;
 }
 begin(source,row){
  this.flight={source,last:source,peak:source,floor:null,receiving:[],sourceReturns:[],lastSeen:source.time};
  this.pending=[{from_hand:source.owner.hand,started_at:source.time}];
  this.lastDecision='following_release';
 }
 snapshot(){return {phase:this.flight?.floor?'awaiting_opposite_hand':this.flight?'following_flight':this.held?'hand_controlled':'waiting_for_hand',sourceHand:this.flight?.source.owner.hand??this.held?.owner.hand??null,floorTime:this.flight?.floor?.time??null,decision:this.lastDecision};}
 update(_proposals,measurement,person,now,deadline=Infinity){
  this.proposalsThisFrame=[];
  if(!Number.isFinite(now)||now<=(this.context.at(-1)?.time??-Infinity))return [];
  const row=observation(++this.frame,measurement,person,now);
  this.points.push({frame:this.frame,timestamp:now,y:measurement?.[1]??null,diameter:measurement?.[2]??null,observed:!!measurement});
  this.context.push(row);this.context=this.context.slice(-96);
  if(now<0){this.held=row.owner?row:null;this.flight=null;this.pending=[];return [];}
  if(!row.measurement){
   if(this.flight&&now-this.flight.lastSeen>.25)this.reject('rejected_tracking_gap',row);
   if(this.held&&now-this.held.time>.65)this.held=null;
   return [];
  }
  if(!this.flight){
   // The free hand can be nearer during the downward crossing. Retain the
   // releasing hand until a bounce and controlled return verify a transfer.
   const descendingChange=!this.legacy&&this.held&&row.owner&&row.owner.hand!==this.held.owner.hand&&
    now-this.held.time<=.65&&row.measurement[1]>=this.held.measurement[1]-this.held.measurement[2]*.1;
   if(row.owner&&!descendingChange){this.held=row;this.lastDecision='hand_controlled';return [];}
   if(!this.held||now-this.held.time>.65){this.held=null;return [];}
   const d=this.held.measurement[2];
   if(row.measurement[1]-this.held.measurement[1]<d*.2)return [];
   this.begin(this.held,row);
  }
  const flight=this.flight,d=flight.source.measurement[2];
  if(now-flight.lastSeen>.25){this.reject('rejected_tracking_gap',row);this.held=row.owner?row:null;return [];}
  if(now-flight.source.time>1.8){this.reject('rejected_uncontrolled_flight',row);this.held=row.owner?row:null;return [];}
  if(row.measurement[2]/d<.65||row.measurement[2]/d>1.5){this.reject('rejected_ball_size_change',row);this.held=null;return [];}
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
  const {best,control}=receipt(flight.receiving);
  if(control){
   if(best.time>=deadline){this.reject('rejected_after_deadline',row);this.held=row.owner?row:null;return [];}
   const event={count:++this.count,event_frame:best.frame,event_timestamp_exact:best.time,event_time_seconds:+best.time.toFixed(3),floor_contact_time_seconds:flight.floor.time,release_time_seconds:flight.source.time,from_hand:sourceHand,to_hand:opposite(sourceHand),validation_path:'controlled_crossover',control_evidence:control,control_status:'confirmed',receiving_hand_distance_ball_diameters:best.owner.distance};
   this.confirmed.push(event);this.flight=null;this.pending=[];this.held=best;this.lastDecision='controlled_crossover';
   // A fast receiving hand can already have launched the following crossover.
   if(!row.owner&&row.measurement[1]-best.measurement[1]>=d*.2){this.begin(best,row);this.flight.last=row;this.flight.peak=row;this.flight.lastSeen=now;}
   else if(row.owner)this.held=row;
   return [event];
  }
  if(!this.legacy&&flight.floor){
   // Proximity to the releasing wrist on the way up is not, by itself,
   // possession. Verify the same control evidence used for the other hand.
   if(receipt(flight.sourceReturns).control){this.reject('rejected_same_hand_return',row);this.held=row.owner?row:null;return [];}
   // A low, quick receiving hand may already have sent the next bounce. Give
   // its observed receipt/redirect a decision before rejecting a loose ball.
   if(secondBounce){this.reject('rejected_second_bounce_without_receipt',row);this.held=row.owner?row:null;return [];}
  }
  if(best&&now-best.time>.3&&(!row.owner||row.owner.hand!==best.owner.hand)){this.reject('rejected_uncontrolled_receipt',row);this.held=null;return [];}
  flight.last=row;
  return [];
 }
}

export function createCrossoverCounter(revision=CROSSOVER_COUNTER_REVISION){
 if(!['CROSS 01','CROSS 02'].includes(revision))throw new Error(`Unsupported crossover counter revision: ${revision}`);
 return new CrossoverCounter({legacy:revision==='CROSS 01'});
}

export function crossoverROI(person,tracker,w,h){
 if(!person)return [0,0,w,h];
 const xs=[person.box[0],person.box[2],...[9,10].filter(i=>visible(person,i)).map(i=>person.xy[i][0]),...(tracker.last?[tracker.last[0]]:[])];
 const margin=Math.max(100,(tracker.typical()||65)*1.8);
 return [Math.max(0,Math.floor(Math.min(...xs)-margin)),Math.floor(h*.08),Math.min(w,Math.ceil(Math.max(...xs)+margin)),h];
}
