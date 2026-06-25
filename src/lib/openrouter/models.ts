const OPENROUTER_API = "https://openrouter.ai/api/v1";

/** OpenRouter 무료 Vision 모델 (우선 시도 순서) */
export const KNOWN_FREE_VISION_MODEL_IDS = [
  "openrouter/free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen2.5-vl-32b-instruct:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "moonshotai/kimi-vl-a3b-thinking:free",
] as const;

export type OpenRouterModel = {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
  };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
};

type ModelsCache = {
  fetchedAt: number;
  models: OpenRouterModel[];
};

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: ModelsCache | null = null;
const runtimeBlacklist = new Set<string>();

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
  }
  return key;
}

export function isFreeModel(model: OpenRouterModel): boolean {
  const prices = [
    model.pricing.prompt,
    model.pricing.completion,
    model.pricing.request,
    model.pricing.image,
  ].filter((v) => v !== undefined && v !== null);

  return prices.every((p) => parseFloat(p) === 0);
}

export function isLikelyFreeModelId(id: string): boolean {
  return id === "openrouter/free" || id.endsWith(":free");
}

export function supportsVision(model: OpenRouterModel): boolean {
  const inputModalities = model.architecture?.input_modalities ?? [];
  if (inputModalities.includes("image")) return true;

  const modality = model.architecture?.modality ?? "";
  return modality.includes("image");
}

export function blacklistModel(modelId: string, reason?: string) {
  runtimeBlacklist.add(modelId);
  if (reason) {
    console.warn(`[OpenRouter] 모델 제외: ${modelId} — ${reason}`);
  }
}

export function isModelUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("model") &&
    (msg.includes("not found") ||
      msg.includes("does not exist") ||
      msg.includes("unavailable") ||
      msg.includes("no longer") ||
      msg.includes("deprecated") ||
      msg.includes("not supported") ||
      msg.includes("404"))
  );
}

export function isFreeQuotaExceededError(error: unknown): boolean {
  if ((error as Error & { code?: string })?.code === "FREE_QUOTA_EXCEEDED") {
    return true;
  }
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes("free-models-per-day") ||
    msg.includes("free model requests per day") ||
    msg.includes("add 10 credits to unlock") ||
    msg.includes("free model rate limit") ||
    msg.includes("무료 모델 일일 한도") ||
    (msg.includes("rate limit") &&
      (msg.includes("free") || msg.includes("free-model")))
  );
}

export function isFreeQuotaMessage(text: string): boolean {
  return isFreeQuotaExceededError(new Error(text));
}

export function getFreeQuotaResetHint(): string {
  return "한도는 매일 UTC 00:00(한국 시간 오전 9시)에 초기화됩니다.";
}

export const FREE_QUOTA_EXCEEDED_MESSAGE = [
  "OpenRouter 무료 모델 일일 한도(계정 전체)를 모두 사용했습니다.",
  "다른 무료 모델로 바꿔도 오늘은 동일하게 실패합니다.",
  getFreeQuotaResetHint(),
  "남은 한도: openrouter.ai/activity",
].join(" ");

export function createFreeQuotaExceededError(): Error {
  const err = new Error(FREE_QUOTA_EXCEEDED_MESSAGE);
  (err as Error & { code?: string }).code = "FREE_QUOTA_EXCEEDED";
  return err;
}

export async function assertFreeQuotaAvailable(): Promise<void> {
  try {
    const info = await fetchKeyInfo();
    if (info.limit_remaining === 0) {
      throw createFreeQuotaExceededError();
    }
  } catch (err) {
    if (isFreeQuotaExceededError(err)) throw err;
    // 키 정보 API 실패 시 분석 시도는 계속
  }
}

export function isRetryableError(error: unknown): boolean {
  if (isFreeQuotaExceededError(error)) return false;
  if (error instanceof Error && error.name === "TimeoutError") return true;
  const status = (error as Error & { status?: number }).status;
  if (status === 429) return false;
  if (status !== undefined && status >= 500) return true;
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return msg.includes("rate limit") || msg.includes("timeout");
}

export type OpenRouterKeyInfo = {
  is_free_tier: boolean;
  limit_remaining: number | null;
  usage_daily: number;
  free_models_note: string;
};

export async function fetchKeyInfo(): Promise<OpenRouterKeyInfo> {
  const res = await fetch(`${OPENROUTER_API}/key`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`OpenRouter 키 정보 조회 실패: HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: {
      is_free_tier?: boolean;
      limit_remaining?: number | null;
      usage_daily?: number;
    };
  };

  const data = json.data ?? {};
  const isFreeTier = data.is_free_tier ?? true;

  return {
    is_free_tier: isFreeTier,
    limit_remaining: data.limit_remaining ?? null,
    usage_daily: data.usage_daily ?? 0,
    free_models_note: isFreeTier
      ? "무료 계정: :free 모델 하루 약 50회"
      : "크레딧 충전 이력 있음: :free 모델 하루 약 1,000회",
  };
}

function getPreferredModelIds(): string[] {
  const raw = process.env.OPENROUTER_PREFERRED_FREE_MODEL?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => isLikelyFreeModelId(id));
}

export function getMaxModelAttempts(): number {
  const parsed = Number.parseInt(
    process.env.OPENROUTER_MAX_MODEL_ATTEMPTS ?? "12",
    10
  );
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 20) : 12;
}

export async function getFreeModelGroups() {
  const all = await fetchAllModels();
  const free = all
    .filter(isFreeModel)
    .filter((m) => !runtimeBlacklist.has(m.id))
    .sort((a, b) => {
      const aFree = a.id.includes(":free") ? 0 : 1;
      const bFree = b.id.includes(":free") ? 0 : 1;
      if (aFree !== bFree) return aFree - bFree;
      return a.name.localeCompare(b.name);
    });

  const text = free.filter((m) => !supportsVision(m));
  const vision = free.filter((m) => supportsVision(m));

  return {
    text: text.map((m) => ({ id: m.id, name: m.name })),
    vision: vision.map((m) => ({ id: m.id, name: m.name })),
    known_free_vision: [...KNOWN_FREE_VISION_MODEL_IDS],
    active_ids: free.map((m) => m.id),
  };
}

export async function fetchAllModels(): Promise<OpenRouterModel[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.models;
  }

  const res = await fetch(`${OPENROUTER_API}/models`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`OpenRouter 모델 목록 조회 실패: HTTP ${res.status}`);
  }

  const json = (await res.json()) as { data: OpenRouterModel[] };
  cache = { fetchedAt: Date.now(), models: json.data ?? [] };
  return cache.models;
}

function stubModel(id: string): OpenRouterModel {
  return {
    id,
    name: id,
    pricing: { prompt: "0", completion: "0" },
  };
}

function tryAddModel(
  result: OpenRouterModel[],
  seen: Set<string>,
  max: number,
  candidate: OpenRouterModel,
  options?: { vision?: boolean }
): void {
  if (result.length >= max || seen.has(candidate.id)) return;
  if (runtimeBlacklist.has(candidate.id)) return;
  if (!isFreeModel(candidate) && !isLikelyFreeModelId(candidate.id)) return;
  if (options?.vision && !supportsVision(candidate) && candidate.id !== "openrouter/free") {
    return;
  }
  result.push(candidate);
  seen.add(candidate.id);
}

/** 무료 모델만 반환 (유료·목업 없음) */
export async function getFreeAnalysisModels(options?: {
  vision?: boolean;
}): Promise<OpenRouterModel[]> {
  const max = getMaxModelAttempts();
  const all = await fetchAllModels();
  const result: OpenRouterModel[] = [];
  const seen = new Set<string>();

  const preferred = getPreferredModelIds();

  for (const id of preferred) {
    const found = all.find((m) => m.id === id);
    tryAddModel(result, seen, max, found ?? stubModel(id), options);
  }

  if (options?.vision) {
    for (const id of KNOWN_FREE_VISION_MODEL_IDS) {
      if (result.length >= max) break;
      const found = all.find((m) => m.id === id);
      tryAddModel(result, seen, max, found ?? stubModel(id), options);
    }
  }

  const fromApi = all
    .filter(isFreeModel)
    .filter((m) => !runtimeBlacklist.has(m.id))
    .filter((m) => (options?.vision ? supportsVision(m) : true))
    .sort((a, b) => {
      const aKnown = a.id.includes(":free") ? 0 : 1;
      const bKnown = b.id.includes(":free") ? 0 : 1;
      if (aKnown !== bKnown) return aKnown - bKnown;
      return a.name.localeCompare(b.name);
    });

  for (const m of fromApi) {
    if (result.length >= max) break;
    tryAddModel(result, seen, max, m, options);
  }

  return result;
}

/** @deprecated getFreeAnalysisModels 사용 */
export async function getAnalysisModels(options?: {
  vision?: boolean;
}): Promise<OpenRouterModel[]> {
  return getFreeAnalysisModels(options);
}

export async function getFreeModels(options?: {
  vision?: boolean;
}): Promise<OpenRouterModel[]> {
  return getFreeAnalysisModels(options);
}

export async function getActiveFreeModelIds(options?: {
  vision?: boolean;
}): Promise<string[]> {
  const models = await getFreeAnalysisModels(options);
  return models.map((m) => m.id);
}

export function invalidateModelsCache() {
  cache = null;
}

export { getApiKey, OPENROUTER_API };
