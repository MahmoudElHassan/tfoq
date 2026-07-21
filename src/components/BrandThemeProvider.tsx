import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useBranding } from "@/hooks/useBranding";
import { readPublishedBrandingCache } from "@/lib/brandingCache";
import { getThemeById, hexToHslTriplet } from "@/lib/themes";

// Every CSS variable we touch when applying admin overrides. Listed so
// `applyPrimary` / `applyAccent` / `clearAll` stay in sync — adding a new
// override var requires updating this list.
const PRIMARY_VARS = [
  "--primary",
  "--primary-foreground",
  "--primary-glow",
  "--ring",
  "--gradient-primary",
  "--gradient-gold-stop1",
  "--shadow-soft",
  "--shadow-elegant",
  "--sidebar-background",
  "--sidebar-foreground",
  "--sidebar-primary-foreground",
] as const;

const ACCENT_VARS = [
  "--accent",
  "--accent-foreground",
  "--sidebar-primary",
  "--sidebar-ring",
] as const;

/**
 * BrandThemeProvider
 *
 * One component lives at the top of the app, pulls the active brand from
 * `useBranding()` (preview → DB → cache → default), and:
 *   - Sets data-theme on <html> so the matching CSS preset variables apply.
 *   - Applies optional primary/accent admin overrides on top of the preset,
 *     updating ALL related variables (gradient, glow, shadows, sidebar
 *     mirror) so CTAs that use `bg-gradient-primary` actually reflect the
 *     chosen color.
 *   - Restores default favicon + document.title on logo/brand_name change.
 *
 * The brand resolution + preview sync + cache mirror lives in useBranding so
 * every chrome component (SiteNav, SiteFooter, Sidebar, Auth) sees the SAME
 * brand name/logo without each spinning its own supabase subscription.
 *
 * Tab-local preview: if the admin clicked تجربة, sessionStorage holds a
 * `BrandingPreview` row. We PREFER that for CSS / favicon / title, so the
 * admin sees the draft in this tab only. Other users / tabs always see
 * the published brand from useSiteContent.
 */
export const BrandThemeProvider = () => {
  const { resolvedTheme } = useTheme();
  const { brand, loading, isPreview } = useBranding();
  // Track what we last applied so we can fully clear on a change
  // (e.g., admin un-sets primary — remove everything we set).
  const lastFaviconRef = useRef<string>("");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Resolve the brand to paint from, in priority order:
    //   1. Tab-local preview (admin تجربة)
    //   2. Live DB row (resolved + has a real theme_id)
    //   3. localStorage cache (theme_id only — empty cache is treated as
    //      "no brand" so we never resolve an empty id to moe-green)
    //
    // Cache may pre-apply theme_id / CSS vars under the visibility gate so
    // the first paint is seamless, but we MUST NOT set data-brand-ready
    // until the DB brand is settled (or a preview is active).
    const cache = readPublishedBrandingCache();
    const source: { theme_id: string; brand_name: string; logo_url: string; primary: string | null; accent: string | null } | null =
      isPreview || brand.theme_id
        ? brand
        : cache && cache.theme_id
          ? cache
          : null;

    // Never call getThemeById("") — that resolves to moe-green and re-paints
    // the legacy identity while loading.
    if (!source?.theme_id) return;

    const theme = getThemeById(source.theme_id);
    root.setAttribute("data-theme", theme.id);

    // ---- Primary override ----
    const primaryHsl = source.primary ? hexToHslTriplet(source.primary) : null;
    if (primaryHsl) {
      applyPrimary(root, primaryHsl);
    } else {
      clearVars(root, PRIMARY_VARS);
    }

    // ---- Accent override ----
    const accentHsl = source.accent ? hexToHslTriplet(source.accent) : null;
    if (accentHsl) {
      applyAccent(root, accentHsl);
    } else {
      clearVars(root, ACCENT_VARS);
    }

    // ---- Brand name + title ----
    // Empty brand_name → leave the document title alone. Never force the
    // legacy "منصة تفوّق" string as a fallback (would leak the old identity
    // even before the DB row resolves).
    const name = source.brand_name?.trim() || "";
    if (name && document.title !== name) document.title = name;
    if (name) {
      setMeta("meta[property=\"og:title\"]", name);
      setMeta("meta[name=\"twitter:title\"]", name);
    }

    // ---- Favicon ----
    const desired = source.logo_url || "";
    if (desired !== lastFaviconRef.current) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      if (desired) {
        link.href = desired;
      } else {
        // Reset to the public/favicon.ico the site ships with.
        link.href = "/favicon.ico";
      }
      lastFaviconRef.current = desired;
    }

    // ---- Visibility gate ----
    // Reveal ONLY after the branding DB has settled (or a preview is
    // active). Never flip ready based on cache alone — that's what caused
    // the old→new double flash.
    if (
      (isPreview || !loading) &&
      source.theme_id &&
      root.getAttribute("data-brand-ready") !== "1"
    ) {
      root.setAttribute("data-brand-ready", "1");
    }
  }, [
    brand.theme_id,
    brand.brand_name,
    brand.primary,
    brand.accent,
    brand.logo_url,
    loading,
    isPreview,
    resolvedTheme,
  ]);

  return null;
};

function applyPrimary(root: HTMLElement, hsl: string) {
  // Same hue/saturation, slightly lighter at +10% L for glow and a darker
  // tone for the gradient endpoint. The luminance-based fg contrast makes
  // the white-on-primary look right across the spectrum.
  const lum = colorLuminance(hsl);
  const fg = lum < 0.55 ? "0 0% 100%" : "0 0% 10%";
  const glow = adjustL(hsl, +12);
  const gradMid = adjustL(hsl, +8);
  const fgSidebar = "0 0% 95%";
  const fgSidebarPrimary = "158 45% 12%";

  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--primary-glow", glow);
  root.style.setProperty("--ring", hsl);
  // The hero CTA + most call-to-action buttons use bg-gradient-primary.
  // Rebuild it from the chosen hue so those buttons reflect the override.
  // --gradient-primary is consumed as a full background value (not via
  // hsl(var(...))), so the triplet MUST be wrapped in hsl().
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${hsl}), hsl(${gradMid}))`,
  );
  // The gold gradient is exposed as a CSS custom prop but also referenced
  // by --gradient-gold; we don't override --gradient-gold here so the
  // accent color can still flow into gold-style buttons if needed.
  root.style.setProperty("--shadow-soft", `0 4px 20px -8px hsl(${hsl} / 0.15)`);
  root.style.setProperty("--shadow-elegant", `0 10px 40px -12px hsl(${hsl} / 0.25)`);
  // Sidebar mirrors primary for visual cohesion.
  root.style.setProperty("--sidebar-background", hsl);
  root.style.setProperty("--sidebar-foreground", fgSidebar);
  root.style.setProperty("--sidebar-primary-foreground", fgSidebarPrimary);
}

function applyAccent(root: HTMLElement, hsl: string) {
  const lum = colorLuminance(hsl);
  const fg = lum < 0.6 ? "158 45% 12%" : "0 0% 100%";
  root.style.setProperty("--accent", hsl);
  root.style.setProperty("--accent-foreground", fg);
  // Sidebar primary = nav-active button color; mirrors accent.
  root.style.setProperty("--sidebar-primary", hsl);
  root.style.setProperty("--sidebar-ring", hsl);
}

function clearVars(root: HTMLElement, vars: readonly string[]) {
  for (const v of vars) {
    // setProperty with empty string is a no-op across browsers; removeProperty
    // is the canonical way to revert to whatever the data-theme preset says.
    root.style.removeProperty(v);
  }
}

function setMeta(selector: string, value: string) {
  const el = document.querySelector(selector) as HTMLMetaElement | null;
  if (el && el.content !== value) el.content = value;
}

function colorLuminance(hslTriplet: string): number {
  // "H S% L%" — only need L for contrast picking.
  const parts = hslTriplet.split(/\s+/);
  if (parts.length < 3) return 0.5;
  const l = parseFloat(parts[2].replace("%", ""));
  return isNaN(l) ? 0.5 : l / 100;
}

function adjustL(hsl: string, delta: number): string {
  const parts = hsl.split(/\s+/);
  if (parts.length < 3) return hsl;
  const h = parts[0];
  const s = parts[1];
  const l = Math.max(0, Math.min(100, parseFloat(parts[2].replace("%", "")) + delta));
  return `${h} ${s} ${Math.round(l)}%`;
}
