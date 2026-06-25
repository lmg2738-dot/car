import { jsonSuccess } from "@/lib/api/helpers";
import {
  getStorageHint,
  isBlobStorageEnabled,
  readStoreData,
} from "@/lib/storage/persistence";
import { isServerlessEnv } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const serverless = isServerlessEnv();
  const blob = isBlobStorageEnabled();
  const hint = getStorageHint();

  try {
    await readStoreData();
    return jsonSuccess({
      ok: true,
      serverless,
      backend: blob ? "blob" : "file",
      hint,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "저장소를 사용할 수 없습니다.";
    return jsonSuccess({
      ok: false,
      serverless,
      backend: blob ? "blob" : "file",
      hint: hint ?? message,
      error: message,
    });
  }
}
