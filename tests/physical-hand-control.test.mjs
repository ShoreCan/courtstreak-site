import test from 'node:test';
import assert from 'node:assert/strict';
import {physicalPoseSides} from '../src/lib/ai/poseCoordinates.mjs';
import {PoundControlValidator} from '../src/lib/ai/poundCore.mjs';
const person=()=>{const p={box:[400,80,850,680],xy:Array.from({length:17},()=>[650,350]),confidence:Array(17).fill(.95)};p.xy[5]=[600,200];p.xy[6]=[700,200];p.xy[10]=[760,280];p.xy[11]=[600,350];p.xy[12]=[650,350];p.xy[13]=[650,500];p.xy[14]=[700,500];return p;};
const proposal=(bottom=440)=>({event_frame:1,event_timestamp_exact:.1,event_time_seconds:.1,bottom_center_y:bottom,ball_scale_pixels:60,validation_path:'clean_full_pound',down_ball_diameters:2,rise_ball_diameters:2});
function submit(p=person(),bounce=proposal(),later=p){const v=new PoundControlValidator();v.update([],null,p,0,20);v.update([bounce],[760,280,60],later,.2,20);return v;}

test('mirrored keypoint labels preserve the original physical right hand',()=>{const p=person();p.xy[9]=[900,300];const copy=structuredClone(p),corrected=physicalPoseSides(p,true);assert.deepEqual(corrected.xy[10],[900,300]);assert.deepEqual(corrected.xy[9],p.xy[10]);assert.deepEqual(p,copy);assert.deepEqual(corrected.box,p.box);});
test('unmirrored and absent poses are preserved',()=>{const p=person();assert.equal(physicalPoseSides(p,false),p);assert.equal(physicalPoseSides(null,true),null);});
test('side mapping twice restores all keypoint positions and confidences',()=>{const p=person();p.confidence=p.confidence.map((_,i)=>i/20);assert.deepEqual(physicalPoseSides(physicalPoseSides(p,true),true),p);});
test('above-knee dip is rejected even when hand-return rules pass',()=>{const v=submit();assert.equal(v.count,0);assert.equal(v.rejected[0].control_status,'rejected_above_knee');});
test('a floor-level bounce retains the existing hand-return acceptance',()=>{assert.equal(submit(person(),proposal(620)).count,1);});
test('knee evidence comes from the bounce frame rather than the later confirmation pose',()=>{const first=person(),later=person();later.xy[13][1]=800;later.xy[14][1]=800;assert.equal(submit(first,proposal(620),later).count,1);});
test('uncertain knees do not invent a floor rejection',()=>{const p=person();p.confidence[13]=.1;assert.equal(submit(p).count,1);});
test('missing bounce-frame context does not use a later knee position',()=>{const p=person(),v=new PoundControlValidator();v.update([proposal()],[760,280,60],p,.2,20);assert.equal(v.count,0);assert.equal(v.rejected[0].control_status,'rejected_above_knee');const later=new PoundControlValidator();later.update([{...proposal(),event_frame:999}],[760,280,60],p,.2,20);assert.equal(later.count,1);});
