// Archived-input regression only, preserving the original two-second diagnostic
// hand reference and counter pre-roll. This does not certify live onboarding.
import fs from 'node:fs';
import {createSessionTrackingState,updateSessionCounter} from '../../src/lib/ai/sessionTracking.mjs';
import {resetPoundTrackingIdentity} from '../../src/lib/ai/poundTrackingState.mjs';
import {geometry} from '../../src/lib/ai/poundCore.mjs';
import {safariConfiguration} from '../../src/lib/ai/safariPolicy.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node replay-safari-crossover.mjs archived-trial.json comparison.json');
const trial=JSON.parse(fs.readFileSync(input)),variants={};
for(const candidate of [false,true]){
 const state=createSessionTrackingState(true,'stationary-crossover','CROSS 11',false,{enhancedTracking:true});
 if(candidate){state.configuration=safariConfiguration(state.configuration,'stationary-crossover');resetPoundTrackingIdentity(state);}
 let go=false,matches=0;
 for(const row of trial.rows){
  const active=row.time>=trial.warmupSeconds;
  if(active&&!go){state.tracker.diameters=trial.calibration.samples.map(s=>s.diameter);state.tracker.lanes=trial.calibration.samples.map(s=>s.x);state.tracker.freezeCalibration();go=true;}
  const selected=state.tracker.select(row.balls,row.person,active?'drill':'setup',...trial.frameSize,row.time),g=selected?geometry(selected):null;
  matches+=JSON.stringify(selected)===JSON.stringify(row.selected);
  updateSessionCounter(state,row.elapsed,g?[...g.center,g.diameter]:null,row.person,trial.frameSize[1],20,row.balls);
 }
 variants[candidate?'candidate':'baseline']={count:state.counter.count,events:state.counter.confirmed,selectedMatches:matches};
}
const result={scope:'Archived-input regression with same-frame body poses and original declared diagnostic pre-roll. No new video ground truth or live-camera measurement.',savedCount:trial.count,variants,
 eventObjectsIdentical:JSON.stringify(variants.baseline.events)===JSON.stringify(variants.candidate.events)};
fs.writeFileSync(output,JSON.stringify(result));
console.log(JSON.stringify({input,saved:trial.count,baseline:variants.baseline.count,candidate:variants.candidate.count,eventObjectsIdentical:result.eventObjectsIdentical}));
