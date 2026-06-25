import { VehicleDetailView } from "@/components/vehicles/vehicle-detail-view";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <VehicleDetailView vehicleId={id} />;
}
