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

      const hint = missingTable
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
        hint,
        error: error.message,
      });
    }

    return jsonSuccess({
      ok: true,
      backend: "supabase",
      projectRef,
      urlSource: config.urlSource,
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
