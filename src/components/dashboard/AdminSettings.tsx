import { useEffect, useState } from "react";
import { Loader2, Save, KeyRound, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const AdminSettings = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    setSavingProfile(false);
    if (error) toast.error("فشل حفظ البيانات");
    else toast.success("تم حفظ البيانات الشخصية");
  };

  const changePassword = async () => {
    if (newPassword.length < 6) { toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف"); return; }
    if (newPassword !== confirmPassword) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error("فشل تغيير كلمة المرور");
    else {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setNewPassword(""); setConfirmPassword("");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
        <div className="flex items-center gap-2 mb-5">
          <UserIcon className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold">البيانات الشخصية</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" value={user?.email ?? ""} disabled dir="ltr" className="mt-1.5 bg-muted" />
          </div>
          <div>
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="phone">رقم الجوال</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="mt-1.5" />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2">
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التعديلات
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold">تغيير كلمة المرور</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1.5" />
          </div>
          <Button onClick={changePassword} disabled={savingPassword} className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2">
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            تحديث كلمة المرور
          </Button>
        </div>
      </div>
    </div>
  );
};
