import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loads a site_content row by id and keeps it in sync with admin edits via realtime.
 *
 * Merge rule: any key present in DB (including empty string / empty array) WINS over the
 * fallback. Only keys that are completely missing (undefined) or explicitly null fall back
 * to the default. This way, when the admin clears a field it actually clears on the site.
 */
export const useSiteContent = <T = any>(id: string, fallback: T) => {
  const [content, setContent] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const merge = (dbContent: any): T => {
      if (!dbContent || typeof dbContent !== "object") return fallback;
      const merged: any = { ...(fallback as any) };
      Object.entries(dbContent).forEach(([k, v]) => {
        if (v === undefined || v === null) return; // keep fallback only if truly missing
        merged[k] = v;
      });
      return merged as T;
    };

    const fetchOnce = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("id", id)
        .maybeSingle();
      if (!mounted) return;
      setContent(merge(data?.content));
      setLoading(false);
    };

    fetchOnce();

    // Subscribe to realtime updates so admin edits appear instantly on the live site.
    const channel = supabase
      .channel(`site_content:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content", filter: `id=eq.${id}` },
        (payload: any) => {
          if (!mounted) return;
          const next = (payload.new as any)?.content;
          if (next !== undefined) setContent(merge(next));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { content, loading };
};
