import test from 'node:test';
import assert from 'node:assert/strict';
import { BackgroundFloorRecovery } from '../src/lib/ai/backgroundFloorRecovery.mjs';
import { PoundEventLedger } from '../src/lib/ai/controlledPoundRecovery.mjs';

const row = (time, y, hand, frame, x = 400) => ({
 time, frame, feetY: 600, measurement: y == null ? null : [x, y, 80],
 handDistance: hand === 'right' ? .5 : null, otherHandDistance: hand === 'left' ? .5 : 3,
 hands: hand ? { [hand]: [x, y - 40] } : {},
});
const floor = { box: [360, 529, 440, 609], score: .85 };
function trial({ candidate = floor, reason = 'background_memory', ambiguity = false, wrongHand = false, late = false, competing = false } = {}) {
 const recovery = new BackgroundFloorRecovery();
 const context = [row(.1, 360, 'right', 1), row(.14, 400, 'right', 2), row(.18, 459, null, 3)];
 const floorRow = row(.24, competing ? 562 : null, null, 4);
 const boxes = ambiguity ? [candidate, { ...candidate, box: [366, 529, 446, 609] }] : [candidate];
 const observations = { balls: boxes, decisions: boxes.map((_, candidateIndex) => ({ candidateIndex, reason })) };
 context.push(floorRow);
 assert.deepEqual(recovery.update(context, observations, 80, 20), []);
 const hand = wrongHand ? 'left' : 'right';
 const follow = [row(.31, 490, null, 5), row(.36, 415, hand, 6)];
 if (late) follow.push(row(.41, 485, null, 7), row(.67, 406, hand, 8), row(.72, 405, hand, 9));
 else follow.push(row(.4, 400, hand, 7));
 return follow.flatMap(sample => {
  context.push(sample);
  return recovery.update(context, null, 80, 20);
 });
}

test('a rejected floor box can add one observed cycle after a controlled right-hand return', () => {
 const events = trial();
 assert.deepEqual(events.map(e => [e.floor_contact_time_seconds, e.from_hand, e.to_hand]), [[.24, 'right', 'right']]);
 const ledger = new PoundEventLedger();
 ledger.add(events[0], 'background_floor_recovery', .4);
 assert.equal(ledger.add({ ...events[0], floor_contact_time_seconds: .26 }, 'primary', .43), null);
 assert.equal(ledger.count, 1);
});

test('background recovery requires unambiguous floor evidence and control within the same cycle', () => {
 for (const options of [
  { reason: 'weak_geometry' }, { ambiguity: true }, { wrongHand: true }, { late: true }, { competing: true },
  { candidate: { ...floor, box: [360, 439, 440, 519] } },
 ]) assert.deepEqual(trial(options), []);
});
