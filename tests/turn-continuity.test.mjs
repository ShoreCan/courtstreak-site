import test from 'node:test';
import assert from 'node:assert/strict';
import {floorBallContinuation,corroboratedBallContinuation} from '../src/lib/ai/ballTiming.mjs';
import {BallIdentityTracker} from '../src/lib/ai/poundCore.mjs';
const pose=()=>({confidence:Array(17).fill(.95),xy:Array.from({length:17},(_,i)=>[500,i===10?600:1000])});
const apex=()=>({candidates:[{box:[450,950,550,1050],score:.95}],samples:[-.15,-.12,-.09,-.06,-.03,0,.13,.30].map((at,i)=>({at,center:[500,i===7?600:i===6?720:1000],diameter:100})),now:.42,reference:100,person:pose()});
const runApex=(d,enabled=true)=>floorBallContinuation(d.candidates,d.samples,d.now,d.reference,d.person,{allowApexReturn:enabled});
test('recent floor-to-hand-to-floor observations permit a strong return after a sampled ascent',()=>{
 const d=apex(),before=structuredClone(d);assert.equal(runApex(d,false),null);assert.equal(runApex(d).index,0);assert.deepEqual(d,before);
});
const apexCases={
 'no recent floor observation':d=>{d.samples.slice(0,6).forEach(q=>q.center[1]=600);},
 'old floor observation':d=>{d.samples.slice(0,6).forEach(q=>q.at-=1);},
 'different floor height':d=>{d.samples.slice(0,6).forEach(q=>q.center[1]=1080);},
 'different floor lane':d=>{d.samples.slice(0,6).forEach(q=>q.center[0]=580);},
 'differently sized prior floor ball':d=>{d.samples.slice(0,6).forEach(q=>q.diameter=140);},
 'weak current detector proposal':d=>{d.candidates[0].score=.89;},
 'uncertain right wrist':d=>{d.person.confidence[10]=.69;},
 'missing right wrist':d=>{d.person.xy[10]=null;},
 'last observed ball away from hand':d=>{d.person.xy[10]=[700,600];},
 'no observed ascent':d=>{d.samples.at(-2).center[1]=600;},
 'stale approach':d=>{d.samples.at(-2).at=.05;},
 'long gap':d=>{d.now=.51;},
 'uncertain ankle':d=>{d.person.confidence[15]=.69;},
 'malformed ankle':d=>{d.person.xy[15]=[500];},
 'ambiguous balls':d=>{d.candidates.push({box:[455,950,555,1050],score:.96});}
};
for(const [name,edit] of Object.entries(apexCases))test(`apex-return recovery refuses ${name}`,()=>{const d=apex();edit(d);assert.equal(runApex(d),null);});

const moving=()=>({candidates:[{box:[450,940,550,1040],score:.95}],samples:Array.from({length:8},(_,i)=>({at:i*.03,center:[500,50+i*100],diameter:100})),now:.27,reference:100,previous:{center:[500,860],diameter:100,score:.95,at:.24},person:pose()});
const runMoving=(d,enabled=true)=>corroboratedBallContinuation(d.candidates,d.samples,d.now,d.reference,d.previous,{movingRecovery:enabled,person:d.person});
test('two distinct, strong, size-consistent proposals near the feet establish moving recovery',()=>{
 const d=moving(),before=structuredClone(d);assert.equal(runMoving(d,false).index,null);const r=runMoving(d);assert.equal(r.index,0);assert.equal(r.moving,true);assert.deepEqual(r.velocity,[0,130]);assert.deepEqual(d,before);
});
const movingCases={
 'stationary corroboration':d=>{d.previous.center=[500,990];},
 'upward corroboration':d=>{d.previous.center=[500,1050];},
 'weak first proposal':d=>{d.previous.score=.89;},
 'weak second proposal':d=>{d.candidates[0].score=.89;},
 'too little observed displacement':d=>{d.previous.center=[500,970];},
 'excessive observed displacement':d=>{d.previous.center=[500,820];},
 'lateral displacement':d=>{d.previous.center=[475,860];},
 'size mismatch':d=>{d.previous.diameter=115;},
 'uncertain ankle':d=>{d.person.confidence[15]=.69;},
 'missing pose':d=>{d.person=null;},
 'malformed ankle':d=>{d.person.xy[15]=[500];},
 'invalid ankle':d=>{d.person.xy[15]=[0,1000];},
 'candidate far above feet':d=>{d.person.xy[15][1]=1300;d.person.xy[16][1]=1300;},
 'candidate far below feet':d=>{d.person.xy[15][1]=700;d.person.xy[16][1]=700;},
 'stale first proposal':d=>{d.previous.at=.17;},
 'backward corroboration clock':d=>{d.previous.at=.28;}
};
for(const [name,edit] of Object.entries(movingCases))test(`moving recovery cannot bypass background exclusion with ${name}`,()=>{const d=moving();edit(d);assert.notEqual(runMoving(d)?.moving,true);});
test('two eligible moving balls remain ambiguous',()=>{const d=moving();d.candidates.push({box:[455,940,555,1040],score:.96});assert.equal(runMoving(d),null);});
function memoryTracker(d,enabled){
 d.person.xy[9]=[100,600];
 const t=new BallIdentityTracker({handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,corroboratedContinuity:true,floorContinuity:true,turnContinuity:enabled});
 t.samples=structuredClone(d.samples);t.last=[500,750];t.diameter=100;t.velocity=[0,100];t.missed=1;t.diameters=Array(12).fill(100);t.lanes=Array(12).fill(500);t.provisionalBall=structuredClone(d.previous);t.background=[{center:[500,990],diameter:100,observations:5}];return t;
}
test('moving proof can recover an owned ball across comparable-size background memory',()=>{
 const d=moving(),old=memoryTracker(d,false),current=memoryTracker(d,true);
 assert.equal(old.select(d.candidates,d.person,'drill',1280,1800,d.now),null);
 assert.deepEqual(current.select(d.candidates,d.person,'drill',1280,1800,d.now),d.candidates[0]);
});
test('stationary two-pass corroboration still cannot cross same-size background memory',()=>{
 const d=moving();d.previous.center=[500,990];const t=memoryTracker(d,true);assert.equal(t.select(d.candidates,d.person,'drill',1280,1800,d.now),null);
});
test('a substantially larger remembered object retains its veto with moving proof',()=>{
 const d=moving(),t=memoryTracker(d,true);t.background[0].diameter=200;assert.equal(t.select(d.candidates,d.person,'drill',1280,1800,d.now),null);
});
