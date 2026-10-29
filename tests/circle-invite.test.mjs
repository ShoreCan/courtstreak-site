import test from 'node:test';
import assert from 'node:assert/strict';
import { circleInviteCode } from '../src/lib/circleInvite.mjs';

test('Circle entry accepts a code or a CourtStreak invitation link', () => {
  assert.equal(circleInviteCode(' abc-123_X '), 'abc-123_X');
  assert.equal(circleInviteCode('https://shorecan.github.io/courtstreak-site/training-circles/join/abc-123_X?accept=1'), 'abc-123_X');
  assert.equal(circleInviteCode('/courtstreak-site/training-circles/join/abc-123_X', 'https://local.test'), 'abc-123_X');
});
test('unrelated hosts, page links and malformed invitation input are rejected', () => {
  for (const value of ['https://evil.test/courtstreak-site/training-circles/join/abc123', 'https://shorecan.github.io/courtstreak-site/login', '//evil.test/abc123', 'javascript:alert(1)', 'a/b', 'abc%2Fdef', '', 'a'.repeat(513)]) {
    assert.equal(circleInviteCode(value), null, value);
  }
});
