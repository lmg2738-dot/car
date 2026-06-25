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
      "분석 1회 = API 호출 1~2회 (모델 1~2개만 시도하도록 OPENROUTER_MAX_MODEL_ATTEMPTS=2 권장)",
      "한도 소진 시 ANALYZE_MOCK_MODE=true 로 데모 분석 가능",
      "openrouter.ai 에서 $10 충전(1회) 시 무료 모델 일 1,000회",
    ],
  });
}
