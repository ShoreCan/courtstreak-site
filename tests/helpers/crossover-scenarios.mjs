import {CrossoverCounter} from '../../src/lib/ai/crossoverCounter.mjs';
export function person(handY=350){
 const p={box:[350,60,930,690],xy:Array.from({length:17},()=>[640,300]),confidence:Array(17).fill(.95)};
 p.xy[0]=[640,100];p.xy[5]=[550,230];p.xy[6]=[730,230];p.xy[9]=[440,handY];p.xy[10]=[840,handY];p.xy[11]=[570,420];p.xy[12]=[710,420];p.xy[15]=[540,660];p.xy[16]=[740,660];return p;
}
export const ball=(x,y,d=60)=>({box:[x-d/2,y-d/2,x+d/2,y+d/2],score:.95});
export function trial({fps=30,period=.6,hold=.15,reps=6,handY=350,bottom=630,start='right',sameHand=false,noBounce=false,missing=()=>false,deadline=20,pose=person(handY)}={}){
 const counter=new CrossoverCounter(),frames=[],confirmed=[];let t=-.8,source=start;
 const push=(time,m,p=pose)=>{frames.push({time,measurement:m,person:p});confirmed.push(...counter.update([],m,p,time,deadline));};
 for(;t<0;t+=1/fps)push(t,[source==='right'?840:440,handY,60]);
 let begin=0;
 for(let rep=0;rep<reps;rep++){
  const target=sameHand?source:source==='right'?'left':'right',from=source==='right'?840:440,to=target==='right'?840:440;
  for(let step=0;step<Math.round(period*fps);step++){
   const phase=step/Math.round(period*fps),time=begin+phase*period;
   push(time,missing({rep,phase,time})?null:[from+(to-from)*phase,handY+(noBounce?45:bottom-handY)*Math.sin(Math.PI*phase),60]);
  }
  begin+=period;
  for(let step=0;step<Math.max(1,Math.round(hold*fps));step++)push(begin+step/fps,[to,handY,60]);
  begin+=hold;source=target;
 }
 for(let step=0;step<12;step++)push(begin+step/fps,[source==='right'?840:440,handY,60]);
 return {counter,confirmed,frames};
}

