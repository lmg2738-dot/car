import { jsonSuccess } from "@/lib/api/helpers";
import { fetchKeyInfo, getFreeModelGroups } from "@/lib/openrouter/models";

export async function GET() {
  const [groups, keyInfo] = await Promise.all([
    getFreeModelGroups(),
    fetchKeyInfo().catch(() => null),
  ]);

  return jsonSuccess({
    ...groups,
    quota: keyInfo,
    tips: [
      "무료 Vision만 사용 — 유료·목업 없음",
      "한도 초과 시 UTC 자정 이후 재시도 (openrouter.ai/activity)",
      "OPENROUTER_PREFERRED_FREE_MODEL 로 우선 모델 지정 가능 (:free 필수)",
    ],
  });
}
