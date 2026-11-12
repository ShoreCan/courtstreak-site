import test from 'node:test';
import assert from 'node:assert/strict';
import {PoundFloorPixels, LivePoundFloorPixels} from '../src/lib/ai/poundFloorPixels.mjs';
import {createPoundRecoverySession, updatePoundRecoverySession} from '../src/lib/ai/poundRecoverySession.mjs';
import {ball, person, trial} from './helpers/crossover-scenarios.mjs';

function imageAt(y) {
 const width=160, height=90, data=new Uint8ClampedArray(width*height*4);
 for(let py=0;py<height;py++){
  for(let x=0;x<width;x++){
   const moving=(x-105)**2+(py-y)**2<=5**2;
   const stationary=(x-113)**2+(py-81)**2<=5**2;
   data.set(moving||stationary?[205,104,34,255]:[120,119,119,255],4*(py*width+x));
  }
 }
 return {width,height,data};
}

test('appearance learned at the right hand finds a moving ball beside a stationary lookalike',()=>{
 const pixels=new PoundFloorPixels(), base={person:person(),frameWidth:1280,frameHeight:720};
 const read=(y,time,selected=null,serial=time)=>pixels.update(imageAt(y),{...base,time,selected,serial});
 const atHand=ball(840,352,80);
 assert.equal(read(44,0,atHand),null);
 assert.equal(read(44,.07,atHand),null);
 assert.equal(read(44,.14,atHand),null);
 assert.ok(read(75,.21).box[3]>=630);
 assert.equal(read(75,.22,null,.21),null);
 assert.equal(read(75,.28),null);
 assert.equal(read(75,.7),null);
});

test('missing camera readback disables the supplement for that round',()=>{
 const live=new LivePoundFloorPixels();
 live.context={canvas:{},drawImage(){throw new Error('Readback unavailable');}};
 assert.equal(live.sample({}, {time:0,frameWidth:1280,frameHeight:720}).timing.status,'unavailable');
 assert.equal(live.sample({}, {time:.1,frameWidth:1280,frameHeight:720}).timing.status,'unavailable');
});

function recover({wrongHand=false,pixelOnly=false,drop=false,airborne=false,includePrimary=false}={}){
 const recovery=createPoundRecoverySession({guardFirstReturn:true,cycleAwareDedup:true,pixelFloorEvidence:true});
 const frames=trial({sameHand:!wrongHand,noBounce:airborne,reps:1}).frames;
 frames.push({...frames.at(-1),time:1.4});
 for(const {time,person,measurement} of frames){
  const box=ball(...measurement), floor=measurement[1]>570;
  const model=(!pixelOnly&&!floor&&(!drop||time<.3))?box:null;
  const floorPixelEvidence=time>=0?{box:box.box}:null;
  const primaryEvents=includePrimary&&time===1.4?[{event_timestamp_exact:.31}]:[];
  updatePoundRecoverySession(recovery,{primaryEvents,candidates:model?[model]:[],person,time,diameter:60,
   measurement:model?measurement:null,observations:{floorPixelEvidence}});
 }
 return recovery.ledger.confirmed;
}

test('a pixel floor restores one cycle with a model-observed right-hand return',()=>{
 const [event,...rest]=recover();
 assert.equal(rest.length,0);
 assert.equal(event.floor_evidence,'observed_floor_pixels');
 assert.deepEqual(event.evidence_sources,['pixel_floor_recovery']);
});

test('pixel observations cannot supply hand control or turn a drop or airborne move into a rep',()=>{
 for(const variant of [{wrongHand:true},{pixelOnly:true},{drop:true},{airborne:true}]){
  assert.deepEqual(recover(variant),[],JSON.stringify(variant));
 }
});

test('the original proof takes priority when both paths confirm one bounce',()=>{
 const [event,...rest]=recover({includePrimary:true});
 assert.equal(rest.length,0);
 assert.equal(event.event_timestamp_exact,.31);
 assert.deepEqual(event.evidence_sources,['primary','pixel_floor_recovery']);
});
