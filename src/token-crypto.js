import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TOKEN_PATH } from "./notifiers/kakao.js";

const ENCRYPTED_PATH = path.resolve("data", "kakao-token.enc");
const MAGIC = Buffer.from("KAKAO1");

function password() {
  const value = process.env.TOKEN_ENCRYPTION_PASSWORD;
  if (!value || value.length < 16) {
    throw new Error("TOKEN_ENCRYPTION_PASSWORD는 16자 이상이어야 합니다.");
  }
  return value;
}

function encrypt() {
  if (!fs.existsSync(TOKEN_PATH)) throw new Error("암호화할 카카오 토큰이 없습니다.");
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password(), salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(fs.readFileSync(TOKEN_PATH)), cipher.final()]);
  const tag = cipher.getAuthTag();

  fs.mkdirSync(path.dirname(ENCRYPTED_PATH), { recursive: true });
  fs.writeFileSync(ENCRYPTED_PATH, Buffer.concat([MAGIC, salt, iv, tag, ciphertext]));
  console.log(`카카오 토큰 암호화 완료: ${ENCRYPTED_PATH}`);
}

function decrypt() {
  if (!fs.existsSync(ENCRYPTED_PATH)) throw new Error("암호화된 카카오 토큰이 없습니다.");
  const payload = fs.readFileSync(ENCRYPTED_PATH);
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("암호화된 토큰 형식이 올바르지 않습니다.");

  let offset = MAGIC.length;
  const salt = payload.subarray(offset, offset += 16);
  const iv = payload.subarray(offset, offset += 12);
  const tag = payload.subarray(offset, offset += 16);
  const ciphertext = payload.subarray(offset);
  const key = crypto.scryptSync(password(), salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, plaintext);
  console.log(`카카오 토큰 복호화 완료: ${TOKEN_PATH}`);
}

const command = process.argv[2];
if (command === "encrypt") encrypt();
else if (command === "decrypt") decrypt();
else throw new Error("encrypt 또는 decrypt를 지정하세요.");
