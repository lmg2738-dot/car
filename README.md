# AutoDealer Copilot

AI 중고차 딜러 비서 — 차량 사진과 기본 정보만으로 판매 콘텐츠를 자동 생성합니다.

## 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **AI**: OpenRouter (무료 모델만 자동 선택, 실패 모델 자동 제외)
- **Storage**: Supabase (PostgreSQL + Storage)
- **AI Hub** (선택): aihubshell 데이터셋 다운로드

## 환경 변수

`.env.example`을 `.env.local`로 복사 후 값을 입력하세요.

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 서버 API용 (비공개) |
| `OPENROUTER_API_KEY` | ✅ | [OpenRouter](https://openrouter.ai) API 키 |
| `NEXT_PUBLIC_APP_URL` | ✅ | 앱 URL |
| `AIHUB_API_KEY` | 선택 | AI Hub 데이터 다운로드용 |

> ⚠️ API 키·Service Role Key는 `.env.local` / Vercel 환경 변수에만 저장하세요. GitHub 업로드 금지.

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # 키 입력
# Supabase SQL Editor에서 supabase/schema.sql 실행
npm run dev
```

## OpenRouter 무료 모델

- [OpenRouter 무료 모델](https://openrouter.ai/models?max_price=0)만 자동 사용
- Vision 분석: 이미지 입력 지원 무료 모델 우선
- 모델 오류/중단 시 자동으로 다음 무료 모델 시도
- 사용 가능 모델: `GET /api/models`

## 데이터 저장

- 차량·광고: Supabase `vehicles`, `generated_ads` 테이블
- 사진: Supabase Storage `vehicle-photos` 버킷

## API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/car/analyze` | 차량 AI 분석 |
| POST | `/api/car/generate` | 판매글 생성 |
| GET | `/api/models` | 사용 가능 무료 모델 목록 |
| GET | `/api/storage/health` | Supabase 연결 상태 |
| CRUD | `/api/vehicles` | 차량 관리 |

## 배포

Vercel 배포 시 Supabase·OpenRouter 환경 변수를 설정하세요.

자세한 내용: [DEPLOYMENT.md](./DEPLOYMENT.md)
