import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, BookOpen, Users, Target, TrendingUp, Loader2, ShieldAlert, GraduationCap } from "lucide-react";
import { LearningManagement } from "@/components/learning/LearningManagement";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/site/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const blank = {
  subject_id: "", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "",
  correct_option: "A", explanation: "", difficulty: "medium", points: 10,
};

type Subject = { id: string; name: string; type: string };

const TeacherDashboard = () => {
  const { user, isAdmin } = useAuth();
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(blank);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch teacher's assigned subjects (admin sees all)
    let subs: Subject[] = [];
    if (isAdmin) {
      const { data } = await supabase.from("subjects").select("id, name, type");
      subs = (data ?? []) as Subject[];
    } else {
      const { data } = await supabase
        .from("teacher_subjects")
        .select("subject_id, subjects(id, name, type)")
        .eq("teacher_id", user.id);
      subs = (data ?? []).map((r: any) => r.subjects).filter(Boolean) as Subject[];
    }
    setMySubjects(subs);
    const subjectIds = subs.map((s) => s.id);

    // Questions in assigned subjects only
    let qQuery = supabase
      .from("questions")
      .select("*, subjects(name, type)")
      .order("created_at", { ascending: false });
    if (!isAdmin) {
      if (subjectIds.length === 0) {
        setQuestions([]);
        setStudentResults([]);
        setLoading(false);
        return;
      }
      qQuery = qQuery.in("subject_id", subjectIds);
    }
    const { data: qs } = await qQuery;
    setQuestions(qs ?? []);

    // Student results for questions in assigned subjects
    const questionIds = (qs ?? []).map((q: any) => q.id);
    if (questionIds.length === 0) {
      setStudentResults([]);
      setLoading(false);
      return;
    }
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("student_id, question_id, is_correct, points_earned, attempted_at")
      .in("question_id", questionIds);

    // Aggregate per student
    const qSubjMap: Record<string, string> = {};
    (qs ?? []).forEach((q: any) => { qSubjMap[q.id] = q.subject_id; });
    const subjNameMap: Record<string, string> = {};
    subs.forEach((s) => { subjNameMap[s.id] = s.name; });

    const perStudent: Record<string, { total: number; correct: number; points: number; subjects: Set<string>; lastAt: string }> = {};
    (attempts ?? []).forEach((a: any) => {
      if (!perStudent[a.student_id]) {
        perStudent[a.student_id] = { total: 0, correct: 0, points: 0, subjects: new Set(), lastAt: a.attempted_at };
      }
      const s = perStudent[a.student_id];
      s.total++;
      if (a.is_correct) s.correct++;
      s.points += a.points_earned ?? 0;
      const sid = qSubjMap[a.question_id];
      if (sid && subjNameMap[sid]) s.subjects.add(subjNameMap[sid]);
      if (new Date(a.attempted_at) > new Date(s.lastAt)) s.lastAt = a.attempted_at;
    });

    const studentIds = Object.keys(perStudent);
    if (studentIds.length === 0) {
      setStudentResults([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, grade")
      .in("id", studentIds);
    const profileMap: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

    const results = studentIds.map((id) => {
      const s = perStudent[id];
      return {
        id,
        name: profileMap[id]?.full_name ?? "طالب",
        grade: profileMap[id]?.grade ?? "—",
        total: s.total,
        correct: s.correct,
        points: s.points,
        rate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        subjects: [...s.subjects],
        lastAt: s.lastAt,
      };
    }).sort((a, b) => b.points - a.points);

    setStudentResults(results);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, isAdmin]);

  const save = async () => {
    if (!user) return;
    if (!form.subject_id || !form.question_text || !form.option_a) {
      toast.error("الرجاء تعبئة الحقول الأساسية"); return;
    }
    if (!isAdmin && !mySubjects.some((s) => s.id === form.subject_id)) {
      toast.error("لست مفوّضاً لهذا القسم"); return;
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

  const noAssignments = !isAdmin && mySubjects.length === 0;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="t-h1">لوحة المعلم</h1>
            <p className="t-body text-muted-foreground mt-2">إدارة الأسئلة ومتابعة نتائج الطلاب في أقسامك</p>
          </div>
          {!noAssignments && (
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
                        {mySubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
          )}
        </div>

        {/* Assigned subjects banner */}
        {!isAdmin && (
          <div className="mb-6 bg-card rounded-2xl p-4 sm:p-5 border border-border/50 shadow-card">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">أقسامي المفوّضة:</span>
              {mySubjects.length === 0 ? (
                <span className="text-sm text-muted-foreground">لم يتم تفويضك لأي قسم بعد. يرجى التواصل مع إدارة النظام.</span>
              ) : (
                mySubjects.map((s) => (
                  <Badge key={s.id} className="bg-primary/10 text-primary border-0">{s.name}</Badge>
                ))
              )}
            </div>
          </div>
        )}

        {noAssignments ? (
          <div className="bg-card rounded-2xl shadow-card border border-border p-12 text-center">
            <ShieldAlert className="w-14 h-14 text-warning mx-auto mb-4" />
            <p className="font-display text-xl font-bold">لا يوجد تفويض</p>
            <p className="text-muted-foreground mt-2">سيقوم مدير النظام بتفويضك لأقسام محددة لتتمكن من إضافة الأسئلة ومتابعة الطلاب.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="learning" className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="learning" className="gap-2"><GraduationCap className="w-4 h-4" />إدارة التعلّم</TabsTrigger>
              <TabsTrigger value="questions" className="gap-2"><BookOpen className="w-4 h-4" />بنك الأسئلة</TabsTrigger>
              <TabsTrigger value="students" className="gap-2"><Users className="w-4 h-4" />نتائج الطلاب</TabsTrigger>
            </TabsList>

            <TabsContent value="learning">
              <LearningManagement />
            </TabsContent>

            <TabsContent value="questions">
              <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
                {questions.length === 0 ? (
                  <div className="p-12 text-center">
                    <BookOpen className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="font-display text-xl font-bold">لا توجد أسئلة بعد</p>
                    <p className="text-muted-foreground mt-2">ابدأ بإضافة سؤالك الأول في أحد أقسامك المفوّضة</p>
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
            </TabsContent>

            <TabsContent value="students">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="w-4 h-4" /> عدد الطلاب</div>
                  <p className="font-display text-3xl font-extrabold mt-2">{studentResults.length.toLocaleString("ar")}</p>
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Target className="w-4 h-4" /> متوسط النجاح</div>
                  <p className="font-display text-3xl font-extrabold mt-2">
                    {studentResults.length > 0
                      ? Math.round(studentResults.reduce((a, b) => a + b.rate, 0) / studentResults.length)
                      : 0}%
                  </p>
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="w-4 h-4" /> إجمالي المحاولات</div>
                  <p className="font-display text-3xl font-extrabold mt-2">
                    {studentResults.reduce((a, b) => a + b.total, 0).toLocaleString("ar")}
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
                {studentResults.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="font-display text-xl font-bold">لا توجد نتائج بعد</p>
                    <p className="text-muted-foreground mt-2">ستظهر نتائج الطلاب هنا فور بدئهم بحل أسئلة أقسامك</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead className="bg-secondary/40 text-muted-foreground">
                        <tr>
                          <th className="text-right p-4 font-semibold">الطالب</th>
                          <th className="text-right p-4 font-semibold">الصف</th>
                          <th className="text-right p-4 font-semibold">المحاولات</th>
                          <th className="text-right p-4 font-semibold">الصحيحة</th>
                          <th className="text-right p-4 font-semibold">نسبة النجاح</th>
                          <th className="text-right p-4 font-semibold">النقاط</th>
                          <th className="text-right p-4 font-semibold">آخر محاولة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {studentResults.map((s) => (
                          <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="p-4 font-semibold">{s.name}</td>
                            <td className="p-4 text-muted-foreground">{s.grade}</td>
                            <td className="p-4">{s.total.toLocaleString("ar")}</td>
                            <td className="p-4 text-success font-bold">{s.correct.toLocaleString("ar")}</td>
                            <td className="p-4">
                              <span className={`font-bold ${s.rate >= 70 ? "text-success" : s.rate >= 50 ? "text-warning" : "text-destructive"}`}>
                                {s.rate}%
                              </span>
                            </td>
                            <td className="p-4 font-bold text-primary">{s.points.toLocaleString("ar")}</td>
                            <td className="p-4 text-xs text-muted-foreground">{new Date(s.lastAt).toLocaleDateString("ar")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
