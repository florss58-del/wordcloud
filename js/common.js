// 공통: Firebase 초기화, 세션 헬퍼, 클라이언트 식별
/* global firebase, FIREBASE_CONFIG */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 헷갈리는 I,L,O,0,1 제외
const CODE_LENGTH = 4;

function isFirebaseConfigured() {
  return typeof FIREBASE_CONFIG === "object" && !String(FIREBASE_CONFIG.apiKey).includes("YOUR_");
}

function initFirebase() {
  if (!isFirebaseConfigured()) {
    showConfigNotice();
    return null;
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  return firebase.database();
}

function showConfigNotice() {
  const overlay = document.createElement("div");
  overlay.className = "config-notice";
  overlay.innerHTML =
    "<div class='config-notice-box'><h2>⚙️ Firebase 설정이 필요합니다</h2>" +
    "<p><code>js/firebase-config.js</code> 파일에 Firebase 프로젝트 키를 입력해 주세요.<br/>" +
    "자세한 방법은 <strong>README.md</strong>를 참고하세요.</p></div>";
  document.body.appendChild(overlay);
}

function generateSessionCode() {
  let code = "";
  const random = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(random);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[random[i] % CODE_ALPHABET.length];
  }
  return code;
}

function getCodeFromUrl() {
  const code = new URLSearchParams(location.search).get("code") || "";
  return code.trim().toUpperCase();
}

function sessionRef(db, code) {
  return db.ref("sessions/" + code);
}

// 브라우저별 익명 식별자 (인당 제출 개수 제한용)
function getClientId() {
  let id = localStorage.getItem("wc_client_id");
  if (!id) {
    id = "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("wc_client_id", id);
  }
  return id;
}

function joinUrlFor(code) {
  const base = location.href.replace(/[^/]*$/, "");
  return base + "join.html?code=" + encodeURIComponent(code);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ── 질문 + 예시 ──
   보안 규칙의 q(80자) 하나에 "질문\n예시"로 함께 담는다.
   나누는 것은 화면에서만 한다. */
// 참석 확인 형식의 표시. 보안 규칙의 mode는 word/phrase/link만 받으므로
// 새 형식을 mode에 넣지 않고 질문 값의 마지막 줄에 표시를 달아 둔다 (규칙을 다시 게시하지 않아도 된다)
const FORM_MARK = "#rsvp";
const RSVP_YES = "참석";
const RSVP_NO = "불참";

function splitQuestion(raw) {
  let text = typeof raw === "string" ? raw : "";
  let form = "";
  const lines = text.split("\n");
  if (lines.length > 1 && lines[lines.length - 1].trim() === FORM_MARK) {
    form = "rsvp";
    lines.pop();
    text = lines.join("\n");
  }
  const nl = text.indexOf("\n");
  if (nl === -1) return { main: text.trim(), hint: "", form };
  return { main: text.slice(0, nl).trim(), hint: text.slice(nl + 1).trim(), form };
}

function joinQuestion(main, hint, form) {
  const m = (main || "").trim();
  const h = (hint || "").trim();
  const q = h ? m + "\n" + h : m;
  return form === "rsvp" ? q + "\n" + FORM_MARK : q;
}

// 참석 확인 답("홍길동 참석")을 이름과 응답으로 나눈다. 형식이 아니면 null
function parseRsvp(w) {
  if (typeof w !== "string") return null;
  const text = w.trim();
  const cut = text.lastIndexOf(" ");
  if (cut < 1) return null;
  const status = text.slice(cut + 1);
  if (status !== RSVP_YES && status !== RSVP_NO) return null;
  return { name: text.slice(0, cut).trim(), status };
}

// 질문을 두 줄로 그린다. 예시가 없으면 한 줄 그대로.
function renderQuestion(el, raw) {
  const parts = splitQuestion(raw);
  el.textContent = parts.main;
  if (parts.hint) {
    const hintEl = document.createElement("span");
    hintEl.className = "question-hint";
    hintEl.textContent = parts.hint;
    el.appendChild(hintEl);
  }
  return parts;
}

/* ── 참여 시간 ──
   meta.open / meta.close (밀리초). 둘 다 선택이다. 없으면 언제든 참여할 수 있다.
   막는 것은 보안 규칙이 하고(서버 시각 기준), 화면은 이유를 알려 줄 뿐이다 */
function windowStateOf(openAt, closeAt, nowMs) {
  if (openAt && nowMs < openAt) return "before";
  if (closeAt && nowMs > closeAt) return "after";
  return "open";
}

// "11월 17일(화) 오전 9:00"
function formatWhen(ms) {
  const d = new Date(ms);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${"일월화수목금토"[d.getDay()]}) ${h < 12 ? "오전" : "오후"} ${h12}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 입력칸(datetime-local) 값 ↔ 밀리초. 빈 값은 null
function localInputToMs(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}
function msToLocalInput(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── 참석 확인 버튼 이름 ──
   저장되는 답은 늘 "이름 참석"·"이름 불참"이다(집계용 표시). 화면에 보이는 글자만 강사가 바꾼다
   (meta.yes / meta.no). 그래서 버튼 이름을 나중에 고쳐도 이미 받은 답이 흐트러지지 않는다 */
function rsvpLabels(yes, no) {
  const clean = (v, fallback) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 12) : fallback);
  return { yes: clean(yes, RSVP_YES), no: clean(no, RSVP_NO) };
}
