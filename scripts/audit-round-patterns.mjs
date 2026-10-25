import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {replayConfiguredRound} from './replay-ball-lock.mjs';
import {CURRENT_POUND_CONFIGURATION} from '../src/lib/ai/trackerConfiguration.mjs';

const tally = values => values.reduce((counts,key)=>(counts[key]=(counts[key]??0)+1,counts),{});
export function auditRoundPatterns(data,{file=null}={}) {
 if(data?.schema!=='courtstreak-round-evidence-v1'||!Array.isArray(data.frames))throw new Error('Expected CourtStreak round evidence.');
 const active=data.frames.filter(f=>f.inputPhase==='active'&&Number.isFinite(f.elapsed)&&f.elapsed>=0&&f.elapsed<(data.timerSeconds??20));
 if(!active.length)throw new Error('No active observations are available.');
 let recorded,current;
 try{recorded=replayConfiguredRound(data,undefined,{diagnostics:true});}catch(error){recorded={available:false,reason:error.message};}
 try{current=replayConfiguredRound(data,CURRENT_POUND_CONFIGURATION);}catch(error){current={available:false,reason:error.message};}
 const exactRecorded=!!(recorded.available&&recorded.cropCompatible&&recorded.selectionMatches===recorded.frames&&recorded.matchesSavedAcceptedEvents!==false);
 const computed=new Map(exactRecorded?recorded.frameDecisions.map(f=>[f.frameId,f.decisions]):[]);
 const absent=active.filter(f=>!f.selected),reasons={},reasonSource=tally(active.map(f=>Array.isArray(f.selectionDecisions)?'captured':computed.has(f.frameId)?'recomputed_exact_saved_inputs':'unavailable'));
 for(const f of absent){
  const decisions=f.selectionDecisions??computed.get(f.frameId);
  if(!decisions)continue;
  for(const reason of new Set(decisions.filter(d=>d.status==='rejected').map(d=>d.reason)))reasons[reason]=(reasons[reason]??0)+1;
 }
 const gaps=active.slice(1).map((f,i)=>(f.capturedAt-active[i].capturedAt)*1000);
 const simplify = replay => {
  const {frameDecisions,...rest}=replay;
  return rest;
 };
 return {file,sourceCommit:data.buildInfo?.sourceCommit??data.baseSourceCommit??null,buildFingerprint:data.buildInfo?.trackerSourceSha256??null,
  savedRevisions:{counter:data.trackerRevision,identity:data.ballIdentityRevision??null},droppedFrameRecords:data.droppedFrameRecords??null,
  activeObservations:active.length,selectedObservations:active.length-absent.length,noProposals:absent.filter(f=>!f.balls.length).length,
  proposalsButNoSelection:absent.filter(f=>f.balls.length>0).length,noSelectionFramesByRejectionReason:reasons,decisionReasonSources:reasonSource,
  savedDisplay:data.displayedCount??null,savedAcceptedEvents:data.countedReps?.length??null,
  displayMatchesRetainedEventCount:Array.isArray(data.countedReps)&&Number.isFinite(data.displayedCount)?data.displayedCount===data.countedReps.length:null,
  acceptedPaths:tally((data.countedReps??[]).map(e=>e.path??'unknown')),
  rejectedStatuses:tally((data.rejectedEvents??[]).map(e=>e.control_status??'unknown')),
  pendingEvents:data.pendingEvents?.length??null,captureIntervalsMs:gaps.length?{max:Math.max(...gaps),over100:gaps.filter(g=>g>100.000001).length,nonIncreasing:gaps.filter(g=>g<=0).length}:null,
  exactRecordedReproduction:exactRecorded,recorded:simplify(recorded),current:simplify(current),
  physicalGroundTruth:'Not supplied by these software logs. Rejection frequencies are not error rates; match events to independently reviewed video.'};
}

export function compareRoundPatterns(rounds) {
 const rejectionReasons=[...new Set(rounds.flatMap(r=>Object.keys(r.noSelectionFramesByRejectionReason)))].sort();
 return {schema:'courtstreak-round-pattern-comparison-v1',rounds,
  recurringSoftwareReasons:Object.fromEntries(rejectionReasons.map(reason=>[reason,{rounds:rounds.filter(r=>r.noSelectionFramesByRejectionReason[reason]>0).map(r=>r.file),observations:rounds.reduce((n,r)=>n+(r.noSelectionFramesByRejectionReason[reason]??0),0)}])),
  limitations:['Different versions and recording conditions are reported separately; these are not controlled physical accuracy comparisons.','A saved count and a repeatable rejection are not ground truth.','Current-mode comparisons reuse saved proposals/poses and require compatible source-frame/crop pairs.','Incomplete or unknown historical configurations are explicitly unavailable.']};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const files=process.argv.slice(2);
 try{
  if(!files.length)throw new Error('Usage: node scripts/audit-round-patterns.mjs test-details.json [...]');
  const report=compareRoundPatterns(files.map(file=>auditRoundPatterns(JSON.parse(fs.readFileSync(file,'utf8')),{file})));
  console.log(JSON.stringify(report,null,2));
  if(report.rounds.some(r=>!r.exactRecordedReproduction||!r.current.available||!r.current.cropCompatible))process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
