import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Gamepad2, Disc3, Brain, Lock, Users, Globe, Play, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Subject } from "./LearningManagement";
import { visibilityLabels, visibilityOptions } from "./shared";
import { GamePreview } from "./GamePreview";

type GameType = "wheel" | "memory";
type ContentKind = "mcq" | "concept";

type Game = {
  id: string;
  title: string;
  description: string | null;
  subject_id: string;
  created_by: string;
  game_type: GameType;
  content_kind: ContentKind;
  visibility: "private" | "subject" | "public";
  item_count?: number;
};

type Item = {
  question_text?: string;
  option_a?: string; option_b?: string; option_c?: string; option_d?: string;
  correct_option?: "a" | "b" | "c" | "d";
  front_text?: string;
  back_text?: string;
};

const visIcon = { private: Lock, subject: Users, public: Globe } as const;
const gameIcon = { wheel: Disc3, memory: Brain } as const;
const gameLabel = { wheel: "العجلة الدوارة", memory: "لعبة الذاكرة" } as const;
const kindLabel = { mcq: "اختيار من متعدد", concept: "بطاقات مفاهيم" } as const;

const blankItem = (kind: ContentKind): Item =>
  kind === "mcq"
    ? { question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a" }
    : { front_text: "", back_text: "" };

export const GamesCenter = ({ subjects }: { subjects: Subject[] }) => {
  const { user, isAdmin } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", subject_id: "",
    game_type: "wheel" as GameType, content_kind: "mcq" as ContentKind,
    visibility: "private" as Game["visibility"],
  });
  const [items, setItems] = useState<Item[]>([blankItem("mcq")]);
  const [saving, setSaving] = useState(false);
  const [previewGame, setPreviewGame] = useState<Game | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: gs } = await supabase.from("learning_games").select("*").order("created_at", { ascending: false });
    const ids = (gs ?? []).map((g: any) => g.id);
    let counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: it } = await supabase.from("learning_game_items").select("game_id").in("game_id", ids);
      (it ?? []).forEach((i: any) => { counts[i.game_id] = (counts[i.game_id] ?? 0) + 1; });
    }
    setGames((gs ?? []).map((g: any) => ({ ...g, item_count: counts[g.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = (presetType?: GameType) => {
    setEditing(null);
    setForm({
      title: "", description: "",
      subject_id: subjects[0]?.id ?? "",
      game_type: presetType ?? "wheel",
      content_kind: "mcq",
      visibility: "private",
    });
    setItems([blankItem("mcq")]);
    setOpen(true);
  };

  const openEdit = async (g: Game) => {
    setEditing(g);
    setForm({
      title: g.title, description: g.description ?? "", subject_id: g.subject_id,
      game_type: g.game_type, content_kind: g.content_kind, visibility: g.visibility,
    });
    const { data } = await supabase.from("learning_game_items").select("*").eq("game_id", g.id).order("position");
    setItems(((data ?? []) as any[]).map((it) => ({
      ...it,
      correct_option: it.correct_option ? (it.correct_option as string).toLowerCase() : undefined,
    })));
    setOpen(true);
  };

  const duplicate = async (g: Game) => {
    if (!user) return;
    const { data: items } = await supabase.from("learning_game_items").select("*").eq("game_id", g.id).order("position");
    const { data: newG, error } = await supabase.from("learning_games").insert({
      title: `${g.title} - نسخة`,
      description: g.description, subject_id: g.subject_id,
      game_type: g.game_type, content_kind: g.content_kind,
      visibility: "private", created_by: user.id,
    }).select("id").single();
    if (error) { toast.error("تعذّر الاستيراد", { description: error.message }); return; }
    if (items && items.length > 0) {
      const payload = items.map((it: any, i: number) => ({
        game_id: newG.id, position: i,
        question_text: it.question_text, option_a: it.option_a, option_b: it.option_b,
        option_c: it.option_c, option_d: it.option_d, correct_option: it.correct_option,
        front_text: it.front_text, back_text: it.back_text,
      }));
      await supabase.from("learning_game_items").insert(payload);
    }
    toast.success("تم استيراد اللعبة إلى مكتبتك");
    load();
  };

  const switchKind = (kind: ContentKind) => {
    setForm({ ...form, content_kind: kind });
    setItems([blankItem(kind)]);
  };

  const save = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.subject_id) { toast.error("الرجاء تعبئة العنوان والمادة"); return; }
    if (items.length < 2) { toast.error("أضف عنصرين على الأقل"); return; }
    for (const it of items) {
      if (form.content_kind === "mcq" && (!it.question_text?.trim() || !it.option_a || !it.option_b)) {
        toast.error("الرجاء تعبئة جميع حقول الأسئلة"); return;
      }
      if (form.content_kind === "concept" && (!it.front_text?.trim() || !it.back_text?.trim())) {
        toast.error("الرجاء تعبئة كل البطاقات"); return;
      }
    }

    setSaving(true);
    let gameId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("learning_games").update({
        title: form.title, description: form.description, subject_id: form.subject_id,
        game_type: form.game_type, content_kind: form.content_kind, visibility: form.visibility,
      }).eq("id", editing.id);
      if (error) { toast.error("تعذّر التحديث", { description: error.message }); setSaving(false); return; }
      await supabase.from("learning_game_items").delete().eq("game_id", editing.id);
    } else {
      const { data, error } = await supabase.from("learning_games").insert({
        title: form.title, description: form.description, subject_id: form.subject_id,
        game_type: form.game_type, content_kind: form.content_kind, visibility: form.visibility,
        created_by: user.id,
      }).select("id").single();
      if (error) { toast.error("تعذّر الحفظ", { description: error.message }); setSaving(false); return; }
      gameId = data.id;
    }

    const payload = items.map((it, i) => ({
      game_id: gameId!, position: i,
      question_text: it.question_text || null,
      option_a: it.option_a || null, option_b: it.option_b || null,
      option_c: it.option_c || null, option_d: it.option_d || null,
      correct_option: it.correct_option ?? null,
      front_text: it.front_text || null,
      back_text: it.back_text || null,
    }));
    const { error: iErr } = await supabase.from("learning_game_items").insert(payload);
    if (iErr) { toast.error("تعذّر حفظ العناصر", { description: iErr.message }); setSaving(false); return; }

    toast.success(editing ? "تم تحديث اللعبة" : "تم إنشاء اللعبة");
    setOpen(false); setSaving(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذه اللعبة؟")) return;
    const { error } = await supabase.from("learning_games").delete().eq("id", id);
    if (error) { toast.error("تعذّر الحذف"); return; }
    toast.success("تم الحذف"); load();
  };

  const subjectsById = Object.fromEntries(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" /> مكتبة الألعاب التعليمية
          </h3>
          <p className="text-sm text-muted-foreground mt-1">العجلة الدوارة ولعبة الذاكرة - أنشئ أو استورد من الزملاء</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => openNew("wheel")} disabled={subjects.length === 0} variant="outline" className="gap-2">
            <Disc3 className="w-4 h-4" /> عجلة جديدة
          </Button>
          <Button onClick={() => openNew("memory")} disabled={subjects.length === 0} className="bg-gradient-primary text-primary-foreground gap-2">
            <Brain className="w-4 h-4" /> ذاكرة جديدة
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : games.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 border border-border/50 text-center">
          <Gamepad2 className="w-14 h-14 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-display text-lg font-bold">لا توجد ألعاب بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g) => {
            const VisIcon = visIcon[g.visibility];
            const GIcon = gameIcon[g.game_type];
            const canEdit = isAdmin || g.created_by === user?.id;
            const isMine = g.created_by === user?.id;
            return (
              <div key={g.id} className="bg-card rounded-2xl p-5 border border-border/50 shadow-card hover:shadow-elegant transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <GIcon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-bold leading-tight truncate">{g.title}</h4>
                    <p className="text-xs text-muted-foreground">{gameLabel[g.game_type]} • {kindLabel[g.content_kind]}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge className="bg-primary/10 text-primary border-0 text-xs">{subjectsById[g.subject_id]?.name ?? "—"}</Badge>
                  <Badge variant="outline" className="gap-1 text-xs"><VisIcon className="w-3 h-3" />{visibilityLabels[g.visibility]}</Badge>
                  <Badge variant="outline" className="text-xs">{g.item_count} عنصر</Badge>
                </div>
                <div className="flex gap-2 pt-3 border-t border-border/50">
                  <Button size="sm" variant="outline" onClick={() => setPreviewGame(g)} className="flex-1 gap-1">
                    <Play className="w-3 h-3" /> معاينة
                  </Button>
                  {canEdit ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(g)}><Edit2 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => remove(g.id)} className="text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    !isMine && (
                      <Button size="sm" variant="outline" onClick={() => duplicate(g)} className="gap-1">
                        <Copy className="w-3 h-3" /> استيراد
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل اللعبة" : "لعبة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>عنوان اللعبة</Label>
                <Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>الوصف</Label>
                <Textarea className="mt-1.5" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>نوع اللعبة</Label>
                <Select value={form.game_type} onValueChange={(v) => setForm({ ...form, game_type: v as GameType })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wheel">العجلة الدوارة</SelectItem>
                    <SelectItem value="memory">لعبة الذاكرة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نوع المحتوى</Label>
                <Select value={form.content_kind} onValueChange={(v) => switchKind(v as ContentKind)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">أسئلة اختيار من متعدد</SelectItem>
                    <SelectItem value="concept">بطاقات مفاهيم (مصطلح + تعريف)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المادة</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المشاركة</Label>
                <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as any })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">العناصر ({items.length})</h4>
                <Button size="sm" variant="outline" onClick={() => setItems([...items, blankItem(form.content_kind)])} className="gap-1">
                  <Plus className="w-3 h-3" /> إضافة
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="border border-border rounded-xl p-3 bg-secondary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                      {items.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    {form.content_kind === "mcq" ? (
                      <>
                        <Textarea placeholder="نص السؤال" rows={2} value={it.question_text ?? ""}
                          onChange={(e) => { const n = [...items]; n[i].question_text = e.target.value; setItems(n); }} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(["a", "b", "c", "d"] as const).map((k) => (
                            <Input key={k} placeholder={`الخيار ${k.toUpperCase()}`} value={(it as any)[`option_${k}`] ?? ""}
                              onChange={(e) => { const n = [...items]; (n[i] as any)[`option_${k}`] = e.target.value; setItems(n); }} />
                          ))}
                        </div>
                        <div>
                          <Label className="text-xs">الإجابة الصحيحة</Label>
                          <Select value={it.correct_option ?? "a"} onValueChange={(v) => { const n = [...items]; n[i].correct_option = v as any; setItems(n); }}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(["a", "b", "c", "d"] as const).map((k) => <SelectItem key={k} value={k}>{k.toUpperCase()}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">الوجه (المصطلح)</Label>
                          <Input className="mt-1" value={it.front_text ?? ""}
                            onChange={(e) => { const n = [...items]; n[i].front_text = e.target.value; setItems(n); }} />
                        </div>
                        <div>
                          <Label className="text-xs">الظهر (التعريف)</Label>
                          <Input className="mt-1" value={it.back_text ?? ""}
                            onChange={(e) => { const n = [...items]; n[i].back_text = e.target.value; setItems(n); }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "تحديث" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GamePreview game={previewGame} onClose={() => setPreviewGame(null)} />
    </div>
  );
};
