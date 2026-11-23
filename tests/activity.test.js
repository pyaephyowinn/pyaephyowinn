import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchContributions, summarizeActivity } from '../src/activity.js';
import { heatmap } from '../src/page.js';
import { calendar } from './fixtures.js';

test('fetch posts GraphQL with the window and the year before', async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = { url, init, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ data: { user: {
      year: { contributionCalendar: { totalContributions: 3, weeks: [{ contributionDays: [{ date: '2026-11-22', contributionCount: 3 }] }] } },
      prior: { contributionCalendar: { totalContributions: 1 } },
    } } }) };
  };
  const out = await fetchContributions('me', { token: 't', date: new Date('2026-11-23T00:00:00Z'), fetch });
  assert.equal(sent.url, 'https://api.github.com/graphql');
  assert.equal(sent.init.headers.Authorization, 'Bearer t');
  assert.deepEqual(sent.body.variables, { login: 'me', to: '2026-11-23T00:00:00.000Z', from: '2025-11-23T00:00:00.000Z', priorFrom: '2024-11-23T00:00:00.000Z' });
  assert.deepEqual(out, { total: 3, priorTotal: 1, weeks: [[{ date: '2026-11-22', count: 3 }]] });
});

test('fetch needs a token and surfaces errors', async () => {
  await assert.rejects(fetchContributions('me', { fetch: async () => assert.fail() }), /GITHUB_TOKEN/);
  await assert.rejects(fetchContributions('me', { token: 't', fetch: async () => ({ ok: false, status: 401 }) }), /401/);
  await assert.rejects(fetchContributions('me', { token: 't', fetch: async () => ({ ok: true, json: async () => ({ errors: [{ message: 'boom' }] }) }) }), /boom/);
  await assert.rejects(fetchContributions('me', { token: 't', fetch: async () => ({ ok: true, json: async () => ({ data: { user: null } }) }) }), /not found/);
});

test('streaks, busiest day and active days', () => {
  // 10 active days, a gap, 4 active days, then today with nothing yet.
  const counts = [...Array(10).fill(1), 0, 2, 9, 2, 2, 0];
  const weeks = calendar('2026-11-08', '2026-11-23', (_, i) => counts[i]);
  const a = summarizeActivity({ total: 23, priorTotal: 10, weeks });
  assert.equal(a.longestStreak, 10);
  assert.equal(a.currentStreak, 4);
  assert.equal(a.activeDays, 14);
  assert.equal(a.dayCount, 16);
  assert.deepEqual(a.busiest, { label: 'November 20', short: 'Nov 20', count: 9 });
  assert.equal(a.change, 130);
  assert.equal(a.changeText, 'more than double the year before');
  assert.deepEqual(a.weeks.flat().map((d) => d.level).slice(10, 13), [0, 3, 4]);
});

test('months drop the partial first month and keep twelve', () => {
  const weeks = calendar('2025-11-23', '2026-11-23', (date) => (date.startsWith('2026-11') ? 50 : 1));
  const a = summarizeActivity({ total: 0, priorTotal: 0, weeks });
  assert.equal(a.months.length, 12);
  assert.deepEqual([a.months[0].label, a.months.at(-1).label], ['Dec', 'Nov']);
  assert.equal(a.months.at(-1).trend, 1);
  assert.equal(a.headline, 'Commit Index Hits Record High in November');
  assert.equal(a.change, null);
});

test('headline follows the year when no record', () => {
  const weeks = calendar('2025-11-23', '2026-11-23', (date) => (date.startsWith('2026-03') ? 9 : 1));
  assert.equal(summarizeActivity({ total: 120, priorTotal: 100, weeks }).headline, 'Commit Index Up 20% on the Year');
  assert.equal(summarizeActivity({ total: 80, priorTotal: 100, weeks }).changeText, 'down 20% on the year before');
});

test('heatmap draws a square per day under month labels', () => {
  const weeks = summarizeActivity({ total: 0, priorTotal: 0, weeks: calendar('2025-11-23', '2026-11-23', () => 1) }).weeks;
  const svg = heatmap(weeks);
  assert.equal(svg.split('<rect').length - 1, weeks.flat().length);
  const labels = [...svg.matchAll(/>([A-Z]{3})<\/text>/g)].map((m) => m[1]);
  assert.deepEqual(labels, ['DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV']);
});
