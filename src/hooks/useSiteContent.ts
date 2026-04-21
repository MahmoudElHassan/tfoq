import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSiteContent = <T = any>(id: string, fallback: T) => {
  const [content, setContent] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from("site_content").select("content").eq("id", id).maybeSingle().then(({ data }) => {
      if (mounted && data?.content) setContent({ ...fallback, ...(data.content as any) });
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  return { content, loading };
};
