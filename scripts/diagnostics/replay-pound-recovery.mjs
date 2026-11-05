import fs from 'node:fs';
import {createPoundRecoverySession,updatePoundRecoverySession,POUND_RECOVERY_REVISION} from '../../src/lib/ai/poundRecoverySession.mjs';
import {createSessionTrackingState} from '../../src/lib/ai/sessionTracking.mjs';
const [input,output]=process.argv.slice(2),trial=JSON.parse(fs.readFileSync(input)),recovery=createPoundRecoverySession(),ledger=recovery.ledger,state=createSessionTrackingState(true,'right-hand-pound');
for(const row of trial.rows.filter(r=>r.time<trial.warmupSeconds))state.tracker.select(row.balls,row.person,'setup',1280,720,row.time);
const reference=state.tracker.typical();
const rows=trial.rows.map(row=>{
 const result=updatePoundRecoverySession(recovery,{primaryEvents:row.events,candidates:row.balls,person:row.person,time:row.elapsed,diameter:reference});
 return {...row,events:result.confirmed,count:result.count,candidateMeasurement:result.measurement};
});
fs.writeFileSync(output,JSON.stringify({...trial,configuration:{...trial.configuration,recoveryRevision:POUND_RECOVERY_REVISION},count:ledger.count,confirmed:ledger.confirmed,rows}));
console.log(JSON.stringify({input,count:ledger.count,recoveryOnly:ledger.confirmed.filter(e=>!e.evidence_sources.includes('primary')).length}));
