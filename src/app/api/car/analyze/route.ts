import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import {
  analyzeSchema,
  jsonError,
  jsonSuccess,
  readJsonBody,
  withApiRoute,
} from "@/lib/api/helpers";
import { analyzeVehicle } from "@/lib/openrouter/vehicle-ai";
import {
  isAnalyzeFallbackMockEnabled,
  isMockAnalyzeEnabled,
  mockAnalyzeVehicle,
} from "@/lib/openrouter/mock-analysis";
import {
  applyAnalysisResult,
  getVehicle,
  readPhotoForAnalysis,
  updateVehicle,
} from "@/lib/storage/store";
import type { VehiclePhoto } from "@/types/database";

export const maxDuration = 120;
export const runtime = "nodejs";

type VehicleWithRelations = NonNullable<Awaited<ReturnType<typeof getVehicle>>>;

async function buildPhotoPaths(
  vehicle_id: string,
  photos: VehiclePhoto[]
) {
  const photoPaths: Array<{
    filePath: string;
    mimeType: string;
    photoId: string;
  }> = [];

  for (const photo of photos) {
    const data = await readPhotoForAnalysis(vehicle_id, photo);
    if (!data) continue;

    const ext = data.mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const tmpPath = path.join(os.tmpdir(), `${photo.id}.${ext}`);
    fs.writeFileSync(tmpPath, data.buffer);
    photoPaths.push({
      filePath: tmpPath,
      mimeType: data.mimeType,
      photoId: photo.id,
    });
  }

  return photoPaths;
}

async function runAnalyze(
  vehicle_id: string,
  vehicle: VehicleWithRelations,
  photoPaths: Array<{ filePath: string; mimeType: string; photoId: string }>,
  photos: VehiclePhoto[],
  options?: { forceMock?: boolean }
) {
  const useMock = options?.forceMock || isMockAnalyzeEnabled();
  const analysis = useMock
    ? mockAnalyzeVehicle(vehicle, photos.length)
    : await analyzeVehicle(
        vehicle,
        photoPaths.map(({ filePath, mimeType }) => ({ filePath, mimeType }))
      );

  const photoUpdates = analysis.photo_analyses
    .map((pa) => {
      const photo = photos[pa.photo_index];
      if (!photo) return null;
      return { photo_id: photo.id, analysis: pa.analysis };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  const updated = await applyAnalysisResult(vehicle_id, {
    condition_summary: analysis.condition_summary,
    price_estimate_min: analysis.market_price.min,
    price_estimate_max: analysis.market_price.max,
    photo_analyses: photoUpdates,
    status: "ready",
  });

  return {
    vehicle: updated,
    analysis: {
      condition_summary: analysis.condition_summary,
      market_price: analysis.market_price,
      model_used: analysis.model_used,
    },
  };
}

export const POST = withApiRoute(async (request: NextRequest) => {
  const body = await readJsonBody(request);
  if (body === null) {
    return jsonError("잘못된 JSON 요청입니다.");
  }
  const parsed = analyzeSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const { vehicle_id } = parsed.data;
  const vehicle = await getVehicle(vehicle_id);

  if (!vehicle) {
    return jsonError("Vehicle not found", 404);
  }

  if (vehicle.status === "analyzing") {
    return jsonError("이미 분석 중입니다.", 409);
  }

  const photos = vehicle.vehicle_photos ?? [];

  await updateVehicle(vehicle_id, { status: "analyzing" });

  const photoPaths = await buildPhotoPaths(vehicle_id, photos);

  try {
    const result = await runAnalyze(vehicle_id, vehicle, photoPaths, photos);
    return jsonSuccess(result);
  } catch (err) {
    await updateVehicle(vehicle_id, { status: "draft" });
    const message = err instanceof Error ? err.message : "Analysis failed";
    const code = (err as Error & { code?: string }).code;

    if (
      !isMockAnalyzeEnabled() &&
      isAnalyzeFallbackMockEnabled() &&
      code !== "FREE_QUOTA_EXCEEDED"
    ) {
      try {
        await updateVehicle(vehicle_id, { status: "analyzing" });
        const fallback = await runAnalyze(
          vehicle_id,
          vehicle,
          photoPaths,
          photos,
          { forceMock: true }
        );
        return jsonSuccess({
          ...fallback,
          warning:
            "OpenRouter 연결에 실패해 데모 분석 결과를 반환했습니다. 실제 AI 분석은 한도 복구 후 다시 시도하세요.",
          mock_fallback: true,
          original_error: message,
        });
      } catch (fallbackErr) {
        await updateVehicle(vehicle_id, { status: "draft" });
        console.error("[analyze] fallback failed", fallbackErr);
      }
    }

    const status = code === "FREE_QUOTA_EXCEEDED" ? 429 : 500;
    return jsonError(message, status);
  }
});
