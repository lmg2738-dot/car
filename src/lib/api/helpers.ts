import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function readJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** 라우트 핸들러 밖에서 터진 예외도 항상 JSON으로 반환 */
export function withApiRoute(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (err) {
      console.error("[API]", err);
      return jsonError(
        err instanceof Error ? err.message : "서버 내부 오류가 발생했습니다.",
        500
      );
    }
  };
}

export const vehicleInputSchema = z.object({
  brand: z.string().max(50).optional(),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1990).max(2030),
  mileage: z.number().int().min(0).max(9999999),
  color: z.string().max(30).optional(),
  fuel_type: z.string().max(30).optional(),
  transmission: z.string().max(30).optional(),
});

export const analyzeSchema = z.object({
  vehicle_id: z.string().uuid(),
});

export const generateAdSchema = z.object({
  vehicle_id: z.string().uuid(),
  platform: z.enum(["naver_cafe", "encar", "kb_chachacha", "general"]),
  style: z.enum(["professional", "friendly", "premium", "export"]),
});
