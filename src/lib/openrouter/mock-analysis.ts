import type {
  ConditionSummary,
  MarketPrice,
  PhotoAnalysis,
  Vehicle,
} from "@/types/database";

/** API 한도 없이 로컬 데모용 분석 (사진 내용은 반영하지 않음) */
export function mockAnalyzeVehicle(
  vehicle: Pick<
    Vehicle,
    "brand" | "model" | "year" | "mileage" | "color" | "fuel_type" | "transmission"
  >,
  photoCount: number
) {
  const age = new Date().getFullYear() - vehicle.year;
  const kmFactor = Math.max(0.7, 1 - vehicle.mileage / 200_000);
  const ageFactor = Math.max(0.6, 1 - age * 0.06);
  const base = 25_000_000 * kmFactor * ageFactor;
  const min = Math.round(base * 0.9 / 100_000) * 100_000;
  const max = Math.round(base * 1.1 / 100_000) * 100_000;
  const median = Math.round((min + max) / 2 / 100_000) * 100_000;

  const score = Math.min(92, Math.max(72, Math.round(80 + kmFactor * 8 - age * 2)));

  const condition_summary: ConditionSummary = {
    overall: `${vehicle.year}년식 ${vehicle.model}으로, 주행거리 ${vehicle.mileage.toLocaleString()}km 기준 양호한 컨디션으로 추정됩니다. (데모 분석)`,
    exterior: "외관은 전반적으로 관리 상태가 양호한 편으로 보입니다. 세부 상태는 실차 확인이 필요합니다.",
    interior: "실내 마모는 연식·주행거리 대비 보통 수준으로 추정됩니다.",
    highlights: [
      `${vehicle.year}년식 ${vehicle.brand ?? ""} ${vehicle.model}`.trim(),
      `주행거리 ${vehicle.mileage.toLocaleString()}km`,
      photoCount > 0 ? `업로드 사진 ${photoCount}장 기준 텍스트 추정` : "사진 미반영 데모",
    ],
    issues: [
      "데모 모드: 실제 AI Vision 분석이 아닙니다.",
      "정확한 판단을 위해 OpenRouter 한도 복구 후 재분석하세요.",
    ],
    score,
  };

  const market_price: MarketPrice = {
    min,
    max,
    median,
    currency: "KRW",
    rationale: `${vehicle.year}년식·주행거리 기반 간이 시세 추정 (데모)`,
  };

  const photo_analyses = Array.from({ length: Math.min(photoCount, 3) }, (_, i) => ({
    photo_index: i,
    analysis: {
      condition: "데모",
      findings: ["데모 모드에서는 사진 픽셀 분석을 수행하지 않습니다."],
      quality_score: score,
    } satisfies PhotoAnalysis,
  }));

  return {
    condition_summary,
    market_price,
    photo_analyses,
    model_used: "mock/local-demo",
  };
}

export function isMockAnalyzeEnabled(): boolean {
  return process.env.ANALYZE_MOCK_MODE === "true";
}

/** OpenRouter 실패 시 데모 분석으로 대체 (기본: 비활성, true일 때만) */
export function isAnalyzeFallbackMockEnabled(): boolean {
  return process.env.ANALYZE_FALLBACK_MOCK === "true";
}
