import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";
import { listPackages } from "@/lib/aihub/aihub-shell";

export async function GET(request: NextRequest) {
  const datapckagekey = request.nextUrl.searchParams.get("datapckagekey");
  const search = request.nextUrl.searchParams.get("search");

  try {
    const key = datapckagekey ? parseInt(datapckagekey, 10) : undefined;

    if (datapckagekey && isNaN(key!)) {
      return jsonError("유효하지 않은 datapckagekey입니다.");
    }

    const result = await listPackages(key);

    if (search && !datapckagekey) {
      const filtered = result.items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
      return jsonSuccess({ ...result, items: filtered });
    }

    return jsonSuccess(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return jsonError(message, 500);
  }
}
