import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";
import { listDatasets } from "@/lib/aihub/aihub-shell";

export async function GET(request: NextRequest) {
  const datasetkey = request.nextUrl.searchParams.get("datasetkey");
  const search = request.nextUrl.searchParams.get("search");

  try {
    const key = datasetkey ? parseInt(datasetkey, 10) : undefined;

    if (datasetkey && isNaN(key!)) {
      return jsonError("유효하지 않은 datasetkey입니다.");
    }

    const result = await listDatasets(key);

    if (search && !datasetkey) {
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
