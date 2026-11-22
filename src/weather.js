const API = 'https://api.github.com';
const PER_PAGE = 100;
const EXCLUDED = new Set(['HTML', 'CSS', 'SCSS', 'Less', 'EJS', 'Handlebars', 'Pug', 'Stylus']);

async function getJson(fetch, url, token) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'pyae-phyo-times' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${url} failed with status ${res.status}`);
  return res.json();
}

/** Bytes per language summed over the user's public, owned, non-fork repos. */
export async function fetchLanguageBytes(login, { token, fetch = globalThis.fetch } = {}) {
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await getJson(fetch, `${API}/users/${login}/repos?type=owner&per_page=${PER_PAGE}&page=${page}`, token);
    repos.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  const totals = {};
  for (const repo of repos.filter((r) => !r.fork && !r.private)) {
    const langs = await getJson(fetch, `${API}/repos/${repo.owner.login}/${repo.name}/languages`, token);
    for (const [lang, bytes] of Object.entries(langs)) totals[lang] = (totals[lang] ?? 0) + bytes;
  }
  return totals;
}

/** Round shares to whole percents that add up to exactly 100 (largest remainder). */
function roundShares(values) {
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) { if (left-- <= 0) break; out[i] += 1; }
  return out;
}

export function summarizeLanguages(bytes) {
  const langs = Object.entries(bytes).filter(([name]) => !EXCLUDED.has(name)).sort((a, b) => b[1] - a[1]);
  const top = langs.slice(0, 2);
  const other = langs.slice(2).reduce((n, [, b]) => n + b, 0);
  const shares = roundShares([...top.map(([, b]) => b), other]);
  const result = { top: top.map(([name], i) => ({ name, pct: shares[i] })), otherPct: shares[top.length] };
  if (top.length >= 2) result.forecast = `mostly ${top[0][0]}, with spells of ${top[1][0]} and a high chance of side projects.`;
  else if (top.length === 1) result.forecast = `${top[0][0]} all week, with a high chance of side projects.`;
  else result.forecast = 'clear skies and a high chance of side projects.';
  return result;
}
