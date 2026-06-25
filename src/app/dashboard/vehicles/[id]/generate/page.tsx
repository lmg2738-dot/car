import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { GenerateListingForm } from "@/components/vehicles/generate-listing-form";
import { PageHeader } from "@/components/ui/page-header";
import { getVehicle } from "@/lib/storage/store";

type PageProps = { params: Promise<{ id: string }> };

export default async function GeneratePage({ params }: PageProps) {
  const { id } = await params;
  const vehicle = getVehicle(id);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/vehicles/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        차량 상세로 돌아가기
      </Link>

      <PageHeader
        title="판매글 생성"
        description={`${vehicle.brand ? `${vehicle.brand} ` : ""}${vehicle.model} (${vehicle.year}년) — 플랫폼별 맞춤 콘텐츠`}
      />

      <GenerateListingForm
        vehicleId={id}
        isAnalyzed={!!vehicle.condition_summary}
      />
    </div>
  );
}
