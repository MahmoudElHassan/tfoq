import { useEffect, useState } from "react";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site/SiteNav";
import { useAuth } from "@/hooks/useAuth";

type Row = { id: string; full_name: string; total_points: number; grade: string | null };

const Leaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, total_points, grade")
        .order("total_points", { ascending: false })
        .limit(50);
      setRows(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = ["h-32", "h-44", "h-24"];
  const icons = [Medal, Crown, Award];
  const colors = ["bg-gradient-to-b from-zinc-300 to-zinc-400", "bg-gradient-gold", "bg-gradient-to-b from-orange-300 to-orange-500"];

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-10">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-gold items-center justify-center shadow-elegant mb-4">
            <Trophy className="w-9 h-9 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-extrabold">لوحة الترتيب</h1>
          <p className="text-muted-foreground mt-2">أفضل الطالبات أداءً في منصة تفوّق</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">جارٍ التحميل...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">لا توجد بيانات بعد</div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-3 lg:gap-6 mb-12 max-w-2xl mx-auto">
                {podium.map((p, i) => {
                  if (!p) return null;
                  const realIdx = i === 0 ? 1 : i === 1 ? 0 : 2;
                  const Icon = icons[realIdx];
                  return (
                    <div key={p.id} className="flex-1 text-center">
                      <div className="relative inline-block mb-2">
                        <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full ${colors[realIdx]} flex items-center justify-center font-display font-extrabold text-2xl text-primary-foreground shadow-elegant border-4 border-card`}>
                          {p.full_name[0]}
                        </div>
                        <Icon className="absolute -top-2 -right-2 w-7 h-7 text-accent fill-accent" />
                      </div>
                      <p className="font-bold text-sm truncate">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.total_points} نقطة</p>
                      <div className={`${heights[realIdx]} ${colors[realIdx]} mt-3 rounded-t-2xl flex items-start justify-center pt-3 shadow-elegant`}>
                        <span className="font-display text-3xl font-black text-primary-foreground">#{realIdx + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rest */}
            <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden max-w-3xl mx-auto">
              {rest.map((r, idx) => {
                const isMe = user?.id === r.id;
                return (
                  <div key={r.id}
                    className={`flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 transition-colors ${
                      isMe ? "bg-primary/5" : "hover:bg-secondary/40"
                    }`}>
                    <span className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground font-display font-bold flex items-center justify-center shrink-0">
                      {idx + 4}
                    </span>
                    <div className="w-11 h-11 rounded-full bg-gradient-primary text-primary-foreground font-bold flex items-center justify-center shrink-0">
                      {r.full_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{r.full_name} {isMe && <span className="text-xs text-primary">(أنتِ)</span>}</p>
                      {r.grade && <p className="text-xs text-muted-foreground">{r.grade}</p>}
                    </div>
                    <div className="text-left">
                      <p className="font-display font-extrabold text-lg text-primary">{r.total_points}</p>
                      <p className="text-xs text-muted-foreground">نقطة</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
