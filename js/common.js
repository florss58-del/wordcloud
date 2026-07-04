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
