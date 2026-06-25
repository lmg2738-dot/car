"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Upload, ImageIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { VehiclePhoto } from "@/types/database";

type Props = {
  vehicleId: string;
  initialPhotos: VehiclePhoto[];
  onPhotosChange?: (photos: VehiclePhoto[]) => void;
};

export function PhotoUploader({
  vehicleId,
  initialPhotos,
  onPhotosChange,
}: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    onPhotosChange?.(photos);
  }, [photos, onPhotosChange]);

  const uploadFiles = useCallback(
    async (files: FileList) => {
      setUploading(true);
      setError(null);

      const remaining = 10 - photos.length;
      const toUpload = Array.from(files).slice(0, remaining);

      if (toUpload.length === 0) {
        setUploading(false);
        return;
      }

      try {
        const results = await Promise.all(
          toUpload.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
              method: "POST",
              body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error ?? "업로드 실패");
            }
            return data as VehiclePhoto;
          })
        );

        setPhotos((prev) => [...prev, ...results]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드 실패");
      } finally {
        setUploading(false);
      }
    },
    [vehicleId, photos.length]
  );

  return (
    <Card variant="elevated">
      <CardHeader
        icon={<ImageIcon className="h-5 w-5" />}
        title="차량 사진"
        description={`최대 10장 · 현재 ${photos.length}장`}
      />

      <div
        className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-200 ${
          dragOver
            ? "border-gold bg-gold/5"
            : "border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) {
            uploadFiles(e.dataTransfer.files);
          }
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={uploading || photos.length >= 10}
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          사진을 드래그하거나 클릭하여 업로드
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          JPEG, PNG, WebP · 최대 10MB · {10 - photos.length}장 남음
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {photos.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border shadow-sm"
            >
              {photo.public_url && (
                <Image
                  src={photo.public_url}
                  alt={`차량 사진 ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="200px"
                />
              )}
              <div className="absolute left-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          업로드 중...
        </div>
      )}
    </Card>
  );
}
