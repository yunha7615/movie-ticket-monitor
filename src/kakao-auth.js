import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { loadEnv } from "./env.js";
import { requestToken, TOKEN_PATH } from "./notifiers/kakao.js";

loadEnv();

const clientId = process.env.KAKAO_REST_API_KEY;
const clientSecret = process.env.KAKAO_CLIENT_SECRET;
const redirectUri = process.env.KAKAO_REDIRECT_URI || "http://localhost:8787/callback";
if (!clientId) throw new Error(".env에 KAKAO_REST_API_KEY를 설정하세요.");

const callback = new URL(redirectUri);
if (callback.hostname !== "localhost" && callback.hostname !== "127.0.0.1") {
  throw new Error("개인용 초기 인증은 localhost 리다이렉트 URI만 지원합니다.");
}

const state = crypto.randomBytes(24).toString("hex");
const authorize = new URL("https://kauth.kakao.com/oauth/authorize");
authorize.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: "talk_message",
  state
}).toString();

console.log("아래 주소를 브라우저에서 열고 카카오 로그인을 완료하세요.\n");
console.log(authorize.toString());
console.log("\n인증 완료를 기다리는 중입니다...");

const server = http.createServer(async (request, response) => {
  try {
    const incoming = new URL(request.url, redirectUri);
    if (incoming.pathname !== callback.pathname) {
      response.writeHead(404).end("Not found");
      return;
    }
    if (incoming.searchParams.get("state") !== state) throw new Error("OAuth state가 일치하지 않습니다.");
    const code = incoming.searchParams.get("code");
    if (!code) throw new Error(incoming.searchParams.get("error_description") || "인가 코드가 없습니다.");

    const params = {
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code
    };
    if (clientSecret) params.client_secret = clientSecret;
    const token = await requestToken(params);
    token.expires_at = new Date(Date.now() + token.expires_in * 1000).toISOString();
    if (token.refresh_token_expires_in) {
      token.refresh_token_expires_at = new Date(Date.now() + token.refresh_token_expires_in * 1000).toISOString();
    }
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    fs.writeFileSync(TOKEN_PATH, `${JSON.stringify(token, null, 2)}\n`, "utf8");

    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("카카오톡 알림 연결이 완료되었습니다. 이 창을 닫아도 됩니다.");
    console.log(`\n연결 완료: ${TOKEN_PATH}`);
    server.close();
  } catch (error) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`인증 실패: ${error.message}`);
    console.error(error);
    server.close(() => process.exitCode = 1);
  }
});

server.listen(Number(callback.port || 80), callback.hostname);
setTimeout(() => server.close(() => {
  console.error("인증 대기 시간이 만료되었습니다. 다시 실행하세요.");
  process.exitCode = 1;
}), 5 * 60 * 1000).unref();
