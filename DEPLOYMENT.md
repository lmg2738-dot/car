# AutoDealer Copilot 배포 가이드

## 사전 요구사항

- Node.js 20+
- OpenRouter API 키 ([openrouter.ai](https://openrouter.ai))
- (선택) AI Hub API 키

---

## 1. 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API 키 |
| `NEXT_PUBLIC_APP_URL` | ✅ | 배포된 공개 URL |
| `ANALYZE_FALLBACK_MOCK` | 권장 | OpenRouter 실패 시 데모 분석 (기본 `true`) |
| `ANALYZE_MOCK_MODE` | 선택 | 항상 데모 분석 (`true`/`false`) |
| `AIHUB_API_KEY` | 선택 | AI Hub 데이터 다운로드 |

> API 키는 GitHub에 커밋하지 마세요.

---

## 2. Vercel 배포 (빠른 데모)

Vercel은 **파일 저장소가 영구적이지 않습니다** (재배포·콜드스타트 시 데이터 초기화).
UI·API 동작 확인용으로 권장합니다. AI Hub **조회**는 가능하나, **대용량 다운로드**는 Docker 배포를 사용하세요.

1. [Vercel](https://vercel.com) → Import Git Repository → `lmg2738-dot/car`
2. Environment Variables:
   - `OPENROUTER_API_KEY`
   - `NEXT_PUBLIC_APP_URL` = Vercel 배포 URL
   - `ANALYZE_FALLBACK_MOCK` = `true`
   - `AIHUB_API_KEY` (AI Hub 사용 시)
3. Deploy

GitHub Actions 자동 배포 (선택):

- Repository Variables: `VERCEL_DEPLOY_ENABLED` = `true`
- Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## 3. Docker (운영 권장)

`data/` 폴더 영구 저장 및 AI Hub **대용량 다운로드**가 필요하면 Docker를 사용하세요.

```bash
# .env.local 준비 후
docker compose up -d --build
```

또는:

```bash
docker build -t autodealer-copilot .
docker run -d -p 50006:50006 \
  -v autodealer-data:/app/data \
  --env-file .env.local \
  -e NEXT_PUBLIC_APP_URL=https://your-domain.com \
  autodealer-copilot
```

---

## 4. 로컬 운영 모드

```bash
npm run build
npm run start
```

---

## 5. AI Hub (선택)

로컬 / Docker:

```bash
npm run aihub:setup
```

Vercel 배포 시 `vercel-build` 스크립트가 aihubshell을 설치하며, 없을 경우 런타임에 `/tmp`에 자동 다운로드합니다.
**대용량 데이터 다운로드**는 Docker 배포에서 사용하세요.

Windows: WSL 또는 Git Bash 권장 (`AIHUB_BASH_PATH` 설정 가능)

---

## 6. 체크리스트

- [ ] `OPENROUTER_API_KEY` 설정
- [ ] `NEXT_PUBLIC_APP_URL`이 실제 접속 URL과 일치
- [ ] 차량 등록 → 사진 업로드 → AI 분석 → 판매글 생성 플로우 테스트
- [ ] `/api/models`에서 무료 모델 목록 확인

---

## 7. OpenRouter 무료 한도

- 무료 모델 일일 한도 초과 시 `ANALYZE_FALLBACK_MOCK=true`로 데모 분석 결과 반환
- 실제 Vision 분석: 크레딧 충전 또는 한도 복구 후 재시도
