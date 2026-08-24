import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

function browserCandidates() {
  let bundledBrowser;
  try {
    bundledBrowser = chromium.executablePath();
  } catch {
    bundledBrowser = undefined;
  }

  return [
    process.env.BROWSER_EXECUTABLE_PATH,
    bundledBrowser,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe")
  ].filter(Boolean);
}

export function findBrowserExecutable() {
  const executable = browserCandidates().find(candidate => fs.existsSync(candidate));
  if (!executable) {
    throw new Error("실행 가능한 Chrome/Chromium/Edge를 찾지 못했습니다. 브라우저를 설치하거나 BROWSER_EXECUTABLE_PATH를 설정하세요.");
  }
  return executable;
}

export async function launchBrowser() {
  return chromium.launch({
    headless: true,
    executablePath: findBrowserExecutable()
  });
}
