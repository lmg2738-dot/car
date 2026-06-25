import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ExportPanel } from "@/components/vehicles/export-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getVehicle } from "@/lib/storage/store";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function ExportPage({ params }: PageProps) {
  const { id } = await params;
  const vehicle = await getVehicle(id);

  if (!vehicle) {
    notFound();
  }

  const vehicleName = `${vehicle.brand ?? ""}-${vehicle.model}-${vehicle.year}`
    .replace(/\s+/g, "-")
    .toLowerCase();

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
        title="콘텐츠 보내기"
        description="생성된 판매글을 복사하거나 Markdown 파일로 다운로드합니다."
      />

      <ExportPanel ads={vehicle.generated_ads} vehicleName={vehicleName} />
    </div>
  );
}
