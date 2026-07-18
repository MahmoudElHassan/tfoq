import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Loader2, Layout, FileText, Upload, Image as ImageIcon, X, Info, Palette, Eye, EyeOff, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { THEMES } from "@/lib/themes";
import {
  BRANDING_PREVIEW_EVENT,
  writeBrandingPreview,
  clearBrandingPreview,
  readBrandingPreview,
  type BrandingPreview,
} from "@/lib/brandingPreview";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

const DEFAULT_BRANDING: BrandingPreview = {
  logo_url: "",
  brand_name: "منصة تفوّق",
  theme_id: "moe-green",
  primary: null,
  accent: null,
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const sanitizeHex = (v: string) => {
  const trimmed = (v ?? "").trim();
  return HEX_RE.test(trimmed) ? trimmed : null;
};
const sanitizeBranding = (b: any): BrandingPreview => ({
  logo_url: typeof b?.logo_url === "string" ? b.logo_url : DEFAULT_BRANDING.logo_url,
  brand_name:
    typeof b?.brand_name === "string" && b.brand_name.trim()
      ? b.brand_name
      : DEFAULT_BRANDING.brand_name,
  theme_id:
    typeof b?.theme_id === "string" && b.theme_id ? b.theme_id : DEFAULT_BRANDING.theme_id,
  primary: typeof b?.primary === "string" && HEX_RE.test(b.primary) ? b.primary : null,
  accent: typeof b?.accent === "string" && HEX_RE.test(b.accent) ? b.accent : null,
});

type Section = { id: string; content: any };

export const SiteContentEditor = () => {
  const [sections, setSections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("site_content").select("*");
      if (error) {
        toast.error("تعذّر تحميل المحتوى", { description: error.message });
        setLoading(false);
        return;
      }
      const map: Record<string, any> = {};
      (data ?? []).forEach((s: Section) => { map[s.id] = s.content; });
      setSections(map);

      // Defensive: if the branding row is missing on the target DB, upsert
      // defaults once so the editor always has a row to update.
      if (!("branding" in map)) {
        const { data: upData, error: upErr } = await supabase
          .from("site_content")
          .upsert(
            { id: "branding", content: DEFAULT_BRANDING, updated_at: new Date().toISOString() },
            { onConflict: "id" },
          )
          .select("id,content")
          .maybeSingle();
        if (upErr) {
          toast.error("لم نتمكن من إنشاء صف الهوية", { description: upErr.message });
        } else if (upData?.content) {
          map.branding = upData.content;
          setSections((s) => ({ ...s, branding: upData.content }));
        }
      }
      setLoading(false);
    })();
  }, []);

  const update = (id: string, patch: any) =>
    setSections((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  /**
   * Upsert a site_content row by id. We never use plain UPDATE because if
   * the row is missing, Supabase returns success with 0 rows affected and
   * the toast lies. onConflict:'id' guarantees an insert when missing.
   */
  const save = async (id: string) => {
    const payload = sections[id];
    if (payload === undefined) {
      toast.error("لا يوجد ما يُحفظ لهذا القسم");
      return;
    }
    setSaving(id);
    const { data: upData, error } = await supabase
      .from("site_content")
      .upsert(
        {
          id,
          content: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("id")
      .maybeSingle();
    setSaving(null);
    if (error) {
      toast.error("فشل الحفظ", { description: error.message });
      return;
    }
    if (!upData) {
      toast.error("لم يُحفظ (قد لا تملكين صلاحية التعديل)");
      return;
    }
    toast.success("تم حفظ التغييرات بنجاح");
  };

  const handleHeroImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار ملف صورة صالح");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("حجم الصورة يتجاوز 2 ميغابايت", { description: "الرجاء اختيار صورة أصغر." });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `hero/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("site-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error("فشل رفع الصورة", { description: upErr.message });
      return;
    }
    const { data: pub } = supabase.storage.from("site-images").getPublicUrl(path);
    const next = { ...(sections.hero ?? {}), image_url: pub.publicUrl };
    setSections((s) => ({ ...s, hero: next }));
    setUploading(false);
    const { data: upData, error: svErr } = await supabase
      .from("site_content")
      .upsert({ id: "hero", content: next, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select("id")
      .maybeSingle();
    if (svErr || !upData) {
      toast.error(svErr?.message ?? "لم يُحفظ الرابط — اضغطي حفظ التغييرات يدوياً");
    } else {
      toast.success("تم رفع الصورة وتثبيتها");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  const hero = sections.hero ?? {};
  const footer = sections.footer ?? {};
  const features = sections.features_section ?? {};
  const about = sections.about ?? {};
  const branding = sections.branding ?? DEFAULT_BRANDING;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="w-4 h-4" />الهوية والثيم
          </TabsTrigger>
          <TabsTrigger value="hero" className="gap-2">
            <Layout className="w-4 h-4" />الهيرو
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <FileText className="w-4 h-4" />قسم المميزات
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Info className="w-4 h-4" />من نحن
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-2">
            <Layout className="w-4 h-4" />الفوتر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-5">
          <BrandingPanel
            published={sanitizeBranding(branding)}
            onPublished={(next) => setSections((s) => ({ ...s, branding: next }))}
          />
        </TabsContent>

        <TabsContent value="hero" className="space-y-4">
          {/* Hero image upload */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <Label className="font-bold m-0">صورة الهيرو</Label>
                <span className="text-xs text-muted-foreground">(الحد الأقصى 2 ميغابايت — JPG / PNG / WEBP)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroImageUpload(f); e.currentTarget.value = ""; }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "جارٍ الرفع..." : "رفع صورة"}
                </Button>
                {hero.image_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => update("hero", { image_url: "" })} className="gap-2 text-destructive hover:text-destructive">
                    <X className="w-4 h-4" />إزالة
                  </Button>
                )}
              </div>
            </div>
            {hero.image_url && (
              <div className="rounded-lg overflow-hidden border border-border bg-card">
                <img src={hero.image_url} alt="معاينة صورة الهيرو" className="w-full max-h-64 object-cover" />
              </div>
            )}
            <Input
              value={hero.image_url ?? ""}
              onChange={(e) => update("hero", { image_url: e.target.value })}
              placeholder="أو ألصقي رابط صورة مباشرًا"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الشارة العلوية" value={hero.badge} onChange={(v) => update("hero", { badge: v })} />
            <Field label="السطر الأول من العنوان" value={hero.title_line1} onChange={(v) => update("hero", { title_line1: v })} />
            <Field label="السطر الثاني (مميّز بالتدرج)" value={hero.title_line2} onChange={(v) => update("hero", { title_line2: v })} />
            <Field label="نص الزر الرئيسي" value={hero.cta_primary} onChange={(v) => update("hero", { cta_primary: v })} />
            <Field label="نص الزر الثانوي" value={hero.cta_secondary} onChange={(v) => update("hero", { cta_secondary: v })} />
          </div>
          <TextField label="الوصف" value={hero.description} onChange={(v) => update("hero", { description: v })} />

          {/* Gradient controls for the highlighted title */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <Label className="font-bold block">تدرج لون السطر المميّز</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ColorField
                label="لون البداية"
                value={hero.gradient_from ?? "#006B3A"}
                onChange={(v) => update("hero", { gradient_from: v })}
              />
              <ColorField
                label="لون النهاية"
                value={hero.gradient_to ?? "#1F8B5C"}
                onChange={(v) => update("hero", { gradient_to: v })}
              />
              <div className="space-y-2">
                <Label className="font-bold">زاوية التدرج (°)</Label>
                <Input
                  type="number"
                  min={0}
                  max={360}
                  value={hero.gradient_angle ?? 135}
                  onChange={(e) => update("hero", { gradient_angle: Math.max(0, Math.min(360, Number(e.target.value) || 0)) })}
                />
              </div>
            </div>
            {/* Preview — uses the same safe technique as the live page */}
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-2">معاينة مباشرة (نفس طريقة عرض الجوال)</p>
              <p
                className="font-display text-3xl md:text-4xl font-extrabold leading-tight"
                style={{
                  backgroundImage: `linear-gradient(${hero.gradient_angle ?? 135}deg, ${hero.gradient_from ?? "#006B3A"}, ${hero.gradient_to ?? "#1F8B5C"})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                {hero.title_line2 || "السطر المميّز"}
              </p>
            </div>
          </div>


          <div>
            <Label className="font-bold mb-2 block">الإحصائيات (4 أرقام)</Label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {(hero.stats ?? []).map((s: any, i: number) => (
                <div key={i} className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                  <Input value={s.v} onChange={(e) => {
                    const stats = [...(hero.stats ?? [])]; stats[i] = { ...stats[i], v: e.target.value };
                    update("hero", { stats });
                  }} placeholder="القيمة" />
                  <Input value={s.l} onChange={(e) => {
                    const stats = [...(hero.stats ?? [])]; stats[i] = { ...stats[i], l: e.target.value };
                    update("hero", { stats });
                  }} placeholder="التسمية" />
                </div>
              ))}
            </div>
          </div>
          <SaveButton onClick={() => save("hero")} loading={saving === "hero"} />
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Field label="العنوان الجانبي" value={features.eyebrow} onChange={(v) => update("features_section", { eyebrow: v })} />
          <Field label="العنوان الرئيسي" value={features.title} onChange={(v) => update("features_section", { title: v })} />
          <TextField label="الوصف" value={features.subtitle} onChange={(v) => update("features_section", { subtitle: v })} />
          <SaveButton onClick={() => save("features_section")} loading={saving === "features_section"} />
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          <Field label="العنوان الجانبي" value={about.eyebrow} onChange={(v) => update("about", { eyebrow: v })} />
          <Field label="العنوان الرئيسي" value={about.title} onChange={(v) => update("about", { title: v })} />
          <TextField label="نبذة تعريفية" value={about.body} onChange={(v) => update("about", { body: v })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="رسالتنا" value={about.mission} onChange={(v) => update("about", { mission: v })} />
            <TextField label="رؤيتنا" value={about.vision} onChange={(v) => update("about", { vision: v })} />
          </div>
          <SaveButton onClick={() => save("about")} loading={saving === "about"} />
        </TabsContent>

        <TabsContent value="footer" className="space-y-4">
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border">
            اسم العلامة والشعار يأتيان من تبويب <strong>«الهوية والثيم»</strong> للحفاظ على مصدر واحد للحقيقة.
            أدناه: الشعار الفرعي، معلومات التواصل، نص «من نحن» الموجود في الفوتر، وقالب حقوق النشر.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الشعار الفرعي" value={footer.brand_subtitle} onChange={(v) => update("footer", { brand_subtitle: v })} />
            <Field label="البريد الإلكتروني" value={footer.email} onChange={(v) => update("footer", { email: v })} />
            <Field label="الجوال" value={footer.phone} onChange={(v) => update("footer", { phone: v })} />
            <Field label="العنوان" value={footer.address} onChange={(v) => update("footer", { address: v })} />
          </div>
          <TextField label="نبذة عن المنصة" value={footer.about} onChange={(v) => update("footer", { about: v })} />
          <Field
            label="قالب حقوق النشر"
            value={footer.copyright_template}
            onChange={(v) => update("footer", { copyright_template: v })}
            helper="يدعم {brand} كعنصر نائب ليتم استبداله باسم العلامة الحالي."
          />
          <SaveButton onClick={() => save("footer")} loading={saving === "footer"} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Field = ({ label, value, onChange, helper }: { label: string; value: string; onChange: (v: string) => void; helper?: string }) => (
  <div className="space-y-2">
    <Label className="font-bold">{label}</Label>
    <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    {helper && <p className="text-[11px] text-muted-foreground leading-relaxed">{helper}</p>}
  </div>
);
const TextField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2"><Label className="font-bold">{label}</Label><Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} /></div>
);
const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <Label className="font-bold">{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 rounded-md border border-border bg-background cursor-pointer p-1"
      />
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="#006B3A" dir="ltr" />
    </div>
  </div>
);
const SaveButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
  <Button onClick={onClick} disabled={loading} className="bg-gradient-primary text-primary-foreground gap-2">
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
    حفظ التغييرات
  </Button>
);

/**
 * BrandingPanel — draft-only edits with explicit تجربة / حفظ / إلغاء actions.
 *
 *   - Draft state lives in this component (React state). Edits never touch
 *     the DB until the admin confirms.
 *   - تجربة writes the draft to sessionStorage and dispatches a custom
 *     event so BrandThemeProvider applies it tab-locally.
 *   - حفظ التغييرات shows a confirm dialog, then upserts site_content.
 *     On success the tab preview is cleared and the published baseline
 *     is refreshed (the realtime useSiteContent listener picks it up).
 *   - إلغاء التجربة restores the draft to the published baseline and
 *     clears the sessionStorage preview.
 *
 * Logo upload: the picked file is uploaded to Storage IMMEDIATELY so we
 * can show a thumbnail, but the resulting `logo_url` is NOT written into
 * site_content until Save. If the admin discards, we still leak one
 * orphaned Storage object (acceptable short-term cost; the bucket has
 * a default retention / cleanup pass).
 */
const BrandingPanel = ({
  published,
  onPublished,
}: {
  published: BrandingPreview;
  onPublished: (next: BrandingPreview) => void;
}) => {
  // ---- Draft state (never auto-writes DB) ----
  const publishedKey = useMemo(() => JSON.stringify(published), [published]);
  const [draft, setDraft] = useState<BrandingPreview>(() => sanitizeBranding(published));
  const dirtyRef = useRef(false);

  // Re-seed draft only when published content actually changes AND the
  // admin is not mid-edit (avoids wiping unsaved draft on parent re-render).
  useEffect(() => {
    if (dirtyRef.current) return;
    setDraft(sanitizeBranding(published));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishedKey]);

  const apply = (patch: Partial<BrandingPreview>) => {
    dirtyRef.current = true;
    setDraft((d) => ({ ...d, ...patch }));
  };

  // Track if a tab preview is active so we can show "وضع التجربة" + the
  // إلغاء button, and disable تجربة when there's nothing new to try.
  const [previewActive, setPreviewActive] = useState<boolean>(() =>
    Boolean(readBrandingPreview()),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setPreviewActive(Boolean(readBrandingPreview()));
    window.addEventListener(BRANDING_PREVIEW_EVENT, handler);
    return () => window.removeEventListener(BRANDING_PREVIEW_EVENT, handler);
  }, []);

  // ---- Dirty detection (for Save button enable/disable) ----
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== publishedKey,
    [draft, publishedKey],
  );
  dirtyRef.current = isDirty;

  // ---- Logo upload (no DB write) ----
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار ملف صورة صالح");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("حجم الشعار يتجاوز 2 ميغابايت", { description: "الرجاء اختيار صورة أصغر." });
      return;
    }
    setLogoUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `branding/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("site-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (upErr) {
      setLogoUploading(false);
      toast.error("فشل رفع الشعار", { description: upErr.message });
      return;
    }
    const { data: pub } = supabase.storage.from("site-images").getPublicUrl(path);
    // Only update the DRAFT logo_url; do NOT upsert site_content.
    apply({ logo_url: pub.publicUrl });
    setLogoUploading(false);
    toast.success("تم رفع الشعار — اضغطي «تجربة» للمعاينة أو «حفظ التغييرات» للنشر.");
  };

  // ---- تجربة: tab-local preview only ----
  const tryPreview = () => {
    const sanitized = sanitizeBranding(draft);
    writeBrandingPreview(sanitized);
    setPreviewActive(true);
    toast.info("المعاينة محلية لهذا التبويب فقط — لم تُحفظ بعد.", {
      description: "افتحي المنصة في تبويب آخر لترين أن المستخدمين لا يزالون يرون الهوية الحالية.",
    });
  };

  const cancelPreview = () => {
    // Only clear tab CSS preview — keep the draft so the admin can still Save.
    clearBrandingPreview();
    setPreviewActive(false);
    toast.success("تم إلغاء المعاينة — عاد التبويب للهوية المنشورة.");
  };

  // ---- حفظ التغييرات: confirm, then upsert ----
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const confirmSave = async () => {
    const sanitized = sanitizeBranding(draft);
    setSaving(true);
    const { data: upData, error } = await supabase
      .from("site_content")
      .upsert(
        { id: "branding", content: sanitized, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      )
      .select("id,content")
      .maybeSingle();
    setSaving(false);
    if (error || !upData) {
      toast.error(error?.message ?? "تعذّر الحفظ (قد لا تملكين صلاحية التعديل)");
      return;
    }
    // On success: clear tab preview so everyone (incl. this tab) sees the
    // newly-published brand via realtime useSiteContent.
    clearBrandingPreview();
    setPreviewActive(false);
    const next = sanitizeBranding(upData.content ?? sanitized);
    dirtyRef.current = false;
    setDraft(next);
    // Sync parent published baseline so isDirty resets (was stuck true before).
    onPublished(next);
    setConfirmOpen(false);
    toast.success("تم حفظ التغييرات وتطبيقها على كل المستخدمين.");
  };

  // ---- Revert draft to published without clearing a preview ----
  const resetDraft = () => {
    dirtyRef.current = false;
    setDraft(sanitizeBranding(published));
    toast.info("تم استرجاع القيم المنشورة في المسودة.");
  };

  // ---- Derived theme preview (for the in-panel strip) ----
  const theme = THEMES.find((t) => t.id === draft.theme_id) ?? THEMES[0];
  const previewPrimary = draft.primary || theme.swatch;
  const previewAccent = draft.accent || "#F4B942";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <span>
          التعديلات محفوظة في هذه الصفحة فقط. اضغطي <strong className="text-foreground">«تجربة»</strong> للمعاينة،
          أو <strong className="text-foreground">«حفظ التغييرات»</strong> للنشر على المنصة كاملة.
        </span>
        {previewActive && (
          <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
            <Eye className="w-3 h-3" /> وضع التجربة مفعّل لهذا التبويب
          </span>
        )}
      </div>

      {/* Brand name */}
      <Field
        label="اسم العلامة التجارية"
        value={draft.brand_name ?? ""}
        onChange={(v) => apply({ brand_name: v })}
      />

      {/* Logo */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <Label className="font-bold m-0">شعار المنصة</Label>
            <span className="text-xs text-muted-foreground">
              (2 ميغابايت كحد أقصى — JPG / PNG / WEBP)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={logoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleLogoUpload(f);
                e.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => logoRef.current?.click()}
              disabled={logoUploading}
              className="gap-2"
            >
              {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {logoUploading ? "جارٍ الرفع..." : "رفع شعار"}
            </Button>
            {draft.logo_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => apply({ logo_url: "" })}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />إزالة
              </Button>
            )}
          </div>
        </div>
        {draft.logo_url && (
          <div className="rounded-lg overflow-hidden border border-border bg-card p-4 inline-block">
            <img src={draft.logo_url} alt="معاينة الشعار" className="max-h-20 max-w-xs object-contain" />
          </div>
        )}
        <Input
          value={draft.logo_url ?? ""}
          onChange={(e) => apply({ logo_url: e.target.value })}
          placeholder="أو ألصقي رابط شعار مباشرًا"
          dir="ltr"
        />
      </div>

      {/* Theme picker */}
      <div className="space-y-2">
        <Label className="font-bold block">سمة الألوان</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => apply({ theme_id: t.id })}
              className={`relative rounded-xl border-2 p-3 text-right transition-all ${
                draft.theme_id === t.id ? "border-primary shadow-soft" : "border-border hover:border-primary/40"
              }`}
            >
              <span className="block w-full h-12 rounded-lg mb-2 shadow-card" style={{ background: t.swatch }} />
              <span className="block text-sm font-bold">{t.label}</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">{t.description}</span>
              {draft.theme_id === t.id && (
                <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Optional color overrides */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <div>
          <Label className="font-bold block">تجاوز اللون الأساسي (اختياري)</Label>
          <p className="text-xs text-muted-foreground">يُطبَّق فوق الثيم المختار. اتركه فارغًا لاستخدام لون الثيم.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField
            label="اللون الأساسي (Primary)"
            value={draft.primary ?? ""}
            onChange={(v) => apply({ primary: sanitizeHex(v) })}
          />
          <ColorField
            label="اللون الثانوي (Accent)"
            value={draft.accent ?? ""}
            onChange={(v) => apply({ accent: sanitizeHex(v) })}
          />
        </div>
      </div>

      {/* Live preview strip — in-panel mock only, no DB / CSS effect */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Label className="font-bold block">معاينة داخل المعاينة</Label>
        <div
          className="rounded-xl p-5 shadow-card"
          style={{ background: `linear-gradient(135deg, ${previewPrimary}, ${previewAccent})` }}
        >
          <div className="flex items-center gap-3">
            {draft.logo_url ? (
              <img src={draft.logo_url} alt="" className="w-12 h-12 rounded-lg object-contain bg-card/90" />
            ) : (
              <span
                className="w-12 h-12 rounded-lg bg-card/90 flex items-center justify-center font-display font-extrabold text-lg"
                style={{ color: previewPrimary }}
              >✓</span>
            )}
            <div>
              <p className="font-display font-extrabold text-white leading-tight">
                {draft.brand_name || "اسم العلامة"}
              </p>
              <p className="text-xs text-white/80 mt-0.5">ثانوية الطالبات</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-4 py-2 rounded-lg bg-white text-sm font-bold" style={{ color: previewPrimary }}>زر رئيسي</span>
            <span className="px-4 py-2 rounded-lg bg-white/15 text-white text-sm font-bold border border-white/30">زر ثانوي</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          هذه معاينة محلية فقط. اضغطي <strong>«تجربة»</strong> لتُطبَّق الألوان والشعار على هذا التبويب،
          أو <strong>«حفظ التغييرات»</strong> لتُطبَّق على كل المستخدمين.
        </p>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={tryPreview}
          disabled={!isDirty}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          تجربة
        </Button>
        <Button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!isDirty || saving}
          className="bg-gradient-primary text-primary-foreground gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </Button>
        {previewActive && (
          <Button
            type="button"
            variant="ghost"
            onClick={cancelPreview}
            className="gap-2"
          >
            <EyeOff className="w-4 h-4" />
            إلغاء التجربة
          </Button>
        )}
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            onClick={resetDraft}
            className="gap-2 mr-auto"
          >
            <Undo2 className="w-4 h-4" />
            استرجاع القيم المنشورة
          </Button>
        )}
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حفظ الهوية الجديدة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم تطبيق هذه الهوية (الاسم، الشعار، السمة، الألوان) على <strong>كل المستخدمين</strong> في كل الصفحات،
              وستظهر فوراً للزائرات والطالبات والمعلمات وأولياء الأمور عبر التحديث اللحظي.
              <br />
              هل تريدين المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmSave();
              }}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              نعم، انشري التغييرات
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
