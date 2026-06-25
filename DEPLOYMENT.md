# AutoDealer Copilot 배포 가이드

## 사전 요구사항

- Node.js 20+
- OpenRouter API 키 ([openrouter.ai](https://openrouter.ai))
- (선택) AI Hub API 키

---

## 1. 환경 변수

Vercel 또는 서버 `.env.local`:

```
OPENROUTER_API_KEY=sk-or-v1-...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

선택 (AI Hub):

```
AIHUB_API_KEY=...
```

> API 키는 절대 GitHub에 커밋하지 마세요.

---

## 2. OpenRouter 설정

1. [OpenRouter](https://openrouter.ai) 가입 → API Keys 생성
2. 무료 모델만 사용 (`max_price=0`) — 앱이 자동 필터링
3. 사용 불가 모델은 런타임에 자동 제외

---

## 3. Vercel 배포

```bash
git push origin main
```

Vercel Import → Environment Variables 설정 → Deploy

### 주의: 파일 저장소

현재 버전은 `data/` 로컬 파일에 데이터를 저장합니다.
Vercel Serverless는 재배포 시 파일이 초기화됩니다.

**프로덕션 권장:**
- Docker + 볼륨 마운트 (`data/` 영구 저장)
- VPS (Linux) 직접 호스팅
- `npm run build && npm start`

---

## 4. AI Hub (선택)

Linux/Git Bash 환경:

```bash
npm run aihub:setup
```

Windows: WSL 또는 Git Bash 권장

---

## 5. 체크리스트

- [ ] `OPENROUTER_API_KEY` Vercel 환경 변수 설정
- [ ] `.env.local` Git 미포함 확인
- [ ] 차량 등록 → 사진 → 분석 → 생성 플로우 테스트
- [ ] `/api/models`에서 무료 모델 목록 확인
