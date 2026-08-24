export function normalizeMovieTitle(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
    .replace(/[^0-9a-z가-힣]/g, "");
}

export function movieTitleMatches(actual, requested) {
  const actualNormalized = normalizeMovieTitle(actual);
  const requestedNormalized = normalizeMovieTitle(requested);
  return Boolean(requestedNormalized) && actualNormalized.includes(requestedNormalized);
}

export function timeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value));
  if (!match) throw new Error(`올바르지 않은 시간: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isTimeInRange(value, range) {
  const minutes = timeToMinutes(value);
  return minutes >= timeToMinutes(range.start) && minutes <= timeToMinutes(range.end);
}

export function scheduleKey(schedule) {
  return [
    schedule.provider,
    schedule.theater,
    schedule.date,
    normalizeMovieTitle(schedule.movieTitle),
    schedule.format,
    schedule.start
  ].join("|");
}
