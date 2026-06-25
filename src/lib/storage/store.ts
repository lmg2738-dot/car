import fs from "fs";
import path from "path";
import type {
  ConditionSummary,
  GeneratedAd,
  PhotoAnalysis,
  Vehicle,
  VehiclePhoto,
  VehicleStatus,
} from "@/types/database";
import {
  defaultStore,
  getUploadsRoot,
  readPhotoBuffer,
  readStoreData,
  savePhotoBytes,
  isBlobStorageEnabled,
  writeStoreData,
} from "./persistence";

export const UPLOADS_DIR = getUploadsRoot();

type StoreData = {
  vehicles: Vehicle[];
  vehicle_photos: VehiclePhoto[];
  generated_ads: GeneratedAd[];
};

let storeCache: StoreData | null = null;

async function loadStore(): Promise<StoreData> {
  if (isBlobStorageEnabled()) {
    return readStoreData();
  }
  if (storeCache) return storeCache;
  storeCache = await readStoreData();
  return storeCache;
}

async function persistStore(store: StoreData) {
  await writeStoreData(store);
  if (!isBlobStorageEnabled()) {
    storeCache = store;
  }
}

async function mutateStore(
  mutator: (store: StoreData) => void
): Promise<StoreData> {
  const store = await loadStore();
  mutator(store);
  await persistStore(store);
  return store;
}

function groupPhotosByVehicle(store: StoreData) {
  const map = new Map<string, VehiclePhoto[]>();
  for (const photo of store.vehicle_photos) {
    const list = map.get(photo.vehicle_id) ?? [];
    list.push(photo);
    map.set(photo.vehicle_id, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }
  return map;
}

function attachVehicleRelations(
  store: StoreData,
  vehicle: Vehicle
): Vehicle & { vehicle_photos: VehiclePhoto[]; generated_ads: GeneratedAd[] } {
  const photoMap = groupPhotosByVehicle(store);
  return {
    ...vehicle,
    vehicle_photos: photoMap.get(vehicle.id) ?? [],
    generated_ads: store.generated_ads
      .filter((a) => a.vehicle_id === vehicle.id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
  };
}

export function getPhotoPublicUrl(vehicleId: string, filename: string) {
  return `/api/uploads/${vehicleId}/${filename}`;
}

export function getUploadsDir(vehicleId: string) {
  const dir = path.join(getUploadsRoot(), vehicleId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function listVehicles() {
  const store = await loadStore();
  const photoMap = groupPhotosByVehicle(store);

  return [...store.vehicles]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((vehicle) => ({
      ...vehicle,
      vehicle_photos: photoMap.get(vehicle.id) ?? [],
    }));
}

export async function getVehicle(id: string) {
  const store = await loadStore();
  const vehicle = store.vehicles.find((v) => v.id === id);
  if (!vehicle) return null;
  return attachVehicleRelations(store, vehicle);
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

  await mutateStore((store) => {
    store.vehicles.push(vehicle);
  });

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
  const store = await mutateStore((s) => {
    const index = s.vehicles.findIndex((v) => v.id === id);
    if (index === -1) return;

    s.vehicles[index] = {
      ...s.vehicles[index],
      ...patch,
      updated_at: new Date().toISOString(),
    };
  });

  const vehicle = store.vehicles.find((v) => v.id === id);
  if (!vehicle) return null;
  return attachVehicleRelations(store, vehicle);
}

export async function deleteVehicle(id: string) {
  await mutateStore((store) => {
    store.vehicles = store.vehicles.filter((v) => v.id !== id);
    store.vehicle_photos = store.vehicle_photos.filter(
      (p) => p.vehicle_id !== id
    );
    store.generated_ads = store.generated_ads.filter(
      (a) => a.vehicle_id !== id
    );
  });

  const uploadDir = path.join(getUploadsRoot(), id);
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
}

export async function getPhotoCount(vehicleId: string): Promise<number | null> {
  const store = await loadStore();
  if (!store.vehicles.some((v) => v.id === vehicleId)) return null;
  return store.vehicle_photos.filter((p) => p.vehicle_id === vehicleId).length;
}

export async function addPhotoRecord(
  vehicleId: string,
  filename: string,
  mimeType: string,
  publicUrl: string
): Promise<{ photo: VehiclePhoto } | { error: "not_found" | "limit" }> {
  let photo: VehiclePhoto | null = null;

  await mutateStore((store) => {
    const vehicle = store.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const count = store.vehicle_photos.filter(
      (p) => p.vehicle_id === vehicleId
    ).length;
    if (count >= 10) return;

    photo = {
      id: crypto.randomUUID(),
      vehicle_id: vehicleId,
      storage_path: path.join(vehicleId, filename),
      public_url: publicUrl,
      photo_type: "other",
      analysis_result: null,
      sort_order: count,
      created_at: new Date().toISOString(),
      mime_type: mimeType,
    };
    store.vehicle_photos.push(photo);
  });

  if (!photo) {
    const store = await loadStore();
    if (!store.vehicles.some((v) => v.id === vehicleId)) {
      return { error: "not_found" };
    }
    return { error: "limit" };
  }

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
  const store = await mutateStore((s) => {
    const index = s.vehicles.findIndex((v) => v.id === vehicleId);
    if (index === -1) return;

    s.vehicles[index] = {
      ...s.vehicles[index],
      condition_summary: updates.condition_summary,
      price_estimate_min: updates.price_estimate_min,
      price_estimate_max: updates.price_estimate_max,
      status: updates.status,
      updated_at: new Date().toISOString(),
    };

    for (const { photo_id, analysis } of updates.photo_analyses) {
      const photo = s.vehicle_photos.find((p) => p.id === photo_id);
      if (photo) photo.analysis_result = analysis;
    }
  });

  const vehicle = store.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return null;
  return attachVehicleRelations(store, vehicle);
}

export async function addGeneratedAd(
  ad: Omit<GeneratedAd, "id" | "created_at">
): Promise<GeneratedAd> {
  const record: GeneratedAd = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...ad,
  };

  await mutateStore((store) => {
    store.generated_ads.push(record);
  });

  return record;
}

export async function savePhotoFile(
  vehicleId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
) {
  return savePhotoBytes(vehicleId, filename, buffer, mimeType);
}

export async function readPhotoForAnalysis(
  vehicleId: string,
  photo: VehiclePhoto
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const filename = path.basename(photo.storage_path);
  const buffer = await readPhotoBuffer(
    vehicleId,
    filename,
    photo.public_url ?? getPhotoPublicUrl(vehicleId, filename)
  );
  if (!buffer) return null;
  return { buffer, mimeType: photo.mime_type ?? "image/jpeg" };
}

export type { VehicleStatus };
