import { createSupabaseAdmin } from "@/lib/supabase/server";
import type {
  ConditionSummary,
  GeneratedAd,
  PhotoAnalysis,
  Vehicle,
  VehiclePhoto,
  VehicleStatus,
} from "@/types/database";

const PHOTO_BUCKET = "vehicle-photos";

type VehicleWithRelations = Vehicle & {
  vehicle_photos: VehiclePhoto[];
  generated_ads: GeneratedAd[];
};

type VehicleRow = Vehicle & {
  vehicle_photos?: VehiclePhoto[] | null;
  generated_ads?: GeneratedAd[] | null;
};

function sortPhotos(photos: VehiclePhoto[]): VehiclePhoto[] {
  return [...photos].sort((a, b) => a.sort_order - b.sort_order);
}

function sortAds(ads: GeneratedAd[]): GeneratedAd[] {
  return [...ads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function mapVehicleRow(row: VehicleRow): VehicleWithRelations {
  return {
    ...row,
    vehicle_photos: sortPhotos(row.vehicle_photos ?? []),
    generated_ads: sortAds(row.generated_ads ?? []),
  };
}

function storagePath(vehicleId: string, filename: string): string {
  return `${vehicleId}/${filename}`;
}

export async function listVehicles() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, vehicle_photos(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as VehicleRow[]).map((row) => ({
    ...(row as Vehicle),
    vehicle_photos: sortPhotos(row.vehicle_photos ?? []),
  }));
}

export async function getVehicle(id: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, vehicle_photos(*), generated_ads(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapVehicleRow(data as VehicleRow);
}

export async function createVehicle(input: {
  brand?: string;
  model: string;
  year: number;
  mileage: number;
  color?: string;
  fuel_type?: string;
  transmission?: string;
}) {
  const now = new Date().toISOString();
  const vehicle: Vehicle = {
    id: crypto.randomUUID(),
    brand: input.brand ?? null,
    model: input.model,
    year: input.year,
    mileage: input.mileage,
    color: input.color ?? null,
    fuel_type: input.fuel_type ?? null,
    transmission: input.transmission ?? null,
    price_estimate_min: null,
    price_estimate_max: null,
    condition_summary: null,
    status: "draft",
    created_at: now,
    updated_at: now,
  };

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("vehicles").insert(vehicle);
  if (error) throw error;

  return vehicle;
}

export async function updateVehicle(
  id: string,
  patch: Partial<
    Pick<
      Vehicle,
      | "status"
      | "condition_summary"
      | "price_estimate_min"
      | "price_estimate_max"
    >
  >
) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("vehicles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  return getVehicle(id);
}

export async function deleteVehicle(id: string) {
  const supabase = createSupabaseAdmin();

  const { data: photos } = await supabase
    .from("vehicle_photos")
    .select("storage_path")
    .eq("vehicle_id", id);

  if (photos?.length) {
    const paths = photos.map((p) => p.storage_path.replace(/\\/g, "/"));
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

export async function getPhotoCount(vehicleId: string): Promise<number | null> {
  const supabase = createSupabaseAdmin();

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError) throw vehicleError;
  if (!vehicle) return null;

  const { count, error } = await supabase
    .from("vehicle_photos")
    .select("*", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId);

  if (error) throw error;
  return count ?? 0;
}

export async function addPhotoRecord(
  vehicleId: string,
  filename: string,
  mimeType: string,
  publicUrl: string
): Promise<{ photo: VehiclePhoto } | { error: "not_found" | "limit" }> {
  const count = await getPhotoCount(vehicleId);
  if (count === null) return { error: "not_found" };
  if (count >= 10) return { error: "limit" };

  const photo: VehiclePhoto = {
    id: crypto.randomUUID(),
    vehicle_id: vehicleId,
    storage_path: storagePath(vehicleId, filename),
    public_url: publicUrl,
    photo_type: "other",
    analysis_result: null,
    sort_order: count,
    created_at: new Date().toISOString(),
    mime_type: mimeType,
  };

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("vehicle_photos").insert(photo);
  if (error) throw error;

  return { photo };
}

export async function applyAnalysisResult(
  vehicleId: string,
  updates: {
    condition_summary: ConditionSummary;
    price_estimate_min: number;
    price_estimate_max: number;
    photo_analyses: Array<{ photo_id: string; analysis: PhotoAnalysis }>;
    status: VehicleStatus;
  }
) {
  const supabase = createSupabaseAdmin();

  const { error: vehicleError } = await supabase
    .from("vehicles")
    .update({
      condition_summary: updates.condition_summary,
      price_estimate_min: updates.price_estimate_min,
      price_estimate_max: updates.price_estimate_max,
      status: updates.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (vehicleError) throw vehicleError;

  for (const { photo_id, analysis } of updates.photo_analyses) {
    const { error } = await supabase
      .from("vehicle_photos")
      .update({ analysis_result: analysis })
      .eq("id", photo_id)
      .eq("vehicle_id", vehicleId);

    if (error) throw error;
  }

  return getVehicle(vehicleId);
}

export async function addGeneratedAd(
  ad: Omit<GeneratedAd, "id" | "created_at">
): Promise<GeneratedAd> {
  const record: GeneratedAd = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...ad,
  };

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("generated_ads").insert(record);
  if (error) throw error;

  return record;
}

export async function savePhotoFile(
  vehicleId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
) {
  const path = storagePath(vehicleId, filename);
  const supabase = createSupabaseAdmin();

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  return publicUrl;
}

export async function readPhotoForAnalysis(
  vehicleId: string,
  photo: VehiclePhoto
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (photo.public_url?.startsWith("http")) {
    try {
      const res = await fetch(photo.public_url, { cache: "no-store" });
      if (!res.ok) return null;
      return {
        buffer: Buffer.from(await res.arrayBuffer()),
        mimeType: photo.mime_type ?? res.headers.get("content-type") ?? "image/jpeg",
      };
    } catch {
      return null;
    }
  }

  const supabase = createSupabaseAdmin();
  const path = photo.storage_path.replace(/\\/g, "/");
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path);

  if (error || !data) return null;

  return {
    buffer: Buffer.from(await data.arrayBuffer()),
    mimeType: photo.mime_type ?? "image/jpeg",
  };
}

export type { VehicleStatus };
