const OPENROUTER_API = "https://openrouter.ai/api/v1";

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

const CACHE_TTL_MS = 60 * 60 * 1000;
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

function isFreeModel(model: OpenRouterModel): boolean {
  const prices = [
    model.pricing.prompt,
    model.pricing.completion,
    model.pricing.request,
    model.pricing.image,
  ].filter((v) => v !== undefined && v !== null);

  return prices.every((p) => parseFloat(p) === 0);
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
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    msg.includes("free-models-per-day") ||
    msg.includes("free model requests per day") ||
    (msg.includes("rate limit") && msg.includes("free"))
  );
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

export const FREE_QUOTA_EXCEEDED_MESSAGE =
  "OpenRouter 무료 모델 일일 한도에 도달했습니다. openrouter.ai에서 크레딧을 충전하거나, Vercel에 OPENROUTER_VISION_MODEL(유료 Vision 모델)과 OPENROUTER_ALLOW_PAID_MODELS=true를 설정하세요.";

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
      ? "무료 계정: :free 모델 하루 약 50회 (크레딧 $10 충전 시 약 1,000회)"
      : "크레딧 충전 이력 있음: :free 모델 하루 약 1,000회",
  };
}

function getPreferredModelIds(): string[] {
  const raw = process.env.OPENROUTER_PREFERRED_FREE_MODEL?.trim();
  if (!raw) return [];
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

export function getMaxModelAttempts(): number {
  const parsed = Number.parseInt(
    process.env.OPENROUTER_MAX_MODEL_ATTEMPTS ?? "2",
    10
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
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
    active_ids: free.map((m) => m.id),
  };
}

export async function fetchAllModels(): Promise<OpenRouterModel[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.models;
  }

  const res = await fetch(`${OPENROUTER_API}/models`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`OpenRouter 모델 목록 조회 실패: HTTP ${res.status}`);
  }

  const json = (await res.json()) as { data: OpenRouterModel[] };
  cache = { fetchedAt: Date.now(), models: json.data ?? [] };
  return cache.models;
}

function getExplicitModelIds(): string[] {
  const ids = [
    ...(process.env.OPENROUTER_VISION_MODEL?.split(",") ?? []),
    ...(process.env.OPENROUTER_PREFERRED_FREE_MODEL?.split(",") ?? []),
  ];
  return ids.map((id) => id.trim()).filter(Boolean);
}

function modelCost(model: OpenRouterModel): number {
  return (
    parseFloat(model.pricing.prompt || "0") +
    parseFloat(model.pricing.completion || "0")
  );
}

async function getAffordableVisionModels(limit: number): Promise<OpenRouterModel[]> {
  const all = await fetchAllModels();
  return all
    .filter((m) => supportsVision(m))
    .filter((m) => !isFreeModel(m))
    .filter((m) => !runtimeBlacklist.has(m.id))
    .sort((a, b) => modelCost(a) - modelCost(b))
    .slice(0, limit);
}

/** 분석용 모델 목록: 지정 모델 → 무료 → (옵션) 저가 유료 Vision */
export async function getAnalysisModels(options?: {
  vision?: boolean;
}): Promise<OpenRouterModel[]> {
  const max = getMaxModelAttempts();
  const all = await fetchAllModels();
  const explicitIds = getExplicitModelIds();
  const result: OpenRouterModel[] = [];
  const seen = new Set<string>();

  for (const id of explicitIds) {
    if (seen.has(id)) continue;
    const found = all.find((m) => m.id === id);
    if (found && (!options?.vision || supportsVision(found))) {
      result.push(found);
      seen.add(id);
      continue;
    }
    if (!found) {
      result.push({
        id,
        name: id,
        pricing: { prompt: "0", completion: "0" },
      });
      seen.add(id);
    }
  }

  const free = (await getFreeModels(options)).filter((m) => !seen.has(m.id));
  for (const m of free) {
    if (result.length >= max) break;
    result.push(m);
    seen.add(m.id);
  }

  if (
    result.length < max &&
    process.env.OPENROUTER_ALLOW_PAID_MODELS === "true" &&
    options?.vision
  ) {
    const paid = await getAffordableVisionModels(max * 2);
    for (const m of paid) {
      if (result.length >= max) break;
      if (seen.has(m.id)) continue;
      result.push(m);
      seen.add(m.id);
    }
  }

  return result.slice(0, max);
}

export async function getFreeModels(options?: {
  vision?: boolean;
}): Promise<OpenRouterModel[]> {
  const all = await fetchAllModels();
  const preferred = getPreferredModelIds();

  let models = all
    .filter(isFreeModel)
    .filter((m) => !runtimeBlacklist.has(m.id))
    .filter((m) => (options?.vision ? supportsVision(m) : true))
    .sort((a, b) => {
      const aFree = a.id.includes(":free") ? 0 : 1;
      const bFree = b.id.includes(":free") ? 0 : 1;
      if (aFree !== bFree) return aFree - bFree;
      return a.name.localeCompare(b.name);
    });

  if (preferred.length > 0) {
    const picked = preferred
      .map((id) => models.find((m) => m.id === id))
      .filter((m): m is OpenRouterModel => m !== undefined);
    if (picked.length > 0) {
      models = picked;
    }
  }

  return models.slice(0, getMaxModelAttempts());
}

export async function getActiveFreeModelIds(options?: {
  vision?: boolean;
}): Promise<string[]> {
  const models = await getFreeModels(options);
  return models.map((m) => m.id);
}

export function invalidateModelsCache() {
  cache = null;
}

export { getApiKey, OPENROUTER_API };
