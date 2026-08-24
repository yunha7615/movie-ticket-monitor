import { launchBrowser } from "./browser.js";
import { loadConfig } from "./config.js";
import { targetDates } from "./dates.js";
import { loadEnv } from "./env.js";
import { sendKakaoNotifications } from "./notifiers/kakao.js";
import { checkCgv } from "./sites/cgv.js";
import { checkMegabox } from "./sites/megabox.js";
import { loadState, markSeen, unseenSchedules } from "./state.js";

loadEnv();

const args = process.argv.slice(2);
const once = args.includes("--once");
const dryRun = args.includes("--dry-run");
const includeBrowserOnly = args.includes("--include-browser-only");
const movieArgumentIndex = args.indexOf("--movie");
const movieOverride = movieArgumentIndex >= 0 ? args[movieArgumentIndex + 1]?.trim() : "";
const theaterArgumentIndex = args.indexOf("--theater");
const theaterFilter = theaterArgumentIndex >= 0 ? args[theaterArgumentIndex + 1]?.trim() : "";

function logSchedules(label, schedules) {
  console.log(label);
  for (const item of schedules) {
    console.log(`- ${item.date} ${item.start} | ${item.provider} ${item.theater} | ${item.movieTitle} | ${item.format}`);
  }
}

async function runCycle(browser) {
  const config = loadConfig();
  const movieTitle = movieOverride || config.movieTitle.trim();
  if (!movieTitle) {
    console.log('감시 영화가 비어 있습니다. npm run set-movie -- "영화 제목" 으로 설정하세요.');
    return;
  }

  const dates = targetDates(config);
  const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const schedules = [];
  try {
    const requestedTheaters = theaterFilter
      ? config.theaters.filter(theater => theater.name.includes(theaterFilter) || theater.alias?.includes(theaterFilter))
      : config.theaters;
    const theaters = includeBrowserOnly
      ? requestedTheaters
      : requestedTheaters.filter(theater => theater.monitorMode !== "codex-browser");
    const browserOnly = includeBrowserOnly
      ? []
      : requestedTheaters.filter(theater => theater.monitorMode === "codex-browser");
    if (browserOnly.length) {
      console.log(`CGV 웹사이트 정책에 따라 Codex 인앱 브라우저 예약 작업으로 분리: ${browserOnly.map(item => item.name).join(", ")}`);
    }
    if (!theaters.length && !browserOnly.length) throw new Error(`일치하는 영화관이 없습니다: ${theaterFilter}`);

    for (const theater of theaters) {
      const page = await context.newPage();
      try {
        const common = { page, theater, dates, movieTitle, timeRange: config.timeRange };
        const found = theater.provider === "cgv"
          ? await checkCgv(common)
          : await checkMegabox(common);
        schedules.push(...found);
      } catch (error) {
        console.error(`[${theater.name}] 확인 실패: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }

  if (dryRun) {
    if (schedules.length) logSchedules("조건에 맞는 예매 가능 회차:", schedules);
    else console.log(`조건에 맞는 예매 가능 회차가 없습니다. (${movieTitle})`);
    return;
  }

  const state = loadState();
  const unseen = unseenSchedules(schedules, state);
  if (!unseen.length) {
    console.log(`[${new Date().toLocaleString("ko-KR")}] 새 예매 회차 없음 (${movieTitle})`);
    return;
  }

  await sendKakaoNotifications(unseen);
  markSeen(unseen, state);
  logSchedules("카카오톡 알림 전송 완료:", unseen);
}

const browser = await launchBrowser();
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
    console.log("\n감시를 종료합니다...");
  });
}

try {
  do {
    try {
      await runCycle(browser);
    } catch (error) {
      console.error(`감시 주기 실패: ${error.stack || error.message}`);
    }
    if (once || stopping) break;
    const { pollIntervalSeconds } = loadConfig();
    await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
  } while (!stopping);
} finally {
  await browser.close();
}
