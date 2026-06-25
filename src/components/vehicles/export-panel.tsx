"use client";

import { useState } from "react";
import { Copy, Check, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { GeneratedAd } from "@/types/database";
import { PLATFORM_LABELS, STYLE_LABELS } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  ads: GeneratedAd[];
  vehicleName: string;
};

export function ExportPanel({ ads, vehicleName }: Props) {
  const [selectedId, setSelectedId] = useState(ads[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const selected = ads.find((a) => a.id === selectedId);

  function buildExportText(ad: GeneratedAd): string {
    const lines = [
      `# ${ad.title}`,
      "",
      `플랫폼: ${PLATFORM_LABELS[ad.platform]}`,
      `스타일: ${STYLE_LABELS[ad.style]}`,
      "",
      "## 광고 카피",
      ad.ad_copy,
      "",
      "## 판매글",
      ad.description,
      "",
      "## 구매 포인트",
      ...(ad.purchase_points as string[]).map((p) => `- ${p}`),
      "",
      "## FAQ",
      ...(ad.faq as Array<{ question: string; answer: string }>).flatMap(
        (f) => [`Q. ${f.question}`, `A. ${f.answer}`, ""]
      ),
    ];

    if (ad.market_price) {
      const mp = ad.market_price as {
        min: number;
        max: number;
        rationale?: string;
      };
      lines.push(
        "## 예상 시세",
        `${formatCurrency(mp.min)} ~ ${formatCurrency(mp.max)}`,
        mp.rationale ?? ""
      );
    }

    return lines.join("\n");
  }

  async function handleCopy() {
    if (!selected) return;
    await navigator.clipboard.writeText(buildExportText(selected));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!selected) return;
    const blob = new Blob([buildExportText(selected)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vehicleName}-${selected.platform}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (ads.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader
          icon={<Share2 className="h-5 w-5" />}
          title="콘텐츠 보내기"
          description="생성된 판매 콘텐츠가 없습니다. 먼저 판매글을 생성해주세요."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader
          icon={<Share2 className="h-5 w-5" />}
          title="콘텐츠 보내기"
          description="생성된 판매글을 복사하거나 파일로 다운로드합니다."
        />
        <div className="flex flex-wrap gap-3">
          {ads.map((ad) => (
            <button
              key={ad.id}
              onClick={() => setSelectedId(ad.id)}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                selectedId === ad.id
                  ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/10"
                  : "border-border bg-card hover:border-primary/20 hover:bg-muted/50"
              }`}
            >
              <p className="font-medium text-foreground">
                {PLATFORM_LABELS[ad.platform]}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {STYLE_LABELS[ad.style]} · {formatDate(ad.created_at)}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "복사됨" : "클립보드 복사"}
          </Button>
          <Button variant="accent" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Markdown 다운로드
          </Button>
        </div>
      </Card>

      {selected && (
        <Card variant="elevated">
          <CardHeader title="미리보기" />
          <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-5 font-mono text-sm leading-relaxed">
            {buildExportText(selected)}
          </pre>
        </Card>
      )}
    </div>
  );
}
