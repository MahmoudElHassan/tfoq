import { useEffect, useState } from "react";
import { Link2, GraduationCap, Trophy, Activity, Users, Unlink, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/site/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from "recharts";

type ChildStats = {
  total: number;
  correct: number;
  pointsBySubject: { name: string; points: number; attempts: number; correct: number }[];
};

type Child = {
  id: string;
  full_name: string;
  grade: string | null;
  total_points: number;
  _stats?: ChildStats;
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--warning))"];

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadStatsFor = async (childId: string): Promise<ChildStats> => {
    const { data } = await supabase
      .from("quiz_attempts")
      .select("points_earned, is_correct, questions:question_id(subject_id, subjects:subject_id(name))")
      .eq("student_id", childId)
      .order("attempted_at", { ascending: false })
      .limit(1000);

    const groups = new Map<string, { name: string; points: number; attempts: number; correct: number }>();
    let total = 0, correct = 0;
    (data ?? []).forEach((a: any) => {
      total++;
      if (a.is_correct) correct++;
      const name = a.questions?.subjects?.name ?? "غير مصنّف";
      const cur = groups.get(name) ?? { name, points: 0, attempts: 0, correct: 0 };
      cur.points += a.points_earned ?? 0;
      cur.attempts += 1;
      if (a.is_correct) cur.correct += 1;
      groups.set(name, cur);
    });
    return {
      total, correct,
      pointsBySubject: Array.from(groups.values()).sort((a, b) => b.points - a.points),
    };
  };

  const load = async () => {
    if (!user) return;
    const { data: links } = await supabase.from("parent_student_links")
      .select("student_id, profiles:student_id(*)").eq("parent_id", user.id);
    const kids: Child[] = (links ?? []).map((l: any) => l.profiles).filter(Boolean);
    for (const k of kids) {
      k._stats = await loadStatsFor(k.id);
    }
    setChildren(kids);
  };

  useEffect(() => { load(); }, [user]);

  const linkChild = async () => {
    if (!user || !email) return;
    const cleanEmail = email.trim().toLowerCase();
    const { data: stu } = await supabase
      .from("profiles").select("id, email").ilike("email", cleanEmail).maybeSingle();
    if (!stu) {
      toast.error("لم نجد حساب طالبة بهذا البريد", {
        description: "تأكدي من البريد ومن أن الطالبة قد سجّلت في المنصة كـ«طالبة».",
      });
      return;
    }
    const { error } = await supabase.from("parent_student_links").insert({
      parent_id: user.id, student_id: stu.id,
    });
    if (error) {
      const dup = error.code === "23505" || /duplicate|unique/i.test(error.message);
      toast.error(dup ? "هذه الطالبة مرتبطة بحسابك مسبقاً" : "تعذّر الربط", {
        description: dup ? undefined : error.message,
      });
      return;
    }
    toast.success("تم ربط الطالبة بحسابك");
    setEmail(""); setOpen(false); load();
  };

  const unlinkChild = async (childId: string, name: string) => {
    if (!user) return;
    setBusy(childId);
    // Optimistic UI update
    const prev = children;
    setChildren(prev.filter((c) => c.id !== childId));
    const { error } = await supabase.from("parent_student_links")
      .delete().eq("parent_id", user.id).eq("student_id", childId);
    setBusy(null);
    if (error) {
      setChildren(prev); // rollback
      toast.error("تعذّر فك الربط", { description: error.message });
      return;
    }
    toast.success(`تم فك ربط ${name}`);
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="t-h1">لوحة ولي الأمر</h1>
            <p className="t-body text-muted-foreground mt-2">تابع/ي أداء أبنائك في المنصة</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground gap-2">
                <Link2 className="w-4 h-4" /> ربط طالبة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>ربط حساب طالبة</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Label>البريد الإلكتروني للطالبة</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" placeholder="student@email.com" />
                <p className="text-xs text-muted-foreground">يجب أن تكون الطالبة قد سجّلت في المنصة سابقاً.</p>
              </div>
              <DialogFooter>
                <Button onClick={linkChild} className="bg-gradient-primary text-primary-foreground">ربط</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {children.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 text-center border border-border shadow-card">
            <Users className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-display text-xl font-bold">لم تربط أي طالبة بعد</p>
            <p className="text-muted-foreground mt-2">اضغط/ي على زر "ربط طالبة" للبدء</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {children.map((c) => {
              const subjects = c._stats?.pointsBySubject ?? [];
              const accuracy = c._stats && c._stats.total > 0
                ? Math.round((c._stats.correct / c._stats.total) * 100) : 0;

              return (
                <div key={c.id} className="bg-card rounded-2xl p-6 shadow-card border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-bold font-display text-xl flex items-center justify-center">
                      {c.full_name[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-bold">{c.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{c.grade ?? "ـ"}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" disabled={busy === c.id}
                          className="text-destructive hover:bg-destructive/10 gap-1.5">
                          <Unlink className="w-4 h-4" /> فك الربط
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد فك الربط</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنتِ متأكدة من فك ربط «{c.full_name}» من حسابك؟ لن يحذف هذا حساب الطالبة، لكنه سيُزيلها من قائمة متابعتك.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => unlinkChild(c.id, c.full_name)}>
                            فك الربط
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mt-5">
                    <div className="text-center p-3 rounded-xl bg-accent/10">
                      <Trophy className="w-5 h-5 text-accent mx-auto mb-1" />
                      <p className="font-display font-extrabold text-lg">{c.total_points}</p>
                      <p className="text-[10px] text-muted-foreground">نقاط</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-primary/10">
                      <Activity className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="font-display font-extrabold text-lg">{c._stats?.total ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">محاولات</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-success/10">
                      <GraduationCap className="w-5 h-5 text-success mx-auto mb-1" />
                      <p className="font-display font-extrabold text-lg">{c._stats?.correct ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">صحيحة</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-info/10">
                      <BarChart3 className="w-5 h-5 text-info mx-auto mb-1" />
                      <p className="font-display font-extrabold text-lg">{accuracy}%</p>
                      <p className="text-[10px] text-muted-foreground">دقة</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-display font-bold text-sm">النقاط حسب الاختبار</h4>
                      <span className="text-[11px] text-muted-foreground">{subjects.length} اختبار</span>
                    </div>

                    {subjects.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground bg-muted/30 rounded-xl">
                        لا توجد محاولات بعد
                      </div>
                    ) : (
                      <>
                        <div className="h-48 -mx-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjects} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                interval={0} angle={subjects.length > 4 ? -20 : 0} textAnchor={subjects.length > 4 ? "end" : "middle"} height={subjects.length > 4 ? 50 : 30} />
                              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: 12,
                                  fontSize: 12,
                                }}
                                formatter={(v: any) => [`${v} نقطة`, "النقاط"]}
                              />
                              <Bar dataKey="points" radius={[8, 8, 0, 0]}>
                                {subjects.map((_, i) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="mt-4 space-y-2">
                          {subjects.map((s, i) => (
                            <div key={s.name} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className="font-bold text-sm truncate">{s.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                                <span>{s.correct}/{s.attempts} صحيحة</span>
                                <span className="font-display font-extrabold text-sm text-foreground">{s.points} نقطة</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
