// Tab-local branding preview.
//
// Lives in sessionStorage so:
//   - It is scoped to the current browser tab (other tabs see no draft).
//   - It dies when the tab closes — a stale draft cannot leak across days.
//   - It is invisible to other users / roles on the site (they keep the
//     published brand from site_content).
//
// `BrandThemeProvider` listens for the `EVENT` window custom event so the
// preview can be set / cleared from any component (the editor) without
// remounting the provider.

export const BRANDING_PREVIEW_STORAGE_KEY = "tfoq_branding_preview_v1";
export const BRANDING_PREVIEW_EVENT = "tfoq:branding-preview";

export type BrandingPreview = {
  logo_url: string;
  brand_name: string;
  theme_id: string;
  primary: string | null;
  accent: string | null;
};

const isBrowser = () => typeof window !== "undefined";

export function readBrandingPreview(): BrandingPreview | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(BRANDING_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrandingPreview;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBrandingPreview(value: BrandingPreview): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(
      BRANDING_PREVIEW_STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch {
    // sessionStorage may be disabled (private mode). Still dispatch so the
    // current tab can preview via BrandThemeProvider state.
  }
  try {
    window.dispatchEvent(new CustomEvent(BRANDING_PREVIEW_EVENT, { detail: value }));
  } catch {
    // ignore
  }
}

export function clearBrandingPreview(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(BRANDING_PREVIEW_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(BRANDING_PREVIEW_EVENT, { detail: null }));
  } catch {
    // ignore
  }
}
