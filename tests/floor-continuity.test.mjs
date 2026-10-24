import test from 'node:test';
import assert from 'node:assert/strict';
import {floorBallContinuation} from '../src/lib/ai/ballTiming.mjs';

const sample=()=>({
 candidates:[{box:[450,950,550,1050],score:.9}],
 samples:Array.from({length:8},(_,i)=>({at:i*.03,center:[500,580+i*10],diameter:100})),
 now:.33,reference:100,
 person:{confidence:Array(17).fill(.95),xy:Array.from({length:17},()=>[500,1000])}
});
const run=d=>floorBallContinuation(d.candidates,d.samples,d.now,d.reference,d.person);
test('recover one strong, same-size detector proposal at the visible feet across a short descent gap',()=>{
 const d=sample(),before=structuredClone(d);const r=run(d);
 assert.deepEqual(r,{index:0,envelope:450});assert.deepEqual(d,before);
});
const cases={
 'held ball':d=>{d.samples.at(-2).center[1]=650;},
 'ascending ball':d=>{d.samples.at(-2).center[1]=670;},
 'short gap':d=>{d.now=.25;},
 'long gap':d=>{d.now=.41;},
 'reversed clock':d=>{d.now=.1;},
 'stale approach':d=>{d.samples.at(-2).at=0;},
 'weak candidate':d=>{d.candidates[0].score=.74;},
 'ball too small':d=>{d.candidates[0].box=[460,960,540,1040];},
 'ball too large':d=>{d.candidates[0].box=[430,930,570,1070];},
 'sideways jump':d=>{d.candidates[0].box=[510,950,610,1050];},
 'high airborne ball':d=>{d.candidates[0].box=[450,800,550,900];},
 'below plausible floor':d=>{d.candidates[0].box=[450,1150,550,1250];},
 'far vertical jump':d=>{d.candidates[0].box=[450,1150,550,1250];d.person.xy[15][1]=1200;d.person.xy[16][1]=1200;},
 'insufficient vertical jump':d=>{d.candidates[0].box=[450,750,550,850];d.person.xy[15][1]=800;d.person.xy[16][1]=800;},
 'uncertain ankle':d=>{d.person.confidence[15]=.69;},
 'missing ankle':d=>{d.person.xy[15]=null;},
 'ankle outside image':d=>{d.person.xy[15]=[0,1000];},
 'absent pose':d=>{d.person=null;},
 'insufficient history':d=>{d.samples=d.samples.slice(-7);},
 'ambiguous matching balls':d=>{d.candidates.push({box:[460,950,560,1050],score:.95});},
 'nonfinite clock':d=>{d.now=NaN;},
 'nonfinite reference':d=>{d.reference=Infinity;},
 'invalid prior size':d=>{d.samples.at(-1).diameter=0;},
 'invalid prior center':d=>{d.samples.at(-1).center=[NaN,650];},
 'invalid prior clock':d=>{d.samples.at(-2).at=NaN;},
 'absent history':d=>{d.samples=null;},
 'absent candidates':d=>{d.candidates=null;},
 'malformed candidate':d=>{d.candidates=[null];},
 'nonfinite score':d=>{d.candidates[0].score=NaN;},
 'inverted box':d=>{d.candidates[0].box=[550,950,450,1050];}
};
for(const [name,edit] of Object.entries(cases))test(`floor continuation refuses ${name}`,()=>{const d=sample();edit(d);assert.equal(run(d),null);});
