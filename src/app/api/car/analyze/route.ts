import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import {
  analyzeSchema,
  jsonError,
  jsonSuccess,
} from "@/lib/api/helpers";
import { analyzeVehicle } from "@/lib/openrouter/vehicle-ai";
import { isMockAnalyzeEnabled, mockAnalyzeVehicle } from "@/lib/openrouter/mock-analysis";
import {
  UPLOADS_DIR,
  applyAnalysisResult,
  getVehicle,
  updateVehicle,
} from "@/lib/storage/store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = analyzeSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const { vehicle_id } = parsed.data;
  const vehicle = getVehicle(vehicle_id);

  if (!vehicle) {
    return jsonError("Vehicle not found", 404);
  }

  if (vehicle.status === "analyzing") {
    return jsonError("이미 분석 중입니다.", 409);
  }

  const photos = vehicle.vehicle_photos ?? [];

  updateVehicle(vehicle_id, { status: "analyzing" });

  try {
    const photoPaths = photos
      .map((p) => {
        const filename = path.basename(p.storage_path);
        const filePath = path.join(UPLOADS_DIR, vehicle_id, filename);
        if (!fs.existsSync(filePath)) return null;
        return {
          filePath,
          mimeType: p.mime_type ?? "image/jpeg",
          photoId: p.id,
        };
      })
      .filter(
        (p): p is { filePath: string; mimeType: string; photoId: string } =>
          p !== null
      );

    const analysis = isMockAnalyzeEnabled()
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

    const updated = applyAnalysisResult(vehicle_id, {
      condition_summary: analysis.condition_summary,
      price_estimate_min: analysis.market_price.min,
      price_estimate_max: analysis.market_price.max,
      photo_analyses: photoUpdates,
      status: "ready",
    });

    return jsonSuccess({
      vehicle: updated,
      analysis: {
        condition_summary: analysis.condition_summary,
        market_price: analysis.market_price,
        model_used: analysis.model_used,
      },
    });
  } catch (err) {
    updateVehicle(vehicle_id, { status: "draft" });
    const message = err instanceof Error ? err.message : "Analysis failed";
    const code = (err as Error & { code?: string }).code;
    const status = code === "FREE_QUOTA_EXCEEDED" ? 429 : 500;
    return jsonError(message, status);
  }
}
