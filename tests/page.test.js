import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadContent } from '../src/content.js';
import { editionInfo } from '../src/edition.js';
import { ROWS } from '../src/layout.js';
import { renderPage } from '../src/page.js';
import { fetchAvatarDataUri } from '../src/avatar.js';
import { summarizeActivity } from '../src/activity.js';
import { calendar } from './fixtures.js';

const model = (edit = () => {}) => {
  const content = loadContent('content.yml', { draft: true });
  edit(content);
  return {
    content,
    edition: editionInfo(new Date('2026-11-23T00:00:00Z'), content.startYear),
    weather: { top: [{ name: 'JavaScript', pct: 76 }, { name: 'TypeScript', pct: 19 }], otherPct: 5, forecast: 'mostly JavaScript, with spells of TypeScript and a high chance of side projects.' },
    activity: summarizeActivity({ total: 5190, priorTotal: 2556, allTime: 8760, days: calendar('2025-11-23', '2026-11-23', (_, i) => i % 3) }),
    avatar: 'data:image/png;base64,AAAA',
  };
};

test('every piece is present', () => {
  const html = renderPage(model(), { draft: true });
  for (const { id } of ROWS.flat()) {
    assert.equal(html.split(`data-piece="${id}"`).length - 1, 1, id);
  }
});

test('escapes content', () => {
  const html = renderPage(model((c) => { c.about.text = 'A < B & "C" ⭐'; }), { draft: true });
  assert.ok(html.includes('A &lt; B &amp; &quot;C&quot; ⭐'));
  assert.ok(!html.includes('<B'));
});

test('inline markup', () => {
  const html = renderPage(model((c) => { c.classifieds.text = '**WANTED:** *x* _site_'; }), { draft: true });
  assert.ok(html.includes('<b>WANTED:</b> <i>x</i> <u>site</u>'));
});

test('business url label', () => {
  const html = renderPage(model(), { draft: true });
  const piece = html.slice(html.indexOf('data-piece="biz-mmtrails"'));
  assert.ok(piece.slice(0, 600).includes('mmtrails.com →'));
});

test('draft highlights placeholders', () => {
  const html = renderPage(model((c) => {
    c.about.text = 'TODO: bio';
    c.about.role = 'Engineer, TODO: title';
    c.classifieds.text = 'TODO: ad';
  }), { draft: true });
  const hits = html.split('TODO:').length - 1;
  assert.ok(hits >= 3);
  assert.equal(html.split('<span class="draft">TODO:').length - 1, hits);
});

test('commit index shows the year', () => {
  const html = renderPage(model(), { draft: true });
  const piece = html.slice(html.indexOf('data-piece="activity"'), html.indexOf('data-piece="projects-bar"'));
  assert.ok(piece.includes('5,190'));
  assert.ok(!piece.includes('on the year before'));
  assert.ok(piece.includes('8,760'));
  assert.ok(!piece.includes('<svg'));
});

test('masthead shows edition', () => {
  const html = renderPage(model(), { draft: true });
  assert.ok(html.includes('Vol. IV · No. 48'));
  assert.ok(html.includes('Monday, November 23, 2026'));
});

test('avatar falls back', async () => {
  const expected = 'data:image/png;base64,' + readFileSync('assets/avatar-fallback.png').toString('base64');
  assert.equal(await fetchAvatarDataUri('https://example.invalid/a.png', 'assets/avatar-fallback.png', { fetch: async () => { throw new Error('offline'); } }), expected);
  assert.equal(await fetchAvatarDataUri('https://example.invalid/a.png', 'assets/avatar-fallback.png', { fetch: async () => ({ ok: false, status: 500 }) }), expected);
});
