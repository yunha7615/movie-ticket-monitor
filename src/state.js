import fs from "node:fs";
import path from "node:path";
import { scheduleKey } from "./domain.js";

const STATE_PATH = path.resolve("data", "state.json");
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { seen: {} };
  try {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    return { seen: state.seen ?? {} };
  } catch {
    return { seen: {} };
  }
}

export function unseenSchedules(schedules, state) {
  return schedules.filter(schedule => !state.seen[scheduleKey(schedule)]);
}

export function markSeen(schedules, state, now = Date.now()) {
  const threshold = now - RETENTION_MS;
  for (const [key, timestamp] of Object.entries(state.seen)) {
    if (new Date(timestamp).getTime() < threshold) delete state.seen[key];
  }
  for (const schedule of schedules) state.seen[scheduleKey(schedule)] = new Date(now).toISOString();

  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
