import path from "path";

/** Vercel/Lambda 등 쓰기 가능 경로가 /tmp 뿐인 환경 */
export function isServerlessEnv(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.cwd().startsWith("/var/task")
  );
}

export function getWritableDataRoot(): string {
  const custom = process.env.DATA_DIR?.trim();
  if (custom) return custom;
  if (isServerlessEnv()) return path.join("/tmp", "autodealer-data");
  return path.join(process.cwd(), "data");
}
