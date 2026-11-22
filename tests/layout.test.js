import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROWS, PAGE_WIDTH } from '../src/layout.js';

test('spans sum to 12 per row', () => {
  for (const row of ROWS) assert.equal(row.reduce((n, p) => n + p.span, 0), 12);
  assert.equal(PAGE_WIDTH, 888);
});

test('ids are unique and complete', () => {
  assert.deepEqual(ROWS.flat().map((p) => p.id), [
    'masthead', 'lead', 'side', 'projects-bar', 'project-newspapercn', 'project-sleight',
    'business-bar', 'biz-f2f', 'biz-bizcopilot', 'biz-pos', 'biz-mmtrails', 'classifieds', 'weather',
  ]);
});
