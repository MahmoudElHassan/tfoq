import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, BookOpen, TrendingUp, Sparkles, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/site/SiteNav";
import { Button } from "@/components/ui/button";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, correct: 0, rank: 0 });
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p);

      const { data: attempts } = await supabase.from("quiz_attempts")
        .select("*, questions(question_text)").eq("student_id", user.id)
        .order("attempted_at", { ascending: false }).limit(5);
      setRecentAttempts(attempts ?? []);

      const { count: total } = await supabase.from("quiz_attempts")
        .select("*", { count: "exact", head: true }).eq("student_id", user.id);
      const { count: correct } = await supabase.from("quiz_attempts")
        .select("*", { count: "exact", head: true }).eq("student_id", user.id).eq("is_correct", true);

      const { data: all } = await supabase.from("profiles")
        .select("id, total_points").order("total_points", { ascending: false });
      const rank = (all ?? []).findIndex((x: any) => x.id === user.id) + 1;
      setStats({ total: total ?? 0, correct: correct ?? 0, rank });

      const { data: subs } = await supabase.from("subjects").select("*");
      setSubjects(subs ?? []);
    };
    load();
  }, [user]);

  if (!profile) return <div className="min-h-screen bg-gradient-soft"><SiteNav /><div className="container py-20 text-center">جارٍ التحميل...</div></div>;

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-10">
        {/* Welcome */}
        <div className="bg-gradient-primary rounded-3xl p-8 lg:p-10 text-primary-foreground shadow-elegant mb-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-primary-foreground/80 flex items-center gap-2"><Sparkles className="w-4 h-4" /> أهلاً بكِ مجدداً</p>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold mt-2">{profile.full_name}</h1>
              {profile.grade && <p className="text-primary-foreground/80 mt-1">{profile.grade}</p>}
            </div>
            <Button onClick={() => navigate("/quiz")}
              className="bg-accent text-accent-foreground hover:bg-accent/90 h-14 px-8 text-base font-bold shadow-elegant">
              ابدئي اختباراً جديداً ←
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { l: "إجمالي النقاط", v: profile.total_points, icon: Trophy, c: "bg-accent/15 text-accent-foreground" },
            { l: "ترتيبك", v: `#${stats.rank || "—"}`, icon: Award, c: "bg-primary/10 text-primary" },
            { l: "إجابات صحيحة", v: stats.correct, icon: Target, c: "bg-success/10 text-success" },
            { l: "نسبة الدقة", v: `${accuracy}%`, icon: TrendingUp, c: "bg-info/10 text-info" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-card rounded-2xl p-5 shadow-card border border-border">
                <div className={`w-11 h-11 rounded-xl ${s.c} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-muted-foreground">{s.l}</p>
                <p className="font-display text-2xl font-extrabold mt-1">{s.v}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subjects */}
          <div className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-card border border-border">
            <h3 className="font-display text-lg font-bold mb-5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />ابدئي بمادة
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((s) => (
                <button key={s.id} onClick={() => navigate(`/quiz?subject=${s.id}`)}
                  className="text-right p-4 rounded-xl border border-border bg-secondary/30 hover:bg-primary/5 hover:border-primary/30 transition-all">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.type === "tahseeli" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-foreground"}`}>
                    {s.type === "tahseeli" ? "تحصيلي" : "قدرات"}
                  </span>
                  <p className="font-bold mt-2">{s.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent */}
          <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
            <h3 className="font-display text-lg font-bold mb-5">آخر إجاباتك</h3>
            {recentAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد محاولات بعد</p>
            ) : (
              <div className="space-y-3">
                {recentAttempts.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-secondary/30 border border-border">
                    <p className="text-sm line-clamp-2 font-medium">{a.questions?.question_text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${a.is_correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {a.is_correct ? "✓ صحيح" : "✗ خطأ"}
                      </span>
                      {a.is_correct && <span className="text-xs font-bold text-accent">+{a.points_earned}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
