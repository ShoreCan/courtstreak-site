import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoundCounter,createPoundValidator} from '../src/lib/ai/poundCore.mjs';
function trial({revision='COUNT 08',fps=20,period=.65,phase=0,scale=1,held=false,jitter=0,hand=true,aboveKnee=false,transfer=false,deadline=20,cadenceJitter=0}={}){
 const c=createPoundCounter(revision),v=createPoundValidator(revision),d=80*scale,top=200*scale,travel=(aboveKnee?150:400)*scale,end=period*8;
 const p={box:[400,60,920,710].map(x=>x*scale),confidence:Array(17).fill(.95),xy:Array.from({length:17},()=>[700*scale,350*scale])};
 p.xy[5]=[550*scale,150*scale];p.xy[6]=[750*scale,150*scale];p.xy[11]=[600*scale,350*scale];p.xy[12]=[700*scale,350*scale];p.xy[13]=[620*scale,520*scale];p.xy[14]=[750*scale,520*scale];p.xy[15]=[600*scale,650*scale];p.xy[16]=[780*scale,650*scale];p.xy[10]=[hand?760*scale:1200*scale,top];
 const events=[];let i=0;
 for(let t=-1+phase;t<end+2;t+=(1+cadenceJitter*Math.sin(i*1.739))/fps,i++){const active=t>=0&&t<end,y=top+(active&&!held&&!transfer?travel*(1-Math.cos(2*Math.PI*t/period))/2:0)+jitter*d*Math.sin(i*2.3999632297),x=760*scale+(transfer?100*scale*Math.sin(t*5):0),m=[x,y,d];for(const e of v.update(c.update(t,m.slice(1),720*scale),m,p,t,deadline)){c.rememberControlledFloor(e);events.push({...e,confirmedAt:t});}}
 return {c,v,events,contacts:Array.from({length:8},(_,i)=>(i+.5)*period).filter(t=>t<deadline)};
}
for(const fps of [10,15,20,30])for(const period of [.45,.65,.9])for(const phase of [0,.013,.045])for(const scale of [.6,1,1.7])test(`COUNT 08 eight contacts ${fps}fps ${period}s phase=${phase} scale=${scale}`,()=>{const r=trial({fps,period,phase,scale});assert.equal(r.v.count,8);r.events.forEach((e,i)=>assert.ok(Math.abs(e.event_timestamp_exact-r.contacts[i])<=1/fps+.001));});
for(const fps of [8,10,15,20,30])for(const mode of [{held:true},{held:true,jitter:.1},{hand:false},{aboveKnee:true},{transfer:true}])test(`COUNT 08 negative ${fps}fps ${JSON.stringify(mode)}`,()=>assert.equal(trial({fps,...mode}).v.count,0));
for(const fps of [10,20,30])test(`COUNT 08 real timestamp spacing and deadline ${fps}fps`,()=>{const r=trial({fps,cadenceJitter:.35,deadline:2.1});assert.equal(r.v.count,r.contacts.length);assert.ok(r.events.every(e=>e.event_timestamp_exact<2.1));});
test('low-rate clean returns can confirm before eight future frames without invented samples',()=>{const a=trial({revision:'COUNT 07',fps:10}),b=trial({fps:10});assert.equal(a.v.count,8);assert.equal(b.v.count,8);assert.ok(b.events[0].confirmedAt<a.events[0].confirmedAt);assert.ok(b.events[0].confirmedAt-b.events[0].event_timestamp_exact>=.29);assert.ok(b.c.points.every(p=>p.observed&&!p.reconstructed));});
