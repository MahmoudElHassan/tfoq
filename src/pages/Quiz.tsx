import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RotateCw, Trophy, X, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site/SiteNav";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type Question = {
  id: string;
  question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: string;
  explanation: string | null;
  points: number;
  difficulty: string;
};

type Subject = { id: string; name: string; type: string };

const Quiz = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const subjectId = params.get("subject");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const load = async () => {
      const { data: subs } = await supabase.from("subjects").select("*").order("type");
      setSubjects(subs ?? []);
      let q = supabase.from("questions").select("*");
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data: qs } = await q;
      setQuestions(qs ?? []);
    };
    if (user) load();
  }, [user, subjectId]);

  const spin = () => {
    const available = questions.filter((q) => !askedIds.has(q.id));
    if (available.length === 0) {
      toast.info("أكملتِ جميع الأسئلة المتاحة!", { description: "أعيدي البدء أو اختاري مادة أخرى" });
      return;
    }
    setSpinning(true);
    setSelected(null);
    setAnswered(false);
    const turns = 5 + Math.random() * 3;
    const newRotation = rotation + turns * 360;
    setRotation(newRotation);

    setTimeout(() => {
      const picked = available[Math.floor(Math.random() * available.length)];
      setCurrentQ(picked);
      setAskedIds(new Set([...askedIds, picked.id]));
      setSpinning(false);
    }, 3500);
  };

  const submitAnswer = async () => {
    if (!selected || !currentQ || !user) return;
    const isCorrect = selected === currentQ.correct_option;
    const earned = isCorrect ? currentQ.points : 0;
    setAnswered(true);

    if (isCorrect) {
      setSessionPoints((p) => p + earned);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }

    const { error } = await supabase.from("quiz_attempts").insert({
      student_id: user.id,
      question_id: currentQ.id,
      selected_option: selected,
      is_correct: isCorrect,
      points_earned: earned,
    });
    if (error) toast.error("تعذّر حفظ الإجابة");
  };

  const next = () => { setCurrentQ(null); setSelected(null); setAnswered(false); };

  const opts = currentQ ? [
    { k: "A", v: currentQ.option_a }, { k: "B", v: currentQ.option_b },
    { k: "C", v: currentQ.option_c }, { k: "D", v: currentQ.option_d },
  ] : [];

  const wheelColors = ["#006C35", "#0d8a45", "#f4b942", "#006C35", "#0d8a45", "#f4b942", "#006C35", "#0d8a45"];

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />

      <div className="container py-8 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold">عجلة الاختبارات</h1>
            <p className="text-muted-foreground mt-2">أديري العجلة لتلقّي سؤال عشوائي</p>
          </div>
          <div className="bg-card rounded-2xl px-6 py-4 shadow-card border border-border flex items-center gap-3">
            <Trophy className="w-6 h-6 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">نقاط هذه الجلسة</p>
              <p className="font-display font-extrabold text-2xl text-primary">{sessionPoints}</p>
            </div>
          </div>
        </div>

        {!subjectId && (
          <div className="mb-8 bg-card rounded-2xl p-5 border border-border shadow-card">
            <p className="text-sm font-bold mb-3">اختاري المادة:</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" className="bg-primary text-primary-foreground">الكل</Button>
              {subjects.map((s) => (
                <Button key={s.id} variant="outline" size="sm"
                  onClick={() => navigate(`/quiz?subject=${s.id}`)}>
                  {s.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* الـ Wheel */}
          <div className="bg-card rounded-3xl p-8 shadow-elegant border border-border flex flex-col items-center" style={{ contain: "layout paint" }}>
            <div className="relative w-72 h-72 lg:w-80 lg:h-80" style={{ isolation: "isolate" }}>
              {/* مؤشر */}
              <div className="absolute -top-2 right-1/2 translate-x-1/2 z-10 w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-destructive drop-shadow-lg" />
              {/* العجلة */}
              <div ref={wheelRef}
                className="w-full h-full rounded-full border-8 border-card shadow-elegant transition-transform ease-out transform-gpu"
                style={{
                  transform: `translateZ(0) rotate(${rotation}deg)`,
                  transitionDuration: spinning ? "3500ms" : "0ms",
                  transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.31, 1)",
                  background: `conic-gradient(${wheelColors.map((c, i) => `${c} ${i * 45}deg ${(i + 1) * 45}deg`).join(", ")})`,
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}>
                      <span className="absolute top-6 left-1/2 -translate-x-1/2 text-primary-foreground font-bold text-sm">؟</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* مركز */}
              <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-card shadow-elegant border-4 border-primary flex items-center justify-center">
                <RotateCw className={`w-8 h-8 text-primary ${spinning ? "animate-spin" : ""}`} />
              </div>
            </div>

            <Button onClick={spin} disabled={spinning || !!currentQ || questions.length === 0}
              className="mt-8 bg-gradient-primary text-primary-foreground hover:opacity-90 h-14 px-12 text-lg shadow-elegant gap-2">
              {spinning ? "جارٍ الاختيار..." : currentQ ? "أجيبي على السؤال" : "أديري العجلة"}
              {!spinning && !currentQ && <RotateCw className="w-5 h-5" />}
            </Button>
            {questions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-4">لا توجد أسئلة في هذه المادة بعد</p>
            )}
          </div>

          {/* السؤال */}
          <div className="bg-card rounded-3xl p-8 shadow-elegant border border-border min-h-[420px]">
            {!currentQ ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-20">
                <Lightbulb className="w-16 h-16 mb-4 text-muted-foreground/40" />
                <p className="text-lg font-medium">سؤالك سيظهر هنا</p>
                <p className="text-sm mt-2">أديري العجلة للبدء!</p>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold bg-accent/15 text-accent-foreground px-3 py-1 rounded-full">
                    {currentQ.points} نقطة
                  </span>
                  <span className="text-xs text-muted-foreground">{currentQ.difficulty === "easy" ? "سهل" : currentQ.difficulty === "medium" ? "متوسط" : "صعب"}</span>
                </div>
                <h3 className="font-display text-xl font-bold mb-6 leading-relaxed">{currentQ.question_text}</h3>
                <div className="space-y-3">
                  {opts.map((opt) => {
                    const isSelected = selected === opt.k;
                    const isCorrect = answered && opt.k === currentQ.correct_option;
                    const isWrong = answered && isSelected && !isCorrect;
                    return (
                      <button key={opt.k} disabled={answered}
                        onClick={() => setSelected(opt.k)}
                        className={`w-full text-right p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isCorrect ? "border-success bg-success/10" :
                          isWrong ? "border-destructive bg-destructive/10" :
                          isSelected ? "border-primary bg-primary/5" :
                          "border-border hover:border-primary/50 hover:bg-secondary/50"
                        }`}>
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                          isCorrect ? "bg-success text-success-foreground" :
                          isWrong ? "bg-destructive text-destructive-foreground" :
                          isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                        }`}>{opt.k}</span>
                        <span className="flex-1">{opt.v}</span>
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-success" />}
                        {isWrong && <XCircle className="w-5 h-5 text-destructive" />}
                      </button>
                    );
                  })}
                </div>

                {answered && currentQ.explanation && (
                  <div className="mt-5 p-4 rounded-xl bg-info/10 border border-info/20">
                    <p className="font-bold text-sm flex items-center gap-2 text-info"><Lightbulb className="w-4 h-4" />الشرح</p>
                    <p className="text-sm mt-2 text-foreground leading-relaxed">{currentQ.explanation}</p>
                  </div>
                )}

                <div className="mt-6 flex gap-2">
                  {!answered ? (
                    <Button onClick={submitAnswer} disabled={!selected}
                      className="flex-1 bg-gradient-primary text-primary-foreground h-12 gap-2">
                      تأكيد الإجابة
                    </Button>
                  ) : (
                    <Button onClick={next} className="flex-1 bg-gradient-primary text-primary-foreground h-12 gap-2">
                      السؤال التالي <ArrowLeft className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="outline" onClick={next} className="h-12">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
