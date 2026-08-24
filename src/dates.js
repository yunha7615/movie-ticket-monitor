const SEOUL_TIME_ZONE = "Asia/Seoul";

function seoulDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

export function targetDates({ lookaheadDays, weekdays }, now = new Date()) {
  const today = seoulDateParts(now);
  const start = Date.UTC(today.year, today.month - 1, today.day);
  const results = [];

  for (let offset = 0; offset <= lookaheadDays; offset += 1) {
    const current = new Date(start + offset * 86_400_000);
    if (!weekdays.includes(current.getUTCDay())) continue;
    const year = current.getUTCFullYear();
    const month = current.getUTCMonth() + 1;
    const day = current.getUTCDate();
    results.push({
      year,
      month,
      day,
      weekday: current.getUTCDay(),
      iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      compact: `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
      dotted: `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`
    });
  }
  return results;
}
