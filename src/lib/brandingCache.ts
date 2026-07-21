// Published branding cache (localStorage).
//
// Stores the last known *published* branding so the boot script in index.html
// can paint the correct theme / logo / favicon / title on first paint and
// chrome can render immediately without flashing the default theme.
//
// Difference vs brandingPreview.ts:
//   - This is the *published* brand, shared across tabs and durable.
//   - Preview lives in sessionStorage and is tab-local only.
//
// After admin «حفظ التغييرات», writePublishedBrandingCache also dispatches
// BRANDING_PUBLISHED_EVENT so in-tab UI updates immediately (before realtime).

// v2: keys are versioned so the legacy `tfoq_branding_published_v1` (which
// could still hold the previous moe-green default) is never read again.
// Old key is purged on every read/write so a single load is enough to
// migrate any existing browser.
export const BRANDING_PUBLISHED_STORAGE_KEY = "tfoq_branding_published_v2";
const BRANDING_PUBLISHED_LEGACY_KEY = "tfoq_branding_published_v1";
export const BRANDING_PUBLISHED_EVENT = "tfoq:branding-published";

export type PublishedBranding = {
  logo_url: string;
  brand_name: string;
  theme_id: string;
  primary: string | null;
  accent: string | null;
};

const isBrowser = () => typeof window !== "undefined";

/**
 * Normalize unknown JSON into a strict PublishedBranding row.
 *
 * Empty / missing fields stay empty strings — we NEVER inject the legacy
 * moe-green / منصة تفوّق defaults here. A row without a real `theme_id`
 * is always returned as `null` (even if brand_name or logo are set) so
 * callers can treat that as "no published brand yet" and refuse to paint
 * a wrong identity while the DB row resolves.
 */
export function normalizePublishedBranding(value: unknown): PublishedBranding | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const theme_id = typeof v.theme_id === "string" ? v.theme_id.trim() : "";
  // Strict: no theme_id → no published brand. BrandThemeProvider uses this
  // as the signal to keep the body hidden instead of falling back to the
  // legacy moe-green preset.
  if (!theme_id) return null;
  return {
    logo_url: typeof v.logo_url === "string" ? v.logo_url : "",
    brand_name: typeof v.brand_name === "string" ? v.brand_name : "",
    theme_id,
    primary: typeof v.primary === "string" ? v.primary : null,
    accent: typeof v.accent === "string" ? v.accent : null,
  };
}

function purgeLegacyKey(): void {
  try {
    window.localStorage.removeItem(BRANDING_PUBLISHED_LEGACY_KEY);
  } catch {
    // ignore
  }
}

export function readPublishedBrandingCache(): PublishedBranding | null {
  if (!isBrowser()) return null;
  // Always drop the legacy v1 cache — its contents can no longer be trusted.
  purgeLegacyKey();
  try {
    const raw = window.localStorage.getItem(BRANDING_PUBLISHED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const normalized = normalizePublishedBranding(parsed);
    if (!normalized) return null;
    return normalized;
  } catch {
    return null;
  }
}

export function writePublishedBrandingCache(
  value: PublishedBranding,
  opts?: { notify?: boolean },
): void {
  if (!isBrowser()) return;
  const normalized = normalizePublishedBranding(value);
  // Refuse to write a brand that doesn't have a real identity — that would
  // just be a stale empty/default and would re-trigger the green flash.
  if (!normalized || !normalized.theme_id) return;
  purgeLegacyKey();
  try {
    window.localStorage.setItem(
      BRANDING_PUBLISHED_STORAGE_KEY,
      JSON.stringify(normalized),
    );
  } catch {
    // private mode / quota — still notify in-tab listeners when requested
  }
  const notify = opts?.notify !== false;
  if (!notify) return;
  try {
    window.dispatchEvent(
      new CustomEvent(BRANDING_PUBLISHED_EVENT, { detail: normalized }),
    );
  } catch {
    // ignore
  }
}
