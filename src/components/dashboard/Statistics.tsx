import { Target, LinkIcon, CalendarDays, CalendarRange } from "lucide-react";
import { StatCard } from "./StatCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

const weeklyData = [
  { day: "السبت", reg: 18 }, { day: "الأحد", reg: 24 }, { day: "الإثنين", reg: 31 },
  { day: "الثلاثاء", reg: 28 }, { day: "الأربعاء", reg: 35 }, { day: "الخميس", reg: 22 }, { day: "الجمعة", reg: 12 },
];

const subjectScores = [
  { subject: "كمي", avg: 78 }, { subject: "لفظي", avg: 82 },
  { subject: "علمي", avg: 75 }, { subject: "أدبي", avg: 80 },
];

const monthlyTrend = [
  { w: "الأسبوع ١", score: 72 }, { w: "الأسبوع ٢", score: 75 },
  { w: "الأسبوع ٣", score: 79 }, { w: "الأسبوع ٤", score: 83 },
];

export const Statistics = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="متوسط النقاط العام" value="78.4" icon={Target} change={5.2} hint="من أصل 100 نقطة" tone="primary" />
        <StatCard label="الطالبات المرتبطات بأولياء الأمور" value="892" icon={LinkIcon} change={9.8} hint="72% من الإجمالي" tone="gold" />
        <StatCard label="تسجيلات الأسبوع" value="170" icon={CalendarDays} change={14.3} hint="آخر 7 أيام" tone="info" />
        <StatCard label="تسجيلات الشهر" value="642" icon={CalendarRange} change={11.6} hint="آخر 30 يوماً" tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <h3 className="font-display text-lg font-bold mb-1">التسجيلات اليومية - هذا الأسبوع</h3>
          <p className="text-sm text-muted-foreground mb-5">عدد الحسابات الجديدة لكل يوم</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12, fontFamily: 'Tajawal' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Tajawal' }} />
              <Bar dataKey="reg" name="تسجيلات" fill="hsl(152 100% 21%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <h3 className="font-display text-lg font-bold mb-1">متوسط النقاط حسب المادة</h3>
          <p className="text-sm text-muted-foreground mb-5">أداء الطالبات في الاختبارات</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={subjectScores} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
              <YAxis dataKey="subject" type="category" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 13, fontFamily: 'Tajawal' }} width={70} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Tajawal' }} />
              <Bar dataKey="avg" name="المتوسط" fill="hsl(45 95% 55%)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-primary rounded-2xl p-6 lg:p-8 text-primary-foreground shadow-elegant">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl lg:text-2xl font-extrabold">تطور المتوسط العام خلال الشهر</h3>
            <p className="text-primary-foreground/80 mt-2">ارتفاع مستمر بنسبة <span className="font-bold text-accent">+11.6%</span> مقارنة بالشهر السابق</p>
          </div>
          <div className="text-center">
            <p className="text-primary-foreground/70 text-sm">المتوسط الحالي</p>
            <p className="font-display text-5xl font-extrabold text-accent">83<span className="text-2xl text-primary-foreground/60">/100</span></p>
          </div>
        </div>
        <div className="mt-6 bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
              <XAxis dataKey="w" stroke="rgba(255,255,255,0.7)" style={{ fontSize: 12, fontFamily: 'Tajawal' }} />
              <YAxis stroke="rgba(255,255,255,0.7)" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: 'none', borderRadius: 12, fontFamily: 'Tajawal' }} />
              <Line type="monotone" dataKey="score" name="المتوسط" stroke="hsl(45 95% 55%)" strokeWidth={3} dot={{ r: 6, fill: 'hsl(45 95% 55%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
