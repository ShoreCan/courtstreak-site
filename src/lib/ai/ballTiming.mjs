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
