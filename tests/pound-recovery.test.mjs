import test from 'node:test';
import assert from 'node:assert/strict';
import {ControlledPoundCandidate,PoundEventLedger} from '../src/lib/ai/controlledPoundRecovery.mjs';
import {person,ball,trial} from './helpers/crossover-scenarios.mjs';
const run=frames=>{const counter=new ControlledPoundCandidate();for(const f of frames)counter.update(f.measurement?[ball(...f.measurement)]:[],f.person,f.time,60,20);return counter;};
test('recovery requires a measured floor turn and a controlled right-hand return',()=>{
 const source=trial({sameHand:true,reps:1,fps:30});assert.equal(run(source.frames).count,1);
});
for(const fps of [10,15,30])for(const variant of [{noBounce:true},{sameHand:false},{sameHand:true,missing:({phase})=>phase>.25&&phase<.8}])test(`no speculative recovery at ${fps}fps: ${JSON.stringify(variant)}`,()=>{
 assert.equal(run(trial({fps,reps:5,...variant}).frames).count,0);
});
test('a stationary floor distractor disappearing beside a held ball cannot produce recovery',()=>{
 const c=new ControlledPoundCandidate(),p=person();
 for(let i=0;i<120;i++){const t=i/30;c.update([ball(840,350),...(i<30||i>60?[ball(840,630)]:[])],p,t,60,20);}
 assert.equal(c.count,0);
});
test('missing right wrist or feet cannot validate recovery',()=>{
 for(const index of [10,15,16]){const frames=trial({sameHand:true,reps:1}).frames.map(f=>({...f,person:structuredClone(f.person)}));for(const f of frames)f.person.confidence[index]=0;assert.equal(run(frames).count,0);}
});
test('a post-deadline floor cannot be recovered and duplicate frames do not duplicate a cycle',()=>{
 const frames=trial({sameHand:true,reps:1,fps:30}).frames,c=new ControlledPoundCandidate(),late=new ControlledPoundCandidate();
 for(const row of frames)for(let i=0;i<2;i++){
  const balls=row.measurement?[ball(...row.measurement)]:[];
  c.update(balls,row.person,row.time,60,20);late.update(balls,row.person,row.time,60,.1);
 }
 assert.equal(c.count,1);assert.equal(late.count,0);
});
test('the ledger counts two proofs once and preserves separate fast bounces',()=>{
 const ledger=new PoundEventLedger(),event=t=>({event_timestamp_exact:t});
 assert.equal(ledger.add(event(1),'primary',1.2).count,1);
 assert.equal(ledger.add(event(1.03),'recovery',1.3),null);
 assert.equal(ledger.add(event(1.25),'recovery',1.4).count,2);
 assert.deepEqual(ledger.confirmed[0].evidence_sources,['primary','recovery']);
 assert.equal(ledger.add(event(-.1),'recovery',1.5),null);
 assert.equal(ledger.add(event(2),'recovery',1.5),null);
});
