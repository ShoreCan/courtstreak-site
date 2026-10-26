import {createPoundCounter,createPoundValidator} from '../../src/lib/ai/poundCore.mjs';
export function trial({revision='COUNT 07',fps=30,period=.4,amplitude=.9,scale=1,phase=0,crouched=true,hand=true,feet=true,airborne=false,held=false,jitter=0,missing=false,lateReturn=false,deadline=20}={}){
 const c=createPoundCounter(revision),v=createPoundValidator(revision),floor=(airborne?540:600)*scale,d=80*scale,travel=amplitude*d,top=floor-travel,end=8*period;
 const p={box:[400,80,850,680].map(x=>x*scale),xy:Array.from({length:17},()=>[650*scale,350*scale]),confidence:Array(17).fill(.95)};
 p.xy[5]=[600*scale,(crouched?top-90*scale:150*scale)];p.xy[6]=[710*scale,p.xy[5][1]];p.xy[11]=[650*scale,(crouched?top:350*scale)];p.xy[12]=[710*scale,p.xy[11][1]];p.xy[13]=[650*scale,560*scale];p.xy[14]=[710*scale,560*scale];p.xy[15]=[620*scale,580*scale];p.xy[16]=[730*scale,580*scale];
 p.xy[9]=[760*scale,top-d*.5];p.xy[10]=[760*scale,top-d*.5];
 if(!hand)p.xy[10][0]=1100*scale;
 if(!feet){p.confidence[15]=0;p.confidence[16]=0;}
 const events=[],frames=[];let i=0;
 for(let t=-1+phase;t<end+2;t+=1/fps,i++){
  const active=t>=0&&t<end,y=(held||!active?top:top+travel*(1-Math.cos(2*Math.PI*t/period))/2)+jitter*d*Math.sin(i*2.3999632297);
  const person=structuredClone(p);if(lateReturn&&t>period/2&&t<period+.05)person.xy[10][0]=1100*scale;
  const m=missing&&active&&Math.abs((t%period)-period/2)<1/fps?null:[760*scale,y,d];
  const proposals=c.update(t,m?m.slice(1):null,720*scale);events.push(...v.update(proposals,m,person,t,deadline).map(e=>{c.rememberControlledFloor(e);return e;}));
  frames.push({frameId:i+1,counterFrame:i+1,elapsed:t,inputPhase:active?'active':'countdown',selected:m?{box:[m[0]-d/2,m[1]-d/2,m[0]+d/2,m[1]+d/2],score:.99}:null,person});
 }
 return {c,v,events,frames,evidence:{trackerRevision:revision,displayedCount:v.count,droppedFrameRecords:0,frames,frameSize:[1280,720*scale],timerSeconds:deadline,countedReps:events.map(e=>({time:e.event_timestamp_exact}))}};
}
