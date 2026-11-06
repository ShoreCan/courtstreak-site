// Counter-only comparison using complete original Test22 phone observations.
// This does not run either model, simulate faster capture, or establish full
// ground-truth totals. Inputs are private local files, never bundled in the site.
import fs from 'node:fs';
import path from 'node:path';
import {replaySavedCounter} from '../../src/lib/ai/savedCounterReplay.mjs';
import {repairConfiguration,repairCounterPose} from '../../src/lib/ai/repairPolicy.mjs';
import {resetSessionTrackingCounter} from '../../src/lib/ai/sessionTracking.mjs';

const [inputDirectory,outputDirectory]=process.argv.slice(2);
if(!inputDirectory||!outputDirectory)throw new Error('Usage: check-tracking-repair.mjs PRIVATE_INPUT_DIRECTORY OUTPUT_DIRECTORY');
const inputs=[
 ['indoor18','CourtStreak-right-hand-pound-18-reps-test-details.json'],
 ['outdoor33','CourtStreak-right-hand-pound-33-reps-test-details 3.json'],
 ['cross27','CourtStreak-crossovers-27-reps-test-details 2.json'],
];
const floorTime=e=>e.floorTime??e.time;
const same=(a,b)=>a.fromHand===b.fromHand&&Math.abs(floorTime(a)-floorTime(b))<1e-7;
const summaries=[];
fs.mkdirSync(outputDirectory,{recursive:true});
for(const [clip,filename] of inputs){
 const data=JSON.parse(fs.readFileSync(path.join(inputDirectory,filename))),baseline=replaySavedCounter(data);
 if(!baseline.countTimelineMatches||!baseline.acceptedRecordsMatch)throw new Error('Original replay fidelity failed: '+clip);
 const candidate=replaySavedCounter(data,{
  configure:state=>{state.configuration=repairConfiguration(data.trackerConfiguration,data.drillKey);resetSessionTrackingCounter(state);},
  personForFrame:frame=>['active','review'].includes(frame.phase)?repairCounterPose(frame.person,frame.poseCapturedAt,frame.capturedAt,frame.decisionCompletedAt):frame.person,
 });
 const added=candidate.countedReps.filter(e=>!baseline.countedReps.some(old=>same(e,old)));
 const removed=baseline.countedReps.filter(e=>!candidate.countedReps.some(next=>same(e,next)));
 const {state,...saved}=candidate;
 fs.writeFileSync(path.join(outputDirectory,clip+'-rules.json'),JSON.stringify(saved));
 const originals=baseline.countedReps.length;
 summaries.push({clip,originalCount:baseline.count,candidateCount:candidate.count,
  originalFidelity:{timeline:baseline.countTimelineMatches,acceptedRecords:baseline.acceptedRecordsMatch},
  originalsPreserved:originals-removed.length,added,removed,
  addedProof:state.validator.confirmed.filter(e=>added.some(a=>Math.abs(floorTime(a)-(e.floor_contact_time_seconds??e.event_timestamp_exact??e.event_time_seconds))<1e-7)),
  rejectionReasons:candidate.primaryRejected.reduce((counts,e)=>{for(const reason of e.failed_checks??[e.control_status??'unclassified'])counts[reason]=(counts[reason]??0)+1;return counts;},{}),
 });
 if(removed.length)process.exitCode=1;
}
const result={scope:'Original saved selected balls, poses and measured phone times; candidate counters and wrist freshness only. No new model detections or physical-iPhone throughput measurement.',
 liveFPSMeasured:false,completeGroundTruthMeasured:false,clips:summaries};
fs.writeFileSync(path.join(outputDirectory,'rule-summary.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
