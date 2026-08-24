import test from "node:test";
import assert from "node:assert/strict";
import { isTimeInRange, movieTitleMatches, normalizeMovieTitle } from "../src/domain.js";

test("영화 제목의 괄호와 구두점을 무시한다", () => {
  assert.equal(normalizeMovieTitle("오디세이(IMAX 2D)"), "오디세이");
  assert.equal(movieTitleMatches("[1만원 특가] 오디세이(IMAX 2D)", "오디세이"), true);
});

test("11:00~18:00 경계를 포함한다", () => {
  const range = { start: "11:00", end: "18:00" };
  assert.equal(isTimeInRange("10:59", range), false);
  assert.equal(isTimeInRange("11:00", range), true);
  assert.equal(isTimeInRange("18:00", range), true);
  assert.equal(isTimeInRange("18:01", range), false);
});
