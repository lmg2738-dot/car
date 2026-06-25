import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";
import { deleteVehicle, getVehicle } from "@/lib/storage/store";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const vehicle = await getVehicle(id);

    if (!vehicle) {
      return jsonError("Vehicle not found", 404);
    }

    return jsonSuccess(vehicle);
  } catch (err) {
    console.error("[API] GET /api/vehicles/[id]", err);
    return jsonError(
      err instanceof Error ? err.message : "서버 내부 오류가 발생했습니다.",
      500
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const vehicle = await getVehicle(id);

    if (!vehicle) {
      return jsonError("Vehicle not found", 404);
    }

    await deleteVehicle(id);
    return jsonSuccess({ deleted: true });
  } catch (err) {
    console.error("[API] DELETE /api/vehicles/[id]", err);
    return jsonError(
      err instanceof Error ? err.message : "서버 내부 오류가 발생했습니다.",
      500
    );
  }
}
