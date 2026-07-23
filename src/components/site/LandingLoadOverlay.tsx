import { GraduationCap, Loader2 } from "lucide-react";

type Props = {
  show: boolean;
  logoUrl: string;
  brandName: string;
};

export function LandingLoadOverlay({ show, logoUrl, brandName }: Props) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background/40 pointer-events-auto"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center justify-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={brandName || ""}
            decoding="async"
            draggable={false}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-contain bg-card shadow-soft"
          />
        ) : (
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
        )}
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
