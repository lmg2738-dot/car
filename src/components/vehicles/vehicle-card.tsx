import Link from "next/link";
import { Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, formatNumber } from "@/lib/utils";
import type { Vehicle, VehiclePhoto, VehicleStatus } from "@/types/database";

type VehicleWithPhotos = Vehicle & { vehicle_photos: VehiclePhoto[] };

export function VehicleCard({ vehicle }: { vehicle: VehicleWithPhotos }) {
  const thumb = vehicle.vehicle_photos?.[0]?.public_url;

  return (
    <Link href={`/dashboard/vehicles/${vehicle.id}`} className="group block">
      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-elevated">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={`${vehicle.model}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/30">
              <Car className="h-10 w-10 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">사진 없음</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute right-3 top-3">
            <Badge status={vehicle.status as VehicleStatus} />
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-display text-lg text-foreground transition-colors group-hover:text-primary">
            {vehicle.brand ? `${vehicle.brand} ` : ""}
            {vehicle.model}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicle.year}년 · {formatNumber(vehicle.mileage)}km
          </p>
          {vehicle.price_estimate_min && vehicle.price_estimate_max && (
            <p className="mt-2 text-sm font-semibold text-gold">
              {formatCurrency(vehicle.price_estimate_min)} ~{" "}
              {formatCurrency(vehicle.price_estimate_max)}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground/70">
            {formatDate(vehicle.created_at)}
          </p>
        </div>
      </article>
    </Link>
  );
}
