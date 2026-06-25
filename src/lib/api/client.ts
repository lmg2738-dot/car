/** fetch 응답 본문이 비어 있을 때 res.json() 오류를 방지 */
export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();

  if (!text.trim()) {
    throw new Error(
      res.ok
        ? "서버가 빈 응답을 반환했습니다. 터미널에서 dev 서버를 종료한 뒤 .next 폴더를 삭제하고 npm run dev 로 다시 시작해 주세요."
        : `서버 오류 (HTTP ${res.status}). dev/build 동시 실행으로 캐시가 손상됐을 수 있습니다. 서버 재시작 후 다시 시도해 주세요.`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `서버 응답 형식이 올바르지 않습니다. (HTTP ${res.status})`
    );
  }
}

/** router.refresh()가 손상된 .next 캐시로 실패할 때 대체 */
export async function safeRouterRefresh(
  refresh: () => void
): Promise<void> {
  try {
    refresh();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("JSON") ||
      message.includes("Unexpected end") ||
      message.includes("routes-manifest")
    ) {
      window.location.reload();
      return;
    }
    throw err;
  }
}
