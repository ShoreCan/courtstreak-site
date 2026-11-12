import test from 'node:test';
import assert from 'node:assert/strict';
import {repairConfiguration} from '../src/lib/ai/repairPolicy.mjs';
import {createSessionTrackingState, sessionROI} from '../src/lib/ai/sessionTracking.mjs';

function round(lane, diameter, wrist, drill = 'right-hand-pound', revision) {
 const state = createSessionTrackingState(true, drill, 'CROSS 15', false, {enhancedTracking: true});
 state.configuration = repairConfiguration(state.configuration, drill, revision);
 state.tracker.lanes = [lane];
 state.tracker.diameters = [diameter];
 state.poseAt = 4;
 state.person = {xy: Array.from({length: 17}, () => [640, 1050]), confidence: Array(17).fill(.9)};
 state.person.xy[10] = wrist;
 state.person.box = [350, 300, 940, 1900];
 return state;
}

test('the first active pound pass includes the actual hand after the setup ball was closer to the camera', () => {
 const state = round(377, 346, [745, 1166]);
 assert.deepEqual(state.tracker.roi(1280, 2276), [19, 318, 735, 2276]);
 assert.deepEqual(sessionROI(state, state.person, 1280, 2276, 4.04), [19, 318, 1109, 2276]);
});

test('pound search widens in either direction and preserves the calibrated crop when it fits', () => {
 const centered = round(690, 170, [700, 450]);
 assert.deepEqual(sessionROI(centered, centered.person, 1280, 720, 4.03), centered.tracker.roi(1280, 720));
 const shifted = round(910, 220, [440, 200]);
 const crop = sessionROI(shifted, shifted.person, 1280, 720, 4.03);
 assert.equal(crop[0], 209);
 assert.equal(crop[1], 0);
 assert.equal(crop[3], 720);
});

test('ball loss searches the entire frame and a recovered ball supplies a live crop anchor', () => {
 const state = round(390, 180, [650, 1100]);
 state.tracker.missed = 3;
 state.lastBallSeenAt = 4;
 assert.deepEqual(sessionROI(state, state.person, 1280, 2276, 4.15), state.tracker.roi(1280, 2276));
 assert.deepEqual(sessionROI(state, state.person, 1280, 2276, 4.41), [0, 0, 1280, 2276]);
 state.tracker.missed = 0;
 state.ball = {box: [780, 890, 975, 1085], score: .9};
 assert.equal(sessionROI(state, state.person, 1280, 2276, 4.4)[2], 1038);
});

test('old pound evidence and crossover routes use their historical crop rules', () => {
 const previous = round(377, 346, [745, 1166], 'right-hand-pound', 'TRACKING REPAIR 05');
 assert.deepEqual(sessionROI(previous, previous.person, 1280, 2276, 4.04), previous.tracker.roi(1280, 2276));
 const oldCross = round(690, 170, [760, 740], 'stationary-crossover', 'TRACKING REPAIR 05');
 const newCross = round(690, 170, [760, 740], 'stationary-crossover');
 assert.deepEqual(sessionROI(newCross, newCross.person, 1280, 2276, 4.04), sessionROI(oldCross, oldCross.person, 1280, 2276, 4.04));
});
