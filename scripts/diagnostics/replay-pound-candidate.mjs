import fs from 'node:fs';
import {ControlledPoundCandidate} from '../../src/lib/ai/controlledPoundRecovery.mjs';
const [input,output]=process.argv.slice(2),trial=JSON.parse(fs.readFileSync(input)),counter=new ControlledPoundCandidate();
const diameter=trial.calibration.samples.length?trial.calibration.samples.map(s=>s.diameter).sort((a,b)=>a-b)[Math.floor(trial.calibration.samples.length/2)]:null;
// Production reference includes all owned setup samples, including a box
// outside the stricter diagnostic wrist annotation. Rebuild it from setup.
import {createSessionTrackingState} from '../../src/lib/ai/sessionTracking.mjs';
const state=createSessionTrackingState(true,'right-hand-pound');
for(const row of trial.rows.filter(r=>r.time<trial.warmupSeconds))state.tracker.select(row.balls,row.person,'setup',1280,720,row.time);
const reference=state.tracker.typical()??diameter;
const point=r=>r&&({time:r.time+trial.warmupSeconds,p:r.p,score:r.score,size:r.size,hd:r.hd});
const rows=trial.rows.map(row=>{const events=counter.update(row.balls,row.person,row.elapsed,reference,Infinity);return {...row,events,count:counter.count,candidateMeasurement:counter.measurement,candidateState:{held:point(counter.held),source:point(counter.flight?.source),last:point(counter.flight?.last),peak:point(counter.flight?.peak),floor:point(counter.flight?.floor)}};});
fs.writeFileSync(output,JSON.stringify({...trial,configuration:{...trial.configuration,counterRevision:'EXPERIMENTAL POUND CYCLE 01'},count:counter.count,confirmed:counter.confirmed,rejected:counter.rejected,rows}));
console.log(JSON.stringify({input,count:counter.count,diameter:reference}));
