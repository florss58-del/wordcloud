# 실시간 워드클라우드 (EUNACLASS)

수업용 실시간 참여형 워드클라우드. 정적 HTML/JS + Firebase Realtime Database.

- **배포(프로덕션)**: https://wordcloud-mu.vercel.app (Vercel scope: `florss58-dels-projects`, 프로젝트명 `wordcloud`)
  - **GitHub 연동 자동 배포**: `git push origin main` → Vercel 자동 배포 (저장소 `github.com/florss58-del/wordcloud`)
  - CLI 대체: `vercel deploy --prod --yes --scope florss58-dels-projects` (이 PC는 컴퓨터명이 한글이라 `vercel login` 오류 → VERCEL_TOKEN 방식 필요)
- **Firebase**: 프로젝트 `euna-wordcloud`, RTDB `asia-southeast1`, 설정은 `js/firebase-config.js`
- **화면**: `index.html`(교육생 코드 입력) / `admin.html`(강사: 세션 생성·내 세션 목록) / `present.html`(발표) / `join.html`(단어 제출)
- **강사 인증**: Firebase Authentication(이메일/비밀번호). `admin.html`·`present.html`은 `js/auth.js`의 `requireInstructor()` 로그인 게이트 필요, `join.html`은 인증 없음(학생용)
- **세션 이름 규칙**: `YYYYMMDD_수업명` (admin에서 날짜 자동 채움)
- **데이터**: `sessions/{4자리코드}/{meta,entries,hidden}` — meta는 생성 후 수정·삭제 불가(규칙), 초기화는 entries/hidden만 삭제
- **보안 규칙**: `database.rules.json`이 원본. 콘솔(Realtime Database → 규칙)에 붙여넣어 배포. meta 생성·hidden 쓰기·entries 초기화는 로그인 강사만, entries 제출(push)은 익명 허용
- **한국어 처리**: `js/korean.js` — 조사·어미 제거, 보호 단어, 금칙어(욕설)/장난 단어(메롱·바보 등) 필터
- **로컬 테스트**: `npx serve . -l 3000` (serve.json의 `cleanUrls:false` 필수 — 켜면 `?code=` 쿼리 유실)

## 추후 작업 (TODO)

- [ ] **결과 보기 + CSV 내보내기**: 발표 화면에 "📋 결과 보기" 버튼 추가 → 단어 빈도표(순위·단어·횟수) 표시 + CSV(엑셀) 다운로드. 수업 후 분석용. (2026-07-04 사용자 승인, 추후 진행)
- [x] ~~강사 페이지 잠금~~ → Firebase Auth 로그인 게이트 + RTDB 보안 규칙으로 구현 (2026-07-07 완료)
- [x] ~~PNG 저장 시 질문·날짜 포함~~ (2026-07-04 완료)
- [x] ~~다크 테마 선택 기억~~ (2026-07-04 완료)

## 주의사항

- Firebase 보안 규칙에서 entries의 `w` 길이 제한은 **40자** (문구 모드 30자 + 여유)
- 강사 로그인 전제 조건(Firebase 콘솔): ① Authentication → 이메일/비밀번호 사용 설정 ② 강사 계정 생성 ③ 승인된 도메인에 `wordcloud-mu.vercel.app` 추가
- `join.html`은 세션의 `meta.mode`(word/phrase)에 따라 입력 검증이 달라짐
- 발표 화면 QR 클릭(또는 "📱 QR 크게" 버튼) → 전체 화면 QR
- UI 문구 스타일: 고정 안내문은 마침표 생략, 동작 결과 알림은 마침표 사용
