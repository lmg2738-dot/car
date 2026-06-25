import {
  blacklistModel,
  createFreeQuotaExceededError,
  getFreeAnalysisModels,
  getApiKey,
  invalidateModelsCache,
  isFreeQuotaExceededError,
  isFreeQuotaMessage,
  isModelUnavailableError,
  isRetryableError,
  OPENROUTER_API,
} from "./models";

export type ChatMessage =
  | { role: "system" | "assistant"; content: string }
  | { role: "user"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

type ChatOptions = {
  messages: ChatMessage[];
  requireVision?: boolean;
  jsonMode?: boolean;
  maxTokens?: number;
};

type ChatResult = {
  content: string;
  model: string;
};

const REQUEST_TIMEOUT_MS = 90_000;

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    "http://localhost:50006"
  );
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

async function callModel(
  modelId: string,
  options: ChatOptions
): Promise<string> {
  const body: Record<string, unknown> = {
    model: modelId,
    messages: options.messages,
    max_tokens: options.maxTokens ?? 4096,
  };

  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${OPENROUTER_API}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": getAppUrl(),
      "X-Title": "AutoDealer Copilot",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const json = (await res.json()) as {
    error?: { message?: string; code?: number };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    const msg = json.error?.message ?? `HTTP ${res.status}`;
    const err = new Error(`모델 ${modelId}: ${msg}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`모델 ${modelId}: 빈 응답`);
  }

  return content;
}

async function tryFreeModels(
  models: Array<{ id: string }>,
  options: ChatOptions
): Promise<ChatResult | null> {
  const errors: string[] = [];
  let quotaHits = 0;

  for (const model of models) {
    try {
      let content = await callModel(model.id, options);

      if (options.jsonMode) {
        content = extractJson(content);
        JSON.parse(content);
      }

      return { content, model: model.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);

      if (isFreeQuotaExceededError(err)) {
        blacklistModel(model.id, "무료 한도");
        quotaHits += 1;
        // 계정 전체 일일 한도 — 추가 모델 시도 불필요
        if (quotaHits >= 1) {
          throw createFreeQuotaExceededError();
        }
        continue;
      }

      if (isModelUnavailableError(err)) {
        blacklistModel(model.id, message);
        continue;
      }

      if (isRetryableError(err)) {
        continue;
      }

      if (
        message.includes("response_format") ||
        message.includes("json_object")
      ) {
        try {
          let content = await callModel(model.id, {
            ...options,
            jsonMode: false,
          });
          content = extractJson(content);
          JSON.parse(content);
          return { content, model: model.id };
        } catch (retryErr) {
          const retryMsg =
            retryErr instanceof Error ? retryErr.message : String(retryErr);
          errors.push(retryMsg);
          if (isFreeQuotaExceededError(retryErr)) {
            blacklistModel(model.id, "무료 한도");
            throw createFreeQuotaExceededError();
          }
          if (isModelUnavailableError(retryErr)) {
            blacklistModel(model.id, retryMsg);
          }
          continue;
        }
      }
    }
  }

  if (
    errors.length > 0 &&
    errors.every((e) => isFreeQuotaMessage(e))
  ) {
    throw createFreeQuotaExceededError();
  }

  if (errors.length > 0) {
    throw new Error(
      `무료 모델 시도 실패. 잠시 후 다시 시도하세요.\n${errors.slice(0, 2).join("\n")}`
    );
  }

  return null;
}

/** 무료 모델만 순차 시도 */
export async function chatWithModels(
  options: ChatOptions
): Promise<ChatResult> {
  const models = await getFreeAnalysisModels({
    vision: options.requireVision,
  });

  if (models.length === 0) {
    throw new Error(
      options.requireVision
        ? "사용 가능한 무료 Vision 모델이 없습니다. /api/models 에서 목록을 확인하세요."
        : "사용 가능한 무료 모델이 없습니다."
    );
  }

  try {
    const result = await tryFreeModels(models, options);
    if (result) return result;
  } catch (err) {
    if (isFreeQuotaExceededError(err)) throw err;
  }

  invalidateModelsCache();
  const retryModels = await getFreeAnalysisModels({
    vision: options.requireVision,
  });
  const result = await tryFreeModels(retryModels, options);
  if (result) return result;

  throw createFreeQuotaExceededError();
}

/** @deprecated chatWithModels 사용 */
export async function chatWithFreeModels(
  options: ChatOptions
): Promise<ChatResult> {
  return chatWithModels(options);
}
