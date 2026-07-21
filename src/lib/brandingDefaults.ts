// Shared, non-paintable seed for the branding row.
//
// This is the **code default** used when there is no DB row, no cache, and no
// preview. It is intentionally empty (no theme_id, no brand_name) so the
// BrandThemeProvider + visibility gate know "no brand is known yet" and
// refuse to paint a wrong identity. Do NOT change this to a real theme or
// brand — that re-introduces the green flash we just fixed.
//
// The DB `site_content.id = 'branding'` row is the lasting default once the
// admin saves it. Until that save happens, the site stays hidden.

export const SEED_BRANDING = {
  logo_url: "",
  brand_name: "",
  theme_id: "",
  primary: null as string | null,
  accent: null as string | null,
};
