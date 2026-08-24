import test from "node:test";
import assert from "node:assert/strict";
import { targetDates } from "../src/dates.js";

test("서울 시간 기준 토요일과 일요일만 생성한다", () => {
  const dates = targetDates(
    { lookaheadDays: 7, weekdays: [0, 6] },
    new Date("2026-08-24T00:00:00+09:00")
  );
  assert.deepEqual(dates.map(item => item.iso), ["2026-08-29", "2026-08-30"]);
});
