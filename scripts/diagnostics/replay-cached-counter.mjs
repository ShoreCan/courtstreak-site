import fs from 'node:fs';
import path from 'node:path';
import {createCrossoverCounter} from '../../src/lib/ai/crossoverCounter.mjs';

// Compare counter revisions against identical cached model observations.
// This does not re-run identity selection or reproduce unavailable phone logs.
const [input,output,revision='CROSS 04']=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node replay-cached-counter.mjs INPUT.json OUTPUT.json [REVISION]');
const data=JSON.parse(fs.readFileSync(input)),counter=createCrossoverCounter(revision);
const rows=data.rows.map(row=>{
 const time=Number.isFinite(row.elapsed)?row.elapsed:row.time;
 const events=counter.update([],row.measurement,row.person,time,data.timerSeconds??Infinity);
 return {...row,count:counter.count,events,handoffState:counter.snapshot(),ignoredMeasurement:counter.points.at(-1)?.ignoredReason??null};
});
const result={...data,counterRevision:revision,observationSource:path.basename(input),count:counter.count,confirmed:counter.confirmed,rejected:counter.rejected,rows,
 limitations:[...(data.limitations??[]),'Counter-only comparison on cached observations; no live iPhone accuracy measurement.']};
fs.writeFileSync(output,JSON.stringify(result));
console.log(JSON.stringify({input,revision,count:result.count,rejected:result.rejected.length,ignored:counter.points.filter(p=>p.ignoredReason).map(p=>p.timestamp)}));
