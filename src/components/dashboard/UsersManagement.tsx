import { useEffect, useState } from "react";
import { Trash2, ShieldOff, ShieldCheck, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AppUser = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  grade: string | null;
  total_points: number;
  is_active: boolean;
  created_at: string;
  roles: string[];
};

const roleLabels: Record<string, string> = {
  admin: "مديرة", teacher: "معلمة", parent: "ولية أمر", student: "طالبة",
};

const roleColors: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/20",
  teacher: "bg-info/15 text-info border-info/20",
  parent: "bg-success/15 text-success border-success/20",
  student: "bg-accent/15 text-accent-foreground border-accent/20",
};

export const UsersManagement = ({ filterRole }: { filterRole?: string }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
    if (error) toast.error("فشل تحميل المستخدمين");
    else setUsers(data?.users ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const call = async (action: string, payload: any, successMsg: string) => {
    setBusy(payload.targetUserId);
    const { error } = await supabase.functions.invoke("admin-users", { body: { action, ...payload } });
    setBusy(null);
    if (error) { toast.error("فشلت العملية"); return; }
    toast.success(successMsg);
    load();
  };

  const filtered = users
    .filter(u => !filterRole || u.roles.includes(filterRole))
    .filter(u =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border/50 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحثي بالاسم أو البريد..." className="pr-10" />
        </div>
        <Badge variant="secondary" className="font-bold shrink-0">{filtered.length} مستخدم</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-muted/40 text-right">
            <tr>
              <th className="p-4 font-bold">الاسم</th>
              <th className="p-4 font-bold">البريد</th>
              <th className="p-4 font-bold">الدور</th>
              <th className="p-4 font-bold">النقاط</th>
              <th className="p-4 font-bold">الحالة</th>
              <th className="p-4 font-bold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border/40 hover:bg-muted/30">
                <td className="p-4 font-bold">{u.full_name}</td>
                <td className="p-4 text-muted-foreground" dir="ltr">{u.email || "—"}</td>
                <td className="p-4">
                  <Select
                    value={u.roles[0] ?? "student"}
                    onValueChange={(v) => call("set_role", { targetUserId: u.id, role: v }, "تم تحديث الدور")}
                    disabled={busy === u.id}
                  >
                    <SelectTrigger className={`w-32 h-8 text-xs font-bold border ${roleColors[u.roles[0]] ?? ""}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-4 font-bold">{u.total_points}</td>
                <td className="p-4">
                  {u.is_active
                    ? <Badge className="bg-success/15 text-success border-success/20 hover:bg-success/15">نشط</Badge>
                    : <Badge variant="destructive">معطّل</Badge>}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => call("toggle_active", { targetUserId: u.id, isActive: !u.is_active },
                        u.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب")}
                      disabled={busy === u.id}
                    >
                      {u.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنتِ متأكدة من حذف الحساب «{u.full_name}»؟ لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => call("delete", { targetUserId: u.id }, "تم حذف الحساب")}
                          >
                            حذف نهائي
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا يوجد مستخدمون</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
