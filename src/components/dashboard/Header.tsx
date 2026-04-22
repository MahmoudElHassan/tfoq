import { Search, Bell, Download } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
  subtitle: string;
  onExport: () => void;
  mobileMenu?: ReactNode;
}

export const Header = ({ title, subtitle, onExport, mobileMenu }: HeaderProps) => {
  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {mobileMenu}
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground truncate">{title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:block relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." className="pr-10 w-64 bg-background border-border" />
          </div>

          <button className="relative w-11 h-11 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors">
            <Bell className="w-5 h-5 text-secondary-foreground" />
            <span className="absolute top-2 left-2 w-2.5 h-2.5 bg-destructive rounded-full ring-2 ring-card" />
          </button>

          <Button onClick={onExport} className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-soft gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير Excel</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
