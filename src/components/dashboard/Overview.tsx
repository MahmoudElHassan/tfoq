import { Users, GraduationCap, UserCog, ShieldCheck, Activity, Award } from "lucide-react";
import { StatCard } from "./StatCard";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const enrollmentData = [
  { month: "محرم", students: 45, parents: 38 },
  { month: "صفر", students: 62, parents: 51 },
  { month: "ربيع ١", students: 78, parents: 65 },
  { month: "ربيع ٢", students: 95, parents: 82 },
  { month: "جمادى ١", students: 120, parents: 98 },
  { month: "جمادى ٢", students: 142, parents: 119 },
];

const distributionData = [
  { name: "تحصيلي علمي", value: 340, color: "hsl(152 100% 21%)" },
  { name: "تحصيلي أدبي", value: 220, color: "hsl(152 70% 35%)" },
  { name: "قدرات كمي", value: 280, color: "hsl(45 95% 55%)" },
  { name: "قدرات لفظي", value: 195, color: "hsl(35 90% 50%)" },
];

export const Overview = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="إجمالي الحسابات" value="1,847" icon={ShieldCheck} change={12.5} hint="جميع المستخدمين النشطين" tone="primary" />
        <StatCard label="الطالبات" value="1,235" icon={GraduationCap} change={8.3} hint="مسجلات في النظام" tone="gold" />
        <StatCard label="أولياء الأمور" value="978" icon={Users} change={15.2} hint="حسابات مفعلة" tone="info" />
        <StatCard label="المعلمات" value="64" icon={UserCog} change={4.1} hint="معلمة نشطة" tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-lg font-bold">التسجيلات خلال الأشهر الأخيرة</h3>
              <p className="text-sm text-muted-foreground mt-1">نمو حسابات الطالبات وأولياء الأمور</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full text-xs font-bold">
              <Activity className="w-3.5 h-3.5" />
              نشط
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={enrollmentData}>
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
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12, fontFamily: 'Tajawal' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Tajawal' }} />
              <Area type="monotone" dataKey="students" name="الطالبات" stroke="hsl(152 100% 21%)" strokeWidth={2.5} fill="url(#g1)" />
              <Area type="monotone" dataKey="parents" name="أولياء الأمور" stroke="hsl(45 95% 55%)" strokeWidth={2.5} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg font-bold">توزيع الاختبارات</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {distributionData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Tajawal' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {distributionData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-foreground">{d.name}</span>
                </div>
                <span className="font-bold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
