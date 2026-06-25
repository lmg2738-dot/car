"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Brain, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { ConditionSummary, MarketPrice } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { readJsonResponse } from "@/lib/api/client";

type Props = {
  vehicleId: string;
  hasPhotos: boolean;
  existingSummary?: ConditionSummary | null;
  priceMin?: number | null;
  priceMax?: number | null;
};

export function AnalyzePanel({
  vehicleId,
  hasPhotos,
  existingSummary,
  priceMin,
  priceMax,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    condition_summary: ConditionSummary;
    market_price: MarketPrice;
  } | null>(
    existingSummary
      ? {
          condition_summary: existingSummary,
          market_price: {
            min: priceMin ?? 0,
            max: priceMax ?? 0,
            median: Math.round(((priceMin ?? 0) + (priceMax ?? 0)) / 2),
            currency: "KRW",
            rationale: "",
          },
        }
      : null
  );

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/car/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicleId }),
      });

      const data = await readJsonResponse<{ error?: string; analysis?: typeof result }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "분석에 실패했습니다.");
      }

      setResult(data.analysis ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card variant="elevated">
      <CardHeader
        icon={<Brain className="h-5 w-5" />}
        title="AI 차량 분석"
        description="사진과 정보를 기반으로 상태 요약 및 시세를 추정합니다."
        action={
          <Button
            onClick={handleAnalyze}
            loading={loading}
            disabled={!hasPhotos}
            variant="accent"
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
            분석 실행
          </Button>
        }
      />

      {!hasPhotos && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          사진을 먼저 업로드해주세요.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
            <p className="text-sm font-medium text-white/70">종합 평가</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-display text-5xl leading-none">
                {result.condition_summary.score}
              </span>
              <span className="mb-1 text-lg text-white/70">/ 100</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              {result.condition_summary.overall}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                외관
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                {result.condition_summary.exterior}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                실내
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                {result.condition_summary.interior}
              </p>
            </div>
          </div>

          {result.condition_summary.highlights.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                장점
              </p>
              <ul className="mt-2 space-y-1">
                {result.condition_summary.highlights.map((h) => (
                  <li key={h} className="text-sm text-emerald-700/90">
                    · {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.condition_summary.issues.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertCircle className="h-4 w-4" />
                확인 사항
              </p>
              <ul className="mt-2 space-y-1">
                {result.condition_summary.issues.map((i) => (
                  <li key={i} className="text-sm text-amber-700/90">
                    · {i}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/5 to-transparent p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-gold" />
              예상 시세
            </p>
            <p className="mt-2 font-display text-2xl text-gold">
              {formatCurrency(result.market_price.min)} ~{" "}
              {formatCurrency(result.market_price.max)}
            </p>
            {result.market_price.rationale && (
              <p className="mt-2 text-sm text-muted-foreground">
                {result.market_price.rationale}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
