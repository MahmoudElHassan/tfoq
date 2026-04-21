import { Search, Bell, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
  subtitle: string;
  onExport: () => void;
}

export const Header = ({ title, subtitle, onExport }: HeaderProps) => {
  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
      <div className="flex items-center justify-between gap-4 px-6 lg:px-8 py-5">
        <div className="min-w-0">
          <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
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
