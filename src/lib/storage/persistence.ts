import { list, put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import { getWritableDataRoot, isServerlessEnv } from "@/lib/runtime";

export type StoreData = {
  vehicles: import("@/types/database").Vehicle[];
  vehicle_photos: import("@/types/database").VehiclePhoto[];
  generated_ads: import("@/types/database").GeneratedAd[];
};

const BLOB_STORE_KEY = "autodealer/store.json";

export function isBlobStorageEnabled(): boolean {
  if (process.env.FORCE_FILE_STORAGE === "true") return false;
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return true;
  // Vercel: @vercel/blob SDK가 OIDC(VERCEL_OIDC_TOKEN)로 자동 인증
  return isServerlessEnv();
}

export function defaultStore(): StoreData {
  return { vehicles: [], vehicle_photos: [], generated_ads: [] };
}

export function getDataDir() {
  return getWritableDataRoot();
}

export function getStorePath() {
  return path.join(getDataDir(), "store.json");
}

export function getUploadsRoot() {
  return path.join(getDataDir(), "uploads");
}

export function ensureDataDir() {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const uploadsDir = getUploadsRoot();
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

export async function readStoreData(): Promise<StoreData> {
  if (isBlobStorageEnabled()) {
    try {
      const { blobs } = await list({ prefix: BLOB_STORE_KEY, limit: 1 });
      const blob = blobs[0];
      if (!blob) {
        const empty = defaultStore();
        await writeStoreData(empty);
        return empty;
      }
      const res = await fetch(blob.url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Blob 읽기 실패: HTTP ${res.status}`);
      }
      return (await res.json()) as StoreData;
    } catch (err) {
      console.error("[storage] blob read failed", err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("No token found") || message.includes("BLOB")) {
        throw new Error(
          "Vercel Blob이 연결되지 않았습니다. Vercel 대시보드 → Storage → Create Blob Store → 프로젝트 연결 후 재배포하세요."
        );
      }
      throw new Error(
        "Vercel Blob 저장소 읽기에 실패했습니다. Storage → Blob을 프로젝트에 연결했는지 확인하세요."
      );
    }
  }

  ensureDataDir();
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    const empty = defaultStore();
    await writeStoreData(empty);
    return empty;
  }

  return JSON.parse(fs.readFileSync(storePath, "utf-8")) as StoreData;
}

export async function writeStoreData(store: StoreData): Promise<void> {
  if (isBlobStorageEnabled()) {
    await put(BLOB_STORE_KEY, JSON.stringify(store), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }

  ensureDataDir();
  fs.writeFileSync(getStorePath(), JSON.stringify(store), "utf-8");
}

export async function savePhotoBytes(
  vehicleId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (isBlobStorageEnabled()) {
    const key = `autodealer/uploads/${vehicleId}/${filename}`;
    const blob = await put(key, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: mimeType,
    });
    return blob.url;
  }

  const dir = path.join(getUploadsRoot(), vehicleId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/api/uploads/${vehicleId}/${filename}`;
}

export async function readPhotoBuffer(
  vehicleId: string,
  filename: string,
  publicUrl: string
): Promise<Buffer | null> {
  if (isBlobStorageEnabled() && publicUrl.startsWith("http")) {
    try {
      const res = await fetch(publicUrl, { cache: "no-store" });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  const filePath = path.join(getUploadsRoot(), vehicleId, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function getStorageHint(): string | null {
  if (isServerlessEnv() && !process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    return "Vercel Storage → Blob Store를 생성해 프로젝트에 연결한 뒤 재배포하세요.";
  }
  return null;
}
