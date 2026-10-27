import test from 'node:test';
import assert from 'node:assert/strict';
import {floorBallContinuation} from '../src/lib/ai/ballTiming.mjs';
import {BallIdentityTracker} from '../src/lib/ai/poundCore.mjs';
import {CURRENT_POUND_CONFIGURATION,configurationForEvidence} from '../src/lib/ai/trackerConfiguration.mjs';

function input(){
 const person={confidence:Array(17).fill(.95),xy:Array.from({length:17},()=>[500,1000])};
 person.xy[9]=person.xy[10]=[500,650];
 return{candidates:[{box:[450,920,550,1020],score:.95}],samples:Array.from({length:8},(_,i)=>({at:i*.075,center:[500,470+i*40],diameter:100,score:.8})),now:.6,reference:100,person};
}
const run=d=>floorBallContinuation(d.candidates,d.samples,d.now,d.reference,d.person,{allowRegularCadence:true});
test('one strong floor observation continues a measured descent during an ordinary 75ms frame interval',()=>{
 const d=input(),before=structuredClone(d);assert.deepEqual(run(d),{index:0,envelope:320,regularCadence:true});assert.deepEqual(d,before);
 assert.equal(floorBallContinuation(d.candidates,d.samples,d.now,d.reference,d.person),null);
});
const refusals={
 'weak current proposal':d=>d.candidates[0].score=.89,
 'weak latest approach':d=>d.samples.at(-1).score=.49,
 'weak preceding approach':d=>d.samples.at(-2).score=.39,
 'missing approach confidence':d=>delete d.samples.at(-2).score,
 'nonfinite approach confidence':d=>d.samples.at(-1).score=Infinity,
 'held ball':d=>d.samples.at(-2).center[1]=750,
 'ascending ball':d=>d.samples.at(-2).center[1]=790,
 'insufficient descent':d=>d.samples.at(-2).center[1]=725,
 'too short interval':d=>d.now=.575,
 'irregular approach interval':d=>d.samples.at(-2).at=.4,
 'out of order clock':d=>d.now=.5,
 'excessive drop':d=>{d.candidates[0].box=[450,960,550,1060];},
 'lateral jump':d=>{d.candidates[0].box=[486,920,586,1020];},
 'airborne proposal':d=>d.person.xy[15][1]=d.person.xy[16][1]=1100,
 'missing body':d=>d.person=null,
 'uncertain foot':d=>d.person.confidence[15]=.69,
 'cropped foot':d=>d.person.xy[16]=[0,1000],
 'size change':d=>d.candidates[0].box=[430,900,570,1040],
 'ambiguous floor proposals':d=>d.candidates.push({box:[460,920,560,1020],score:.8}),
};
for(const[name,edit]of Object.entries(refusals))test(`regular floor continuation rejects ${name}`,()=>{const d=input();edit(d);assert.equal(run(d),null);});

function tracker(enabled=true){
 const d=input(),t=new BallIdentityTracker({...CURRENT_POUND_CONFIGURATION.identityOptions,regularFloorContinuity:enabled,diagnostics:true});
 t.last=[500,750];t.diameter=100;t.velocity=[0,10];t.diameters=Array(12).fill(100);t.lanes=Array(12).fill(500);t.samples=d.samples;
 t.background=[{center:[500,970],diameter:50,observations:5}];return{d,t};
}
test('only the moving foreground ball can cross a smaller remembered object; comparable and larger objects retain their veto',()=>{
 for(const diameter of[50,74,75,100,140]){
  const{d,t}=tracker();t.background[0].diameter=diameter;
  const selected=t.select(d.candidates,d.person,'drill',1280,1280,d.now);
  assert.equal(selected,diameter<75?d.candidates[0]:null);
 }
 const{d,t}=tracker(false);assert.equal(t.select(d.candidates,d.person,'drill',1280,1280,d.now),null);assert.equal(t.decisions[0].reason,'background_memory');
});
test('setup, countdown, uncalibrated and interrupted tracks never gain this background exception',()=>{
 for(const mode of['setup','countdown','uncalibrated','missing']){
  const{d,t}=tracker();if(mode==='uncalibrated')t.diameters=[];if(mode==='missing')t.missed=1;
  const phase=['setup','countdown'].includes(mode)?mode:'drill';
  assert.equal(t.select(d.candidates,d.person,phase,1280,1280,d.now),null);
 }
});
test('the floor proof never widens the ordinary motion envelope',()=>{
 const{d,t}=tracker();t.velocity=[0,-450];
 assert.equal(t.select(d.candidates,d.person,'drill',1280,1280,d.now),null);assert.equal(t.decisions[0].reason,'prediction_envelope');
});
test('historical LOCK 09 remains reproducible and only LOCK 10 enables the new proof',()=>{
 const a=configurationForEvidence({trackerRevision:'COUNT 08',ballIdentityRevision:'LOCK 09',liveFrameRevision:'FRAME 02'}),b=configurationForEvidence({trackerRevision:'COUNT 08',ballIdentityRevision:'LOCK 10',liveFrameRevision:'FRAME 02'});
 assert.equal(a.identityOptions.regularFloorContinuity,undefined);assert.equal(b.identityOptions.regularFloorContinuity,true);assert.deepEqual(b,CURRENT_POUND_CONFIGURATION);
});
