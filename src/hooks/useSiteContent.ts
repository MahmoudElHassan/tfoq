import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSiteContent = <T = any>(id: string, fallback: T) => {
  const [content, setContent] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from("site_content").select("content").eq("id", id).maybeSingle().then(({ data }) => {
      if (mounted) {
        if (data?.content) {
          // Deep merge: fallback values fill gaps if DB content is missing keys
          const merged: any = { ...(fallback as any) };
          Object.entries(data.content as any).forEach(([k, v]) => {
            if (v === null || v === undefined) return;
            if (Array.isArray(v) && v.length === 0) return; // keep fallback if empty array
            if (typeof v === "string" && v.trim() === "") return; // keep fallback if empty string
            merged[k] = v;
          });
          setContent(merged);
        }
        setLoading(false);
      }
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { content, loading };
};
