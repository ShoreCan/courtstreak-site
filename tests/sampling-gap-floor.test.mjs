import test from 'node:test';
import assert from 'node:assert/strict';
import {GapAwareBounceCounter,PoundControlValidator} from '../src/lib/ai/poundCore.mjs';

// Synthetic camera samples of a short down/up motion around a capture gap.
// With no gap the sampled motion is deliberately too shallow to be a rep.
function trial({gap=.09,reverse=false,knownFloor=true,floor=580,hand=true,offset=0,disable=false,missing=false}={}){
 const counter=new GapAwareBounceCounter(),validator=new PoundControlValidator();
 if(knownFloor)counter.floorSamples=Array.from({length:6},()=>[floor,60]);
 if(disable)counter.samplingGapContact=()=>null;
 const person={box:[400,100,900,700],confidence:Array(17).fill(.95),xy:Array.from({length:17},()=>[700,450])};
 person.xy[5]=[550,200];person.xy[6]=[750,200];person.xy[11]=[600,350];person.xy[12]=[700,350];person.xy[13]=[600,510];person.xy[14]=[750,510];
 if(!hand)person.confidence[10]=0;
 const motion=reverse?[[0,450],[.03,480],[.06,520],[.06+gap,530],[.09+gap,490],[.12+gap,450]]:[[0,450],[.03,490],[.06,530],[.06+gap,520],[.09+gap,480],[.12+gap,450]];
 const rows=[...Array.from({length:8},(_,i)=>[-.24+i*.03,450]),...motion,...Array.from({length:24},(_,i)=>[.15+gap+i*.03,450])];
 rows.forEach(([time,y],i)=>{const m=missing&&i===9?null:[700,y+offset,60];const p=counter.update(time,m?m.slice(1):null,720);validator.update(p,m,person,time,2).forEach(e=>counter.rememberControlledFloor(e));});
 return {counter,validator,recovered:validator.confirmed.filter(e=>e.sampling_gap_contact)};
}
test('a known-floor sampling gap recovers one event without lowering clean thresholds',()=>{
 assert.equal(trial({disable:true}).validator.count,0);
 const r=trial();assert.equal(r.validator.count,1);assert.equal(r.recovered.length,1);
 const e=r.recovered[0];assert.equal(e.validation_path,'floor_anchored_pound');
 assert.ok(e.sampling_gap_contact.timestamp>.06&&e.sampling_gap_contact.timestamp<.15);
 assert.ok(e.down_ball_diameters<1.6);assert.equal(e.sampling_gap_contact.kind,'estimated_between_observed_frames');
});
test('the gap can precede the larger of the two observed positions',()=>assert.equal(trial({reverse:true}).recovered.length,1));
test('uniform shallow motion is not promoted into a floor bounce',()=>assert.equal(trial({gap:.03}).validator.count,0));
test('a gap beyond the bounded interval is not extrapolated',()=>assert.equal(trial({gap:.20}).validator.count,0));
test('floor recovery requires established contacts',()=>assert.equal(trial({knownFloor:false}).validator.count,0));
test('the extrapolated turnaround must agree with the established floor',()=>assert.equal(trial({floor:700}).validator.count,0));
test('above-knee held-ball movement remains uncounted',()=>assert.equal(trial({offset:-150}).validator.count,0));
test('a recovered floor proposal still requires the visible right-hand return',()=>{
 const r=trial({hand:false});assert.equal(r.validator.count,0);assert.ok(r.validator.rejected.some(e=>e.sampling_gap_contact&&e.control_status==='rejected_mishandle'));
});
test('a reconstructed detector sample cannot supply an observed extrapolation segment',()=>assert.equal(trial({missing:true}).recovered.length,0));
test('unstable calibration does not provide a floor reference',()=>{
 const c=new GapAwareBounceCounter();c.floorSamples=[[400,60],[460,60],[520,60],[640,60],[700,60],[760,60]];assert.equal(c.floorReference(),null);
});
