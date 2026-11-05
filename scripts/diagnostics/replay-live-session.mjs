// Replays the live session entry point against saved measured inputs. This
// checks counter integration, not inference speed or physical camera accuracy.
import fs from 'node:fs';
import {createSessionTrackingState,updateSessionCounter} from '../../src/lib/ai/sessionTracking.mjs';
const [input,output,drill='right-hand-pound']=process.argv.slice(2),trial=JSON.parse(fs.readFileSync(input));
const state=createSessionTrackingState(true,drill,'CROSS 11',false,{enhancedTracking:true});
if(drill==='right-hand-pound'){
 for(const row of trial.rows.filter(r=>r.time<trial.warmupSeconds))state.tracker.select(row.primaryBalls??row.balls,row.person,'setup',1280,trial.frameSize[1],row.time);
 state.tracker.freezeCalibration();
}
const rows=trial.rows.map(row=>{
 const result=updateSessionCounter(state,row.elapsed,row.measurement,row.person,trial.frameSize[1],drill==='stationary-crossover'?20:Infinity,row.balls);
 return {...row,events:result.confirmed,count:result.count,candidateMeasurement:result.recoveryMeasurement??null};
});
const ledger=state.recovery?.ledger??state.validator;
fs.writeFileSync(output,JSON.stringify({...trial,configuration:state.configuration,liveSessionEntryPoint:true,calibratedBallDiameter:state.tracker.typical(),primaryCount:state.validator.count,count:ledger.count,confirmed:ledger.confirmed,rows}));
console.log(JSON.stringify({input,primary:state.validator.count,integrated:ledger.count,output}));
