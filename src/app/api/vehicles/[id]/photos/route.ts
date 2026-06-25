import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";
import {
  addPhotoRecord,
  getPhotoCount,
  savePhotoFile,
} from "@/lib/storage/store";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: vehicleId } = await params;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonError("파일이 필요합니다.");
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError("허용되지 않는 파일 형식입니다. (JPEG, PNG, WebP)");
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError("파일 크기는 10MB 이하여야 합니다.");
    }

    const currentCount = await getPhotoCount(vehicleId);
    if (currentCount === null) {
      return jsonError("차량을 찾을 수 없습니다.", 404);
    }
    if (currentCount >= MAX_PHOTOS) {
      return jsonError(`최대 ${MAX_PHOTOS}장까지 업로드 가능합니다.`);
    }

    const extFromName = file.name.split(".").pop()?.toLowerCase();
    const ext =
      extFromName && ["jpg", "jpeg", "png", "webp"].includes(extFromName)
        ? extFromName.replace("jpeg", "jpg")
        : EXT_BY_MIME[file.type];

    const filename = `${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const publicUrl = await savePhotoFile(
      vehicleId,
      filename,
      buffer,
      file.type
    );

    const result = await addPhotoRecord(
      vehicleId,
      filename,
      file.type,
      publicUrl
    );

    if ("error" in result) {
      if (result.error === "not_found") {
        return jsonError("차량을 찾을 수 없습니다.", 404);
      }
      return jsonError(`최대 ${MAX_PHOTOS}장까지 업로드 가능합니다.`);
    }

    return jsonSuccess(result.photo, 201);
  } catch (err) {
    console.error("[API] POST /api/vehicles/[id]/photos", err);
    return jsonError(
      err instanceof Error ? err.message : "업로드에 실패했습니다.",
      500
    );
  }
}
