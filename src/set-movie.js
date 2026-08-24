import fs from "node:fs";
import { CONFIG_PATH, loadConfig } from "./config.js";

const movieTitle = process.argv.slice(2).join(" ").trim();
if (!movieTitle) {
  console.error('사용법: npm run set-movie -- "영화 제목"');
  process.exit(1);
}

const config = loadConfig();
config.movieTitle = movieTitle;
fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`감시 영화를 "${movieTitle}"(으)로 변경했습니다.`);
