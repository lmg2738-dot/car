import { jsonSuccess } from "@/lib/api/helpers";
import {
  createSupabaseAdmin,
  getProjectRef,
  resolveSupabaseConfig,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = resolveSupabaseConfig();

  if (!config.ok) {
    return jsonSuccess({
      ok: false,
      backend: "supabase",
      reason: config.reason,
      hint: config.message,
      ...(config.urls ? { projectRefs: config.urls } : {}),
    });
  }

  const projectRef = getProjectRef(config.url);

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("vehicles").select("id").limit(1);

    if (error) {
      const missingTable =
        error.message.includes("does not exist") ||
        error.message.includes("schema cache") ||
        error.message.includes("Could not find the table");

      const hint = error.message.includes("Invalid API key")
        ? [
            `프로젝트 ${projectRef}의 API 키가 올바르지 않습니다.`,
            "Supabase → Settings → API → service_role (secret) 키를",
            "Vercel SUPABASE_SERVICE_ROLE_KEY에 넣으세요.",
            "anon/publishable 키는 서버에서 사용할 수 없습니다.",
            "URL과 키가 같은 프로젝트 것인지 확인 후 Redeploy 하세요.",
          ].join(" ")
        : missingTable
        ? [
            `연결 프로젝트: ${projectRef} (${config.urlSource})`,
            "Table Editor에서 이 프로젝트에 public.vehicles 가 있는지 확인하세요.",
            "테이블이 있는데도 오류면 SQL Editor에서 실행: NOTIFY pgrst, 'reload schema';",
            "Vercel의 URL·SUPABASE_SERVICE_ROLE_KEY가 같은 프로젝트 것인지 확인 후 Redeploy 하세요.",
          ].join(" ")
        : error.message;

      return jsonSuccess({
        ok: false,
        backend: "supabase",
        projectRef,
        urlSource: config.urlSource,
        keySource: config.keySource,
        hint,
        error: error.message,
      });
    }

    return jsonSuccess({
      ok: true,
      backend: "supabase",
      projectRef,
      urlSource: config.urlSource,
      keySource: config.keySource,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장소 연결 실패";
    return jsonSuccess({
      ok: false,
      backend: "supabase",
      projectRef,
      urlSource: config.urlSource,
      hint: message,
      error: message,
    });
  }
}
