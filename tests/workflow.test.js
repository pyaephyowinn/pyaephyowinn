import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

test('workflow prints from main only', () => {
  const wf = YAML.parse(readFileSync('.github/workflows/render.yml', 'utf8'));
  assert.deepEqual(wf.on.push.branches, ['main']);
});
