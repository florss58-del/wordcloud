// 한국어 단어 정규화: 조사 제거 + 금칙어 필터
// "수업이", "수업을", "수업은" → "수업" 으로 통일해 집계가 분산되지 않게 한다.

// 길이가 긴 조사부터 검사 (예: "에서"를 "에"보다 먼저)
const JOSA_LIST = [
  "으로부터", "에서부터", "이라고", "라고", "께서", "에게서", "한테서",
  "에서", "에게", "한테", "으로", "이랑", "이나", "부터", "까지",
  "조차", "마저", "처럼", "보다", "마다", "이든", "이며",
  "이", "가", "을", "를", "은", "는", "도", "만", "의", "와", "과", "랑", "로", "나", "요"
].sort((a, b) => b.length - a.length);

// 수업 중 화면에 노출되면 안 되는 단어 (필요 시 추가)
const BANNED_WORDS = [
  "시발", "씨발", "씨빨", "씨팔", "씨바", "시바라", "병신", "빙신", "존나", "졸라",
  "개새끼", "새끼", "미친놈", "미친년", "지랄", "좆", "꺼져", "꺼저", "닥쳐", "썅",
  "엿같", "개년", "걸레년", "창녀", "니애미", "니미럴", "느금", "뒤져라", "뒈져",
  "등신", "호구새끼", "싸가지없", "쓰레기같", "죽어라", "자살해"
];

// 장난·비하성 단어 — 욕설은 아니지만 수업 화면에 어울리지 않는 단어 (필요 시 추가)
const JOKE_WORDS = [
  "메롱", "바보", "멍청이", "멍충이", "멍청", "찌질", "똥멍청",
  "응가", "어쩔티비", "저쩔티비", "안물안궁", "어쩔래미", "쭈글이",
  "루저", "빡대가리", "돌대가리", "밥맛", "재수없"
];

// 문장형 어미 — 단어 끝에 붙으면 제거해 같은 단어로 집계 (예: "행복해요" → "행복")
// 명사에 잘 안 붙는 어미만 넣어 오작동을 줄인다
const SENTENCE_ENDINGS = [
  "입니다", "습니다", "거든요", "이에요", "예요", "네요", "군요", "지요",
  "데요", "어요", "아요", "해요", "했다", "하다", "했음", "죠"
].sort((a, b) => b.length - a.length);

// 단독으로는 의미가 약해 클라우드 품질을 떨어뜨리는 단어
const STOP_WORDS = ["그리고", "그냥", "근데", "그런데", "이거", "저거", "그거", "것"];

// 끝 글자가 조사처럼 보이지만 단어의 일부인 경우 — 조사 제거를 건너뛴다 (필요 시 추가)
const PROTECTED_WORDS = new Set([
  "에이아이", "어린이", "고양이", "호랑이", "원숭이", "돌고래",
  "난이도", "만족도", "완성도", "집중도", "이해도", "자유도",
  "동아리", "우렁이", "지팡이", "할아버지", "어버이"
]);

// 같은 대상을 가리키는 표기·오타를 대표 이름 하나로 합친다.
// 집계가 갈리면 "챗GPT"가 여러 조각으로 쪼개져 워드클라우드의 메시지가 흐려진다.
const WORD_ALIASES = [
  ["챗GPT", ["챗지피티", "쳇지피티", "챗치피티", "쳇치피티", "챗지피디", "챗지티피", "챗지비티",
    "첫지피티", "첫지피터", "챗지파티", "캣지피티", "채지피티", "지피티", "지피디",
    "chatgpt", "chatgft", "chatgtp", "챗gpt", "쳇gpt", "gpt", "openai", "오픈ai"]],
  ["제미나이", ["제미나이", "제미나", "제미니", "재미나이", "재미나", "에미나", "저미나이", "지미나이",
    "gemini", "gimini", "jemini"]],
  ["클로드", ["클로드", "클로드ai", "claude"]],
  ["수노", ["수노", "스노", "suno"]],
  ["구글", ["구글ai", "구글", "google"]],
  ["그록", ["그록", "그룩", "grok"]],
  ["뤼튼", ["뤼튼", "뤼든", "wrtn"]],
  ["캔바", ["캔바", "칸바", "canva"]],
  ["퍼플렉시티", ["퍼플렉시티", "perplexity"]],
  ["코파일럿", ["코파일럿", "copilot"]],
  ["나노바나나", ["나노바나나", "나노바나", "nanobanana"]],
  ["콴다", ["콴다", "qanda"]],
  ["제타", ["제타ai", "zetaai", "zeta"]],
  ["없음", ["없습니다", "없어요", "없음", "없다", "모르겠", "모름", "안써봤", "사용안"]]
];

// 긴 별칭부터 검사 (예: "챗지피티"를 "지피티"보다 먼저 지운다)
const ALIAS_PAIRS = WORD_ALIASES
  .flatMap(([canonical, aliases]) => aliases.map((alias) => [alias, canonical]))
  .sort((a, b) => b[0].length - a[0].length);

/**
 * 한 사람이 적은 답에서 아는 이름들을 뽑아 대표 이름으로 바꾼다.
 * "챗지피티제미나이구글"처럼 여러 개를 붙여 쓴 답도 각각으로 나눈다.
 * 아는 이름이 하나도 없으면 원래 단어를 그대로 돌려준다.
 * @returns {string[]}
 */
function expandAliases(word) {
  if (typeof word !== "string" || !word) return [];
  let rest = word.toLowerCase();
  const found = [];
  for (const [alias, canonical] of ALIAS_PAIRS) {
    if (!rest.includes(alias)) continue;
    rest = rest.split(alias).join(" ");
    if (!found.includes(canonical)) found.push(canonical);
  }
  return found.length ? found : [word];
}

/**
 * 입력 문자열을 정규화된 단어로 변환한다.
 * @returns {string} 정규화된 단어. 유효하지 않으면 빈 문자열.
 */
function normalizeWord(raw) {
  if (typeof raw !== "string") return "";
  // 공백·문장부호·특수문자 제거 (한글, 영문, 숫자만 유지)
  let word = raw.trim().replace(/[^가-힣a-zA-Z0-9]/g, "");
  if (!word) return "";
  word = word.toLowerCase();

  // 3글자 이상 한글 단어만 어미·조사 제거 시도, 제거 후 2글자 이상 남아야 적용
  // 단, 보호 단어(끝 글자가 조사처럼 보이는 명사)는 그대로 둔다
  if (/^[가-힣]+$/.test(word) && word.length >= 3 && !PROTECTED_WORDS.has(word)) {
    for (const ending of SENTENCE_ENDINGS) {
      if (word.endsWith(ending) && word.length - ending.length >= 2) {
        word = word.slice(0, word.length - ending.length);
        break;
      }
    }
    for (const josa of JOSA_LIST) {
      if (word.endsWith(josa) && word.length - josa.length >= 2) {
        word = word.slice(0, word.length - josa.length);
        break;
      }
    }
  }

  if (word.length > 12) word = word.slice(0, 12);
  return word;
}

/** 금칙어 포함 여부 */
function isBannedWord(word) {
  return BANNED_WORDS.some((banned) => word.includes(banned));
}

/** 장난 단어 포함 여부 */
function isJokeWord(word) {
  return JOKE_WORDS.some((joke) => word.includes(joke));
}

/** 불용어 여부 */
function isStopWord(word) {
  return STOP_WORDS.includes(word);
}

/**
 * 문구 모드용 검증: 띄어쓰기를 허용하고 조사·어미는 건드리지 않는다. (최대 30자)
 */
function validatePhrase(raw) {
  if (typeof raw !== "string") return { ok: false, word: "", reason: "내용을 입력해 주세요." };
  let phrase = raw.trim().replace(/\s+/g, " ").replace(/[^가-힣a-zA-Z0-9 ]/g, "").trim();
  if (!phrase) return { ok: false, word: "", reason: "내용을 입력해 주세요." };
  if (phrase.length > 30) phrase = phrase.slice(0, 30).trim();
  const compact = phrase.replace(/ /g, "");
  if (isBannedWord(compact)) return { ok: false, word: phrase, reason: "사용할 수 없는 표현이 있어요." };
  if (isJokeWord(compact)) return { ok: false, word: phrase, reason: "장난 표현 대신 진짜 생각을 적어주세요 😊" };
  return { ok: true, word: phrase, reason: "" };
}

/**
 * 제출 전 최종 검증. { ok, word, reason } 을 반환한다.
 */
function validateWord(raw) {
  if (typeof raw === "string" && /\s/.test(raw.trim())) {
    return { ok: false, word: "", reason: "띄어쓰기 없이 단어 하나만 적어주세요. (예: 행복)" };
  }
  const word = normalizeWord(raw);
  if (!word) return { ok: false, word: "", reason: "단어를 입력해 주세요." };
  if (word.length < 1) return { ok: false, word, reason: "너무 짧은 단어예요." };
  if (isBannedWord(word)) return { ok: false, word, reason: "사용할 수 없는 단어예요." };
  if (isJokeWord(word)) return { ok: false, word, reason: "장난 단어 대신 진짜 생각을 적어주세요 😊" };
  if (isStopWord(word)) return { ok: false, word, reason: "조금 더 구체적인 단어로 적어주세요." };
  return { ok: true, word, reason: "" };
}
