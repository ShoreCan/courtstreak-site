import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedSessionReceipt} from '../src/lib/sessionReceipt.mjs';

test('empty RPC success responses cannot claim a saved training result', () => {
  for (const value of [null, undefined, {}, [], [{}], {session_id:null}]) {
    assert.throws(() => confirmedSessionReceipt(value), /save could not be confirmed/);
  }
});
test('object and row-array receipts preserve the confirmed session for retry handling', () => {
  const receipt = {session_id:'saved-session',xp_awarded:0};
  assert.equal(confirmedSessionReceipt(receipt), receipt);
  assert.equal(confirmedSessionReceipt([receipt]), receipt);
});
