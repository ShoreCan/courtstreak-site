import {createPoundCounter,createPoundValidator} from '../../src/lib/ai/poundCore.mjs';

// Orthographic synthetic geometry: the floor is y=640, ball radius 40,
// so a real floor-contact center is y=600. No model inference is simulated.
export function scenario({revision='COUNT 10',fps=30,period=.4,travel=32,jitter=0,countdownMotion='still',countdownJitter=0,
 held=false,airborne=false,wrongHand=false,ambiguous=false,outside=false,lateJitter=false,stopAfter=null,otherHandFirstReturn=false,otherHandRelease=false}={}){
 const c=createPoundCounter(revision),v=createPoundValidator(revision),events=[],frames=[],d=80,end=8*period;
 const p={box:[400,80,850,640],xy:Array.from({length:17},()=>[650,350]),confidence:Array(17).fill(.95)};
 p.xy[5]=[600,220];p.xy[6]=[710,220];p.xy[11]=[650,380];p.xy[12]=[710,380];p.xy[13]=[650,450];p.xy[14]=[710,450];p.xy[15]=[620,640];p.xy[16]=[730,640];
 const x=outside?1100:760;
 for(let i=-fps*2;i<Math.ceil((end+2)*fps);i++){
  const t=i/fps,active=t>=0&&t<end,floor=airborne?520:600,top=floor-travel;
  const stopped=stopAfter!==null&&t>=stopAfter*period;
  const approach=t<-.8&&countdownMotion==='reposition'?-200*Math.min(1,(-t-.8)/1.2):t<-.6&&countdownMotion==='warmup'?-100*(1+Math.cos(8*t)):0;
  const y=top+approach+(!held&&!stopped&&active?travel*(1-Math.cos(2*Math.PI*t/period))/2:0)+(t<0?countdownJitter:lateJitter&&stopped?9.6:jitter)*Math.sin(i*2.3999632297);
  const person=structuredClone(p);person.xy[10]=[wrongHand?450:x,top-40];person.xy[9]=[ambiguous?x:wrongHand?x:450,top-40];
  if(otherHandFirstReturn&&t>period/2&&t<period+.05||otherHandRelease&&t<period/2){person.xy[10]=[450,top-40];person.xy[9]=[x,top-40];}
  const m=[x,y,d],proposals=c.update(t,m.slice(1),720);
  for(const e of v.update(proposals,m,person,t,end)){c.rememberControlledFloor(e);events.push(e);}
  const ball={box:[x-d/2,y-d/2,x+d/2,y+d/2],score:.99};
  frames.push({frameId:frames.length+1,counterFrame:frames.length+1,elapsed:t,inputPhase:t<0?'countdown':active?'active':'review',person,selected:ball,balls:[ball]});
 }
 return {count:v.count,events,frames,rejected:v.rejected,minimumMotion:c.minimumObservedMotion,noiseCalibration:c.noiseCalibration};
}
