import { NextRequest } from "next/server";
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  vehicleInputSchema,
  withApiRoute,
} from "@/lib/api/helpers";
import { createVehicle, listVehicles } from "@/lib/storage/store";

export const GET = withApiRoute(async () => {
  return jsonSuccess(listVehicles());
});

export const POST = withApiRoute(async (request: NextRequest) => {
  const body = await readJsonBody(request);
  if (body === null) {
    return jsonError("잘못된 JSON 요청입니다.");
  }
  const parsed = vehicleInputSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const vehicle = createVehicle(parsed.data);
  return jsonSuccess(vehicle, 201);
});
