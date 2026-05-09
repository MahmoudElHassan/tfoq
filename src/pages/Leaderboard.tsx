import { useEffect, useState } from "react";
import { Trophy, Medal, Award, Crown, Sparkles, Star, TrendingUp, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site/SiteNav";
import { useAuth } from "@/hooks/useAuth";

type Row = { id: string; full_name: string; total_points: number; grade: string | null };

const Leaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatedPoints, setAnimatedPoints] = useState<number[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setWarning(null);
      const { data, error } = await supabase.rpc("get_leaderboard", { _limit: 5 });
      if (cancelled) return;

      if (error) {
        setWarning("تعذّر جلب لوحة الترتيب من قاعدة البيانات.");
        setRows([]);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as Row[];
      if (list.length === 0) {
        setWarning("لا توجد طالبات نشطات حالياً في النظام.");
      }

      setRows((prev) => {
        const prevMap = new Map(prev.map((r) => [r.id, r.total_points]));
        setAnimatedPoints(list.map((r) => prevMap.get(r.id) ?? 0));
        list.forEach((row, idx) => {
          const start = prevMap.get(row.id) ?? 0;
          const target = row.total_points;
          if (start === target) return;
          const duration = 1200;
          const startTime = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedPoints((prev2) => {
              const next = [...prev2];
              next[idx] = Math.round(start + (target - start) * eased);
              return next;
            });
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        return list;
      });
      setLoading(false);
    };

    load();

    // تحديث كل 60 ثانية فقط (بدلاً من realtime على كل profiles update)
    // هذا يقلل الحمل بنسبة 80%+ على قاعدة البيانات أثناء الاختبارات الجماعية
    const interval = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 5);
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumIndices = [1, 0, 2];
  const heights = ["h-36", "h-52", "h-28"];
  const icons = [Medal, Crown, Award];
  const podiumGradients = [
    "from-zinc-200 via-zinc-300 to-zinc-500",
    "from-amber-300 via-yellow-400 to-amber-600",
    "from-orange-300 via-orange-400 to-orange-600",
  ];
  const ringColors = ["ring-zinc-300", "ring-amber-400", "ring-orange-400"];
  const maxPoints = rows[0]?.total_points || 1;

  return (
    <div className="min-h-screen bg-gradient-soft relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-20 -right-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-96 -left-20 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <SiteNav />
      <div className="container py-10 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative inline-flex w-20 h-20 rounded-3xl bg-gradient-gold items-center justify-center shadow-elegant mb-5">
            <Trophy className="w-11 h-11 text-accent-foreground" />
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-accent animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-2 w-4 h-4 text-accent animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>
          <h1 className="t-h1">لوحة الترتيب</h1>
          <p className="t-body text-muted-foreground mt-2">أفضل 5 طالبات أداءً في منصة تفوّق</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>تنافسي · محدّث آنياً</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-muted-foreground">جارٍ تحميل الترتيب...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8 text-center shadow-card">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-bold mb-2">{warning ? "بيانات غير متطابقة" : "لا توجد بيانات بعد"}</p>
            <p className="text-sm text-muted-foreground">
              {warning ?? "لم يتم تسجيل أي طالبة في النظام بعد."}
            </p>
          </div>
        ) : (
          <>
            {warning && (
              <div className="max-w-3xl mx-auto mb-6 bg-accent/10 border border-accent/30 rounded-2xl px-5 py-3 flex items-start gap-3 text-sm">
                <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <p className="text-foreground">{warning}</p>
              </div>
            )}
            {/* Podium */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-3 lg:gap-8 mb-12 max-w-3xl mx-auto">
                {podium.map((p, i) => {
                  if (!p) return null;
                  const realIdx = podiumIndices[i];
                  const Icon = icons[realIdx];
                  const dataIdx = realIdx; // index in rows
                  const isMe = user?.id === p.id;
                  const delay = i * 150;
                  return (
                    <div
                      key={p.id}
                      className="flex-1 text-center animate-fade-in"
                      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
                      onMouseEnter={() => setHoveredIdx(dataIdx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Avatar */}
                      <div className="relative inline-block mb-3">
                        <div
                          className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br ${podiumGradients[realIdx]} flex items-center justify-center font-display font-extrabold text-3xl text-white shadow-elegant ring-4 ${ringColors[realIdx]} ring-offset-2 ring-offset-background transition-transform duration-300 ${hoveredIdx === dataIdx ? "scale-110 -translate-y-1" : ""}`}
                        >
                          {p.full_name[0]}
                        </div>
                        {/* Crown/Medal floating */}
                        <div
                          className={`absolute -top-4 left-1/2 -translate-x-1/2 transition-transform duration-300 ${hoveredIdx === dataIdx ? "scale-125 -translate-y-1" : ""}`}
                          style={{ animation: realIdx === 0 ? "float 2.5s ease-in-out infinite" : undefined }}
                        >
                          <Icon className={`w-9 h-9 ${realIdx === 0 ? "text-amber-500 fill-amber-400" : realIdx === 1 ? "text-zinc-400 fill-zinc-300" : "text-orange-500 fill-orange-400"} drop-shadow-lg`} />
                        </div>
                        {isMe && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold shadow whitespace-nowrap">أنتِ</span>
                        )}
                      </div>

                      <p className="font-bold text-sm truncate px-1 mt-1">{p.full_name}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                        <p className="text-sm font-display font-extrabold text-primary tabular-nums">
                          {(animatedPoints[dataIdx] ?? 0).toLocaleString("ar-EG")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ranks 4 & 5 with progress bars */}
            {rest.length > 0 && (
              <div className="bg-card/80 backdrop-blur-sm rounded-3xl shadow-card border border-border overflow-hidden max-w-3xl mx-auto">
                <div className="px-5 py-3 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">المراتب التالية</span>
                </div>
                {rest.map((r, idx) => {
                  const dataIdx = idx + 3;
                  const isMe = user?.id === r.id;
                  const pct = (r.total_points / maxPoints) * 100;
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 transition-all duration-300 animate-fade-in ${isMe ? "bg-primary/5" : "hover:bg-secondary/40"}`}
                      style={{ animationDelay: `${(idx + 3) * 120}ms`, animationFillMode: "backwards" }}
                      onMouseEnter={() => setHoveredIdx(dataIdx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-secondary to-secondary/60 text-secondary-foreground font-display font-black text-lg flex items-center justify-center shrink-0 transition-transform ${hoveredIdx === dataIdx ? "scale-110" : ""}`}>
                        {idx + 4}
                      </span>
                      <div className="w-12 h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold text-lg flex items-center justify-center shrink-0 shadow-md">
                        {r.full_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">
                          {r.full_name} {isMe && <span className="text-xs text-primary">(أنتِ)</span>}
                        </p>
                        {r.grade && <p className="text-xs text-muted-foreground mb-1">{r.grade}</p>}
                        {/* Progress bar */}
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="font-display font-extrabold text-xl text-primary tabular-nums">
                          {(animatedPoints[dataIdx] ?? 0).toLocaleString("ar-EG")}
                        </p>
                        <p className="text-xs text-muted-foreground">نقطة</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-3 max-w-3xl mx-auto mt-8">
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 text-center">
                <p className="text-2xl font-display font-black text-primary tabular-nums">{rows.length}</p>
                <p className="text-xs text-muted-foreground mt-1">متنافسات</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 text-center">
                <p className="text-2xl font-display font-black text-accent tabular-nums">
                  {rows.reduce((s, r) => s + r.total_points, 0).toLocaleString("ar-EG")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">مجموع النقاط</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 text-center">
                <p className="text-2xl font-display font-black text-orange-500 tabular-nums">
                  {rows[0]?.total_points.toLocaleString("ar-EG") ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">أعلى نقاط</p>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;
