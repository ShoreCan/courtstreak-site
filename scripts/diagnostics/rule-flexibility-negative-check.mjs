// Synthetic counterexamples with explicit floor geometry. These are unit-level
// checks, not recordings or claimed user accuracy measurements.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createPoundCounter,createPoundValidator} from '../../src/lib/ai/poundCore.mjs';
const sourceURL=new URL('../../src/lib/ai/poundCore.mjs',import.meta.url);
let source=fs.readFileSync(sourceURL,'utf8');
source=source.replace('Math.abs(p.bottom_center_y-p.floor_reference.center_y)<=d*.3','Math.abs(p.bottom_center_y-p.floor_reference.center_y)<=d*1')
 .replace('down>=1.25&&rise>=1.25','down>=1.15&&rise>=1.15');
source=source.replace(/from\s+(['"])(\.[^'"]+)\1/g,(_,q,value)=>`from ${JSON.stringify(new URL(value,sourceURL).href)}`);
let gapSource=fs.readFileSync(sourceURL,'utf8');
if(!gapSource.includes('gap>this.maxFloorSamplingGapSeconds'))throw new Error('Sampling-gap audit source no longer matches.');
gapSource=gapSource.replace('gap>this.maxFloorSamplingGapSeconds','gap>.3');
gapSource=gapSource.replace(/from\s+(['"])(\.[^'"]+)\1/g,(_,q,value)=>`from ${JSON.stringify(new URL(value,sourceURL).href)}`);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'courtstreak-rule-negative-'));
try{
 const file=path.join(temp,'relaxed.mjs');fs.writeFileSync(file,source);const relaxed=await import(pathToFileURL(file).href);
 const gapFile=path.join(temp,'gap.mjs');fs.writeFileSync(gapFile,gapSource);const gap=await import(pathToFileURL(gapFile).href);
 function run(factory,{airborne=false,held=false,gapped=false,fps=30}={}){
  const c=factory.createPoundCounter('COUNT 08'),v=factory.createPoundValidator('COUNT 08'),d=80,period=.5,events=[];
  const p={box:[400,100,850,640],xy:Array.from({length:17},()=>[650,350]),confidence:Array(17).fill(.95)};
  p.xy[5]=[600,250];p.xy[6]=[710,250];p.xy[11]=[650,380];p.xy[12]=[710,380];p.xy[13]=[650,450];p.xy[14]=[710,450];p.xy[15]=[620,640];p.xy[16]=[730,640];p.xy[9]=[500,350];
  for(let i=-30;i<=600;i++){
   const t=i/fps,first=t>=0&&t<4,second=t>=4&&t<8;
   const low=second&&airborne,centerFloor=low?520:600,amplitude=low?72:160,top=centerFloor-amplitude;
   const phase=(t%period+period)%period;if(second&&gapped&&phase>.08&&phase<.32)continue;const y=(first||second&&!held)?top+amplitude*(1-Math.cos(2*Math.PI*phase/period))/2:top;
   const person=structuredClone(p);person.xy[10]=[760,top-40];const measurement=[760,y,d];
   const proposals=c.update(t,measurement.slice(1),720);const accepted=v.update(proposals,measurement,person,t,8);
   for(const e of accepted){c.rememberControlledFloor(e);events.push(e);}
  }
  return {count:v.count,firstPhase:events.filter(e=>e.event_timestamp_exact<4).length,secondPhase:events.filter(e=>e.event_timestamp_exact>=4).length};
 }
 const baseline={createPoundCounter,createPoundValidator};
 const results=[];
 for(const fps of [15,20,30])for(const scenario of ['continuous_real_bounces','held_after_real_bounces','airborne_after_real_bounces','airborne_with_capture_gaps','real_bounces_with_capture_gaps']){
  const options={fps,airborne:scenario.startsWith('airborne_'),held:scenario==='held_after_real_bounces',gapped:scenario.includes('capture_gaps')};
  results.push({fps,scenario,baseline:run(baseline,options),relaxed:run(relaxed,options),gapCandidate:run(gap,options),geometry:'Feet/ground y=640px, diameter=80px. Real floor center=600px (bottom=640). Airborne low turn center=520px (bottom=560), 80px above ground.'});
 }
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({scope:'Explicit synthetic geometry; not video, not live or model accuracy.',results},null,2));
 console.log(JSON.stringify(results,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
