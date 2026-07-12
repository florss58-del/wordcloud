# 실시간 워드클라우드 (EUNACLASS)

수업용 실시간 참여형 워드클라우드. 정적 HTML/JS + Firebase Realtime Database.

- **배포(프로덕션)**: https://wordcloud-mu.vercel.app (Vercel scope: `florss58-dels-projects`, 프로젝트명 `wordcloud`)
  - **GitHub 연동 자동 배포**: `git push origin main` → Vercel 자동 배포 (저장소 `github.com/florss58-del/wordcloud`)
  - CLI 대체: `vercel deploy --prod --yes --scope florss58-dels-projects` (이 PC는 컴퓨터명이 한글이라 `vercel login` 오류 → VERCEL_TOKEN 방식 필요)
- **Firebase**: 프로젝트 `euna-wordcloud`, RTDB `asia-southeast1`, 설정은 `js/firebase-config.js`
- **화면**: `index.html`(교육생 코드 입력) / `admin.html`(강사: 세션 생성·내 세션 목록) / `present.html`(발표) / `join.html`(단어 제출)
- **입력 모드**: `word`(단어·집계) / `phrase`(짧은 문구) / **`link`(작품 링크 — 이름 + 주소, 발표 화면에 카드 갤러리)**. 링크 모드는 집계하지 않고 도착 순서대로 카드에 쌓는다. 1인당 1개, 제출 후 **고치기** 가능(같은 clientId만)
- ⚠️ **링크 모드의 주소 보정**: 제작 도구가 `https://` 없이 복사해 주기도 한다(Canva가 그렇다). `join.html`의 `normalizeUrl()`이 앞을 채운다. **이 함수를 지우면 학생 제출이 전부 막힌다**
- ⚠️ **링크 모드는 이름이 공개된다**: `sessions/$code`는 `.read: true`(학생 참여용)라 코드를 알면 누구나 읽는다. 이름 + 작품 링크가 사실상 공개 노출된다
- **강사 인증**: Firebase Authentication(이메일/비밀번호). `admin.html`·`present.html`은 `js/auth.js`의 `requireInstructor()` 로그인 게이트 필요, `join.html`은 인증 없음(학생용)
- **세션 이름 규칙**: `YYYYMMDD_수업명` (admin에서 날짜 자동 채움)
- **데이터**: `sessions/{4자리코드}/{meta,entries,hidden,closed}` — meta의 `q`(질문)·`name`(이름)은 로그인 강사가 수정 가능(admin의 "수정"), `created`·`mode`·`max`는 생성 후 불변. 세션 통째 삭제는 로그인 강사만(admin의 "완전 삭제"), 초기화는 entries/hidden만 삭제, closed=true면 학생 제출 차단(발표 화면 "세션 종료" 토글)
- **강사 세션 목록**: `instructors/{uid}/sessions/{코드}` — 계정에 저장되므로 기기를 바꿔도 유지. localStorage는 캐시일 뿐. 목록에 없는 세션은 admin의 "목록에 없는 지난 세션 찾기"로 복구
- **보안 규칙**: `database.rules.json`이 원본. 콘솔(Realtime Database → 규칙)에 붙여넣고 **게시**해야 적용됨(안 하면 PERMISSION_DENIED). meta 생성·수정·세션 삭제·hidden/closed 쓰기·entries 초기화·세션 목록 열거는 로그인 강사만, entries 제출(push)은 익명 허용(단 세션 존재 + closed 아님), 코드 단위 읽기는 공개(학생 참여용)
- **한국어 처리**: `js/korean.js` — 조사·어미 제거, 보호 단어, 금칙어(욕설)/장난 단어 필터, **별칭 사전**(`expandAliases`: 챗지피티·chatgpt·지피티 → "챗GPT" 등). 발표 화면이 집계 시점에 통합하므로 사전에 이름을 추가하면 지난 데이터에도 소급 적용됨
- **로컬 테스트**: `npx serve . -l 3000` (serve.json의 `cleanUrls:false` 필수 — 켜면 `?code=` 쿼리 유실)
- **시각 검증**: 워드클라우드처럼 캔버스로 그리는 것은 Playwright(크로미움)로 실제 렌더링해 확인한다. jsdom은 캔버스를 못 그림

## 추후 작업 (TODO)

- [ ] **링크 모드 리허설**: 실제 수업 투입 전에 세션을 만들어 올리기·고치기를 한 번씩 해 본다 (2026-07-12)
- [ ] **강사 계정 비밀번호 교체**: 현재 비밀번호가 크롬 유출 경고에 걸림 → 콘솔에서 계정 삭제 후 유출 목록에 없는 새 비밀번호로 재생성. 실제 수업 투입 전까지 완료 (2026-07-07)
- [ ] **작업일지 목차**: `docs/worklog/`의 일지가 10개쯤 쌓이면 `docs/worklog/README.md`에 날짜별 한 줄 목차를 만든다 (2026-07-11 기준 3개)

완료 항목은 여기 남기지 않는다. 무엇을 언제 했는지는 `docs/worklog/`와 git 히스토리에 있다.

## 문서 관리 규칙

- **CLAUDE.md**(이 파일): 지금도 참인 사실만 — 구조·배포·규칙·주의사항·열린 TODO. 매 세션 통째로 읽히니 짧게 유지한다
- **`docs/worklog/YYYY-MM-DD.md`**: 그날의 **결정과 함정**을 남긴다. 무엇을 바꿨는지는 git이 더 정확하므로 구현 세부 나열은 피한다. 하루에 여러 번 작업하면 같은 파일에 "2차·3차" 섹션으로 덧붙인다. 파일이 10개쯤 쌓이면 `docs/worklog/README.md`에 한 줄 목차를 만든다
- **기록은 NAS(`Y:`)에 남긴다.** memory(`~/.claude/projects/...`)는 **이 PC에만** 있어 다른 노트북에서 사라진다. 현재 상태와 다음 할 일은 이 파일의 “추후 작업(TODO)”과 `docs/worklog/`에 적는다
- “세션종료”라고 하면 작업일지(`docs/worklog/`)와 이 파일의 TODO를 갱신한다

## 주의사항

- Firebase 보안 규칙에서 entries의 `w` 길이 제한은 **40자** (문구 모드 30자 + 여유)
- 강사 로그인 전제 조건(Firebase 콘솔): ① Authentication → 이메일/비밀번호 사용 설정 ② 강사 계정 생성 ③ 승인된 도메인에 `wordcloud-mu.vercel.app` 추가
- 수업 전에 세션을 미리 만들어 두고 당일 또 만들면, **이름·질문이 같은 빈 세션과 헷갈린다**(2026-07-09에 실제로 "데이터가 사라진 줄" 아는 일이 있었음). admin 목록의 "지난 세션 찾기"는 단어 수를 함께 보여주므로 이걸로 구분한다
- `join.html`은 세션의 `meta.mode`(word/phrase)에 따라 입력 검증이 달라짐
- 발표 화면 QR 클릭(또는 "📱 QR 크게" 버튼) → 전체 화면 QR
- UI 문구 스타일: 고정 안내문은 마침표 생략, 동작 결과 알림은 마침표 사용

## 공통 규칙

문장부호·한국어 글쓰기(AI 티 제거)·조각 문장 금지·배포 후 캐시 검증·세션시작/종료는
**상위 공통 규칙 `Y:\claude\CLAUDE.md`** 에 있으며 자동으로 함께 읽힌다. 여기 중복해 적지 않는다.

이 프로젝트 고유 문구 스타일: 고정 안내문은 마침표 생략, 동작 결과 알림은 마침표 사용.
