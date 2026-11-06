import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoundCounter,createPoundValidator} from '../src/lib/ai/poundCore.mjs';

// Orthographic synthetic geometry: the floor is y=640, ball radius 40,
// so a real floor-contact center is y=600. No model inference is simulated.
function scenario({revision='COUNT 09',fps=30,period=.4,travel=32,jitter=0,
 held=false,airborne=false,wrongHand=false,ambiguous=false,outside=false,lateJitter=false,stopAfter=null}={}){
 const c=createPoundCounter(revision),v=createPoundValidator(revision),events=[],d=80,end=8*period;
 const p={box:[400,80,850,640],xy:Array.from({length:17},()=>[650,350]),confidence:Array(17).fill(.95)};
 p.xy[5]=[600,220];p.xy[6]=[710,220];p.xy[11]=[650,380];p.xy[12]=[710,380];p.xy[13]=[650,450];p.xy[14]=[710,450];p.xy[15]=[620,640];p.xy[16]=[730,640];
 const x=outside?1100:760;
 for(let i=-fps;i<Math.ceil((end+2)*fps);i++){
  const t=i/fps,active=t>=0&&t<end,floor=airborne?520:600,top=floor-travel;
  const stopped=stopAfter!==null&&t>=stopAfter*period;
  const y=top+(!held&&!stopped&&active?travel*(1-Math.cos(2*Math.PI*t/period))/2:0)+(lateJitter&&stopped?9.6: jitter)*Math.sin(i*2.3999632297);
  const person=structuredClone(p);person.xy[10]=[wrongHand?450:x,top-40];person.xy[9]=[ambiguous?x:wrongHand?x:450,top-40];
  const m=[x,y,d],proposals=c.update(t,m.slice(1),720);
  for(const e of v.update(proposals,m,person,t,end)){c.rememberControlledFloor(e);events.push(e);}
 }
 return {count:v.count,events,rejected:v.rejected};
}
for(const fps of [15,20,30])for(const travel of [16,24,32,48])test(`eight low floor contacts at ${fps}Hz and ${travel}px travel`,()=>{
 assert.equal(scenario({fps,travel}).count,8);
});
test('adaptive low-motion path removes the old 0.6-diameter requirement',()=>{
 assert.equal(scenario({revision:'COUNT 08',travel:32}).count,0);
 assert.equal(scenario({travel:32}).count,8);
});
for(const options of [{held:true},{held:true,jitter:9.6},{airborne:true},{wrongHand:true},{ambiguous:true}])
 test(`low-motion false-count control ${JSON.stringify(options)}`,()=>assert.equal(scenario(options).count,0));
test('verified right-hand floor cycles can finish outside the torso region',()=>assert.equal(scenario({outside:true}).count,8));
for(const fps of [15,30])test(`new detector jitter after six real contacts does not invent floor contacts at ${fps}Hz`,()=>assert.equal(scenario({fps,stopAfter:6,lateJitter:true}).count,6));
test('expired low proposals identify missing proof instead of accusing a mishandle',()=>{
 const r=scenario({airborne:true});assert.ok(r.rejected.length>0);
 assert.ok(r.rejected.every(e=>e.control_status==='unverified_rep'&&e.failed_checks.includes('unverified_floor')));
});
