import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Runs once on app boot. Confirms Vite loaded Supabase env vars and that
 * the remote DB responds. Does not block rendering.
 */
export const DbHealthCheck = () => {
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

    (async () => {
      const envOk = Boolean(url && key && String(url).includes("supabase"));

      if (!envOk) {
        toast.error("إعدادات قاعدة البيانات ناقصة", {
          description: "تأكد من وجود VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY في ملف .env ثم أعد تشغيل npm run dev.",
          duration: 12000,
        });
        return;
      }

      const site = await supabase.from("site_content").select("id").limit(1);
      if (site.error) {
        toast.error("تعذّر الاتصال بقاعدة البيانات", {
          description: site.error.message,
          duration: 12000,
        });
        return;
      }

    })();
  }, []);

  return null;
};
