# ☁️ 실시간 워드클라우드 (EUNACLASS)

교육생이 휴대폰으로 단어를 제출하면 강사 화면에 실시간으로 워드클라우드가 그려지는 수업용 도구입니다.
서버 없이 **정적 HTML + Firebase Realtime Database**로 동작합니다.

## 화면 구성

| 파일 | 대상 | 역할 |
|------|------|------|
| `index.html` | 공용 | 코드 입력 참여 + 새 세션 만들기(강사) |
| `join.html` | 교육생 | 질문 확인 후 단어 제출 (QR로 진입, 무가입) |
| `present.html` | 강사 | 빔프로젝터용 실시간 워드클라우드 + QR + 진행 도구 |

### 발표 화면 기능
- 단어 도착 즉시 클라우드 갱신 (빈도가 높을수록 크게)
- **단어 클릭 → 전체 화면 강조** (수업 중 특정 단어를 짚어 이야기할 때)
- 강조 화면에서 **부적절 단어 숨기기**
- 일시정지/재개, 밝은·어두운 테마, QR 숨기기, PNG 저장, 초기화
- 참여 인원·제출 단어 수 실시간 표시

### 한국어 처리 (`js/korean.js`)
- 조사 자동 제거: "수업이 / 수업을 / 수업은" → **수업** 으로 통일 집계
- 금칙어 필터(욕설 등) — 제출 단계에서 차단
- 목록은 `js/korean.js`의 `BANNED_WORDS`, `JOSA_LIST`에서 수정

## 최초 설정 (Firebase, 약 5분)

1. [Firebase 콘솔](https://console.firebase.google.com) → **프로젝트 추가** (예: `euna-wordcloud`, 애널리틱스 불필요)
2. 왼쪽 메뉴 **빌드 → Realtime Database → 데이터베이스 만들기**
   - 위치: `asia-southeast1` (싱가포르)
   - 보안 규칙: 일단 "잠금 모드"로 시작
3. **규칙** 탭에 아래 내용 붙여넣고 게시:

```json
{
  "rules": {
    "sessions": {
      "$code": {
        ".read": true,
        "meta": {
          ".write": "!data.exists()",
          ".validate": "newData.hasChildren(['q','max']) && newData.child('q').isString() && newData.child('q').val().length <= 80"
        },
        "entries": {
          "$entry": {
            ".write": "!data.exists()",
            ".validate": "newData.hasChildren(['w','c']) && newData.child('w').isString() && newData.child('w').val().length <= 40"
          },
          ".write": "data.exists()"
        },
        "hidden": { ".write": true }
      }
    }
  }
}
```

> 참고: 이 규칙은 무가입 참여를 위해 열려 있는 구조입니다. 교실 수업 규모에는 충분하지만,
> 세션 코드가 외부에 알려지면 누구나 제출할 수 있으니 수업 후 초기화를 권장합니다.

4. 프로젝트 개요 → **웹 앱 추가(</>)** → 앱 등록 → 표시되는 `firebaseConfig` 값을
   [js/firebase-config.js](js/firebase-config.js)에 그대로 붙여넣기
5. 배포: 이 폴더를 Vercel/GitHub Pages 등 정적 호스팅에 올리면 끝
   (로컬 테스트: `npx serve .` 후 `http://localhost:3000`)

## 수업 사용 순서

1. `index.html`에서 질문 입력 → **세션 만들고 발표 화면 열기**
2. 발표 화면을 빔프로젝터에 띄우기 (QR + 4자리 코드 표시됨)
3. 교육생: QR 스캔 → 단어 입력 → 제출 (인당 개수는 세션 생성 시 설정)
4. 단어를 클릭해 강조하며 이야기 진행
5. 수업 후: PNG 저장 → 초기화

## 기술 메모

- 워드클라우드 렌더링: [wordcloud2.js](https://github.com/timdream/wordcloud2.js) (캔버스, CDN)
- QR 생성: qrcodejs (CDN)
- 실시간 동기화: Firebase RTDB `child_added` 구독 (제출 → 화면 반영 1초 이내)
- 인당 제출 제한은 브라우저 localStorage 기준(익명 clientId)
- 데이터 구조:
  ```
  sessions/{CODE}/meta     { q: 질문, max: 인당개수, created }
  sessions/{CODE}/entries  { pushId: { w: 단어, c: 클라이언트ID, t: 시각 } }
  sessions/{CODE}/hidden   { 단어: true }   ← 강사가 숨긴 단어
  ```
