// Counterfactual audit, NOT a release configuration. Source rewrites are exact,
// counted replacements and run only in isolated temporary modules. Inputs,
// selected balls, body poses and measured observation times remain unchanged.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {replaySavedCounter} from './replay-rule-audit.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url));
const [inputDirectory,outputDirectory]=process.argv.slice(2);
if(!inputDirectory||!outputDirectory)throw new Error('Usage: audit-rule-flexibility.mjs UPLOAD_DIRECTORY OUTPUT_DIRECTORY');
const inputs=[['indoor18','CourtStreak-right-hand-pound-18-reps-test-details.json'],['outdoor33','CourtStreak-right-hand-pound-33-reps-test-details 3.json'],['cross27','CourtStreak-crossovers-27-reps-test-details 2.json']]
 .map(([key,name])=>({key,data:JSON.parse(fs.readFileSync(path.join(inputDirectory,name)))}));
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'courtstreak-rule-audit-'));
fs.mkdirSync(outputDirectory,{recursive:true});
async function moduleVariant(kind,name,changes){
 const sourceURL=new URL(`../../src/lib/ai/${kind}.mjs`,import.meta.url);
 let source=fs.readFileSync(sourceURL,'utf8');
 for(const [before,after,expected] of changes){
  const count=source.split(before).length-1;
  if(count!==expected)throw new Error(`${name}: expected ${expected} occurrences, found ${count}: ${before}`);
  source=source.replaceAll(before,after);
 }
 source=source.replace(/from\s+(['"])(\.[^'"]+)\1/g,(_,quote,value)=>`from ${JSON.stringify(new URL(value,sourceURL).href)}`);
 const output=path.join(directory,name+'.mjs');fs.writeFileSync(output,source);
 return import(pathToFileURL(output).href);
}
const variants=[
 {name:'baseline',kind:'both',changes:[]},
 {name:'pound_recovered_amplitude_1_15',kind:'poundCore',changes:[['down>=1.25&&rise>=1.25','down>=1.15&&rise>=1.15',1]]},
 {name:'pound_low_floor_tolerance_1D',kind:'poundCore',changes:[['Math.abs(p.bottom_center_y-p.floor_reference.center_y)<=d*.3','Math.abs(p.bottom_center_y-p.floor_reference.center_y)<=d*1',1]]},
 {name:'pound_low_floor_ball_bottom',kind:'poundCore',changes:[['p.bottom_center_y>=contact.feetY-d*.25','p.bottom_center_y+d*.5>=contact.feetY-d*.25',1]]},
 {name:'pound_gap_intersection_300ms',kind:'poundCore',changes:[['gap>this.maxFloorSamplingGapSeconds','gap>.3',1]]},
 {name:'pound_floor_and_amplitude',kind:'poundCore',changes:[['down>=1.25&&rise>=1.25','down>=1.15&&rise>=1.15',1],['Math.abs(p.bottom_center_y-p.floor_reference.center_y)<=d*.3','Math.abs(p.bottom_center_y-p.floor_reference.center_y)<=d*1',1]]},
 {name:'unsafe_low_skip_floor_evidence',kind:'poundCore',changes:[['contact?.measurement&&(known||feet)','contact?.measurement',1]],unsafe:true},
 {name:'cross_gap_350ms',kind:'crossoverCounter',changes:[['>.25)this.reject(\'rejected_tracking_gap\'','>.35)this.reject(\'rejected_tracking_gap\'',1],['>.25){this.reject(\'rejected_tracking_gap\'','>.35){this.reject(\'rejected_tracking_gap\'',1],['>.25)this.reject(\'rejected_ball_size_change\'','>.35)this.reject(\'rejected_ball_size_change\'',1]]},
 {name:'cross_receipt_300ms',kind:'crossoverCounter',changes:[['row.time-prior.time>.2','row.time-prior.time>.3',1],['now-best.time<=.25','now-best.time<=.3',1]]},
 {name:'cross_size_ratio_1_8',kind:'crossoverCounter',changes:[['row.measurement[2]/d>1.5','row.measurement[2]/d>1.8',1]]},
];
const results=[];
try{
 for(const variant of variants){
  const module=variant.kind==='both'?null:await moduleVariant(variant.kind,variant.name,variant.changes);
  for(const {key,data} of inputs){
   if(variant.kind==='poundCore'&&key==='cross27'||variant.kind==='crossoverCounter'&&key!=='cross27')continue;
   const result=replaySavedCounter(data,{configure:state=>{
    if(variant.kind==='poundCore'){state.counter=module.createPoundCounter('COUNT 08');state.validator=module.createPoundValidator('COUNT 08');}
    if(variant.kind==='crossoverCounter'){state.counter=module.createCrossoverCounter('CROSS 11');state.validator=state.counter;}
   }});
   if(variant.name==='baseline'&&(!result.countTimelineMatches||!result.acceptedRecordsMatch))throw new Error('Baseline fidelity failed: '+key);
   const originalTimes=data.countedReps.map(e=>e.floorTime??e.time),times=result.countedReps.map(e=>e.floorTime??e.time);
   const added=times.filter(t=>!originalTimes.some(x=>Math.abs(x-t)<1e-7));
   const removed=originalTimes.filter(t=>!times.some(x=>Math.abs(x-t)<1e-7));
   const {state,...saved}=result;
   fs.writeFileSync(path.join(outputDirectory,key+'-'+variant.name+'.json'),JSON.stringify(saved));
   results.push({clip:key,variant:variant.name,unsafe:!!variant.unsafe,count:result.count,added,removed,
    rejectedPrimary:result.primaryRejected.length,rejectedRecovery:result.recoveryRejected.length,
    baselineFidelity:variant.name==='baseline'?{timeline:result.countTimelineMatches,acceptedRecords:result.acceptedRecordsMatch}:null});
  }
 }
 fs.writeFileSync(path.join(outputDirectory,'rule-ablation-summary.json'),JSON.stringify({scope:'Same saved phone inputs and measured times. Counter-only experiment; new counts are not correctness or live-inference proof.',variants:results},null,2));
 console.log(JSON.stringify(results,null,2));
}finally{fs.rmSync(directory,{recursive:true,force:true});}
