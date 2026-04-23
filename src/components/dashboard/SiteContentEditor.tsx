import { useEffect, useRef, useState } from "react";
import { Save, Loader2, Layout, FileText, Upload, Image as ImageIcon, X, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

type Section = { id: string; content: any };

export const SiteContentEditor = () => {
  const [sections, setSections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("site_content").select("*").then(({ data }) => {
      const map: Record<string, any> = {};
      (data ?? []).forEach((s: Section) => { map[s.id] = s.content; });
      setSections(map);
      setLoading(false);
    });
  }, []);

  const update = (id: string, patch: any) => setSections((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  const save = async (id: string) => {
    setSaving(id);
    const { error } = await supabase.from("site_content").update({ content: sections[id] }).eq("id", id);
    setSaving(null);
    if (error) toast.error("فشل الحفظ");
    else toast.success("تم حفظ التغييرات بنجاح");
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
    update("hero", { image_url: pub.publicUrl });
    setUploading(false);
    toast.success("تم رفع الصورة، اضغطي حفظ التغييرات لتثبيتها");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const hero = sections.hero ?? {};
  const footer = sections.footer ?? {};
  const features = sections.features_section ?? {};
  const about = sections.about ?? {};

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="hero" className="gap-2"><Layout className="w-4 h-4" />الهيرو</TabsTrigger>
          <TabsTrigger value="features" className="gap-2"><FileText className="w-4 h-4" />قسم المميزات</TabsTrigger>
          <TabsTrigger value="about" className="gap-2"><Info className="w-4 h-4" />من نحن</TabsTrigger>
          <TabsTrigger value="footer" className="gap-2"><Layout className="w-4 h-4" />الفوتر</TabsTrigger>
        </TabsList>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="اسم العلامة" value={footer.brand_name} onChange={(v) => update("footer", { brand_name: v })} />
            <Field label="الشعار الفرعي" value={footer.brand_subtitle} onChange={(v) => update("footer", { brand_subtitle: v })} />
            <Field label="البريد الإلكتروني" value={footer.email} onChange={(v) => update("footer", { email: v })} />
            <Field label="الجوال" value={footer.phone} onChange={(v) => update("footer", { phone: v })} />
            <Field label="العنوان" value={footer.address} onChange={(v) => update("footer", { address: v })} />
          </div>
          <TextField label="نبذة عن المنصة" value={footer.about} onChange={(v) => update("footer", { about: v })} />
          <Field label="حقوق النشر" value={footer.copyright} onChange={(v) => update("footer", { copyright: v })} />
          <SaveButton onClick={() => save("footer")} loading={saving === "footer"} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2"><Label className="font-bold">{label}</Label><Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div>
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
