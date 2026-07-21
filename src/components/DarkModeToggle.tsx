import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DarkModeToggleProps = {
  className?: string;
};

export const DarkModeToggle = ({ className }: DarkModeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("shrink-0", className)}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={label}
          aria-pressed={isDark}
        >
          {isDark ? <Sun /> : <Moon />}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};
