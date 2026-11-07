import test from 'node:test';
import assert from 'node:assert/strict';
import {scenario} from './helpers/adaptive-pound-scenario.mjs';
import {geometry} from '../src/lib/ai/poundCore.mjs';
import {createSessionTrackingState,resetSessionTrackingCounter,updateSessionCounter} from '../src/lib/ai/sessionTracking.mjs';
import {repairConfiguration} from '../src/lib/ai/repairPolicy.mjs';
import {safariConfiguration} from '../src/lib/ai/safariPolicy.mjs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
import {shiftPreGoTimeline} from '../src/lib/ai/setupGuidance.mjs';

// Exercise the same identity -> primary validator -> supplemental recovery ->
// ledger used by the live camera. No saved clip timestamps or expected totals
// are used as inputs to any counting decision.
function liveScenario(options){
 const generated=scenario(options),state=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true});
 state.configuration=repairConfiguration(safariConfiguration(state.configuration,'right-hand-pound'),'right-hand-pound');
 resetSessionTrackingCounter(state);
 const results=[];
 for(const frame of generated.frames){
  const ball=state.tracker.select(frame.balls,frame.person,frame.elapsed<0?'countdown':'drill',1280,720,frame.elapsed);
  const g=ball?geometry(ball):null;
  results.push(updateSessionCounter(state,frame.elapsed,g?[...g.center,g.diameter]:null,frame.person,720,8*(options.period??.4),frame.balls));
 }
 const cached=replayBallLock({frames:generated.frames,frameSize:[1280,720],droppedFrameRecords:0,timerSeconds:8*(options.period??.4)},
  {...state.configuration.identityOptions,counterRevision:state.configuration.counterRevision});
 return {state,count:results.at(-1).count,cached};
}

for(const fps of [15,30])for(const options of [
 {period:.2,travel:16,countdownMotion:'warmup'},
 {period:.65,travel:64,countdownMotion:'reposition'},
 {travel:160},
])test(`live shared pipeline counts complete cycles at ${fps}Hz: ${JSON.stringify(options)}`,()=>{
 const result=liveScenario({fps,...options});
 assert.equal(result.state.configuration.counterRevision,'COUNT 10');
 assert.equal(result.count,8);assert.equal(result.cached.accepted,8);
});
for(const options of [
 {travel:160,airborne:true},
 {held:true},{held:true,jitter:9.6,countdownJitter:9.6},
 {wrongHand:true},{ambiguous:true},{wrongHand:true,travel:160},{ambiguous:true,travel:160},
])test(`neither live counting path awards an invalid cycle: ${JSON.stringify(options)}`,()=>{
 const result=liveScenario(options);
 assert.equal(result.count,0);assert.equal(result.state.validator.count,0);
 assert.equal(result.state.recovery.counter.count,0);assert.equal(result.cached.accepted,0);
});
for(const fps of [15,20,30])for(const error of ['otherHandFirstReturn','otherHandRelease'])test(`a later valid cycle cannot repair an earlier wrong-hand cycle at ${fps}Hz: ${error}`,()=>{
 const options={fps,travel:160,[error]:true};
 assert.equal(scenario({...options,revision:'COUNT 09'}).count,8);
 const result=liveScenario(options);
 assert.equal(result.count,7);assert.equal(result.state.validator.count,7);
 assert.equal(result.cached.accepted,7);
 assert.ok(result.state.recovery.ledger.confirmed.every(e=>Math.abs(e.floor_contact_time_seconds-.2)>.05));
});
test('cached identity checks retain the live partial-object guard',()=>{
 const generated=scenario({held:true}),frames=structuredClone(generated.frames);
 const target=frames.find(f=>f.elapsed>=.1&&f.inputPhase==='active'),[x1,y1,x2,y2]=target.balls[0].box,cx=(x1+x2)/2,cy=(y1+y2)/2;
 target.balls=[{box:[cx-120,cy-20,cx+120,cy+20],score:.05}];
 const replay=replayBallLock({frames,frameSize:[1280,720],droppedFrameRecords:0},{counterRevision:'COUNT 10',partialObjectGuard:true,diagnostics:true});
 assert.equal(replay.frameDecisions.find(r=>r.frameId===target.frameId).decisions[0].reason,'uncertain_partial_object');
});
test('a countdown pause shifts every live recovery clock before the next observation',()=>{
 const generated=scenario({travel:160}),state=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true});
 state.configuration=repairConfiguration(safariConfiguration(state.configuration,'right-hand-pound'),'right-hand-pound');resetSessionTrackingCounter(state);
 state.tracker.diameters=Array(12).fill(80);
 const held=generated.frames.find(f=>f.elapsed===-1),g=geometry(held.selected),measurement=[...g.center,g.diameter];
 for(let i=30;i>=3;i--)updateSessionCounter(state,-i/30,measurement,held.person,720,3.2,held.balls);
 const recovery=state.recovery.counter,previous=state.counter.points.at(-1).timestamp;
 shiftPreGoTimeline(state,.4);
 assert.equal(recovery.lastTime,previous-.4);assert.equal(recovery.held.time,previous-.4);
 assert.equal(recovery.guardContext.at(-1).time,previous-.4);
 const before=recovery.frame;
 updateSessionCounter(state,previous-.4+1/30,measurement,held.person,720,3.2,held.balls);
 assert.equal(recovery.frame,before+1);
 for(const frame of generated.frames.filter(f=>f.elapsed>=0)){
  const m=geometry(frame.selected);updateSessionCounter(state,frame.elapsed,[...m.center,m.diameter],frame.person,720,3.2,frame.balls);
 }
 assert.equal(state.recovery.ledger.count,8);
});
