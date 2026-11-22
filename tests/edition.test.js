import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRoman, editionInfo } from '../src/edition.js';

test('roman', () => {
  assert.equal(toRoman(4), 'IV');
  assert.equal(toRoman(9), 'IX');
  assert.equal(toRoman(14), 'XIV');
});

test('approved sample date', () => {
  assert.deepEqual(editionInfo(new Date('2026-11-23T00:00:00Z'), 2022), {
    volume: 'IV', issue: 48, dateLabel: 'Monday, November 23, 2026',
  });
});

test('iso week at year boundary', () => {
  assert.equal(editionInfo(new Date('2027-01-01T12:00:00Z'), 2022).issue, 53);
  assert.equal(editionInfo(new Date('2027-01-04T00:00:00Z'), 2022).issue, 1);
});

test('volume floor', () => {
  assert.equal(editionInfo(new Date('2026-06-01T00:00:00Z'), 2026).volume, 'I');
  assert.equal(editionInfo(new Date('2026-06-01T00:00:00Z'), 2030).volume, 'I');
});
