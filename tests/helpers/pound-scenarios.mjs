import {GapAwareBounceCounter} from '../../src/lib/ai/poundCore.mjs';
export function simulate({fps=30,period=.8,scale=1,phase=0,jitter=0,cadenceJitter=0,periods=null,pause=0,held=false,missing=()=>false,timeWindows=true,earlyConfirmation=false}={}){
 const c=new GapAwareBounceCounter({directionalPeaks:true,timeWindows,earlyConfirmation});
 const durations=periods??Array(8).fill(period),cycles=[];let end=0;
 durations.forEach((duration,i)=>{if(i===4)end+=pause;cycles.push({start:end,duration,contact:end+duration/2});end+=duration;});
 const events=[];let t=-1+phase,i=0;
 while(t<end+2){
  const cycle=cycles.find(c=>t>=c.start&&t<c.start+c.duration);
  let y=200*scale;
  if(!held&&cycle)y+=200*scale*(1-Math.cos(2*Math.PI*(t-cycle.start)/cycle.duration));
  y+=jitter*80*scale*Math.sin(i*2.3999632297);
  const m=missing({t,i,cycle})?null:[y,80*scale];
  for(const e of c.update(t,m,720*scale))events.push({...e,emittedAt:t});
  t+=(1+cadenceJitter*Math.sin(i*1.739))/fps;i++;
 }
 return {counter:c,events,contacts:held?[]:cycles.map(c=>c.contact),durations,jitter};
}

