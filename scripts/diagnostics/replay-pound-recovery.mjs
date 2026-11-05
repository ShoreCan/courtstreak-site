import fs from 'node:fs';
import {ControlledPoundCandidate,PoundEventLedger,POUND_RECOVERY_REVISION} from '../../src/lib/ai/controlledPoundRecovery.mjs';
import {createSessionTrackingState} from '../../src/lib/ai/sessionTracking.mjs';
const [input,output]=process.argv.slice(2),trial=JSON.parse(fs.readFileSync(input)),recovery=new ControlledPoundCandidate(),ledger=new PoundEventLedger(),state=createSessionTrackingState(true,'right-hand-pound');
for(const row of trial.rows.filter(r=>r.time<trial.warmupSeconds))state.tracker.select(row.balls,row.person,'setup',1280,720,row.time);
const reference=state.tracker.typical();
const rows=trial.rows.map(row=>{
 const cycles=recovery.update(row.balls,row.person,row.elapsed,reference,Infinity),events=[];
 for(const [source,items]of [['primary',row.events],['controlled_floor_recovery',cycles]])for(const item of items){const event=ledger.add(item,source,row.elapsed);if(event)events.push(event);}
 return {...row,events,count:ledger.count,candidateMeasurement:recovery.measurement};
});
fs.writeFileSync(output,JSON.stringify({...trial,configuration:{...trial.configuration,recoveryRevision:POUND_RECOVERY_REVISION},count:ledger.count,confirmed:ledger.confirmed,rows}));
console.log(JSON.stringify({input,count:ledger.count,recoveryOnly:ledger.confirmed.filter(e=>!e.evidence_sources.includes('primary')).length}));
