import { readFileSync } from 'node:fs';
import { geometry } from '../src/lib/ai/poundCore.mjs';
import { replayCrossovers } from '../src/lib/ai/crossoverReplay.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { BETWEEN_LEGS_DRILL_KEY, BETWEEN_LEGS_CONTINUITY_REVISION, BETWEEN_LEGS_OCCLUSION_REVISION, BETWEEN_LEGS_PROPORTIONS_REVISION, BETWEEN_LEGS_RECOVERY_REVISION } from '../src/lib/ai/betweenLegsCounter.mjs';
import { createSessionTrackingState, resetSessionTrackingCounter, updateSessionCounter } from '../src/lib/ai/sessionTracking.mjs';
import { shiftPreGoTimeline } from '../src/lib/ai/setupGuidance.mjs';
import { ball, person, trial } from './helpers/crossover-scenarios.mjs';

function replay({ pose = person(), adjust = frame => frame, drillKey = BETWEEN_LEGS_DRILL_KEY,
  shift = 0, proportions = false, ...options } = {}) {
  pose.xy[13] = [550, 530];
  pose.xy[14] = [730, 530];
  const state = createSessionTrackingState(true, drillKey, 'CROSS 14');
  if (proportions) {
    state.configuration = {...state.configuration, betweenLegsRevision: BETWEEN_LEGS_PROPORTIONS_REVISION};
    resetSessionTrackingCounter(state);
  }
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

test('recover an undersized receiving-ball detection after a visible bounce in either direction', () => {
  function replayReceipt({ start, noBounce = false, distractor = false, recoverReceipt = true, reason = 'size_ratio' }) {
    const pose = person();
    pose.xy[13] = [550, 530];
    pose.xy[14] = [730, 530];
    const state = createSessionTrackingState(true, BETWEEN_LEGS_DRILL_KEY, 'CROSS 14');
    if (recoverReceipt) {
      state.configuration = { ...state.configuration, betweenLegsRevision: reason === 'background_memory'
        ? BETWEEN_LEGS_CONTINUITY_REVISION : BETWEEN_LEGS_RECOVERY_REVISION };
      resetSessionTrackingCounter(state);
    }
    const { frames } = trial({ pose, start, reps: 1, noBounce });
    for (const { time, measurement, person } of frames) {
      const receiving = time >= .54;
      const [x, y] = measurement;
      const balls = receiving ? [ball(x, y, 49)] : [];
      if (receiving && distractor) balls.push(ball(x, y - 32, 49));
      const decisions = balls.map((_, candidateIndex) => ({ candidateIndex, reason }));
      updateSessionCounter(state, time, receiving ? null : measurement, person, 720, 20, balls, { balls, decisions });
    }
    return state.counter.count;
  }

  for (const start of ['left', 'right']) {
    assert.equal(replayReceipt({ start }), 1);
    assert.equal(replayReceipt({ start, recoverReceipt: false }), 0);
    assert.equal(replayReceipt({ start, noBounce: true }), 0);
    assert.equal(replayReceipt({ start, distractor: true }), 0);
    assert.equal(replayReceipt({ start, reason: 'background_memory' }), 1);
    assert.equal(replayReceipt({ start, reason: 'background_memory', noBounce: true }), 0);
  }
});

test('track through the measured opening with a narrow stance and low or wide hand positions', () => {
  for (const [handY, reach] of [[350, .7], [535, 1.4]]) {
    const pose = person(handY);
    for (const i of [9, 10]) pose.xy[i][0] = 640 + (pose.xy[i][0] - 640) * reach;
    pose.xy[15] = [620, 660];
    pose.xy[16] = [660, 660];
    const adjust = frame => {
      if (frame.measurement) {
        const [x, y, diameter] = frame.measurement;
        frame = {...frame, measurement: [640 + (x - 640) * reach, y, diameter]};
      }
      return frame;
    };
    const options = {pose, adjust, handY, proportions: true};
    assert.equal(replay(options).counter.count, 4);
    assert.equal(replay({...options, proportions: false}).counter.count, 0);
    assert.equal(replay({...options, noBounce: true}).counter.count, 0);
    assert.equal(replay({...options, sameHand: true}).counter.count, 0);
  }
});

test('a rejected between-the-legs floor detection needs observed ascent and opposite-hand control', () => {
  function count({revision = BETWEEN_LEGS_OCCLUSION_REVISION, ascent = true, receipt = true, ambiguous = false} = {}) {
    const pose = person();
    pose.xy[13] = [550, 530];
    pose.xy[14] = [730, 530];
    const state = createSessionTrackingState(true, BETWEEN_LEGS_DRILL_KEY, 'CROSS 14');
    state.configuration = { ...state.configuration, betweenLegsRevision: revision };
    resetSessionTrackingCounter(state);

    const frames = [
      [-.04, ball(840, 350)],
      [.03, ball(807, 416)],
      [.07, ball(770, 470)],
      [.14, ball(722, 548)],
      [.20, null, ball(660, 635)],
      [.24, ascent ? ball(623, 585) : null],
      [.31, ascent ? ball(560, 480) : null],
      [.43, receipt ? ball(454, 358) : null],
      [.49, receipt ? ball(448, 352) : null],
      [.56, receipt ? ball(446, 350) : null],
    ];
    for (const [time, selected, floor] of frames) {
      const balls = floor ? [floor] : [];
      if (floor && ambiguous) balls.push(ball(644, 630));
      const decisions = balls.map((_, candidateIndex) => ({ candidateIndex, reason: 'background_memory' }));
      const g = selected ? geometry(selected) : null;
      updateSessionCounter(state, time, g ? [...g.center, g.diameter] : null, pose, 720, 20,
        balls, { balls, decisions, selected });
    }
    return state.counter.count;
  }
  assert.equal(count(), 1);
  assert.equal(count({revision: BETWEEN_LEGS_PROPORTIONS_REVISION}), 0);
  assert.equal(count({ascent: false}), 0);
  assert.equal(count({receipt: false}), 0);
  assert.equal(count({ambiguous: true}), 0);
});

test('a receiving hand can redirect into the next release after a short observation gap', () => {
  function count(revision, redirect = true) {
    const state = createSessionTrackingState(true, BETWEEN_LEGS_DRILL_KEY, 'CROSS 14');
    state.configuration = { ...state.configuration, betweenLegsRevision: revision };
    resetSessionTrackingCounter(state);

    const frames = [
      [-.05, [440, 350, 60], 840],
      [.03, [490, 430, 60], 840],
      [.09, [550, 555, 60], 840],
      [.15, [620, 630, 60], 840],
      [.19, [680, 550, 60], 840],
      [.26, [730, 466, 60], 742],
      [.32, [770, 400, 60], 790],
      [.34, [770, 400, 60], null],
      [.52, [redirect ? 740 : 822, 460, 60], null],
      [.59, [690, 545, 60], null],
      [.64, [645, 630, 60], null],
    ];
    for (const [time, measurement, receivingX] of frames) {
      const pose = person();
      pose.xy[13] = [550, 530];
      pose.xy[14] = [730, 530];
      pose.xy[10] = [receivingX ?? 840, time <= .26 ? 477 : 365];
      if (receivingX === null) pose.confidence[10] = 0;
      updateSessionCounter(state, time, measurement, pose, 720, 20);
    }
    return state.counter.confirmed;
  }
  const recovered = count(BETWEEN_LEGS_OCCLUSION_REVISION);
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].control_evidence, 'observed_inward_redirect');
  assert.equal(count(BETWEEN_LEGS_PROPORTIONS_REVISION).length, 0);
  assert.equal(count(BETWEEN_LEGS_OCCLUSION_REVISION, false).length, 0);
});

test('a verified floor box supplies scale only for an observed, correctly directed ascent', () => {
  function replay(revision, {wrongDirection = false, tiny = false, noControl = false} = {}) {
    const pose = person();
    pose.xy[13] = [550, 530];
    pose.xy[14] = [730, 530];
    const state = createSessionTrackingState(true, BETWEEN_LEGS_DRILL_KEY, 'CROSS 14');
    state.configuration = {...state.configuration, betweenLegsRevision: revision};
    resetSessionTrackingCounter(state);
    const frames = [
      [-.05, ball(840, 350, 80)],
      [.04, ball(800, 410, 77)],
      [.10, ball(748, 490, 77)],
      [.16, ball(700, 565, 74)],
      [.22, null, ball(645, 630, 60)],
      [.27, ball(wrongDirection ? 690 : 600, 570, tiny ? 38 : 47)],
      [.44, noControl ? null : ball(462, 373, 58)],
      [.50, noControl ? null : ball(452, 364, 59)],
      [.56, noControl ? null : ball(446, 352, 60)],
    ];
    for (const [time, selected, rejected] of frames) {
      const g = selected ? geometry(selected) : null;
      const balls = rejected ? [rejected] : selected ? [selected] : [];
      const decisions = rejected ? [{candidateIndex: 0, reason: 'background_memory'}] : [];
      updateSessionCounter(state, time, g ? [...g.center, g.diameter] : null, pose, 720, 20,
        balls, {balls, decisions, selected});
    }
    return state.counter.confirmed;
  }
  const recovered = replay(BETWEEN_LEGS_CONTINUITY_REVISION);
  assert.equal(recovered[0]?.floor_contact_time_seconds, .22);
  assert.equal(recovered[0]?.floor_evidence, 'motion_verified_background_candidate');
  assert.equal(replay(BETWEEN_LEGS_OCCLUSION_REVISION).length, 0);
  assert.equal(replay(BETWEEN_LEGS_CONTINUITY_REVISION, {wrongDirection: true}).length, 0);
  assert.equal(replay(BETWEEN_LEGS_CONTINUITY_REVISION, {tiny: true}).length, 0);
  assert.equal(replay(BETWEEN_LEGS_CONTINUITY_REVISION, {noControl: true}).length, 0);
});
