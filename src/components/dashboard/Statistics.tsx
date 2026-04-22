import { useEffect, useState } from "react";
import { Target, LinkIcon, CalendarDays, CalendarRange, Loader2 } from "lucide-react";
import { StatCard } from "./StatCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [avgScore, setAvgScore] = useState(0);
  const [linkedStudents, setLinkedStudents] = useState(0);
  const [linkedPct, setLinkedPct] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ day: string; reg: number }[]>([]);
  const [subjectScores, setSubjectScores] = useState<{ subject: string; avg: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ w: string; score: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);

      const [{ data: roles }, { data: profiles }, { data: links }, { data: attempts }, { data: subjects }, { data: questions }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").eq("role", "student"),
        supabase.from("profiles").select("id, total_points, created_at"),
        supabase.from("parent_student_links").select("student_id"),
        supabase.from("quiz_attempts").select("question_id, is_correct, points_earned, attempted_at"),
        supabase.from("subjects").select("id, name"),
        supabase.from("questions").select("id, subject_id, points"),
      ]);

      const studentIds = new Set((roles ?? []).map((r: any) => r.user_id));
      const studentProfiles = (profiles ?? []).filter((p: any) => studentIds.has(p.id));

      // Average overall score: ratio of correct attempts * 100
      const att = attempts ?? [];
      const correct = att.filter((a: any) => a.is_correct).length;
      const avg = att.length > 0 ? Math.round((correct / att.length) * 1000) / 10 : 0;
      setAvgScore(avg);

      // Linked students
      const linkedSet = new Set((links ?? []).map((l: any) => l.student_id));
      const linkedCount = [...linkedSet].filter((id) => studentIds.has(id)).length;
      setLinkedStudents(linkedCount);
      setLinkedPct(studentIds.size > 0 ? Math.round((linkedCount / studentIds.size) * 100) : 0);

      // Week / Month registrations
      const allProfiles = profiles ?? [];
      setWeekCount(allProfiles.filter((p: any) => new Date(p.created_at) >= weekAgo).length);
      setMonthCount(allProfiles.filter((p: any) => new Date(p.created_at) >= monthAgo).length);

      // Weekly daily registrations
      const buckets: Record<number, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        buckets[d.toDateString() as any] = 0;
      }
      const weekly: { day: string; reg: number; key: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        weekly.push({ day: dayNames[d.getDay()], reg: 0, key: d.toDateString() });
      }
      allProfiles.forEach((p: any) => {
        const d = new Date(p.created_at);
        const found = weekly.find((w) => w.key === d.toDateString());
        if (found) found.reg++;
      });
      setWeeklyData(weekly.map(({ day, reg }) => ({ day, reg })));

      // Subject scores
      const qMap: Record<string, string> = {};
      (questions ?? []).forEach((q: any) => { qMap[q.id] = q.subject_id; });
      const subjStats: Record<string, { correct: number; total: number }> = {};
      att.forEach((a: any) => {
        const sid = qMap[a.question_id];
        if (!sid) return;
        if (!subjStats[sid]) subjStats[sid] = { correct: 0, total: 0 };
        subjStats[sid].total++;
        if (a.is_correct) subjStats[sid].correct++;
      });
      const subjScores = (subjects ?? []).map((s: any) => ({
        subject: s.name,
        avg: subjStats[s.id]?.total ? Math.round((subjStats[s.id].correct / subjStats[s.id].total) * 100) : 0,
      })).filter((s) => s.avg > 0);
      setSubjectScores(subjScores);

      // Monthly trend - last 4 weeks
      const trend: { w: string; score: number }[] = [];
      for (let i = 3; i >= 0; i--) {
        const start = new Date(now); start.setDate(now.getDate() - (i + 1) * 7);
        const end = new Date(now); end.setDate(now.getDate() - i * 7);
        const wAtt = att.filter((a: any) => {
          const d = new Date(a.attempted_at);
          return d >= start && d < end;
        });
        const wCorrect = wAtt.filter((a: any) => a.is_correct).length;
        trend.push({
          w: `الأسبوع ${["١", "٢", "٣", "٤"][3 - i]}`,
          score: wAtt.length > 0 ? Math.round((wCorrect / wAtt.length) * 100) : 0,
        });
      }
      setMonthlyTrend(trend);

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="متوسط النقاط العام" value={avgScore.toString()} icon={Target} hint="نسبة الإجابات الصحيحة %" tone="primary" />
        <StatCard label="الطالبات المرتبطات بأولياء الأمور" value={linkedStudents.toLocaleString("ar")} icon={LinkIcon} hint={`${linkedPct}% من إجمالي الطالبات`} tone="gold" />
        <StatCard label="تسجيلات الأسبوع" value={weekCount.toLocaleString("ar")} icon={CalendarDays} hint="آخر 7 أيام" tone="info" />
        <StatCard label="تسجيلات الشهر" value={monthCount.toLocaleString("ar")} icon={CalendarRange} hint="آخر 30 يوماً" tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <h3 className="font-display text-lg font-bold mb-1">التسجيلات اليومية - آخر أسبوع</h3>
          <p className="text-sm text-muted-foreground mb-5">عدد الحسابات الجديدة لكل يوم</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12, fontFamily: 'Tajawal' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Tajawal' }} />
              <Bar dataKey="reg" name="تسجيلات" fill="hsl(152 100% 21%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <h3 className="font-display text-lg font-bold mb-1">متوسط النقاط حسب المادة</h3>
          <p className="text-sm text-muted-foreground mb-5">نسبة الإجابات الصحيحة لكل مادة</p>
          {subjectScores.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">لا توجد محاولات اختبار بعد</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subjectScores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                <YAxis dataKey="subject" type="category" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 13, fontFamily: 'Tajawal' }} width={90} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Tajawal' }} />
                <Bar dataKey="avg" name="المتوسط" fill="hsl(45 95% 55%)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-gradient-primary rounded-2xl p-6 lg:p-8 text-primary-foreground shadow-elegant">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl lg:text-2xl font-extrabold">تطور المتوسط العام خلال الشهر</h3>
            <p className="text-primary-foreground/80 mt-2">نسبة الإجابات الصحيحة عبر آخر 4 أسابيع</p>
          </div>
          <div className="text-center">
            <p className="text-primary-foreground/70 text-sm">المتوسط الحالي</p>
            <p className="font-display text-5xl font-extrabold text-accent">{monthlyTrend[monthlyTrend.length - 1]?.score ?? 0}<span className="text-2xl text-primary-foreground/60">/100</span></p>
          </div>
        </div>
        <div className="mt-6 bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
              <XAxis dataKey="w" stroke="rgba(255,255,255,0.7)" style={{ fontSize: 12, fontFamily: 'Tajawal' }} />
              <YAxis stroke="rgba(255,255,255,0.7)" style={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: 'none', borderRadius: 12, fontFamily: 'Tajawal' }} />
              <Line type="monotone" dataKey="score" name="المتوسط" stroke="hsl(45 95% 55%)" strokeWidth={3} dot={{ r: 6, fill: 'hsl(45 95% 55%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
