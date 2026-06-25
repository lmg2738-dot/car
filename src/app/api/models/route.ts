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
      "실제 Vision 분석: OPENROUTER_VISION_MODEL=google/gemini-2.5-flash 권장",
      "무료 한도 초과 시 OPENROUTER_ALLOW_PAID_MODELS=true (크레딧 필요)",
      "데모 분석은 ANALYZE_MOCK_MODE=true 또는 ANALYZE_FALLBACK_MOCK=true 일 때만",
    ],
  });
}
