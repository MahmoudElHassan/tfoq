import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useLandingSiteContent = <T = any>(
  heroFallback: T,
  featuresFallback: T,
  aboutFallback: T
) => {
  const [hero, setHero] = useState<T>(heroFallback);
  const [features, setFeatures] = useState<T>(featuresFallback);
  const [about, setAbout] = useState<T>(aboutFallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const merge = (dbContent: any, fallback: T): T => {
      if (!dbContent || typeof dbContent !== "object") return fallback;
      const merged: any = { ...(fallback as any) };
      Object.entries(dbContent).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        merged[k] = v;
      });
      return merged as T;
    };

    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("site_content")
          .select("id, content")
          .in("id", ["hero", "features_section", "about"]);

        if (!mounted) return;

        if (!error && Array.isArray(data)) {
          data.forEach((row: any) => {
            if (row?.id === "hero") setHero(merge(row.content, heroFallback));
            else if (row?.id === "features_section") setFeatures(merge(row.content, featuresFallback));
            else if (row?.id === "about") setAbout(merge(row.content, aboutFallback));
          });
        }
      } catch {
        // keep fallbacks on error
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { hero, features, about, loading };
};