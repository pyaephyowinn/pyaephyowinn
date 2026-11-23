import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchContributions, summarizeActivity } from '../src/activity.js';
import { calendar } from './fixtures.js';

const ok = (data) => ({ ok: true, json: async () => ({ data }) });

test('fetch reads the year, the year before and every year so far', async () => {
  const sent = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push({ url, init, body });
    if (sent.length === 1) {
      return ok({ user: {
        year: { contributionYears: [2027, 2026, 2025], contributionCalendar: { totalContributions: 3, weeks: [{ contributionDays: [{ date: '2026-11-22', contributionCount: 3 }] }] } },
        prior: { contributionCalendar: { totalContributions: 1 } },
      } });
    }
    return ok({ user: { y2025: { contributionCalendar: { totalContributions: 10 } }, y2026: { contributionCalendar: { totalContributions: 5 } } } });
  };
  const out = await fetchContributions('me', { token: 't', date: new Date('2026-11-23T00:00:00Z'), fetch });
  assert.equal(sent[0].url, 'https://api.github.com/graphql');
  assert.equal(sent[0].init.headers.Authorization, 'Bearer t');
  assert.deepEqual(sent[0].body.variables, { login: 'me', to: '2026-11-23T00:00:00.000Z', from: '2025-11-23T00:00:00.000Z', priorFrom: '2024-11-23T00:00:00.000Z' });
  assert.match(sent[1].body.query, /y2025: contributionsCollection\(from: "2025-01-01T00:00:00Z", to: "2025-12-31T23:59:59.000Z"\)/);
  assert.match(sent[1].body.query, /y2026: contributionsCollection\(from: "2026-01-01T00:00:00Z", to: "2026-11-23T00:00:00.000Z"\)/);
  assert.ok(!sent[1].body.query.includes('y2027'));
  assert.deepEqual(out, { total: 3, priorTotal: 1, allTime: 15, days: [{ date: '2026-11-22', count: 3 }] });
});

test('fetch needs a token and surfaces errors', async () => {
  await assert.rejects(fetchContributions('me', { fetch: async () => assert.fail() }), /GITHUB_TOKEN/);
  await assert.rejects(fetchContributions('me', { token: 't', fetch: async () => ({ ok: false, status: 401 }) }), /401/);
  await assert.rejects(fetchContributions('me', { token: 't', fetch: async () => ({ ok: true, json: async () => ({ errors: [{ message: 'boom' }] }) }) }), /boom/);
  await assert.rejects(fetchContributions('me', { token: 't', fetch: async () => ok({ user: null }) }), /not found/);
});

test('streaks and active days', () => {
  // 10 active days, a gap, 4 active days, then today with nothing yet.
  const counts = [...Array(10).fill(1), 0, 2, 9, 2, 2, 0];
  const a = summarizeActivity({ total: 23, priorTotal: 10, allTime: 99, days: calendar('2026-11-08', '2026-11-23', (_, i) => counts[i]) });
  assert.equal(a.longestStreak, 10);
  assert.equal(a.currentStreak, 4);
  assert.equal(a.activeDays, 14);
  assert.equal(a.dayCount, 16);
  assert.equal(a.allTime, 99);
  assert.equal(a.change, 130);
});

test('best month skips the partial first month', () => {
  const days = calendar('2025-11-23', '2026-11-23', (date) => (date.startsWith('2025-11') ? 999 : date.startsWith('2026-11') ? 50 : 1));
  const a = summarizeActivity({ total: 0, priorTotal: 0, allTime: 0, days });
  assert.deepEqual(a.bestMonth, { label: 'Nov', long: 'November', count: 50 * 23 });
  assert.equal(a.headline, 'Commit Index Hits Record High in November');
  assert.equal(a.change, null);
});

test('headline follows the year when no record', () => {
  const days = calendar('2025-11-23', '2026-11-23', (date) => (date.startsWith('2026-03') ? 9 : 1));
  assert.equal(summarizeActivity({ total: 120, priorTotal: 100, allTime: 0, days }).headline, 'Commit Index Up 20% on the Year');
  assert.equal(summarizeActivity({ total: 80, priorTotal: 100, allTime: 0, days }).headline, 'Commit Index Cools After a Busy Year');
});
