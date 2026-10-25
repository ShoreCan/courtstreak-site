// Right-hand pound browser port of the saved CourtStreak 0.7.8 count-repair baseline.
// All coordinates use the SAME mirrored, 1280px-wide frame as the Python engine.
import {timedBallContinuation,strongBallContinuation,corroboratedBallContinuation,floorBallContinuation} from './ballTiming.mjs';
export const BALL_TRACKER_REVISION = 'COUNT 03';
export const EXPERIMENTAL_COUNTER_REVISION = 'COUNT 07';
export const BALL_IDENTITY_REVISION = 'LOCK 08';
// Both live initialization/reset and cached-input replay must resolve the same settings.
export function poundCounterOptions(revision) {
 if(revision==='COUNT 03')return {directionalPeaks:false,timeWindows:false};
 if(revision==='COUNT 04')return {directionalPeaks:true,timeWindows:false};
 if(revision==='COUNT 05')return {directionalPeaks:true,timeWindows:true};
 if(revision==='COUNT 06')return {directionalPeaks:true,timeWindows:true,earlyConfirmation:true};
 if(revision==='COUNT 07')return {directionalPeaks:true,timeWindows:true,earlyConfirmation:true,lowControlledPounds:true};
 throw new Error(`Unsupported counter revision: ${String(revision)}. Exact replay is unavailable.`);
}
export function createPoundCounter(revision){return new GapAwareBounceCounter(poundCounterOptions(revision));}
export function createPoundValidator(revision){return new PoundControlValidator({lowControlledPounds:!!poundCounterOptions(revision).lowControlledPounds});}
export const median = a => percentile(a, .5);
export function percentile(a, q) { const s = [...a].sort((a,b)=>a-b); if (!s.length) return 0; const p=(s.length-1)*q, i=Math.floor(p); return s[i]+(s[Math.ceil(p)]-s[i])*(p-i); }
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const center=b=>[(b[0]+b[2])/2,(b[1]+b[3])/2];
export const geometry = c => ({center:center(c.box), diameter:Math.sqrt(Math.max((c.box[2]-c.box[0])*(c.box[3]-c.box[1]),1))});
const wrists = p => p ? [9,10].filter(i=>p.confidence[i]>=.15 && p.xy[i][0]>0 && p.xy[i][1]>0).map(i=>p.xy[i]) : [];
export class BallIdentityTracker {
 constructor({handContinuity=false,objectBackgroundRadius=false,timedContinuity=false,strongContinuity=false,corroboratedContinuity=false,floorContinuity=false,turnContinuity=false,diagnostics=false}={}){this.diagnostics=diagnostics;this.decisions=[];this.turnContinuity=turnContinuity;this.floorContinuity=floorContinuity;this.corroboratedContinuity=corroboratedContinuity;this.provisionalBall=null;this.strongContinuity=strongContinuity;this.handContinuity=handContinuity;this.objectBackgroundRadius=objectBackgroundRadius;this.timedContinuity=timedContinuity;this.samples=[];this.last=null;this.velocity=[0,0];this.diameter=null;this.missed=0;this.diameters=[];this.lanes=[];this.background=[];this.frame=0;}
 decision(index,status,reason){if(this.diagnostics)this.decisions[index]={candidateIndex:index,status,reason};}
 typical(){return this.diameters.length?median(this.diameters):this.diameter;}
 lane(){return this.lanes.length?median(this.lanes):this.last?.[0];}
 ready(){const d=this.typical(); return this.diameters.length>=12 && this.lanes.length>=12 && d>=38 && percentile(this.diameters,.9)-percentile(this.diameters,.1)<=Math.max(28,d*.55) && percentile(this.lanes,.9)-percentile(this.lanes,.1)<=Math.max(95,d*1.8);}
 roi(w,h){const x=this.lane(),d=this.typical()||72; if(x==null)return [0,0,w,h]; const half=Math.floor(Math.max(210,Math.min(w*.28,d*2.7))); return [Math.max(0,Math.floor(x)-half),Math.floor(h*.14),Math.min(w,Math.floor(x)+half),h];}
 select(candidates,person,phase,w,h,now=null){
  this.decisions=this.diagnostics?candidates.map((_,i)=>({candidateIndex:i,status:'not_selected',reason:'ranking'})):[];
  this.frame++; const hands=wrists(person); let selected=null, owned=false,corroboratedRecovery=null;
  if(phase==='setup'||!this.last){
   let best=Infinity;
   candidates.forEach((c,i)=>{const g=geometry(c);let score=hands.length?Math.min(...hands.map(p=>distance(g.center,p)))/Math.max(g.diameter,24)-c.score*.35:distance(g.center,[w*.5,h*.48])/Math.max(w,h)-c.score*.15;
    if(g.center[1]>h*.88)score+=3; if(score<best){best=score;selected=i;}});
   if(hands.length&&best>2.75){if(selected!==null)this.decision(selected,'rejected','setup_hand_distance');selected=null;}
   if(selected!==null&&hands.length){const g=geometry(candidates[selected]);owned=Math.min(...hands.map(p=>distance(g.center,p)))<=Math.max(110,g.diameter*2.3);}
  }else{
   const predicted=this.last.map((v,i)=>v+this.velocity[i]*Math.min(this.missed+1,3));const typical=this.typical(),lane=this.lane(); const scored=[],reacquired=[];
   const timed=this.timedContinuity&&phase==='drill'?timedBallContinuation(candidates,this.samples,now,typical):null;
   const floor=this.floorContinuity&&phase==='drill'&&this.ready()?floorBallContinuation(candidates,this.samples,now,typical,person,{allowApexReturn:this.turnContinuity}):null;
   const strong=this.strongContinuity&&phase==='drill'?strongBallContinuation(candidates,this.samples,now,typical,this.velocity,this.missed):null;
   corroboratedRecovery=this.corroboratedContinuity&&phase==='drill'&&this.ready()?corroboratedBallContinuation(candidates,this.samples,now,typical,this.provisionalBall,{movingRecovery:this.turnContinuity,person}):null;
   this.provisionalBall=corroboratedRecovery?.pending??null;
   candidates.forEach((c,i)=>{const g=geometry(c),p=g.center,d=g.diameter;
    const floorCandidate=floor?.index===i,timedCandidate=timed?.index===i||floorCandidate,corroboratedCandidate=corroboratedRecovery?.index===i;
    // Preserve a nearby hand-owned continuation as well as the existing reacquisition.
    // Background memory must not alternate between rejecting and recovering a held ball.
    // The original setup-size and subsequent motion gates still apply.
    const recoveringAtHand=phase==='drill'&&this.missed&&hands.some(v=>distance(p,v)<=Math.max(120,d*1.65));
    const continuingAtHand=this.handContinuity&&phase==='drill'&&this.missed===0&&this.diameter>0
     &&d/this.diameter>=.8&&d/this.diameter<=1.2
     &&distance(p,this.last)<=Math.max(28,this.diameter*.5)
     &&hands.some(v=>distance(p,v)<=Math.max(120,d*1.65));
    // A large foreground ball must not enlarge the exclusion zone around a
    // smaller remembered object (for example a shoe). Keep the same .65
    // factor and 28px minimum, but anchor the opt-in radius to that object.
    // Two strong proposals must demonstrate motion near the feet before the
    // new path can cross a remembered object of comparable size. A larger
    // remembered object still vetoes selection.
    if(!recoveringAtHand&&!continuingAtHand&&this.background.some(b=>b.observations>=5&&distance(p,b.center)<=(this.objectBackgroundRadius&&phase==='drill'?Math.max(28,b.diameter*.65):Math.max(28,d*.65,b.diameter*.65))&&!(((timedCandidate||strong===i||corroboratedCandidate)&&b.diameter<d*.75)||(corroboratedCandidate&&corroboratedRecovery.moving&&b.diameter<=d*1.25))))return void this.decision(i,'rejected','background_memory');
    if(typical!=null&&(d/typical<.58||d/typical>1.68))return void this.decision(i,'rejected','size_ratio');
    const reference=Math.max(typical||this.diameter||d,28),handDistance=hands.length?Math.min(...hands.map(v=>distance(p,v))):Infinity;
    if(phase==='drill'&&this.missed&&handDistance<=Math.max(120,d*1.65))reacquired.push([handDistance/Math.max(d,24),i]);
    if(distance(p,this.last)>Math.max(w*.18,reference*2.8)&&handDistance>Math.max(120,d*1.65)&&!timedCandidate&&!corroboratedCandidate)return void this.decision(i,'rejected','jump_from_last');
    if(lane!=null&&Math.abs(p[0]-lane)>(phase==='drill'?Math.max(w*.46,reference*5):Math.max(145,reference*2.15)))return void this.decision(i,'rejected','horizontal_lane');
    const dx=p[0]-predicted[0],dy=p[1]-predicted[1];
    const xl=phase==='drill'?Math.max(w*.30,reference*(3.5+.45*Math.min(this.missed,3))):Math.max(125,reference*(1.65+.25*Math.min(this.missed,3)));
    const yl=Math.max(185,reference*(3+.60*Math.min(this.missed,3)),timedCandidate?(timed?.index===i?timed.envelope:floor.envelope):0,corroboratedCandidate?Math.abs(p[1]-this.last[1])+reference:0);
    if(Math.abs(dx)>xl||Math.abs(dy)>yl)return void this.decision(i,'rejected','prediction_envelope');
    scored.push([Math.abs(dx)/xl+Math.abs(dy)/yl+Math.abs(d-reference)/reference*.55-c.score*.08,i]);
   });
   const best=(reacquired.length?reacquired:scored).sort((a,b)=>a[0]-b[0])[0];
   if(best&&(reacquired.length||best[0]<=2.35)){selected=best[1];owned=true;}else if(best)this.decision(best[1],'rejected','ranking_score_limit');
  }
  candidates.forEach((c,i)=>{if(i===selected)return;const g=geometry(c);if(this.last&&distance(g.center,this.last)<=Math.max(115,g.diameter*1.75))return;
   let b=this.background.find(b=>distance(g.center,b.center)<=Math.max(24,g.diameter*.35));
   if(!b)this.background.push({center:[...g.center],diameter:g.diameter,observations:1});
   else{b.center=b.center.map((v,j)=>v*.8+g.center[j]*.2);b.diameter=b.diameter*.8+g.diameter*.2;b.observations++;}
  });
  if(selected===null){this.missed++;this.velocity=this.velocity.map(v=>v*.72);return null;}
  this.decision(selected,'selected',owned?'owned_continuation':'acquisition');
  const chosen=candidates[selected],g=geometry(chosen);
  if(corroboratedRecovery?.index===selected)this.velocity=[...corroboratedRecovery.velocity];
  else if(this.last)this.velocity=this.velocity.map((v,i)=>v*.55+(g.center[i]-this.last[i])*.45);
  this.last=g.center;this.diameter=g.diameter;this.missed=0;
  if((this.timedContinuity||this.strongContinuity||this.corroboratedContinuity)&&Number.isFinite(now)){
   if(this.samples.length&&now<=this.samples.at(-1).at)this.samples=[];
   this.samples.push({at:now,center:[...g.center],diameter:g.diameter});this.samples=this.samples.slice(-32);
  }
  if(owned&&['setup','countdown'].includes(phase)){this.diameters.push(g.diameter);this.diameters=this.diameters.slice(-30);this.lanes.push(g.center[0]);this.lanes=this.lanes.slice(-45);}
  return chosen;
 }
}
export class GapAwareBounceCounter {
 constructor({directionalPeaks=false,timeWindows=false,earlyConfirmation=false,lowControlledPounds=false}={}){this.lowControlledPounds=lowControlledPounds;this.earlyConfirmation=earlyConfirmation;this.timeWindows=timeWindows;this.directionalPeaks=directionalPeaks;this.points=[];this.next=5;this.last=null;this.count=0;this.floorSamples=[];}
 rememberControlledFloor(e){if(this.lowControlledPounds&&e.validation_path==='controlled_low_pound')this.last=Math.max(this.last??-1,e.event_frame-1);if((e.validation_path==='clean_full_pound'||e.validation_path==='controlled_low_pound')&&e.bottom_center_y!=null&&e.ball_scale_pixels!=null){this.floorSamples.push([e.bottom_center_y,e.ball_scale_pixels]);this.floorSamples=this.floorSamples.slice(-16);}}
 floorReference(){if(this.floorSamples.length<6)return null;const ys=this.floorSamples.map(p=>p[0]),d=median(this.floorSamples.map(p=>p[1])),y=median(ys);if(median(ys.map(v=>Math.abs(v-y)))>d*.30)return null;return {center_y:y,diameter:d,trusted_contacts:this.floorSamples.length};}
 // A long capture interval can hide the lowest point without a null detection.
 // Intersect the measured incoming/outgoing segments only across that interval.
 // The existing floor/size/amplitude/hand checks still have to pass.
 samplingGapContact(c,reference,d){
  if(!reference)return null;
  const a=this.points;
  for(const left of [c-1,c]){
   const q=a.slice(left-1,left+3);
   if(q.length!==4||q.some(p=>!p.observed||p.reconstructed))continue;
   const [before,entry,exit,after]=q;
   const dtIn=entry.timestamp-before.timestamp,dtOut=after.timestamp-exit.timestamp,gap=exit.timestamp-entry.timestamp;
   if(dtIn<=0||dtOut<=0||gap<=Math.max(dtIn,dtOut)*1.5||gap>.15)continue;
   const down=(entry.y-before.y)/dtIn,up=(after.y-exit.y)/dtOut;
   if(down<=0||up>=0)continue;
   const offset=(exit.y-entry.y-up*gap)/(down-up),y=entry.y+down*offset;
   if(offset<=0||offset>=gap||Math.abs(y-reference.center_y)>d*.45)continue;
   return {timestamp:entry.timestamp+offset,center_y:y,gap_seconds:gap,
    entry_frame:entry.frame,exit_frame:exit.frame,kind:'estimated_between_observed_frames'};
  }
  return null;
 }
 update(now,measurement,height){
  this.points.push({frame:this.points.length+1,timestamp:now,y:measurement?.[0]??null,diameter:measurement?.[1]??null,observed:!!measurement,reconstructed:false});
  const a=this.points,end=a.length-1; let start=end-1; while(start>=0&&a[start].y===null)start--;
  const gap=end-start-1;
  if(a[end].y!==null&&start>=0&&gap>0&&gap<=5){for(let i=1;i<=gap;i++){const p=a[start+i],f=i/(gap+1);p.y=a[start].y+f*(a[end].y-a[start].y);p.diameter=a[start].diameter+f*(a[end].diameter-a[start].diameter);p.reconstructed=true;}}
  // Keep the original eight-frame minimum. In the experimental path, also
  // wait for half a second of measured return motion: eight high-rate frames
  // alone cover too little of a slow bounce. No synthetic observations added.
  const events=[];const latest=a.length-3-5-1;
  while(this.next<=latest){
   const waiting=this.timeWindows&&now-a[this.next].timestamp<.5;
   if(waiting&&!this.earlyConfirmation)break;
   const c=this.next,p=a[c];
   // Non-turns cannot become contacts when more return samples arrive.
   // Discard only fully observed, structurally impossible floor peaks early.
   const observedTurn=a[c-1]?.observed&&p.observed&&a[c+1]?.observed;
   if(waiting&&observedTurn&&!(p.y>=a[c-1].y&&p.y>a[c+1].y)){this.next++;continue;}
   const e=this.evaluate(c,height);
   // Keep the full slow-motion window unless enough clean return motion
   // already satisfies the validator's amplitude rules. Never lower gates.
   if(waiting&&!(e&&(e.validation_path==='controlled_low_pound'||(e.validation_path==='clean_full_pound'&&e.rise_ball_diameters>=1.5&&e.rise_ball_diameters>=e.down_ball_diameters*.42))))break;
   if(e){e.count=++this.count;events.push(e);if(e.validation_path!=='controlled_low_pound')this.last=c;}
   this.next++;
  }
  return events;
 }
 evaluate(c,height){
  const a=this.points;let start=Math.max(0,c-8),stop=c+9;
  if(this.timeWindows){while(start>0&&a[c].timestamp-a[start-1].timestamp<=.5)start--;while(stop<a.length&&a[stop].timestamp-a[c].timestamp<=.5)stop++;}
  const raw=a.slice(start,stop),core=a.slice(c-5,c+4);
  if(core.length!==9||core.some(p=>p.y===null||p.diameter===null))return null;
  const window=raw.filter(p=>p.y!==null&&p.diameter!==null),previous=a.slice(start,c).filter(p=>p.y!==null&&p.diameter!==null),following=a.slice(c+1,stop).filter(p=>p.y!==null&&p.diameter!==null);
  const p=a[c];if(!(p.y>=a[c-1].y&&p.y>a[c+1].y))return null;
  if(this.directionalPeaks){
   // A repeated position on an ascent is not a new descent/floor turn.
   // A genuine flat floor turn still has a lower last-distinct approach.
   let approach=c-1;while(approach>=start&&a[approach].y===p.y)approach--;
   if(approach<start||a[approach].y===null||p.y<=a[approach].y)return null;
  }
  const d=median(window.map(p=>p.diameter)),motion=Math.max(10,d*.35,height*.01);
  const down=p.y-Math.min(...previous.map(p=>p.y)),rise=p.y-Math.min(...following.map(p=>p.y));
  const clean=down>=Math.max(motion,d*1.6)&&rise>=Math.max(motion,d*1.2);
  const gapNear=a.slice(Math.max(start,c-2),Math.min(stop,c+3)).some(p=>!p.observed||p.reconstructed),fraction=window.filter(p=>p.reconstructed).length/window.length;
  const recovered=gapNear&&fraction>0&&down>=Math.max(motion*1.15,d*.58)&&rise>=Math.max(motion*1.05,d*.48);
  const reference=this.floorReference();
  const gapContact=!clean&&!recovered&&reference&&Math.abs(p.y-reference.center_y)>d*.45?this.samplingGapContact(c,reference,d):null;
  const anchored=reference&&p.observed&&d/reference.diameter>=.8&&d/reference.diameter<=1.2&&(Math.abs(p.y-reference.center_y)<=d*.45||gapContact!==null)&&down>=d&&rise>=d&&window.filter(p=>p.observed).length/window.length>=.7;
  let low=null;
  if(this.lowControlledPounds&&!clean&&!recovered&&!anchored&&p.observed&&!p.reconstructed){
   let left=c,right=c;
   while(left>start&&a[left-1].observed&&!a[left-1].reconstructed&&a[left-1].y<=a[left].y)left--;
   while(right+1<stop&&a[right+1].observed&&!a[right+1].reconstructed&&a[right+1].y<=a[right].y)right++;
   const localDown=p.y-a[left].y,localRise=p.y-a[right].y;
   if(c-left>=2&&right-c>=2&&localDown>=d*.6&&localRise>=d*.6
    &&a.slice(left,right+1).every(q=>q.observed&&!q.reconstructed&&q.diameter/d>=.8&&q.diameter/d<=1.25)){
    low={start:a[left].timestamp,end:a[right].timestamp,down:localDown/d,rise:localRise/d};
   }
  }
  if(!clean&&!recovered&&!anchored&&!low)return null;
  if(this.last!==null){const usable=a.slice(this.last+1,c).filter(p=>p.y!==null).map(p=>p.y);
   const shortReturn=low||(this.lowControlledPounds&&anchored);
   const peak=shortReturn?Math.max(a[this.last].y,p.y):a[this.last].y,minimum=shortReturn?d*.6:Math.max(motion*.65,Math.max(motion,d*1.2));
   if(!usable.length||peak-Math.min(...usable)<minimum)return null;
  }
  if(window.filter(p=>p.observed).length/window.length<.35)return null;
  // Preserve Python rounding: these fields are consumed by the control validator.
  const eventTime=!low&&anchored&&gapContact?gapContact.timestamp:p.timestamp;
  return {event_frame:p.frame,event_timestamp_exact:eventTime,event_time_seconds:+eventTime.toFixed(3),bottom_center_y:p.y,ball_scale_pixels:d,floor_reference:reference,down_ball_diameters:+(down/Math.max(d,1)).toFixed(3),rise_ball_diameters:+(rise/Math.max(d,1)).toFixed(3),validation_path:clean?'clean_full_pound':recovered?'gap_recovered_pound':low?'controlled_low_pound':'floor_anchored_pound',...(low?{low_control_window:low}:{}),...(anchored&&gapContact?{sampling_gap_contact:gapContact}:{})};
 }
}
export class PoundControlValidator {
 constructor({lowControlledPounds=false}={}){this.lowControlledPounds=lowControlledPounds;this.frame=0;this.count=0;this.pending=[];this.confirmed=[];this.rejected=[];this.context=[];}
 update(proposals,measurement,person,now,deadline=Infinity){
  this.frame++;
  const kneeY=person&&[13,14].every(i=>person.confidence[i]>=.5&&person.xy[i][0]>0&&person.xy[i][1]>0)?Math.min(person.xy[13][1],person.xy[14][1]):null;
  const visibleFeet=person&&[15,16].every(i=>person.confidence[i]>=.7&&Array.isArray(person.xy[i])&&person.xy[i].length===2&&person.xy[i].every(Number.isFinite)&&person.xy[i][0]>0&&person.xy[i][1]>0);
  this.context.push({frame:this.frame,kneeY,time:now,measurement:measurement?[...measurement]:null,feetY:visibleFeet?Math.max(person.xy[15][1],person.xy[16][1]):null,handDistance:null,bodyOffset:null});this.context=this.context.slice(-64);
  // Match the newer review's floor-contact timing: no pre-Go or post-deadline reps.
  proposals.filter(p=>(p.event_timestamp_exact??p.event_time_seconds)>=0&&(p.event_timestamp_exact??p.event_time_seconds)<deadline).forEach(p=>this.pending.push({...p,proposal_frame:this.frame,event_knee_y:this.context.find(c=>c.frame===p.event_frame)?.kneeY??null,best_hand_distance_ball_diameters:null,best_body_offset_units:null}));
  let hd=null,bo=null;
  if(measurement&&person&&person.confidence[10]>=.20){const [x,y,d]=measurement,p=person;
   hd=distance([x,y],p.xy[10])/Math.max(d,1);
   const sw=p.confidence[5]>=.20&&p.confidence[6]>=.20?distance(p.xy[5],p.xy[6]):0;
   const bw=Math.max(sw,(p.box[2]-p.box[0])*.28,d);
   bo=p.confidence[11]>=.20&&p.confidence[12]>=.20?Math.abs(x-(p.xy[11][0]+p.xy[12][0])/2)/Math.max(bw,1):99;
  }
  Object.assign(this.context.at(-1),{handDistance:hd,bodyOffset:bo});
  for(const item of this.pending){
   if(hd!==null&&(item.best_hand_distance_ball_diameters===null||hd<item.best_hand_distance_ball_diameters)){item.best_hand_distance_ball_diameters=hd;item.best_body_offset_units=bo;}
  }
  const events=[],remaining=[];
  for(const p of this.pending){const hd=p.best_hand_distance_ball_diameters,bo=p.best_body_offset_units,down=p.down_ball_diameters,rise=p.rise_ball_diameters;
   // An entire ball above both visible knees cannot be this player's floor bounce.
   if(p.event_knee_y!==null&&p.bottom_center_y!=null&&p.ball_scale_pixels>0&&p.bottom_center_y+p.ball_scale_pixels*.5<p.event_knee_y){p.control_status='rejected_above_knee';this.rejected.push(p);continue;}
   const clean=p.validation_path==='clean_full_pound'&&rise>=1.5&&rise>=down*.42&&hd!==null&&hd<=2.6&&bo!==null&&bo<=2.2;
   const recovered=p.validation_path==='gap_recovered_pound'&&down>=1.25&&rise>=1.25&&hd!==null&&hd<=1.8&&bo!==null&&bo<=1.65;
   const floor=p.validation_path==='floor_anchored_pound'&&p.floor_reference&&down>=1&&rise>=1&&rise>=down*.42&&hd!==null&&hd<=1.8&&bo!==null&&bo<=1.65;
   let low=false;
   if(this.lowControlledPounds&&p.validation_path==='controlled_low_pound'&&p.low_control_window){
    const contact=this.context.find(c=>c.frame===p.event_frame),d=p.ball_scale_pixels,w=p.low_control_window;
    const known=p.floor_reference&&d/p.floor_reference.diameter>=.8&&d/p.floor_reference.diameter<=1.2&&Math.abs(p.bottom_center_y-p.floor_reference.center_y)<=d*.3;
    const feet=contact?.feetY!=null&&p.bottom_center_y>=contact.feetY-d*.25&&p.bottom_center_y<=contact.feetY+d*.9;
    const owned=c=>c.measurement&&c.handDistance!==null&&c.handDistance<=1.1&&c.bodyOffset!==null&&c.bodyOffset<=2.2&&c.measurement[1]<=p.bottom_center_y-d*.6;
    const time=p.event_timestamp_exact??p.event_time_seconds;
    const handBefore=this.context.some(c=>c.time>=w.start-.04&&c.time<time&&owned(c));
    const handAfter=this.context.some(c=>c.time>time&&c.time<=w.end+.04&&owned(c));
    low=!!(contact?.measurement&&(known||feet)&&w.down>=.6&&w.rise>=.6&&handBefore&&handAfter);
   }
   if(clean||recovered||floor||low){p.count=++this.count;p.control_status='confirmed';events.push(p);this.confirmed.push(p);}
   else if(this.frame-p.proposal_frame>=14){p.control_status='rejected_mishandle';this.rejected.push(p);}else remaining.push(p);
  }
  this.pending=remaining;return events;
 }
}
export function evaluatePosition(person,ball,w,h){
 const result={body:false,hand:false,ball:!!ball,floor:false,owned:false,valid:false,message:''};
 if(!person){result.message='Step into view with your basketball';return result;}
 const b=person.box,ph=b[3]-b[1],pw=b[2]-b[0];
 result.body=pw>=w*.10&&ph>=h*.28&&pw<=w*.62&&ph<=h*.92;
 result.hand=person.confidence[10]>=.22;
 // Ankle clearance is a framing proxy, not a claim that the floor surface is detected.
 const feet=[15,16].filter(i=>person.confidence[i]>=.2).map(i=>person.xy[i][1]);
 result.floor=feet.length===2&&Math.max(...feet)<h*.92&&Math.min(...feet)>h*.35;
 const torso=[5,6,11,12].filter(i=>person.confidence[i]>=.2).length>=2;
 if(!result.body){result.message=ph>h*.92||pw>w*.62?'Move back so your body fits in frame':'Move closer so we can see you clearly';return result;}
 if(!result.hand||!torso){result.message='Show your right wrist and turn toward the camera';return result;}
 if(!result.floor){result.message='Tilt the phone down or move back: show both feet and space below them';return result;}
 if(!ball){result.message='Hold the basketball still beside your right hand';return result;}
 const g=geometry(ball),r=g.diameter/2;
 if(g.center[0]-r<w*.055||g.center[0]+r>w*.945){result.message='Move the ball toward the middle of the frame';return result;}
 result.owned=distance(g.center,person.xy[10])<=Math.max(110,g.diameter*2.3);
 if(!result.owned){result.message='Hold the ball beside your right hand to lock it';return result;}
 result.valid=true;result.message='Good position. Hold the ball still';return result;
}
export class PositionGate {
 constructor(){this.reset();}
 reset(){this.since=null;this.samples=[];}
 update(now,check,ball,tracker,performanceReady){
  // A fresh valid inference is required; camera permission alone cannot arm the timer.
  if(!check.valid||!ball||!performanceReady||!tracker.ready()){this.reset();return 0;}
  if(this.since===null)this.since=now;
  this.samples.push({t:now,...geometry(ball)});this.samples=this.samples.filter(p=>now-p.t<2.75);
  const span=this.samples.length>1?now-this.samples[0].t:0;
  const xs=this.samples.map(p=>p.center[0]),ys=this.samples.map(p=>p.center[1]);
  if(percentile(xs,.9)-percentile(xs,.1)>55||percentile(ys,.9)-percentile(ys,.1)>45){this.reset();return 0;}
  return span>=1.7?Math.min(1,(now-this.since)/2.25):Math.min(.75,(now-this.since)/2.25);
 }
}

