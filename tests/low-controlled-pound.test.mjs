import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createPoundCounter,createPoundValidator,geometry} from '../src/lib/ai/poundCore.mjs';
import {replayProfileCounter} from '../src/lib/ai/recordedProfile.mjs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';

function trial({revision='COUNT 07',fps=30,period=.4,amplitude=.9,scale=1,phase=0,crouched=true,hand=true,feet=true,airborne=false,held=false,jitter=0,missing=false,lateReturn=false,deadline=20}={}){
 const c=createPoundCounter(revision),v=createPoundValidator(revision),floor=(airborne?540:600)*scale,d=80*scale,travel=amplitude*d,top=floor-travel,end=8*period;
 const p={box:[400,80,850,680].map(x=>x*scale),xy:Array.from({length:17},()=>[650*scale,350*scale]),confidence:Array(17).fill(.95)};
 p.xy[5]=[600*scale,(crouched?top-90*scale:150*scale)];p.xy[6]=[710*scale,p.xy[5][1]];p.xy[11]=[650*scale,(crouched?top:350*scale)];p.xy[12]=[710*scale,p.xy[11][1]];p.xy[13]=[650*scale,560*scale];p.xy[14]=[710*scale,560*scale];p.xy[15]=[620*scale,580*scale];p.xy[16]=[730*scale,580*scale];
 p.xy[9]=[760*scale,top-d*.5];p.xy[10]=[760*scale,top-d*.5];
 if(!hand)p.xy[10][0]=1100*scale;
 if(!feet){p.confidence[15]=0;p.confidence[16]=0;}
 const events=[],frames=[];let i=0;
 for(let t=-1+phase;t<end+2;t+=1/fps,i++){
  const active=t>=0&&t<end,y=(held||!active?top:top+travel*(1-Math.cos(2*Math.PI*t/period))/2)+jitter*d*Math.sin(i*2.3999632297);
  const person=structuredClone(p);if(lateReturn&&t>period/2&&t<period+.05)person.xy[10][0]=1100*scale;
  const m=missing&&active&&Math.abs((t%period)-period/2)<1/fps?null:[760*scale,y,d];
  const proposals=c.update(t,m?m.slice(1):null,720*scale);events.push(...v.update(proposals,m,person,t,deadline).map(e=>{c.rememberControlledFloor(e);return e;}));
  frames.push({frameId:i+1,counterFrame:i+1,elapsed:t,inputPhase:active?'active':'countdown',selected:m?{box:[m[0]-d/2,m[1]-d/2,m[0]+d/2,m[1]+d/2],score:.99}:null,person});
 }
 return {c,v,events,frames,evidence:{trackerRevision:revision,displayedCount:v.count,droppedFrameRecords:0,frames,frameSize:[1280,720*scale],timerSeconds:deadline,countedReps:events.map(e=>({time:e.event_timestamp_exact}))}};
}
test('COUNT 06 misses eight controlled low pounds that COUNT 07 validates without a high-bounce warmup',()=>{
 assert.equal(trial({revision:'COUNT 06'}).v.count,0);const r=trial();assert.equal(r.v.count,8);assert.ok(r.events.every(e=>e.validation_path==='controlled_low_pound'));assert.equal(r.events[0].floor_reference,null);
});
for(const fps of [20,24,30])for(const period of [.28,.4,.65])for(const amplitude of [.8,1,1.25])for(const scale of [.6,1,1.7]){
 test(`eight controlled low pounds: ${fps}fps, ${period}s, ${amplitude} ball diameters, scale ${scale}`,()=>{
  const r=trial({fps,period,amplitude,scale});assert.equal(r.v.count,8);r.events.forEach((e,i)=>assert.ok(Math.abs(e.event_timestamp_exact-(i+.5)*period)<=1/fps+.001));
 });
}
for(const phase of [0,.013,.026])for(const crouched of [true,false])test(`low pounds count with crouched=${crouched}, phase=${phase}`,()=>assert.equal(trial({phase,crouched}).v.count,8));
test('a held ball adds no counts',()=>assert.equal(trial({held:true}).v.count,0));
test('small held-ball detector jitter adds no counts',()=>assert.equal(trial({held:true,jitter:.12}).v.count,0));
test('shallow airborne movement below the knees still fails floor-region evidence',()=>assert.equal(trial({airborne:true}).v.count,0));
test('a low pound returning only to the other hand is not a right-hand rep',()=>assert.equal(trial({hand:false}).v.count,0));
test('uncertain feet cannot bootstrap low floor contacts without established floor evidence',()=>assert.equal(trial({feet:false}).v.count,0));
test('missing floor detections cannot supply the fully observed low-turn proof',()=>assert.equal(trial({missing:true}).events.filter(e=>e.validation_path==='controlled_low_pound').length,0));
test('regaining the hand on a later bounce does not validate an earlier uncontrolled return',()=>{const r=trial({lateReturn:true});assert.equal(r.v.count,7);assert.ok(r.events.every(e=>Math.abs(e.event_timestamp_exact-.2)>.05));});
test('low contacts after the deadline are excluded',()=>{const r=trial({deadline:.95});assert.equal(r.v.count,2);assert.ok(r.events.every(e=>e.event_timestamp_exact<1));});
test('saved COUNT 07 inputs use the same low counter and validator as live',()=>{
 const r=trial(),replay=replayProfileCounter(r.evidence);assert.equal(replay.available,true);assert.equal(replay.accepted,8);assert.equal(replay.matchesRecordedAcceptedEvents,true);
});
test('live initialization and countdown reset share the revision-aware control factory',()=>{
 const source=fs.readFileSync(new URL('../src/components/ai/IPhonePoundTest.jsx',import.meta.url),'utf8');assert.equal((source.match(/createPoundValidator\(freshFrames\?EXPERIMENTAL_COUNTER_REVISION:BALL_TRACKER_REVISION\)/g)||[]).length,2);
});
const opts={handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,corroboratedContinuity:true,floorContinuity:true,turnContinuity:true,directionalPeaks:true,timeWindows:true,earlyConfirmation:true};
for(const name of ['19-reps','20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17','oct24-lock06-fast15','oct24-lock06-slow15-pass','oct24-lock06-normal15-pass','oct24-lock07-fast35'])test(`COUNT 07 preserves accepted contacts in saved ${name}`,()=>{
 const d=JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url))),a=replayBallLock(d,opts),b=replayBallLock(d,{...opts,lowControlledPounds:true});assert.deepEqual(b.events,a.events);
});
