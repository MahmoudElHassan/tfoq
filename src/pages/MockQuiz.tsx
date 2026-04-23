import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Lightbulb, Clock, Trophy, RotateCcw, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SiteNav } from "@/components/site/SiteNav";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type TQ = {
  id: string;
  question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: string;
  explanation: string | null;
  points: number;
  position: number;
};
type Template = { id: string; title: string; description: string | null; duration_minutes: number | null };

const MockQuiz = () => {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [template, setTemplate] = useState<Template | null>(null);
  const [questions, setQuestions] = useState<TQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!templateId || !user) return;
    const load = async () => {
      setLoading(true);
      const [tplRes, qsRes] = await Promise.all([
        supabase.from("quiz_templates").select("id,title,description,duration_minutes").eq("id", templateId).maybeSingle(),
        supabase.from("quiz_template_questions").select("*").eq("template_id", templateId).order("position"),
      ]);
      setTemplate(tplRes.data as any);
      setQuestions((qsRes.data ?? []) as TQ[]);
      setSecondsLeft(((tplRes.data as any)?.duration_minutes ?? 30) * 60);
      setLoading(false);
    };
    load();
  }, [templateId, user]);

  // Timer
  useEffect(() => {
    if (!started || finished) return;
    if (secondsLeft <= 0) { finish(); return; }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished, secondsLeft]);

  const total = questions.length;
  const totalPoints = useMemo(() => questions.reduce((a, q) => a + q.points, 0), [questions]);
  const earnedPoints = useMemo(
    () => questions.reduce((a, q) => a + (answers[q.id] === q.correct_option ? q.points : 0), 0),
    [questions, answers]
  );
  const correctCount = useMemo(
    () => questions.filter((q) => answers[q.id] === q.correct_option).length,
    [questions, answers]
  );

  const select = (qid: string, opt: string) => {
    if (revealed[qid]) return;
    setAnswers((a) => ({ ...a, [qid]: opt }));
  };

  const reveal = (qid: string) => setRevealed((r) => ({ ...r, [qid]: true }));

  const next = () => { if (idx < total - 1) setIdx(idx + 1); };
  const prev = () => { if (idx > 0) setIdx(idx - 1); };

  const finish = async () => {
    setFinished(true);
    if (!user) return;
    // record attempts to global quiz_attempts? template questions aren't in `questions` table.
    // We just celebrate locally.
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    if (pct >= 50) confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    toast.success(`أنهيتِ الاختبار! نسبتك ${pct}%`);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <SiteNav />
        <div className="container py-20 text-center text-muted-foreground">جارٍ التحميل...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <SiteNav />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">لم يتم العثور على هذا الاختبار</p>
          <Button onClick={() => navigate("/student")} className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" /> العودة</Button>
        </div>
      </div>
    );
  }

  // Intro screen
  if (!started && !finished) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <SiteNav />
        <div className="container py-12 max-w-2xl">
          <div className="bg-card rounded-3xl p-8 lg:p-10 border border-border shadow-elegant text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center shadow-elegant mb-5">
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-extrabold">{template.title}</h1>
            {template.description && <p className="text-muted-foreground mt-3">{template.description}</p>}
            <div className="grid grid-cols-3 gap-3 mt-8">
              <div className="p-4 rounded-xl bg-secondary/40 border border-border">
                <p className="text-xs text-muted-foreground">الأسئلة</p>
                <p className="font-display text-2xl font-extrabold mt-1">{total}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/40 border border-border">
                <p className="text-xs text-muted-foreground">المدة</p>
                <p className="font-display text-2xl font-extrabold mt-1">{template.duration_minutes ?? 30} د</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/40 border border-border">
                <p className="text-xs text-muted-foreground">النقاط</p>
                <p className="font-display text-2xl font-extrabold mt-1">{totalPoints}</p>
              </div>
            </div>
            <Button onClick={() => setStarted(true)} disabled={total === 0}
              className="mt-8 bg-gradient-primary text-primary-foreground h-14 px-10 text-base font-bold shadow-elegant gap-2">
              ابدئي الاختبار الآن
            </Button>
            {total === 0 && <p className="text-xs text-muted-foreground mt-4">لا توجد أسئلة في هذا الاختبار بعد</p>}
            <Button variant="ghost" onClick={() => navigate("/student")} className="mt-3 gap-2">
              <Home className="w-4 h-4" /> العودة للوحة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Result screen
  if (finished) {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="min-h-screen bg-gradient-soft">
        <SiteNav />
        <div className="container py-10 max-w-3xl space-y-6">
          <div className="bg-card rounded-3xl p-8 border border-border shadow-elegant text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto flex items-center justify-center shadow-elegant mb-4">
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl font-extrabold">انتهى الاختبار!</h2>
            <p className="text-muted-foreground mt-2">{template.title}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                <p className="text-xs text-success">إجابات صحيحة</p>
                <p className="font-display text-2xl font-extrabold text-success mt-1">{correctCount}/{total}</p>
              </div>
              <div className="p-4 rounded-xl bg-info/10 border border-info/20">
                <p className="text-xs text-info">النسبة</p>
                <p className="font-display text-2xl font-extrabold text-info mt-1">{pct}%</p>
              </div>
              <div className="p-4 rounded-xl bg-accent/15 border border-accent/20">
                <p className="text-xs text-accent-foreground">النقاط</p>
                <p className="font-display text-2xl font-extrabold mt-1">{earnedPoints}/{totalPoints}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/40 border border-border">
                <p className="text-xs text-muted-foreground">الوقت المتبقي</p>
                <p className="font-display text-2xl font-extrabold mt-1">{formatTime(secondsLeft)}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Button onClick={() => { setFinished(false); setStarted(false); setIdx(0); setAnswers({}); setRevealed({}); setSecondsLeft((template.duration_minutes ?? 30) * 60); }}
                variant="outline" className="gap-2"><RotateCcw className="w-4 h-4" /> أعيدي المحاولة</Button>
              <Button onClick={() => navigate("/student")} className="bg-gradient-primary text-primary-foreground gap-2">
                <Home className="w-4 h-4" /> العودة للوحة
              </Button>
            </div>
          </div>

          {/* Review */}
          <div className="bg-card rounded-3xl p-6 border border-border">
            <h3 className="font-display text-lg font-bold mb-4">مراجعة الإجابات</h3>
            <div className="space-y-3">
              {questions.map((q, i) => {
                const sel = answers[q.id];
                const ok = sel === q.correct_option;
                return (
                  <div key={q.id} className={`p-4 rounded-xl border-2 ${ok ? "border-success/40 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <div className="flex items-start gap-2">
                      {ok ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <p className="font-bold text-sm">س{i + 1}. {q.question_text}</p>
                        <p className="text-xs text-muted-foreground mt-2">إجابتك: {sel ? `${sel.toUpperCase()} - ${(q as any)[`option_${sel}`]}` : "لم تجيبي"}</p>
                        {!ok && <p className="text-xs text-success mt-1">الصحيحة: {q.correct_option.toUpperCase()} - {(q as any)[`option_${q.correct_option}`]}</p>}
                        {q.explanation && <p className="text-xs mt-2 p-2 rounded bg-info/10 text-info"><Lightbulb className="w-3 h-3 inline ml-1" /> {q.explanation}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz playing screen
  const q = questions[idx];
  const sel = answers[q.id];
  const isRevealed = !!revealed[q.id];
  const opts = [
    { k: "a", v: q.option_a }, { k: "b", v: q.option_b },
    { k: "c", v: q.option_c }, { k: "d", v: q.option_d },
  ];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-6 max-w-3xl space-y-4">
        {/* Header */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-card flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{template.title}</p>
            <p className="font-display font-bold text-sm">السؤال {idx + 1} من {total}</p>
          </div>
          <div className="flex items-center gap-2 bg-secondary/40 px-3 py-2 rounded-xl">
            <Clock className={`w-4 h-4 ${secondsLeft < 60 ? "text-destructive animate-pulse" : "text-primary"}`} />
            <span className={`font-mono font-bold ${secondsLeft < 60 ? "text-destructive" : ""}`}>{formatTime(secondsLeft)}</span>
          </div>
        </div>

        <Progress value={((idx + 1) / total) * 100} className="h-2" />

        {/* Question */}
        <div className="bg-card rounded-3xl p-6 lg:p-8 border border-border shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <Badge className="bg-accent/15 text-accent-foreground border-0">{q.points} نقطة</Badge>
            <p className="text-xs text-muted-foreground">أجبتِ على {answeredCount}/{total}</p>
          </div>
          <h2 className="font-display text-xl font-bold leading-relaxed mb-6">{q.question_text}</h2>

          <div className="space-y-3">
            {opts.map((o) => {
              const isSel = sel === o.k;
              const isCorrect = isRevealed && o.k === q.correct_option;
              const isWrong = isRevealed && isSel && !isCorrect;
              return (
                <button key={o.k} onClick={() => select(q.id, o.k)} disabled={isRevealed}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    isCorrect ? "border-success bg-success/10" :
                    isWrong ? "border-destructive bg-destructive/10" :
                    isSel ? "border-primary bg-primary/5" :
                    "border-border hover:border-primary/50 hover:bg-secondary/40"
                  }`}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    isCorrect ? "bg-success text-success-foreground" :
                    isWrong ? "bg-destructive text-destructive-foreground" :
                    isSel ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}>{o.k.toUpperCase()}</span>
                  <span className="flex-1">{o.v}</span>
                  {isCorrect && <CheckCircle2 className="w-5 h-5 text-success" />}
                  {isWrong && <XCircle className="w-5 h-5 text-destructive" />}
                </button>
              );
            })}
          </div>

          {isRevealed && q.explanation && (
            <div className="mt-5 p-4 rounded-xl bg-info/10 border border-info/20">
              <p className="font-bold text-sm flex items-center gap-2 text-info"><Lightbulb className="w-4 h-4" /> الشرح</p>
              <p className="text-sm mt-2 leading-relaxed">{q.explanation}</p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2">
            <Button variant="outline" onClick={prev} disabled={idx === 0}>السابق</Button>
            {!isRevealed && sel && (
              <Button variant="secondary" onClick={() => reveal(q.id)} className="gap-2">
                <Lightbulb className="w-4 h-4" /> تحقق
              </Button>
            )}
            <div className="flex-1" />
            {idx < total - 1 ? (
              <Button onClick={next} className="bg-gradient-primary text-primary-foreground gap-2">
                التالي <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={finish} className="bg-gradient-primary text-primary-foreground gap-2">
                إنهاء الاختبار
              </Button>
            )}
          </div>
        </div>

        {/* Question navigator */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-3">تنقّلي بين الأسئلة</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((qq, i) => {
              const a = answers[qq.id];
              return (
                <button key={qq.id} onClick={() => setIdx(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold border-2 transition-all ${
                    i === idx ? "border-primary bg-primary text-primary-foreground" :
                    a ? "border-success/40 bg-success/10 text-success" :
                    "border-border bg-secondary/40 hover:border-primary/40"
                  }`}>{i + 1}</button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockQuiz;
