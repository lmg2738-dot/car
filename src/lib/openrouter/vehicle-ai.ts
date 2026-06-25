import fs from "fs";
import { chatWithFreeModels, type ChatMessage } from "./client";
import type {
  AdPlatform,
  AdStyle,
  ConditionSummary,
  FaqItem,
  MarketPrice,
  PhotoAnalysis,
  Vehicle,
} from "@/types/database";
import { PLATFORM_LABELS, STYLE_LABELS } from "@/types/database";

const ANALYSIS_SCHEMA = `{
  "condition_summary": {
    "overall": "string",
    "exterior": "string",
    "interior": "string",
    "highlights": ["string"],
    "issues": ["string"],
    "score": number
  },
  "market_price": {
    "min": number,
    "max": number,
    "median": number,
    "currency": "KRW",
    "rationale": "string"
  },
  "photo_analyses": [
    {
      "photo_index": number,
      "analysis": {
        "condition": "string",
        "findings": ["string"],
        "quality_score": number
      }
    }
  ]
}`;

function buildVehicleInfo(
  vehicle: Pick<
    Vehicle,
    "brand" | "model" | "year" | "mileage" | "color" | "fuel_type" | "transmission"
  >
) {
  return [
    vehicle.brand && `브랜드: ${vehicle.brand}`,
    `모델: ${vehicle.model}`,
    `연식: ${vehicle.year}년`,
    `주행거리: ${vehicle.mileage.toLocaleString()}km`,
    vehicle.color && `색상: ${vehicle.color}`,
    vehicle.fuel_type && `연료: ${vehicle.fuel_type}`,
    vehicle.transmission && `변속기: ${vehicle.transmission}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const MAX_VISION_IMAGES = 5;

function selectPhotosForVision<T>(photos: T[]): T[] {
  if (photos.length <= MAX_VISION_IMAGES) return photos;
  const step = photos.length / MAX_VISION_IMAGES;
  return Array.from({ length: MAX_VISION_IMAGES }, (_, i) =>
    photos[Math.min(Math.floor(i * step), photos.length - 1)]
  );
}

function toDataUrl(filePath: string, mimeType: string): string {
  const buffer = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function analyzeVehicle(
  vehicle: Pick<
    Vehicle,
    "brand" | "model" | "year" | "mileage" | "color" | "fuel_type" | "transmission"
  >,
  photoPaths: Array<{ filePath: string; mimeType: string }>
) {
  const vehicleInfo = buildVehicleInfo(vehicle);
  const selected = selectPhotosForVision(
    photoPaths.map((p, index) => ({ ...p, originalIndex: index }))
  );

  const imageParts = selected.map((p) => ({
    type: "image_url" as const,
    image_url: { url: toDataUrl(p.filePath, p.mimeType) },
  }));

  const userMessage: ChatMessage =
    photoPaths.length > 0
      ? {
          role: "user",
          content: [
            {
              type: "text",
              text: `다음 차량을 분석해주세요:\n${vehicleInfo}`,
            },
            ...imageParts,
          ],
        }
      : {
          role: "user",
          content: `다음 차량을 분석해주세요 (사진 없음, 텍스트 정보만):\n${vehicleInfo}`,
        };

  const { content, model } = await chatWithFreeModels({
    requireVision: photoPaths.length > 0,
    jsonMode: true,
    messages: [
      {
        role: "system",
        content: `당신은 한국 중고차 시장 전문가입니다. 차량 사진과 정보를 분석하여 상태 요약, 시세 추정, 사진별 분석을 제공합니다.
반드시 유효한 JSON만 반환하세요. 스키마: ${ANALYSIS_SCHEMA}
한국어로 작성하고, 시세는 원(KRW) 단위로 추정하세요.`,
      },
      userMessage,
    ],
  });

  const parsed = JSON.parse(content) as {
    condition_summary: ConditionSummary;
    market_price: MarketPrice;
    photo_analyses: Array<{ photo_index: number; analysis: PhotoAnalysis }>;
  };

  const photo_analyses = parsed.photo_analyses.map((pa) => ({
    photo_index: selected[pa.photo_index]?.originalIndex ?? pa.photo_index,
    analysis: pa.analysis,
  }));

  return { ...parsed, photo_analyses, model_used: model };
}

export type GeneratedListingContent = {
  title: string;
  description: string;
  ad_copy: string;
  faq: FaqItem[];
  purchase_points: string[];
  market_price: MarketPrice;
  model_used: string;
};

export async function generateListing(
  vehicle: Vehicle,
  conditionSummary: ConditionSummary,
  marketPrice: MarketPrice,
  platform: AdPlatform,
  style: AdStyle
): Promise<GeneratedListingContent> {
  const { content, model } = await chatWithFreeModels({
    jsonMode: true,
    messages: [
      {
        role: "system",
        content: `당신은 한국 중고차 판매 전문 카피라이터입니다.
플랫폼과 스타일에 맞는 판매글, 광고카피, FAQ, 구매포인트를 생성합니다.
반드시 유효한 JSON만 반환하세요.`,
      },
      {
        role: "user",
        content: `차량 정보:
- ${vehicle.brand ?? ""} ${vehicle.model} (${vehicle.year}년)
- 주행거리: ${vehicle.mileage.toLocaleString()}km
- 상태: ${JSON.stringify(conditionSummary)}
- 시세: ${JSON.stringify(marketPrice)}

플랫폼: ${PLATFORM_LABELS[platform]}
스타일: ${STYLE_LABELS[style]}

다음 JSON 형식으로 반환:
{
  "title": "매력적인 제목",
  "description": "상세 판매글",
  "ad_copy": "짧은 광고 카피",
  "faq": [{"question": "...", "answer": "..."}],
  "purchase_points": ["구매포인트1"],
  "market_price": ${JSON.stringify(marketPrice)}
}`,
      },
    ],
  });

  return { ...(JSON.parse(content) as Omit<GeneratedListingContent, "model_used">), model_used: model };
}
