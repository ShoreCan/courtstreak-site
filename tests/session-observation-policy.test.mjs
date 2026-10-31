import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionObservationPolicy,poseFrameSkew} from '../src/lib/ai/sessionObservationPolicy.mjs';
import {createSessionTrackingState} from '../src/lib/ai/sessionTracking.mjs';
import {CURRENT_POUND_CONFIGURATION} from '../src/lib/ai/trackerConfiguration.mjs';
import {runDetectionPass} from '../src/lib/ai/detectionPass.mjs';
import {RoundEvidence} from '../src/lib/ai/roundEvidence.mjs';
import {SetupReadinessClock} from '../src/lib/ai/setupReadiness.mjs';

test('crossovers request both models on every image without an independent worker or intervening capture',()=>{
 const p=sessionObservationPolicy('stationary-crossover');
 assert.equal(p.asyncPose,false);assert.equal(p.poseEveryPass,true);assert.equal(p.refreshBallFrame,false);
 assert.equal(createSessionTrackingState(true,'stationary-crossover').configuration.observationPolicy,p);
});
test('pound scheduling and its saved configuration are preserved',()=>{
 assert.deepEqual(sessionObservationPolicy('right-hand-pound'),{revision:'WORKER 01 / FRAME 02',asyncPose:true,poseEveryPass:false,refreshBallFrame:true});
 assert.equal(createSessionTrackingState().configuration,CURRENT_POUND_CONFIGURATION);
 assert.equal(sessionObservationPolicy('right-hand-pound',false).asyncPose,false);
 assert.equal(sessionObservationPolicy('right-hand-pound',false).refreshBallFrame,false);
});
test('the paired path retains image identity even when a newer camera frame arrives during pose inference',async()=>{
 const p=sessionObservationPolicy('stationary-crossover'),image={width:1280,height:720,id:'capture-1'},newer={...image,id:'capture-2'},seen=[];let now=1000;
 const r=await runDetectionPass({frame:image,roi:[0,0,1280,720],withPose:p.poseEveryPass,
  refreshBallFrame:p.refreshBallFrame?()=>({frame:newer,capturedAt:1.3,sourceVideoTime:2.3}):undefined,
  runPose:async frame=>{seen.push(['pose',frame.id]);now+=300;return {value:{capture:frame.id}};},
  runBall:async frame=>{seen.push(['ball',frame.id]);now+=60;return {value:[{capture:frame.id}]};},clock:()=>now});
 assert.deepEqual(seen,[['pose','capture-1'],['ball','capture-1']]);assert.equal(r.ballFrameRefreshed,undefined);
 assert.equal(r.ms,360);assert.equal(poseFrameSkew(1,1),0); // Pairing does not claim fast inference.
});
test('the pound path still refreshes the ball after a scheduled body pass',async()=>{
 const p=sessionObservationPolicy('right-hand-pound'),image={width:1280,height:720,id:1},latest={...image,id:2},seen=[];
 const r=await runDetectionPass({frame:image,roi:[0,0,1280,720],withPose:true,
  refreshBallFrame:p.refreshBallFrame?()=>({frame:latest,capturedAt:1.3,sourceVideoTime:2.3}):undefined,
  runPose:async f=>{seen.push(f.id);return {value:{}};},runBall:async f=>{seen.push(f.id);return {value:[]};}});
 assert.deepEqual(seen,[1,2]);assert.equal(r.ballFrameRefreshed,true);
});
test('pairing does not make inadequate processing speed pass the countdown',()=>{
 const c=new SetupReadinessClock({handMode:'either'}),checks={valid:true,body:true,hand:true,floor:true,ball:true,owned:true};
 for(let i=0;i<60;i++)assert.equal(c.update(i*.15,checks,false,true).ready,false);
});
test('evidence retains zero frame skew and independent video timestamps',()=>{
 const e=new RoundEvidence();e.record({capturedAt:1,sourceVideoTime:2,phase:'active',inputPhase:'active',roi:[0,0,1280,720],balls:[],person:null,selected:null,positionChecks:{},poseCapturedAt:1,poseSourceVideoTime:2,poseFrameSkewSeconds:0});
 const row=e.export({startedAt:1}).frames[0];assert.equal(row.poseFrameSkewSeconds,0);assert.equal(row.poseSourceVideoTime,2);
 assert.ok(Math.abs(poseFrameSkew(1.4,1)-.4)<1e-9);assert.equal(poseFrameSkew(1,-Infinity),null);
});
