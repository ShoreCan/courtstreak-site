import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoundClock} from '../src/lib/roundClock.mjs';

test('delayed render callbacks do not lengthen a round', () => {
  let now = 0;
  const clock = createRoundClock(() => now);
  clock.start(20);
  now = 3450; assert.equal(clock.seconds(), 17);
  now = 19999; assert.equal(clock.seconds(), 1);
  now = 22000; assert.equal(clock.seconds(), 0);
});
test('a background pause preserves the remaining fraction of a second', () => {
  let now = 0;
  const clock = createRoundClock(() => now);
  clock.start(5);
  now = 1400; clock.pause();
  now = 40000; assert.equal(clock.seconds(), 4);
  clock.resume();
  now = 43599; assert.equal(clock.seconds(), 1);
  now = 43600; assert.equal(clock.seconds(), 0);
});
test('repeated pause and resume calls do not add or subtract time', () => {
  let now = 100;
  const clock = createRoundClock(() => now);
  clock.start(20);
  now = 1100; clock.pause(); clock.pause();
  now = 9000; clock.resume(); clock.resume();
  now = 10000; assert.equal(clock.seconds(), 18);
  clock.reset(); assert.equal(clock.seconds(), 0);
  clock.start(5); assert.equal(clock.seconds(), 5);
  assert.throws(() => clock.start(0));
});
