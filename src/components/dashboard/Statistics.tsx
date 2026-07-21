import { useEffect, useState } from "react";
import { Target, LinkIcon, CalendarDays, TrendingUp, Loader2 } from "lucide-react";
import { StatCard } from "./StatCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PeriodFilter, Period, getPeriodStart, periodLabels } from "./PeriodFilter";

export const Statistics = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [avgScore, setAvgScore] = useState(0);
  const [linkedStudents, setLinkedStudents] = useState(0);
  const [linkedPct, setLinkedPct] = useState(0);
  const [periodRegistrations, setPeriodRegistrations] = useState(0);
  const [periodAttempts, setPeriodAttempts] = useState(0);
  const [dailyData, setDailyData] = useState<{ day: string; reg: number }[]>([]);
  const [subjectScores, setSubjectScores] = useState<{ subject: string; avg: number }[]>([]);
  const [trend, setTrend] = useState<{ w: string; score: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = getPeriodStart(period);
      const now = new Date();

      const [{ data: roles }, { data: profiles }, { data: links }, { data: attempts }, { data: subjects }, { data: questions }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").eq("role", "student"),
        supabase.from("profiles").select("id, total_points, created_at"),
        supabase.from("parent_student_links").select("student_id"),
        supabase.from("quiz_attempts").select("question_id, is_correct, points_earned, attempted_at"),
        supabase.from("subjects").select("id, name"),
        supabase.from("questions").select("id, subject_id, points"),
      ]);

      const studentIds = new Set((roles ?? []).map((r: any) => r.user_id));

      // Filter attempts to period
      const allAtt = attempts ?? [];
      const att = allAtt.filter((a: any) => new Date(a.attempted_at) >= start);
      const correct = att.filter((a: any) => a.is_correct).length;
      const avg = att.length > 0 ? Math.round((correct / att.length) * 1000) / 10 : 0;
      setAvgScore(avg);
      setPeriodAttempts(att.length);

      // Linked students (overall, no time filter)
      const linkedSet = new Set((links ?? []).map((l: any) => l.student_id));
      const linkedCount = [...linkedSet].filter((id) => studentIds.has(id)).length;
      setLinkedStudents(linkedCount);
      setLinkedPct(studentIds.size > 0 ? Math.round((linkedCount / studentIds.size) * 100) : 0);

      // Registrations in period
      const allProfiles = profiles ?? [];
      const profilesInPeriod = allProfiles.filter((p: any) => new Date(p.created_at) >= start);
      setPeriodRegistrations(profilesInPeriod.length);

      // Daily registrations across period
      const dayMs = 86400000;
      const totalDays = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / dayMs));
      const buckets: { day: string; reg: number; key: string }[] = [];
      for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        buckets.push({ day: `${d.getDate()}/${d.getMonth() + 1}`, reg: 0, key: d.toDateString() });
      }
      profilesInPeriod.forEach((p: any) => {
        const d = new Date(p.created_at);
        const found = buckets.find((b) => b.key === d.toDateString());
        if (found) found.reg++;
      });
      setDailyData(buckets.map(({ day, reg }) => ({ day, reg })));

      // Subject scores within period
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

      // Trend - split period into 4 segments
      const segments = 4;
      const segMs = (now.getTime() - start.getTime()) / segments;
      const segLabels = ["الربع ١", "الربع ٢", "الربع ٣", "الربع ٤"];
      const trendData: { w: string; score: number }[] = [];
      for (let i = 0; i < segments; i++) {
        const segStart = new Date(start.getTime() + i * segMs);
        const segEnd = new Date(start.getTime() + (i + 1) * segMs);
        const wAtt = att.filter((a: any) => {
          const d = new Date(a.attempted_at);
          return d >= segStart && d < segEnd;
        });
        const wCorrect = wAtt.filter((a: any) => a.is_correct).length;
        trendData.push({
          w: segLabels[i],
          score: wAtt.length > 0 ? Math.round((wCorrect / wAtt.length) * 100) : 0,
        });
      }
      setTrend(trendData);

      setLoading(false);
    })();
  }, [period]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">عرض البيانات لـ <span className="font-bold text-foreground">{periodLabels[period]}</span></p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="متوسط النقاط في الفترة" value={avgScore.toString()} icon={Target} hint="نسبة الإجابات الصحيحة %" tone="primary" />
        <StatCard label="الطلاب المرتبطون" value={linkedStudents.toLocaleString("ar")} icon={LinkIcon} hint={`${linkedPct}% من إجمالي الطلاب`} tone="gold" />
        <StatCard label="تسجيلات الفترة" value={periodRegistrations.toLocaleString("ar")} icon={CalendarDays} hint={periodLabels[period]} tone="info" />
        <StatCard label="محاولات الاختبار" value={periodAttempts.toLocaleString("ar")} icon={TrendingUp} hint="عدد المحاولات في الفترة" tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <h3 className="font-display text-lg font-bold mb-1">التسجيلات اليومية</h3>
          <p className="text-sm text-muted-foreground mb-5">عدد الحسابات الجديدة لكل يوم خلال {periodLabels[period]}</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyData}>
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
          <p className="text-sm text-muted-foreground mb-5">نسبة الإجابات الصحيحة لكل مادة في الفترة المختارة</p>
          {subjectScores.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">لا توجد محاولات اختبار في هذه الفترة</p>
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
            <h3 className="font-display text-xl lg:text-2xl font-extrabold">تطور المتوسط خلال {periodLabels[period]}</h3>
            <p className="text-primary-foreground/80 mt-2">نسبة الإجابات الصحيحة عبر الفترة المختارة</p>
          </div>
          <div className="text-center">
            <p className="text-primary-foreground/70 text-sm">المتوسط الحالي</p>
            <p className="font-display text-5xl font-extrabold text-accent">{trend[trend.length - 1]?.score ?? 0}<span className="text-2xl text-primary-foreground/60">/100</span></p>
          </div>
        </div>
        <div className="mt-6 bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
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
