import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ResolvedConfig = {
  url: string;
  key: string;
  urlSource: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_STORYSUPABASE_URL";
};

type ConfigIssue = {
  ok: false;
  reason: "missing_url" | "missing_key" | "url_conflict";
  message: string;
  urls?: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_STORYSUPABASE_URL?: string;
  };
};

let adminClient: { url: string; key: string; client: SupabaseClient } | null =
  null;

export function getProjectRef(url: string): string | undefined {
  try {
    return new URL(url).hostname.split(".")[0] || undefined;
  } catch {
    return undefined;
  }
}

export function resolveSupabaseConfig():
  | ({ ok: true } & ResolvedConfig)
  | ConfigIssue {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const storyUrl = process.env.NEXT_PUBLIC_STORYSUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (supabaseUrl && storyUrl && supabaseUrl !== storyUrl) {
    return {
      ok: false,
      reason: "url_conflict",
      message:
        "NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_STORYSUPABASE_URL이 서로 다른 프로젝트를 가리킵니다. 하나만 남기고 같은 Project URL로 맞추세요.",
      urls: {
        NEXT_PUBLIC_SUPABASE_URL: getProjectRef(supabaseUrl),
        NEXT_PUBLIC_STORYSUPABASE_URL: getProjectRef(storyUrl),
      },
    };
  }

  const url = supabaseUrl || storyUrl;
  if (!url) {
    return {
      ok: false,
      reason: "missing_url",
      message:
        "NEXT_PUBLIC_SUPABASE_URL(또는 NEXT_PUBLIC_STORYSUPABASE_URL)을 설정하세요.",
    };
  }

  if (!key) {
    return {
      ok: false,
      reason: "missing_key",
      message: "SUPABASE_SERVICE_ROLE_KEY를 설정하세요.",
    };
  }

  return {
    ok: true,
    url,
    key,
    urlSource: supabaseUrl
      ? "NEXT_PUBLIC_SUPABASE_URL"
      : "NEXT_PUBLIC_STORYSUPABASE_URL",
  };
}

export function getSupabaseUrl(): string | undefined {
  const config = resolveSupabaseConfig();
  return config.ok ? config.url : undefined;
}

export function isSupabaseConfigured(): boolean {
  return resolveSupabaseConfig().ok;
}

export function createSupabaseAdmin(): SupabaseClient {
  const config = resolveSupabaseConfig();
  if (!config.ok) {
    throw new Error(config.message);
  }

  if (
    !adminClient ||
    adminClient.url !== config.url ||
    adminClient.key !== config.key
  ) {
    adminClient = {
      url: config.url,
      key: config.key,
      client: createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    };
  }

  return adminClient.client;
}
