import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/site/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const blank = {
  subject_id: "", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "",
  correct_option: "A", explanation: "", difficulty: "medium", points: 10,
};

const TeacherDashboard = () => {
  const { user, isAdmin } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(blank);

  const load = async () => {
    const { data: subs } = await supabase.from("subjects").select("*");
    setSubjects(subs ?? []);
    let q = supabase.from("questions").select("*, subjects(name, type)").order("created_at", { ascending: false });
    if (!isAdmin && user) q = q.eq("created_by", user.id);
    const { data: qs } = await q;
    setQuestions(qs ?? []);
  };

  useEffect(() => { load(); }, [user, isAdmin]);

  const save = async () => {
    if (!user) return;
    if (!form.subject_id || !form.question_text || !form.option_a) {
      toast.error("الرجاء تعبئة الحقول الأساسية"); return;
    }
    const payload: any = { ...form, points: Number(form.points), created_by: user.id };
    const { error } = editing
      ? await supabase.from("questions").update(payload).eq("id", editing.id)
      : await supabase.from("questions").insert(payload);
    if (error) { toast.error("تعذّر الحفظ", { description: error.message }); return; }
    toast.success(editing ? "تم تحديث السؤال" : "تم إضافة السؤال");
    setOpen(false); setEditing(null); setForm(blank); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا السؤال؟")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) { toast.error("تعذّر الحذف"); return; }
    toast.success("تم الحذف"); load();
  };

  const openEdit = (q: any) => {
    setEditing(q);
    setForm({ ...q });
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-extrabold">لوحة المعلمة</h1>
            <p className="text-muted-foreground mt-2">إدارة الأسئلة في بنك التحصيلي والقدرات</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(blank); } }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground gap-2">
                <Plus className="w-4 h-4" /> سؤال جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "تعديل السؤال" : "إضافة سؤال جديد"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="md:col-span-2">
                  <Label>المادة</Label>
                  <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>نص السؤال</Label>
                  <Textarea className="mt-1.5" rows={3} value={form.question_text}
                    onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
                </div>
                {(["A", "B", "C", "D"] as const).map((k) => (
                  <div key={k}>
                    <Label>الخيار {k}</Label>
                    <Input className="mt-1.5" value={(form as any)[`option_${k.toLowerCase()}`]}
                      onChange={(e) => setForm({ ...form, [`option_${k.toLowerCase()}`]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <Label>الإجابة الصحيحة</Label>
                  <Select value={form.correct_option} onValueChange={(v) => setForm({ ...form, correct_option: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المستوى</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">سهل</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="hard">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>النقاط</Label>
                  <Input className="mt-1.5" type="number" value={form.points}
                    onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
                </div>
                <div className="md:col-span-2">
                  <Label>الشرح (اختياري)</Label>
                  <Textarea className="mt-1.5" rows={2} value={form.explanation ?? ""}
                    onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={save} className="bg-gradient-primary text-primary-foreground">
                  {editing ? "تحديث" : "حفظ"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          {questions.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-display text-xl font-bold">لا توجد أسئلة بعد</p>
              <p className="text-muted-foreground mt-2">ابدئي بإضافة سؤالك الأول</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {questions.map((q) => (
                <div key={q.id} className="p-5 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">{q.subjects?.name}</span>
                        <span className="text-xs bg-accent/15 text-accent-foreground px-2 py-0.5 rounded-full">{q.points} نقطة</span>
                        <span className="text-xs text-muted-foreground">{q.difficulty}</span>
                      </div>
                      <p className="font-medium leading-relaxed">{q.question_text}</p>
                      <p className="text-xs text-success mt-2">الإجابة: {q.correct_option}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(q)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
