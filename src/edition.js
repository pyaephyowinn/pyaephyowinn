const NUMERALS = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

export function toRoman(n) {
  let out = '';
  for (const [value, sym] of NUMERALS) while (n >= value) { out += sym; n -= value; }
  return out;
}

/** ISO-8601 week number of a date, in UTC. */
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Thursday of this week decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

const LABEL = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export function editionInfo(date, startYear) {
  return {
    volume: toRoman(Math.max(1, date.getUTCFullYear() - startYear)),
    issue: isoWeek(date),
    dateLabel: LABEL.format(date),
  };
}
