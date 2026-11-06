import test from 'node:test';import assert from 'node:assert/strict';
import {BallIdentityTracker} from '../src/lib/ai/poundCore.mjs';
import {observedBallProposal} from '../src/lib/ai/observedBallIdentity.mjs';
import {hasFreshCameraPixels,captureMirroredFrame} from '../src/lib/ai/cameraFrameCapture.mjs';
import {finishCompletedReview} from '../src/lib/ai/sessionCompletion.mjs';
import {createSessionTrackingState} from '../src/lib/ai/sessionTracking.mjs';
import {configurationForEvidence} from '../src/lib/ai/trackerConfiguration.mjs';
import {person,ball} from './helpers/crossover-scenarios.mjs';
const sample=(at,x,y,score=.9)=>({at,center:[x,y],diameter:60,score});

test('an uncertain partial background ball cannot replace the held-ball identity',()=>{
 const partial={box:[700,500,724,565],score:.02};
 assert.equal(observedBallProposal(partial,[sample(0,720,300)],person(),.03,60).allowed,false);
 assert.equal(observedBallProposal(ball(720,350,60),[sample(0,720,300)],person(),.03,60).allowed,true);
});
test('a weak floor object cannot teleport a rising ball back to the floor',()=>{
 const samples=[sample(1,840,470),sample(1.033,840,445),sample(1.067,840,420)];
 const shoe={box:[820,610,855,655],score:.0019};
 assert.equal(observedBallProposal(shoe,samples,person(),1.1,60).allowed,false);
 const coherent={...ball(840,395,60),score:.003};
 assert.equal(observedBallProposal(coherent,samples,person(),1.1,60).allowed,true);
 assert.equal(observedBallProposal(coherent,samples,person(),1.4,60).allowed,false);
});
test('weak observations continue a recent path without acquiring an unobserved identity',()=>{
 const s=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true,streamingPound:true});
 for(let i=0;i<30;i++)s.tracker.select([ball(840,350)],person(),'setup',1280,720,i/30);
 s.tracker.freezeCalibration();s.tracker.select([ball(840,380)],person(),'drill',1280,720,1.01);
 const weak={...ball(840,405),score:.003};
 assert.equal(s.tracker.select([weak],person(),'drill',1280,720,1.043),weak);
 assert.equal(observedBallProposal(weak,s.tracker.samples,person(),1.4,60).allowed,false);
 const empty=new BallIdentityTracker({observedIdentity:true,weakContinuity:true});
 assert.equal(empty.select([weak],person(),'drill',1280,720,1),null);
});
test('observed motion may reverse near a visible wrist instead of following a straight-line prediction',()=>{
 const p=person();p.xy[10]=[840,350];
 const samples=[sample(1,840,430),sample(1.033,840,365)];
 assert.equal(observedBallProposal({...ball(840,395,60),score:.003},samples,p,1.067,60).allowed,true);
 assert.equal(observedBallProposal({box:[805,470,875,590],score:.02},samples,p,1.067,60).allowed,true);
});
test('filtered proposal diagnostics retain the original detector indices',()=>{
 const s=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true,streamingPound:true});
 for(let i=0;i<30;i++)s.tracker.select([ball(840,350)],person(),'setup',1280,720,i/30);
 s.tracker.freezeCalibration();const partial={box:[830,320,850,390],score:.02},good=ball(840,370);
 assert.equal(s.tracker.select([partial,good],person(),'drill',1280,720,1),good);
 assert.equal(s.tracker.decisions[0].reason,'uncertain_partial_object');assert.equal(s.tracker.decisions[1].candidateIndex,1);assert.equal(s.tracker.decisions[1].status,'selected');
});
test('streaming is a separately versioned pound configuration; the published paired configuration remains replayable',()=>{
 for(const streamingPound of [false,true]){
  const s=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true,streamingPound});
  assert.equal(s.tracker.observedIdentity,streamingPound);
  assert.equal(s.configuration.observationPolicy.asyncPose,streamingPound);
  assert.equal(s.configuration.observationPolicy.poseEveryPass,!streamingPound);
  const e={trackerRevision:s.configuration.counterRevision,ballIdentityRevision:s.configuration.identityRevision,liveFrameRevision:s.configuration.liveFrameRevision,trackerConfiguration:s.configuration};
  assert.deepEqual(configurationForEvidence(e),s.configuration);
 }
 assert.throws(()=>createSessionTrackingState(true,'stationary-crossover',undefined,false,{enhancedTracking:true,streamingPound:true}),/independent right-hand-pound/);
});
test('Safari zero media time does not discard a genuinely new presented camera frame',()=>{
 const base={nativeCapture:true,previousSerial:100,sourceFrame:{serial:101,sourceVideoTime:0},currentTime:0,previousTime:0};
 assert.equal(hasFreshCameraPixels(base),true);assert.equal(hasFreshCameraPixels({...base,sourceFrame:{serial:100,sourceVideoTime:0}}),false);
 assert.equal(hasFreshCameraPixels({...base,sourceFrame:null}),false);
 assert.equal(hasFreshCameraPixels({...base,nativeCapture:false}),false);
});
test('portrait frame refresh mirrors native pixels and retains canonical detector coordinates',()=>{
 const calls=[],canvas={width:720,height:1280,getContext:()=>({save(){},restore(){},translate(...a){calls.push(['translate',...a]);},scale(...a){calls.push(['scale',...a]);},drawImage(...a){calls.push(['draw',...a]);}})},video={};
 const frame=captureMirroredFrame(video,canvas,{width:1280,height:2276,nativeCapture:true});
 assert.equal(frame.image,canvas);assert.equal(frame.width,1280);assert.equal(frame.height,2276);
 assert.deepEqual(calls,[['translate',720,0],['scale',-1,1],['draw',video,0,0,720,1280]]);
});
test('post-buzzer review loss cannot relabel a completed drill as partial or invent another rep',()=>{
 const s={phase:'review',started:10,count:11,left:0};
 assert.equal(finishCompletedReview(s,31.151,20,'Ball lost'),true);assert.equal(s.phase,'finished');assert.equal(s.count,11);assert.equal(s.reviewInterruptionReason,'Ball lost');
 for(const phase of ['active','countdown','setup'])assert.equal(finishCompletedReview({...s,phase},31.151,20,'Ball lost'),false);
 assert.equal(finishCompletedReview({phase:'review',started:10},29.99,20,'Ball lost'),false);
});
