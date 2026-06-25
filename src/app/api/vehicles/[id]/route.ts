import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";
import { deleteVehicle, getVehicle } from "@/lib/storage/store";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const vehicle = getVehicle(id);

  if (!vehicle) {
    return jsonError("Vehicle not found", 404);
  }

  return jsonSuccess(vehicle);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const vehicle = getVehicle(id);

  if (!vehicle) {
    return jsonError("Vehicle not found", 404);
  }

  deleteVehicle(id);
  return jsonSuccess({ deleted: true });
}
