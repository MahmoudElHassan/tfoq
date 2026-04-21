import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  hint?: string;
  tone?: "primary" | "gold" | "info" | "success";
}

const toneMap = {
  primary: "bg-primary/10 text-primary",
  gold: "bg-accent/15 text-accent-foreground",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
};

export const StatCard = ({ label, value, icon: Icon, change, hint, tone = "primary" }: StatCardProps) => {
  const positive = (change ?? 0) >= 0;
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", toneMap[tone])}>
          <Icon className="w-6 h-6" />
        </div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
            positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-5">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="font-display text-3xl lg:text-4xl font-extrabold text-foreground mt-1.5">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
      </div>
    </div>
  );
};
