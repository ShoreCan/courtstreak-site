import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCrossoverCounter} from '../src/lib/ai/crossoverCounter.mjs';
import {person,trial} from './helpers/crossover-scenarios.mjs';
import {replayCrossovers} from '../src/lib/ai/crossoverReplay.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/nov02-crossover-second-rep.json',import.meta.url)));
const clean=[[-.1,840,350,60],[0,840,350,60],[.1,780,450,60],[.2,710,580,60],[.3,650,630,60],[.4,580,550,60],[.5,500,450,60],[.6,440,350,60],[.7,440,350,60]];
function run(rows,revision='CROSS 04',pose=person(),deadline=20){const c=createCrossoverCounter(revision);for(const [time,x,y,d] of rows)c.update([],x===null?null:[x,y,d],pose,time,deadline);return c;}

test('the observed November 2 second crossover survives one partial box before the floor turn',()=>{
 const old=createCrossoverCounter('CROSS 03'),current=createCrossoverCounter();
 for(const r of fixture.rows)for(const c of [old,current])c.update([],r.measurement,r.person,r.time,20);
 assert.equal(old.count,0);assert.equal(old.rejected[0].control_status,'rejected_ball_size_change');
 assert.equal(current.count,1);assert.equal(current.confirmed[0].floor_contact_time_seconds,fixture.expectedFloorTime);
 assert.equal(current.confirmed[0].event_timestamp_exact,fixture.expectedReceiptTime);
 assert.equal(current.confirmed[0].from_hand,'right');assert.equal(current.confirmed[0].to_hand,'left');
 const ignored=current.points.find(p=>p.timestamp===fixture.sizeOutlierTime);
 assert.equal(ignored.observed,false);assert.equal(ignored.y,null);assert.equal(ignored.ignoredReason,'ball_size_outlier');
});
test('saved-evidence replay uses the same CROSS 04 correction as the shared live counter',()=>{
 const frames=fixture.rows.map((r,i)=>{const [x,y,d]=r.measurement;return {phase:'active',elapsed:r.time,counterFrame:i+1,person:r.person,selected:{box:[x-d/2,y-d/2,x+d/2,y+d/2],score:1}};});
 const input={drillKey:'stationary-crossover',trackerRevision:'CROSS 04',timerSeconds:20,frames};
 const current=replayCrossovers(input),old=replayCrossovers({...input,trackerRevision:'CROSS 03'});
 assert.equal(current.count,1);assert.equal(old.count,0);
 assert.equal(current.countedReps[0].floor_contact_time_seconds,fixture.expectedFloorTime);
 assert.equal(current.countedReps[0].event_timestamp_exact,fixture.expectedReceiptTime);
});
for(const d of [25,120])test(`a ${d}-pixel outlier on descent does not erase later observed bounce and control`,()=>{
 const rows=clean.map(r=>r[0]===.2?[.2,710,580,d]:r),c=run(rows);
 assert.equal(c.count,1);assert.equal(c.confirmed[0].floor_contact_time_seconds,.3);
 assert.equal(c.confirmed[0].event_timestamp_exact,.6);
 assert.equal(run(rows,'CROSS 03').count,0);
});
test('ignoring the only floor measurement cannot turn a hand transfer into a rep',()=>{
 const rows=clean.map(r=>r[0]===.3?[.3,650,630,25]:r);
 assert.equal(run(rows).count,0);
});
test('pre-floor outliers cannot extend the 250ms missing-observation limit',()=>{
 const rows=clean.map(r=>[.2,.3,.4].includes(r[0])?[r[0],r[1],r[2],25]:r),c=run(rows);
 assert.equal(c.count,0);assert.ok(c.rejected.some(r=>r.control_status==='rejected_tracking_gap'));
});
test('a measurement recovered after the observation limit cannot revive the old transfer',()=>{
 const rows=clean.filter(r=>![.2,.3,.4].includes(r[0]));
 assert.equal(run(rows).count,0);
});
test('a tiny near-wrist box cannot provide opposite-hand receipt',()=>{
 const rows=clean.filter(r=>r[0]<=.3).concat([[.4,580,550,60],[.5,440,350,25],[.6,440,350,25],[.7,440,350,25],[.8,440,350,25]]);
 assert.equal(run(rows).count,0);
});
test('the receiving hand must remain before the deadline after pre-floor recovery',()=>{
 const rows=clean.map(r=>r[0]===.2?[.2,710,580,25]:r);
 assert.equal(run(rows,'CROSS 04',person(),.6).count,0);
});
for(const [label,options] of [['air pass',{noBounce:true}],['same-hand pound',{sameHand:true}],['missing feet',{pose:{...person(),confidence:person().confidence.map((v,i)=>[15,16].includes(i)?0:v)}}]])test(`pre-floor size recovery still rejects ${label}`,()=>{
 const {frames}=trial(options),c=createCrossoverCounter();
 for(const r of frames){const m=r.measurement?[...r.measurement]:null;if(m&&r.time>.1&&r.time<.15)m[2]=25;c.update([],m,r.person,r.time,20);}
 assert.equal(c.count,0);
});
test('CROSS 03 remains reproducible and cannot silently inherit pre-floor recovery',()=>{
 assert.equal(createCrossoverCounter('CROSS 03').preFloorSizeRecovery,false);
 assert.equal(createCrossoverCounter().preFloorSizeRecovery,true);
});
test('an unobserved bounce cannot carry the wrong source hand into the next valid crossover',()=>{
 const rows=[[-.1,840,350,60],[0,840,350,60],[.1,780,380,60],[.2,710,395,25],[.3,650,390,60],[.4,580,375,60],[.5,500,350,60],[.6,440,350,60],[.7,440,350,60],[.8,500,450,60],[.9,580,580,60],[1,650,630,60],[1.1,710,550,60],[1.2,780,450,60],[1.3,840,350,60],[1.4,840,350,60]],c=run(rows);
 assert.equal(c.count,1);assert.equal(c.confirmed[0].floor_contact_time_seconds,1);
 assert.equal(c.confirmed[0].from_hand,'left');assert.equal(c.confirmed[0].to_hand,'right');
 assert.ok(c.rejected.some(e=>e.control_status==='rejected_no_floor_bounce'));
});
