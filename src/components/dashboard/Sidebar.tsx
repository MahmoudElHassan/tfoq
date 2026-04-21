import { LayoutDashboard, BarChart3, BookOpenCheck, Users, GraduationCap, UserCog, Settings, LogOut, UsersRound, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  active: string;
  onChange: (id: string) => void;
}

const items = [
  { id: "overview", label: "النظرة العامة", icon: LayoutDashboard },
  { id: "stats", label: "الإحصائيات التفصيلية", icon: BarChart3 },
  { id: "users", label: "إدارة المستخدمين", icon: UsersRound },
  { id: "content", label: "تحرير الصفحة الرئيسية", icon: FileEdit },
  { id: "questions", label: "إدارة الأسئلة", icon: BookOpenCheck },
  { id: "teachers", label: "المعلمات والتفويض", icon: UserCog },
  { id: "students", label: "الطالبات", icon: GraduationCap },
  { id: "parents", label: "أولياء الأمور", icon: Users },
];

export const Sidebar = ({ active, onChange }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const initial = (user?.email?.[0] ?? "م").toUpperCase();
  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-elegant">
            <GraduationCap className="w-7 h-7 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold leading-tight">منصة تفوّق</h1>
            <p className="text-xs text-sidebar-foreground/70">ثانوية الطالبات</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-sidebar-foreground/50 px-3 py-2 uppercase tracking-wider">القائمة الرئيسية</p>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft border-r-4 border-sidebar-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 transition-colors">
          <Settings className="w-5 h-5" />
          <span>الإعدادات</span>
        </button>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
        <div className="mt-3 p-3 rounded-xl bg-sidebar-accent/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center font-bold text-sidebar-primary-foreground">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" dir="ltr">{user?.email ?? "—"}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">مديرة النظام</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
