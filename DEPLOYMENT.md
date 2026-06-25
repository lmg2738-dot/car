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
| `NEXT_PUBLIC_APP_URL` | ✅ | 배포된 공개 URL (예: `https://xxx.onrender.com`) |
| `ANALYZE_FALLBACK_MOCK` | 권장 | OpenRouter 실패 시 데모 분석 (기본 `true`) |
| `ANALYZE_MOCK_MODE` | 선택 | 항상 데모 분석 (`true`/`false`) |
| `AIHUB_API_KEY` | 선택 | AI Hub 데이터 다운로드 |

> API 키는 GitHub에 커밋하지 마세요.

---

## 2. Render 배포 (운영 권장)

`data/` 폴더 영구 저장이 필요하므로 **Docker + 디스크** 방식을 권장합니다.

1. [Render](https://render.com) 가입 → GitHub 연동
2. **New → Blueprint** → `lmg2738-dot/car` 저장소 선택
3. `render.yaml` 자동 인식 → **Apply**
4. 환경 변수 입력:
   - `OPENROUTER_API_KEY` — OpenRouter 키
   - `NEXT_PUBLIC_APP_URL` — 배포 후 부여되는 URL (예: `https://autodealer-copilot.onrender.com`)
5. Deploy 완료 후 URL 접속 → 차량 등록 → 사진 → 분석 테스트

무료 플랜은 유휴 시 슬립되며, 첫 접속 시 30초~1분 걸릴 수 있습니다.

---

## 3. Vercel 배포 (빠른 데모)

Vercel은 **파일 저장소가 영구적이지 않습니다** (재배포·콜드스타트 시 데이터 초기화).
UI·API 동작 확인용으로만 권장합니다.

1. [Vercel](https://vercel.com) → Import Git Repository → `lmg2738-dot/car`
2. Environment Variables:
   - `OPENROUTER_API_KEY`
   - `NEXT_PUBLIC_APP_URL` = Vercel 배포 URL
   - `ANALYZE_FALLBACK_MOCK` = `true`
3. Deploy

GitHub Actions 자동 배포 (선택):

- Repository Variables: `VERCEL_DEPLOY_ENABLED` = `true`
- Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## 4. Docker (VPS / 자체 서버)

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

## 5. 로컬 운영 모드

```bash
npm run build
npm run start
```

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
