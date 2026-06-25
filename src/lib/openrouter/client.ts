import {
  blacklistModel,
  FREE_QUOTA_EXCEEDED_MESSAGE,
  getApiKey,
  getFreeModels,
  isFreeQuotaExceededError,
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

/** 무료 모델을 순차 시도하며, 사용 불가 모델만 자동 제외 */
export async function chatWithFreeModels(
  options: ChatOptions
): Promise<ChatResult> {
  const models = await getFreeModels({ vision: options.requireVision });

  if (models.length === 0) {
    throw new Error(
      options.requireVision
        ? "사용 가능한 무료 Vision 모델이 없습니다."
        : "사용 가능한 무료 모델이 없습니다."
    );
  }

  const errors: string[] = [];

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
        const quotaErr = new Error(FREE_QUOTA_EXCEEDED_MESSAGE);
        (quotaErr as Error & { code?: string }).code = "FREE_QUOTA_EXCEEDED";
        throw quotaErr;
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
            const quotaErr = new Error(FREE_QUOTA_EXCEEDED_MESSAGE);
            (quotaErr as Error & { code?: string }).code = "FREE_QUOTA_EXCEEDED";
            throw quotaErr;
          }
          if (isModelUnavailableError(retryErr)) {
            blacklistModel(model.id, retryMsg);
          }
          continue;
        }
      }
    }
  }

  if (errors.some((e) => isFreeQuotaExceededError(new Error(e)))) {
    throw new Error(FREE_QUOTA_EXCEEDED_MESSAGE);
  }

  throw new Error(
    `모든 무료 모델 시도 실패:\n${errors.slice(0, 3).join("\n")}`
  );
}
