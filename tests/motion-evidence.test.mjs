import test from 'node:test';
import assert from 'node:assert/strict';
import {observedMotionContinuation,crossoverFloorReconnect} from '../src/lib/ai/ballTiming.mjs';
import {BallIdentityTracker} from '../src/lib/ai/poundCore.mjs';
import {person,ball,trial} from './helpers/crossover-scenarios.mjs';
import {createCrossoverCounter} from '../src/lib/ai/crossoverCounter.mjs';

const samples=()=>[{at:1,center:[600,400],diameter:60,score:.6},{at:1.033333,center:[620,440],diameter:60,score:.4}];
const proposal=(x,y,d=60,score=.003)=>({...ball(x,y,d),score});
test('weak continuation needs actual motion, clear feet and one plausible measured location',()=>{
 const p=person(),s=samples(),c=proposal(640,480);
 assert.equal(observedMotionContinuation([c],s,p,1.066667,60),0);
 assert.equal(observedMotionContinuation([],s,p,1.066667,60),null);
 assert.equal(observedMotionContinuation([c],s,p,1.2,60),null);
 assert.equal(observedMotionContinuation([c],s.map(q=>({...q,score:.001})),p,1.066667,60),null);
 p.confidence[15]=0;assert.equal(observedMotionContinuation([c],s,p,1.066667,60),null);
});
test('distinct plausible weak positions are ambiguous; overlapping duplicate boxes are one location',()=>{
 const s=samples(),p=person();
 assert.equal(observedMotionContinuation([proposal(620,480),proposal(655,480)],s,p,1.066667,60),null);
 assert.equal(observedMotionContinuation([proposal(640,480),proposal(642,480)],s,p,1.066667,60),0);
});
test('supplemental evidence does not move the accepted identity or next detector crop',()=>{
 const tracker=new BallIdentityTracker({handContinuity:true,weakContinuity:true,timedContinuity:true,regularFloorContinuity:true,motionLock:true,diagnostics:true});
 Object.assign(tracker,{last:[620,440],diameter:60,diameters:Array(15).fill(60),lanes:Array(15).fill(640),samples:samples(),velocity:[0,0],missed:0});
 const before=structuredClone({last:tracker.last,diameter:tracker.diameter,samples:tracker.samples,roi:tracker.roi(1280,720)});
 const chosen=proposal(640,480),distractor=proposal(650,440,37);
 assert.equal(tracker.select([chosen,distractor],person(),'drill',1280,720,1.066667),chosen);
 assert.equal(tracker.decisions[0].reason,'observed_ball_motion');
 assert.deepEqual({last:tracker.last,diameter:tracker.diameter,samples:tracker.samples,roi:tracker.roi(1280,720)},before);
 assert.equal(tracker.missed,1);
});
test('motion evidence preserves remembered-background veto',()=>{
 const tracker=new BallIdentityTracker({weakContinuity:true,motionLock:true,diagnostics:true});
 Object.assign(tracker,{last:[620,440],diameter:60,diameters:Array(15).fill(60),lanes:Array(15).fill(640),samples:samples(),velocity:[0,0],background:[{center:[640,480],diameter:60,observations:8}]});
 assert.equal(tracker.select([proposal(640,480)],person(),'drill',1280,720,1.066667),null);
});
test('floor reconnect requires a short descending trajectory and unique floor proposal',()=>{
 const p=person();p.xy[15]=[500,630];p.xy[16]=[800,630];
 const s=[{at:1,center:[580,350],diameter:60},{at:1.033333,center:[600,410],diameter:60}],c=proposal(660,590,60,.7);
 assert.equal(crossoverFloorReconnect([c],s,p,1.133333,60),0);
 assert.equal(crossoverFloorReconnect([c,c],s,p,1.133333,60),null);
 assert.equal(crossoverFloorReconnect([c],s,p,1.4,60),null);
});
test('bounded finish verifies a pre-buzzer floor without admitting a new post-buzzer rep',()=>{
 const frames=trial({reps:1,period:.8}).frames;
 const eligible=createCrossoverCounter('CROSS 10'),expired=createCrossoverCounter('CROSS 10'),baseline=createCrossoverCounter('CROSS 09');
 const receipt=trial({reps:1,period:.8}).confirmed[0].event_timestamp_exact;
 for(const row of frames){
  eligible.update([],row.measurement,row.person,row.time,receipt-.02);
  expired.update([],row.measurement,row.person,row.time,receipt-.3);
  baseline.update([],row.measurement,row.person,row.time,receipt-.02);
 }
 assert.equal(eligible.count,1);assert.equal(eligible.confirmed[0].finished_after_time,true);
 assert.equal(expired.count,0);assert.equal(baseline.count,0);
 const after=createCrossoverCounter('CROSS 10');for(const row of frames)after.update([],row.measurement,row.person,row.time,-.01);
 assert.equal(after.count,0);
});
