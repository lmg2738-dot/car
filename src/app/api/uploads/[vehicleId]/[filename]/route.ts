import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { UPLOADS_DIR } from "@/lib/storage/store";

type RouteParams = { params: Promise<{ vehicleId: string; filename: string }> };
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { vehicleId, filename } = await params;

  if (filename.includes("..") || vehicleId.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const filePath = path.join(UPLOADS_DIR, vehicleId, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const buffer = fs.readFileSync(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
