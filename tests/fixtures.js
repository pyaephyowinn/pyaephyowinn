/** Calendar weeks (Sunday first) covering start..end with counts from fn(date, i). */
export function calendar(start, end, fn) {
  const weeks = [];
  let i = 0;
  for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1), i++) {
    if (!weeks.length || d.getUTCDay() === 0) weeks.push([]);
    const date = d.toISOString().slice(0, 10);
    weeks.at(-1).push({ date, count: fn(date, i) });
  }
  return weeks;
}
