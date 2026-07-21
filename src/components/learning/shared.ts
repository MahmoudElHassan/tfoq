export const visibilityLabels: Record<string, string> = {
  private: "خاص بي",
  subject: "مشاركة بالقسم",
  public: "عام لكل المعلمين",
};

export const visibilityOptions = [
  { value: "private", label: "خاص بي فقط" },
  { value: "subject", label: "مشاركة مع معلمي نفس القسم" },
  { value: "public", label: "عام لكل المعلمين" },
] as const;

export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  // Direct ID (11 chars)
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const i = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (i >= 0 && parts[i + 1]) return parts[i + 1];
    }
  } catch {
    // not a URL
  }
  return null;
};
