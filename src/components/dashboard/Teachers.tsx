import { useEffect, useState } from "react";
import { UserPlus, ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type TeacherRow = {
  id: string;
  name: string;
  email: string | null;
  assigned: number;
  isActive: boolean;
};

const palette = ["bg-primary", "bg-accent", "bg-info", "bg-success", "bg-warning"];

export const Teachers = () => {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: roles }, { data: profiles }, { data: questions }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").eq("role", "teacher"),
        supabase.from("profiles").select("id, full_name, email, is_active"),
        supabase.from("questions").select("created_by"),
      ]);

      const teacherIds = new Set((roles ?? []).map((r: any) => r.user_id));
      const counts: Record<string, number> = {};
      (questions ?? []).forEach((q: any) => {
        if (q.created_by) counts[q.created_by] = (counts[q.created_by] ?? 0) + 1;
      });

      const rows: TeacherRow[] = (profiles ?? [])
        .filter((p: any) => teacherIds.has(p.id))
        .map((p: any) => ({
          id: p.id,
          name: p.full_name,
          email: p.email,
          assigned: counts[p.id] ?? 0,
          isActive: p.is_active,
        }));
      setTeachers(rows);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h3 className="font-display text-xl font-bold">المعلمات المسجَّلات في النظام</h3>
            <p className="text-sm text-muted-foreground mt-1">عدد الأسئلة التي أعدّتها كل معلمة</p>
          </div>
          <Badge variant="secondary" className="font-bold">{teachers.length} معلمة</Badge>
        </div>

        {teachers.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد معلمات مسجَّلات بعد</p>
            <p className="text-xs text-muted-foreground mt-1">يمكن تعيين دور «معلمة» من إدارة المستخدمين</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teachers.map((t, i) => (
              <div key={t.id} className="flex items-center gap-4 p-4 bg-secondary/40 hover:bg-secondary/70 rounded-xl transition-colors">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold font-display shrink-0", palette[i % palette.length])}>
                  {t.name?.[0] ?? "م"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate" dir="ltr">{t.email ?? "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t.isActive ? "نشطة" : "معطّلة"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">الأسئلة المُعَدَّة:</span>
                    <span className="text-xs font-bold text-foreground">{t.assigned}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
