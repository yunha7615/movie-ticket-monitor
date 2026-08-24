import fs from "node:fs";
import path from "node:path";

const TOKEN_PATH = path.resolve("data", "kakao-token.json");
const TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const SEND_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send";

function readToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error("카카오 토큰이 없습니다. 먼저 npm run kakao:login 을 실행하세요.");
  }
  return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
}

function writeToken(token) {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, `${JSON.stringify(token, null, 2)}\n`, "utf8");
}

async function requestToken(parameters) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(parameters)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`카카오 토큰 요청 실패 (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

export async function refreshKakaoToken(force = false) {
  const token = readToken();
  const expiresAt = new Date(token.expires_at ?? 0).getTime();
  if (!force && expiresAt > Date.now() + 5 * 60 * 1000) return token.access_token;

  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) throw new Error(".env에 KAKAO_REST_API_KEY를 설정하세요.");
  const params = {
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: token.refresh_token
  };
  if (process.env.KAKAO_CLIENT_SECRET) params.client_secret = process.env.KAKAO_CLIENT_SECRET;

  const refreshed = await requestToken(params);
  const merged = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token ?? token.refresh_token,
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  };
  if (refreshed.refresh_token_expires_in) {
    merged.refresh_token_expires_at = new Date(Date.now() + refreshed.refresh_token_expires_in * 1000).toISOString();
  }
  writeToken(merged);
  return merged.access_token;
}

function notificationText(items) {
  const first = items[0];
  const times = items.map(item => item.start).sort().join(", ");
  const label = `[예매 오픈] ${first.movieTitle}\n${first.provider} ${first.theater} · ${first.format}\n${first.date} ${times}`;
  return label.length <= 200 ? label : `${label.slice(0, 197)}...`;
}

async function sendWithToken(items, accessToken) {
  const template = {
    object_type: "text",
    text: notificationText(items),
    link: {
      web_url: items[0].url,
      mobile_web_url: items[0].url
    },
    button_title: "예매 페이지 열기"
  };
  const response = await fetch(SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    },
    body: new URLSearchParams({ template_object: JSON.stringify(template) })
  });
  const payload = await response.json();
  if (!response.ok || payload.result_code !== 0) {
    const error = new Error(`카카오 메시지 전송 실패 (${response.status}): ${JSON.stringify(payload)}`);
    error.status = response.status;
    throw error;
  }
}

export async function sendKakaoNotifications(schedules) {
  const groups = new Map();
  for (const item of schedules) {
    const key = `${item.provider}|${item.theater}|${item.date}|${item.movieTitle}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const items of groups.values()) {
    let accessToken = await refreshKakaoToken();
    try {
      await sendWithToken(items, accessToken);
    } catch (error) {
      if (error.status !== 401) throw error;
      accessToken = await refreshKakaoToken(true);
      await sendWithToken(items, accessToken);
    }
  }
}

export { requestToken, TOKEN_PATH };
