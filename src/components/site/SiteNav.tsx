import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const SiteNav = () => {
  const { user, signOut } = useAuth();
  return (
    <nav className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-extrabold text-foreground leading-none">منصة تفوّق</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">للتحصيلي والقدرات</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/" className="px-4 py-2 rounded-lg hover:bg-secondary text-foreground font-medium">الرئيسية</Link>
          <a href="/#features" className="px-4 py-2 rounded-lg hover:bg-secondary text-foreground font-medium">المميزات</a>
          <Link to="/leaderboard" className="px-4 py-2 rounded-lg hover:bg-secondary text-foreground font-medium">الترتيب</Link>
          {user && <Link to="/dashboard" className="px-4 py-2 rounded-lg hover:bg-secondary text-foreground font-medium">لوحتي</Link>}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard"><Button variant="outline" size="sm">لوحتي</Button></Link>
              <Button size="sm" variant="ghost" onClick={signOut}>خروج</Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">دخول</Button></Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft">إنشاء حساب</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
