import { isTimeInRange, movieTitleMatches } from "../domain.js";

export async function checkCgv({ page, theater, dates, movieTitle, timeRange, logger = console }) {
  const baseUrl = `https://cgv.co.kr/cnm/movieBook/cinema?siteNm=${encodeURIComponent(theater.name)}&siteNo=${theater.siteNo}`;

  const schedules = [];
  for (const date of dates) {
    const url = `${baseUrl}&scnYmd=${date.compact}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    try {
      await page.locator('button[class*="dayScroll_scrollItem"]').first().waitFor({ state: "visible", timeout: 60_000 });
    } catch (error) {
      const title = await page.title().catch(() => "");
      const body = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
      throw new Error(`CGV 상영시간표 로딩 실패 (${title}): ${body.replace(/\s+/g, " ").slice(0, 300)}`, { cause: error });
    }
    const dateButtons = page.locator('button[class*="dayScroll_scrollItem"]');
    const labels = await dateButtons.allInnerTexts();
    const index = labels.findIndex(label => {
      const compact = label.replace(/\s/g, "");
      return Number(compact.match(/(\d+)$/)?.[1]) === date.day;
    });

    if (index < 0) {
      logger.debug?.(`[CGV ${theater.name}] ${date.iso} 날짜가 아직 노출되지 않았습니다.`);
      continue;
    }

    const button = dateButtons.nth(index);
    if (!(await button.isEnabled()) || (await button.getAttribute("title")) !== "선택됨") continue;

    const found = await page.evaluate(({ requestedMovie, requestedFormat, dateIso }) => {
      const normalize = value => String(value || "")
        .normalize("NFKC")
        .toLocaleLowerCase("ko-KR")
        .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
        .replace(/[^0-9a-z가-힣]/g, "");
      const requested = normalize(requestedMovie);
      const rows = [];

      for (const movieBlock of document.querySelectorAll('div[class*="accordion_container"]')) {
        const title = movieBlock.querySelector(".title2")?.textContent?.trim();
        if (!title || !normalize(title).includes(requested)) continue;

        for (const screen of movieBlock.querySelectorAll('div[class*="screenInfo_contentWrap"]')) {
          const hall = screen.querySelector("h3")?.textContent?.replace(/\s+/g, " ").trim() || "";
          if (!hall.toUpperCase().includes(requestedFormat)) continue;

          for (const timeButton of screen.querySelectorAll("button")) {
            const disabled = timeButton.disabled || timeButton.getAttribute("aria-disabled") === "true";
            if (disabled) continue;
            const start = timeButton.querySelector('[class*="screenInfo_start"]')?.textContent?.trim();
            if (!start) continue;
            rows.push({ title, hall, start, date: dateIso });
          }
        }
      }
      return rows;
    }, { requestedMovie: movieTitle, requestedFormat: theater.format, dateIso: date.iso });

    for (const item of found) {
      if (!movieTitleMatches(item.title, movieTitle) || !isTimeInRange(item.start, timeRange)) continue;
      schedules.push({
        provider: "CGV",
        theater: theater.name,
        movieTitle: item.title,
        format: theater.format,
        hall: item.hall,
        date: item.date,
        start: item.start,
        url
      });
    }
  }
  return schedules;
}
