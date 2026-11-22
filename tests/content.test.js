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
  const data = YAML.parse(readFileSync('content.yml', 'utf8'));
  data.profile.quote = 'TODO: a quote';
  data.currently[0].text = 'TODO: something';
  const path = join(mkdtempSync(join(tmpdir(), 'content-')), 'content.yml');
  writeFileSync(path, YAML.stringify(data));
  assert.throws(() => loadContent(path, { draft: false }), (e) => {
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

test('rejects projects and businesses the layout has no slot for', () => {
  const base = YAML.parse(readFileSync('content.yml', 'utf8'));
  const dir = mkdtempSync(join(tmpdir(), 'content-'));
  const extra = structuredClone(base);
  extra.projects.push({ ...extra.projects[0], id: 'third' });
  writeFileSync(join(dir, 'a.yml'), YAML.stringify(extra));
  assert.throws(() => loadContent(join(dir, 'a.yml'), { draft: true }), /projects.*third/);
  const renamed = structuredClone(base);
  renamed.business[0].id = 'acme';
  writeFileSync(join(dir, 'b.yml'), YAML.stringify(renamed));
  assert.throws(() => loadContent(join(dir, 'b.yml'), { draft: true }), /business.*acme/);
});

test('no minimax', () => {
  assert.doesNotMatch(readFileSync('content.yml', 'utf8'), /minimax|tic-tac-toe/i);
});
