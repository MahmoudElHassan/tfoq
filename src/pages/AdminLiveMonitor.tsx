import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Users, Zap, AlertTriangle, CheckCircle2, TrendingUp, Database, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/site/SiteNav";
import { Button } from "@/components/ui/button";

type RecentAttempt = {
  id: string;
  student_id: string;
  question_id: string;
  is_correct: boolean;
  points_earned: number;
  attempted_at: string;
  student_name?: string;
};

type Stats = {
  attemptsLastMinute: number;
  attemptsLast5Min: number;
  attemptsLastHour: number;
  activeStudents: number; // طالبات أرسلن إجابة في آخر 5 دقائق
  correctRate: number; // % إجابات صحيحة في آخر ساعة
  avgPointsPerAttempt: number;
};

const REFRESH_MS = 15000; // تحديث كل 15 ثانية (تقليل bandwidth بـ 66%)
const RECENT_LIMIT = 10;

const HEALTH_THRESHOLDS = {
  attemptsPerMinute: { warn: 200, danger: 500 },
  activeStudents: { warn: 300, danger: 600 },
};

const AdminLiveMonitor = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentAttempt[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const load = async () => {
      const now = new Date();
      const oneMinAgo = new Date(now.getTime() - 60 * 1000).toISOString();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

      try {
        // عدّ فقط (head:true) للحقول الكبيرة → بايتات قليلة بدل آلاف الصفوف
        const [m1, h1Total, h1Correct, m5Ids, recentRes] = await Promise.all([
          supabase
            .from("quiz_attempts")
            .select("id", { count: "exact", head: true })
            .gte("attempted_at", oneMinAgo),
          supabase
            .from("quiz_attempts")
            .select("id", { count: "exact", head: true })
            .gte("attempted_at", oneHourAgo),
          supabase
            .from("quiz_attempts")
            .select("id", { count: "exact", head: true })
            .eq("is_correct", true)
            .gte("attempted_at", oneHourAgo),
          // student_id فقط لحساب الطالبات النشطات (عمود واحد صغير)
          supabase
            .from("quiz_attempts")
            .select("student_id")
            .gte("attempted_at", fiveMinAgo)
            .limit(2000),
          supabase
            .from("quiz_attempts")
            .select("id, student_id, is_correct, points_earned, attempted_at")
            .order("attempted_at", { ascending: false })
            .limit(RECENT_LIMIT),
        ]);

        if (cancelled) return;

        const m5Data = m5Ids.data ?? [];
        const activeIds = new Set(m5Data.map((a: any) => a.student_id));
        const totalH1 = h1Total.count ?? 0;
        const correctH1 = h1Correct.count ?? 0;

        const newStats: Stats = {
          attemptsLastMinute: m1.count ?? 0,
          attemptsLast5Min: m5Data.length,
          attemptsLastHour: totalH1,
          activeStudents: activeIds.size,
          correctRate: totalH1 > 0 ? Math.round((correctH1 / totalH1) * 100) : 0,
          avgPointsPerAttempt: 0, // أُزيل لتقليل الـ bandwidth (كان يحمّل كل صفوف الساعة)
        };

        setStats(newStats);

        // أسماء الطالبات للسجل الأخير
        const recentList = (recentRes.data ?? []).map((r: any) => ({
          ...r,
          question_id: "",
        })) as RecentAttempt[];
        const ids = Array.from(new Set(recentList.map((r) => r.student_id)));
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
          recentList.forEach((r) => {
            r.student_name = nameMap.get(r.student_id) ?? "—";
          });
        }
        setRecent(recentList);

        setLastUpdate(new Date());
        setError(null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "تعذّر تحميل البيانات");
      }
    };

    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isAdmin]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <SiteNav />
        <div className="container py-20 text-center text-muted-foreground">جارٍ التحميل...</div>
      </div>
    );
  }

  const healthLevel = (() => {
    if (!stats) return "unknown";
    if (
      stats.attemptsLastMinute >= HEALTH_THRESHOLDS.attemptsPerMinute.danger ||
      stats.activeStudents >= HEALTH_THRESHOLDS.activeStudents.danger
    )
      return "danger";
    if (
      stats.attemptsLastMinute >= HEALTH_THRESHOLDS.attemptsPerMinute.warn ||
      stats.activeStudents >= HEALTH_THRESHOLDS.activeStudents.warn
    )
      return "warn";
    return "ok";
  })();

  const healthColor =
    healthLevel === "danger"
      ? "text-destructive bg-destructive/10 border-destructive/30"
      : healthLevel === "warn"
      ? "text-orange-600 bg-orange-500/10 border-orange-500/30"
      : "text-success bg-success/10 border-success/30";

  const healthLabel =
    healthLevel === "danger"
      ? "حمل عالٍ — يُنصح بترقية الـ Cloud instance"
      : healthLevel === "warn"
      ? "حمل متوسط — راقبي الأداء"
      : healthLevel === "ok"
      ? "النظام يعمل بسلاسة"
      : "—";

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              المراقبة اللحظية
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              تحديث كل {REFRESH_MS / 1000}ث · آخر تحديث:{" "}
              {lastUpdate ? lastUpdate.toLocaleTimeString("ar-EG") : "—"}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            العودة للإدارة
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* مؤشر الصحة */}
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${healthColor}`}>
          {healthLevel === "ok" ? (
            <CheckCircle2 className="w-8 h-8 shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-display text-lg font-bold">{healthLabel}</p>
            <p className="text-xs opacity-80 mt-1">
              عتبات التحذير: {HEALTH_THRESHOLDS.attemptsPerMinute.warn} إجابة/دقيقة أو{" "}
              {HEALTH_THRESHOLDS.activeStudents.warn} طالبة نشطة
            </p>
          </div>
        </div>

        {/* بطاقات الإحصاءات */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="إجابات/دقيقة"
            value={stats?.attemptsLastMinute ?? "—"}
            tone="primary"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="آخر 5 دقائق"
            value={stats?.attemptsLast5Min ?? "—"}
            tone="info"
          />
          <StatCard
            icon={<Database className="w-5 h-5" />}
            label="آخر ساعة"
            value={stats?.attemptsLastHour ?? "—"}
            tone="muted"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="طالبات نشطات"
            value={stats?.activeStudents ?? "—"}
            tone="accent"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="نسبة الصحة"
            value={stats ? `${stats.correctRate}%` : "—"}
            tone="success"
          />
        </div>

        {/* آخر الإجابات */}
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">آخر 20 إجابة</span>
          </div>
          {recent.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">لا توجد إجابات حديثة</div>
          ) : (
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {recent.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/20">
                  {a.is_correct ? (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-destructive/70 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{a.student_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.attempted_at).toLocaleTimeString("ar-EG")}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p
                      className={`font-display font-extrabold text-sm tabular-nums ${
                        a.is_correct ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      {a.is_correct ? `+${a.points_earned}` : "0"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">نقطة</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-card border border-border rounded-2xl p-4">
          <p className="font-bold mb-1">💡 ملاحظات:</p>
          <ul className="list-disc pr-5 space-y-1">
            <li>الإحصاءات تعتمد على عدّ الصفوف فقط (count) لتقليل استهلاك الـ bandwidth.</li>
            <li>التحديث كل 15 ثانية بدلاً من 5 لتقليل الحمل بـ 66%.</li>
            <li>"طالبات نشطات" = طالبات أرسلن إجابة في آخر 5 دقائق.</li>
            <li>عند تجاوز 500 إجابة/دقيقة، فكّري في ترقية حجم Lovable Cloud instance.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const toneClass: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  info: "bg-info/10 text-info border-info/20",
  muted: "bg-secondary/40 text-foreground border-border",
  accent: "bg-accent/15 text-accent-foreground border-accent/20",
  success: "bg-success/10 text-success border-success/20",
  warn: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const StatCard = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: keyof typeof toneClass;
}) => (
  <div className={`rounded-2xl border p-4 ${toneClass[tone]}`}>
    <div className="flex items-center gap-2 mb-2 opacity-80">
      {icon}
      <span className="text-xs font-bold">{label}</span>
    </div>
    <p className="font-display text-2xl font-extrabold tabular-nums">{value}</p>
  </div>
);

export default AdminLiveMonitor;
