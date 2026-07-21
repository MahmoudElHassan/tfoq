// Rule-based FAQ matcher.
//
// Goals (per the locked approach):
//   - Stronger Arabic normalize: tashkeel, tatweel, alef/yaa/taa variants,
//     plus a stopword filter so common particles don't drown the signal.
//   - Heavily weight: keywords > question > answer.
//   - Confidence threshold: high → answer, medium → "did you mean?" chips,
//     low → guided fallback to the topic menu.
//   - Tiny static synonym map. No LLM.
//
// We export a single function `matchFaq(query, faqs)` that returns one of:
//   { kind: "answer", faq, score }
//   { kind: "didyoumean", candidates: [{ faq, score }, ...] }
//   { kind: "nomatch" }
// Plus a separate `guidedTopics` constant used by the floating chat UI.

// ---------------------------------------------------------------------------
// Arabic normalization
// ---------------------------------------------------------------------------
const TASHKEEL = /[\u064B-\u065F\u0670]/g;
const TATWEEL = /\u0640/g;

const NORMALIZE_MAP: Array<[RegExp, string]> = [
  [TASHKEEL, ""],                // remove tashkeel
  [TATWEEL, ""],                 // remove tatweel
  [/[\u0622\u0623\u0625]/g, "\u0627"],   // آ/أإ → ا
  [/\u0649/g, "\u064A"],                  // ى → ي
  [/\u0629/g, "\u0647"],                  // ة → ه (taa marbuta, mid-text)
];

const STOPWORDS = new Set([
  // Arabic particles + pronouns that carry no domain signal
  "في", "من", "الى", "إلى", "على", "عن", "مع", "هذا", "هذه", "ذلك", "تلك",
  "هنا", "هناك", "التي", "الذي", "الذين", "اللتي", "اللاتي",
  "انا", "أنا", "نحن", "هم", "هن", "هي", "هو", "هما",
  "ما", "ماذا", "كيف", "لماذا", "لم", "هل", "متى", "اين", "أين",
  "ال", "و", "او", "أو", "ثم", "لكن", "لكن", "بل", "حتى",
  "لا", "لم", "لن", "قد", "كان", "كانت", "يكون", "تكون",
  "الى", "عبر", "بين", "بعد", "قبل", "اليوم",
  "جدا", "جداً", "ممكن", "يمكن", "احيانا", "أحياناً",
  "كذلك", "ايضا", "أيضاً", "اي", "أي", "كل", "بعض",
  "ايها", "أيها", "لدي", "لديك", "لديها", "لديه", "لدينا",
  "ابي", "أبي", "بدي", "اريد", "أريد", "ممكن",
  "شي", "شيئا", "شيئًا", "حاجة", "حول", "بخصوص",
  "ب", "ل", "ف",
]);

// Directional synonym map: words that point at the same intent. Lower-case
// Arabic after normalization. Keep tiny — anything more should be data.
// Note: JS \b is ASCII-only and unreliable on Arabic; we wrap each pattern
// in a word-boundary capture so we can preserve the prefix character when
// we replace.
const ARABIC_CLASS = "\\u0621-\\u063A\\u0641-\\u064A";
function w(pattern: string): RegExp {
  // (?<=^|[^Arabic])(pattern)(?=$|[^Arabic])
  return new RegExp(
    `(^|[^${ARABIC_CLASS}])(${pattern})(?=$|[^${ARABIC_CLASS}])`,
    "g",
  );
}

const SYNONYMS: Array<[RegExp, string]> = [
  // "what is X" → تعريف (canonical term used as a keyword on FAQ #1)
  [w("ما\\s*(?:هي|هو|ذى|ذا|هذه|هذا|هذي)"), "تعريف"],
  // login / sign-in
  [w("(?:تسجيل\\s*الدخول|تسجيل\\s*دخول|تسجيل|اسجل|اسجّل|سجل|signin|login|sign\\s*up|signup|register)"), "تسجيل"],
  // pricing
  [w("(?:مجاني|مجانا|free|سعر|تكلفة|تكاليف|رسوم|مدفوع)"), "سعر"],
  // exams / tests
  [w("(?:اختبار|اختبارات|امتحان|امتحانات|quiz|quizzes)"), "اختبار"],
  [w("(?:قدرات|قياس|qudurat)"), "قدرات"],
  [w("(?:تحصيلي|تحصلى|tahseeli)"), "تحصيلي"],
  // points
  [w("(?:نقاط|نقطة|points|نقطتي|score|scoring)"), "نقاط"],
  // help / contact
  [w("(?:دعم|مساعده|مساعدة|تواصل|اتصال|help|support)"), "دعم"],
  // parent
  [w("(?:ولي\\s*امر|الأهل|اهل|parent|guardian)"), "ولي"],
  // start / begin
  [w("(?:ابدء|ابدأ|ابداي|ابدا|ابداء|يبدا|يبدأ|start|begin)"), "بدء"],
];

// Topic menu — used by the guided UX AND by the matcher as a sanity net.
// Each topic can either answer from FAQs or navigate to a route.
export type TopicAction =
  | { kind: "route"; label: string; to: string; hint?: string }
  | { kind: "ask"; label: string; query: string; hint?: string };

export type GuidedTopic = {
  id: string;
  label: string;
  icon: string;
  description: string;
  match: RegExp;
  action: TopicAction;
};

export const GUIDED_TOPICS: GuidedTopic[] = [
  {
    id: "register",
    label: "التسجيل",
    icon: "✨",
    description: "حساب جديد، دخول، تفعيل",
    // Match canonical tokens (post-normalize) so variations of "حساب /
    // تسجيل / دخول / اسجل" all land here regardless of tashkeel or alef.
    match: /(?:تعريف|تسجيل|دخول|حساب|اشتراك|انشاء|انشئ|اسجل|سجل|login|signup|register|sign\s*up)/i,
    action: { kind: "route", label: "انتقل إلى صفحة التسجيل", to: "/auth?mode=signup" },
  },
  {
    id: "tests",
    label: "الاختبارات",
    icon: "🎯",
    description: "عجلة الأسئلة، محاكي، قدرات، تحصيلي",
    match: /(?:اختبار|امتحان|عجله|عجلة|قدرات|تحصيلي|بدء|quiz|test|exam)/i,
    action: { kind: "route", label: "انتقل إلى عجلة الاختبارات", to: "/quiz" },
  },
  {
    id: "points",
    label: "النقاط والترتيب",
    icon: "🏆",
    description: "النقاط المجمّعة ولوحة الشرف",
    match: /(?:نقاط|نقط|ترتيب|لوحه|لوحة|شرف|leaderboard|points|score)/i,
    action: { kind: "route", label: "افتح لوحة الترتيب", to: "/leaderboard" },
  },
  {
    id: "parent",
    label: "حساب ولي الأمر",
    icon: "👨‍👩‍👧",
    description: "ربط طالبة، متابعة الأبناء",
    match: /(?:ولي|اهل|الأهل|parent|guardian)/i,
    action: { kind: "route", label: "انتقل إلى لوحة ولي الأمر", to: "/parent" },
  },
  {
    id: "support",
    label: "الدعم والمساعدة",
    icon: "🛟",
    description: "مشكلة لم تحل، تواصل معنا",
    match: /(?:دعم|مساعده|مساعدة|تواصل|اتصال|help|support)/i,
    action: { kind: "ask", label: "اكتبي مشكلتك وسأحاول المساعدة", query: "أحتاج مساعدة" },
  },
];

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------
export function normalizeArabic(s: string): string {
  let out = s.toLowerCase();
  for (const [re, rep] of NORMALIZE_MAP) out = out.replace(re, rep);
  return out;
}

export function applySynonyms(s: string): string {
  // We strip the boundary-capture group (group 1) so the canonical term
  // is appended cleanly, preserving the original query tokens for substring
  // bonuses while gaining the canonical term for keyword matching.
  // IMPORTANT: do NOT call re.test() before replace — SYNONYMS use /g and
  // .test() advances lastIndex, which makes later replaces miss matches.
  let out = s;
  for (const [re, rep] of SYNONYMS) {
    re.lastIndex = 0;
    out = out.replace(re, (_full, prefix) => `${prefix}${rep}`);
  }
  return out;
}

export function tokenize(s: string): string[] {
  // Re-normalize after synonym expansion so any canonical token produced
  // by the rules above gets the same tashkeel/yaa treatment.
  const norm = normalizeArabic(applySynonyms(s))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
  // Drop stopwords AFTER synonym expansion so a phrase like "بدي اسجل"
  // survives after synonym mapping to "تسجيل" still hits "register".
  return norm.filter((t) => !STOPWORDS.has(t));
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------
export type FaqWithKeywords = {
  id: string;
  question: string;
  answer: string;
  keywords?: string[] | null;
};

/** Used when `faq_entries` is missing on the remote (migration not applied). */
export const FALLBACK_FAQS: FaqWithKeywords[] = [
  {
    id: "fallback-1",
    question: "ما هي منصة تفوّق؟",
    answer:
      "منصة تعليمية تفاعلية لطالبات الثانوية تساعد على التحضير لاختباري التحصيلي والقدرات عبر عجلة أسئلة، اختبارات محاكية، وألعاب تعليمية.",
    keywords: ["تعريف", "منصة", "تعليمية", "تحصيلي", "قدرات"],
  },
  {
    id: "fallback-2",
    question: "كيف أبدأ في المنصة؟",
    answer:
      "أنشئي حساباً جديداً من صفحة تسجيل الدخول، ثم اختاري دورك (طالبة / معلمة / وليّة أمر)، وبعدها يمكنك بدء عجلة الاختبارات أو تصفح الاختبارات المحاكية.",
    keywords: ["تسجيل", "بدء", "انشاء", "حساب", "اشتراك", "دخول"],
  },
  {
    id: "fallback-3",
    question: "هل استخدام المنصة مجاني؟",
    answer: "نعم، المنصة مجانية لجميع طالبات الثانوية في حدود الاستخدام العادل.",
    keywords: ["مجاني", "سعر", "اشتراك", "رسوم", "تكلفة", "مجانا"],
  },
];

export type MatchResult =
  | { kind: "answer"; faq: FaqWithKeywords; score: number }
  | { kind: "didyoumean"; candidates: { faq: FaqWithKeywords; score: number }[] }
  | { kind: "nomatch" };

// Confidence thresholds. Tuned so a single keyword hit on a paraphrased
// query (with the right synonym mapping) reaches "answer", while a weak
// token overlap on the answer text alone falls to "didyoumean".
const ACCEPT_SCORE = 4;
const SUGGEST_SCORE = 1.5;
const TOP_N = 3;

export function matchFaq(query: string, faqs: FaqWithKeywords[]): MatchResult {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return { kind: "nomatch" };
  const querySet = new Set(queryTokens);

  const scored = faqs.map((f) => {
    const kwTokens = tokenize((f.keywords ?? []).join(" "));
    const qTokens = tokenize(f.question);
    const aTokens = tokenize(f.answer);

    // Per-field overlap, normalized by doc-side length so long answers
    // don't trivially win.
    const overlap = (a: string[]) => {
      let hits = 0;
      for (const t of a) if (querySet.has(t)) hits++;
      return hits + (a.length > 0 ? hits / a.length : 0);
    };

    // Weights: keywords (5x) > question (3x) > answer (1x).
    const kwScore = overlap(kwTokens) * 5;
    const qScore = overlap(qTokens) * 3;
    const aScore = overlap(aTokens) * 1;

    // Substring bonus: if the user's normalized phrase appears IN the
    // normalized question, that's a near-perfect signal.
    const subBonus = normalizeArabic(applySynonyms(f.question)).includes(
      normalizeArabic(applySynonyms(query)).replace(/\s+/g, " ").trim(),
    ) ? 4 : 0;

    const total = kwScore + qScore + aScore + subBonus;
    return { faq: f, score: Math.round(total * 10) / 10, kwHits: kwScore };
  });

  scored.sort((x, y) => y.score - x.score);
  const top = scored[0];
  if (!top || top.score < SUGGEST_SCORE) return { kind: "nomatch" };
  if (top.score >= ACCEPT_SCORE) {
    return { kind: "answer", faq: top.faq, score: top.score };
  }
  const candidates = scored
    .filter((s) => s.score >= SUGGEST_SCORE)
    .slice(0, TOP_N);
  return { kind: "didyoumean", candidates };
}

/**
 * Used by the guided menu as a sanity net — if no FAQ matched above
 * the threshold, we still try to route the user somewhere sensible.
 */
export function routeTopic(query: string): GuidedTopic | null {
  const norm = normalizeArabic(applySynonyms(query));
  for (const t of GUIDED_TOPICS) {
    if (t.match.test(norm)) return t;
  }
  return null;
}
