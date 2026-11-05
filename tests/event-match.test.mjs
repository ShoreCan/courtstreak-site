import test from 'node:test';
import assert from 'node:assert/strict';
import {matchEvents} from '../scripts/diagnostics/event-match.mjs';
test('one prediction cannot conceal a missing rep and duplicates stay extra',()=>{
 const r=matchEvents([{time:1},{time:2}],[{time:1.01},{time:1.02}],.15);
 assert.equal(r.matched,1);assert.equal(r.missed.length,1);assert.equal(r.extra.length,1);
});
test('matching prioritizes total matches before timestamp error',()=>{
 const r=matchEvents([{time:1},{time:1.2}],[{time:.9},{time:1.05}],.16);
 assert.equal(r.matched,2);assert.deepEqual(r.pairs,[[0,0],[1,1]]);
});
test('wrong hand is reported separately from the count',()=>{
 assert.equal(matchEvents([{time:1,fromHand:'right'}],[{time:1,fromHand:'left'}],.1).wrongHand,1);
});
