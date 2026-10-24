import test from 'node:test';
import assert from 'node:assert/strict';
import {GapAwareBounceCounter,PoundControlValidator} from '../src/lib/ai/poundCore.mjs';
function run({fps=30,period=.8,absent=false,farHand=false,aboveKnee=false,deadline=20,jitter=0,stopAfter=null}={}){
 const c=new GapAwareBounceCounter({directionalPeaks:true,timeWindows:true,earlyConfirmation:true}),v=new PoundControlValidator(),end=8*period;
 const p={box:[400,80,850,680],xy:Array.from({length:17},()=>[650,350]),confidence:Array(17).fill(.95)};
 p.xy[5]=[600,200];p.xy[6]=[700,200];p.xy[10]=[farHand?100:760,200];p.xy[11]=[600,350];p.xy[12]=[650,350];p.xy[13]=[650,aboveKnee?1000:500];p.xy[14]=[700,aboveKnee?1000:500];
 const events=[];
 for(let i=0;i<Math.ceil((end+3)*fps);i++){
  const t=i/fps-1;
  let y=t>=0&&t<end?200+200*(1-Math.cos(2*Math.PI*t/period)):200;
  y+=jitter*80*Math.sin(i*2.3999632297);
  const m=stopAfter!==null&&t>stopAfter?null:[760,y,80];
  const proposed=c.update(t,m?m.slice(1):null,720);
  events.push(...v.update(proposed,m,absent?null:p,t,deadline));
  events.forEach(e=>{if(!e.remembered){c.rememberControlledFloor(e);e.remembered=true;}});
 }
 return {counter:c,validator:v,events};
}
for(const fps of [10,15,20,24,30])for(const period of [.25,.4,.8,1.6,2]){
 test(`early validator: visible floor-to-hand return validates eight bounces: ${fps}fps ${period}s`,()=>assert.equal(run({fps,period}).validator.count,8));
 test(`early validator: missing pose cannot validate reps: ${fps}fps ${period}s`,()=>assert.equal(run({fps,period,absent:true}).validator.count,0));
 test(`early validator: no right-hand return cannot validate reps: ${fps}fps ${period}s`,()=>assert.equal(run({fps,period,farHand:true}).validator.count,0));
 test(`early validator: motion entirely above knees cannot validate reps: ${fps}fps ${period}s`,()=>assert.equal(run({fps,period,aboveKnee:true}).validator.count,0));
}
for(const fps of [10,15,20,24,30]){
 test(`early validator: a vanished ball does not manufacture later returns: ${fps}fps`,()=>{
  const r=run({fps,stopAfter:2.1});assert.ok(r.events.every(e=>e.event_timestamp_exact<2.1));assert.ok(r.events.length<=3);
 });
 test(`early validator: contacts after the deadline stay excluded: ${fps}fps`,()=>{
  const r=run({fps,deadline:3});assert.equal(r.events.length,4);assert.ok(r.events.every(e=>e.event_timestamp_exact<3));
 });
}

