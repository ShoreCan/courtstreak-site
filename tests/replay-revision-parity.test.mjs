import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPoundCounter} from '../src/lib/ai/poundCore.mjs';
import {createPoundTrackingState,resetPoundTrackingCounter} from '../src/lib/ai/poundTrackingState.mjs';
import {replayProfileCounter} from '../src/lib/ai/recordedProfile.mjs';
import {auditTracker} from '../scripts/audit-tracker.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${n}.json`,import.meta.url)));
for(const name of ['20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17']){
 test(`saved ${name} replays its recorded counter revision and accepted event sequence`,()=>{
  const d=read(name),r=replayProfileCounter(d);
  assert.equal(r.available,true);assert.equal(r.replayRevision,d.trackerRevision);
  assert.equal(r.matchesRecordedAcceptedEvents,Array.isArray(d.countedReps)?true:null);
 });
}
test('unknown or missing revisions cannot silently replay COUNT 03',()=>{
 for(const revision of ['COUNT 99',undefined]){
  const r=replayProfileCounter({...read('oct22-count05-fast25'),trackerRevision:revision});
  assert.equal(r.available,false);assert.match(r.reason,/Unsupported counter revision/);
 }
});
test('live setup and countdown reset share the version-aware counter factory',()=>{
 const text=fs.readFileSync(new URL('../src/components/ai/IPhonePoundTest.jsx',import.meta.url),'utf8');
 assert.match(text,/createSessionTrackingState\(freshFrames,drillKey\)/);assert.match(text,/resetSessionTrackingCounter\(s\)/);
 const state=createPoundTrackingState();state.counter.update(0,[400,80],720);resetPoundTrackingCounter(state);assert.equal(state.counter.points.length,0);assert.equal(state.counter.lowControlledPounds,true);assert.equal(state.validator.lowControlledPounds,true);
 const c=createPoundCounter('COUNT 05');assert.equal(c.timeWindows,true);assert.equal(c.directionalPeaks,true);
 assert.equal(createPoundCounter('COUNT 03').timeWindows,false);
});
test('audit preserves the known missed-bounce comparison and reports measured gaps',()=>{
 const a=auditTracker(read('oct22-count05-fast25'));
 assert.equal(a.exactCounterReplay.accepted,24);assert.equal(a.currentCount05Lock05.accepted,25);
 assert.ok(a.activeCaptureGapsMs.max>100);assert.ok(a.exactCounterReplay.confirmationDelayMs.median>=500);
 assert.equal(a.savedConfirmationDelayMs,null);
});

test('COUNT 05 keeps eight slow bounces that COUNT 03 misses',()=>{
 const old=createPoundCounter('COUNT 03'),current=createPoundCounter('COUNT 05');
 for(let i=0;i<500;i++){const t=i/30-1,y=t>=0&&t<12.8?200+200*(1-Math.cos(2*Math.PI*t/1.6)):200;old.update(t,[y,80],720);current.update(t,[y,80],720);}
 assert.equal(old.count,0);assert.equal(current.count,8);
});
test('older unidentified counter versions stay explicitly unavailable',()=>{
 const r=replayProfileCounter(read('19-reps'));assert.equal(r.available,false);assert.match(r.reason,/BG FIX 01/);
});
