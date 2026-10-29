import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestId } from '../src/lib/requestId.mjs';

test('request identifiers use native randomUUID when available', () => {
  assert.equal(createRequestId({randomUUID: () => 'native-identifier'}), 'native-identifier');
});
test('older browser fallback produces a UUID with correct version and variant', () => {
  const id = createRequestId({getRandomValues: bytes => {bytes.fill(255); return bytes;}});
  assert.equal(id, 'ffffffff-ffff-4fff-bfff-ffffffffffff');
});
test('missing secure randomness returns an unavailable result', () => {
  assert.equal(createRequestId({}), null);
});
