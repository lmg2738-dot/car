import Link from "next/link";
import { Plus, Car, Sparkles, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { listVehicles } from "@/lib/storage/store";
import type { VehicleStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const vehicles = await listVehicles();
  const readyCount = vehicles.filter((v) => v.status === "ready").length;
  const draftCount = vehicles.filter((v) => v.status === "draft").length;

  return (
    <div>
      <PageHeader
        title="대시보드"
        description="등록된 차량을 관리하고 AI가 판매 콘텐츠를 자동 생성합니다."
        action={
          <Link href="/dashboard/new">
            <Button variant="accent">
              <Plus className="h-4 w-4" />
              새 차량 등록
            </Button>
          </Link>
        }
      />

      {vehicles.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="전체 차량"
            value={vehicles.length}
            sub="등록된 차량 수"
            icon={<Car className="h-4 w-4" />}
          />
          <StatCard
            label="분석 완료"
            value={readyCount}
            sub="판매글 생성 가능"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatCard
            label="작업 중"
            value={draftCount}
            sub="사진·분석 필요"
            icon={<Sparkles className="h-4 w-4" />}
          />
        </div>
      )}

      {vehicles.length === 0 ? (
        <EmptyState
          icon={<Car className="h-9 w-9 text-muted-foreground/50" />}
          title="등록된 차량이 없습니다"
          description="차량 정보와 사진을 등록하면 AI가 판매글, 광고카피, 시세, FAQ를 자동 생성합니다."
          action={
            <Link href="/dashboard/new">
              <Button variant="accent" size="lg">
                <Sparkles className="h-4 w-4" />
                첫 차량 등록하기
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              내 차량 ({vehicles.length})
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
