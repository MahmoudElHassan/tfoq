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

type AssistResponse =
  | { ok: true; reply: string; route: string | null; routeLabel: string | null; remaining: number }
  | { ok: false; code: string; message: string; remaining?: number; retryAfterSeconds?: number };

type ChatMessage =
  | { role: "user"; text: string }
  | {
      role: "bot";
      text: string;
      suggestions?: FaqWithKeywords[];
      topic?: GuidedTopic;
      matched?: FaqWithKeywords;
      route?: string | null;
      routeLabel?: string | null;
      remaining?: number;
    };

type FaqChatbotMode = "public" | "student" | "teacher" | "parent" | "admin";

type FaqChatbotProps = {
  mode?: FaqChatbotMode;
};

const WELCOME_BY_MODE: Record<FaqChatbotMode, string> = {
  public: "مرحباً! اسأل عن أي شيء يخص المنصة، أو اختر موضوعاً 👇",
  student: "مرحباً! أنا مساعدك في المنصة — اسأل عن الاختبارات أو النقاط أو أي شيء 👇",
  teacher: "مرحباً! أنا مساعدك كمعلم — اسأل عن إدارة المحتوى أو استخدام المنصة 👇",
  parent: "مرحباً! أنا مساعدك كولي أمر — اسأل عن متابعة الطالب أو استخدام المنصة 👇",
  admin: "مرحباً! أنا مساعدك كمسؤول — اسأل عن إدارة المنصة أو المساعد الذكي 👇",
};

const SUBTITLE_BY_MODE: Record<FaqChatbotMode, string> = {
  public: "قاعدة معرفة الأسئلة الشائعة",
  student: "مساعدك في المنصة",
  teacher: "مساعد المعلم",
  parent: "مساعد ولي الأمر",
  admin: "مساعد المسؤول",
};

function buildAssistHistory(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "bot")
    .slice(-6)
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text.trim().slice(0, 1000),
    }))
    .filter((m) => m.content.length > 0);
}

function nomatchFallback(topic: GuidedTopic | null) {
  if (topic) {
    return {
      role: "bot" as const,
      text:
        topic.action.kind === "route"
          ? `لم أجد إجابة دقيقة في قاعدة المعرفة، لكن يبدو أن سؤالك عن «${topic.label}». يمكنني أن أوجّهك.`
          : topic.action.label,
      topic,
    };
  }
  return {
    role: "bot" as const,
    text: "لم أجد إجابة في قاعدة المعرفة. جرّب أحد المواضيع أدناه أو اختر سؤالاً مقترحاً.",
  };
}

export const FaqChatbot = ({ mode = "public" }: FaqChatbotProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [faqs, setFaqs] = useState<FaqWithKeywords[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
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

  const welcomedRef = useRef(false);
  useEffect(() => {
    if (open && !welcomedRef.current) {
      welcomedRef.current = true;
      setMessages([
        {
          role: "bot",
          text: WELCOME_BY_MODE[mode],
        },
      ]);
    }
    if (!open) welcomedRef.current = false;
  }, [open, mode]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const suggestions = useMemo(() => faqs.slice(0, 4), [faqs]);

  const pushBot = (m: ChatMessage) => setMessages((prev) => [...prev, m]);

  const followUp = () => {
    pushBot({
      role: "bot",
      text: "هل تحتاج شيئاً آخر؟ اختر موضوعاً أو اكتب سؤالك ✨",
    });
  };

  const invokeAssist = async (text: string, priorMessages: ChatMessage[]): Promise<AssistResponse | null> => {
    const body = {
      message: text,
      history: buildAssistHistory(priorMessages),
    };

    // Optional local override for `supabase functions serve` during hybrid local
    // testing. Production / hosted builds must leave this unset so the client
    // calls the deployed cloud function via supabase.functions.invoke.
    const localFunctionsUrl = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined)?.replace(
      /\/$/,
      "",
    );

    if (localFunctionsUrl) {
      try {
        const localAnon =
          (import.meta.env.VITE_SUPABASE_FUNCTIONS_ANON_KEY as string | undefined) ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
        const { data: sessionData } = await supabase.auth.getSession();
        // Prefer the signed-in cloud session so quotas key by user:<id>, not shared guest IP.
        const token = sessionData.session?.access_token ?? localAnon;
        const res = await fetch(`${localFunctionsUrl}/faq-assist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: localAnon,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (data && typeof data === "object" && "ok" in data) return data as AssistResponse;
        return null;
      } catch {
        return null;
      }
    }

    // Cloud path: supabase-js attaches the current user JWT automatically,
    // so quotas are isolated per authenticated account (20/day) or guest IP (5/day).
    const { data, error } = await supabase.functions.invoke("faq-assist", { body });
    if (data && typeof data === "object" && "ok" in data) return data as AssistResponse;

    // Non-2xx responses (quota / AI_UNAVAILABLE) often land in error.context.
    const ctx = (error as { context?: Response } | null)?.context;
    if (ctx) {
      try {
        const parsed = await ctx.json();
        if (parsed && typeof parsed === "object" && "ok" in parsed) {
          return parsed as AssistResponse;
        }
      } catch {
        // ignore parse failures
      }
    }
    return null;
  };

  const handleAsk = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || loading) return;

    setLoading(true);
    const priorMessages = messages;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    try {
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
        return;
      }

      if (result.kind === "didyoumean") {
        pushBot({
          role: "bot",
          text: "لم أكن متأكداً. هل تقصد أحد هذه الأسئلة؟",
          suggestions: result.candidates.map((c) => c.faq),
          topic,
        });
        return;
      }

      const assist = await invokeAssist(text, priorMessages);

      if (assist?.ok) {
        pushBot({
          role: "bot",
          text: assist.reply,
          route: assist.route,
          routeLabel: assist.routeLabel,
          remaining: assist.remaining,
          topic: topic ?? undefined,
        });
        followUp();
        return;
      }

      if (assist && !assist.ok) {
        if (assist.message) {
          pushBot({ role: "bot", text: assist.message });
          followUp();
          return;
        }
      }

      pushBot(nomatchFallback(topic));
      followUp();
    } finally {
      setLoading(false);
    }
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
    if (t.action.kind === "route") return;
    void handleAsk(t.action.query);
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
                <p className="text-[11px] opacity-80">{SUBTITLE_BY_MODE[mode]}</p>
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

          {messages.length <= 1 && (
            <div className="px-4 pt-2 border-t border-border bg-card">
              <p className="text-[11px] font-bold text-muted-foreground mb-2">اختر موضوعاً:</p>
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
            onSubmit={(e) => {
              e.preventDefault();
              void handleAsk(input);
            }}
            className="flex items-center gap-2 p-3 border-t border-border bg-card"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك..."
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
  const topic = m.role === "bot" ? m.topic : undefined;
  const aiRoute = m.role === "bot" ? m.route : undefined;
  const aiRouteLabel = m.role === "bot" ? m.routeLabel : undefined;
  const remaining = m.role === "bot" ? m.remaining : undefined;
  const isDidYouMean = !isUser && "suggestions" in m && Array.isArray(m.suggestions);

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

        {typeof remaining === "number" && (
          <p className="mt-1 text-[10px] text-muted-foreground">متبقي اليوم: {remaining}</p>
        )}

        {isDidYouMean && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(m.suggestions ?? []).map((s) => (
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

        {aiRoute && (
          <Link
            to={aiRoute}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20"
          >
            <ArrowLeft className="w-3 h-3" /> {aiRouteLabel || "انتقل"}
          </Link>
        )}

        {topic && topic.action.kind === "route" && !aiRoute && (
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
