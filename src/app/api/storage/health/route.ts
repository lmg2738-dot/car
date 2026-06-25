import { jsonSuccess } from "@/lib/api/helpers";
import {
  createSupabaseAdmin,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return jsonSuccess({
      ok: false,
      backend: "supabase",
      hint: "NEXT_PUBLIC_SUPABASE_URL(또는 NEXT_PUBLIC_STORYSUPABASE_URL)과 SUPABASE_SERVICE_ROLE_KEY를 설정하세요.",
    });
  }

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("vehicles").select("id").limit(1);

    if (error) {
      const hint = error.message.includes("does not exist")
        ? "Supabase SQL Editor에서 테이블 생성 쿼리를 실행하세요. (supabase/schema.sql 참고)"
        : error.message;

      return jsonSuccess({
        ok: false,
        backend: "supabase",
        hint,
        error: error.message,
      });
    }

    return jsonSuccess({ ok: true, backend: "supabase" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장소 연결 실패";
    return jsonSuccess({
      ok: false,
      backend: "supabase",
      hint: message,
      error: message,
    });
  }
}
