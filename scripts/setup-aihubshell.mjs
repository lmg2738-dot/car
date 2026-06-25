#!/usr/bin/env node
/**
 * aihubshell CLI 도구 설치 스크립트
 * 사용: node scripts/setup-aihubshell.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const binDir = path.join(root, "bin");
const shellPath = path.join(binDir, "aihubshell");
const AIHUB_SHELL_URL = "https://api.aihub.or.kr/api/aihubshell.do";

async function main() {
  console.log("AI Hub aihubshell 설치 중...");

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const res = await fetch(AIHUB_SHELL_URL);
  if (!res.ok) {
    console.error(`다운로드 실패: HTTP ${res.status}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(shellPath, buffer);

  try {
    fs.chmodSync(shellPath, 0o755);
  } catch {
    console.warn("실행 권한 설정 실패 — Linux/macOS에서 chmod +x bin/aihubshell 실행");
  }

  console.log(`설치 완료: ${shellPath}`);
  console.log("");
  console.log("다음 단계:");
  console.log("  1. .env.local에 AIHUB_API_KEY 설정");
  console.log("  2. Windows: Git Bash 또는 WSL에서 실행");
  console.log("  3. npm run dev 후 /dashboard/datasets 접속");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
