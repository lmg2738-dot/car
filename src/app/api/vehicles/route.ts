import { NextRequest } from "next/server";
import {
  jsonError,
  jsonSuccess,
  vehicleInputSchema,
} from "@/lib/api/helpers";
import { createVehicle, listVehicles } from "@/lib/storage/store";

export async function GET() {
  return jsonSuccess(listVehicles());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = vehicleInputSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const vehicle = createVehicle(parsed.data);
  return jsonSuccess(vehicle, 201);
}
