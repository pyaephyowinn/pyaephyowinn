import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

test('workflow also prints on the preview branch', () => {
  const wf = YAML.parse(readFileSync('.github/workflows/render.yml', 'utf8'));
  assert.deepEqual(wf.on.push.branches, ['main', 'newspaper-readme']);
});
