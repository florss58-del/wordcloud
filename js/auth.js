// 강사 인증 공통 (Firebase Authentication · 이메일/비밀번호)
/* global firebase */

const AUTH_EMAIL_KEY = "wc_auth_email";

const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
  "auth/user-disabled": "사용이 중지된 계정입니다.",
  "auth/user-not-found": "등록되지 않은 계정입니다.",
  "auth/wrong-password": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/invalid-login-credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/too-many-requests": "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  "auth/network-request-failed": "네트워크 연결을 확인해 주세요."
};

// 미로그인 시 로그인 오버레이를 띄우고, 로그인되면 onReady(user)를 1회 호출
function requireInstructor(onReady) {
  const auth = firebase.auth();
  // 로그인 유지는 탭이 열려 있는 동안만 (탭을 닫으면 로그아웃)
  auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});
  let overlay = null;
  let started = false;

  auth.onAuthStateChanged((user) => {
    if (user) {
      if (overlay) { overlay.remove(); overlay = null; }
      if (!started) { started = true; if (onReady) onReady(user); }
    } else if (!overlay) {
      overlay = buildAuthOverlay(auth);
      document.body.appendChild(overlay);
      overlay.querySelector("#authEmail").value = localStorage.getItem(AUTH_EMAIL_KEY) || "";
      overlay.querySelector(overlay.querySelector("#authEmail").value ? "#authPw" : "#authEmail").focus();
    }
  });
}

function buildAuthOverlay(auth) {
  const overlay = document.createElement("div");
  overlay.className = "auth-gate";
  overlay.innerHTML =
    '<div class="card auth-card">' +
    '<h2><svg class="icon title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> 강사 로그인</h2>' +
    '<p class="auth-hint">강사 전용 화면입니다. 계정으로 로그인해 주세요</p>' +
    '<div class="field"><label for="authEmail">이메일</label>' +
    '<input id="authEmail" class="input" type="email" autocomplete="username" /></div>' +
    '<div class="field"><label for="authPw">비밀번호</label>' +
    '<input id="authPw" class="input" type="password" autocomplete="current-password" /></div>' +
    '<button id="authBtn" class="btn btn-primary btn-block">로그인</button>' +
    '<p id="authStatus" class="status-msg"></p>' +
    '<p class="auth-home"><a href="./index.html">참여자 홈으로</a></p>' +
    "</div>";

  const emailInput = overlay.querySelector("#authEmail");
  const pwInput = overlay.querySelector("#authPw");
  const loginBtn = overlay.querySelector("#authBtn");
  const statusEl = overlay.querySelector("#authStatus");

  async function signIn() {
    const email = emailInput.value.trim();
    const password = pwInput.value;
    if (!email || !password) {
      statusEl.textContent = "이메일과 비밀번호를 입력해 주세요.";
      statusEl.className = "status-msg error";
      return;
    }
    loginBtn.disabled = true;
    statusEl.textContent = "";
    try {
      await auth.signInWithEmailAndPassword(email, password);
      localStorage.setItem(AUTH_EMAIL_KEY, email);
      // 성공 시 onAuthStateChanged가 오버레이를 제거
    } catch (error) {
      statusEl.textContent = AUTH_ERROR_MESSAGES[error.code] || "로그인에 실패했습니다. 다시 시도해 주세요.";
      statusEl.className = "status-msg error";
      pwInput.value = "";
      pwInput.focus();
    } finally {
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener("click", signIn);
  overlay.addEventListener("keydown", (e) => { if (e.key === "Enter") signIn(); });
  return overlay;
}

function signOutInstructor() {
  return firebase.auth().signOut();
}
