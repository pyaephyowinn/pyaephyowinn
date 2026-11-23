const GRAPHQL = 'https://api.github.com/graphql';
const QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!, $priorFrom: DateTime!) {
  user(login: $login) {
    year: contributionsCollection(from: $from, to: $to) {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    prior: contributionsCollection(from: $priorFrom, to: $from) {
      contributionCalendar { totalContributions }
    }
  }
}`;

const yearBefore = (d) => { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() - 1); return x; };

/** The public contribution calendar for the year up to `date`, plus the year before's total. Needs a token (GraphQL). */
export async function fetchContributions(login, { token, date = new Date(), fetch = globalThis.fetch } = {}) {
  if (!token) throw new Error('GITHUB_TOKEN is required for the contribution calendar (locally: GITHUB_TOKEN=$(gh auth token) npm run render:draft)');
  const from = yearBefore(date);
  const variables = { login, to: date.toISOString(), from: from.toISOString(), priorFrom: yearBefore(from).toISOString() };
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'pyae-phyo-times' },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL failed with status ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GitHub GraphQL: ${body.errors.map((e) => e.message).join('; ')}`);
  const user = body.data?.user;
  if (!user) throw new Error(`GitHub user ${login} not found`);
  const cal = user.year.contributionCalendar;
  return {
    total: cal.totalContributions,
    priorTotal: user.prior.contributionCalendar.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
  };
}

const MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' });
const LONG_MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long' });
const DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' });
const SHORT_DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
const utc = (iso) => new Date(`${iso}T00:00:00Z`);
export const num = (n) => n.toLocaleString('en-US');

/** Ink level 0–4 per day, split at the quartiles of the active days (like GitHub's own calendar). */
function leveller(counts) {
  const nz = counts.filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))];
  const [a, b, c] = [q(0.25), q(0.5), q(0.75)];
  return (n) => (n === 0 ? 0 : n <= a ? 1 : n <= b ? 2 : n <= c ? 3 : 4);
}

export function summarizeActivity({ total, priorTotal, weeks }) {
  const days = weeks.flat();
  const level = leveller(days.map((d) => d.count));

  let longest = 0;
  for (let run = 0, i = 0; i < days.length; i++) { run = days[i].count ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count) current++;
    else if (i === days.length - 1) continue; // today isn't over yet
    else break;
  }
  const busiest = days.reduce((best, d) => (d.count > best.count ? d : best), { date: null, count: 0 });

  // Monthly totals; the first month is cut short by the window, so it only counts if it starts on the 1st.
  const byMonth = new Map();
  for (const d of days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.count);
  let months = [...byMonth].map(([key, count]) => ({ key, label: MONTH.format(utc(`${key}-01`)), count }));
  if (days.length && !days[0].date.endsWith('-01')) months = months.slice(1);
  months = months.slice(-12).map((m, i, all) => ({ ...m, trend: i === 0 ? 0 : Math.sign(m.count - all[i - 1].count) }));

  const change = priorTotal ? Math.round(((total - priorTotal) / priorTotal) * 100) : null;
  const last = months.at(-1);
  const record = last && last.count > 0 && months.every((m) => m.count <= last.count);
  const headline = record ? `Commit Index Hits Record High in ${LONG_MONTH.format(utc(`${last.key}-01`))}`
    : change > 0 ? `Commit Index Up ${change}% on the Year`
      : change < 0 ? 'Commit Index Cools After a Busy Year'
        : 'Commit Index Holds Steady';
  const changeText = change == null ? null
    : change >= 100 ? `more than ${change >= 200 ? 'triple' : 'double'} the year before`
      : change >= 0 ? `up ${change}% on the year before` : `down ${-change}% on the year before`;

  return {
    total, priorTotal, change, changeText, headline,
    activeDays: days.filter((d) => d.count).length,
    dayCount: days.length,
    longestStreak: longest,
    currentStreak: current,
    busiest: busiest.date ? { label: DAY.format(utc(busiest.date)), short: SHORT_DAY.format(utc(busiest.date)), count: busiest.count } : null,
    months,
    weeks: weeks.map((w) => w.map((d) => ({ ...d, level: level(d.count), weekday: utc(d.date).getUTCDay() }))),
  };
}
