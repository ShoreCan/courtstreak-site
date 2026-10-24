// A narrowly bounded continuation across a delayed camera observation.
// This chooses an existing detector proposal; it never invents a ball position.
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const percentile=(values,q)=>{const a=[...values].sort((x,y)=>x-y),p=(a.length-1)*q,i=Math.floor(p);return a[i]+(a[Math.ceil(p)]-a[i])*(p-i);};

export function timedBallContinuation(candidates,samples,now,reference){
 if(!Number.isFinite(now)||!(reference>0)||samples.length<8)return null;
 const last=samples.at(-1),previous=samples.at(-2),gap=now-last.at;
 const intervals=[],speeds=[];
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i],dt=b.at-a.at;
  if(dt<=0||dt>.15)continue;
  intervals.push(dt);
  if(b.diameter/a.diameter>=.8&&b.diameter/a.diameter<=1.25
   &&Math.abs(b.center[0]-a.center[0])<=reference*.75){
   speeds.push(Math.abs(b.center[1]-a.center[1])/dt);
  }
 }
 if(intervals.length<6||speeds.length<6)return null;
 const cadence=percentile(intervals,.5);
 if(gap<=Math.max(.08,cadence*1.5)||gap>.25)return null;
 const recentDt=last.at-previous.at,dy=last.center[1]-previous.center[1];
 if(recentDt<=0||recentDt>.15||Math.abs(dy)<reference*.05)return null;
 // Keep the observed speed envelope, allowing one ball diameter for detector
 // center/blur uncertainty, with a fixed spatial cap independent of the gap.
 const envelope=Math.min(reference*4.5,Math.max(...speeds)*gap+reference);
 const matches=[];
 candidates.forEach((candidate,index)=>{
  const [x1,y1,x2,y2]=candidate.box,center=[(x1+x2)/2,(y1+y2)/2];
  if(![x1,y1,x2,y2,candidate.score].every(Number.isFinite)||x2<=x1||y2<=y1)return;
  const diameter=Math.sqrt(Math.max((x2-x1)*(y2-y1),1));
  if(candidate.score<.2||diameter/reference<.8||diameter/reference>1.3
   ||diameter/last.diameter<.8||diameter/last.diameter>1.25)return;
  if(Math.abs(center[0]-last.center[0])>Math.max(28,reference*.75))return;
  if((center[1]-last.center[1])*dy<=0||distance(center,last.center)>envelope)return;
  matches.push({index,envelope,gap,cadence});
 });
 // Two plausible balls do not establish which is the owned ball.
 return matches.length===1?matches[0]:null;
}

// A strong existing detection can continue an already-owned moving ball across
// a small remembered background object. This is not general reacquisition.
export function strongBallContinuation(candidates,samples,now,reference,velocity,missed){
 if(missed!==0||!Number.isFinite(now)||!Number.isFinite(reference)||reference<=0||samples.length<8)return null;
 const last=samples.at(-1),gap=now-last.at,vy=velocity?.[1];
 if(!Number.isFinite(gap)||gap<=0||gap>.1||!Number.isFinite(vy)||Math.abs(vy)<reference*.05)return null;
 if(!last.center?.every(Number.isFinite)||!Number.isFinite(last.diameter)||last.diameter<=0)return null;
 const matches=[];
 candidates.forEach((candidate,index)=>{
  if(!Array.isArray(candidate.box)||candidate.box.length!==4)return;
  const [x1,y1,x2,y2]=candidate.box;
  if(![x1,y1,x2,y2,candidate.score].every(Number.isFinite)||candidate.score<.5||x2<=x1||y2<=y1)return;
  const diameter=Math.sqrt((x2-x1)*(y2-y1)),center=[(x1+x2)/2,(y1+y2)/2];
  if(diameter/reference<.58||diameter/reference>1.68||diameter/last.diameter<.8||diameter/last.diameter>1.2)return;
  const dx=center[0]-last.center[0],dy=center[1]-last.center[1];
  if(Math.abs(dx)>Math.max(28,diameter*.5)||Math.abs(dy)<diameter*.35||dy*vy<=0||distance(center,last.center)>diameter*1.25)return;
  matches.push(index);
 });
 return matches.length===1?matches[0]:null;
}

// Reacquire only an observed downward continuation corroborated on two
// consecutive detector passes. This never extrapolates a position or creates a bounce.
export function corroboratedBallContinuation(candidates,samples,now,reference,previous){
 if(!Number.isFinite(now)||!Number.isFinite(reference)||!(reference>0)||samples.length<8)return null;
 const last=samples.at(-1),before=samples.at(-2),gap=now-last.at;
 if(!last?.center?.every(Number.isFinite)||!before?.center?.every(Number.isFinite)
  ||!Number.isFinite(last.at)||!Number.isFinite(before.at)||!(last.diameter>0)||!Number.isFinite(last.diameter)
  ||gap<=0||gap>.4||last.at-before.at<=0||last.at-before.at>.15
  ||last.center[1]-before.center[1]<reference*.05)return null;
 const matches=[];
 candidates.forEach((c,index)=>{
  if(!Array.isArray(c.box)||c.box.length!==4)return;
  const [x1,y1,x2,y2]=c.box;
  if(![x1,y1,x2,y2,c.score].every(Number.isFinite)||c.score<.1||x2<=x1||y2<=y1)return;
  const diameter=Math.sqrt((x2-x1)*(y2-y1)),center=[(x1+x2)/2,(y1+y2)/2];
  if(diameter/reference<.85||diameter/reference>1.3||diameter/last.diameter<.8||diameter/last.diameter>1.25)return;
  if(Math.abs(center[0]-last.center[0])>Math.max(28,reference*.6)
   ||center[1]-last.center[1]<reference*.6||distance(center,last.center)>reference*5.5)return;
  matches.push({index,center,diameter,score:c.score,at:now});
 });
 if(matches.length!==1)return null;
 const pending=matches[0],dt=previous?now-previous.at:0;
 const confirmed=previous&&previous.center?.every(Number.isFinite)&&Number.isFinite(previous.diameter)&&previous.diameter>0
  &&previous.score>=.1&&dt>0&&dt<=.12&&pending.score>=.4
  &&pending.diameter/previous.diameter>=.8&&pending.diameter/previous.diameter<=1.2
  &&Math.abs(pending.center[0]-previous.center[0])<=reference*.35
  &&pending.center[1]>=previous.center[1]-reference*.08
  &&distance(pending.center,previous.center)<=reference*1.2;
 return {pending,index:confirmed?pending.index:null,
  velocity:confirmed?pending.center.map((v,i)=>v-previous.center[i]):null};
}

