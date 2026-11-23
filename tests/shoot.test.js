import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { screenshotPieces } from '../src/shoot.js';

const css = readFileSync('templates/styles.css', 'utf8').replace('/*FONTS*/', '');
const page = (a, b) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="row">
    <section class="piece lead" data-piece="one" style="flex:0 0 592px;width:592px"><div class="body"><p>${a}</p></div></section>
    <section class="piece side" data-piece="two" style="flex:0 0 296px;width:296px"><div class="body"><p>${b}</p></div></section>
  </div></body></html>`;
const tmp = () => mkdtempSync(join(tmpdir(), 'shoot-'));

test('one png per piece at 2x', async () => {
  const out = tmp();
  const pieces = await screenshotPieces(page('short', 'short'), out);
  assert.deepEqual(pieces.map((p) => [p.id, p.width]), [['one', 1184], ['two', 592]]);
  for (const p of pieces) assert.ok(existsSync(join(out, p.file)));
});

test('row pieces share height', async () => {
  const pieces = await screenshotPieces(page('one line', Array(40).fill('line').join('<br>')), tmp());
  assert.equal(pieces[0].height, pieces[1].height);
  assert.ok(pieces[0].height > 400);
});

test('grouped pieces include their slice of the section bar', async () => {
  const bar = (inGroup) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
    ${inGroup ? '<div class="group" data-group><div class="section-bar" style="height:40px"><b>Head</b></div>' : '<div>'}
    <div class="row"><section class="piece" data-piece="a" style="flex:0 0 444px;width:444px;height:100px"></section><section class="piece" data-piece="b" style="flex:0 0 444px;width:444px;height:100px"></section></div>
    </div></body></html>`;
  const [plain, grouped] = await Promise.all([screenshotPieces(bar(false), tmp()), screenshotPieces(bar(true), tmp())]);
  assert.equal(plain[0].height, 200);
  assert.equal(grouped[0].height, 280);
  assert.equal(grouped[1].height, 280);
  assert.equal(grouped[0].width, 888);
});

test('hashed names change with content', async () => {
  const [a, b] = await Promise.all([screenshotPieces(page('first', 'same'), tmp()), screenshotPieces(page('second', 'same'), tmp())]);
  assert.match(a[0].file, /^one\.[0-9a-f]{8}\.png$/);
  assert.notEqual(a[0].file, b[0].file);
  assert.equal(a[1].file, b[1].file);
});
