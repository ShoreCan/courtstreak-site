import { readFileSync } from 'node:fs';
import { replayCrossovers } from '../src/lib/ai/crossoverReplay.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { BETWEEN_LEGS_DRILL_KEY } from '../src/lib/ai/betweenLegsCounter.mjs';
import { createSessionTrackingState, resetSessionTrackingCounter, updateSessionCounter } from '../src/lib/ai/sessionTracking.mjs';
import { shiftPreGoTimeline } from '../src/lib/ai/setupGuidance.mjs';
import { person, trial } from './helpers/crossover-scenarios.mjs';

function replay({ pose = person(), adjust = frame => frame, drillKey = BETWEEN_LEGS_DRILL_KEY,
  shift = 0, ...options } = {}) {
  pose.xy[13] = [550, 530];
  pose.xy[14] = [730, 530];
  const state = createSessionTrackingState(true, drillKey, 'CROSS 14');
  const { frames } = trial({ reps: 4, ...options, pose });
  let shifted = false;
  for (const input of frames) {
    if (shift && !shifted && input.time >= 0) {
      shiftPreGoTimeline(state, shift);
      shifted = true;
    }
    const frame = adjust(input);
    updateSessionCounter(state, frame.time, frame.measurement, frame.person, 720, 20);
  }
  return state;
}

for (const [fps, period, handY, start] of [[30, .6, 350, 'right'], [20, .5, 350, 'left'], [30, .48, 560, 'right']]) {
  test(`counts four alternating transfers at ${fps} fps, hand y=${handY}, starting ${start}`, () => {
    const state = replay({ fps, period, pose: person(handY), handY, start });
    assert.deepEqual(state.counter.confirmed.map(event => event.count), [1, 2, 3, 4]);
    assert.equal(state.counter.confirmed[0].from_hand, start);
    assert.ok(state.counter.confirmed.every(event => event.validation_path === 'between_legs'));
  });
}

test('short ball occlusions on descent or ascent preserve observed turns and receipts', () => {
  const state = replay({ missing: ({ rep, phase }) => rep % 2 === 0 ?
    phase > .23 && phase < .35 : phase > .61 && phase < .73 });
  assert.equal(state.counter.count, 4);
});

test('a pass, a same-hand return, and missing evidence of the floor turn do not count', () => {
  assert.equal(replay({ noBounce: true }).counter.count, 0);
  assert.equal(replay({ sameHand: true }).counter.count, 0);
  assert.equal(replay({ missing: ({ phase }) => phase > .26 && phase < .74 }).counter.count, 0);
});

test('a floor turn outside both legs remains eligible for crossover but not between-the-legs', () => {
  const adjust = frame => {
    const m = frame.measurement;
    return m?.[1] > 605 ? { ...frame, person: {
      ...frame.person, xy: frame.person.xy.map(([x,y], index) => [index >= 13 ? x + 180 : x, y]),
    } } : frame;
  };
  const state = replay({ adjust });
  assert.equal(state.counter.count, 0);
  assert.equal(state.counter.pathRejections.length, 4);
  assert.ok(state.counter.pathRejections.every(event => event.control_status === 'outside_leg_gap'));
  assert.equal(replay({ adjust, drillKey: 'stationary-crossover' }).counter.count, 4);
});

test('ambiguous leg pose and unverified receiving hand cannot confirm a rep', () => {
  const hiddenKnee = person();
  hiddenKnee.confidence[13] = 0;
  const state = replay({ pose: hiddenKnee });
  assert.equal(state.counter.count, 0);
  assert.equal(state.counter.pathRejections[0].control_status, 'unclear_leg_path');
  const withoutReceipts = replay({ reps: 1, adjust: frame => frame.time > .43 ?
    { ...frame, person: { ...frame.person, confidence: frame.person.confidence.map((value, i) => i === 9 ? 0 : value) } } : frame });
  assert.equal(withoutReceipts.counter.count, 0);
});

test('reanchoring the countdown preserves a held release and restarting clears the count', () => {
  const state = replay({ shift: .025 });
  assert.equal(state.counter.count, 4);
  resetSessionTrackingCounter(state);
  assert.equal(state.counter.count, 0);
  assert.equal(state.counter.observations.size, 0);
});

test('the saved November crossover counts as a crossover and stays out of the pilot count', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/nov02-crossover-second-rep.json', import.meta.url)));
  const frames = fixture.rows.map(({ time, measurement: [x, y, d], person }, index) => ({
    phase: 'active', elapsed: time, counterFrame: index + 1, person,
    selected: { box: [x - d / 2, y - d / 2, x + d / 2, y + d / 2] },
  }));
  const evidence = { frames, trackerRevision: 'CROSS 14' };
  assert.equal(replayCrossovers({ ...evidence, drillKey: 'stationary-crossover' }).count, 1);
  const candidate = replayCrossovers({ ...evidence, drillKey: BETWEEN_LEGS_DRILL_KEY });
  assert.equal(candidate.count, 0);
  assert.equal(candidate.rejectedEvents.at(-1).control_status, 'unclear_leg_path');
});

test('a front bounce overlapping the leg gap horizontally is excluded at the observed turn', () => {
  const pose = person();
  pose.xy[16][1] -= 30;
  const state = replay({ pose, reps: 4, bottom: 690 });
  assert.equal(state.counter.count, 0);
  assert.equal(state.counter.pathRejections.length, 4);
  assert.ok(state.counter.pathRejections.every(event =>
    event.control_status === 'projected_bounce_in_front_of_feet'));
  assert.equal(replay({ pose, reps: 4, bottom: 690, drillKey: 'stationary-crossover' }).counter.count, 4);
});

test('a borderline front turn requires ball scale corroboration', () => {
  const options = { reps: 1, bottom: 672 };
  assert.equal(replay(options).counter.count, 1);
  const state = replay({ ...options, adjust: frame =>
    frame.time > .45 && frame.measurement
      ? { ...frame, measurement: [...frame.measurement.slice(0, 2), 66] }
      : frame,
  });
  assert.equal(state.counter.count, 0);
  assert.equal(state.counter.pathRejections[0].control_status, 'projected_bounce_in_front_of_feet');
});
