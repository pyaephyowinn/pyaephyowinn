import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../src/content.js';
import { editionInfo } from '../src/edition.js';
import { ROWS } from '../src/layout.js';
import { buildReadme, altFor } from '../src/readme.js';
import { summarizeActivity } from '../src/activity.js';
import { calendar } from './fixtures.js';

const content = loadContent('content.yml', { draft: true });
const model = {
  content,
  edition: editionInfo(new Date('2026-11-23T00:00:00Z'), content.startYear),
  weather: { top: [{ name: 'JavaScript', pct: 76 }, { name: 'TypeScript', pct: 19 }], otherPct: 5, forecast: 'mostly JavaScript, with spells of TypeScript and a high chance of side projects.' },
  activity: summarizeActivity({ total: 5190, priorTotal: 2556, allTime: 8760, days: calendar('2025-11-23', '2026-11-23', (_, i) => i % 3) }),
  avatar: '',
};
const pieces = ROWS.flat().map(({ id }) => ({ id, file: `${id}.abcdef12.png`, width: 100, height: 100, bytes: 1 }));
const readme = buildReadme(pieces, model);
const imgTag = (id) => readme.match(new RegExp(`<img src="img/${id}\\.[^"]+"[^>]*>`))[0];

test('links each target once', () => {
  assert.equal(readme.split('<a href="https://pos.triumsoft.net/">').length - 1, 1);
  for (const id of ['weather', 'projects-bar', 'business-bar']) {
    assert.ok(!new RegExp(`<a [^>]*><img src="img/${id}\\.`).test(readme), id);
  }
  assert.ok(readme.includes('<a href="https://pyaephyowin.com"><img src="img/masthead.'));
  assert.ok(readme.includes('<a href="https://pyaephyowin.com"><img src="img/about.'));
});

test('widths match spans', () => {
  assert.match(imgTag('about'), /width="100%"/);
  assert.match(imgTag('weather'), /width="41.67%"/);
  assert.match(imgTag('masthead'), /width="100%"/);
});

test('alt carries the story', () => {
  const alt = altFor('project-sleight', model);
  assert.ok(alt.includes('Man Escapes Endless Log-Out Loop'));
  assert.ok(alt.includes('named profiles'));
  assert.equal(altFor('masthead', model), 'The Pyae Times. Vol. IV, No. 48. Monday, November 23, 2026.');
  assert.ok(!altFor('classifieds', model).includes('**'));
});

test('commit index links to the profile and reads out the numbers', () => {
  assert.ok(readme.includes('<a href="https://github.com/pyaephyowinn"><img src="img/activity.'));
  const alt = altFor('activity', model);
  assert.ok(alt.startsWith('Markets: Commit Index'));
  assert.ok(alt.includes('5,190 contributions in the last year.'));
  assert.match(alt, /Longest streak: \d+ days\./);
});

test('text footer', () => {
  const last = readme.trim().split('\n').pop();
  assert.ok(last.includes('https://pyaephyowin.com'));
  assert.ok(last.includes('https://www.linkedin.com/in/pyae-phyo-win-762792246/'));
  assert.ok(last.includes('pyaephyowin.com</a> · <a'));
});

test('hashed paths', () => {
  const srcs = [...readme.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(srcs.length, ROWS.flat().length);
  for (const s of srcs) assert.match(s, /^img\/[a-z0-9-]+\.[0-9a-f]{8}\.png$/);
});

test('multi-line content stays on one line', () => {
  const c = structuredClone(content);
  c.about.text = 'First line.\n\nSecond paragraph.';
  const out = buildReadme(pieces, { ...model, content: c });
  const paper = out.match(/<p>([\s\S]*?)<\/p>/)[1];
  assert.ok(!paper.includes('\n'));
  assert.ok(altFor('about', { ...model, content: c }).includes('First line. Second paragraph.'));
});

test('rows join without whitespace', () => {
  const paper = readme.match(/<p>([\s\S]*?)<\/p>/)[1];
  assert.ok(!/>\s+</.test(paper));
  assert.equal(paper.split('<br>').length, ROWS.length);
});
