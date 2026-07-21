import { useEffect, useState } from "react";
import { Users, GraduationCap, UserCog, ShieldCheck, Activity, Award, Loader2 } from "lucide-react";
import { StatCard } from "./StatCard";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PeriodFilter, Period, getPeriodStart, periodLabels } from "./PeriodFilter";

type Counts = { total: number; students: number; parents: number; teachers: number; admins: number };

export const Overview = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const [counts, setCounts] = useState<Counts>({ total: 0, students: 0, parents: 0, teachers: 0, admins: 0 });
  const [enrollment, setEnrollment] = useState<{ label: string; students: number; parents: number }[]>([]);
  const [distribution, setDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: roles }, { data: profiles }, { data: subjects }, { data: questions }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("subjects").select("id, name, type"),
        supabase.from("questions").select("subject_id, created_at"),
      ]);

      const start = getPeriodStart(period);
      const now = new Date();

      const profilesInPeriod = (profiles ?? []).filter((p: any) => new Date(p.created_at) >= start);
      const idsInPeriod = new Set(profilesInPeriod.map((p: any) => p.id));
      const rolesInPeriod = (roles ?? []).filter((r: any) => idsInPeriod.has(r.user_id));

      const byRole = { student: 0, parent: 0, teacher: 0, admin: 0 } as Record<string, number>;
      rolesInPeriod.forEach((r: any) => { byRole[r.role] = (byRole[r.role] ?? 0) + 1; });
      setCounts({
        total: profilesInPeriod.length,
        students: byRole.student,
        parents: byRole.parent,
        teachers: byRole.teacher,
        admins: byRole.admin,
      });

      const studentIds = new Set((roles ?? []).filter((r: any) => r.role === "student").map((r: any) => r.user_id));
      const parentIds = new Set((roles ?? []).filter((r: any) => r.role === "parent").map((r: any) => r.user_id));

      // Build daily buckets across the period
      const dayMs = 86400000;
      const totalDays = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / dayMs));
      const buckets: { label: string; students: number; parents: number; key: string }[] = [];
      for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        buckets.push({
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          students: 0,
          parents: 0,
          key: d.toDateString(),
        });
      }
      profilesInPeriod.forEach((p: any) => {
        const d = new Date(p.created_at);
        const found = buckets.find((b) => b.key === d.toDateString());
        if (found) {
          if (studentIds.has(p.id)) found.students++;
          if (parentIds.has(p.id)) found.parents++;
        }
      });
      setEnrollment(buckets.map(({ label, students, parents }) => ({ label, students, parents })));

      const palette = ["hsl(152 100% 21%)", "hsl(152 70% 35%)", "hsl(45 95% 55%)", "hsl(35 90% 50%)", "hsl(200 80% 45%)"];
      const counts2: Record<string, number> = {};
      (questions ?? [])
        .filter((q: any) => new Date(q.created_at) >= start)
        .forEach((q: any) => { counts2[q.subject_id] = (counts2[q.subject_id] ?? 0) + 1; });
      const dist = (subjects ?? []).map((s: any, i: number) => ({
        name: s.name, value: counts2[s.id] ?? 0, color: palette[i % palette.length],
      })).filter((d) => d.value > 0);
      setDistribution(dist);

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
        <StatCard label="إجمالي الحسابات الجديدة" value={counts.total.toLocaleString("ar")} icon={ShieldCheck} hint={periodLabels[period]} tone="primary" />
        <StatCard label="الطلاب الجدد" value={counts.students.toLocaleString("ar")} icon={GraduationCap} hint="مسجلون في الفترة" tone="gold" />
        <StatCard label="أولياء الأمور الجدد" value={counts.parents.toLocaleString("ar")} icon={Users} hint="حسابات مفعلة" tone="info" />
        <StatCard label="المعلمون الجدد" value={counts.teachers.toLocaleString("ar")} icon={UserCog} hint="انضموا في الفترة" tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-lg font-bold">التسجيلات خلال {periodLabels[period]}</h3>
              <p className="text-sm text-muted-foreground mt-1">نمو حسابات الطلاب وأولياء الأمور</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full text-xs font-bold">
              <Activity className="w-3.5 h-3.5" />
              مباشر
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={enrollment}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152 100% 21%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(152 100% 21%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(45 95% 55%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(45 95% 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12, fontFamily: 'Tajawal' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Tajawal' }} />
              <Area type="monotone" dataKey="students" name="الطلاب" stroke="hsl(152 100% 21%)" strokeWidth={2.5} fill="url(#g1)" />
              <Area type="monotone" dataKey="parents" name="أولياء الأمور" stroke="hsl(45 95% 55%)" strokeWidth={2.5} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg font-bold">توزيع الأسئلة المضافة</h3>
          </div>
          {distribution.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">لا توجد أسئلة مضافة في هذه الفترة</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {distribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Tajawal' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {distribution.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-foreground">{d.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
