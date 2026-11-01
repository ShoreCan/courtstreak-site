import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrossoverCounter} from '../src/lib/ai/crossoverCounter.mjs';
import {person,trial} from './helpers/crossover-scenarios.mjs';

const p=person(),clean=[[-.1,840,350,60],[0,840,350,60],[.1,780,450,60],[.2,710,580,60],[.3,650,630,60],[.4,580,550,60],[.5,500,450,60],[.6,440,350,60],[.7,440,350,60]];
function run(rows,revision='CROSS 03',deadline=20){const c=createCrossoverCounter(revision);for(const [t,x,y,d]of rows)c.update([],x===null?null:[x,y,d],p,t,deadline);return c;}
test('one implausible box after a real floor turn does not erase later observed hand control',()=>{
 const rows=clean.map(r=>r[0]===.5?[.5,500,450,25]:r);
 assert.equal(run(rows,'CROSS 02').count,0);
 const c=run(rows);assert.equal(c.count,1);assert.equal(c.confirmed[0].floor_contact_time_seconds,.3);
 assert.equal(c.confirmed[0].to_hand,'left');assert.ok(c.confirmed[0].event_timestamp_exact>=.6);
 const ignored=c.points.find(r=>r.timestamp===.5);assert.equal(ignored.observed,false);assert.equal(ignored.y,null);
 assert.equal(ignored.ignoredReason,'ball_size_outlier');
});
test('a false near-wrist box is not itself a controlled receipt',()=>{
 const rows=clean.filter(r=>r[0]<=.3).concat([[.4,440,350,25],[.5,440,350,25],[.6,440,350,25],[.7,null,null,null]]);
 const c=run(rows);assert.equal(c.count,0);assert.equal(c.flight,null);
});
test('ignoring the only apparent floor sample cannot invent a floor bounce',()=>{
 const rows=clean.map(r=>r[0]===.3?[.3,650,630,25]:r);
 assert.equal(run(rows).count,0);
});
test('size outliers do not extend the existing observation gap budget',()=>{
 const rows=clean.filter(r=>r[0]<=.4).concat([[.5,500,450,25],[.6,440,350,25],[.7,440,350,25],[.8,440,350,60],[.9,440,350,60]]);
 const c=run(rows);assert.equal(c.count,0);assert.ok(c.rejected.some(r=>r.control_status==='rejected_tracking_gap'));
});
test('late control remains outside the deadline after size recovery',()=>{
 const rows=clean.map(r=>r[0]===.5?[.5,500,450,25]:r);
 assert.equal(run(rows,'CROSS 03',.6).count,0);
});
for(const [label,options]of [['air pass',{noBounce:true}],['same-hand pounds',{sameHand:true}],['unseen feet',{pose:{...p,confidence:p.confidence.map((v,i)=>[15,16].includes(i)?0:v)}}]])test(`size recovery still rejects ${label}`,()=>{
 const {frames}=trial(options),c=createCrossoverCounter('CROSS 03');
 for(const r of frames){const m=r.measurement?[...r.measurement]:null;if(m&&r.time>.25&&r.time<.3)m[2]=25;c.update([],m,r.person,r.time,20);}
 assert.equal(c.count,0);
});
test('historical revisions keep the original size-change rejection',()=>{
 const rows=clean.map(r=>r[0]===.5?[.5,500,450,25]:r);
 for(const revision of ['CROSS 01','CROSS 02']){const c=run(rows,revision);assert.equal(c.count,0);assert.ok(c.rejected.some(r=>r.control_status==='rejected_ball_size_change'));}
});
