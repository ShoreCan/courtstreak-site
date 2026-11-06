import test from 'node:test';import assert from 'node:assert/strict';
import {repairBallROI,repairCounterPose,repairPoseNeeded,repairConfiguration} from '../src/lib/ai/repairPolicy.mjs';
import {createSessionTrackingState} from '../src/lib/ai/sessionTracking.mjs';
import {safariConfiguration} from '../src/lib/ai/safariPolicy.mjs';
import {configurationForEvidence} from '../src/lib/ai/trackerConfiguration.mjs';
const person=()=>{const p={box:[300,300,1000,1700],xy:Array.from({length:17},()=>[640,900]),confidence:Array(17).fill(.95)};p.xy[9]=[450,1000];p.xy[10]=[850,1000];p.xy[15]=[450,1700];p.xy[16]=[800,1700];return p;};
test('hand-to-floor crop retains ball/wrist/floor margins and reacquires full view after loss',()=>{
 const p=person(),ball={box:[800,1300,1000,1500],score:.8},args={person:p,ball,diameter:200,width:1280,height:2276,now:10,poseAt:9.95,lastBallAt:9.97,drillKey:'right-hand-pound'};
 const roi=repairBallROI(args);assert.ok(roi[0]<800&&roi[2]>=1000&&roi[1]<1000&&roi[3]>1700);assert.ok(roi[3]-roi[1]<1958);
 assert.deepEqual(repairBallROI({...args,lastBallAt:9.5}),[0,0,1280,2276]);
 assert.deepEqual(repairBallROI({...args,poseAt:9.5}),[0,0,1280,2276]);
});
test('older wrist coordinates cannot establish receipt while a fresh-enough floor anchor remains usable',()=>{
 const p=person();assert.equal(repairCounterPose(p,10,10.07,10.1),p);
 const masked=repairCounterPose(p,10,10.2,10.22);assert.equal(masked.confidence[9],0);assert.equal(masked.confidence[10],0);assert.equal(masked.confidence[15],.95);assert.equal(p.confidence[10],.95);
 assert.equal(repairCounterPose(p,10,10.4,10.42),null);assert.equal(repairCounterPose(p,10.2,10.1,10.22),null);
});
test('body work rests between hand receipts but has a bounded refresh interval',()=>{
 const p=person(),base={person:p,poseAt:10,lastRequestedAt:10,now:10.15,phase:'active'};
 assert.equal(repairPoseNeeded({...base,ball:{box:[810,1650,890,1730]}}),false);
 assert.equal(repairPoseNeeded({...base,ball:{box:[810,960,890,1040]}}),true);
 assert.equal(repairPoseNeeded({...base,now:10.25,ball:{box:[810,1650,890,1730]}}),true);
 assert.equal(repairPoseNeeded({...base,now:10.05,ball:null}),false);
 assert.equal(repairPoseNeeded({...base,now:10.09,phase:'setup',ball:null}),true);
 assert.equal(repairPoseNeeded({...base,now:10.09,phase:'countdown',ball:null}),true);
});
test('candidate has its own count rules, crop/pose policy and exact evidence identity',()=>{
 const state=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true});
 const base=safariConfiguration(state.configuration,'right-hand-pound'),config=repairConfiguration(base,'right-hand-pound');
 assert.equal(base.counterRevision,'COUNT 08');assert.equal(config.counterRevision,'COUNT 09');assert.equal(config.observationPolicy.floorView,false);
 const decoded=configurationForEvidence({trackerRevision:config.counterRevision,ballIdentityRevision:config.identityRevision,liveFrameRevision:config.liveFrameRevision,trackerConfiguration:config});
 assert.deepEqual(decoded,config);
});
