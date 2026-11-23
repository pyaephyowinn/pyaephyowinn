import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROWS, PAGE_WIDTH, SECTION_HEADS } from '../src/layout.js';

test('spans sum to 12 per row', () => {
  for (const row of ROWS) assert.equal(row.reduce((n, p) => n + p.span, 0), 12);
  assert.equal(PAGE_WIDTH, 888);
});

test('ids are unique and complete', () => {
  assert.deepEqual(ROWS.flat().map((p) => p.id), [
    'masthead', 'about', 'activity', 'project-newspapercn', 'project-sleight',
    'biz-f2f', 'biz-bizcopilot', 'biz-pos', 'biz-mmtrails', 'classifieds', 'weather',
  ]);
});

test('section heads sit on the first piece of a row', () => {
  const firsts = ROWS.map((row) => row[0].id);
  for (const id of Object.keys(SECTION_HEADS)) assert.ok(firsts.includes(id), id);
});
