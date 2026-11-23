const GRAPHQL = 'https://api.github.com/graphql';
const YEAR_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!, $priorFrom: DateTime!) {
  user(login: $login) {
    year: contributionsCollection(from: $from, to: $to) {
      contributionYears
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    prior: contributionsCollection(from: $priorFrom, to: $from) {
      contributionCalendar { totalContributions }
    }
  }
}`;

const yearBefore = (d) => { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() - 1); return x; };

async function graphql(fetch, token, query, variables) {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'pyae-phyo-times' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL failed with status ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GitHub GraphQL: ${body.errors.map((e) => e.message).join('; ')}`);
  if (!body.data?.user) throw new Error(`GitHub user ${variables.login} not found`);
  return body.data.user;
}

/** Totals for each calendar year up to `date` (GitHub only answers one year per collection). */
async function fetchAllTime(fetch, token, login, years, date) {
  const upTo = years.filter((y) => y <= date.getUTCFullYear());
  if (!upTo.length) return 0;
  const end = (y) => new Date(Math.min(Date.UTC(y + 1, 0, 1) - 1000, date.getTime())).toISOString();
  const fields = upTo.map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${end(y)}") { contributionCalendar { totalContributions } }`);
  const user = await graphql(fetch, token, `query($login: String!) { user(login: $login) { ${fields.join(' ')} } }`, { login });
  return upTo.reduce((n, y) => n + user[`y${y}`].contributionCalendar.totalContributions, 0);
}

/** The public contribution calendar for the year up to `date`, the year before's total, and the all-time total. Needs a token (GraphQL). */
export async function fetchContributions(login, { token, date = new Date(), fetch = globalThis.fetch } = {}) {
  if (!token) throw new Error('GITHUB_TOKEN is required for the contribution calendar (locally: GITHUB_TOKEN=$(gh auth token) npm run render:draft)');
  const from = yearBefore(date);
  const user = await graphql(fetch, token, YEAR_QUERY, { login, to: date.toISOString(), from: from.toISOString(), priorFrom: yearBefore(from).toISOString() });
  const cal = user.year.contributionCalendar;
  return {
    total: cal.totalContributions,
    priorTotal: user.prior.contributionCalendar.totalContributions,
    allTime: await fetchAllTime(fetch, token, login, user.year.contributionYears, date),
    days: cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
  };
}

const MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' });
const LONG_MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long' });
const monthOf = (key, fmt = MONTH) => fmt.format(new Date(`${key}-01T00:00:00Z`));
export const num = (n) => n.toLocaleString('en-US');

export function summarizeActivity({ total, priorTotal, allTime, days }) {
  let longest = 0;
  for (let run = 0, i = 0; i < days.length; i++) { run = days[i].count ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count) current++;
    else if (i === days.length - 1) continue; // today isn't over yet
    else break;
  }

  // Monthly totals; the first month is cut short by the window, so it only counts if it starts on the 1st.
  const byMonth = new Map();
  for (const d of days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.count);
  let months = [...byMonth].map(([key, count]) => ({ key, count }));
  if (days.length && !days[0].date.endsWith('-01')) months = months.slice(1);
  months = months.slice(-12);
  const best = months.reduce((b, m) => (m.count > (b?.count ?? 0) ? m : b), null);
  const last = months.at(-1);

  const change = priorTotal ? Math.round(((total - priorTotal) / priorTotal) * 100) : null;
  const headline = best && best === last ? `Commit Index Hits Record High in ${monthOf(last.key, LONG_MONTH)}`
    : change > 0 ? `Commit Index Up ${change}% on the Year`
      : change < 0 ? 'Commit Index Cools After a Busy Year'
        : 'Commit Index Holds Steady';

  return {
    total, allTime, change, headline,
    activeDays: days.filter((d) => d.count).length,
    dayCount: days.length,
    longestStreak: longest,
    currentStreak: current,
    bestMonth: best ? { label: monthOf(best.key), long: monthOf(best.key, LONG_MONTH), count: best.count } : null,
  };
}
