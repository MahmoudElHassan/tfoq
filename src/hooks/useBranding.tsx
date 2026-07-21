import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSiteContent } from "@/hooks/useSiteContent";
import {
  BRANDING_PREVIEW_EVENT,
  readBrandingPreview,
  type BrandingPreview,
} from "@/lib/brandingPreview";
import {
  BRANDING_PUBLISHED_EVENT,
  normalizePublishedBranding,
  readPublishedBrandingCache,
  writePublishedBrandingCache,
  type PublishedBranding,
} from "@/lib/brandingCache";
import { SEED_BRANDING } from "@/lib/brandingDefaults";

type BrandingRow = PublishedBranding;

type BrandingContextValue = {
  brand: BrandingRow;
  loading: boolean;
  isPreview: boolean;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function useBrandingState(): BrandingContextValue {
  const cached = readPublishedBrandingCache();
  const { content, loading } = useSiteContent<BrandingRow>(
    "branding",
    cached ?? SEED_BRANDING,
  );

  const [preview, setPreview] = useState<BrandingPreview | null>(() =>
    readBrandingPreview(),
  );

  // Optimistic published row after admin save (before realtime catches up).
  const [publishedOverride, setPublishedOverride] = useState<BrandingRow | null>(
    null,
  );

  const lastCachedJsonRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPreview = (e: Event) => {
      const detail = (e as CustomEvent<BrandingPreview | null>).detail ?? null;
      setPreview(detail);
    };
    const onPublished = (e: Event) => {
      const detail = (e as CustomEvent<PublishedBranding | null>).detail;
      const normalized = normalizePublishedBranding(detail);
      if (normalized) setPublishedOverride(normalized);
    };
    window.addEventListener(BRANDING_PREVIEW_EVENT, onPreview);
    window.addEventListener(BRANDING_PUBLISHED_EVENT, onPublished);
    return () => {
      window.removeEventListener(BRANDING_PREVIEW_EVENT, onPreview);
      window.removeEventListener(BRANDING_PUBLISHED_EVENT, onPublished);
    };
  }, []);

  // When realtime/DB content matches override, drop the override.
  useEffect(() => {
    if (!publishedOverride || loading) return;
    const a = JSON.stringify(normalizePublishedBranding(content));
    const b = JSON.stringify(publishedOverride);
    if (a === b) setPublishedOverride(null);
  }, [content, loading, publishedOverride]);

  // Mirror settled published brand to localStorage (not while previewing).
  // Only mirror when normalize succeeds so we never re-write a stale
  // moe-green seed into the v2 cache.
  // notify:false — avoid re-entering publishedOverride on every DB sync.
  useEffect(() => {
    if (loading) return;
    if (preview) return;
    const row = normalizePublishedBranding(publishedOverride ?? content);
    if (!row) return;
    const json = JSON.stringify(row);
    if (json === lastCachedJsonRef.current) return;
    lastCachedJsonRef.current = json;
    writePublishedBrandingCache(row, { notify: false });
  }, [loading, preview, content, publishedOverride]);

  const brand: BrandingRow = useMemo(() => {
    if (preview) return normalizePublishedBranding(preview) ?? SEED_BRANDING;
    if (publishedOverride) return publishedOverride;
    return normalizePublishedBranding(content) ?? SEED_BRANDING;
  }, [preview, publishedOverride, content]);

  return {
    brand,
    loading,
    isPreview: preview !== null,
  };
}

/**
 * Single Supabase subscription + shared preview/published state for the whole app.
 * Mount once near the root (see App.tsx).
 */
export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const value = useBrandingState();
  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
};

/**
 * useBranding — must be under BrandingProvider.
 * Resolution: preview → publishedOverride (post-save) → DB content → cache/default.
 */
export const useBranding = (): BrandingContextValue => {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return ctx;
};
