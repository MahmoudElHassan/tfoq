import { useEffect, useState } from "react";
import { Plus, Link2, GraduationCap, Trophy, Activity, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/site/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: links } = await supabase.from("parent_student_links")
      .select("student_id, profiles:student_id(*)").eq("parent_id", user.id);
    const kids = (links ?? []).map((l: any) => l.profiles).filter(Boolean);

    for (const k of kids) {
      const { count } = await supabase.from("quiz_attempts")
        .select("*", { count: "exact", head: true }).eq("student_id", k.id);
      const { count: correct } = await supabase.from("quiz_attempts")
        .select("*", { count: "exact", head: true }).eq("student_id", k.id).eq("is_correct", true);
      k._stats = { total: count ?? 0, correct: correct ?? 0 };
    }
    setChildren(kids);
  };

  useEffect(() => { load(); }, [user]);

  const linkChild = async () => {
    if (!user || !email) return;
    // Find student by email - use a simple approach via RPC-like pattern; profiles RLS allows authenticated to view leaderboard students
    const { data: stu } = await supabase.from("profiles").select("id, email").eq("email", email).maybeSingle();
    if (!stu) { toast.error("لم نجد حساب طالبة بهذا البريد"); return; }
    const { error } = await supabase.from("parent_student_links").insert({
      parent_id: user.id, student_id: stu.id,
    });
    if (error) { toast.error("تعذّر الربط", { description: error.message }); return; }
    toast.success("تم ربط الطالبة بحسابك");
    setEmail(""); setOpen(false); load();
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-extrabold">لوحة ولي الأمر</h1>
            <p className="text-muted-foreground mt-2">تابع/ي أداء أبنائك في المنصة</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {children.map((c) => (
              <div key={c.id} className="bg-card rounded-2xl p-6 shadow-card border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-bold font-display text-xl flex items-center justify-center">
                    {c.full_name[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-bold">{c.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{c.grade ?? "ـ"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
