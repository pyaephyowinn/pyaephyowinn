import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import YAML from 'yaml';
import { loadContent, findPlaceholders } from '../src/content.js';

test('finds nested placeholders', () => {
  assert.deepEqual(findPlaceholders({ a: { b: 'TODO: x' }, c: [{ d: 'ok' }, { d: 'x TODO: y' }] }), ['a.b', 'c.1.d']);
});

test('strict load throws listing paths', () => {
  assert.throws(() => loadContent('content.yml', { draft: false }), (e) => {
    assert.match(e.message, /profile\.quote/);
    assert.match(e.message, /currently\.0\.text/);
    return true;
  });
});

test('draft load succeeds', () => {
  const content = loadContent('content.yml', { draft: true });
  assert.equal(content.projects.length, 2);
  assert.equal(content.business.length, 4);
  assert.equal(content.startYear, 2022);
});

test('rejects missing required field', () => {
  const data = YAML.parse(readFileSync('content.yml', 'utf8'));
  delete data.site;
  const path = join(mkdtempSync(join(tmpdir(), 'content-')), 'content.yml');
  writeFileSync(path, YAML.stringify(data));
  assert.throws(() => loadContent(path, { draft: true }), /\bsite\b/);
});

test('no minimax', () => {
  assert.doesNotMatch(readFileSync('content.yml', 'utf8'), /minimax|tic-tac-toe/i);
});
