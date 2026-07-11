# 두껍아 두껍아 청소 예약 플랫폼

GitHub Pages 정적 홈페이지와 Supabase 백엔드로 구성한 입주청소 견적·예약·운영 시스템입니다.

## 구현 범위

- 비회원·회원 견적 상담 및 희망일정 예약
- 스탠다드/프리미엄 가격표, 가전·컬비·진드기·애완동물·폐기물 옵션
- 오전 6시~오후 6시 시작시간, 2시간·24시간 임시 선점
- 관리자 인증, 발주·월간 예약·결제·문의·후기·가격 관리
- 회원가입, 마이페이지, 같은 인증 이메일의 비회원 이력 연결
- 회원·비회원 문의와 4자리 PIN 해시
- 토스페이먼츠 테스트/실결제 분리, 선결제·추가결제
- 작업·결제 완료 후 관리자 후기 요청
- 네이버 블로그 RSS 자동수집, 작업사례와 고객 후기 통합 화면
- 공개 가격 안내, 공지사항과 자주하는질문 화면

청소팀 위치와 카카오 운전거리 기능의 백엔드 코드는 보관하지만 관리자 화면 노출은 현재 보류합니다.

## 기본 청소 단가

| 청소 유형 | 스탠다드 | 프리미엄 |
|---|---:|---:|
| 입주청소 | 평당 15,000원 · 최소 240,000원 | 평당 19,000원 · 최소 300,000원 |
| 이사청소 | 평당 16,000원 · 최소 260,000원 | 평당 20,000원 · 최소 320,000원 |
| 거주청소 | 평당 18,000원 · 최소 300,000원 | 평당 22,000원 · 최소 360,000원 |

표시 금액은 예상가이며 현장 구조, 오염도, 주차와 추가 작업에 따라 관리자가 최종 금액을 확정합니다.

## 로컬 확인

Windows에서는 폴더의 `사이트실행.bat`을 더블클릭하면 로컬 서버와 홈페이지가 자동으로 열립니다. HTML 파일을 직접 열면 브라우저 보안 정책 때문에 견적 계산, 캘린더, 회원가입 탭이 작동하지 않습니다.

직접 실행하려면 아래 명령을 사용합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test.ps1
python -m http.server 4173 --bind 127.0.0.1
```

## GitHub Pages 배포

이 폴더는 별도 빌드 없이 GitHub Pages에 올릴 수 있는 정적 사이트 구조입니다. 저장소 이름을 `cleaning-room`으로 사용하면 기존 주소인 `https://rofnine.github.io/cleaning-room/`과 맞습니다.

1. GitHub에서 `cleaning-room` 저장소를 만들거나 기존 저장소를 엽니다.
2. 이 폴더의 파일을 저장소 최상위에 올립니다. `.gitignore`와 `.nojekyll`도 함께 포함합니다.
3. `js/config.js`에는 Supabase 프로젝트 URL과 publishable key만 입력합니다. service-role 키, 토스 secret key, Resend 키, 카카오 REST 키와 `.env` 파일은 GitHub에 올리지 않습니다.
4. 파일을 `main` 브랜치에 반영합니다.
5. 저장소 `Settings > Pages > Build and deployment`에서 `Source`를 `Deploy from a branch`로 선택합니다.
6. 브랜치는 `main`, 폴더는 `/ (root)`를 선택하고 저장합니다.
7. 배포가 완료되면 `https://rofnine.github.io/cleaning-room/`에서 화면을 확인합니다.

GitHub Pages에는 고객 화면만 배포됩니다. 데이터 저장, 관리자 인증, 이메일, 결제, 블로그 동기화와 위치 계산은 아래 Supabase 설정 및 Edge Functions 배포가 별도로 완료되어야 실제로 작동합니다.

설정 화면이 달라진 경우 [GitHub Pages 게시 원본 공식 안내](https://docs.github.com/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)를 확인하세요.

## Supabase 연결

`js/config.js`가 예시값인 동안 회원가입 화면은 네트워크 요청을 보내지 않고 준비 안내와 전화·문의 버튼을 표시합니다. 실제 회원가입과 예약 저장은 아래 연결이 끝난 뒤 활성화됩니다.

1. Supabase 프로젝트를 생성합니다.
2. `js/config.example.js`를 참고해 `js/config.js`에 프로젝트 URL과 publishable key만 입력합니다.
3. `supabase/.env.example`의 항목을 Supabase Edge Function secrets로 등록합니다.
4. `supabase/migrations`의 마이그레이션을 파일명 순서대로 적용하고 Edge Functions를 배포합니다. 통합 정산·세금계산서·작업팀 운영을 쓰려면 `202606240008_integrated_operations.sql`까지 적용해야 합니다.
5. 일반 회원가입으로 최초 관리자 계정을 만든 뒤 Supabase `Authentication > Users`에서 사용자 UUID를 확인합니다.
6. Supabase SQL Editor에서 아래 쿼리의 UUID를 바꿔 실행합니다.

```sql
update public.profiles
set role = 'admin'
where id = '<Supabase Auth 사용자 UUID>';
```

7. 사이트 하단의 `관리자 로그인` 또는 `auth.html?next=admin.html`에서 해당 계정으로 로그인합니다. `profiles.role`이 `admin`이 아닌 계정은 관리자 화면에 접근할 수 없습니다.

청소팀 계정은 같은 방식으로 `profiles.role`을 `team`으로 지정합니다.

브라우저 파일에는 service-role 키, 토스 시크릿 키, Resend 키, 카카오 REST 키를 넣지 않습니다.

## 가격 관리 흐름

- 고객용 `pricing.html`과 예약 화면은 Supabase `price_catalog`의 활성 가격을 읽습니다.
- 관리자는 `admin.html`의 `가격 관리`에서 기본 청소, 가전 청소, 추가 케어 가격을 수정할 수 있습니다.
- 저장한 가격은 이후 고객이 여는 공개 가격표와 새 예약의 실시간 예상 견적에 반영됩니다.
- 기존 주문은 접수 당시 `price_snapshot`을 보존하므로 관리자가 가격을 바꿔도 과거 주문 금액은 달라지지 않습니다.
- 가전 청소 고정 가격은 데이터베이스와 관리자 화면 모두 최소 30,000원으로 제한합니다.
- 폐기물 대량 처리처럼 `별도 상담`인 항목은 숫자 예상 합계에 더하지 않고 상담 필요 항목으로 기록합니다.

## 토스페이먼츠

현재는 `PAYMENT_MODE=test`로 운영합니다. 테스트 키가 연결되면 실제 청구 없이 결제창·승인·취소 흐름을 검증할 수 있습니다.

실결제 전환에는 다음이 필요합니다.

1. 토스페이먼츠 계약 및 상점 심사 완료
2. 라이브 client key와 secret key 발급
3. 성공·실패 URL 및 웹훅 주소 등록
4. `TOSS_LIVE_CLIENT_KEY`, `TOSS_LIVE_SECRET_KEY` 등록
5. 소액 실결제·취소 확인 후 `PAYMENT_MODE=live` 전환

운영 키가 준비되지 않은 상태에서는 라이브 모드를 활성화할 수 없습니다.

## 카카오모빌리티

실시간 위치·운전거리 기능은 현재 보류 상태입니다. 관련 테이블과 함수는 남아 있지만 관리자 메뉴에서는 노출하지 않습니다. 추후 활성화할 때만 `KAKAO_MOBILITY_REST_KEY`와 위치 동의 흐름을 운영 설정합니다.

## 네이버 블로그·이메일

- 블로그 동기화 함수는 `https://rss.blog.naver.com/rofnine.xml`을 수집합니다.
- 배포 후 Supabase Cron에서 하루 2회 `sync-blog`를 호출하고 `BLOG_SYNC_SECRET`을 전달합니다.
- Resend 알림에는 `RESEND_API_KEY`, 발신자 인증 이메일, 관리자 수신 이메일이 필요합니다.

## 남은 운영 작업

- `202606230007_operations_pricing_redesign.sql` 마이그레이션 적용
- `202606240008_integrated_operations.sql` 마이그레이션 적용과 `admin-tax-invoice` 테스트 함수 배포
- Supabase Edge Functions 배포 및 이메일 알림 검증
- Resend 발신 도메인 인증
- 토스페이먼츠 상점 계약 후 실결제 전환
- 카카오모빌리티 기능 재개 여부 결정
- 개인정보처리방침·취소/환불 규정의 운영자 최종 검토

## 세금계산서 테스트 발행

관리자센터의 `세금계산서` 화면은 기본적으로 `TAX_INVOICE_MODE=test`에서 동작합니다. 테스트 발행은 외부 기관이나 국세청으로 전송하지 않고 주문 금액, 공급받는자 정보, 테스트 문서번호와 상태만 Supabase에 저장합니다.

실제 발행 전환에는 전자세금계산서 사업자 계약, 공급자 사업자정보, API 인증정보, 전자서명 및 수정세금계산서 운영 기준이 필요합니다. `POPBILL_SECRET_KEY` 같은 비밀값은 브라우저의 `js/config.js`에 넣지 않고 Supabase Edge Function 환경변수에만 저장합니다. 현재 소스는 실발행 어댑터가 연결되기 전까지 `TAX_INVOICE_MODE=live` 요청을 거부합니다.
