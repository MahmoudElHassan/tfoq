import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Loader2, ClipboardList, ChevronRight, Lock, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Subject } from "./LearningManagement";
import { visibilityLabels, visibilityOptions } from "./shared";

type Template = {
  id: string;
  title: string;
  description: string | null;
  subject_id: string;
  created_by: string;
  visibility: "private" | "subject" | "public";
  duration_minutes: number | null;
  question_count?: number;
};

type Question = {
  id?: string;
  template_id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "a" | "b" | "c" | "d";
  explanation?: string;
  points: number;
  position: number;
};

const visIcon = { private: Lock, subject: Users, public: Globe } as const;

const blankQ = (position: number): Question => ({
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "a",
  explanation: "",
  points: 10,
  position,
});

export const QuizTemplatesCenter = ({ subjects }: { subjects: Subject[] }) => {
  const { user, isAdmin } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ title: "", description: "", subject_id: "", visibility: "private" as Template["visibility"], duration_minutes: 30 });
  const [questions, setQuestions] = useState<Question[]>([blankQ(0)]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: tpls } = await supabase
      .from("quiz_templates")
      .select("*")
      .order("created_at", { ascending: false });
    const ids = (tpls ?? []).map((t: any) => t.id);
    let counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: qs } = await supabase
        .from("quiz_template_questions")
        .select("template_id")
        .in("template_id", ids);
      (qs ?? []).forEach((q: any) => { counts[q.template_id] = (counts[q.template_id] ?? 0) + 1; });
    }
    setTemplates((tpls ?? []).map((t: any) => ({ ...t, question_count: counts[t.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", subject_id: subjects[0]?.id ?? "", visibility: "private", duration_minutes: 30 });
    setQuestions([blankQ(0)]);
    setOpen(true);
  };

  const openEdit = async (tpl: Template) => {
    setEditing(tpl);
    setForm({
      title: tpl.title,
      description: tpl.description ?? "",
      subject_id: tpl.subject_id,
      visibility: tpl.visibility,
      duration_minutes: tpl.duration_minutes ?? 30,
    });
    const { data } = await supabase
      .from("quiz_template_questions")
      .select("*")
      .eq("template_id", tpl.id)
      .order("position");
    setQuestions(((data ?? []) as any[]).map((q) => ({
      ...q,
      correct_option: (q.correct_option as string).toLowerCase() as Question["correct_option"],
    })));
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.subject_id) { toast.error("الرجاء تعبئة العنوان والمادة"); return; }
    if (questions.length === 0) { toast.error("أضيفي سؤالاً واحداً على الأقل"); return; }
    for (const q of questions) {
      if (!q.question_text.trim() || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
        toast.error("الرجاء تعبئة جميع حقول الأسئلة"); return;
      }
    }

    setSaving(true);
    let tplId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("quiz_templates").update({
        title: form.title, description: form.description, subject_id: form.subject_id,
        visibility: form.visibility, duration_minutes: form.duration_minutes,
      }).eq("id", editing.id);
      if (error) { toast.error("تعذّر التحديث", { description: error.message }); setSaving(false); return; }
      await supabase.from("quiz_template_questions").delete().eq("template_id", editing.id);
    } else {
      const { data, error } = await supabase.from("quiz_templates").insert({
        title: form.title, description: form.description, subject_id: form.subject_id,
        visibility: form.visibility, duration_minutes: form.duration_minutes,
        created_by: user.id,
      }).select("id").single();
      if (error) { toast.error("تعذّر الحفظ", { description: error.message }); setSaving(false); return; }
      tplId = data.id;
    }

    const payload = questions.map((q, i) => ({
      template_id: tplId!,
      question_text: q.question_text,
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation || null,
      points: Number(q.points) || 10,
      position: i,
    }));
    const { error: qErr } = await supabase.from("quiz_template_questions").insert(payload);
    if (qErr) { toast.error("تعذّر حفظ الأسئلة", { description: qErr.message }); setSaving(false); return; }

    toast.success(editing ? "تم تحديث النموذج" : "تم إنشاء النموذج");
    setOpen(false); setSaving(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا النموذج وكل أسئلته؟")) return;
    const { error } = await supabase.from("quiz_templates").delete().eq("id", id);
    if (error) { toast.error("تعذّر الحذف"); return; }
    toast.success("تم الحذف"); load();
  };

  const subjectsById = Object.fromEntries(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> مكتبة نماذج الاختبارات
          </h3>
          <p className="text-sm text-muted-foreground mt-1">أنشئي نماذج اختبار جاهزة بأسئلة اختيار من متعدد</p>
        </div>
        <Button onClick={openNew} disabled={subjects.length === 0} className="bg-gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> نموذج جديد
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : templates.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 border border-border/50 text-center">
          <ClipboardList className="w-14 h-14 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-display text-lg font-bold">لا توجد نماذج بعد</p>
          <p className="text-sm text-muted-foreground mt-1">ابدئي بإنشاء أول نموذج اختبار محاكي</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const VisIcon = visIcon[t.visibility];
            const canEdit = isAdmin || t.created_by === user?.id;
            return (
              <div key={t.id} className="bg-card rounded-2xl p-5 border border-border/50 shadow-card hover:shadow-elegant transition-all flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary border-0">{subjectsById[t.subject_id]?.name ?? "—"}</Badge>
                  <Badge variant="outline" className="gap-1 text-xs"><VisIcon className="w-3 h-3" />{visibilityLabels[t.visibility]}</Badge>
                </div>
                <h4 className="font-display font-bold text-lg leading-tight">{t.title}</h4>
                {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                  <span>{t.question_count} سؤال</span>
                  <span>•</span>
                  <span>{t.duration_minutes} دقيقة</span>
                </div>
                {canEdit && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)} className="flex-1 gap-1">
                      <Edit2 className="w-3 h-3" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(t.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل النموذج" : "نموذج اختبار جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>عنوان النموذج</Label>
                <Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: نموذج تجريبي - قدرات كمي" />
              </div>
              <div className="md:col-span-2">
                <Label>وصف النموذج</Label>
                <Textarea className="mt-1.5" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>المادة</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المدة (دقيقة)</Label>
                <Input className="mt-1.5" type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </div>
              <div className="md:col-span-2">
                <Label>المشاركة</Label>
                <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as any })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">الأسئلة ({questions.length})</h4>
                <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, blankQ(questions.length)])} className="gap-1">
                  <Plus className="w-3 h-3" /> إضافة سؤال
                </Button>
              </div>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="border border-border rounded-xl p-3 bg-secondary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">السؤال #{i + 1}</span>
                      {questions.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Textarea placeholder="نص السؤال" rows={2} value={q.question_text}
                      onChange={(e) => { const n = [...questions]; n[i].question_text = e.target.value; setQuestions(n); }} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(["a", "b", "c", "d"] as const).map((k) => (
                        <Input key={k} placeholder={`الخيار ${k.toUpperCase()}`} value={(q as any)[`option_${k}`]}
                          onChange={(e) => { const n = [...questions]; (n[i] as any)[`option_${k}`] = e.target.value; setQuestions(n); }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">الإجابة الصحيحة</Label>
                        <Select value={q.correct_option} onValueChange={(v) => { const n = [...questions]; n[i].correct_option = v as any; setQuestions(n); }}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["a", "b", "c", "d"] as const).map((k) => <SelectItem key={k} value={k}>{k.toUpperCase()}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">النقاط</Label>
                        <Input type="number" min={1} className="mt-1" value={q.points}
                          onChange={(e) => { const n = [...questions]; n[i].points = Number(e.target.value); setQuestions(n); }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "تحديث النموذج" : "حفظ النموذج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
