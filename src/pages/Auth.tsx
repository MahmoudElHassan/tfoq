import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { GraduationCap, Mail, Lock, User, Phone, BookOpen, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم قصير").max(100),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  password: z.string().min(6, "كلمة المرور يجب أن تكون ٦ أحرف على الأقل").max(72),
  phone: z.string().trim().max(20).optional(),
  grade: z.string().max(50).optional(),
  role: z.enum(["student", "parent", "teacher"]),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

const Auth = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSignup = params.get("mode") === "signup";
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    grade: "ثاني ثانوي",
    role: "student" as "student" | "parent" | "teacher",
  });

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        const parsed = signupSchema.parse(form);
        const { data, error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: parsed.full_name,
              phone: parsed.phone || null,
              grade: parsed.grade || null,
              role: parsed.role,
            },
          },
        });
        if (error) throw error;
        // Supabase يعيد user بدون identities إذا كان البريد مسجّلاً مسبقاً
        if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
          throw new Error("already registered");
        }
        toast.success("تم إنشاء حسابك بنجاح!", { description: "جاري تحويلك للوحة التحكم..." });
      } else {
        const parsed = loginSchema.parse({ email: form.email, password: form.password });
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.email,
          password: parsed.password,
        });
        if (error) throw error;
        toast.success("أهلاً بك مجدداً!");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "حدث خطأ";
      const friendly = msg.includes("Invalid login") ? "بيانات الدخول غير صحيحة"
        : msg.includes("already registered") ? "هذا البريد مسجّل مسبقاً، حاول تسجيل الدخول"
        : msg;
      toast.error("تعذّر إكمال العملية", { description: friendly });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-accent/15 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-2xl font-extrabold">منصة تفوّق</p>
            <p className="text-xs text-muted-foreground">للتحصيلي والقدرات</p>
          </div>
        </Link>

        <div className="bg-card rounded-3xl shadow-elegant border border-border p-8 animate-fade-in">
          <h1 className="font-display text-2xl font-extrabold text-center mb-2">
            {isSignup ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-7">
            {isSignup ? "ابدئي رحلتك التعليمية الآن" : "أهلاً بعودتك إلى منصتك"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <div>
                  <Label htmlFor="full_name">الاسم الكامل</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="full_name" required value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="pr-10" placeholder="مثال: نورة المطيري" />
                  </div>
                </div>

                <div>
                  <Label>الدور</Label>
                  <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">طالبة</SelectItem>
                      <SelectItem value="parent">ولي أمر</SelectItem>
                      <SelectItem value="teacher">معلمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.role === "student" && (
                  <div>
                    <Label htmlFor="grade">الصف الدراسي</Label>
                    <div className="relative mt-1.5">
                      <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                        <SelectTrigger className="pr-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="أول ثانوي">أول ثانوي</SelectItem>
                          <SelectItem value="ثاني ثانوي">ثاني ثانوي</SelectItem>
                          <SelectItem value="ثالث ثانوي">ثالث ثانوي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="phone">رقم الجوال (اختياري)</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="phone" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="pr-10" placeholder="05xxxxxxxx" />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pr-10" placeholder="example@email.com" dir="ltr" />
              </div>
            </div>

            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pr-10" placeholder="••••••••" />
              </div>
            </div>

            <Button type="submit" disabled={loading}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft h-12 text-base gap-2 mt-2">
              {loading ? "جارٍ المعالجة..." : (isSignup ? "إنشاء الحساب" : "دخول")}
              {!loading && <ArrowLeft className="w-4 h-4" />}
            </Button>
          </form>

          <div className="text-center mt-6 text-sm text-muted-foreground">
            {isSignup ? "لديك حساب بالفعل؟ " : "لا تملكين حساباً؟ "}
            <button type="button" onClick={() => setParams(isSignup ? {} : { mode: "signup" })}
              className="text-primary font-bold hover:underline">
              {isSignup ? "سجّلي الدخول" : "أنشئي حساباً"}
            </button>
          </div>
        </div>

        <Link to="/" className="block text-center mt-6 text-sm text-muted-foreground hover:text-foreground">
          ← العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
};

export default Auth;
