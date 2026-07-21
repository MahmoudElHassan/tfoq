import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2, BookCheck, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Subject = { id: string; name: string; type: string };
type TeacherRow = {
  id: string;
  name: string;
  email: string | null;
  assigned: number;
  isActive: boolean;
  subjects: Subject[];
};

const palette = ["bg-primary", "bg-accent", "bg-info", "bg-success", "bg-warning"];
const typeLabel: Record<string, string> = { tahseeli: "تحصيلي", qudurat: "قدرات" };

export const Teachers = () => {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: roles }, { data: profiles }, { data: questions }, { data: subs }, { data: assigns }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").eq("role", "teacher"),
      supabase.from("profiles").select("id, full_name, email, is_active"),
      supabase.from("questions").select("created_by"),
      supabase.from("subjects").select("id, name, type"),
      supabase.from("teacher_subjects").select("teacher_id, subject_id"),
    ]);

    const teacherIds = new Set((roles ?? []).map((r: any) => r.user_id));
    const counts: Record<string, number> = {};
    (questions ?? []).forEach((q: any) => {
      if (q.created_by) counts[q.created_by] = (counts[q.created_by] ?? 0) + 1;
    });
    const subjectsById: Record<string, Subject> = {};
    (subs ?? []).forEach((s: any) => { subjectsById[s.id] = s; });
    const teacherSubs: Record<string, Subject[]> = {};
    (assigns ?? []).forEach((a: any) => {
      if (!teacherSubs[a.teacher_id]) teacherSubs[a.teacher_id] = [];
      const s = subjectsById[a.subject_id];
      if (s) teacherSubs[a.teacher_id].push(s);
    });

    const rows: TeacherRow[] = (profiles ?? [])
      .filter((p: any) => teacherIds.has(p.id))
      .map((p: any) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        assigned: counts[p.id] ?? 0,
        isActive: p.is_active,
        subjects: teacherSubs[p.id] ?? [],
      }));
    setTeachers(rows);
    setAllSubjects((subs ?? []) as Subject[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAssign = (t: TeacherRow) => {
    setEditing(t);
    setSelected(new Set(t.subjects.map((s) => s.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const saveAssignments = async () => {
    if (!editing) return;
    setSaving(true);
    const current = new Set(editing.subjects.map((s) => s.id));
    const toAdd = [...selected].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !selected.has(id));

    const { data: { user } } = await supabase.auth.getUser();

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("teacher_subjects")
        .delete()
        .eq("teacher_id", editing.id)
        .in("subject_id", toRemove);
      if (error) { toast.error("تعذّر إلغاء بعض التفويضات", { description: error.message }); setSaving(false); return; }
    }
    if (toAdd.length > 0) {
      const rows = toAdd.map((subject_id) => ({
        teacher_id: editing.id,
        subject_id,
        assigned_by: user?.id ?? null,
      }));
      const { error } = await supabase.from("teacher_subjects").insert(rows);
      if (error) { toast.error("تعذّر إضافة بعض التفويضات", { description: error.message }); setSaving(false); return; }
    }
    toast.success("تم تحديث تفويضات المعلم");
    setEditing(null);
    setSaving(false);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h3 className="font-display text-xl font-bold">المعلمون والتفويض للأقسام</h3>
            <p className="text-sm text-muted-foreground mt-1">فوّض كل معلم بقسم أو أكثر ليتمكن من إدارته</p>
          </div>
          <Badge variant="secondary" className="font-bold">{teachers.length} معلم</Badge>
        </div>

        {teachers.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">لا يوجد معلمون مسجَّلون بعد</p>
            <p className="text-xs text-muted-foreground mt-1">يمكن تعيين دور «معلم» من إدارة المستخدمين</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teachers.map((t, i) => (
              <div key={t.id} className="flex items-start gap-4 p-4 bg-secondary/40 hover:bg-secondary/70 rounded-xl transition-colors">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold font-display shrink-0", palette[i % palette.length])}>
                  {t.name?.[0] ?? "م"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate" dir="ltr">{t.email ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {t.isActive ? "نشط" : "معطّل"}
                      </Badge>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openAssign(t)}>
                        <BookCheck className="w-3.5 h-3.5" />
                        تفويض
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-muted-foreground shrink-0">الأقسام المفوّضة:</span>
                    {t.subjects.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">لا يوجد — لن تتمكن من إضافة أسئلة</span>
                    ) : (
                      t.subjects.map((s) => (
                        <Badge key={s.id} className="bg-primary/10 text-primary hover:bg-primary/15 border-0 text-xs">
                          {s.name} <span className="opacity-60 mx-1">·</span> {typeLabel[s.type] ?? s.type}
                        </Badge>
                      ))
                    )}
                    <span className="text-xs text-muted-foreground mr-auto">
                      الأسئلة المُعَدَّة: <span className="font-bold text-foreground">{t.assigned}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفويض الأقسام للمعلم: {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[55vh] overflow-y-auto">
            {allSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد أقسام في النظام بعد</p>
            ) : (
              allSubjects.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggle(s.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel[s.type] ?? s.type}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              <X className="w-4 h-4 ml-1" /> إلغاء
            </Button>
            <Button onClick={saveAssignments} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ml-1" /> حفظ التفويض</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
