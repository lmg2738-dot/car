"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { WorkflowSteps } from "@/components/ui/workflow-steps";
import { VehicleWorkflowSection } from "@/components/vehicles/vehicle-workflow-section";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { readJsonResponse } from "@/lib/api/client";
import { StorageHealthBanner } from "@/components/storage/storage-health-banner";
import type { ConditionSummary, GeneratedAd, Vehicle, VehiclePhoto, VehicleStatus } from "@/types/database";

type VehicleDetail = Vehicle & {
  vehicle_photos: VehiclePhoto[];
  generated_ads: GeneratedAd[];
};

type Props = { vehicleId: string };

export function VehicleDetailView({ vehicleId }: Props) {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, { cache: "no-store" });
      const data = await readJsonResponse<VehicleDetail & { error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "차량을 불러오지 못했습니다.");
      }
      setVehicle(data);
    } catch (err) {
      setVehicle(null);
      setError(err instanceof Error ? err.message : "차량을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        차량 정보를 불러오는 중...
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error ?? "차량을 찾을 수 없습니다."}
        </div>
        <p className="text-sm text-muted-foreground">
          Vercel 배포 시 Storage → Blob Store 연결 후 재배포가 필요할 수 있습니다.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => void loadVehicle()}>
            다시 시도
          </Button>
          <Link href="/dashboard">
            <Button variant="accent">대시보드로</Button>
          </Link>
        </div>
      </div>
    );
  }

  const photos = vehicle.vehicle_photos ?? [];
  const conditionSummary = vehicle.condition_summary as ConditionSummary | null;
  const hasPhotos = photos.length > 0;
  const isAnalyzed = !!conditionSummary;
  const hasAds = vehicle.generated_ads.length > 0;

  return (
    <div>
      <StorageHealthBanner />
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        대시보드로 돌아가기
      </Link>

      <PageHeader
        badge={<Badge status={vehicle.status as VehicleStatus} className="mb-3" />}
        title={`${vehicle.brand ? `${vehicle.brand} ` : ""}${vehicle.model}`}
        description={[
          `${vehicle.year}년`,
          `${formatNumber(vehicle.mileage)}km`,
          vehicle.color,
          vehicle.fuel_type,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex gap-2">
            <Link href={`/dashboard/vehicles/${vehicleId}/generate`}>
              <Button variant="accent" disabled={!isAnalyzed}>
                <Sparkles className="h-4 w-4" />
                판매글 생성
              </Button>
            </Link>
            <Link href={`/dashboard/vehicles/${vehicleId}/export`}>
              <Button variant="outline" disabled={!hasAds}>
                <FileText className="h-4 w-4" />
                보내기
              </Button>
            </Link>
          </div>
        }
      />

      {vehicle.price_estimate_min && vehicle.price_estimate_max && (
        <div className="mb-8 inline-flex items-baseline gap-2 rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/5 to-transparent px-6 py-4">
          <span className="text-sm text-muted-foreground">예상 시세</span>
          <span className="font-display text-2xl text-gold">
            {formatCurrency(vehicle.price_estimate_min)} ~{" "}
            {formatCurrency(vehicle.price_estimate_max)}
          </span>
        </div>
      )}

      <WorkflowSteps
        steps={[
          { id: "1", label: "기본 정보", done: true },
          { id: "2", label: "사진 업로드", done: hasPhotos, current: !hasPhotos },
          { id: "3", label: "AI 분석", done: isAnalyzed, current: hasPhotos && !isAnalyzed },
          { id: "4", label: "판매글", done: hasAds, current: isAnalyzed && !hasAds },
        ]}
      />

      <VehicleWorkflowSection
        vehicleId={vehicleId}
        initialPhotos={photos}
        existingSummary={conditionSummary}
        priceMin={vehicle.price_estimate_min}
        priceMax={vehicle.price_estimate_max}
      />

      {hasAds && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl">생성된 콘텐츠</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {vehicle.generated_ads.map((ad) => (
              <Link
                key={ad.id}
                href={`/dashboard/vehicles/${vehicleId}/export`}
                className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:border-primary/20 hover:shadow-elevated"
              >
                <div>
                  <p className="font-medium text-foreground">{ad.title}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {ad.ad_copy}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
