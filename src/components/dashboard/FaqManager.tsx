import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Save, MessageCircle, Pencil, X, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, Tags } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  keywords: string[];
};

const blankFaq = (sort: number): Faq => ({
  id: "",
  question: "",
  answer: "",
  sort_order: sort,
  is_active: true,
  keywords: [],
});

const parseKeywords = (raw: string): string[] =>
  raw
    .split(/[,،;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 40);

const keywordsToString = (kw: string[]) => kw.join("، ");

export const FaqManager = () => {
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setFaqs(null);
    const { data, error } = await supabase
      .from("faq_entries")
      .select("id,question,answer,sort_order,is_active,keywords")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("تعذّر تحميل الأسئلة الشائعة", { description: error.message });
      setFaqs([]);
      return;
    }
    setFaqs(((data ?? []) as Faq[]).map((f) => ({ ...f, keywords: f.keywords ?? [] })));
  };

  const addRow = () => {
    if (!faqs) return;
    const nextSort = faqs.length === 0 ? 1 : Math.max(...faqs.map((f) => f.sort_order)) + 1;
    const blank = blankFaq(nextSort);
    setFaqs([...faqs, blank]);
    setEditingId("__new__");
  };

  const updateRow = (idx: number, patch: Partial<Faq>) => {
    if (!faqs) return;
    const next = [...faqs];
    next[idx] = { ...next[idx], ...patch };
    setFaqs(next);
  };

  const removeRow = async (idx: number) => {
    if (!faqs) return;
    const row = faqs[idx];
    if (row.id) {
      const { error } = await supabase.from("faq_entries").delete().eq("id", row.id);
      if (error) {
        toast.error("تعذّر الحذف", { description: error.message });
        return;
      }
      toast.success("تم حذف السؤال");
    }
    const next = [...faqs];
    next.splice(idx, 1);
    setFaqs(next);
  };

  const moveRow = (idx: number, dir: -1 | 1) => {
    if (!faqs) return;
    const j = idx + dir;
    if (j < 0 || j >= faqs.length) return;
    const next = [...faqs];
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((f, i) => { f.sort_order = i + 1; });
    setFaqs(next);
  };

  const saveAll = async () => {
    if (!faqs) return;
    setSaving(true);
    try {
      const updates: Faq[] = [];
      const inserts: Omit<Faq, "id">[] = [];
      for (const f of faqs) {
        if (!f.question.trim() || !f.answer.trim()) {
          toast.error("يوجد سؤال أو إجابة فارغة");
          throw new Error("empty");
        }
        const cleanKeywords = (f.keywords ?? []).filter((k) => k.trim().length > 0);
        if (f.id) updates.push({ ...f, keywords: cleanKeywords });
        else inserts.push({
          question: f.question,
          answer: f.answer,
          sort_order: f.sort_order,
          is_active: f.is_active,
          keywords: cleanKeywords,
        });
      }
      for (const u of updates) {
        const { error } = await supabase.from("faq_entries").update({
          question: u.question,
          answer: u.answer,
          sort_order: u.sort_order,
          is_active: u.is_active,
          keywords: u.keywords,
        }).eq("id", u.id);
        if (error) throw error;
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from("faq_entries").insert(inserts);
        if (error) throw error;
      }
      toast.success("تم حفظ الأسئلة الشائعة");
      setEditingId(null);
      await refresh();
    } catch (e) {
      const err = e as { message?: string };
      if (err?.message !== "empty") toast.error("تعذّر الحفظ", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const sorted = useMemo(() => (faqs ?? []).slice().sort((a, b) => a.sort_order - b.sort_order), [faqs]);

  if (faqs === null) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-display text-lg font-extrabold">الأسئلة الشائعة</h3>
            <p className="t-small text-muted-foreground">تُعرض في المساعد الذكي على الصفحة الرئيسية. التعديل متاح لمديرة النظام فقط.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={addRow} className="gap-2">
            <Plus className="w-4 h-4" /> سؤال جديد
          </Button>
          <Button onClick={saveAll} disabled={saving} className="bg-gradient-primary text-primary-foreground gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الكل
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border">
        أضيفي <strong>٣–٥ كلمات مفتاحية</strong> لكل سؤال (مثال: «تسجيل، دخول، حساب جديد، اشتراك»).
        الكلمات هي المرجع الأثقل في المطابقة، تليها نص السؤال، ثم الإجابة. هذا يساعد المساعد على
        فهم صياغات مختلفة مثل «كيف أسجّل؟» أو «بدي حساب».
      </p>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          لا توجد أسئلة شائعة بعد. اضغطي «سؤال جديد» لإضافة أول سؤال.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((f, i) => (
            <FaqRow
              key={f.id || `__new_${i}`}
              faq={f}
              index={i}
              total={sorted.length}
              isEditing={editingId === "__new__" ? !f.id : editingId === f.id}
              onStartEdit={() => setEditingId(f.id || "__new__")}
              onCancelEdit={() => setEditingId(null)}
              onChange={(patch) => updateRow(i, patch)}
              onRemove={() => removeRow(i)}
              onMove={(dir) => moveRow(i, dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FaqRow = ({
  faq,
  index,
  total,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onChange,
  onRemove,
  onMove,
}: {
  faq: Faq;
  index: number;
  total: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChange: (patch: Partial<Faq>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) => {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{index + 1}</span>
          <p className="font-bold text-sm truncate">
            {faq.question || <span className="text-muted-foreground">سؤال جديد (لم يُحفظ)</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => onMove(-1)} disabled={index === 0} className="px-2">
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onMove(1)} disabled={index === total - 1} className="px-2">
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} className="px-2 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
          {!isEditing ? (
            <Button size="sm" variant="outline" onClick={onStartEdit} className="gap-1">
              <Pencil className="w-3.5 h-3.5" /> تعديل
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onCancelEdit} className="gap-1">
              <X className="w-3.5 h-3.5" /> إلغاء
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">السؤال</Label>
            <Input value={faq.question} onChange={(e) => onChange({ question: e.target.value })} placeholder="ما هي منصة تفوّق؟" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">الإجابة</Label>
            <Textarea value={faq.answer} onChange={(e) => onChange({ answer: e.target.value })} rows={4} placeholder="إجابة واضحة ومختصرة..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1">
              <Tags className="w-3.5 h-3.5" /> الكلمات المفتاحية (افصل بفاصلة أو سطر جديد)
            </Label>
            <Input
              value={keywordsToString(faq.keywords ?? [])}
              onChange={(e) => onChange({ keywords: parseKeywords(e.target.value) })}
              dir="rtl"
              placeholder="تسجيل، دخول، حساب جديد، اشتراك"
            />
            {(faq.keywords ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(faq.keywords ?? []).slice(0, 12).map((k, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{k}</span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange({ is_active: !faq.is_active })}
            className="inline-flex items-center gap-2 text-xs font-bold"
          >
            {faq.is_active
              ? <><ToggleRight className="w-5 h-5 text-success" /> مُفعّل ويظهر في الشات</>
              : <><ToggleLeft className="w-5 h-5 text-muted-foreground" /> مُعطّل (لن يظهر في الشات)</>}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{faq.answer || <span className="italic">—</span>}</p>
          {(faq.keywords ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(faq.keywords ?? []).map((k, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{k}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
