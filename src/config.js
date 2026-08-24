import fs from "node:fs";
import path from "node:path";

export const CONFIG_PATH = path.resolve("monitor.config.json");

export function loadConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  validateConfig(config);
  return config;
}

export function validateConfig(config) {
  if (!Array.isArray(config.theaters) || config.theaters.length === 0) {
    throw new Error("monitor.config.json에 감시할 영화관이 없습니다.");
  }
  if (!config.timeRange?.start || !config.timeRange?.end) {
    throw new Error("timeRange.start와 timeRange.end가 필요합니다.");
  }
  if (!Number.isInteger(config.lookaheadDays) || config.lookaheadDays < 1 || config.lookaheadDays > 31) {
    throw new Error("lookaheadDays는 1~31 사이의 정수여야 합니다.");
  }
  if (!Number.isInteger(config.pollIntervalSeconds) || config.pollIntervalSeconds < 60) {
    throw new Error("사이트 부하 방지를 위해 pollIntervalSeconds는 60초 이상이어야 합니다.");
  }
}
