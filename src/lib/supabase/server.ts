import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_STORYSUPABASE_URL?.trim()
  );
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function createSupabaseAdmin(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      "Supabase가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL(또는 NEXT_PUBLIC_STORYSUPABASE_URL)과 SUPABASE_SERVICE_ROLE_KEY를 환경 변수에 추가하세요."
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}
