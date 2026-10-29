import test from 'node:test';
import assert from 'node:assert/strict';
import { createFavoriteCache } from '../src/lib/favoriteCache.mjs';

test('malformed and non-array device data never crash the drill library', () => {
  for (const value of ['bad JSON', '{}', 'null', '42']) {
    assert.deepEqual(createFavoriteCache(() => ({getItem: () => value})).read('player'), []);
  }
});
test('device favorites are deduplicated and stay scoped to their player', () => {
  const data = new Map(), cache = createFavoriteCache(() => ({getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)}));
  assert.equal(cache.write('a', ['right-hand-pound', 'right-hand-pound', 3]), true);
  assert.deepEqual(cache.read('a'), ['right-hand-pound']);
  assert.deepEqual(cache.read('b'), []);
});
test('blocked storage and full device quotas are recoverable', () => {
  const denied = createFavoriteCache(() => {throw new Error('SecurityError');});
  assert.deepEqual(denied.read('a'), []);
  assert.equal(denied.write('a', []), false);
  assert.equal(createFavoriteCache(() => ({setItem: () => {throw new Error('QuotaExceeded');}})).write('a', []), false);
});
