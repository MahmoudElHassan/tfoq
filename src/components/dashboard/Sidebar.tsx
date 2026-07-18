import { LayoutDashboard, BarChart3, BookOpenCheck, Users, GraduationCap, UserCog, Settings, LogOut, UsersRound, FileEdit, Activity, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

type Branding = {
  logo_url: string;
  brand_name: string;
  theme_id: string;
  primary: string | null;
  accent: string | null;
};

const DEFAULT_BRANDING: Branding = {
  logo_url: "",
  brand_name: "منصة تفوّق",
  theme_id: "moe-green",
  primary: null,
  accent: null,
};

interface SidebarProps {
  active: string;
  onChange: (id: string) => void;
}

const isSettings = (s: string) => s === "settings";

const items = [
  { id: "overview", label: "النظرة العامة", icon: LayoutDashboard },
  { id: "stats", label: "الإحصائيات التفصيلية", icon: BarChart3 },
  { id: "users", label: "إدارة المستخدمين", icon: UsersRound },
  { id: "content", label: "تحرير الصفحة الرئيسية", icon: FileEdit },
  { id: "faq", label: "الأسئلة الشائعة", icon: MessageCircle },
  { id: "questions", label: "إدارة التعلّم", icon: BookOpenCheck },
  { id: "teachers", label: "المعلمات والتفويض", icon: UserCog },
  { id: "students", label: "الطالبات", icon: GraduationCap },
  { id: "parents", label: "أولياء الأمور", icon: Users },
];

const SidebarInner = ({ active, onChange }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const { content: brand } = useSiteContent<Branding>("branding", DEFAULT_BRANDING);
  const initial = (user?.email?.[0] ?? "م").toUpperCase();
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.brand_name} className="w-12 h-12 rounded-xl object-contain bg-card shadow-elegant" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-elegant">
              <GraduationCap className="w-7 h-7 text-sidebar-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="font-display text-xl font-extrabold leading-tight">{brand.brand_name}</h1>
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
        <Link
          to="/admin/live-monitor"
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
        >
          <Activity className="w-5 h-5 shrink-0 text-success" />
          <span>المراقبة اللحظية</span>
          <span className="ml-auto text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-bold">LIVE</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => onChange("settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
            isSettings(active)
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft border-r-4 border-sidebar-primary"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
          )}
        >
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
    </div>
  );
};

export const Sidebar = ({ active, onChange }: SidebarProps) => {
  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col sticky top-0 h-screen">
      <SidebarInner active={active} onChange={onChange} />
    </aside>
  );
};

interface MobileSidebarProps extends SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileSidebar = ({ active, onChange, open, onOpenChange }: MobileSidebarProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden w-11 h-11 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors shrink-0"
          aria-label="فتح القائمة"
        >
          <Menu className="w-5 h-5 text-secondary-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-80 max-w-[85vw] border-sidebar-border">
        <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
        <SheetDescription className="sr-only">تنقل بين أقسام لوحة التحكم</SheetDescription>
        <SidebarInner
          active={active}
          onChange={(id) => {
            onChange(id);
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
