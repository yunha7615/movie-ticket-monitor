import { loadEnv } from "./env.js";
import { sendKakaoNotifications } from "./notifiers/kakao.js";
import { loadState, markSeen, unseenSchedules } from "./state.js";

loadEnv();

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : "";
}

const schedule = {
  provider: argument("provider"),
  theater: argument("theater"),
  movieTitle: argument("movie"),
  format: argument("format"),
  hall: argument("hall") || argument("format"),
  date: argument("date"),
  start: argument("start"),
  url: argument("url")
};

const missing = Object.entries(schedule).filter(([, value]) => !value).map(([key]) => key);
if (missing.length) throw new Error(`알림 인자가 부족합니다: ${missing.join(", ")}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(schedule.date) || !/^\d{2}:\d{2}$/.test(schedule.start)) {
  throw new Error("date는 YYYY-MM-DD, start는 HH:MM 형식이어야 합니다.");
}

const state = loadState();
const unseen = unseenSchedules([schedule], state);
if (!unseen.length) {
  console.log("이미 보낸 회차라 알림을 생략했습니다.");
} else {
  await sendKakaoNotifications(unseen);
  markSeen(unseen, state);
  console.log("카카오톡 알림을 전송했습니다.");
}
