import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  matchFaq,
  routeTopic,
  GUIDED_TOPICS,
  FALLBACK_FAQS,
  type FaqWithKeywords,
  type GuidedTopic,
} from "@/lib/faqMatcher";

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "bot"; text: string; suggestions?: FaqWithKeywords[]; topic?: GuidedTopic }
  | { role: "bot"; text: string; matched?: FaqWithKeywords; topic?: GuidedTopic };

export const FaqChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [faqs, setFaqs] = useState<FaqWithKeywords[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      // Pull active FAQs + keywords. Fall back without keywords / bundled
      // FAQs if migrations are partially applied so the guide UI still works.
      let data: FaqWithKeywords[] | null = null;
      let error: { message: string; code?: string } | null = null;
      {
        const res = await supabase
          .from("faq_entries")
          .select("id,question,answer,keywords")
          .eq("is_active", true)
          .order("sort_order");
        data = (res.data as FaqWithKeywords[] | null) ?? null;
        error = res.error;
      }
      if (error) {
        const code = error.code;
        const missingCol =
          code === "PGRST204" || /column|schema cache/i.test(error.message || "");
        const missingTable =
          code === "PGRST205" || /faq_entries/i.test(error.message || "");
        if (missingCol && !missingTable) {
          const fallback = await supabase
            .from("faq_entries")
            .select("id,question,answer")
            .eq("is_active", true)
            .order("sort_order");
          if (!fallback.error && fallback.data) {
            data = fallback.data as FaqWithKeywords[];
            error = null;
          }
        }
      }
      if (error) {
        setFaqs(FALLBACK_FAQS);
        return;
      }
      setFaqs(
        ((data ?? []) as FaqWithKeywords[]).map((f) => ({
          ...f,
          keywords: f.keywords ?? [],
        })),
      );
    })();
  }, []);

  // Welcome + topic menu when the panel first opens. We use a ref so the
  // effect only fires once per open transition without disabling rules.
  const welcomedRef = useRef(false);
  useEffect(() => {
    if (open && !welcomedRef.current) {
      welcomedRef.current = true;
      setMessages([
        {
          role: "bot",
          text: "مرحباً! اسأليني عن أي شيء يخص المنصة، أو اختاري موضوعاً 👇",
        },
      ]);
    }
    if (!open) welcomedRef.current = false;
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const suggestions = useMemo(() => faqs.slice(0, 4), [faqs]);

  const pushBot = (m: ChatMessage) => setMessages((prev) => [...prev, m]);

  const followUp = () => {
    const follow: ChatMessage = {
      role: "bot",
      text: "هل تحتاجين شيئاً آخر؟ اختاري موضوعاً أو اكتبي سؤالك ✨",
    };
    pushBot(follow);
  };

  /**
   * Combined matcher:
   *   1. Try FAQ match (high / didyoumean / no match).
   *   2. On no match, fall back to topic routing.
   *   3. If still nothing, surface a guided reply linking to the topic
   *      menu so the user can self-serve.
   */
  const handleAsk = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    const result = matchFaq(text, faqs);
    const topic = routeTopic(text);

    if (result.kind === "answer") {
      pushBot({
        role: "bot",
        text: result.faq.answer,
        matched: result.faq,
        topic,
      });
      followUp();
      setLoading(false);
      return;
    }
    if (result.kind === "didyoumean") {
      pushBot({
        role: "bot",
        text: "لم أكن متأكدة. هل تقصدين أحد هذه الأسئلة؟",
        suggestions: result.candidates.map((c) => c.faq),
        topic,
      });
      setLoading(false);
      return;
    }

    // nomatch
    if (topic) {
      pushBot({
        role: "bot",
        text:
          topic.action.kind === "route"
            ? `لم أجد إجابة دقيقة في قاعدة المعرفة، لكن يبدو أن سؤالك عن «${topic.label}». يمكنني أن أوجّهك.`
            : topic.action.label,
        topic,
      });
    } else {
      pushBot({
        role: "bot",
        text:
          "لم أجد إجابة في قاعدة المعرفة. جرّبي أحد المواضيع أدناه أو اختاري سؤالاً مقترحاً.",
      });
    }
    followUp();
    setLoading(false);
  };

  const handleSuggestionClick = (faq: FaqWithKeywords) => {
    setMessages((prev) => [...prev, { role: "user", text: faq.question }]);
    pushBot({
      role: "bot",
      text: faq.answer,
      matched: faq,
      topic: routeTopic(faq.question),
    });
    followUp();
  };

  const handleTopicClick = (t: GuidedTopic) => {
    if (t.action.kind === "route") return; // rendered as a Link, not an action
    handleAsk(t.action.query);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="فتح المساعد الذكي"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-50 w-14 h-14 rounded-full bg-gradient-primary text-primary-foreground shadow-elegant flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-extrabold flex items-center justify-center shadow-soft">؟</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="المساعد الذكي للأسئلة الشائعة"
          className="fixed bottom-5 left-5 z-50 w-[min(92vw,380px)] h-[min(80vh,560px)] rounded-3xl bg-card border border-border shadow-elegant flex flex-col overflow-hidden animate-rise"
        >
          <header className="flex items-center justify-between gap-3 p-4 bg-gradient-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <div>
                <p className="font-display font-extrabold leading-tight">المساعد الذكي</p>
                <p className="text-[11px] opacity-80">قاعدة معرفة الأسئلة الشائعة</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="p-1 rounded hover:bg-primary-foreground/15">
              <X className="w-5 h-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-soft">
            {messages.map((m, i) => (
              <Bubble key={i} m={m} onSuggestion={handleSuggestionClick} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-3 py-2 shadow-card">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Topic menu — shown on first open so the user is never lost. */}
          {messages.length <= 1 && (
            <div className="px-4 pt-2 border-t border-border bg-card">
              <p className="text-[11px] font-bold text-muted-foreground mb-2">اختاري موضوعاً:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {GUIDED_TOPICS.map((t) =>
                  t.action.kind === "route" ? (
                    <Link
                      key={t.id}
                      to={t.action.to}
                      onClick={() => setOpen(false)}
                      className="text-[11px] px-2 py-2 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary transition-colors flex flex-col items-center gap-0.5 text-center"
                    >
                      <span className="text-base leading-none">{t.icon}</span>
                      <span className="font-bold">{t.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTopicClick(t)}
                      className="text-[11px] px-2 py-2 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary transition-colors flex flex-col items-center gap-0.5 text-center"
                    >
                      <span className="text-base leading-none">{t.icon}</span>
                      <span className="font-bold">{t.label}</span>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Free-text suggestions chips (only at start) */}
          {messages.length <= 1 && suggestions.length > 0 && (
            <div className="px-4 pt-3 pb-1 border-t border-border bg-card">
              <p className="text-[11px] font-bold text-muted-foreground mb-2">أسئلة شائعة:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                    className="text-[11px] px-2 py-1 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {s.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); handleAsk(input); }}
            className="flex items-center gap-2 p-3 border-t border-border bg-card"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتبي سؤالك..."
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              dir="rtl"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              aria-label="إرسال"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

const Bubble = ({
  m,
  onSuggestion,
}: {
  m: ChatMessage;
  onSuggestion: (faq: FaqWithKeywords) => void;
}) => {
  const isUser = m.role === "user";
  const text = m.text;
  const topic = "topic" in m ? m.topic : undefined;
  const isDidYouMean = !isUser && "suggestions" in m && Array.isArray((m as { suggestions?: FaqWithKeywords[] }).suggestions);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-card ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm w-full"
        }`}
      >
        <p>{text}</p>

        {/* "Did you mean?" chips */}
        {isDidYouMean && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {((m as { suggestions?: FaqWithKeywords[] }).suggestions ?? []).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSuggestion(s)}
                className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-bold"
              >
                {s.question}
              </button>
            ))}
          </div>
        )}

        {/* Topic CTA — whenever the matched FAQ implies a navigate-able
            destination, surface it as a button so the bot is actionable. */}
        {topic && topic.action.kind === "route" && (
          <Link
            to={topic.action.to}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20"
          >
            <ArrowLeft className="w-3 h-3" /> {topic.action.label}
          </Link>
        )}
      </div>
    </div>
  );
};