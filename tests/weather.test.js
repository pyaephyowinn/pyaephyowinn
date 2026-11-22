import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLanguageBytes, summarizeLanguages } from '../src/weather.js';

const json = (body) => ({ ok: true, status: 200, json: async () => body });

function fakeGitHub() {
  const page1 = Array.from({ length: 100 }, (_, i) => ({ name: `r${i}`, owner: { login: 'me' }, fork: false, private: false }));
  page1[0] = { name: 'forked', owner: { login: 'me' }, fork: true, private: false };
  page1[1] = { name: 'secret', owner: { login: 'me' }, fork: false, private: true };
  const page2 = [{ name: 'last', owner: { login: 'me' }, fork: false, private: false }];
  const langs = { r2: { TypeScript: 10 }, r3: { TypeScript: 5, CSS: 3 }, last: { JavaScript: 7 }, forked: { Go: 999 }, secret: { Rust: 999 } };
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const u = new URL(url);
    if (u.pathname === '/users/me/repos') return json(u.searchParams.get('page') === '1' ? page1 : page2);
    const m = u.pathname.match(/^\/repos\/me\/([^/]+)\/languages$/);
    if (m) return json(langs[m[1]] ?? {});
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetch, calls };
}

test('sums owned public non-fork repos', async () => {
  const { fetch, calls } = fakeGitHub();
  const bytes = await fetchLanguageBytes('me', { fetch });
  assert.deepEqual(bytes, { TypeScript: 15, CSS: 3, JavaScript: 7 });
  assert.ok(!calls.some((c) => c.includes('/forked/') || c.includes('/secret/')));
});

test('fetch failure throws', async () => {
  const fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  await assert.rejects(fetchLanguageBytes('me', { fetch }), /403/);
});

test('excludes markup', () => {
  const w = summarizeLanguages({ JavaScript: 760, TypeScript: 190, CSS: 5000, HTML: 900, Python: 50 });
  assert.deepEqual(w.top.map((t) => t.name), ['JavaScript', 'TypeScript']);
  assert.equal(w.top[0].pct, 76);
  assert.equal(w.otherPct, 5);
  assert.ok(w.forecast.startsWith('mostly JavaScript, with spells of TypeScript'));
});

test('percentages sum to 100', () => {
  const w = summarizeLanguages({ A: 1, B: 1, C: 1 });
  assert.equal(w.top.reduce((n, t) => n + t.pct, 0) + w.otherPct, 100);
});

test('single and empty', () => {
  assert.equal(summarizeLanguages({ Go: 10, HTML: 99 }).forecast, 'Go all week, with a high chance of side projects.');
  const empty = summarizeLanguages({ CSS: 4 });
  assert.equal(empty.forecast, 'clear skies and a high chance of side projects.');
  assert.deepEqual(empty.top, []);
  assert.equal(empty.otherPct, 0);
});
