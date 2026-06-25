import { NextRequest } from "next/server";
import {
  generateAdSchema,
  jsonError,
  jsonSuccess,
} from "@/lib/api/helpers";
import { generateListing } from "@/lib/openrouter/vehicle-ai";
import {
  addGeneratedAd,
  getVehicle,
} from "@/lib/storage/store";
import type { ConditionSummary, MarketPrice } from "@/types/database";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = generateAdSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const { vehicle_id, platform, style } = parsed.data;
  const vehicle = getVehicle(vehicle_id);

  if (!vehicle) {
    return jsonError("Vehicle not found", 404);
  }

  if (!vehicle.condition_summary) {
    return jsonError("차량 분석을 먼저 실행해주세요.");
  }

  const conditionSummary = vehicle.condition_summary as ConditionSummary;
  const marketPrice: MarketPrice = {
    min: vehicle.price_estimate_min ?? 0,
    max: vehicle.price_estimate_max ?? 0,
    median: Math.round(
      ((vehicle.price_estimate_min ?? 0) + (vehicle.price_estimate_max ?? 0)) / 2
    ),
    currency: "KRW",
    rationale: "AI 시세 추정 기반",
  };

  try {
    const content = await generateListing(
      vehicle,
      conditionSummary,
      marketPrice,
      platform,
      style
    );

    const ad = addGeneratedAd({
      vehicle_id,
      platform,
      style,
      title: content.title,
      description: content.description,
      ad_copy: content.ad_copy,
      faq: content.faq,
      purchase_points: content.purchase_points,
      market_price: content.market_price,
    });

    return jsonSuccess({ ...ad, model_used: content.model_used }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    const code = (err as Error & { code?: string }).code;
    const status = code === "FREE_QUOTA_EXCEEDED" ? 429 : 500;
    return jsonError(message, status);
  }
}
