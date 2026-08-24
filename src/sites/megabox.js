import { isTimeInRange, movieTitleMatches } from "../domain.js";

export async function checkMegabox({ page, theater, dates, movieTitle, timeRange, logger = console }) {
  const baseUrl = `https://www.megabox.co.kr/theater/time?brchNo=${theater.branchNo}`;

  const schedules = [];
  for (const date of dates) {
    const url = `${baseUrl}&playDe=${date.compact}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.locator("p", { hasText: theater.name }).first().waitFor({ state: "visible", timeout: 45_000 });
    await page.locator("button[date-data]").first().waitFor({ state: "visible", timeout: 45_000 });
    const button = page.locator(`button[date-data="${date.dotted}"]`);
    if ((await button.count()) === 0 || !(await button.isEnabled())) {
      logger.debug?.(`[메가박스 ${theater.name}] ${date.iso} 날짜가 아직 노출되지 않았습니다.`);
      continue;
    }

    if (!(await button.getAttribute("class"))?.split(/\s+/).includes("on")) continue;

    const found = await page.evaluate(({ requestedMovie, requestedFormat, dateIso, compactDate }) => {
      const normalize = value => String(value || "")
        .normalize("NFKC")
        .toLocaleLowerCase("ko-KR")
        .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
        .replace(/[^0-9a-z가-힣]/g, "");
      const requested = normalize(requestedMovie);
      const rows = [];

      for (const movieBlock of document.querySelectorAll(".theater-list")) {
        const title = movieBlock.querySelector(".theater-tit a")?.textContent?.trim();
        if (!title || !normalize(title).includes(requested)) continue;

        for (const screen of movieBlock.querySelectorAll(".theater-type-box")) {
          const hall = screen.querySelector("p.theater-name")?.textContent?.replace(/\s+/g, " ").trim() || "";
          if (!hall.toUpperCase().includes(requestedFormat)) continue;

          for (const cell of screen.querySelectorAll("td[play-de]")) {
            if (cell.getAttribute("play-de") !== compactDate || cell.classList.contains("end")) continue;
            if (!cell.querySelector('a[title="영화예매하기"]')) continue;
            const start = cell.querySelector("p.time")?.textContent?.trim();
            if (!start) continue;
            rows.push({ title, hall, start, date: dateIso });
          }
        }
      }
      return rows;
    }, {
      requestedMovie: movieTitle,
      requestedFormat: theater.format,
      dateIso: date.iso,
      compactDate: date.compact
    });

    for (const item of found) {
      if (!movieTitleMatches(item.title, movieTitle) || !isTimeInRange(item.start, timeRange)) continue;
      schedules.push({
        provider: "메가박스",
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
