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

## 2. Render 배포 (무료 Blueprint)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/lmg2738-dot/car)

1. 위 버튼 클릭 → GitHub `lmg2738-dot/car` 연동
2. Blueprint(`render.yaml`) 확인 → **Apply**
3. 배포 시 입력할 환경 변수:
   - `OPENROUTER_API_KEY` — OpenRouter 키
   - `AIHUB_API_KEY` — AI Hub 키 (다운로드용)
   - `NEXT_PUBLIC_APP_URL` — 배포 완료 후 URL (예: `https://autodealer-copilot.onrender.com`)
4. Deploy 완료 후 `/dashboard/datasets`에서 AI Hub 조회·다운로드 테스트

### 무료 플랜 제한 (중요)

| 항목 | 무료 플랜 |
|------|-----------|
| AI Hub **다운로드** | ✅ 서비스 가동 중 가능 (`/app/data/aihub`) |
| 데이터 **영구 저장** | ❌ 재배포·슬립 후 초기화 (영구 디스크는 유료) |
| 유휴 슬립 | 15분 미사용 시 슬립 → 첫 접속 30초~1분 |
| RAM | 512 MB (초대형 데이터셋은 실패할 수 있음) |

> 영구 디스크가 필요하면 Render **Starter** 이상으로 업그레이드 후 Disks 탭에서 `/app/data` 마운트

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
