"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/vehicles/photo-uploader";
import { AnalyzePanel } from "@/components/vehicles/analyze-panel";
import type { ConditionSummary, VehiclePhoto } from "@/types/database";

type Props = {
  vehicleId: string;
  initialPhotos: VehiclePhoto[];
  existingSummary: ConditionSummary | null;
  priceMin: number | null;
  priceMax: number | null;
};

export function VehicleWorkflowSection({
  vehicleId,
  initialPhotos,
  existingSummary,
  priceMin,
  priceMax,
}: Props) {
  const [photos, setPhotos] = useState(initialPhotos);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PhotoUploader
        vehicleId={vehicleId}
        initialPhotos={initialPhotos}
        onPhotosChange={setPhotos}
      />
      <AnalyzePanel
        vehicleId={vehicleId}
        hasPhotos={photos.length > 0}
        existingSummary={existingSummary}
        priceMin={priceMin}
        priceMax={priceMax}
      />
    </div>
  );
}
