import fs from 'node:fs';
import {matchEvents} from './event-match.mjs';
const manifest=JSON.parse(fs.readFileSync(process.argv[2]));
const comparisons=manifest.trials.map(entry=>{
 const trial=JSON.parse(fs.readFileSync(entry.path)),warmup=trial.warmupSeconds;
 const truth=entry.labels.filter(e=>e.time>=warmup&&e.time<(entry.sourceDeadline??Infinity));
 const predicted=trial.confirmed.map(e=>({time:(e.floor_contact_time_seconds??e.event_timestamp_exact??e.event_time_seconds)+warmup,fromHand:e.from_hand,event:e}));
 const result=matchEvents(truth,predicted,entry.tolerance??.18),active=trial.rows.filter(r=>r.time>=warmup&&r.time<(entry.sourceDeadline??Infinity));
 return {name:entry.name,path:entry.path,sourceVideo:trial.sourceVideo,configuration:trial.configuration,calibration:trial.calibration,
  truth:truth.length,predicted:predicted.length,matched:result.matched,missed:result.missed,extra:result.extra,wrongHand:result.wrongHand,
  pairs:result.pairs,activeFrames:active.length,selectedFrames:active.filter(r=>r.selected).length,counterUsableFrames:active.filter(r=>r.counterUsable).length,
  motionEvidenceFrames:active.filter(r=>r.selectionDecisions.some(d=>d.status==='selected'&&d.reason==='observed_ball_motion')).length};
});
fs.writeFileSync(manifest.output,JSON.stringify({method:'Independent reviewed floor contacts, chronological one-to-one event matching. Duplicate predictions remain extra.',comparisons},null,2));
for(const row of comparisons)console.log(JSON.stringify({name:row.name,matched:row.matched,truth:row.truth,extra:row.extra.length,wrongHand:row.wrongHand,missed:row.missed.map(e=>e.rep),selected:row.selectedFrames,frames:row.activeFrames,motionEvidence:row.motionEvidenceFrames}));
