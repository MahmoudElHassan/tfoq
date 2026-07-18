// Theme presets kept in code (not the DB) so a non-admin can never edit
// a theme. The DB only stores theme_id + optional color overrides on top.

export type ThemePreset = {
  id: string;
  label: string;
  swatch: string;
  description: string;
};

export const THEMES: ThemePreset[] = [
  { id: "moe-green",    label: "أخضر وزارة التعليم", swatch: "#006C35", description: "الهوية الرسمية المعتمدة" },
  { id: "moe-navy",     label: "كحلي ملكي",          swatch: "#1E3A8A", description: "هادئ ومهني" },
  { id: "moe-burgundy", label: "عنابي",              swatch: "#8E1B3A", description: "دافئ ورسمي" },
  { id: "moe-teal",     label: "فيروزي",             swatch: "#1F8E89", description: "منعش وعصري" },
  { id: "moe-plum",     label: "بنفسجي",             swatch: "#6E3F8B", description: "إبداعي ومميز" },
  { id: "moe-amber",    label: "عنبر صحراوي",        swatch: "#B45309", description: "ترابي ودافئ" },
];

export const DEFAULT_THEME_ID = "moe-green";

export const getThemeById = (id: string | null | undefined): ThemePreset =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];

export const hexToHslTriplet = (hex: string): string | null => {
  const m = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh *= 60;
  }
  return `${Math.round(hh)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};
