import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, readJsonBody } from "@/lib/api/helpers";
import {
  downloadDataset,
  downloadPackage,
  getDefaultDownloadDir,
} from "@/lib/aihub/aihub-shell";

const downloadSchema = z.object({
  type: z.enum(["dataset", "package"]),
  key: z.number().int().positive(),
  filekeys: z.array(z.number().int().positive()).optional(),
});

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (body === null) {
    return jsonError("잘못된 JSON 요청입니다.");
  }
  const parsed = downloadSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const { type, key, filekeys } = parsed.data;
  const outputDir = getDefaultDownloadDir();

  try {
    const result =
      type === "dataset"
        ? await downloadDataset(key, filekeys, outputDir)
        : await downloadPackage(key, filekeys, outputDir);

    return jsonSuccess(result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "다운로드 실패";
    return jsonError(message, 500);
  }
}
