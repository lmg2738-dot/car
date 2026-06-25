export type VehicleStatus = "draft" | "analyzing" | "ready" | "published";

export type Vehicle = {
  id: string;
  brand: string | null;
  model: string;
  year: number;
  mileage: number;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  price_estimate_min: number | null;
  price_estimate_max: number | null;
  condition_summary: ConditionSummary | null;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
};

export type ConditionSummary = {
  overall: string;
  exterior: string;
  interior: string;
  highlights: string[];
  issues: string[];
  score: number;
};

export type VehiclePhoto = {
  id: string;
  vehicle_id: string;
  storage_path: string;
  public_url: string | null;
  photo_type: "exterior" | "interior" | "detail" | "other";
  analysis_result: PhotoAnalysis | null;
  sort_order: number;
  created_at: string;
  mime_type?: string;
};


export type PhotoAnalysis = {
  condition: string;
  findings: string[];
  quality_score: number;
};

export type AdPlatform = "naver_cafe" | "encar" | "kb_chachacha" | "general";
export type AdStyle = "professional" | "friendly" | "premium" | "export";

export type GeneratedAd = {
  id: string;
  vehicle_id: string;
  platform: AdPlatform;
  style: AdStyle;
  title: string;
  description: string;
  ad_copy: string;
  faq: FaqItem[];
  purchase_points: string[];
  market_price: MarketPrice | null;
  created_at: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type MarketPrice = {
  min: number;
  max: number;
  median: number;
  currency: string;
  rationale: string;
};

export type VehicleWithPhotos = Vehicle & {
  vehicle_photos: VehiclePhoto[];
};

export type AnalysisResult = {
  condition_summary: ConditionSummary;
  market_price: MarketPrice;
  photo_analyses: Array<{
    photo_id: string;
    analysis: PhotoAnalysis;
  }>;
};

export const PLATFORM_LABELS: Record<AdPlatform, string> = {
  naver_cafe: "네이버 카페",
  encar: "엔카",
  kb_chachacha: "KB차차차",
  general: "일반",
};

export const STYLE_LABELS: Record<AdStyle, string> = {
  professional: "전문적",
  friendly: "친근한",
  premium: "프리미엄",
  export: "수출용",
};

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  draft: "초안",
  analyzing: "분석 중",
  ready: "준비 완료",
  published: "게시됨",
};
