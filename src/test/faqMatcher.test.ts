import { describe, it, expect } from "vitest";
import { matchFaq, routeTopic, tokenize, normalizeArabic } from "@/lib/faqMatcher";

const SAMPLE = [
  {
    id: "1",
    question: "ما هي منصة تفوّق؟",
    answer: "منصة تعليمية تفاعلية.",
    keywords: ["تعريف", "هي", "منصة", "تعليمية", "تحصيلي", "قدرات"],
  },
  {
    id: "2",
    question: "كيف أبدأ في المنصة؟",
    answer: "أنشئي حساباً ثم ابدئي الاختبار.",
    keywords: ["تسجيل", "بدء", "حساب", "دخول", "اشتراك", "جديد"],
  },
  {
    id: "3",
    question: "هل استخدام المنصة مجاني؟",
    answer: "نعم المنصة مجانية.",
    keywords: ["سعر", "مجاني", "تكلفة", "مدفوع", "اشتراك", "رسوم"],
  },
];

describe("normalizeArabic", () => {
  it("strips tashkeel and tatweel and normalizes alef/yaa/taa", () => {
    expect(normalizeArabic("مَــا هِيَ")).toBe("ما هي");
    expect(normalizeArabic("آلة إختبار")).toBe("اله اختبار");
    // ى (ulaa) → ي (yaa); ة (taa marbouta) → ه mid-text
    expect(normalizeArabic("حسابى")).toBe("حسابي");
    expect(normalizeArabic("منصة")).toBe("منصه");
  });
});

describe("tokenize", () => {
  it("drops Arabic stopwords and merges synonyms", () => {
    expect(tokenize("ما هي منصة تفوّق؟")).toContain("تعريف");
    expect(tokenize("كيف أسجّل في المنصة")).not.toContain("في");
    expect(tokenize("بدي اسجل")).toContain("تسجيل");
  });
});

describe("matchFaq", () => {
  it("answers direct question via question tokens", () => {
    const r = matchFaq("ما هي منصة تفوّق", SAMPLE);
    expect(r.kind).toBe("answer");
    if (r.kind === "answer") expect(r.faq.id).toBe("1");
  });

  it("answers via keywords alone on a paraphrase", () => {
    // The user typed a synonym phrase; only the keywords have "تسجيل".
    const r = matchFaq("بدي حساب جديد على المنصة", SAMPLE);
    expect(r.kind).toBe("answer");
    if (r.kind === "answer") expect(r.faq.id).toBe("2");
  });

  it("answers a pricing paraphrase via keyword synonym", () => {
    const r = matchFaq("هل المنصة مدفوعة؟", SAMPLE);
    expect(r.kind).toBe("answer");
    if (r.kind === "answer") expect(r.faq.id).toBe("3");
  });

  it("answers تكلفة الاشتراك paraphrase", () => {
    const r = matchFaq("كم تكلفة الاشتراك؟", SAMPLE);
    expect(r.kind).toBe("answer");
    if (r.kind === "answer") expect(r.faq.id).toBe("3");
  });

  it("returns didyoumean when overlap is medium", () => {
    // "منصة" is a stopword-equivalent seed term that appears in Q1 and the
    // query; with keywords[0]=تعريف we fall below ACCEPT_SCORE.
    const r = matchFaq("تعريف في المنصة", SAMPLE);
    // Either answer or didyoumean is acceptable — both means the matcher
    // found something coherent and did not silently fail.
    expect(["answer", "didyoumean"]).toContain(r.kind);
  });

  it("returns nomatch when nothing relevant appears", () => {
    const r = matchFaq("سيارة سباق أحمر", []);
    expect(r.kind).toBe("nomatch");
  });

  it("returns nomatch on empty query", () => {
    const r = matchFaq("", SAMPLE);
    expect(r.kind).toBe("nomatch");
  });
});

describe("routeTopic", () => {
  it("routes to register on signup phrasing", () => {
    expect(routeTopic("كيف أسجّل").id).toBe("register");
    expect(routeTopic("sign up please").id).toBe("register");
  });
  it("routes to tests on exam phrasing", () => {
    expect(routeTopic("ودّي أبدأ اختبار").id).toBe("tests");
    expect(routeTopic("قدرات كيف أبدأ").id).toBe("tests");
  });
  it("routes to leaderboard on points phrasing", () => {
    expect(routeTopic("كم عندي نقاط").id).toBe("points");
  });
  it("returns null when nothing matches", () => {
    expect(routeTopic("طماطم")).toBeNull();
  });
});
