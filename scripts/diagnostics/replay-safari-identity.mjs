// Counter/identity experiment only. This does not benchmark or simulate a live
// device. The optional stream must contain real detector output and causal
// body-pose availability, including poseAge, for each source video timestamp.
import fs from 'node:fs';
import {safariConfiguration} from '../../src/lib/ai/safariPolicy.mjs';
import {createSessionTrackingState,resetSessionTrackingCounter,updateSessionCounter} from '../../src/lib/ai/sessionTracking.mjs';
import {resetPoundTrackingIdentity} from '../../src/lib/ai/poundTrackingState.mjs';
import {geometry} from '../../src/lib/ai/poundCore.mjs';
import {FramedCalibration} from '../../src/lib/ai/setupGuidance.mjs';
const [input,output,mode='baseline',streamPath]=process.argv.slice(2);
if(!input||!output||!['baseline','candidate'].includes(mode))throw Error('Usage: node scripts/diagnostics/replay-observed-pound.mjs evidence.json output.json [baseline|candidate] [cached-stream.json]');
const d=JSON.parse(fs.readFileSync(input));
if(d.drillKey!=='right-hand-pound')throw Error('This diagnostic supports right-hand-pound evidence only.');
const state=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true,streamingPound:false}),calibration=new FramedCalibration(),rows=[];
if(mode==='candidate'){state.configuration=safariConfiguration(state.configuration,'right-hand-pound');resetPoundTrackingIdentity(state);}
const a=d.frames.find(f=>f.inputPhase==='active');if(!a)throw Error('No active observations.');const started=a.capturedAt-a.elapsed;let previousCounterFrame=0,selectionMatches=0;
for(const f of d.frames){
 if(streamPath&&['active','review'].includes(f.inputPhase))break;
 const phase=['active','review'].includes(f.inputPhase)?'drill':f.inputPhase;
 if(phase==='setup'&&calibration.update(f.capturedAt,f.positionChecks.body&&f.positionChecks.hand&&f.positionChecks.floor,!f.person))resetPoundTrackingIdentity(state);
 const selected=state.tracker.select(f.balls,f.person,phase,...d.frameSize,f.capturedAt),g=selected?geometry(selected):null;selectionMatches+=JSON.stringify(selected)===JSON.stringify(f.selected);
 if(f.inputPhase==='setup'&&f.phase==='countdown'){state.tracker.freezeCalibration();resetSessionTrackingCounter(state);}
 let result=null;
 if(f.counterFrame!=null&&f.counterFrame!==previousCounterFrame){result=updateSessionCounter(state,f.elapsed,g?[...g.center,g.diameter]:null,f.person,d.frameSize[1],d.timerSeconds,f.balls);previousCounterFrame=f.counterFrame;}
 rows.push({time:f.elapsed,selected,count:result?.count??null,events:result?.confirmed??[]});
}
if(streamPath)for(const f of JSON.parse(fs.readFileSync(streamPath)).rows){
 if(!Number.isFinite(f.poseAge)||f.poseAge<0)throw Error('Cached stream is missing causal pose age.');
 const person=f.poseAge<=.3?f.person:null,selected=state.tracker.select(f.balls,person,'drill',...d.frameSize,started+f.time),g=selected?geometry(selected):null,result=updateSessionCounter(state,f.time,g?[...g.center,g.diameter]:null,person,d.frameSize[1],d.timerSeconds,f.balls);
 rows.push({time:f.time,selected,count:result.count,events:result.confirmed});
}
const result={protocol:streamPath?'Every saved-frame input; original body poses after recorded availability, max age .3s. No model latency simulation; NOT live-device proof.':'Replay of original captured inputs. No inference rerun.',mode,configuration:state.configuration,frameSize:d.frameSize,count:state.recovery.ledger.count,events:state.recovery.ledger.confirmed,selectionMatches,rows};
fs.writeFileSync(output,JSON.stringify(result));console.log(JSON.stringify({mode,stream:!!streamPath,count:result.count,selectionMatches}));
