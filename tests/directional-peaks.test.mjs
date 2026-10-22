import test from 'node:test';
import assert from 'node:assert/strict';
import {GapAwareBounceCounter} from '../src/lib/ai/poundCore.mjs';
function run(motion,enabled=true){const c=new GapAwareBounceCounter({directionalPeaks:enabled});
 const rows=[...Array(8).fill(200),...motion,...Array(20).fill(200)];rows.forEach((y,i)=>c.update(i/30,y===null?null:[y,80],720));return c;}
test('a repeated position on ascent is not a second bounce',()=>{
 const motion=[220,260,320,400,500,600,550,500,500,450,400,350,300,250,200];
 assert.equal(run(motion,false).count,2);assert.equal(run(motion).count,1);
});
test('a genuine flat bottom preceded by descent still produces one bounce',()=>assert.equal(run([220,260,320,400,500,600,600,600,500,400,300,200]).count,1));
test('stationary repeated images do not create a bounce',()=>assert.equal(run(Array(35).fill(200)).count,0));
test('distinct rapid down-up cycles remain countable without a cooldown',()=>{
 const cycle=[200,250,400,600,400,250,200];const c=run([...cycle,...cycle]);assert.equal(c.count,2);
});
