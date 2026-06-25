/** fetch 응답 본문이 비어 있을 때 res.json() 오류를 방지 */
export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();

  if (!text.trim()) {
    throw new Error(
      res.ok
        ? "서버가 빈 응답을 반환했습니다. 개발 서버를 재시작한 뒤 다시 시도해 주세요."
        : `서버 오류 (HTTP ${res.status}). 응답 본문이 없습니다.`
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
