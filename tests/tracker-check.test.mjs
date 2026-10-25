import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CURRENT_POUND_CONFIGURATION,CURRENT_POUND_SESSION_PATH,isPoundCameraMode,configurationForEvidence,replayOptionsForConfiguration} from '../src/lib/ai/trackerConfiguration.mjs';
import {createPoundTrackingState,resetPoundTrackingCounter} from '../src/lib/ai/poundTrackingState.mjs';
import {BallIdentityTracker} from '../src/lib/ai/poundCore.mjs';
import {RoundEvidence} from '../src/lib/ai/roundEvidence.mjs';
import {replayBallLock,replayConfiguredRound} from '../scripts/replay-ball-lock.mjs';
import {auditRoundPatterns,compareRoundPatterns} from '../scripts/audit-round-patterns.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url)));
test('both public camera modes resolve to the same current state and complete resets retain its settings',()=>{
 for(const mode of ['iphone-vision-test','iphone-fresh-frame-test'])assert.equal(isPoundCameraMode(mode),true);
 for(const mode of [null,'ai-test','recorded-profile','anything'])assert.equal(isPoundCameraMode(mode),false);
 assert.equal(new URL(CURRENT_POUND_SESSION_PATH,'https://example.invalid').searchParams.get('mode'),'iphone-fresh-frame-test');
 const first=createPoundTrackingState();assert.equal(first.configuration,CURRENT_POUND_CONFIGURATION);
 assert.equal(first.counter.lowControlledPounds,true);assert.equal(first.validator.lowControlledPounds,true);
 for(const [key,value] of Object.entries(first.configuration.identityOptions))assert.equal(first.tracker[key],value);
 const previous=first.counter;previous.update(0,[400,80],720);first.validator.count=5;resetPoundTrackingCounter(first);
 assert.notEqual(first.counter,previous);assert.equal(first.counter.points.length,0);assert.equal(first.validator.count,0);assert.equal(first.counter.lowControlledPounds,true);
 const independent=createPoundTrackingState();assert.notEqual(independent.tracker,first.tracker);assert.notEqual(independent.counter,first.counter);
 assert.throws(()=>{CURRENT_POUND_CONFIGURATION.identityOptions.turnContinuity=false;},TypeError);
});

test('actual UI entry and legacy alias use the shared mode resolver and current component',()=>{
 const detail=fs.readFileSync(new URL('../src/pages/LabDrillDetail.jsx',import.meta.url),'utf8');
 const session=fs.readFileSync(new URL('../src/pages/LabDrillSession.jsx',import.meta.url),'utf8');
 assert.match(detail,/navigate\(CURRENT_POUND_SESSION_PATH\)/);assert.doesNotMatch(detail,/mode=iphone-vision-test/);
 assert.match(session,/isPoundCameraMode\(/);assert.equal((session.match(/<IPhonePoundTest/g)??[]).length,1);assert.match(session,/<IPhonePoundTest key="fresh-frames" freshFrames/);
});

for(const name of ['oct22-slow17','oct22-lock03-slow15','oct24-lock06-fast15','oct24-lock06-normal15-pass','oct24-lock06-slow15-pass','oct24-lock07-fast35']){
 test(`recorded configuration reproduces saved events and selections in ${name}`,()=>{
  const d=read(name),r=replayConfiguredRound(d);assert.equal(r.cropCompatible,true);assert.equal(r.selectionMatches,r.frames);assert.equal(r.matchesSavedAcceptedEvents,true);
 });
}

test('missing, unknown and contradictory settings never silently become the current tracker',()=>{
 const d=read('oct24-lock06-fast15');
 for(const changes of [{trackerRevision:'COUNT 99'},{ballIdentityRevision:'LOCK 99'},{ballIdentityRevision:null}])assert.throws(()=>configurationForEvidence({...d,...changes}),/revision/);
 const config=configurationForEvidence(d);assert.deepEqual(configurationForEvidence({...d,trackerConfiguration:JSON.parse(JSON.stringify(config))}),config);
 const reordered={...config,identityOptions:Object.fromEntries(Object.entries(config.identityOptions).reverse())};
 assert.deepEqual(configurationForEvidence({...d,trackerConfiguration:reordered}),config);
 for(const changed of [{...config,identityOptions:{...config.identityOptions,floorContinuity:true}},{...config,counterOptions:{...config.counterOptions,timeWindows:false}},{...config,liveFrameRevision:'FRAME 99'}]){
  assert.throws(()=>configurationForEvidence({...d,trackerConfiguration:changed}),/conflicts/);
 }
 assert.throws(()=>replayConfiguredRound({...d,droppedFrameRecords:1}),/discarded/);
});

for(const name of ['19-reps','20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17','oct24-lock06-fast15','oct24-lock06-normal15-pass','oct24-lock06-slow15-pass','oct24-lock07-fast35']){
 test(`selection diagnostics preserve events, selections and crops in ${name}`,()=>{
  const d=read(name),options=replayOptionsForConfiguration(CURRENT_POUND_CONFIGURATION),a=replayBallLock(d,options),b=replayBallLock(d,{...options,diagnostics:true});
  assert.deepEqual(b.events,a.events);assert.deepEqual(b.changedFrames,a.changedFrames);assert.equal(b.proposed,a.proposed);assert.equal(b.roiMismatches,a.roiMismatches);
  for(const f of b.frameDecisions){const recorded=d.frames.find(x=>x.frameId===f.frameId);assert.equal(f.decisions.length,recorded.balls.length);assert.equal(f.decisions.filter(x=>x.status==='selected').length,f.selected?1:0);}
 });
}

const ball=(x,y,d=80)=>({box:[x-d/2,y-d/2,x+d/2,y+d/2],score:.9});
function locked(){const t=new BallIdentityTracker({diagnostics:true});t.last=[500,400];t.diameter=80;t.diameters=Array(12).fill(80);t.lanes=Array(12).fill(500);return t;}
test('diagnostics distinguish an absent proposal, a background veto, size and jump rejection',()=>{
 const absent=locked();assert.equal(absent.select([],null,'drill',1280,1000,0),null);assert.deepEqual(absent.decisions,[]);
 const bg=locked();bg.background=[{center:[500,500],diameter:80,observations:5}];assert.equal(bg.select([ball(500,500)],null,'drill',1280,1000,0),null);assert.equal(bg.decisions[0].reason,'background_memory');
 const size=locked();size.select([ball(500,500,200)],null,'drill',1280,1000,0);assert.equal(size.decisions[0].reason,'size_ratio');
 const jump=locked();jump.select([ball(500,900)],null,'drill',1280,1000,0);assert.equal(jump.decisions[0].reason,'jump_from_last');
 const selected=locked(),candidate=ball(500,410);assert.equal(selected.select([candidate],null,'drill',1280,1000,0),candidate);assert.equal(selected.decisions[0].status,'selected');
});

test('recorded selection decisions are copied, and the next frame cannot mutate earlier evidence',()=>{
 const e=new RoundEvidence(),decisions=[{candidateIndex:0,status:'rejected',reason:'background_memory'}];
 e.record({capturedAt:1,inputPhase:'active',phase:'active',roi:[0,0,1280,720],balls:[ball(500,500)],person:null,selected:null,selectionDecisions:decisions,positionChecks:{}});
 decisions[0].reason='changed';assert.equal(e.frames[0].selectionDecisions[0].reason,'background_memory');
});

test('pattern report separates absent proposals, selection decisions and unavailable physical truth',()=>{
 const d=read('oct24-lock07-fast35'),r=auditRoundPatterns(d,{file:'fast33'});
 assert.equal(r.exactRecordedReproduction,true);assert.equal(r.noProposals,7);assert.equal(r.proposalsButNoSelection,36);assert.equal(r.noSelectionFramesByRejectionReason.background_memory,24);
 assert.equal(r.recorded.accepted,33);assert.equal(r.current.accepted,35);assert.match(r.physicalGroundTruth,/Not supplied/);
 assert.equal(r.decisionReasonSources.recomputed_exact_saved_inputs,r.activeObservations);
 const summary=compareRoundPatterns([r,r]);assert.equal(summary.recurringSoftwareReasons.background_memory.observations,48);assert.equal(summary.limitations.length,4);
 const unknown=auditRoundPatterns({...d,ballIdentityRevision:null});assert.equal(unknown.recorded.available,false);assert.deepEqual(unknown.noSelectionFramesByRejectionReason,{});
});

test('a changed crop invalidates comparison usability instead of presenting the replay as a full-pipeline improvement',()=>{
 const d=read('oct24-lock06-fast15'),f=d.frames.find(f=>f.inputPhase==='active');f.roi=[0,0,...d.frameSize];
 const r=replayConfiguredRound(d);assert.equal(r.cropCompatible,false);assert.match(r.comparisonLimit,/fresh model inference/);
});
