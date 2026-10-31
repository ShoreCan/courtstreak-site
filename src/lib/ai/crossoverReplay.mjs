import {createCrossoverCounter} from './crossoverCounter.mjs';
import {CROSSOVER_DRILL_KEY} from './sessionTracking.mjs';
import {geometry} from './poundCore.mjs';

// Re-run only the observed ball/wrist inputs. Video pixels are never inferred.
export function replayCrossovers(evidence){
 if(evidence.drillKey!==CROSSOVER_DRILL_KEY)throw new Error('Expected crossover test details.');
 let counter=createCrossoverCounter(evidence.trackerRevision),previousFrame=0;
 for(const row of evidence.frames??[]){
  if(!['countdown','active','review'].includes(row.phase)&&!['active','review'].includes(row.inputPhase))continue;
  if(!Number.isFinite(row.elapsed)||!Number.isFinite(row.counterFrame))continue;
  if(row.counterFrame<previousFrame)counter=createCrossoverCounter(evidence.trackerRevision);
  if(row.counterFrame===previousFrame)continue;
  previousFrame=row.counterFrame;
  const g=row.selected?geometry(row.selected):null,measurement=g?[...g.center,g.diameter]:null;
  counter.update([],measurement,row.person,row.elapsed,evidence.timerSeconds??20);
 }
 return {revision:evidence.trackerRevision,count:counter.count,countedReps:counter.confirmed,rejectedEvents:counter.rejected,droppedFrameRecords:evidence.droppedFrameRecords??0};
}
