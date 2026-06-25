# AutoDealer Copilot 배포 가이드

## 사전 요구사항

- Node.js 20+
- [Supabase](https://supabase.com) 프로젝트 (DB + Storage)
- OpenRouter API 키 ([openrouter.ai](https://openrouter.ai))
- (선택) AI Hub API 키

---

## 1. Supabase 설정

1. Supabase 프로젝트 → **SQL Editor**에서 `supabase/schema.sql` 내용 실행
2. **Storage**에 `vehicle-photos` public 버킷이 생성되었는지 확인
3. **Project Settings → API**에서 URL·Service Role Key 확인

---

## 2. 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 서버 API용 (비공개) |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API 키 |
| `NEXT_PUBLIC_APP_URL` | ✅ | 배포된 공개 URL |
| `ANALYZE_FALLBACK_MOCK` | 선택 | OpenRouter 실패 시 데모 분석 (`false` 권장) |
| `OPENROUTER_VISION_MODEL` | 권장 | Vision 분석 모델 (예: `google/gemini-2.5-flash`) |
| `OPENROUTER_ALLOW_PAID_MODELS` | 권장 | `true` — 무료 한도 초과 시 유료 모델 사용 |
| `AIHUB_API_KEY` | 선택 | AI Hub 데이터 다운로드 |

> API 키·Service Role Key는 GitHub에 커밋하지 마세요.

`NEXT_PUBLIC_STORYSUPABASE_URL` 변수명도 지원합니다.

---

## 3. Vercel 배포

1. [Vercel Import](https://vercel.com/new/import?s=https://github.com/lmg2738-dot/car) 또는 기존 프로젝트 재배포
2. Environment Variables에 위 항목 설정
3. Deploy

GitHub Actions 자동 배포 (선택):

- Repository Variables: `VERCEL_DEPLOY_ENABLED` = `true`
- Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## 4. 로컬 운영 모드

```bash
npm install
cp .env.example .env.local   # Supabase·OpenRouter 키 입력
npm run dev
```

---

## 5. AI Hub (선택)

```bash
npm run aihub:setup
```

Vercel 배포 시 `vercel-build` 스크립트가 aihubshell을 설치합니다.

Windows: WSL 또는 Git Bash 권장 (`AIHUB_BASH_PATH` 설정 가능)

---

## 6. 체크리스트

- [ ] Supabase 테이블·Storage 버킷 생성 (`supabase/schema.sql`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 설정
- [ ] `OPENROUTER_API_KEY` 설정
- [ ] `NEXT_PUBLIC_APP_URL`이 실제 접속 URL과 일치
- [ ] `/api/storage/health` → `"ok": true`
- [ ] 차량 등록 → 사진 업로드 → AI 분석 → 판매글 생성 플로우 테스트

---

## 7. OpenRouter 무료 한도

- 무료 모델 일일 한도 초과 시 `OPENROUTER_ALLOW_PAID_MODELS=true`와 크레딧 충전 필요
- 실제 Vision 분석: 크레딧 충전 또는 한도 복구 후 재시도
