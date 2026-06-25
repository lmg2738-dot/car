"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField, Select } from "@/components/ui/input";
import {
  PLATFORM_LABELS,
  STYLE_LABELS,
  type AdPlatform,
  type AdStyle,
  type GeneratedAd,
} from "@/types/database";
import { readJsonResponse } from "@/lib/api/client";

type Props = {
  vehicleId: string;
  isAnalyzed: boolean;
};

export function GenerateListingForm({ vehicleId, isAnalyzed }: Props) {
  const router = useRouter();
  const [platform, setPlatform] = useState<AdPlatform>("naver_cafe");
  const [style, setStyle] = useState<AdStyle>("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedAd | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/car/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicleId, platform, style }),
      });

      const data = await readJsonResponse<GeneratedAd & { error?: string }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "생성에 실패했습니다.");
      }

      setGenerated(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader
          icon={<PenLine className="h-5 w-5" />}
          title="판매 콘텐츠 생성"
          description="플랫폼과 스타일을 선택하여 AI가 맞춤 판매글을 생성합니다."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="플랫폼">
            <Select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as AdPlatform)}
            >
              {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="스타일">
            <Select
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value as AdStyle)}
            >
              {Object.entries(STYLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {!isAnalyzed && (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            차량 분석을 먼저 완료해주세요.
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-border pt-5">
          <Button
            onClick={handleGenerate}
            loading={loading}
            disabled={!isAnalyzed}
            variant="accent"
          >
            <Wand2 className="h-4 w-4" />
            판매글 생성
          </Button>
        </div>
      </Card>

      {generated && (
        <Card variant="elevated">
          <CardHeader title={generated.title} />
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                광고 카피
              </p>
              <p className="mt-2 rounded-xl bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground">
                {generated.ad_copy}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                판매글
              </p>
              <div className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-5 text-sm leading-relaxed">
                {generated.description}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                구매 포인트
              </p>
              <ul className="mt-2 space-y-1.5">
                {(generated.purchase_points as string[]).map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-sm text-foreground/80"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                FAQ
              </p>
              <div className="mt-2 space-y-3">
                {(generated.faq as Array<{ question: string; answer: string }>).map(
                  (item) => (
                    <div
                      key={item.question}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <p className="text-sm font-medium text-foreground">
                        Q. {item.question}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        A. {item.answer}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
