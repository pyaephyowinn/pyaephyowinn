/** One entry per day from start to end, with counts from fn(date, i). */
export function calendar(start, end, fn) {
  const days = [];
  for (let d = new Date(`${start}T00:00:00Z`), i = 0; d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1), i++) {
    const date = d.toISOString().slice(0, 10);
    days.push({ date, count: fn(date, i) });
  }
  return days;
}
