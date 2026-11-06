import test from 'node:test';
import assert from 'node:assert/strict';
import {LAUNCH_DRILLS, LAUNCH_DRILL_BY_KEY as catalog} from '../src/data/drillCatalog.js';
import {assessPrerequisites, validateProgressionCatalog} from '../src/lib/drillProgression.mjs';
import {DrillSequenceCounter} from '../src/lib/ai/sequenceCounter.mjs';
const event = (id, move, from, to, time, extra = {}) => ({id, move, from_hand: from, to_hand: to, event_time_seconds: time,
  floor_contact_time_seconds: time-.1, bounce_confirmed: true, move_verified: true, control_status: 'confirmed', ...extra});
test('catalog prerequisites exist, are acyclic and preserve hand continuity', () => assert.equal(validateProgressionCatalog(LAUNCH_DRILLS), true));
test('controlled low pounds have no height requirement in any sequence contract', () => {
  for (const drill of LAUNCH_DRILLS) assert.equal(drill.sequence_contract.minimum_bounce_height, null);
});
test('a double crossover counts only once after both controlled bounces', () => {
  const counter = new DrillSequenceCounter(catalog['double-crossover']);
  assert.equal(counter.update(event('a', 'cross', 'right', 'left', 1)), null);
  assert.equal(counter.update(event('b', 'cross', 'left', 'right', 2)).count, 1);
  assert.equal(counter.update(event('c', 'cross', 'right', 'left', 3)), null);
  assert.equal(counter.count, 1);
});
test('pound-cross sequences alternate their starting hand without an extra reset', () => {
  const counter = new DrillSequenceCounter(catalog['pound-cross-alternating']);
  assert.equal(counter.update(event('a', 'pound', 'right', 'right', 1)), null);
  assert.equal(counter.update(event('b', 'cross', 'right', 'left', 2)).count, 1);
  assert.equal(counter.update(event('c', 'pound', 'left', 'left', 3)), null);
  assert.equal(counter.update(event('d', 'cross', 'left', 'right', 4)).count, 2);
});
test('a bounce-free wrap or unverified route cannot complete a combination', () => {
  for (const extra of [{bounce_confirmed:false}, {move_verified:false}, {control_status:'uncertain'}, {floor_contact_time_seconds:null}]) {
    const counter = new DrillSequenceCounter(catalog['crossover-between']);
    counter.update(event('a','cross','right','left',1));
    assert.equal(counter.update(event('b','between','left','right',2,extra)), null);
    assert.equal(counter.count, 0);
  }
});
test('a wrong movement resets the partial sequence; no stitching across a mishandle', () => {
  const counter = new DrillSequenceCounter(catalog['double-crossover']);
  counter.update(event('a','cross','right','left',1));
  counter.update(event('b','pound','left','left',2,{control_status:'mishandle'}));
  assert.equal(counter.update(event('c','cross','left','right',3)),null);
  assert.equal(counter.count,0);
});
test('duplicate input IDs and out-of-order observations cannot add a rep', () => {
  const counter = new DrillSequenceCounter(catalog['right-hand-pound']);
  const e = event('a','pound','right','right',1);
  assert.equal(counter.update(e).count,1);
  assert.equal(counter.update(e),null);
  assert.equal(counter.update({...e,id:'b',event_time_seconds:.5}),null);
  assert.equal(counter.count,1);
});
const session = (id, key, day, extra={}) => ({id,drill_key:key,completed:true,control_reviewed:true,
  verification_mode:'manual',count_kind:catalog[key].count_kind,count_rule_version:catalog[key].count_rule_version,
  reps:10,reviewed_clean_reps:10,completed_at:`2026-11-0${day}T12:00:00Z`,...extra});
test('readiness needs reviewed controlled practice for each prerequisite on separate days', () => {
  const rows = ['right-hand-pound','left-hand-pound'].flatMap(key=>[session(key+'1',key,1),session(key+'2',key,2)]);
  const result = assessPrerequisites(catalog['stationary-crossover'],LAUNCH_DRILLS,rows);
  assert.equal(result.recommended_ready,true); assert.equal(result.camera_certified,false);
  assert.equal(assessPrerequisites(catalog['stationary-crossover'],LAUNCH_DRILLS,rows.slice(0,2)).recommended_ready,false);
});
test('ordinary counts, repeated rows, same-day rounds and incompatible rules do not certify readiness', () => {
  const key='stationary-crossover', drill=catalog['double-crossover'];
  for (const rows of [
    [session('a',key,1),session('b',key,1)],
    [session('a',key,1),session('a',key,2)],
    [session('a',key,1),session('b',key,2,{control_reviewed:false})],
    [session('a',key,1),session('b',key,2,{count_rule_version:99})],
    [session('a',key,1),session('b',key,2,{reviewed_clean_reps:20})],
  ]) assert.equal(assessPrerequisites(drill,LAUNCH_DRILLS,rows).recommended_ready,false);
});
test('unvalidated combinations remain unavailable for automatic camera certification', () => {
  for (const drill of LAUNCH_DRILLS.filter(d=>d.count_kind==='sequence')) {
    assert.equal(drill.ai_tracking_available,false); assert.equal(drill.camera_support.native,'unvalidated');
  }
});
