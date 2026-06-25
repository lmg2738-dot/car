import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import type {
  AihubDownloadMode,
  AihubDownloadResponse,
  AihubListMode,
} from "./types";

const AIHUB_SHELL_URL = "https://api.aihub.or.kr/api/aihubshell.do";

function getApiKey(): string {
  const key = process.env.AIHUB_API_KEY;
  if (!key) {
    throw new Error(
      "AIHUB_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
  }
  return key;
}

/** Vercel/Lambda 등 쓰기 가능 경로가 /tmp 뿐인 환경 */
export function isServerlessEnv(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.cwd().startsWith("/var/task")
  );
}

function getBinDir(): string {
  const custom = process.env.AIHUB_SHELL_PATH?.trim();
  if (custom) return path.dirname(custom);

  if (isServerlessEnv()) {
    return path.join("/tmp", "aihub-bin");
  }

  return path.join(process.cwd(), "bin");
}

export function getAihubShellPath(): string {
  const custom = process.env.AIHUB_SHELL_PATH?.trim();
  if (custom) return custom;
  return path.join(getBinDir(), "aihubshell");
}

export function getDefaultDownloadDir(): string {
  const custom = process.env.AIHUB_DOWNLOAD_DIR?.trim();
  if (custom) return custom;

  if (isServerlessEnv()) {
    return path.join("/tmp", "aihub-downloads");
  }

  return path.join(process.cwd(), "data", "aihub");
}

/** 서버리스에서는 다운로드 파일이 요청 종료 후 사라짐 */
export function isEphemeralAihubStorage(): boolean {
  return isServerlessEnv() && !process.env.AIHUB_DOWNLOAD_DIR?.trim();
}

/** aihubshell 바이너리 존재 여부 */
export function isAihubshellInstalled(): boolean {
  const shellPath = getAihubShellPath();
  try {
    fs.accessSync(shellPath, fs.constants.X_OK);
    return true;
  } catch {
    return fs.existsSync(shellPath);
  }
}

let ensurePromise: Promise<string> | null = null;

/** 없으면 자동 다운로드 (Vercel /tmp 포함) */
export async function ensureAihubshell(): Promise<string> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const shellPath = getAihubShellPath();
      if (fs.existsSync(shellPath)) {
        try {
          fs.chmodSync(shellPath, 0o755);
        } catch {
          /* ignore */
        }
        return shellPath;
      }
      return downloadAihubshell();
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

/** aihubshell 다운로드 */
export async function downloadAihubshell(): Promise<string> {
  const binDir = getBinDir();
  const shellPath = path.join(binDir, "aihubshell");

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const res = await fetch(AIHUB_SHELL_URL);
  if (!res.ok) {
    throw new Error(`aihubshell 다운로드 실패: HTTP ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(shellPath, buffer, { mode: 0o755 });

  try {
    fs.chmodSync(shellPath, 0o755);
  } catch {
    /* Windows 등 */
  }

  return shellPath;
}

function buildArgs(
  mode: AihubListMode | AihubDownloadMode,
  options: {
    datasetkey?: number;
    datapckagekey?: number;
    filekey?: string;
  }
): string[] {
  const args = ["-mode", mode];

  if (options.datasetkey !== undefined) {
    args.push("-datasetkey", String(options.datasetkey));
  }
  if (options.datapckagekey !== undefined) {
    args.push("-datapckagekey", String(options.datapckagekey));
  }
  if (options.filekey) {
    args.push("-filekey", options.filekey);
  }

  args.push("-aihubapikey", getApiKey());
  return args;
}

function getBashPath(): string {
  const custom = process.env.AIHUB_BASH_PATH?.trim();
  if (custom && fs.existsSync(custom)) {
    return custom;
  }

  const candidates = [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
    "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "bash";
}

/** aihubshell 실행 */
export async function runAihubshell(
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const shellPath = await ensureAihubshell();

  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const command = isWin ? getBashPath() : shellPath;
    const spawnArgs = isWin ? [shellPath, ...args] : args;

    const proc = spawn(command, spawnArgs, {
      cwd: cwd ?? process.cwd(),
      env: { ...process.env, LANG: "ko_KR.UTF-8", LC_ALL: "ko_KR.UTF-8" },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    proc.on("error", (err) => {
      if (isWin && command === "bash") {
        reject(
          new Error(
            "Windows에서 bash를 찾을 수 없습니다. Git Bash를 설치하거나 AIHUB_BASH_PATH 환경 변수를 설정하세요."
          )
        );
      } else {
        reject(
          new Error(
            `aihubshell 실행 실패: ${err.message}. Vercel 등 서버리스에서는 조회만 지원될 수 있습니다.`
          )
        );
      }
    });
    proc.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });
  });
}

/** 데이터셋/패키지 목록 파싱: "50, 데이터명" 형식 */
export function parseListOutput(raw: string): Array<{ key: number; name: string }> {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+,\s*.+/.test(line))
    .map((line) => {
      const commaIdx = line.indexOf(",");
      const key = parseInt(line.slice(0, commaIdx).trim(), 10);
      const name = line.slice(commaIdx + 1).trim();
      return { key, name };
    });
}

/** 데이터셋 목록 조회 (-mode l) */
export async function listDatasets(datasetkey?: number) {
  const args = buildArgs("l", { datasetkey });
  const { stdout, stderr, exitCode } = await runAihubshell(args);

  if (exitCode !== 0) {
    throw new Error(stderr || stdout || "데이터셋 조회 실패");
  }

  if (datasetkey !== undefined) {
    return { items: [], raw: stdout };
  }

  return { items: parseListOutput(stdout), raw: stdout };
}

/** 데이터패키지 목록 조회 (-mode pl) */
export async function listPackages(datapckagekey?: number) {
  const args = buildArgs("pl", { datapckagekey });
  const { stdout, stderr, exitCode } = await runAihubshell(args);

  if (exitCode !== 0) {
    throw new Error(stderr || stdout || "데이터패키지 조회 실패");
  }

  if (datapckagekey !== undefined) {
    return { items: [], raw: stdout };
  }

  return { items: parseListOutput(stdout), raw: stdout };
}

/** 데이터셋 다운로드 (-mode d) */
export async function downloadDataset(
  datasetkey: number,
  filekeys?: number[],
  outputDir?: string
): Promise<AihubDownloadResponse> {
  if (isEphemeralAihubStorage()) {
    throw new Error(
      "Vercel 등 서버리스 환경에서는 대용량 다운로드를 지원하지 않습니다. Render/Docker 배포 또는 로컬에서 실행하세요."
    );
  }

  const dir = outputDir ?? getDefaultDownloadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filekey =
    filekeys && filekeys.length > 0 ? filekeys.join(",") : undefined;

  const args = buildArgs("d", { datasetkey, filekey });
  const { stdout, stderr, exitCode } = await runAihubshell(args, dir);

  if (exitCode !== 0) {
    throw new Error(stderr || stdout || "데이터셋 다운로드 실패");
  }

  return {
    success: true,
    output: stdout,
    outputDir: dir,
  };
}

/** 데이터패키지 다운로드 (-mode pd) */
export async function downloadPackage(
  datapckagekey: number,
  filekeys?: number[],
  outputDir?: string
): Promise<AihubDownloadResponse> {
  if (isEphemeralAihubStorage()) {
    throw new Error(
      "Vercel 등 서버리스 환경에서는 대용량 다운로드를 지원하지 않습니다. Render/Docker 배포 또는 로컬에서 실행하세요."
    );
  }

  const dir = outputDir ?? getDefaultDownloadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filekey =
    filekeys && filekeys.length > 0 ? filekeys.join(",") : undefined;

  const args = buildArgs("pd", { datapckagekey, filekey });
  const { stdout, stderr, exitCode } = await runAihubshell(args, dir);

  if (exitCode !== 0) {
    throw new Error(stderr || stdout || "데이터패키지 다운로드 실패");
  }

  return {
    success: true,
    output: stdout,
    outputDir: dir,
  };
}
