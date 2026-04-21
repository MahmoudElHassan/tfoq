import { useEffect, useState } from "react";
import { Save, Loader2, Layout, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Section = { id: string; content: any };

export const SiteContentEditor = () => {
  const [sections, setSections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const hero = sections.hero ?? {};
  const footer = sections.footer ?? {};
  const features = sections.features_section ?? {};

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="hero" className="gap-2"><Layout className="w-4 h-4" />الهيرو</TabsTrigger>
          <TabsTrigger value="features" className="gap-2"><FileText className="w-4 h-4" />قسم المميزات</TabsTrigger>
          <TabsTrigger value="footer" className="gap-2"><Layout className="w-4 h-4" />الفوتر</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الشارة العلوية" value={hero.badge} onChange={(v) => update("hero", { badge: v })} />
            <Field label="السطر الأول من العنوان" value={hero.title_line1} onChange={(v) => update("hero", { title_line1: v })} />
            <Field label="السطر الثاني (مميّز)" value={hero.title_line2} onChange={(v) => update("hero", { title_line2: v })} />
            <Field label="نص الزر الرئيسي" value={hero.cta_primary} onChange={(v) => update("hero", { cta_primary: v })} />
            <Field label="نص الزر الثانوي" value={hero.cta_secondary} onChange={(v) => update("hero", { cta_secondary: v })} />
          </div>
          <TextField label="الوصف" value={hero.description} onChange={(v) => update("hero", { description: v })} />

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
const SaveButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
  <Button onClick={onClick} disabled={loading} className="bg-gradient-primary text-primary-foreground gap-2">
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
    حفظ التغييرات
  </Button>
);
