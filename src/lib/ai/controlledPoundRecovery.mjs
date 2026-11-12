// Experimental causal counter. It consumes observed detector proposals and
// never changes the production identity anchor or detector crop.
import {poundHandConflict} from './poundHandEvidence.mjs';
const MAX_OBSERVATION_GAP_SECONDS = .28;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const visible=(p,i)=>p?.confidence?.[i]>=.5&&p.xy?.[i]?.length===2&&p.xy[i].every(v=>Number.isFinite(v)&&v>0);
export class ControlledPoundCandidate {
 constructor({guardFirstReturn=false}={}){this.guardFirstReturn=guardFirstReturn;this.guardContext=[];this.count=0;this.confirmed=[];this.rejected=[];this.held=null;this.flight=null;this.frame=0;this.lastTime=-Infinity;this.measurement=null;}
 observeGuard(measurement,person,time){
  const hands={};for(const [hand,i]of [['left',9],['right',10]])if(visible(person,i))hands[hand]=[...person.xy[i]];
  const row={time,measurement:measurement?[...measurement]:null,hands},last=this.guardContext.at(-1);
  if(last?.time===time){if(!last.measurement&&measurement)this.guardContext[this.guardContext.length-1]=row;return;}
  this.guardContext.push(row);this.guardContext=this.guardContext.slice(-64);
 }
 update(candidates,person,now,diameter,deadline=Infinity,guardMeasurement=null){
  if(!Number.isFinite(now)||now<=this.lastTime)return [];
  this.lastTime=now;this.frame++;this.measurement=null;
  // Guard evidence follows the owned selected ball even when the right-hand
  // recovery crop rejects it. Otherwise a left-hand receipt disappears from
  // this path's history and the next bounce can falsely finish the old one.
  if(this.guardFirstReturn)this.observeGuard(guardMeasurement,person,now);
  if(!(diameter>0)||!visible(person,10)||!visible(person,15)||!visible(person,16))return [];
  const d=diameter,feet=Math.max(person.xy[15][1],person.xy[16][1]),wrist=person.xy[10];
  const rows=candidates.flatMap(c=>{
   if(!c?.box||c.box.length!==4||![...c.box,c.score].every(Number.isFinite)||c.score<.001)return [];
   const [x1,y1,x2,y2]=c.box;if(x2<=x1||y2<=y1)return [];
   const size=Math.sqrt((x2-x1)*(y2-y1)),p=[(x1+x2)/2,(y1+y2)/2],aspect=(x2-x1)/(y2-y1);
   const floorShape=c.score>=.008&&y2>=feet-d*.65&&y2<=feet+d*1.2;
   if(size/d<(c.score>=.008?.58:.76)||size/d>1.45||aspect<.65||aspect>(floorShape?2.2:1.6)||Math.abs(p[0]-wrist[0])>d*3.5||p[1]>feet+d*.8)return [];
   const pixels=c.source==='floor_pixels';
   const hd=distance(p,wrist)/d,other=visible(person,9)?distance(p,person.xy[9])/d:Infinity;
   return [{p,size,score:c.score,time:now,frame:this.frame,hd,owner:!pixels&&hd<=1.15&&other-hd>=.2&&c.score>=.008,feet,...(pixels?{pixels}: {})}];
  });
  const owned=rows.filter(r=>r.owner&&r.p[1]<feet-d*.5).sort((a,b)=>a.hd-b.hd||b.score-a.score)[0];
  if(now<0){this.held=owned??null;this.flight=null;return [];}
  if(!this.flight){
   if(now>=deadline)return [];
   const source=this.held;
   const release=source&&now-source.time<=.65?rows.filter(r=>r.score>=.003&&r.p[1]-source.p[1]>=d*.5&&Math.abs(r.p[0]-source.p[0])<=d*2).sort((a,b)=>distance(a.p,source.p)-distance(b.p,source.p)||b.score-a.score)[0]:null;
   if(!release){if(owned)this.held=owned;else if(source&&now-source.time>.65)this.held=null;return [];}
   this.flight={source,last:source,peak:source,floor:null,receipts:[]};
  }
  const f=this.flight;
  if(now>deadline+.15){this.flight=null;return [];}
  if(!f.floor&&owned&&now-f.source.time>.25&&owned.p[1]<=f.source.p[1]+d*.2){this.rejected.push({reason:'unobserved_floor_reanchor',time:now});this.flight=null;this.held=owned;return [];}
  if(now-f.last.time>MAX_OBSERVATION_GAP_SECONDS||now-f.source.time>1.6){this.rejected.push({reason:'observation_gap',time:now});this.flight=null;this.held=owned??null;return [];}
  const options=rows.filter(r=>Math.abs(r.p[0]-f.last.p[0])<=d*2&&distance(r.p,f.last.p)<=d*(2+35*(now-f.last.time))&&(!f.floor||r.p[1]<=f.last.p[1]+d*.35));
  const cost=r=>{
   // An observed low point can outrank weak detector proposals when there is
   // no selected ball. The turn and same-cycle receipt still need proof.
   const visibleFloor=r.pixels&&!guardMeasurement&&!f.floor&&r.p[1]+r.size*.5>=feet-d*.35;
   return distance(r.p,f.last.p)/d+Math.abs(Math.log(r.size/d))*.8-Math.log(Math.max(r.score,.001))*.08-(visibleFloor ? .65 : 0);
  };
  options.sort((a,b)=>cost(a)-cost(b));
  const row=options[0];if(!row)return [];
  this.measurement=[...row.p,row.size];
  if(this.guardFirstReturn&&!guardMeasurement&&!row.pixels)this.observeGuard([...row.p,row.size],person,now);
  if(!f.floor&&row.p[1]>f.peak.p[1])f.peak=row;
  const peak=f.peak,bottom=peak.p[1]+peak.size*.5;
  if(!f.floor&&peak.score>=.008&&peak.time>f.source.time&&row.time>peak.time&&bottom>=peak.feet-d*.65&&bottom<=peak.feet+d*1.2&&peak.p[1]-f.source.p[1]>=d*.8&&peak.p[1]-row.p[1]>=d*.4)f.floor=peak;
  if(f.floor){
   const conflict=this.guardFirstReturn?poundHandConflict({event_timestamp_exact:f.floor.time,bottom_center_y:f.floor.p[1],ball_scale_pixels:d},this.guardContext):null;
   if(conflict){this.rejected.push({reason:conflict,time:now,floorTime:f.floor.time});this.flight=null;this.held=owned??null;return [];}
   if(f.floor.time>=deadline){this.flight=null;return [];}
   if(row.time>f.floor.time&&row.p[1]<=f.floor.p[1]-d*.4&&row.p[1]>=f.source.p[1]+d*.5)f.observedAscent=true;
   if(owned&&now>f.floor.time&&owned.p[1]<=f.floor.p[1]-d*.6)f.receipts.push(owned);
   const best=f.receipts.slice().sort((a,b)=>a.hd-b.hd)[0];
   const control=best&&f.receipts.some(prior=>prior!==owned&&owned&&now-prior.time>=.03&&now-prior.time<=.2&&distance(prior.p,owned.p)<=d*.6);
   const redirect=best&&!row.pixels&&now>best.time&&now-best.time<=.2&&row.p[1]-best.p[1]>=d*.2;
   if(f.observedAscent&&(control||redirect)){
    const event={count:++this.count,event_frame:f.floor.frame,event_timestamp_exact:f.floor.time,event_time_seconds:f.floor.time,floor_contact_time_seconds:f.floor.time,release_time_seconds:f.source.time,from_hand:'right',to_hand:'right',validation_path:'experimental_observed_pound_cycle',control_evidence:control?'observed_hand_control':'observed_hand_redirect',...(f.floor.pixels?{floor_evidence:'observed_floor_pixels'}:{})};
    this.confirmed.push(event);this.flight=null;this.held=owned??best;return [event];
   }
  }
  f.last=row;return [];
 }
}

export const POUND_RECOVERY_REVISION='OBSERVED FLOOR 01';
// One ledger combines independent proofs of the same floor contact. Original
// counter state, learned floor references, selection and ROI remain untouched.
export class PoundEventLedger {
 constructor({cycleAwareDedup=false}={}){this.cycleAwareDedup=cycleAwareDedup;this.count=0;this.confirmed=[];this.pending=[];this.rejected=[];}
 add(event,source,now){
  const time=event.floor_contact_time_seconds??event.event_timestamp_exact??event.event_time_seconds;
  if(!Number.isFinite(time)||time<0||time>now)return null;
  const duplicate = this.confirmed.find(previous => {
   const previousTime = previous.floor_contact_time_seconds;
   if (Math.abs(previousTime - time) <= .16) return true;
   if (!this.cycleAwareDedup || Math.abs(previousTime - time) > MAX_OBSERVATION_GAP_SECONDS) return false;
   // Two floor estimates from one release cannot both be controlled pounds.
   // A distinct fast cycle can begin from new control after the earlier floor.
   const later = time > previousTime ? event : previous;
   const earlierFloor = Math.min(time, previousTime);
   return Number.isFinite(later.release_time_seconds) && later.release_time_seconds < earlierFloor;
  });
  if(duplicate){if(!duplicate.evidence_sources.includes(source))duplicate.evidence_sources.push(source);return null;}
  const accepted={...event,count:++this.count,floor_contact_time_seconds:time,evidence_sources:[source],confirmed_time_seconds:now};
  this.confirmed.push(accepted);return accepted;
 }
}
